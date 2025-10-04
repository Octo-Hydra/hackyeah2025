# PWA Setup Guide - Yanosik-Style App

This project is set up as a Progressive Web App (PWA) following **Next.js 15 official documentation** - perfect for building real-time navigation and alert apps like Yanosik.

## ✨ Features

- 📱 **Installable** - Add to home screen on iOS and Android
- 🔔 **Push Notifications** - Real-time alerts for traffic, speed cameras, hazards
- 🗺️ **Maps Ready** - Optimized for geolocation and mapping libraries
- 🔌 **WebSocket Support** - Live data updates for real-time features
- ⚡ **Fast & Responsive** - App-like performance
- 🌐 **Offline Support** - Service worker caching strategy
- 🎯 **Native Feel** - Standalone display mode

## 📦 What's Included

### Core PWA Files

```
src/app/manifest.ts                              # Dynamic manifest (Next.js 15 native)
public/sw.js                                     # Service worker with caching & notifications
public/manifest.json                             # Static fallback manifest
```

### Components

```
src/components/install-prompt.tsx                # Install to home screen prompt
src/components/push-notification-manager.tsx     # Notification subscription UI
src/app/pwa/page.tsx                            # Demo page
```

### Server Actions

```
src/app/actions/notifications.ts                 # Push notification server actions
```

### Configuration

```
next.config.ts                                   # Security headers for service worker
.env.example                                     # VAPID keys template
```

## 🚀 Quick Start

### 1. Set Up Environment Variables

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

### 2. Generate VAPID Keys

```bash
web-push generate-vapid-keys
```

Add the keys to `.env.local`:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key-here
VAPID_PRIVATE_KEY=your-private-key-here
```

### 3. Generate PWA Icons

Create a `source-icon.png` (512x512px) in the project root, then run:

```bash
./generate-icons.sh
```

Or manually create icons in `public/icons/`:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

### 4. Test Locally with HTTPS

PWA features (notifications, service workers) require HTTPS:

```bash
npm run dev -- --experimental-https
```

### 5. Visit the PWA Demo

Open https://localhost:3000/pwa to test:
- Install prompt
- Push notifications
- Service worker registration

## 📱 Installation Testing

### iOS (iPhone/iPad)

1. Open Safari
2. Navigate to your app
3. Tap Share button (⎋)
4. Tap "Add to Home Screen"
5. Confirm installation

### Android (Chrome/Edge)

1. Open Chrome or Edge
2. Navigate to your app
3. Look for install prompt or
4. Tap menu (⋮) → "Install app" or "Add to Home screen"

### Desktop (Chrome/Edge)

1. Look for install icon (+) in address bar
2. Click to install
3. App opens in standalone window

## 🔔 Push Notifications

### Subscribe Users

```typescript
import { PushNotificationManager } from "@/components/push-notification-manager";

// Use in your component
<PushNotificationManager />
```

### Send Notifications (Server Action)

```typescript
import { sendNotification, sendLocationAlert } from "@/app/actions/notifications";

// Send regular notification
await sendNotification("Speed camera ahead!", "Alert", "/map");

// Send location-based alert
await sendLocationAlert(
  { lat: 52.2297, lng: 21.0122 },
  "Speed Camera",
  "300m ahead on your route"
);
```

### Notification Types for Yanosik-style App

```typescript
// Speed camera alert
await sendLocationAlert(location, "Speed Camera", "300m ahead, 50 km/h");

// Police control
await sendLocationAlert(location, "Police", "Police control reported");

// Traffic jam
await sendLocationAlert(location, "Traffic Jam", "Heavy traffic on A1");

// Road hazard
await sendLocationAlert(location, "Hazard", "Accident reported, use caution");
```

## 🗺️ Integration with Maps & Location

The PWA is ready for map integration. Here's how to add geolocation:

### Get User Location

```typescript
"use client";

import { useEffect, useState } from "react";

