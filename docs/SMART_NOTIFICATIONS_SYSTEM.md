# Intelligent Notification System - Implementation Guide

## 🎯 Overview

Smart notification system that sends real-time WebSocket notifications based on:
- **Reporter role** (admin/moderator = instant, user = trust-based)
- **Trust score thresholds** (aggregate score from multiple reports)
- **Deduplication** (prevents spam, no duplicate notifications)
- **User preferences** (active journey, favorite lines)

---

## 📊 Notification Flow

### 1. **Admin/Moderator Reports → INSTANT**
```
Admin creates incident
  ↓
Immediately published as OFFICIAL
  ↓
WebSocket notification sent to ALL affected users
  ↓
No trust score check needed
```

### 2. **User Reports → TRUST-BASED**
```
User creates incident
  ↓
Calculate aggregate trust score
  ├─ Reporter's trust score (from cron)
  ├─ Similar reports in last 24h
  └─ Trust scores of similar reporters
  ↓
Aggregate score ≥ 1.2 OR ≥2 similar reports?
  ├─ YES → Send notifications
  └─ NO  → Skip (below threshold)
  ↓
Check deduplication cache
  ├─ Already sent? → Skip
  └─ Not sent? → Send + mark as delivered
```

---

## 🔧 Configuration

### Trust Score Thresholds

**File**: `src/lib/notification-system.ts`

```typescript
// Minimum aggregate trust score to trigger notifications
const TRUST_SCORE_THRESHOLD = 1.2; // Above-average reputation

// Minimum similar reports to bypass trust score check
const MIN_SIMILAR_REPORTS = 2; // At least 2 users reporting
```

### Deduplication Cache

```typescript
// Cache TTL (prevents re-sending within 1 hour)
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Automatic cleanup every 10 minutes
setInterval(cleanDeliveryCache, 10 * 60 * 1000);
```

---

## 📡 GraphQL Subscriptions

### 1. Smart Incident Notifications (Recommended)

**Best for**: Personalized, deduplicated notifications

```graphql
subscription SmartNotifications($userId: ID!) {
  smartIncidentNotifications(userId: $userId) {
    id
    title
    description
    kind
    status
    reporter {
      name
      trustScore
      reputation
    }
    lines {
      id
      name
      transportType
    }
    createdAt
  }
}
```

**Features**:
- ✅ Automatic deduplication (no duplicates)
- ✅ Filters by user's active journey
- ✅ Filters by user's favorite lines
- ✅ Trust-based for user reports
- ✅ Instant for admin/moderator reports

### 2. My Lines Incidents (Legacy)

**Best for**: Specific line monitoring

```graphql
subscription MyLinesIncidents($lineIds: [ID!]!) {
  myLinesIncidents(lineIds: $lineIds) {
    id
    title
    kind
    lines {
      id
      name
    }
  }
}
```

**Features**:
- ✅ Subscribe to multiple lines at once
- ❌ No deduplication (may receive duplicates)
- ❌ No trust-based filtering

### 3. Line-Specific Updates

**Best for**: Single line monitoring

```graphql
subscription LineIncidents($lineId: ID!) {
  lineIncidentUpdates(lineId: $lineId) {
    id
    title
    kind
    status
  }
}
```

---

## 🧪 Testing

### Test Script

```bash
node test-notifications.mjs
```

### Manual Testing with GraphiQL

1. **Start server**:
   ```bash
   npm run dev
   ```

2. **Open GraphiQL**: `http://localhost:3000/api/graphql`

3. **Subscribe** (WebSocket):
   ```graphql
   subscription {
     smartIncidentNotifications(userId: "USER_ID_HERE") {
       id
       title
       reporter {
         name
         trustScore
       }
     }
   }
   ```

4. **Create incident** (separate tab):
   ```graphql
   mutation {
     createReport(input: {
       kind: TRAFFIC_JAM
       description: "Test incident"
       lineIds: ["LINE_ID"]
       reporterLocation: {
         latitude: 52.2297
         longitude: 21.0122
       }
     }) {
       id
       title
     }
   }
   ```

5. **Verify notification** received in subscription tab

---

## 📊 Notification Logic

