import clientPromise from "./src/lib/mongodb.js";

async function debugRoutes() {
  const client = await clientPromise;
  const db = client.db();

  console.log("🔍 Debugging Routes structure...\n");

  const routes = await db.collection("Routes").find({}).limit(3).toArray();

  console.log(
    `📊 Total routes: ${await db.collection("Routes").countDocuments()}`,
  );
  console.log("\n📄 Sample route structure:");

  if (routes.length > 0) {
    const route = routes[0];
    console.log(JSON.stringify(route, null, 2));
  }

  // Check if routes have the stops array
  console.log("\n🔍 Checking route.stops structure:");
  for (const route of routes.slice(0, 2)) {
    console.log(`\nRoute: ${route.lineName || route._id}`);
    console.log(`  lineId: ${route.lineId}`);
    console.log(`  transportType: ${route.transportType}`);
    console.log(`  stops count: ${route.stops?.length || 0}`);
    if (route.stops && route.stops.length > 0) {
      console.log(`  First stop:`, route.stops[0]);
      console.log(`  Last stop:`, route.stops[route.stops.length - 1]);
    }
  }

  // Find routes that connect our test stops
  const testStopIds = [
    "68e1a67ae55a3a89d35e08ac", // KRAKÓW GŁÓWNY
    "68e1a67ae55a3a89d35e08a3",
  ];

  console.log("\n🔍 Looking for routes connecting test stops...");
  for (const stopId of testStopIds) {
    const routesWithStop = await db
      .collection("Routes")
      .find({
        "stops.stopId": stopId,
      })
      .toArray();

    console.log(`\nRoutes containing stop ${stopId}: ${routesWithStop.length}`);
    if (routesWithStop.length > 0) {
      console.log(`  Sample route: ${routesWithStop[0].lineName}`);
    }
  }

  process.exit(0);
}

debugRoutes();
