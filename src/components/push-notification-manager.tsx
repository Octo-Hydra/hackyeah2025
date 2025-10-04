"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  subscribeUser,
  unsubscribeUser,
  sendNotification,
} from "@/app/actions/notifications";
import { Bell, BellOff, Send } from "lucide-react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      registerServiceWorker();
    }
  }, []);

  async function registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });

      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub);
    } catch (error) {
      console.error("Service worker registration failed:", error);
    }
  }

  async function subscribeToPush() {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        ),
      });

      setSubscription(sub);
      const serializedSub = JSON.parse(JSON.stringify(sub));
      await subscribeUser(serializedSub);
    } catch (error) {
      console.error("Push subscription failed:", error);
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribeFromPush() {
    setLoading(true);
    try {
      await subscription?.unsubscribe();
      if (subscription) {
        await unsubscribeUser(subscription.endpoint);
      }
      setSubscription(null);
    } catch (error) {
      console.error("Unsubscribe failed:", error);
    } finally {
      setLoading(false);
    }
  }

  async function sendTestNotification() {
    if (subscription && message) {
      setLoading(true);
      try {
        await sendNotification(message, "Test Notification");
        setMessage("");
      } catch (error) {
        console.error("Send notification failed:", error);
      } finally {
        setLoading(false);
      }
    }
  }

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Push notifications are not supported in this browser.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscription ? (
          <>
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
              ✓ You are subscribed to push notifications
            </div>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter notification message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendTestNotification();
                }}
              />
              <Button
                onClick={sendTestNotification}
                disabled={!message || loading}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={unsubscribeFromPush}
              variant="outline"
              disabled={loading}
              className="w-full"
            >
              <BellOff className="mr-2 h-4 w-4" />
              Unsubscribe
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500">
              Enable notifications to receive real-time alerts and updates.
            </p>
            <Button
              onClick={subscribeToPush}
              disabled={loading}
              className="w-full"
            >
              <Bell className="mr-2 h-4 w-4" />
              Enable Notifications
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
