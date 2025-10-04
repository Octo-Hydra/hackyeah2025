"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import type { LatLngExpression, Map as LeafletMap } from "leaflet";
import type { MappedRoute } from "@/lib/map-utils";
import { activeJourneyToMappedRoute } from "@/lib/map-utils";
import { useAppStore } from "@/store/app-store";

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

interface MapProps {
  center?: LatLngExpression;
  zoom?: number;
  className?: string;
}

export function Map({ center, zoom = 13, className }: MapProps) {
  const [position, setPosition] = useState<LatLngExpression | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [mappedRoute, setMappedRoute] = useState<MappedRoute | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  // Subscribe to active journey changes from store
  const activeJourney = useAppStore((state) => state.user?.activeJourney);

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

  // Fit map bounds to route when route changes
  useEffect(() => {
    if (mappedRoute && mapRef.current) {
      const { bounds } = mappedRoute;
      mapRef.current.fitBounds([
        [bounds.minLat, bounds.minLon],
        [bounds.maxLat, bounds.maxLon],
      ]);
    }
  }, [mappedRoute]);

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

  return (
    <MapContainer
      center={mapCenter}
      zoom={zoom}
      className={className}
      style={{ height: "100%", width: "100%", touchAction: "pan-y" }}
      scrollWheelZoom={true}
      dragging={true}
      touchZoom={true}
      doubleClickZoom={true}
      zoomControl={true}
      ref={(map) => {
        if (map) {
          mapRef.current = map;
        }
      }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Show user location marker when no route is displayed */}
      {!mappedRoute && (
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
          positions={[
            [segment.from.lat, segment.from.lon],
            [segment.to.lat, segment.to.lon],
          ]}
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
