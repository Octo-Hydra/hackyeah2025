# System Analityki i Powiadomień - Kompletne Podsumowanie

## ✅ **GOTOWE - Wszystko Działa!**

---

## 📊 **1. System Analityki (Nowy - Właśnie Zaimplementowany)**

### GraphQL Queries dla Adminów:
```graphql
admin {
  # Statystyki incydentów dla linii
  lineIncidentStats(lineId: ID!, period: LAST_31D) {
    totalIncidents
    incidentsByKind { kind count }
    averageDelayMinutes
    timeline { timestamp incidentCount }
  }
  
  # Statystyki opóźnień
  lineDelayStats(lineId: ID!, period: LAST_7D) {
    totalDelays
    averageDelayMinutes
    delayDistribution { rangeLabel count }
  }
  
  # Top opóźnionych linii (ranking)
  topDelays(transportType: BUS, period: LAST_31D, limit: 10) {
    rank
    lineName
    totalDelays
    averageDelayMinutes
  }
  
  # Przegląd wszystkich linii
  linesIncidentOverview(period: LAST_24H) {
    lineName
    incidentCount
    lastIncidentTime
  }
}
```

### Pliki:
- ✅ `src/backend/resolvers/adminAnalytics.ts` (330 linii) - **NOWY**
- ✅ `src/backend/schema.graphql` - rozszerzone o analytics
- ✅ `scripts/populate-incidents.ts` (300+ linii) - generator danych testowych
- ✅ `ANALYTICS_QUERIES.graphql` - przykłady queries
- ✅ `ANALYTICS_IMPLEMENTATION.md` - dokumentacja

### Użycie:
```bash
npm run populate:incidents  # Generuj dane testowe
npm run dev                  # Uruchom serwer
# Otwórz GraphiQL i testuj!
```

---

## 🔔 **2. System Powiadomień o Wiarygodnych Incydentach (Istniejący)**

### ✅ **TAK - System Powiadomień JUŻ ISTNIEJE!**

Znajduje się w: `src/lib/notification-system.ts` (354 linie)

### Jak działa:

#### **A) Natychmiastowe powiadomienia** (ADMIN/MODERATOR):
```typescript
if (reporterRole === "ADMIN" || reporterRole === "MODERATOR") {
  // ✅ Natychmiast - 100% wiarygodne
  pubsub.publish(INCIDENT_CREATED, incident);
}
```

#### **B) Trust-based powiadomienia** (USER):
```typescript
// 1. Oblicz agregowany trust score
const aggregateTrustScore = await getAggregateTrustScore(db, incident);
// = średnia z (reporter + podobni reporterzy z ostatnich 24h)

// 2. Policz podobne raporty
const similarReportsCount = await countSimilarReports(db, incident);
// = ile osób zgłosiło podobny incydent w ciągu 24h

// 3. DECYZJA:
if (aggregateTrustScore >= 1.2 || similarReportsCount >= 2) {
  // ✅ WIARYGODNY - wyślij powiadomienie!
  sendNotificationsToAffectedUsers();
} else {
  // ⏭️ Za mało dowodów - pomiń
}
```

### Przykłady:

**Scenariusz 1:** Zaufany reporter
```
User (trustScore: 1.5) → wypadek na linii 123
aggregateTrustScore = 1.5 >= 1.2 ✅
→ POWIADOMIENIE WYSŁANE
```

**Scenariusz 2:** Nowy reporter + potwierdzenia
```
User A (trust: 0.8) → korek na linii 456
aggregateTrustScore = 0.8 < 1.2 ❌
→ BRAK POWIADOMIENIA

User B (trust: 1.0) → też korek na 456
aggregateTrustScore = 0.9, similar = 1 ❌
→ BRAK POWIADOMIENIA

User C (trust: 1.2) → też korek na 456
aggregateTrustScore = 1.0, similar = 2 ✅
→ POWIADOMIENIE WYSŁANE (2+ podobne raporty!)
```

### Deduplikacja:
```typescript
// Cache: każdy user dostaje MAX 1 powiadomienie/godzinę/incydent
const deliveryCache = new Map<"incidentId:userId", timestamp>();
const CACHE_TTL = 1 godzina;
```

### GraphQL Subscription:
```graphql
subscription {
  smartIncidentNotifications(userId: "USER_ID") {
    id
    title
    kind
    delayMinutes
    lines { name }
  }
}
```

