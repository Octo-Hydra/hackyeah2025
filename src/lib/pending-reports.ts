/**
 * Pending Reports Manager
 *
 * Handles aggregation of similar user reports and threshold calculations
 * Integrates with existing threshold-algorithm.ts
 */

import { Db, ObjectId } from "mongodb";
import type {
  IncidentModel,
  IncidentKind,
  PendingIncidentModel as DBPendingIncident,
  PendingIncidentStatus as DBStatus,
  ModeratorQueueItemModel as DBQueueItem,
  QueuePriority as DBPriority,
  Coordinates,
} from "@/backend/db/collections";
import {
  calculateThreshold,
  DEFAULT_THRESHOLD_CONFIG,
  type ThresholdConfig,
} from "./threshold-algorithm";

// Re-export types from collections for compatibility
export type PendingReportStatus = DBStatus;
export type QueuePriority = DBPriority;

/**
 * Pending incident report (aggregates multiple user reports)
 * Alias for PendingIncidentModel from collections
 */
export type PendingIncidentReport = DBPendingIncident;

/**
 * Moderator queue item
 * Note: Uses pendingIncidentId instead of pendingReportId
 */
export interface ModeratorQueueItem {
  _id?: ObjectId;
  pendingIncidentId: ObjectId; // Updated field name to match DB model
  priority: QueuePriority;
  reason: string;
  assignedTo?: ObjectId | string | null;
  createdAt: string;
  reviewedAt?: string | null;
}

/**
 * Result of adding a report to pending queue
 */
export interface AddReportResult {
  success: boolean;
  pendingReportId: string;
  status: PendingReportStatus;
  thresholdProgress: number; // 0-100 percentage
  thresholdScore: number; // Actual score
  message: string;
  isNew: boolean; // True if created new pending report
  totalReports: number;
  reportsNeeded?: number;
  reputationNeeded?: number;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Find similar pending reports (within 500m, same kind, last 30 minutes)
 */
export async function findSimilarPendingReports(
  incident: {
    kind: IncidentKind;
    location: {
      latitude: number;
      longitude: number;
    };
    lineIds?: (ObjectId | string | null)[];
  },
  db: Db
): Promise<PendingIncidentReport[]> {
  const thirtyMinutesAgo = new Date(Date.now() - 1800000).toISOString();

  // Get all pending reports of same kind from last 30 minutes
  const candidates = await db
    .collection<PendingIncidentReport>("PendingIncidentReports")
    .find({
      kind: incident.kind,
      status: { $in: ["PENDING", "THRESHOLD_MET"] },
      createdAt: { $gte: thirtyMinutesAgo },
    })
    .toArray();

  // Filter by location (500m radius)
  const nearby = candidates.filter((report) => {
    const distance = calculateDistance(
      incident.location.latitude,
      incident.location.longitude,
      report.location.latitude,
      report.location.longitude
    );
    return distance <= 500;
  });

  // Optional: filter by overlapping lines
  if (incident.lineIds && incident.lineIds.length > 0) {
    const hasOverlap = (reportLineIds: (ObjectId | string | null)[]) => {
      const incidentLines = incident.lineIds!.map((id) =>
        id ? id.toString() : null
      );
      const reportLines = reportLineIds.map((id) =>
        id ? id.toString() : null
      );
      return incidentLines.some((line) => reportLines.includes(line));
    };

    return nearby.filter((report) => hasOverlap(report.lineIds));
  }

  return nearby;
}

/**
 * Create new pending report
 */
export async function createPendingReport(
  incident: IncidentModel,
  userId: ObjectId,
  userReputation: number,
  db: Db
): Promise<AddReportResult> {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 86400000).toISOString(); // 24 hours

  // Extract location from incident (use reporter location or segment center)
  const location = {
    latitude: 0,
    longitude: 0,
  };

  // TODO: Extract from incident.reporterLocation when available
  // For now, use placeholder

