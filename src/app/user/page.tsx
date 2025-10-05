import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MobileLayout } from "@/components/mobile-layout";
import { isMobileDevice } from "@/lib/user-agent";
import Link from "next/link";
import { 
  User, 
  ArrowLeft, 
  Mail, 
  Calendar, 
  Award,
} from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { EditProfileDialog } from "@/components/edit-profile-dialog";
import { Query } from "@/lib/graphql_request";
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

  // Fetch user data from GraphQL for real stats
  let userData = null;
  try {
    const query = Query();
    const result = await query({
      me: {
        id: true,
        name: true,
        email: true,
        reputation: true,
        trustScore: true,
      },
    });
    userData = result.me;
  } catch (error) {
    console.error("Error fetching user data:", error);
  }

  return (
    <MobileLayout isMobile={isMobile}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Desktop Header */}
        <header className="hidden border-b bg-white dark:bg-gray-950 md:block">
          <div className="container mx-auto flex h-16 items-center px-4">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Powrót do mapy
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <User className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-bold">Mój profil</h1>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="overflow-y-auto max-h-[calc(100vh-3.5rem)] container mx-auto px-4 py-8 md:max-h-[calc(100vh-4rem)]">
          {/* Mobile: Single Column, Desktop: Two Columns */}
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Left Column - Profile & Stats */}
              <div className="space-y-6">
                {/* Profile Card */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
                        {session.user?.name
                          ? session.user.name.charAt(0).toUpperCase()
                          : session.user?.email?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-2xl">
                          {session.user?.name || "Użytkownik"}
                        </CardTitle>
                        <CardDescription>{session.user?.email}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <Mail className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {session.user?.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Imię</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {session.user?.name || "Nie ustawiono"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Członek od</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date().toLocaleDateString("pl-PL")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Stats Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-blue-600" />
                      Statystyki
                    </CardTitle>
                    <CardDescription>
                      Twoja aktywność w aplikacji OnTime
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {userData?.reputation ?? 100}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Reputacja
                        </div>
                      </div>
                      <div className="rounded-lg border p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {userData?.trustScore ? userData.trustScore.toFixed(1) : "1.0"}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Trust Score
                        </div>
                      </div>
                      <div className="rounded-lg border p-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">0</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Raporty
                        </div>
                      </div>
                      <div className="rounded-lg border p-4 text-center">
                        <div className="text-2xl font-bold text-orange-600">0</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Podróże
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Actions & Settings */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Zarządzaj kontem</CardTitle>
                    <CardDescription>
                      Edytuj swój profil OnTime
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <EditProfileDialog currentName={userData?.name || session.user?.name} />
                  </CardContent>
                </Card>

                {/* Account Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Akcje konta</CardTitle>
                    <CardDescription>
                      Zarządzaj swoim kontem OnTime
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SignOutButton className="w-full" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </MobileLayout>
  );
}
