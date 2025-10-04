"use client";

import { MobileNav } from "./mobile-nav";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { useViewportFix } from "@/hooks/use-viewport-fix";

interface MobileLayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
  className?: string;
}

export function MobileLayout({
  children,
  showNav = true,
  className,
}: MobileLayoutProps) {
  // Apply viewport fix for mobile
  useViewportFix();

  useEffect(() => {
    // Prevent scroll on mobile to keep nav fixed
    if (showNav && typeof window !== "undefined") {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        document.documentElement.style.overflow = "hidden";
        document.documentElement.style.height = "100%";
        document.body.style.overflow = "hidden";
        document.body.style.height = "100%";
      }

      return () => {
        document.documentElement.style.overflow = "";
        document.documentElement.style.height = "";
        document.body.style.overflow = "";
        document.body.style.height = "";
      };
    }
  }, [showNav]);

  return (
    <div className={cn("flex min-h-screen flex-col", className)}>
      <main
        className={cn(
          "flex-1",
          showNav && "pb-20 md:pb-0", // Add extra padding for mobile nav
        )}
      >
        {children}
      </main>
      {showNav && <MobileNav />}
    </div>
  );
}
