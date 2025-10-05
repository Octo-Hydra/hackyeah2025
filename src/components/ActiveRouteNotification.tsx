import { ArrowRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface RouteNotificationProps {
  startCity: string;
  endCity: string;
  distance?: string;
  duration?: string;
  delayMinutes?: number;
  className?: string;
}

export function RouteNotification({
  startCity,
  endCity,
  distance,
  duration,
  delayMinutes,
  className,
}: RouteNotificationProps) {
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
      </div>

      {/* Bottom accent glow */}
      {/* <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent" /> */}
      {/* <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" /> */}
    </div>
  );
}
