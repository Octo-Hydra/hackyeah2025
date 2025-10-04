import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { MobileLayout } from "@/components/mobile-layout";
import { isMobileDevice } from "@/lib/user-agent";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Bell, Plus, MapPin } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Moje Alerty",
  description:
    "Zarządzaj swoimi alertami o opóźnieniach transportu publicznego. Przeglądaj aktywne powiadomienia i twórz nowe alerty dla swojej trasy.",
  alternates: {
    canonical: "/alerts",
  },
  openGraph: {
    title: "Moje Alerty | OnTime",
    description:
      "Zarządzaj swoimi alertami o opóźnieniach transportu publicznego w czasie rzeczywistym.",
    url: "/alerts",
  },
  twitter: {
    title: "Moje Alerty | OnTime",
    description:
      "Zarządzaj swoimi alertami o opóźnieniach transportu publicznego w czasie rzeczywistym.",
  },
};

export default async function AlertsPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin?callbackUrl=/alerts");
  }

  const isMobile = await isMobileDevice();

  const mockAlerts = [
    {
      id: 1,
      type: "Korek",
      title: "Duży korek na ulicy Głównej",
      location: "Ul. Główna i 5ta Aleja",
      time: "5 min temu",
      severity: "high",
    },
    {
      id: 2,
      type: "Wypadek",
      title: "Zgłoszono drobną kolizję",
      location: "Autostrada 101 Północ",
      time: "15 min temu",
      severity: "medium",
    },
    {
      id: 3,
      type: "Roboty drogowe",
      title: "Zamknięty pas ruchu",
      location: "Most Śródmieście",
      time: "1 godz. temu",
      severity: "low",
    },
  ];

  return (
    <MobileLayout isMobile={isMobile}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Desktop Header */}
        <header className="hidden border-b bg-white dark:bg-gray-950 md:block">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Bell className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold">Alerty</h1>
            </div>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Nowy alert
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="overflow-y-auto max-h-[calc(100vh-3.5rem)] container mx-auto px-4 py-6 pb-24 md:max-h-[calc(100vh-4rem)] md:pb-6">
          <div className="mx-auto max-w-2xl">
            {/* Stats */}
            <div className="mb-6 grid grid-cols-2 gap-3 md:gap-4">
              <Card>
                <CardContent>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600 md:text-3xl">
                      3
                    </div>
                    <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 md:text-sm">
                      Aktywne
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 md:text-3xl">
                      12
                    </div>
                    <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 md:text-sm">
                      Dzisiaj
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 md:text-3xl">
                      45
                    </div>
                    <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 md:text-sm">
                      Ten tydzień
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alerts List */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">Ostatnie alerty</h2>
              <div className="space-y-3">
                {mockAlerts.map((alert) => (
                  <Card
                    key={alert.id}
                    className="transition-shadow hover:shadow-md"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                alert.severity === "high"
                                  ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                  : alert.severity === "medium"
                                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
                                    : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                              }`}
                            >
                              {alert.type}
                            </span>
                            <span className="text-xs text-gray-500">
                              {alert.time}
                            </span>
                          </div>
                          <CardTitle className="text-base md:text-lg">
                            {alert.title}
                          </CardTitle>
                          <CardDescription className="mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {alert.location}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Button variant="ghost" size="sm" className="w-full">
                        Zobacz na mapie
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Empty State (if no alerts) */}
            {mockAlerts.length === 0 && (
              <Card className="mt-8">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bell className="mb-4 h-12 w-12 text-gray-400" />
                  <h3 className="mb-2 text-lg font-semibold">
                    Nie ma jeszcze alertów
                  </h3>
                  <p className="mb-4 text-center text-sm text-gray-600 dark:text-gray-400">
                    Utwórz swój pierwszy alert, aby pomóc społeczności być na
                    bieżąco
                  </p>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Utwórz alert
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </MobileLayout>
  );
}
