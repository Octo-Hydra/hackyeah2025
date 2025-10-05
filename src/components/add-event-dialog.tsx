"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  MapPin,
  Clock,
  TrendingUp,
  Loader2,
  CheckCircle2,
  Train,
  Bus,
  Cable,
} from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";
import { Query, Mutation } from "@/lib/graphql_request";

interface Location {
  latitude: number;
  longitude: number;
}

interface RateLimitInfo {
  canSubmit: boolean;
  reason?: string | null;
  rateLimitInfo?: {
    isLimited: boolean;
    remaining?: {
      perMinute: number;
      perHour: number;
      perDay: number;
    } | null;
  } | null;
}

interface LineInfo {
  id: string;
  name: string;
  transportType: "BUS" | "TRAM" | "TRAIN";
}

const INCIDENT_TYPES = [
  { value: "ACCIDENT", label: "Wypadek", icon: "🚨" },
  { value: "TRAFFIC_JAM", label: "Korek uliczny", icon: "🚗" },
  { value: "VEHICLE_FAILURE", label: "Awaria pojazdu", icon: "⚠️" },
  { value: "NETWORK_FAILURE", label: "Awaria sieci", icon: "📡" },
  { value: "PLATFORM_CHANGES", label: "Zmiana peronu", icon: "🚉" },
  { value: "INCIDENT", label: "Inny incydent", icon: "❗" },
];

