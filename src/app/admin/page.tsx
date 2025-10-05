import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { MobileLayout } from "@/components/mobile-layout";
import { isMobileDevice } from "@/lib/user-agent";
import type { Metadata } from "next";

import { AdminPageContent } from "@/components/admin-page-content";

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
      <AdminPageContent session={session} />
    </MobileLayout>
  );
}
