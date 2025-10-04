/**
 * Dynamic Trust Score Calculator
 *
 * Calculates user trust scores based on:
 * - User reputation
 * - Recent report accuracy
 * - High reputation bonus
 * - Report validation rate
 *
 * Uses functions from threshold-algorithm.ts for reputation changes
 */

import type { Db } from "mongodb";
import type { UserModel, IncidentModel } from "@/backend/db/collections";
import { ObjectId } from "mongodb";
import {
  calculateReputationChange,
  DEFAULT_THRESHOLD_CONFIG,
} from "./threshold-algorithm";

export interface TrustScoreBreakdown {
  baseScore: number; // From reputation (0.5-2.0)
  accuracyBonus: number; // From validated reports
  highRepBonus: number; // Bonus for high reputation
  finalScore: number; // Combined score (0.5-2.5)
  recentReports: number;
  validatedReports: number;
  fakeReports: number;
  validationRate: number; // Percentage of reports validated
}

/**
 * Calculate dynamic trust score for a user
 */
export async function calculateUserTrustScore(
  db: Db,
  userId: ObjectId | string
): Promise<TrustScoreBreakdown> {
  const user = await db
    .collection<UserModel>("Users")
    .findOne({ _id: new ObjectId(userId) });

  if (!user) {
    throw new Error("User not found");
  }

  const reputation = user.reputation || 100;

  // 1. Base score from reputation (0.5-2.0)
  // Use same logic as threshold-algorithm.ts
  // reputation / 100, clamped between 0.5 and 2.0
  const baseScore = Math.max(0.5, Math.min(2.0, reputation / 100));

  // 2. Check recent reports (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentReports = await db
    .collection<IncidentModel>("Incidents")
    .find({
      reportedBy: new ObjectId(userId),
      createdAt: { $gte: thirtyDaysAgo.toISOString() },
    })
    .toArray();

  const recentReportsCount = recentReports.length;
  const validatedReports = recentReports.filter(
    (r) => r.status === "RESOLVED" && !r.isFake
  ).length;
  const fakeReports = recentReports.filter((r) => r.isFake === true).length;

  // 3. Calculate validation rate
  const resolvedReports = recentReports.filter(
    (r) => r.status === "RESOLVED"
  ).length;
  const validationRate =
    resolvedReports > 0 ? validatedReports / resolvedReports : 0;

  // 4. Accuracy bonus (up to +0.3 for 100% validation rate)
  const accuracyBonus = validationRate * 0.3;

  // 5. High reputation bonus - use constants from threshold-algorithm.ts
  const HIGH_REP_THRESHOLD = DEFAULT_THRESHOLD_CONFIG.highReputationThreshold;
  const HIGH_REP_BONUS = DEFAULT_THRESHOLD_CONFIG.highReputationBonus;
  let highRepBonus = 0;

  if (reputation >= HIGH_REP_THRESHOLD) {
    // Scale bonus: 100 rep = 0%, 200 rep = 25%, 300+ = 25%
    const bonusMultiplier = Math.min(
      (reputation - HIGH_REP_THRESHOLD) / 100,
      1.0
    );
    highRepBonus = baseScore * HIGH_REP_BONUS * bonusMultiplier;
  }

  // 6. Penalty for fake reports (reduce final score)
  const fakePenalty = fakeReports * 0.1; // -0.1 per fake report

  // 7. Calculate final score (max 2.5)
  const finalScore = Math.max(
    0.5,
    Math.min(2.5, baseScore + accuracyBonus + highRepBonus - fakePenalty)
  );

  return {
    baseScore,
    accuracyBonus,
    highRepBonus,
    finalScore,
    recentReports: recentReportsCount,
    validatedReports,
    fakeReports,
    validationRate,
  };
}

/**
 * Update trust scores for all active users
 * Called by cron job
 */
export async function updateAllUserTrustScores(db: Db): Promise<number> {
  const reportedByIds = await db
    .collection<IncidentModel>("Incidents")
    .distinct("reportedBy");

  const validUserIds = reportedByIds.filter(
    (id): id is ObjectId => id !== null && id !== undefined
  );

  const activeUsers = await db
    .collection<UserModel>("Users")
    .find({
      _id: { $in: validUserIds },
    })
    .toArray();

  let updatedCount = 0;

  for (const user of activeUsers) {
    if (!user._id) continue;

    try {
      const trustScore = await calculateUserTrustScore(db, user._id);

      await db.collection<UserModel>("Users").updateOne(
        { _id: user._id },
        {
          $set: {
            trustScore: trustScore.finalScore,
            trustScoreBreakdown: {
              baseScore: trustScore.baseScore,
              accuracyBonus: trustScore.accuracyBonus,
              highRepBonus: trustScore.highRepBonus,
              validationRate: trustScore.validationRate,
              updatedAt: new Date().toISOString(),
            },
          },
        }
      );

      updatedCount++;
    } catch (error) {
      console.error(`Error updating trust score for user ${user._id}:`, error);
    }
  }

  return updatedCount;
}

/**
 * Get user's current trust score (read from DB, calculated by cron)
 */
export async function getUserTrustScore(
  db: Db,
  userId: ObjectId | string
): Promise<number> {
  const user = await db
    .collection<UserModel>("Users")
    .findOne({ _id: new ObjectId(userId) });

  // If user doesn't have a trust score yet, calculate it now
  if (!user || user.trustScore === undefined) {
    const breakdown = await calculateUserTrustScore(db, userId);
    return breakdown.finalScore;
  }

  return user.trustScore;
}

/**
 * Update user reputation after incident resolution
 * Uses calculateReputationChange from threshold-algorithm.ts
 */
export async function updateUserReputationAfterResolution(
  db: Db,
  userId: ObjectId | string,
  wasCorrect: boolean,
  incidentCreatedAt: string
): Promise<{ newReputation: number; reputationChange: number }> {
  const user = await db
    .collection<UserModel>("Users")
    .findOne({ _id: new ObjectId(userId) });

  if (!user) {
    throw new Error("User not found");
  }

  const currentReputation = user.reputation || 100;

  // Calculate notification age in minutes
  const incidentDate = new Date(incidentCreatedAt);
  const now = new Date();
  const notificationAge =
    (now.getTime() - incidentDate.getTime()) / (1000 * 60);

  // Use threshold-algorithm.ts function
  const reputationChange = calculateReputationChange(
    wasCorrect,
    currentReputation,
    notificationAge
  );

  const newReputation = Math.max(0, currentReputation + reputationChange);

  // Update user reputation
  await db.collection<UserModel>("Users").updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        reputation: newReputation,
      },
    }
  );

  // Recalculate trust score
  await calculateUserTrustScore(db, userId);

  return {
    newReputation,
    reputationChange,
  };
}
