import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { SignOutButton } from "@/components/sign-out-button";
import { MobileLayout } from "@/components/mobile-layout";
import { isMobileDevice } from "@/lib/user-agent";
import { LayoutDashboard, User, Mail, Calendar, MapPin, Bell, ActivityIcon, Award } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin?callbackUrl=/dashboard");
  }

  const isMobile = await isMobileDevice();

  return (
    <MobileLayout isMobile={isMobile}>
      <div className="min-h-screen bg-background">
        <header className="hidden border-b bg-card md:block">
          <div className="container mx-auto flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <LayoutDashboard className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold">Panel</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{session.user?.email}</span>
              <SignOutButton size="sm" showIcon />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto max-h-[calc(100vh-2rem)] overflow-y-auto px-4 py-8 pb-24 md:px-6 md:pb-8">
          <div className="mx-auto max-w-4xl space-y-8">
            {/* Welcome Section */}
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">
                Witaj ponownie, {session.user?.name || "Użytkowniku"}!
              </h2>
              <p className="text-muted-foreground">Oto przegląd Twojej aktywności i najważniejsze informacje</p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-2">
                <CardContent className="">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Aktywne podróże</p>
                      <p className="text-4xl font-bold tracking-tight">12</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-chart-1/10">
                      <MapPin className="h-6 w-6 text-chart-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardContent className="">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Zebrane punkty</p>
                      <p className="text-4xl font-bold tracking-tight text-green-600">74</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-chart-4/10">
                      <Award className="h-6 w-6 text-chart-3" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardContent className="">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Utworzone alerty</p>
                      <p className="text-4xl font-bold tracking-tight">5</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-chart-2/10">
                      <Bell className="h-6 w-6 text-chart-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* User Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Informacje o koncie</CardTitle>
                <CardDescription>Twoje dane osobowe i informacje o koncie</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-start gap-4 rounded-lg border bg-muted/50 p-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Imię</p>
                      <p className="text-sm text-muted-foreground">{session.user?.name || "Nie ustawiono"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 rounded-lg border bg-muted/50 p-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Email</p>
                      <p className="text-sm text-muted-foreground">{session.user?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 rounded-lg border bg-muted/50 p-2 md:col-span-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Członek od</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date().toLocaleDateString("pl-PL", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Szybkie akcje</CardTitle>
                <CardDescription>Zarządzaj swoim kontem i ustawieniami</CardDescription>
              </CardHeader>
              <CardContent>
                <SignOutButton className="w-full md:w-auto" />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </MobileLayout>
  )
}
