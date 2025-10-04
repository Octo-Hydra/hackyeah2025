# GTFS Import Guide

## Overview

This script imports GTFS (General Transit Feed Specification) data into your MongoDB database. It's designed to be lightweight and configurable, importing only essential data for the path-finding system.

## Quick Start

```bash
npm run import:gtfs
```

## Configuration

Edit the `CONFIG` object in `scripts/import-gtfs.ts`:

```typescript
const CONFIG = {
  MAX_STOPS: 100,           // Number of stops per transport type
  MAX_ROUTES_PER_TYPE: 10,  // Max routes (lines) to import
  MAX_TRIPS_PER_ROUTE: 5,   // Max trips per route
  SAMPLE_HOURS: ["06", "07", "08", "09", "14", "15", "16", "17"]
};
```

## What Gets Imported

### 1. Stops
From `stops.txt`:
- `stop_name` → MongoDB `name`
- `stop_lat/stop_lon` → MongoDB `coordinates`
- `stop_code` → MongoDB `platformNumbers`
- Transport type (BUS or TRAM)
- Original `gtfsId` for reference

**MongoDB Schema:**
```typescript
{
  name: string,
  coordinates: { latitude: number, longitude: number },
  transportType: "BUS" | "TRAM",
  platformNumbers: string[],
  gtfsId: string  // Original GTFS stop_id
}
```

### 2. Lines (Routes)
From `routes.txt`:
- `route_short_name` → MongoDB `name`
- `route_type` → MongoDB `transportType`
- Original `gtfsId` for reference

**MongoDB Schema:**
```typescript
{
  name: string,              // e.g., "Bus 102", "Tram 4"
  transportType: "BUS" | "TRAM" | "RAIL" | "METRO",
  gtfsId: string            // Original GTFS route_id
}
```

### 3. Routes (Schedules)
From `trips.txt`:
- Trip direction and headsign
- Valid days (MON-FRI for buses, MON-SUN for trams)
- Date range

**MongoDB Schema:**
```typescript
{
  lineId: ObjectId,          // Reference to Lines collection
  direction: string,         // e.g., "Bielany"
  stops: [],                 // Array of ScheduleStopModel (currently empty)
  validDays: string[],       // ["MON", "TUE", "WED", "THU", "FRI"]
  validFrom: string,         // "2025-01-01"
  validTo: string,           // "2025-12-31"
  gtfsTripId: string        // Original GTFS trip_id
}
```

## GTFS File Structure

Your GTFS data should be in:
```
populate-gtfs/
  bus/
    stops.txt
    routes.txt
    trips.txt
    stop_times.txt  (optional for full import)
  tram/
    stops.txt
    routes.txt
    trips.txt
    stop_times.txt  (optional for full import)
```

## Current Limitations

### 1. **Stop Times Not Imported**
The `stops` array in Routes is currently empty. This is because `stop_times.txt` is very large (50MB+).

**To enable full import:**
1. Add proper CSV parsing for large files (streaming)
2. Parse `stop_times.txt` for each trip
3. Populate `stops` array with:
   ```typescript
   {
     stopId: ObjectId,        // Reference to Stops collection
     arrivalTime: "08:15",    // HH:mm format
     departureTime: "08:17",  // HH:mm format
     platformNumber: "2"
   }
   ```

### 2. **Limited Sample Size**
Default limits:
- 100 stops per type (out of 3000+)
- 10 routes per type (out of 100+)
- 5 trips per route (out of 1000+)

**Why?** To keep database small and fast for development/testing.

## Extending the Import

### Option 1: Increase Limits
```typescript
const CONFIG = {
  MAX_STOPS: Infinity,        // Import all stops
  MAX_ROUTES_PER_TYPE: Infinity,
  MAX_TRIPS_PER_ROUTE: Infinity,
};
```

### Option 2: Add Stop Times
Uncomment and implement the stop_times parsing section:

```typescript
// Read stop_times.txt for this trip
const stopTimesFile = path.join(
  process.cwd(), 
  "populate-gtfs", 
  transportType, 
  "stop_times.txt"
);

// Use streaming parser for large files
const stopTimes = parseStopTimesForTrip(stopTimesFile, trip.trip_id);

const stops = stopTimes.map(st => ({
  stopId: stopsMap.get(st.stop_id),
  arrivalTime: normalizeTime(st.arrival_time),
  departureTime: normalizeTime(st.departure_time),
  platformNumber: st.stop_headsign
}));

routeDoc.stops = stops;
```

### Option 3: Add More GTFS Fields

**Calendar/Calendar Dates:**
Currently uses hardcoded valid days. Import `calendar.txt` to get actual service dates.

**Shapes:**
Import `shapes.txt` to get route geometry for map visualization.

**Agency:**
Import `agency.txt` for operator information.

## GTFS Route Types

The script converts GTFS route types to your schema:

| GTFS Type | Description | Your Type |
|-----------|-------------|-----------|
| 0 | Tram | TRAM |
| 1 | Metro | METRO |
| 2 | Rail | RAIL |
| 3 | Bus | BUS |

## Testing the Import

After importing, test with GraphQL:

```graphql
query TestImport {
  stops(transportType: BUS) {
    id
    name
    coordinates {
      latitude
      longitude
    }
  }
  
  lines(transportType: BUS) {
    id
    name
  }
}
```

## Troubleshooting

### "Files above 50MB cannot be synchronized"
This is VS Code limitation for `stop_times.txt`. Solutions:
1. Use streaming parser (not file sync)
2. Process file outside VS Code workspace
3. Split file into smaller chunks

### "No stops found"
Check GTFS file paths in script match your actual structure.

### "Cannot find module 'csv-parse'"
Script uses built-in CSV parser. If you need better CSV handling:
```bash
npm install csv-parse
```
Then uncomment the `csv-parse` import.

## Performance Tips

1. **Use indexes:** After import, create indexes on frequently queried fields:
   ```javascript
   db.Stops.createIndex({ gtfsId: 1 })
   db.Lines.createIndex({ gtfsId: 1 })
   db.Routes.createIndex({ lineId: 1 })
   ```

2. **Batch inserts:** For full import, use `insertMany` instead of individual inserts

3. **Stream processing:** For stop_times.txt, use streaming CSV parser

## Full Production Import Checklist

- [ ] Increase CONFIG limits to Infinity
- [ ] Implement stop_times parsing with streaming
- [ ] Add calendar/calendar_dates for valid dates
- [ ] Add shapes for route visualization
- [ ] Create database indexes
- [ ] Add error handling for malformed data
- [ ] Add progress bars for large imports
- [ ] Validate data integrity after import
- [ ] Add incremental update support (don't clear all data)
