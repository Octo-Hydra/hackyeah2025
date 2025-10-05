import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { MobileLayout } from "@/components/mobile-layout";
import { isMobileDevice } from "@/lib/user-agent";
import { UserProfileContent } from "@/components/user-profile-content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profil Użytkownika",
  description:
    "Zarządzaj swoim profilem OnTime. Sprawdź swoje statystyki, zarządzaj kontem i zmień ustawienia.",
  alternates: {
    canonical: "/user",
  },
  openGraph: {
    title: "Profil Użytkownika | OnTime",
    description: "Zarządzaj swoim profilem i ustawieniami konta OnTime.",
    url: "/user",
  },
  twitter: {
    title: "Profil Użytkownika | OnTime",
    description: "Zarządzaj swoim profilem i ustawieniami konta OnTime.",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function UserProfilePage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin?callbackUrl=/user");
  }

  // Redirect admins to admin panel - they shouldn't access user profile
  if (session.user?.role === "ADMIN") {
    redirect("/admin");
  }

  const isMobile = await isMobileDevice();

  return (
    <MobileLayout isMobile={isMobile}>
      <UserProfileContent session={session} />
    </MobileLayout>
  );
}
