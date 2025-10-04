/**
 * Intelligent Notification System
 *
 * Handles incident notifications based on:
 * - Reporter role (admin/moderator = instant, user = trust-based)
 * - Trust score thresholds
 * - Deduplication (prevents spam)
 * - User's active journey and favorite lines
 *
 * Uses functions from threshold-algorithm.ts for consistency
 */

import type { Db, ObjectId } from "mongodb";
import type { IncidentModel, UserModel } from "@/backend/db/collections";
import { pubsub, CHANNELS } from "@/backend/resolvers/subscriptions.js";
import {
  shouldNotifyUser,
  extractActiveJourneyLineIds,
  extractFavoriteLineIds,
  DEFAULT_THRESHOLD_CONFIG,
} from "./threshold-algorithm";

/**
 * Notification delivery status
 */
interface NotificationDelivery {
  incidentId: string;
  userId: string;
  deliveredAt: string;
  notificationType: "INSTANT" | "TRUST_BASED";
}

/**
 * In-memory deduplication cache
 * Key: `${incidentId}:${userId}`
 * Value: timestamp
 */
const deliveryCache = new Map<string, number>();

/**
 * Trust score threshold for user-reported incidents to trigger notifications
 * Uses constant from threshold-algorithm.ts for consistency
 */
const TRUST_SCORE_THRESHOLD = 1.2; // Requires above-average reputation

/**
 * Minimum number of similar reports needed for trust-based notification
 * Uses baseReportCount from threshold-algorithm.ts
 */
const MIN_SIMILAR_REPORTS = DEFAULT_THRESHOLD_CONFIG.baseReportCount;

/**
 * Cache TTL (1 hour - prevents sending same notification twice)
 */
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Clean old entries from cache (run periodically)
 */
function cleanDeliveryCache() {
  const now = Date.now();
  for (const [key, timestamp] of deliveryCache.entries()) {
    if (now - timestamp > CACHE_TTL_MS) {
      deliveryCache.delete(key);
    }
  }
}

// Clean cache every 10 minutes
setInterval(cleanDeliveryCache, 10 * 60 * 1000);

/**
 * Check if notification was already delivered to user
 */
function wasNotificationDelivered(incidentId: string, userId: string): boolean {
  const cacheKey = `${incidentId}:${userId}`;
  const deliveredAt = deliveryCache.get(cacheKey);

  if (!deliveredAt) {
    return false;
  }

  // Check if still within TTL
  const now = Date.now();
  if (now - deliveredAt > CACHE_TTL_MS) {
    deliveryCache.delete(cacheKey);
    return false;
  }

  return true;
}

/**
 * Mark notification as delivered
 */
function markNotificationDelivered(incidentId: string, userId: string): void {
  const cacheKey = `${incidentId}:${userId}`;
  deliveryCache.set(cacheKey, Date.now());
}

/**
 * Count similar reports for the same line/segment within time window
 */
async function countSimilarReports(
  db: Db,
  incident: IncidentModel
): Promise<number> {
  const oneDayAgo = new Date();
  oneDayAgo.setHours(oneDayAgo.getHours() - 24);

  const similarReports = await db
    .collection<IncidentModel>("Incidents")
    .countDocuments({
      _id: { $ne: incident._id }, // Exclude current incident
      kind: incident.kind,
      status: "PUBLISHED",
      lineIds: { $in: incident.lineIds || [] },
      createdAt: { $gte: oneDayAgo.toISOString() },
    });

  return similarReports;
}

/**
 * Get aggregate trust score from reporter and similar reporters
 */
async function getAggregateTrustScore(
  db: Db,
  incident: IncidentModel
): Promise<number> {
  if (!incident.reportedBy) {
    return 0;
  }

  // Get reporter's trust score
  const reporter = await db
    .collection<UserModel>("Users")
    .findOne({ _id: incident.reportedBy });

  const reporterTrustScore = reporter?.trustScore || 1.0;

  // Find similar recent reports
  const oneDayAgo = new Date();
  oneDayAgo.setHours(oneDayAgo.getHours() - 24);

  const similarReports = await db
    .collection<IncidentModel>("Incidents")
    .find({
      _id: { $ne: incident._id },
      kind: incident.kind,
      status: "PUBLISHED",
      lineIds: { $in: incident.lineIds || [] },
      createdAt: { $gte: oneDayAgo.toISOString() },
    })
    .toArray();

  if (similarReports.length === 0) {
    return reporterTrustScore;
  }

  // Get trust scores of similar reporters
  const similarReporterIds = similarReports
    .map((r) => r.reportedBy)
    .filter((id): id is ObjectId => id !== null && id !== undefined);

  const similarReporters = await db
    .collection<UserModel>("Users")
    .find({ _id: { $in: similarReporterIds } })
    .toArray();

  const similarTrustScores = similarReporters
    .map((u) => u.trustScore || 1.0)
    .filter((score) => score > 0);

  // Average of all trust scores (reporter + similar)
  const allScores = [reporterTrustScore, ...similarTrustScores];
  const averageTrustScore =
    allScores.reduce((sum, score) => sum + score, 0) / allScores.length;

  return averageTrustScore;
}

/**
 * Check if user should receive notification based on their preferences
 * Uses shouldNotifyUser from threshold-algorithm.ts
 */
