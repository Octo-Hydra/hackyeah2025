/**
 * A* Pathfinding Algorithm with Real-time Incident Integration
 *
 * Features:
 * - Optimal path finding using A* algorithm
 * - Real-time incident delay calculations
 * - Multiple route alternatives (top 3)
 * - Caching for popular routes
 * - Support for transport type preferences
 */

import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import type { Db } from "mongodb";

interface Stop {
  _id?: ObjectId | string; // MongoDB _id
  stopId?: string; // Optional, will be set from _id if missing
  stopName?: string; // Might be in 'name' field instead
  name?: string; // Alternative field name
  coordinates: {
    latitude: number;
    longitude: number;
  };
  transportType?: string;
}

interface Route {
  _id: ObjectId;
  lineId: string;
  lineName: string;
  transportType: string;
  stops: Array<{
    stopId: string;
    stopName: string;
    sequence: number;
  }>;
}

interface Incident {
  _id: ObjectId;
  kind: string;
  status: string;
  lineIds: string[];
  affectedStops?: string[];
  resolvedAt?: Date;
}

interface PathNode {
  stopId: string;
  gScore: number; // Actual cost from start
  fScore: number; // gScore + heuristic
  parent: PathNode | null;
  routeId: string | null;
  lineId: string | null;
  lineName: string | null;
  transportType: string | null;
}

export interface PathSegment {
  from: Stop;
  to: Stop;
  lineId: string;
  lineName: string;
  transportType: string;
  departureTime: string;
  arrivalTime: string;
  duration: number;
  hasIncident: boolean;
  incidentDelay?: number;
  incidentSeverity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface Journey {
  segments: PathSegment[];
  totalDuration: number;
  totalDistance: number;
  transferCount: number;
  hasIncidents: boolean;
  alternativeAvailable: boolean;
}

// Haversine distance calculation (returns km)
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Heuristic: estimated time to goal (in minutes)
function heuristic(
  from: Stop,
  to: Stop,
  transportType: string = "BUS",
): number {
  const distance = haversineDistance(
    from.coordinates.latitude,
    from.coordinates.longitude,
    to.coordinates.latitude,
    to.coordinates.longitude,
  );

  // Average speeds for different transport types (km/h)
  const avgSpeeds: Record<string, number> = {
    TRAM: 25,
    BUS: 20,
    TRAIN: 60,
    METRO: 40,
    RAIL: 60,
  };

  const speed = avgSpeeds[transportType] || 20;
  return (distance / speed) * 60; // Convert to minutes
}

// Fetch active incidents from database
async function getActiveIncidents(db: Db): Promise<Map<string, Incident[]>> {
  const incidents = await db
    .collection<Incident>("Incidents")
    .find({
      status: { $in: ["PENDING", "OFFICIAL"] },
      resolvedAt: { $exists: false },
    })
    .toArray();

  // Group by lineId for fast lookup
  const incidentMap = new Map<string, Incident[]>();
  for (const incident of incidents) {
    for (const lineId of incident.lineIds || []) {
      if (!incidentMap.has(lineId)) {
        incidentMap.set(lineId, []);
      }
      incidentMap.get(lineId)!.push(incident);
    }
  }

  return incidentMap;
}

// Calculate incident delay and severity
function calculateIncidentDelay(
  incident: Incident,
  segment: { fromStopId: string; toStopId: string },
): { delay: number; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" } {
  const baseDelays: Record<string, number> = {
    DELAY: 5,
    CROWDED: 3,
    BLOCKED: 30,
    CANCELLED: 999, // Effectively blocks this route
    ACCIDENT: 15,
    TRAFFIC_JAM: 10,
    OTHER: 2,
  };

  let delay = baseDelays[incident.kind] || 0;

  // Double delay if incident affects this exact segment
  if (
    incident.affectedStops?.includes(segment.fromStopId) ||
    incident.affectedStops?.includes(segment.toStopId)
  ) {
    delay *= 2;
  }

  // Determine severity based on delay
  let severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  if (delay >= 30) severity = "CRITICAL";
  else if (delay >= 15) severity = "HIGH";
  else if (delay >= 5) severity = "MEDIUM";
  else severity = "LOW";

  return { delay, severity };
}

// Main A* algorithm with incident awareness
export async function findOptimalPath(
  fromStopId: string,
  toStopId: string,
  departureTime?: Date,
  options: {
    maxTransfers?: number;
    preferredTransportTypes?: string[];
    avoidIncidents?: boolean;
  } = {},
): Promise<Journey[]> {
  const client = await clientPromise;
  const db = client.db();

  const {
    maxTransfers = 3,
    preferredTransportTypes = [],
    avoidIncidents = true,
  } = options;

  console.log("🚀 Starting A* pathfinding:", { fromStopId, toStopId });

  // Convert string IDs to ObjectId for MongoDB queries
  let fromObjectId: ObjectId;
  let toObjectId: ObjectId;

  try {
    fromObjectId = new ObjectId(fromStopId);
    toObjectId = new ObjectId(toStopId);
    console.log("✅ ObjectIds created:", {
      fromObjectId: fromObjectId.toString(),
      toObjectId: toObjectId.toString(),
    });
  } catch (err) {
    console.error("❌ Invalid ObjectId format:", { fromStopId, toStopId, err });
    throw new Error("Invalid stop ID format");
  }

  // Test query first
  console.log("🔍 Testing direct query...");
  const testStop = await db.collection("Stops").findOne({ _id: fromObjectId });
  console.log("🧪 Test result:", testStop ? "FOUND" : "NOT FOUND", {
    testStopName: testStop?.name,
    testStopId: testStop?._id?.toString(),
  });

  // Fetch all required data
  // Use ObjectId for stop lookups (cast as any to bypass TypeScript issues)
  const [fromStop, toStop, allStops, allRoutes, allLines, incidentMap] =
    await Promise.all([
      db.collection("Stops").findOne({ _id: fromObjectId as never }),
      db.collection("Stops").findOne({ _id: toObjectId as never }),
      db.collection("Stops").find({}).toArray(),
      db.collection("Routes").find({}).toArray(),
      db.collection("Lines").find({}).toArray(),
      avoidIncidents ? getActiveIncidents(db) : Promise.resolve(new Map()),
    ]);

  // Create Lines lookup map for enriching routes

  const linesMap = new Map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allLines.map((line: any) => [
      line._id?.toString() || line.lineId?.toString(),
      line,
    ]),
  );

