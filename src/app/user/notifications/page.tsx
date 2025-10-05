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
import { ArrowLeft, Bell, Mail, MessageSquare, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ustawienia Powiadomień",
  description: "Zarządzaj swoimi powiadomieniami w aplikacji OnTime.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function NotificationSettingsPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin?callbackUrl=/user/notifications");
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
                <Link href="/user">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Powrót do profilu
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <Bell className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-bold">Ustawienia Powiadomień</h1>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="overflow-y-auto max-h-[calc(100vh-3.5rem)] container mx-auto px-4 py-8 md:max-h-[calc(100vh-4rem)]">
          <div className="mx-auto max-w-3xl space-y-6">
            {/* Push Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Powiadomienia Push
                </CardTitle>
                <CardDescription>
                  Otrzymuj powiadomienia bezpośrednio w przeglądarce lub aplikacji
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push-enabled">Włącz powiadomienia push</Label>
                    <p className="text-sm text-muted-foreground">
                      Otrzymuj natychmiastowe alerty o incydentach
                    </p>
                  </div>
                  <Switch id="push-enabled" disabled />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push-delays">Opóźnienia na trasie</Label>
                    <p className="text-sm text-muted-foreground">
                      Powiadom gdy na Twojej trasie pojawi się opóźnienie
                    </p>
                  </div>
                  <Switch id="push-delays" disabled />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push-incidents">Nowe incydenty</Label>
                    <p className="text-sm text-muted-foreground">
                      Powiadom o nowych incydentach w pobliżu
                    </p>
                  </div>
                  <Switch id="push-incidents" disabled />
                </div>
              </CardContent>
            </Card>

            {/* Email Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Powiadomienia Email
                </CardTitle>
                <CardDescription>
                  Otrzymuj podsumowania i ważne informacje na email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-enabled">Powiadomienia email</Label>
                    <p className="text-sm text-muted-foreground">
                      Włącz powiadomienia wysyłane na email
                    </p>
                  </div>
                  <Switch id="email-enabled" defaultChecked disabled />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-digest">Dzienne podsumowanie</Label>
                    <p className="text-sm text-muted-foreground">
                      Otrzymuj codzienne podsumowanie incydentów
                    </p>
                  </div>
                  <Switch id="email-digest" disabled />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-marketing">Newsletter</Label>
                    <p className="text-sm text-muted-foreground">
                      Nowości i aktualizacje OnTime
                    </p>
                  </div>
                  <Switch id="email-marketing" disabled />
                </div>
              </CardContent>
            </Card>

            {/* Journey Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Powiadomienia podczas podróży
                </CardTitle>
                <CardDescription>
                  Alerty związane z Twoją aktywną trasą
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="journey-delays">Opóźnienia</Label>
                    <p className="text-sm text-muted-foreground">
                      Informuj o opóźnieniach na linii którą podróżujesz
                    </p>
                  </div>
                  <Switch id="journey-delays" defaultChecked disabled />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="journey-alternative">Alternatywne trasy</Label>
                    <p className="text-sm text-muted-foreground">
                      Sugeruj szybsze trasy gdy pojawią się problemy
                    </p>
                  </div>
                  <Switch id="journey-alternative" defaultChecked disabled />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="journey-arrival">Zbliżasz się do celu</Label>
                    <p className="text-sm text-muted-foreground">
                      Powiadom 5 minut przed dotarciem do celu
                    </p>
                  </div>
                  <Switch id="journey-arrival" disabled />
                </div>
              </CardContent>
            </Card>

            {/* Info Banner */}
            <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Funkcja w przygotowaniu
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Ustawienia powiadomień będą wkrótce dostępne. Obecnie możesz 
                      przeglądać dostępne opcje, ale zmiany nie są jeszcze zapisywane.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </MobileLayout>
  );
}