export function useGeolocation() {
  const [location, setLocation] = useState<{lat: number; lng: number} | null>(null);
  
  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.error("Geolocation error:", error),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
      
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);
  
  return location;
}
```

### Recommended Map Libraries

- **Leaflet** - `npm install leaflet react-leaflet`
- **Mapbox GL** - `npm install mapbox-gl react-map-gl`
- **Google Maps** - `npm install @vis.gl/react-google-maps`

## 🔌 WebSocket Support

The service worker is configured to skip WebSocket requests. Here's how to add WebSockets:

```typescript
"use client";

import { useEffect } from "react";

export function useWebSocket(url: string) {
  useEffect(() => {
    const ws = new WebSocket(url);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Handle real-time updates
      console.log("Received:", data);
    };
    
    ws.onerror = (error) => console.error("WebSocket error:", error);
    
    return () => ws.close();
  }, [url]);
}
```

## 🎨 Customization

### Update App Name & Theme

Edit `src/app/manifest.ts`:

```typescript
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Your App Name",
    short_name: "AppName",
    description: "Your app description",
    theme_color: "#your-color",
    background_color: "#your-color",
    // ...
  };
}
```

### Customize Service Worker Caching

Edit `public/sw.js`:

```javascript
const CACHE_NAME = "your-app-v1";
const urlsToCache = [
  "/",
  "/map",
  "/profile",
  // Add your routes
];
```

## 📊 Testing & Debugging

### Check Service Worker Status

```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log("Active service workers:", registrations);
});
```

### Test Push Notifications

1. Visit `/pwa`
2. Click "Enable Notifications"
3. Grant permission
4. Send a test notification
5. Notification should appear even if app is closed

### Lighthouse PWA Audit

1. Open DevTools
2. Go to Lighthouse tab
3. Select "Progressive Web App"
4. Run audit
5. Aim for 100% score

## 🚨 Common Issues

### Notifications Not Working

- ✅ Check HTTPS is enabled
- ✅ Verify VAPID keys are set
- ✅ Check browser permissions
- ✅ Ensure service worker is registered

### Install Prompt Not Showing

- ✅ Must be served over HTTPS
- ✅ Must have valid manifest
- ✅ Must have service worker
- ✅ Must meet PWA criteria

### Service Worker Not Updating

- ✅ Hard refresh (Ctrl+Shift+R)
- ✅ Clear cache and reload
- ✅ Check `Cache-Control` headers
- ✅ Unregister old service workers

## 🏗️ Production Deployment

### Vercel (Recommended)

```bash
npm run build
vercel deploy
```

### Environment Variables on Vercel

Add these to your Vercel project settings:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `NEXTAUTH_SECRET`
- `MONGODB_URI`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### HTTPS is Required

PWAs require HTTPS in production. Vercel provides this automatically.

## 📚 Resources

- [Next.js PWA Docs](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Web Push Protocol](https://datatracker.ietf.org/doc/html/rfc8030)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [PWA Capabilities](https://whatpwacando.today/)

## 🎯 Yanosik-Specific Features

This PWA setup supports all features needed for a Yanosik-like app:

✅ **Real-time Location Tracking** - Geolocation API + WebSockets
✅ **Speed Camera Alerts** - Push notifications with location
✅ **Police Reports** - Real-time user-generated alerts
✅ **Traffic Conditions** - Live data via WebSockets
✅ **Community Features** - User reports and interactions
✅ **Offline Maps** - Service worker caching
✅ **Background Updates** - Background sync API ready

## 💡 Next Steps

1. **Add Maps**: Integrate Leaflet or Mapbox
2. **WebSocket Server**: Set up for real-time updates
3. **Database**: Store alerts and user reports in MongoDB
4. **Geofencing**: Implement location-based triggers
5. **Background Sync**: Add offline report submission
6. **Share Target**: Allow sharing locations to app

Happy building! 🚀
