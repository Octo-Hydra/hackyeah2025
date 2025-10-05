"use client";

import { useEffect, useState } from "react";
import { createClient } from "graphql-ws";

interface IncidentUpdate {
  id: string;
  title: string;
  description?: string;
  kind: string;
  status: "DRAFT" | "PUBLISHED" | "RESOLVED";
  lines?: Array<{ id: string; name: string }>;
  delayMinutes?: number;
}

interface JourneySegment {
  lineId: string;
  lineName: string;
  from: { stopName: string };
  to: { stopName: string };
}

/**
 * Hook to listen for incidents on journey lines via WebSocket
 * Subscribes to all unique lines in the journey
 */
export function useJourneyIncidents(segments: JourneySegment[]) {
  const [incidents, setIncidents] = useState<Map<string, IncidentUpdate[]>>(
    new Map(),
  );
  const [isConnected, setIsConnected] = useState(false);

  // Create stable line IDs string to avoid infinite loop
  const lineIdsString =
    segments
      ?.map((seg) => seg.lineId)
      .filter((id) => id)
      .sort()
      .join(",") || "";

  useEffect(() => {
    if (!lineIdsString) return;

    // Extract unique line IDs
    const uniqueLineIds = Array.from(new Set(lineIdsString.split(",")));

    console.log("🔌 Subscribing to incidents for lines:", uniqueLineIds);

    // Create WebSocket client
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.host}/api/graphql`;

    console.log("🔌 Creating WebSocket client for:", wsUrl);

    const client = createClient({
      url: wsUrl,
      retryAttempts: 5,
      shouldRetry: () => true,
      connectionParams: async () => {
        // Pass cookies for authentication
        return {
          credentials: "include",
        };
      },
      on: {
        opened: (socket) => {
          console.log("✅ WebSocket opened:", socket);
        },
        connected: () => {
          console.log("✅ WebSocket connected successfully");
          setIsConnected(true);
        },
        ping: (received) => {
          console.log("🏓 WebSocket ping:", received);
        },
        pong: (received) => {
          console.log("🏓 WebSocket pong:", received);
        },
        closed: (event: unknown) => {
          const closeEvent = event as CloseEvent;
          console.log("🔌 WebSocket closed:", {
            code: closeEvent.code,
            reason: closeEvent.reason,
            wasClean: closeEvent.wasClean,
          });
          setIsConnected(false);
        },
        error: (error) => {
          console.error("❌ WebSocket error:", error);
          setIsConnected(false);
        },
      },
    });

    const subscriptions: (() => void)[] = [];

    // Subscribe to each line
    uniqueLineIds.forEach((lineId) => {
      console.log(`🔌 Starting subscription for line ${lineId}`);

      const unsubscribe = client.subscribe(
        {
          query: `
            subscription LineIncidents($lineId: ID!) {
              lineIncidentUpdates(lineId: $lineId) {
                id
                title
                description
                kind
                status
                lines {
                  id
                  name
                }
                delayMinutes
              }
            }
          `,
          variables: { lineId },
        },
        {
          next: (data: { data?: { lineIncidentUpdates?: IncidentUpdate } }) => {
            const incident = data.data?.lineIncidentUpdates;
            if (incident) {
              console.log(`🚨 Incident update for line ${lineId}:`, incident);

              setIncidents((prev) => {
                const newMap = new Map(prev);
                const lineIncidents = newMap.get(lineId) || [];

                // Update or add incident
                const existingIndex = lineIncidents.findIndex(
                  (i) => i.id === incident.id,
                );

                if (existingIndex >= 0) {
                  // Update existing
                  lineIncidents[existingIndex] = incident;
                } else {
                  // Add new
                  lineIncidents.push(incident);
                }

                // Remove resolved incidents
                const activeIncidents = lineIncidents.filter(
                  (i) => i.status !== "RESOLVED",
                );

                newMap.set(lineId, activeIncidents);
                return newMap;
              });
            }
          },
          error: (error) => {
            console.error(`❌ Subscription error for line ${lineId}:`, error);
            setIsConnected(false);
          },
          complete: () => {
            console.log(`✅ Subscription completed for line ${lineId}`);
          },
        },
      );

      subscriptions.push(unsubscribe);
    });

    // Cleanup
    return () => {
      console.log("🔌 Unsubscribing from all line incidents");
      subscriptions.forEach((unsub) => unsub());
      client.dispose();
      setIsConnected(false);
    };
  }, [lineIdsString]);

  // Get all incidents across all lines
  const allIncidents = Array.from(incidents.values()).flat();

  // Get incidents affecting specific segment
  const getSegmentIncidents = (lineId: string) => {
    return incidents.get(lineId) || [];
  };

  return {
    incidents: allIncidents,
    incidentsByLine: incidents,
    getSegmentIncidents,
    isConnected,
  };
}
