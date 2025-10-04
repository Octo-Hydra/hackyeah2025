# Routing Structure

## Public Routes

### `/` - Home Page (Map View)

- **Component:** `src/app/page.tsx`
- **Description:** Main landing page with interactive Leaflet map
- **Features:**
  - Real-time location tracking
  - Interactive map with OpenStreetMap tiles
  - Navigation header with authentication status
  - Quick access to user profile and moderator panel (when authenticated)
- **Access:** Public (no authentication required)
- **Libraries:** Leaflet, react-leaflet

### `/auth/signin` - Authentication Page

- **Component:** `src/app/auth/signin/page.tsx`
- **Description:** Sign in and registration page
- **Features:**
  - Credentials login (email/password)
  - Google OAuth login
  - User registration
  - Form validation with Zod
- **Access:** Public
- **Redirects:** After successful login, redirects to `/` or callback URL

### `/pwa` - PWA Demo Page

- **Component:** `src/app/pwa/page.tsx`
- **Description:** Progressive Web App features demo
- **Features:**
  - Install prompt for PWA
  - Push notification subscription
  - Service worker registration
- **Access:** Public

## Protected Routes

Protected routes check for authentication using NextAuth's `auth()` function on the server side. If the user is not authenticated, they are redirected to `/auth/signin` with a callback URL.

### `/user` - User Profile

- **Component:** `src/app/user/page.tsx`
- **Description:** Personal user profile and settings
- **Features:**
  - View user information (name, email)
  - Quick actions (edit profile, settings)
  - Sign out functionality
  - Link to moderator panel
- **Access:** Protected (requires authentication)
- **Session Check:** Server-side with `auth()`
- **Redirect:** `/auth/signin?callbackUrl=/user`

### `/moderator` - Moderator Dashboard

- **Component:** `src/app/moderator/page.tsx`
- **Description:** Content moderation and user management
- **Features:**
  - Review pending reports
  - User management dashboard
  - Moderation settings
  - Recent activity log
- **Access:** Protected (requires authentication)
- **Session Check:** Server-side with `auth()`
- **Redirect:** `/auth/signin?callbackUrl=/moderator`
- **Note:** Currently checks for authentication only. In production, add role-based access control.

### `/dashboard` - User Dashboard

- **Component:** `src/app/dashboard/page.tsx`
- **Description:** General user dashboard
- **Access:** Protected (requires authentication)

## Authentication Flow

### Server-Side Protection

```typescript
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin?callbackUrl=/protected");
  }

  // Page content
}
```

### Client-Side Session Access

```typescript
"use client";
import { useSession } from "next-auth/react";

export default function ClientComponent() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <div>Not authenticated</div>;
  }

  // Component content
}
```

## Navigation Components

### Header Navigation

- **Location:** Integrated in each page
- **Features:**
  - Logo and app name
  - User email display
  - Quick links to `/user` and `/moderator`
  - Sign in button (when not authenticated)

### Responsive Design

- All pages are mobile-first responsive
- Map view optimized for full-screen on mobile devices
- Header collapses email on small screens
- Floating cards on map for better mobile UX

## Map Configuration

### Leaflet Integration

- **Library:** Leaflet v1.9.4 with react-leaflet
- **Tiles:** OpenStreetMap
- **Features:**
  - Geolocation with user consent
  - Default center: Warsaw, Poland (52.2297, 21.0122)
  - Zoom level: 13
  - Markers with popups
  - Dark mode compatible

### Usage Example

```typescript
import { Map } from "@/components/map";

<Map
  className="h-full w-full"
  center={[52.2297, 21.0122]} // optional
  zoom={13} // optional
/>
```

## Future Enhancements

### Planned Features

1. **Role-Based Access Control (RBAC)**
   - Add user roles (admin, moderator, user)
   - Protect `/moderator` route by role
   - Create `/admin` route for system administration

2. **Map Features**
   - Real-time traffic alerts
   - User-submitted incident reports
   - Route planning
   - Offline map caching

3. **Moderator Features**
   - Report queue management
   - User ban/suspend functionality
   - Content filtering rules
   - Analytics dashboard

4. **User Features**
   - Profile editing
   - Notification preferences
   - Activity history
   - Saved locations

## API Routes

### NextAuth Endpoints

- `GET/POST /api/auth/[...nextauth]` - NextAuth.js handlers
  - `/api/auth/signin` - Sign in
  - `/api/auth/signout` - Sign out
  - `/api/auth/callback/[provider]` - OAuth callbacks
  - `/api/auth/session` - Get session
  - `/api/auth/csrf` - CSRF token

### GraphQL

- `GET/POST /api/graphql` - GraphQL API with WebSocket support

## Environment Variables

Required for routing and authentication:

```bash
# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# MongoDB
MONGODB_URI=mongodb://admin:admin@localhost:27017/hackyeah2025?authSource=admin

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Testing Routes

### Public Routes

- Visit http://localhost:3000
- Should see map without requiring login
- Click "Sign In" to access authentication

### Protected Routes

- Visit http://localhost:3000/user without being logged in
- Should redirect to `/auth/signin?callbackUrl=/user`
- After login, should return to `/user`

### Moderator Access

- Sign in first
- Click "Moderator" button in header
- Should access moderator dashboard at `/moderator`
