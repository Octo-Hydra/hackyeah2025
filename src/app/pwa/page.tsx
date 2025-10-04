import { InstallPrompt } from "@/components/install-prompt";
import { PushNotificationManager } from "@/components/push-notification-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, MapPin, Bell, Zap } from "lucide-react";

export default function PWADemoPage() {
  return (
    <div className="container mx-auto max-w-4xl space-y-8 py-10">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Progressive Web App</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Install our app for the best experience with offline support,
          notifications, and more.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <InstallPrompt />
        <PushNotificationManager />
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">PWA Features</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Install on Device
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add our app to your home screen for quick access. Works like a
                native app!
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Push Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Receive real-time alerts about traffic, hazards, and events in
                your area.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Geolocation Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get location-based alerts and navigate with real-time GPS
                tracking.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Real-time Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                WebSocket support for live traffic data and instant
                notifications.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perfect for Yanosik-like Apps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This PWA setup is ideal for real-time navigation and alert apps like
            Yanosik:
          </p>
          <ul className="list-inside list-disc space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>📱 Install on mobile devices (iOS & Android)</li>
            <li>
              🔔 Push notifications for speed cameras, police, and hazards
            </li>
            <li>📍 Real-time geolocation tracking</li>
            <li>🔌 WebSocket support for live data updates</li>
            <li>🗺️ Maps integration ready</li>
            <li>⚡ Fast, app-like experience</li>
            <li>🌐 Works offline with cached data</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
