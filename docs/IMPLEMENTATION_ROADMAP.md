# IMPLEMENTATION PLAN: Spam Prevention & Threshold System

## ✅ What's Done

1. **GraphQL Schema Extended** (`src/backend/schema.graphql`)
   - ✅ Added `PendingIncident` type
   - ✅ Added `SubmitReportResult` type
   - ✅ Added `CanSubmitResult` type
   - ✅ Added `ModeratorQueueItem` type
   - ✅ Added `submitIncidentReport` mutation
   - ✅ Added moderator mutations
   - ✅ Added queries: `canSubmitReport`, `myPendingIncidents`, `moderatorQueue`

2. **Database Models** (`src/backend/db/collections.ts`)
   - ✅ Added `PendingIncidentModel`
   - ✅ Added `ModeratorQueueItemModel`
   - ✅ Added `PendingIncidentStatus` type
   - ✅ Added `QueuePriority` type
   - ✅ Updated `COLLECTIONS` constant

3. **Rate Limiter** (`src/lib/rate-limiter.ts`)
   - ✅ Complete implementation
   - ✅ Multi-tier rate limits
   - ✅ Cooldown system
   - ✅ Suspicious activity tracking

4. **Pending Reports Manager** (`src/lib/pending-reports.ts`)
   - ⚠️ **NEEDS FIXING** - Type conflicts with DB models

## 🔧 What Needs Fixing

### Issue 1: PendingIncidentModel Structure Mismatch

**Problem**: The `PendingIncidentModel` in collections.ts doesn't have `incidentId` because it's not linked to an Incident until published.

**Solution**: PendingIncident should store:

```typescript
{
  // ... other fields
  publishedIncidentId?: ObjectId | string | null; // Link to Incident after publishing
}
```

This field already exists in the DB model! Just need to use it correctly.

###Issue 2: pending-reports.ts Logic Flow

**Current Flow** (Wrong):

```
1. User reports → Create Incident immediately
2. Create PendingIncident linked to that Incident
3. When threshold met → "publish" the Incident
```

**Correct Flow**:

```
1. User reports → Create PendingIncident ONLY
2. Aggregate similar reports into same PendingIncident
3. Calculate threshold
4. When threshold met → Create NEW Incident + publish to WebSocket
5. Link PendingIncident.publishedIncidentId → new Incident._id
```

## 📋 Step-by-Step Implementation

### Step 1: Fix pending-reports.ts to match DB schema ✅ NEXT

Delete the old interface definitions and use DB models directly:

```typescript
// ❌ REMOVE these old interfaces
export interface PendingIncidentReport { ... }
export interface ModeratorQueueItem { ... }

// ✅ USE these instead
import type {
  PendingIncidentModel,
  ModeratorQueueItemModel,
  Coordinates,
} from "@/backend/db/collections";

// Just create type aliases for convenience
export type PendingIncidentReport = PendingIncidentModel;
export type ModeratorQueueItem = ModeratorQueueItemModel;
```

### Step 2: Create New Resolver - submitIncidentReport

**File**: `src/backend/resolvers/incidentMutations.ts` (NEW FILE)

