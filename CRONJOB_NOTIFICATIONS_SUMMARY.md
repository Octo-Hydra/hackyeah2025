# System Powiadomień i CronJob - Podsumowanie

## ✅ **KOMPLETNE** - Zmiany Zaimplementowane

### 1. **CronJob Library Migration**

#### Przed (setInterval):
```typescript
let cronInterval: NodeJS.Timeout | null = null;

cronInterval = setInterval(async () => {
  await runTrustScoreUpdate();
}, 5000);
```

#### Po (CronJob library):
```typescript
import { CronJob } from 'cron';

trustScoreCronJob = new CronJob(
  '*/5 * * * * *', // Cron pattern - co 5 sekund
  runTrustScoreUpdate,
  null,
  true, // Start automatically
  'Europe/Warsaw' // Timezone
);
```

#### Zalety Nowego Rozwiązania:
- ✅ **Standardowe cron patterns** zamiast milisekund
- ✅ **Timezone support** - Europa/Warszawa
- ✅ **Lepsze zarządzanie** - `start()`, `stop()`, `nextDate()`, `lastDate()`
- ✅ **Status API** - `getTrustScoreCronStatus()`
- ✅ **Production-ready** - łatwa zmiana na `"0 */6 * * *"` (co 6 godzin)

---

### 2. **System Powiadomień - ISTNIEJĄCY**

#### ✅ Twój kod już ma zaawansowany system powiadomień!

**Lokalizacja:** `src/lib/notification-system.ts`

#### Kluczowe Funkcje:

##### A. **Threshold-based Notifications**
```typescript
const TRUST_SCORE_THRESHOLD = 1.2; // Wymagany trust score
const MIN_SIMILAR_REPORTS = 3; // Min. liczba podobnych raportów
```

##### B. **Agregowany Trust Score**
```typescript
async function getAggregateTrustScore(
  db: Db,
  incident: IncidentModel
): Promise<number> {
  // 1. Pobierz trust score reportera
  const reporterTrustScore = reporter?.trustScore || 1.0;
  
  // 2. Znajdź podobne raporty (24h, ta sama linia, ten sam rodzaj)
  const similarReports = await db
    .collection<IncidentModel>("Incidents")
    .find({
      kind: incident.kind,
      status: "PUBLISHED",
      lineIds: { $in: incident.lineIds || [] },
      createdAt: { $gte: oneDayAgo.toISOString() },
    })
    .toArray();
  
  // 3. Oblicz średni trust score ze wszystkich raportów
  const averageTrustScore = 
    allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
  
  return averageTrustScore;
}
```

##### C. **Intelligent Notification Processing**
```typescript
export async function processIncidentNotifications(
  db: Db,
  incident: IncidentModel,
  reporterRole: "USER" | "MODERATOR" | "ADMIN"
): Promise<void> {
  
  // 1. INSTANT dla ADMIN/MODERATOR
  if (reporterRole === "ADMIN" || reporterRole === "MODERATOR") {
    pubsub.publish(CHANNELS.INCIDENT_CREATED, incident);
    // Natychmiastowe powiadomienie!
  }
  
  // 2. TRUST-BASED dla USER
  else {
    const aggregateTrustScore = await getAggregateTrustScore(db, incident);
    const similarCount = await countSimilarReports(db, incident);
    
    // Walidacja wiarygodności
    if (
      aggregateTrustScore >= TRUST_SCORE_THRESHOLD &&
      similarCount >= MIN_SIMILAR_REPORTS
    ) {
      // Incydent jest WIARYGODNY - wyślij powiadomienia!
      await notifyAffectedUsers(db, incident);
    }
  }
}
```

##### D. **Deduplication (Anti-spam)**
```typescript
// Cache zapobiega duplikatom
const deliveryCache = new Map<string, number>();

function wasNotificationDelivered(incidentId: string, userId: string): boolean {
  const cacheKey = `${incidentId}:${userId}`;
  const deliveredAt = deliveryCache.get(cacheKey);
  
  // TTL = 1 godzina
  if (now - deliveredAt > CACHE_TTL_MS) {
    return false; // Wygasło - można wysłać ponownie
  }
  
  return true; // Już wysłano - pomiń
}
```

##### E. **Smart User Filtering**
```typescript
async function shouldUserReceiveNotification(
  db: Db,
  userId: ObjectId | string,
  incident: IncidentModel
): Promise<boolean> {
  const user = await db.collection<UserModel>("Users").findOne({ _id: userId });
  
  // Sprawdź czy incydent dotyczy:
  // - Aktywnej podróży użytkownika
  // - Zapisanych ulubionych tras
  
  const decision = shouldNotifyUser(
    incidentLineIds,
    activeJourneyLineIds,
    favoriteLineIds
  );
  
  return decision.shouldNotify;
}
```

---

### 3. **Jak Działa System Powiadomień**

#### Scenariusz 1: Admin/Moderator zgłasza incydent
```
1. createReport({ kind: "ACCIDENT", ... })
   ↓
2. reporterRole = "ADMIN"
   ↓
3. ✅ INSTANT notification
   ↓
4. pubsub.publish() → wszyscy użytkownicy na danej linii
```

#### Scenariusz 2: User zgłasza incydent (wymaga walidacji)
```
1. createReport({ kind: "TRAFFIC_JAM", ... })
   ↓
2. reporterRole = "USER"
   ↓
3. Oblicz aggregateTrustScore:
   - Reporter: trustScore = 1.5
   - Similar reports (last 24h): [1.3, 1.4, 1.6]
   - Aggregate = (1.5 + 1.3 + 1.4 + 1.6) / 4 = 1.45
   ↓
4. Walidacja:
   - aggregateTrustScore (1.45) >= THRESHOLD (1.2) ✅
   - similarCount (3) >= MIN_SIMILAR_REPORTS (3) ✅
   ↓
5. ✅ Incydent WIARYGODNY
   ↓
6. Wyślij powiadomienia do użytkowników na tej linii
```