  const pendingReport: PendingIncidentReport = {
    _id: new ObjectId(),
    status: "PENDING",
    reporterIds: [userId],
    reporterReputations: [userReputation],
    totalReports: 1,
    aggregateReputation: userReputation,
    thresholdScore: 0,
    thresholdRequired: 1.0,
    kind: incident.kind,
    location,
    lineIds: incident.lineIds || [],
    createdAt: now,
    lastReportAt: now,
    expiresAt,
  };

  // Calculate initial threshold
  const threshold = calculateThreshold(
    pendingReport.totalReports,
    pendingReport.aggregateReputation,
    pendingReport.reporterReputations,
    DEFAULT_THRESHOLD_CONFIG
  );

  pendingReport.thresholdScore = threshold.currentScore;

  // Insert into database
  const result = await db
    .collection<PendingIncidentReport>("PendingIncidentReports")
    .insertOne(pendingReport);

  const pendingReportId = result.insertedId.toString();

  return {
    success: true,
    pendingReportId,
    status: "PENDING",
    thresholdProgress: Math.min(threshold.currentScore * 100, 100),
    thresholdScore: threshold.currentScore,
    message: getThresholdMessage(threshold),
    isNew: true,
    totalReports: 1,
    reportsNeeded: threshold.breakdown.reportCount,
    reputationNeeded:
      DEFAULT_THRESHOLD_CONFIG.baseReputationRequired -
      pendingReport.aggregateReputation,
  };
}

/**
 * Add user report to existing pending report
 */
export async function addReportToPending(
  pendingReport: PendingIncidentReport,
  userId: ObjectId,
  userReputation: number,
  db: Db,
  config: ThresholdConfig = DEFAULT_THRESHOLD_CONFIG
): Promise<AddReportResult> {
  // Check if user already reported
  const alreadyReported = pendingReport.reporterIds.some((id) =>
    id.equals(userId)
  );
  if (alreadyReported) {
    return {
      success: false,
      pendingReportId: pendingReport._id!.toString(),
      status: pendingReport.status,
      thresholdProgress: Math.min(pendingReport.thresholdScore * 100, 100),
      thresholdScore: pendingReport.thresholdScore,
      message: "You have already reported this incident",
      isNew: false,
      totalReports: pendingReport.totalReports,
    };
  }

  // Add user to reporters
  pendingReport.reporterIds.push(userId);
  pendingReport.reporterReputations.push(userReputation);
  pendingReport.totalReports++;
  pendingReport.aggregateReputation += userReputation;
  pendingReport.lastReportAt = new Date().toISOString();

  // Recalculate threshold
  const threshold = calculateThreshold(
    pendingReport.totalReports,
    pendingReport.aggregateReputation,
    pendingReport.reporterReputations,
    config
  );

  pendingReport.thresholdScore = threshold.currentScore;

  // Check if threshold met
  const wasThresholdMet =
    threshold.isOfficial && pendingReport.status === "PENDING";

  if (wasThresholdMet) {
    pendingReport.status = "THRESHOLD_MET";
    pendingReport.thresholdMetAt = new Date().toISOString();
  }

  // Update in database
  await db
    .collection<PendingIncidentReport>("PendingIncidentReports")
    .updateOne({ _id: pendingReport._id }, { $set: pendingReport });

  // Add to moderator queue if near threshold (70-99%)
  if (threshold.currentScore >= 0.7 && threshold.currentScore < 1.0) {
    await addToModeratorQueue(
      typeof pendingReport._id === "string"
        ? new ObjectId(pendingReport._id)
        : pendingReport._id!,
      "NEAR_THRESHOLD",
      "MEDIUM",
      db
    );
  }

  return {
    success: true,
    pendingReportId: pendingReport._id!.toString(),
    status: pendingReport.status,
    thresholdProgress: Math.min(threshold.currentScore * 100, 100),
    thresholdScore: threshold.currentScore,
    message: wasThresholdMet
      ? "✅ Threshold met! Incident published automatically."
      : getThresholdMessage(threshold),
    isNew: false,
    totalReports: pendingReport.totalReports,
    reportsNeeded: Math.max(
      0,
      config.baseReportCount - threshold.breakdown.validReporters
    ),
    reputationNeeded: Math.max(
      0,
      config.baseReputationRequired - pendingReport.aggregateReputation
    ),
  };
}

