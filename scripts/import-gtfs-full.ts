import { MongoClient, ObjectId } from "mongodb";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// FULL IMPORT - Import complete schedule data
const CONFIG = {
  ENABLE_STOP_TIMES: true,
  MAX_STOPS: 200,
  MAX_ROUTES: 20,
  MAX_TRIPS_WITH_TIMES: 50, // Trips to fully populate with stop times
  SAMPLE_HOURS: ["06", "07", "08", "09", "14", "15", "16", "17"],
};

interface GTFSStop {
  stop_id: string;
  stop_name: string;
  stop_lat: string;
  stop_lon: string;
  stop_code?: string;
}

interface GTFSRoute {
  route_id: string;
  route_short_name: string;
  route_type: string;
}

interface GTFSTrip {
  trip_id: string;
  route_id: string;
  service_id: string;
  trip_headsign?: string;
  direction_id?: string;
}

interface GTFSStopTime {
  trip_id: string;
  arrival_time: string;
  departure_time: string;
  stop_id: string;
  stop_sequence: string;
}

function parseCSV<T>(filePath: string, limit?: number): T[] {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim());

    if (lines.length === 0) return [];

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const results: T[] = [];
    const maxLines = limit ? Math.min(limit + 1, lines.length) : lines.length;

    for (let i = 1; i < maxLines; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
      const obj: Record<string, string> = {};

      headers.forEach((header, index) => {
        obj[header] = values[index] || "";
      });

      results.push(obj as T);
    }

    return results;
  } catch (error) {
    console.warn(`⚠️  Could not read ${filePath}`);
    return [];
  }
}

// Stream parse large files
async function parseStopTimesForTrips(
  filePath: string,
  tripIds: Set<string>,
  stopsMap: Map<string, ObjectId>
): Promise<
  Map<
    string,
    Array<{
      stopId: ObjectId;
      arrivalTime: string;
      departureTime: string;
      stopSequence: number;
    }>
  >
