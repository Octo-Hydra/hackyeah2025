# A* Pathfinding Implementation - Summary

## 🎯 Co zostało zaimplementowane

Pełna implementacja inteligentnego wyznaczania tras z uwzględnieniem incydentów w czasie rzeczywistym.

### 1. **Backend - Algorytm A***

**Plik:** `src/backend/pathfinding/astar-with-incidents.ts`

#### Funkcje główne:
- `findOptimalPath()` - Główny algorytm A* z dynamicznymi wagami
- `findOptimalPathCached()` - Wersja z cache (TTL: 5 minut)
- `getActiveIncidents()` - Pobieranie aktywnych incydentów z MongoDB
- `calculateIncidentDelay()` - Obliczanie opóźnień i severity

#### Algorytm A*:
```typescript
// Heurystyka: dystans Haversine z prędkościami dla różnych typów transportu
function heuristic(from: Stop, to: Stop, transportType: string): number

// Główna pętla A*:
1. Znajdowanie najbliższych przystanków do współrzędnych
2. Budowanie grafu sąsiedztwa (routes → edges)
3. Dynamiczne wagi krawędzi:
   - Bazowy czas przejazdu (dystans / prędkość średnia)
   - Opóźnienia z incydentów (5-30+ min w zależności od severity)
   - Kary za niepopularne typy transportu
4. Znajdowanie do 3 najlepszych tras
5. Sortowanie: najkrótszy czas → najmniej przesiadek
```

#### Integracja z incydentami:
```typescript
// Severity levels based on delay
LOW:      2-4 min
MEDIUM:   5-14 min
HIGH:     15-29 min
CRITICAL: 30+ min (effectively blocks route)

// Delay calculation:
- DELAY: 5 min base
- CROWDED: 3 min base
- BLOCKED: 30 min base
- CANCELLED: 999 min (route blocked)
- ACCIDENT: 15 min base
- TRAFFIC_JAM: 10 min base
- OTHER: 2 min base

// 2x multiplier if incident affects exact segment (affectedStops)
```

### 2. **GraphQL Schema**

**Plik:** `src/backend/schema.graphql`

#### Nowe typy:
```graphql
# Input dla wyszukiwania optymalnej trasy
input FindOptimalJourneyInput {
  fromStopId: ID!
  toStopId: ID!
  departureTime: String # ISO datetime
  maxTransfers: Int # Default: 3
  preferredTransportTypes: [TransportType!]
  avoidIncidents: Boolean # Default: true
}

# Wynik - top 3 trasy
type OptimalJourneyResult {
  journeys: [Journey!]!
  hasAlternatives: Boolean!
}

# Pojedyncza trasa
type Journey {
  segments: [JourneySegment!]!
  totalDuration: Int! # minutes
  totalDistance: Float! # km
  transferCount: Int!
  hasIncidents: Boolean!
  departureTime: String!
  arrivalTime: String!
  alternativeAvailable: Boolean!
}

# Segment trasy
type JourneySegment {
  from: SegmentLocation!
  to: SegmentLocation!
  lineId: ID!
  lineName: String!
  transportType: TransportType!
  departureTime: String!
  arrivalTime: String!
  duration: Int!
  hasIncident: Boolean!
  incidentDelay: Int # Additional delay
  incidentSeverity: IncidentSeverity
}

enum IncidentSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

#### Nowe query:
```graphql
type Query {
  findOptimalJourney(input: FindOptimalJourneyInput!): OptimalJourneyResult!
}
```

### 3. **GraphQL Resolver**

**Plik:** `src/backend/resolvers/optimalJourneyResolver.ts`

```typescript
export const optimalJourneyResolver = {
  Query: {
    findOptimalJourney: async (_parent, args, _context) => {
      const journeys = await findOptimalPathCached(
        args.input.fromStopId,
        args.input.toStopId,
        args.input.departureTime ? new Date(args.input.departureTime) : new Date(),
        {
          maxTransfers: args.input.maxTransfers || 3,
          preferredTransportTypes: args.input.preferredTransportTypes || [],
          avoidIncidents: args.input.avoidIncidents !== false,
        },
      );

      return {
        journeys: mappedJourneys,
        hasAlternatives: journeys.length > 1,
      };
    },
  },
};
```

**Integracja:** Dodane do `src/backend/resolvers/index.ts`

### 4. **Frontend - Komponent porównania tras**

**Plik:** `src/components/journey-comparison.tsx`

#### Funkcje UI:
- ✅ Wyświetlanie 3 najlepszych tras side-by-side
- ✅ Badge "Optymalna" dla najlepszej trasy
- ✅ Badge "Z opóźnieniami" dla tras z incydentami
- ✅ Szczegóły każdego segmentu:
  - Linia (z kolorem BUS/RAIL)
  - Przystanki (początek → koniec)
  - Czasy (odjazd/przyjazd)
  - Czas trwania
  - Opóźnienia z incydentami (severity + minuty)
- ✅ Statystyki trasy:
  - Całkowity czas
  - Dystans (km)
  - Liczba przesiadek
- ✅ Interaktywność:
  - Kliknięcie na kartę wybiera trasę
  - Podświetlenie wybranej trasy (ring-2 ring-primary)
  - Przycisk "Wybierz tę trasę"

#### Visual Design:
```tsx
// Severity colors
CRITICAL: bg-red-500
HIGH:     bg-orange-500
MEDIUM:   bg-yellow-500
LOW:      bg-blue-500

