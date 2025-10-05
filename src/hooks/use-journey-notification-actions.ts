"use client";

import { useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import {
  clearJourneyNotificationsOnServer,
  dismissJourneyNotificationOnServer,
} from "@/lib/journey-notifications-api";

export function useJourneyNotificationActions() {
  const dismissNotification = useAppStore((state) => state.dismissNotification);
  const clearNotifications = useAppStore((state) => state.clearNotifications);
  const notificationsCount = useAppStore((state) => state.notifications.length);

  const dismiss = useCallback(
    async (notificationId: string) => {
      dismissNotification(notificationId);

      try {
        await dismissJourneyNotificationOnServer(notificationId);
      } catch (error) {
        console.error("Failed to dismiss journey notification", error);
      }
    },
    [dismissNotification],
  );

  const clear = useCallback(async () => {
    const hadNotifications = notificationsCount > 0;
    clearNotifications();

    if (!hadNotifications) {
      return;
    }

    try {
      await clearJourneyNotificationsOnServer();
    } catch (error) {
      console.error("Failed to clear journey notifications", error);
    }
  }, [clearNotifications, notificationsCount]);

  return {
    dismiss,
    clear,
  } as const;
}
