import { Db, ObjectId, WithId, Document } from "mongodb";
import type {
  StopModel,
  RouteModel,
  IncidentModel,
  Coordinates,
  PathSegment,
  JourneyPath,
  GraphQLContext,
  FindPathInput,
  ConnectingRoute,
  LineModel,
  ScheduleStopModel,
} from "../db/collections";
import { DB } from "../db/client.js";

// Calculate distance between two coordinates (Haversine formula) in meters
function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371000; // Earth radius in meters
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

// Find nearest stop to given coordinates
async function findNearestStop(
  db: Db,
  coordinates: Coordinates,
  maxDistance: number = 500
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

// Calculate time in minutes between two HH:mm time strings
function calculateTimeDifference(time1: string, time2: string): number {
  const [h1, m1] = time1.split(":").map(Number);
  const [h2, m2] = time2.split(":").map(Number);
  return h2 * 60 + m2 - (h1 * 60 + m1);
}

// Add minutes to HH:mm time string
function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  return `${String(newHours).padStart(2, "0")}:${String(newMinutes).padStart(2, "0")}`;
}

// Get current time as HH:mm
function getCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

// Find routes connecting two stops
async function findConnectingRoutes(
  db: Db,
  fromStopId: string,
  toStopId: string,
  departureTime: string
): Promise<ConnectingRoute[]> {
  const routes = await db.collection<RouteModel>("Routes").find({}).toArray();
  const connectingRoutes: ConnectingRoute[] = [];

  for (const route of routes) {
    let fromIndex = -1;
    let toIndex = -1;

    for (let i = 0; i < route.stops.length; i++) {
      const stopId = route.stops[i].stopId;
      const stopIdStr = typeof stopId === "string" ? stopId : stopId.toString();

      if (stopIdStr === fromStopId) {
        fromIndex = i;
      }
      if (stopIdStr === toStopId && fromIndex !== -1) {
        toIndex = i;
        break;
      }
    }

    if (fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex) {
      const departureStop = route.stops[fromIndex];
      const arrivalStop = route.stops[toIndex];

      // Check if departure time is after requested time
      if (departureStop.departureTime >= departureTime) {
        connectingRoutes.push({
          route,
          fromIndex,
          toIndex,
          departureStop,
          arrivalStop,
        });
      }
    }
  }

  return connectingRoutes.sort((a, b) =>
    a.departureStop.departureTime.localeCompare(b.departureStop.departureTime)
  );
}

