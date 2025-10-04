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
  let minDistance = Infinity;

  for (const stop of stops) {
    const distance = calculateDistance(coordinates, stop.coordinates);

    if (distance < minDistance) {
      minDistance = distance;
      nearest = stop;
    }
  }

  if (nearest && minDistance <= maxDistance) {
    return nearest;
  }

  return null;
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
    const { from, to, departureTime = getCurrentTime() } = input;

    const startStop = await findNearestStop(db, from, 50000);
    const endStop = await findNearestStop(db, to, 50000);

    if (!startStop || !endStop) {
      return {
        segments: [],
        totalDuration: 0,
        totalTransfers: 0,
        departureTime,
        arrivalTime: departureTime,
        warnings: ["No stops found nearby"],
      };
    }

    if (startStop._id?.toString() === endStop._id?.toString()) {
      return {
        segments: [],
        totalDuration: 0,
        totalTransfers: 0,
        departureTime,
        arrivalTime: departureTime,
        warnings: ["Start and end points are at the same location"],
      };
    }

    const allRoutes = await db
      .collection<RouteModel>("Routes")
      .find({})
      .toArray();

    const segments: PathSegment[] = [];
    const warnings: string[] = [];

    for (const route of allRoutes) {
      let fromIndex = -1;
      let toIndex = -1;

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

      if (fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex) {
        const lineId =
          typeof route.lineId === "string"
            ? new ObjectId(route.lineId)
            : route.lineId;

        const line = await db
          .collection<LineModel>("Lines")
          .findOne({ _id: lineId });
        if (!line) continue;

        for (let i = fromIndex; i < toIndex; i++) {
          const currentStopId =
            typeof route.stops[i].stopId === "string"
              ? new ObjectId(route.stops[i].stopId)
              : route.stops[i].stopId;

          const nextStopId =
            typeof route.stops[i + 1].stopId === "string"
              ? new ObjectId(route.stops[i + 1].stopId)
              : route.stops[i + 1].stopId;

          const currentStop = await db
            .collection<StopModel>("Stops")
            .findOne({ _id: currentStopId });

          const nextStop = await db
            .collection<StopModel>("Stops")
            .findOne({ _id: nextStopId });

          if (!currentStop || !nextStop) continue;

          const segmentDistance = calculateDistance(
            currentStop.coordinates,
            nextStop.coordinates
          );

          segments.push({
            segmentType: "TRANSIT",
            from: {
              stopId: currentStop._id!.toString(),
              stopName: currentStop.name,
              coordinates: currentStop.coordinates,
            },
            to: {
              stopId: nextStop._id!.toString(),
              stopName: nextStop.name,
              coordinates: nextStop.coordinates,
            },
            lineId: line._id!.toString(),
            lineName: line.gtfsId || line.name,
            transportType: line.transportType,
            departureTime: route.stops[i].departureTime || "N/A",
            arrivalTime: route.stops[i + 1].arrivalTime || "N/A",
            duration: Math.round(segmentDistance / 500),
            distance: Math.round(segmentDistance),
            warnings: [],
          });
        }

        break;
      }
    }

    if (segments.length === 0) {
      warnings.push(`No route found from ${startStop.name} to ${endStop.name}`);
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
