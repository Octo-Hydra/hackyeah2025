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
  startTime: string;
  expectedEndTime: string;
}

interface FavoriteConnectionInput {
  name: string;
  routeIds: string[];
  lineIds: string[];
  startStopId: string;
  endStopId: string;
  notifyAlways?: boolean;
}

// Helper functions
function mapUserDoc(user: UserModel) {
  return {
    id: user._id?.toString() || user.id || "",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    name: user.name,
    email: user.email,
    role: user.role,
    twoFactorEnabled: user.twoFactorEnabled,
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
          notifiedIncidentIds:
            user.activeJourney.notifiedIncidentIds?.map((id) =>
              typeof id === "string" ? id : id.toString()
            ) || [],
        }
      : null,
    favoriteConnections:
      user.favoriteConnections?.map((fav) => ({
        id: fav.id,
        name: fav.name,
        routeIds: fav.routeIds.map((id) =>
          typeof id === "string" ? id : id.toString()
        ),
        lineIds: fav.lineIds.map((id) =>
          typeof id === "string" ? id : id.toString()
        ),
        startStopId:
          typeof fav.startStopId === "string"
            ? fav.startStopId
            : fav.startStopId.toString(),
        endStopId:
          typeof fav.endStopId === "string"
            ? fav.endStopId
            : fav.endStopId.toString(),
        notifyAlways: fav.notifyAlways,
        createdAt: fav.createdAt,
      })) || [],
  };
}

