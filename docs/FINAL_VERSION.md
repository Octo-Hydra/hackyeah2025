# FINAL VERSION - Path Finding

## ✅ Co Zrobiono

1. **Import GTFS** - dodano deduplikację + train routes
2. **Path Finding** - prosty, bez czasu, zwraca listę przystanków

## 🧪 Test

```bash
npm run import:gtfs:full
npm run dev
```

```graphql
query {
  findPath(
    input: {
      startCoordinates: { latitude: 49.985686, longitude: 20.056641 }
      endCoordinates: { latitude: 50.0683947, longitude: 19.9475035 }
      departureTime: "08:00"
    }
  ) {
    segments {
      lineName
      transportType
      distance
      warnings
    }
  }
}
```

## 📊 Rezultat

```json
{
  "lineName": "Train SKA1",
  "transportType": "RAIL",
  "distance": 18500,
  "warnings": [
    "📍 8 stops:",
    "1. WIELICZKA RYNEK-KOPALNIA",
    "...",
    "8. KRAKÓW GŁÓWNY"
  ]
}
```

## 🔍 Debug

Sprawdź terminal (npm run dev):
```
🔍 START: WIELICZKA RYNEK-KOPALNIA
🎯 END: KRAKÓW GŁÓWNY
📊 Routes: 80
✅ FOUND: Train SKA1
```

Sprawdź MongoDB:
```javascript
db.Routes.count()  // ~80
db.Stops.count()   // ~200
```

**Status**: ✅ Gotowe
