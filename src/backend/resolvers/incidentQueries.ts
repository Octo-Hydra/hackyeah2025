/**
 * Incident Queries
 *
 * Check rate limits and view pending incidents
 */

import { ObjectId } from "mongodb";
import type {
  PendingIncidentModel,
  ModeratorQueueItemModel,
  GraphQLContext,
} from "@/backend/db/collections";
import { checkRateLimits, type UserReportHistory } from "@/lib/rate-limiter";

/**
 * Check if user can submit a report
 */
export async function canSubmitReport(
  _: unknown,
  args: Record<string, never>,
  ctx: GraphQLContext,
) {
  const userEmail = ctx.session?.user?.email;

  if (!userEmail) {
    return {
      canSubmit: false,
      reason: "Not authenticated",
      rateLimitInfo: null,
      cooldownInfo: null,
    };
  }

  const db = ctx.db;
  const user = await db.collection("users").findOne({ email: userEmail });

  // If user doesn't exist in DB yet, create them
  if (!user) {
    return {
      canSubmit: false,
      reason: "Uaser not found in DB",
      rateLimitInfo: null,
      cooldownInfo: null,
    };
  }

  const userId = user._id as ObjectId;

  // Check rate limits
  const rateLimitResult = await checkRateLimits(
    userId,
    user.role || "USER",
    db,
  );

  // Fetch user history for violations and suspicious score
  const history = await db
    .collection<UserReportHistory>("UserReportHistory")
    .findOne({ userId });

  const violations = history?.rateLimitViolations || 0;
  const suspiciousScore = history?.suspiciousActivityScore || 0;

  if (!rateLimitResult.allowed) {
    return {
      canSubmit: false,
      reason: rateLimitResult.reason,
      cooldownRemaining: rateLimitResult.retryAfter || null,
      rateLimitInfo: {
        reportsRemaining: {
          perMinute: 0,
          perHour: 0,
          perDay: 0,
        },
        violations,
        suspiciousScore,
      },
    };
  }

  // Allowed - return remaining limits
  return {
    canSubmit: true,
    reason: null,
    cooldownRemaining: null,
    rateLimitInfo: {
      reportsRemaining: {
        perMinute: rateLimitResult.remaining?.perMinute ?? 0,
        perHour: rateLimitResult.remaining?.perHour ?? 0,
        perDay: rateLimitResult.remaining?.perDay ?? 0,
      },
      violations,
      suspiciousScore,
    },
  };
}

/**
 * Get user's pending incidents
 */
export async function myPendingIncidents(
  _: unknown,
  args: Record<string, never>,
  ctx: GraphQLContext,
) {
  const userEmail = ctx.session?.user?.email;

  if (!userEmail) {
    throw new Error("Not authenticated");
  }

  const db = ctx.db;
  const user = await db.collection("users").findOne({ email: userEmail });

  if (!user) {
    throw new Error("User not found");
  }

  const userId = user._id as ObjectId;

  // Find all pending incidents where user is a reporter
  // Only show truly PENDING incidents (not published ones)
  const pendingIncidents = await db
    .collection<PendingIncidentModel>("PendingIncidents")
    .find({
      reporterIds: userId,
      status: "PENDING", // Only show unpublished incidents
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();

  return pendingIncidents.map((p) => ({
    id: p._id?.toString(),
    kind: p.kind,
    description: p.description,
    status: p.status,
    location: p.location,
    lineIds: p.lineIds?.map((id) => id?.toString() || null) || [],
    totalReports: p.totalReports,
    thresholdScore: p.thresholdScore,
    thresholdProgress: Math.round(p.thresholdScore * 100),
    createdAt: p.createdAt,
    lastReportAt: p.lastReportAt,
    publishedIncidentId: p.publishedIncidentId?.toString() || null,
  }));
}

/**
 * Get moderator queue (ADMIN only)
 */
export async function moderatorQueue(
  _: unknown,
  args: Record<string, never>,
  ctx: GraphQLContext,
) {
  const userEmail = ctx.session?.user?.email;

  if (!userEmail) {
    throw new Error("Not authenticated");
  }

  const db = ctx.db;
  const user = await db.collection("users").findOne({ email: userEmail });

  if (!user) {
    throw new Error("User not found");
  }

  // Only ADMIN can view queue
  if (user.role !== "ADMIN") {
    throw new Error("Only admins can view moderator queue");
  }

  // Get all queue items
  const queueItems = await db
    .collection<ModeratorQueueItemModel>("ModeratorQueue")
    .find({})
    .sort({ priority: -1, createdAt: 1 }) // HIGH first, oldest first
    .limit(100)
    .toArray();

  // Fetch corresponding pending incidents
  const pendingIds = queueItems.map((item) => item.pendingIncidentId);

  const pendingIncidents = await db
    .collection<PendingIncidentModel>("PendingIncidents")
    .find({
      _id: { $in: pendingIds },
    })
    .toArray();

  // Map to response format
  return queueItems
    .map((item) => {
      const pending = pendingIncidents.find(
        (p) => p._id?.toString() === item.pendingIncidentId.toString(),
      );

      if (!pending) {
        return null;
      }

      return {
        id: item._id?.toString(),
        priority: item.priority,
        reason: item.reason,
        createdAt: item.createdAt,
        pendingIncident: {
          id: pending._id?.toString(),
          kind: pending.kind,
          description: pending.description,
          status: pending.status,
          location: pending.location,
          lineIds: pending.lineIds?.map((id) => id?.toString() || null) || [],
          totalReports: pending.totalReports,
          reporterIds: pending.reporterIds.map((id) => id.toString()),
          thresholdScore: pending.thresholdScore,
          thresholdProgress: Math.round(pending.thresholdScore * 100),
          createdAt: pending.createdAt,
          lastReportAt: pending.lastReportAt,
        },
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}
