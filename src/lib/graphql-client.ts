/**
 * GraphQL Client using Zeus-GraphQL
 *
 * This module provides a type-safe GraphQL client for interacting with the backend API.
 * It uses zeus-graphql for automatic type generation and type-safe queries.
 */

import { Thunder, Zeus, Chain, Selector, ValueTypes } from "@/zeus";

// GraphQL endpoint configuration
const GRAPHQL_ENDPOINT =
  typeof window !== "undefined"
    ? "/api/graphql" // Client-side: relative path
    : `http://localhost:${process.env.PORT || 3000}/api/graphql`; // Server-side: absolute URL

// WebSocket endpoint for subscriptions (client-side only)
const WS_ENDPOINT =
  typeof window !== "undefined"
    ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/graphql`
    : undefined;

/**
 * HTTP Headers for GraphQL requests
 * Can be extended with authentication tokens, etc.
 */
const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  // Add authentication token if available (e.g., from session)
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth-token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  return headers;
};

/**
 * Create a Thunder client instance
 * Thunder provides a chainable API for building queries
 */
export const createThunderClient = (customEndpoint?: string) => {
  return Thunder(async (query) => {
    const response = await fetch(customEndpoint || GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ query }),
      credentials: "include", // Include cookies for auth
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
 * Default Thunder client instance
 */
export const thunderClient = createThunderClient();

/**
 * Create a Chain client for more granular control
 * Chain allows you to specify exactly what fields you want
 */
export const createChainClient = (customEndpoint?: string) => {
  return Chain(customEndpoint || GRAPHQL_ENDPOINT, {
    headers: getHeaders(),
    credentials: "include",
  });
};

/**
 * Default Chain client instance
 */
export const chainClient = createChainClient();

/**
 * Zeus client - generates GraphQL query strings
 * Useful for manual query construction
 */
export { Zeus };

/**
 * Selector - type-safe field selection
 */
export { Selector };

/**
 * ValueTypes - input types for mutations
 */
export type { ValueTypes };

/**
 * Helper function to handle GraphQL errors
 */
export const handleGraphQLError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unknown error occurred";
};

/**
 * Example usage with Thunder (simplest approach):
 *
 * ```ts
 * const result = await thunderClient("query")({
 *   me: {
 *     id: true,
 *     name: true,
 *     email: true,
 *     role: true,
 *   }
 * });
 *
 * console.log(result.me);
 * ```
 */

/**
 * Example usage with Chain (more control):
 *
 * ```ts
 * const result = await chainClient("query")({
 *   me: {
 *     id: true,
 *     name: true,
 *     email: true,
 *   }
 * });
 *
 * console.log(result.me);
 * ```
 */

/**
 * Example mutation with Thunder:
 *
 * ```ts
 * const result = await thunderClient("mutation")({
 *   register: [{
 *     input: {
 *       name: "John Doe",
 *       email: "john@example.com",
 *       password: "securepassword123",
 *     }
 *   }, {
 *     success: true,
 *     message: true,
 *     userId: true,
 *   }]
 * });
 *
 * console.log(result.register);
 * ```
 */

/**
 * Example carrier mutations:
 *
 * ```ts
 * const result = await thunderClient("mutation")({
 *   carrierMutations: {
 *     createReport: [{
 *       input: {
 *         title: "Bus Delay",
 *         description: "Bus line 123 delayed by 15 minutes",
 *         kind: "TRAFFIC_JAM",
 *         lineIds: ["line-1", "line-2"],
 *       }
 *     }, {
 *       id: true,
 *       title: true,
 *       description: true,
 *       status: true,
 *     }]
 *   }
 * });
 * ```
 */

/**
 * Subscription support (client-side only)
 * Note: Requires WebSocket configuration
 */
export const createSubscriptionClient = () => {
  if (typeof window === "undefined" || !WS_ENDPOINT) {
    throw new Error("Subscriptions are only available on the client side");
  }

  // For subscriptions, you'll need to use the apiSubscription from zeus
  // This is a placeholder for subscription implementation
  return {
    endpoint: WS_ENDPOINT,
    // Implement subscription logic here based on your needs
  };
};

/**
 * Type-safe query builder using Selector
 * Useful for creating reusable query selections
 */
export const UserSelector = Selector("User")({
  id: true,
  name: true,
  email: true,
  role: true,
  twoFactorEnabled: true,
  createdAt: true,
  updatedAt: true,
});

export const IncidentSelector = Selector("Incident")({
  id: true,
  title: true,
  description: true,
  kind: true,
  incidentClass: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  lines: {
    id: true,
    name: true,
    transportType: true,
  },
  createdBy: {
    id: true,
    name: true,
    email: true,
  },
});

/**
 * Pre-built query helpers for common operations
 */
export const queries = {
  /**
   * Get current user information
   */
  getCurrentUser: async () => {
    return await thunderClient("query")({
      me: UserSelector,
    });
  },

  /**
   * Check 2FA status for a username
   */
  check2FAStatus: async (username: string) => {
    return await thunderClient("query")({
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
 * Pre-built mutation helpers for common operations
 */
export const mutations = {
  /**
   * Register a new user
   */
  register: async (input: ValueTypes["RegisterInput"]) => {
    return await thunderClient("mutation")({
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
   * Verify email with token
   */
  verifyEmail: async (token: string) => {
    return await thunderClient("mutation")({
      verifyEmail: [
        { token },
        {
          success: true,
          message: true,
        },
      ],
    });
  },

  /**
   * Setup 2FA
   */
  setup2FA: async () => {
    return await thunderClient("mutation")({
      setup2FA: {
        secret: true,
        qrCode: true,
      },
    });
  },

  /**
   * Verify 2FA token
   */
  verify2FA: async (token: string, secret: string) => {
    return await thunderClient("mutation")({
      verify2FA: [
        { token, secret },
        {
          success: true,
          message: true,
        },
      ],
    });
  },

  /**
   * Disable 2FA
   */
  disable2FA: async () => {
    return await thunderClient("mutation")({
      disable2FA: {
        success: true,
        message: true,
      },
    });
  },

  /**
   * Create an incident report
   */
  createIncidentReport: async (input: ValueTypes["CreateReportInput"]) => {
    return await thunderClient("mutation")({
      carrierMutations: {
        createReport: [{ input }, IncidentSelector],
      },
    });
  },

  /**
   * Save incident report as draft
   */
  saveDraft: async (input: ValueTypes["CreateReportInput"]) => {
    return await thunderClient("mutation")({
      carrierMutations: {
        saveDraft: [{ input }, IncidentSelector],
      },
    });
  },

  /**
   * Update an incident report
   */
  updateIncidentReport: async (
    id: string,
    input: ValueTypes["UpdateReportInput"],
  ) => {
    return await thunderClient("mutation")({
      carrierMutations: {
        updateReport: [{ id, input }, IncidentSelector],
      },
    });
  },

  /**
   * Delete an incident report
   */
  deleteIncidentReport: async (id: string) => {
    return await thunderClient("mutation")({
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
   * Publish an incident report
   */
  publishIncidentReport: async (id: string) => {
    return await thunderClient("mutation")({
      carrierMutations: {
        publishReport: [{ id }, IncidentSelector],
      },
    });
  },
};

/**
 * Export all client methods in a single object
 */
export const graphqlClient = {
  thunder: thunderClient,
  chain: chainClient,
  queries,
  mutations,
  Zeus,
  Selector,
  handleGraphQLError,
};

export default graphqlClient;
