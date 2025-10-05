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
  ArrowLeft, 
  Shield, 
  Eye, 
  History, 
  BarChart3, 
  Trash2,
  AlertCircle,
  Download
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ustawienia Prywatności",
  description: "Zarządzaj prywatnością i danymi w aplikacji OnTime.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PrivacySettingsPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin?callbackUrl=/user/privacy");
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
                <Shield className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-bold">Ustawienia Prywatności</h1>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="overflow-y-auto max-h-[calc(100vh-3.5rem)] container mx-auto px-4 py-8 md:max-h-[calc(100vh-4rem)]">
          <div className="mx-auto max-w-3xl space-y-6">
            {/* Profile Visibility */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Widoczność Profilu
                </CardTitle>
                <CardDescription>
                  Kontroluj kto może widzieć Twój profil i aktywność
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-visibility">Widoczność profilu</Label>
                  <Select defaultValue="private" disabled>
                    <SelectTrigger id="profile-visibility">
                      <SelectValue placeholder="Wybierz widoczność" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Publiczny - wszyscy mogą zobaczyć</SelectItem>
                      <SelectItem value="private">Prywatny - tylko Ty</SelectItem>
                      <SelectItem value="friends">Przyjaciele - tylko znajomi</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Obecnie Twój profil jest prywatny
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-stats">Pokaż statystyki</Label>
                    <p className="text-sm text-muted-foreground">
                      Pozwól innym zobaczyć Twoje statystyki podróży
                    </p>
                  </div>
                  <Switch id="show-stats" disabled />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-reputation">Pokaż reputację</Label>
                    <p className="text-sm text-muted-foreground">
                      Widoczność Twojej reputacji dla innych użytkowników
                    </p>
                  </div>
                  <Switch id="show-reputation" disabled />
                </div>
              </CardContent>
            </Card>

            {/* Data & History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Historia i Dane
                </CardTitle>
                <CardDescription>
                  Zarządzaj historią swoich podróży i zapisanymi danymi
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="save-history">Zapisuj historię podróży</Label>
                    <p className="text-sm text-muted-foreground">
                      Przechowuj informacje o Twoich trasach
                    </p>
                  </div>
                  <Switch id="save-history" defaultChecked disabled />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="history-duration">Czas przechowywania historii</Label>
                  <Select defaultValue="90" disabled>
                    <SelectTrigger id="history-duration">
                      <SelectValue placeholder="Wybierz okres" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 dni</SelectItem>
                      <SelectItem value="90">90 dni</SelectItem>
                      <SelectItem value="180">6 miesięcy</SelectItem>
                      <SelectItem value="365">1 rok</SelectItem>
                      <SelectItem value="forever">Zawsze</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-2 space-y-2">
                  <Button variant="outline" className="w-full justify-start gap-2" disabled>
                    <Download className="h-4 w-4" />
                    Pobierz moje dane
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2 text-destructive hover:text-destructive" 
                    disabled
                  >
                    <Trash2 className="h-4 w-4" />
                    Usuń historię podróży
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Analytics & Tracking */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Analityka i Śledzenie
                </CardTitle>
                <CardDescription>
                  Pomóż nam ulepszyć aplikację poprzez zbieranie anonimowych danych
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="analytics">Analityka użytkowania</Label>
                    <p className="text-sm text-muted-foreground">
                      Zbieraj anonimowe dane o korzystaniu z aplikacji
                    </p>
                  </div>
                  <Switch id="analytics" defaultChecked disabled />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="crash-reports">Raporty błędów</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatycznie wysyłaj raporty o błędach
                    </p>
                  </div>
                  <Switch id="crash-reports" defaultChecked disabled />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="location-tracking">Lokalizacja w tle</Label>
                    <p className="text-sm text-muted-foreground">
                      Pozwól na dokładniejsze śledzenie podróży
                    </p>
                  </div>
                  <Switch id="location-tracking" disabled />
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-5 w-5" />
                  Strefa Niebezpieczna
                </CardTitle>
                <CardDescription>
                  Nieodwracalne akcje dotyczące Twojego konta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="destructive" 
                  className="w-full justify-start gap-2"
                  disabled
                >
                  <Trash2 className="h-4 w-4" />
                  Usuń wszystkie dane
                </Button>
                <Button 
                  variant="destructive" 
                  className="w-full justify-start gap-2"
                  disabled
                >
                  <Trash2 className="h-4 w-4" />
                  Usuń konto na zawsze
                </Button>
                <p className="text-xs text-muted-foreground">
                  Te akcje są nieodwracalne i spowodują trwałe usunięcie Twoich danych.
                </p>
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
                      Ustawienia prywatności będą wkrótce dostępne. Obecnie możesz 
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
