import { Repeater } from "@repeaterjs/repeater";
import type { GraphQLContext, IncidentModel } from "../db/collections";
import { ObjectId } from "mongodb";

// PubSub channels
export const CHANNELS = {
  INCIDENT_CREATED: "INCIDENT_CREATED",
  INCIDENT_UPDATED: "INCIDENT_UPDATED",
  INCIDENT_RESOLVED: "INCIDENT_RESOLVED",
  LINE_INCIDENT_UPDATES: "LINE_INCIDENT_UPDATES",
  MY_LINES_INCIDENTS: "MY_LINES_INCIDENTS",
  PATH_AFFECTED: "PATH_AFFECTED",
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
                const db = ctx.db;
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
                const db = ctx.db;
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

    // Incident resolved
    incidentResolved: {
      subscribe: (
        _: unknown,
        { transportType }: { transportType?: string },
        ctx: GraphQLContext
      ) => {
        return new Repeater(async (push, stop) => {
          const unsubscribe = pubsub.subscribe(
            CHANNELS.INCIDENT_RESOLVED,
            async (incident: IncidentModel) => {
              if (transportType && incident.lineIds) {
                const db = ctx.db;
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
                  push({ incidentResolved: incident });
                }
              } else {
                push({ incidentResolved: incident });
              }
            }
          );

          await stop;
          unsubscribe();
        });
      },
      resolve: (payload: any) => payload.incidentResolved,
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

    // Path affected by incident
    pathAffectedByIncident: {
      subscribe: (
        _: unknown,
        args: {
          startCoordinates: { latitude: number; longitude: number };
          endCoordinates: { latitude: number; longitude: number };
        },
        ctx: GraphQLContext
      ) => {
        return new Repeater(async (push, stop) => {
          const unsubscribe = pubsub.subscribe(
            CHANNELS.PATH_AFFECTED,
            async (data: {
              incident: IncidentModel;
              affectedLineIds: ObjectId[];
            }) => {
              // TODO: Implement path finding to check if incident affects route
              // For now, just push the incident
              const db = ctx.db;
              const affectedLines = await db
                .collection("Lines")
                .find({ _id: { $in: data.affectedLineIds } })
                .toArray();

              push({
                pathAffectedByIncident: {
                  incident: data.incident,
                  affectedLines,
                  message: `Incident on ${affectedLines.map((l) => l.name).join(", ")}`,
                  originalPath: null,
                  alternativePath: null,
                },
              });
            }
          );

          await stop;
          unsubscribe();
        });
      },
      resolve: (payload: any) => payload.pathAffectedByIncident,
    },
  },
};

export default subscriptionResolvers;
