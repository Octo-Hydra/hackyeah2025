import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { signOut } from "@/auth";
import { MobileLayout } from "@/components/mobile-layout";
import { isMobileDevice } from "@/lib/user-agent";
import { LayoutDashboard, User, Mail, Calendar } from "lucide-react";
import Image from "next/image";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin?callbackUrl=/dashboard");
  }

  const isMobile = await isMobileDevice();

  return (
    <MobileLayout isMobile={isMobile}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Desktop Header */}
        <header className="hidden border-b bg-white dark:bg-gray-950 md:block">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold">Panel</h1>
            </div>
          </div>
        </header>

        {/* Mobile Header */}
        {/* <header className="border-b bg-white dark:bg-gray-950 md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Image
                src="/apple-touch-icon.png"
                alt="OnTime"
                width={28}
                height={28}
                className="rounded-lg"
              />
              <h1 className="text-lg font-bold">Panel</h1>
            </div>
          </div>
        </header> */}

        {/* Main Content */}
        <main className="overflow-y-auto max-h-[calc(100vh-2rem)] container mx-auto px-4 py-6 pb-24 md:pb-6">
          <div className="mx-auto max-w-2xl space-y-6">
            {/* Welcome Card */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Witaj ponownie, {session.user?.name || "Użytkowniku"}!
                </CardTitle>
                <CardDescription>
                  Oto przegląd Twojej aktywności
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  <Mail className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {session.user?.email}
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

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <Card>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">12</div>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Aktywne podróże
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">5</div>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Utworzone alerty
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Szybkie akcje</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  action={async () => {
                    "use server";
                    await signOut();
                  }}
                >
                  <Button
                    type="submit"
                    variant="destructive"
                    className="w-full"
                  >
                    Wyloguj się
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </MobileLayout>
  );
}
