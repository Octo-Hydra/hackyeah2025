/**
 * Geolocation utilities for finding nearest stops and detecting incident segments
 */

import type { Coordinates, StopModel } from "../backend/db/collections.js";

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point1.latitude * Math.PI) / 180;
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Find the nearest stop to a given location
 */
export function findNearestStop(
  location: Coordinates,
  stops: StopModel[]
): { stop: StopModel; distance: number } | null {
  if (stops.length === 0) return null;

  let nearest: { stop: StopModel; distance: number } | null = null;

  for (const stop of stops) {
    const distance = calculateDistance(location, stop.coordinates);

    if (!nearest || distance < nearest.distance) {
      nearest = { stop, distance };
    }
  }

  return nearest;
}

/**
 * Find the two nearest stops to a location
 * Returns them ordered by distance
 */
export function findTwoNearestStops(
  location: Coordinates,
  stops: StopModel[],
  maxDistance: number = 500 // meters
): Array<{ stop: StopModel; distance: number }> {
  const stopsWithDistance = stops
    .map((stop) => ({
      stop,
      distance: calculateDistance(location, stop.coordinates),
    }))
    .filter((item) => item.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 2); // Take only the 2 nearest

  return stopsWithDistance;
}

/**
 * Check if a location is between two stops (on the segment)
 * Returns true if the location is approximately on the line between the two stops
 */
export function isLocationBetweenStops(
  location: Coordinates,
  stop1: Coordinates,
  stop2: Coordinates,
  toleranceMeters: number = 100
): boolean {
  // Calculate distance from location to the line segment
  const distanceToSegment = distanceToLineSegment(location, stop1, stop2);
  return distanceToSegment <= toleranceMeters;
}

/**
 * Calculate perpendicular distance from a point to a line segment
 */
function distanceToLineSegment(
  point: Coordinates,
  lineStart: Coordinates,
  lineEnd: Coordinates
): number {
  const x = point.latitude;
  const y = point.longitude;
  const x1 = lineStart.latitude;
  const y1 = lineStart.longitude;
  const x2 = lineEnd.latitude;
  const y2 = lineEnd.longitude;

  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = x - xx;
  const dy = y - yy;

  // Convert back to meters approximately
  const distanceInDegrees = Math.sqrt(dx * dx + dy * dy);
  const metersPerDegree = 111320; // at equator, approximate
  return distanceInDegrees * metersPerDegree;
}

/**
 * Determine incident segment based on user's location
 * Finds which two stops the user is between
 */
export interface IncidentSegment {
  startStopId: string;
  endStopId: string;
  startStopName: string;
  endStopName: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  distanceFromStart: number; // meters
  distanceFromEnd: number; // meters
}

export function determineIncidentSegment(
  reporterLocation: Coordinates,
  stops: StopModel[],
  maxDistance: number = 1000 // 1km max
): IncidentSegment | null {
  const nearestStops = findTwoNearestStops(
    reporterLocation,
    stops,
    maxDistance
  );

  if (nearestStops.length < 2) {
    // Not enough stops nearby
    return null;
  }

  const [first, second] = nearestStops;

  // Determine confidence based on distances
  let confidence: "HIGH" | "MEDIUM" | "LOW";
  const avgDistance = (first.distance + second.distance) / 2;

  if (avgDistance < 200) {
    confidence = "HIGH";
  } else if (avgDistance < 500) {
    confidence = "MEDIUM";
  } else {
    confidence = "LOW";
  }

  // Check if location is actually between the two stops
  const isBetween = isLocationBetweenStops(
    reporterLocation,
    first.stop.coordinates,
    second.stop.coordinates,
    200
  );

  if (!isBetween) {
    // Location is not on the line, reduce confidence
    if (confidence === "HIGH") confidence = "MEDIUM";
    else if (confidence === "MEDIUM") confidence = "LOW";
  }

  return {
    startStopId: first.stop._id?.toString() || "",
    endStopId: second.stop._id?.toString() || "",
    startStopName: first.stop.name,
    endStopName: second.stop.name,
    confidence,
    distanceFromStart: first.distance,
    distanceFromEnd: second.distance,
  };
}

/**
 * Format incident segment for display
 */
export function formatIncidentSegment(segment: IncidentSegment): string {
  return `Between ${segment.startStopName} and ${segment.endStopName} (${segment.confidence.toLowerCase()} confidence)`;
}
