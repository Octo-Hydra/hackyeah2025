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
import { User, ArrowLeft, Mail, Calendar, Shield } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Desktop Header */}
        <header className="hidden border-b bg-white dark:bg-gray-950 md:block">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
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
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {session.user?.email}
              </span>
              <SignOutButton size="sm" className="" showIcon />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="overflow-y-auto max-h-[calc(100vh-3.5rem)] container mx-auto px-4 py-8 md:max-h-[calc(100vh-4rem)]">
          <div className="mx-auto max-w-2xl">
            {/* Profile Card */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
                    {session.user?.name
                      ? session.user.name.charAt(0).toUpperCase()
                      : session.user?.email?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <CardTitle className="text-2xl">
                      {session.user?.name || "Użytkownik"}
                    </CardTitle>
                    <CardDescription>{session.user?.email}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <Mail className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {session.user?.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <User className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium">Imię</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {session.user?.name || "Nie ustawiono"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <Calendar className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium">Członek od</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date().toLocaleDateString("pl-PL")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Szybkie akcje</CardTitle>
                <CardDescription>
                  Zarządzaj swoim kontem i preferencjami
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {session.user?.role === "ADMIN" && (
                  <Button
                    asChild
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Link href="/admin">
                      <Shield className="mr-2 h-4 w-4" />
                      Panel administratora
                    </Link>
                  </Button>
                )}
                <Button className="w-full justify-start" variant="outline">
                  Edytuj profil
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  Ustawienia powiadomień
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  Ustawienia prywatności
                </Button>
              </CardContent>
            </Card>

            {/* Sign Out */}
            <Card>
              <CardHeader>
                <CardTitle>Akcje konta</CardTitle>
              </CardHeader>
              <CardContent>
                <SignOutButton />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </MobileLayout>
  );
}
