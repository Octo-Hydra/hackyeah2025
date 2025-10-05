/**
 * Rate Limiting & Spam Prevention
 *
 * Prevents users from submitting too many reports in a short time.
 * Tracks report history and enforces cooldowns.
 */

import { Db, ObjectId } from "mongodb";
import type { IncidentKind } from "@/backend/db/collections";

/**
 * Rate limit configuration per user role
 */
export interface RateLimitTier {
  perMinute: number;
  perHour: number;
  perDay: number;
}

export const USER_RATE_LIMITS: RateLimitTier = {
  perMinute: 2,
  perHour: 10,
  perDay: 50,
};

export const ADMIN_RATE_LIMITS: RateLimitTier = {
  perMinute: 10,
  perHour: 100,
  perDay: 1000,
};

/**
 * Cooldown configuration (in milliseconds)
 */
export interface CooldownConfig {
  sameLocation: number; // Same location (within 500m)
  sameKind: number; // Same incident type
  anyReport: number; // Between any reports
}

export const DEFAULT_COOLDOWNS: CooldownConfig = {
  sameLocation: 300000, // 5 minutes
  sameKind: 180000, // 3 minutes
  anyReport: 60000, // 1 minute
};

/**
 * User report history entry
 */
export interface ReportHistoryEntry {
  incidentId: ObjectId;
  createdAt: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  kind: IncidentKind;
}

/**
 * User report history (stored in database)
 */
export interface UserReportHistory {
  _id?: ObjectId;
  userId: ObjectId;
  reports: ReportHistoryEntry[];
  rateLimitViolations: number;
  lastReportAt: string;
  suspiciousActivityScore: number; // 0-100, auto-flags at 80+
  createdAt: string;
  updatedAt: string;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfter?: number; // Seconds until can retry
  remaining?: {
    perMinute: number;
    perHour: number;
    perDay: number;
  };
}

/**
 * Cooldown check result
 */
export interface CooldownResult {
  allowed: boolean;
  reason?: string;
  remainingMs?: number;
  cooldownType?: "sameLocation" | "sameKind" | "anyReport";
}

/**
 * Get user's report history from database
 */
async function getUserReportHistory(
  userId: ObjectId | string,
  db: Db,
): Promise<UserReportHistory | null> {
  const userIdObj = typeof userId === "string" ? new ObjectId(userId) : userId;

  return await db
    .collection<UserReportHistory>("UserReportHistory")
    .findOne({ userId: userIdObj });
}

/**
 * Initialize report history for new user
 */
async function initializeReportHistory(
  userId: ObjectId | string,
  db: Db,
): Promise<UserReportHistory> {
  const userIdObj = typeof userId === "string" ? new ObjectId(userId) : userId;

  const now = new Date().toISOString();
  const history: UserReportHistory = {
    userId: userIdObj,
    reports: [],
    rateLimitViolations: 0,
    lastReportAt: now,
    suspiciousActivityScore: 0,
    createdAt: now,
    updatedAt: now,
  };

  await db
    .collection<UserReportHistory>("UserReportHistory")
    .insertOne(history);

  return history;
}

/**
 * Check if user has exceeded rate limits
 */
