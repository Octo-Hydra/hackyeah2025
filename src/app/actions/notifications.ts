"use server";

import webpush from "web-push";
import clientPromise from "@/lib/mongodb";

// Set VAPID details
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:your-email@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

interface PushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Subscribe a user to push notifications
 * Stores subscription in MongoDB
 */
export async function subscribeUser(sub: PushSubscription) {
  try {
    const client = await clientPromise;
    const db = client.db();

    // Check if subscription already exists
    const existing = await db
      .collection("pushSubscriptions")
      .findOne({ endpoint: sub.endpoint });

    if (existing) {
      // Update existing subscription
      await db.collection("pushSubscriptions").updateOne(
        { endpoint: sub.endpoint },
        {
          $set: {
            ...sub,
            updatedAt: new Date(),
          },
        },
      );
    } else {
      // Create new subscription
      await db.collection("pushSubscriptions").insertOne({
        ...sub,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error subscribing user:", error);
    return { success: false, error: "Failed to subscribe" };
  }
}

/**
 * Unsubscribe a user from push notifications
 * Removes subscription from MongoDB
 */
export async function unsubscribeUser(endpoint: string) {
  try {
    const client = await clientPromise;
    const db = client.db();

    const result = await db
      .collection("pushSubscriptions")
      .deleteOne({ endpoint });

    return { success: true };
  } catch (error) {
    console.error("Error unsubscribing user:", error);
    return { success: false, error: "Failed to unsubscribe" };
  }
}

/**
 * Get all active push subscriptions from MongoDB
 */
async function getAllSubscriptions(): Promise<PushSubscription[]> {
  try {
    const client = await clientPromise;
    const db = client.db();

    const subscriptions = await db
      .collection("pushSubscriptions")
      .find({})
      .toArray();

    // Remove MongoDB _id field and return as PushSubscription objects
    return subscriptions.map((sub) => ({
      endpoint: sub.endpoint,
      expirationTime: sub.expirationTime,
      keys: sub.keys,
    }));
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return [];
  }
}

/**
 * Send push notification to all subscribed users
 * Automatically removes invalid/expired subscriptions
 */
export async function sendNotification(
  message: string,
  title: string = "OneTime Notification",
  url: string = "/",
) {
  try {
    const subscriptions = await getAllSubscriptions();

    if (subscriptions.length === 0) {
      return {
        success: false,
        error: "No active subscriptions",
        sent: 0,
        failed: 0,
      };
    }

    const payload = JSON.stringify({
      title,
      body: message,
      icon: "/icons/icon-192x192.png",
      url,
      tag: "notification-" + Date.now(),
    });

    // Send notifications to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(subscription, payload);
          return { success: true, endpoint: subscription.endpoint };
        } catch (error: unknown) {
          // Remove invalid subscriptions (410 Gone or other errors)
          if (
            error &&
            typeof error === "object" &&
            "statusCode" in error &&
            (error.statusCode === 410 || error.statusCode === 404)
          ) {
            await unsubscribeUser(subscription.endpoint);
          }
          throw error;
        }
      }),
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return { success: true, sent: successful, failed };
  } catch (error) {
    console.error("Error sending notifications:", error);
    return {
      success: false,
      error: "Failed to send notifications",
      sent: 0,
      failed: 0,
    };
  }
}

export async function sendLocationAlert(
  location: { lat: number; lng: number },
  alertType: string,
  description: string,
) {
  return sendNotification(
    `${alertType}: ${description} at location (${location.lat}, ${location.lng})`,
    "Location Alert",
    `/map?lat=${location.lat}&lng=${location.lng}`,
  );
}
