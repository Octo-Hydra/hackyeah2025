"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, Navigation, ArrowLeft } from "lucide-react";
import { OpenStreetMapProvider } from "leaflet-geosearch";
import type { SearchResult as GeoSearchResult } from "leaflet-geosearch/dist/providers/provider.js";
import { Query, Mutation } from "@/lib/graphql_request";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";
import { JourneyComparison } from "@/components/journey-comparison";

interface LocationPoint {
  address: string;
  lat: number;
  lon: number;
}

interface Stop {
  stopId: string;
  stopName: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

interface Journey {
  segments: Array<{
    from: Stop;
    to: Stop;
    lineId: string;
    lineName: string;
    transportType: string;
    departureTime: string;
    arrivalTime: string;
    duration: number;
    hasIncident: boolean;
    incidentDelay?: number;
    incidentSeverity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  }>;
  totalDuration: number;
  totalDistance: number;
  transferCount: number;
  hasIncidents: boolean;
  departureTime: string;
  arrivalTime: string;
  alternativeAvailable: boolean;
}

export function AddJourneyDialog() {
  const setUserActiveJourney = useAppStore(
    (state) => state.setUserActiveJourney,
  );
  const [open, setOpen] = useState(false);
  const [startPoint, setStartPoint] = useState<LocationPoint | null>({
    address: "Kraków, województwo małopolskie, Polska",
    lat: 50.0683947,
    lon: 19.9475035,
  });
  const [endPoint, setEndPoint] = useState<LocationPoint | null>({
    address:
      "Wieliczka, gmina Wieliczka, powiat wielicki, województwo małopolskie, 32-020, Polska",
    lat: 49.985686,
    lon: 20.056641,
  });

  const [startInput, setStartInput] = useState(
    "Kraków, województwo małopolskie, Polska",
  );
  const [endInput, setEndInput] = useState(
    "Wieliczka, gmina Wieliczka, powiat wielicki, województwo małopolskie, 32-020, Polska",
  );

  const [startSuggestions] = useState<GeoSearchResult[]>([]);
  const [endSuggestions] = useState<GeoSearchResult[]>([]);

  const [isLoadingStart, setIsLoadingStart] = useState(false);
  const [isLoadingEnd] = useState(false);

  const [showStartSuggestions] = useState(false);
  const [showEndSuggestions] = useState(false);

  const providerRef = useRef<OpenStreetMapProvider | null>(null);

  // Initialize the geosearch provider
  useEffect(() => {
    providerRef.current = new OpenStreetMapProvider();
  }, []);

  // Debounced search for start point
  // useEffect(() => {
  //   if (startInput.length < 3) {
  //     setStartSuggestions([]);
  //     return;
  //   }

  //   if (startTimeoutRef.current) {
  //     clearTimeout(startTimeoutRef.current);
  //   }

  //   startTimeoutRef.current = setTimeout(async () => {
  //     setIsLoadingStart(true);
  //     try {
  //       if (providerRef.current) {
  //         const results = await providerRef.current.search({
  //           query: startInput,
  //         });
  //         setStartSuggestions(results as GeoSearchResult[]);
  //         setShowStartSuggestions(true);
  //       }
  //     } catch (error) {
  //       console.error("Error fetching start suggestions:", error);
  //     } finally {
  //       setIsLoadingStart(false);
  //     }
  //   }, 300);

  //   return () => {
  //     if (startTimeoutRef.current) {
  //       clearTimeout(startTimeoutRef.current);
  //     }
  //   };
  // }, [startInput]);

  // Debounced search for end point
  // useEffect(() => {
  //   if (endInput.length < 3) {
  //     setEndSuggestions([]);
  //     return;
  //   }

  //   if (endTimeoutRef.current) {
  //     clearTimeout(endTimeoutRef.current);
  //   }

  //   endTimeoutRef.current = setTimeout(async () => {
  //     setIsLoadingEnd(true);
  //     try {
  //       if (providerRef.current) {
  //         const results = await providerRef.current.search({ query: endInput });
  //         setEndSuggestions(results as GeoSearchResult[]);
  //         setShowEndSuggestions(true);
  //       }
  //     } catch (error) {
  //       console.error("Error fetching end suggestions:", error);
  //     } finally {
  //       setIsLoadingEnd(false);
  //     }
  //   }, 300);

  //   return () => {
  //     if (endTimeoutRef.current) {
  //       clearTimeout(endTimeoutRef.current);
  //     }
  //   };
  // }, [endInput]);

  // State for journey comparison view
  const [foundJourneys, setFoundJourneys] = useState<Journey[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  // Handler for selecting a journey
  const handleSelectJourney = async (journey: Journey) => {
    console.log("🎯 handleSelectJourney called with:", journey);
    setIsLoadingStart(true);

    try {
      // Save selected journey to backend
      const mutation = Mutation();
      // Map journey segments to mutation input format
      const inputSegments = journey.segments.map((seg) => ({
        from: {
          stopId: seg.from.stopId,
          stopName: seg.from.stopName,
          coordinates: {
            latitude: seg.from.coordinates.latitude,
            longitude: seg.from.coordinates.longitude,
          },
        },
        to: {
          stopId: seg.to.stopId,
          stopName: seg.to.stopName,
          coordinates: {
            latitude: seg.to.coordinates.latitude,
            longitude: seg.to.coordinates.longitude,
          },
        },
        lineId: seg.lineId,
        lineName: seg.lineName,
        transportType: seg.transportType,
        departureTime: seg.departureTime,
        arrivalTime: seg.arrivalTime,
        duration: seg.duration,
      }));

      const mutationResult = await mutation({
        setActiveJourney: [
          {
            input: {
              segments: inputSegments as never,
            },
          },
          {
            segments: {
              from: {
                stopId: true,
                stopName: true,
                coordinates: {
                  latitude: true,
                  longitude: true,
                },
              },
              to: {
                stopId: true,
                stopName: true,
                coordinates: {
                  latitude: true,
                  longitude: true,
                },
              },
              lineId: true,
              lineName: true,
              transportType: true,
              departureTime: true,
              arrivalTime: true,
              duration: true,
              hasIncident: true,
            },
            startTime: true,
            expectedEndTime: true,
          },
        ],
      });

      console.log("📤 Mutation result:", mutationResult);

      if (mutationResult.setActiveJourney) {
        console.log("✅ setActiveJourney succeeded!");
        const activeJourneyData = mutationResult.setActiveJourney;
        const firstSeg = activeJourneyData.segments[0];
        const lastSeg =
          activeJourneyData.segments[activeJourneyData.segments.length - 1];

        // Update Zustand store
        setUserActiveJourney({
          segments: activeJourneyData.segments
            .filter((seg) => seg !== undefined)
            .map((seg) => ({
              from: {
                stopId: seg.from?.stopId || "",
                stopName: seg.from?.stopName || "",
                coordinates: {
                  latitude: seg.from?.coordinates?.latitude || 0,
                  longitude: seg.from?.coordinates?.longitude || 0,
                },
              },
              to: {
                stopId: seg.to?.stopId || "",
                stopName: seg.to?.stopName || "",
                coordinates: {
                  latitude: seg.to?.coordinates?.latitude || 0,
                  longitude: seg.to?.coordinates?.longitude || 0,
                },
              },
              lineId: seg.lineId || "",
              lineName: seg.lineName || "",
              transportType: seg.transportType || "BUS",
              departureTime: seg.departureTime || "",
              arrivalTime: seg.arrivalTime || "",
              duration: seg.duration || 0,
              hasIncident:
                typeof seg.hasIncident === "boolean" ? seg.hasIncident : false,
            })),
          startTime: activeJourneyData.startTime || "",
          expectedEndTime: activeJourneyData.expectedEndTime || "",
        });

        toast.success("Podróż zapisana!", {
          description: `Z ${firstSeg.from.stopName} do ${lastSeg.to.stopName}`,
        });

        // Close dialog and reset
        console.log("🔄 Closing dialog and resetting state");
        setOpen(false);
        setShowComparison(false);
        setFoundJourneys([]);
        setStartPoint(null);
        setEndPoint(null);
        setStartInput("");
        setEndInput("");
      } else {
        console.error("❌ setActiveJourney returned null!");
        toast.error("Nie udało się zapisać podróży", {
          description: "Spróbuj ponownie.",
        });
      }
    } catch (error) {
      console.error("Error saving journey:", error);
      toast.error("Błąd podczas zapisywania", {
        description:
          error instanceof Error ? error.message : "Spróbuj ponownie.",
      });
    } finally {
      setIsLoadingStart(false);
    }
  };

  // Find nearest stop to coordinates
  const findNearestStop = async (
    lat: number,
    lon: number,
  ): Promise<Stop | null> => {
    try {
      const query = Query();
      const result = await query({
        stops: [
          {},
          {
            id: true,
            name: true,
            coordinates: {
              latitude: true,
              longitude: true,
            },
          },
        ],
      });

      if (!result.stops || result.stops.length === 0) return null;

      // Calculate distances and find nearest
      const stopsWithDistance = result.stops.map((stop) => ({
        stop,
        distance: Math.sqrt(
          Math.pow(stop.coordinates.latitude - lat, 2) +
            Math.pow(stop.coordinates.longitude - lon, 2),
        ),
      }));

      stopsWithDistance.sort((a, b) => a.distance - b.distance);
      const nearest = stopsWithDistance[0].stop;

      return {
        stopId: nearest.id,
        stopName: nearest.name,
        coordinates: {
          latitude: nearest.coordinates.latitude,
          longitude: nearest.coordinates.longitude,
        },
      };
    } catch (error) {
      console.error("Error finding nearest stop:", error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startPoint || !endPoint) {
      return;
    }

    setIsLoadingStart(true);

    try {
      // First, find nearest stops to the coordinates
      const [startStop, endStop] = await Promise.all([
        findNearestStop(startPoint.lat, startPoint.lon),
        findNearestStop(endPoint.lat, endPoint.lon),
      ]);

      if (!startStop || !endStop) {
        toast.error("Nie znaleziono przystanków", {
          description: "Nie można znaleźć najbliższych przystanków.",
        });
        setIsLoadingStart(false);
        return;
      }

      // Call new optimal journey finder
      const query = Query();
      const result = await query({
        findOptimalJourney: [
          {
            input: {
              fromStopId: startStop.stopId,
              toStopId: endStop.stopId,
              departureTime: new Date().toISOString(),
              maxTransfers: 3,
              avoidIncidents: true,
            },
          },
          {
            journeys: {
              segments: {
                from: {
                  stopId: true,
                  stopName: true,
                  coordinates: {
                    latitude: true,
                    longitude: true,
                  },
                },
                to: {
                  stopId: true,
                  stopName: true,
                  coordinates: {
                    latitude: true,
                    longitude: true,
                  },
                },
                lineId: true,
                lineName: true,
                transportType: true,
                departureTime: true,
                arrivalTime: true,
                duration: true,
                hasIncident: true,
                incidentDelay: true,
                incidentSeverity: true,
              },
              totalDuration: true,
              totalDistance: true,
              transferCount: true,
              hasIncidents: true,
              departureTime: true,
              arrivalTime: true,
              alternativeAvailable: true,
            },
            hasAlternatives: true,
          },
        ],
      });

      console.log("=== Optimal Journey Response ===");
      console.log("Start Stop:", startStop.stopName);
      console.log("End Stop:", endStop.stopName);
      console.log("Journeys Found:", result.findOptimalJourney.journeys.length);

      if (
        result.findOptimalJourney.journeys &&
        result.findOptimalJourney.journeys.length > 0
      ) {
        // Store journeys and show comparison view
        const journeys = result.findOptimalJourney.journeys as Journey[];
        console.log("🎯 Setting journeys:", journeys);
        console.log("🎯 Journey segments:", journeys[0].segments);
        setFoundJourneys(journeys);
        setShowComparison(true);
        setIsLoadingStart(false);

        toast.success("Znaleziono trasy!", {
          description: `${journeys.length} ${journeys.length === 1 ? "trasa" : journeys.length < 5 ? "trasy" : "tras"} dostępne`,
        });
      } else {
        toast.error("Nie znaleziono tras", {
          description:
            "Nie można znaleźć połączenia między tymi lokalizacjami.",
        });
        setIsLoadingStart(false);
      }
    } catch (error) {
      console.error("Error fetching journey path:", error);
      toast.error("Failed to plan journey", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
      setIsLoadingStart(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg"
          aria-label="Dodaj podróż"
          variant="secondary"
        >
          <MapPin className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        {(() => {
          console.log("🖼️ Render: showComparison =", showComparison);
          console.log("🖼️ Render: foundJourneys =", foundJourneys.length);
          return null;
        })()}
        {showComparison ? (
          <>
            <DialogHeader>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowComparison(false);
                  setFoundJourneys([]);
                }}
                className="w-fit"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Wstecz
              </Button>
              <DialogTitle>Wybierz trasę</DialogTitle>
              <DialogDescription>
                Porównaj alternatywne trasy i wybierz najlepszą
              </DialogDescription>
            </DialogHeader>
            <JourneyComparison
              journeys={foundJourneys}
              onSelectJourney={handleSelectJourney}
            />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Zaplanuj swoją podróż</DialogTitle>
              <DialogDescription>
                Ustaw punkt początkowy i docelowy, aby zaplanować trasę
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Start Point */}
              <div className="space-y-2">
                <Label htmlFor="start-point">Punkt początkowy</Label>
                <div className="relative">
                  <Input
                    id="start-point"
                    type="text"
                    placeholder="Wprowadź adres początkowy..."
                    value={startInput}
                    disabled
                    // onChange={(e) => setStartInput(e.target.value)}
                    // onFocus={() =>
                    //   setShowStartSuggestions(startSuggestions.length > 0)
                    // }
                    className="pr-10"
                    required
                  />
                  {isLoadingStart && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
                  )}

                  {/* Suggestions dropdown */}
                  {showStartSuggestions && startSuggestions.length > 0 && (
                    <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white shadow-lg dark:bg-gray-950">
                      {startSuggestions.map((suggestion, index) => (
                        <button
                          key={`start-${index}`}
                          type="button"
                          // onClick={() => handleStartSelect(suggestion)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none dark:hover:bg-gray-800 dark:focus:bg-gray-800"
                        >
                          {suggestion.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  // onClick={() => handleUseCurrentLocation("start")}
                  disabled={isLoadingStart}
                  className="w-full"
                >
                  <Navigation className="mr-2 h-4 w-4" />
                  Użyj bieżącej lokalizacji
                </Button>
              </div>

              {/* End Point */}
              <div className="space-y-2">
                <Label htmlFor="end-point">Miejsce docelowe</Label>
                <div className="relative">
                  <Input
                    id="end-point"
                    type="text"
                    placeholder="Wprowadź adres docelowy..."
                    value={endInput}
                    disabled
                    // onChange={(e) => setEndInput(e.target.value)}
                    // onFocus={() => setShowEndSuggestions(endSuggestions.length > 0)}
                    className="pr-10"
                    required
                  />
                  {isLoadingEnd && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
                  )}

                  {/* Suggestions dropdown */}
                  {showEndSuggestions && endSuggestions.length > 0 && (
                    <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white shadow-lg dark:bg-gray-950">
                      {endSuggestions.map((suggestion, index) => (
                        <button
                          key={`end-${index}`}
                          type="button"
                          // onClick={() => handleEndSelect(suggestion)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none dark:hover:bg-gray-800 dark:focus:bg-gray-800"
                        >
                          {suggestion.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Points Summary
              {(startPoint || endPoint) && (
                <div className="rounded-lg bg-gray-50 p-4 text-sm dark:bg-gray-900">
                  {startPoint && (
                    <div className="mb-2">
                      <span className="font-medium text-green-600">Start:</span>
                      <p className="text-gray-600 dark:text-gray-400">
                        {startPoint.address}
                      </p>
                    </div>
                  )}
                  {endPoint && (
                    <div>
                      <span className="font-medium text-red-600">Cel:</span>
                      <p className="text-gray-600 dark:text-gray-400">
                        {endPoint.address}
                      </p>
                    </div>
                  )}
                </div>
              )} */}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStartPoint(null);
                    setEndPoint(null);
                    setStartInput("");
                    setEndInput("");
                    setOpen(false);
                  }}
                  disabled={isLoadingStart}
                >
                  Anuluj
                </Button>
                <Button
                  type="submit"
                  disabled={!startPoint || !endPoint || isLoadingStart}
                >
                  {isLoadingStart ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wyszukiwanie trasy...
                    </>
                  ) : (
                    "Zaplanuj podróż"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
