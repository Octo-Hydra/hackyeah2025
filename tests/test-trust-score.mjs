/**
 * Test Trust Score Calculation
 *
 * Usage: node test-trust-score.mjs
 */

import { MongoClient, ObjectId } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/ontime";

async function testTrustScore() {
  console.log("=== Trust Score Calculation Test ===\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db();

    // 1. Find a user with reports
    const usersWithReports = await db
      .collection("Incidents")
      .distinct("reportedBy");

    if (usersWithReports.length === 0) {
      console.log("❌ No users with reports found");
      return;
    }

    const userId = usersWithReports[0];
    console.log(`📊 Testing user: ${userId}\n`);

    // 2. Get user data
    const user = await db
      .collection("Users")
      .findOne({ _id: new ObjectId(userId) });
    if (!user) {
      console.log("❌ User not found");
      return;
    }

    console.log("👤 User Data:");
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Reputation: ${user.reputation || 100}`);
    console.log(
      `   Current Trust Score: ${user.trustScore || "Not calculated yet"}\n`,
    );

    // 3. Get user's reports
    const reports = await db
      .collection("Incidents")
      .find({ reportedBy: new ObjectId(userId) })
      .toArray();

    console.log(`📝 Reports: ${reports.length} total`);

    const validatedReports = reports.filter(
      (r) => r.status === "RESOLVED" && !r.isFake,
    );
    const fakeReports = reports.filter((r) => r.isFake === true);
    const pendingReports = reports.filter((r) => r.status === "PUBLISHED");

    console.log(`   ✅ Validated: ${validatedReports.length}`);
    console.log(`   ❌ Fake: ${fakeReports.length}`);
    console.log(`   ⏳ Pending: ${pendingReports.length}\n`);

    // 4. Calculate trust score manually
    const reputation = user.reputation || 100;
    const baseScore = Math.max(0.5, Math.min(2.0, reputation / 100));

    const resolvedReports = reports.filter(
      (r) => r.status === "RESOLVED",
    ).length;
    const validationRate =
      resolvedReports > 0 ? validatedReports.length / resolvedReports : 0;
    const accuracyBonus = validationRate * 0.3;

    let highRepBonus = 0;
    if (reputation >= 100) {
      const bonusMultiplier = Math.min((reputation - 100) / 100, 1.0);
      highRepBonus = baseScore * 0.25 * bonusMultiplier;
    }

    const fakePenalty = fakeReports.length * 0.1;
    const finalScore = Math.max(
      0.5,
      Math.min(2.5, baseScore + accuracyBonus + highRepBonus - fakePenalty),
    );

    console.log("📊 Trust Score Calculation:");
    console.log(`   Base Score: ${baseScore.toFixed(2)} (from reputation)`);
    console.log(
      `   Accuracy Bonus: +${accuracyBonus.toFixed(2)} (${(validationRate * 100).toFixed(1)}% validation rate)`,
    );
    console.log(`   High Rep Bonus: +${highRepBonus.toFixed(2)}`);
    console.log(`   Fake Penalty: -${fakePenalty.toFixed(2)}`);
    console.log(`   ─────────────────────────────`);
    console.log(`   Final Score: ${finalScore.toFixed(2)}\n`);

    // 5. Check if cron has updated it
    if (user.trustScoreBreakdown) {
      console.log("✅ Trust score already calculated by cron:");
      console.log(`   Cron Score: ${user.trustScore?.toFixed(2)}`);
      console.log(`   Last Updated: ${user.trustScoreBreakdown.updatedAt}`);

      const diff = Math.abs((user.trustScore || 0) - finalScore);
      if (diff < 0.01) {
        console.log("   ✅ Matches manual calculation!\n");
      } else {
        console.log(
          `   ⚠️  Differs by ${diff.toFixed(2)} from manual calculation\n`,
        );
      }
    } else {
      console.log("⏳ Trust score not yet calculated by cron");
      console.log("   Enable cron with RUN_CRON=true in .env\n");
    }

    // 6. Test another user
    if (usersWithReports.length > 1) {
      const userId2 = usersWithReports[1];
      const user2 = await db
        .collection("Users")
        .findOne({ _id: new ObjectId(userId2) });

      if (user2) {
        console.log(`\n📊 Second User: ${user2.name}`);
        console.log(`   Reputation: ${user2.reputation || 100}`);
        console.log(
          `   Trust Score: ${user2.trustScore?.toFixed(2) || "Not calculated"}`,
        );
      }
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
    console.log("\n✅ Connection closed");
  }
}

testTrustScore();
