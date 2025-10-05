# Incident Spam Prevention & Threshold System

## 🎯 Overview

This document outlines the comprehensive solution for preventing spam in user-reported incidents while implementing a smart threshold system for automatic and manual moderation.

## 📋 Current System Analysis

### Existing Components

1. **Trust Score System** (`src/lib/threshold-algorithm.ts`)
   - Base reputation: 100 points per user
   - Minimum 3 reports needed for threshold
   - Trust score: 0.5-2.5 range
   - High-reputation bonus: 25%

2. **Notification System** (`src/lib/notification-system.ts`)
   - Deduplication (1-hour cache)
   - Trust-based notifications (threshold: 1.2)
   - Instant notifications for admins

3. **Incident Creation** (`src/backend/resolvers/mutation.ts`)
   - Location-based segment detection
   - Automatic line/stop detection
   - User reports: ACCIDENT, TRAFFIC_JAM only

### Missing Components

❌ Rate limiting per user
❌ Cooldown period between reports
❌ Pending/threshold state for reports
❌ Moderator review queue
❌ Manual approval with reputation rewards
❌ Report aggregation by similarity

## 🛡️ Spam Prevention Strategy

### 1. Rate Limiting

Implement multi-level rate limits:

```typescript
// User rate limits
interface RateLimits {
  perMinute: 2; // Max 2 reports per minute
  perHour: 10; // Max 10 reports per hour
  perDay: 50; // Max 50 reports per day
}

// Moderator rate limits (more lenient)
interface ModeratorRateLimits {
  perMinute: 5;
  perHour: 30;
  perDay: 200;
}
```

### 2. Cooldown System

Prevent rapid-fire duplicate reports:

```typescript
interface CooldownConfig {
  sameLocation: 300000; // 5 minutes for same location
  sameKind: 180000; // 3 minutes for same incident type
  anyReport: 60000; // 1 minute between any reports
}
```

### 3. Similarity Detection

Group similar reports to prevent duplicates:

```typescript
interface SimilarityFactors {
  locationRadius: 500; // 500m radius
  timeWindow: 1800000; // 30 minutes
  sameKind: true; // Same incident type
  sameLines: true; // Same affected lines
}
```

## 📊 Enhanced Database Schema

### New Collections

#### 1. UserReportHistory

Track rate limits and spam detection:

```typescript
interface UserReportHistory {
  _id: ObjectId;
  userId: ObjectId;
  reports: {
    incidentId: ObjectId;
    createdAt: string;
    location: Coordinates;
    kind: IncidentKind;
  }[];
  rateLimitViolations: number;
  lastReportAt: string;
  suspiciousActivityScore: number; // 0-100, auto-flags at 80+
}
```

#### 2. PendingIncidentReports

Queue for threshold-pending reports:

```typescript
interface PendingIncidentReport {
  _id: ObjectId;
  incidentId: ObjectId;
  status: "PENDING" | "THRESHOLD_MET" | "MANUALLY_APPROVED" | "REJECTED";
  reporterIds: ObjectId[]; // All users who reported
  reporterReputations: number[]; // Reputation at time of report
  totalReports: number;
  aggregateReputation: number;
  thresholdScore: number; // Current score (0-1)
  thresholdRequired: number; // Required score (usually 1.0)
  thresholdMetAt?: string; // When threshold was reached
  createdAt: string;
  lastReportAt: string;
  expiresAt: string; // Auto-reject after 24h if not met
  moderatorNotes?: string;
}
```

#### 3. ModeratorQueue

Prioritized queue for manual review:

```typescript
interface ModeratorQueueItem {
  _id: ObjectId;
  pendingReportId: ObjectId;
  priority: "HIGH" | "MEDIUM" | "LOW";
  reason: "NEAR_THRESHOLD" | "SUSPICIOUS" | "MANUAL_REVIEW";
  assignedTo?: ObjectId; // Moderator ID
  createdAt: string;
  reviewedAt?: string;
}
```

## 🔄 Enhanced Report Flow

### Phase 1: Report Submission (Client → Server)

```typescript
// User clicks "Report Incident" in add-event-dialog
// 1. Check rate limits (client-side warning)
// 2. Check cooldown (show countdown timer)
// 3. Submit report with location
```

### Phase 2: Server-Side Validation

```typescript
async function createReport(input: CreateReportInput) {
  // 1. Authenticate user
  const user = await getUser(session);

  // 2. Check rate limits
  const rateLimitCheck = await checkRateLimits(user.id);
  if (rateLimitCheck.violated) {
    throw new RateLimitError(rateLimitCheck.retryAfter);
  }

  // 3. Check cooldown
  const cooldownCheck = await checkCooldown(user.id, input);
  if (cooldownCheck.active) {
    throw new CooldownError(cooldownCheck.remainingMs);
  }

  // 4. Find similar pending reports
  const similarReports = await findSimilarReports(input);

  if (similarReports.length > 0) {
    // Add to existing pending report
    return await addToExistingReport(similarReports[0], user);
  } else {
    // Create new pending report
    return await createNewPendingReport(input, user);
  }
}
```