### Pliki:
- ✅ `src/lib/notification-system.ts` (354 linie) - główna logika
- ✅ `src/lib/threshold-algorithm.ts` - algorytm progowy
- ✅ `src/backend/resolvers/mutation.ts` - integracja (linia 413)
- ✅ `src/backend/resolvers/subscriptions.ts` - GraphQL subscription
- ✅ `SMART_NOTIFICATIONS_SUMMARY.md` - dokumentacja

---

## 🕐 **3. Cron Job na bibliotece npm** (Zmodyfikowany)

### ✅ Używa biblioteki `cron` (CronJob)

```typescript
import { CronJob } from 'cron';

trustScoreCronJob = new CronJob(
  '*/5 * * * * *',     // Co 5 sekund (test) / '0 */6 * * *' (prod = co 6h)
  runTrustScoreUpdate, // Funkcja do wykonania
  null,                // onComplete
  true,                // Start od razu
  'Europe/Warsaw'      // Timezone
);
```

### Funkcje:
```typescript
startTrustScoreCron()  // Uruchom cron
stopTrustScoreCron()   // Zatrzymaj cron
getTrustScoreCronStatus() // Status
```

### Użycie:
```bash
# W .env dodaj:
RUN_CRON=true

# Uruchom:
npm run dev
```

### Plik:
- ✅ `src/backend/cron/trust-score-cron.ts` (120 linii) - **ZMODYFIKOWANY**

---

## 📦 Wszystkie Zmiany w Projekcie

### Utworzone (Analytics):
1. `src/backend/resolvers/adminAnalytics.ts` - resolvers
2. `scripts/populate-incidents.ts` - generator danych
3. `ANALYTICS_QUERIES.graphql` - przykłady
4. `ANALYTICS_IMPLEMENTATION.md` - dokumentacja

### Zmodyfikowane (Analytics):
1. `src/backend/schema.graphql` - nowe typy i queries
2. `src/backend/db/collections.ts` - dodano `delayMinutes`
3. `src/backend/resolvers/mutation.ts` - obsługa `delayMinutes`
4. `src/backend/resolvers/adminMutation.ts` - obsługa `delayMinutes`
5. `src/backend/resolvers/index.ts` - integracja analytics
6. `package.json` - nowy skrypt `populate:incidents`

### Zmodyfikowane (Cron):
1. `src/backend/cron/trust-score-cron.ts` - zmiana na CronJob

### Istniejące (Powiadomienia):
1. `src/lib/notification-system.ts` - główna logika
2. `src/lib/threshold-algorithm.ts` - algorytm
3. `src/backend/resolvers/subscriptions.ts` - GraphQL
4. `SMART_NOTIFICATIONS_SUMMARY.md` - dokumentacja

---

## 🚀 Quick Start

### 1. Analytics:
```bash
# Wygeneruj dane testowe
npm run populate:incidents

# Uruchom serwer
npm run dev

# Otwórz GraphiQL
http://localhost:3000/api/graphql

# Testuj query:
query {
  admin {
    topDelays(period: LAST_31D, limit: 10) {
      rank
      lineName
      totalDelays
      averageDelayMinutes
    }
  }
}
```

### 2. Powiadomienia:
```graphql
# Frontend subskrypcja
subscription {
  smartIncidentNotifications(userId: "YOUR_USER_ID") {
    id
    title
    kind
  }
}

# Backend automatycznie:
# - Sprawdza trust score
# - Liczy podobne raporty
# - Wysyła jeśli wiarygodne
```

### 3. Cron:
```bash
# W .env:
RUN_CRON=true

# Uruchom:
npm run dev

# Cron aktualizuje trust scores co 5s (test) / 6h (prod)
```

---

## 🎯 Podsumowanie

### ✅ System Analityki:
- 4 nowe GraphQL queries dla adminów
- Generator danych testowych
- Statystyki opóźnień, incydentów, rankingi
- Kompletna dokumentacja

### ✅ System Powiadomień:
- **JUŻ ISTNIEJE I DZIAŁA!**
- Trust-based dla użytkowników
- Natychmiastowe dla admin/moderator
- Deduplikacja (cache 1h)
- GraphQL subscription

### ✅ Cron Job:
- **Zmieniony na bibliotekę `cron`**
- CronJob z timezone
- Graceful shutdown
- Status API

### 📊 Stan:
- **WSZYSTKO KOMPLETNE**
- **GOTOWE DO UŻYCIA**
- **BEZ BŁĘDÓW KOMPILACJI**

🎉 **Projekt gotowy!**