export function AddEventDialog() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<string>("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<Location | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(
    null,
  );
  const [checkingLimits, setCheckingLimits] = useState(false);
  const [lineDetails, setLineDetails] = useState<LineInfo[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);

  const user = useAppStore((state) => state.user);
  const activeJourney = user?.activeJourney;

  // Safety check - don't render if no user
  if (!user) {
    return null;
  }

  // Extract line IDs from active journey
  const lineIds =
    activeJourney?.segments
      ?.map((seg) => seg.lineId)
      .filter((id): id is string => !!id) || [];

  // Get current location (MOCKED from active journey middle segment)
  useEffect(() => {
    if (open && !location && !locationError) {
      setLoadingLocation(true);

      // MOCK: Get location from middle segment of active journey
      if (activeJourney?.segments && activeJourney.segments.length > 0) {
        const middleIndex = Math.floor(activeJourney.segments.length / 2);
        const middleSegment = activeJourney.segments[middleIndex];

        // Use the "from" location of the middle segment
        if (middleSegment?.from?.coordinates) {
          setTimeout(() => {
            setLocation({
              latitude: middleSegment.from.coordinates.latitude,
              longitude: middleSegment.from.coordinates.longitude,
            });
            setLoadingLocation(false);
            setLocationError(false);
          }, 500); // Simulate loading delay
        } else {
          setLoadingLocation(false);
          setLocationError(true);
          toast.error("Brak danych o lokalizacji w aktywnej trasie");
        }
      } else {
        setLoadingLocation(false);
        setLocationError(true);
        toast.error("Musisz mieć aktywną trasę, aby zgłosić incydent");
      }

      /* REAL GEOLOCATION (commented out for testing)
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            setLoadingLocation(false);
            setLocationError(false);
          },
          (error) => {
            console.error("Location error:", error);
            setLoadingLocation(false);
            setLocationError(true);
            toast.error("Musisz udostępnić lokalizację, aby zgłosić incydent", {
              description: "Zmień ustawienia przeglądarki i odśwież stronę",
            });
          },
        );
      } else {
        setLoadingLocation(false);
        setLocationError(true);
        toast.error("Twoja przeglądarka nie obsługuje geolokalizacji");
      }
      */
    }
  }, [open, location, locationError, activeJourney]);

  // Check rate limits when dialog opens
  useEffect(() => {
    if (open) {
      checkRateLimits();
    }
  }, [open]);

  // Fetch line details when we have lineIds
  useEffect(() => {
    if (open && lineIds.length > 0 && lineDetails.length === 0) {
      fetchLineDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lineIds]);

  const fetchLineDetails = async () => {
    if (lineIds.length === 0) return;

    setLoadingLines(true);
    try {
      // Fetch all lines and filter by IDs
      const data = await Query()({
        lines: [
          {},
          {
            id: true,
            name: true,
            transportType: true,
          },
        ],
      });

      if (data?.lines) {
        const filtered = data.lines
          .filter((line) => line && lineIds.includes(line.id))
          .map((line) => ({
            id: line!.id,
            name: line!.name,
            transportType: line!.transportType as LineInfo["transportType"],
          }));
        setLineDetails(filtered);
      }
    } catch (error) {
      console.error("Failed to fetch line details:", error);
    } finally {
      setLoadingLines(false);
    }
  };

  const checkRateLimits = async () => {
    setCheckingLimits(true);
    try {
      const data = await Query()({
        canSubmitReport: {
          canSubmit: true,
          reason: true,
          cooldownRemaining: true,
          rateLimitInfo: {
            reportsRemaining: {
              perMinute: true,
              perHour: true,
              perDay: true,
            },
            violations: true,
            suspiciousScore: true,
          },
        },
      });

      if (data?.canSubmitReport) {
        // Adapt to component's expected format
        setRateLimitInfo({
          canSubmit: data.canSubmitReport.canSubmit,
          reason: data.canSubmitReport.reason,
          rateLimitInfo: data.canSubmitReport.rateLimitInfo
            ? {
                isLimited: false,
                remaining: data.canSubmitReport.rateLimitInfo.reportsRemaining,
              }
            : null,
        });
      }
    } catch (error) {
      console.error("Failed to check rate limits:", error);
    } finally {
      setCheckingLimits(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!kind || !location) {
      toast.error("Wybierz rodzaj zdarzenia");
      return;
    }

    if (!rateLimitInfo?.canSubmit) {
      toast.error(
        rateLimitInfo?.reason || "Nie możesz teraz wysłać zgłoszenia",
      );
      return;
    }

    setSubmitting(true);

    try {
      const data = await Mutation()({
        submitIncidentReport: [
          {
            input: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              kind: kind as any, // Type cast for GraphQL enum
              description: description || null,
              reporterLocation: location!,
              lineIds: lineIds.length > 0 ? lineIds : null,
            },
          },
          {
            success: true,
            wasPublished: true,
            reputationGained: true,
            pendingIncident: {
              id: true,
              thresholdProgress: true,
              totalReports: true,
            },
          },
        ],
      });

      if (data?.submitIncidentReport?.success) {
        const result = data.submitIncidentReport;

        if (result.wasPublished) {
          toast.success(
            `✅ Incydent opublikowany! +${result.reputationGained} reputacji`,
            {
              description: "Próg zgłoszeń został osiągnięty",
            },
          );
        } else {
          const progress = result.pendingIncident?.thresholdProgress || 0;
          const reports = result.pendingIncident?.totalReports || 1;
          toast.success(`📝 Zgłoszenie zapisane (${reports} zgłoszeń)`, {
            description: `Postęp: ${progress}% - Czeka na więcej zgłoszeń lub akceptację admina`,
          });
        }

        // Reset form
        setKind("");
        setDescription("");
        setLocation(null);
        setOpen(false);
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Błąd podczas wysyłania zgłoszenia");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg"
          aria-label="Dodaj zdarzenie na trasie"
        >
          <AlertTriangle className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Zgłoś zdarzenie</DialogTitle>
          <DialogDescription>
            Pomóż innym pasażerom - zgłoś incydent na trasie
          </DialogDescription>
        </DialogHeader>

        {locationError ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold">Lokalizacja jest wymagana</p>
              <p className="mt-1 text-sm">
                Aby zgłosić incydent, musisz udostępnić swoją lokalizację. Zmień
                ustawienia przeglądarki i odśwież stronę.
              </p>
            </AlertDescription>
          </Alert>
        ) : checkingLimits ? (
          <div className="py-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">Sprawdzanie limitów...</p>
          </div>
        ) : rateLimitInfo && !rateLimitInfo.canSubmit ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {rateLimitInfo.reason ||
                "Nie możesz teraz wysłać zgłoszenia. Spróbuj później."}
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Location Info */}
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-gray-600" />
                <div className="flex-1">
                  <p className="text-xs text-gray-600">Twoja lokalizacja</p>
                  {loadingLocation ? (
                    <p className="text-sm text-gray-400">Pobieranie...</p>
                  ) : location ? (
                    <p className="text-sm font-mono">
                      {location.latitude.toFixed(5)},{" "}
                      {location.longitude.toFixed(5)}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">Niedostępna</p>
                  )}
                </div>
              </div>

              {activeJourney && lineIds.length > 0 && (
                <div className="mt-2 border-t pt-2">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="mt-0.5 h-4 w-4 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-600">Aktywna trasa</p>
                      {loadingLines ? (
                        <p className="text-sm text-gray-400">Wczytywanie...</p>
                      ) : lineDetails.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {lineDetails.map((line) => (
                            <span
                              key={line.id}
                              className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-medium shadow-sm border"
                            >
                              {line.transportType === "TRAIN" ? (
                                <Train className="h-3 w-3 text-blue-600" />
                              ) : line.transportType === "BUS" ? (
                                <Bus className="h-3 w-3 text-orange-600" />
                              ) : (
                                <Cable className="h-3 w-3 text-green-600" />
                              )}
                              <span>{line.name}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm">
                          {lineIds.length}{" "}
                          {lineIds.length === 1 ? "linia" : "linie"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Rate Limit Info */}
            {rateLimitInfo?.rateLimitInfo?.remaining && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-blue-900">
                      Pozostałe zgłoszenia
                    </p>
                    <div className="mt-1 flex gap-3 text-xs text-blue-700">
                      <span>
                        {rateLimitInfo.rateLimitInfo.remaining.perMinute}/min
                      </span>
                      <span>
                        {rateLimitInfo.rateLimitInfo.remaining.perHour}/godz
                      </span>
                      <span>
                        {rateLimitInfo.rateLimitInfo.remaining.perDay}/dzień
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Incident Type */}
            <div className="space-y-2">
              <Label htmlFor="kind">Rodzaj zdarzenia *</Label>
              <Select value={kind} onValueChange={setKind} required>
                <SelectTrigger id="kind">
                  <SelectValue placeholder="Wybierz rodzaj..." />
                </SelectTrigger>
                {/* dont ask about this z-index value, it 5:36 AM */}
                <SelectContent className=" z-[999990]" position="popper">
                  {INCIDENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        <span>{type.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Opis (opcjonalnie)</Label>
              <Textarea
                id="description"
                placeholder="Dodaj szczegóły incydentu..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-gray-500">
                {description.length}/500 znaków
              </p>
            </div>

            {/* Info Alert */}
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Twoje zgłoszenie będzie łączone z podobnymi raportami. Po
                osiągnięciu progu zostanie automatycznie opublikowane lub
                zatwierdzone przez admina.
              </AlertDescription>
            </Alert>

            {/* Submit */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
                disabled={submitting}
              >
                Anuluj
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={submitting || !kind || loadingLocation}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wysyłanie...
                  </>
                ) : (
                  "Wyślij zgłoszenie"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
