import type { ObjectId } from "mongodb";

// Types for MongoDB collections

// Segment location with full stop information
export interface SegmentLocation {
  stopId: ObjectId | string;
  stopName: string;
  coordinates: Coordinates;
}
export type PendingIncidentStatus =
  | "PENDING"
  | "THRESHOLD_MET"
  | "MANUALLY_APPROVED"
  | "REJECTED"
  | "EXPIRED";

export type QueuePriority = "HIGH" | "MEDIUM" | "LOW";

export interface ModeratorQueueItemModel {
  _id?: ObjectId | string;
  pendingIncidentId: ObjectId | string;
  priority: QueuePriority;
  reason: string;
  assignedTo?: ObjectId | string | null; // Moderator ID
  createdAt: string;
  reviewedAt?: string | null;
}

export interface PendingIncidentModel {
  _id?: ObjectId | string;
  kind: IncidentKind;
  description?: string | null;
  status: PendingIncidentStatus;

  // Location and affected lines
  location: Coordinates; // Center point of all reports
  lineIds: Array<ObjectId | string | null>;
  delayMinutes?: number | null;

  // Threshold tracking
  reporterIds: ObjectId[]; // All users who reported this
  reporterReputations: number[]; // Reputation at time of report
  totalReports: number;
  aggregateReputation: number;
  thresholdScore: number; // Current score from calculateThreshold()
  thresholdRequired: number; // Usually 1.0
  thresholdMetAt?: string | null;

  // Metadata
  createdAt: string;
  lastReportAt: string;
  expiresAt: string; // Auto-reject after 24h

  // Moderator
  moderatorNotes?: string | null;
  moderatorId?: ObjectId | string | null; // Who approved/rejected
  publishedIncidentId?: ObjectId | string | null; // Reference to created Incident
}
// Journey segment (stored in user's activeJourney)
export interface JourneySegment {
  from: SegmentLocation;
  to: SegmentLocation;
  lineId: ObjectId | string;
  lineName: string;
  transportType: TransportType;
  departureTime: string;
  arrivalTime: string;
  duration: number;
}

// Active journey that user is currently on
export interface ActiveJourney {
  segments: JourneySegment[];
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
  reputation: number; // User's reputation for reporting accuracy (starts at 100)
  trustScore?: number; // Dynamic trust score (0.5-2.5), calculated by cron
  trustScoreBreakdown?: {
    baseScore: number;
    accuracyBonus: number;
    highRepBonus: number;
    validationRate: number;
    updatedAt: string;
  };
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
  delayMinutes?: number | null; // Estimated delay in minutes
  isFake?: boolean; // True if marked as fake by admin/moderator
  reportedBy?: ObjectId | string | null; // User ID who reported (for reputation)
  createdAt: string;
}

export interface JourneyNotificationModel {
  _id?: ObjectId | string;
  userId: ObjectId | string;
  incidentId: string;
  title: string;
  description?: string | null;
  kind?: IncidentKind | null;
  status?: ReportStatus | null;
  lineId?: ObjectId | string | null;
  lineName?: string | null;
  delayMinutes?: number | null;
  receivedAt: string;
  dismissedAt?: string | null;
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
  hasIncident: boolean; // Whether this segment has active incidents (non-nullable)
  warning?: PathWarning; // Warning for this specific segment
}

// Structured warning for path finding
export interface PathWarning {
  fromStop?: string; // Start stop name
  toStop?: string; // End stop name
  lineName?: string; // Affected line name
  description: string; // Human-readable description
  incidentKind?: IncidentKind; // Type of incident
  severity?: "HIGH" | "MEDIUM" | "LOW"; // Severity level
}

// Complete journey path
export interface JourneyPath {
  segments: PathSegment[];
  totalDuration: number; // minutes
  totalTransfers: number;
  departureTime: string;
  arrivalTime: string;
  hasIncidents: boolean; // Whether any segment has incidents
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
  JOURNEY_NOTIFICATIONS: "journeyNotifications",
} as const;
