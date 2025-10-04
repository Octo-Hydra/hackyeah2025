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
} from "../db/collections.js";
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

// Interfaces
interface CreateReportInput {
  title: string;
  description?: string;
  kind: IncidentKind;
  status?: ReportStatus;
  lineIds?: Array<string | null>;
  reporterLocation?: Coordinates;
}

interface UpdateReportInput {
  title?: string;
  description?: string;
  kind?: IncidentKind;
  status?: ReportStatus;
  lineIds?: Array<string | null>;
}

interface ActiveJourneyInput {
  routeIds: string[];
  lineIds: string[];
  startStopId: string;
  endStopId: string;
}

interface FavoriteConnectionInput {
  name: string;
  startStopId: string;
  endStopId: string;
}

// Helper functions
function mapUserDoc(user: UserModel) {
  return {
    id: user._id?.toString() || user.id || "",
    name: user.name,
    email: user.email,
    role: user.role,
    reputation: user.reputation || 0,
    activeJourney: user.activeJourney
      ? {
          routeIds: user.activeJourney.routeIds.map((id) =>
            typeof id === "string" ? id : id.toString()
          ),
          lineIds: user.activeJourney.lineIds.map((id) =>
            typeof id === "string" ? id : id.toString()
          ),
          startStopId:
            typeof user.activeJourney.startStopId === "string"
              ? user.activeJourney.startStopId
              : user.activeJourney.startStopId.toString(),
          endStopId:
            typeof user.activeJourney.endStopId === "string"
              ? user.activeJourney.endStopId
              : user.activeJourney.endStopId.toString(),
          startTime: user.activeJourney.startTime,
          expectedEndTime: user.activeJourney.expectedEndTime,
        }
      : null,
  };
}

// Notify affected users about new incident
async function notifyAffectedUsers(
  doc: IncidentModel,
  incidentId: string,
  db: any
) {
  // Simplified notification - just log for now
  // TODO: Implement proper user notification based on active journeys and favorites
  console.log(`📢 New incident created: ${doc.title} (ID: ${incidentId})`);
}

