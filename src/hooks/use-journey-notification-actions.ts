"use client";

import { useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import {
  clearJourneyNotificationsOnServer,
  dismissJourneyNotificationOnServer,
} from "@/lib/journey-notifications-api";
import {
  addDismissedNotificationId,
  clearDismissedNotifications,
} from "@/lib/dismissed-notifications-storage";

export function useJourneyNotificationActions() {
  const dismissNotification = useAppStore((state) => state.dismissNotification);
  const clearNotifications = useAppStore((state) => state.clearNotifications);
  const notificationsCount = useAppStore((state) => state.notifications.length);

  const dismiss = useCallback(
    async (notificationId: string) => {
      // Save to localStorage first (immediate effect)
      addDismissedNotificationId(notificationId);

      // Remove from store
      dismissNotification(notificationId);

      try {
        // Dismiss on server
        await dismissJourneyNotificationOnServer(notificationId);
      } catch (error) {
        console.error("Failed to dismiss journey notification", error);
      }
    },
    [dismissNotification]
  );

  const clear = useCallback(async () => {
    const hadNotifications = notificationsCount > 0;

    // Clear localStorage
    clearDismissedNotifications();

    // Clear store
    clearNotifications();

    if (!hadNotifications) {
      return;
    }

    try {
      // Clear on server
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
