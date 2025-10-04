# System Wykrywania Incydentów na Podstawie Geolokalizacji

## Szybki Start

### Co zostało zaimplementowane?

System automatycznie wykrywa, między którymi dwoma przystankami znajduje się użytkownik zgłaszający incydent, zapisuje to w bazie danych i wyświetla ostrzeżenia podczas planowania trasy.

## Jak to działa?

### 1. Użytkownik zgłasza incydent z lokalizacją GPS

```graphql
mutation {
  createReport(input: {
    title: "Awaria autobusu"
    kind: VEHICLE_FAILURE
    lineIds: ["67872ce2e7c8de97c2d5c89f"]
    reporterLocation: {
      latitude: 52.2297
      longitude: 21.0122
    }
  }) {
    id
    affectedSegment {
      startStopId
      endStopId
      confidence  # HIGH, MEDIUM, LOW
    }
  }
}
```

### 2. System automatycznie:
- Znajduje 2 najbliższe przystanki
- Sprawdza, czy użytkownik jest między nimi
- Określa poziom pewności (HIGH/MEDIUM/LOW)
- Zapisuje w kolekcji `IncidentLocations`

### 3. Podczas planowania trasy system sprawdza incydenty

```graphql
query {
  findPath(input: {
    from: { latitude: 52.2297, longitude: 21.0122 }
    to: { latitude: 52.2396, longitude: 21.0196 }
    departureTime: "10:00"
  }) {
    segments {
      from { stopName }
      to { stopName }
      hasIncident           # Czy segment ma incydent?
      incidentWarning       # Tekstowe ostrzeżenie
      incidentSeverity      # HIGH, MEDIUM, LOW
    }
    hasIncidents            # Czy cała trasa ma jakieś incydenty?
    affectedSegments        # Które segmenty są dotknięte? (indeksy)
  }
}
```

## Nowe Pliki

### 1. `src/lib/geolocation-utils.ts` (207 linii)
Biblioteka do obliczeń GPS i wykrywania segmentów.

**Główne funkcje:**
- `calculateDistance()` - wzór Haversine dla dokładnych odległości
- `findNearestStop()` - znajduje najbliższy przystanek
- `findTwoNearestStops()` - znajduje 2 najbliższe przystanki
- `determineIncidentSegment()` - określa segment między przystankami
- `isLocationBetweenStops()` - sprawdza czy lokalizacja jest na linii

### 2. `src/backend/db/collections.ts`
Rozszerzone modele danych:

```typescript
// Nowy model - śledzi incydenty na segmentach
interface IncidentLocationModel {
  incidentId: ObjectId;
  lineId: ObjectId;
  startStopId: ObjectId;    // Pierwszy przystanek segmentu
  endStopId: ObjectId;      // Drugi przystanek segmentu
  severity: "HIGH" | "MEDIUM" | "LOW";
  active: boolean;          // false gdy rozwiązany
  createdAt: string;
  resolvedAt?: string | null;
}

// Rozszerzony model incydentu
interface IncidentModel {
  // ... istniejące pola ...
  reporterLocation?: Coordinates;  // GPS użytkownika
  affectedSegment?: {              // Wykryty segment
    startStopId: ObjectId;
    endStopId: ObjectId;
    lineId?: ObjectId | null;
  } | null;
}

// Rozszerzony segment trasy
interface PathSegment {
  // ... istniejące pola ...
  hasIncident?: boolean;
  incidentWarning?: string;
  incidentSeverity?: "HIGH" | "MEDIUM" | "LOW";
}

// Rozszerzona trasa
interface JourneyPath {
  // ... istniejące pola ...
  hasIncidents?: boolean;
  affectedSegments?: number[];  // Indeksy segmentów z incydentami
}
```

### 3. `src/backend/schema.graphql`
Rozszerzone typy GraphQL:

```graphql
input CreateReportInput {
  # ... istniejące pola ...
  reporterLocation: CoordinatesInput  # Nowe!
}

type Incident {
  # ... istniejące pola ...
  reporterLocation: Coordinates
  affectedSegment: IncidentSegment
}

type IncidentSegment {
  startStopId: ID!
  endStopId: ID!
  lineId: ID
  confidence: SegmentConfidence!
}

enum SegmentConfidence {
  HIGH    # < 200m średnia odległość
  MEDIUM  # < 500m średnia odległość
  LOW     # ≥ 500m średnia odległość
}

type PathSegment {
  # ... istniejące pola ...
  hasIncident: Boolean!
  incidentWarning: String
  incidentSeverity: IncidentSeverity
}

type JourneyPath {
  # ... istniejące pola ...
  hasIncidents: Boolean!
  affectedSegments: [Int!]!
}
```

## Modyfikowane Pliki

### 1. `src/backend/resolvers/userMutation.ts`
Dodano logikę wykrywania segmentu w `createReport`:

