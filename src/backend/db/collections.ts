import type { ObjectId } from "mongodb";

// Types for MongoDB collections used by the backend

export interface UserModel {
  _id?: ObjectId | string;
  id?: string; // optional shim
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
  transportType?: TransportType | null;
  lineIds?: Array<ObjectId | string | null> | null;
  lineNames?: Array<string> | null;
  createdBy?: string | null; // email or user id
  createdAt: string;
  updatedAt: string;
}

export interface LineModel {
  _id?: ObjectId | string;
  name: string;
  transportType: TransportType;
}

// Optional: helper type for typed collection names
export const COLLECTIONS = {
  USERS: "Users",
  INCIDENTS: "Incidents",
  LINES: "Lines",
} as const;
