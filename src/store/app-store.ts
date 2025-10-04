/**
 * App Store - Zustand State Management
 * Manages user info and active journey state
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { MappedRoute } from "@/lib/map-utils";

export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  reputation?: number;
  activeJourney?: {
    routeIds: string[];
    lineIds: string[];
    startStopId: string;
    endStopId: string;
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

  // Journey state
  activeJourney: ActiveJourney | null;
  setActiveJourney: (journey: ActiveJourney | null) => void;
  clearActiveJourney: () => void;

  // Map state
  mapCenter: [number, number] | null;
  setMapCenter: (center: [number, number]) => void;
  mapZoom: number;
  setMapZoom: (zoom: number) => void;

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

        // Journey state
        activeJourney: null,
        setActiveJourney: (journey) =>
          set({
            activeJourney: journey,
            // Auto-center map on journey route if available
            mapCenter: journey?.route?.allPoints[0]
              ? [journey.route.allPoints[0].lat, journey.route.allPoints[0].lon]
              : undefined,
          }),
        clearActiveJourney: () => set({ activeJourney: null }),

        // Map state
        mapCenter: null,
        setMapCenter: (center) => set({ mapCenter: center }),
        mapZoom: 13,
        setMapZoom: (zoom) => set({ mapZoom: zoom }),

        // Hydration tracking
        _hasHydrated: false,
        setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),
      }),
      {
        name: "app-storage",
        // Only persist user and journey data, not map state
        partialize: (state) => ({
          user: state.user,
          activeJourney: state.activeJourney,
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
