/**
 * Admin Mutation Resolvers
 *
 * Provides admin-only mutations for:
 * - User CRUD (create, update, delete users without registration)
 * - Advanced incident management
 * - Bulk operations
 *
 * Authorization:
 * - User CRUD: ADMIN only
 * - Incident management: ADMIN or MODERATOR
 */

import type { Db } from "mongodb";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import type {
  UserModel,
  IncidentModel,
  IncidentLocationModel,
} from "@/backend/db/collections";
import { pubsub, CHANNELS } from "./subscriptions.js";

interface Context {
  db: Db;
  user?: {
    id: string;
    role: "USER" | "MODERATOR" | "ADMIN";
  };
}

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: "USER" | "MODERATOR" | "ADMIN";
  reputation?: number;
}

interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: "USER" | "MODERATOR" | "ADMIN";
  reputation?: number;
}

interface CreateAdminIncidentInput {
  title: string;
  description?: string;
  kind: string;
  status?: "DRAFT" | "PUBLISHED" | "RESOLVED";
  lineIds?: string[];
  affectedSegment?: {
    startStopId: string;
    endStopId: string;
    lineId?: string;
  };
  delayMinutes?: number;
}

interface UpdateAdminIncidentInput {
  title?: string;
  description?: string;
  kind?: string;
  status?: "DRAFT" | "PUBLISHED" | "RESOLVED";
  lineIds?: string[];
  affectedSegment?: {
    startStopId: string;
    endStopId: string;
    lineId?: string;
  };
  delayMinutes?: number;
  isFake?: boolean;
}

/**
 * Check if user is admin (ADMIN role only)
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
 * Check if user has admin/moderator privileges
 */
function requireAdminOrModerator(context: Context): void {
  if (!context.user) {
    throw new Error("Authentication required");
  }

  if (context.user.role !== "ADMIN" && context.user.role !== "MODERATOR") {
    throw new Error("Admin or Moderator privileges required");
  }
}

