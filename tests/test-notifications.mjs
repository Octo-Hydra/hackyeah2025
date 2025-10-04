/**
 * Test Notification System
 *
 * Usage: node test-notifications.mjs
 */

import { MongoClient, ObjectId } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/ontime";

async function testNotificationSystem() {
  console.log("=== Notification System Test ===\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db();

    // 1. Find users with different roles
    console.log("📊 Finding users...");
    const admin = await db.collection("Users").findOne({ role: "ADMIN" });
    const moderator = await db
      .collection("Users")
      .findOne({ role: "MODERATOR" });
    const users = await db
      .collection("Users")
      .find({ role: "USER" })
      .limit(3)
      .toArray();

    console.log(`   Admin: ${admin ? admin.name : "Not found"}`);
    console.log(`   Moderator: ${moderator ? moderator.name : "Not found"}`);
    console.log(`   Users: ${users.length} found\n`);

    // 2. Check recent incidents
    console.log("📝 Recent incidents:");
    const recentIncidents = await db
      .collection("Incidents")
      .find()
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    for (const incident of recentIncidents) {
      const reporter = await db
        .collection("Users")
        .findOne({ _id: new ObjectId(incident.reportedBy) });

      console.log(`   ${incident.title}`);
      console.log(
        `      By: ${reporter?.name || "Unknown"} (${reporter?.role})`,
      );
      console.log(
        `      Trust Score: ${reporter?.trustScore?.toFixed(2) || "N/A"}`,
      );
      console.log(`      Status: ${incident.status}`);
      console.log(`      Created: ${incident.createdAt}\n`);
    }

    // 3. Simulate notification logic
    console.log("🔍 Notification Logic Test:\n");

    for (const incident of recentIncidents.slice(0, 3)) {
      const reporter = await db
        .collection("Users")
        .findOne({ _id: new ObjectId(incident.reportedBy) });

      if (!reporter) continue;

      console.log(`Incident: ${incident.title}`);
      console.log(`Reporter: ${reporter.name} (${reporter.role})`);

      // Check if would trigger notification
      if (reporter.role === "ADMIN" || reporter.role === "MODERATOR") {
        console.log(`   ✅ INSTANT notification (${reporter.role})`);
      } else {
        // USER report - check trust score
        const trustScore = reporter.trustScore || 1.0;
        const THRESHOLD = 1.2;

        console.log(`   Trust Score: ${trustScore.toFixed(2)}`);

        // Find similar reports
        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);

        const similarReports = await db.collection("Incidents").countDocuments({
          _id: { $ne: incident._id },
          kind: incident.kind,
          status: "PUBLISHED",
          lineIds: { $in: incident.lineIds || [] },
          createdAt: { $gte: oneDayAgo.toISOString() },
        });

        console.log(`   Similar reports (24h): ${similarReports}`);

        if (trustScore >= THRESHOLD) {
          console.log(`   ✅ NOTIFY (trust score >= ${THRESHOLD})`);
        } else if (similarReports >= 2) {
          console.log(`   ✅ NOTIFY (similar reports >= 2)`);
        } else {
          console.log(`   ⏭️  SKIP (below threshold)`);
        }
      }

      console.log();
    }

    // 4. Check users with active journeys/favorites
    console.log("👥 Users with active journeys/favorites:\n");
    const usersWithJourneys = await db
      .collection("Users")
      .find({
        $or: [
          { activeJourney: { $exists: true, $ne: null } },
          { favoriteConnections: { $exists: true, $ne: [] } },
        ],
      })
      .limit(5)
      .toArray();

    for (const user of usersWithJourneys) {
      console.log(`   ${user.name} (${user.email})`);

      if (user.activeJourney) {
        console.log(
          `      Active Journey: ${user.activeJourney.lineIds?.length || 0} lines`,
        );
      }

      if (user.favoriteConnections?.length > 0) {
        console.log(
          `      Favorites: ${user.favoriteConnections.length} connections`,
        );
      }

      console.log();
    }

    // 5. Deduplication cache test
    console.log("🔄 Deduplication Test:\n");

    const testCache = new Map();
    const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

    // Simulate marking incidents as delivered
    const testIncidentId = "test-incident-123";
    const testUserId = "test-user-456";
    const cacheKey = `${testIncidentId}:${testUserId}`;

    testCache.set(cacheKey, Date.now());
    console.log(`   ✅ Marked incident as delivered to user`);
    console.log(`      Cache key: ${cacheKey}`);
    console.log(`      Timestamp: ${new Date().toISOString()}`);

    // Check if would be delivered again
    const deliveredAt = testCache.get(cacheKey);
    const now = Date.now();
    const isDuplicate = deliveredAt && now - deliveredAt < CACHE_TTL_MS;

    if (isDuplicate) {
      console.log(`   ⏭️  Would skip (duplicate, within TTL)`);
    } else {
      console.log(`   ✅ Would send (not in cache or expired)`);
    }

    console.log();

    // 6. Statistics
    console.log("📊 Statistics:\n");
    const stats = {
      totalIncidents: await db.collection("Incidents").countDocuments(),
      publishedIncidents: await db
        .collection("Incidents")
        .countDocuments({ status: "PUBLISHED" }),
      resolvedIncidents: await db
        .collection("Incidents")
        .countDocuments({ status: "RESOLVED" }),
      totalUsers: await db.collection("Users").countDocuments(),
      admins: await db.collection("Users").countDocuments({ role: "ADMIN" }),
      moderators: await db
        .collection("Users")
        .countDocuments({ role: "MODERATOR" }),
      regularUsers: await db
        .collection("Users")
        .countDocuments({ role: "USER" }),
      usersWithTrustScore: await db
        .collection("Users")
        .countDocuments({ trustScore: { $exists: true } }),
    };

    console.log(`   Total Incidents: ${stats.totalIncidents}`);
    console.log(`   Published: ${stats.publishedIncidents}`);
    console.log(`   Resolved: ${stats.resolvedIncidents}`);
    console.log();
    console.log(`   Total Users: ${stats.totalUsers}`);
    console.log(`   Admins: ${stats.admins}`);
    console.log(`   Moderators: ${stats.moderators}`);
    console.log(`   Regular Users: ${stats.regularUsers}`);
    console.log(`   Users with Trust Score: ${stats.usersWithTrustScore}`);
    console.log();

    // 7. Recommendations
    console.log("💡 Recommendations:\n");

    if (stats.usersWithTrustScore === 0) {
      console.log("   ⚠️  No users have trust scores yet");
      console.log("      → Enable cron with RUN_CRON=true");
      console.log("      → Wait 5 seconds for first update");
    } else if (stats.usersWithTrustScore < stats.totalUsers / 2) {
      console.log("   ⚠️  Many users missing trust scores");
      console.log("      → Check if cron is running");
      console.log("      → Only users who reported incidents get scores");
    } else {
      console.log("   ✅ Trust scores are being calculated");
    }

    console.log();

    if (stats.publishedIncidents < 5) {
      console.log("   ℹ️  Few incidents for testing");
      console.log("      → Create more test incidents");
      console.log("      → Test with different user roles");
    }

    console.log();
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
    console.log("✅ Connection closed");
  }
}

testNotificationSystem();
