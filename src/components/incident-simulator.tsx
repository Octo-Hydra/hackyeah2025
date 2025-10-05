"use client";

import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Query, Mutation } from "@/lib/graphql_request";
import { toast } from "sonner";
import { AlertTriangle, Send, Bus, Train, X } from "lucide-react";

interface Line {
  id: string;
  name: string;
  transportType: "BUS" | "RAIL";
}

export function IncidentSimulator() {
  const [lines, setLines] = useState<Line[]>([]);
  const [selectedLines, setSelectedLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<string>("");
  const [delayMinutes, setDelayMinutes] = useState("");
  const [transportFilter, setTransportFilter] = useState<
    "ALL" | "BUS" | "RAIL"
  >("ALL");

  useEffect(() => {
    fetchLines();
  }, []);

  const fetchLines = async () => {
    try {
      setLoading(true);
      console.log("📍 Fetching lines...");

      const query = Query();
      const result = await query({
        lines: [
          {},
          {
            id: true,
            name: true,
            transportType: true,
          },
        ],
      });

      console.log("📍 GraphQL result:", result);
      console.log("📍 Fetched lines:", result.lines);
      if (result.lines) {
        const typedLines = result.lines as Line[];
        setLines(typedLines);
        console.log("📍 Lines state set:", typedLines.length, "lines");
        console.log("📍 Sample line:", typedLines[0]);

        if (typedLines.length === 0) {
          toast.info("Brak linii w bazie danych", {
            description: "Uruchom import GTFS aby dodać linie transportu",
          });
        }
      } else {
        console.warn("📍 No lines in result");
      }
    } catch (error) {
      console.error("❌ Error fetching lines:", error);
      toast.error("Nie udało się pobrać listy linii", {
        description: error instanceof Error ? error.message : "Nieznany błąd",
      });
    } finally {
      setLoading(false);
      console.log("📍 Loading complete");
    }
  };

  const addLine = (lineId: string) => {
    const line = lines.find((l) => l.id === lineId);
    if (line && !selectedLines.find((l) => l.id === lineId)) {
      setSelectedLines([...selectedLines, line]);
    }
  };

  const removeLine = (lineId: string) => {
    setSelectedLines(selectedLines.filter((l) => l.id !== lineId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Podaj tytuł zgłoszenia");
      return;
    }

    if (!kind) {
      toast.error("Wybierz rodzaj zdarzenia");
      return;
    }

    if (selectedLines.length === 0) {
      toast.error("Wybierz co najmniej jedną linię");
      return;
    }

    try {
      setSubmitting(true);

      const delayMinutesInt = delayMinutes ? parseInt(delayMinutes) : 0;

      console.log("🧪 Creating test incident:", {
        title: title.trim(),
        description: description.trim(),
        lineIds: selectedLines.map((l) => l.id),
        kind,
        delayMinutes: delayMinutesInt,
      });

      const mutation = Mutation();
      const result = await mutation({
        admin: {
          createIncident: [
            {
              input: {
                title: title.trim(),
                description: description.trim() || undefined,
                lineIds: selectedLines.map((l) => l.id),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                kind: kind as any,
                delayMinutes: delayMinutesInt,
              },
            },
            {
              id: true,
              title: true,
              status: true,
              kind: true,
              delayMinutes: true,
              lines: {
                id: true,
                name: true,
                transportType: true,
              },
            },
          ],
        },
      });

      console.log("✅ Incident created:", result.admin?.createIncident);

      toast.success("🧪 Incident testowy utworzony!", {
        description: `${title.trim()} - Linie: ${selectedLines.map((l) => l.name).join(", ")}`,
        duration: 5000,
      });

      // Reset form
      setTitle("");
      setDescription("");
      setKind("");
      setDelayMinutes("");
      setSelectedLines([]);
    } catch (error) {
      console.error("❌ Error creating test incident:", error);
      toast.error("Błąd", {
        description:
          error instanceof Error
            ? error.message
            : "Nie udało się utworzyć incydentu",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLines = lines.filter((line) => {
    if (transportFilter === "ALL") return true;
    return line.transportType === transportFilter;
  });

  const availableLines = filteredLines.filter(
    (line) => !selectedLines.find((l) => l.id === line.id),
  );

  // Quick presets with automatic line selection from fetched lines
  const quickPresets = [
    {
      name: "🚌 Opóźnienie autobusu",
      title: "Opóźnienie autobusu o 15 minut",
      description: "Autobus opóźniony z powodu zwiększonego ruchu",
      kind: "VEHICLE_FAILURE",
      delayMinutes: "15",
      transportType: "BUS" as const,
      lineCount: 2, // Select first 2 bus lines from fetched data
      selectFrom: "start" as const,
    },
    {
      name: "🚆 Opóźnienie pociągu",
      title: "Opóźnienie pociągu o 20 minut",
      description: "Pociąg opóźniony z powodu awarii sygnalizacji",
      kind: "NETWORK_FAILURE",
      delayMinutes: "20",
      transportType: "RAIL" as const,
      lineCount: 1, // Select first rail line
      selectFrom: "start" as const,
    },
    {
      name: "💥 Wypadek (autobus)",
      title: "Wypadek - trasa objazdowa",
      description: "Pojazd porusza się trasą objazdową",
      kind: "ACCIDENT",
      delayMinutes: "30",
      transportType: "BUS" as const,
      lineCount: 1,
      selectFrom: "end" as const, // Select from end of list for variety
    },
    {
      name: "🚗 Korek (tramwaje)",
      title: "Korek na trasie tramwajowej",
      description: "Zwiększony ruch - tramwaje opóźnione",
      kind: "TRAFFIC_JAM",
      delayMinutes: "10",
      transportType: "RAIL" as const,
      lineCount: 3, // Select last 3 rail lines for variety
      selectFrom: "end" as const,
    },
    {
      name: "🔧 Awaria sieci",
      title: "Awaria sieci trakcyjnej",
      description: "Problemy z infrastrukturą - ruch wstrzymany",
      kind: "NETWORK_FAILURE",
      delayMinutes: "45",
      transportType: "RAIL" as const,
      lineCount: 2,
      selectFrom: "start" as const,
    },
  ];

  const applyPreset = (preset: (typeof quickPresets)[0]) => {
    // Set form fields
    setTitle(preset.title);
    setDescription(preset.description);
    setKind(preset.kind);
    setDelayMinutes(preset.delayMinutes);

    // Auto-select lines based on transport type from fetched lines
    const linesOfType = lines.filter(
      (line) => line.transportType === preset.transportType,
    );

    // Select from start or end of list for variety
    let linesToSelect: Line[];
    if (preset.selectFrom === "end") {
      // Take last N lines (for variety in testing different lines)
      linesToSelect = linesOfType.slice(-preset.lineCount);
    } else {
      // Take first N lines
      linesToSelect = linesOfType.slice(0, preset.lineCount);
    }

    setSelectedLines(linesToSelect);

    // Set transport filter to match preset
    setTransportFilter(preset.transportType);

    if (linesToSelect.length === 0) {
      toast.warning("Preset zastosowany, ale brak linii!", {
        description: `Nie znaleziono linii typu ${preset.transportType}. Uruchom import GTFS.`,
      });
    } else {
      toast.success("Preset zastosowany!", {
        description: `Wybrano ${linesToSelect.length} ${preset.transportType === "BUS" ? "autobusów" : "linii kolejowych"}: ${linesToSelect.map((l) => l.name).join(", ")}`,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          🧪 Symulator Incydentów (Test)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quick Presets */}
          <div className="space-y-2">
            <Label>Szybkie presety testowe:</Label>
            <div className="flex gap-2 flex-wrap">
              {quickPresets.map((preset) => (
                <Button
                  key={preset.name}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(preset)}
                  disabled={loading || submitting}
                >
                  {preset.name}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Presety automatycznie wybierają odpowiednie linie
            </p>
          </div>
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Tytuł zgłoszenia *</Label>
            <Input
              id="title"
              placeholder="np. Awaria tramwaju na linii 4"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Opis (opcjonalnie)</Label>
            <Textarea
              id="description"
              placeholder="Szczegółowy opis sytuacji..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Incident Kind */}
          <div className="space-y-2">
            <Label htmlFor="kind">Rodzaj zdarzenia *</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger id="kind">
                <SelectValue placeholder="Wybierz rodzaj zdarzenia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCIDENT">🚨 Ogólne zdarzenie</SelectItem>
                <SelectItem value="NETWORK_FAILURE">📡 Awaria sieci</SelectItem>
                <SelectItem value="VEHICLE_FAILURE">
                  🔧 Awaria pojazdu
                </SelectItem>
                <SelectItem value="ACCIDENT">💥 Wypadek</SelectItem>
                <SelectItem value="TRAFFIC_JAM">🚗 Korek</SelectItem>
                <SelectItem value="PLATFORM_CHANGES">
                  🔄 Zmiana peronu
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Delay */}
          <div className="space-y-2">
            <Label htmlFor="delay">Opóźnienie (minuty)</Label>
            <Input
              id="delay"
              type="number"
              min="0"
              max="999"
              placeholder="np. 15"
              value={delayMinutes}
              onChange={(e) => setDelayMinutes(e.target.value)}
            />
          </div>

          {/* Line Selection */}
          <div className="space-y-3">
            <Label>Dotknięte linie *</Label>

            {/* Transport Type Filter */}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={transportFilter === "ALL" ? "default" : "outline"}
                size="sm"
                onClick={() => setTransportFilter("ALL")}
              >
                Wszystkie
              </Button>
              <Button
                type="button"
                variant={transportFilter === "BUS" ? "default" : "outline"}
                size="sm"
                onClick={() => setTransportFilter("BUS")}
              >
                <Bus className="h-4 w-4 mr-1" />
                Autobusy
              </Button>
              <Button
                type="button"
                variant={transportFilter === "RAIL" ? "default" : "outline"}
                size="sm"
                onClick={() => setTransportFilter("RAIL")}
              >
                <Train className="h-4 w-4 mr-1" />
                Tramwaje/Pociągi
              </Button>
            </div>

            {/* Selected Lines */}
            {selectedLines.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedLines.map((line) => (
                  <Badge
                    key={line.id}
                    variant="secondary"
                    className="flex items-center gap-1 py-1.5 px-3"
                  >
                    {line.transportType === "BUS" ? (
                      <Bus className="h-3 w-3" />
                    ) : (
                      <Train className="h-3 w-3" />
                    )}
                    <span className="font-semibold">{line.name}</span>
                    <button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Line Selector */}
            <Select onValueChange={addLine} value="">
              <SelectTrigger>
                <SelectValue placeholder="Dodaj linię..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {loading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Ładowanie linii...
                  </div>
                ) : availableLines.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {transportFilter === "ALL"
                      ? "Brak dostępnych linii"
                      : `Brak linii typu ${transportFilter}`}
                  </div>
                ) : (
                  availableLines.map((line) => (
                    <SelectItem key={line.id} value={line.id}>
                      <div className="flex items-center gap-2">
                        {line.transportType === "BUS" ? (
                          <Bus className="h-4 w-4" />
                        ) : (
                          <Train className="h-4 w-4" />
                        )}
                        <span className="font-semibold">{line.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({line.transportType})
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {selectedLines.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Wybierz linie, których dotyczy zgłoszenie
              </p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={
              submitting || !title.trim() || !kind || selectedLines.length === 0
            }
            className="w-full"
            size="lg"
          >
            {submitting ? (
              <>Publikowanie...</>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                🧪 Utwórz testowy incident
              </>
            )}
          </Button>

          {/* Info */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-4 text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              ℹ️ Symulator incydentów
            </p>
            <p className="text-blue-700 dark:text-blue-300">
              Ten formularz symuluje utworzenie incydentu testowego. Incident
              zostanie natychmiast rozesłany przez WebSocket do wszystkich
              użytkowników śledzących wybrane linie.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
