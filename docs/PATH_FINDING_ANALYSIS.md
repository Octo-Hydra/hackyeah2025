# PathResolvers - Analiza i Testy

## 🔍 Analiza obecnego rozwiązania

### ✅ **Co działa dobrze:**

1. **Czas chodzenia DO przystanku startowego**
   ```typescript
   walkToStartDuration = Math.ceil(walkToStartDistance / 80) // 80m/min
   ```
   - Szuka najbliższego przystanku w promieniu 1000m (default)
   - Oblicza czas dojścia (Haversine distance / 80m/min)
   - Dodaje segment WALK z czasem i odległością

2. **Czas chodzenia OD przystanku końcowego**
   ```typescript
   walkFromEndDuration = Math.ceil(walkFromEndDistance / 80)
   ```
   - Analogicznie jak start

3. **Czas oczekiwania na przystanku**
   - ✅ Teraz dodaje segment "waiting" jeśli trzeba czekać
   - ✅ Warning przy ciasnej przesiadce (<2 min)
   - ✅ Warning przy spóźnionym przybyciu

### ❌ **Główne ograniczenia:**

1. **Brak obsługi przesiadek między liniami**
   - Obecnie: szuka tylko bezpośredniego połączenia start→end
   - Brak: połączeń typu bus1 → (chodzenie) → bus2

2. **Brak chodzenia między przystankami przy przesiadce**
   - Gdy trzeba przejść z jednego przystanku na inny (np. 200m)
   - Nie uwzględnia czasu na zmianę peronu

3. **Brak optymalizacji trasy**
   - Wybiera pierwszą znalezioną trasę (najwcześniejszy odjazd)
   - Nie szuka najszybszej lub z najmniejszą liczbą przesiadek

## 🧪 Testowe Query #1: Bezpośrednie połączenie

Znajdź trasę między dwoma przystankami na tej samej linii.

### Przygotowanie danych:
Najpierw sprawdź jakie przystanki masz w bazie:

```javascript
// W MongoDB:
db.Stops.find({ transportType: "BUS" }).limit(10).toArray()
```

### GraphQL Query:

