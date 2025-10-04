import { Repeater } from "@repeaterjs/repeater";
import type { GraphQLContext, IncidentModel } from "../db/collections";
import { ObjectId } from "mongodb";
import { DB } from "../db/client.js";

// PubSub channels
export const CHANNELS = {
  INCIDENT_CREATED: "INCIDENT_CREATED",
  INCIDENT_UPDATED: "INCIDENT_UPDATED",
  LINE_INCIDENT_UPDATES: "LINE_INCIDENT_UPDATES",
  MY_LINES_INCIDENTS: "MY_LINES_INCIDENTS",
  USER_INCIDENT_NOTIFICATION: "USER_INCIDENT_NOTIFICATION", // Personalized notifications
} as const;

// In-memory event emitter for subscriptions
class PubSub {
  private listeners = new Map<string, Set<(data: any) => void>>();

  publish(channel: string, payload: any) {
    const channelListeners = this.listeners.get(channel);
    if (channelListeners) {
      channelListeners.forEach((listener) => listener(payload));
    }
  }

  subscribe(channel: string, callback: (data: any) => void) {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(callback);

    // Return unsubscribe function
    return () => {
      const channelListeners = this.listeners.get(channel);
      if (channelListeners) {
        channelListeners.delete(callback);
      }
    };
  }
}

export const pubsub = new PubSub();

export const subscriptionResolvers = {
  Subscription: {
    // New incident created
    incidentCreated: {
      subscribe: (
        _: unknown,
        { transportType }: { transportType?: string },
        ctx: GraphQLContext
      ) => {
        return new Repeater(async (push, stop) => {
          const unsubscribe = pubsub.subscribe(
            CHANNELS.INCIDENT_CREATED,
            async (incident: IncidentModel) => {
              // Filter by transport type if specified
              if (transportType && incident.lineIds) {
                const db = await DB();
                const lines = await db
                  .collection("Lines")
                  .find({
                    _id: {
                      $in: incident.lineIds.filter(
                        (id): id is ObjectId => id !== null
                      ),
                    },
                    transportType,
                  })
                  .toArray();

                if (lines.length > 0) {
                  push({ incidentCreated: incident });
                }
              } else {
                push({ incidentCreated: incident });
              }
            }
          );

          await stop;
          unsubscribe();
        });
      },
      resolve: (payload: any) => payload.incidentCreated,
    },

    // Incident updated
    incidentUpdated: {
      subscribe: (
        _: unknown,
        { transportType }: { transportType?: string },
        ctx: GraphQLContext
      ) => {
        return new Repeater(async (push, stop) => {
          const unsubscribe = pubsub.subscribe(
            CHANNELS.INCIDENT_UPDATED,
            async (incident: IncidentModel) => {
              if (transportType && incident.lineIds) {
                const db = await DB();
                const lines = await db
                  .collection("Lines")
                  .find({
                    _id: {
                      $in: incident.lineIds.filter(
                        (id): id is ObjectId => id !== null
                      ),
                    },
                    transportType,
                  })
                  .toArray();

                if (lines.length > 0) {
                  push({ incidentUpdated: incident });
                }
              } else {
                push({ incidentUpdated: incident });
              }
            }
          );

          await stop;
          unsubscribe();
        });
      },
      resolve: (payload: any) => payload.incidentUpdated,
    },

    // Line-specific incident updates
    lineIncidentUpdates: {
      subscribe: (
        _: unknown,
        { lineId }: { lineId: string },
        ctx: GraphQLContext
      ) => {
        return new Repeater(async (push, stop) => {
          const unsubscribe = pubsub.subscribe(
            CHANNELS.LINE_INCIDENT_UPDATES,
            async (incident: IncidentModel) => {
              // Check if incident affects this line
              const affectsLine = incident.lineIds?.some(
                (id) => id?.toString() === lineId
              );

              if (affectsLine) {
                push({ lineIncidentUpdates: incident });
              }
            }
          );

          await stop;
          unsubscribe();
        });
      },
      resolve: (payload: any) => payload.lineIncidentUpdates,
    },

    // My lines incidents (user subscribes to multiple favorite lines)
    myLinesIncidents: {
      subscribe: (
        _: unknown,
        { lineIds }: { lineIds: string[] },
        ctx: GraphQLContext
      ) => {
        return new Repeater(async (push, stop) => {
          const lineIdSet = new Set(lineIds);

          const unsubscribe = pubsub.subscribe(
            CHANNELS.MY_LINES_INCIDENTS,
            async (incident: IncidentModel) => {
              // Check if incident affects any of user's favorite lines
              const affectsUserLines = incident.lineIds?.some((id) =>
                id ? lineIdSet.has(id.toString()) : false
              );

              if (affectsUserLines) {
                push({ myLinesIncidents: incident });
              }
            }
          );

          await stop;
          unsubscribe();
        });
      },
      resolve: (payload: any) => payload.myLinesIncidents,
    },

    // Smart incident notifications (with deduplication)
    // Receives only relevant incidents based on active journey/favorites
    // Prevents duplicate notifications
    smartIncidentNotifications: {
      subscribe: (
        _: unknown,
        { userId }: { userId: string },
        ctx: GraphQLContext
      ) => {
        return new Repeater(async (push, stop) => {
          // Track sent incidents to prevent duplicates
          const sentIncidents = new Set<string>();

          const unsubscribe = pubsub.subscribe(
            CHANNELS.MY_LINES_INCIDENTS,
            async (incident: IncidentModel) => {
              const incidentId = incident._id?.toString();
              if (!incidentId) return;

              // Deduplication check
              if (sentIncidents.has(incidentId)) {
                return; // Already sent this incident
              }

              // Get user's preferences
              const db = await DB();
              const user = await db
                .collection("Users")
                .findOne({ _id: new ObjectId(userId) });

              if (!user) return;

              // Check if incident affects user
              let shouldNotify = false;

              // Check active journey
              if (user.activeJourney?.lineIds) {
                const activeLineIds = user.activeJourney.lineIds.map(
                  (id: any) => (typeof id === "string" ? id : id.toString())
                );

                shouldNotify =
                  incident.lineIds?.some((lineId) =>
                    lineId ? activeLineIds.includes(lineId.toString()) : false
                  ) || false;
              }

              // Check favorites
              if (!shouldNotify && user.favoriteConnections?.length > 0) {
                // For simplicity, assume user wants all favorites
                shouldNotify = true;
              }

              if (shouldNotify) {
                sentIncidents.add(incidentId);
                push({ smartIncidentNotifications: incident });

                // Clean old entries after 1 hour
                setTimeout(
                  () => {
                    sentIncidents.delete(incidentId);
                  },
                  60 * 60 * 1000
                );
              }
            }
          );

          await stop;
          unsubscribe();
        });
      },
      resolve: (payload: any) => payload.smartIncidentNotifications,
    },
  },
};

export default subscriptionResolvers;
