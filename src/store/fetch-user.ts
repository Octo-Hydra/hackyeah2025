/**
 * SSR Data Fetching for App Store
 * Fetches user data on server-side to initialize Zustand store
 */

import { auth } from "@/auth";
import { prepareSSRquery } from "@/lib/graphql_request_ssr";
import type { User } from "./app-store";

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
          routeIds: true,
          lineIds: true,
          startStop: {
            stopId: true,
            stopName: true,
            coordinates: {
              latitude: true,
              longitude: true,
            },
          },
          endStop: {
            stopId: true,
            stopName: true,
            coordinates: {
              latitude: true,
              longitude: true,
            },
          },
          startTime: true,
          expectedEndTime: true,
        },
      },
    });

    if (!result.me) {
      return null;
    }

    return {
      id: result.me.id || "",
      name: result.me.name ?? null,
      email: result.me.email ?? null,
      image: null, // Image is not in the User schema, set to null
      reputation: result.me.reputation || 0,
      activeJourney: result.me.activeJourney
        ? {
            routeIds: (result.me.activeJourney.routeIds as string[]) || [],
            lineIds: (result.me.activeJourney.lineIds as string[]) || [],
            startStop: {
              stopId: result.me.activeJourney.startStop.stopId || "",
              stopName: result.me.activeJourney.startStop.stopName || "",
              coordinates: {
                latitude:
                  result.me.activeJourney.startStop.coordinates.latitude || 0,
                longitude:
                  result.me.activeJourney.startStop.coordinates.longitude || 0,
              },
            },
            endStop: {
              stopId: result.me.activeJourney.endStop.stopId || "",
              stopName: result.me.activeJourney.endStop.stopName || "",
              coordinates: {
                latitude:
                  result.me.activeJourney.endStop.coordinates.latitude || 0,
                longitude:
                  result.me.activeJourney.endStop.coordinates.longitude || 0,
              },
            },
            startTime: (result.me.activeJourney.startTime as string) || "",
            expectedEndTime:
              (result.me.activeJourney.expectedEndTime as string) || "",
          }
        : undefined,
    };
  } catch (error) {
    console.error("Error fetching user for store:", error);
    return null;
  }
}