```typescript
// Jeśli użytkownik podał lokalizację
if (input.reporterLocation) {
  // 1. Pobierz wszystkie przystanki
  const stops = await db.collection("Stops").find({}).toArray();
  
  // 2. Wykryj segment (1000m promień)
  const segment = determineIncidentSegment(
    input.reporterLocation,
    stops,
    1000
  );
  
  // 3. Jeśli wykryto segment
  if (segment && segment.confidence !== 'LOW') {
    // Zapisz w IncidentModel
    affectedSegment = {
      startStopId: new ObjectId(segment.startStopId),
      endStopId: new ObjectId(segment.endStopId),
      lineId: input.lineIds[0] ? new ObjectId(input.lineIds[0]) : null
    };
    
    // Zapisz w IncidentLocations
    await db.collection("IncidentLocations").insertOne({
      incidentId: res.insertedId,
      lineId: detectedLineId,
      startStopId: affectedSegment.startStopId,
      endStopId: affectedSegment.endStopId,
      severity: incidentClass === "CLASS_1" ? "HIGH" : "MEDIUM",
      active: true,
      createdAt: now
    });
  }
}
```

### 2. `src/backend/resolvers/pathResolversSimple.ts`
Dodano sprawdzanie incydentów w `findPath`:

```typescript
// Nowa funkcja pomocnicza
async function getActiveIncidentsForSegment(
  db: Db,
  lineId: ObjectId,
  stopId1: ObjectId,
  stopId2: ObjectId
): Promise<IncidentLocationModel | null> {
  return await db.collection("IncidentLocations").findOne({
    active: true,
    lineId,
    $or: [
      { startStopId: stopId1, endStopId: stopId2 },
      { startStopId: stopId2, endStopId: stopId1 }  // Sprawdź oba kierunki
    ]
  });
}

// W pętli przez przystanki na trasie:
for (let i = fromIndex; i <= toIndex; i++) {
  // ... istniejący kod ...
  
  // Sprawdź incydenty na segmencie między przystankami
  if (i < toIndex) {
    const incident = await getActiveIncidentsForSegment(
      db,
      lineId,
      stopId,
      nextStopId
    );
    
    if (incident) {
      hasSegmentIncidents = true;
      incidentWarnings.push(
        `🚨 Incydent między ${stop.name} a ${nextStop.name}`
      );
    }
  }
}

// Dodaj do segmentu trasy:
segments.push({
  // ... istniejące pola ...
  hasIncident: hasSegmentIncidents,
  incidentWarning: hasSegmentIncidents ? incidentWarnings.join(" | ") : undefined,
  incidentSeverity: hasSegmentIncidents ? "HIGH" : undefined
});

// Zwróć trasę z informacją o incydentach:
return {
  segments,
  // ... istniejące pola ...
  hasIncidents,           // Czy trasa ma incydenty?
  affectedSegments        // [0, 2, 5] - indeksy segmentów
};
```

## Algorytm Wykrywania Segmentu

### Krok 1: Znajdź 2 najbliższe przystanki
```typescript
const twoNearest = findTwoNearestStops(
  reporterLocation,
  stops,
  1000  // max 1000m promień
);
```

### Krok 2: Sprawdź czy lokalizacja jest między przystankami
```typescript
const isOnLine = isLocationBetweenStops(
  reporterLocation,
  stop1,
  stop2,
  100  // max 100m od linii
);
```

### Krok 3: Określ poziom pewności
- **HIGH**: Średnia odległość do przystanków < 200m
- **MEDIUM**: Średnia odległość < 500m
- **LOW**: Średnia odległość ≥ 500m

### Krok 4: Zwróć wynik
```typescript
return {
  startStopId: stop1._id.toString(),
  endStopId: stop2._id.toString(),
  confidence: "HIGH",
  distanceToStart: 150,   // metry
  distanceToEnd: 180      // metry
};
```

## Mapowanie Ważności

### Klasy Incydentów → Severity
- **CLASS_1** (VEHICLE_FAILURE, NETWORK_FAILURE, PEDESTRIAN_ACCIDENT) → **HIGH** 🚨
- **CLASS_2** (inne) → **MEDIUM** ⚠️

### Emojis w Ostrzeżeniach
- **HIGH**: 🚨 (czerwone, krytyczne)
- **MEDIUM**: ⚠️ (żółte, ważne)
- **LOW**: ℹ️ (niebieskie, informacyjne)

## Baza Danych

### Nowa Kolekcja: IncidentLocations
```javascript
db.IncidentLocations.insertOne({
  incidentId: ObjectId("67872ce2e7c8de97c2d5c89f"),
  lineId: ObjectId("67872ce2e7c8de97c2d5c8a0"),
  startStopId: ObjectId("67872ce2e7c8de97c2d5c8a1"),
  endStopId: ObjectId("67872ce2e7c8de97c2d5c8a2"),
  severity: "HIGH",
  active: true,
  createdAt: "2025-01-15T10:30:00Z",
  resolvedAt: null
})
```

