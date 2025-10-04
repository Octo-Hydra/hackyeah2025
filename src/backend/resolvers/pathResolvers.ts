import { Db, ObjectId } from "mongodb";
import type {
  StopModel,
  RouteModel,
  LineModel,
  Coordinates,
  PathSegment,
  JourneyPath,
  IncidentLocationModel,
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

// Check for active incidents on a specific segment
async function getActiveIncidentsForSegment(
  db: Db,
  lineId: ObjectId,
  stopId1: ObjectId,
  stopId2: ObjectId
): Promise<IncidentLocationModel | null> {
  // Check both directions: stop1->stop2 and stop2->stop1
  const incident = await db
    .collection<IncidentLocationModel>("IncidentLocations")
    .findOne({
      active: true,
      lineId,
      $or: [
        { startStopId: stopId1, endStopId: stopId2 },
        { startStopId: stopId2, endStopId: stopId1 },
      ],
    });

  return incident;
}

// Find nearest stop
async function findNearestStop(
  db: Db,
  coordinates: Coordinates,
  maxDistance: number = 50000
): Promise<StopModel | null> {
  const stops = await db.collection<StopModel>("Stops").find({}).toArray();

  console.log(
    `  📍 Searching for nearest stop to (${coordinates.latitude}, ${coordinates.longitude})`
  );
  console.log(`  📊 Total stops in database: ${stops.length}`);

  let nearest: StopModel | null = null;
  let minDistance = Infinity;
  const candidates: Array<{ stop: StopModel; distance: number }> = [];

  console.log(
    `🔍 Finding nearest stop to (${coordinates.latitude}, ${coordinates.longitude})`
  );
  console.log(
    `   Max distance: ${maxDistance}m (${(maxDistance / 1000).toFixed(1)}km)`
  );
  console.log(`   Total stops in database: ${stops.length}`);

  for (const stop of stops) {
    const distance = calculateDistance(coordinates, stop.coordinates);

    // Keep track of top 5 closest stops for debugging
    if (
      candidates.length < 5 ||
      distance < candidates[candidates.length - 1].distance
    ) {
      candidates.push({ stop, distance });
      candidates.sort((a, b) => a.distance - b.distance);
      if (candidates.length > 5) candidates.pop();
    }

    if (distance < minDistance) {
      minDistance = distance;
      nearest = stop;
      console.log(
        `    ✓ Found closer stop: ${stop.name} (${(distance / 1000).toFixed(2)}km)`
      );
    }
  }

  // Log top 5 candidates
  console.log(`   📍 Top 5 nearest stops:`);
  candidates.forEach((c, i) => {
    console.log(
      `      ${i + 1}. "${c.stop.name}" - ${(c.distance / 1000).toFixed(2)}km`
    );
  });

  // Check if nearest stop is within maxDistance
  if (nearest && minDistance > maxDistance) {
    console.log(
      `   ❌ Nearest stop "${nearest.name}" is ${(minDistance / 1000).toFixed(2)}km away (exceeds max ${(maxDistance / 1000).toFixed(1)}km)`
    );
    return null;
  }

  if (nearest) {
    console.log(
      `   ✅ SELECTED: "${nearest.name}" at ${(minDistance / 1000).toFixed(2)}km`
    );
    console.log(
      `      Coordinates: (${nearest.coordinates.latitude}, ${nearest.coordinates.longitude})`
    );
  } else {
    console.log(`   ❌ No stops found in database`);
  }

  return nearest;
}

function getCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export const pathResolvers = {
  async findPath(_: unknown, { input }: { input: FindPathInput }) {
    const db = await DB();
    const { from, to } = input;
    const departureTime = input.departureTime || getCurrentTime();

    console.log(`\n🎯 FINDPATH CALLED`);
    console.log(
      `FROM coordinates: lat=${from.latitude}, lon=${from.longitude}`
    );
    console.log(`TO coordinates: lat=${to.latitude}, lon=${to.longitude}`);

    // Find nearest stops (50km radius)
    console.log(`\n🔍 Finding nearest START stop...`);
    const startStop = await findNearestStop(db, from, 50000);
    console.log(
      `✅ START stop found: ${startStop?.name || "NONE"} (ID: ${startStop?._id})`
    );

    console.log(`\n🔍 Finding nearest END stop...`);
    const endStop = await findNearestStop(db, to, 50000);
    console.log(
      `✅ END stop found: ${endStop?.name || "NONE"} (ID: ${endStop?._id})`
    );

    if (!startStop || !endStop) {
      return {
        segments: [],
        totalDuration: 0,
        totalTransfers: 0,
        departureTime,
        arrivalTime: departureTime,
        warnings: ["❌ No stops found in database"],
        hasIncidents: false,
        affectedSegments: [],
      };
    }

    // Check if start and end are the same stop
    if (startStop._id!.toString() === endStop._id!.toString()) {
      return {
        segments: [],
        totalDuration: 0,
        totalTransfers: 0,
        departureTime,
        arrivalTime: departureTime,
        warnings: [
          "⚠️ Start and end points are at the same stop. Please select different locations.",
        ],
        hasIncidents: false,
        affectedSegments: [],
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

        // Get all stops on path and check for incidents
        const stopsOnPath: string[] = [];
        let totalDistance = 0;
        let hasSegmentIncidents = false;
        const incidentWarnings: string[] = [];

        for (let i = fromIndex; i <= toIndex; i++) {
          const stopIdValue = route.stops[i].stopId;
          const stopId: ObjectId =
            typeof stopIdValue === "string"
              ? new ObjectId(stopIdValue)
              : stopIdValue;

          const stop = await db
            .collection<StopModel>("Stops")
            .findOne({ _id: stopId });
          if (stop) {
            stopsOnPath.push(stop.name);

            // Calculate distance to next stop and check for incidents
            if (i < toIndex) {
              const nextStopIdValue = route.stops[i + 1].stopId;
              const nextStopId: ObjectId =
                typeof nextStopIdValue === "string"
                  ? new ObjectId(nextStopIdValue)
                  : nextStopIdValue;
              const nextStop = await db
                .collection<StopModel>("Stops")
                .findOne({ _id: nextStopId });
              if (nextStop) {
                totalDistance += calculateDistance(
                  stop.coordinates,
                  nextStop.coordinates
                );

                // Check for incidents on this segment
                const incident = await getActiveIncidentsForSegment(
                  db,
                  lineId,
                  stopId,
                  nextStopId
                );

                if (incident) {
                  hasSegmentIncidents = true;
                  const severityEmoji =
                    incident.severity === "HIGH"
                      ? "🚨"
                      : incident.severity === "MEDIUM"
                        ? "⚠️"
                        : "ℹ️";
                  incidentWarnings.push(
                    `${severityEmoji} Incident between ${stop.name} and ${nextStop.name}`
                  );
                }
              }
            }
          }
        }

        // Create segment with incident information
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
            ...(hasSegmentIncidents
              ? ["", "⚠️ INCIDENTS ON THIS ROUTE:", ...incidentWarnings]
              : []),
          ],
          hasIncident: hasSegmentIncidents,
          incidentWarning: hasSegmentIncidents
            ? incidentWarnings.join(" | ")
            : undefined,
          incidentSeverity: hasSegmentIncidents ? "HIGH" : undefined,
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

    // Calculate which segments have incidents
    const affectedSegments: number[] = [];
    let hasIncidents = false;
    segments.forEach((seg, idx) => {
      if (seg.hasIncident) {
        hasIncidents = true;
        affectedSegments.push(idx);
      }
    });

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
      hasIncidents,
      affectedSegments,
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
