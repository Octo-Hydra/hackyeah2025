/**
 * Trust Score Cron Job
 *
 * Updates all user trust scores periodically using CronJob library
 *
 * Schedule: Every 5 seconds (for demo/testing)
 * Production: Should be changed to every 6 hours
 */

import { CronJob } from "cron";
import { updateAllUserTrustScores } from "../../lib/trust-score-calculator.js";
import { DB } from "../db/client.js";

let trustScoreCronJob: CronJob | null = null;
let isRunning = false;

/**
 * Start the trust score cron job
 */
export async function startTrustScoreCron() {
  if (!process.env.RUN_CRON || process.env.RUN_CRON !== "true") {
    console.log("⏭️  Trust score cron disabled (RUN_CRON not set)");
    return;
  }

  if (trustScoreCronJob) {
    console.log("⚠️  Trust score cron already running");
    return;
  }

  console.log("🚀 Starting trust score cron job");
  console.log(
    "📅 Schedule: Every 5 seconds (change to '0 */6 * * *' for production)"
  );

  // Create CronJob
  // Pattern: "*/5 * * * * *" = every 5 seconds
  // Production pattern: "0 */6 * * *" = every 6 hours
  trustScoreCronJob = new CronJob(
    "*/5 * * * * *", // Run every 5 seconds (for testing)
    runTrustScoreUpdate, // Function to execute
    null, // onComplete callback
    true, // Start immediately
    "Europe/Warsaw" // Timezone
  );

  console.log("✅ Trust score cron job started");
  console.log("⏰ Next run:", trustScoreCronJob.nextDate().toString());
}

/**
 * Stop the trust score cron job
 */
export function stopTrustScoreCron() {
  if (trustScoreCronJob) {
    trustScoreCronJob.stop();
    trustScoreCronJob = null;
    console.log("🛑 Trust score cron job stopped");
  }
}

/**
 * Run a single trust score update cycle
 */
async function runTrustScoreUpdate() {
  if (isRunning) {
    console.log("⏭️  Skipping cron run (previous run still in progress)");
    return;
  }

  isRunning = true;

  try {
    const db = await DB();

    const startTime = Date.now();
    const updatedCount = await updateAllUserTrustScores(db);
    const duration = Date.now() - startTime;

    console.log(
      `✅ Trust scores updated: ${updatedCount} users (${duration}ms)`
    );

    // Log next scheduled run
    if (trustScoreCronJob) {
      console.log("⏰ Next run:", trustScoreCronJob.nextDate().toString());
    }
  } catch (error) {
    console.error("❌ Error updating trust scores:", error);
  } finally {
    isRunning = false;
  }
}

/**
 * Get cron job status
 */
export function getTrustScoreCronStatus() {
  return {
    isRunning: trustScoreCronJob !== null,
    isExecuting: isRunning,
    nextRun: trustScoreCronJob ? trustScoreCronJob.nextDate().toString() : null,
    lastRun: trustScoreCronJob
      ? trustScoreCronJob.lastDate()?.toString()
      : null,
  };
}

// Graceful shutdown handlers
process.on("SIGINT", () => {
  console.log("\n🛑 SIGINT received, stopping cron...");
  stopTrustScoreCron();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 SIGTERM received, stopping cron...");
  stopTrustScoreCron();
  process.exit(0);
});