#### Scenariusz 3: User zgłasza incydent (zbyt mało raportów)
```
1. createReport({ kind: "PLATFORM_CHANGES", ... })
   ↓
2. reporterRole = "USER"
   ↓
3. Oblicz aggregateTrustScore:
   - Reporter: trustScore = 1.8 (wysoki!)
   - Similar reports: [] (brak podobnych)
   ↓
4. Walidacja:
   - aggregateTrustScore (1.8) >= THRESHOLD (1.2) ✅
   - similarCount (0) >= MIN_SIMILAR_REPORTS (3) ❌
   ↓
5. ❌ Incydent NIE wiarygodny (czeka na więcej raportów)
   ↓
6. Powiadomienia NIE wysłane (zbyt mało potwierdzających raportów)
```

---

### 4. **Pliki Systemu**

#### Notification System:
- `src/lib/notification-system.ts` - główna logika
- `src/lib/threshold-algorithm.ts` - algorytmy threshold
- `src/backend/resolvers/mutation.ts` - wywołanie `processIncidentNotifications()`
- `src/backend/resolvers/subscriptions.ts` - GraphQL subscriptions

#### Cron Job:
- `src/backend/cron/trust-score-cron.ts` - **ZMIENIONY** (CronJob library)
- `src/lib/trust-score-calculator.ts` - kalkulacja trust score

---

### 5. **Konfiguracja i Parametry**

#### Threshold Notification System:
```typescript
// src/lib/notification-system.ts
const TRUST_SCORE_THRESHOLD = 1.2; // Min trust score dla notyfikacji
const MIN_SIMILAR_REPORTS = 3; // Min podobnych raportów
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h cache
```

#### CronJob Schedule:
```typescript
// src/backend/cron/trust-score-cron.ts
'*/5 * * * * *' // Obecnie: co 5 sekund (testing)

// Produkcja (zmień na):
'0 */6 * * *' // Co 6 godzin
'0 0 * * *'   // Codziennie o północy
'0 */1 * * *' // Co godzinę
```

---

### 6. **API CronJob**

#### Status Query:
```typescript
import { getTrustScoreCronStatus } from '@/backend/cron/trust-score-cron';

const status = getTrustScoreCronStatus();
// {
//   isRunning: true,
//   isExecuting: false,
//   nextRun: "2025-10-05T14:30:05.000+02:00",
//   lastRun: "2025-10-05T14:30:00.000+02:00"
// }
```

#### Manual Control:
```typescript
import { startTrustScoreCron, stopTrustScoreCron } from '@/backend/cron/trust-score-cron';

// Uruchom
await startTrustScoreCron();

// Zatrzymaj
stopTrustScoreCron();
```

---

### 7. **Testing**

#### Test Notification System:
```bash
# 1. Stwórz użytkownika z wysokim trust score (>1.2)
# 2. Zgłoś incydent jako ten użytkownik
# 3. Zgłoś podobne incydenty (min 3)
# 4. System automatycznie wyśle powiadomienia!
```

#### Test CronJob:
```bash
# Ustaw zmienną środowiskową
RUN_CRON=true npm run dev

# Logi:
# 🚀 Starting trust score cron job
# ⏰ Next run: 2025-10-05T14:30:05.000+02:00
# ✅ Trust scores updated: 15 users (125ms)
# ⏰ Next run: 2025-10-05T14:30:10.000+02:00
```

---

### 8. **Graficzna Prezentacja Systemu**

```
┌─────────────────────────────────────────────────────────────┐
│         NOTIFICATION SYSTEM - FLOW DIAGRAM                  │
└─────────────────────────────────────────────────────────────┘

User Reports Incident
         │
         ├─→ Role = ADMIN/MODERATOR? ──YES─→ ✅ INSTANT Notification
         │                                      │
         └─→ Role = USER?                       │
                 │                               │
                 ↓                               │
         Calculate Aggregate Trust Score        │
         (Reporter + Similar Reports)           │
                 │                               │
                 ↓                               │
         Trust Score >= 1.2? ──NO──→ ❌ Wait    │
                 │                               │
                 YES                             │
                 ↓                               │
         Similar Reports >= 3? ──NO─→ ❌ Wait   │
                 │                               │
                 YES                             │
                 ↓                               │
         ✅ TRUST-BASED Notification ◄──────────┘
                 │
                 ↓
         Filter Users:
         - Active journey?
         - Favorite lines?
                 │
                 ↓
         Check Deduplication Cache
                 │
                 ↓
         Send via GraphQL Subscription
```

---

### 9. **Podsumowanie**

✅ **CronJob:** Zmieniony z `setInterval` na bibliotekę `cron`
✅ **Notification System:** Już zaimplementowany i działający!
✅ **Trust Score Validation:** Agregowany z podobnych raportów
✅ **Deduplication:** Cache zapobiega duplikatom
✅ **Smart Filtering:** Tylko relevantni użytkownicy dostają notyfikacje
✅ **Role-based:** ADMIN/MODERATOR = instant, USER = trust-based

---

### 10. **Next Steps (Opcjonalne)**

- [ ] Dodaj dashboard do monitorowania cron jobs
- [ ] Stwórz admin endpoint do ręcznej kontroli notyfikacji
- [ ] Dodaj metryki (ile notyfikacji wysłano, delay avg, etc.)
- [ ] Email/push notifications (obecnie tylko GraphQL subscriptions)
- [ ] A/B testing różnych thresholds
