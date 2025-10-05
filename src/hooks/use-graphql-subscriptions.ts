/**
 * GraphQL Subscription Hook
 *
 * Uses GraphQL subscriptions via Yoga WebSocket instead of separate WS server
 */

"use client";

import { useEffect, useRef } from "react";
import { createClient } from "graphql-ws";

const GRAPHQL_WS_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_WS_URL ||
  (typeof window !== "undefined"
    ? `ws://${window.location.host}/api/graphql`
    : "ws://localhost:3000/api/graphql");

let wsClient: ReturnType<typeof createClient> | null = null;

function getWSClient() {
  if (!wsClient) {
    wsClient = createClient({
      url: GRAPHQL_WS_URL,
      connectionParams: () => {
        // Add auth token if available
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("auth-token")
            : null;
        return token ? { authToken: token } : {};
      },
    });
  }
  return wsClient;
}

/**
 * Subscribe to new notifications for specific lines
 */
export function useNotificationReportedSubscription(
  lineIds: string[] | null,
  onNotification: (notification: any) => void,
) {
  const onNotificationRef = useRef(onNotification);
  onNotificationRef.current = onNotification;

  useEffect(() => {
    if (!lineIds || lineIds.length === 0) return;

    const client = getWSClient();

    const unsubscribe = client.subscribe(
      {
        query: `
          subscription NotificationReported($lineIds: [String!]) {
            notificationReported(lineIds: $lineIds) {
              id
              reportedBy
              title
              description
              kind
              lineId
              lineName
              timestamp
              status
              supportingReports
              totalReputation
              reportCount
            }
          }
        `,
        variables: { lineIds },
      },
      {
        next: (result) => {
          if (result.data?.notificationReported) {
            onNotificationRef.current(result.data.notificationReported);
          }
        },
        error: (error) => {
          console.error("[GraphQL Sub] Error:", error);
        },
        complete: () => {
          console.log("[GraphQL Sub] Completed");
        },
      },
    );

    return () => unsubscribe();
  }, [lineIds]);
}

/**
 * Subscribe to notification confirmations
 */
export function useNotificationConfirmedSubscription(
  lineIds: string[] | null,
  onConfirmed: (notification: any) => void,
) {
  const onConfirmedRef = useRef(onConfirmed);
  onConfirmedRef.current = onConfirmed;

  useEffect(() => {
    if (!lineIds || lineIds.length === 0) return;

    const client = getWSClient();

    const unsubscribe = client.subscribe(
      {
        query: `
          subscription NotificationConfirmed($lineIds: [String!]) {
            notificationConfirmed(lineIds: $lineIds) {
              id
              reportedBy
              title
              description
              kind
              lineId
              lineName
              timestamp
              status
              supportingReports
              totalReputation
              reportCount
            }
          }
        `,
        variables: { lineIds },
      },
      {
        next: (result) => {
          if (result.data?.notificationConfirmed) {
            onConfirmedRef.current(result.data.notificationConfirmed);
          }
        },
        error: (error) => {
          console.error("[GraphQL Sub] Error:", error);
        },
        complete: () => {
          console.log("[GraphQL Sub] Completed");
        },
      },
    );

    return () => unsubscribe();
  }, [lineIds]);
}

/**
 * Subscribe to official notifications (all lines)
 */
export function useOfficialNotificationSubscription(
  onOfficial: (notification: any) => void,
) {
  const onOfficialRef = useRef(onOfficial);
  onOfficialRef.current = onOfficial;

  useEffect(() => {
    const client = getWSClient();

    const unsubscribe = client.subscribe(
      {
        query: `
          subscription NotificationOfficial {
            notificationOfficial {
              id
              incidentId
              title
              description
              kind
              lineId
              lineName
              reportCount
              totalReputation
              contributingUsers
              createdAt
              status
            }
          }
        `,
      },
      {
        next: (result) => {
          if (result.data?.notificationOfficial) {
            onOfficialRef.current(result.data.notificationOfficial);
          }
        },
        error: (error) => {
          console.error("[GraphQL Sub] Error:", error);
        },
        complete: () => {
          console.log("[GraphQL Sub] Completed");
        },
      },
    );

    return () => unsubscribe();
  }, []);
}

/**
 * Subscribe to reputation updates for a specific user
 */
export function useReputationUpdateSubscription(
  userId: string | null,
  onUpdate: (update: any) => void,
) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!userId) return;

    const client = getWSClient();

    const unsubscribe = client.subscribe(
      {
        query: `
          subscription ReputationUpdated($userId: String!) {
            reputationUpdated(userId: $userId) {
              userId
              change
              newReputation
              reason
              timestamp
            }
          }
        `,
        variables: { userId },
      },
      {
        next: (result) => {
          if (result.data?.reputationUpdated) {
            onUpdateRef.current(result.data.reputationUpdated);
          }
        },
        error: (error) => {
          console.error("[GraphQL Sub] Error:", error);
        },
        complete: () => {
          console.log("[GraphQL Sub] Completed");
        },
      },
    );

    return () => unsubscribe();
  }, [userId]);
}

/**
 * Close WebSocket connection (cleanup)
 */
export function closeWSConnection() {
  if (wsClient) {
    try {
      wsClient.dispose();
    } catch (error) {
      console.error("[WebSocket] Error disposing client:", error);
    } finally {
      wsClient = null;
    }
  }
}