  console.log("📊 Data fetched:", {
    fromStopFound: !!fromStop,
    toStopFound: !!toStop,
    totalStops: allStops.length,
    totalRoutes: allRoutes.length,
    totalLines: allLines.length,
    incidentsCount: incidentMap.size,
  });

  if (!fromStop || !toStop) {
    console.error("❌ Stops not found:", {
      fromStopId,
      toStopId,
      fromStopFound: !!fromStop,
      toStopFound: !!toStop,
      sampleStopIds: allStops
        .slice(0, 5)
        .map((s) => (s._id as { toString(): string }).toString()),
    });
    throw new Error("Start or destination stop not found");
  }

  // Normalize stops: add stopId field from _id if missing (always convert to string)
  const normalizeStop = (stop: Stop): Stop => {
    // Always ensure stopId is a string (convert ObjectId if needed)
    const stopId = stop.stopId
      ? typeof stop.stopId === "string"
        ? stop.stopId
        : (stop.stopId as { toString(): string }).toString()
      : (stop._id as { toString(): string }).toString();

    return {
      ...stop,
      stopId,
      stopName: stop.stopName || (stop as never)["name"] || "Unknown",
    };
  };

  // Use normalized stops (cast to Stop type)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizedFromStop = normalizeStop(fromStop as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizedToStop = normalizeStop(toStop as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizedStops = allStops.map((s) => normalizeStop(s as any));

  // Normalize routes: ensure stops have proper IDs (convert ObjectId to string)
  // Also enrich routes with Line data (transportType, lineName)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizedRoutes = allRoutes.map((route: any) => {
    const lineId = route.lineId?.toString();
    const line = lineId ? linesMap.get(lineId) : null;

