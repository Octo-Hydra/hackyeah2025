"use client";

import { Map } from "@/components/map";
import { Button } from "@/components/ui/button";
import { MobileLayout } from "@/components/mobile-layout";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Plus } from "lucide-react";
import Image from "next/image";

export default function HomePage() {
  const { data: session, status } = useSession();

  return (
    <MobileLayout>
      <div className="flex h-screen flex-col">
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
        <main className="relative flex-1">
          <Map className="h-full w-full" />

          {/* Floating Action Button - Mobile */}
          {session && (
            <button
              className="absolute bottom-20 right-4 z-[1000] flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:scale-95 md:hidden"
              aria-label="Report Alert"
            >
              <Plus className="h-6 w-6" />
            </button>
          )}

          {/* Floating Info Card - Desktop & Tablet */}
          <div className="absolute bottom-4 left-4 right-4 z-[1000] mx-auto hidden max-w-md rounded-lg border bg-white/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:bg-gray-950/95 dark:supports-[backdrop-filter]:bg-gray-950/80 md:left-auto md:right-4 md:block">
            <h2 className="mb-2 text-lg font-semibold">
              Real-time Navigation & Alerts
            </h2>
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
              View live traffic updates, road conditions, and community alerts
              on the map.
            </p>
            {!session && (
              <Button asChild className="w-full" size="sm">
                <Link href="/auth/signin">Sign in to report alerts</Link>
              </Button>
            )}
          </div>

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
