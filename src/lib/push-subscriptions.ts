import clientPromise from "@/lib/mongodb";

export interface PushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface StoredPushSubscription extends PushSubscription {
  _id?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get all active push subscriptions from MongoDB
 */
export async function getAllPushSubscriptions(): Promise<PushSubscription[]> {
  try {
    const client = await clientPromise;
    const db = client.db();

    const subscriptions = await db
      .collection("pushSubscriptions")
      .find({})
      .toArray();

    return subscriptions.map((sub) => ({
      endpoint: sub.endpoint,
      expirationTime: sub.expirationTime,
      keys: sub.keys,
    }));
  } catch (error) {
    console.error("Error fetching push subscriptions:", error);
    return [];
  }
}

/**
 * Get a specific push subscription by endpoint
 */
export async function getPushSubscription(
  endpoint: string,
): Promise<PushSubscription | null> {
  try {
    const client = await clientPromise;
    const db = client.db();

    const sub = await db.collection("pushSubscriptions").findOne({ endpoint });

    if (!sub) return null;

    return {
      endpoint: sub.endpoint,
      expirationTime: sub.expirationTime,
      keys: sub.keys,
    };
  } catch (error) {
    console.error("Error fetching push subscription:", error);
    return null;
  }
}

/**
 * Count total push subscriptions
 */
export async function countPushSubscriptions(): Promise<number> {
  try {
    const client = await clientPromise;
    const db = client.db();

    return await db.collection("pushSubscriptions").countDocuments();
  } catch (error) {
    console.error("Error counting push subscriptions:", error);
    return 0;
  }
}

/**
 * Remove push subscriptions older than specified days
 * Useful for cleanup of stale subscriptions
 */
export async function cleanupOldSubscriptions(
  daysOld: number = 90,
): Promise<number> {
  try {
    const client = await clientPromise;
    const db = client.db();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await db.collection("pushSubscriptions").deleteMany({
      updatedAt: { $lt: cutoffDate },
    });

    return result.deletedCount;
  } catch (error) {
    console.error("Error cleaning up old subscriptions:", error);
    return 0;
  }
}

/**
 * Create indexes for push subscriptions collection
 * This is called automatically but can be run manually if needed
 */
export async function createPushSubscriptionIndexes(): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db();

    await db
      .collection("pushSubscriptions")
      .createIndex({ endpoint: 1 }, { unique: true });

    await db.collection("pushSubscriptions").createIndex({ updatedAt: 1 });
  } catch (error) {
    console.error("Error creating indexes:", error);
  }
}
