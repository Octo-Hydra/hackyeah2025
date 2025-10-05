"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { useJourneyIncidents } from "@/hooks/use-journey-incidents";
import { toast } from "sonner";

/**
 * Component that monitors active journey for real-time incidents
 * Automatically subscribes to WebSocket when active journey exists
 */
export function ActiveJourneyMonitor() {
  const user = useAppStore((state) => state.user);
  const activeJourney = user?.activeJourney;

  // Convert active journey segments to format expected by hook
  const segments = activeJourney?.segments.map((seg) => ({
    lineId: seg.lineId,
    lineName: seg.lineName,
    from: { stopName: seg.from.stopName },
    to: { stopName: seg.to.stopName },
  }));

  // Subscribe to incidents for active journey lines
  const { incidents, isConnected } = useJourneyIncidents(segments || []);

  // Show toast when new incident is detected
  useEffect(() => {
    if (incidents.length > 0 && activeJourney) {
      const latestIncident = incidents[incidents.length - 1];

      // Check if this incident affects any of the journey lines
      const incidentLineIds =
        latestIncident.lines?.map((line) => line.id) || [];

      const affectedSegments = activeJourney.segments.filter((seg) =>
        incidentLineIds.includes(seg.lineId),
      );

      if (affectedSegments.length > 0) {
        const affectedLines = affectedSegments
          .map((seg) => seg.lineName)
          .join(", ");

        const delayInfo = latestIncident.delayMinutes
          ? ` (opóźnienie: ${latestIncident.delayMinutes} min)`
          : "";

        toast.error(`🚨 Nowy incydent na linii: ${affectedLines}`, {
          description: `${latestIncident.title}${delayInfo}`,
          duration: 10000, // 10 seconds
        });
      }
    }
  }, [incidents, activeJourney]);

  // Log connection status
  useEffect(() => {
    if (activeJourney && segments && segments.length > 0) {
      if (isConnected) {
        console.log("✅ Active journey monitoring started");
      } else {
        console.log("⚠️ Active journey monitoring disconnected");
      }
    }
  }, [isConnected, activeJourney, segments]);

  // This component doesn't render anything visible
  // It just manages the WebSocket subscription
  return null;
}
