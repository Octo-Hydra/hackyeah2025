import { MapPin, ArrowRight, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

interface RouteNotificationProps {
  startCity: string;
  endCity: string;
  distance?: string;
  duration?: string;
  className?: string;
}

export function RouteNotification({
  startCity,
  endCity,
  distance,
  duration,
  className,
}: RouteNotificationProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-primary/20 bg-primary/95 backdrop-blur-sm shadow-2xl",
        "animate-in slide-in-from-top-4 fade-in duration-500",
        "w-full max-w-2xl mx-auto",
        "sm:max-w-xl md:max-w-2xl",
        className,
      )}
    >
      {/* Glowing accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent" />

      {/* Subtle grid pattern background */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px),
                           linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />
      </div>

      <div className="relative p-3 sm:p-4 md:p-5">
        {/* Header with icon */}
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-accent/20">
            <Navigation className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-primary-foreground/80">
            Route Information
          </span>
        </div>

        {/* Route display */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-3">
          {/* Start City */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-accent/20 border-2 border-accent shrink-0 mt-0.5 sm:mt-1">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-accent fill-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-primary-foreground/60 mb-0.5">
                  From
                </p>
                <p className="text-base sm:text-lg font-bold text-primary-foreground truncate">
                  {startCity}
                </p>
              </div>
            </div>
          </div>

          {/* Arrow indicator */}
          <div className="flex sm:flex-col items-center justify-center gap-2 sm:gap-1 sm:px-2 shrink-0 py-1 sm:py-0">
            <ArrowRight
              className="w-5 h-5 sm:w-6 sm:h-6 text-accent animate-pulse rotate-90 sm:rotate-0"
              strokeWidth={2.5}
            />
            {(distance || duration) && (
              <div className="flex sm:flex-col gap-2 sm:gap-0 sm:text-center">
                {distance && (
                  <p className="text-xs sm:text-xs font-semibold text-accent whitespace-nowrap">
                    {distance}
                  </p>
                )}
                {duration && (
                  <p className="text-[10px] text-primary-foreground/60 whitespace-nowrap">
                    {duration}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* End City */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-accent border-2 border-accent shrink-0 mt-0.5 sm:mt-1">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary fill-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-primary-foreground/60 mb-0.5">
                  To
                </p>
                <p className="text-base sm:text-lg font-bold text-primary-foreground truncate">
                  {endCity}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom accent glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
    </div>
  );
}
