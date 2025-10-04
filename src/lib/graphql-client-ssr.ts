/**
 * GraphQL Client - SSR and Client-Side Fetch Utilities
 *
 * This module provides specialized utilities for handling GraphQL requests
 * in different environments (SSR vs Client-side) with proper authentication,
 * caching, and error handling.
 */

import { cookies } from "next/headers";
import { cache } from "react";
import type { ValueTypes } from "@/zeus";
import { Thunder } from "@/zeus";

/**
 * Get the appropriate GraphQL endpoint based on environment
 */
export const getGraphQLEndpoint = () => {
  // Client-side: use relative path
  if (typeof window !== "undefined") {
    return "/api/graphql";
  }

  // Server-side: use absolute URL
  // Check if we're in production or development
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `http://localhost:${process.env.PORT || 3000}`;

  return `${baseUrl}/api/graphql`;
};

/**
 * Get authentication headers for server-side requests
 * Reads from cookies (Next.js Server Components)
 */
export const getServerHeaders = async (): Promise<HeadersInit> => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  try {
    // Get cookies from Next.js server context
    const cookieStore = await cookies();

    // Get session token from cookies (adjust cookie name based on your auth setup)
    const sessionToken =
      cookieStore.get("next-auth.session-token")?.value ||
      cookieStore.get("__Secure-next-auth.session-token")?.value;

    if (sessionToken) {
      headers["Cookie"] = `next-auth.session-token=${sessionToken}`;
    }

    // Alternative: if using custom auth token
    const authToken = cookieStore.get("auth-token")?.value;
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
  } catch {
    // If cookies() is not available (not in server context), skip
    console.warn("Could not access cookies in server context");
  }

  return headers;
};

/**
 * Get authentication headers for client-side requests
 * Reads from localStorage and document.cookie
 */
export const getClientHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  // Try localStorage first
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth-token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  return headers;
};

/**
 * Server-side Thunder client with caching
 * Uses React's cache() for automatic request deduplication
 */
export const createServerThunderClient = () => {
  return Thunder(async (query) => {
    const headers = await getServerHeaders();
    const endpoint = getGraphQLEndpoint();

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ query }),
      credentials: "include",
      // Next.js specific: control caching behavior
      next: {
        revalidate: 60, // Revalidate every 60 seconds (ISR)
        tags: ["graphql"], // Tag for on-demand revalidation
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GraphQL request failed: ${response.status} ${error}`);
    }

    const json = await response.json();

    if (json.errors) {
      throw new Error(json.errors[0]?.message || "GraphQL error");
    }

    return json;
  });
};

/**
 * Client-side Thunder client (no caching, fresh data)
 */
export const createClientThunderClient = () => {
  return Thunder(async (query) => {
    const headers = getClientHeaders();
    const endpoint = getGraphQLEndpoint();

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ query }),
      credentials: "include",
      // Client-side: always fresh data, no caching by default
      cache: "no-store",
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GraphQL request failed: ${response.status} ${error}`);
    }

    const json = await response.json();

    if (json.errors) {
      throw new Error(json.errors[0]?.message || "GraphQL error");
    }

    return json;
  });
};

/**
 * Automatic client selection based on environment
 * Use this for universal code that works in both SSR and client-side
 */
export const createUniversalThunderClient = () => {
  if (typeof window !== "undefined") {
    return createClientThunderClient();
  }
  return createServerThunderClient();
};

/**
 * Server-side queries with React cache() for deduplication
 * Use this in Server Components, Server Actions, and Route Handlers
 */
