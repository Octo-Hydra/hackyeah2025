"use client";

import { NotificationsList } from "@/components/notifications-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileLayout } from "@/components/mobile-layout";
import { useIsMobile } from "@/hooks/use-is-mobile";

export default function PWADemoPage() {
  const { isMobile } = useIsMobile();

  return (
    <MobileLayout isMobile={isMobile}>
      <div className="container mx-auto max-w-4xl space-y-8 py-6 px-4 md:py-10">
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
              System automatycznie śledzi Twoje zapisane trasy i powiadamia Cię o:
            </p>
            <ul className="list-inside list-disc space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>🚨 Wypadkach i incydentach na trasie</li>
              <li>⚠️ Utrudnieniach w ruchu i korkach</li>
              <li>🔧 Awariach pojazdów i opóźnieniach</li>
              <li>📍 Zmianach peronów i rozkładów jazdy</li>
              <li>📡 Problemach z siecią transportową</li>
            </ul>
            <p className="text-sm text-gray-600 dark:text-gray-400 pt-2 border-t border-orange-200">
              💡 <strong>Wskazówka:</strong> Dodaj ulubione trasy, aby otrzymywać
              spersonalizowane powiadomienia o zmianach na Twoich codziennych
              przejazdach.
            </p>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
