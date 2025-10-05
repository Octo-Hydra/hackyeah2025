# Threshold Algorithm Integration

## 🎯 Overview

System reputacji i powiadomień używa **funkcji z `threshold-algorithm.ts`** jako single source of truth dla wszystkich kalkulacji związanych z:

- Trust score calculation
- Reputation changes
- Notification decisions
- Threshold configurations

---

## 📊 Funkcje z threshold-algorithm.ts

### 1. **calculateReputationChange()**

Oblicza zmianę reputacji po resolution incydentu.

```typescript
import { calculateReputationChange } from "@/lib/threshold-algorithm";

const reputationChange = calculateReputationChange(
  wasCorrect, // true = correct report, false = fake
  userReputation, // Current user reputation
  notificationAge // Age in minutes
);

// Returns: number (e.g., +10, -5)
```

**Używane w**:

- `trust-score-calculator.ts` → `updateUserReputationAfterResolution()`
- Automatyczne po oznaczeniu incydentu jako RESOLVED/FAKE

**Logika**:

```typescript
// Base reward/penalty
wasCorrect ? +10 : -5

// Scale by reputation (diminishing returns)
reputationMultiplier = max(0.5, 1 - reputation/1000)

// Time bonus (early reporters get more)
timeBonus = notificationAge < 10min ? 1 + (10-age)/10 : 1

// False report penalty (high-rep users lose more)
falseReportPenalty = !wasCorrect && reputation > 50 ? 1.5 : 1

change = base * reputationMultiplier * timeBonus * falseReportPenalty
```

---

### 2. **shouldNotifyUser()**

Określa czy user powinien dostać powiadomienie o incydencie.

```typescript
import { shouldNotifyUser } from "@/lib/threshold-algorithm";

const decision = shouldNotifyUser(
  incidentLineIds,          // Lines affected by incident
  userActiveJourneyLineIds, // Lines in user's active journey
  userFavoriteLineIds,      // Lines in user's favorite connections
  incidentClass             // "CLASS_1" | "CLASS_2" (severity)
);

// Returns: NotificationDecision
{
  shouldNotify: boolean,
  reason: string,
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  affectedRoutes?: string[],
  message?: string
}
```

**Używane w**:

- `notification-system.ts` → `shouldUserReceiveNotification()`
- Decision making dla WebSocket notifications

**Priority Logic**:

```typescript
// CRITICAL - Active journey + CLASS_1 incident
{ shouldNotify: true, priority: "CRITICAL" }

// HIGH - Active journey + any incident OR favorite + CLASS_1
{ shouldNotify: true, priority: "HIGH" }

// MEDIUM - Favorite connection + CLASS_2
{ shouldNotify: true, priority: "MEDIUM" }

// LOW - Not affected
{ shouldNotify: false, priority: "LOW" }
```

---

### 3. **extractActiveJourneyLineIds()**

Wyciąga line IDs z active journey.

```typescript
import { extractActiveJourneyLineIds } from "@/lib/threshold-algorithm";

const activeJourney = {
  lineIds: [ObjectId("..."), "lineId2", null],
};

const lineIds = extractActiveJourneyLineIds(activeJourney);
// Returns: ["507f1f77bcf86cd799439011", "lineId2"]
```

**Używane w**:

- `notification-system.ts` → converting user.activeJourney to line IDs

---

### 4. **DEFAULT_THRESHOLD_CONFIG**

Globalna konfiguracja thresholds.

```typescript
import { DEFAULT_THRESHOLD_CONFIG } from "@/lib/threshold-algorithm";

console.log(DEFAULT_THRESHOLD_CONFIG);
// {
//   baseReportCount: 3,              // Min reports needed
//   baseReputationRequired: 100,     // Min total reputation
//   reputationWeight: 0.6,           // 60% weight on reputation
//   reportWeight: 0.4,               // 40% weight on report count
//   minReputationPerUser: 10,        // Min reputation to contribute
//   highReputationBonus: 0.25,       // 25% bonus for high-rep
//   highReputationThreshold: 100     // 100+ = high reputation
// }
```

**Używane w**:

- `trust-score-calculator.ts` → HIGH_REP_THRESHOLD, HIGH_REP_BONUS
- `notification-system.ts` → MIN_SIMILAR_REPORTS

---

## 🔄 Integration Flow

### Trust Score Calculation