// Transport colors
BUS:  border-blue-500 text-blue-700
RAIL: border-green-500 text-green-700
```

### 5. **Frontend - Aktualizacja JourneyDialog**

**Plik:** `src/components/add-journey-dialog.tsx`

#### Zmiany:
1. **Nowy flow:**
   - Formularz wyboru punktów → Wyszukiwanie → **Porównanie tras** → Wybór → Zapis
   
2. **State management:**
   ```typescript
   const [foundJourneys, setFoundJourneys] = useState<Journey[]>([]);
   const [showComparison, setShowComparison] = useState(false);
   ```

3. **Nowe funkcje:**
   - `findNearestStop()` - Znajdowanie najbliższego przystanku do współrzędnych
   - `handleSelectJourney()` - Zapisywanie wybranej trasy do backendu i Zustand

4. **UI warunkowy:**
   ```tsx
   {showComparison ? (
     <JourneyComparison journeys={foundJourneys} onSelectJourney={handleSelectJourney} />
   ) : (
     <FormularzWyboru />
   )}
   ```

5. **Integracja GraphQL:**
   ```typescript
   const result = await query({
     findOptimalJourney: [
       {
         input: {
           fromStopId: startStop.stopId,
           toStopId: endStop.stopId,
           departureTime: new Date().toISOString(),
           maxTransfers: 3,
           avoidIncidents: true,
         },
       },
       { /* selection */ },
     ],
   });
   ```

## 📊 Przepływ danych

```
User wybiera punkty → Formularz
                         ↓
      findNearestStop() × 2 (współrzędne → przystanki)
                         ↓
      GraphQL Query: findOptimalJourney
                         ↓
      Backend: findOptimalPathCached()
                         ↓
      A* Algorithm:
        - Budowanie grafu
        - Pobieranie incydentów
        - Obliczanie opóźnień
        - Znajdowanie 3 najlepszych tras
                         ↓
      Zwrot: OptimalJourneyResult
                         ↓
      Frontend: JourneyComparison (UI porównania)
                         ↓
      User wybiera trasę → handleSelectJourney()
                         ↓
      GraphQL Mutation: setActiveJourney
                         ↓
      Zapis do MongoDB + Zustand store
                         ↓
      Toast: "Podróż zapisana!" + zamknięcie dialogu
