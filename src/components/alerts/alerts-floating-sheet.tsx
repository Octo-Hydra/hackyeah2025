"use client";

import { useState, useMemo, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Bell,
  MapPin,
  X,
  ChevronUp,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import { useAppStore } from "@/store/app-store";
import { useUser } from "@/store/hooks";
import { useJourneyNotificationActions } from "@/hooks/use-journey-notification-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getDismissedNotificationIds,
  addDismissedNotificationId,
} from "@/lib/dismissed-notifications-storage";

export function AlertsFloatingSheet() {
  const pathname = usePathname();
  const user = useUser();
  const notifications = useAppStore((state) => state.notifications);
  const { dismiss } = useJourneyNotificationActions();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Don't show on /pwa page (notifications page)
  const isOnNotificationsPage = pathname === "/pwa";

  // Filter out only dismissed notifications from localStorage
  const filteredNotifications = useMemo(() => {
    const dismissedIds = new Set(getDismissedNotificationIds());
    return notifications.filter((notif) => !dismissedIds.has(notif.id));
  }, [notifications]);

  const sortedNotifications = useMemo(
    () =>
      [...filteredNotifications].sort((a, b) => {
        const aTime = new Date(a.receivedAt).getTime();
        const bTime = new Date(b.receivedAt).getTime();
        return bTime - aTime;
      }),
    [filteredNotifications],
  );

  const activeCount = sortedNotifications.length;
  const latestNotification = sortedNotifications[0];

  // Don't show if:
  // - No user
  // - No unseen notifications
  // - Hidden by user (X button)
  // - On notifications page
  if (!user || activeCount === 0 || !isVisible || isOnNotificationsPage) {
    return null;
  }

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Add to dismissed list
    addDismissedNotificationId(id);

    // Call hook to update store and backend
    void dismiss(id);

    // If dismissing the last notification, hide the sheet
    if (sortedNotifications.length === 1) {
      setIsVisible(false);
      setIsExpanded(false);
    }
  };

  const handleClose = () => {
    // Just hide the widget, don't mark as seen
    setIsVisible(false);
    setIsExpanded(false);
  };

  return (
    <div
      className={cn(
        "fixed bottom-20 left-4 right-4 z-[99999] transition-all duration-300 ease-out md:bottom-6 md:left-6 md:right-auto md:w-96",
        isExpanded ? "max-h-[70vh]" : "max-h-auto",
      )}
    >
      {/* Compact View */}
      {!isExpanded && latestNotification && (
        <div
          onClick={() => setIsExpanded(true)}
          className="group relative cursor-pointer rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-black/5 transition-all hover:scale-105 hover:shadow-xl dark:bg-gray-900 dark:ring-white/10 backdrop-blur-xl bg-opacity-95 dark:bg-opacity-95"
        >
          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="absolute right-2 top-2 z-10 rounded-full p-1.5 opacity-0 transition-all hover:bg-gray-100 group-hover:opacity-100 dark:hover:bg-gray-800"
            aria-label="Zamknij"
          >
            <X className="h-3.5 w-3.5 text-gray-500" />
          </button>

          {/* Alert icon with pulse animation */}
          <div className="mb-3 flex items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-1 animate-pulse rounded-full bg-red-500 opacity-75 blur-sm" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 shadow-lg">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="flex flex-1 items-center justify-between">
              <span className="text-base font-bold text-gray-900 dark:text-white">
                Aktywne alerty
              </span>
              <Badge variant="destructive" className="ml-2 font-bold shadow-md">
                {activeCount}
              </Badge>
            </div>
          </div>

          {/* Latest notification preview */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {latestNotification.kind && (
                <Badge
                  variant="secondary"
                  className="text-xs font-semibold uppercase"
                >
                  {latestNotification.kind.replaceAll("_", " ")}
                </Badge>
              )}
            </div>
            <p className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 dark:text-white">
              {latestNotification.title}
            </p>
            {latestNotification.description && (
              <p className="line-clamp-1 text-xs text-gray-600 dark:text-gray-400">
                {latestNotification.description}
              </p>
            )}
            {latestNotification.lineName && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                <MapPin className="h-3.5 w-3.5" />
                <span>{latestNotification.lineName}</span>
              </div>
            )}
            {typeof latestNotification.delayMinutes === "number" && (
              <div className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700 dark:bg-red-950/50 dark:text-red-300">
                <span>⏱</span>
                <span>+{latestNotification.delayMinutes} min</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={(e) => handleDismiss(latestNotification.id, e)}
              className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Odrzuć alert
            </button>
            <button
              onClick={() => setIsExpanded(true)}
              className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-blue-100 px-3 py-2 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
            >
              <span>Rozwiń</span>
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Expanded View */}
      {isExpanded && (
        <div className="flex flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10 overflow-hidden backdrop-blur-xl bg-opacity-95 dark:bg-opacity-95">
          {/* Header */}
          <div className="flex items-center justify-between border-b bg-gradient-to-r from-red-50 to-orange-50 px-4 py-3.5 dark:from-red-950/20 dark:to-orange-950/20">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 shadow-md">
                <Bell className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white">
                Alerty na trasie
              </h3>
              <Badge variant="destructive" className="font-bold shadow-sm">
                {activeCount}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-950/30"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>

          {/* Scrollable content */}
          <div className="max-h-[60vh] space-y-2 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent dark:scrollbar-thumb-gray-700">
            {sortedNotifications.map((notification, index) => {
              const receivedLabel = formatDistanceToNow(
                new Date(notification.receivedAt),
                {
                  addSuffix: true,
                  locale: pl,
                },
              );

              return (
                <div
                  key={notification.id}
                  className={cn(
                    "group relative rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-3.5 transition-all hover:scale-[1.02] hover:shadow-md dark:from-gray-800 dark:to-gray-850",
                    index === 0 && "ring-2 ring-red-200 dark:ring-red-900/50",
                  )}
                >
                  {/* Dismiss button */}
                  <button
                    onClick={(e) => handleDismiss(notification.id, e)}
                    className="absolute right-2 top-2 z-10 rounded-full bg-white p-1.5 opacity-0 shadow-sm transition-all hover:bg-red-50 group-hover:opacity-100 dark:bg-gray-900 dark:hover:bg-red-950/30"
                    aria-label="Odrzuć"
                  >
                    <X className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                  </button>

                  <div className="space-y-2 pr-8">
                    {/* Kind and time */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {notification.kind && (
                        <Badge
                          variant="secondary"
                          className="text-xs font-semibold uppercase shadow-sm"
                        >
                          {notification.kind.replaceAll("_", " ")}
                        </Badge>
                      )}
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {receivedLabel}
                      </span>
                    </div>

                    {/* Title */}
                    <p className="text-sm font-bold leading-snug text-gray-900 dark:text-white">
                      {notification.title}
                    </p>

                    {/* Description */}
                    {notification.description && (
                      <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        {notification.description}
                      </p>
                    )}

                    {/* Line info */}
                    {notification.lineName && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{notification.lineName}</span>
                      </div>
                    )}

                    {/* Delay info */}
                    {typeof notification.delayMinutes === "number" && (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 shadow-sm dark:bg-red-950/50 dark:text-red-300">
                        <span>⏱</span>
                        <span>Opóźnienie: {notification.delayMinutes} min</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 dark:from-gray-800 dark:to-gray-850">
            <button
              onClick={() => setIsExpanded(false)}
              className="w-full text-center text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              Zwiń <ChevronDown className="ml-1 inline h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
