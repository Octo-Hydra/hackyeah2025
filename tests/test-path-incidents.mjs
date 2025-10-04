/**
 * Test Path Finding with Incident Warnings
 *
 * Usage: node test-path-incidents.mjs
 */

import { MongoClient, ObjectId } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/ontime";

async function testPathWithIncidents() {
  console.log("=== Path Finding with Incident Warnings Test ===\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db();

    // 1. Find some stops to test
    console.log("📍 Finding test stops...");
    const stops = await db.collection("Stops").find().limit(5).toArray();

    if (stops.length < 2) {
      console.log("❌ Need at least 2 stops in database");
      return;
    }

    console.log(`   Found ${stops.length} stops:`);
    stops.forEach((stop, i) => {
      console.log(`   ${i + 1}. ${stop.name} (${stop._id})`);
    });
    console.log();

    // 2. Check for active incidents
    console.log("🔍 Checking active incidents...");
    const activeIncidents = await db
      .collection("Incidents")
      .find({
        status: { $in: ["PUBLISHED", "DRAFT"] },
        isFake: { $ne: true },
      })
      .toArray();

    console.log(`   Found ${activeIncidents.length} active incidents\n`);

    if (activeIncidents.length > 0) {
      console.log("📋 Active incidents details:");
      for (const incident of activeIncidents.slice(0, 5)) {
        console.log(`   - ${incident.title} (${incident.kind})`);
        console.log(`     Status: ${incident.status}`);

        if (incident.lineIds && incident.lineIds.length > 0) {
          const lines = await db
            .collection("Lines")
            .find({
              _id: {
                $in: incident.lineIds.map((id) =>
                  typeof id === "string" ? new ObjectId(id) : id,
                ),
              },
            })
            .toArray();

          console.log(`     Lines: ${lines.map((l) => l.name).join(", ")}`);
        }

        if (incident.description) {
          console.log(`     Description: ${incident.description}`);
        }
        console.log();
      }
    } else {
      console.log(
        "   ℹ️  No active incidents - create some to test warnings\n",
      );
    }

    // 3. Test pathfinding
    console.log("🛤️  Testing path finding...\n");

    // Simple test: find path between first two stops
    const fromStop = stops[0];
    const toStop = stops[1];

    console.log(`From: ${fromStop.name}`);
    console.log(
      `  Coordinates: ${fromStop.coordinates.latitude}, ${fromStop.coordinates.longitude}`,
    );
    console.log(`To: ${toStop.name}`);
    console.log(
      `  Coordinates: ${toStop.coordinates.latitude}, ${toStop.coordinates.longitude}\n`,
    );

    // 4. Find routes connecting these stops
    console.log("🔎 Finding routes...");
    const routes = await db.collection("Routes").find({}).toArray();

    let foundRoute = null;
    for (const route of routes) {
      const hasFrom = route.stops.some((s) => {
        const stopId =
          typeof s.stopId === "string" ? s.stopId : s.stopId.toString();
        return stopId === fromStop._id.toString();
      });

      const hasTo = route.stops.some((s) => {
        const stopId =
          typeof s.stopId === "string" ? s.stopId : s.stopId.toString();
        return stopId === toStop._id.toString();
      });

      if (hasFrom && hasTo) {
        foundRoute = route;
        break;
      }
    }

    if (foundRoute) {
      console.log(`   ✅ Found route: ${foundRoute._id}`);

      // Get line info
      const lineId =
        typeof foundRoute.lineId === "string"
          ? new ObjectId(foundRoute.lineId)
          : foundRoute.lineId;

      const line = await db.collection("Lines").findOne({ _id: lineId });
      if (line) {
        console.log(`   Line: ${line.name} (${line.transportType})`);
      }

      // Check for incidents on this line
      const lineIncidents = await db
        .collection("Incidents")
        .find({
          status: { $in: ["PUBLISHED", "DRAFT"] },
          isFake: { $ne: true },
          lineIds: lineId,
        })
        .toArray();

      if (lineIncidents.length > 0) {
        console.log(
          `\n   ⚠️  ${lineIncidents.length} incident(s) on this route:`,
        );
        lineIncidents.forEach((inc) => {
          console.log(
            `      - ${inc.title}: ${inc.description || "No description"}`,
          );
        });
      } else {
        console.log(`\n   ✅ No incidents on this route`);
      }
    } else {
      console.log(`   ℹ️  No direct route found between these stops`);
    }

    console.log();

    // 5. Simulate what warnings would look like
    console.log("📢 Expected warnings format:\n");

    const sampleWarnings = [
      "⚠️ AWARIA SIECI na linii Metro M1",
      "🚦 KOREK na linii Bus 175",
      "🔴 Wypadek (Dworzec Centralny → Świętokrzyska)",
      "🟡 Awaria pojazdu (Marszałkowska → Politechnika)",
    ];

    sampleWarnings.forEach((warning) => {
      console.log(`   ${warning}`);
    });

    console.log();

    // 6. Statistics
    console.log("📊 Database Statistics:\n");
    const stats = {
      stops: await db.collection("Stops").countDocuments(),
      routes: await db.collection("Routes").countDocuments(),
      lines: await db.collection("Lines").countDocuments(),
      incidents: await db.collection("Incidents").countDocuments(),
      activeIncidents: await db.collection("Incidents").countDocuments({
        status: { $in: ["PUBLISHED", "DRAFT"] },
        isFake: { $ne: true },
      }),
      incidentLocations: await db
        .collection("IncidentLocations")
        .countDocuments({
          active: true,
        }),
    };

    console.log(`   Stops: ${stats.stops}`);
    console.log(`   Routes: ${stats.routes}`);
    console.log(`   Lines: ${stats.lines}`);
    console.log(`   Total Incidents: ${stats.incidents}`);
    console.log(`   Active Incidents: ${stats.activeIncidents}`);
    console.log(`   Active Incident Locations: ${stats.incidentLocations}`);
    console.log();

    // 7. Recommendations
    console.log("💡 Testing Recommendations:\n");

    if (stats.activeIncidents === 0) {
      console.log("   ℹ️  Create test incidents using GraphQL:");
      console.log(`
   mutation {
     createReport(input: {
       kind: TRAFFIC_JAM
       description: "Heavy traffic on main route"
       lineIds: ["LINE_ID_HERE"]
       reporterLocation: {
         latitude: 52.2297
         longitude: 21.0122
       }
     }) {
       id
       title
     }
   }
      `);
    } else {
      console.log("   ✅ Test path finding with GraphQL:");
      console.log(`
   query {
     findPath(input: {
       from: { latitude: ${fromStop.coordinates.latitude}, longitude: ${fromStop.coordinates.longitude} }
       to: { latitude: ${toStop.coordinates.latitude}, longitude: ${toStop.coordinates.longitude} }
     }) {
       segments {
         from { stopName }
         to { stopName }
         lineName
       }
       warnings
     }
   }
      `);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
    console.log("\n✅ Connection closed");
  }
}

testPathWithIncidents();
