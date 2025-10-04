"use client";

import dynamic from "next/dynamic";

// Load dialog only on client side to avoid SSR issues with leaflet-geosearch
const AddJourneyDialog = dynamic(
  () =>
    import("@/components/add-journey-dialog").then((mod) => ({
      default: mod.AddJourneyDialog,
    })),
  { ssr: false },
);

export function DashboardFAB() {
  return (
    <div className="fixed bottom-20 right-6 z-[1000] md:hidden">
      <AddJourneyDialog />
    </div>
  );
}
