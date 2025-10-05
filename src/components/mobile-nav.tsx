"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  User,
  Shield,
  Bell,
  LayoutDashboard,
  LogIn,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession, signOut } from "next-auth/react";
import { useAppStore } from "@/store/app-store";
import { useState } from "react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requireAuth?: boolean;
  requireRole?: string;
  hideForRole?: string; // Hide for specific role
}

const navItems: NavItem[] = [
  {
    name: "Strona główna",
    href: "/",
    icon: Home,
  },
  {
    name: "Powiadomienia",
    href: "/pwa",
    icon: Bell,
    requireAuth: true,
  },

  {
    name: "Profil",
    href: "/user",
    icon: User,
    requireAuth: true,
    hideForRole: "ADMIN", // Hide profile for admins
  },
  {
    name: "Wyloguj",
    href: "#logout",
    icon: LogOut,
    requireAuth: true,
  },
];

const adminNavItems: NavItem[] = [
  {
    name: "Strona główna",
    href: "/",
    icon: Home,
  },
  {
    name: "Powiadomienia",
    href: "/pwa",
    icon: Bell,
    requireAuth: true,
  },

  {
    name: "Admin",
    href: "/admin",
    icon: Shield,
    requireAuth: true,
    requireRole: "ADMIN",
  },
  {
    name: "Wyloguj",
    href: "#logout",
    icon: LogOut,
    requireAuth: true,
  },
];

const guestNavItems: NavItem[] = [
  {
    name: "Strona główna",
    href: "/",
    icon: Home,
  },
  {
    name: "Zaloguj",
    href: "/auth/signin",
    icon: LogIn,
  },
];

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const clearStore = useAppStore((state) => state.clearStore);
  // Check if user has admin role
  const userRole = session?.user?.role;
  const isAdmin = userRole === "ADMIN";
  console.log("isAdmin", isAdmin);
  // Use different nav items based on auth status
  const items = session ? (isAdmin ? adminNavItems : navItems) : guestNavItems;

  const handleLogout = async () => {
    setIsSigningOut(true);
    try {
      // Clear store and localStorage
      clearStore();
      if (typeof window !== "undefined") {
        localStorage.removeItem("activeJourneyLineIds");
      }

      // Don't await - let Next.js handle the redirect
      signOut({ callbackUrl: "/", redirect: true });
    } catch (error) {
      console.error("Error signing out:", error);
      setIsSigningOut(false);
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[9999] border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:bg-gray-950/95 dark:supports-[backdrop-filter]:bg-gray-950/80 md:hidden touch-ui"
      style={{ position: "fixed", bottom: 0 }}
    >
      <div className="flex h-16 items-center justify-around px-2">
        {items.map((item) => {
          // Skip if requires auth and user is not logged in
          if (item.requireAuth && !session) {
            return null;
          }

          // Skip if requires admin role and user doesn't have it
          if (item.requireRole === "ADMIN" && !isAdmin) {
            return null;
          }

          // Skip if should be hidden for specific role
          if (item.hideForRole && userRole === item.hideForRole) {
            return null;
          }

          const isActive = pathname === item.href;
          const Icon = item.icon;
          const isLogout = item.href === "#logout";

          // Handle logout button separately
          if (isLogout) {
            return (
              <button
                key={item.name}
                onClick={handleLogout}
                disabled={isSigningOut}
                className={cn(
                  "flex min-w-[64px] flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  "text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300",
                  isSigningOut && "opacity-50 cursor-not-allowed",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform",
                    isSigningOut && "animate-pulse",
                  )}
                />
                <span>{isSigningOut ? "..." : item.name}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex min-w-[64px] flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform",
                  isActive && "scale-110",
                )}
              />
              <span className={cn("text-center", isActive && "font-semibold ")}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Safe area spacing for iOS devices */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
