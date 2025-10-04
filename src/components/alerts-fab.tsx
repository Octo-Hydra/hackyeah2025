"use client";

import dynamic from "next/dynamic";

// Load dialog only on client side to avoid SSR issues with leaflet-geosearch
const AddEventDialog = dynamic(
  () =>
    import("@/components/add-event-dialog").then((mod) => ({
      default: mod.AddEventDialog,
    })),
  { ssr: false },
);

export function AlertsFAB() {
  return (
    <div className="fixed bottom-20 right-6 z-[1000] md:hidden">
      <AddEventDialog />
    </div>
  );
}
