# Smart Notifications - Implementation Summary

## ✅ Zaimplementowane Funkcjonalności

### 1. **Inteligentny System Powiadomień**
- **Admin/Moderator** → powiadomienia natychmiastowe (INSTANT)
- **User** → powiadomienia oparte na trust score (TRUST-BASED)
- **Deduplikacja** → użytkownicy nie dostaną duplikatów (cache 1h)

### 2. **Trust-Based Logic**
```typescript
// Agregowany trust score
aggregateScore = average([
  reporterScore,
  ...similarReportersScores
])

// Decyzja o wysłaniu
if (aggregateScore >= 1.2 || similarReports >= 2) {
  sendNotification()
}
```

### 3. **Deduplication System**
- Cache: `Map<"incidentId:userId", timestamp>`
- TTL: 1 godzina
- Auto-cleanup: co 10 minut

---

## 📁 Utworzone/Zmodyfikowane Pliki

### Nowe pliki:
1. **src/lib/notification-system.ts** (320 linii)
   - `processIncidentNotifications()` - główna logika
   - `getAggregateTrustScore()` - oblicza score z wielu źródeł
   - `shouldUserReceiveNotification()` - filtruje po preferencjach
   - `wasNotificationDelivered()` - sprawdza deduplikację

2. **docs/SMART_NOTIFICATIONS_SYSTEM.md** (dokumentacja)
3. **test-notifications.mjs** (test script)

### Zmodyfikowane:
1. **src/backend/resolvers/mutation.ts**
   - Import: `processIncidentNotifications`
   - W `createReport`: zastąpiono stare powiadomienia nowym systemem

2. **src/backend/resolvers/subscriptions.ts**
   - Nowy kanał: `USER_INCIDENT_NOTIFICATION`
   - Nowa subskrypcja: `smartIncidentNotifications`
   - Deduplikacja w subskrypcji

3. **src/backend/schema.graphql**
   - Dodano: `smartIncidentNotifications(userId: ID!): Incident!`

---

## 🚀 Jak to Działa

### Flow dla Admin/Moderator:

```
1. Admin tworzy incident
     ↓
2. processIncidentNotifications() wykrywa role = ADMIN
     ↓
3. Natychmiastowe publikowanie:
   - CHANNELS.INCIDENT_CREATED
   - CHANNELS.LINE_INCIDENT_UPDATES
   - CHANNELS.MY_LINES_INCIDENTS
     ↓
4. Status ustawiony na PUBLISHED
     ↓
5. WSZYSCY użytkownicy na affected lines dostają powiadomienie
```

### Flow dla User:

```
1. User tworzy incident
     ↓
2. processIncidentNotifications() wykrywa role = USER
     ↓
3. Obliczanie aggregate trust score:
   - Reporter trust score: 1.2
   - Similar reports (24h): 1
   - Similar reporters scores: [1.5]
   - Aggregate: (1.2 + 1.5) / 2 = 1.35
     ↓
4. Sprawdzanie thresholdów:
   - aggregateScore (1.35) >= 1.2? ✅ TAK
   - LUB similarReports (1) >= 2? ❌ NIE
   → WYNIK: WYSYŁAJ powiadomienie
     ↓
5. Dla każdego użytkownika:
   a. Sprawdź cache: czy już wysłano?
      - wasNotificationDelivered("incident123", "user456")
      - NIE → kontynuuj
   b. Sprawdź preferencje: czy user chce powiadomienie?
      - activeJourney zawiera affected line? TAK
      - LUB favoriteConnections zawiera affected line? TAK
      → WYSYŁAJ
   c. Zapisz w cache: markNotificationDelivered()
     ↓
6. Publikowanie do WebSocket:
   - CHANNELS.MY_LINES_INCIDENTS
     ↓
7. Użytkownicy otrzymują przez smartIncidentNotifications subscription
```

---

## 🔧 Konfiguracja

### Thresholdy (src/lib/notification-system.ts):

```typescript
// Trust score potrzebny do wysłania
const TRUST_SCORE_THRESHOLD = 1.2; 

// Minimalna liczba podobnych zgłoszeń
const MIN_SIMILAR_REPORTS = 2;

// Cache TTL (zapobiega duplikatom)
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h
```

### Dostosowanie:

**Więcej powiadomień** (mniej restrykcyjne):
```typescript
const TRUST_SCORE_THRESHOLD = 1.0;
const MIN_SIMILAR_REPORTS = 1;
```

**Mniej powiadomień** (bardziej restrykcyjne):
```typescript
const TRUST_SCORE_THRESHOLD = 1.5;
const MIN_SIMILAR_REPORTS = 3;
```

---

## 📡 GraphQL Subscription (Frontend)

### Zalecane: smartIncidentNotifications

```graphql
subscription SmartNotifications($userId: ID!) {
  smartIncidentNotifications(userId: $userId) {
    id
    title
    description
    kind
    reporter {
      name
      trustScore
      reputation
    }
    lines {
      id
      name
    }
    createdAt
  }
}
```

