"use client";

import { MobileNav } from "./mobile-nav";
import { cn } from "@/lib/utils";

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
  return (
    <div className={cn("flex min-h-screen flex-col", className)}>
      <main
        className={cn(
          "flex-1",
          showNav && "pb-16 md:pb-0", // Add padding for mobile nav
        )}
      >
        {children}
      </main>
      {showNav && <MobileNav />}
    </div>
  );
}