async function getIncidentWarnings(db: Db, lineId: string): Promise<string[]> {
  const incidents = await db
    .collection<IncidentModel>("Incidents")
    .find({
      lineIds: new ObjectId(lineId),
      status: { $in: ["PUBLISHED"] },
    })
    .toArray();

  return incidents.map((inc) => `${inc.kind}: ${inc.title}`);
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
      maxWalkingDistance = 50000, // 50km - znajdź dowolny przystanek
    } = input;

    // Find nearest stops
    const startStop = await findNearestStop(
      db,
      startCoordinates,
      maxWalkingDistance
    );
    const endStop = await findNearestStop(
      db,
      endCoordinates,
      maxWalkingDistance
    );

    if (!startStop || !endStop) {
      return {
        segments: [],
        totalDuration: 0,
        totalTransfers: 0,
        departureTime,
        arrivalTime: departureTime,
        warnings: ["No stops found - database might be empty"],
      };
    }

    const segments: PathSegment[] = [];
    const warnings: string[] = [];

    // Get all routes from database
    const allRoutes = await db
      .collection<RouteModel>("Routes")
      .find({})
      .toArray();

    console.log(
      `🔍 Searching for path from ${startStop.name} to ${endStop.name}`
    );
    console.log(`📊 Total routes in DB: ${allRoutes.length}`);

    // Find routes that contain BOTH stops
    const validRoutes: Array<{
      route: RouteModel;
      line: LineModel;
      fromIndex: number;
      toIndex: number;
      stopsOnPath: Array<{
        name: string;
        arrivalTime: string;
        departureTime: string;
        coordinates: Coordinates;
      }>;
    }> = [];

    for (const route of allRoutes) {
      let fromIndex = -1;
      let toIndex = -1;

      // Find indexes of start and end stops
      for (let i = 0; i < route.stops.length; i++) {
        const stopId = route.stops[i].stopId;
        const stopIdStr =
          typeof stopId === "string" ? stopId : stopId.toString();

        if (stopIdStr === startStop._id!.toString()) {
          fromIndex = i;
        }
        if (stopIdStr === endStop._id!.toString() && fromIndex !== -1) {
          toIndex = i;
          break;
        }
      }

      // If both stops found and in correct order
      if (fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex) {
        const lineId =
          typeof route.lineId === "string"
            ? new ObjectId(route.lineId)
            : route.lineId;

        const line = await db
          .collection<LineModel>("Lines")
          .findOne({ _id: lineId });

        if (!line) continue;

        // Get all stops on this path segment
        const stopsOnPath = [];
        for (let i = fromIndex; i <= toIndex; i++) {
          const stopId =
            typeof route.stops[i].stopId === "string"
              ? new ObjectId(route.stops[i].stopId)
              : route.stops[i].stopId;

          const stop = await db
            .collection<StopModel>("Stops")
            .findOne({ _id: stopId });

          if (stop) {
            stopsOnPath.push({
              name: stop.name,
              arrivalTime: route.stops[i].arrivalTime,
              departureTime: route.stops[i].departureTime,
              coordinates: stop.coordinates,
            });
          }
        }

        validRoutes.push({
          route,
          line,
          fromIndex,
          toIndex,
          stopsOnPath,
        });

        console.log(
          `✅ Found route: ${line.name} with ${stopsOnPath.length} stops`
        );
      }
    }

    console.log(`📍 Found ${validRoutes.length} valid routes`);

    if (validRoutes.length > 0) {
      // Use the first valid route
      const selectedRoute = validRoutes[0];

      // Calculate total distance
      let totalDistance = 0;
      for (let i = 0; i < selectedRoute.stopsOnPath.length - 1; i++) {
        totalDistance += calculateDistance(
          selectedRoute.stopsOnPath[i].coordinates,
          selectedRoute.stopsOnPath[i + 1].coordinates
        );
      }

      const departureStop = selectedRoute.route.stops[selectedRoute.fromIndex];
      const arrivalStop = selectedRoute.route.stops[selectedRoute.toIndex];

      const duration = calculateTimeDifference(
        departureStop.departureTime,
        arrivalStop.arrivalTime
      );

      // Create segment with all stops info
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
        lineId: selectedRoute.line._id!.toString(),
        lineName: selectedRoute.line.name,
        transportType: selectedRoute.line.transportType,
        departureTime: departureStop.departureTime,
        arrivalTime: arrivalStop.arrivalTime,
        duration,
        distance: Math.round(totalDistance),
        platformNumber: departureStop.platformNumber,
        warnings: [
          `Route passes through ${selectedRoute.stopsOnPath.length} stops:`,
          ...selectedRoute.stopsOnPath.map(
            (s, idx) =>
              `  ${idx + 1}. ${s.name} (arr: ${s.arrivalTime}, dep: ${s.departureTime})`
          ),
        ],
      });

      // Add info about alternative routes
      if (validRoutes.length > 1) {
        warnings.push(
          `Found ${validRoutes.length} alternative routes. Showing the first one.`
        );
        warnings.push(
          `Other lines available: ${validRoutes
            .slice(1)
            .map((r) => r.line.name)
            .join(", ")}`
        );
      }
    } else {
      warnings.push(
        `❌ No direct route found between ${startStop.name} and ${endStop.name}`
      );
      warnings.push(
        `Distance: ${Math.round(calculateDistance(startStop.coordinates, endStop.coordinates))}m`
      );
      warnings.push(`Nearest stop to start: ${startStop.name}`);
      warnings.push(`Nearest stop to end: ${endStop.name}`);
      warnings.push(
        `💡 Try checking if routes are imported with stop_times data`
      );
    }

    const totalDuration =
      segments.length > 0
        ? segments.reduce((sum, seg) => sum + (seg.duration || 0), 0)
        : 0;

    return {
      segments,
      totalDuration,
      totalTransfers: 0,
      departureTime,
      arrivalTime:
        segments.length > 0
          ? segments[segments.length - 1].arrivalTime || departureTime
          : departureTime,
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
