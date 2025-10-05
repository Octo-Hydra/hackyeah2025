"use client";

import { MobileNav } from "./mobile-nav";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface MobileLayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
  className?: string;
  isMobile?: boolean; // Passed from server via SSR detection
}

export function MobileLayout({
  children,
  showNav = true,
  className,
  isMobile = false,
}: MobileLayoutProps) {
  useEffect(() => {
    // Only apply scroll lock if device is mobile (detected on server)
    // No need for client-side window.innerWidth check anymore
    if (showNav && isMobile) {
      document.documentElement.style.overflow = "hidden";
      document.documentElement.style.height = "100%";
      document.body.style.overflow = "hidden";
      document.body.style.height = "100%";

      return () => {
        document.documentElement.style.overflow = "";
        document.documentElement.style.height = "";
        document.body.style.overflow = "";
        document.body.style.height = "";
      };
    }
  }, [showNav, isMobile]);

  return (
    <div className={cn("flex min-h-screen flex-col", className)}>
      <main className={cn("flex-1", showNav && "pb-16 md:pb-0")}>
        {children}
      </main>
      {showNav && <MobileNav />}
    </div>
  );
}
