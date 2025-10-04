/**
 * Map Utilities
 * Helper functions for processing and mapping journey/route data for map display
 */

export interface RoutePoint {
  lat: number;
  lon: number;
  stopName?: string;
  isTransfer?: boolean;
}

export interface RouteSegment {
  from: RoutePoint;
  to: RoutePoint;
  lineId: string;
  lineName: string;
  transportType: string;
  departureTime?: string;
  arrivalTime?: string;
  duration?: number;
}

export interface MappedRoute {
  segments: RouteSegment[];
  allPoints: RoutePoint[];
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
}

/**
 * Maps GraphQL findPath response segments to a format ready for map display
 * Extracts coordinates, creates route points, and calculates bounds
 */
export function mapSegmentsToRoute(
  findPathResult: {
    segments?: Array<{
      from?: {
        stopName?: string;
        coordinates?: { latitude?: number; longitude?: number };
      };
      to?: {
        stopName?: string;
        coordinates?: { latitude?: number; longitude?: number };
      };
      lineId?: string;
      lineName?: string;
      transportType?: string;
      departureTime?: string;
      arrivalTime?: string;
      duration?: number;
    }>;
  } | null,
): MappedRoute | null {
  if (
    !findPathResult ||
    !findPathResult.segments ||
    findPathResult.segments.length === 0
  ) {
    return null;
  }

  const segments: RouteSegment[] = [];
  const allPoints: RoutePoint[] = [];
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;

  findPathResult.segments.forEach((segment, index) => {
    // Extract from point
    if (
      segment.from?.coordinates?.latitude &&
      segment.from?.coordinates?.longitude
    ) {
      const fromPoint: RoutePoint = {
        lat: segment.from.coordinates.latitude,
        lon: segment.from.coordinates.longitude,
        stopName: segment.from.stopName,
        isTransfer: index > 0, // Mark as transfer if not the first segment
      };

      // Update bounds
      minLat = Math.min(minLat, fromPoint.lat);
      maxLat = Math.max(maxLat, fromPoint.lat);
      minLon = Math.min(minLon, fromPoint.lon);
      maxLon = Math.max(maxLon, fromPoint.lon);

      // Add to all points if not duplicate
      if (
        allPoints.length === 0 ||
        allPoints[allPoints.length - 1].lat !== fromPoint.lat ||
        allPoints[allPoints.length - 1].lon !== fromPoint.lon
      ) {
        allPoints.push(fromPoint);
      }

      // Extract to point
      if (
        segment.to?.coordinates?.latitude &&
        segment.to?.coordinates?.longitude
      ) {
        const toPoint: RoutePoint = {
          lat: segment.to.coordinates.latitude,
          lon: segment.to.coordinates.longitude,
          stopName: segment.to.stopName,
          isTransfer: false,
        };

        // Update bounds
        minLat = Math.min(minLat, toPoint.lat);
        maxLat = Math.max(maxLat, toPoint.lat);
        minLon = Math.min(minLon, toPoint.lon);
        maxLon = Math.max(maxLon, toPoint.lon);

        allPoints.push(toPoint);

        // Create segment
        segments.push({
          from: fromPoint,
          to: toPoint,
          lineId: segment.lineId || "",
          lineName: segment.lineName || "Unknown",
          transportType: segment.transportType || "unknown",
          departureTime: segment.departureTime,
          arrivalTime: segment.arrivalTime,
          duration: segment.duration,
        });
      }
    }
  });

  if (segments.length === 0) {
    return null;
  }

  return {
    segments,
    allPoints,
    bounds: {
      minLat,
      maxLat,
      minLon,
      maxLon,
    },
  };
}