**Zalety**:
- ✅ Automatyczna deduplikacja
- ✅ Filtrowanie po active journey
- ✅ Filtrowanie po favorites
- ✅ Trust-based dla user reports
- ✅ Instant dla admin/moderator

---

## 🧪 Testowanie

### 1. Test Manual (GraphiQL)

```bash
# Terminal 1: Start server
npm run dev

# Browser: Open GraphiQL
http://localhost:3000/api/graphql
```

**Tab 1** (Subscription):
```graphql
subscription {
  smartIncidentNotifications(userId: "USER_ID") {
    id
    title
  }
}
```

**Tab 2** (Create Incident):
```graphql
mutation {
  createReport(input: {
    kind: TRAFFIC_JAM
    description: "Test"
    lineIds: ["LINE_ID"]
    reporterLocation: {
      latitude: 52.2297
      longitude: 21.0122
    }
  }) {
    id
  }
}
```

### 2. Test Script

```bash
node test-notifications.mjs
```

**Sprawdza**:
- Użytkowników (role, trust scores)
- Ostatnie incydenty
- Logikę notification dla każdego incydentu
- Users z active journeys/favorites
- Deduplikację cache
- Statystyki

---

## 📊 Przykładowe Scenariusze

### Scenariusz 1: Admin zgłasza awarię

```
Admin: "Metro Line 1 complete failure"
  ↓
Trust check: SKIP (admin = instant)
  ↓
Result: ✅ WSZYSCY użytkownicy Metro Line 1 dostają powiadomienie
```

### Scenariusz 2: User z wysoką reputacją (180 rep, 1.8 score)

```
User (rep 180): "Traffic jam on Bus 175"
  ↓
Aggregate score: 1.8 (tylko reporter)
Similar reports: 0
  ↓
Check: 1.8 >= 1.2? ✅ TAK
  ↓
Result: ✅ Powiadomienia wysłane
```

### Scenariusz 3: User z niską reputacją (70 rep, 0.7 score)

```
User 1 (rep 70): "Accident on Tram 4"
  ↓
Aggregate score: 0.7
Similar reports: 0
  ↓
Check: 0.7 >= 1.2? ❌ NIE
Check: 0 >= 2? ❌ NIE
  ↓
Result: ⏭️  BRAK powiadomienia

─────────────────────────────────

User 2 (rep 90): "Accident on Tram 4" [10 minut później]
  ↓
Aggregate score: (0.7 + 0.9) / 2 = 0.8
Similar reports: 2 (including User 1)
  ↓
Check: 0.8 >= 1.2? ❌ NIE
Check: 2 >= 2? ✅ TAK
  ↓
Result: ✅ Powiadomienia wysłane TERAZ
       (walidacja przez korelację zgłoszeń)
```

### Scenariusz 4: Deduplikacja działa

```
User dostaje powiadomienie o incident X
  ↓
Cache: "incident-x:user123" = timestamp
  ↓
10 minut później: incident X zaktualizowany
  ↓
Check cache: czy wysłano?
  - "incident-x:user123" exists? ✅ TAK
  - timestamp < 1h ago? ✅ TAK
  ↓
Result: ⏭️  SKIP (duplicate)
```

---

## 🔍 Monitoring

### Server Logs:

```bash
# Admin report
📢 INSTANT notification: Awaria sieci (by ADMIN)

# User report (trust-based)
🔍 Evaluating trust-based notification: Korek uliczny
   Trust score: 1.45
   Similar reports: 3
   ✅ Sending trust-based notifications
   📤 Sent: 12, Skipped (duplicates): 3

# User report (below threshold)
🔍 Evaluating trust-based notification: Wypadek
   Trust score: 0.85
   Similar reports: 0
   ⏭️  Skipping notification (below threshold)
```

### Stats API:

```typescript
import { getNotificationStats } from "@/lib/notification-system";

const stats = getNotificationStats();
// {
//   cacheSize: 145,
//   oldestEntry: "2025-10-04T10:15:30Z",
//   newestEntry: "2025-10-04T11:20:45Z"
// }
```

---

## ⚠️ Ważne Uwagi

1. **Cache jest in-memory** - restart serwera = reset cache
   - Możliwe duplikaty po restarcie (akceptowalne)
   - Dla produkcji: rozważ Redis

2. **Trust scores z crona** - wymaga `RUN_CRON=true`
   - Bez crona: fallback do reputation / 100
   - Rekomendacja: włącz cron dla best results

3. **Subscription wymaga WebSocket** - sprawdź connection
   - GraphiQL: automatycznie
   - Frontend: użyj `graphql-ws` library

4. **Similar reports** - okno 24h
   - Starsze niż 24h = ignorowane
   - Modyfikuj w `notification-system.ts` jeśli potrzeba

---

## 🎯 Co Dalej

1. ✅ **READY**: System działa out-of-the-box
2. **Test**: Uruchom test-notifications.mjs
3. **Dostosuj**: Thresholdy w notification-system.ts
4. **Monitor**: Sprawdzaj server logs podczas testów
5. **Frontend**: Zintegruj smartIncidentNotifications subscription

System jest **w pełni funkcjonalny** i gotowy do użycia! 🎉