### Phase 3: Threshold Processing

```typescript
async function addToExistingReport(
  pendingReport: PendingIncidentReport,
  user: UserModel
) {
  // 1. Add user to reporters list
  pendingReport.reporterIds.push(user._id);
  pendingReport.reporterReputations.push(user.reputation);
  pendingReport.totalReports++;
  pendingReport.aggregateReputation += user.reputation;
  pendingReport.lastReportAt = new Date().toISOString();

  // 2. Calculate threshold
  const threshold = calculateThreshold(
    pendingReport.totalReports,
    pendingReport.aggregateReputation,
    pendingReport.reporterReputations
  );

  pendingReport.thresholdScore = threshold.currentScore;

  // 3. Check if threshold met
  if (threshold.isOfficial && pendingReport.status === "PENDING") {
    pendingReport.status = "THRESHOLD_MET";
    pendingReport.thresholdMetAt = new Date().toISOString();

    // 4. Auto-publish incident
    await publishIncident(pendingReport);

    // 5. Notify reporters (reputation reward)
    await rewardReporters(pendingReport);

    // 6. WebSocket broadcast
    pubsub.publish(CHANNELS.INCIDENT_CREATED, incident);
  }

  // 4. Add to moderator queue if near threshold
  if (threshold.currentScore >= 0.7 && threshold.currentScore < 1.0) {
    await addToModeratorQueue(pendingReport, "NEAR_THRESHOLD");
  }

  await savePendingReport(pendingReport);

  return {
    success: true,
    status: pendingReport.status,
    thresholdProgress: threshold.currentScore,
    message: getThresholdMessage(threshold),
  };
}
```

### Phase 4: Moderator Actions

```typescript
// Moderator can:
// 1. View queue of pending reports
// 2. Manually approve (publish + reward reporters)
// 3. Manually reject (with reason)
// 4. Mark as duplicate (merge with existing)
// 5. Flag user for spam

async function moderatorApproveReport(
  pendingReportId: string,
  moderatorId: string
) {
  const pendingReport = await getPendingReport(pendingReportId);

  // 1. Change status
  pendingReport.status = "MANUALLY_APPROVED";

  // 2. Publish incident
  const incident = await publishIncident(pendingReport);

  // 3. Reward reporters (BONUS for manual approval)
  await rewardReporters(pendingReport, {
    bonusMultiplier: 1.5, // 50% bonus for quality reports
    reason: "MODERATOR_APPROVED",
  });

  // 4. WebSocket broadcast
  pubsub.publish(CHANNELS.INCIDENT_CREATED, incident);

  // 5. Remove from queue
  await removeFromModeratorQueue(pendingReportId);

  return incident;
}
```

## 🎁 Reputation Reward System

### Automatic Rewards (Threshold Met)

```typescript
interface AutoReward {
  basePoints: 10; // Base reward per correct report
  earlyReporterBonus: 5; // First 3 reporters get bonus
  highImpactBonus: 15; // High-severity incidents
  thresholdSpeedBonus: {
    // Bonus based on how fast threshold met
    under5min: 5;
    under15min: 3;
    under30min: 1;
  };
}
```

### Manual Approval Rewards (Moderator)

```typescript
interface ManualReward {
  basePoints: 15; // Higher base (moderator verified)
  qualityBonus: 10; // Well-described, accurate location
  photoBonus: 5; // If photo attached (future)
  firstReporterBonus: 10; // Discovered issue first
}
```

### Reputation Penalties

```typescript
interface Penalties {
  fakeReport: -10; // Marked as fake by moderator
  spamViolation: -5; // Rate limit violation
  duplicateReport: -2; // Submitting duplicate
  suspiciousActivity: -20; // Flagged for spam behavior
}
```

## 🖥️ Implementation Files

### 1. Rate Limiting Service

**File**: `src/lib/rate-limiter.ts`

