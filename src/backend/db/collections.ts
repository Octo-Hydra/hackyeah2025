import type { ObjectId } from "mongodb";

// Types for MongoDB collections

export interface UserModel {
  _id?: ObjectId | string;
  id?: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  email: string;
  role: "USER" | "MODERATOR" | "ADMIN";
  twoFactorEnabled: boolean;
}

export type IncidentClass = "CLASS_1" | "CLASS_2";
export type ReportStatus = "DRAFT" | "PUBLISHED" | "RESOLVED";
export type TransportType = "BUS" | "RAIL";

export type IncidentKind =
  | "INCIDENT"
  | "NETWORK_FAILURE"
  | "VEHICLE_FAILURE"
  | "PEDESTRIAN_ACCIDENT"
  | "TRAFFIC_JAM"
  | "PLATFORM_CHANGES";

export interface IncidentModel {
  _id?: ObjectId | string;
  title: string;
  description?: string | null;
  kind: IncidentKind;
  incidentClass: IncidentClass;
  status: ReportStatus;
  lineIds?: Array<ObjectId | string | null> | null;
  vehicleIds?: Array<ObjectId | string | null> | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
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
}

// Complete journey path
export interface JourneyPath {
  segments: PathSegment[];
  totalDuration: number; // minutes
  totalTransfers: number;
  departureTime: string;
  arrivalTime: string;
  warnings: string[]; // Overall journey warnings
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
  startCoordinates: Coordinates;
  endCoordinates: Coordinates;
  departureTime?: string;
  maxWalkingDistance?: number;
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
  LINES: "Lines",
  STOPS: "Stops",
  ROUTES: "Routes",
} as const;
