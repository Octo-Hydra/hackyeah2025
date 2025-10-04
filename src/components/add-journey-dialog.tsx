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
import { MapPin, Loader2, Navigation } from "lucide-react";
import { OpenStreetMapProvider } from "leaflet-geosearch";
import type { SearchResult as GeoSearchResult } from "leaflet-geosearch/dist/providers/provider.js";
import { Query, Mutation } from "@/lib/graphql_request";
import { mapSegmentsToRoute } from "@/lib/map-utils";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";

interface LocationPoint {
  address: string;
  lat: number;
  lon: number;
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

  const [startSuggestions, setStartSuggestions] = useState<GeoSearchResult[]>(
    [],
  );
  const [endSuggestions, setEndSuggestions] = useState<GeoSearchResult[]>([]);

  const [isLoadingStart, setIsLoadingStart] = useState(false);
  const [isLoadingEnd, setIsLoadingEnd] = useState(false);

  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showEndSuggestions, setShowEndSuggestions] = useState(false);

  const startTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const endTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

  const handleStartSelect = (suggestion: GeoSearchResult) => {
    setStartPoint({
      address: suggestion.label,
      lat: suggestion.y,
      lon: suggestion.x,
    });
    setStartInput(suggestion.label);
    setShowStartSuggestions(false);
    setStartSuggestions([]);
  };

  const handleEndSelect = (suggestion: GeoSearchResult) => {
    setEndPoint({
      address: suggestion.label,
      lat: suggestion.y,
      lon: suggestion.x,
    });
    setEndInput(suggestion.label);
    setShowEndSuggestions(false);
    setEndSuggestions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startPoint || !endPoint) {
      return;
    }

    setIsLoadingStart(true); // Reuse loading state for submit

    try {
      // Import the GraphQL client utilityconst
      const query = Query();
      const result = await query({
        findPath: [
          {
            input: {
              from: {
                latitude: startPoint.lat,
                longitude: startPoint.lon,
              },
              to: {
                latitude: endPoint.lat,
                longitude: endPoint.lon,
              },
            },
          },
          {
            totalDuration: true,
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
              lineName: true,
              lineId: true,
              transportType: true,
              departureTime: true,
              arrivalTime: true,
              duration: true,
            },
            warnings: true,
          },
        ],
      });

      // Query the findPath endpoint

      console.log("=== Journey Path Response ===");
      console.log("Start:", startPoint);
      console.log("End:", endPoint);
      console.log("Path Result:", result.findPath);

      if (result.findPath) {
        console.log(
          "Total Duration:",
          result.findPath.totalDuration,
          "minutes",
        );
        console.log("Segments:", result.findPath.segments);
        console.log("Warnings:", result.findPath.warnings);

        // Map segments to route format for map display
        const mappedRoute = mapSegmentsToRoute(result.findPath);

        if (mappedRoute) {
          if (result.findPath.segments && result.findPath.segments.length > 0) {
            // Call GraphQL mutation to set active journey with all segments
            const mutation = Mutation();
            const mutationResult = await mutation({
              setActiveJourney: [
                {
                  input: {
                    segments: result.findPath.segments,
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

            // Check if mutation returned active journey
            if (mutationResult.setActiveJourney) {
              const activeJourneyData = mutationResult.setActiveJourney;
              const firstSeg = activeJourneyData.segments[0];
              const lastSeg =
                activeJourneyData.segments[
                  activeJourneyData.segments.length - 1
                ];

              // Update user's active journey in Zustand store
              setUserActiveJourney({
                segments: activeJourneyData.segments.map((seg) => ({
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
                  hasIncident: seg.hasIncident,
                })),
                startTime: activeJourneyData.startTime,
                expectedEndTime: activeJourneyData.expectedEndTime,
              });

              toast.success("Journey saved!", {
                description: `From ${firstSeg.from.stopName} to ${lastSeg.to.stopName}`,
              });
            } else {
              toast.error("Failed to save journey", {
                description:
                  "Could not save your active journey. Please try again.",
              });
            }

            // Also save to local store for map display

            console.log("\n✅ Journey saved to backend and Zustand store!");
            console.log("✅ User data updated with active journey");
          } else {
            console.log("Could not map route for display");
            toast.warning("Journey saved with limited map data", {
              description: "Route mapping unavailable, but journey is tracked.",
            });
          }
        } else {
          console.log("No segments found in path");
          toast.warning("Journey incomplete", {
            description: "No valid segments found in the route.",
          });
        }
      } else {
        console.log("No path found");
        toast.error("No path found", {
          description: "Could not find a route between these locations.",
        });
      }
    } catch (error) {
      console.error("Error fetching journey path:", error);
      toast.error("Failed to plan journey", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsLoadingStart(false);
    }

    // Reset and close
    setStartPoint(null);
    setEndPoint(null);
    setStartInput("");
    setEndInput("");
    setOpen(false);
  };

  const handleUseCurrentLocation = async (type: "start" | "end") => {
    if (!navigator.geolocation) {
      alert("Geolokalizacja nie jest obsługiwana przez Twoją przeglądarkę");
      return;
    }

    const setLoading = type === "start" ? setIsLoadingStart : setIsLoadingEnd;
    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Reverse geocoding to get address
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
          );
          const data = await response.json();

          const location = {
            address: data.display_name,
            lat: latitude,
            lon: longitude,
          };

          if (type === "start") {
            setStartPoint(location);
            setStartInput(data.display_name);
          } else {
            setEndPoint(location);
            setEndInput(data.display_name);
          }
        } catch (error) {
          console.error("Error reverse geocoding:", error);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        setLoading(false);
      },
    );
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
      <DialogContent className="max-w-md">
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

          {/* Selected Points Summary */}
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
          )}

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
      </DialogContent>
    </Dialog>
  );
}
