/**
 * Test script to check MongoDB stops structure
 */

import clientPromise from "../src/lib/mongodb";

async function testStops() {
  try {
    const client = await clientPromise;
    const db = client.db();

    console.log("🔍 Checking MongoDB collections...\n");

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(
      "📦 Available collections:",
      collections.map((c) => c.name).join(", "),
    );

    // Check both 'stops' and 'Stops' collections
    for (const collectionName of ["stops", "Stops"]) {
      console.log(`\n📊 Checking '${collectionName}' collection:`);

      const count = await db.collection(collectionName).countDocuments();
      console.log(`   Total documents: ${count}`);

      if (count > 0) {
        const sample = await db.collection(collectionName).findOne({});
        console.log("   Sample document structure:");
        console.log(
          "   ",
          JSON.stringify(
            {
              _id: sample?._id,
              stopId: sample?.stopId,
              stopName: sample?.stopName,
              name: sample?.name,
              coordinates: sample?.coordinates,
              hasStopIdField: !!sample?.stopId,
            },
            null,
            2,
          ),
        );

        // Check if stopId field exists
        const withStopId = await db
          .collection(collectionName)
          .countDocuments({ stopId: { $exists: true } });
        console.log(`   Documents with 'stopId' field: ${withStopId}`);
      }
    }

    // Test the specific IDs from the query
    const testIds = ["68e1a67ae55a3a89d35e08ac", "68e1a67ae55a3a89d35e08a3"];

    console.log("\n🔍 Testing specific IDs from query:");
    for (const testId of testIds) {
      console.log(`\n   Testing ID: ${testId}`);

      // Try as stopId
      const byStopId = await db.collection("stops").findOne({ stopId: testId });
      console.log(`   Found by stopId: ${!!byStopId}`);

      // Try as _id (ObjectId string)
      const byObjectId = await db
        .collection("stops")
        .findOne({ _id: testId as never });
      console.log(`   Found by _id: ${!!byObjectId}`);

      if (byStopId || byObjectId) {
        const found = byStopId || byObjectId;
        console.log("   Document:", {
          _id: found?._id,
          stopId: found?.stopId,
          stopName: found?.stopName || found?.name,
        });
      }
    }

    // Check routes collection
    console.log("\n📊 Checking 'routes' collection:");
    const routesCount = await db.collection("routes").countDocuments();
    console.log(`   Total routes: ${routesCount}`);

    if (routesCount > 0) {
      const sampleRoute = await db.collection("routes").findOne({});
      console.log("   Sample route structure:");
      console.log(
        "   ",
        JSON.stringify(
          {
            _id: sampleRoute?._id,
            lineId: sampleRoute?.lineId,
            lineName: sampleRoute?.lineName,
            transportType: sampleRoute?.transportType,
            stopsCount: sampleRoute?.stops?.length,
            sampleStop: sampleRoute?.stops?.[0],
          },
          null,
          2,
        ),
      );
    }

    console.log("\n✅ Test complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

testStops();
