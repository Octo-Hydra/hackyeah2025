import { ObjectId } from "mongodb";
import type {
  GraphQLContext,
  IncidentModel,
  IncidentKind,
  ReportStatus,
  UserModel,
  ActiveJourney,
  FavoriteConnection,
  Coordinates,
  StopModel,
  IncidentLocationModel,
  JourneyNotificationModel,
} from "../db/collections.js";
import { COLLECTIONS } from "../db/collections.js";
import { DB } from "../db/client.js";
import { pubsub, CHANNELS } from "./subscriptions.js";
import {
  shouldNotifyUser,
  extractActiveJourneyLineIds,
  extractFavoriteLineIds,
} from "../../lib/threshold-algorithm.js";
import {
  determineIncidentSegment,
  formatIncidentSegment,
} from "../../lib/geolocation-utils.js";
import { processIncidentNotifications } from "../../lib/notification-system.js";
import type { Db } from "mongodb";

// Interfaces
interface CreateReportInput {
  description?: string;
  kind: IncidentKind;
  status?: ReportStatus;
  lineIds?: Array<string | null>;
  reporterLocation?: Coordinates;
  delayMinutes?: number;
}

interface UpdateReportInput {
  description?: string;
  kind?: IncidentKind;
  status?: ReportStatus;
  lineIds?: Array<string | null>;
  delayMinutes?: number;
}