```typescript
import { ObjectId } from "mongodb";
import { DB } from "../db/client.js";
import {
  GraphQLContext,
  PendingIncidentModel,
  IncidentModel,
} from "../db/collections.js";
import {
  checkRateLimits,
  checkCooldown,
  recordReport,
} from "../../lib/rate-limiter";
import {
  findSimilarPendingReports,
  createPendingReport,
  addReportToPending,
} from "../../lib/pending-reports";
import { publishIncidentFromPending } from "../../lib/incident-publisher"; // NEW

export const incidentMutations = {
  async submitIncidentReport(
    _: unknown,
    { input }: { input: SubmitReportInput },
    ctx: GraphQLContext
  ) {
    const db = await DB();

    // 1. Authenticate
    if (!ctx.session?.user?.email) {
      throw new Error("Not authenticated");
    }

    const user = await db.collection("users").findOne({
      email: ctx.session.user.email,
    });

    if (!user) {
      throw new Error("User not found");
    }

    // 2. Rate limit check
    const rateLimitCheck = await checkRateLimits(user._id!, user.role, db);

    if (!rateLimitCheck.allowed) {
      throw new Error(rateLimitCheck.reason);
    }

    // 3. Cooldown check
    const cooldownCheck = await checkCooldown(
      user._id!,
      {
        kind: input.kind,
        location: input.reporterLocation,
      },
      db
    );

    if (!cooldownCheck.allowed) {
      throw new Error(cooldownCheck.reason);
    }

    // 4. Find similar pending incidents
    const similarPending = await findSimilarPendingReports(
      {
        kind: input.kind,
        location: input.reporterLocation,
        lineIds: input.lineIds?.map((id) => new ObjectId(id)) || [],
      },
      db
    );

    let result;
    let pendingIncident: PendingIncidentModel;

    if (similarPending.length > 0) {
      // 5a. Add to existing pending incident
      pendingIncident = similarPending[0];
      result = await addReportToPending(
        pendingIncident,
        user._id!,
        user.reputation,
        db
      );
    } else {
      // 5b. Create new pending incident
      const newPending: PendingIncidentModel = {
        kind: input.kind,
        description: input.description || null,
        status: "PENDING",
        location: input.reporterLocation,
        lineIds: input.lineIds?.map((id) => new ObjectId(id)) || [],
        delayMinutes: input.delayMinutes || null,
        reporterIds: [user._id!],
        reporterReputations: [user.reputation],
        totalReports: 1,
        aggregateReputation: user.reputation,
        thresholdScore: 0,
        thresholdRequired: 1.0,
        createdAt: new Date().toISOString(),
        lastReportAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(), // +24h
      };

      const insertResult = await db
        .collection<PendingIncidentModel>("PendingIncidents")
        .insertOne(newPending);

      newPending._id = insertResult.insertedId;
      pendingIncident = newPending;

      result = {
        success: true,
        pendingReportId: insertResult.insertedId.toString(),
        status: "PENDING" as const,
        thresholdProgress: 0,
        thresholdScore: 0,
        message: "Report submitted! Waiting for confirmation from other users.",
        isNew: true,
        totalReports: 1,
        reportsNeeded: 2,
        reputationNeeded: 100 - user.reputation,
      };
    }

    // 6. Record in history
    await recordReport(
      user._id!,
      {
        incidentId: pendingIncident._id!,
        kind: input.kind,
        location: input.reporterLocation,
      },
      db
    );

    // 7. If threshold met, publish incident
    let publishedIncident: IncidentModel | null = null;
    let reputationGained = 0;

    if (result.status === "THRESHOLD_MET") {
      publishedIncident = await publishIncidentFromPending(pendingIncident, db);

      // Reward all reporters
      reputationGained = await rewardReporters(pendingIncident, db, {
        bonusMultiplier: 1.0,
        reason: "THRESHOLD_MET",
      });
    }

    return {
      success: true,
      pendingIncident: {
        id: pendingIncident._id!.toString(),
        ...pendingIncident,
      },
      message: result.message,
      isNewReport: result.isNew,
      wasPublished: result.status === "THRESHOLD_MET",
      publishedIncident,
      reputationGained,
    };
  },
};
```

### Step 3: Create Incident Publisher

**File**: `src/lib/incident-publisher.ts` (NEW FILE)

```typescript
import { Db, ObjectId } from "mongodb";
import type {
  PendingIncidentModel,
  IncidentModel,
  IncidentLocationModel,
} from "@/backend/db/collections";
import { pubsub, CHANNELS } from "@/backend/resolvers/subscriptions";
import { processIncidentNotifications } from "./notification-system";

/**
 * Convert PendingIncident to real Incident and publish to WebSocket
 */
export async function publishIncidentFromPending(
  pendingIncident: PendingIncidentModel,
  db: Db
): Promise<IncidentModel> {
  // Generate title
  const titleMap = {
    ACCIDENT: "Wypadek",
    TRAFFIC_JAM: "Korek uliczny",
    INCIDENT: "Incydent",
    NETWORK_FAILURE: "Awaria sieci",
    VEHICLE_FAILURE: "Awaria pojazdu",
    PLATFORM_CHANGES: "Zmiana peronu",
  };

  const now = new Date().toISOString();

  // Create real Incident
  const incident: IncidentModel = {
    title: titleMap[pendingIncident.kind] || "Incydent",
    description: pendingIncident.description,
    kind: pendingIncident.kind,
    status: "PUBLISHED",
    lineIds: pendingIncident.lineIds,
    delayMinutes: pendingIncident.delayMinutes,
    isFake: false,
    reportedBy: pendingIncident.reporterIds[0], // First reporter
    createdAt: now,
  };

  const result = await db
    .collection<IncidentModel>("Incidents")
    .insertOne(incident);

  incident._id = result.insertedId;

  // Update PendingIncident with link
  await db.collection<PendingIncidentModel>("PendingIncidents").updateOne(
    { _id: pendingIncident._id },
    {
      $set: {
        publishedIncidentId: result.insertedId,
        thresholdMetAt: now,
      },
    }
  );

  // Create IncidentLocations for path finding
  if (pendingIncident.lineIds && pendingIncident.lineIds.length > 0) {
    const locations: IncidentLocationModel[] = pendingIncident.lineIds
      .filter((id) => id !== null)
      .map((lineId) => ({
        incidentId: result.insertedId,
        lineId: lineId as ObjectId,
        startStopId: new ObjectId(), // TODO: Detect from location
        endStopId: new ObjectId(), // TODO: Detect from location
        severity: pendingIncident.kind === "ACCIDENT" ? "HIGH" : "MEDIUM",
        active: true,
        createdAt: now,
        resolvedAt: null,
      }));

    await db
      .collection<IncidentLocationModel>("IncidentLocations")
      .insertMany(locations);
  }

  // Publish to WebSocket
  pubsub.publish(CHANNELS.INCIDENT_CREATED, incident);

  if (incident.lineIds) {
    incident.lineIds.forEach((lineId) => {
      if (lineId) {
        pubsub.publish(`${CHANNELS.LINE_INCIDENT_UPDATES}:${lineId}`, incident);
      }
    });
  }

  // Send notifications
  await processIncidentNotifications(db, incident, "USER");

  return incident;
}

/**
 * Reward all reporters with reputation points
 */
export async function rewardReporters(
  pendingIncident: PendingIncidentModel,
  db: Db,
  options: {
    bonusMultiplier: number;
    reason: string;
  }
): Promise<number> {
  const baseReward = 10;
  const earlyReporterBonus = 5;
  const reward = Math.round(baseReward * options.bonusMultiplier);

  let totalRewarded = 0;

  for (let i = 0; i < pendingIncident.reporterIds.length; i++) {
    const userId = pendingIncident.reporterIds[i];
    const isEarlyReporter = i < 3; // First 3 reporters get bonus
    const points = reward + (isEarlyReporter ? earlyReporterBonus : 0);

    await db.collection("users").updateOne(
      { _id: userId },
      {
        $inc: { reputation: points },
      }
    );

    totalRewarded += points;
  }

  return totalRewarded;
}
```

