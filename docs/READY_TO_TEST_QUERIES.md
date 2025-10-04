# Ready-to-Use GraphQL Queries for Path Finding

## 🎯 Query 1: Podstawowa trasa z przystanku Agatowa

```graphql
query TestFromAgatowa {
  findPath(input: {
    # Dokładnie na przystanku Agatowa
    startCoordinates: {
      latitude: 50.021911666
      longitude: 20.042668333
    }
    # 500m dalej (symulacja celu)
    endCoordinates: {
      latitude: 50.026
      longitude: 20.047
    }
    departureTime: "08:00"
    maxWalkingDistance: 1000
  }) {
    segments {
      segmentType
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
      lineName
      transportType
      departureTime
      arrivalTime
      duration
      distance
      platformNumber
      warnings
    }
    totalDuration
    totalTransfers
    departureTime
    arrivalTime
    warnings
  }
}
```

## 🎯 Query 2: Z odległego punktu (test walking time)

```graphql
query TestWithWalking {
  findPath(input: {
    # 300m od Agatowej
    startCoordinates: {
      latitude: 50.024
      longitude: 20.044
    }
    # 400m od najbliższego przystanku końcowego
    endCoordinates: {
      latitude: 50.027
      longitude: 20.049
    }
    departureTime: "08:00"
    maxWalkingDistance: 1000
  }) {
    segments {
      segmentType
      from { stopName }
      to { stopName }
      duration
      distance
      warnings
    }
    totalDuration
    totalTransfers
    warnings
  }
}
```

## 🎯 Query 3: Lista wszystkich przystanków (do debugowania)

```graphql
query GetAllStops {
  stops(transportType: BUS) {
    id
    name
    coordinates {
      latitude
      longitude
    }
    platformNumbers
    gtfsId
  }
}
```

## 🎯 Query 4: Lista linii autobusowych

```graphql
query GetBusLines {
  lines(transportType: BUS) {
    id
    name
  }
}
```

## 🎯 Query 5: Test przesiadki między liniami (gdy będzie zaimplementowane)

```graphql
query TestTransfer {
  findPath(input: {
    startCoordinates: {
      latitude: 50.021911666
      longitude: 20.042668333
    }
    endCoordinates: {
      latitude: 50.035
      longitude: 20.055
    }
    departureTime: "08:00"
    maxWalkingDistance: 1000
  }) {
    segments {
      segmentType
      from { stopName }
      to { stopName }
      lineName
      departureTime
      arrivalTime
      duration
    }
    totalDuration
    totalTransfers
    warnings
  }
}
```

## 🎯 Query 6: Za daleko od przystanków (should fail gracefully)

```graphql
query TestTooFar {
  findPath(input: {
    # Bardzo daleko od jakiegokolwiek przystanku
    startCoordinates: {
      latitude: 50.1
      longitude: 20.1
    }
    endCoordinates: {
      latitude: 50.021911666
      longitude: 20.042668333
    }
    departureTime: "08:00"
    maxWalkingDistance: 500  # Tylko 500m max
  }) {
    segments {
      segmentType
    }
    totalDuration
    warnings
  }
}
```

## 🎯 Query 7: Późna godzina (test no routes available)

```graphql
query TestLateHour {
  findPath(input: {
    startCoordinates: {
      latitude: 50.021911666
      longitude: 20.042668333
    }
    endCoordinates: {
      latitude: 50.026
      longitude: 20.047
    }
    departureTime: "23:00"  # Późna godzina
    maxWalkingDistance: 1000
  }) {
    segments {
      segmentType
      lineName
      departureTime
    }
    warnings
  }
}
```

## 🎯 Query 8: Tight connection warning test

```graphql
query TestTightConnection {
  findPath(input: {
    # Dochodzisz na przystanek 1 minutę przed odjazdem
    startCoordinates: {
      latitude: 50.0215  # ~100m od Agatowej
      longitude: 20.0425
    }
    endCoordinates: {
      latitude: 50.026
      longitude: 20.047
    }
    # Zakładając że bus odjeżdża o 08:02, dojdziesz o 08:01
    departureTime: "08:00"
    maxWalkingDistance: 1000
  }) {
    segments {
      segmentType
      from { stopName }
      to { stopName }
      duration
      warnings
    }
    totalDuration
    warnings  # Powinieneś zobaczyć: "Tight connection"
  }
}
```