> {
  const tripStopTimes = new Map<string, Array<any>>();

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  stop_times.txt not found at ${filePath}`);
    return tripStopTimes;
  }

  console.log("   📖 Reading stop_times.txt (this may take a moment)...");

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let isFirstLine = true;
  let headers: string[] = [];
  let processed = 0;

  for await (const line of rl) {
    if (isFirstLine) {
      headers = line.split(",").map((h) => h.trim());
      isFirstLine = false;
      continue;
    }

    const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || "";
    });

    const stopTime = obj as unknown as GTFSStopTime;

    if (tripIds.has(stopTime.trip_id) && stopsMap.has(stopTime.stop_id)) {
      if (!tripStopTimes.has(stopTime.trip_id)) {
        tripStopTimes.set(stopTime.trip_id, []);
      }

      const normalized = normalizeTime(stopTime.arrival_time);

      tripStopTimes.get(stopTime.trip_id)!.push({
        stopId: stopsMap.get(stopTime.stop_id)!,
        arrivalTime: normalizeTime(stopTime.arrival_time),
        departureTime: normalizeTime(stopTime.departure_time),
        stopSequence: parseInt(stopTime.stop_sequence),
      });

      processed++;
      if (processed % 10000 === 0) {
        process.stdout.write(`\r   Processed ${processed} stop times...`);
      }
    }
  }

  console.log(
    `\r   ✅ Processed ${processed} stop times for ${tripStopTimes.size} trips`
  );

  // Sort by sequence
  for (const [tripId, stops] of tripStopTimes) {
    stops.sort((a, b) => a.stopSequence - b.stopSequence);
  }

  return tripStopTimes;
}

function normalizeTime(time: string): string {
  const parts = time.split(":");
  let hours = parseInt(parts[0]);
  const minutes = parts[1];

  if (hours >= 24) {
    hours = hours % 24;
  }

  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

function getRouteType(gtfsType: string): "BUS" | "RAIL" | "TRAM" | "METRO" {
  switch (gtfsType) {
    case "0":
      return "TRAM";
    case "1":
      return "METRO";
    case "2":
      return "RAIL";
    case "3":
    default:
      return "BUS";
  }
}

async function importGTFSFull() {
  const client = new MongoClient("mongodb://admin:admin@localhost:27017");

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db();

    console.log("\n🗑️  Clearing existing data...");
    await db.collection("Stops").deleteMany({});
    await db.collection("Lines").deleteMany({});
    await db.collection("Routes").deleteMany({});

    // Create indexes for deduplication
    await db.collection("Stops").createIndex({ gtfsId: 1 }, { unique: true });
    await db.collection("Lines").createIndex({ gtfsId: 1 }, { unique: true });

    const stopsMap = new Map<string, ObjectId>();
    const linesMap = new Map<string, ObjectId>();

    // Import Stops
    console.log("\n📍 Importing Stops...");

    const busStops = parseCSV<GTFSStop>(
      path.join(process.cwd(), "populate-gtfs", "bus", "stops.txt"),
      CONFIG.MAX_STOPS
    );

    for (const stop of busStops) {
      const doc = {
        name: stop.stop_name,
        coordinates: {
          latitude: parseFloat(stop.stop_lat),
          longitude: parseFloat(stop.stop_lon),
        },
        transportType: "BUS" as const,
        platformNumbers: stop.stop_code ? [stop.stop_code] : [],
        gtfsId: stop.stop_id,
      };
      try {
        const result = await db.collection("Stops").insertOne(doc);
        stopsMap.set(stop.stop_id, result.insertedId);
      } catch (e: any) {
        if (e.code === 11000) {
          // Duplicate key - get existing
          const existing = await db
            .collection("Stops")
            .findOne({ gtfsId: stop.stop_id });
          if (existing) stopsMap.set(stop.stop_id, existing._id);
        }
      }
    }

    const trainStops = parseCSV<GTFSStop>(
      path.join(process.cwd(), "populate-gtfs", "train", "stops.txt"),
      CONFIG.MAX_STOPS
    );

    for (const stop of trainStops) {
      const doc = {
        name: stop.stop_name,
        coordinates: {
          latitude: parseFloat(stop.stop_lat),
          longitude: parseFloat(stop.stop_lon),
        },
        transportType: "RAIL" as const,
        platformNumbers: stop.stop_code ? [stop.stop_code] : [],
        gtfsId: stop.stop_id,
      };
      try {
        const result = await db.collection("Stops").insertOne(doc);
        stopsMap.set(stop.stop_id, result.insertedId);
      } catch (e: any) {
        if (e.code === 11000) {
          // Duplicate key - get existing
          const existing = await db
            .collection("Stops")
            .findOne({ gtfsId: stop.stop_id });
          if (existing) stopsMap.set(stop.stop_id, existing._id);
        }
      }
    }

    console.log(`✅ Imported ${busStops.length + trainStops.length} stops`);

    // Import Lines
    console.log("\n🚌 Importing Lines...");

    const busRoutes = parseCSV<GTFSRoute>(
      path.join(process.cwd(), "populate-gtfs", "bus", "routes.txt"),
      CONFIG.MAX_ROUTES
    );

    for (const route of busRoutes) {
      const doc = {
        name: `Bus ${route.route_short_name}`,
        transportType: getRouteType(route.route_type),
        gtfsId: route.route_id,
      };
      try {
        const result = await db.collection("Lines").insertOne(doc);
        linesMap.set(route.route_id, result.insertedId);
      } catch (e: any) {
        if (e.code === 11000) {
          const existing = await db
            .collection("Lines")
            .findOne({ gtfsId: route.route_id });
          if (existing) linesMap.set(route.route_id, existing._id);
        }
      }
    }

    const trainRoutes = parseCSV<GTFSRoute>(
      path.join(process.cwd(), "populate-gtfs", "train", "routes.txt"),
      CONFIG.MAX_ROUTES
    );

    for (const route of trainRoutes) {
      const doc = {
        name: `Train ${route.route_short_name}`,
        transportType: "RAIL" as const,
        gtfsId: route.route_id,
      };
      try {
        const result = await db.collection("Lines").insertOne(doc);
        linesMap.set(route.route_id, result.insertedId);
      } catch (e: any) {
        if (e.code === 11000) {
          const existing = await db
            .collection("Lines")
            .findOne({ gtfsId: route.route_id });
          if (existing) linesMap.set(route.route_id, existing._id);
        }
      }
    }

    console.log(`✅ Imported ${busRoutes.length + trainRoutes.length} lines`);

    // Import Schedules with Stop Times
    console.log("\n⏰ Importing Schedules with Stop Times...");

    // BUS ROUTES
    const busTrips = parseCSV<GTFSTrip>(
      path.join(process.cwd(), "populate-gtfs", "bus", "trips.txt"),
      CONFIG.MAX_TRIPS_WITH_TIMES
    );

    const selectedBusTripIds = new Set(busTrips.map((t) => t.trip_id));

    let busStopTimes: Map<string, Array<any>> | null = null;
    if (CONFIG.ENABLE_STOP_TIMES) {
      busStopTimes = await parseStopTimesForTrips(
        path.join(process.cwd(), "populate-gtfs", "bus", "stop_times.txt"),
        selectedBusTripIds,
        stopsMap
      );
    }

    let busRoutesCreated = 0;
    for (const trip of busTrips) {
      if (!linesMap.has(trip.route_id)) continue;

      const stops = busStopTimes?.get(trip.trip_id) || [];

      // Skip if no stops
      if (stops.length === 0) continue;

      const routeDoc = {
        lineId: linesMap.get(trip.route_id)!,
        direction:
          trip.trip_headsign || `Direction ${trip.direction_id || "0"}`,
        stops,
        validDays: ["MON", "TUE", "WED", "THU", "FRI"],
        validFrom: "2025-01-01",
        validTo: "2025-12-31",
        gtfsTripId: trip.trip_id,
      };

      await db.collection("Routes").insertOne(routeDoc);
      busRoutesCreated++;
    }

    console.log(`✅ Created ${busRoutesCreated} bus routes with schedules`);

    // TRAIN ROUTES
    const trainTrips = parseCSV<GTFSTrip>(
      path.join(process.cwd(), "populate-gtfs", "train", "trips.txt"),
      CONFIG.MAX_TRIPS_WITH_TIMES
    );

    const selectedTrainTripIds = new Set(trainTrips.map((t) => t.trip_id));

    let trainStopTimes: Map<string, Array<any>> | null = null;
    if (CONFIG.ENABLE_STOP_TIMES) {
      trainStopTimes = await parseStopTimesForTrips(
        path.join(process.cwd(), "populate-gtfs", "train", "stop_times.txt"),
        selectedTrainTripIds,
        stopsMap
      );
    }

    let trainRoutesCreated = 0;
    for (const trip of trainTrips) {
      if (!linesMap.has(trip.route_id)) continue;

      const stops = trainStopTimes?.get(trip.trip_id) || [];

      // Skip if no stops
      if (stops.length === 0) continue;

      const routeDoc = {
        lineId: linesMap.get(trip.route_id)!,
        direction:
          trip.trip_headsign || `Direction ${trip.direction_id || "0"}`,
        stops,
        validDays: ["MON", "TUE", "WED", "THU", "FRI"],
        validFrom: "2025-01-01",
        validTo: "2025-12-31",
        gtfsTripId: trip.trip_id,
      };

      await db.collection("Routes").insertOne(routeDoc);
      trainRoutesCreated++;
    }

    console.log(`✅ Created ${trainRoutesCreated} train routes with schedules`);

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 Full Import Summary:");
    console.log("=".repeat(60));
    console.log(
      `Total Stops:           ${busStops.length + trainStops.length}`
    );
    console.log(
      `Total Lines:           ${busRoutes.length + trainRoutes.length}`
    );
    console.log(`Bus Routes:            ${busRoutesCreated}`);
    console.log(`Train Routes:          ${trainRoutesCreated}`);
    console.log(
      `Total Routes:          ${busRoutesCreated + trainRoutesCreated}`
    );
    console.log(
      `Stop Times Enabled:    ${CONFIG.ENABLE_STOP_TIMES ? "YES ✅" : "NO ❌"}`
    );
    console.log("=".repeat(60));

    console.log("\n✅ Full GTFS import completed!");
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await client.close();
  }
}

importGTFSFull().catch(console.error);
