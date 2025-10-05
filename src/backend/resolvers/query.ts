import pathResolvers from "./pathResolversSimple.js";
import type {
  GraphQLContext,
  LineModel,
  IncidentModel,
  UserModel,
  JourneyNotificationModel,
} from "../db/collections";
import { COLLECTIONS } from "../db/collections";
import { DB } from "../db/client.js";
import { ObjectId } from "mongodb";

export const Query = {
  async me(_: unknown, __: unknown, ctx: GraphQLContext) {
    const db = await DB();
    const userEmail = ctx.session?.user?.email;

    if (!userEmail) {
      return null;
    }

    // Find user by email
    const user = await db
      .collection<UserModel>("users")
      .findOne({ email: userEmail });

    if (!user) {
      return null;
    }

    const userId =
      typeof user._id === "string" ? user._id : user._id?.toString();

    // Fetch only active notifications (not dismissed)
    const notifications = await db
      .collection<JourneyNotificationModel>(COLLECTIONS.JOURNEY_NOTIFICATIONS)
      .find({
        userId,
        dismissedAt: null,
      })
      .sort({ receivedAt: -1 })
      .toArray();

    // Convert ObjectIds to strings for GraphQL
    return {
      id: user._id?.toString() ?? "",
      name: user.name,
      email: user.email,
      role: user.role,
      reputation: user.reputation ?? 0,
      journeyNotifications: notifications.map((notification) => ({
        id: notification.incidentId,
        incidentId: notification.incidentId,
        title: notification.title,
        description: notification.description,
        kind: notification.kind,
        status: notification.status ?? null,
        lineId:
          notification.lineId instanceof ObjectId
            ? notification.lineId.toString()
            : (notification.lineId ?? null),
        lineName: notification.lineName ?? null,
        delayMinutes: notification.delayMinutes ?? null,
        receivedAt: notification.receivedAt,
        dismissedAt: notification.dismissedAt ?? null,
      })),
      activeJourney: user.activeJourney
        ? {
            segments: user.activeJourney.segments.map((seg) => ({
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
                seg.lineId instanceof ObjectId
                  ? seg.lineId.toString()
                  : seg.lineId,
              lineName: seg.lineName,
              transportType: seg.transportType,
              departureTime: seg.departureTime,
              arrivalTime: seg.arrivalTime,
              duration: seg.duration,
              hasIncident: false, // TODO: Check for incidents
            })),
            startTime: user.activeJourney.startTime,
            expectedEndTime: user.activeJourney.expectedEndTime,
          }
        : null,
    };
  },

  // Moved from userQuery.ts
  async incidentsByLine(
    _: unknown,
    { lineId }: { lineId: string; transportType?: string }
  ) {
    const db = await DB();
    const query: Partial<IncidentModel> = {
      lineIds: [new ObjectId(lineId)],
      status: "PUBLISHED",
    };

    const incidents = await db
      .collection<IncidentModel>("Incidents")
      .find({ ...query, isFake: { $ne: true } })
      .toArray();

    return incidents.map((doc) => ({
      id: doc._id?.toString() ?? "",
      ...doc,
    }));
  },

  async lines(_: unknown, { transportType }: { transportType?: string }) {
    const db = await DB();
    const q: Partial<LineModel> = {};
    if (transportType) {
      q.transportType = transportType as "BUS" | "RAIL";
    }
    const docs = await db.collection<LineModel>("Lines").find(q).toArray();
    return docs.map((d) => ({
      id: d._id?.toString() ?? "",
      ...d,
    }));
  },

  findPath: pathResolvers.findPath,
  stops: pathResolvers.stops,

  async searchStops(
    _: unknown,
    { query, limit = 10 }: { query: string; limit?: number }
  ) {
    const db = await DB();
    const regex = new RegExp(query, "i"); // Case-insensitive search

    const stops = await db
      .collection("Stops")
      .find({
        name: { $regex: regex },
      })
      .limit(limit)
      .toArray();

    return stops.map((stop) => ({
      id: stop._id?.toString() ?? "",
      name: stop.name,
      coordinates: stop.coordinates,
      transportType: stop.transportType || "BUS",
    }));
  },
};

export default Query;
