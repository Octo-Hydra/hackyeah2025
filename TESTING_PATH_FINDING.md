# Testowanie findPath - Bus + Rail

## ✅ Co jest zaimplementowane?

### Format segmentów PathSegment

Tak, `findPath` zwraca segmenty w formacie `[{FROM: A, TO: B}, {FROM: B, TO: C}]`:

```typescript
type PathSegment {
  from: SegmentLocation!  // ← START przystanku
  to: SegmentLocation!    // ← END przystanku
  lineId: ID!
  lineName: String!
  transportType: TransportType!  // BUS lub RAIL
  departureTime: String!
  arrivalTime: String!
  duration: Int!
  hasIncident: Boolean!
}
```

### Struktura SegmentLocation

Każdy `from` i `to` zawiera:
```typescript
{
  stopName: String!      // Nazwa przystanku
  coordinates: {
    latitude: Float!
    longitude: Float!
  }
}
```

## 🧪 Przykładowe testy

### 1. Test podstawowy - znajdź trasę

Otwórz GraphiQL: http://localhost:3000/api/graphql

```graphql
query TestFindPath {
  findPath(input: {
    from: { latitude: 50.0647, longitude: 19.9450 }  # Kraków centrum
    to: { latitude: 50.0767, longitude: 19.9478 }    # Kraków Główny
    departureTime: "2024-10-04T10:00:00Z"
  }) {
    segments {
      from {
        stopName
        coordinates {
          latitude
          longitude
        }
      }
      to {
        stopName
        coordinates {
          latitude
          longitude
        }
      }
      lineId
      lineName
      transportType
      departureTime
      arrivalTime
      duration
      hasIncident
    }
    totalDuration
    departureTime
    arrivalTime
    warnings
    hasIncidents
  }
}
```

### 2. Sprawdź dostępne przystanki BUS

```graphql
query GetBusStops {
  stops(transportType: "BUS") {
    id
    name
    coordinates {
      latitude
      longitude
    }
    transportType
  }
}
```

### 3. Sprawdź dostępne przystanki RAIL

```graphql
query GetRailStops {
  stops(transportType: "RAIL") {
    id
    name
    coordinates {
      latitude
      longitude
    }
    transportType
  }
}
```

### 4. Test łączenia BUS + RAIL (gdy istnieje przesiadka)

```graphql
query TestMultiModal {
  # 1. Znajdź połączenie BUS
  busPath: findPath(input: {
    from: { latitude: 50.06, longitude: 19.94 }
    to: { latitude: 50.07, longitude: 19.95 }
  }) {
    segments {
      from { stopName }
      to { stopName }
      transportType
      lineName
    }
    warnings
  }
  
  # 2. Znajdź połączenie RAIL
  railPath: findPath(input: {
    from: { latitude: 50.07, longitude: 19.95 }
    to: { latitude: 50.08, longitude: 19.96 }
  }) {
    segments {
      from { stopName }
      to { stopName }
      transportType
      lineName
    }
    warnings
  }
}
```

## 🔍 Jak testować kilka przystanków RAIL?

### Sprawdź route z wieloma przystankami:

```graphql
query CheckRailRoute {
  # Najpierw znajdź przystanki RAIL
  stops(transportType: "RAIL") {
    id
    name
    coordinates {
      latitude
      longitude
    }
  }
}
```

Potem użyj współrzędnych dwóch odległych przystanków RAIL:

```graphql
query RailWithMultipleStops {
  findPath(input: {
    from: { latitude: 50.0, longitude: 19.9 }   # Pierwszy przystanek RAIL
    to: { latitude: 50.1, longitude: 20.0 }     # Ostatni przystanek RAIL
  }) {
    segments {
      from { stopName }
      to { stopName }
      transportType
      lineName
      departureTime
      arrivalTime
    }
    warnings  # ← Tu zobaczysz WSZYSTKIE przystanki pośrednie!
  }
}
```

## 📊 Co zwraca warnings?

W `warnings` zobaczysz listę **wszystkich przystanków** na trasie:

```json
{
  "warnings": [
    "📍 5 stops on route:",
    "  1. Przystanek Początkowy",
    "  2. Przystanek Pośredni 1",
    "  3. Przystanek Pośredni 2",
    "  4. Przystanek Pośredni 3",
    "  5. Przystanek Końcowy"
  ]
}
```

## 🚀 Oczekiwany format odpowiedzi

```json
{
  "data": {
    "findPath": {
      "segments": [
        {
          "from": {
            "stopName": "Dworzec Główny",
            "coordinates": { "latitude": 50.0647, "longitude": 19.9450 }
          },
          "to": {
            "stopName": "Rondo Mogilskie",
            "coordinates": { "latitude": 50.0767, "longitude": 19.9478 }
          },
          "lineId": "507f1f77bcf86cd799439011",
          "lineName": "Line 123",
          "transportType": "BUS",
          "departureTime": "10:00:00",
          "arrivalTime": "10:15:00",
          "duration": 15,
          "hasIncident": false
        }
      ],
      "totalDuration": 15,
      "departureTime": "2024-10-04T10:00:00Z",
      "arrivalTime": "10:15:00",
      "warnings": [
        "📍 3 stops on route:",
        "  1. Dworzec Główny",
        "  2. Plac Inwalidów",
        "  3. Rondo Mogilskie"
      ],
      "hasIncidents": false
    }
  }
}
```

## ✅ Podsumowanie

1. **Format segmentów**: ✅ TAK - `[{from: A, to: B}, {from: B, to: C}]`
2. **Bus + Rail**: ✅ TAK - algorytm obsługuje oba typy transportu
3. **Kilka przystanków RAIL**: ✅ TAK - pokazuje wszystkie przystanki w `warnings`
4. **Struktura from/to**: ✅ TAK - zawiera `stopName` i `coordinates`

## 🎯 Następne kroki

Jeśli chcesz **automatyczne łączenie BUS + RAIL** (przesiadki):
- Obecna implementacja zwraca tylko **bezpośrednie połączenie**
- Dla przesiadek trzeba by:
  1. Znaleźć wspólne przystanki między liniami
  2. Połączyć wiele `segments` w jedną podróż
  3. Obliczyć czas przesiadki

Aktualnie można to zrobić **manualnie** przez 2 zapytania (patrz przykład 4 powyżej).
