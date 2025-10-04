"use client";

import { Map } from "@/components/map";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Navigation, User, Shield } from "lucide-react";
import { AddEventDialog } from "@/components/add-event-dialog";

export default function HomePage() {
  const { data: session, status } = useSession();

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="z-10 border-b bg-white shadow-sm dark:bg-gray-950">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Navigation className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold">HackYeah 2025</h1>
          </div>

          <div className="flex items-center gap-2">
            {status === "loading" ? (
              <div className="h-8 w-24 animate-pulse rounded-md bg-gray-200" />
            ) : session ? (
              <>
                <span className="hidden text-sm text-gray-600 dark:text-gray-400 sm:inline">
                  {session.user?.email}
                </span>
                <Button asChild variant="outline" size="sm">
                  <Link href="/user">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/moderator">
                    <Shield className="mr-2 h-4 w-4" />
                    Moderator
                  </Link>
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

      {/* Map */}
      <main className="relative flex-1">
        <Map className="h-full w-full" />

        {/* Add Event Button - Only show when logged in */}
        {session && (
          <div className="absolute bottom-6 right-6 z-[1000]">
            <AddEventDialog />
          </div>
        )}
      </main>
    </div>
  );
}
