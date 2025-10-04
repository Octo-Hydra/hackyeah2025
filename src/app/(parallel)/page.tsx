"use client";

import { Map } from "@/components/map";
import { Button } from "@/components/ui/button";
import { MobileLayout } from "@/components/mobile-layout";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Navigation, User, Shield } from "lucide-react";
import { AddEventDialog } from "@/components/add-event-dialog";
import { AddJourneyDialog } from "@/components/add-journey-dialog";
import { Plus } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";

export default function HomePage() {
  const { data: session, status } = useSession();

  // Prevent body scroll on mobile
  useEffect(() => {
    // Save original styles
    const originalStyle = window.getComputedStyle(document.body).overflow;
    const originalPosition = window.getComputedStyle(document.body).position;

    // Lock scroll on mount
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";

    // Restore on unmount
    return () => {
      document.body.style.overflow = originalStyle;
      document.body.style.position = originalPosition;
      document.body.style.width = "";
      document.body.style.height = "";
    };
  }, []);

  return (
    <MobileLayout className="h-screen-mobile no-overscroll">
      <div className="flex h-full flex-col overflow-hidden">
        {/* Desktop Header - Hidden on mobile */}
        <header className="z-10 hidden border-b bg-white shadow-sm dark:bg-gray-950 md:block">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <Image
                src="/apple-touch-icon.png"
                alt="OnTime"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <h1 className="text-xl font-bold">OnTime</h1>
            </div>

            <div className="flex items-center gap-2">
              {status === "loading" ? (
                <div className="h-8 w-24 animate-pulse rounded-md bg-gray-200" />
              ) : session ? (
                <>
                  <span className="hidden text-sm text-gray-600 dark:text-gray-400 lg:inline">
                    {session.user?.email}
                  </span>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/user">Profile</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/moderator">Moderator</Link>
                  </Button>
                </>
              ) : (
                <Button asChild size="sm">
                  <Link href="/auth/signin">Sign In</Link>
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Header - Compact */}
        <header className="z-10 border-b bg-white shadow-sm dark:bg-gray-950 md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Image
                src="/apple-touch-icon.png"
                alt="OnTime"
                width={28}
                height={28}
                className="rounded-lg"
              />
              <h1 className="text-lg font-bold">OnTime</h1>
            </div>
            {!session && (
              <Button asChild size="sm" variant="ghost">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
            )}
          </div>
        </header>

        {/* Map */}
        <main className="relative flex-1 overflow-hidden">
          <Map className="h-full w-full" />

          {/* Action Buttons - Only show when logged in */}
          {session && (
            <div className="absolute bottom-6 right-6 z-[1000] flex flex-col gap-3">
              <AddJourneyDialog />
              <AddEventDialog />
            </div>
          )}

          {/* Welcome Card - Mobile only, shows when not authenticated */}
          {!session && (
            <div className="absolute bottom-20 left-4 right-4 z-[1000] rounded-lg border bg-white/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:bg-gray-950/95 dark:supports-[backdrop-filter]:bg-gray-950/80 md:hidden">
              <h2 className="mb-2 text-base font-semibold">
                Welcome to OnTime! 👋
              </h2>
              <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                No more waiting, just on-time arrivals!
              </p>
              <Button asChild className="w-full" size="sm">
                <Link href="/auth/signin">Sign in to get started</Link>
              </Button>
            </div>
          )}
        </main>
      </div>
    </MobileLayout>
  );
}