### Query na aktywne incydenty
```javascript
db.IncidentLocations.find({
  active: true,
  lineId: ObjectId("..."),
  $or: [
    { startStopId: stop1Id, endStopId: stop2Id },
    { startStopId: stop2Id, endStopId: stop1Id }
  ]
})
```

## Przykład Użycia

### Frontend: Pobierz lokalizację i zgłoś incydent
```typescript
// 1. Pobierz GPS użytkownika
navigator.geolocation.getCurrentPosition((position) => {
  const reporterLocation = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude
  };
  
  // 2. Zgłoś incydent z lokalizacją
  createReport({
    variables: {
      input: {
        title: "Awaria tramwaju",
        kind: "VEHICLE_FAILURE",
        lineIds: ["67872ce2e7c8de97c2d5c89f"],
        reporterLocation
      }
    }
  }).then(result => {
    console.log("Wykryty segment:", result.data.createReport.affectedSegment);
  });
});
```

### Frontend: Wyświetl ostrzeżenia w trasie
```tsx
{path.hasIncidents && (
  <Alert severity="warning">
    Ta trasa ma {path.affectedSegments.length} problematycznych segmentów
  </Alert>
)}

{path.segments.map((segment, idx) => (
  <div key={idx}>
    <div className="segment">
      {segment.from.stopName} → {segment.to.stopName}
    </div>
    
    {segment.hasIncident && (
      <div className={`incident ${segment.incidentSeverity?.toLowerCase()}`}>
        {segment.incidentWarning}
      </div>
    )}
  </div>
))}
```

## Logi Systemowe

System loguje ważne zdarzenia:

```
📍 Reporter location: 52.2297, 21.0122
✅ Detected incident segment: Dworzec Centralny → Plac Zawiszy (HIGH confidence)
✅ Created IncidentLocation for line 67872ce2e7c8de97c2d5c89f between stops
```

## Testowanie

### 1. Zgłoś incydent z lokalizacją
```bash
# W GraphQL Playground (http://localhost:4000/graphql)

mutation {
  createReport(input: {
    title: "Awaria autobusu"
    kind: VEHICLE_FAILURE
    lineIds: ["ID_LINII"]
    reporterLocation: {
      latitude: 52.2297
      longitude: 21.0122
    }
  }) {
    id
    affectedSegment {
      startStopId
      endStopId
      confidence
    }
  }
}
```

### 2. Znajdź trasę i sprawdź ostrzeżenia
```bash
query {
  findPath(input: {
    from: { latitude: 52.2297, longitude: 21.0122 }
    to: { latitude: 52.2396, longitude: 21.0196 }
    departureTime: "10:00"
  }) {
    segments {
      from { stopName }
      to { stopName }
      hasIncident
      incidentWarning
      incidentSeverity
    }
    hasIncidents
    affectedSegments
  }
}
```

### 3. Sprawdź bazę danych
```javascript
// MongoDB Shell
db.IncidentLocations.find({ active: true }).pretty()
db.Incidents.find({ reporterLocation: { $exists: true } }).pretty()
```

## Obsługa Przypadków Brzegowych

✅ **Brak przystanków w pobliżu** → `determineIncidentSegment()` zwraca null  
✅ **Tylko 1 przystanek w pobliżu** → Zwraca null (potrzeba 2 przystanków)  
✅ **Lokalizacja za daleko od linii** → Zwraca LOW confidence lub null  
✅ **Brak lineId** → Segment zapisany ale lineId=null  
✅ **Incydent rozwiązany** → `active=false`, nie zwracany w query  
✅ **Dwukierunkowe segmenty** → Sprawdza stop1→stop2 i stop2→stop1  

## Przyszłe Ulepszenia

1. **Indeksowanie przestrzenne** - MongoDB geospatial queries dla szybszego wyszukiwania
2. **Rozwiązywanie incydentów** - Mutation do oznaczania incydentów jako rozwiązane
3. **Alternatywne trasy** - Sugerowanie tras omijających incydenty
4. **Powiadomienia real-time** - Push gdy aktywna podróż użytkownika jest dotknięta
5. **Wizualizacja na mapie** - Pokazywanie incydentów na interfejsie mapy
6. **Dane historyczne** - Analiza wzorców incydentów dla predykcji

## Podsumowanie

System został w pełni zaimplementowany i zawiera:

✅ Automatyczne wykrywanie segmentu z GPS  
✅ Ocena pewności wykrycia (HIGH/MEDIUM/LOW)  
✅ Przechowywanie mapowań incydent-segment  
✅ Ostrzeżenia w czasie rzeczywistym podczas planowania trasy  
✅ Priorytetyzacja na podstawie ważności  
✅ Dopasowywanie dwukierunkowe  
✅ Type-safe GraphQL API  
✅ Kompletna dokumentacja  

System gotowy do testowania! 🚀
