/**
 * Incident Mutations
 *
 * User submissions and spam prevention
 */

import { ObjectId } from "mongodb";
import type {
  PendingIncidentModel,
  GraphQLContext,
  IncidentKind,
  Coordinates,
  ModeratorQueueItemModel,
} from "@/backend/db/collections";
import {
  checkRateLimits,
  checkCooldown,
  recordReport,
} from "@/lib/rate-limiter";
import { calculateThreshold } from "@/lib/threshold-algorithm";
import {
  publishIncidentFromPending,
  rewardReporters,
} from "@/lib/incident-publisher";

/**
 * Polish labels for incident kinds
 */
const INCIDENT_KIND_LABELS: Record<IncidentKind, string> = {
  ACCIDENT: "Wypadek",
  TRAFFIC_JAM: "Korek uliczny",
  INCIDENT: "Inny incydent",
  NETWORK_FAILURE: "Awaria sieci",
  VEHICLE_FAILURE: "Awaria pojazdu",
  PLATFORM_CHANGES: "Zmiana peronu",
};

/**
 * Icons for incident kinds
 */
const INCIDENT_KIND_ICONS: Record<IncidentKind, string> = {
  ACCIDENT: "🚨",
  TRAFFIC_JAM: "🚗",
  INCIDENT: "❗",
  NETWORK_FAILURE: "📡",
  VEHICLE_FAILURE: "⚠️",
  PLATFORM_CHANGES: "🚉",
};

interface SubmitReportInput {
  kind: IncidentKind;
  description?: string | null;
  reporterLocation: Coordinates;
  lineIds?: string[] | null;
  delayMinutes?: number | null;
}

/**
 * Find similar pending reports within time/location window
 */
async function findSimilarPendingReports(
  input: SubmitReportInput,
  ctx: GraphQLContext,
): Promise<PendingIncidentModel | null> {
  const db = ctx.db;

  // Search window: 500m radius, 30 minutes
  const LOCATION_RADIUS_KM = 0.5;
  const TIME_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
  const timeThreshold = new Date(Date.now() - TIME_WINDOW_MS).toISOString();

  // Find pending incidents of same kind, near location, recent
  const similar = await db
    .collection<PendingIncidentModel>("PendingIncidents")
    .findOne({
      kind: input.kind,
      status: "PENDING",
      createdAt: { $gte: timeThreshold },
      // Simple geo proximity (you can enhance with $geoNear)
      "location.latitude": {
        $gte: input.reporterLocation.latitude - LOCATION_RADIUS_KM / 111,
        $lte: input.reporterLocation.latitude + LOCATION_RADIUS_KM / 111,
      },
      "location.longitude": {
        $gte:
          input.reporterLocation.longitude -
          LOCATION_RADIUS_KM /
            (111 * Math.cos(input.reporterLocation.latitude)),
        $lte:
          input.reporterLocation.longitude +
          LOCATION_RADIUS_KM /
            (111 * Math.cos(input.reporterLocation.latitude)),
      },
    });

  return similar;
}

/**
 * Submit user incident report
 */
