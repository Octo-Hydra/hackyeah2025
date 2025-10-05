"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Clock,
  Bus,
  Train,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Thunder, StatsPeriod } from "@/zeus";

const thunder = Thunder(async (query) => {
  const response = await fetch("/api/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) throw new Error("GraphQL request failed");
  return response.json();
});

interface AdminStats {
  totalUsers: number;
  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  fakeIncidents: number;
  usersByRole: {
    users: number;
    moderators: number;
    admins: number;
  };
  incidentsByKind: Array<{
    kind: string;
    count: number;
  }>;
  averageReputation: number;
  averageTrustScore: number;
}

interface LineDelayRanking {
  rank: number;
  lineId: string;
  lineName: string;
  transportType: "BUS" | "RAIL";
  totalDelays: number;
  averageDelayMinutes: number;
  incidentCount: number;
}

interface LineIncidentOverview {
  lineId: string;
  lineName: string;
  transportType: "BUS" | "RAIL";
  incidentCount: number;
  lastIncidentTime?: string | null;
}

const COLORS = {
  primary: "#3b82f6",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  purple: "#a855f7",
  cyan: "#06b6d4",
  pink: "#ec4899",
};

const INCIDENT_COLORS = [
  COLORS.danger,
  COLORS.warning,
  COLORS.primary,
  COLORS.purple,
  COLORS.cyan,
  COLORS.pink,
];

const INCIDENT_KIND_LABELS: Record<string, string> = {
  INCIDENT: "Zdarzenie",
  NETWORK_FAILURE: "Awaria sieci",
  VEHICLE_FAILURE: "Awaria pojazdu",
  ACCIDENT: "Wypadek",
  TRAFFIC_JAM: "Korek",
  PLATFORM_CHANGES: "Zmiana peronu",
};

export function AdminStatisticsDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [topDelays, setTopDelays] = useState<LineDelayRanking[]>([]);
  const [incidentOverview, setIncidentOverview] = useState<
    LineIncidentOverview[]
  >([]);
  const [period, setPeriod] = useState<StatsPeriod>(StatsPeriod.LAST_7D);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      console.log("📊 Fetching admin statistics with period:", period);

      const result = await thunder("query")({
        admin: {
          stats: {
            totalUsers: true,
            totalIncidents: true,
            activeIncidents: true,
            resolvedIncidents: true,
            fakeIncidents: true,
            usersByRole: {
              users: true,
              moderators: true,
              admins: true,
            },
            incidentsByKind: {
              kind: true,
              count: true,
            },
            averageReputation: true,
            averageTrustScore: true,
          },
          topDelays: [
            { period, limit: 10 },
            {
              rank: true,
              lineId: true,
              lineName: true,
              transportType: true,
              totalDelays: true,
              averageDelayMinutes: true,
              incidentCount: true,
            },
          ],
          linesIncidentOverview: [
            { period },
            {
              lineId: true,
              lineName: true,
              transportType: true,
              incidentCount: true,
              lastIncidentTime: true,
            },
          ],
        },
      });

      console.log("📊 Admin query result:", result);
      console.log("📊 Stats data:", result.admin?.stats);
      console.log("📊 Top delays:", result.admin?.topDelays);
      console.log("📊 Incident overview:", result.admin?.linesIncidentOverview);

      if (result.admin) {
        setStats(result.admin.stats as AdminStats);
        setTopDelays((result.admin.topDelays || []) as LineDelayRanking[]);
        setIncidentOverview(
          (result.admin.linesIncidentOverview || []) as LineIncidentOverview[],
        );
        console.log("✅ Statistics loaded successfully");
      } else {
        console.error("❌ No admin data in result");
      }
    } catch (error) {
      console.error("❌ Error fetching statistics:", error);
    } finally {
      setLoading(false);
      console.log("📊 Loading state set to false");
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            Ładowanie statystyk...
          </p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const userRoleData = [
    {
      name: "Użytkownicy",
      value: stats.usersByRole.users,
      color: COLORS.primary,
    },
    {
      name: "Moderatorzy",
      value: stats.usersByRole.moderators,
      color: COLORS.warning,
    },
    { name: "Admini", value: stats.usersByRole.admins, color: COLORS.danger },
  ];

  const incidentKindData = stats.incidentsByKind.map((item, idx) => ({
    name: INCIDENT_KIND_LABELS[item.kind] || item.kind,
    value: item.count,
    color: INCIDENT_COLORS[idx % INCIDENT_COLORS.length],
  }));

  const incidentStatusData = [
    { name: "Aktywne", value: stats.activeIncidents, color: COLORS.warning },
    {
      name: "Rozwiązane",
      value: stats.resolvedIncidents,
      color: COLORS.success,
    },
    { name: "Fałszywe", value: stats.fakeIncidents, color: COLORS.danger },
  ];

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Statystyki i Analityka</h2>
        <Tabs
          value={period}
          onValueChange={(v) => setPeriod(v as StatsPeriod)}
          className="w-auto"
        >
          <TabsList>
            <TabsTrigger value={StatsPeriod.LAST_24H}>24h</TabsTrigger>
            <TabsTrigger value={StatsPeriod.LAST_7D}>7 dni</TabsTrigger>
            <TabsTrigger value={StatsPeriod.LAST_31D}>31 dni</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Użytkownicy</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Średnia reputacja: {stats.averageReputation.toFixed(0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zgłoszenia</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalIncidents}</div>
            <p className="text-xs text-muted-foreground">
              Aktywne: {stats.activeIncidents}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rozwiązane</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resolvedIncidents}</div>
            <p className="text-xs text-muted-foreground">
              {(
                (stats.resolvedIncidents / stats.totalIncidents) *
                100
              ).toFixed(1)}
              % rozwiązanych
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trust Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageTrustScore.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Średni wynik zaufania
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* User Roles Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Role użytkowników</CardTitle>
            <CardDescription>Podział według uprawnień</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={userRoleData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {userRoleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Incident Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Status zgłoszeń</CardTitle>
            <CardDescription>Aktywne vs rozwiązane</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={incidentStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {incidentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Incident Types Bar Chart */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Rodzaje zdarzeń</CardTitle>
            <CardDescription>Podział według typu</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={incidentKindData} layout="horizontal">
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  fontSize={11}
                />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {incidentKindData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Delays Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Top 10 Opóźnień (ostatnie{" "}
            {period === StatsPeriod.LAST_24H
              ? "24h"
              : period === StatsPeriod.LAST_7D
                ? "7 dni"
                : "31 dni"}
            )
          </CardTitle>
          <CardDescription>
            Linie z największymi opóźnieniami i najczęstszymi zdarzeniami
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-sm text-muted-foreground">
                  <th className="text-left py-2 px-2">#</th>
                  <th className="text-left py-2 px-2">Linia</th>
                  <th className="text-left py-2 px-2">Typ</th>
                  <th className="text-right py-2 px-2">Opóźnienia</th>
                  <th className="text-right py-2 px-2">Śr. czas</th>
                  <th className="text-right py-2 px-2">Zdarzenia</th>
                </tr>
              </thead>
              <tbody>
                {topDelays.slice(0, 10).map((line) => (
                  <tr key={line.lineId} className="border-b last:border-0">
                    <td className="py-3 px-2 text-sm font-medium">
                      {line.rank}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        {line.transportType === "BUS" ? (
                          <Bus className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Train className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-semibold">{line.lineName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <Badge
                        variant={
                          line.transportType === "BUS"
                            ? "default"
                            : "destructive"
                        }
                        className="text-xs"
                      >
                        {line.transportType}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <Badge variant="outline" className="text-xs">
                        {line.totalDelays}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-sm">
                      {line.averageDelayMinutes.toFixed(1)} min
                    </td>
                    <td className="py-3 px-2 text-right text-sm text-muted-foreground">
                      {line.incidentCount}
                    </td>
                  </tr>
                ))}
                {topDelays.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      Brak danych o opóźnieniach w tym okresie
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Incident Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Przegląd zdarzeń na liniach</CardTitle>
          <CardDescription>
            Liczba zdarzeń na każdej linii w wybranym okresie
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {incidentOverview
              .filter((line) => line.incidentCount > 0)
              .sort((a, b) => b.incidentCount - a.incidentCount)
              .map((line) => (
                <div
                  key={line.lineId}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {line.transportType === "BUS" ? (
                      <Bus className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Train className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-semibold">{line.lineName}</p>
                      {line.lastIncidentTime && (
                        <p className="text-xs text-muted-foreground">
                          Ostatnie: {new Date(line.lastIncidentTime).toLocaleString("pl-PL")}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="ml-2">
                    {line.incidentCount} {line.incidentCount === 1 ? "zdarzenie" : "zdarzeń"}
                  </Badge>
                </div>
              ))}
            {incidentOverview.filter((l) => l.incidentCount > 0).length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Brak zdarzeń w tym okresie
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
