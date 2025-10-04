import pathResolvers from "./pathResolvers.js";
import type {
  GraphQLContext,
  LineModel,
  IncidentModel,
  UserModel,
} from "../db/collections";
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

    // Convert ObjectIds to strings for GraphQL
    return {
      id: user._id?.toString() ?? "",
      name: user.name,
      email: user.email,
      role: user.role,
      reputation: user.reputation ?? 0,
      activeJourney: user.activeJourney
        ? {
            routeIds: user.activeJourney.routeIds.map((id) =>
              id instanceof ObjectId ? id.toString() : id,
            ),
            lineIds: user.activeJourney.lineIds.map((id) =>
              id instanceof ObjectId ? id.toString() : id,
            ),
            startStop: {
              stopId:
                user.activeJourney.startStop.stopId instanceof ObjectId
                  ? user.activeJourney.startStop.stopId.toString()
                  : user.activeJourney.startStop.stopId,
              stopName: user.activeJourney.startStop.stopName,
              coordinates: user.activeJourney.startStop.coordinates,
            },
            endStop: {
              stopId:
                user.activeJourney.endStop.stopId instanceof ObjectId
                  ? user.activeJourney.endStop.stopId.toString()
                  : user.activeJourney.endStop.stopId,
              stopName: user.activeJourney.endStop.stopName,
              coordinates: user.activeJourney.endStop.coordinates,
            },
            startTime: user.activeJourney.startTime,
            expectedEndTime: user.activeJourney.expectedEndTime,
          }
        : null,
    };
  },

  // Moved from userQuery.ts
  async incidentsByLine(
    _: unknown,
    { lineId }: { lineId: string; transportType?: string },
  ) {
    const db = await DB();
    const query: Partial<IncidentModel> = {
      lineIds: [new ObjectId(lineId)],
      status: "PUBLISHED",
    };

    const incidents = await db
      .collection<IncidentModel>("Incidents")
      .find(query)
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
};

export default Query;
