/**
 * Admin Analytics Resolvers
 * Provides incident statistics, delay reports, and line analytics
 */

import type { Db } from "mongodb";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import type { IncidentModel, LineModel } from "@/backend/db/collections";

interface Context {
  auth: () => Promise<{
    user?: { id?: string; email?: string; role?: string };
  } | null>;
  db: Db;
}

// Period to milliseconds conversion
function getPeriodMilliseconds(
  period: "LAST_24H" | "LAST_7D" | "LAST_31D",
): number {
  switch (period) {
    case "LAST_24H":
      return 24 * 60 * 60 * 1000;
    case "LAST_7D":
      return 7 * 24 * 60 * 60 * 1000;
    case "LAST_31D":
      return 31 * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000;
  }
}

// Get date range for period
function getDateRange(period: "LAST_24H" | "LAST_7D" | "LAST_31D") {
  const now = new Date();
  const startDate = new Date(now.getTime() - getPeriodMilliseconds(period));
  return {
    startDate: startDate.toISOString(),
    endDate: now.toISOString(),
  };
}

export const adminAnalyticsResolvers = {
  AdminQuery: {
    /**
     * Get incident statistics for a specific line
     */
    lineIncidentStats: async (
      _: unknown,
      args: { lineId: string; period: "LAST_24H" | "LAST_7D" | "LAST_31D" },
      context: Context,
    ) => {
      // Authorization check
      const session = await context.auth();
      if (
        !session?.user?.role ||
        !["ADMIN", "MODERATOR"].includes(session.user.role)
      ) {
        throw new Error("Unauthorized: Admin or Moderator access required");
      }

      const client = await clientPromise;
      const db = client.db();
      const { lineId, period } = args;
      const { startDate, endDate } = getDateRange(period);

      // Get line info
      const line = await db
        .collection<LineModel>("Lines")
        .findOne({ _id: new ObjectId(lineId) });
      if (!line) {
        throw new Error(`Line not found: ${lineId}`);
      }

      // Get incidents for this line in the period
      const incidents = await db
        .collection<IncidentModel>("Incidents")
        .find({
          lineIds: new ObjectId(lineId),
          createdAt: { $gte: startDate, $lte: endDate },
          isFake: { $ne: true },
        })
        .toArray();

      // Count by kind
      const kindCounts: Record<string, number> = {};
      let totalDelayMinutes = 0;
      let delayCount = 0;

      incidents.forEach((incident: IncidentModel) => {
        const kind = incident.kind || "INCIDENT";
        kindCounts[kind] = (kindCounts[kind] || 0) + 1;

        if (incident.delayMinutes) {
          totalDelayMinutes += incident.delayMinutes;
          delayCount++;
        }
      });

      const incidentsByKind = Object.entries(kindCounts).map(
        ([kind, count]) => ({
          kind,
          count,
        }),
      );

      // Timeline: group by day (or hour for 24h period)
      const timeline: Array<{ timestamp: string; incidentCount: number }> = [];
      const bucketSize =
        period === "LAST_24H" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 1 hour or 1 day

      const buckets: Record<string, number> = {};
      incidents.forEach((incident: IncidentModel) => {
        const timestamp = new Date(incident.createdAt);
        const bucketTime =
          Math.floor(timestamp.getTime() / bucketSize) * bucketSize;
        const bucketKey = new Date(bucketTime).toISOString();
        buckets[bucketKey] = (buckets[bucketKey] || 0) + 1;
      });

      Object.entries(buckets)
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .forEach(([timestamp, incidentCount]) => {
          timeline.push({ timestamp, incidentCount });
        });

      return {
        lineId: line._id.toString(),
        lineName: line.name,
        transportType: line.transportType,
        period,
        totalIncidents: incidents.length,
        incidentsByKind,
        averageDelayMinutes:
          delayCount > 0 ? totalDelayMinutes / delayCount : null,
        timeline,
      };
    },

    /**
     * Get delay statistics for a specific line
     */
    lineDelayStats: async (
      _: unknown,
      args: { lineId: string; period: "LAST_24H" | "LAST_7D" | "LAST_31D" },
      context: Context,
    ) => {
      // Authorization check
      const session = await context.auth();
      if (
        !session?.user?.role ||
        !["ADMIN", "MODERATOR"].includes(session.user.role)
      ) {
        throw new Error("Unauthorized: Admin or Moderator access required");
      }

      const client = await clientPromise;
      const db = client.db();
      const { lineId, period } = args;
      const { startDate, endDate } = getDateRange(period);

      // Get line info
      const line = await db
        .collection<LineModel>("Lines")
        .findOne({ _id: new ObjectId(lineId) });
      if (!line) {
        throw new Error(`Line not found: ${lineId}`);
      }

      // Get delay incidents for this line
      const incidents = await db
        .collection<IncidentModel>("Incidents")
        .find({
          lineIds: new ObjectId(lineId),
          createdAt: { $gte: startDate, $lte: endDate },
          isFake: { $ne: true },
          delayMinutes: { $exists: true, $gt: 0 },
        })
        .toArray();

      const delays = incidents
        .map((i: IncidentModel) => i.delayMinutes)
        .filter((d): d is number => d != null);

      if (delays.length === 0) {
        return {
          lineId: line._id.toString(),
          lineName: line.name,
          transportType: line.transportType,
          period,
          totalDelays: 0,
          averageDelayMinutes: 0,
          maxDelayMinutes: 0,
          minDelayMinutes: 0,
          delayDistribution: [],
        };
      }

      const avgDelay =
        delays.reduce((sum: number, d: number) => sum + d, 0) / delays.length;
      const maxDelay = Math.max(...delays);
      const minDelay = Math.min(...delays);

      // Delay distribution buckets
      const buckets = [
        { rangeLabel: "0-5 min", min: 0, max: 5 },
        { rangeLabel: "5-15 min", min: 5, max: 15 },
        { rangeLabel: "15-30 min", min: 15, max: 30 },
        { rangeLabel: "30+ min", min: 30, max: Infinity },
      ];

      const delayDistribution = buckets.map((bucket) => ({
        rangeLabel: bucket.rangeLabel,
        count: delays.filter((d: number) => d >= bucket.min && d < bucket.max)
          .length,
      }));

      return {
        lineId: line._id.toString(),
        lineName: line.name,
        transportType: line.transportType,
        period,
        totalDelays: delays.length,
        averageDelayMinutes: avgDelay,
        maxDelayMinutes: maxDelay,
        minDelayMinutes: minDelay,
        delayDistribution,
      };
    },

    /**
     * Get top delays by transport type (frequency-based ranking)
     */
    topDelays: async (
      _: unknown,
      args: {
        transportType?: "BUS" | "RAIL";
        period: "LAST_24H" | "LAST_7D" | "LAST_31D";
        limit?: number;
      },
      context: Context,
    ) => {
      const client = await clientPromise;
      const db = client.db();
      const { transportType, period, limit = 10 } = args;
      const { startDate, endDate } = getDateRange(period);

      // Build line filter
      const lineFilter: any = {};
      if (transportType) {
        lineFilter.transportType = transportType;
      }

      // Get all lines
      const lines = await db
        .collection<LineModel>("Lines")
        .find(lineFilter)
        .toArray();

      // For each line, count delay incidents
      const lineStats = await Promise.all(
        lines.map(async (line: LineModel) => {
          const incidents = await db
            .collection<IncidentModel>("Incidents")
            .find({
              lineIds: line._id,
              createdAt: { $gte: startDate, $lte: endDate },
              isFake: { $ne: true },
              delayMinutes: { $exists: true, $gt: 0 },
            })
            .toArray();

          const delays = incidents
            .map((i: IncidentModel) => i.delayMinutes)
            .filter((d): d is number => d != null);

          return {
            lineId: line._id?.toString() || "",
            lineName: line.name,
            transportType: line.transportType,
            totalDelays: delays.length,
            averageDelayMinutes:
              delays.length > 0
                ? delays.reduce((sum: number, d: number) => sum + d, 0) /
                  delays.length
                : 0,
            incidentCount: incidents.length,
          };
        }),
      );

      // Sort by frequency (totalDelays) descending
      const sorted = lineStats
        .filter((s: any) => s.totalDelays > 0)
        .sort((a: any, b: any) => b.totalDelays - a.totalDelays);

      // Take top N and add rank
      return sorted.slice(0, limit).map((stat: any, index: number) => ({
        rank: index + 1,
        ...stat,
      }));
    },

    /**
     * Get overview of all lines with incident counts
     */
    linesIncidentOverview: async (
      _: unknown,
      args: { period: "LAST_24H" | "LAST_7D" | "LAST_31D" },
      context: Context,
    ) => {
      // Authorization check
      const session = await context.auth();
      if (
        !session?.user?.role ||
        !["ADMIN", "MODERATOR"].includes(session.user.role)
      ) {
        throw new Error("Unauthorized: Admin or Moderator access required");
      }

      const client = await clientPromise;
      const db = client.db();
      const { period } = args;
      const { startDate, endDate } = getDateRange(period);

      // Get all lines
      const lines = await db.collection<LineModel>("Lines").find({}).toArray();

      // For each line, count incidents and get last incident time
      const overview = await Promise.all(
        lines.map(async (line: LineModel) => {
          const incidents = await db
            .collection<IncidentModel>("Incidents")
            .find({
              lineIds: line._id,
              createdAt: { $gte: startDate, $lte: endDate },
              isFake: { $ne: true },
            })
            .sort({ createdAt: -1 })
            .toArray();

          return {
            lineId: line._id?.toString() || "",
            lineName: line.name,
            transportType: line.transportType,
            incidentCount: incidents.length,
            lastIncidentTime: incidents[0]?.createdAt || null,
          };
        }),
      );

      // Sort by incident count descending
      return overview.sort(
        (a: any, b: any) => b.incidentCount - a.incidentCount,
      );
    },
  },
};