```typescript
// src/lib/trust-score-calculator.ts

import { DEFAULT_THRESHOLD_CONFIG } from "./threshold-algorithm";

export async function calculateUserTrustScore(db: Db, userId: ObjectId) {
  // Use constants from threshold-algorithm.ts
  const HIGH_REP_THRESHOLD = DEFAULT_THRESHOLD_CONFIG.highReputationThreshold;
  const HIGH_REP_BONUS = DEFAULT_THRESHOLD_CONFIG.highReputationBonus;

  // Calculate bonus using shared constants
  if (reputation >= HIGH_REP_THRESHOLD) {
    const bonusMultiplier = Math.min((reputation - HIGH_REP_THRESHOLD) / 100, 1.0);
    highRepBonus = baseScore * HIGH_REP_BONUS * bonusMultiplier;
  }

  return { finalScore, ... };
}
```

### Reputation Update After Resolution

```typescript
// src/lib/trust-score-calculator.ts

import { calculateReputationChange } from "./threshold-algorithm";

export async function updateUserReputationAfterResolution(
  db: Db,
  userId: ObjectId,
  wasCorrect: boolean,
  incidentCreatedAt: string
) {
  const user = await db.collection("users").findOne({ _id: userId });
  const currentReputation = user.reputation || 100;

  // Calculate age in minutes
  const incidentDate = new Date(incidentCreatedAt);
  const notificationAge = (Date.now() - incidentDate.getTime()) / (1000 * 60);

  // Use threshold-algorithm.ts function
  const reputationChange = calculateReputationChange(
    wasCorrect,
    currentReputation,
    notificationAge
  );

  const newReputation = Math.max(0, currentReputation + reputationChange);

  // Update DB
  await db
    .collection("users")
    .updateOne({ _id: userId }, { $set: { reputation: newReputation } });

  return { newReputation, reputationChange };
}
```

### Notification Decision

```typescript
// src/lib/notification-system.ts

import {
  shouldNotifyUser,
  extractActiveJourneyLineIds,
  DEFAULT_THRESHOLD_CONFIG,
} from "./threshold-algorithm";

// Use shared constant
const MIN_SIMILAR_REPORTS = DEFAULT_THRESHOLD_CONFIG.baseReportCount;

async function shouldUserReceiveNotification(
  db: Db,
  userId: ObjectId,
  incident: IncidentModel
): Promise<boolean> {
  const user = await db.collection("users").findOne({ _id: userId });

  const incidentLineIds = (incident.lineIds || []).map((id) => id.toString());
  const activeJourneyLineIds = extractActiveJourneyLineIds(user.activeJourney);

  // Use threshold-algorithm.ts function
  const decision = shouldNotifyUser(
    incidentLineIds,
    activeJourneyLineIds.length > 0 ? activeJourneyLineIds : undefined,
    undefined, // No favorite line IDs yet
    undefined // No incident class yet
  );

  return decision.shouldNotify;
}
```

---

## 📝 Przykłady Użycia

### Przykład 1: Update Reputation After Incident Resolution

```graphql
mutation ResolveIncident {
  resolveIncident(id: "507f1f77bcf86cd799439011", isFake: false) {
    id
    status
  }
}
```

**Backend processing**:

```typescript
// In resolvers/mutation.ts
import { updateUserReputationAfterResolution } from "@/lib/trust-score-calculator";

// After marking incident as RESOLVED
const incident = await db.collection("Incidents").findOne({ _id: incidentId });

if (incident.reportedBy) {
  const result = await updateUserReputationAfterResolution(
    db,
    incident.reportedBy,
    !incident.isFake, // wasCorrect
    incident.createdAt
  );

  console.log(`Reputation change: ${result.reputationChange}`);
  console.log(`New reputation: ${result.newReputation}`);
}
```

### Przykład 2: Check Notification Decision

```typescript
import { shouldNotifyUser } from "@/lib/threshold-algorithm";

const incident = {
  lineIds: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
};

const user = {
  activeJourney: {
    lineIds: ["507f1f77bcf86cd799439011"], // Match!
  },
};

const decision = shouldNotifyUser(
  incident.lineIds,
  user.activeJourney.lineIds,
  undefined,
  "CLASS_1" // Critical incident
);

console.log(decision);
// {
//   shouldNotify: true,
//   reason: "Incident affects your active journey",
//   priority: "CRITICAL",
//   affectedRoutes: ["507f1f77bcf86cd799439011"],
//   message: "⚠️ CRITICAL: Your current journey is affected..."
// }
```

### Przykład 3: Calculate Trust Score with Shared Constants

