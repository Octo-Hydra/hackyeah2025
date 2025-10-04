"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import type { LatLngExpression } from "leaflet";

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

interface MapProps {
  center?: LatLngExpression;
  zoom?: number;
  className?: string;
}

export function Map({ center, zoom = 13, className }: MapProps) {
  const [position, setPosition] = useState<LatLngExpression | null>(null);
  const [isClient, setIsClient] = useState(false);

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

  return (
    <MapContainer
      center={mapCenter}
      zoom={zoom}
      className={className}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
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
    </MapContainer>
  );
}
