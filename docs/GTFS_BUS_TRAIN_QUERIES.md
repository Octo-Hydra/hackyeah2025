# Zapytania Bus + Train - Dane GTFS Małopolska

## 🎯 Szybki Start

Po uruchomieniu `npm run import:gtfs:full` będziesz mieć:
- **Autobusy**: Linie A1-A52 (np. A1, A10, A21)
- **Pociągi**: SKA1, SKA2, SKA3, K71, K63, K7P DUNAJEC, K5P LUXTORPEDA
- **Przystanki**: ~5800 (bus + train)

---

## 📍 Przykład 1: Połączenie Pociąg (Wieliczka → Kraków Główny)

**Wieliczka Rynek-Kopalnia** → **Kraków Główny** (linia SKA/K71)

```graphql
query TrainWieliczkaKrakow {
  findPath(
    input: {
      startCoordinates: { latitude: 49.985686, longitude: 20.056641 }
      endCoordinates: { latitude: 50.0683947, longitude: 19.9475035 }
      departureTime: "08:00"
      maxWalkingDistance: 500
    }
  ) {
    totalDuration
    totalDistance
    segments {
      type
      startStopName
      endStopName
      duration
      distance
      lineName
      departureTime
      arrivalTime
      waitingTime
    }
    warnings
  }
}
```

**Oczekiwany wynik**:
- Typ: WALKING + TRANSIT (RAIL)
- Linia: SKA1, SKA2, SKA3 lub K71
- Czas: ~25-30 min
- Dystans: ~18 km

---

## 📍 Przykład 2: Połączenie Autobus (lokalnie w Krakowie)

**Kraków Bieżanów** → **okolice centrum**

```graphql
query BusKrakowBiezanow {
  findPath(
    input: {
      startCoordinates: { latitude: 50.0212, longitude: 20.0297 }
      endCoordinates: { latitude: 50.068, longitude: 19.948 }
      departureTime: "09:00"
      maxWalkingDistance: 500
    }
  ) {
    totalDuration
    totalDistance
    segments {
      type
      startStopName
      endStopName
      duration
      lineName
      transportType
      departureTime
      arrivalTime
    }
    warnings
  }
}
```

**Oczekiwany wynik**:
- Typ: WALKING + TRANSIT (BUS)
- Linia: A1, A2, A10, A21 (zależnie od rozkładu)
- Czas: ~20-30 min

---

## 📍 Przykład 3: 🚌➡️🚆 Multimodal (Bus → Train)

**Wieliczka Park** (autobus) → **Kraków Główny** (pociąg)

```graphql
query BusToTrain {
  findPath(
    input: {
      startCoordinates: { latitude: 49.989, longitude: 20.049 }
      endCoordinates: { latitude: 50.0684, longitude: 19.9475 }
      departureTime: "07:30"
      maxWalkingDistance: 800
    }
  ) {
    totalDuration
    totalDistance
    segments {
      type
      startStopName
      endStopName
      duration
      distance
      lineName
      transportType
      departureTime
      arrivalTime
      waitingTime
    }
    transfersCount
    warnings
  }
}
```

**Oczekiwany wynik**:
- Segmenty:
  1. WALKING (do przystanku autobusu)
  2. TRANSIT BUS (do stacji kolejowej)
  3. WALKING (przejście do peronu)
  4. TRANSIT RAIL (pociąg SKA/K71)
  5. WALKING (do celu)
- Czas całkowity: ~45-60 min

---

## 📍 Przykład 4: 🚆➡️🚌 Multimodal (Train → Bus)

**Miechów** (pociąg) → **lokalny cel** (autobus)

```graphql
query TrainToBus {
  findPath(
    input: {
      startCoordinates: { latitude: 50.3546, longitude: 20.0112 }
      endCoordinates: { latitude: 50.35, longitude: 20.02 }
      departureTime: "14:00"
      maxWalkingDistance: 1000
    }
  ) {
    totalDuration
    totalDistance
    segments {
      type
      startStopName
      endStopName
      duration
      lineName
      transportType
      departureTime
      arrivalTime
    }
    transfersCount
    warnings
  }
}
```

**Oczekiwany wynik**:
- Segmenty:
  1. TRANSIT RAIL (K71)
  2. WALKING (między stacją a przystankiem)
  3. TRANSIT BUS (autobus lokalny)
  4. WALKING (do celu)

---

## 📍 Przykład 5: Długi Spacer (Test Walking Time)

**Kraków Prokocim** → **Kraków Płaszów** (dystans ~2 km)

```graphql
query WalkingTest {
  findPath(
    input: {
      startCoordinates: { latitude: 50.0265, longitude: 19.9989 }
      endCoordinates: { latitude: 50.0350, longitude: 19.9750 }
      departureTime: "10:00"
      maxWalkingDistance: 1500
    }
  ) {
    totalDuration
    totalDistance
    segments {
      type
      startStopName
      endStopName
      duration
      distance
    }
    warnings
  }
}
```

**Test**:
- Sprawdza czy walking time = distance ÷ 80m/min
- Dla 2000m → ~25 minut

---

## 📍 Przykład 6: Przesiadka (Multiple Transfers)

