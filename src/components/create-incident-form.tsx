"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bus, Train, X, Send } from "lucide-react";
import { toast } from "sonner";
import { Thunder, IncidentKind, ReportStatus } from "@/zeus";

// GraphQL client
const thunder = Thunder(async (query) => {
  const response = await fetch("/api/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) throw new Error("GraphQL request failed");
  return response.json();
});

interface Line {
  id: string;
  name: string;
  transportType: "BUS" | "RAIL";
}

const INCIDENT_KINDS = [
  { value: IncidentKind.INCIDENT, label: "🚨 Ogólne zdarzenie", admin: true },
  {
    value: IncidentKind.NETWORK_FAILURE,
    label: "📡 Awaria sieci",
    admin: true,
  },
  {
    value: IncidentKind.VEHICLE_FAILURE,
    label: "🔧 Awaria pojazdu",
    admin: true,
  },
  { value: IncidentKind.ACCIDENT, label: "💥 Wypadek", admin: false },
  { value: IncidentKind.TRAFFIC_JAM, label: "🚗 Korek", admin: false },
  {
    value: IncidentKind.PLATFORM_CHANGES,
    label: "🔄 Zmiana peronu",
    admin: true,
  },
];

export function CreateIncidentForm() {
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
      const result = await thunder("query")({
        lines: [
          {},
          {
            id: true,
            name: true,
            transportType: true,
          },
        ],
      });

      console.log("📍 Fetched lines:", result.lines);

      if (result.lines) {
        setLines(result.lines as Line[]);
        console.log("📍 Lines state set:", result.lines.length, "lines");
      }
    } catch (error) {
      console.error("Error fetching lines:", error);
      toast.error("Nie udało się pobrać listy linii");
    } finally {
      setLoading(false);
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

      const input = {
        title: title.trim(),
        description: description.trim() || undefined,
        kind: kind as IncidentKind,
        status: ReportStatus.PUBLISHED,
        lineIds: selectedLines.map((l) => l.id),
        delayMinutes: delayMinutes ? parseInt(delayMinutes) : undefined,
      };

      const result = await thunder("mutation")({
        admin: {
          createIncident: [
            { input },
            {
              id: true,
              title: true,
              status: true,
              lines: {
                id: true,
                name: true,
                transportType: true,
              },
            },
          ],
        },
      });

      if (result.admin?.createIncident) {
        toast.success(
          `✅ Zgłoszenie utworzone i opublikowane na ${selectedLines.length} linii`,
          {
            description: `Linie: ${selectedLines.map((l) => l.name).join(", ")}`,
            duration: 5000,
          },
        );

        // Reset form
        setTitle("");
        setDescription("");
        setKind("");
        setDelayMinutes("");
        setSelectedLines([]);
      }
    } catch (error) {
      console.error("Error creating incident:", error);
      toast.error("Nie udało się utworzyć zgłoszenia", {
        description: error instanceof Error ? error.message : "Nieznany błąd",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLines = lines.filter((line) => {
    if (transportFilter === "ALL") return true;
    return line.transportType === transportFilter;
  });

  console.log("🔍 Filter state:", {
    transportFilter,
    totalLines: lines.length,
    filteredLines: filteredLines.length,
    selectedLines: selectedLines.length,
  });

  const availableLines = filteredLines.filter(
    (line) => !selectedLines.find((l) => l.id === line.id),
  );

  console.log("📋 Available lines to show:", availableLines.length);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-orange-500" />
          <CardTitle>Utwórz oficjalne zgłoszenie</CardTitle>
        </div>
        <CardDescription>
          Publikuj oficjalne zgłoszenia o zdarzeniach na liniach komunikacji
          miejskiej. Użytkownicy otrzymają natychmiastowe powiadomienia
          WebSocket.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
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
                {INCIDENT_KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                    {k.admin && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Admin
                      </Badge>
                    )}
                  </SelectItem>
                ))}
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
            <div className="flex gap-2">
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
                Opublikuj zgłoszenie
              </>
            )}
          </Button>

          {/* Info */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-4 text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              ℹ️ Informacja
            </p>
            <p className="text-blue-700 dark:text-blue-300">
              Po opublikowaniu zgłoszenie zostanie natychmiast rozesłane przez
              WebSocket do wszystkich użytkowników śledzących wybrane linie.
              Zgłoszenie będzie widoczne jako oficjalny alert z ikoną
              weryfikacji.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
