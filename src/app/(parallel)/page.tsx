"use client";

import { Map } from "@/components/map";
import { Button } from "@/components/ui/button";
import { MobileLayout } from "@/components/mobile-layout";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import { SignOutButton } from "@/components/sign-out-button";
import { AlertsFloatingSheet } from "@/components/alerts/alerts-floating-sheet";

// Load dialogs only on client side to avoid SSR issues with leaflet-geosearch
const AddEventDialog = dynamic(
  () =>
    import("@/components/add-event-dialog").then((mod) => ({
      default: mod.AddEventDialog,
    })),
  { ssr: false },
);

const AddJourneyDialog = dynamic(
  () =>
    import("@/components/add-journey-dialog").then((mod) => ({
      default: mod.AddJourneyDialog,
    })),
  { ssr: false },
);

export default function HomePage() {
  const { data: session, status } = useSession();
  const { isMobile } = useIsMobile();

  // Prevent body scroll on mobile
  useEffect(() => {
    if (!isMobile) return;

    // Save original styles
    const originalStyle = window.getComputedStyle(document.body).overflow;
    const originalPosition = window.getComputedStyle(document.body).position;
    const originalHeight = window.getComputedStyle(document.body).height;

    // Lock scroll on mount for mobile
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100dvh";
    document.body.style.touchAction = "none";

    // Restore on unmount
    return () => {
      document.body.style.overflow = originalStyle;
      document.body.style.position = originalPosition;
      document.body.style.width = "";
      document.body.style.height = originalHeight;
      document.body.style.touchAction = "";
    };
  }, [isMobile]);

  return (
    <MobileLayout className="h-screen-mobile no-overscroll" isMobile={isMobile}>
      <div className="flex h-full flex-col overflow-hidden">
        {/* Desktop Header - Hidden on mobile */}
        <header className="z-10 hidden border-b bg-white shadow-sm dark:bg-gray-950 md:block">
          <div className="flex h-16 items-center justify-between px-4">
            <Link
              href="/"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <Image
                src="/apple-touch-icon.png"
                alt="OnTime"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <h1 className="text-xl font-bold">OnTime</h1>
            </Link>

            <div className="flex items-center gap-2">
              {status === "loading" ? (
                <div className="h-8 w-24 animate-pulse rounded-md bg-gray-200" />
              ) : session ? (
                <>
                  <span className="hidden text-sm text-gray-600 dark:text-gray-400 lg:inline">
                    {session.user?.email}
                  </span>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/user">Profil</Link>
                  </Button>
                  {session.user?.role === "ADMIN" && (
                    <Button asChild variant="outline" size="sm">
                      <Link href="/admin">Admin</Link>
                    </Button>
                  )}
                  <SignOutButton size="sm" className="" showIcon />
                </>
              ) : (
                <Button asChild size="sm">
                  <Link href="/auth/signin">Zaloguj</Link>
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Header - Compact */}
        {/* <header className="z-10 border-b bg-white shadow-sm dark:bg-gray-950 md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Image
                src="/apple-touch-icon.png"
                alt="OnTime"
                width={28}
                height={28}
                className="rounded-lg"
              />
              <h1 className="text-lg font-bold">OnTime</h1>
            </Link>
          </div>
        </header> */}

        {/* Map */}
        <main className="relative flex-1 overflow-hidden touch-ui">
          <div className="absolute inset-0">
            <Map className="h-full w-full" />
          </div>

          {/* Action Buttons - Only show when logged in */}
          {session && (
            <div className="absolute bottom-8 right-6 z-[1000] flex flex-col gap-3 md:bottom-6">
              <AddJourneyDialog />
              <AddEventDialog />
            </div>
          )}

          {/* Floating Alerts Sheet */}
          <AlertsFloatingSheet />
        </main>
      </div>
    </MobileLayout>
  );
}
