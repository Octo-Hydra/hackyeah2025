import {
  ArrowRight,
  AlertTriangle,
  Train,
  Bus,
  Clock,
  MapPin,
  Navigation,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { PathSegment, useAppStore } from "@/store/app-store";

interface RouteNotificationProps {
  startCity: string;
  endCity: string;
  distance?: string;
  duration?: string;
  delayMinutes?: number;
  className?: string;
  segments?: PathSegment[];
}

export function RouteNotification({
  startCity,
  endCity,
  distance,
  duration,
  delayMinutes,
  className,
  segments = [],
}: RouteNotificationProps) {
  const setScrollWheelZoom = useAppStore((state) => state.setScrollWheelZoom);

  const handleAccordionChange = (value: string) => {
    // If accordion is open (value is truthy), disable map scroll
    // If accordion is closed (value is empty), enable map scroll
    setScrollWheelZoom(value === "");
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-accent/20 bg-white/95 backdrop-blur-sm shadow-2xl",
        "animate-in slide-in-from-top-4 fade-in duration-500",
        "w-full max-w-2xl mx-auto md:mr-0",
        "sm:max-w-xl md:max-w-2xl",
        className,
      )}
    >
      {/* Glowing accent line */}

      <div className="relative p-3 sm:p-4 md:p-5">
        {/* Route display */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-3">
          {/* Start City */}
          <div className="flex-1 min-w-0">
            <div className="flex items-end gap-2">
              <Image
                src="/apple-touch-icon.png"
                alt="OnTime"
                width={32}
                height={32}
                className="rounded-lg"
              />

              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-primary/60 mb-0.5">
                  Z
                </p>

                <p className="text-base sm:text-lg font-bold text-primary truncate">
                  {startCity}
                </p>
              </div>
            </div>
          </div>

          {/* Arrow indicator */}
          <div className="flex sm:flex-col items-center justify-center gap-2 sm:gap-1 sm:px-2 shrink-0 py-1 sm:py-0">
            <ArrowRight
              className="w-5 h-5 sm:w-6 sm:h-6 text-primary/70 animate-pulse rotate-90 sm:rotate-0"
              strokeWidth={2.5}
            />
            {(distance || duration) && (
              <div className="flex sm:flex-col gap-2 sm:gap-0 sm:text-center">
                {distance && (
                  <p className="text-xs sm:text-xs font-semibold text-primary/70 whitespace-nowrap">
                    {distance}
                  </p>
                )}
                {duration && (
                  <p className="text-[14px]  md:text-base text-primary/60 whitespace-nowrap">
                    {duration}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* End City */}
          <div className="flex-1 min-w-0">
            <div className="flex items-end gap-2">
              <Image
                src="/apple-touch-icon.png"
                alt="OnTime"
                width={32}
                height={32}
                className="rounded-lg"
              />

              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-primary/70 mb-0.5">
                  Do
                </p>
                <p className="text-base sm:text-lg font-bold text-primary/90 truncate">
                  {endCity}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Delay warning */}
        {delayMinutes !== undefined && delayMinutes > 0 && (
          <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-red-50 px-3 py-2 dark:bg-red-950/30">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              Opóźnienie: +{delayMinutes} min
            </p>
          </div>
        )}
        {/* Accordion for journey segments */}
        {segments.length > 0 && (
          <div className="mt-4">
            <Accordion
              type="single"
              collapsible
              className="w-full"
              onValueChange={handleAccordionChange}
            >
              <AccordionItem value="segments">
                <AccordionTrigger className="justify-between">
                  <div className="flex items-center gap-2 w-full justify-between">
                    <span className="font-semibold text-primary">
                      Szczegóły trasy
                    </span>
                    {/* Chevron is included by default in AccordionTrigger */}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div
                    className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto overflow-x-hidden scroll-container focus:outline-none"
                    tabIndex={0}
                    role="region"
                    aria-label="Szczegóły segmentów trasy"
                    onWheel={(e) => {
                      // Always prevent wheel events from reaching the map
                      e.stopPropagation();
                      e.preventDefault();

                      // Manually handle the scroll
                      const target = e.currentTarget;
                      const scrollAmount = e.deltaY;
                      target.scrollTop += scrollAmount;
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                    }}
                    onTouchMove={(e) => {
                      e.stopPropagation();
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                    onMouseMove={(e) => {
                      e.stopPropagation();
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                    }}
                    onPointerMove={(e) => {
                      e.stopPropagation();
                    }}
                    style={{ touchAction: "pan-y" }}
                  >
                    {segments.map((seg, idx) => {
                      // Get icon based on transport type
                      const getSegmentIcon = () => {
                        if (seg.transportType === "BUS") {
                          return <Bus className="w-5 h-5 text-green-500" />;
                        } else if (seg.transportType === "RAIL") {
                          return <Train className="w-5 h-5 text-purple-500" />;
                        }
                        return <Navigation className="w-5 h-5 text-gray-500" />;
                      };

                      return (
                        <div
                          key={idx}
                          className={cn(
                            "rounded-xl border-2 p-4 bg-gradient-to-br shadow-sm transition-all hover:shadow-md",
                            "from-white to-accent/20 border-accent/30",
                            seg.hasIncident && "border-red-300 bg-red-50/30",
                          )}
                        >
                          {/* Header with icon and type */}
                          <div className="flex items-start gap-3 mb-3">
                            <div className="flex-shrink-0 p-2 rounded-lg bg-white/80 shadow-sm">
                              {getSegmentIcon()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-primary/90">
                                  {seg.lineName || "Transport"}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary/70 font-medium">
                                  {seg.transportType}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                Linia: {seg.lineName}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-xs text-primary/70">
                                <Clock className="w-3 h-3" />
                                <span className="font-semibold">
                                  {seg.duration} min
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* From -> To */}
                          <div className="space-y-2 pl-1">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground mb-0.5">
                                  Początek
                                </p>
                                <p className="text-sm font-semibold text-primary truncate">
                                  {seg.from.stopName || "Nieznana lokalizacja"}
                                </p>
                                <p className="text-xs text-primary/60">
                                  Odjazd: {seg.departureTime}
                                </p>
                              </div>
                            </div>

                            {/* Connecting line */}
                            <div className="flex items-center gap-2 pl-2">
                              <div className="w-px h-6 bg-gradient-to-b from-accent/60 to-accent/20" />
                              <ArrowRight className="w-3 h-3 text-accent/50" />
                            </div>

                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground mb-0.5">
                                  Koniec
                                </p>
                                <p className="text-sm font-semibold text-primary truncate">
                                  {seg.to.stopName || "Nieznana lokalizacja"}
                                </p>
                                <p className="text-xs text-primary/60">
                                  Przyjazd: {seg.arrivalTime}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Incident Warning */}
                          {seg.hasIncident && (
                            <div className="mt-3 pt-3 border-t border-red-200/50">
                              <div className="flex items-start gap-2 text-xs">
                                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <p className="font-semibold text-red-700 mb-0.5">
                                    Uwaga: Incydent na tej trasie
                                  </p>
                                  <p className="text-red-600/90">
                                    Na tym odcinku zgłoszono incydent. Sprawdź
                                    aktualny status.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </div>

      {/* Bottom accent glow */}
      {/* <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent" /> */}
      {/* <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" /> */}
    </div>
  );
}