```typescript
export async function checkRateLimits(
  userId: string,
  db: Db
): Promise<RateLimitResult> {
  const history = await getUserReportHistory(userId, db);
  const now = Date.now();

  // Check per-minute limit
  const lastMinuteReports = history.reports.filter(
    (r) => now - new Date(r.createdAt).getTime() < 60000
  );
  if (lastMinuteReports.length >= 2) {
    return {
      violated: true,
      reason: "TOO_MANY_REPORTS_PER_MINUTE",
      retryAfter:
        60 -
        Math.floor(
          (now - new Date(lastMinuteReports[0].createdAt).getTime()) / 1000
        ),
    };
  }

  // Check per-hour limit
  const lastHourReports = history.reports.filter(
    (r) => now - new Date(r.createdAt).getTime() < 3600000
  );
  if (lastHourReports.length >= 10) {
    return {
      violated: true,
      reason: "TOO_MANY_REPORTS_PER_HOUR",
      retryAfter: Math.ceil(
        (3600000 - (now - new Date(lastHourReports[0].createdAt).getTime())) /
          1000
      ),
    };
  }

  return { violated: false };
}
```

### 2. Pending Report Manager

**File**: `src/lib/pending-reports.ts`

```typescript
export async function findSimilarReports(
  input: CreateReportInput,
  db: Db
): Promise<PendingIncidentReport[]> {
  const thirtyMinutesAgo = new Date(Date.now() - 1800000).toISOString();

  const incident = await db.collection("Incidents").findOne({
    _id: input.incidentId,
  });

  return await db
    .collection<PendingIncidentReport>("PendingIncidentReports")
    .find({
      status: { $in: ["PENDING", "THRESHOLD_MET"] },
      kind: input.kind,
      createdAt: { $gte: thirtyMinutesAgo },
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [
              input.reporterLocation.longitude,
              input.reporterLocation.latitude,
            ],
          },
          $maxDistance: 500, // 500 meters
        },
      },
    })
    .toArray();
}
```

### 3. Moderator Queue Manager

**File**: `src/lib/moderator-queue.ts`

```typescript
export async function getModeratorQueue(
  moderatorId: string,
  db: Db
): Promise<ModeratorQueueItem[]> {
  return await db
    .collection<ModeratorQueueItem>("ModeratorQueue")
    .aggregate([
      {
        $match: {
          reviewedAt: { $exists: false },
        },
      },
      {
        $lookup: {
          from: "PendingIncidentReports",
          localField: "pendingReportId",
          foreignField: "_id",
          as: "pendingReport",
        },
      },
      {
        $unwind: "$pendingReport",
      },
      {
        $sort: {
          priority: 1, // HIGH = 1, MEDIUM = 2, LOW = 3
          createdAt: 1,
        },
      },
    ])
    .toArray();
}
```

### 4. GraphQL Schema Updates

**File**: `src/backend/schema.graphql`

Add new types and mutations:

```graphql
type PendingIncidentReport {
  id: ID!
  incident: Incident!
  status: PendingReportStatus!
  totalReports: Int!
  thresholdScore: Float!
  thresholdRequired: Float!
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

type RateLimitError {
  message: String!
  retryAfter: Int! # Seconds until can retry
  reason: String!
}

extend type Query {
  # Check if user can submit report
  canSubmitReport: CanSubmitReportResult!

  # Moderator queries
  moderatorQueue: [ModeratorQueueItem!]!
  pendingReports(status: PendingReportStatus): [PendingIncidentReport!]!
}

extend type Mutation {
  # Enhanced report creation (returns pending status)
  createReportWithThreshold(input: CreateReportInput!): PendingIncidentReport!

  # Moderator actions
  approveReport(pendingReportId: ID!, notes: String): Incident!
  rejectReport(pendingReportId: ID!, reason: String!): Boolean!
  mergeReports(pendingReportIds: [ID!]!): PendingIncidentReport!
  flagUserForSpam(userId: ID!, reason: String!): Boolean!
}

type CanSubmitReportResult {
  canSubmit: Boolean!
  cooldownRemaining: Int # Seconds
  rateLimitRemaining: Int # Reports remaining this hour
  reason: String
}
```

### 5. Client Component Updates

**File**: `src/components/add-event-dialog.tsx`

Enhanced with spam prevention UI:

