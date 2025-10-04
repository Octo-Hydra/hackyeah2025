"use client";

/**
 * Active Journey Notifier
 * Listens to Zustand store for active journey changes and displays notification
 */

import { useEffect, useState } from "react";
import { RouteNotification } from "./ActiveRouteNotification";
import { useUser } from "@/store/hooks";

export function ActiveJourneyNotifier() {
  const user = useUser();
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

  return (
    <div className="fixed top-0 left-0 right-0 px-4 pt-4 md:top-16 md:pt-6 pointer-events-none z-[9999]">
      <RouteNotification
        startCity={activeJourney.startStop.stopName}
        endCity={activeJourney.endStop.stopName}
        duration={`${activeJourney.startTime} - ${activeJourney.expectedEndTime}`}
        className="pointer-events-auto"
      />
    </div>
  );
}
