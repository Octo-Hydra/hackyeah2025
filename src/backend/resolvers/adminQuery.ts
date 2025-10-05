/**
 * Admin Query Resolvers
 *
 * Provides admin-only queries for:
 * - User management (CRUD)
 * - Incident management (including archived)
 * - Statistics
 *
 * Authorization: ADMIN or MODERATOR role required
 */

import type { Db } from "mongodb";
import { ObjectId } from "mongodb";
import type {
  UserModel,
  IncidentModel,
  LineModel,
} from "@/backend/db/collections";
import { DB } from "../db/client.js";

interface Context {
  db: Db;
  user?: {
    id: string;
    role: "USER" | "MODERATOR" | "ADMIN";
  };
}

interface PaginationInput {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

interface UserFilterInput {
  role?: "USER" | "MODERATOR" | "ADMIN";
  minReputation?: number;
  maxReputation?: number;
  minTrustScore?: number;
  maxTrustScore?: number;
  search?: string;
}

interface IncidentFilterInput {
  status?: "DRAFT" | "PUBLISHED" | "RESOLVED";
  kind?: string;
  lineId?: string;
  transportType?: "BUS" | "RAIL";
  isFake?: boolean;
  reportedBy?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Check if user has admin/moderator privileges
 */
<<<<<<< HEAD
function requireAdminOrModerator(context: Context): void {
=======
async function requireAdminOrModerator(context: Context): Promise<void> {
>>>>>>> 6c77b0188366e029f931ebcfdd3ac237dca2f9e2
  if (!context.user) {
    throw new Error("Authentication required");
  }

  if (context.user.role !== "ADMIN" && context.user.role !== "MODERATOR") {
    throw new Error("Admin or Moderator privileges required");
  }
}

/**
 * Check if user is admin (not just moderator)
 */
function requireAdmin(context: Context): void {
  if (!context.user) {
    throw new Error("Authentication required");
  }

  if (context.user.role !== "ADMIN") {
    throw new Error("Admin privileges required");
  }
}

/**
 * Build MongoDB filter from UserFilterInput
 */
function buildUserFilter(filter?: UserFilterInput): any {
  const mongoFilter: any = {};

  if (filter?.role) {
    mongoFilter.role = filter.role;
  }

  if (
    filter?.minReputation !== undefined ||
    filter?.maxReputation !== undefined
  ) {
    mongoFilter.reputation = {};
    if (filter.minReputation !== undefined) {
      mongoFilter.reputation.$gte = filter.minReputation;
    }
    if (filter.maxReputation !== undefined) {
      mongoFilter.reputation.$lte = filter.maxReputation;
    }
  }

  if (
    filter?.minTrustScore !== undefined ||
    filter?.maxTrustScore !== undefined
  ) {
    mongoFilter.trustScore = {};
    if (filter.minTrustScore !== undefined) {
      mongoFilter.trustScore.$gte = filter.minTrustScore;
    }
    if (filter.maxTrustScore !== undefined) {
      mongoFilter.trustScore.$lte = filter.maxTrustScore;
    }
  }

  if (filter?.search) {
    mongoFilter.$or = [
      { name: { $regex: filter.search, $options: "i" } },
      { email: { $regex: filter.search, $options: "i" } },
    ];
  }

  return mongoFilter;
}

/**
 * Build MongoDB filter from IncidentFilterInput
 */
function buildIncidentFilter(filter?: IncidentFilterInput): any {
  const mongoFilter: any = {};

  if (filter?.status) {
    mongoFilter.status = filter.status;
  }

  if (filter?.kind) {
    mongoFilter.kind = filter.kind;
  }

  if (filter?.lineId) {
    mongoFilter.lineIds = new ObjectId(filter.lineId);
  }

  if (filter?.isFake !== undefined) {
    mongoFilter.isFake = filter.isFake;
  }

  if (filter?.reportedBy) {
    mongoFilter.reportedBy = new ObjectId(filter.reportedBy);
  }

  if (filter?.dateFrom || filter?.dateTo) {
    mongoFilter.createdAt = {};
    if (filter.dateFrom) {
      mongoFilter.createdAt.$gte = filter.dateFrom;
    }
    if (filter.dateTo) {
      mongoFilter.createdAt.$lte = filter.dateTo;
    }
  }

  return mongoFilter;
}

/**
 * Apply pagination to query
 */
async function paginateUsers(
  db: Db,
  filter: any,
  pagination?: PaginationInput
) {
  const limit = pagination?.first || pagination?.last || 20;
  const collection = db.collection<UserModel>("Users");

  // Count total
  const totalCount = await collection.countDocuments(filter);

  // Get users
  let query = collection.find(filter).sort({ createdAt: -1 }).limit(limit);

  if (pagination?.after) {
    const afterId = new ObjectId(pagination.after);
    query = query.skip(1); // Skip the cursor item
  }

  const users = await query.toArray();

  return {
    items: users,
    pageInfo: {
      hasNextPage: users.length === limit,
      hasPreviousPage: !!pagination?.after,
      startCursor: users[0]?._id?.toString() || null,
      endCursor: users[users.length - 1]?._id?.toString() || null,
    },
    totalCount,
  };
}

/**
 * Apply pagination to incidents
 */
async function paginateIncidents(
  db: Db,
  filter: any,
  pagination?: PaginationInput
) {
  const limit = pagination?.first || pagination?.last || 20;
  const collection = db.collection<IncidentModel>("Incidents");

  // Count total
  const totalCount = await collection.countDocuments(filter);

  // Get incidents
  let query = collection.find(filter).sort({ createdAt: -1 }).limit(limit);

  if (pagination?.after) {
    const afterId = new ObjectId(pagination.after);
    query = query.skip(1);
  }

  const incidents = await query.toArray();

  return {
    items: incidents,
    pageInfo: {
      hasNextPage: incidents.length === limit,
      hasPreviousPage: !!pagination?.after,
      startCursor: incidents[0]?._id?.toString() || null,
      endCursor: incidents[incidents.length - 1]?._id?.toString() || null,
    },
    totalCount,
  };
}

export const AdminQueryResolvers = {
  Query: {
    admin: (_: any, __: any, context: Context) => {
      requireAdminOrModerator(context);
      return {}; // Return empty object for nested resolvers
    },
  },

  AdminQuery: {
    /**
     * Get users with filtering and pagination
     */
    users: async (
      _: any,
      args: { filter?: UserFilterInput; pagination?: PaginationInput },
      context: Context
    ) => {
      const filter = buildUserFilter(args.filter);
      return paginateUsers(context.db, filter, args.pagination);
    },

    /**
     * Get single user by ID
     */
    user: async (_: any, args: { id: string }, context: Context) => {
      const user = await context.db
        .collection<UserModel>("Users")
        .findOne({ _id: new ObjectId(args.id) });

      return user;
    },

    /**
     * Get incidents with filtering and pagination
     */
    incidents: async (
      _: any,
      args: { filter?: IncidentFilterInput; pagination?: PaginationInput },
      context: Context
    ) => {
      const filter = buildIncidentFilter(args.filter);
      return paginateIncidents(context.db, filter, args.pagination);
    },

    /**
     * Get single incident by ID
     */
    incident: async (_: any, args: { id: string }, context: Context) => {
      const incident = await context.db
        .collection<IncidentModel>("Incidents")
        .findOne({ _id: new ObjectId(args.id) });

      return incident;
    },

    /**
     * Get archived (RESOLVED) incidents
     */
    archivedIncidents: async (
      _: any,
      args: { filter?: IncidentFilterInput; pagination?: PaginationInput },
      context: Context
    ) => {
      const filter = buildIncidentFilter(args.filter);
      filter.status = "RESOLVED"; // Force RESOLVED status

      return paginateIncidents(context.db, filter, args.pagination);
    },

    /**
     * Get admin statistics
     */
    stats: async (_: any, __: any, context: Context) => {
      const db = context.db;

      // Count users
      const totalUsers = await db
        .collection<UserModel>("Users")
        .countDocuments();
      const usersByRole = await db
        .collection<UserModel>("Users")
        .aggregate([
          {
            $group: {
              _id: "$role",
              count: { $sum: 1 },
            },
          },
        ])
        .toArray();

      const roleStats = {
        users: usersByRole.find((r: any) => r._id === "USER")?.count || 0,
        moderators:
          usersByRole.find((r: any) => r._id === "MODERATOR")?.count || 0,
        admins: usersByRole.find((r: any) => r._id === "ADMIN")?.count || 0,
      };

      // Count incidents
      const totalIncidents = await db
        .collection<IncidentModel>("Incidents")
        .countDocuments();
      const activeIncidents = await db
        .collection<IncidentModel>("Incidents")
        .countDocuments({ status: { $in: ["DRAFT", "PUBLISHED"] } });
      const resolvedIncidents = await db
        .collection<IncidentModel>("Incidents")
        .countDocuments({ status: "RESOLVED" });
      const fakeIncidents = await db
        .collection<IncidentModel>("Incidents")
        .countDocuments({ isFake: true });

      // Incidents by kind
      const incidentsByKind = await db
        .collection<IncidentModel>("Incidents")
        .aggregate([
          {
            $group: {
              _id: "$kind",
              count: { $sum: 1 },
            },
          },
        ])
        .toArray();

      // Average reputation and trust score
      const userStats = await db
        .collection<UserModel>("Users")
        .aggregate([
          {
            $group: {
              _id: null,
              avgReputation: { $avg: "$reputation" },
              avgTrustScore: { $avg: "$trustScore" },
            },
          },
        ])
        .toArray();

      const averageReputation = userStats[0]?.avgReputation || 100;
      const averageTrustScore = userStats[0]?.avgTrustScore || 1.0;

      return {
        totalUsers,
        totalIncidents,
        activeIncidents,
        resolvedIncidents,
        fakeIncidents,
        usersByRole: roleStats,
        incidentsByKind: incidentsByKind.map((item: any) => ({
          kind: item._id,
          count: item.count,
        })),
        averageReputation,
        averageTrustScore,
      };
    },
  },
};
