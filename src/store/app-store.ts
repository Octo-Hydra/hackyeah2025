/**
 * App Store - Zustand State Management
 * Manages user info and active journey state
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

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

export interface JourneyNotification {
  id: string;
  incidentId?: string;
  title: string;
  description?: string | null;
  kind?: string | null;
  status?: "DRAFT" | "PUBLISHED" | "RESOLVED";
  lineId?: string | null;
  lineName?: string | null;
  delayMinutes?: number | null;
  receivedAt: string;
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
  journeyNotifications?: JourneyNotification[];
}

function normalizeNotification(
  notification: JourneyNotification,
): JourneyNotification {
  const fallbackId = notification.id ?? notification.incidentId;
  const id =
    fallbackId ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const incidentId = notification.incidentId ?? fallbackId ?? id;

  return {
    ...notification,
    id,
    incidentId,
    status:
      notification.status === null || notification.status === undefined
        ? undefined
        : notification.status,
  };
}

interface AppState {
  // User state
  user: User | null;
  setUser: (user: User | null) => void;
  setUserActiveJourney: (activeJourney: User["activeJourney"]) => void;

  // Journey notifications
  notifications: JourneyNotification[];
  dismissedNotificationIds: string[];
  addNotification: (notification: JourneyNotification) => void;
  setNotifications: (notifications: JourneyNotification[]) => void;
  dismissNotification: (notificationId: string) => void;
  clearNotifications: () => void;
  resetDismissedNotifications: () => void;

  // Journey state

  // Map state
  mapCenter: [number, number] | null;
  setMapCenter: (center: [number, number]) => void;
  mapZoom: number;
  setMapZoom: (zoom: number) => void;
  scrollWheelZoom: boolean;
  setScrollWheelZoom: (enabled: boolean) => void;

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
        setUser: (user) =>
          set(() => {
            if (!user) {
              return {
                user: null,
                notifications: [],
                dismissedNotificationIds: [],
              } as Partial<AppState>;
            }

            const { journeyNotifications, ...rest } = user;

            const updates: Partial<AppState> = {
              user: rest,
            };

            if (journeyNotifications) {
              updates.notifications = journeyNotifications.map(
                normalizeNotification,
              );
              updates.dismissedNotificationIds = [];
            }

            return updates;
          }),
        setUserActiveJourney: (activeJourney) => {
          set((state) => {
            const nextState: Partial<AppState> = {
              user: state.user
                ? {
                    ...state.user,
                    activeJourney,
                  }
                : null,
            };

            const firstSegment = activeJourney?.segments?.[0];
            if (firstSegment?.from.coordinates) {
              nextState.mapCenter = [
                firstSegment.from.coordinates.latitude,
                firstSegment.from.coordinates.longitude,
              ];
            }

            if (!activeJourney) {
              nextState.notifications = [];
              nextState.dismissedNotificationIds = [];
            }

            return nextState;
          });
        },

        // Journey notifications
        notifications: [],
        dismissedNotificationIds: [],
        setNotifications: (notifications) =>
          set({
            notifications: notifications.map(normalizeNotification),
            dismissedNotificationIds: [],
          }),
        addNotification: (notification) =>
          set((state) => {
            const normalized = normalizeNotification(notification);

            if (state.dismissedNotificationIds.includes(normalized.id)) {
              return {} as Partial<AppState>;
            }

            const existingIndex = state.notifications.findIndex(
              (item) => item.id === normalized.id,
            );

            if (existingIndex >= 0) {
              const updated = [...state.notifications];
              const existing = updated[existingIndex];
              updated[existingIndex] = {
                ...existing,
                ...normalized,
                receivedAt: existing.receivedAt,
              };

              return {
                notifications: updated,
              } as Partial<AppState>;
            }

            return {
              notifications: [normalized, ...state.notifications],
            } as Partial<AppState>;
          }),
        dismissNotification: (notificationId) =>
          set((state) => {
            const alreadyDismissed =
              state.dismissedNotificationIds.includes(notificationId);

            return {
              notifications: state.notifications.filter(
                (notification) => notification.id !== notificationId,
              ),
              dismissedNotificationIds: alreadyDismissed
                ? state.dismissedNotificationIds
                : [...state.dismissedNotificationIds, notificationId],
            } as Partial<AppState>;
          }),
        clearNotifications: () =>
          set({
            notifications: [],
            dismissedNotificationIds: [],
          }),
        resetDismissedNotifications: () =>
          set({ dismissedNotificationIds: [] }),

        // Journey state

        // Map state
        mapCenter: null,
        setMapCenter: (center) => set({ mapCenter: center }),
        mapZoom: 13,
        setMapZoom: (zoom) => set({ mapZoom: zoom }),
        scrollWheelZoom: true,
        setScrollWheelZoom: (enabled) => set({ scrollWheelZoom: enabled }),

        // Store management
        clearStore: () =>
          set(
            {
              user: null,
              notifications: [],
              dismissedNotificationIds: [],
              mapCenter: null,
              mapZoom: 13,
              scrollWheelZoom: true,
            },
            false,
            "clearStore",
          ),

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