### Step 4: Wire Up Resolvers

**File**: `src/backend/resolvers/index.ts`

Add the new mutations:

```typescript
import { incidentMutations } from "./incidentMutations.js";

export const resolvers = {
  Query: { ...existingQueries },
  Mutation: {
    ...existingMutations,
    submitIncidentReport: incidentMutations.submitIncidentReport,
    // Keep old createReport for admins
  },
  // ... rest
};
```

### Step 5: Create Query Resolvers

**File**: `src/backend/resolvers/incidentQueries.ts` (NEW FILE)

```typescript
export const incidentQueries = {
  async canSubmitReport(_: unknown, __: unknown, ctx: GraphQLContext) {
    const db = await DB();

    if (!ctx.session?.user?.email) {
      return {
        canSubmit: false,
        reason: "Not authenticated",
        cooldownRemaining: 0,
        rateLimitInfo: null,
      };
    }

    const user = await db.collection("users").findOne({
      email: ctx.session.user.email,
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Check rate limits
    const rateLimitCheck = await checkRateLimits(user._id!, user.role, db);

    if (!rateLimitCheck.allowed) {
      return {
        canSubmit: false,
        reason: rateLimitCheck.reason,
        cooldownRemaining: rateLimitCheck.retryAfter || 0,
        rateLimitInfo: {
          reportsRemaining: rateLimitCheck.remaining,
          violations: 0,
          suspiciousScore: 0,
        },
      };
    }

    return {
      canSubmit: true,
      reason: null,
      cooldownRemaining: 0,
      rateLimitInfo: {
        reportsRemaining: rateLimitCheck.remaining,
        violations: 0,
        suspiciousScore: 0,
      },
    };
  },

  async myPendingIncidents(_: unknown, __: unknown, ctx: GraphQLContext) {
    const db = await DB();

    if (!ctx.session?.user?.email) {
      throw new Error("Not authenticated");
    }

    const user = await db.collection("users").findOne({
      email: ctx.session.user.email,
    });

    if (!user) {
      throw new Error("User not found");
    }

    const pending = await db
      .collection<PendingIncidentModel>("PendingIncidents")
      .find({
        reporterIds: user._id,
        status: { $in: ["PENDING", "THRESHOLD_MET"] },
      })
      .sort({ createdAt: -1 })
      .toArray();

    return pending.map((p) => ({
      id: p._id!.toString(),
      ...p,
    }));
  },
};
```

## 🎯 Next Immediate Steps

1. **Fix pending-reports.ts** - Remove duplicate interfaces
2. **Create incident-publisher.ts** - Handles Incident creation
3. **Create incidentMutations.ts** - submitIncidentReport resolver
4. **Create incidentQueries.ts** - canSubmitReport resolver
5. **Wire up in resolvers/index.ts**
6. **Test with curl/GraphiQL**

## 📊 Testing Plan

```graphql
# 1. Check if can submit
query {
  canSubmitReport {
    canSubmit
    reason
    cooldownRemaining
  }
}

# 2. Submit report (User 1)
mutation {
  submitIncidentReport(
    input: {
      kind: TRAFFIC_JAM
      description: "Heavy traffic on main road"
      reporterLocation: { latitude: 52.2297, longitude: 21.0122 }
      lineIds: ["line-id-1"]
    }
  ) {
    success
    message
    pendingIncident {
      id
      totalReports
      thresholdProgress
    }
    wasPublished
  }
}

# 3. Submit same report (User 2)
# Should aggregate into same pending incident

# 4. Submit same report (User 3)
# Should meet threshold and auto-publish!
```

---

**Current Status**: Schema ✅ | DB Models ✅ | Rate Limiter ✅ | Pending Reports ⚠️ | Resolvers ❌

**Next Action**: Fix pending-reports.ts type conflicts