```

## 🎨 Przykład użycia

### GraphQL Query:
```graphql
query FindOptimalRoute {
  findOptimalJourney(
    input: {
      fromStopId: "STOP_12345"
      toStopId: "STOP_67890"
      departureTime: "2025-06-09T12:00:00Z"
      maxTransfers: 3
      avoidIncidents: true
    }
  ) {
    journeys {
      totalDuration
      totalDistance
      transferCount
      hasIncidents
      segments {
        lineName
        transportType
        duration
        hasIncident
        incidentDelay
        incidentSeverity
        from {
          stopName
        }
        to {
          stopName
        }
      }
    }
    hasAlternatives
  }
}
```

### Odpowiedź:
```json
{
  "findOptimalJourney": {
    "journeys": [
      {
        "totalDuration": 45,
        "totalDistance": 12.5,
        "transferCount": 1,
        "hasIncidents": false,
        "segments": [
          {
            "lineName": "501",
            "transportType": "BUS",
            "duration": 25,
            "hasIncident": false,
            "from": { "stopName": "Kraków Główny" },
            "to": { "stopName": "Wieliczka Rynek" }
          },
          {
            "lineName": "R1",
            "transportType": "RAIL",
            "duration": 20,
            "hasIncident": false,
            "from": { "stopName": "Wieliczka Rynek" },
            "to": { "stopName": "Gdów" }
          }
        ]
      },
      {
        "totalDuration": 55,
        "totalDistance": 15.2,
        "transferCount": 2,
        "hasIncidents": true,
        "segments": [
          {
            "lineName": "304",
            "transportType": "BUS",
            "duration": 35,
            "hasIncident": true,
            "incidentDelay": 10,
            "incidentSeverity": "MEDIUM",
            "from": { "stopName": "Kraków Główny" },
            "to": { "stopName": "Niepołomice" }
          }
        ]
      }
    ],
    "hasAlternatives": true
  }
}
```

## 🔧 Konfiguracja i wydajność

### Cache:
- **TTL:** 5 minut
- **Kolekcja:** `PathCache` w MongoDB
- **Klucz:** `path:{fromStopId}:{toStopId}:{maxTransfers}:{safe|fast}`

### Parametry A*:
- **Max trasy:** 3 (top 3 najlepsze)
- **Max przesiadki:** 3 (domyślnie)
- **Prędkości średnie:**
  - TRAM: 25 km/h
  - BUS: 20 km/h
  - TRAIN/RAIL: 60 km/h
  - METRO: 40 km/h

### Optymalizacje:
- ✅ Caching popularnych tras
- ✅ Równoległe pobieranie danych (Promise.all)
- ✅ Early termination (closed set)
- ✅ Heurystyka Haversine (szybsze niż routing API)

## 🧪 Testowanie

### Testowanie backendu:
```typescript
// Test A* algorithm
const journeys = await findOptimalPath(
  "KRK_GLOWNY",
  "WIELICZKA_RYNEK",
  new Date(),
  {
    maxTransfers: 3,
    avoidIncidents: true,
  }
);

console.log(`Found ${journeys.length} routes`);
console.log(`Optimal route: ${journeys[0].totalDuration} min`);
```

### Testowanie GraphQL:
```bash
# GraphiQL endpoint: http://localhost:3000/api/graphql
# Użyj query z sekcji "Przykład użycia"
```

### Testowanie frontendu:
1. Otwórz aplikację
2. Kliknij FAB "Dodaj podróż"
3. Wybierz punkty początkowy i docelowy
4. Kliknij "Zaplanuj podróż"
5. Zobacz porównanie 3 tras
6. Wybierz trasę
7. Sprawdź czy zapisała się do `me { activeJourney }`

## 📝 Pliki zmodyfikowane

### Backend:
- ✅ `src/backend/pathfinding/astar-with-incidents.ts` - Algorytm A*
- ✅ `src/backend/schema.graphql` - Nowe typy i query
- ✅ `src/backend/resolvers/optimalJourneyResolver.ts` - Resolver
- ✅ `src/backend/resolvers/index.ts` - Integracja resolvera

### Frontend:
- ✅ `src/components/journey-comparison.tsx` - Komponent porównania tras
- ✅ `src/components/add-journey-dialog.tsx` - Aktualizacja dialogu

### Usunięte:
- ✅ `src/app/moderator/` - Zastąpione przez `src/app/admin/`

## 🚀 Następne kroki (opcjonalnie)

### Możliwe usprawnienia:
1. **Real-time updates:** WebSocket subscriptions dla live incident updates podczas porównania tras
2. **User preferences:** Zapisywanie preferencji (preferowane typy transportu)
3. **Historical data:** Statystyki opóźnień z przeszłości dla lepszych predykcji
4. **Multi-modal routing:** Dodanie opcji "pieszo" między przystankami
5. **Accessibility:** Opcja "accessible routes" (bez schodów, windy itp.)
6. **Carbon footprint:** Pokazywanie emisji CO2 dla każdej trasy
7. **Price comparison:** Integracja z cenami biletów

## ✅ Status implementacji

| Komponent | Status | Testy |
|-----------|--------|-------|
| A* Algorithm | ✅ Zaimplementowany | ⏳ Do przetestowania |
| GraphQL Schema | ✅ Zaimplementowany | ✅ Kompiluje się |
| GraphQL Resolver | ✅ Zaimplementowany | ⏳ Do przetestowania |
| JourneyComparison UI | ✅ Zaimplementowany | ⏳ Do przetestowania |
| JourneyDialog Integration | ✅ Zaimplementowany | ⏳ Do przetestowania |
| Cache System | ✅ Zaimplementowany | ⏳ Do przetestowania |
| Incident Integration | ✅ Zaimplementowany | ⏳ Do przetestowania |

**Wszystkie komponenty zaimplementowane i gotowe do testowania! 🎉**
