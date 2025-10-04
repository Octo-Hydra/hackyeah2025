# 🏆 Reputation System - Implementation Summary

## Overview
Complete implementation of a trust-based reputation system for incident reporting. Users gain/lose reputation based on report accuracy, and high-reputation users have their reports weighted as more trustworthy.

---

## ✅ Implemented Features

### 1. **Starting Reputation** 
- **Default**: 100 points for new users
- **Location**: `src/lib/auth-utils.ts` (line 41)
- **Implementation**:
  ```typescript
  reputation: 100, // Starting reputation
  ```

### 2. **Reputation Floor**
- **Minimum**: 0 points (users can't go negative)
- **Location**: `src/backend/resolvers/mutation.ts` (line 156)
- **Implementation**:
  ```typescript
  const MIN_REPUTATION = 0;
  const newReputation = Math.max(MIN_REPUTATION, (user.reputation || 100) + FAKE_REPORT_PENALTY);
  ```

### 3. **Point Mechanics**
- **Fake report penalty**: -10 points
- **Validated report reward**: +5 points
- **Validation logic**: Report must have similar reports within 24h on same line

### 4. **Trust Scoring**
- **Formula**: `trustScore = reputation / 100`
- **Range**: 0.5 (minimum) to 2.0 (maximum)
- **Examples**:
  - 50 reputation → 0.5 trust score (less trusted)
  - 100 reputation → 1.0 trust score (neutral)
  - 200+ reputation → 2.0 trust score (highly trusted)
- **Location**: `src/backend/resolvers/mutation.ts` (lines 87-98)

### 5. **Fake Incident Filtering**
- **Query filter**: `isFake: { $ne: true }`
- **Location**: `src/backend/resolvers/query.ts` (line 22)
- **Result**: Users never see incidents marked as fake

---

## 📊 Reputation Flow

```
NEW USER
  └─> Start with 100 reputation

CREATES REPORT
  └─> trustScore calculated: reputation / 100
  └─> Report stored with trustScore field

ADMIN RESOLVES REPORT
  ├─> isFake = true
  │     └─> Reporter loses 10 points (min 0)
  │
  └─> isFake = false
        └─> Check for similar reports (24h window)
              ├─> Found similar reports
              │     └─> All reporters gain +5 points
              │
              └─> No similar reports
                    └─> No reputation change
```

---

## 🗄️ Database Schema Changes

### Users Collection
```typescript
interface UserModel {
  reputation: number; // Required, default 100
}
```

### Incidents Collection
```typescript
interface IncidentModel {
  isFake?: boolean; // Admin marks as fake
  reportedBy?: ObjectId; // Tracks reporter
  trustScore?: number; // Calculated 0.5-2.0
}
```

---

## 🔍 Trust Score Interpretation

| Reputation | Trust Score | Meaning |
|-----------|-------------|---------|
| 0-49      | 0.5         | New/unreliable user (low trust) |
| 50-99     | 0.5-0.99    | Below average (caution) |
| 100       | 1.0         | Neutral (default) |
| 101-199   | 1.01-1.99   | Above average (trusted) |
| 200+      | 2.0         | Highly trusted (verified reporter) |

---

## 🎯 Usage Examples

### Frontend Display (Recommended)
```typescript
// Show visual indicator based on trustScore
if (incident.trustScore >= 1.5) {
  return <Badge color="green">Verified Reporter</Badge>;
} else if (incident.trustScore >= 1.0) {
  return <Badge color="blue">Trusted</Badge>;
} else {
  return <Badge color="gray">New Reporter</Badge>;
}
```

### Sorting by Trust
```typescript
// Sort incidents by trust score (high to low)
incidents.sort((a, b) => (b.trustScore || 1.0) - (a.trustScore || 1.0));
```

### Auto-validation (Future Enhancement)
```typescript
// High-reputation users (200+) could auto-validate
if (user.reputation >= 200 && incident.trustScore === 2.0) {
  // Skip manual admin review
  incident.status = "VALIDATED";
}
```

---

## 🔐 Security Features

1. **Reputation floor**: Prevents negative values (protects from trolling)
2. **Fake filtering**: Public queries never return `isFake: true` incidents
3. **Role-based reporting**: USER role restricted to TRAFFIC_JAM/ACCIDENT only
4. **Location validation**: USER reports require GPS coordinates
5. **Admin-only resolution**: Only MODERATOR/ADMIN can mark reports as fake

---

## 📈 Gamification Benefits

1. **Encourages quality**: +5 points for verified reports
2. **Discourages spam**: -10 points for fake reports
3. **Visible trust**: trustScore shows reporter reliability
4. **Progressive rewards**: High reputation = more influence
5. **Community validation**: Multiple similar reports = validation

---

## 🛠️ Files Modified

1. **src/backend/db/collections.ts**
   - Changed `reputation?: number` → `reputation: number`
   - Added `trustScore?: number` to IncidentModel

2. **src/lib/auth-utils.ts**
   - Added `reputation: 100` to new user registration
   - Added `role: "USER"` field

3. **src/backend/resolvers/query.ts**
   - Added `isFake: { $ne: true }` filter to `incidentsByLine`

4. **src/backend/resolvers/mutation.ts**
   - Added `calculateTrustScore()` function
   - Updated `createReport` to calculate trustScore
   - Added reputation floor (MIN_REPUTATION = 0)
   - Updated `updateUserReputation` to prevent negative values

5. **src/backend/schema.graphql**
   - Added `trustScore: Float` field to Incident type

---

## 🧪 Testing

### Test Reputation Gain
```graphql
mutation {
  createReport(input: {
    kind: TRAFFIC_JAM
    description: "Heavy traffic on Main St"
    lineIds: ["line-id-here"]
    reporterLocation: { latitude: 52.0, longitude: 21.0 }
  }) {
    id
    trustScore # Should be 1.0 for new user (100 rep)
  }
}
```

### Test Fake Report Penalty
```graphql
mutation {
  resolveReport(reportId: "incident-id", isFake: true) {
    id
    isFake # Should be true
    # Check Users collection: reporter should have 90 reputation
  }
}
```

### Test Incident Filtering
```graphql
query {
  incidentsByLine(lineId: "line-id") {
    id
    isFake # Should never see "true" values
  }
}
```

---

## 🚀 Future Enhancements (Optional)

1. **Reputation tiers**: Bronze/Silver/Gold badges for UI
2. **Leaderboards**: Top reporters dashboard
3. **Auto-validation**: High-rep users skip manual review
4. **Weighted voting**: High-rep reports count more in threshold algorithm
5. **Decay system**: Inactive users lose reputation over time
6. **Report history**: Show user's past accuracy percentage
7. **Appeal system**: Users can dispute fake markings
8. **Reputation multipliers**: Event-based bonuses (e.g., first to report)

---

## ⚠️ Important Notes

- Reputation affects **trustScore only**, not access control
- Trust score is **calculated on report creation** (not dynamically)
- Fake incidents are **permanently hidden** from public queries
- Admin/moderator actions (marking fake) are **final** (no undo)
- Similar reports search is **24-hour window** on same line

---

## 📚 Related Documentation

- `/docs/GEOLOCATION_INCIDENT_DETECTION.md` - Location-based reporting
- `/docs/USER_NOTIFICATIONS_SYSTEM.md` - Notification threshold algorithm
- `/docs/GRAPHQL_CLIENT.md` - Client usage examples
