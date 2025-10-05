"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import type { LatLngExpression, Map as LeafletMap } from "leaflet";
import type { MappedRoute, RoutePoint } from "@/lib/map-utils";
import { activeJourneyToMappedRoute } from "@/lib/map-utils";
import { useAppStore } from "@/store/app-store";
import { ActiveJourneyNotifier } from "./active-journey-notifier";

// Dynamically import MapContainer to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false },
);

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false },
);

const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false },
);

const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});

const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false },
);

const COORD_EPSILON = 1e-6;
const MIN_SAMPLES = 18;
const DISTANCE_STEP = 0.00035; // roughly 35m

function arePointsEqual(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): boolean {
  return (
    Math.abs(a.lat - b.lat) <= COORD_EPSILON &&
    Math.abs(a.lon - b.lon) <= COORD_EPSILON
  );
}

function interpolate(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
  t: number,
): { lat: number; lon: number } {
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lon: a.lon + (b.lon - a.lon) * t,
  };
}

function catmullRomCentripetal(
  p0: { lat: number; lon: number },
  p1: { lat: number; lon: number },
  p2: { lat: number; lon: number },
  p3: { lat: number; lon: number },
  t: number,
): { lat: number; lon: number } {
  const alpha = 0.5;

  const dist01 = Math.max(approximateDistance(p0, p1), COORD_EPSILON);
  const dist12 = Math.max(approximateDistance(p1, p2), COORD_EPSILON);
  const dist23 = Math.max(approximateDistance(p2, p3), COORD_EPSILON);

  const t0 = 0;
  const t1 = Math.pow(dist01, alpha);
  const t2 = t1 + Math.pow(dist12, alpha);
  const t3 = t2 + Math.pow(dist23, alpha);

  const tScaled = t1 + t * (t2 - t1);

  const A1 = interpolate(p0, p1, (tScaled - t0) / (t1 - t0));
  const A2 = interpolate(p1, p2, (tScaled - t1) / (t2 - t1));
  const A3 = interpolate(p2, p3, (tScaled - t2) / (t3 - t2));

  const B1 = interpolate(A1, A2, (tScaled - t0) / (t2 - t0));
  const B2 = interpolate(A2, A3, (tScaled - t1) / (t3 - t1));

  return interpolate(B1, B2, (tScaled - t1) / (t2 - t1));
}

function approximateDistance(a: RoutePoint, b: RoutePoint): number {
  const dx = b.lon - a.lon;
  const dy = b.lat - a.lat;
  return Math.hypot(dx, dy);
}

function findPointIndex(points: RoutePoint[], point: RoutePoint): number {
  return points.findIndex((candidate) => arePointsEqual(candidate, point));
}

function generateSmoothPolyline(
  route: MappedRoute,
  segment: MappedRoute["segments"][number],
): LatLngExpression[] {
  const { allPoints } = route;
  if (allPoints.length < 2) {
    return [
      [segment.from.lat, segment.from.lon],
      [segment.to.lat, segment.to.lon],
    ];
  }

  const startIndex = findPointIndex(allPoints, segment.from);
  const endIndex = findPointIndex(allPoints, segment.to);

  if (startIndex === -1 || endIndex === -1) {
    return [
      [segment.from.lat, segment.from.lon],
      [segment.to.lat, segment.to.lon],
    ];
  }

  const p0 = allPoints[Math.max(startIndex - 1, 0)];
  const p1 = allPoints[startIndex];
  const p2 = allPoints[endIndex];
  const p3 = allPoints[Math.min(endIndex + 1, allPoints.length - 1)];

  if (arePointsEqual(p1, p2)) {
    return [[p1.lat, p1.lon]];
  }

  const distance = approximateDistance(p1, p2);
  const sampleCount = Math.max(
    MIN_SAMPLES,
    Math.ceil(distance / DISTANCE_STEP),
  );

  const points: LatLngExpression[] = [];
  for (let i = 0; i <= sampleCount; i++) {
    const t = i / sampleCount;
    const { lat, lon } = catmullRomCentripetal(p0, p1, p2, p3, t);
    points.push([lat, lon]);
  }

  return points;
}

interface MapProps {
  center?: LatLngExpression;
  zoom?: number;
  className?: string;
}

