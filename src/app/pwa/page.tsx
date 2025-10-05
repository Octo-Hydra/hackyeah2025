"use client";

import { NotificationsList } from "@/components/notifications-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Settings, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileLayout } from "@/components/mobile-layout";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useAppStore, type JourneyNotification } from "@/store/app-store";
import { toast } from "sonner";
import { upsertJourneyNotificationOnServer } from "@/lib/journey-notifications-api";
import { useEffect } from "react";

export default function PWADemoPage() {
  const { isMobile } = useIsMobile();
  const notifications = useAppStore((state) => state.notifications);
  const addNotification = useAppStore((state) => state.addNotification);

  const handleDebug = () => {
    console.log("Store notifications:", notifications);
    toast.info(`Powiadomienia w store: ${notifications.length}`);
  };

  const handleAddTest = async () => {
    const testNotification: JourneyNotification = {
      id: `test-${Date.now()}`,
      incidentId: `incident-${Date.now()}`,
      title: "🧪 Testowe powiadomienie",
      description: "To jest testowe powiadomienie dodane ręcznie",
      kind: "DELAY",
      status: "PUBLISHED",
      lineId: "test-line",
      lineName: "Linia Testowa",
      delayMinutes: 15,
      receivedAt: new Date().toISOString(),
    };

    // Add to store (for immediate display)
    addNotification(testNotification);

    // Save to database (for persistence)
    try {
      const persisted = await upsertJourneyNotificationOnServer({
        incidentId: testNotification.incidentId!,
        title: testNotification.title,
        description: testNotification.description ?? undefined,
        kind: testNotification.kind ?? undefined,
        status: testNotification.status as
          | "DRAFT"
          | "PUBLISHED"
          | "RESOLVED"
          | undefined,
        lineId: testNotification.lineId ?? undefined,
        lineName: testNotification.lineName ?? undefined,
        delayMinutes: testNotification.delayMinutes ?? undefined,
      });

      // Update with database ID
      addNotification({ ...persisted, id: persisted.id });
      toast.success("Dodano testowe powiadomienie i zapisano w bazie!");
    } catch (error) {
      console.error("Failed to save test notification:", error);
      toast.error("Dodano tylko lokalnie (nie zapisano w bazie)");
    }
  };

  return (
    <MobileLayout isMobile={isMobile}>
      <div className="overflow-y-auto max-h-screen md:max-h-none container mx-auto max-w-4xl space-y-8 pb-42 pt-6 px-4 md:py-10">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="">
              <div className="flex items-center gap-3">
                <Bell className="h-8 w-8 text-orange-500" />
                <h1 className="text-2xl font-bold">Powiadomienia</h1>
              </div>
              <p className=" text-gray-600 dark:text-gray-400">
                Śledź zmiany i opóźnienia w Twoich trasach
              </p>
            </div>
          </div>
        </div>

        <NotificationsList />

        <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-600" />
              Jak działają powiadomienia?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              System automatycznie śledzi Twoje zapisane trasy i powiadamia Cię
              o:
            </p>
            <ul className="list-inside list-disc space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>🚨 Wypadkach i incydentach na trasie</li>
              <li>⚠️ Utrudnieniach w ruchu i korkach</li>
              <li>🔧 Awariach pojazdów i opóźnieniach</li>
              <li>📍 Zmianach peronów i rozkładów jazdy</li>
              <li>📡 Problemach z siecią transportową</li>
            </ul>
            <p className="text-sm text-gray-600 dark:text-gray-400 pt-2 border-t border-orange-200">
              💡 <strong>Wskazówka:</strong> Dodaj ulubione trasy, aby
              otrzymywać spersonalizowane powiadomienia o zmianach na Twoich
              codziennych przejazdach.
            </p>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
