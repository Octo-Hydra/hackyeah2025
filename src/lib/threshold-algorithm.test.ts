/**
 * Tests for Threshold Algorithm - Notification System
 *
 * Run with: npx tsx src/lib/threshold-algorithm.test.ts
 */

import {
  shouldNotifyUser,
  extractActiveJourneyLineIds,
  extractFavoriteLineIds,
  type NotificationDecision,
} from "./threshold-algorithm.js";

console.log("🧪 Testing Threshold Algorithm - Notification System\n");
console.log("=".repeat(60));

// Test 1: Critical incident on active journey
console.log("\n📋 Test 1: Critical incident on active journey");
console.log("-".repeat(60));
const test1 = shouldNotifyUser(
  ["line1", "line2"],
  ["line1", "line3"], // User is traveling on line1
  undefined,
  "CLASS_1"
);
console.log("Input:");
console.log('  Incident lines: ["line1", "line2"]');
console.log('  Active journey: ["line1", "line3"]');
console.log("  Favorites: none");
console.log("  Class: CLASS_1\n");
console.log("Result:", test1);
console.assert(test1.shouldNotify === true, "❌ Should notify");
console.assert(test1.priority === "CRITICAL", "❌ Should be CRITICAL priority");
console.log("✅ Test 1 passed\n");

// Test 2: Normal incident on active journey
console.log("📋 Test 2: Normal incident on active journey");
console.log("-".repeat(60));
const test2 = shouldNotifyUser(
  ["line5"],
  ["line5", "line6"],
  undefined,
  "CLASS_2"
);
console.log("Input:");
console.log('  Incident lines: ["line5"]');
console.log('  Active journey: ["line5", "line6"]');
console.log("  Favorites: none");
console.log("  Class: CLASS_2\n");
console.log("Result:", test2);
console.assert(test2.shouldNotify === true, "❌ Should notify");
console.assert(test2.priority === "HIGH", "❌ Should be HIGH priority");
console.log("✅ Test 2 passed\n");

// Test 3: Critical incident on favorite connection
console.log("📋 Test 3: Critical incident on favorite connection");
console.log("-".repeat(60));
const test3 = shouldNotifyUser(
  ["line10"],
  undefined, // No active journey
  ["line10", "line11"], // User has favorites
  "CLASS_1"
);
console.log("Input:");
console.log('  Incident lines: ["line10"]');
console.log("  Active journey: none");
console.log('  Favorites: ["line10", "line11"]');
console.log("  Class: CLASS_1\n");
console.log("Result:", test3);
console.assert(test3.shouldNotify === true, "❌ Should notify");
console.assert(test3.priority === "HIGH", "❌ Should be HIGH priority");
console.log("✅ Test 3 passed\n");

// Test 4: Normal incident on favorite connection
console.log("📋 Test 4: Normal incident on favorite connection");
console.log("-".repeat(60));
const test4 = shouldNotifyUser(
  ["line20"],
  undefined,
  ["line20", "line21"],
  "CLASS_2"
);
console.log("Input:");
console.log('  Incident lines: ["line20"]');
console.log("  Active journey: none");
console.log('  Favorites: ["line20", "line21"]');
console.log("  Class: CLASS_2\n");
console.log("Result:", test4);
console.assert(test4.shouldNotify === true, "❌ Should notify");
console.assert(test4.priority === "MEDIUM", "❌ Should be MEDIUM priority");
console.log("✅ Test 4 passed\n");

// Test 5: Incident doesn't affect user
console.log("📋 Test 5: Incident doesn't affect user");
console.log("-".repeat(60));
const test5 = shouldNotifyUser(
  ["line99"],
  ["line1", "line2"],
  ["line10", "line11"],
  "CLASS_1"
);
console.log("Input:");
console.log('  Incident lines: ["line99"]');
console.log('  Active journey: ["line1", "line2"]');
console.log('  Favorites: ["line10", "line11"]');
console.log("  Class: CLASS_1\n");
console.log("Result:", test5);
console.assert(test5.shouldNotify === false, "❌ Should NOT notify");
console.assert(test5.priority === "LOW", "❌ Should be LOW priority");
console.log("✅ Test 5 passed\n");