```typescript
import { DEFAULT_THRESHOLD_CONFIG } from "@/lib/threshold-algorithm";
import { calculateUserTrustScore } from "@/lib/trust-score-calculator";

const user = await db.collection("users").findOne({ _id: userId });

// Check if user can report
if (user.reputation < DEFAULT_THRESHOLD_CONFIG.minReputationPerUser) {
  throw new Error("Insufficient reputation to report incidents");
}

// Calculate trust score
const trustScore = await calculateUserTrustScore(db, userId);

console.log(`Trust score: ${trustScore.finalScore}`);
console.log(
  `High rep threshold: ${DEFAULT_THRESHOLD_CONFIG.highReputationThreshold}`
);
```

---

## 🔧 Configuration

### Dostosowanie Thresholds

Edit `src/lib/threshold-algorithm.ts`:

```typescript
export const DEFAULT_THRESHOLD_CONFIG: ThresholdConfig = {
  baseReportCount: 3, // Change to 2 for easier notifications
  baseReputationRequired: 100, // Change to 50 for lower bar
  reputationWeight: 0.6, // Change to 0.7 for more reputation focus
  reportWeight: 0.4, // Change to 0.3 accordingly
  minReputationPerUser: 10, // Change to 5 for lower entry barrier
  highReputationBonus: 0.25, // Change to 0.3 for bigger bonus
  highReputationThreshold: 100, // Change to 150 for stricter high-rep
};
```

**Impact**:

- `trust-score-calculator.ts` automatycznie używa nowych wartości
- `notification-system.ts` automatycznie używa nowych wartości
- Brak potrzeby zmiany w innych plikach

---

## 🐛 Troubleshooting

### Problem: Trust score nie zmienia się po resolution

**Solution**: Check if `updateUserReputationAfterResolution` is called:

```typescript
// In mutation resolvers
await updateUserReputationAfterResolution(
  db,
  incident.reportedBy,
  !incident.isFake,
  incident.createdAt
);

// Then recalculate trust score (happens automatically in function)
```

### Problem: Notifications nie wysyłane mimo spełnienia thresholds

**Solution**: Check `shouldNotifyUser` decision:

```typescript
const decision = shouldNotifyUser(
  incidentLineIds,
  activeJourneyLineIds,
  favoriteLineIds,
  incidentClass
);

console.log("Decision:", decision);
// If shouldNotify = false, check decision.reason
```

### Problem: Reputation zmienia się niepoprawnie

**Solution**: Verify `calculateReputationChange` parameters:

```typescript
const reputationChange = calculateReputationChange(
  wasCorrect, // Must be boolean
  currentReputation, // Must be number
  notificationAge // Must be in MINUTES
);

// Check calculation
console.log(`Was correct: ${wasCorrect}`);
console.log(`Current rep: ${currentReputation}`);
console.log(`Age (min): ${notificationAge}`);
console.log(`Change: ${reputationChange}`);
```

---

## 📁 Zmodyfikowane Pliki

1. **src/lib/trust-score-calculator.ts**
   - Import: `calculateReputationChange`, `DEFAULT_THRESHOLD_CONFIG`
   - Updated: `calculateUserTrustScore()` uses shared constants
   - Added: `updateUserReputationAfterResolution()` function

2. **src/lib/notification-system.ts**
   - Import: `shouldNotifyUser`, `extractActiveJourneyLineIds`, `DEFAULT_THRESHOLD_CONFIG`
   - Updated: `MIN_SIMILAR_REPORTS` uses `DEFAULT_THRESHOLD_CONFIG.baseReportCount`
   - Updated: `shouldUserReceiveNotification()` uses `shouldNotifyUser()` from threshold-algorithm

---

## 🎯 Benefits

✅ **Single Source of Truth**: Wszystkie kalkulacje w jednym miejscu
✅ **Consistency**: Te same wartości w całym systemie
✅ **Easy Configuration**: Zmiana w jednym pliku wpływa na cały system
✅ **Type Safety**: TypeScript interfaces zapewniają spójność
✅ **Testability**: Łatwe testowanie z shared functions

---

## 🚀 Next Steps

1. ✅ **DONE**: Integration z `threshold-algorithm.ts`
2. **TODO**: Add more notification decision factors (weather, time of day)
3. **TODO**: Add incident class (CLASS_1, CLASS_2) to IncidentModel
4. **TODO**: Add `lineIds` to FavoriteConnection for better favorite notifications

System jest **w pełni zintegrowany** z `threshold-algorithm.ts`! 🎉
