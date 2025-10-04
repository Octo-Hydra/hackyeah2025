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
        image: true,
        reputation: true,
        activeJourney: {
          routeIds: true,
          lineIds: true,
          startStopId: true,
          endStopId: true,
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
      image: (result.me.image as string | null | undefined) ?? null,
      reputation: result.me.reputation || 0,
      activeJourney: result.me.activeJourney
        ? {
            routeIds: (result.me.activeJourney.routeIds as string[]) || [],
            lineIds: (result.me.activeJourney.lineIds as string[]) || [],
            startStopId: (result.me.activeJourney.startStopId as string) || "",
            endStopId: (result.me.activeJourney.endStopId as string) || "",
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