// Notify affected users about new incident
async function notifyAffectedUsers(
  doc: IncidentModel,
  incidentId: string,
  db: any
) {
  const users = await db.collection("Users").find({}).toArray();

  for (const user of users) {
    if (!user.activeJourney && !user.favoriteConnections?.length) continue;

    const activeLineIds = extractActiveJourneyLineIds(user);
    const favoriteLineIds = extractFavoriteLineIds(user);

    const incidentLineIds =
      doc.lineIds?.map((id) =>
        id ? (typeof id === "string" ? id : id.toString()) : null
      ) ?? [];

    const decision = shouldNotifyUser(
      incidentLineIds,
      activeLineIds,
      favoriteLineIds,
      doc.incidentClass
    );

    if (decision.shouldNotify) {
      console.log(
        `✅ NOTIFY ${user.email}: ${decision.reason} (priority: ${decision.priority})`
      );

      if (user.activeJourney) {
        const currentNotified = user.activeJourney.notifiedIncidentIds || [];
        await db.collection("Users").updateOne(
          { _id: user._id },
          {
            $set: {
              "activeJourney.notifiedIncidentIds": [
                ...currentNotified,
                new ObjectId(incidentId),
              ],
            },
          }
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
    { name, email, password }: { name: string; email: string; password: string }
  ) => ({
    success: true,
    message: "registered (mock)",
    data: null,
  }),

  verifyEmail: (_: unknown, { token }: { token: string }) => ({
    success: true,
    message: "verified (mock)",
    data: null,
  }),

  resendVerificationEmail: (_: unknown, { email }: { email: string }) => ({
    success: true,
    message: "resent (mock)",
    data: null,
  }),

  setup2FA: () => ({ secret: "mock-secret", qrCode: "mock-qrcode" }),

  verify2FA: (
    _: unknown,
    { token, secret }: { token: string; secret: string }
  ) => ({
    success: true,
    message: "2FA verified (mock)",
    data: null,
  }),

  disable2FA: () => ({
    success: true,
    message: "2FA disabled (mock)",
    data: null,
  }),

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

    const incidentClass =
      input.kind === "VEHICLE_FAILURE" ||
      input.kind === "NETWORK_FAILURE" ||
      input.kind === "PEDESTRIAN_ACCIDENT"
        ? "CLASS_1"
        : "CLASS_2";

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
      incidentClass,
      status: (input.status || "PUBLISHED") as ReportStatus,
      lineIds: Array.isArray(input.lineIds)
        ? input.lineIds.map((id) => (id ? new ObjectId(id) : null))
        : null,
      reporterLocation: input.reporterLocation || null,
      affectedSegment,
      createdBy: ctx.session?.user?.email || null,
      createdAt: now,
      updatedAt: now,
    };

    const res = await db.collection<IncidentModel>("Incidents").insertOne(doc);
    const incidentId = res.insertedId.toString();

    // Create IncidentLocation entry
    if (affectedSegment && detectedLineId) {
      const incidentLocation: IncidentLocationModel = {
        incidentId: res.insertedId,
        lineId: detectedLineId,
        startStopId: affectedSegment.startStopId,
        endStopId: affectedSegment.endStopId,
        severity: incidentClass === "CLASS_1" ? "HIGH" : "MEDIUM",
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
    const now = new Date().toISOString();

    const updateFields: Partial<IncidentModel> = {
      updatedAt: now,
    };

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

  async deleteReport(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
    const db = await DB();
    const result = await db
      .collection<IncidentModel>("Incidents")
      .deleteOne({ _id: new ObjectId(id) });

    return {
      success: result.deletedCount > 0,
      message:
        result.deletedCount > 0 ? "Incident deleted" : "Incident not found",
      data: null,
    };
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
  ) {
    const db = await DB();
    const userEmail = ctx.session?.user?.email;

    if (!userEmail) {
      throw new Error("Not authenticated");
    }

    const activeJourney: ActiveJourney = {
      routeIds: input.routeIds.map((id) => new ObjectId(id)),
      lineIds: input.lineIds.map((id) => new ObjectId(id)),
      startStopId: new ObjectId(input.startStopId),
      endStopId: new ObjectId(input.endStopId),
      startTime: input.startTime,
      expectedEndTime: input.expectedEndTime,
      notifiedIncidentIds: [],
    };

    const result = await db
      .collection<UserModel>("Users")
      .findOneAndUpdate(
        { email: userEmail },
        { $set: { activeJourney, updatedAt: new Date().toISOString() } },
        { returnDocument: "after" }
      );

    if (!result) {
      throw new Error("User not found");
    }

    return mapUserDoc(result);
  },

  async clearActiveJourney(_: unknown, __: any, ctx: GraphQLContext) {
    const db = await DB();
    const userEmail = ctx.session?.user?.email;

    if (!userEmail) {
      throw new Error("Not authenticated");
    }

    const result = await db.collection<UserModel>("Users").findOneAndUpdate(
      { email: userEmail },
      {
        $unset: { activeJourney: "" },
        $set: { updatedAt: new Date().toISOString() },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      throw new Error("User not found");
    }

    return mapUserDoc(result);
  },

  async addFavoriteConnection(
    _: unknown,
    { input }: { input: FavoriteConnectionInput },
    ctx: GraphQLContext
  ) {
    const db = await DB();
    const userEmail = ctx.session?.user?.email;

    if (!userEmail) {
      throw new Error("Not authenticated");
    }

    const favorite: FavoriteConnection = {
      id: new ObjectId().toString(),
      name: input.name,
      routeIds: input.routeIds.map((id) => new ObjectId(id)),
      lineIds: input.lineIds.map((id) => new ObjectId(id)),
      startStopId: new ObjectId(input.startStopId),
      endStopId: new ObjectId(input.endStopId),
      notifyAlways: input.notifyAlways ?? false,
      createdAt: new Date().toISOString(),
    };

    const result = await db.collection<UserModel>("Users").findOneAndUpdate(
      { email: userEmail },
      {
        $push: { favoriteConnections: favorite },
        $set: { updatedAt: new Date().toISOString() },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      throw new Error("User not found");
    }

    return {
      ...favorite,
      routeIds: favorite.routeIds.map((id) => id.toString()),
      lineIds: favorite.lineIds.map((id) => id.toString()),
      startStopId: favorite.startStopId.toString(),
      endStopId: favorite.endStopId.toString(),
    };
  },

  async removeFavoriteConnection(
    _: unknown,
    { id }: { id: string },
    ctx: GraphQLContext
  ) {
    const db = await DB();
    const userEmail = ctx.session?.user?.email;

    if (!userEmail) {
      throw new Error("Not authenticated");
    }

    const result = await db.collection<UserModel>("Users").updateOne(
      { email: userEmail },
      {
        $pull: { favoriteConnections: { id } as any },
        $set: { updatedAt: new Date().toISOString() },
      }
    );

    return {
      success: result.modifiedCount > 0,
      message:
        result.modifiedCount > 0 ? "Favorite removed" : "Favorite not found",
      data: null,
    };
  },

  async updateFavoriteConnection(
    _: unknown,
    { id, input }: { id: string; input: FavoriteConnectionInput },
    ctx: GraphQLContext
  ) {
    const db = await DB();
    const userEmail = ctx.session?.user?.email;

    if (!userEmail) {
      throw new Error("Not authenticated");
    }

    const user = await db
      .collection<UserModel>("Users")
      .findOne({ email: userEmail });

    if (!user || !user.favoriteConnections) {
      throw new Error("User or favorites not found");
    }

    const favIndex = user.favoriteConnections.findIndex((f) => f.id === id);
    if (favIndex === -1) {
      throw new Error("Favorite not found");
    }

    const updated: FavoriteConnection = {
      id,
      name: input.name,
      routeIds: input.routeIds.map((rid) => new ObjectId(rid)),
      lineIds: input.lineIds.map((lid) => new ObjectId(lid)),
      startStopId: new ObjectId(input.startStopId),
      endStopId: new ObjectId(input.endStopId),
      notifyAlways: input.notifyAlways ?? false,
      createdAt: user.favoriteConnections[favIndex].createdAt,
    };

    user.favoriteConnections[favIndex] = updated;

    await db.collection<UserModel>("Users").updateOne(
      { email: userEmail },
      {
        $set: {
          favoriteConnections: user.favoriteConnections,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    return {
      ...updated,
      routeIds: updated.routeIds.map((id) => id.toString()),
      lineIds: updated.lineIds.map((id) => id.toString()),
      startStopId: updated.startStopId.toString(),
      endStopId: updated.endStopId.toString(),
    };
  },
};

export default Mutation;
