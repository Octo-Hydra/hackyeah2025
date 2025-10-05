/**
 * Incident Publisher
 *
 * Converts PendingIncident to real Incident and publishes to WebSocket
 * Called when threshold is met OR moderator approves
 */

import { Db, ObjectId } from "mongodb";
import type {
  PendingIncidentModel,
  IncidentModel,
  IncidentLocationModel,
  IncidentKind,
} from "@/backend/db/collections";
import { pubsub, CHANNELS } from "@/backend/resolvers/subscriptions";
import { processIncidentNotifications } from "./notification-system";

/**
 * Title map for different incident types
 */
const INCIDENT_TITLES: Record<IncidentKind, string> = {
  ACCIDENT: "Wypadek",
  TRAFFIC_JAM: "Korek uliczny",
  INCIDENT: "Inny incydent",
  NETWORK_FAILURE: "Awaria sieci",
  VEHICLE_FAILURE: "Awaria pojazdu",
  PLATFORM_CHANGES: "Zmiana peronu",
};

/**
 * Convert PendingIncident to real Incident and publish
 */
export async function publishIncidentFromPending(
  pendingIncident: PendingIncidentModel,
  db: Db,
  options?: {
    moderatorId?: ObjectId | string;
    moderatorNotes?: string;
  },
): Promise<IncidentModel> {
  const now = new Date().toISOString();

  // Create real Incident
  const incident: IncidentModel = {
    title: INCIDENT_TITLES[pendingIncident.kind] || "Incydent",
    description: pendingIncident.description,
    kind: pendingIncident.kind,
    status: "PUBLISHED",
    lineIds: pendingIncident.lineIds,
    delayMinutes: pendingIncident.delayMinutes,
    isFake: false,
    reportedBy: pendingIncident.reporterIds[0], // First reporter
    createdAt: now,
  };

  const result = await db
    .collection<IncidentModel>("Incidents")
    .insertOne(incident);

  incident._id = result.insertedId;

  // Update PendingIncident with link
  const updateData: Partial<PendingIncidentModel> = {
    publishedIncidentId: result.insertedId,
    thresholdMetAt: now,
    status: options?.moderatorId ? "MANUALLY_APPROVED" : "THRESHOLD_MET",
  };

  if (options?.moderatorId) {
    updateData.moderatorId = options.moderatorId;
  }

  if (options?.moderatorNotes) {
    updateData.moderatorNotes = options.moderatorNotes;
  }

  await db
    .collection<PendingIncidentModel>("PendingIncidents")
    .updateOne({ _id: pendingIncident._id }, { $set: updateData });

  // Create IncidentLocations for path finding
  // TODO: Properly detect start/end stops from location
  if (pendingIncident.lineIds && pendingIncident.lineIds.length > 0) {
    const locations: IncidentLocationModel[] = pendingIncident.lineIds
      .filter((id): id is ObjectId | string => id !== null)
      .map((lineId) => ({
        incidentId: result.insertedId,
        lineId: typeof lineId === "string" ? new ObjectId(lineId) : lineId,
        startStopId: new ObjectId(), // TODO: Detect from location
        endStopId: new ObjectId(), // TODO: Detect from location
        severity:
          pendingIncident.kind === "ACCIDENT" ||
          pendingIncident.kind === "VEHICLE_FAILURE"
            ? "HIGH"
            : pendingIncident.kind === "TRAFFIC_JAM"
              ? "MEDIUM"
              : "LOW",
        active: true,
        createdAt: now,
        resolvedAt: null,
      }));

    if (locations.length > 0) {
      await db
        .collection<IncidentLocationModel>("IncidentLocations")
        .insertMany(locations);
    }
  }

  // Publish to WebSocket channels
  pubsub.publish(CHANNELS.INCIDENT_CREATED, incident);

  if (incident.lineIds) {
    incident.lineIds.forEach((lineId) => {
      if (lineId) {
        pubsub.publish(
          `${CHANNELS.LINE_INCIDENT_UPDATES}:${lineId.toString()}`,
          incident,
        );
      }
    });
  }

  // Send notifications to affected users
  await processIncidentNotifications(db, incident, "USER");

  console.log(
    `✅ Published Incident ${result.insertedId} from PendingIncident`,
  );

  return incident;
}

/**
 * Reputation rewards configuration
 */
export interface RewardConfig {
  bonusMultiplier: number; // 1.0 = normal, 1.5 = +50% bonus
  reason: "THRESHOLD_MET" | "MODERATOR_APPROVED";
}

/**
 * Reward all reporters with reputation points
 */
export async function rewardReporters(
  pendingIncident: PendingIncidentModel,
  db: Db,
  config: RewardConfig,
): Promise<{
  totalRewarded: number;
  rewardedUsers: Array<{
    userId: string;
    oldReputation: number;
    newReputation: number;
    change: number;
  }>;
}> {
  const baseReward = 10;
  const earlyReporterBonus = 5; // First 3 reporters
  const moderatorBonus = 0.5; // +50% for manual approval

  const bonusMultiplier =
    config.reason === "MODERATOR_APPROVED" ? 1 + moderatorBonus : 1.0;

  const rewardedUsers: Array<{
    userId: string;
    oldReputation: number;
    newReputation: number;
    change: number;
  }> = [];

  let totalRewarded = 0;

  for (let i = 0; i < pendingIncident.reporterIds.length; i++) {
    const userId = pendingIncident.reporterIds[i];
    const isEarlyReporter = i < 3; // First 3 get bonus

    const points = Math.round(
      (baseReward + (isEarlyReporter ? earlyReporterBonus : 0)) *
        bonusMultiplier,
    );

    // Get current reputation
    const user = await db.collection("users").findOne({ _id: userId });
    const oldReputation = user?.reputation || 34;

    // Update reputation
    await db
      .collection("users")
      .updateOne({ _id: userId }, { $inc: { reputation: points } });

    const newReputation = oldReputation + points;

    rewardedUsers.push({
      userId: userId.toString(),
      oldReputation,
      newReputation,
      change: points,
    });

    totalRewarded += points;

    console.log(
      `🎁 Rewarded user ${userId} with ${points} reputation (${config.reason})`,
    );
  }

  return {
    totalRewarded,
    rewardedUsers,
  };
}

/**
 * Reject pending incident (mark as fake)
 */
export async function rejectPendingIncident(
  pendingIncidentId: ObjectId | string,
  moderatorId: ObjectId | string,
  reason: string,
  db: Db,
): Promise<void> {
  const pendingIncidentIdObj =
    typeof pendingIncidentId === "string"
      ? new ObjectId(pendingIncidentId)
      : pendingIncidentId;

  const pending = await db
    .collection<PendingIncidentModel>("PendingIncidents")
    .findOne({ _id: pendingIncidentIdObj });

  if (!pending) {
    throw new Error("Pending incident not found");
  }

  // Update status to REJECTED
  await db.collection<PendingIncidentModel>("PendingIncidents").updateOne(
    { _id: pendingIncidentIdObj },
    {
      $set: {
        status: "REJECTED",
        moderatorId,
        moderatorNotes: reason,
      },
    },
  );

  // Penalize reporters (small penalty for fake reports)
  const penalty = -2; // Small penalty
  for (const userId of pending.reporterIds) {
    await db
      .collection("users")
      .updateOne({ _id: userId }, { $inc: { reputation: penalty } });

    console.log(`⚠️ Penalized user ${userId} with ${penalty} reputation`);
  }

  console.log(`❌ Rejected PendingIncident ${pendingIncidentId}`);
}
