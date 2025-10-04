/**
 * Store Types
 *
 * Type definitions for Zustand store including user state,
 * WebSocket connections, journeys, and notifications
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: "USER" | "MODERATOR" | "ADMIN";
  twoFactorEnabled: boolean;
  reputation: number;
  createdAt: string;
  updatedAt: string;
}

export interface Journey {
  id: string;
  userId: string;
  lines: JourneyLine[];
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface JourneyLine {
  id: string;
  name: string;
  transportType: "BUS" | "RAIL";
  sequence: number; // Order in the journey
}

export interface NotificationReport {
  id: string;
  incidentId?: string; // Set when notification becomes official
  reportedBy: string; // User ID
  reporterReputation: number;
  title: string;
  description: string;
  kind:
    | "INCIDENT"
    | "NETWORK_FAILURE"
    | "VEHICLE_FAILURE"
    | "PEDESTRIAN_ACCIDENT"
    | "TRAFFIC_JAM"
    | "PLATFORM_CHANGES";
  lineId: string;
  lineName: string;
  location?: {
    lat: number;
    lng: number;
  };
  timestamp: Date;
  status: "PENDING" | "OFFICIAL" | "REJECTED" | "RESOLVED";
  supportingReports: string[]; // User IDs who confirmed
  totalReputation: number; // Sum of all supporting users' reputation
  threshold: number; // Calculated threshold needed for official status
  verifiedCorrect?: boolean; // Set after resolution to track accuracy
}

export interface OfficialNotification {
  id: string;
  incidentId: string;
  title: string;
  description: string;
  kind: NotificationReport["kind"];
  lineId: string;
  lineName: string;
  location?: {
    lat: number;
    lng: number;
  };
  reportCount: number;
  totalReputation: number;
  contributingUsers: string[]; // User IDs who reported/confirmed
  createdAt: Date;
  resolvedAt?: Date;
  status: "ACTIVE" | "RESOLVED";
}

export type WebSocketStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface WebSocketConnection {
  id: string;
  url: string;
  socket: WebSocket | null;
  status: WebSocketStatus;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
}

export interface ReputationChange {
  userId: string;
  change: number; // Positive or negative
  reason: string;
  notificationId: string;
  timestamp: Date;
}

// WebSocket Message Types
export interface WSMessage {
  type: string;
  payload: unknown;
}

export interface WSNotificationMessage extends WSMessage {
  type: "notification:new" | "notification:update" | "notification:official";
  payload: NotificationReport | OfficialNotification;
}

export interface WSJourneyUpdateMessage extends WSMessage {
  type: "journey:update";
  payload: {
    userId: string;
    journey: Journey;
  };
}

export interface WSReputationMessage extends WSMessage {
  type: "reputation:update";
  payload: ReputationChange;
}

export interface WSUserReportMessage extends WSMessage {
  type: "report:submit";
  payload: {
    userId: string;
    report: Omit<
      NotificationReport,
      | "id"
      | "timestamp"
      | "status"
      | "supportingReports"
      | "totalReputation"
      | "threshold"
    >;
  };
}

export interface WSConfirmReportMessage extends WSMessage {
  type: "report:confirm";
  payload: {
    userId: string;
    notificationId: string;
  };
}

export interface WSResolveNotificationMessage extends WSMessage {
  type: "notification:resolve";
  payload: {
    notificationId: string;
    wasCorrect: boolean; // Was the notification accurate?
  };
}
