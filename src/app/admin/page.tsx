import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MobileLayout } from "@/components/mobile-layout";
import { isMobileDevice } from "@/lib/user-agent";
import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { CreateIncidentForm } from "@/components/create-incident-form";
import { AdminStatisticsDashboard } from "@/components/admin-statistics-dashboard";
import { IncidentSimulator } from "@/components/incident-simulator";

export const metadata: Metadata = {
  title: "Panel Administratora",
  description:
    "Panel administratora OnTime. Zarządzaj zgłoszeniami użytkowników, weryfikuj alerty i administruj systemem.",
  alternates: {
    canonical: "/admin",
  },
  openGraph: {
    title: "Panel Administratora | OnTime",
    description: "Panel administratora do zarządzania zgłoszeniami i alertami.",
    url: "/admin",
  },
  twitter: {
    title: "Panel Administratora | OnTime",
    description: "Panel administratora do zarządzania zgłoszeniami i alertami.",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin?callbackUrl=/admin");
  }

  // Check if user has admin role
  const userRole = session.user?.role;
  if (userRole !== "ADMIN") {
    redirect("/?error=unauthorized");
  }

  const isMobile = await isMobileDevice();

  return (
    <MobileLayout isMobile={isMobile}>
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
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-bold">Admin Panel</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {session.user?.email}
              </span>
              <Button asChild variant="outline" size="sm">
                <Link href="/user">Profile</Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className=" container mx-auto px-4 py-8 overflow-y-auto max-h-screen md:max-h-none">
          <div className="mb-6">
            <h2 className="mb-2 text-3xl font-bold">Admin Dashboard</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Zarządzaj zgłoszeniami, użytkownikami i systemem
            </p>
          </div>

          {/* Incident Simulator (Test Webhook) */}
          <div className="mb-6">
            <IncidentSimulator />
          </div>

          {/* Incident Creation Form */}
          <div className="mb-6">
            <CreateIncidentForm />
          </div>

          {/* Statistics Dashboard */}
          <div className="mb-6">
            <AdminStatisticsDashboard />
          </div>
        </main>
      </div>
    </MobileLayout>
  );
}
