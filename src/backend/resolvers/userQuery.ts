import { ObjectId } from "mongodb";
import type { GraphQLContext, IncidentModel } from "../db/collections";

export const UserQuery = {
  async incidentsByLine(
    _: unknown,
    { lineId }: { lineId?: string },
    ctx: GraphQLContext
  ) {
    const db = ctx.db;
    if (!lineId) return null;
    const doc = await db
      .collection<IncidentModel>("Incidents")
      .findOne({ lineIds: new ObjectId(lineId) });
    if (!doc) return null;
    return { id: doc._id?.toString() ?? "", ...doc };
  },
};

export default UserQuery;