async function shouldUserReceiveNotification(
  db: Db,
  userId: ObjectId | string,
  incident: IncidentModel
): Promise<boolean> {
  const user = await db
    .collection<UserModel>("Users")
    .findOne({ _id: typeof userId === "string" ? userId : userId });

  if (!user) {
    return false;
  }

  // Extract incident line IDs
  const incidentLineIds = (incident.lineIds || []).map((id: any) =>
    id ? id.toString() : null
  );

  // Extract user's active journey line IDs
  const activeJourneyLineIds = extractActiveJourneyLineIds(user.activeJourney);

  // For favorites, we need to check if incident affects routes between saved stops
  // For now, we'll consider a user affected if they have any favorites (simplified)
  const hasFavorites =
    user.favoriteConnections && user.favoriteConnections.length > 0;

  // Use threshold-algorithm.ts function
  const decision = shouldNotifyUser(
    incidentLineIds,
    activeJourneyLineIds.length > 0 ? activeJourneyLineIds : undefined,
    hasFavorites ? [] : undefined, // Simplified: no specific favorite line IDs for now
    undefined // No incident class in current IncidentModel
  );

  return decision.shouldNotify;
}

/**
 * Send notifications for incident based on reporter role and trust score
 */
export async function processIncidentNotifications(
  db: Db,
  incident: IncidentModel,
  reporterRole: "USER" | "MODERATOR" | "ADMIN"
): Promise<void> {
  const incidentId = incident._id?.toString();
  if (!incidentId) {
    console.warn("⚠️  Cannot process notifications: incident has no ID");
    return;
  }

  // 1. INSTANT NOTIFICATIONS for admin/moderator reports
  if (reporterRole === "ADMIN" || reporterRole === "MODERATOR") {
    console.log(
      `📢 INSTANT notification: ${incident.title} (by ${reporterRole})`
    );

    // Publish to all relevant channels
    pubsub.publish(CHANNELS.INCIDENT_CREATED, incident);
    pubsub.publish(CHANNELS.LINE_INCIDENT_UPDATES, incident);
    pubsub.publish(CHANNELS.MY_LINES_INCIDENTS, incident);

    // Mark as official immediately
    await db
      .collection<IncidentModel>("Incidents")
      .updateOne({ _id: incident._id }, { $set: { status: "PUBLISHED" } });

    return;
  }

  // 2. TRUST-BASED NOTIFICATIONS for user reports
  console.log(`🔍 Evaluating trust-based notification: ${incident.title}`);

  // Check aggregate trust score
  const aggregateTrustScore = await getAggregateTrustScore(db, incident);
  const similarReportsCount = await countSimilarReports(db, incident);

  console.log(`   Trust score: ${aggregateTrustScore.toFixed(2)}`);
  console.log(`   Similar reports: ${similarReportsCount}`);

  // Determine if notification should be sent
  const shouldNotify =
    aggregateTrustScore >= TRUST_SCORE_THRESHOLD ||
    similarReportsCount >= MIN_SIMILAR_REPORTS;

  if (!shouldNotify) {
    console.log(`   ⏭️  Skipping notification (below threshold)`);
    return;
  }

  console.log(`   ✅ Sending trust-based notifications`);

  // Get all users who might be affected
  const allUsers = await db
    .collection<UserModel>("Users")
    .find({
      $or: [
        { "activeJourney.lineIds": { $in: incident.lineIds || [] } },
        { favoriteConnections: { $exists: true, $ne: [] } },
      ],
    })
    .toArray();

  let notificationsSent = 0;
  let notificationsSkipped = 0;

  for (const user of allUsers) {
    const userId = user._id?.toString();
    if (!userId) continue;

    // Check deduplication
    if (wasNotificationDelivered(incidentId, userId)) {
      notificationsSkipped++;
      continue;
    }

    // Check if user should receive notification
    const shouldReceive = await shouldUserReceiveNotification(
      db,
      user._id!,
      incident
    );
    if (!shouldReceive) {
      continue;
    }

    // Mark as delivered (prevents duplicates)
    markNotificationDelivered(incidentId, userId);
    notificationsSent++;
  }

  // Publish to channels
  pubsub.publish(CHANNELS.INCIDENT_CREATED, incident);
  pubsub.publish(CHANNELS.LINE_INCIDENT_UPDATES, incident);
  pubsub.publish(CHANNELS.MY_LINES_INCIDENTS, incident);

  console.log(
    `   📤 Sent: ${notificationsSent}, Skipped (duplicates): ${notificationsSkipped}`
  );
}

/**
 * Get notification statistics
 */
export function getNotificationStats(): {
  cacheSize: number;
  oldestEntry: string | null;
  newestEntry: string | null;
} {
  if (deliveryCache.size === 0) {
    return {
      cacheSize: 0,
      oldestEntry: null,
      newestEntry: null,
    };
  }

  const timestamps = Array.from(deliveryCache.values());
  const oldest = Math.min(...timestamps);
  const newest = Math.max(...timestamps);

  return {
    cacheSize: deliveryCache.size,
    oldestEntry: new Date(oldest).toISOString(),
    newestEntry: new Date(newest).toISOString(),
  };
}
