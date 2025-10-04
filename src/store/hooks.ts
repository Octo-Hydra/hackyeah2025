/**
 * Custom Hooks for App Store
 * Convenience hooks for accessing specific parts of the store
 */

import { useAppStore } from "./app-store";

/**
 * Hook to get current user from store
 */
export function useUser() {
  return useAppStore((state) => state.user);
}

/**
 * Hook to get active journey from store
 */
export function useActiveJourney() {
  return useAppStore((state) => state.activeJourney);
}

/**
 * Hook to get and set map center
 */
export function useMapCenter() {
  const mapCenter = useAppStore((state) => state.mapCenter);
  const setMapCenter = useAppStore((state) => state.setMapCenter);
  return [mapCenter, setMapCenter] as const;
}

/**
 * Hook to get and set map zoom
 */
export function useMapZoom() {
  const mapZoom = useAppStore((state) => state.mapZoom);
  const setMapZoom = useAppStore((state) => state.setMapZoom);
  return [mapZoom, setMapZoom] as const;
}

/**
 * Hook to manage active journey
 */
export function useJourneyActions() {
  const setActiveJourney = useAppStore((state) => state.setActiveJourney);
  const clearActiveJourney = useAppStore((state) => state.clearActiveJourney);
  return { setActiveJourney, clearActiveJourney };
}

/**
 * Hook to get user's active journey from backend (GraphQL schema)
 */
export function useUserActiveJourney() {
  const user = useAppStore((state) => state.user);
  return user?.activeJourney;
}
