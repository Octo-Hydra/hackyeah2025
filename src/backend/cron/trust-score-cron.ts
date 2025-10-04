import { updateAllUserTrustScores } from "../../lib/trust-score-calculator.js";
import { DB } from "../db/client.js";

let isRunning = false;
let cronInterval: NodeJS.Timeout | null = null;

export async function startTrustScoreCron() {
  if (cronInterval) {
    console.log("⚠️  Trust score cron already running");
    return;
  }

  console.log("🚀 Starting trust score cron job (runs every 5 seconds)");

  await runTrustScoreUpdate();

  // Then run every 5 seconds
  cronInterval = setInterval(async () => {
    await runTrustScoreUpdate();
  }, 5000);
}

/**
 * Stop the trust score cron job
 */
export function stopTrustScoreCron() {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
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
      `✅ Trust scores updated: ${updatedCount} users (${duration}ms)`,
    );
  } catch (error) {
    console.error("❌ Error updating trust scores:", error);
  } finally {
    isRunning = false;
  }
}

// Graceful shutdown
process.on("SIGINT", () => {
  stopTrustScoreCron();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopTrustScoreCron();
  process.exit(0);
});
