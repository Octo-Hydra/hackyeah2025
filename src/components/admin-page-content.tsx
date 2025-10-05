"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";
import type { Session } from "next-auth";

import { AdminStatisticsDashboard } from "@/components/admin-statistics-dashboard";
import { IncidentSimulator } from "@/components/incident-simulator";
import { ModeratorQueueDashboard } from "@/components/moderator-queue-dashboard";
import { AdminMenu } from "@/components/admin-menu";

interface AdminPageContentProps {
  session: Session;
}

export function AdminPageContent({ session }: AdminPageContentProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Desktop Header */}
      <header className="hidden border-b z-50 bg-white right-0 left-0 dark:bg-gray-950 md:block fixed">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Map
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400 hidden lg:inline">
              {session.user?.email}
            </span>
            <AdminMenu session={session} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:pt-24 pb-12 overflow-y-auto max-h-screen md:max-h-none">
        <div className="mb-6">
          <h2 className="mb-2 text-3xl font-bold">Admin Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Zarządzaj zgłoszeniami, użytkownikami i systemem
          </p>
        </div>

        {/* Moderator Queue - Pending User Reports */}
        <div className="mb-6">
          <ModeratorQueueDashboard />
        </div>

        {/* Incident Simulator (Test Webhook) */}
        <div className="mb-6">
          <IncidentSimulator />
        </div>

        {/* Statistics Dashboard */}
        <div className="mb-6">
          <AdminStatisticsDashboard />
        </div>
      </main>
    </div>
  );
}
