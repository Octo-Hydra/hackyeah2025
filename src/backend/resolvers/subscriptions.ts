/**
 * Notification Subscription Resolvers
 *
 * GraphQL subscriptions for real-time notifications using Yoga's PubSub
 */

import { createPubSub } from "graphql-yoga";

// Create PubSub instance
export const pubsub = createPubSub();

// Subscription topics
export const TOPICS = {
  NOTIFICATION_REPORTED: "NOTIFICATION_REPORTED",
  NOTIFICATION_CONFIRMED: "NOTIFICATION_CONFIRMED",
  NOTIFICATION_OFFICIAL: "NOTIFICATION_OFFICIAL",
  REPUTATION_UPDATED: "REPUTATION_UPDATED",
};

// Subscription resolvers
export const subscriptionResolvers = {
  Subscription: {
    notificationReported: {
      subscribe: (_: unknown, args: { lineIds?: string[] }) => {
        // If lineIds provided, filter in resolver
        return pubsub.subscribe(TOPICS.NOTIFICATION_REPORTED);
      },
      resolve: (payload: any, args: { lineIds?: string[] }) => {
        // Filter by lineIds if provided
        if (args.lineIds && args.lineIds.length > 0) {
          if (!args.lineIds.includes(payload.lineId)) {
            return null; // Skip this notification
          }
        }
        return payload;
      },
    },

    notificationConfirmed: {
      subscribe: (_: unknown, args: { lineIds?: string[] }) => {
        return pubsub.subscribe(TOPICS.NOTIFICATION_CONFIRMED);
      },
      resolve: (payload: any, args: { lineIds?: string[] }) => {
        if (args.lineIds && args.lineIds.length > 0) {
          if (!args.lineIds.includes(payload.lineId)) {
            return null;
          }
        }
        return payload;
      },
    },

    notificationOfficial: {
      subscribe: () => {
        return pubsub.subscribe(TOPICS.NOTIFICATION_OFFICIAL);
      },
      resolve: (payload: any) => payload,
    },

    reputationUpdated: {
      subscribe: (_: unknown, args: { userId: string }) => {
        return pubsub.subscribe(TOPICS.REPUTATION_UPDATED);
      },
      resolve: (payload: any, args: { userId: string }) => {
        // Only send to the specific user
        if (payload.userId !== args.userId) {
          return null;
        }
        return payload;
      },
    },
  },
};

// Helper functions to publish events

export function publishNotificationReported(notification: any) {
  pubsub.publish(TOPICS.NOTIFICATION_REPORTED, notification);
}

export function publishNotificationConfirmed(notification: any) {
  pubsub.publish(TOPICS.NOTIFICATION_CONFIRMED, notification);
}

export function publishNotificationOfficial(notification: any) {
  pubsub.publish(TOPICS.NOTIFICATION_OFFICIAL, notification);
}

export function publishReputationUpdated(update: any) {
  pubsub.publish(TOPICS.REPUTATION_UPDATED, update);
}
