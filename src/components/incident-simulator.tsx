"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mutation } from "@/lib/graphql_request";
import { toast } from "sonner";
import { AlertTriangle, Send, Loader2 } from "lucide-react";

interface Line {
  id: string;
  lineName: string;
  transportType: string;
}

export function IncidentSimulator() {
  const [isLoading, setIsLoading] = useState(false);
  const [availableLines, setAvailableLines] = useState<Line[]>([]);
  const [showLinesPicker, setShowLinesPicker] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    lineIds: "",
    kind: "INCIDENT" as
      | "INCIDENT"
      | "NETWORK_FAILURE"
      | "VEHICLE_FAILURE"
      | "ACCIDENT"
      | "TRAFFIC_JAM"
      | "PLATFORM_CHANGES",
    delayMinutes: "10",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const mutation = Mutation();

      // Parse line IDs (comma separated)
      const lineIdsArray = formData.lineIds
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0);

      if (lineIdsArray.length === 0) {
        toast.error("Błąd", {
          description: "Podaj przynajmniej jedno ID linii",
        });
        setIsLoading(false);
        return;
      }

      const delayMinutesInt = parseInt(formData.delayMinutes) || 0;

      console.log("🧪 Creating test incident:", {
        title: formData.title,
        description: formData.description,
        lineIds: lineIdsArray,
        kind: formData.kind,
        delayMinutes: delayMinutesInt,
      });

      const result = await mutation({
        admin: {
          createIncident: [
            {
              input: {
                title: formData.title,
                description: formData.description,
                lineIds: lineIdsArray,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                kind: formData.kind as any,
                delayMinutes: delayMinutesInt,
              },
            },
            {
              id: true,
              title: true,
              status: true,
              kind: true,
              delayMinutes: true,
            },
          ],
        },
      });

      console.log("✅ Incident created:", result.admin?.createIncident);

      toast.success("🧪 Incident testowy utworzony!", {
        description: `${formData.title} - Status: ${result.admin?.createIncident?.status || "PENDING"}`,
      });

      // Reset form
      setFormData({
        title: "",
        description: "",
        lineIds: "",
        kind: "INCIDENT",
        delayMinutes: "10",
      });
    } catch (error) {
      console.error("❌ Error creating test incident:", error);
      toast.error("Błąd", {
        description:
          error instanceof Error
            ? error.message
            : "Nie udało się utworzyć incydentu",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const quickPresets = [
    {
      name: "Opóźnienie pociągu",
      title: "Opóźnienie pociągu o 15 minut",
      description: "Pociąg opóźniony z powodu awarii sygnalizacji",
      kind: "VEHICLE_FAILURE" as const,
      delayMinutes: "15",
    },
    {
      name: "Wypadek",
      title: "Wypadek na trasie",
      description: "Pojazd porusza się trasą objazdową",
      kind: "ACCIDENT" as const,
      delayMinutes: "30",
    },
    {
      name: "Korek",
      title: "Korek na trasie",
      description: "Zwiększony ruch na trasie",
      kind: "TRAFFIC_JAM" as const,
      delayMinutes: "10",
    },
    {
      name: "Awaria infrastruktury",
      title: "Awaria sieci trakcyjnej",
      description: "Problemy z infrastrukturą",
      kind: "NETWORK_FAILURE" as const,
      delayMinutes: "20",
    },
  ];

  const applyPreset = (preset: (typeof quickPresets)[0]) => {
    setFormData((prev) => ({
      ...prev,
      title: preset.title,
      description: preset.description,
      kind: preset.kind,
      delayMinutes: preset.delayMinutes,
    }));
  };

  const fetchLines = async () => {
    try {
      const response = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            query {
              lines(limit: 20) {
                id
                lineName
                transportType
              }
            }
          `,
        }),
      });

      const result = await response.json();
      if (result.data?.lines) {
        setAvailableLines(result.data.lines);
        setShowLinesPicker(true);
      }
    } catch (error) {
      console.error("Failed to fetch lines:", error);
      toast.error("Nie udało się pobrać linii");
    }
  };

  const addLineToForm = (lineId: string) => {
    const currentIds = formData.lineIds
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (!currentIds.includes(lineId)) {
      const newIds = [...currentIds, lineId].join(", ");
      setFormData({ ...formData, lineIds: newIds });
      toast.success("Dodano linię do formularza");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Symulator Incydentów (Webhook Test)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Presets */}
        <div className="space-y-2">
          <Label>Szybkie presety:</Label>
          <div className="flex gap-2 flex-wrap">
            {quickPresets.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(preset)}
                disabled={isLoading}
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Tytuł incydentu *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="np. Opóźnienie pociągu"
              required
              disabled={isLoading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Opis *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Szczegóły incydentu..."
              required
              disabled={isLoading}
              rows={3}
            />
          </div>

          {/* Line IDs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="lineIds">
                ID Linii * (oddzielone przecinkami)
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fetchLines}
                disabled={isLoading}
              >
                Pokaż linie
              </Button>
            </div>
            <Input
              id="lineIds"
              value={formData.lineIds}
              onChange={(e) =>
                setFormData({ ...formData, lineIds: e.target.value })
              }
              placeholder="68e1a681e55a3a89d35e094b, 68e1a681e55a3a89d35e094c"
              required
              disabled={isLoading}
            />

            {/* Lines Picker */}
            {showLinesPicker && availableLines.length > 0 && (
              <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                {availableLines.map((line) => (
                  <button
                    key={line.id}
                    type="button"
                    onClick={() => addLineToForm(line.id)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-md flex items-center justify-between"
                  >
                    <span>
                      <strong>{line.lineName}</strong> -{" "}
                      {line.transportType === "BUS"
                        ? "🚌 Autobus"
                        : "🚆 Pociąg"}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">
                      {line.id.substring(0, 8)}...
                    </span>
                  </button>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Kliknij &quot;Pokaż linie&quot; aby wybrać z listy
            </p>
          </div>

          {/* Kind */}
          <div className="space-y-2">
            <Label htmlFor="kind">Typ incydentu *</Label>
            <Select
              value={formData.kind}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  kind: value as typeof formData.kind,
                })
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCIDENT">Incydent ogólny</SelectItem>
                <SelectItem value="NETWORK_FAILURE">
                  Awaria infrastruktury
                </SelectItem>
                <SelectItem value="VEHICLE_FAILURE">Awaria pojazdu</SelectItem>
                <SelectItem value="ACCIDENT">Wypadek</SelectItem>
                <SelectItem value="TRAFFIC_JAM">Korek</SelectItem>
                <SelectItem value="PLATFORM_CHANGES">
                  Zmiany w rozkładzie
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Delay Minutes */}
          <div className="space-y-2">
            <Label htmlFor="delayMinutes">Opóźnienie (minuty) *</Label>
            <Input
              id="delayMinutes"
              type="number"
              value={formData.delayMinutes}
              onChange={(e) =>
                setFormData({ ...formData, delayMinutes: e.target.value })
              }
              placeholder="10"
              required
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Szacowane opóźnienie w minutach
            </p>
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Tworzenie incydentu...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Utwórz testowy incident
              </>
            )}
          </Button>
        </form>

        {/* Info */}
        <div className="mt-4 space-y-3">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>ℹ️ Jak to działa:</strong> Ten formularz symuluje webhook
              zewnętrznego systemu. Incydent zostanie utworzony w bazie danych i
              natychmiast wysłany do wszystkich aktywnych subskrypcji WebSocket
              dla podanych linii.
            </p>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm text-amber-800">
              <strong>🔍 Jak znaleźć ID linii:</strong>
              <br />
              1. MongoDB Compass: Otwórz kolekcję{" "}
              <code className="px-1 py-0.5 bg-amber-100 rounded">Lines</code>,
              znajdź linię i skopiuj pole{" "}
              <code className="px-1 py-0.5 bg-amber-100 rounded">_id</code>
              <br />
              2. GraphQL: Zapytanie{" "}
              <code className="px-1 py-0.5 bg-amber-100 rounded">{`{ lines { id lineName } }`}</code>{" "}
              w GraphiQL na{" "}
              <code className="px-1 py-0.5 bg-amber-100 rounded">
                /api/graphql
              </code>
            </p>
          </div>

          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              <strong>✅ Testowanie:</strong>
              <br />
              1. Wybierz trasę zawierającą linię (np. linia 174)
              <br />
              2. Odśwież stronę - subskrypcja WebSocket uruchomi się
              automatycznie
              <br />
              3. Wróć na admin panel i utwórz incident dla tej linii
              <br />
              4. Toast notification pojawi się natychmiast na stronie z trasą!
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
