"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, Shield, Bell, LayoutDashboard, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requireAuth?: boolean;
  requireRole?: string;
}

const navItems: NavItem[] = [
  {
    name: "Strona główna",
    href: "/",
    icon: Home,
  },
  {
    name: "Alerty",
    href: "/alerts",
    icon: Bell,
    requireAuth: true,
  },
  {
    name: "Panel",
    href: "/dashboard",
    icon: LayoutDashboard,
    requireAuth: true,
  },
  {
    name: "Profil",
    href: "/user",
    icon: User,
    requireAuth: true,
  },
  {
    name: "Moderator",
    href: "/moderator",
    icon: Shield,
    requireAuth: true,
    requireRole: "MODERATOR",
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

  // Use different nav items based on auth status
  const items = session ? navItems : guestNavItems;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[9999] border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:bg-gray-950/95 dark:supports-[backdrop-filter]:bg-gray-950/80 md:hidden touch-ui"
      style={{ position: "fixed", bottom: 0 }}
    >
      <div className="flex h-16 items-center justify-around px-2">
        {items.map((item) => {
          if (item.requireAuth && !session) {
            return null;
          }
          const isActive = pathname === item.href;
          const Icon = item.icon;
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
              <span className={cn(isActive && "font-semibold")}>
                {item.name}
              </span>
              {isActive && (
                <div className="absolute -bottom-0 h-0.5 w-12 rounded-t-full bg-blue-600 dark:bg-blue-400" />
              )}
            </Link>
          );
        })}
      </div>
      {/* Safe area spacing for iOS devices */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
