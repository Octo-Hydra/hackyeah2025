/**
 * Notification Threshold Algorithm
 *
 * Calculates the reputation threshold required for a notification to become official.
 * Takes into account:
 * - Base threshold requirements
 * - Number of reports needed
 * - Reputation weighting
 * - Time-based decay (optional)
 */

export interface ThresholdConfig {
  baseReportCount: number; // Minimum number of reports needed
  baseReputationRequired: number; // Base reputation threshold
  reputationWeight: number; // How much reputation matters (0-1)
  reportWeight: number; // How much report count matters (0-1)
  minReputationPerUser: number; // Minimum reputation to contribute
  highReputationBonus: number; // Bonus for high-reputation users
  highReputationThreshold: number; // What counts as "high reputation"
}

export const DEFAULT_THRESHOLD_CONFIG: ThresholdConfig = {
  baseReportCount: 3, // Need at least 3 reports
  baseReputationRequired: 100, // Need combined 100 reputation points
  reputationWeight: 0.6, // 60% weight on reputation
  reportWeight: 0.4, // 40% weight on number of reports
  minReputationPerUser: 10, // Users need at least 10 reputation to contribute
  highReputationBonus: 0.25, // 25% bonus weight for high-rep users
  highReputationThreshold: 100, // 100+ reputation is "high"
};

/**
 * Calculates if a notification should become official
 */
export function calculateThreshold(
  reportCount: number,
  totalReputation: number,
  reporterReputations: number[],
  config: ThresholdConfig = DEFAULT_THRESHOLD_CONFIG,
): {
  isOfficial: boolean;
  threshold: number;
  currentScore: number;
  reputationScore: number;
  reportScore: number;
  breakdown: {
    reportCount: number;
    totalReputation: number;
    validReporters: number;
    highReputationReporters: number;
    averageReputation: number;
  };
} {
  // Filter out low-reputation users
  const validReputations = reporterReputations.filter(
    (rep) => rep >= config.minReputationPerUser,
  );

  const validReporterCount = validReputations.length;

  // Count high-reputation reporters
  const highReputationReporters = validReputations.filter(
    (rep) => rep >= config.highReputationThreshold,
  ).length;

  // Calculate average reputation
  const averageReputation =
    validReputations.length > 0
      ? validReputations.reduce((a, b) => a + b, 0) / validReputations.length
      : 0;

  // Calculate report score (normalized to 0-1)
  const reportScore = Math.min(validReporterCount / config.baseReportCount, 1);

  // Calculate reputation score (normalized to 0-1)
  let reputationScore = Math.min(
    totalReputation / config.baseReputationRequired,
    1,
  );

  // Apply bonus for high-reputation reporters
  if (highReputationReporters > 0) {
    const bonus =
      (highReputationReporters / validReporterCount) *
      config.highReputationBonus;
    reputationScore = Math.min(reputationScore * (1 + bonus), 1.5); // Cap at 1.5
  }

  // Calculate weighted score
  const currentScore =
    reportScore * config.reportWeight +
    reputationScore * config.reputationWeight;

  // Threshold is 1.0 (100%)
  const threshold = 1.0;

  const isOfficial = currentScore >= threshold;

  return {
    isOfficial,
    threshold,
    currentScore,
    reputationScore,
    reportScore,
    breakdown: {
      reportCount: validReporterCount,
      totalReputation,
      validReporters: validReporterCount,
      highReputationReporters,
      averageReputation,
    },
  };
}

/**
 * Calculates reputation change for users after notification resolution
 */
export function calculateReputationChange(
  wasCorrect: boolean,
  userReputation: number,
  notificationAge: number, // in minutes
): number {
  // Base reward/penalty
  const baseChange = wasCorrect ? 10 : -5;

  // Scale based on user's current reputation (diminishing returns for high-rep users)
  const reputationMultiplier = Math.max(0.5, 1 - userReputation / 1000);

  // Time bonus for early reporters (within first 10 minutes)
  const timeBonus =
    wasCorrect && notificationAge < 10
      ? Math.max(0, 1 + (10 - notificationAge) / 10)
      : 1;

  // False reports hurt more for high-reputation users
  const falseReportPenalty = !wasCorrect && userReputation > 50 ? 1.5 : 1;

  const change =
    baseChange * reputationMultiplier * timeBonus * falseReportPenalty;

  return Math.round(change);
}

/**
 * Determines if a user can report (has minimum reputation)
 */
export function canUserReport(
  userReputation: number,
  config: ThresholdConfig = DEFAULT_THRESHOLD_CONFIG,
): {
  canReport: boolean;
  reason?: string;
} {
  if (userReputation < config.minReputationPerUser) {
    return {
      canReport: false,
      reason: `You need at least ${config.minReputationPerUser} reputation points to report incidents. Earn reputation by confirming existing reports.`,
    };
  }

  return { canReport: true };
}

/**
 * Calculates display percentage for notification progress
 */
export function calculateNotificationProgress(
  reportCount: number,
  totalReputation: number,
  reporterReputations: number[],
  config: ThresholdConfig = DEFAULT_THRESHOLD_CONFIG,
): {
  percentage: number;
  reportsNeeded: number;
  reputationNeeded: number;
  isClose: boolean; // > 75%
} {
  const result = calculateThreshold(
    reportCount,
    totalReputation,
    reporterReputations,
    config,
  );

  const percentage = Math.min(result.currentScore * 100, 100);

  const reportsNeeded = Math.max(
    0,
    config.baseReportCount - result.breakdown.validReporters,
  );

  const reputationNeeded = Math.max(
    0,
    config.baseReputationRequired - totalReputation,
  );

  return {
    percentage,
    reportsNeeded,
    reputationNeeded,
    isClose: percentage > 75,
  };
}

/**
 * Example usage and testing
 */
export function testThresholdAlgorithm() {
  console.log("=== Threshold Algorithm Tests ===\n");

  // Test 1: Insufficient reports
  console.log("Test 1: Two low-rep users report");
  const test1 = calculateThreshold(2, 40, [20, 20]);
  console.log(
    `Official: ${test1.isOfficial} (Score: ${test1.currentScore.toFixed(2)})`,
  );
  console.log(`Breakdown:`, test1.breakdown);

  // Test 2: Enough reports, low reputation
  console.log("\nTest 2: Three low-rep users report");
  const test2 = calculateThreshold(3, 60, [20, 20, 20]);
  console.log(
    `Official: ${test2.isOfficial} (Score: ${test2.currentScore.toFixed(2)})`,
  );
  console.log(`Breakdown:`, test2.breakdown);

  // Test 3: Few reports, high reputation
  console.log("\nTest 3: Two high-rep users report");
  const test3 = calculateThreshold(2, 300, [150, 150]);
  console.log(
    `Official: ${test3.isOfficial} (Score: ${test3.currentScore.toFixed(2)})`,
  );
  console.log(`Breakdown:`, test3.breakdown);

  // Test 4: Perfect scenario
  console.log("\nTest 4: Three medium-rep users report");
  const test4 = calculateThreshold(3, 150, [50, 50, 50]);
  console.log(
    `Official: ${test4.isOfficial} (Score: ${test4.currentScore.toFixed(2)})`,
  );
  console.log(`Breakdown:`, test4.breakdown);

  // Test 5: One very high-rep user
  console.log("\nTest 5: One very high-rep user reports");
  const test5 = calculateThreshold(1, 200, [200]);
  console.log(
    `Official: ${test5.isOfficial} (Score: ${test5.currentScore.toFixed(2)})`,
  );
  console.log(`Breakdown:`, test5.breakdown);
}
