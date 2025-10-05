"use client";

import { useEffect } from "react";
import { useAppStore, type JourneyNotification } from "@/store/app-store";
import { useJourneyIncidents } from "@/hooks/use-journey-incidents";

import {
  clearJourneyNotificationsOnServer,
  upsertJourneyNotificationOnServer,
} from "@/lib/journey-notifications-api";

/**
 * Component that monitors active journey for real-time incidents
 * Automatically subscribes to WebSocket when active journey exists
 */
export function ActiveJourneyMonitor() {
  const user = useAppStore((state) => state.user);
  const addNotification = useAppStore((state) => state.addNotification);
  const clearNotifications = useAppStore((state) => state.clearNotifications);
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
    if (!activeJourney) {
      const hadNotifications = useAppStore.getState().notifications.length > 0;
      clearNotifications();

      if (hadNotifications) {
        void (async () => {
          try {
            await clearJourneyNotificationsOnServer();
          } catch (error) {
            console.error(
              "Failed to clear journey notifications on server",
              error,
            );
          }
        })();
      }
      return;
    }

    if (incidents.length === 0) {
      return;
    }

    incidents.forEach((incident) => {
      const { notifications, dismissedNotificationIds } =
        useAppStore.getState();

      if (dismissedNotificationIds.includes(incident.id)) {
        return;
      }

      const existing = notifications.find(
        (notification) => notification.id === incident.id,
      );

      let lineId = incident.lines?.[0]?.id ?? null;
      let lineName = incident.lines?.[0]?.name ?? null;

      if (!lineId || !lineName) {
        const matchingSegment = activeJourney.segments.find((segment) => {
          if (lineId && segment.lineId === lineId) {
            return true;
          }
          if (!incident.lines) {
            return false;
          }
          return incident.lines.some((line) => line.id === segment.lineId);
        });

        if (matchingSegment) {
          lineId = lineId ?? matchingSegment.lineId;
          lineName = lineName ?? matchingSegment.lineName;
        }
      }

      if ((!lineId || !lineName) && activeJourney.segments.length > 0) {
        lineId = lineId ?? activeJourney.segments[0].lineId;
        lineName = lineName ?? activeJourney.segments[0].lineName;
      }

      const incoming: JourneyNotification = {
        id: incident.id,
        incidentId: incident.id,
        title: incident.title,
        description: incident.description ?? null,
        kind: incident.kind ?? null,
        status: incident.status,
        lineId,
        lineName,
        delayMinutes: incident.delayMinutes ?? null,
        receivedAt: existing?.receivedAt ?? new Date().toISOString(),
      };

      addNotification(incoming);

      const shouldPersist =
        !existing ||
        existing.title !== incoming.title ||
        existing.description !== incoming.description ||
        existing.kind !== incoming.kind ||
        existing.status !== incoming.status ||
        existing.lineId !== incoming.lineId ||
        existing.lineName !== incoming.lineName ||
        existing.delayMinutes !== incoming.delayMinutes;

      if (shouldPersist) {
        void (async () => {
          try {
            const persisted = await upsertJourneyNotificationOnServer({
              incidentId: incident.id,
              title: incident.title,
              description: incident.description ?? null,
              kind: incident.kind ?? null,
              status: incident.status ?? null,
              lineId,
              lineName,
              delayMinutes: incident.delayMinutes ?? null,
            });

            addNotification({
              ...persisted,
              id: persisted.id,
              incidentId: persisted.incidentId ?? persisted.id,
            });
          } catch (error) {
            console.error("Failed to persist journey notification", error);
          }
        })();
      }

      // if (!existing) {
      //   const affectedLines =
      //     incident.lines?.map((line) => line.name).filter(Boolean) ?? [];

      //   const delayInfo = incident.delayMinutes
      //     ? ` (opóźnienie: ${incident.delayMinutes} min)`
      //     : "";

      //   const lineLabel =
      //     affectedLines.length > 0
      //       ? affectedLines.join(", ")
      //       : lineName
      //         ? `${lineName}`
      //         : "Trasa";

      //   toast.error(`🚨 Nowy incydent na linii: ${lineLabel}`, {
      //     description: `${incident.title}${delayInfo}`,
      //     duration: 10000,
      //   });
      // }
    });
  }, [incidents, activeJourney, addNotification, clearNotifications]);

  return null;
}