### Aggregate Trust Score Calculation

```typescript
// 1. Get reporter's trust score
const reporterScore = reporter.trustScore || 1.0;

// 2. Find similar reports (last 24h, same kind, same line)
const similarReports = await db.Incidents.find({
  kind: incident.kind,
  lineIds: { $in: incident.lineIds },
  createdAt: { $gte: oneDayAgo },
});

// 3. Get trust scores of similar reporters
const similarScores = await db.Users.find({
  _id: { $in: similarReports.map(r => r.reportedBy) }
}).map(u => u.trustScore);

// 4. Calculate average
const aggregateScore = average([reporterScore, ...similarScores]);
```

### Should Notify Decision Tree

```
Admin/Moderator?
├─ YES → ✅ NOTIFY (instant)
└─ NO  → Check trust score
           ├─ Aggregate ≥ 1.2? → ✅ NOTIFY
           ├─ Similar ≥ 2?     → ✅ NOTIFY
           └─ Else             → ⏭️  SKIP
```

### Deduplication Check

```typescript
// Cache key format
const cacheKey = `${incidentId}:${userId}`;

// Check if delivered
if (deliveryCache.has(cacheKey)) {
  const timestamp = deliveryCache.get(cacheKey);
  if (Date.now() - timestamp < CACHE_TTL_MS) {
    return false; // Already delivered, skip
  }
}

// Mark as delivered
deliveryCache.set(cacheKey, Date.now());
```

---

## 🔍 Monitoring

### Notification Stats API

```typescript
import { getNotificationStats } from "@/lib/notification-system";

const stats = getNotificationStats();
console.log(stats);
// {
//   cacheSize: 145,
//   oldestEntry: "2025-10-04T10:15:30.000Z",
//   newestEntry: "2025-10-04T11:20:45.000Z"
// }
```

### Server Logs

```bash
# Admin/Moderator creates incident
📢 INSTANT notification: Awaria sieci (by ADMIN)

# User creates incident (trust score check)
🔍 Evaluating trust-based notification: Korek uliczny
   Trust score: 1.45
   Similar reports: 3
   ✅ Sending trust-based notifications
   📤 Sent: 12, Skipped (duplicates): 3

# User creates incident (below threshold)
🔍 Evaluating trust-based notification: Wypadek
   Trust score: 0.85
   Similar reports: 0
   ⏭️  Skipping notification (below threshold)
```

---

## 📝 Example Scenarios

### Scenario 1: Admin Reports Network Failure

```typescript
// Admin creates incident
mutation {
  createReport(input: {
    kind: NETWORK_FAILURE
    description: "Metro line 1 completely down"
    lineIds: ["metro-1-id"]
  })
}

// Result:
📢 INSTANT notification: Awaria sieci (by ADMIN)
→ All users on Metro Line 1 notified immediately
→ No trust score check needed
```

### Scenario 2: High-Reputation User Reports Traffic Jam

```typescript
// User (reputation 180, trustScore 1.8) creates incident
mutation {
  createReport(input: {
    kind: TRAFFIC_JAM
    description: "Massive traffic on route 175"
    lineIds: ["bus-175-id"]
    reporterLocation: { latitude: 52.2297, longitude: 21.0122 }
  })
}

// Result:
🔍 Evaluating trust-based notification: Korek uliczny
   Trust score: 1.80 (reporter alone)
   Similar reports: 0
   ✅ Sending trust-based notifications (score > 1.2)
→ Users on Bus 175 notified
```

### Scenario 3: Low-Reputation User, Multiple Reports

```typescript
// User 1 (reputation 70, trustScore 0.7) creates incident
mutation {
  createReport(input: {
    kind: ACCIDENT
    description: "Accident on tram line"
    lineIds: ["tram-4-id"]
    reporterLocation: { latitude: 52.2297, longitude: 21.0122 }
  })
}

// Result:
🔍 Evaluating trust-based notification: Wypadek
   Trust score: 0.70
   Similar reports: 0
   ⏭️  Skipping notification (below threshold)
→ No notification sent

// User 2 (reputation 90, trustScore 0.9) creates SAME incident
mutation {
  createReport(input: {
    kind: ACCIDENT
    description: "Accident on tram line 4"
    lineIds: ["tram-4-id"]
    reporterLocation: { latitude: 52.2298, longitude: 21.0123 }
  })
}

// Result:
🔍 Evaluating trust-based notification: Wypadek
   Trust score: 0.80 (average of 0.7 and 0.9)
   Similar reports: 2 (including first report)
   ✅ Sending trust-based notifications (similar ≥ 2)
→ Users on Tram 4 notified NOW
→ Both incidents validated by correlation
```

