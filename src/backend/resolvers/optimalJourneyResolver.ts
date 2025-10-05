/**
 * Optimal Journey Resolver
 * Integrates A* pathfinding algorithm with GraphQL
 */

import { GraphQLError } from "graphql";
import { findOptimalPathCached } from "../pathfinding/astar-with-incidents";

export const optimalJourneyResolver = {
  Query: {
    findOptimalJourney: async (
      _parent: unknown,
      args: {
        input: {
          fromStopId: string;
          toStopId: string;
          departureTime?: string;
          maxTransfers?: number;
          preferredTransportTypes?: string[];
          avoidIncidents?: boolean;
        };
      },
      _context: unknown,
    ) => {
      const {
        fromStopId,
        toStopId,
        departureTime,
        maxTransfers,
        preferredTransportTypes,
        avoidIncidents,
      } = args.input;

      try {
        console.log("🔍 findOptimalJourney called with:", {
          fromStopId,
          toStopId,
          departureTime,
          maxTransfers,
          avoidIncidents,
        });

        // Parse departure time or use now
        const depTime = departureTime ? new Date(departureTime) : new Date();

        // Call A* pathfinding algorithm
        const journeys = await findOptimalPathCached(
          fromStopId,
          toStopId,
          depTime,
          {
            maxTransfers: maxTransfers || 3,
            preferredTransportTypes: preferredTransportTypes || [],
            avoidIncidents: avoidIncidents !== false, // Default true
          },
        );

        console.log("✅ Found journeys:", journeys.length);

        // Return empty result if no paths found
        if (journeys.length === 0) {
          return {
            journeys: [],
            hasAlternatives: false,
          };
        }

        // Map Journey[] from A* to GraphQL Journey type
        const mappedJourneys = journeys.map((journey) => {
          const departureTime =
            journey.segments.length > 0
              ? journey.segments[0].departureTime
              : new Date().toISOString();
          const arrivalTime =
            journey.segments.length > 0
              ? journey.segments[journey.segments.length - 1].arrivalTime
              : new Date().toISOString();

          return {
            segments: journey.segments.map((seg) => ({
              from: {
                stopId: seg.from.stopId,
                stopName: seg.from.stopName,
                coordinates: {
                  latitude: seg.from.coordinates.latitude,
                  longitude: seg.from.coordinates.longitude,
                },
              },
              to: {
                stopId: seg.to.stopId,
                stopName: seg.to.stopName,
                coordinates: {
                  latitude: seg.to.coordinates.latitude,
                  longitude: seg.to.coordinates.longitude,
                },
              },
              lineId: seg.lineId,
              lineName: seg.lineName,
              transportType: seg.transportType,
              departureTime: seg.departureTime,
              arrivalTime: seg.arrivalTime,
              duration: seg.duration,
              hasIncident: seg.hasIncident,
              incidentDelay: seg.incidentDelay || null,
              incidentSeverity: seg.incidentSeverity || null,
            })),
            totalDuration: journey.totalDuration,
            totalDistance: journey.totalDistance,
            transferCount: journey.transferCount,
            hasIncidents: journey.hasIncidents,
            departureTime,
            arrivalTime,
            alternativeAvailable: journey.alternativeAvailable,
          };
        });

        return {
          journeys: mappedJourneys,
          hasAlternatives: journeys.length > 1,
        };
      } catch (error) {
        console.error("Error finding optimal journey:", error);
        throw new GraphQLError("Failed to find optimal journey", {
          extensions: {
            code: "PATHFINDING_ERROR",
            originalError: error,
          },
        });
      }
    },
  },
};