interface SegmentLocationInput {
  stopId: string;
  stopName: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

interface PathSegmentInput {
  from: SegmentLocationInput;
  to: SegmentLocationInput;
  lineId: string;
  lineName: string;
  transportType: "BUS" | "RAIL";
  departureTime: string;
  arrivalTime: string;
  duration: number;
}

interface ActiveJourneyInput {
  segments: PathSegmentInput[];
}

interface FavoriteConnectionInput {
  name: string;
  startStopId: string;
  endStopId: string;
}

interface JourneyNotificationInput {
  incidentId: string;
  title: string;
  description?: string | null;
  kind?: IncidentKind | null;
  status?: ReportStatus | null;
  lineId?: string | null;
  lineName?: string | null;
  delayMinutes?: number | null;
}

interface JourneyNotificationResult {
  id: string;
  incidentId: string;
  title: string;
  description?: string | null;
  kind?: IncidentKind | null;
  status?: ReportStatus | null;
  lineId?: string | null;
  lineName?: string | null;
  delayMinutes?: number | null;
  receivedAt: string;
}

// Notify affected users about new incident
async function notifyAffectedUsers(
  doc: IncidentModel,
  incidentId: string,
  db: Db,
) {
  // Simplified notification - just log for now
  // TODO: Implement proper user notification based on active journeys and favorites
  console.log(`📢 New incident created: ${doc.title} (ID: ${incidentId})`);
}

function mapJourneyNotification(
  doc: JourneyNotificationModel,
): JourneyNotificationResult {
  return {
    id: doc.incidentId,
    incidentId: doc.incidentId,
    title: doc.title,
    description: doc.description ?? null,
    kind: doc.kind ?? null,
    status: doc.status ?? null,
    lineId:
      doc.lineId instanceof ObjectId
        ? doc.lineId.toString()
        : (doc.lineId ?? null),
    lineName: doc.lineName ?? null,
    delayMinutes: doc.delayMinutes ?? null,
    receivedAt: doc.receivedAt,
  };
}

/**
 * Find similar reports on the same line/segment within a time window
 */
async function findSimilarReports(
  db: Db,
  incident: IncidentModel,
  timeWindowHours: number,
): Promise<IncidentModel[]> {
  const timeWindowMs = timeWindowHours * 60 * 60 * 1000;
  const incidentTime = new Date(incident.createdAt).getTime();
  const startTime = new Date(incidentTime - timeWindowMs).toISOString();
  const endTime = new Date(incidentTime + timeWindowMs).toISOString();

  // Find reports with same kind on same line(s) within time window
  const similarReports = await db
    .collection<IncidentModel>("Incidents")
    .find({
      _id: { $ne: incident._id }, // Exclude current incident
      kind: incident.kind,
      status: { $in: ["PUBLISHED", "RESOLVED"] },
      createdAt: { $gte: startTime, $lte: endTime },
      // Match at least one line ID
      lineIds: { $in: incident.lineIds || [] },
    })
    .toArray();

  return similarReports;
}

/**
 * Update user reputation based on report validity
 */
async function updateUserReputation(
  db: Db,
  incident: IncidentModel,
  similarReports: IncidentModel[],
  isFake: boolean,
): Promise<void> {
  const FAKE_REPORT_PENALTY = -10; // Points deducted for fake report
  const VALIDATED_REPORT_REWARD = 5; // Points awarded for validated report
  const MIN_REPUTATION = 0; // Reputation floor (can't go below 0)

  if (isFake) {
    // Deduct points from the reporter who made the fake report
    if (incident.reportedBy) {
      const user = await db
        .collection("users")
        .findOne({ _id: new ObjectId(incident.reportedBy) });

      if (user) {
        const newReputation = Math.max(
          MIN_REPUTATION,
          (user.reputation || 34) + FAKE_REPORT_PENALTY,
        );

        await db
          .collection("users")
          .updateOne(
            { _id: new ObjectId(incident.reportedBy) },
            { $set: { reputation: newReputation } },
          );
      }
    }
  } else {
    // Award points if the report was validated (multiple similar reports exist)
    if (similarReports.length > 0) {
      // Award points to the original reporter
      if (incident.reportedBy) {
        await db
          .collection("users")
          .updateOne(
            { _id: new ObjectId(incident.reportedBy) },
            { $inc: { reputation: VALIDATED_REPORT_REWARD } },
          );
      }

      // Award points to all similar reporters
      const similarReporterIds = similarReports
        .map((r) => r.reportedBy)
        .filter((id): id is ObjectId | string => id != null);

      if (similarReporterIds.length > 0) {
        await db.collection("users").updateMany(
          {
            _id: {
              $in: similarReporterIds.map((id) =>
                typeof id === "string" ? new ObjectId(id) : id,
              ),
            },
          },
          { $inc: { reputation: VALIDATED_REPORT_REWARD } },
        );
      }
    }
  }
}

export const Mutation = {
  // ============================================
  // AUTH MUTATIONS
  // ============================================
  register: (
    _: unknown,
    {
      name,
      email,
      password,
    }: { name: string; email: string; password: string },
  ): boolean => {
    // Mock implementation
    return true;
  },

  verifyEmail: (_: unknown, { token }: { token: string }): boolean => {
    // Mock implementation
    return true;
  },

  resendVerificationEmail: (
    _: unknown,
    { email }: { email: string },
  ): boolean => {
    // Mock implementation
    return true;
  },

  setup2FA: () => ({ secret: "mock-secret", qrCode: "mock-qrcode" }),

  verify2FA: (
    _: unknown,
    { token, secret }: { token: string; secret: string },
  ): boolean => {
    // Mock implementation
    return true;
  },

  disable2FA: (): boolean => {
    // Mock implementation
    return true;
  },

  // ============================================
  // INCIDENT MUTATIONS
  // ============================================
  async createReport(
    _: unknown,
    { input }: { input: CreateReportInput },
    ctx: GraphQLContext,
  ) {
    const db = await DB();
    const now = new Date().toISOString();
    const userEmail = ctx.session?.user?.email;

    if (!userEmail) {
      throw new Error("Not authenticated");
    }

    // Get user to check role
    const user = await db.collection("users").findOne({ email: userEmail });
    if (!user) {
      throw new Error("User not found");
    }

    const isRegularUser = user.role === "USER";

    // Validate: Regular users can only report TRAFFIC_JAM or ACCIDENT
    if (
      isRegularUser &&
      input.kind !== "TRAFFIC_JAM" &&
      input.kind !== "ACCIDENT"
    ) {
      throw new Error(
        "Users can only report TRAFFIC_JAM or ACCIDENT incidents",
      );
    }

    // Validate: Regular users MUST provide location
    if (isRegularUser && !input.reporterLocation) {
      throw new Error("Location is required for user-reported incidents");
    }

    // Generate title based on incident kind
    const titleMap: Record<IncidentKind, string> = {
      INCIDENT: "Zgłoszenie incydentu",
      NETWORK_FAILURE: "Awaria sieci",
      VEHICLE_FAILURE: "Awaria pojazdu",
      ACCIDENT: "Wypadek",
      TRAFFIC_JAM: "Korek uliczny",
      PLATFORM_CHANGES: "Zmiana peronu",
    };
    const generatedTitle = titleMap[input.kind] || "Incydent";

    let affectedSegment = null;
    let detectedLineId: ObjectId | null = null;

    // For regular users: ALWAYS detect segment from location
    if (isRegularUser && input.reporterLocation) {
      console.log(
        `📍 USER report at: ${input.reporterLocation.latitude}, ${input.reporterLocation.longitude}`,
      );

      const stops = await db.collection<StopModel>("Stops").find({}).toArray();

      const segment = determineIncidentSegment(
        input.reporterLocation,
        stops,
        1000, // 1km radius
      );

      if (!segment) {
        throw new Error(
          "Could not detect nearby stops. Please move closer to a transit stop.",
        );
      }

      console.log(`✅ Detected segment: ${formatIncidentSegment(segment)}`);

      affectedSegment = {
        startStopId: new ObjectId(segment.startStopId),
        endStopId: new ObjectId(segment.endStopId),
        lineId: null as ObjectId | string | null,
      };

      // If user provided lineIds, use first one for the segment
      if (input.lineIds && input.lineIds.length > 0 && input.lineIds[0]) {
        detectedLineId = new ObjectId(input.lineIds[0]);
        affectedSegment.lineId = detectedLineId;
      }
    }
    // For admins: Optional geolocation detection
    else if (!isRegularUser && input.reporterLocation) {
      console.log(
        `📍 STAFF report at: ${input.reporterLocation.latitude}, ${input.reporterLocation.longitude}`,
      );

      const stops = await db.collection<StopModel>("Stops").find({}).toArray();

      const segment = determineIncidentSegment(
        input.reporterLocation,
        stops,
        1000,
      );

      if (segment) {
        console.log(
          `✅ Detected incident segment: ${formatIncidentSegment(segment)}`,
        );

        affectedSegment = {
          startStopId: new ObjectId(segment.startStopId),
          endStopId: new ObjectId(segment.endStopId),
          lineId: null as ObjectId | string | null,
        };

        if (input.lineIds && input.lineIds.length > 0 && input.lineIds[0]) {
          detectedLineId = new ObjectId(input.lineIds[0]);
          affectedSegment.lineId = detectedLineId;
        }
      } else {
        console.log(
          "⚠️ Could not determine incident segment from location (no nearby stops)",
        );
      }
    }

    const doc: IncidentModel = {
      title: generatedTitle,
      description: input.description || null,
      kind: input.kind,
      status: (input.status || "PUBLISHED") as ReportStatus,
      lineIds: Array.isArray(input.lineIds)
        ? input.lineIds.map((id) => (id ? new ObjectId(id) : null))
        : null,
      affectedSegment,
      delayMinutes: input.delayMinutes || null,
      isFake: false,
      reportedBy: user._id, // Track who reported for reputation
      createdAt: now,
    };

    const res = await db.collection<IncidentModel>("Incidents").insertOne(doc);
    const incidentId = res.insertedId.toString();

    // Create IncidentLocation entry for detected segments
    if (affectedSegment && detectedLineId) {
      // Determine severity based on incident kind
      const severity =
        input.kind === "VEHICLE_FAILURE" || input.kind === "NETWORK_FAILURE"
          ? "HIGH"
          : input.kind === "ACCIDENT"
            ? "MEDIUM"
            : "LOW";

      const incidentLocation: IncidentLocationModel = {
        incidentId: res.insertedId,
        lineId: detectedLineId,
        startStopId: affectedSegment.startStopId,
        endStopId: affectedSegment.endStopId,
        severity,
        active: true,
        createdAt: now,
        resolvedAt: null,
      };

      await db
        .collection<IncidentLocationModel>("IncidentLocations")
        .insertOne(incidentLocation);

      console.log(
        `✅ Created IncidentLocation for line ${detectedLineId} between stops`,
        `✅ Created IncidentLocation: Line ${detectedLineId}, severity ${severity}`,
      );
    }

    const incident = {
      id: incidentId,
      ...doc,
      lineIds:
        doc.lineIds?.map((id) =>
          id ? (typeof id === "string" ? id : id.toString()) : null,
        ) ?? null,
    };

    // Intelligent notification system (with deduplication and trust score)
    // Map MODERATOR role to USER for backwards compatibility
    const mappedRole = user.role === "MODERATOR" ? "USER" : user.role;
    await processIncidentNotifications(db, doc, mappedRole as "USER" | "ADMIN");
    // Notify affected users
    await notifyAffectedUsers(doc, incidentId, db);

    // Publish real-time event
    pubsub.publish(CHANNELS.INCIDENT_CREATED, incident);
    if (incident.lineIds && incident.lineIds.length > 0) {
      incident.lineIds.forEach((lineId: string | null) => {
        if (lineId) {
          pubsub.publish(
            `${CHANNELS.LINE_INCIDENT_UPDATES}:${lineId}`,
            incident,
          );
        }
      });
    }

    return incident;
  },

  async updateReport(
    _: unknown,
    { id, input }: { id: string; input: UpdateReportInput },
    ctx: GraphQLContext,
  ) {
    const db = await DB();

    const updateFields: Partial<IncidentModel> = {};

    if (input.description !== undefined)
      updateFields.description = input.description;
    if (input.kind !== undefined) updateFields.kind = input.kind;
    if (input.status !== undefined) updateFields.status = input.status;
    if (input.delayMinutes !== undefined)
      updateFields.delayMinutes = input.delayMinutes;
    if (input.lineIds !== undefined)
      updateFields.lineIds = input.lineIds.map((lid) =>
        lid ? new ObjectId(lid) : null,
      );

    const result = await db
      .collection<IncidentModel>("Incidents")
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateFields },
        { returnDocument: "after" },
      );