## 📋 Instrukcja testowania:

### 1. Uruchom serwer
```bash
npm run dev
```

### 2. Otwórz GraphiQL
```
http://localhost:4000/graphql
```

### 3. Sprawdź dane w bazie
Najpierw uruchom Query 3 i Query 4 aby zobaczyć:
- Jakie przystanki masz w bazie
- Jakie linie
- Ich współrzędne

### 4. Dostosuj współrzędne
Użyj współrzędnych z Query 3 w Query 1 lub 2

### 5. Sprawdź rezultat
Zweryfikuj czy:
- ✅ Jest segment WALK na początek
- ✅ Jest segment waiting (jeśli trzeba czekać)
- ✅ Jest segment TRANSIT
- ✅ Jest segment WALK na koniec
- ✅ totalDuration = suma wszystkich duration
- ✅ Warnings są sensowne

## 🐛 Możliwe błędy i rozwiązania:

### "No stops found within walking distance"
**Przyczyna:** Współrzędne za daleko od przystanków lub baza pusta

**Rozwiązanie:**
```bash
# Zaimportuj dane GTFS
npm run import:gtfs:full
```

### "No direct route found between stops"
**Przyczyna:** Brak Route w bazie łączącego te dwa przystanki

**Rozwiązanie:**
- Użyj przystanków na tej samej linii
- Sprawdź czy Routes w bazie mają wypełnione `stops` array

### Wszystkie segments mają duration: 0
**Przyczyna:** Routes nie mają wypełnionych stop_times

**Rozwiązanie:**
```bash
# Użyj pełnego importu z stop_times
npm run import:gtfs:full
```

## 🎨 Przykładowy oczekiwany rezultat:

```json
{
  "data": {
    "findPath": {
      "segments": [
        {
          "segmentType": "WALK",
          "from": {
            "stopName": "Start location",
            "coordinates": {
              "latitude": 50.021911666,
              "longitude": 20.042668333
            }
          },
          "to": {
            "stopName": "Agatowa",
            "coordinates": {
              "latitude": 50.021911666,
              "longitude": 20.042668333
            }
          },
          "duration": 0,
          "distance": 0,
          "warnings": []
        },
        {
          "segmentType": "WALK",
          "from": {
            "stopName": "Agatowa"
          },
          "to": {
            "stopName": "Agatowa (waiting)"
          },
          "duration": 2,
          "distance": 0,
          "warnings": ["Waiting 2 minutes for Bus 102"]
        },
        {
          "segmentType": "TRANSIT",
          "from": {
            "stopName": "Agatowa"
          },
          "to": {
            "stopName": "Next Stop"
          },
          "lineName": "Bus 102",
          "transportType": "BUS",
          "departureTime": "08:02",
          "arrivalTime": "08:10",
          "duration": 8,
          "platformNumber": "782-01",
          "warnings": []
        },
        {
          "segmentType": "WALK",
          "from": {
            "stopName": "Next Stop"
          },
          "to": {
            "stopName": "Destination"
          },
          "duration": 6,
          "distance": 500,
          "warnings": []
        }
      ],
      "totalDuration": 16,
      "totalTransfers": 0,
      "departureTime": "08:00",
      "arrivalTime": "08:16",
      "warnings": []
    }
  }
}
```

## ✅ Checklist weryfikacji:

Po uruchomieniu query sprawdź:

- [ ] Pierwszy segment to WALK (chodzenie do przystanku)
- [ ] Jest segment waiting jeśli czas oczekiwania > 0
- [ ] Jest segment TRANSIT z nazwą linii
- [ ] Ostatni segment to WALK (od przystanku do celu)
- [ ] totalDuration = suma wszystkich duration
- [ ] departureTime to czas startu
- [ ] arrivalTime = departureTime + totalDuration
- [ ] Warnings zawierają użyteczne informacje
- [ ] Współrzędne są sensowne (Kraków: ~50.06°N, 19.95°E)