export const AdminMutationResolvers = {
  Mutation: {
    admin: (_: any, __: any, context: Context) => {
      requireAdminOrModerator(context);
      return {}; // Return empty object for nested resolvers
    },
  },

  AdminMutation: {
    /**
     * Create new user (ADMIN only)
     */
    createUser: async (
      _: any,
      args: { input: CreateUserInput },
      context: Context,
    ) => {
      requireAdmin(context); // Only ADMIN can create users

      const { name, email, password, role, reputation } = args.input;

      // Check if email already exists
      const existingUser = await context.db
        .collection("users")
        .findOne({ email });

      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const newUser: UserModel = {
        name,
        email,
        role,
        reputation: reputation || 34,
        trustScore: 1.0,
      };

      const result = await context.db
        .collection("users")
        .insertOne(newUser as any);

      return {
        ...newUser,
        id: result.insertedId.toString(),
        _id: result.insertedId,
      };
    },

    /**
     * Update existing user (ADMIN only)
     */
    updateUser: async (
      _: any,
      args: { id: string; input: UpdateUserInput },
      context: Context,
    ) => {
      requireAdmin(context);

      const updateData: any = {};

      if (args.input.name) updateData.name = args.input.name;
      if (args.input.email) updateData.email = args.input.email;
      if (args.input.role) updateData.role = args.input.role;
      if (args.input.reputation !== undefined)
        updateData.reputation = args.input.reputation;

      // Hash new password if provided
      if (args.input.password) {
        updateData.password = await bcrypt.hash(args.input.password, 10);
      }

      const result = await context.db
        .collection("users")
        .findOneAndUpdate(
          { _id: new ObjectId(args.id) },
          { $set: updateData },
          { returnDocument: "after" },
        );

      if (!result) {
        throw new Error("User not found");
      }

      return result;
    },

    /**
     * Delete user (ADMIN only)
     */
    deleteUser: async (_: any, args: { id: string }, context: Context) => {
      requireAdmin(context);

      const result = await context.db
        .collection("users")
        .deleteOne({ _id: new ObjectId(args.id) });

      return result.deletedCount > 0;
    },

    /**
     * Update user role (ADMIN only)
     */
    updateUserRole: async (
      _: any,
      args: { id: string; role: "USER" | "MODERATOR" | "ADMIN" },
      context: Context,
    ) => {
      requireAdmin(context);

      const result = await context.db
        .collection("users")
        .findOneAndUpdate(
          { _id: new ObjectId(args.id) },
          { $set: { role: args.role } },
          { returnDocument: "after" },
        );

      if (!result) {
        throw new Error("User not found");
      }

      return result;
    },

    /**
     * Update user reputation (ADMIN only)
     */
    updateUserReputation: async (
      _: any,
      args: { id: string; reputation: number },
      context: Context,
    ) => {
      requireAdmin(context);

      const result = await context.db
        .collection("users")
        .findOneAndUpdate(
          { _id: new ObjectId(args.id) },
          { $set: { reputation: args.reputation } },
          { returnDocument: "after" },
        );

      if (!result) {
        throw new Error("User not found");
      }

      return result;
    },

    /**
     * Create admin incident (ADMIN/MODERATOR)
     */
    createIncident: async (
      _: any,
      args: { input: CreateAdminIncidentInput },
      context: Context,
    ) => {
      requireAdminOrModerator(context);

      const {
        title,
        description,
        kind,
        status,
        lineIds,
        affectedSegment,
        delayMinutes,
      } = args.input;

      const incident: IncidentModel = {
        title,
        description: description || null,
        kind: kind as any,
        status: status || "PUBLISHED",
        lineIds: lineIds?.map((id) => new ObjectId(id)) || null,
        affectedSegment: affectedSegment
          ? {
              startStopId: new ObjectId(affectedSegment.startStopId),
              endStopId: new ObjectId(affectedSegment.endStopId),
              lineId: affectedSegment.lineId
                ? new ObjectId(affectedSegment.lineId)
                : null,
            }
          : null,
        delayMinutes: delayMinutes || null,
        isFake: false,
        reportedBy: new ObjectId(context.user!.id),
        createdAt: new Date().toISOString(),
      };

      const result = await context.db
        .collection<IncidentModel>("Incidents")
        .insertOne(incident as any);

      const createdIncident = {
        ...incident,
        id: result.insertedId.toString(),
        _id: result.insertedId,
      };

      // Publish to subscriptions
      pubsub.publish(CHANNELS.INCIDENT_CREATED, createdIncident);

      // Publish per-line updates for WebSocket monitoring
      if (lineIds && lineIds.length > 0) {
        for (const lineId of lineIds) {
          pubsub.publish(
            `${CHANNELS.LINE_INCIDENT_UPDATES}:${lineId}`,
            createdIncident,
          );
          console.log(
            `📡 Published incident to line channel: ${CHANNELS.LINE_INCIDENT_UPDATES}:${lineId}`,
          );
        }
      }

      return createdIncident;
    },

    /**
     * Update incident (ADMIN/MODERATOR)
     */
    updateIncident: async (
      _: any,
      args: { id: string; input: UpdateAdminIncidentInput },
      context: Context,
    ) => {
      requireAdminOrModerator(context);

      const updateData: any = {};

      if (args.input.title) updateData.title = args.input.title;
      if (args.input.description !== undefined)
        updateData.description = args.input.description;
      if (args.input.kind) updateData.kind = args.input.kind;
      if (args.input.status) updateData.status = args.input.status;
      if (args.input.delayMinutes !== undefined)
        updateData.delayMinutes = args.input.delayMinutes;
      if (args.input.isFake !== undefined)
        updateData.isFake = args.input.isFake;

      if (args.input.lineIds) {
        updateData.lineIds = args.input.lineIds.map((id) => new ObjectId(id));
      }

      if (args.input.affectedSegment) {
        updateData.affectedSegment = {
          startStopId: new ObjectId(args.input.affectedSegment.startStopId),
          endStopId: new ObjectId(args.input.affectedSegment.endStopId),
          lineId: args.input.affectedSegment.lineId
            ? new ObjectId(args.input.affectedSegment.lineId)
            : null,
        };
      }

      const result = await context.db
        .collection<IncidentModel>("Incidents")
        .findOneAndUpdate(
          { _id: new ObjectId(args.id) },
          { $set: updateData },
          { returnDocument: "after" },
        );

      if (!result) {
        throw new Error("Incident not found");
      }

      // Publish update
      pubsub.publish(CHANNELS.INCIDENT_UPDATED, result);

      return result;
    },

    /**
     * Delete incident (ADMIN/MODERATOR)
     */
    deleteIncident: async (_: any, args: { id: string }, context: Context) => {
      requireAdminOrModerator(context);

      const result = await context.db
        .collection<IncidentModel>("Incidents")
        .deleteOne({ _id: new ObjectId(args.id) });

      // Also delete associated IncidentLocations
      await context.db
        .collection<IncidentLocationModel>("IncidentLocations")
        .deleteMany({ incidentId: new ObjectId(args.id) });

      return result.deletedCount > 0;
    },

    /**
     * Mark incident as fake (ADMIN/MODERATOR)
     */
    markIncidentAsFake: async (
      _: any,
      args: { id: string },
      context: Context,
    ) => {
      requireAdminOrModerator(context);

      const result = await context.db
        .collection<IncidentModel>("Incidents")
        .findOneAndUpdate(
          { _id: new ObjectId(args.id) },
          { $set: { isFake: true, status: "RESOLVED" } },
          { returnDocument: "after" },
        );

      if (!result) {
        throw new Error("Incident not found");
      }

      // Deactivate incident locations
      await context.db
        .collection<IncidentLocationModel>("IncidentLocations")
        .updateMany(
          { incidentId: new ObjectId(args.id) },
          { $set: { active: false, resolvedAt: new Date().toISOString() } },
        );

      return result;
    },

    /**
     * Restore incident from fake (ADMIN/MODERATOR)
     */
    restoreIncident: async (_: any, args: { id: string }, context: Context) => {
      requireAdminOrModerator(context);

      const result = await context.db
        .collection<IncidentModel>("Incidents")
        .findOneAndUpdate(
          { _id: new ObjectId(args.id) },
          { $set: { isFake: false, status: "PUBLISHED" } },
          { returnDocument: "after" },
        );

      if (!result) {
        throw new Error("Incident not found");
      }

      // Reactivate incident locations
      await context.db
        .collection<IncidentLocationModel>("IncidentLocations")
        .updateMany(
          { incidentId: new ObjectId(args.id) },
          { $set: { active: true }, $unset: { resolvedAt: "" } },
        );

      return result;
    },

    /**
     * Bulk resolve incidents (ADMIN/MODERATOR)
     */
    bulkResolveIncidents: async (
      _: any,
      args: { ids: string[] },
      context: Context,
    ) => {
      requireAdminOrModerator(context);

      const objectIds = args.ids.map((id) => new ObjectId(id));

      await context.db
        .collection<IncidentModel>("Incidents")
        .updateMany(
          { _id: { $in: objectIds } },
          { $set: { status: "RESOLVED" } },
        );

      // Deactivate incident locations
      await context.db
        .collection<IncidentLocationModel>("IncidentLocations")
        .updateMany(
          { incidentId: { $in: objectIds } },
          { $set: { active: false, resolvedAt: new Date().toISOString() } },
        );

      // Fetch updated incidents
      const incidents = await context.db
        .collection<IncidentModel>("Incidents")
        .find({ _id: { $in: objectIds } })
        .toArray();

      return incidents;
    },

    /**
     * Bulk delete incidents (ADMIN/MODERATOR)
     */
    bulkDeleteIncidents: async (
      _: any,
      args: { ids: string[] },
      context: Context,
    ) => {
      requireAdminOrModerator(context);

      const objectIds = args.ids.map((id) => new ObjectId(id));

      const result = await context.db
        .collection<IncidentModel>("Incidents")
        .deleteMany({ _id: { $in: objectIds } });

      // Delete associated incident locations
      await context.db
        .collection<IncidentLocationModel>("IncidentLocations")
        .deleteMany({ incidentId: { $in: objectIds } });

      return result.deletedCount > 0;
    },
  },
};
