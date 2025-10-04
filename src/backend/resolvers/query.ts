import pathResolvers from "./pathResolversSimple";
import type { GraphQLContext, LineModel } from "../db/collections";

export const Query = {
  me: () => null,
  check2FAStatus: (_: unknown, { username }: { username: string }) => ({
    requires2FA: false,
    userExists: false,
  }),
  async lines(
    _: unknown,
    { transportType }: { transportType?: string },
    ctx: GraphQLContext
  ) {
    const db = ctx.db;
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
