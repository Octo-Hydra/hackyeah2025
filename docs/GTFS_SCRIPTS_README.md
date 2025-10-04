# GTFS Import Scripts

## 📦 Dwa warianty importu

### 1. **import-gtfs.ts** - Okrojona wersja (szybka)
Importuje tylko podstawowe dane bez rozkładów jazdy.

```bash
npm run import:gtfs
```

**Co importuje:**
- ✅ Przystanki (Stops) - 100 na typ transportu
- ✅ Linie (Lines) - 10 na typ
- ✅ Trasy (Routes) - bez szczegółowego rozkładu
- ⏱️ Czas: ~5 sekund

**Idealne dla:**
- Szybkiego testowania
- Developmentu
- Gdy nie potrzebujesz pełnych rozkładów

### 2. **import-gtfs-full.ts** - Pełna wersja (wolniejsza)
Importuje kompletne rozkłady jazdy z godzinami na każdym przystanku.

```bash
npm run import:gtfs:full
```

**Co importuje:**
- ✅ Przystanki - 200 na typ
- ✅ Linie - 20 na typ
- ✅ Trasy z pełnymi rozkładami (stop_times)
- ⏱️ Czas: ~30-60 sekund (zależy od rozmiaru stop_times.txt)

**Idealne dla:**
- Produkcji
- Testowania path-finding z prawdziwymi danymi
- Pełnej funkcjonalności

## 🎛️ Konfiguracja

### import-gtfs.ts (okrojona)
```typescript
const CONFIG = {
  MAX_STOPS: 100,           // Liczba przystanków
  MAX_ROUTES_PER_TYPE: 10,  // Liczba linii
  MAX_TRIPS_PER_ROUTE: 5,   // Liczba kursów
};
```

### import-gtfs-full.ts (pełna)
```typescript
const CONFIG = {
  ENABLE_STOP_TIMES: true,    // Włącz import godzin
  MAX_STOPS: 200,
  MAX_ROUTES: 20,
  MAX_TRIPS_WITH_TIMES: 50,   // Kursy z pełnymi rozkładami
  SAMPLE_HOURS: ["06", "07", "08", "09", "14", "15", "16", "17"],
};
```

## 📁 Struktura plików GTFS

Umieść pliki w:
```
populate-gtfs/
  bus/
    agency.txt
    routes.txt
    stops.txt
    trips.txt
    stop_times.txt    ← Wymagane dla pełnego importu
  tram/
    agency.txt
    routes.txt
    stops.txt
    trips.txt
    stop_times.txt    ← Wymagane dla pełnego importu
```

## 🎯 Przykład użycia

### 1. Szybki start z przykładowymi danymi
```bash
npm run seed:path
```
Używa testowych danych z `seed-path-data.ts`

### 2. Import okrojonej wersji GTFS
```bash
npm run import:gtfs
```

### 3. Import pełnej wersji GTFS
```bash
npm run import:gtfs:full
```

## 📊 Porównanie

| Feature | import-gtfs | import-gtfs-full |
|---------|-------------|------------------|
| Przystanki | 100/typ | 200/typ |
| Linie | 10/typ | 20/typ |
| Rozkłady jazdy | ❌ Puste | ✅ Pełne z godzinami |
| stop_times.txt | ❌ Nie używa | ✅ Parsuje streaming |
| Czas importu | ~5s | ~30-60s |
| Wielkość DB | ~1MB | ~5-10MB |
| Użycie | Development | Production |

## 🔧 Rozszerzanie

### Zwiększ limity (więcej danych)
```typescript
const CONFIG = {
  MAX_STOPS: Infinity,      // Importuj wszystkie
  MAX_ROUTES: Infinity,
  MAX_TRIPS_WITH_TIMES: Infinity,
};
```

### Dodaj więcej pól GTFS
Edytuj funkcję `parseCSV` aby importować dodatkowe pola:
- `route_color` - kolor linii
- `route_long_name` - pełna nazwa
- `wheelchair_accessible` - dostępność
- `stop_desc` - opis przystanku

### Filtruj po godzinach
```typescript
SAMPLE_HOURS: ["06", "07", "08"] // Tylko poranne kursy
```

## 🧪 Testowanie po imporcie

```graphql
query TestGTFS {
  stops(transportType: BUS) {
    id
    name
    coordinates { latitude longitude }
  }
  
  lines(transportType: TRAM) {
    id
    name
  }
}
```

## ⚠️ Troubleshooting

### "Cannot read stop_times.txt"
Plik jest za duży (>50MB). To normalne - skrypt używa streaming parsera.

### "No stops imported"
Sprawdź ścieżki do plików GTFS w CONFIG.

### Import trwa bardzo długo
- Zmniejsz `MAX_TRIPS_WITH_TIMES`
- Wyłącz `ENABLE_STOP_TIMES`
- Użyj `import:gtfs` zamiast `import:gtfs:full`

## 📈 Performance

### Optymalizacja dla dużych danych:

1. **Indexy MongoDB:**
```javascript
db.Stops.createIndex({ gtfsId: 1 })
db.Lines.createIndex({ gtfsId: 1 })
db.Routes.createIndex({ lineId: 1 })
```

2. **Batch inserts:**
Zbieraj dokumenty i wstawiaj przez `insertMany()` zamiast pojedynczo.

3. **Streaming:**
Dla stop_times.txt używamy `readline` streaming - nie ładujemy całego pliku do pamięci.

## 🚀 Roadmap

- [ ] Import calendar.txt dla dokładnych dat
- [ ] Import shapes.txt dla wizualizacji tras
- [ ] Incremental updates (nie usuwaj wszystkiego)
- [ ] Progress bar dla długich importów
- [ ] Walidacja danych po imporcie
- [ ] Export do JSON dla backupu
