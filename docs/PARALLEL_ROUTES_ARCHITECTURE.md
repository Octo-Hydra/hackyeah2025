# Clean Parallel Routes Architecture

## Overview

The application has been restructured to keep the root layout clean with only the AuthProvider, while all parallel routes logic is encapsulated in the `(parallel)` route group folder.

## Directory Structure

```
src/app/
├── layout.tsx                        # ✨ Clean root layout (AuthProvider only)
├── globals.css                       # Global styles
├── manifest.ts                       # PWA manifest
├── favicon.ico                       # Favicon
│
├── (parallel)/                       # 📁 Route group for parallel routes
│   ├── layout.tsx                    # Handles children + modal slots
│   ├── page.tsx                      # Root page with map (/)
│   └── @modal/                       # Modal slot for intercepted routes
│       ├── default.tsx               # Returns null when no modal
│       └── (.)auth/                  # Intercepts /auth/* routes
│           └── signin/
│               └── page.tsx          # Modal sign-in dialog
│
├── auth/                             # Standard auth routes
│   └── signin/
│       └── page.tsx                  # Full-page sign-in (direct access)
│
├── user/                             # Protected user profile
│   └── page.tsx
│
├── moderator/                        # Protected moderator panel
│   └── page.tsx
│
├── dashboard/                        # Protected dashboard
│   └── page.tsx
│
├── pwa/                              # PWA demo page
│   └── page.tsx
│
├── actions/                          # Server actions
│   ├── auth.ts
│   └── notifications.ts
│
└── api/                              # API routes
    ├── auth/[...nextauth]/
    │   └── route.ts
    └── graphql/
        └── route.ts (in server.ts)
```

## Key Files

### 1. Root Layout (`src/app/layout.tsx`)

**Purpose:** Minimal layout with only essential configuration and AuthProvider.

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

// Font configuration
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Metadata
export const metadata: Metadata = {
  title: "HackYeah 2025",
  description: "HackYeah 2025 Progressive Web Application",
  // ... PWA metadata
};

// Clean layout - only AuthProvider
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>{/* PWA meta tags */}</head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

**Benefits:**

- ✅ Clean and focused
- ✅ No parallel routes complexity at root level
- ✅ Easy to understand and maintain
- ✅ Only wraps with AuthProvider

### 2. Parallel Routes Layout (`src/app/(parallel)/layout.tsx`)

**Purpose:** Handles the parallel routes slots (children + modal).

```tsx
export default function ParallelLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal?: React.ReactNode;
}>) {
  return (
    <>
      {children} {/* Map page */}
      {modal} {/* Sign-in dialog */}
    </>
  );
}
```

**Benefits:**

- ✅ Encapsulates parallel routes logic
- ✅ Renders both map and modal simultaneously
- ✅ Isolated from root layout

### 3. Root Page (`src/app/(parallel)/page.tsx`)

**Purpose:** Main landing page with map and navigation.

**Features:**

- Full-screen interactive Leaflet map
- Header with navigation
- User authentication status
- Links to protected routes

**Route:** `/`

### 4. Modal Default (`src/app/(parallel)/@modal/default.tsx`)

**Purpose:** Returns `null` when no modal should be displayed.

```tsx
export default function Default() {
  return null;
}
```

**When it renders:**

- When user is on `/` (root page)
- When user navigates away from intercepted routes
- Any time modal slot shouldn't show content

### 5. Intercepted Sign-In (`src/app/(parallel)/@modal/(.)auth/signin/page.tsx`)

**Purpose:** Shows sign-in form in a dialog when navigating from `/` to `/auth/signin`.

**Features:**

- Full sign-in/register form in dialog
- Credentials, Google, and Facebook auth
- Map visible underneath
- Closes with `router.back()`

**Route:** `/auth/signin` (when navigated from `/`)

### 6. Full-Page Sign-In (`src/app/auth/signin/page.tsx`)

**Purpose:** Traditional full-page sign-in form.

**When it's used:**

- Direct navigation to `/auth/signin`
- Browser refresh on `/auth/signin`
- Shared authentication links
- Fallback when interception doesn't apply

**Route:** `/auth/signin` (direct access)

## How Route Groups Work

### Route Group: `(parallel)`

The `(parallel)` folder is a **route group** (indicated by parentheses).

**Characteristics:**

- ✅ Does NOT affect the URL structure
- ✅ Used for organization and layout scoping
- ✅ Can have its own layout.tsx
- ✅ Perfect for grouping related routes with special layouts

**URL Impact:**

```
src/app/(parallel)/page.tsx       → URL: /
src/app/(parallel)/about/page.tsx → URL: /about
```

The `(parallel)` part is invisible in URLs!

## Parallel Routes Flow

### Scenario 1: Homepage Visit

```
User visits: /
↓
1. Root Layout renders (AuthProvider)
2. (parallel)/layout.tsx renders
3. (parallel)/page.tsx renders (map)
4. @modal/default.tsx renders (null)
↓
Result: User sees map, no modal
```

### Scenario 2: Click "Sign In" Button

```
User clicks Sign In button
↓
1. Next.js navigates to /auth/signin
2. Route interception triggers
3. (.)auth/signin/page.tsx catches the navigation
4. @modal slot renders the intercepted page
5. Map stays visible underneath
↓
Result: Dialog opens over map
```

