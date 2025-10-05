# Implementation Progress: Spam Prevention & Threshold System

## ✅ Phase 1 Complete: Core Infrastructure

### 1. Rate Limiting Service (`src/lib/rate-limiter.ts`)

**Status**: ✅ Complete

**Features Implemented**:

- ✅ Multi-tier rate limits (USER/MODERATOR/ADMIN)
  - Users: 2/min, 10/hour, 50/day
  - Moderators: 5/min, 30/hour, 200/day
  - Admins: 10/min, 100/hour, 1000/day
- ✅ Cooldown system (3 types)
  - Same location (500m): 5 minutes
  - Same incident type: 3 minutes
  - Any report: 1 minute
- ✅ Report history tracking (last 30 days)
- ✅ Suspicious activity scoring
- ✅ Rate limit violation tracking
- ✅ Haversine distance calculation

**Database Collection**: `UserReportHistory`

```typescript
{
  userId: ObjectId,
  reports: [{
    incidentId: ObjectId,
    createdAt: string,
    location: { latitude, longitude },
    kind: IncidentKind
  }],
  rateLimitViolations: number,
  lastReportAt: string,
  suspiciousActivityScore: number, // 0-100
  createdAt: string,
  updatedAt: string
}
```

**Key Functions**:

- `checkRateLimits(userId, role, db)` - Returns allow/deny with retry timer
- `checkCooldown(userId, newReport, db)` - Returns cooldown status
- `recordReport(userId, report, db)` - Saves report to history
- `isSuspiciousUser(userId, db)` - Flags spam accounts

---

### 2. Pending Reports Manager (`src/lib/pending-reports.ts`)

**Status**: ✅ Complete

**Features Implemented**:

- ✅ Aggregates similar reports (500m radius, 30min window)
- ✅ Integrates with existing `threshold-algorithm.ts`
- ✅ Automatic threshold calculation
- ✅ Status progression: PENDING → THRESHOLD_MET → PUBLISHED
- ✅ Moderator queue management
- ✅ Priority system (HIGH/MEDIUM/LOW)
- ✅ 24-hour expiration for unmet reports

**Database Collections**:

**`PendingIncidentReports`**:

```typescript
{
  incidentId: ObjectId,           // Ref to Incidents collection
  status: PendingReportStatus,    // PENDING | THRESHOLD_MET | etc
  reporterIds: ObjectId[],        // All users who reported
  reporterReputations: number[],  // Reputation scores
  totalReports: number,
  aggregateReputation: number,
  thresholdScore: number,         // Current score (uses calculateThreshold)
  thresholdRequired: number,      // Usually 1.0
  thresholdMetAt?: string,
  kind: IncidentKind,
  location: { latitude, longitude },
  lineIds: ObjectId[],
  createdAt: string,
  lastReportAt: string,
  expiresAt: string,              // +24 hours
  moderatorNotes?: string
}
```

**`ModeratorQueue`**:

```typescript
{
  pendingReportId: ObjectId,
  priority: "HIGH" | "MEDIUM" | "LOW",
  reason: string,
  assignedTo?: ObjectId,
  createdAt: string,
  reviewedAt?: string
}
```

**Key Functions**:

- `findSimilarPendingReports(incident, db)` - Groups nearby reports
- `createPendingReport(incident, userId, reputation, db)` - New pending
- `addReportToPending(pending, userId, reputation, db)` - Adds reporter
- `addToModeratorQueue(reportId, reason, priority, db)` - Queue management
- `getModeratorQueue(db)` - Sorted by priority + age
- `expirePendingReports(db)` - Cleanup old reports

---

## 📋 Phase 2: Next Steps

### 3. GraphQL Schema Updates

**File**: `src/backend/schema.graphql`

**Add these types**:

