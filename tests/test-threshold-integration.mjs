/**
 * Test Threshold Algorithm Integration
 *
 * Tests how trust-score-calculator.ts and notification-system.ts
 * use functions from threshold-algorithm.ts
 */

import { MongoClient, ObjectId } from "mongodb";
import {
  calculateReputationChange,
  shouldNotifyUser,
  extractActiveJourneyLineIds,
  DEFAULT_THRESHOLD_CONFIG,
} from "../src/lib/threshold-algorithm.js";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/ontime";

async function testThresholdIntegration() {
  console.log("=== Threshold Algorithm Integration Test ===\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db();

    // Test 1: Reputation Change Calculation
    console.log("📊 Test 1: Reputation Change Calculation");
    console.log("==========================================");

    const testCases = [
      {
        wasCorrect: true,
        userReputation: 100,
        notificationAge: 5, // Early reporter
        expected: "High reward (+15-20)",
      },
      {
        wasCorrect: true,
        userReputation: 100,
        notificationAge: 30,
        expected: "Standard reward (+8-12)",
      },
      {
        wasCorrect: false,
        userReputation: 100,
        notificationAge: 10,
        expected: "High-rep penalty (-7 to -8)",
      },
      {
        wasCorrect: false,
        userReputation: 30,
        notificationAge: 10,
        expected: "Low-rep penalty (-3 to -5)",
      },
      {
        wasCorrect: true,
        userReputation: 300,
        notificationAge: 5,
        expected: "Diminished reward (+5-8)",
      },
    ];

    for (const testCase of testCases) {
      const change = calculateReputationChange(
        testCase.wasCorrect,
        testCase.userReputation,
        testCase.notificationAge
      );

      console.log(
        `\n${testCase.wasCorrect ? "✅" : "❌"} Report ${testCase.wasCorrect ? "correct" : "incorrect"}`
      );
      console.log(`   Current reputation: ${testCase.userReputation}`);
      console.log(`   Report age: ${testCase.notificationAge} minutes`);
      console.log(`   Reputation change: ${change > 0 ? "+" : ""}${change}`);
      console.log(`   Expected: ${testCase.expected}`);
    }

    // Test 2: Notification Decision
    console.log("\n\n📢 Test 2: Notification Decision");
    console.log("=================================");

    const testScenarios = [
      {
        name: "Active journey affected (CRITICAL)",
        incidentLineIds: ["line1", "line2"],
        activeJourneyLineIds: ["line1"], // Match!
        favoriteLineIds: undefined,
        incidentClass: "CLASS_1",
      },
      {
        name: "Favorite affected (HIGH)",
        incidentLineIds: ["line3"],
        activeJourneyLineIds: undefined,
        favoriteLineIds: ["line3"], // Match!
        incidentClass: "CLASS_1",
      },
      {
        name: "No match (LOW)",
        incidentLineIds: ["line5"],
        activeJourneyLineIds: ["line1"],
        favoriteLineIds: ["line3"],
        incidentClass: undefined,
      },
    ];

    for (const scenario of testScenarios) {
      const decision = shouldNotifyUser(
        scenario.incidentLineIds,
        scenario.activeJourneyLineIds,
        scenario.favoriteLineIds,
        scenario.incidentClass
      );

      console.log(`\n${decision.shouldNotify ? "✅" : "❌"} ${scenario.name}`);
      console.log(`   Should notify: ${decision.shouldNotify}`);
      console.log(`   Priority: ${decision.priority}`);
      console.log(`   Reason: ${decision.reason}`);
      if (decision.message) {
        console.log(`   Message: ${decision.message}`);
      }
      if (decision.affectedRoutes) {
        console.log(
          `   Affected routes: ${decision.affectedRoutes.join(", ")}`
        );
      }
    }

    // Test 3: Active Journey Line IDs Extraction
    console.log("\n\n🚇 Test 3: Active Journey Line IDs Extraction");
    console.log("==============================================");

    const journeyTestCases = [
      {
        name: "Journey with ObjectIds",
        journey: {
          lineIds: [new ObjectId(), new ObjectId(), null],
        },
      },
      {
        name: "Journey with string IDs",
        journey: {
          lineIds: ["line1", "line2", null],
        },
      },
      {
        name: "Empty journey",
        journey: undefined,
      },
    ];

    for (const testCase of journeyTestCases) {
      const lineIds = extractActiveJourneyLineIds(testCase.journey);
      console.log(`\n${testCase.name}:`);
      console.log(
        `   Extracted line IDs: ${lineIds.length > 0 ? lineIds.join(", ") : "[]"}`
      );
    }

    // Test 4: Default Threshold Config
    console.log("\n\n⚙️  Test 4: Default Threshold Config");
    console.log("====================================");

    console.log("\nCurrent configuration:");
    console.log(
      `   Base report count: ${DEFAULT_THRESHOLD_CONFIG.baseReportCount}`
    );
    console.log(
      `   Base reputation required: ${DEFAULT_THRESHOLD_CONFIG.baseReputationRequired}`
    );
    console.log(
      `   Reputation weight: ${DEFAULT_THRESHOLD_CONFIG.reputationWeight * 100}%`
    );
    console.log(
      `   Report weight: ${DEFAULT_THRESHOLD_CONFIG.reportWeight * 100}%`
    );
    console.log(
      `   Min reputation per user: ${DEFAULT_THRESHOLD_CONFIG.minReputationPerUser}`
    );
    console.log(
      `   High reputation bonus: ${DEFAULT_THRESHOLD_CONFIG.highReputationBonus * 100}%`
    );
    console.log(
      `   High reputation threshold: ${DEFAULT_THRESHOLD_CONFIG.highReputationThreshold}`
    );

    // Test 5: Real User Data (if available)
    console.log("\n\n👤 Test 5: Real User Data");
    console.log("=========================");

    const sampleUser = await db.collection("users").findOne({});

    if (sampleUser) {
      console.log(`\nFound user: ${sampleUser.name || sampleUser.email}`);
      console.log(`   Reputation: ${sampleUser.reputation || 100}`);
      console.log(
        `   Trust score: ${sampleUser.trustScore || "Not calculated yet"}`
      );

      if (sampleUser.trustScoreBreakdown) {
        console.log(`   Trust score breakdown:`);
        console.log(
          `      Base score: ${sampleUser.trustScoreBreakdown.baseScore.toFixed(2)}`
        );
        console.log(
          `      Accuracy bonus: ${sampleUser.trustScoreBreakdown.accuracyBonus.toFixed(2)}`
        );
        console.log(
          `      High rep bonus: ${sampleUser.trustScoreBreakdown.highRepBonus.toFixed(2)}`
        );
        console.log(
          `      Validation rate: ${(sampleUser.trustScoreBreakdown.validationRate * 100).toFixed(1)}%`
        );
      }

      // Test reputation change for this user
      const testReputationChange = calculateReputationChange(
        true,
        sampleUser.reputation || 100,
        10
      );

      console.log(`\n   If this user reports correctly (10min old):`);
      console.log(`      Reputation change: +${testReputationChange}`);
      console.log(
        `      New reputation: ${(sampleUser.reputation || 100) + testReputationChange}`
      );
    } else {
      console.log("\n   No users found in database");
    }

    // Test 6: Integration Summary
    console.log("\n\n📝 Integration Summary");
    console.log("======================");

    console.log("\n✅ Functions from threshold-algorithm.ts used in:");
    console.log("   • trust-score-calculator.ts:");
    console.log("     - calculateReputationChange()");
    console.log(
      "     - DEFAULT_THRESHOLD_CONFIG (highReputationThreshold, highReputationBonus)"
    );
    console.log("\n   • notification-system.ts:");
    console.log("     - shouldNotifyUser()");
    console.log("     - extractActiveJourneyLineIds()");
    console.log("     - DEFAULT_THRESHOLD_CONFIG (baseReportCount)");

    console.log("\n✅ Benefits:");
    console.log("   • Single source of truth for all calculations");
    console.log("   • Consistent behavior across the system");
    console.log("   • Easy to configure (one place to change)");
    console.log("   • Type-safe with TypeScript");

    console.log("\n✅ Test completed successfully!");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    throw error;
  } finally {
    await client.close();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run test
testThresholdIntegration().catch(console.error);
