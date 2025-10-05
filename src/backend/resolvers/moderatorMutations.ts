/**
 * Moderator Mutations
 *
 * Manual approve/reject of pending incidents
 * Admin-only access
 */

import { ObjectId } from "mongodb";
import type {
  PendingIncidentModel,
  ModeratorQueueItemModel,
  GraphQLContext,
} from "@/backend/db/collections";
import {
  publishIncidentFromPending,
  rewardReporters,
  rejectPendingIncident,
} from "@/lib/incident-publisher";

/**
 * Check if user has admin privileges
 */
function requireAdmin(ctx: GraphQLContext): void {
  const userEmail = ctx.session?.user?.email;

  if (!userEmail) {
    throw new Error("Authentication required");
  }
}

export const ModeratorMutationResolvers = {
  Mutation: {
    moderator: (_: unknown, __: unknown, ctx: GraphQLContext) => {
      requireAdmin(ctx);
      return {}; // Return empty object for nested resolvers
    },
  },

  ModeratorMutation: {
    /**
     * Manually approve a pending incident report
     * Creates real Incident and rewards reporters with 50% bonus
     */
    approveReport: async (
      _: unknown,
      {
        pendingIncidentId,
        notes,
      }: { pendingIncidentId: string; notes?: string },
      ctx: GraphQLContext,
    ) => {
      const userEmail = ctx.session?.user?.email;

      if (!userEmail) {
        throw new Error("Not authenticated");
      }

      const db = ctx.db;

      // Get user to check role
      const user = await db.collection("users").findOne({ email: userEmail });

      if (!user) {
        throw new Error("User not found");
      }

      // Only ADMIN can approve
      if (user.role !== "ADMIN") {
        throw new Error("Only admins can approve reports");
      }

      const pendingIncidentIdObj = new ObjectId(pendingIncidentId);

      // Find pending incident
      const pendingIncident = await db
        .collection<PendingIncidentModel>("PendingIncidents")
        .findOne({ _id: pendingIncidentIdObj });

      if (!pendingIncident) {
        throw new Error("Pending incident not found");
      }

      if (pendingIncident.status !== "PENDING") {
        throw new Error(
          `Cannot approve incident with status: ${pendingIncident.status}`,
        );
      }

      // Publish incident with moderator context
      const incident = await publishIncidentFromPending(pendingIncident, db, {
        moderatorId: user._id,
        moderatorNotes: notes || "Approved by moderator",
      });

      // Reward reporters with 50% bonus
      const rewardResult = await rewardReporters(pendingIncident, db, {
        bonusMultiplier: 1.5,
        reason: "MODERATOR_APPROVED",
      });

      // Remove from moderator queue
      await db
        .collection<ModeratorQueueItemModel>("ModeratorQueue")
        .deleteOne({ pendingIncidentId: pendingIncidentIdObj });

      console.log(
        `✅ Moderator ${user._id} approved PendingIncident ${pendingIncidentId}`,
      );
      console.log(
        `🎁 Rewarded ${rewardResult.rewardedUsers.length} reporters with ${rewardResult.totalRewarded} total reputation`,
      );

      return {
        success: true,
        incident: {
          ...incident,
          id: incident._id?.toString(),
          reportedBy: incident.reportedBy?.toString(),
          lineIds: incident.lineIds?.map((id) => id?.toString() || null) || [],
        },
        rewardedUsers: rewardResult.rewardedUsers.map((r) => ({
          userId: r.userId,
          user: null, // Will be resolved by User resolver
          oldReputation: r.oldReputation,
          newReputation: r.newReputation,
          change: r.change,
          reason: "MODERATOR_APPROVED",
        })),
        message: `Incident approved and published. ${rewardResult.rewardedUsers.length} reporters rewarded.`,
      };
    },

    /**
     * Reject a pending incident (mark as fake/spam)
     * Penalizes reporters slightly
     */
    rejectReport: async (
      _: unknown,
      {
        pendingIncidentId,
        reason,
      }: { pendingIncidentId: string; reason: string },
      ctx: GraphQLContext,
    ) => {
      const userEmail = ctx.session?.user?.email;

      if (!userEmail) {
        throw new Error("Not authenticated");
      }

      const db = ctx.db;

      // Get user to check role
      const user = await db.collection("users").findOne({ email: userEmail });

      if (!user) {
        throw new Error("User not found");
      }

      // Only ADMIN can reject
      if (user.role !== "ADMIN") {
        throw new Error("Only admins can reject reports");
      }

      // Reject the incident
      await rejectPendingIncident(pendingIncidentId, user._id, reason, db);

      // Remove from moderator queue
      await db
        .collection<ModeratorQueueItemModel>("ModeratorQueue")
        .deleteOne({ pendingIncidentId: new ObjectId(pendingIncidentId) });

      console.log(
        `❌ Moderator ${user._id} rejected PendingIncident ${pendingIncidentId}: ${reason}`,
      );

      return {
        success: true,
        message: "Report rejected successfully",
      };
    },

    /**
     * Flag a user as suspicious spammer
     * Increases their suspiciousActivityScore
     */
    flagUserForSpam: async (
      _: unknown,
      { userId, reason }: { userId: string; reason: string },
      ctx: GraphQLContext,
    ) => {
      const userEmail = ctx.session?.user?.email;

      if (!userEmail) {
        throw new Error("Not authenticated");
      }

      const db = ctx.db;

      // Get user to check role
      const user = await db.collection("users").findOne({ email: userEmail });

      if (!user) {
        throw new Error("User not found");
      }

      // Only ADMIN can flag users
      if (user.role !== "ADMIN") {
        throw new Error("Only admins can flag users for spam");
      }
      const targetUserId = new ObjectId(userId);

      // Get user report history
      const history = await db
        .collection("UserReportHistory")
        .findOne({ userId: targetUserId });

      const currentScore = history?.suspiciousActivityScore || 0;
      const newScore = Math.min(100, currentScore + 25); // +25 penalty, max 100

      // Update or create history
      await db.collection("UserReportHistory").updateOne(
        { userId: targetUserId },
        {
          $set: {
            suspiciousActivityScore: newScore,
            flaggedByModerator: true,
            moderatorNotes: reason,
          },
        },
        { upsert: true },
      );

      console.log(
        `🚩 Admin ${user._id} flagged user ${userId} for spam: ${reason}`,
      );
      console.log(`   Suspicious score: ${currentScore} → ${newScore}`);

      return {
        success: true,
        newSuspiciousScore: newScore,
        message: `User flagged. Score increased from ${currentScore} to ${newScore}`,
      };
    },
  },

  UserReputationChange: {
    user: async (
      parent: { userId: string },
      _: unknown,
      ctx: GraphQLContext,
    ) => {
      const user = await ctx.db
        .collection("users")
        .findOne({ _id: new ObjectId(parent.userId) });

      if (!user) {
        throw new Error(`User ${parent.userId} not found`);
      }

      return {
        ...user,
        id: user._id.toString(),
      };
    },
  },
};
