import { Db, ObjectId } from "mongodb";
import type {
  StopModel,
  RouteModel,
  LineModel,
  Coordinates,
  PathSegment,
  JourneyPath,
  FindPathInput,
  IncidentModel,
  IncidentLocationModel,
  PathWarning,
} from "../db/collections";
import { DB } from "../db/client.js";

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

/**
 * Get active incidents affecting the route
 */
async function getRouteIncidents(
  db: Db,
  segments: PathSegment[]
): Promise<string[] | undefined> {
  const warnings: string[] = [];

  // Get all unique line IDs from segments
  const lineIds = new Set<string>();
  segments.forEach((seg) => {
    if (seg.lineId) lineIds.add(seg.lineId);
  });

  if (lineIds.size === 0) return;

  const incidentLocations = await db
    .collection<IncidentLocationModel>("IncidentLocations")
    .find({
      active: true,
      lineId: {
        $in: Array.from(lineIds).map((id) => new ObjectId(id)),
      },
    })
    .toArray();

  // Map incidents to affected segments
  for (const location of incidentLocations) {
    const segmentIndex = segments.findIndex((seg) => {
      if (seg.lineId !== location.lineId.toString()) return false;

      // Check if segment overlaps with incident location
      const segFromId = seg.from.stopId;
      const segToId = seg.to.stopId;
      const locStartId = location.startStopId.toString();
      const locEndId = location.endStopId.toString();

      return (
        segFromId === locStartId ||
        segToId === locEndId ||
        segFromId === locEndId ||
        segToId === locStartId
      );
    });

    if (segmentIndex !== -1) {
      const segment = segments[segmentIndex];
      const incident = await db
        .collection<IncidentModel>("Incidents")
        .findOne({ _id: new ObjectId(location.incidentId) });

      if (incident && !incident.isFake) {
        // Mark segment as having incident
        segment.hasIncident = true;

        const severityIcon =
          location.severity === "HIGH"
            ? "🔴"
            : location.severity === "MEDIUM"
              ? "🟡"
              : "🟢";

        const description = `${severityIcon} ${incident.title}`;

        // Assign warning directly to segment
        segment.warning = {
          fromStop: segment.from.stopName,
          toStop: segment.to.stopName,
          lineName: segment.lineName,
          description,
          incidentKind: incident.kind,
          severity: location.severity,
        };
      }
    }
  }
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
        hasIncidents: false,
      };
    }

    if (startStop._id?.toString() === endStop._id?.toString()) {
      return {
        segments: [],
        totalDuration: 0,
        totalTransfers: 0,
        departureTime,
        arrivalTime: departureTime,
        hasIncidents: false,
      };
    }

    const allRoutes = await db
      .collection<RouteModel>("Routes")
      .find({})
      .toArray();

    const segments: PathSegment[] = [];

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
            hasIncident: false,
          });
        }

        break;
      }
    }

    // Check for active incidents on the route and assign warnings to segments
    await getRouteIncidents(db, segments);

    if (segments.length === 0) {
      return {
        segments: [],
        totalDuration: 0,
        totalTransfers: 0,
        departureTime,
        arrivalTime: departureTime,
        hasIncidents: false,
      };
    }

    return {
      segments,
      totalDuration: segments.reduce(
        (sum, seg) => sum + (seg.duration || 0),
        0
      ),
      totalTransfers: 0,
      departureTime,
      arrivalTime: segments[segments.length - 1]?.arrivalTime || departureTime,
      hasIncidents: segments.some((seg) => seg.hasIncident),
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