export async function checkRateLimits(
  userId: ObjectId | string,
  userRole: "USER" | "MODERATOR" | "ADMIN",
  db: Db,
): Promise<RateLimitResult> {
  // Get or create history
  let history = await getUserReportHistory(userId, db);
  if (!history) {
    history = await initializeReportHistory(userId, db);
  }

  // Get rate limits based on role
  const limits = userRole === "ADMIN" ? ADMIN_RATE_LIMITS : USER_RATE_LIMITS;

  const now = Date.now();

  // Filter reports by time window
  const lastMinuteReports = history.reports.filter(
    (r) => now - new Date(r.createdAt).getTime() < 60000,
  );

  const lastHourReports = history.reports.filter(
    (r) => now - new Date(r.createdAt).getTime() < 3600000,
  );

  const lastDayReports = history.reports.filter(
    (r) => now - new Date(r.createdAt).getTime() < 86400000,
  );

  // Check per-minute limit
  if (lastMinuteReports.length >= limits.perMinute) {
    const oldestReport = lastMinuteReports[0];
    const retryAfter = Math.ceil(
      (60000 - (now - new Date(oldestReport.createdAt).getTime())) / 1000,
    );

    return {
      allowed: false,
      reason: `Too many reports per minute. Maximum ${limits.perMinute} reports per minute.`,
      retryAfter,
    };
  }

  // Check per-hour limit
  if (lastHourReports.length >= limits.perHour) {
    const oldestReport = lastHourReports[0];
    const retryAfter = Math.ceil(
      (3600000 - (now - new Date(oldestReport.createdAt).getTime())) / 1000,
    );

    return {
      allowed: false,
      reason: `Too many reports per hour. Maximum ${limits.perHour} reports per hour.`,
      retryAfter,
    };
  }

  // Check per-day limit
  if (lastDayReports.length >= limits.perDay) {
    const oldestReport = lastDayReports[0];
    const retryAfter = Math.ceil(
      (86400000 - (now - new Date(oldestReport.createdAt).getTime())) / 1000,
    );

    return {
      allowed: false,
      reason: `Daily report limit reached. Maximum ${limits.perDay} reports per day.`,
      retryAfter,
    };
  }

  return {
    allowed: true,
    remaining: {
      perMinute: limits.perMinute - lastMinuteReports.length,
      perHour: limits.perHour - lastHourReports.length,
      perDay: limits.perDay - lastDayReports.length,
    },
  };
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if user has active cooldown
 */
export async function checkCooldown(
  userId: ObjectId | string,
  newReport: {
    kind: IncidentKind;
    location?: {
      latitude: number;
      longitude: number;
    };
  },
  db: Db,
  config: CooldownConfig = DEFAULT_COOLDOWNS,
): Promise<CooldownResult> {
  const history = await getUserReportHistory(userId, db);
  if (!history || history.reports.length === 0) {
    return { allowed: true };
  }

  const now = Date.now();
  const recentReports = history.reports.filter(
    (r) => now - new Date(r.createdAt).getTime() < config.sameLocation,
  );

  if (recentReports.length === 0) {
    return { allowed: true };
  }

  // Sort by newest first
  recentReports.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const lastReport = recentReports[0];
  const timeSinceLastReport = now - new Date(lastReport.createdAt).getTime();

  // Check general cooldown (any report)
  if (timeSinceLastReport < config.anyReport) {
    return {
      allowed: false,
      reason: "Please wait before submitting another report",
      remainingMs: config.anyReport - timeSinceLastReport,
      cooldownType: "anyReport",
    };
  }

  // Check same incident type cooldown
  if (
    lastReport.kind === newReport.kind &&
    timeSinceLastReport < config.sameKind
  ) {
    return {
      allowed: false,
      reason: `Please wait before reporting another ${newReport.kind} incident`,
      remainingMs: config.sameKind - timeSinceLastReport,
      cooldownType: "sameKind",
    };
  }

  // Check same location cooldown (within 500m)
  if (newReport.location && lastReport.location) {
    const distance = calculateDistance(
      newReport.location.latitude,
      newReport.location.longitude,
      lastReport.location.latitude,
      lastReport.location.longitude,
    );

    if (distance < 500 && timeSinceLastReport < config.sameLocation) {
      return {
        allowed: false,
        reason: "Please wait before reporting from this location again",
        remainingMs: config.sameLocation - timeSinceLastReport,
        cooldownType: "sameLocation",
      };
    }
  }

  return { allowed: true };
}

/**
 * Record a new report in user's history
 */
export async function recordReport(
  userId: ObjectId | string,
  report: {
    incidentId: ObjectId;
    kind: IncidentKind;
    location?: {
      latitude: number;
      longitude: number;
    };
  },
  db: Db,
): Promise<void> {
  const userIdObj = typeof userId === "string" ? new ObjectId(userId) : userId;

  const now = new Date().toISOString();
  const entry: ReportHistoryEntry = {
    incidentId: report.incidentId,
    createdAt: now,
    location: report.location,
    kind: report.kind,
  };

  // Get or create history
  let history = await getUserReportHistory(userIdObj, db);
  if (!history) {
    history = await initializeReportHistory(userIdObj, db);
  }

  // Clean old reports (keep last 30 days only)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const recentReports = history.reports.filter(
    (r) => r.createdAt >= thirtyDaysAgo,
  );

  // Add new report
  recentReports.push(entry);

  // Update in database
  await db.collection<UserReportHistory>("UserReportHistory").updateOne(
    { userId: userIdObj },
    {
      $set: {
        reports: recentReports,
        lastReportAt: now,
        updatedAt: now,
      },
    },
  );
}

/**
 * Increment rate limit violation counter (for penalties)
 */
export async function recordRateLimitViolation(
  userId: ObjectId | string,
  db: Db,
): Promise<void> {
  const userIdObj = typeof userId === "string" ? new ObjectId(userId) : userId;

  await db.collection<UserReportHistory>("UserReportHistory").updateOne(
    { userId: userIdObj },
    {
      $inc: {
        rateLimitViolations: 1,
        suspiciousActivityScore: 5, // Increase suspicion
      },
      $set: {
        updatedAt: new Date().toISOString(),
      },
    },
    { upsert: true },
  );
}

/**
 * Check if user is flagged for suspicious activity
 */
export async function isSuspiciousUser(
  userId: ObjectId | string,
  db: Db,
): Promise<{
  isSuspicious: boolean;
  score: number;
  reason?: string;
}> {
  const history = await getUserReportHistory(userId, db);
  if (!history) {
    return { isSuspicious: false, score: 0 };
  }

  // Suspicious if score >= 80
  if (history.suspiciousActivityScore >= 80) {
    return {
      isSuspicious: true,
      score: history.suspiciousActivityScore,
      reason: "High spam activity detected",
    };
  }

  // Suspicious if too many violations
  if (history.rateLimitViolations >= 10) {
    return {
      isSuspicious: true,
      score: history.suspiciousActivityScore,
      reason: "Too many rate limit violations",
    };
  }

  return {
    isSuspicious: false,
    score: history.suspiciousActivityScore,
  };
}

/**
 * Reset suspicious activity score (after review)
 */
export async function resetSuspiciousScore(
  userId: ObjectId | string,
  db: Db,
): Promise<void> {
  const userIdObj = typeof userId === "string" ? new ObjectId(userId) : userId;

  await db.collection<UserReportHistory>("UserReportHistory").updateOne(
    { userId: userIdObj },
    {
      $set: {
        suspiciousActivityScore: 0,
        rateLimitViolations: 0,
        updatedAt: new Date().toISOString(),
      },
    },
  );
}
