/**
 * Create test incident for path finding warnings
 */
import { ObjectId } from "mongodb";
import clientPromise from "../src/lib/mongodb.ts";

async function createTestIncident() {
  const client = await clientPromise;
  const db = client.db();

  try {
    // Find SKA2 line (Kraków - Oświęcim)
    const ska2Line = await db.collection("Lines").findOne({ 
      gtfsId: "SKA2" 
    });

    if (!ska2Line) {
      console.log("❌ SKA2 line not found!");
      return;
    }

    console.log(`✅ Found SKA2 line: ${ska2Line._id}`);

    // Find stops on this line for incident location
    const stop1 = await db.collection("Stops").findOne({ 
      name: "KRAKÓW ZABŁOCIE" 
    });
    const stop2 = await db.collection("Stops").findOne({ 
      name: "KRAKÓW PODGÓRZE" 
    });

    if (!stop1 || !stop2) {
      console.log("❌ Stops not found!");
      return;
    }

    console.log(`✅ Found stops: ${stop1.name} → ${stop2.name}`);

    // Create incident
    const incident = {
      _id: new ObjectId(),
      title: "Awaria techniczna pociągu",
      description: "Usterka hamulców - opóźnienie do 15 minut",
      kind: "VEHICLE_FAILURE",
      transportType: "RAIL",
      status: "PUBLISHED",
      isFake: false,
      lineIds: [ska2Line._id],
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: new ObjectId(), // fake user ID
      reputation: 150,
    };

    const incidentResult = await db.collection("Incidents").insertOne(incident);
    console.log(`✅ Created incident: ${incidentResult.insertedId}`);

    // Create incident location
    const incidentLocation = {
      incidentId: incident._id,
      lineId: ska2Line._id,
      startStopId: stop1._id,
      endStopId: stop2._id,
      severity: "HIGH",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const locationResult = await db.collection("IncidentLocations").insertOne(incidentLocation);
    console.log(`✅ Created incident location: ${locationResult.insertedId}`);

    console.log("\n🎉 Test incident created successfully!");
    console.log("\n📍 Details:");
    console.log(`   Line: SKA2`);
    console.log(`   Segment: ${stop1.name} → ${stop2.name}`);
    console.log(`   Type: VEHICLE_FAILURE`);
    console.log(`   Severity: HIGH`);
    console.log(`   Description: ${incident.description}`);

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

console.log("🔧 Creating test incident for path finding...\n");
createTestIncident();