/**
 * Get human-readable threshold message
 */
function getThresholdMessage(
  threshold: ReturnType<typeof calculateThreshold>
): string {
  const progress = Math.round(threshold.currentScore * 100);

  if (threshold.isOfficial) {
    return `✅ Report verified! (${progress}%)`;
  }

  if (progress >= 75) {
    return `🔥 Almost there! ${progress}% complete - needs ${threshold.breakdown.reportCount} more report(s)`;
  }

  if (progress >= 50) {
    return `📊 Good progress: ${progress}% - ${threshold.breakdown.reportCount} more report(s) needed`;
  }

  return `📝 Report added (${progress}%) - needs ${threshold.breakdown.reportCount} more confirmation(s)`;
}

/**
 * Add pending report to moderator queue
 */
export async function addToModeratorQueue(
  pendingReportId: ObjectId,
  reason: string,
  priority: QueuePriority,
  db: Db
): Promise<void> {
  // Check if already in queue
  const existing = await db
    .collection<ModeratorQueueItem>("ModeratorQueue")
    .findOne({
      pendingReportId,
      reviewedAt: { $exists: false },
    });

  if (existing) {
    return; // Already queued
  }

  const queueItem: ModeratorQueueItem = {
    pendingIncidentId: pendingReportId,
    priority,
    reason,
    createdAt: new Date().toISOString(),
  };

  await db
    .collection<ModeratorQueueItem>("ModeratorQueue")
    .insertOne(queueItem);
}

/**
 * Get moderator queue (sorted by priority and age)
 */
export async function getModeratorQueue(db: Db): Promise<ModeratorQueueItem[]> {
  const priorityOrder = { HIGH: 1, MEDIUM: 2, LOW: 3 };

  const items = await db
    .collection<ModeratorQueueItem>("ModeratorQueue")
    .find({
      reviewedAt: { $exists: false },
    })
    .toArray();

  // Sort by priority, then by age
  return items.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

/**
 * Remove item from moderator queue
 */
export async function removeFromModeratorQueue(
  queueItemId: ObjectId | string,
  db: Db
): Promise<void> {
  const itemIdObj =
    typeof queueItemId === "string" ? new ObjectId(queueItemId) : queueItemId;

  await db.collection<ModeratorQueueItem>("ModeratorQueue").updateOne(
    { _id: itemIdObj },
    {
      $set: {
        reviewedAt: new Date().toISOString(),
      },
    }
  );
}

/**
 * Get pending report by ID
 */
export async function getPendingReport(
  pendingReportId: ObjectId | string,
  db: Db
): Promise<PendingIncidentReport | null> {
  const reportIdObj =
    typeof pendingReportId === "string"
      ? new ObjectId(pendingReportId)
      : pendingReportId;

  return await db
    .collection<PendingIncidentReport>("PendingIncidentReports")
    .findOne({ _id: reportIdObj });
}

/**
 * Get all pending reports (optionally filter by status)
 */
export async function getAllPendingReports(
  db: Db,
  status?: PendingReportStatus
): Promise<PendingIncidentReport[]> {
  const filter = status ? { status } : {};

  return await db
    .collection<PendingIncidentReport>("PendingIncidentReports")
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();
}

/**
 * Expire old pending reports (run periodically)
 */
export async function expirePendingReports(db: Db): Promise<number> {
  const now = new Date().toISOString();

  const result = await db
    .collection<PendingIncidentReport>("PendingIncidentReports")
    .updateMany(
      {
        status: "PENDING",
        expiresAt: { $lt: now },
      },
      {
        $set: {
          status: "EXPIRED",
        },
      }
    );

  return result.modifiedCount;
}