```graphql
type PendingIncidentReport {
  id: ID!
  incident: Incident!
  status: PendingReportStatus!
  totalReports: Int!
  thresholdScore: Float!
  thresholdProgress: Float! # Percentage (0-100)
  reporterCount: Int!
  aggregateReputation: Int!
  createdAt: String!
  expiresAt: String!
}

enum PendingReportStatus {
  PENDING
  THRESHOLD_MET
  MANUALLY_APPROVED
  REJECTED
  EXPIRED
}

type ModeratorQueueItem {
  id: ID!
  pendingReport: PendingIncidentReport!
  priority: QueuePriority!
  reason: String!
  createdAt: String!
}

enum QueuePriority {
  HIGH
  MEDIUM
  LOW
}

type RateLimitInfo {
  canSubmit: Boolean!
  cooldownRemaining: Int # Seconds
  rateLimitRemaining: Int # Reports remaining this hour
  reason: String
}

extend type Query {
  # Check submission eligibility
  canSubmitReport: RateLimitInfo!

  # Moderator queries
  moderatorQueue: [ModeratorQueueItem!]!
  pendingReports(status: PendingReportStatus): [PendingIncidentReport!]!
}

extend type Mutation {
  # Enhanced report creation
  createReportWithThreshold(input: CreateReportInput!): AddReportResult!

  # Moderator actions
  approveReport(pendingReportId: ID!, notes: String): Incident!
  rejectReport(pendingReportId: ID!, reason: String!): Boolean!
  flagUserForSpam(userId: ID!, reason: String!): Boolean!
}

type AddReportResult {
  success: Boolean!
  pendingReportId: ID!
  status: PendingReportStatus!
  thresholdProgress: Float! # 0-100
  message: String!
  isNew: Boolean!
  totalReports: Int!
  reportsNeeded: Int
  reputationNeeded: Int
}
```

### 4. GraphQL Resolvers

**File**: `src/backend/resolvers/mutation.ts`

**Replace `createReport` with**:

```typescript
async createReportWithThreshold(
  _: unknown,
  { input }: { input: CreateReportInput },
  ctx: GraphQLContext,
) {
  const db = await DB();
  const user = await getAuthenticatedUser(ctx, db);

  // 1. Check rate limits
  const rateLimitCheck = await checkRateLimits(user._id!, user.role, db);
  if (!rateLimitCheck.allowed) {
    throw new Error(rateLimitCheck.reason);
  }

  // 2. Check cooldown
  const cooldownCheck = await checkCooldown(
    user._id!,
    { kind: input.kind, location: input.reporterLocation },
    db
  );
  if (!cooldownCheck.allowed) {
    throw new Error(cooldownCheck.reason);
  }

  // 3. Create incident (same as before)
  const incident = await createIncidentInDB(input, user, db);

  // 4. Find similar pending reports
  const similarReports = await findSimilarPendingReports(
    {
      kind: incident.kind,
      location: input.reporterLocation!,
      lineIds: incident.lineIds
    },
    db
  );

  let result: AddReportResult;

  if (similarReports.length > 0) {
    // Add to existing pending report
    result = await addReportToPending(
      similarReports[0],
      user._id!,
      user.reputation,
      db
    );

    // If threshold met, publish incident
    if (result.status === "THRESHOLD_MET") {
      await publishIncidentAutomatically(
        similarReports[0],
        db
      );

      // Reward all reporters
      await rewardReporters(similarReports[0], db);
    }
  } else {
    // Create new pending report
    result = await createPendingReport(
      incident,
      user._id!,
      user.reputation,
      db
    );
  }

  // 5. Record in history
  await recordReport(
    user._id!,
    {
      incidentId: incident._id!,
      kind: incident.kind,
      location: input.reporterLocation
    },
    db
  );

  return result;
}
```

**Add moderator mutations**:

```typescript
async approveReport(
  _: unknown,
  { pendingReportId, notes }: { pendingReportId: string; notes?: string },
  ctx: GraphQLContext,
) {
  const db = await DB();
  const moderator = await requireModeratorRole(ctx, db);

  const pendingReport = await getPendingReport(pendingReportId, db);
  if (!pendingReport) {
    throw new Error("Pending report not found");
  }

  // Publish incident
  const incident = await publishIncidentManually(
    pendingReport,
    moderator._id!,
    notes,
    db
  );

  // Reward reporters with BONUS
  await rewardReporters(pendingReport, db, {
    bonusMultiplier: 1.5, // 50% bonus for quality
    reason: "MODERATOR_APPROVED"
  });

  // Remove from queue
  await removeFromModeratorQueue(pendingReportId, db);

  // WebSocket broadcast
  pubsub.publish(CHANNELS.INCIDENT_CREATED, incident);

  return incident;
}
```

### 5. Client Component: Enhanced add-event-dialog

**File**: `src/components/add-event-dialog.tsx`

**Add**:

- ✅ Rate limit check on mount
- ✅ Cooldown timer UI
- ✅ Remaining reports indicator
- ✅ Threshold progress after submission
- ✅ Toast notifications with progress