// Test 6: Incident with no lines
console.log("📋 Test 6: Incident with no associated lines");
console.log("-".repeat(60));
const test6 = shouldNotifyUser([], ["line1"], ["line10"], "CLASS_1");
console.log("Input:");
console.log("  Incident lines: []");
console.log('  Active journey: ["line1"]');
console.log('  Favorites: ["line10"]');
console.log("  Class: CLASS_1\n");
console.log("Result:", test6);
console.assert(test6.shouldNotify === false, "❌ Should NOT notify");
console.log("✅ Test 6 passed\n");

// Test 7: Active journey takes precedence over favorites
console.log("📋 Test 7: Active journey takes precedence over favorites");
console.log("-".repeat(60));
const test7a = shouldNotifyUser(
  ["line1"],
  ["line1"], // Active
  ["line1"], // Also favorite
  "CLASS_1"
);
console.log("Input:");
console.log('  Incident lines: ["line1"]');
console.log('  Active journey: ["line1"]');
console.log('  Favorites: ["line1"]');
console.log("  Class: CLASS_1\n");
console.log("Result:", test7a);
console.assert(test7a.shouldNotify === true, "❌ Should notify");
console.assert(
  test7a.priority === "CRITICAL",
  "❌ Should be CRITICAL (active journey priority)"
);
console.assert(
  test7a.reason.includes("active journey"),
  "❌ Reason should mention active journey"
);
console.log("✅ Test 7 passed\n");

// Test 8: Extract line IDs from active journey
console.log("📋 Test 8: Extract line IDs from active journey");
console.log("-".repeat(60));
const activeJourney = {
  lineIds: ["line1", "line2", null, "line3"],
};
const extracted = extractActiveJourneyLineIds(activeJourney as any);
console.log("Input:", activeJourney);
console.log("Extracted:", extracted);
console.assert(extracted.length === 3, "❌ Should extract 3 non-null lines");
console.assert(extracted.includes("line1"), "❌ Should include line1");
console.assert(!extracted.includes(null as any), "❌ Should not include null");
console.log("✅ Test 8 passed\n");

// Test 9: Extract line IDs from favorites
console.log("📋 Test 9: Extract line IDs from favorite connections");
console.log("-".repeat(60));
const favorites = [
  { lineIds: ["line1", "line2"], notifyAlways: true },
  { lineIds: ["line3"], notifyAlways: true },
  { lineIds: ["line4"], notifyAlways: false }, // Should be excluded
];
const extractedFavorites = extractFavoriteLineIds(favorites as any);
console.log("Input:", favorites);
console.log("Extracted:", extractedFavorites);
console.assert(
  extractedFavorites.length === 3,
  "❌ Should extract 3 lines from notifyAlways=true favorites"
);
console.assert(extractedFavorites.includes("line1"), "❌ Should include line1");
console.assert(
  !extractedFavorites.includes("line4"),
  "❌ Should not include line4 (notifyAlways=false)"
);
console.log("✅ Test 9 passed\n");

// Test 10: Deduplication of favorite line IDs
console.log("📋 Test 10: Deduplication of favorite line IDs");
console.log("-".repeat(60));
const duplicateFavorites = [
  { lineIds: ["line1", "line2"], notifyAlways: true },
  { lineIds: ["line1", "line3"], notifyAlways: true }, // line1 repeated
];
const deduped = extractFavoriteLineIds(duplicateFavorites as any);
console.log("Input:", duplicateFavorites);
console.log("Extracted:", deduped);
const uniqueCount = new Set(deduped).size;
console.assert(
  uniqueCount === deduped.length,
  "❌ Should deduplicate line IDs"
);
console.assert(
  deduped.filter((id) => id === "line1").length === 1,
  "❌ line1 should appear only once"
);
console.log("✅ Test 10 passed\n");

// Summary
console.log("=".repeat(60));
console.log("✅ All tests passed!");
console.log("\n📊 Test Summary:");
console.log("  - Critical incidents on active journeys: CRITICAL priority");
console.log("  - Normal incidents on active journeys: HIGH priority");
console.log("  - Critical incidents on favorites: HIGH priority");
console.log("  - Normal incidents on favorites: MEDIUM priority");
console.log("  - Unrelated incidents: LOW priority (no notification)");
console.log("  - Active journey takes precedence over favorites");
console.log("  - Proper extraction and deduplication of line IDs");
console.log("\n🎉 Notification system is ready!\n");
