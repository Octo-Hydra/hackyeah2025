/**
 * Mobile Navigation Preview
 *
 * This shows how the bottom navigation appears on mobile devices:
 *
 * Guest Users (Not Logged In):
 * ┌─────────────────────────────────┐
 * │  [Logo] OnTime         [Sign In]│  <- Compact Header
 * ├─────────────────────────────────┤
 * │                                 │
 * │        Page Content             │
 * │                                 │
 * ├─────────────────────────────────┤
 * │     [Home]          [Login]     │  <- Bottom Nav
 * │      🏠              🔑          │
 * │     Home           Login        │
 * └─────────────────────────────────┘
 *
 * Authenticated Users (Logged In):
 * ┌─────────────────────────────────┐
 * │  [Logo] OnTime                  │  <- Compact Header
 * ├─────────────────────────────────┤
 * │        Page Content             │
 * │        [+] FAB Button           │  <- Floating Action Button
 * │        [Alert Box]              │  <- Floating Alerts (on map)
 * ├─────────────────────────────────┤
 * │ [🏠] [📊] [👤] [🛡️]            │  <- Bottom Nav (4 items)
 * │ Home Dash Profile Mod           │
 * └─────────────────────────────────┘
 *
 * Features:
 * - Active tab highlighted in blue
 * - Icons scale up when active
 * - Blue indicator bar under active tab
 * - Alerts shown as floating sheet on map (not in nav)
 * - Dashboard tab added for logged users
 * - Moderator tab auto-hides if not moderator
 * - Respects safe area for iPhone notch/home indicator
 * - FAB (Floating Action Button) on pages with create actions
 *
 * Navigation Structure:
 *
 * / (Home)
 * ├── Full-screen map with transit info
 * ├── Compact header with logo
 * ├── FAB for journey planning (logged in)
 * └── Sign in prompt (if not authenticated)
 *
 * /alerts - DEPRECATED (Alerts now shown as floating sheet on map)
 *
 * /dashboard (Dashboard) - Requires Auth
 * ├── Welcome card with user info
 * ├── Activity stats (journeys, alerts)
 * ├── Quick actions
 * ├── FAB for journey planning
 * └── Sign out button
 *
 * /user (Profile) - Requires Auth
 * ├── Avatar with initials
 * ├── User info cards
 * ├── Quick actions
 * └── Sign out button
 *
 * /moderator (Moderator) - Requires Auth + Moderator Role
 * ├── Dashboard stats
 * ├── Action cards
 * └── Recent activity feed
 *
 * Desktop Behavior:
 * - Bottom nav hidden (>= 768px)
 * - Traditional top navigation shown
 * - Full headers with breadcrumbs
 * - Larger content areas
 * - No FAB (actions in headers)
 */

export const MOBILE_NAV_CONFIG = {
  height: 64, // 16 Tailwind units
  safeAreaBottom: "env(safe-area-inset-bottom)",
  authenticatedItems: [
    { name: "Home", href: "/", icon: "Home" },
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: "LayoutDashboard",
      requireAuth: true,
    },
    { name: "Profile", href: "/user", icon: "User", requireAuth: true },
    {
      name: "Moderator",
      href: "/moderator",
      icon: "Shield",
      requireAuth: true,
    },
  ],
  guestItems: [
    { name: "Home", href: "/", icon: "Home" },
    { name: "Login", href: "/auth/signin", icon: "LogIn" },
  ],
} as const;