    return {
      ...route,
      // Add line data if available
      transportType: line?.transportType || route.transportType || "BUS",
      lineName: line?.lineName || line?.name || route.lineName || "Unknown",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stops: route.stops.map((s: any) => ({
        ...s,
        // Convert ObjectId to string for comparison
        stopId: s.stopId?.toString() || s._id?.toString() || s.stopId,
      })),
    };
  });

  // A* algorithm setup
  const openSet: PathNode[] = [];
  const closedSet = new Set<string>();
  const gScores = new Map<string, number>();

  const startNode: PathNode = {
    stopId: normalizedFromStop.stopId!,
    gScore: 0,
    fScore: heuristic(normalizedFromStop, normalizedToStop),
    parent: null,
    routeId: null,
    lineId: null,
    lineName: null,
    transportType: null,
  };

  openSet.push(startNode);
  gScores.set(normalizedFromStop.stopId!, 0);

  // Build adjacency graph
  const graph = new Map<
    string,
    Array<{
      stopId: string;
      routeId: string;
      lineId: string;
      lineName: string;
      transportType: string;
      duration: number;
    }>
  >();

  for (const route of normalizedRoutes) {
    for (let i = 0; i < route.stops.length - 1; i++) {
      const currentStop = route.stops[i];
      const nextStop = route.stops[i + 1];

      if (!graph.has(currentStop.stopId)) {
        graph.set(currentStop.stopId, []);
      }

      // Calculate base travel time
      const stopA = normalizedStops.find(
        (s) => s.stopId === currentStop.stopId,
      );
      const stopB = normalizedStops.find((s) => s.stopId === nextStop.stopId);
      let duration = 5; // Default 5 minutes

      if (stopA && stopB) {
        const distance = haversineDistance(
          stopA.coordinates.latitude,
          stopA.coordinates.longitude,
          stopB.coordinates.latitude,
          stopB.coordinates.longitude,
        );
        const avgSpeed = route.transportType === "RAIL" ? 60 : 25;
        duration = Math.round(Math.max(2, (distance / avgSpeed) * 60));
      }

      // Add incident delays
      if (avoidIncidents) {
        const lineIncidents = incidentMap.get(route.lineId) || [];
        for (const incident of lineIncidents) {
          const { delay } = calculateIncidentDelay(incident, {
            fromStopId: currentStop.stopId,
            toStopId: nextStop.stopId,
          });
          duration += delay;
        }
      }

      graph.get(currentStop.stopId)!.push({
        stopId: nextStop.stopId,
        routeId: route._id.toString(),
        lineId: route.lineId,
        lineName: route.lineName,
        transportType: route.transportType,
        duration,
      });
    }
  }

  console.log("🗺️  Graph built:", {
    totalNodes: graph.size,
    totalEdges: Array.from(graph.values()).reduce(
      (sum, edges) => sum + edges.length,
      0,
    ),
    startNodeConnections: graph.get(normalizedFromStop.stopId!)?.length || 0,
    endNodeConnections: graph.get(normalizedToStop.stopId!)?.length || 0,
  });

  // A* main loop - find multiple paths
  const foundPaths: PathNode[] = [];
  const maxPaths = 3; // Return top 3 routes

  while (openSet.length > 0 && foundPaths.length < maxPaths) {
    // Select node with lowest fScore
    openSet.sort((a, b) => a.fScore - b.fScore);
    const current = openSet.shift()!;

    // Goal reached
    if (current.stopId === normalizedToStop.stopId) {
      foundPaths.push(current);
      // Continue searching for alternative routes
      continue;
    }

    closedSet.add(current.stopId);

    // Explore neighbors
    const neighbors = graph.get(current.stopId) || [];
    for (const neighbor of neighbors) {
      if (closedSet.has(neighbor.stopId)) continue;

      // Check transfer limit
      let transferCount = 0;
      let temp: PathNode | null = current;
      while (temp?.parent) {
        if (temp.lineId !== temp.parent.lineId) transferCount++;
        temp = temp.parent;
      }
      if (transferCount >= maxTransfers) continue;

      // Penalty for non-preferred transport types
      let durationPenalty = 0;
      if (
        preferredTransportTypes.length > 0 &&
        !preferredTransportTypes.includes(neighbor.transportType)
      ) {
        durationPenalty = 5; // Add 5 min penalty
      }

      const tentativeGScore =
        current.gScore + neighbor.duration + durationPenalty;

      if (
        !gScores.has(neighbor.stopId) ||
        tentativeGScore < gScores.get(neighbor.stopId)!
      ) {
        const neighborStop = normalizedStops.find(
          (s) => s.stopId === neighbor.stopId,
        );
        if (!neighborStop) continue;

        const neighborNode: PathNode = {
          stopId: neighbor.stopId,
          gScore: tentativeGScore,
          fScore:
            tentativeGScore +
            heuristic(neighborStop, normalizedToStop, neighbor.transportType),
          parent: current,
          routeId: neighbor.routeId,
          lineId: neighbor.lineId,
          lineName: neighbor.lineName,
          transportType: neighbor.transportType,
        };

        gScores.set(neighbor.stopId, tentativeGScore);

        const existingIdx = openSet.findIndex(
          (n) => n.stopId === neighbor.stopId,
        );
        if (existingIdx >= 0) {
          openSet[existingIdx] = neighborNode;
        } else {
          openSet.push(neighborNode);
        }
      }
    }
  }

  // Reconstruct paths into Journey objects
  const journeys: Journey[] = [];

  for (const pathEnd of foundPaths) {
    const segments: PathSegment[] = [];
    let totalDuration = 0;
    let totalDistance = 0;

    // Reconstruct path from end to start
    const path: PathNode[] = [];
    let current: PathNode | null = pathEnd;
    while (current) {
      path.unshift(current);
      current = current.parent;
    }

    // Build segments
    for (let i = 0; i < path.length - 1; i++) {
      const fromNode = path[i];
      const toNode = path[i + 1];

      const fromStopData = normalizedStops.find(
        (s) => s.stopId === fromNode.stopId,
      );
      const toStopData = normalizedStops.find(
        (s) => s.stopId === toNode.stopId,
      );
      if (!fromStopData || !toStopData) continue;

      const duration = toNode.gScore - fromNode.gScore;

      // Check for incidents on this segment
      const lineIncidents = incidentMap.get(toNode.lineId!) || [];
      let hasIncident = false;
      let incidentDelay = 0;
      let incidentSeverity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;

      for (const incident of lineIncidents) {
        const { delay, severity } = calculateIncidentDelay(incident, {
          fromStopId: fromNode.stopId,
          toStopId: toNode.stopId,
        });
        if (delay > 0) {
          hasIncident = true;
          incidentDelay += delay;
          incidentSeverity = severity;
        }
      }

      const distance = haversineDistance(
        fromStopData.coordinates.latitude,
        fromStopData.coordinates.longitude,
        toStopData.coordinates.latitude,
        toStopData.coordinates.longitude,
      );

      const now = departureTime || new Date();
      const departure = new Date(now.getTime() + totalDuration * 60000);
      const arrival = new Date(departure.getTime() + duration * 60000);

      segments.push({
        from: fromStopData,
        to: toStopData,
        lineId: toNode.lineId!,
        lineName: toNode.lineName!,
        transportType: toNode.transportType!,
        departureTime: departure.toISOString(),
        arrivalTime: arrival.toISOString(),
        duration,
        hasIncident,
        incidentDelay: hasIncident ? incidentDelay : undefined,
        incidentSeverity,
      });

      totalDuration += duration;
      totalDistance += distance;
    }

    const transferCount = segments.reduce((count, seg, idx) => {
      if (idx === 0) return 0;
      return seg.lineId !== segments[idx - 1].lineId ? count + 1 : count;
    }, 0);

    const hasIncidents = segments.some((s) => s.hasIncident);

    journeys.push({
      segments,
      totalDuration: Math.round(totalDuration),
      totalDistance,
      transferCount,
      hasIncidents,
      alternativeAvailable: foundPaths.length > 1,
    });
  }

  // Sort: shortest time first, then fewest transfers
  journeys.sort((a, b) => {
    if (a.totalDuration !== b.totalDuration) {
      return a.totalDuration - b.totalDuration;
    }
    return a.transferCount - b.transferCount;
  });

  return journeys;
}

