"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Car,
  Wrench,
  Radio,
  Navigation,
  AlertCircle,
  X,
  Trash2,
  Clock,
} from "lucide-react";
import { Query, Mutation } from "@/lib/graphql_request";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import { useAppStore } from "@/store/app-store";

interface JourneyNotification {
  id: string;
  title: string;
  description?: string | null;
  kind?: string | null;
  status?: string | null;
  lineName?: string | null;
  delayMinutes?: number | null;
  receivedAt: string;
  dismissedAt?: string | null;
}

const INCIDENT_ICONS: Record<string, any> = {
  ACCIDENT: AlertTriangle,
  TRAFFIC_JAM: Car,
  VEHICLE_FAILURE: Wrench,
  NETWORK_ISSUE: Radio,
  PLATFORM_CHANGE: Navigation,
  OTHER: AlertCircle,
};

const INCIDENT_COLORS: Record<string, string> = {
  ACCIDENT: "bg-red-100 text-red-700 border-red-200",
  TRAFFIC_JAM: "bg-orange-100 text-orange-700 border-orange-200",
  VEHICLE_FAILURE: "bg-yellow-100 text-yellow-700 border-yellow-200",
  NETWORK_ISSUE: "bg-purple-100 text-purple-700 border-purple-200",
  PLATFORM_CHANGE: "bg-blue-100 text-blue-700 border-blue-200",
  OTHER: "bg-gray-100 text-gray-700 border-gray-200",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Oczekujące",
  OFFICIAL: "Oficjalne",
  RESOLVED: "Rozwiązane",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-500",
  OFFICIAL: "bg-red-500",
  RESOLVED: "bg-green-500",
};

export function NotificationsList() {
  const [notifications, setNotifications] = useState<JourneyNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Listen to store notifications for real-time updates
  const storeNotifications = useAppStore((state) => state.notifications);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const result = await Query()({
        me: {
          id: true,
          journeyNotifications: {
            id: true,
            title: true,
            description: true,
            kind: true,
            status: true,
            lineName: true,
            delayMinutes: true,
            receivedAt: true,
            dismissedAt: true,
          },
        },
      });

      if (result.me?.journeyNotifications) {
        setNotifications(result.me.journeyNotifications as JourneyNotification[]);
      }
    } catch (err) {
      setError("Brak powiadomień na trasie");
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  // Sync with store notifications when they change
  useEffect(() => {
    // Always sync with store, even if empty (to handle initial load)
    setNotifications((prev) => {
      if (storeNotifications.length === 0 && prev.length === 0) {
        // Both empty, nothing to do
        return prev;
      }
      
      // Merge store notifications with fetched ones, prioritizing store (real-time)
      const storeIds = new Set(storeNotifications.map((n) => n.id));
      const fetchedOnly = prev.filter((n) => !storeIds.has(n.id));
      return [...storeNotifications, ...fetchedOnly];
    });
  }, [storeNotifications]);

  useEffect(() => {
    fetchNotifications();
    
    // Also check if store already has notifications on mount
    if (storeNotifications.length > 0) {
      setNotifications(storeNotifications);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissNotification = async (id: string) => {
    try {
      await Mutation()({
        dismissJourneyNotification: [{ id }, true],
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, dismissedAt: new Date().toISOString() } : n))
      );
    } catch (err) {
      console.error("Error dismissing notification:", err);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await Mutation()({
        clearJourneyNotifications: true,
      });
      setNotifications([]);
    } catch (err) {
      console.error("Error clearing notifications:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <Clock className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="text-sm text-gray-500">Ładowanie powiadomień...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-2">
          <div className="flex items-center gap-2 text-green-700">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeNotifications = notifications.filter((n) => !n.dismissedAt);
  const dismissedNotifications = notifications.filter((n) => n.dismissedAt);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            Powiadomienia ({activeNotifications.length})
          </h2>
          <p className="text-sm text-gray-500">
            Otrzymuj alerty o zmianach w Twoich trasach
          </p>
        </div>
        {notifications.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearAllNotifications}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Wyczyść wszystkie
          </Button>
        )}
      </div>

      {activeNotifications.length === 0 && dismissedNotifications.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2 py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-gray-300" />
              <p className="text-gray-500">Brak powiadomień</p>
              <p className="text-sm text-gray-400">
                Otrzymasz tutaj alerty o zmianach w Twoich zapisanych trasach
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeNotifications.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Aktywne</h3>
          {activeNotifications.map((notification) => {
            const Icon = INCIDENT_ICONS[notification.kind || "OTHER"] || AlertCircle;
            const colorClass = INCIDENT_COLORS[notification.kind || "OTHER"];
            const statusColor = STATUS_COLORS[notification.status || "PENDING"];

            return (
              <Card key={notification.id} className="border-l-4 border-l-orange-500">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${colorClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{notification.title}</h3>
                          {notification.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.description}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dismissNotification(notification.id)}
                          className="shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        {notification.lineName && (
                          <Badge variant="outline" className="font-mono">
                            {notification.lineName}
                          </Badge>
                        )}
                        {notification.status && (
                          <Badge variant="outline" className="gap-1">
                            <span className={`h-2 w-2 rounded-full ${statusColor}`} />
                            {STATUS_LABELS[notification.status] || notification.status}
                          </Badge>
                        )}
                        {notification.delayMinutes && (
                          <Badge variant="outline" className="text-red-600">
                            +{notification.delayMinutes} min opóźnienia
                          </Badge>
                        )}
                        <span className="text-gray-400 text-xs">
                          {formatDistanceToNow(new Date(notification.receivedAt), {
                            addSuffix: true,
                            locale: pl,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {dismissedNotifications.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-500">Odrzucone</h3>
          {dismissedNotifications.map((notification) => {
            const Icon = INCIDENT_ICONS[notification.kind || "OTHER"] || AlertCircle;

            return (
              <Card key={notification.id} className="opacity-60">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-gray-100 text-gray-500">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div>
                        <h3 className="font-semibold text-gray-600">
                          {notification.title}
                        </h3>
                        {notification.description && (
                          <p className="text-sm text-gray-500 mt-1">
                            {notification.description}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        {notification.lineName && (
                          <Badge variant="outline" className="font-mono opacity-60">
                            {notification.lineName}
                          </Badge>
                        )}
                        <span className="text-gray-400 text-xs">
                          Odrzucone{" "}
                          {formatDistanceToNow(new Date(notification.dismissedAt!), {
                            addSuffix: true,
                            locale: pl,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
