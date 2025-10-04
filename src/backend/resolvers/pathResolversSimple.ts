import { Db, ObjectId } from "mongodb";
import type {
  StopModel,
  RouteModel,
  LineModel,
  Coordinates,
  PathSegment,
  JourneyPath,
  FindPathInput,
} from "../db/collections";
import { DB } from "../db/client.js";

// Haversine distance in meters
function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371000;
  const lat1 = (coord1.latitude * Math.PI) / 180;
  const lat2 = (coord2.latitude * Math.PI) / 180;
  const deltaLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const deltaLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Find nearest stop
async function findNearestStop(
  db: Db,
  coordinates: Coordinates,
  maxDistance: number = 50000
): Promise<StopModel | null> {
  const stops = await db.collection<StopModel>("Stops").find({}).toArray();

  let nearest: StopModel | null = null;
  let minDistance = maxDistance;

  for (const stop of stops) {
    const distance = calculateDistance(coordinates, stop.coordinates);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = stop;
    }
  }

  return nearest;
}

function getCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export const pathResolvers = {
  async findPath(
    _: unknown,
    { input }: { input: FindPathInput }
  ): Promise<JourneyPath> {
    const db = await DB();
    const {
      startCoordinates,
      endCoordinates,
      departureTime = getCurrentTime(),
    } = input;

    // Find nearest stops (50km radius)
    const startStop = await findNearestStop(db, startCoordinates, 50000);
    const endStop = await findNearestStop(db, endCoordinates, 50000);

    if (!startStop || !endStop) {
      return {
        segments: [],
        totalDuration: 0,
        totalTransfers: 0,
        departureTime,
        arrivalTime: departureTime,
        warnings: ["❌ No stops found in database"],
      };
    }

    console.log(`\n🔍 PATH FINDING`);
    console.log(`START: ${startStop.name} (${startStop.transportType})`);
    console.log(`END: ${endStop.name} (${endStop.transportType})`);

    // Get ALL routes
    const allRoutes = await db
      .collection<RouteModel>("Routes")
      .find({})
      .toArray();
    console.log(`📊 Total routes in DB: ${allRoutes.length}`);

    const segments: PathSegment[] = [];
    const warnings: string[] = [];

    // Find routes containing BOTH stops (ignore time)
    for (const route of allRoutes) {
      let fromIndex = -1;
      let toIndex = -1;

      // Find stop indexes
      for (let i = 0; i < route.stops.length; i++) {
        const stopId = route.stops[i].stopId;
        const stopIdStr =
          typeof stopId === "string" ? stopId : stopId.toString();

        if (stopIdStr === startStop._id!.toString()) fromIndex = i;
        if (stopIdStr === endStop._id!.toString() && fromIndex !== -1) {
          toIndex = i;
          break;
        }
      }

      // Valid route found
      if (fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex) {
        const lineId =
          typeof route.lineId === "string"
            ? new ObjectId(route.lineId)
            : route.lineId;

        const line = await db
          .collection<LineModel>("Lines")
          .findOne({ _id: lineId });
        if (!line) continue;

        console.log(`✅ FOUND: ${line.name} (${line.transportType})`);

        // Get all stops on path
        const stopsOnPath: string[] = [];
        let totalDistance = 0;

        for (let i = fromIndex; i <= toIndex; i++) {
          const stopId =
            typeof route.stops[i].stopId === "string"
              ? new ObjectId(route.stops[i].stopId)
              : route.stops[i].stopId;

          const stop = await db
            .collection<StopModel>("Stops")
            .findOne({ _id: stopId });
          if (stop) {
            stopsOnPath.push(stop.name);

            // Calculate distance to next stop
            if (i < toIndex) {
              const nextStopId =
                typeof route.stops[i + 1].stopId === "string"
                  ? new ObjectId(route.stops[i + 1].stopId)
                  : route.stops[i + 1].stopId;
              const nextStop = await db
                .collection<StopModel>("Stops")
                .findOne({ _id: nextStopId });
              if (nextStop) {
                totalDistance += calculateDistance(
                  stop.coordinates,
                  nextStop.coordinates
                );
              }
            }
          }
        }

        // Create segment
        segments.push({
          segmentType: "TRANSIT",
          from: {
            stopId: startStop._id!.toString(),
            stopName: startStop.name,
            coordinates: startStop.coordinates,
          },
          to: {
            stopId: endStop._id!.toString(),
            stopName: endStop.name,
            coordinates: endStop.coordinates,
          },
          lineId: line._id!.toString(),
          lineName: line.gtfsId || line.name,
          transportType: line.transportType,
          departureTime: route.stops[fromIndex].departureTime || "N/A",
          arrivalTime: route.stops[toIndex].arrivalTime || "N/A",
          duration: Math.round(totalDistance / 500), // Estimate: 30km/h avg
          distance: Math.round(totalDistance),
          warnings: [
            `📍 ${stopsOnPath.length} stops on route:`,
            ...stopsOnPath.map((name, idx) => `  ${idx + 1}. ${name}`),
          ],
        });

        console.log(`   Distance: ${Math.round(totalDistance)}m`);
        console.log(`   Stops: ${stopsOnPath.length}`);

        // Only return first found route
        break;
      }
    }

    if (segments.length === 0) {
      warnings.push(
        `❌ No route found from ${startStop.name} to ${endStop.name}`
      );
      warnings.push(`💡 Check: db.Routes.count() and db.Stops.count()`);
      console.log(`❌ NO ROUTE FOUND`);
    }

    return {
      segments,
      totalDuration: segments.reduce(
        (sum, seg) => sum + (seg.duration || 0),
        0
      ),
      totalTransfers: 0,
      departureTime,
      arrivalTime: segments[0]?.arrivalTime || departureTime,
      warnings,
    };
  },

  async stops(_: unknown, { transportType }: { transportType?: string }) {
    const db = await DB();
    const query: Partial<StopModel> = {};
    if (transportType) {
      query.transportType = transportType as "BUS" | "RAIL";
    }
    const stops = await db.collection<StopModel>("Stops").find(query).toArray();
    return stops.map((s) => ({
      id: s._id?.toString() ?? "",
      ...s,
    }));
  },
};

export default pathResolvers;