**Example UI**:

```tsx
{
  cooldown > 0 && (
    <Alert variant="warning">
      <Clock className="h-4 w-4" />
      <AlertTitle>Cooldown Active</AlertTitle>
      <AlertDescription>
        You can submit another report in {cooldown}s
        <Progress value={((60 - cooldown) / 60) * 100} className="mt-2" />
      </AlertDescription>
    </Alert>
  );
}

{
  rateLimitInfo && (
    <div className="text-sm text-muted-foreground">
      Reports remaining this hour: {rateLimitInfo.remaining}/10
    </div>
  );
}
```

### 6. Moderator Dashboard Component

**File**: `src/components/moderator-queue-dashboard.tsx`

**Features**:

- View pending reports queue
- See threshold progress (visual progress bars)
- One-click approve/reject
- Priority badges
- Real-time updates via WebSocket subscription

---

## 🎯 Integration with Existing Code

### Threshold Algorithm (Already Exists) ✅

**File**: `src/lib/threshold-algorithm.ts`

**Used By**:

- `pending-reports.ts` → `calculateThreshold()`
- Default config: 3 reports, 100 reputation, 60/40 weight split

**Flow**:

1. User submits report
2. `addReportToPending()` calls `calculateThreshold()`
3. If `threshold.isOfficial === true` → Auto-publish
4. If `0.7 ≤ score < 1.0` → Add to moderator queue

### Notification System (Already Exists) ✅

**File**: `src/lib/notification-system.ts`

**Integration Points**:

- When threshold met → Call `processIncidentNotifications()`
- Uses existing trust score aggregation
- Deduplication (1-hour cache) prevents spam

### WebSocket Subscriptions (Already Exists) ✅

**Files**: `src/backend/resolvers/subscriptions.ts`

**Channels**:

- `INCIDENT_CREATED` - New incidents
- `LINE_INCIDENT_UPDATES` - Line-specific updates
- `MY_LINES_INCIDENTS` - User's active journey

**New Channel Needed**:

```typescript
PENDING_REPORT_UPDATED: "pendingReportUpdated"; // For moderator dashboard
```

---

## 📊 Database Indexes (Performance)

**Add these indexes**:

```javascript
// UserReportHistory
db.UserReportHistory.createIndex({ userId: 1 });
db.UserReportHistory.createIndex({ "reports.createdAt": -1 });
db.UserReportHistory.createIndex({ suspiciousActivityScore: -1 });

// PendingIncidentReports
db.PendingIncidentReports.createIndex({ status: 1, createdAt: -1 });
db.PendingIncidentReports.createIndex({ kind: 1, createdAt: -1 });
db.PendingIncidentReports.createIndex({ location: "2dsphere" }); // Geospatial
db.PendingIncidentReports.createIndex({ expiresAt: 1 });

// ModeratorQueue
db.ModeratorQueue.createIndex({ reviewedAt: 1 });
db.ModeratorQueue.createIndex({ priority: 1, createdAt: 1 });
```

---

## 🚀 Next Implementation Steps

1. **Update GraphQL Schema** (30 min)
   - Add new types
   - Add queries/mutations

2. **Create Resolvers** (2-3 hours)
   - `canSubmitReport` query
   - `createReportWithThreshold` mutation
   - `moderatorQueue` query
   - `approveReport`, `rejectReport` mutations

3. **Update add-event-dialog** (2 hours)
   - Add rate limit check
   - Add cooldown timer UI
   - Show threshold progress

4. **Create Moderator Dashboard** (3-4 hours)
   - Queue list component
   - Approve/reject actions
   - Real-time updates

5. **Add Database Indexes** (10 min)
   - Run index creation scripts

6. **Testing** (2-3 hours)
   - Rate limit edge cases
   - Threshold calculation
   - Moderator workflow

**Total Estimated Time**: ~12-15 hours

---

## 📈 Success Metrics

**Spam Reduction**:

- Current: Unknown baseline
- Target: <5% of reports flagged as spam

**Threshold Accuracy**:

- Target: >90% of threshold-met reports are valid
- Track: False positive rate

**Moderator Efficiency**:

- Target: <2 min average review time
- Track: Queue depth, resolution rate

**User Experience**:

- Target: <10% legitimate users rate-limited
- Track: Cooldown hit rate, user feedback

---

**Status**: Phase 1 Complete ✅
**Next**: Implement GraphQL resolvers
**Ready for**: Integration testing
