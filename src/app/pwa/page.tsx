import { InstallPrompt } from "@/components/install-prompt";
import { PushNotificationManager } from "@/components/push-notification-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, MapPin, Bell, Zap } from "lucide-react";

export default function PWADemoPage() {
  return (
    <div className="container mx-auto max-w-4xl space-y-8 py-10">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Progressywna aplikacja webowa</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Zainstaluj naszą aplikację i korzystaj z obsługi offline,
          powiadomień oraz dodatkowych funkcji.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <InstallPrompt />
        <PushNotificationManager />
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Funkcje PWA</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Instalacja na urządzeniu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Dodaj aplikację do ekranu głównego i korzystaj z niej jak z
                natywnego programu.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Powiadomienia push
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Otrzymuj alerty o ruchu drogowym, zagrożeniach i wydarzeniach w
                Twojej okolicy w czasie rzeczywistym.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Obsługa geolokalizacji
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Otrzymuj alerty zależne od lokalizacji i nawiguj dzięki GPS w
                czasie rzeczywistym.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Aktualizacje w czasie rzeczywistym
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Obsługa WebSocketów zapewnia bieżące dane o ruchu i natychmiastowe
                powiadomienia.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Idealne dla aplikacji podobnych do Yanosika</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Ta konfiguracja PWA świetnie sprawdza się w aplikacjach nawigacyjnych
            i ostrzegających, takich jak Yanosik:
          </p>
          <ul className="list-inside list-disc space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>📱 Instalacja na urządzeniach mobilnych (iOS i Android)</li>
            <li>
              🔔 Powiadomienia push o fotoradarach, kontrolach i zagrożeniach
            </li>
            <li>📍 Śledzenie lokalizacji w czasie rzeczywistym</li>
            <li>🔌 Obsługa WebSocketów dla aktualizacji na żywo</li>
            <li>🗺️ Integracja z mapami gotowa do użycia</li>
            <li>⚡ Szybkie działanie jak w aplikacji natywnej</li>
            <li>🌐 Działa offline dzięki danym w pamięci podręcznej</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