```typescript
export function AddEventDialog() {
  const [canSubmit, setCanSubmit] = useState(true);
  const [cooldown, setCooldown] = useState(0);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo>();

  // Check submission eligibility
  useEffect(() => {
    async function checkEligibility() {
      const result = await queries.canSubmitReport();
      setCanSubmit(result.canSubmit);

      if (!result.canSubmit) {
        setCooldown(result.cooldownRemaining);
        setRateLimitInfo({
          remaining: result.rateLimitRemaining,
          reason: result.reason
        });
      }
    }

    checkEligibility();
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown(prev => Math.max(0, prev - 1));
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [cooldown]);

  async function handleSubmit(data: FormData) {
    try {
      const result = await mutations.createReportWithThreshold({
        kind: data.kind,
        description: data.description,
        reporterLocation: data.location,
        lineIds: data.lineIds
      });

      // Show threshold progress
      if (result.status === "PENDING") {
        toast.success(
          `Zgłoszenie dodane! Próg: ${Math.round(result.thresholdProgress * 100)}%`
        );
      } else if (result.status === "THRESHOLD_MET") {
        toast.success("Zgłoszenie opublikowane automatycznie!");
      }
    } catch (error) {
      if (error instanceof RateLimitError) {
        toast.error(`Zbyt wiele zgłoszeń. Spróbuj za ${error.retryAfter}s`);
      }
    }
  }

  return (
    <Dialog>
      <DialogContent>
        {!canSubmit && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Cooldown aktywny</AlertTitle>
            <AlertDescription>
              Możesz zgłosić kolejny incydent za {cooldown} sekund.
              {rateLimitInfo && (
                <div className="mt-2">
                  Pozostało zgłoszeń w tej godzinie: {rateLimitInfo.remaining}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          {/* Form fields */}
          <Button disabled={!canSubmit || cooldown > 0}>
            {cooldown > 0 ? `Czekaj ${cooldown}s` : "Zgłoś incydent"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### 6. Moderator Dashboard Component

**File**: `src/components/moderator-queue-dashboard.tsx`

```typescript
export function ModeratorQueueDashboard() {
  const [queueItems, setQueueItems] = useState<ModeratorQueueItem[]>([]);

  useEffect(() => {
    async function loadQueue() {
      const items = await queries.moderatorQueue();
      setQueueItems(items);
    }

    loadQueue();
  }, []);

  async function handleApprove(itemId: string, notes: string) {
    const incident = await mutations.approveReport(itemId, notes);

    toast.success("Zgłoszenie zatwierdzone! Reporterzy otrzymali bonus reputacji.");

    // Remove from queue
    setQueueItems(prev => prev.filter(item => item.id !== itemId));
  }

  async function handleReject(itemId: string, reason: string) {
    await mutations.rejectReport(itemId, reason);

    toast.success("Zgłoszenie odrzucone");

    // Remove from queue
    setQueueItems(prev => prev.filter(item => item.id !== itemId));
  }

  return (
    <div className="space-y-4">
      <h2>Kolejka moderatora ({queueItems.length})</h2>

      {queueItems.map(item => (
        <Card key={item.id}>
          <CardHeader>
            <Badge variant={getPriorityVariant(item.priority)}>
              {item.priority}
            </Badge>
            <CardTitle>{item.pendingReport.incident.title}</CardTitle>
            <CardDescription>
              {item.pendingReport.totalReports} zgłoszeń •
              Próg: {Math.round(item.pendingReport.thresholdProgress)}%
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Progress value={item.pendingReport.thresholdProgress} />

            <div className="mt-4 flex gap-2">
              <Button
                onClick={() => handleApprove(item.id, "")}
                variant="default"
              >
                ✓ Zatwierdź
              </Button>
              <Button
                onClick={() => handleReject(item.id, "Fake report")}
                variant="destructive"
              >
                ✗ Odrzuć
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

## 📈 Implementation Priority

### Phase 1: Spam Prevention (Week 1)

1. ✅ Rate limiting service
2. ✅ Cooldown system
3. ✅ Report history tracking
4. ✅ Client-side cooldown UI

### Phase 2: Threshold System (Week 2)

1. ✅ Pending reports collection
2. ✅ Similarity detection
3. ✅ Threshold calculation
4. ✅ Auto-publish on threshold
5. ✅ WebSocket notifications

### Phase 3: Moderator Tools (Week 3)

1. ✅ Moderator queue
2. ✅ Manual approval/rejection
3. ✅ Reputation rewards
4. ✅ Spam user flagging
5. ✅ Dashboard UI

### Phase 4: Analytics & Optimization (Week 4)

1. ✅ Spam detection ML (optional)
2. ✅ Report accuracy tracking
3. ✅ Threshold tuning
4. ✅ Performance metrics

## 🎯 Success Metrics

- **Spam Reduction**: <5% of reports flagged as spam
- **Threshold Accuracy**: >90% of threshold-met reports are valid
- **Moderator Efficiency**: Average review time <2 minutes
- **User Satisfaction**: >80% positive feedback on reporting UX
- **False Positives**: <10% of legitimate reports rate-limited

## 🚀 Deployment Strategy

1. **Database Migration**: Add new collections
2. **Backend Deploy**: Rate limiter + pending reports
3. **Client Update**: Enhanced add-event-dialog
4. **Moderator Training**: Queue dashboard usage
5. **Monitoring**: Track spam rates and threshold accuracy
6. **Tuning**: Adjust thresholds based on data

---

**Status**: ✅ Ready for implementation
**Estimated Time**: 3-4 weeks
**Dependencies**: MongoDB 4.4+, GraphQL Yoga 5.x, Next.js 15.x