// Cached version for popular routes
export async function findOptimalPathCached(
  fromStopId: string,
  toStopId: string,
  departureTime?: Date,
  options?: {
    maxTransfers?: number;
    preferredTransportTypes?: string[];
    avoidIncidents?: boolean;
  },
): Promise<Journey[]> {
  const client = await clientPromise;
  const db = client.db();

  const cacheKey = `path:${fromStopId}:${toStopId}:${options?.maxTransfers || 3}:${options?.avoidIncidents ? "safe" : "fast"}`;

  console.log("💾 Checking cache for key:", cacheKey);

  // Check cache (5 minute TTL)
  const cached = await db
    .collection<{ journeys: Journey[]; timestamp: number }>("PathCache")
    .findOne({ _id: cacheKey as never });
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    console.log("✅ Cache hit!");
    return cached.journeys;
  }

  console.log("❌ Cache miss, calculating new paths...");

  // Calculate new paths
  const journeys = await findOptimalPath(
    fromStopId,
    toStopId,
    departureTime,
    options,
  );

  console.log(`📊 Calculated ${journeys.length} journey paths`);

  // Save to cache
  await db
    .collection("PathCache")
    .updateOne(
      { _id: cacheKey as never },
      { $set: { journeys, timestamp: Date.now() } },
      { upsert: true },
    );

  return journeys;
}