export async function submitIncidentReport(
  _: unknown,
  { input }: { input: SubmitReportInput },
  ctx: GraphQLContext,
) {
  const userEmail = ctx.session?.user?.email;

  if (!userEmail) {
    throw new Error("Not authenticated");
  }

  const db = ctx.db;

  // Get or create user
  const user = await db.collection("users").findOne({ email: userEmail });
  if (!user) throw new Error("User not found");
  //   if (!user) {
  //     const newUser = {
  //       email: userEmail,
  //       name: ctx.session?.user?.name || null,
  //       image: ctx.session?.user?.image || null,
  //       role: "USER",
  //       reputation: 100, // Starting reputation
  //       createdAt: new Date().toISOString(),
  //     };

  //     const result = await db.collection("users").insertOne(newUser);
  //     user = { ...newUser, _id: result.insertedId };

  //   }

  const userId = user._id as ObjectId;
  const userReputation = user.reputation || 34;

  // Check rate limits
  const rateLimitResult = await checkRateLimits(
    userId,
    user.role || "USER",
    db,
  );

  if (!rateLimitResult.allowed) {
    throw new Error(rateLimitResult.reason || "Rate limit exceeded");
  }

  // Check cooldowns
  const cooldownResult = await checkCooldown(
    userId,
    {
      kind: input.kind,
      location: input.reporterLocation,
    },
    db,
  );

  if (!cooldownResult.allowed) {
    throw new Error(cooldownResult.reason || "Cooldown active");
  }

  // Find similar pending reports
  const existingPending = await findSimilarPendingReports(input, ctx);

  let pendingIncident: PendingIncidentModel;
  let wasPublished = false;
  let publishedIncident = null;
  let reputationGained = 0;

  if (existingPending) {
    // Add this user to existing pending incident
    if (existingPending.reporterIds.some((id) => id.equals(userId))) {
      throw new Error("You already reported this incident");
    }

    // Add reporter
    const updatedReporterIds = [...existingPending.reporterIds, userId];
    const updatedReputations = [
      ...existingPending.reporterReputations,
      userReputation,
    ];
    const totalReports = updatedReporterIds.length;
    const aggregateReputation = updatedReputations.reduce(
      (sum, rep) => sum + rep,
      0,
    );

    // Calculate threshold
    const thresholdResult = calculateThreshold(
      totalReports,
      aggregateReputation,
      updatedReputations,
    );

    // Update pending incident
    await db.collection<PendingIncidentModel>("PendingIncidents").updateOne(
      { _id: existingPending._id },
      {
        $set: {
          reporterIds: updatedReporterIds,
          reporterReputations: updatedReputations,
          totalReports,
          aggregateReputation,
          thresholdScore: thresholdResult.currentScore,
          lastReportAt: new Date().toISOString(),
        },
      },
    );

    pendingIncident = {
      ...existingPending,
      reporterIds: updatedReporterIds,
      reporterReputations: updatedReputations,
      totalReports,
      aggregateReputation,
      thresholdScore: thresholdResult.currentScore,
      lastReportAt: new Date().toISOString(),
    };

    // Check if threshold met
    if (thresholdResult.isOfficial && !existingPending.publishedIncidentId) {
      // Auto-publish!
      publishedIncident = await publishIncidentFromPending(pendingIncident, db);

      // Reward all reporters
      const rewardResult = await rewardReporters(pendingIncident, db, {
        bonusMultiplier: 1.0,
        reason: "THRESHOLD_MET",
      });

      wasPublished = true;
      reputationGained =
        rewardResult.rewardedUsers.find((r) => r.userId === userId.toString())
          ?.change || 0;

      pendingIncident.status = "THRESHOLD_MET";
      pendingIncident.publishedIncidentId = publishedIncident._id;
    } else if (!thresholdResult.isOfficial) {
      // Add to moderator queue if high priority
      const priority =
        input.kind === "ACCIDENT" || input.kind === "VEHICLE_FAILURE"
          ? "HIGH"
          : input.kind === "TRAFFIC_JAM"
            ? "MEDIUM"
            : "LOW";

      // Check if already in queue
      const existingQueueItem = await db
        .collection<ModeratorQueueItemModel>("ModeratorQueue")
        .findOne({ pendingIncidentId: existingPending._id });

      if (!existingQueueItem && existingPending._id) {
        await db
          .collection<ModeratorQueueItemModel>("ModeratorQueue")
          .insertOne({
            pendingIncidentId: existingPending._id,
            priority,
            reason: `${totalReports} reports, threshold: ${Math.round(thresholdResult.currentScore * 100)}%`,
            createdAt: new Date().toISOString(),
          });
      }
    }
  } else {
    // Create new pending incident
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // +24 hours

    const lineObjectIds = input.lineIds?.map((id) => new ObjectId(id)) || [];

    const thresholdResult = calculateThreshold(1, userReputation, [
      userReputation,
    ]);

    const newPending: PendingIncidentModel = {
      kind: input.kind,
      description: input.description,
      status: "PENDING",
      location: input.reporterLocation,
      lineIds: lineObjectIds,
      delayMinutes: input.delayMinutes,
      reporterIds: [userId],
      reporterReputations: [userReputation],
      totalReports: 1,
      aggregateReputation: userReputation,
      thresholdScore: thresholdResult.currentScore,
      thresholdRequired: 1.0,
      createdAt: now,
      lastReportAt: now,
      expiresAt,
    };

    const result = await db
      .collection<PendingIncidentModel>("PendingIncidents")
      .insertOne(newPending);

    newPending._id = result.insertedId;
    pendingIncident = newPending;

    // Add to moderator queue
    const priority =
      input.kind === "ACCIDENT" || input.kind === "VEHICLE_FAILURE"
        ? "HIGH"
        : input.kind === "TRAFFIC_JAM"
          ? "MEDIUM"
          : "LOW";

    await db.collection<ModeratorQueueItemModel>("ModeratorQueue").insertOne({
      pendingIncidentId: result.insertedId,
      priority,
      reason: `Nowy raport: ${INCIDENT_KIND_ICONS[input.kind]} ${INCIDENT_KIND_LABELS[input.kind]}`,
      createdAt: now,
    });
  }

  // Record report in history
  await recordReport(
    userId,
    {
      incidentId: pendingIncident._id as ObjectId,
      kind: input.kind,
      location: input.reporterLocation,
    },
    db,
  );

  return {
    success: true,
    pendingIncident: {
      id: pendingIncident._id?.toString(),
      kind: pendingIncident.kind,
      description: pendingIncident.description,
      status: pendingIncident.status,
      location: pendingIncident.location,
      lineIds:
        pendingIncident.lineIds?.map((id) => id?.toString() || null) || [],
      totalReports: pendingIncident.totalReports,
      thresholdScore: pendingIncident.thresholdScore,
      thresholdProgress: Math.round(pendingIncident.thresholdScore * 100),
      createdAt: pendingIncident.createdAt,
    },
    wasPublished,
    publishedIncident: publishedIncident
      ? {
          id: publishedIncident._id?.toString(),
          title: publishedIncident.title,
          kind: publishedIncident.kind,
          status: publishedIncident.status,
        }
      : null,
    reputationGained,
  };
}
