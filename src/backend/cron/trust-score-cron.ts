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

    // Check and finish expired journeys
    await finishExpiredJourneys(db);

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
 * Finish journeys that have passed their expected end time
 */
async function finishExpiredJourneys(db: Awaited<ReturnType<typeof DB>>) {
  try {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    // Find all users with active journeys
    const usersWithJourneys = await db
      .collection("users")
      .find({ activeJourney: { $exists: true, $ne: null } })
      .toArray();

    if (usersWithJourneys.length === 0) {
      return;
    }

    console.log(
      `🔍 Checking ${usersWithJourneys.length} active journeys (current time: ${currentTime})`
    );

    let finishedCount = 0;

    for (const user of usersWithJourneys) {
      const activeJourney = user.activeJourney;

      if (!activeJourney?.expectedEndTime) {
        continue;
      }

      const expectedEndTime = activeJourney.expectedEndTime;

      // Compare times (HH:mm format)
      if (isTimePassed(expectedEndTime, currentTime)) {
        console.log(
          `⏰ Journey expired for ${user.email}: expected ${expectedEndTime}, now ${currentTime}`
        );

        // Clear the active journey
        const result = await db
          .collection("users")
          .updateOne(
            { _id: user._id },
            { $unset: { activeJourney: "" } }
          );

        if (result.modifiedCount > 0) {
          finishedCount++;

          // Also clear journey notifications for this user
          const userId =
            typeof user._id === "string" ? user._id : user._id.toString();
          await db
            .collection("journeyNotifications")
            .deleteMany({ userId });

          console.log(`✅ Journey finished for ${user.email}`);
        }
      }
    }

    if (finishedCount > 0) {
      console.log(`🏁 Finished ${finishedCount} expired journeys`);
    }
  } catch (error) {
    console.error("❌ Error finishing expired journeys:", error);
  }
}

/**
 * Check if target time has passed current time (both in HH:mm format)
 * Handles midnight rollover (e.g., 23:50 to 00:10)
 */
function isTimePassed(targetTime: string, currentTime: string): boolean {
  const [targetHour, targetMin] = targetTime.split(":").map(Number);
  const [currentHour, currentMin] = currentTime.split(":").map(Number);

  const targetMinutes = targetHour * 60 + targetMin;
  const currentMinutes = currentHour * 60 + currentMin;

  // If target is in the early morning (00:00-05:00) and current is late night (20:00-23:59)
  // the journey hasn't finished yet (it will finish tomorrow)
  if (targetHour < 6 && currentHour >= 20) {
    return false;
  }

  // If target is late night (20:00-23:59) and current is early morning (00:00-05:00)
  // the journey should have finished (midnight rollover happened)
  if (targetHour >= 20 && currentHour < 6) {
    return true;
  }

  // Normal case: compare minutes
  return currentMinutes >= targetMinutes;
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
