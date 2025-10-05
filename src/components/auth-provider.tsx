"use client";

import { SessionProvider, useSession, signOut } from "next-auth/react";
import { ReactNode, useEffect, useRef } from "react";
import { useAppStore } from "@/store/app-store";
import { Query } from "@/lib/graphql_request";

function SessionSync() {
  const { data: session, status } = useSession();
  const setUser = useAppStore((state) => state.setUser);
  const setMapCenter = useAppStore((state) => state.setMapCenter);
  const currentUserId = useAppStore((state) => state.user?.id ?? null);
  const lastFetchedUserId = useRef<string | null>(null);
  const sessionUserId = session?.user?.id ?? null;
  const hasInitialized = useRef(false);

  useEffect(() => {
    const syncUser = async () => {
      if (status === "authenticated" && sessionUserId) {
        // Always refetch on initial mount or when user changes
        const shouldRefetch =
          !hasInitialized.current ||
          currentUserId !== sessionUserId ||
          lastFetchedUserId.current !== sessionUserId;

        if (!shouldRefetch) {
          return;
        }

        console.log("🔄 Syncing user data from GraphQL...");

        try {
          // Pobierz pełne dane użytkownika z GraphQL
          const query = Query();
          const result = await query({
            me: {
              id: true,
              name: true,
              email: true,

              reputation: true,
              activeJourney: {
                segments: {
                  from: {
                    stopId: true,
                    stopName: true,
                    coordinates: {
                      latitude: true,
                      longitude: true,
                    },
                  },
                  to: {
                    stopId: true,
                    stopName: true,
                    coordinates: {
                      latitude: true,
                      longitude: true,
                    },
                  },
                  lineId: true,
                  lineName: true,
                  transportType: true,
                  departureTime: true,
                  arrivalTime: true,
                  duration: true,
                  hasIncident: true,
                },
                startTime: true,
                expectedEndTime: true,
              },
              journeyNotifications: {
                id: true,
                incidentId: true,
                title: true,
                description: true,
                kind: true,
                status: true,
                lineId: true,
                lineName: true,
                delayMinutes: true,
                receivedAt: true,
              },
            },
          });

          if (result.me) {
            const activeJourneyData = result.me.activeJourney
              ? {
                  segments: result.me.activeJourney.segments.map((seg) => ({
                    from: {
                      stopId: seg.from.stopId,
                      stopName: seg.from.stopName,
                      coordinates: {
                        latitude: seg.from.coordinates.latitude,
                        longitude: seg.from.coordinates.longitude,
                      },
                    },
                    to: {
                      stopId: seg.to.stopId,
                      stopName: seg.to.stopName,
                      coordinates: {
                        latitude: seg.to.coordinates.latitude,
                        longitude: seg.to.coordinates.longitude,
                      },
                    },
                    lineId: seg.lineId,
                    lineName: seg.lineName,
                    transportType: seg.transportType as "BUS" | "RAIL",
                    departureTime: seg.departureTime,
                    arrivalTime: seg.arrivalTime,
                    duration: seg.duration,
                    hasIncident: seg.hasIncident,
                  })),
                  startTime: result.me.activeJourney.startTime,
                  expectedEndTime: result.me.activeJourney.expectedEndTime,
                }
              : undefined;

            console.log("📦 GraphQL me result:", result.me);
            console.log("🚗 Active journey data:", activeJourneyData);

            const notifications =
              result.me.journeyNotifications?.map((notification) => ({
                id: notification.id,
                incidentId: notification.incidentId ?? notification.id,
                title: notification.title,
                description: notification.description ?? null,
                kind: notification.kind ?? null,
                status: notification.status ?? undefined,
                lineId: notification.lineId ?? null,
                lineName: notification.lineName ?? null,
                delayMinutes: notification.delayMinutes ?? null,
                receivedAt: notification.receivedAt,
              })) ?? [];

            setUser({
              id: result.me.id,
              name: result.me.name,
              email: result.me.email,
              reputation: result.me.reputation ?? undefined,
              activeJourney: activeJourneyData,
              journeyNotifications: notifications,
            });

            lastFetchedUserId.current = sessionUserId;
            hasInitialized.current = true;

            console.log("✅ User synced to store with active journey");

            // Ustaw mapCenter na początek aktywnej podróży
            if (activeJourneyData?.segments?.[0]?.from.coordinates) {
              setMapCenter([
                activeJourneyData.segments[0].from.coordinates.latitude,
                activeJourneyData.segments[0].from.coordinates.longitude,
              ]);
              console.log(
                "📍 Map center set to:",
                activeJourneyData.segments[0].from.stopName,
              );
            }
          } else {
            // User was deleted from database but session still exists
            console.log(
              "⚠️ User not found in database, signing out and clearing store"
            );
            setUser(null);
            lastFetchedUserId.current = null;
            hasInitialized.current = false;
            await signOut({ redirect: false });
          }
        } catch (error) {
          console.error("❌ Error syncing user data:", error);
          // If there's an error fetching user, might be deleted or network issue
          // Clear store but don't auto-signout to avoid infinite loops
          if (
            error &&
            typeof error === "object" &&
            "message" in error &&
            typeof error.message === "string" &&
            (error.message.includes("User not found") ||
              error.message.includes("Not authenticated"))
          ) {
            console.log("🔴 User deleted from DB, signing out");
            setUser(null);
            lastFetchedUserId.current = null;
            hasInitialized.current = false;
            await signOut({ redirect: false });
          }
        }
      } else if (status === "unauthenticated" && currentUserId) {
        // Wyczyść store gdy użytkownik się wyloguje
        console.log("🔴 User logged out, clearing store");
        setUser(null);
        lastFetchedUserId.current = null;
        hasInitialized.current = false;
      }
    };

    syncUser();
  }, [status, sessionUserId, currentUserId, setUser, setMapCenter]);

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SessionSync />
      {children}
    </SessionProvider>
  );
}