    if (!result) {
      throw new Error(`Incident ${id} not found`);
    }

    const incident = {
      id: result._id!.toString(),
      ...result,
      lineIds:
        result.lineIds?.map((lid) =>
          lid ? (typeof lid === "string" ? lid : lid.toString()) : null,
        ) ?? null,
    };

    pubsub.publish(CHANNELS.INCIDENT_UPDATED, incident);
    if (incident.lineIds && incident.lineIds.length > 0) {
      incident.lineIds.forEach((lineId: string | null) => {
        if (lineId) {
          pubsub.publish(
            `${CHANNELS.LINE_INCIDENT_UPDATES}:${lineId}`,
            incident,
          );
        }
      });
    }

    return incident;
  },

  async deleteReport(
    _: unknown,
    { id }: { id: string },
    ctx: GraphQLContext,
  ): Promise<boolean> {
    const db = await DB();
    const result = await db
      .collection<IncidentModel>("Incidents")
      .deleteOne({ _id: new ObjectId(id) });

    return result.deletedCount > 0;
  },

  async publishReport(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
    const db = await DB();
    const result = await db
      .collection<IncidentModel>("Incidents")
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { status: "PUBLISHED", updatedAt: new Date().toISOString() } },
        { returnDocument: "after" },
      );

    if (!result) {
      throw new Error(`Incident ${id} not found`);
    }

    const incident = {
      id: result._id!.toString(),
      ...result,
      lineIds:
        result.lineIds?.map((lid) =>
          lid ? (typeof lid === "string" ? lid : lid.toString()) : null,
        ) ?? null,
    };

    pubsub.publish(CHANNELS.INCIDENT_CREATED, incident);

    return incident;
  },

  async resolveReport(
    _: unknown,
    { id, isFake }: { id: string; isFake?: boolean },
    ctx: GraphQLContext,
  ) {
    const db = await DB();
    const userEmail = ctx.session?.user?.email;

    if (!userEmail) {
      throw new Error("Not authenticated");
    }

    // Get user to check role
    const user = await db.collection("users").findOne({ email: userEmail });
    if (!user) {
      throw new Error("User not found");
    }

    // Only ADMIN can resolve reports
    if (user.role !== "ADMIN") {
      throw new Error("Only administrators can resolve reports");
    }

    // Fetch the incident to resolve
    const incident = await db
      .collection<IncidentModel>("Incidents")
      .findOne({ _id: new ObjectId(id) });

    if (!incident) {
      throw new Error(`Incident ${id} not found`);
    }

    // Update incident status to RESOLVED and set isFake flag
    const result = await db
      .collection<IncidentModel>("Incidents")
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        {
          $set: {
            status: "RESOLVED",
            isFake: isFake ?? false,
            updatedAt: new Date().toISOString(),
          },
        },
        { returnDocument: "after" },
      );

    if (!result) {
      throw new Error(`Failed to update incident ${id}`);
    }

    // Find similar reports on the same line/segment within 24h time window
    const similarReports = await findSimilarReports(db, incident, 24);

    // Update reputation for the reporter and similar reporters
    await updateUserReputation(db, incident, similarReports, isFake ?? false);

    const updatedIncident = {
      id: result._id!.toString(),
      ...result,
      lineIds:
        result.lineIds?.map((lid) =>
          lid ? (typeof lid === "string" ? lid : lid.toString()) : null,
        ) ?? null,
    };

    pubsub.publish(CHANNELS.INCIDENT_UPDATED, updatedIncident);

    return updatedIncident;
  },

  // ============================================
  // USER JOURNEY MUTATIONS
  // ============================================
  async setActiveJourney(
    _: unknown,
    { input }: { input: ActiveJourneyInput },
    ctx: GraphQLContext,
  ): Promise<ActiveJourney | null> {
    console.log("🚀 setActiveJourney called");
    console.log("   Context session:", !!ctx.session);
    console.log("   Session user email:", ctx.session?.user?.email);

    const db = await DB();
    const userEmail = ctx.session?.user?.email;

    if (!userEmail) {
      console.error("❌ Not authenticated - no email in session");
      console.error("   Session:", JSON.stringify(ctx.session, null, 2));
      throw new Error("Not authenticated");
    }

    // Calculate times from segments
    const firstSegment = input.segments[0];
    const lastSegment = input.segments[input.segments.length - 1];
    const startTime = firstSegment.departureTime;
    const expectedEndTime = lastSegment.arrivalTime;

    // Convert segments to JourneySegment format with ObjectIds
    const segments = input.segments.map((seg) => ({
      from: {
        stopId: new ObjectId(seg.from.stopId),
        stopName: seg.from.stopName,
        coordinates: seg.from.coordinates,
      },
      to: {
        stopId: new ObjectId(seg.to.stopId),
        stopName: seg.to.stopName,
        coordinates: seg.to.coordinates,
      },
      lineId: new ObjectId(seg.lineId),
      lineName: seg.lineName,
      transportType: seg.transportType,
      departureTime: seg.departureTime,
      arrivalTime: seg.arrivalTime,
      duration: seg.duration,
    }));

    const activeJourney: ActiveJourney = {
      segments,
      startTime,
      expectedEndTime,
    };

    console.log("Setting active journey for user:", userEmail);
    console.log(
      "Active journey segments count:",
      activeJourney.segments.length,
    );
    console.log(
      "First segment:",
      JSON.stringify(activeJourney.segments[0], null, 2),
    );

    const result = await db
      .collection("users")
      .updateOne({ email: userEmail }, { $set: { activeJourney } });

    console.log("Set active journey result:", {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      acknowledged: result.acknowledged,
    });

    if (result.matchedCount === 0) {
      console.error("❌ User not found:", userEmail);
      throw new Error("User not found");
    }

    console.log("✅ Active journey set successfully");

    // Return the created ActiveJourney with string IDs for GraphQL
    return {
      segments: activeJourney.segments.map((seg) => ({
        from: {
          stopId:
            seg.from.stopId instanceof ObjectId
              ? seg.from.stopId.toString()
              : seg.from.stopId,
          stopName: seg.from.stopName,
          coordinates: seg.from.coordinates,
        },
        to: {
          stopId:
            seg.to.stopId instanceof ObjectId
              ? seg.to.stopId.toString()
              : seg.to.stopId,
          stopName: seg.to.stopName,
          coordinates: seg.to.coordinates,
        },
        lineId:
          seg.lineId instanceof ObjectId ? seg.lineId.toString() : seg.lineId,
        lineName: seg.lineName,
        transportType: seg.transportType,
        departureTime: seg.departureTime,
        arrivalTime: seg.arrivalTime,
        duration: seg.duration,
        hasIncident: false, // TODO: Check for incidents on this segment
      })),
      startTime: activeJourney.startTime,
      expectedEndTime: activeJourney.expectedEndTime,
    };
  },

  async clearActiveJourney(
    _: unknown,
    __: unknown,
    ctx: GraphQLContext,
  ): Promise<boolean> {
    const db = await DB();
    const userEmail = ctx.session?.user?.email;

    if (!userEmail) {
      throw new Error("Not authenticated");
    }

    const user = await db
      .collection<UserModel>("users")
      .findOne({ email: userEmail });

    if (!user?._id) {
      throw new Error("User not found");
    }

    const userId =
      typeof user._id === "string" ? user._id : user._id.toString();

    const result = await db
      .collection("users")
      .updateOne({ email: userEmail }, { $unset: { activeJourney: "" } });

    await db
      .collection<JourneyNotificationModel>(COLLECTIONS.JOURNEY_NOTIFICATIONS)
      .deleteMany({ userId });

    return result.modifiedCount > 0;
  },

  async addFavoriteConnection(
    _: unknown,
    { input }: { input: FavoriteConnectionInput },
    ctx: GraphQLContext,
  ): Promise<string> {
    const db = await DB();
    const userEmail = ctx.session?.user?.email;

    if (!userEmail) {
      throw new Error("Not authenticated");
    }

    const favoriteId = new ObjectId().toString();
    const favorite: FavoriteConnection = {
      id: favoriteId,
      name: input.name,
      startStopId: new ObjectId(input.startStopId),
      endStopId: new ObjectId(input.endStopId),
    };

    await db
      .collection("users")
      .updateOne(
        { email: userEmail },
        { $push: { favoriteConnections: favorite } },
      );

    return favoriteId;
  },

  async removeFavoriteConnection(
    _: unknown,
    { id }: { id: string },
    ctx: GraphQLContext,
  ): Promise<boolean> {
    const db = await DB();
    const userEmail = ctx.session?.user?.email;

    if (!userEmail) {
      throw new Error("Not authenticated");
    }

    const result = await db
      .collection("users")
      .updateOne(
        { email: userEmail },
        { $pull: { favoriteConnections: { id } } },
      );

    return result.modifiedCount > 0;
  },

  async upsertJourneyNotification(
    _: unknown,
    { input }: { input: JourneyNotificationInput },
    ctx: GraphQLContext,
  ): Promise<JourneyNotificationResult> {
    const db = await DB();
    const userEmail = ctx.session?.user?.email;

    if (!userEmail) {
      throw new Error("Not authenticated");
    }

    const user = await db
      .collection<UserModel>("users")
      .findOne({ email: userEmail });

    if (!user?._id) {
      throw new Error("User not found");
    }

    const userId =
      typeof user._id === "string" ? user._id : user._id.toString();
    const now = new Date().toISOString();

    const doc = await db
      .collection<JourneyNotificationModel>(COLLECTIONS.JOURNEY_NOTIFICATIONS)
      .findOneAndUpdate(
        { userId, incidentId: input.incidentId },
        {
          $set: {
            userId,
            incidentId: input.incidentId,
            title: input.title,
            description: input.description ?? null,
            kind: input.kind ?? null,
            status: input.status ?? null,
            lineId: input.lineId ?? null,
            lineName: input.lineName ?? null,
            delayMinutes: input.delayMinutes ?? null,
            dismissedAt: null,
          },
          $setOnInsert: {
            receivedAt: now,
          },
        },
        {
          upsert: true,
          returnDocument: "after",
        },
      );

    if (!doc) {
      throw new Error("Failed to upsert journey notification");
    }

    return mapJourneyNotification(doc);
  },

  async dismissJourneyNotification(
    _: unknown,
    { id }: { id: string },
    ctx: GraphQLContext,
  ): Promise<boolean> {
    const db = await DB();
    const userEmail = ctx.session?.user?.email;

    if (!userEmail) {
      throw new Error("Not authenticated");
    }

    const user = await db
      .collection<UserModel>("users")
      .findOne({ email: userEmail });

    if (!user?._id) {
      throw new Error("User not found");
    }

    const userId =
      typeof user._id === "string" ? user._id : user._id.toString();

    const result = await db
      .collection<JourneyNotificationModel>(COLLECTIONS.JOURNEY_NOTIFICATIONS)
      .deleteOne({ userId, incidentId: id });

    return result.deletedCount > 0;
  },

  async clearJourneyNotifications(
    _: unknown,
    __: unknown,
    ctx: GraphQLContext,
  ): Promise<boolean> {
    const db = await DB();
    const userEmail = ctx.session?.user?.email;

    if (!userEmail) {
      throw new Error("Not authenticated");
    }

    const user = await db
      .collection<UserModel>("users")
      .findOne({ email: userEmail });

    if (!user?._id) {
      throw new Error("User not found");
    }

    const userId =
      typeof user._id === "string" ? user._id : user._id.toString();

    const result = await db
      .collection<JourneyNotificationModel>(COLLECTIONS.JOURNEY_NOTIFICATIONS)
      .deleteMany({ userId });

    return result.acknowledged;
  },
};

export default Mutation;
