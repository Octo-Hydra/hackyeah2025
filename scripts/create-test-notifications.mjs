import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";

async function createTestNotifications() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db();

    // Find a test user
    const user = await db.collection("users").findOne({});
    if (!user) {
      console.log("❌ No user found. Please create a user first.");
      return;
    }

    console.log(`📧 Using user: ${user.email}`);

    // Find an incident
    const incident = await db.collection("incidents").findOne({
      status: { $ne: "RESOLVED" },
    });

    if (!incident) {
      console.log("❌ No active incidents found.");
      return;
    }

    // Create test notifications
    const notifications = [
      {
        userId: user._id,
        incidentId: incident._id.toString(),
        title: "⚠️ Opóźnienie na Twojej trasie",
        description: `Linia ${incident.lineName || "N/A"} - ${incident.title}`,
        kind: incident.kind,
        status: incident.status,
        lineName: incident.lineName,
        delayMinutes: 15,
        receivedAt: new Date().toISOString(),
        dismissedAt: null,
      },
      {
        userId: user._id,
        incidentId: incident._id.toString(),
        title: "🚨 Wypadek na trasie",
        description: "Wypadek na ulicy Głównej - spodziewane opóźnienia",
        kind: "ACCIDENT",
        status: "OFFICIAL",
        lineName: "SKA2",
        delayMinutes: 30,
        receivedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        dismissedAt: null,
      },
      {
        userId: user._id,
        incidentId: incident._id.toString(),
        title: "🔧 Awaria pojazdu",
        description: "Awaria techniczna autobusu na linii 194",
        kind: "VEHICLE_FAILURE",
        status: "PENDING",
        lineName: "194",
        delayMinutes: 10,
        receivedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        dismissedAt: null,
      },
      {
        userId: user._id,
        incidentId: incident._id.toString(),
        title: "✅ Problem rozwiązany",
        description: "Korek na Rondzie Matecznego został usunięty",
        kind: "TRAFFIC_JAM",
        status: "RESOLVED",
        lineName: "194",
        delayMinutes: 0,
        receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        dismissedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      },
    ];

    const result = await db
      .collection("journeyNotifications")
      .insertMany(notifications);

    console.log(
      `✅ Created ${result.insertedCount} test notifications for user ${user.email}`
    );
    console.log("\nTest notifications:");
    notifications.forEach((n, i) => {
      console.log(`\n${i + 1}. ${n.title}`);
      console.log(`   Kind: ${n.kind}`);
      console.log(`   Status: ${n.status}`);
      console.log(`   Line: ${n.lineName}`);
      console.log(`   Dismissed: ${n.dismissedAt ? "Yes" : "No"}`);
    });
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
  }
}

createTestNotifications();