### Scenario 3: Direct URL Access

```
User types: /auth/signin in browser
↓
1. Route interception does NOT trigger
2. Standard route loads: auth/signin/page.tsx
3. Full-page sign-in form displays
↓
Result: Traditional full-page layout
```

## Benefits of This Architecture

### 1. Clean Separation of Concerns

```
Root Layout          → Authentication & app shell
(parallel) Layout    → Parallel routes coordination
Page Components      → Feature-specific logic
```

### 2. Maintainability

- Root layout is minimal and easy to understand
- Parallel routes logic is isolated
- Each component has a single responsibility

### 3. Scalability

Easy to add more parallel routes:

```
src/app/(parallel)/
├── @modal/      # Existing modal slot
├── @sidebar/    # New: sidebar slot
└── @toolbar/    # New: toolbar slot
```

### 4. Performance

- Map renders once and stays mounted
- Dialog opens/closes without remounting map
- Smooth transitions with no full page reloads

### 5. Developer Experience

- Clear folder structure
- Intuitive organization
- Easy to find and modify code
- Well-documented patterns

## Route Interception Patterns

### Pattern 1: Same Level `(.)`

```
@modal/
└── (.)auth/     # Intercepts /auth from same level
```

### Pattern 2: One Level Up `(..)`

```
@modal/
└── (..)auth/    # Intercepts /auth from one level up
```

### Pattern 3: Root Level `(...)`

```
@modal/
└── (...)auth/   # Intercepts /auth from root
```

### Our Choice: `(.)`

We use `(.)` because the `@modal` slot and `/auth` are at the same level in the route hierarchy.

## Testing the Implementation

### Test 1: Homepage

1. Visit `http://localhost:3000`
2. ✅ Map should display
3. ✅ Header with navigation visible
4. ✅ No dialog visible

### Test 2: Intercepted Sign-In

1. From homepage, click "Sign In"
2. ✅ URL changes to `/auth/signin`
3. ✅ Dialog opens with sign-in form
4. ✅ Map visible underneath (dimmed)
5. ✅ Can close dialog with X button
6. ✅ Closing returns to `/`

### Test 3: Direct Sign-In

1. Open new tab
2. Navigate directly to `http://localhost:3000/auth/signin`
3. ✅ Full-page sign-in form displays
4. ✅ No map visible
5. ✅ Traditional page layout

### Test 4: Refresh on Sign-In

1. Open sign-in dialog from homepage
2. Refresh the page (F5)
3. ✅ Should show full-page sign-in
4. ✅ No dialog, no map

## Common Issues & Solutions

### Issue 1: Modal Not Showing

**Symptoms:** Click "Sign In", URL changes, but no dialog appears.

**Solution:**

- Check that `@modal` folder exists in `(parallel)/`
- Verify `(.)auth/signin/page.tsx` exists
- Ensure parallel layout passes `{modal}` prop

### Issue 2: Map Disappears

**Symptoms:** Dialog opens, but map vanishes.

**Solution:**

- Verify `(parallel)/layout.tsx` renders both `{children}` and `{modal}`
- Check Dialog component has proper styling (position: fixed)

### Issue 3: Route Not Intercepting

**Symptoms:** Clicking sign-in shows full page, not dialog.

**Solution:**

- Verify folder name is exactly `(.)auth` with dot and parentheses
- Check navigation uses `Link` component or `router.push()`
- Ensure navigation originates from root page

### Issue 4: Duplicate Content

**Symptoms:** Sign-in form appears twice.

**Solution:**

- Ensure `@modal/default.tsx` returns `null`
- Check no duplicate intercepting routes in root `app/` folder
- Verify only one `(.)auth` folder exists

## Migration Notes

### From Old Structure:

```
src/app/
├── layout.tsx (had modal prop)
├── page.tsx
├── @modal/
└── auth/
```

### To New Structure:

```
src/app/
├── layout.tsx (clean, no modal prop)
├── (parallel)/
│   ├── layout.tsx (has modal prop)
│   ├── page.tsx
│   └── @modal/
└── auth/
```

**Steps Taken:**

1. ✅ Removed `modal` prop from root layout
2. ✅ Created `(parallel)` route group
3. ✅ Moved page.tsx into `(parallel)/`
4. ✅ Moved `@modal/` into `(parallel)/`
5. ✅ Created `(parallel)/layout.tsx` with slots
6. ✅ Removed duplicate `(.)auth` from root

## Related Documentation

- [Route Interception Details](./ROUTE_INTERCEPTION.md)
- [Routing Structure](./ROUTING.md)
- [NextAuth Setup](./NEXTAUTH_SETUP.md)
- [Facebook OAuth](./FACEBOOK_OAUTH_SETUP.md)

## References

- [Next.js Route Groups](https://nextjs.org/docs/app/building-your-application/routing/route-groups)
- [Next.js Parallel Routes](https://nextjs.org/docs/app/building-your-application/routing/parallel-routes)
- [Next.js Intercepting Routes](https://nextjs.org/docs/app/building-your-application/routing/intercepting-routes)