export const Mutation = {
  // ============================================
  // AUTH MUTATIONS
  // ============================================
  register: (
    _: unknown,
    { name, email, password }: { name: string; email: string; password: string }
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
    { email }: { email: string }
  ): boolean => {
    // Mock implementation
    return true;
  },

  setup2FA: () => ({ secret: "mock-secret", qrCode: "mock-qrcode" }),

  verify2FA: (
    _: unknown,
    { token, secret }: { token: string; secret: string }
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
    ctx: GraphQLContext
  ) {
    const db = await DB();
    const now = new Date().toISOString();

    let affectedSegment = null;
    let detectedLineId: ObjectId | null = null;

    // Geolocation-based segment detection
    if (input.reporterLocation) {
      console.log(
        `📍 Reporter location: ${input.reporterLocation.latitude}, ${input.reporterLocation.longitude}`
      );

      const stops = await db.collection<StopModel>("Stops").find({}).toArray();

      const segment = determineIncidentSegment(
        input.reporterLocation,
        stops,
        1000
      );

      if (segment) {
        console.log(
          `✅ Detected incident segment: ${formatIncidentSegment(segment)}`
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
          "⚠️ Could not determine incident segment from location (no nearby stops)"
        );
      }
    }

    const doc: IncidentModel = {
      title: input.title,
      description: input.description || null,
      kind: input.kind,
      status: (input.status || "PUBLISHED") as ReportStatus,
      lineIds: Array.isArray(input.lineIds)
        ? input.lineIds.map((id) => (id ? new ObjectId(id) : null))
        : null,
      affectedSegment,
      createdAt: now,
    };

    const res = await db.collection<IncidentModel>("Incidents").insertOne(doc);
    const incidentId = res.insertedId.toString();

    // Create IncidentLocation entry
    if (affectedSegment && detectedLineId) {
      // Determine severity based on incident kind (VEHICLE_FAILURE, NETWORK_FAILURE are high severity)
      const severity =
        input.kind === "VEHICLE_FAILURE" || input.kind === "NETWORK_FAILURE"
          ? "HIGH"
          : "MEDIUM";

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
        `✅ Created IncidentLocation for line ${detectedLineId} between stops`
      );
    }

    const incident = {
      id: incidentId,
      ...doc,
      lineIds:
        doc.lineIds?.map((id) =>
          id ? (typeof id === "string" ? id : id.toString()) : null
        ) ?? null,
    };

    // Notify affected users
    await notifyAffectedUsers(doc, incidentId, db);

    // Publish real-time event
    pubsub.publish(CHANNELS.INCIDENT_CREATED, incident);
    if (incident.lineIds && incident.lineIds.length > 0) {
      incident.lineIds.forEach((lineId: string | null) => {
        if (lineId) {
          pubsub.publish(
            `${CHANNELS.LINE_INCIDENT_UPDATES}:${lineId}`,
            incident
          );
        }
      });
    }

    return incident;
  },

  async updateReport(
    _: unknown,
    { id, input }: { id: string; input: UpdateReportInput },
    ctx: GraphQLContext
  ) {
    const db = await DB();

    const updateFields: Partial<IncidentModel> = {};

    if (input.title !== undefined) updateFields.title = input.title;
    if (input.description !== undefined)
      updateFields.description = input.description;
    if (input.kind !== undefined) updateFields.kind = input.kind;
    if (input.status !== undefined) updateFields.status = input.status;
    if (input.lineIds !== undefined)
      updateFields.lineIds = input.lineIds.map((lid) =>
        lid ? new ObjectId(lid) : null
      );

    const result = await db
      .collection<IncidentModel>("Incidents")
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateFields },
        { returnDocument: "after" }
      );

    if (!result) {
      throw new Error(`Incident ${id} not found`);
    }

    const incident = {
      id: result._id!.toString(),
      ...result,
      lineIds:
        result.lineIds?.map((lid) =>
          lid ? (typeof lid === "string" ? lid : lid.toString()) : null
        ) ?? null,
    };

    pubsub.publish(CHANNELS.INCIDENT_UPDATED, incident);
    if (incident.lineIds && incident.lineIds.length > 0) {
      incident.lineIds.forEach((lineId: string | null) => {
        if (lineId) {
          pubsub.publish(
            `${CHANNELS.LINE_INCIDENT_UPDATES}:${lineId}`,
            incident
          );
        }
      });
    }

    return incident;
  },

  async deleteReport(
    _: unknown,
    { id }: { id: string },
    ctx: GraphQLContext
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
        { returnDocument: "after" }
      );

    if (!result) {
      throw new Error(`Incident ${id} not found`);
    }

    const incident = {
      id: result._id!.toString(),
      ...result,
      lineIds:
        result.lineIds?.map((lid) =>
          lid ? (typeof lid === "string" ? lid : lid.toString()) : null
        ) ?? null,
    };

    pubsub.publish(CHANNELS.INCIDENT_CREATED, incident);

    return incident;
  },

  // ============================================
  // USER JOURNEY MUTATIONS
  // ============================================
  async setActiveJourney(
    _: unknown,
    { input }: { input: ActiveJourneyInput },
    ctx: GraphQLContext
  ): Promise<boolean> {
    const db = await DB();
    const userEmail = ctx.session?.user?.email;

    if (!userEmail) {
      throw new Error("Not authenticated");
    }

    // Generate times automatically
    const now = new Date();
    const startTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    // Estimate 60 minutes for the journey
    const endDate = new Date(now.getTime() + 60 * 60 * 1000);
    const expectedEndTime = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;

    const activeJourney: ActiveJourney = {
      routeIds: input.routeIds.map((id) => new ObjectId(id)),
      lineIds: input.lineIds.map((id) => new ObjectId(id)),
      startStopId: new ObjectId(input.startStopId),
      endStopId: new ObjectId(input.endStopId),
      startTime,
      expectedEndTime,
    };

    const result = await db
      .collection<UserModel>("Users")
      .updateOne({ email: userEmail }, { $set: { activeJourney } });

    return result.modifiedCount > 0;
  },

  async clearActiveJourney(
    _: unknown,
    __: any,
    ctx: GraphQLContext
  ): Promise<boolean> {
    const db = await DB();
    const userEmail = ctx.session?.user?.email;

    if (!userEmail) {
      throw new Error("Not authenticated");
    }

    const result = await db
      .collection<UserModel>("Users")
      .updateOne({ email: userEmail }, { $unset: { activeJourney: "" } });

    return result.modifiedCount > 0;
  },

  async addFavoriteConnection(
    _: unknown,
    { input }: { input: FavoriteConnectionInput },
    ctx: GraphQLContext
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
      .collection<UserModel>("Users")
      .updateOne(
        { email: userEmail },
        { $push: { favoriteConnections: favorite } }
      );

    return favoriteId;
  },

  async removeFavoriteConnection(
    _: unknown,
    { id }: { id: string },
    ctx: GraphQLContext
  ): Promise<boolean> {
    const db = await DB();
    const userEmail = ctx.session?.user?.email;

    if (!userEmail) {
      throw new Error("Not authenticated");
    }

    const result = await db
      .collection<UserModel>("Users")
      .updateOne(
        { email: userEmail },
        { $pull: { favoriteConnections: { id } as any } }
      );

    return result.modifiedCount > 0;
  },
};

export default Mutation;