```graphql
query TestDirectConnection {
  findPath(input: {
    # Przystanek Agatowa
    startCoordinates: {
      latitude: 50.021911666
      longitude: 20.042668333
    }
    # Jakiś inny przystanek na tej samej linii (weź z bazy)
    endCoordinates: {
      latitude: 50.025
      longitude: 20.045
    }
    departureTime: "08:00"
    maxWalkingDistance: 1000
  }) {
    segments {
      segmentType
      from {
        stopId
        stopName
        coordinates {
          latitude
          longitude
        }
      }
      to {
        stopId
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

### Oczekiwany rezultat:

```json
{
  "data": {
    "findPath": {
      "segments": [
        {
          "segmentType": "WALK",
          "from": {
            "stopName": "Start location",
            "coordinates": { "latitude": 50.021911666, "longitude": 20.042668333 }
          },
          "to": {
            "stopName": "Agatowa",
            "coordinates": { "latitude": 50.021911666, "longitude": 20.042668333 }
          },
          "duration": 0,  // 0m walking (dokładnie na przystanku)
          "distance": 0
        },
        {
          "segmentType": "WALK",  // Waiting segment
          "from": { "stopName": "Agatowa" },
          "to": { "stopName": "Agatowa (waiting)" },
          "duration": 5,  // Czekanie 5 min na bus
          "warnings": ["Waiting 5 minutes for Bus 102"]
        },
        {
          "segmentType": "TRANSIT",
          "from": { "stopName": "Agatowa" },
          "to": { "stopName": "Next Stop" },
          "lineName": "Bus 102",
          "departureTime": "08:05",
          "arrivalTime": "08:15",
          "duration": 10
        },
        {
          "segmentType": "WALK",
          "from": { "stopName": "Next Stop" },
          "to": { "stopName": "Destination" },
          "duration": 3,  // Chodzenie od przystanku
          "distance": 250
        }
      ],
      "totalDuration": 18,  // 0 + 5 + 10 + 3
      "totalTransfers": 0,
      "warnings": []
    }
  }
}
```

## 🧪 Testowe Query #2: Z odległego punktu

Sprawdź czas chodzenia z daleka:

```graphql
query TestWalkingTime {
  findPath(input: {
    # 500m od Agatowej
    startCoordinates: {
      latitude: 50.026
      longitude: 20.048
    }
    endCoordinates: {
      latitude: 50.025
      longitude: 20.045
    }
    departureTime: "08:00"
    maxWalkingDistance: 1000  # Max 1km chodzenia
  }) {
    segments {
      segmentType
      from { stopName }
      to { stopName }
      duration
      distance
    }
    totalDuration
    warnings
  }
}
```

### Oczekiwany rezultat:

- Pierwszy segment: WALK z duration ~6-7 minut (500m / 80m/min)
- Segment waiting
- Segment TRANSIT
- Ostatni segment: WALK

## 🧪 Testowe Query #3: Za daleko do przystanku

```graphql
query TestTooFar {
  findPath(input: {
    # 2km od przystanku
    startCoordinates: {
      latitude: 50.04
      longitude: 20.06
    }
    endCoordinates: {
      latitude: 50.025
      longitude: 20.045
    }
    departureTime: "08:00"
    maxWalkingDistance: 500  # Max tylko 500m
  }) {
    warnings
  }
}
```

### Oczekiwany rezultat:

```json
{
  "data": {
    "findPath": {
      "warnings": ["No stops found within walking distance"]
    }
  }
}
```

## 📊 Weryfikacja czasów chodzenia

### Formuła:
```
walkingTime (min) = Math.ceil(distance_meters / 80)
```

### Przykłady:
- 80m = 1 min
- 160m = 2 min
- 400m = 5 min
- 800m = 10 min
- 1000m = 13 min

### Czy 80m/min to realistyczne?
- Średnia prędkość chodzenia: **5 km/h = ~83 m/min** ✅
- To dobra wartość!

## 🐛 Znalezione bugi i naprawione:

### 1. ✅ **Brak segmentu waiting**
**Problem:** Gdy bus odjeżdża o 08:05, a użytkownik dochodzi o 08:00, nie było dodanego czasu oczekiwania.

**Rozwiązanie:** Dodany segment WALK typu "waiting" z duration = waitTime

### 2. ✅ **Ujemny waitTime**
**Problem:** Gdy użytkownik się spóźnia, waitTime był ujemny ale nie było jasnego errora.

**Rozwiązanie:** Dodany warning: "Missed connection"

### 3. ✅ **totalTransfers zawsze 0**
**Problem:** Zmienna nie była nigdy inkrementowana.

**Rozwiązanie:** Ustawiona na 0 dla direct route (będzie > 0 gdy dodamy multi-hop)

## 🚀 Następne kroki (TODO):

### 1. **Obsługa przesiadek**
Dodaj funkcję `findMultiHopPath` która:
- Szuka tras z 1-2 przesiadkami
- Uwzględnia czas chodzenia między przystankami
- Optymalizuje według totalDuration lub liczby przesiadek

### 2. **Filtrowanie po godzinach**
```typescript
// Obecnie: bierze pierwszą trasę po danej godzinie
// Lepiej: pokaż 3 najbliższe opcje
```

### 3. **Optymalizacja transferów**
```typescript
// Preferuj:
// - Mniej przesiadek (nawet jeśli trwa dłużej)
// - Luźniejsze połączenia (>5 min między transferami)
```

### 4. **Geolokalizacja przystanków**
```typescript
// Dodaj MongoDB geospatial index dla szybszego wyszukiwania
db.Stops.createIndex({ coordinates: "2dsphere" })
```

## 📝 Przykładowe dane do testów

### Dodaj testowy Route z stop_times:

```javascript
// MongoDB
db.Routes.insertOne({
  lineId: ObjectId("..."),  // ID linii Bus 102
  direction: "Test Direction",
  stops: [
    {
      stopId: ObjectId("68e13d3b5b88740f7e7d6fa3"),  // Agatowa
      arrivalTime: "08:00",
      departureTime: "08:02",
      platformNumber: "1"
    },
    {
      stopId: ObjectId("..."),  // Następny przystanek
      arrivalTime: "08:10",
      departureTime: "08:12",
      platformNumber: "2"
    },
    {
      stopId: ObjectId("..."),  // Kolejny
      arrivalTime: "08:20",
      departureTime: "08:22",
      platformNumber: "3"
    }
  ],
  validDays: ["MON", "TUE", "WED", "THU", "FRI"],
  validFrom: "2025-01-01",
  validTo: "2025-12-31"
})
```

## 🎯 Quick Test Commands

```bash
# 1. Sprawdź przystanki
npm run dev
# Następnie GraphiQL: http://localhost:4000/graphql

# 2. Lista przystanków
query {
  stops(transportType: BUS) {
    id
    name
    coordinates { latitude longitude }
  }
}

# 3. Lista linii
query {
  lines(transportType: BUS) {
    id
    name
  }
}

# 4. Test path finding
# (użyj współrzędnych z powyższego query)
```

## ✅ Podsumowanie weryfikacji

| Feature | Status | Notatki |
|---------|--------|---------|
| Walking TO start stop | ✅ | 80m/min, Haversine distance |
| Walking FROM end stop | ✅ | 80m/min |
| Waiting at stop | ✅ | Dodany segment waiting |
| Transit segment | ✅ | Z czasami odjazdu/przyjazdu |
| Walking between stops (transfer) | ❌ | TODO: tylko przy multi-hop |
| Direct connections | ✅ | Działa |
| Multi-hop (przesiadki) | ❌ | TODO |
| Incident warnings | ✅ | Sprawdza Incidents collection |
| Tight connections warning | ✅ | <2 min |
| Total duration | ✅ | Suma wszystkich segmentów |
| Total transfers | ⚠️ | Działa dla direct (0), TODO dla multi-hop |
