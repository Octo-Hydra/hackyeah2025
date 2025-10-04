import { ObjectId } from "mongodb";
import type { IncidentModel, UserModel } from "../db/collections.js";
import { DB } from "../db/client.js";

/**
 * Field resolvers for Incident type
 * Resolves nested fields dynamically
 */
export const Incident = {
  /**
   * Resolve reporter field - fetches user with dynamic trustScore
   */
  async reporter(parent: IncidentModel) {
    if (!parent.reportedBy) {
      return null;
    }

    const db = await DB();
    const user = await db
      .collection<UserModel>("Users")
      .findOne({ _id: new ObjectId(parent.reportedBy) });

    if (!user) {
      return null;
    }

    return {
      id: user._id?.toString() || "",
      name: user.name,
      email: user.email,
      role: user.role,
      reputation: user.reputation,
      trustScore: user.trustScore, // Dynamic value from cron
      trustScoreBreakdown: user.trustScoreBreakdown,
    };
  },

  /**
   * Resolve lines field - fetches line details
   */
  async lines(parent: IncidentModel) {
    if (!parent.lineIds || parent.lineIds.length === 0) {
      return [];
    }

    const db = await DB();
    const validLineIds = parent.lineIds
      .filter((id): id is ObjectId | string => id !== null)
      .map((id) => (typeof id === "string" ? new ObjectId(id) : id));

    const lines = await db
      .collection("Lines")
      .find({ _id: { $in: validLineIds } })
      .toArray();

    return lines.map((line) => ({
      id: line._id?.toString() || "",
      name: line.name,
      transportType: line.transportType,
    }));
  },
};

export default Incident;
