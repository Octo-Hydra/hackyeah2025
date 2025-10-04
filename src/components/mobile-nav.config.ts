/**
 * Mobile Navigation Preview
 *
 * This shows how the bottom navigation appears on mobile devices:
 *
 * ┌─────────────────────────────────┐
 * │  [Logo] OnTime         [Sign In]│  <- Compact Header
 * ├─────────────────────────────────┤
 * │                                 │
 * │                                 │
 * │        Page Content             │
 * │                                 │
 * │                                 │
 * ├─────────────────────────────────┤
 * │  [Home]  [Alerts] [Profile] [⚡]│  <- Bottom Nav
 * │   🏠      🔔       👤      🛡️   │
 * │  Home   Alerts  Profile  Mod    │
 * └─────────────────────────────────┘
 *
 * Features:
 * - Active tab highlighted in blue
 * - Icons scale up when active
 * - Blue indicator bar under active tab
 * - Auto-hides moderator tab if not logged in
 * - Auto-hides profile tab if not logged in
 * - Respects safe area for iPhone notch/home indicator
 *
 * Navigation Structure:
 *
 * / (Home)
 * ├── Full-screen map
 * ├── Compact header with logo
 * ├── FAB for quick alert creation
 * └── Welcome card (if not authenticated)
 *
 * /alerts (Alerts)
 * ├── Alert stats cards
 * ├── Alert list with severity badges
 * ├── "View on Map" buttons
 * └── Empty state with CTA
 *
 * /user (Profile)
 * ├── Avatar with initials
 * ├── User info cards
 * ├── Quick actions
 * └── Sign out button
 *
 * /moderator (Moderator)
 * ├── Dashboard stats
 * ├── Action cards
 * └── Recent activity feed
 *
 * Desktop Behavior:
 * - Bottom nav hidden (>= 768px)
 * - Traditional top navigation shown
 * - Full headers with breadcrumbs
 * - Larger content areas
 */

export const MOBILE_NAV_CONFIG = {
  height: 64, // 16 Tailwind units
  safeAreaBottom: "env(safe-area-inset-bottom)",
  items: [
    { name: "Home", href: "/", icon: "Home" },
    { name: "Alerts", href: "/alerts", icon: "Bell" },
    { name: "Profile", href: "/user", icon: "User", requireAuth: true },
    {
      name: "Moderator",
      href: "/moderator",
      icon: "Shield",
      requireAuth: true,
    },
  ],
} as const;