export function Map({ center, zoom = 13, className }: MapProps) {
  // Subscribe to store state (must be at the top before other hooks)
  const activeJourney = useAppStore((state) => state.user?.activeJourney);
  const scrollWheelZoom = useAppStore((state) => state.scrollWheelZoom);

  const [position, setPosition] = useState<LatLngExpression | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [mappedRoute, setMappedRoute] = useState<MappedRoute | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);
  const lastFittedRouteKey = useRef<string | null>(null);

  useEffect(() => {
    setIsClient(true);

    // Get user's current location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        (error) => {
          console.error("Error getting location:", error);
          // Default to Warsaw, Poland if geolocation fails
          setPosition([52.2297, 21.0122]);
        },
      );
    } else {
      // Default to Warsaw, Poland
      setPosition([52.2297, 21.0122]);
    }
  }, []);

  // Convert active journey to mapped route when it changes
  useEffect(() => {
    if (activeJourney?.segments && activeJourney.segments.length > 0) {
      const route = activeJourneyToMappedRoute(activeJourney.segments);
      setMappedRoute(route);
    } else {
      setMappedRoute(null);
    }
  }, [activeJourney]);

  // Handle window resize to update map size
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    const handleResize = () => {
      // Use setTimeout to ensure the container has been resized before invalidating
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mapReady]);

  // Fit map bounds to route when route changes
  useEffect(() => {
    if (!mappedRoute) {
      lastFittedRouteKey.current = null;
      return;
    }

    if (!mapRef.current || !mapReady) {
      return;
    }

    const routeKey = mappedRoute.segments
      .map((segment) =>
        [
          segment.from.lat.toFixed(6),
          segment.from.lon.toFixed(6),
          segment.to.lat.toFixed(6),
          segment.to.lon.toFixed(6),
        ].join(","),
      )
      .join("|");

    if (routeKey === lastFittedRouteKey.current) {
      return;
    }

    const { bounds } = mappedRoute;
    mapRef.current.fitBounds([
      [bounds.minLat, bounds.minLon],
      [bounds.maxLat, bounds.maxLon],
    ]);

    lastFittedRouteKey.current = routeKey;
  }, [mappedRoute, mapReady]);

  useEffect(() => {
    // Fix Leaflet default marker icon issue with webpack
    if (isClient && typeof window !== "undefined") {
      import("leaflet").then((L) => {
        const iconDefault = L.Icon.Default.prototype as unknown as {
          _getIconUrl?: string;
        };
        delete iconDefault._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          iconUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        });
      });
    }
  }, [isClient]);
  const mapCenter = center || position;

  // Helper function to get color based on transport type
  const getLineColor = (transportType: string) => {
    switch (transportType.toUpperCase()) {
      case "BUS":
        return "#3b82f6"; // Blue
      case "RAIL":
        return "#ef4444"; // Red
      default:
        return "#6b7280"; // Gray
    }
  };

  // Dynamically enable/disable scroll wheel zoom
  useEffect(() => {
    if (mapRef.current) {
      if (scrollWheelZoom) {
        mapRef.current.scrollWheelZoom.enable();
      } else {
        mapRef.current.scrollWheelZoom.disable();
      }
    }
  }, [scrollWheelZoom]);

  if (!isClient || !position) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}
      >
        <div className="text-center flex items-center justify-center flex-col gap-2">
          <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Loading map...
          </p>
        </div>
      </div>
    );
  }

  return (
    <MapContainer
      center={mapCenter ?? undefined}
      zoom={zoom}
      className={className}
      style={{ height: "100%", width: "100%", touchAction: "pan-y" }}
      scrollWheelZoom={scrollWheelZoom}
      dragging={true}
      touchZoom={true}
      doubleClickZoom={true}
      zoomControl={true}
      ref={(map) => {
        if (map) {
          mapRef.current = map;
          if (!mapReady) {
            setMapReady(true);
          }
        }
      }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>'
        url={`https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY || "Xo1X4DbPOorRiDOi8L4W"}`}
        tileSize={512}
        zoomOffset={-1}
        minZoom={1}
        maxZoom={19}
        crossOrigin={true}
      />
      <ActiveJourneyNotifier />
      {/* Show user location marker when no route is displayed */}
      {!mappedRoute && mapCenter && (
        <Marker position={mapCenter}>
          <Popup>
            Your current location
            <br />
            <small>
              Lat: {Array.isArray(mapCenter) ? mapCenter[0] : mapCenter.lat}
              <br />
              Lng: {Array.isArray(mapCenter) ? mapCenter[1] : mapCenter.lng}
            </small>
          </Popup>
        </Marker>
      )}

      {/* Render route segments as polylines */}
      {mappedRoute?.segments.map((segment, idx) => (
        <Polyline
          key={`segment-${idx}`}
          positions={generateSmoothPolyline(mappedRoute, segment)}
          pathOptions={{
            color: getLineColor(segment.transportType),
            weight: 4,
            opacity: 0.7,
          }}
        >
          <Popup>
            <div className="text-sm">
              <strong>{segment.lineName}</strong> ({segment.transportType})
              <br />
              From: {segment.from.stopName}
              <br />
              To: {segment.to.stopName}
              {segment.departureTime && (
                <>
                  <br />
                  Departure: {segment.departureTime}
                </>
              )}
              {segment.arrivalTime && (
                <>
                  <br />
                  Arrival: {segment.arrivalTime}
                </>
              )}
            </div>
          </Popup>
        </Polyline>
      ))}

      {/* Render markers for each stop in the route */}
      {mappedRoute?.allPoints.map((point, idx) => (
        <Marker
          key={`point-${idx}`}
          position={[point.lat, point.lon]}
          opacity={point.isTransfer ? 1 : 0.8}
        >
          <Popup>
            <div className="text-sm">
              <strong>{point.stopName}</strong>
              {point.isTransfer && (
                <>
                  <br />
                  <span className="text-orange-600 font-semibold">
                    ⚠ Transfer Point
                  </span>
                </>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
