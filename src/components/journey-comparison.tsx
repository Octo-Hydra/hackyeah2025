"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Clock,
  MapPin,
  TrendingUp,
  CheckCircle2,
  ArrowDownUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Group consecutive segments with same line
interface LineGroup {
  lineId: string;
  lineName: string;
  transportType: string;
  segments: JourneySegment[];
  startStop: string;
  endStop: string;
  departureTime: string;
  arrivalTime: string;
  totalDuration: number;
  hasIncident: boolean;
  maxSeverity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  totalDelay: number;
}

interface JourneySegment {
  from: {
    stopId: string;
    stopName: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  to: {
    stopId: string;
    stopName: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  lineId: string;
  lineName: string;
  transportType: string;
  departureTime: string;
  arrivalTime: string;
  duration: number;
  hasIncident: boolean;
  incidentDelay?: number;
  incidentSeverity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

interface Journey {
  segments: JourneySegment[];
  totalDuration: number;
  totalDistance: number;
  transferCount: number;
  hasIncidents: boolean;
  departureTime: string;
  arrivalTime: string;
  alternativeAvailable: boolean;
}

interface JourneyComparisonProps {
  journeys: Journey[];
  onSelectJourney?: (journey: Journey) => void;
}

export function JourneyComparison({
  journeys,
  onSelectJourney,
}: JourneyComparisonProps) {
  const [selectedJourneyIndex, setSelectedJourneyIndex] = useState<
    number | null
  >(null);

  // Note: Real-time incident monitoring will be active AFTER selecting a journey
  // and it being set as active. This component only shows static comparison.

  if (journeys.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Nie znaleziono tras
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleSelectJourney = (journey: Journey, index: number) => {
    setSelectedJourneyIndex(index);
    onSelectJourney?.(journey);
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-500";
      case "HIGH":
        return "bg-orange-500";
      case "MEDIUM":
        return "bg-yellow-500";
      case "LOW":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getSeverityLabel = (severity?: string) => {
    switch (severity) {
      case "CRITICAL":
        return "Krytyczne";
      case "HIGH":
        return "Wysokie";
      case "MEDIUM":
        return "Średnie";
      case "LOW":
        return "Niskie";
      default:
        return "Brak";
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Group consecutive segments by line
  const groupSegmentsByLine = (segments: JourneySegment[]): LineGroup[] => {
    const groups: LineGroup[] = [];
    let currentGroup: LineGroup | null = null;

    segments.forEach((segment) => {
      if (!currentGroup || currentGroup.lineId !== segment.lineId) {
        // Start new group
        if (currentGroup) {
          groups.push(currentGroup);
        }
        currentGroup = {
          lineId: segment.lineId,
          lineName: segment.lineName,
          transportType: segment.transportType,
          segments: [segment],
          startStop: segment.from.stopName,
          endStop: segment.to.stopName,
          departureTime: segment.departureTime,
          arrivalTime: segment.arrivalTime,
          totalDuration: segment.duration,
          hasIncident: segment.hasIncident,
          maxSeverity: segment.incidentSeverity,
          totalDelay: segment.incidentDelay || 0,
        };
      } else {
        // Add to current group
        currentGroup.segments.push(segment);
        currentGroup.endStop = segment.to.stopName;
        currentGroup.arrivalTime = segment.arrivalTime;
        currentGroup.totalDuration += segment.duration;
        currentGroup.hasIncident =
          currentGroup.hasIncident || segment.hasIncident;
        currentGroup.totalDelay += segment.incidentDelay || 0;

        // Update max severity
        const severities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
        const currentSeverityIndex = currentGroup.maxSeverity
          ? severities.indexOf(currentGroup.maxSeverity)
          : -1;
        const newSeverityIndex = segment.incidentSeverity
          ? severities.indexOf(segment.incidentSeverity)
          : -1;
        if (newSeverityIndex > currentSeverityIndex) {
          currentGroup.maxSeverity = segment.incidentSeverity;
        }
      }
    });

    if (currentGroup) {
      groups.push(currentGroup);
    }

    return groups;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold">
          Znalezione trasy ({journeys.length})
        </h3>
        {journeys.length > 1 && (
          <Badge variant="secondary" className="gap-1">
            <TrendingUp className="h-3 w-3" />
            Alternatywy dostępne
          </Badge>
        )}
      </div>

      {journeys.map((journey, index) => {
        const isSelected = selectedJourneyIndex === index;
        const isOptimal = index === 0; // First journey is optimal

        return (
          <Card
            key={index}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              isSelected && "ring-2 ring-primary",
              journey.hasIncidents && "border-orange-500",
            )}
            onClick={() => handleSelectJourney(journey, index)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    {isOptimal && (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Optymalna
                      </Badge>
                    )}
                    {journey.hasIncidents && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />Z opóźnieniami
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {journey.totalDuration} min
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {journey.totalDistance.toFixed(1)} km
                    </span>
                    <span>
                      {journey.transferCount === 0
                        ? "Bez przesiadek"
                        : `${journey.transferCount} przesiad${journey.transferCount === 1 ? "ka" : "ki"}`}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {formatTime(journey.departureTime)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatTime(journey.arrivalTime)}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {groupSegmentsByLine(journey.segments).map(
                (group, groupIndex, allGroups) => (
                  <div key={groupIndex}>
                    {/* Line group card */}
                    <div
                      className={cn(
                        "rounded-lg border p-3 space-y-2",
                        group.transportType === "BUS" &&
                          "bg-blue-50 border-blue-200",
                        group.transportType === "RAIL" &&
                          "bg-green-50 border-green-200",
                      )}
                    >
                      {/* Header: Line badge + transport type + incidents */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-mono text-sm font-bold",
                              group.transportType === "BUS" &&
                                "border-blue-600 text-blue-800 bg-white",
                              group.transportType === "RAIL" &&
                                "border-green-600 text-green-800 bg-white",
                            )}
                          >
                            {group.lineName}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {group.transportType === "BUS"
                              ? "Autobus"
                              : "Pociąg"}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground font-medium">
                          {group.totalDuration} min
                        </div>
                      </div>

                      {/* Route: Start -> End */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span className="font-medium">{group.startStop}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(group.departureTime)}
                          </span>
                        </div>
                        {/* Show intermediate stops if group has multiple segments */}
                        {group.segments.length > 1 && (
                          <div className="ml-6 text-xs text-muted-foreground">
                            <ArrowDownUp className="inline h-3 w-3 mr-1" />
                            {group.segments.length - 1} przystank
                            {group.segments.length - 1 === 1
                              ? ""
                              : group.segments.length - 1 < 5
                                ? "i"
                                : "ów"}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-red-600 flex-shrink-0" />
                          <span className="font-medium">{group.endStop}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(group.arrivalTime)}
                          </span>
                        </div>
                      </div>

                      {/* Incidents warning */}
                      {group.hasIncident && (
                        <div className="flex items-center gap-2 pt-1 border-t">
                          <Badge
                            variant="destructive"
                            className={cn(
                              "text-xs gap-1",
                              getSeverityColor(group.maxSeverity),
                            )}
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {getSeverityLabel(group.maxSeverity)}
                          </Badge>
                          {group.totalDelay > 0 && (
                            <span className="text-xs text-muted-foreground">
                              +{group.totalDelay} min opóźnienia
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Transfer indicator */}
                    {groupIndex < allGroups.length - 1 && (
                      <div className="flex items-center justify-center py-2">
                        <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 border border-amber-300 rounded-full">
                          <ArrowDownUp className="h-3 w-3 text-amber-700" />
                          <span className="text-xs font-medium text-amber-700">
                            Przesiadka
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ),
              )}

              <Button
                className="w-full mt-4"
                variant={isSelected ? "default" : "outline"}
                size="sm"
              >
                {isSelected ? "Wybrano" : "Wybierz tę trasę"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
