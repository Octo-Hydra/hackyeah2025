# Path Finding - Prosta Wersja (Przystanki na Trasie)

## 🎯 Cel

Znaleźć **wszystkie przystanki na trasie** między punktem A i B, pokazując:
- Jaką linią jechać
- Przez które przystanki przejedziesz
- Jaki dystans i czas
- Godziny przyjazdu/odjazdu z każdego przystanku

---

## 📋 Algorytm

### Krok 1: Znajdź Najbliższe Przystanki
```typescript
const startStop = await findNearestStop(db, startCoordinates, 50000); // 50km radius
const endStop = await findNearestStop(db, endCoordinates, 50000);
```

### Krok 2: Przeszukaj Wszystkie Routes
```typescript
const allRoutes = await db.collection("Routes").find({}).toArray();

for (const route of allRoutes) {
  // Znajdź indeks startStop w route.stops
  // Znajdź indeks endStop w route.stops
  // Jeśli oba znalezione i startIndex < endIndex → VALID ROUTE
}
```

### Krok 3: Zbierz Wszystkie Przystanki na Trasie
```typescript
for (let i = fromIndex; i <= toIndex; i++) {
  const stop = await db.collection("Stops").findOne({ _id: route.stops[i].stopId });
  stopsOnPath.push({
    name: stop.name,
    arrivalTime: route.stops[i].arrivalTime,
    departureTime: route.stops[i].departureTime,
    coordinates: stop.coordinates,
  });
}
```

### Krok 4: Oblicz Dystans
```typescript
let totalDistance = 0;
for (let i = 0; i < stopsOnPath.length - 1; i++) {
  totalDistance += calculateDistance(
    stopsOnPath[i].coordinates,
    stopsOnPath[i + 1].coordinates
  );
}
```

---

## 📊 Przykład Odpowiedzi

```json
{
  "data": {
    "findPath": {
      "totalDuration": 25,
      "segments": [
        {
          "duration": 25,
          "distance": 18500,
          "lineName": "Train SKA1",
          "departureTime": "08:05",
          "arrivalTime": "08:30",
          "warnings": [
            "Route passes through 8 stops:",
            "  1. WIELICZKA RYNEK-KOPALNIA (arr: 08:05, dep: 08:05)",
            "  2. WIELICZKA PARK (arr: 08:08, dep: 08:08)",
            "  3. KRAKÓW BIEŻANÓW (arr: 08:12, dep: 08:12)",
            "  4. KRAKÓW PROKOCIM (arr: 08:15, dep: 08:16)",
            "  5. KRAKÓW PŁASZÓW (arr: 08:20, dep: 08:21)",
            "  6. KRAKÓW ZABŁOCIE (arr: 08:25, dep: 08:25)",
            "  7. KRAKÓW GRZEGÓRZKI (arr: 08:28, dep: 08:28)",
            "  8. KRAKÓW GŁÓWNY (arr: 08:30, dep: 08:30)"
          ]
        }
      ],
      "warnings": []
    }
  }
}
```

---

## 🧪 Test Query

```graphql
query ShowStopsOnRoute {
  findPath(
    input: {
      startCoordinates: { latitude: 49.985686, longitude: 20.056641 }
      endCoordinates: { latitude: 50.0683947, longitude: 19.9475035 }
      departureTime: "08:00"
    }
  ) {
    totalDuration
    segments {
      duration
      distance
      lineName
      transportType
      departureTime
      arrivalTime
      warnings  # <-- Tu będą wszystkie przystanki!
    }
    warnings
  }
}
```

---

## 🔧 Debug Console Logs

Dodałem console.log do debugowania:

```typescript
console.log(`🔍 Searching for path from ${startStop.name} to ${endStop.name}`);
console.log(`📊 Total routes in DB: ${allRoutes.length}`);
console.log(`✅ Found route: ${line.name} with ${stopsOnPath.length} stops`);
console.log(`📍 Found ${validRoutes.length} valid routes`);
```

Sprawdź terminal gdzie uruchomiłeś `npm run dev` żeby zobaczyć te logi.

---

## 🐛 Możliwe Problemy

### 1. "No direct route found"
**Przyczyna**: Routes w bazie NIE MAJĄ stop_times  
**Sprawdź**:
```javascript
// W MongoDB
db.Routes.findOne()

// Czy route.stops ma arrivalTime i departureTime?
{
  stops: [
    {
      stopId: ObjectId("..."),
      arrivalTime: "08:05",      // <-- MUSI BYĆ!
      departureTime: "08:05",    // <-- MUSI BYĆ!
      stopSequence: 1
    }
  ]
}
```

**Rozwiązanie**:
```bash
# Upewnij się że CONFIG.ENABLE_STOP_TIMES = true
# W scripts/import-gtfs-full.ts:
const CONFIG = {
  ENABLE_STOP_TIMES: true,  // <-- MUSI BYĆ TRUE
  ...
}

# Uruchom ponownie import
npm run import:gtfs:full
```

### 2. Routes są puste
**Sprawdź**:
```javascript
db.Routes.count()  // Jeśli 0 → import nie zadziałał
db.Stops.count()   // Powinno być ~200
db.Lines.count()   // Powinno być ~40
```

### 3. StopId nie pasuje
**Problem**: Route.stops[i].stopId to string, ale Stop._id to ObjectId  
**Rozwiązanie**: Kod już obsługuje konwersję:
```typescript
const stopIdStr = typeof stopId === "string" ? stopId : stopId.toString();
```

---

## 📈 Co Pokazuje

Dla zapytania Wieliczka → Kraków Główny pokazuje:

1. **Segment TRANSIT**:
   - Linia: "Train SKA1" 
   - Departure: "08:05"
   - Arrival: "08:30"
   - Duration: 25 min
   - Distance: ~18500m

2. **W warnings - LISTA PRZYSTANKÓW**:
   ```
   Route passes through 8 stops:
     1. WIELICZKA RYNEK-KOPALNIA (arr: 08:05, dep: 08:05)
     2. WIELICZKA PARK (arr: 08:08, dep: 08:08)
     3. KRAKÓW BIEŻANÓW (arr: 08:12, dep: 08:12)
     ...
     8. KRAKÓW GŁÓWNY (arr: 08:30, dep: 08:30)
   ```

3. **Jeśli jest więcej tras**:
   ```
   Found 3 alternative routes. Showing the first one.
   Other lines available: Train SKA2, Train K71
   ```

---

## ✅ Podsumowanie

### Co Robi
1. ✅ Znajduje najbliższe przystanki do start/end
2. ✅ Szuka Routes które zawierają OBA przystanki
3. ✅ Wyciąga WSZYSTKIE przystanki między start a end
4. ✅ Pokazuje arrivalTime i departureTime dla każdego
5. ✅ Oblicza dystans sumując odległości między przystankami
6. ✅ Pokazuje nazwę linii i typ transportu

### Co Pokazuje w Warnings
- Lista wszystkich przystanków na trasie
- Godziny przyjazdu/odjazdu z każdego
- Alternatywne linie (jeśli są)

### Wymagania
- ✅ Routes MUSZĄ mieć stop_times (arrivalTime, departureTime)
- ✅ CONFIG.ENABLE_STOP_TIMES = true w import-gtfs-full.ts
- ✅ Uruchom `npm run import:gtfs:full`

---

**Status**: ✅ Gotowe  
**Next**: Uruchom `npm run dev` i testuj query
