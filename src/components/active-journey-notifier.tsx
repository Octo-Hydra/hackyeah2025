"use client";

/**
 * Active Journey Notifier
 * Listens to Zustand store for active journey changes and displays notification
 */

import { useEffect, useState } from "react";
import { RouteNotification } from "./ActiveRouteNotification";
import { useUser } from "@/store/hooks";
import { useAppStore } from "@/store/app-store";

export function ActiveJourneyNotifier() {
  const user = useUser();
  const notifications = useAppStore((state) => state.notifications);
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render on server or if not mounted yet
  if (!mounted) {
    return null;
  }

  // Don't render if no user or no active journey
  if (!user?.activeJourney) {
    return null;
  }

  const { activeJourney } = user;
  // Don't render if segments are not available or empty
  if (!activeJourney.segments || activeJourney.segments.length === 0) {
    return null;
  }

  const firstSegment = activeJourney.segments[0];
  const lastSegment = activeJourney.segments[activeJourney.segments.length - 1];

  // startTime and expectedEndTime are already in "HH:mm" format
  const startTime = activeJourney.startTime;
  const endTime = activeJourney.expectedEndTime;

  // Calculate total delay from all active notifications
  const totalDelay = notifications.reduce((sum, notification) => {
    return sum + (notification.delayMinutes || 0);
  }, 0);

  return (
    <div className="fixed top-0 left-0 right-0 px-4 pt-4 md:top-16 md:pt-6 pointer-events-none z-[9999]">
      <RouteNotification
        startCity={firstSegment.from.stopName}
        endCity={lastSegment.to.stopName}
        duration={`${startTime} - ${endTime}`}
        delayMinutes={totalDelay > 0 ? totalDelay : undefined}
        segments={activeJourney.segments}
        className="pointer-events-auto"
      />
    </div>
  );
}
