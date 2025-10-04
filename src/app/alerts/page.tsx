import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Bell, Plus, MapPin } from "lucide-react";
import Image from "next/image";
import { AlertsFAB } from "@/components/alerts-fab";

export default async function AlertsPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin?callbackUrl=/alerts");
  }

  const mockAlerts = [
    {
      id: 1,
      type: "Traffic",
      title: "Heavy traffic on Main St",
      location: "Main St & 5th Ave",
      time: "5 min ago",
      severity: "high",
    },
    {
      id: 2,
      type: "Accident",
      title: "Minor collision reported",
      location: "Highway 101 North",
      time: "15 min ago",
      severity: "medium",
    },
    {
      id: 3,
      type: "Road Work",
      title: "Lane closure",
      location: "Downtown Bridge",
      time: "1 hour ago",
      severity: "low",
    },
  ];

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Mobile Header */}
        <header className="border-b bg-white dark:bg-gray-950">
          <div className="flex h-14 items-center justify-between px-4 md:h-16">
            <div className="flex items-center gap-2">
              <Image
                src="/apple-touch-icon.png"
                alt="OnTime"
                width={28}
                height={28}
                className="rounded-lg md:hidden"
              />
              <Bell className="hidden h-6 w-6 text-blue-600 md:block" />
              <h1 className="text-lg font-bold md:text-xl">Alerts</h1>
            </div>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Alert</span>
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
          <div className="mx-auto max-w-2xl">
            {/* Stats */}
            <div className="mb-6 grid grid-cols-3 gap-3 md:gap-4">
              <Card>
                <CardContent className="pt-4 md:pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600 md:text-3xl">
                      3
                    </div>
                    <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 md:text-sm">
                      Active
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 md:pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 md:text-3xl">
                      12
                    </div>
                    <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 md:text-sm">
                      Today
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 md:pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 md:text-3xl">
                      45
                    </div>
                    <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 md:text-sm">
                      This Week
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alerts List */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">Recent Alerts</h2>
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
                        View on Map
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
                  <h3 className="mb-2 text-lg font-semibold">No alerts yet</h3>
                  <p className="mb-4 text-center text-sm text-gray-600 dark:text-gray-400">
                    Create your first alert to help the community stay informed
                  </p>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Alert
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </main>

        {/* Floating Action Button (FAB) - Mobile only */}
        <AlertsFAB />
      </div>
    </MobileLayout>
  );
}
