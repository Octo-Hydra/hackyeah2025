# Dynamic Trust Score System

## Overview

Trust scores are **dynamically calculated** for users based on their reputation, report accuracy, and validation rate. The system uses a cron job that runs every 5 seconds (when enabled) to update all active users' trust scores.

## Architecture

### Components

1. **Trust Score Calculator** (`src/lib/trust-score-calculator.ts`)
   - Calculates trust scores based on multiple factors
   - Uses threshold algorithm concepts from `src/lib/threshold-algorithm.ts`
   - Stores results in User model

2. **Cron Job** (`src/backend/cron/trust-score-cron.ts`)
   - Runs every 5 seconds when `RUN_CRON=true`
   - Updates trust scores for all users who have reported incidents
   - Logs update statistics

3. **GraphQL Resolvers** (`src/backend/resolvers/incidentResolvers.ts`)
   - Dynamically resolves `reporter` field on Incident type
   - Fetches user with current trust score from database
   - No static calculation at report time

## Trust Score Calculation

### Formula

```typescript
finalScore = baseScore + accuracyBonus + highRepBonus - fakePenalty

Where:
- baseScore: reputation / 100 (clamped 0.5-2.0)
- accuracyBonus: validationRate * 0.3 (up to +0.3)
- highRepBonus: baseScore * 0.25 (for reputation >= 100)
- fakePenalty: fakeReports * 0.1 (-0.1 per fake)
```

### Score Range

- **Minimum**: 0.5 (low reputation user with fake reports)
- **Default**: 1.0 (new user with 100 reputation)
- **Maximum**: 2.5 (high reputation user with perfect accuracy)

### Breakdown Components

```typescript
interface TrustScoreBreakdown {
  baseScore: number;        // From reputation
  accuracyBonus: number;    // From validation rate
  highRepBonus: number;     // For high reputation users
  finalScore: number;       // Combined score
  recentReports: number;    // Reports in last 30 days
  validatedReports: number; // Validated reports
  fakeReports: number;      // Fake reports
  validationRate: number;   // Percentage validated
}
```

## Configuration

### Environment Variables

```bash
# Enable cron job
RUN_CRON=true
```

### Cron Settings

- **Interval**: 5 seconds
- **Triggered by**: `RUN_CRON=true` in `.env`
- **Target**: Users who have `reportedBy` entries in Incidents

## Database Schema

### User Model Updates

```typescript
interface UserModel {
  // ... existing fields
  trustScore?: number;
  trustScoreBreakdown?: {
    baseScore: number;
    accuracyBonus: number;
    highRepBonus: number;
    validationRate: number;
    updatedAt: string;
  };
}
```

### Incident Model

```typescript
interface IncidentModel {
  // ... existing fields
  reportedBy?: ObjectId | string | null;
  // Note: trustScore removed - now calculated dynamically
}
```

## GraphQL Schema

### User Type

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  role: UserRole!
  reputation: Int
  trustScore: Float # Updated by cron every 5s
  trustScoreBreakdown: TrustScoreBreakdown
}

type TrustScoreBreakdown {
  baseScore: Float!
  accuracyBonus: Float!
  highRepBonus: Float!
  validationRate: Float!
  updatedAt: String!
}
```

### Incident Type

```graphql
type Incident {
  id: ID!
  # ... other fields
  reportedBy: ID
  reporter: User # Resolves user with dynamic trustScore
}
```

## Usage Examples

### Query Incident with Reporter Trust Score

```graphql
query GetIncidents {
  incidentsByLine(lineId: "123") {
    id
    title
    reporter {
      name
      reputation
      trustScore
      trustScoreBreakdown {
        baseScore
        accuracyBonus
        highRepBonus
        validationRate
        updatedAt
      }
    }
  }
}
```

### Manual Trust Score Calculation

```typescript
import { calculateUserTrustScore } from "@/lib/trust-score-calculator";
import clientPromise from "@/lib/mongodb";

const client = await clientPromise;
const db = client.db();

const breakdown = await calculateUserTrustScore(db, userId);
console.log(`Trust score: ${breakdown.finalScore}`);
console.log(`Validation rate: ${breakdown.validationRate * 100}%`);
```

## Monitoring

### Cron Job Logs

```bash
# When starting server
🚀 Starting trust score cron job (runs every 5 seconds)

# On each update
✅ Trust scores updated: 15 users (234ms)

# If disabled
⏭️  Trust score cron disabled (RUN_CRON not set)

# On errors
❌ Error updating trust scores: <error details>
```

### Performance

- **Typical update time**: 100-500ms for 50 users
- **Database queries**: 2 per user (incidents + user update)
- **Skips running**: If previous update still in progress

## Integration with Threshold Algorithm

The trust score system uses concepts from `threshold-algorithm.ts`:

1. **High Reputation Bonus** (`highReputationBonus`)
   - Threshold: 100 reputation (same as `highReputationThreshold`)
   - Bonus: 25% (same as `highReputationBonus`)

2. **Minimum Reputation** (`minReputationPerUser`)
   - Not enforced in trust score (users can have < 10 reputation)
   - But affects whether users can report incidents

3. **Validation Rate**
   - Similar to `calculateThreshold` accuracy checks
   - Rewards users whose reports are confirmed by others

## Troubleshooting

### Cron Not Running

1. Check environment variable:
   ```bash
   echo $RUN_CRON
   ```

2. Check server logs for startup message:
   ```
   🚀 Starting trust score cron job
   ```

3. Verify in code:
   ```typescript
   // src/backend/cron/trust-score-cron.ts
   if (!process.env.RUN_CRON || process.env.RUN_CRON !== "true") {
     console.log("⏭️  Trust score cron disabled");
   }
   ```

### Trust Score Not Updating

1. Check if user has reported incidents:
   ```javascript
   db.Incidents.find({ reportedBy: ObjectId("user-id") })
   ```

2. Verify cron is updating database:
   ```javascript
   db.Users.find({ trustScore: { $exists: true } })
   ```

3. Check for errors in logs:
   ```
   ❌ Error updating trust scores: ...
   ```

### Performance Issues

1. **Reduce cron frequency**: Change from 5s to 10s or 30s
2. **Add indexes**:
   ```javascript
   db.Incidents.createIndex({ reportedBy: 1, createdAt: -1 })
   db.Users.createIndex({ _id: 1, reputation: 1 })
   ```

3. **Batch updates**: Modify cron to update only changed users

## Future Enhancements

1. **Configurable interval**: Move 5s to environment variable
2. **Selective updates**: Only update users with new reports
3. **Cache layer**: Redis cache for frequently accessed trust scores
4. **Historical tracking**: Store trust score changes over time
5. **Real-time updates**: WebSocket push when trust score changes
