# Test Query z rzeczywistymi przystankami RAIL

## Przystanki z GTFS train/stops.txt:

1. **WIELICZKA RYNEK-KOPALNIA** - 49.985686, 20.056641
2. **WIELICZKA PARK** - 49.9890933, 20.0494485
3. **WIELICZKA BOGUCICE** - 49.9984505, 20.0366077
4. **KRAKÓW BIEŻANÓW DRÓŻDŻOWNIA** - 50.0101025, 20.0353932
5. **KRAKÓW BIEŻANÓW** - 50.0212218, 20.0296782
6. **KRAKÓW PROKOCIM** - 50.0265037, 19.9989288
7. **KRAKÓW PŁASZÓW** - 50.0349845, 19.9750423
8. **KRAKÓW ZABŁOCIE** - 50.0484386, 19.956833
9. **KRAKÓW GRZEGÓRZKI** - 50.0575341, 19.9479191
10. **KRAKÓW GŁÓWNY** - 50.0683947, 19.9475035
11. **KRAKÓW ŁOBZÓW** - 50.0819062, 19.9172491
12. **KRAKÓW BRONOWICE** - 50.0828134, 19.8919081

## Przykład: Trasa z wieloma przystankami

### Z WIELICZKA RYNEK-KOPALNIA do KRAKÓW GŁÓWNY (10 przystanków)

```graphql
query TestRailMultipleStops {
  findPath(input: {
    from: { latitude: 49.985686, longitude: 20.056641 }  # WIELICZKA RYNEK-KOPALNIA
    to: { latitude: 50.0683947, longitude: 19.9475035 }  # KRAKÓW GŁÓWNY
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
    }
    totalDuration
    warnings
  }
}
```

**Oczekiwany wynik: 9 segmentów** (10 przystanków = 9 połączeń):
1. WIELICZKA RYNEK-KOPALNIA → WIELICZKA PARK
2. WIELICZKA PARK → WIELICZKA BOGUCICE
3. WIELICZKA BOGUCICE → KRAKÓW BIEŻANÓW DRÓŻDŻOWNIA
4. KRAKÓW BIEŻANÓW DRÓŻDŻOWNIA → KRAKÓW BIEŻANÓW
5. KRAKÓW BIEŻANÓW → KRAKÓW PROKOCIM
6. KRAKÓW PROKOCIM → KRAKÓW PŁASZÓW
7. KRAKÓW PŁASZÓW → KRAKÓW ZABŁOCIE
8. KRAKÓW ZABŁOCIE → KRAKÓW GRZEGÓRZKI
9. KRAKÓW GRZEGÓRZKI → KRAKÓW GŁÓWNY

### Z KRAKÓW GŁÓWNY do KRAKÓW BRONOWICE (2 przystanki)

```graphql
query TestShortRoute {
  findPath(input: {
    from: { latitude: 50.0683947, longitude: 19.9475035 }  # KRAKÓW GŁÓWNY
    to: { latitude: 50.0828134, longitude: 19.8919081 }    # KRAKÓW BRONOWICE
  }) {
    segments {
      from { stopName }
      to { stopName }
      transportType
      departureTime
      arrivalTime
    }
  }
}
```

**Oczekiwany wynik: 2 segmenty**:
1. KRAKÓW GŁÓWNY → KRAKÓW ŁOBZÓW
2. KRAKÓW ŁOBZÓW → KRAKÓW BRONOWICE

## Test w GraphiQL

Otwórz: http://localhost:3000/api/graphql

Skopiuj zapytanie z góry i uruchom. Powinieneś zobaczyć **array segmentów** w formacie:

```json
{
  "data": {
    "findPath": {
      "segments": [
        {
          "from": { "stopName": "WIELICZKA RYNEK-KOPALNIA" },
          "to": { "stopName": "WIELICZKA PARK" }
        },
        {
          "from": { "stopName": "WIELICZKA PARK" },
          "to": { "stopName": "WIELICZKA BOGUCICE" }
        },
        {
          "from": { "stopName": "WIELICZKA BOGUCICE" },
          "to": { "stopName": "KRAKÓW BIEŻANÓW DRÓŻDŻOWNIA" }
        }
        // ... i tak dalej dla wszystkich przystanków pośrednich
      ]
    }
  }
}
```

## Uruchom test

```bash
node test-findpath.mjs
```

Skrypt automatycznie pobierze przystanki z bazy i przetestuje format segmentów.
