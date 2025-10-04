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

interface LocationPoint {
  address: string;
  lat: number;
  lon: number;
}

export function AddJourneyDialog() {
  const [open, setOpen] = useState(false);
  const [startPoint, setStartPoint] = useState<LocationPoint | null>(null);
  const [endPoint, setEndPoint] = useState<LocationPoint | null>(null);

  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");

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
  useEffect(() => {
    if (startInput.length < 3) {
      setStartSuggestions([]);
      return;
    }

    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
    }

    startTimeoutRef.current = setTimeout(async () => {
      setIsLoadingStart(true);
      try {
        if (providerRef.current) {
          const results = await providerRef.current.search({
            query: startInput,
          });
          setStartSuggestions(results as GeoSearchResult[]);
          setShowStartSuggestions(true);
        }
      } catch (error) {
        console.error("Error fetching start suggestions:", error);
      } finally {
        setIsLoadingStart(false);
      }
    }, 300);

    return () => {
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current);
      }
    };
  }, [startInput]);

  // Debounced search for end point
  useEffect(() => {
    if (endInput.length < 3) {
      setEndSuggestions([]);
      return;
    }

    if (endTimeoutRef.current) {
      clearTimeout(endTimeoutRef.current);
    }

    endTimeoutRef.current = setTimeout(async () => {
      setIsLoadingEnd(true);
      try {
        if (providerRef.current) {
          const results = await providerRef.current.search({ query: endInput });
          setEndSuggestions(results as GeoSearchResult[]);
          setShowEndSuggestions(true);
        }
      } catch (error) {
        console.error("Error fetching end suggestions:", error);
      } finally {
        setIsLoadingEnd(false);
      }
    }, 300);

    return () => {
      if (endTimeoutRef.current) {
        clearTimeout(endTimeoutRef.current);
      }
    };
  }, [endInput]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!startPoint || !endPoint) {
      return;
    }

    // TODO: Display route on map
    console.log("Journey:", {
      start: startPoint,
      end: endPoint,
    });

    // Reset and close
    setStartPoint(null);
    setEndPoint(null);
    setStartInput("");
    setEndInput("");
    setOpen(false);
  };

  const handleUseCurrentLocation = async (type: "start" | "end") => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
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
          aria-label="Add journey"
          variant="secondary"
        >
          <MapPin className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Plan Your Journey</DialogTitle>
          <DialogDescription>
            Set your start and destination points to plan your route
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Start Point */}
          <div className="space-y-2">
            <Label htmlFor="start-point">Start Point</Label>
            <div className="relative">
              <Input
                id="start-point"
                type="text"
                placeholder="Enter start address..."
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                onFocus={() =>
                  setShowStartSuggestions(startSuggestions.length > 0)
                }
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
                      onClick={() => handleStartSelect(suggestion)}
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
              onClick={() => handleUseCurrentLocation("start")}
              disabled={isLoadingStart}
              className="w-full"
            >
              <Navigation className="mr-2 h-4 w-4" />
              Use Current Location
            </Button>
          </div>

          {/* End Point */}
          <div className="space-y-2">
            <Label htmlFor="end-point">Destination</Label>
            <div className="relative">
              <Input
                id="end-point"
                type="text"
                placeholder="Enter destination address..."
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
                onFocus={() => setShowEndSuggestions(endSuggestions.length > 0)}
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
                      onClick={() => handleEndSelect(suggestion)}
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
                  <span className="font-medium text-red-600">Destination:</span>
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
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!startPoint || !endPoint}>
              Plan Journey
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
