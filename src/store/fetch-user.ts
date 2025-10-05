/**
 * SSR Data Fetching for App Store
 * Fetches user data on server-side to initialize Zustand store
 */

import { auth } from "@/auth";
import { prepareSSRquery } from "@/lib/graphql_request_ssr";
import type { JourneyNotification, User } from "./app-store";

/**
 * Fetch current user data on server-side
 * Uses NextAuth session and GraphQL query
 */
export async function fetchUserForStore(): Promise<User | null> {
  try {
    // Get NextAuth session
    const session = await auth();

    if (!session?.user?.email) {
      return null;
    }

    // Query user data from GraphQL using SSR query
    const { querySSR } = await prepareSSRquery({
      next: {
        tags: ["user"],
        revalidate: 60, // Cache for 60 seconds
      },
    });

    const result = await querySSR({
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

    if (!result.me) {
      return null;
    }

    const journeyNotifications: JourneyNotification[] =
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

    return {
      id: result.me.id || "",
      name: result.me.name ?? null,
      email: result.me.email ?? null,
      image: null, // Image is not in the User schema, set to null
      reputation: result.me.reputation || 0,
      journeyNotifications,
      activeJourney: result.me.activeJourney
        ? {
            segments: result.me.activeJourney.segments.map((seg) => ({
              from: {
                stopId: seg.from.stopId || "",
                stopName: seg.from.stopName || "",
                coordinates: {
                  latitude: seg.from.coordinates.latitude || 0,
                  longitude: seg.from.coordinates.longitude || 0,
                },
              },
              to: {
                stopId: seg.to.stopId || "",
                stopName: seg.to.stopName || "",
                coordinates: {
                  latitude: seg.to.coordinates.latitude || 0,
                  longitude: seg.to.coordinates.longitude || 0,
                },
              },
              lineId: seg.lineId || "",
              lineName: seg.lineName || "",
              transportType: seg.transportType,
              departureTime: seg.departureTime || "",
              arrivalTime: seg.arrivalTime || "",
              duration: seg.duration || 0,
              hasIncident: seg.hasIncident || false,
            })),
            startTime: (result.me.activeJourney.startTime as string) || "",
            expectedEndTime:
              (result.me.activeJourney.expectedEndTime as string) || "",
          }
        : undefined,
    };
  } catch (error) {
    // Suppress expected "Dynamic server usage" errors during build
    // These occur when Next.js tries to pre-render pages that use auth()
    if (
      error instanceof Error &&
      error.message.includes("Dynamic server usage")
    ) {
      // This is expected - pages with auth cannot be statically rendered
      return null;
    }

    // Log only unexpected errors
    console.error("Error fetching user for store:", error);
    return null;
  }
}