### Scenario 4: Duplicate Prevention

```typescript
// User receives notification for incident X
smartIncidentNotifications(userId: "user123") {
  id: "incident-x"
  title: "Korek uliczny"
}

// Same incident published again (e.g., admin resolves then updates)
// Result: ⏭️  Skipped (already delivered to user123)
```

---

## 🚀 Frontend Integration

### React Hook Example

```typescript
import { useSubscription } from '@apollo/client';
import { gql } from '@apollo/client';

const SMART_NOTIFICATIONS = gql`
  subscription SmartNotifications($userId: ID!) {
    smartIncidentNotifications(userId: $userId) {
      id
      title
      description
      kind
      reporter {
        name
        trustScore
      }
      lines {
        id
        name
        transportType
      }
      createdAt
    }
  }
`;

function useIncidentNotifications(userId: string) {
  const { data, loading, error } = useSubscription(SMART_NOTIFICATIONS, {
    variables: { userId },
  });

  // Show notification when data changes
  useEffect(() => {
    if (data?.smartIncidentNotifications) {
      const incident = data.smartIncidentNotifications;
      
      // Show push notification or toast
      showNotification({
        title: incident.title,
        body: incident.description,
        badge: incident.reporter.trustScore >= 1.5 ? '✅ Verified' : 'ℹ️',
      });
    }
  }, [data]);

  return { incident: data?.smartIncidentNotifications, loading, error };
}
```

---

## ⚙️ Configuration Options

### Adjust Trust Score Threshold

Edit `src/lib/notification-system.ts`:

```typescript
// More strict (fewer notifications)
const TRUST_SCORE_THRESHOLD = 1.5;

// More lenient (more notifications)
const TRUST_SCORE_THRESHOLD = 1.0;
```

### Adjust Similar Reports Threshold

```typescript
// Require more confirmation
const MIN_SIMILAR_REPORTS = 3;

// Allow faster notifications
const MIN_SIMILAR_REPORTS = 1;
```

### Adjust Cache TTL

```typescript
// Shorter (30 minutes)
const CACHE_TTL_MS = 30 * 60 * 1000;

// Longer (2 hours)
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;
```

---

## 🐛 Troubleshooting

### Notifications Not Received

1. **Check WebSocket connection**:
   ```javascript
   // Browser console
   // Should show: WebSocket connection established
   ```

2. **Verify user has active journey or favorites**:
   ```graphql
   query {
     me {
       activeJourney {
         lineIds
       }
       favoriteConnections {
         id
       }
     }
   }
   ```

3. **Check server logs** for trust score evaluation

### Duplicate Notifications

1. Check cache size:
   ```typescript
   const stats = getNotificationStats();
   console.log('Cache size:', stats.cacheSize);
   ```

2. Verify deduplication key format is correct

3. Check if multiple subscriptions are active

### Trust Score Too Strict

1. Lower threshold in `notification-system.ts`
2. Check reporter's trust score with test script
3. Verify cron job is updating trust scores

---

## 📁 Files Modified

1. **src/lib/notification-system.ts** - Core notification logic (NEW)
2. **src/backend/resolvers/mutation.ts** - Integrated with createReport
3. **src/backend/resolvers/subscriptions.ts** - Added smartIncidentNotifications
4. **src/backend/schema.graphql** - Added subscription type

---

## 🎯 Next Steps

1. **Test with real data** - Create incidents and verify notifications
2. **Monitor cache size** - Ensure deduplication works
3. **Tune thresholds** - Adjust based on user feedback
4. **Add UI indicators** - Show trust score badges in notifications
5. **Analytics** - Track notification delivery rates
