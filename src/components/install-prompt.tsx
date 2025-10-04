"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone } from "lucide-react";

export function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if iOS
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        !(window as any).MSStream,
    );

    // Check if already installed
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window.navigator as any).standalone,
    );

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  // Don't show if already installed
  if (isStandalone) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Zainstaluj aplikację
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isIOS ? (
          <div className="space-y-2 text-sm">
            <p>Aby zainstalować tę aplikację na urządzeniu iOS:</p>
            <ol className="list-inside list-decimal space-y-1 text-gray-600 dark:text-gray-400">
              <li>
                Stuknij w przycisk udostępniania{" "}
                <span className="inline-flex items-center rounded bg-gray-200 px-1.5 py-0.5 text-xs dark:bg-gray-800">
                  ⎋
                </span>
              </li>
              <li>
                Przewiń w dół i wybierz{" "}
                <span className="font-semibold">
                  &ldquo;Dodaj do ekranu początkowego&rdquo;
                </span>{" "}
                <span className="inline-flex items-center rounded bg-gray-200 px-1.5 py-0.5 text-xs dark:bg-gray-800">
                  ➕
                </span>
              </li>
              <li>Stuknij &ldquo;Dodaj&rdquo; w prawym górnym rogu</li>
            </ol>
          </div>
        ) : deferredPrompt ? (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Zainstaluj aplikację na swoim urządzeniu, aby mieć szybki dostęp i
              możliwość pracy offline.
            </p>
            <Button onClick={handleInstallClick} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Dodaj do ekranu początkowego
            </Button>
          </>
        ) : (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>Aby zainstalować aplikację:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>
                <strong>Chrome/Edge:</strong> znajdź ikonę instalacji na pasku
                adresu
              </li>
              <li>
                <strong>Firefox:</strong> otwórz menu (⋮) →
                &ldquo;Zainstaluj&rdquo;
              </li>
              <li>
                <strong>Safari:</strong> użyj menu udostępniania →
                &ldquo;Dodaj do ekranu początkowego&rdquo;
              </li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
