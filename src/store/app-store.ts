/**
 * App Store - Zustand State Management
 * Manages user info and active journey state
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { MappedRoute } from "@/lib/map-utils";

export interface SegmentLocation {
  stopId: string;
  stopName: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface PathSegment {
  from: SegmentLocation;
  to: SegmentLocation;
  lineId: string;
  lineName: string;
  transportType: "BUS" | "RAIL";
  departureTime: string;
  arrivalTime: string;
  duration: number;
  hasIncident?: boolean;
}

export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  reputation?: number;
  activeJourney?: {
    segments: PathSegment[];
    startTime: string;
    expectedEndTime: string;
  };
}

export interface ActiveJourney {
  id: string;
  startPoint: {
    address: string;
    lat: number;
    lon: number;
  };
  endPoint: {
    address: string;
    lat: number;
    lon: number;
  };
  route: MappedRoute | null;
  startedAt: string;
  totalDuration?: number;
  warnings?: string[];
}

interface AppState {
  // User state
  user: User | null;
  setUser: (user: User | null) => void;
  setUserActiveJourney: (activeJourney: User["activeJourney"]) => void;

  // Journey state

  // Map state
  mapCenter: [number, number] | null;
  setMapCenter: (center: [number, number]) => void;
  mapZoom: number;
  setMapZoom: (zoom: number) => void;

  // Store management
  clearStore: () => void;

  // Hydration
  _hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // User state
        user: null,
        setUser: (user) => set({ user }),
        setUserActiveJourney: (activeJourney) => {
          set((state) => ({
            user: state.user
              ? {
                  ...state.user,
                  activeJourney,
                }
              : null,
            mapCenter:
              activeJourney?.segments?.[0]?.from.coordinates.latitude &&
              activeJourney?.segments?.[0]?.from.coordinates.longitude
                ? [
                    activeJourney.segments[0].from.coordinates.latitude,
                    activeJourney.segments[0].from.coordinates.longitude,
                  ]
                : undefined,
          }));
        },

        // Journey state

        // Map state
        mapCenter: null,
        setMapCenter: (center) => set({ mapCenter: center }),
        mapZoom: 13,
        setMapZoom: (zoom) => set({ mapZoom: zoom }),

        // Store management
        clearStore: () =>
          set({
            user: null,
            mapCenter: null,
            mapZoom: 13,
          }),

        // Hydration tracking
        _hasHydrated: false,
        setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),
      }),
      {
        name: "app-storage",
        // Only persist user and journey data, not map state
        partialize: (state) => ({
          user: state.user,
        }),
        onRehydrateStorage: () => (state) => {
          state?.setHasHydrated(true);
        },
      },
    ),
    {
      name: "AppStore",
    },
  ),
);
