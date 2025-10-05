"use client";

/**
 * Admin Moderator Queue Dashboard
 *
 * View pending incidents, approve/reject reports
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";
import { Query, Mutation } from "@/lib/graphql_request";

interface PendingIncident {
  id: string;
  kind: string;
  description?: string | null;
  status: string;
  location: {
    latitude: number;
    longitude: number;
  };
  lineIds: (string | null)[];
  totalReports: number;
  reporterIds: string[];
  thresholdScore: number;
  thresholdProgress: number;
  createdAt: string;
  lastReportAt: string;
}

interface QueueItem {
  id: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
  createdAt: string;
  pendingIncident: PendingIncident;
}

const INCIDENT_KIND_LABELS: Record<string, string> = {
  ACCIDENT: "Wypadek",
  TRAFFIC_JAM: "Korek uliczny",
  INCIDENT: "Inny incydent",
  NETWORK_FAILURE: "Awaria sieci",
  VEHICLE_FAILURE: "Awaria pojazdu",
  PLATFORM_CHANGES: "Zmiana peronu",
};

const INCIDENT_KIND_ICONS: Record<string, string> = {
  ACCIDENT: "🚨",
  TRAFFIC_JAM: "🚗",
  INCIDENT: "❗",
  NETWORK_FAILURE: "📡",
  VEHICLE_FAILURE: "⚠️",
  PLATFORM_CHANGES: "🚉",
};

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "bg-red-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-blue-500",
};

export function ModeratorQueueDashboard() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

  // Load queue
  const loadQueue = async () => {
    setLoading(true);
    try {
      const data = await Query()({
        moderatorQueue: {
          id: true,
          priority: true,
          reason: true,
          createdAt: true,
          pendingIncident: {
            id: true,
            kind: true,
            description: true,
            status: true,
            location: {
              latitude: true,
              longitude: true,
            },
            lineIds: true,
            totalReports: true,
            reporterIds: true,
            thresholdScore: true,
            thresholdProgress: true,
            createdAt: true,
            lastReportAt: true,
          },
        },
      });

      if (data?.moderatorQueue) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setQueue(data.moderatorQueue as any);
      }
    } catch (error) {
      console.error("Failed to load moderator queue:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  // Approve report
  const handleApprove = async () => {
    if (!selectedItem) return;

    setProcessing(true);
    try {
      const data = await Mutation()({
        moderator: {
          approveReport: [
            {
              pendingIncidentId: selectedItem.pendingIncident.id,
              notes: notes || undefined,
            },
            {
              success: true,
              incident: {
                id: true,
                title: true,
              },
              rewardedUsers: {
                userId: true,
                oldReputation: true,
                newReputation: true,
                change: true,
              },
              message: true,
            },
          ],
        },
      });

      if (data?.moderator?.approveReport?.success) {
        console.log("✅ Zgłoszenie zatwierdzone");
        setApproveDialogOpen(false);
        setSelectedItem(null);
        setNotes("");
        loadQueue(); // Refresh
      } else {
        alert("Nie udało się zatwierdzić zgłoszenia");
      }
    } catch (error) {
      console.error("Błąd zatwierdzania:", error);
      alert("Błąd podczas zatwierdzania zgłoszenia");
    } finally {
      setProcessing(false);
    }
  };

  // Reject report
  const handleReject = async () => {
    if (!selectedItem || !rejectReason) return;

    setProcessing(true);
    try {
      const data = await Mutation()({
        moderator: {
          rejectReport: [
            {
              pendingIncidentId: selectedItem.pendingIncident.id,
              reason: rejectReason,
            },
            true, // Returns Boolean
          ],
        },
      });

      if (data?.moderator?.rejectReport) {
        console.log("❌ Zgłoszenie odrzucone");
        setRejectDialogOpen(false);
        setSelectedItem(null);
        setRejectReason("");
        loadQueue(); // Refresh
      } else {
        alert("Nie udało się odrzucić zgłoszenia");
      }
    } catch (error) {
      console.error("Błąd odrzucania:", error);
      alert("Błąd podczas odrzucania zgłoszenia");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
          <p className="mt-4 text-sm text-gray-600">Wczytywanie kolejki...</p>
        </div>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kolejka moderatora</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="mt-4 text-lg font-semibold">Wszystko przejrzane!</h3>
            <p className="mt-2 text-sm text-gray-600">
              Brak zgłoszeń do sprawdzenia
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Kolejka moderatora ({queue.length} zgłoszeń)</CardTitle>
        </CardHeader>
      </Card>

      {queue.map((item) => {
        const incident = item.pendingIncident;
        const timeAgo = Math.round(
          (Date.now() - new Date(incident.createdAt).getTime()) / 60000,
        );

        return (
          <Card key={item.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    className={`${PRIORITY_COLORS[item.priority]} text-white`}
                  >
                    {item.priority}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <span>{INCIDENT_KIND_ICONS[incident.kind]}</span>
                    <span>
                      {INCIDENT_KIND_LABELS[incident.kind] || incident.kind}
                    </span>
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  {timeAgo < 60
                    ? `${timeAgo} min temu`
                    : `${Math.round(timeAgo / 60)} godz. temu`}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Description */}
              {incident.description && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Opis:</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {incident.description}
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
                <div>
                  <p className="text-xs text-gray-500">Liczba zgłoszeń</p>
                  <p className="text-xl font-bold">{incident.totalReports}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Postęp progu</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-xl font-bold">
                      {incident.thresholdProgress}%
                    </p>
                    {incident.thresholdProgress >= 100 ? (
                      <Badge className="ml-2 bg-green-500 text-white">
                        Gotowe do publikacji!
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="ml-2">
                        Wymaga przeglądu
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <p className="text-xs text-gray-500">Lokalizacja</p>
                <p className="text-sm">
                  {incident.location.latitude.toFixed(5)},{" "}
                  {incident.location.longitude.toFixed(5)}
                </p>
              </div>

              {/* Reason */}
              <div>
                <p className="text-xs text-gray-500">Powód w kolejce</p>
                <p className="text-sm text-gray-700">{item.reason}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 border-t pt-4">
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setSelectedItem(item);
                    setApproveDialogOpen(true);
                  }}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Zatwierdź i opublikuj
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    setSelectedItem(item);
                    setRejectDialogOpen(true);
                  }}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Odrzuć jako fałszywe
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Approve Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Zatwierdź i opublikuj zgłoszenie
            </AlertDialogTitle>
            <AlertDialogDescription>
              To utworzy prawdziwy incydent i opublikuje go dla wszystkich
              użytkowników. Wszyscy zgłaszający otrzymają punkty reputacji z 50%
              bonusem za ręczne zatwierdzenie.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notatki (opcjonalnie)</label>
            <Textarea
              placeholder="Dodaj notatki dotyczące zatwierdzenia..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? "Zatwierdzanie..." : "Zatwierdź i opublikuj"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Odrzuć zgłoszenie jako fałszywe
            </AlertDialogTitle>
            <AlertDialogDescription>
              To oznaczy zgłoszenie jako fałszywe i usunie je z kolejki. Wszyscy
              zgłaszający otrzymają małą karę reputacji.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium">Powód (wymagany)</label>
            <Textarea
              placeholder="Dlaczego to zgłoszenie jest fałszywe? (np. duplikat, nieprawidłowa lokalizacja, spam)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              required
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={processing || !rejectReason}
              className="bg-red-600 hover:bg-red-700"
            >
              {processing ? "Odrzucanie..." : "Odrzuć zgłoszenie"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