export const serverQueries = {
  /**
   * Get current user (cached)
   */
  getCurrentUser: cache(async () => {
    const client = createServerThunderClient();
    return await client("query")({
      me: {
        id: true,
        name: true,
        email: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }),

  /**
   * Check 2FA status (cached)
   */
  check2FAStatus: cache(async (username: string) => {
    const client = createServerThunderClient();
    return await client("query")({
      check2FAStatus: [
        { username },
        {
          requires2FA: true,
          userExists: true,
        },
      ],
    });
  }),
};

/**
 * Client-side queries (no caching)
 * Use this in Client Components
 */
export const clientQueries = {
  /**
   * Get current user (client-side)
   */
  getCurrentUser: async () => {
    const client = createClientThunderClient();
    return await client("query")({
      me: {
        id: true,
        name: true,
        email: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  /**
   * Check 2FA status (client-side)
   */
  check2FAStatus: async (username: string) => {
    const client = createClientThunderClient();
    return await client("query")({
      check2FAStatus: [
        { username },
        {
          requires2FA: true,
          userExists: true,
        },
      ],
    });
  },
};

/**
 * Server-side mutations
 * Use in Server Actions or API Routes
 */
export const serverMutations = {
  /**
   * Register a new user (server-side)
   */
  register: async (input: ValueTypes["RegisterInput"]) => {
    const client = createServerThunderClient();
    return await client("mutation")({
      register: [
        { input },
        {
          success: true,
          message: true,
          userId: true,
        },
      ],
    });
  },

  /**
   * Create incident report (server-side)
   */
  createIncidentReport: async (input: ValueTypes["CreateReportInput"]) => {
    const client = createServerThunderClient();
    return await client("mutation")({
      carrierMutations: {
        createReport: [
          { input },
          {
            id: true,
            title: true,
            description: true,
            kind: true,
            status: true,
            createdAt: true,
          },
        ],
      },
    });
  },

  /**
   * Update incident report (server-side)
   */
  updateIncidentReport: async (
    id: string,
    input: ValueTypes["UpdateReportInput"],
  ) => {
    const client = createServerThunderClient();
    return await client("mutation")({
      carrierMutations: {
        updateReport: [
          { id, input },
          {
            id: true,
            title: true,
            description: true,
            status: true,
            updatedAt: true,
          },
        ],
      },
    });
  },

  /**
   * Delete incident report (server-side)
   */
  deleteIncidentReport: async (id: string) => {
    const client = createServerThunderClient();
    return await client("mutation")({
      carrierMutations: {
        deleteReport: [
          { id },
          {
            success: true,
            message: true,
          },
        ],
      },
    });
  },
};

/**
 * Client-side mutations
 * Use in Client Components
 */
export const clientMutations = {
  /**
   * Register a new user (client-side)
   */
  register: async (input: ValueTypes["RegisterInput"]) => {
    const client = createClientThunderClient();
    return await client("mutation")({
      register: [
        { input },
        {
          success: true,
          message: true,
          userId: true,
        },
      ],
    });
  },

  /**
   * Create incident report (client-side)
   */
  createIncidentReport: async (input: ValueTypes["CreateReportInput"]) => {
    const client = createClientThunderClient();
    return await client("mutation")({
      carrierMutations: {
        createReport: [
          { input },
          {
            id: true,
            title: true,
            description: true,
            kind: true,
            status: true,
            createdAt: true,
          },
        ],
      },
    });
  },

  /**
   * Update incident report (client-side)
   */
  updateIncidentReport: async (
    id: string,
    input: ValueTypes["UpdateReportInput"],
  ) => {
    const client = createClientThunderClient();
    return await client("mutation")({
      carrierMutations: {
        updateReport: [
          { id, input },
          {
            id: true,
            title: true,
            description: true,
            status: true,
            updatedAt: true,
          },
        ],
      },
    });
  },

  /**
   * Delete incident report (client-side)
   */
  deleteIncidentReport: async (id: string) => {
    const client = createClientThunderClient();
    return await client("mutation")({
      carrierMutations: {
        deleteReport: [
          { id },
          {
            success: true,
            message: true,
          },
        ],
      },
    });
  },

  /**
   * Setup 2FA (client-side)
   */
  setup2FA: async () => {
    const client = createClientThunderClient();
    return await client("mutation")({
      setup2FA: {
        secret: true,
        qrCode: true,
      },
    });
  },

  /**
   * Verify 2FA (client-side)
   */
  verify2FA: async (token: string, secret: string) => {
    const client = createClientThunderClient();
    return await client("mutation")({
      verify2FA: [
        { token, secret },
        {
          success: true,
          message: true,
        },
      ],
    });
  },
};

/**
 * Fetch with custom cache control
 * For advanced use cases where you need fine-grained control
 */
export const fetchWithCache = async <T>(
  query: string,
  options: {
    revalidate?: number | false; // Seconds to revalidate, or false for no cache
    tags?: string[]; // Cache tags for on-demand revalidation
  } = {},
) => {
  const headers =
    typeof window !== "undefined"
      ? getClientHeaders()
      : await getServerHeaders();
  const endpoint = getGraphQLEndpoint();

  const fetchOptions: RequestInit = {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
    credentials: "include",
  };

  // Server-side: use Next.js caching
  if (typeof window === "undefined") {
    (
      fetchOptions as {
        next?: { revalidate?: number | false; tags?: string[] };
      }
    ).next = {
      revalidate: options.revalidate ?? 60,
      tags: options.tags ?? ["graphql"],
    };
  } else {
    // Client-side: control browser cache
    fetchOptions.cache = options.revalidate === false ? "no-store" : "default";
  }

  const response = await fetch(endpoint, fetchOptions);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GraphQL request failed: ${response.status} ${error}`);
  }

  const json = await response.json();

  if (json.errors) {
    throw new Error(json.errors[0]?.message || "GraphQL error");
  }

  return json.data as T;
};

/**
 * Revalidate cached data on-demand
 * Use this in Server Actions after mutations
 */
export const revalidateGraphQL = async (tags: string[] = ["graphql"]) => {
  const { revalidateTag } = await import("next/cache");
  tags.forEach((tag) => revalidateTag(tag));
};

/**
 * Error handling helper
 */
export const handleGraphQLError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unknown error occurred";
};
