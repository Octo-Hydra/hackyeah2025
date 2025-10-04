import pathResolvers from "./pathResolvers.js";
import type {
  GraphQLContext,
  LineModel,
  IncidentModel,
} from "../db/collections";
import { DB } from "../db/client.js";
import { ObjectId } from "mongodb";

export const Query = {
  me: () => null,

  // Moved from userQuery.ts
  async incidentsByLine(
    _: unknown,
    { lineId, transportType }: { lineId: string; transportType?: string }
  ) {
    const db = await DB();
    const query: any = {
      lineIds: new ObjectId(lineId),
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
