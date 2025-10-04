import type { ObjectId } from "mongodb";

// Types for MongoDB collections

// Segment location with full stop information
export interface SegmentLocation {
  stopId: ObjectId | string;
  stopName: string;
  coordinates: Coordinates;
}

// Active journey that user is currently on
export interface ActiveJourney {
  routeIds: Array<ObjectId | string>; // Routes user is taking
  lineIds: Array<ObjectId | string>; // Lines involved in the journey
  startStop: SegmentLocation;
  endStop: SegmentLocation;
  startTime: string; // When journey started (HH:mm)
  expectedEndTime: string; // Expected arrival time (HH:mm)
}

// Favorite connection saved by user
export interface FavoriteConnection {
  id: string; // Unique ID for this favorite
  name: string; // User-defined name (e.g., "Home to Work")
  startStopId: ObjectId | string;
  endStopId: ObjectId | string;
}

export interface UserModel {
  _id?: ObjectId | string;
  id?: string;
  name: string;
  email: string;
  role: "USER" | "MODERATOR" | "ADMIN";
  reputation?: number; // User's reputation for reporting accuracy
  activeJourney?: ActiveJourney | null; // Current active journey
  favoriteConnections?: FavoriteConnection[]; // Saved favorite routes
}

export type ReportStatus = "DRAFT" | "PUBLISHED" | "RESOLVED";
export type TransportType = "BUS" | "RAIL";

export type IncidentKind =
  | "INCIDENT"
  | "NETWORK_FAILURE"
  | "VEHICLE_FAILURE"
  | "ACCIDENT"
  | "TRAFFIC_JAM"
  | "PLATFORM_CHANGES";

export interface IncidentModel {
  _id?: ObjectId | string;
  title: string;
  description?: string | null;
  kind: IncidentKind;
  status: ReportStatus;
  lineIds?: Array<ObjectId | string | null> | null;
  affectedSegment?: {
    startStopId: ObjectId | string;
    endStopId: ObjectId | string;
    lineId?: ObjectId | string | null;
  } | null;
  createdAt: string;
}

// Incident location - tracks which segments have incidents
export interface IncidentLocationModel {
  _id?: ObjectId | string;
  incidentId: ObjectId | string; // Reference to incident
  lineId: ObjectId | string; // Which line is affected
  startStopId: ObjectId | string; // Start of affected segment
  endStopId: ObjectId | string; // End of affected segment
  severity: "HIGH" | "MEDIUM" | "LOW"; // Based on incidentClass
  active: boolean; // Is incident still active (not RESOLVED)
  createdAt: string;
  resolvedAt?: string | null;
}

export interface LineModel {
  _id?: ObjectId | string;
  name: string;
  transportType: TransportType;
  routeIds?: Array<ObjectId | string>;
  gtfsId?: string; // Original GTFS ID if imported from GTFS
}

// Geographic coordinates
export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Stop/Station with location
export interface StopModel {
  _id?: ObjectId | string;
  name: string;
  coordinates: Coordinates;
  transportType: TransportType;
  platformNumbers?: string[]; // e.g., ["1", "2", "A", "B"]
}

// Schedule entry - when a vehicle arrives at a stop
export interface ScheduleStopModel {
  stopId: ObjectId | string;
  arrivalTime: string; // HH:mm format, e.g., "14:30"
  departureTime: string; // HH:mm format
  platformNumber?: string;
}

// Route with schedule
export interface RouteModel {
  _id?: ObjectId | string;
  lineId: ObjectId | string; // Which line this route belongs to
  direction: string; // e.g., "A -> B" or "inbound"/"outbound"
  stops: ScheduleStopModel[]; // Ordered list of stops with times
  validDays?: string[]; // ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
  validFrom?: string; // ISO date
  validTo?: string; // ISO date
}

// Path segment - part of a journey
export interface PathSegment {
  segmentType: "WALK" | "TRANSIT";
  from: {
    stopId?: string | null;
    stopName?: string;
    coordinates: Coordinates;
  };
  to: {
    stopId?: string | null;
    stopName?: string;
    coordinates: Coordinates;
  };
  lineId?: string;
  lineName?: string;
  transportType?: TransportType;
  departureTime?: string;
  arrivalTime?: string;
  duration: number; // minutes
  distance?: number; // meters for walking
  platformNumber?: string;
  warnings?: string[]; // Incidents affecting this segment
  hasIncident?: boolean; // Whether this segment has active incidents
  incidentWarning?: string; // Human-readable incident warning
  incidentSeverity?: "HIGH" | "MEDIUM" | "LOW"; // Severity of incident
}

// Complete journey path
export interface JourneyPath {
  segments: PathSegment[];
  totalDuration: number; // minutes
  totalTransfers: number;
  departureTime: string;
  arrivalTime: string;
  warnings: string[]; // Overall journey warnings
  hasIncidents?: boolean; // Whether any segment has incidents
  affectedSegments?: number[]; // Indices of segments with incidents
}

// NextAuth Session type
export interface SessionUser {
  email?: string | null;
  name?: string | null;
  image?: string | null;
}

export interface Session {
  user?: SessionUser;
  expires: string;
}

// GraphQL Context type
export interface GraphQLContext {
  db: import("mongodb").Db;
  session?: Session | null;
}

// Input types for path finding
export interface FindPathInput {
  from: Coordinates;
  to: Coordinates;
  departureTime?: string;
}

// Connecting route result
export interface ConnectingRoute {
  route: RouteModel;
  fromIndex: number;
  toIndex: number;
  departureStop: ScheduleStopModel;
  arrivalStop: ScheduleStopModel;
}

// Collection names
export const COLLECTIONS = {
  USERS: "Users",
  INCIDENTS: "Incidents",
  INCIDENT_LOCATIONS: "IncidentLocations",
  LINES: "Lines",
  STOPS: "Stops",
  ROUTES: "Routes",
} as const;
