import { MongoClient, ObjectId } from "mongodb";
import clientPromise from "../src/lib/mongodb.js";

async function checkStops() {
  try {
    const client = await clientPromise;
    const db = client.db();

    console.log("🔍 Searching for stop with _id: 68e1a67ae55a3a89d35e08ac");
    const stop1 = await db
      .collection("stops")
      .findOne({ _id: new ObjectId("68e1a67ae55a3a89d35e08ac") });
    console.log("Stop 1:", JSON.stringify(stop1, null, 2));

    console.log("\n🔍 Searching for stop with _id: 68e1a67ae55a3a89d35e08a3");
    const stop2 = await db
      .collection("stops")
      .findOne({ _id: new ObjectId("68e1a67ae55a3a89d35e08a3") });
    console.log("Stop 2:", JSON.stringify(stop2, null, 2));

    console.log("\n📊 Sample stops structure:");
    const samples = await db.collection("stops").find({}).limit(3).toArray();
    samples.forEach((s, i) => {
      console.log(`\nStop ${i + 1}:`, {
        _id: s._id,
        stopId: s.stopId,
        stopName: s.stopName,
        gtfsId: s.gtfsId,
        hasStopId: !!s.stopId,
      });
    });

    console.log("\n\n🔍 Checking collection names:");
    const collections = await db.listCollections().toArray();
    console.log("Collections:", collections.map((c) => c.name).join(", "));
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

checkStops();