**Wieliczka** → **Kraków Łobzów** (wymaga przesiadki)

```graphql
query MultipleTransfers {
  findPath(
    input: {
      startCoordinates: { latitude: 49.985686, longitude: 20.056641 }
      endCoordinates: { latitude: 50.0819, longitude: 19.9172 }
      departureTime: "08:00"
      maxWalkingDistance: 800
    }
  ) {
    totalDuration
    totalDistance
    segments {
      type
      startStopName
      endStopName
      duration
      distance
      lineName
      transportType
      departureTime
      arrivalTime
      waitingTime
    }
    transfersCount
    warnings
  }
}
```

**Oczekiwany wynik**:
- Segmenty:
  1. WALKING
  2. TRANSIT RAIL (SKA do Krakowa Głównego)
  3. WAITING (oczekiwanie)
  4. WALKING (przejście)
  5. TRANSIT BUS lub RAIL
  6. WALKING
- Ostrzeżenia o ciasnych połączeniach

---

## 🗺️ Współrzędne Quick Reference

### Stacje Kolejowe (RAIL)
```
Wieliczka Rynek-Kopalnia  → 49.985686, 20.056641
Wieliczka Park            → 49.9890933, 20.0494485
Kraków Główny            → 50.0683947, 19.9475035
Kraków Płaszów           → 50.0349845, 19.9750423
Kraków Prokocim          → 50.0265037, 19.9989288
Kraków Łobzów            → 50.0819062, 19.9172491
Kraków Bronowice         → 50.0828134, 19.8919081
Miechów                  → 50.3546514, 20.0112144
Słomniki                 → 50.2483244, 20.0640672
```

### Przystanki Autobusowe (BUS)
```
Abramowice               → 49.7910555, 20.194323
Alwernia Garncarska      → 50.06989, 19.542409
Andrychów Dworzec        → 49.855656, 19.350924
Kraków Bieżanów          → 50.0212218, 20.0296782
```

---

## 🧪 Jak Testować

### 1. Import danych
```bash
npm run import:gtfs:full
```

### 2. Sprawdź czy dane są załadowane
```graphql
query CheckData {
  stops(filter: { limit: 5, transportType: BUS }) {
    id
    name
    transportType
  }
  lines(filter: { limit: 5, transportType: RAIL }) {
    id
    name
    transportType
  }
}
```

### 3. Testuj zapytania
- Zacznij od **Przykład 1** (najprostszy - train only)
- Potem **Przykład 2** (bus only)
- Na końcu **Przykład 3** (multimodal bus+train)

---

## ⚙️ Status Funkcjonalności

### ✅ Zaimplementowane
- Walking time (80m/min = 5 km/h)
- Waiting time segments
- Direct connections
- Haversine distance
- Incident warnings
- Tight connection warnings (<2 min)

### ❌ Do zaimplementowania
- Multi-hop routing (przesiadki między liniami)
- Walking między przystankami podczas przesiadek
- Real schedule matching

---

## 🐛 Rozwiązywanie Problemów

### "No connecting routes found"
➡️ Multi-hop nie jest jeszcze zaimplementowany  
🔧 Użyj tras z bezpośrednim połączeniem

### "Stop not found within walking distance"
➡️ Za mała wartość `maxWalkingDistance`  
🔧 Zwiększ do 800-1000m

### Brak segmentów RAIL
➡️ Import nie załadował train/  
🔧 Sprawdź `import-gtfs-full.ts` i uruchom ponownie import

### Tylko WALKING segments
➡️ Współrzędne poza zasięgiem lub brak rozkładów  
🔧 Użyj współrzędnych z tabeli powyżej

---

## 🎓 Przykładowy Complete Flow

```graphql
# Krok 1: Sprawdź przystanki
query Step1_Stops {
  stops(filter: { limit: 3, transportType: BUS }) {
    id
    name
    transportType
    coordinates { latitude longitude }
  }
}

# Krok 2: Sprawdź linie
query Step2_Lines {
  lines(filter: { limit: 3, transportType: RAIL }) {
    id
    name
    transportType
  }
}

# Krok 3: Znajdź trasę
query Step3_Path {
  findPath(
    input: {
      startCoordinates: { latitude: 49.985686, longitude: 20.056641 }
      endCoordinates: { latitude: 50.0684, longitude: 19.9475 }
      departureTime: "08:00"
      maxWalkingDistance: 500
    }
  ) {
    totalDuration
    segments {
      type
      lineName
      transportType
      duration
    }
  }
}
```

---

## 📊 Spodziewane Rezultaty

Po zaimportowaniu danych GTFS powinieneś zobaczyć:

```
✅ Imported ~200 stops (100 BUS + 100 RAIL)
✅ Imported ~40 lines (20 BUS + 20 RAIL)
✅ Created ~50 routes with schedules
```

Każde zapytanie `findPath` powinno zwrócić:
- **totalDuration**: w minutach
- **totalDistance**: w metrach
- **segments**: array z type (WALKING/TRANSIT/WAITING)
- **warnings**: ostrzeżenia o incydentach/ciasnych połączeniach

---

**Zalecana kolejność testowania**: 1 → 2 → 3 → 5 → 6 → 4
