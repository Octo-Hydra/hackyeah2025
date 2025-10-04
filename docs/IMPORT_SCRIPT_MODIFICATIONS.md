# Import Script Modifications

## Overview
Modified `scripts/import-gtfs-full.ts` to import data from **bus** and **train** folders instead of bus and tram.

## Changes Made

### 1. Stop Import Section (Lines ~230-250)
**Before:**
```typescript
const tramStops = parseCSV<GTFSStop>(
  path.join(process.cwd(), "populate-gtfs", "tram", "stops.txt"),
  CONFIG.MAX_STOPS
);

for (const stop of tramStops) {
  const doc = {
    name: stop.stop_name,
    coordinates: {
      latitude: parseFloat(stop.stop_lat),
      longitude: parseFloat(stop.stop_lon),
    },
    transportType: "TRAM" as const,
    platformNumbers: stop.stop_code ? [stop.stop_code] : [],
    gtfsId: stop.stop_id,
  };
  const result = await db.collection("Stops").insertOne(doc);
  stopsMap.set(stop.stop_id, result.insertedId);
}

console.log(`✅ Imported ${busStops.length + tramStops.length} stops`);
```

**After:**
```typescript
const trainStops = parseCSV<GTFSStop>(
  path.join(process.cwd(), "populate-gtfs", "train", "stops.txt"),
  CONFIG.MAX_STOPS
);

for (const stop of trainStops) {
  const doc = {
    name: stop.stop_name,
    coordinates: {
      latitude: parseFloat(stop.stop_lat),
      longitude: parseFloat(stop.stop_lon),
    },
    transportType: "RAIL" as const,
    platformNumbers: stop.stop_code ? [stop.stop_code] : [],
    gtfsId: stop.stop_id,
  };
  const result = await db.collection("Stops").insertOne(doc);
  stopsMap.set(stop.stop_id, result.insertedId);
}

console.log(`✅ Imported ${busStops.length + trainStops.length} stops`);
```

### 2. Route Import Section (Lines ~265-285)
**Before:**
```typescript
const tramRoutes = parseCSV<GTFSRoute>(
  path.join(process.cwd(), "populate-gtfs", "tram", "routes.txt"),
  CONFIG.MAX_ROUTES
);

for (const route of tramRoutes) {
  const doc = {
    name: `Tram ${route.route_short_name}`,
    transportType: "TRAM" as const,
    gtfsId: route.route_id,
  };
  const result = await db.collection("Lines").insertOne(doc);
  linesMap.set(route.route_id, result.insertedId);
}

console.log(`✅ Imported ${busRoutes.length + tramRoutes.length} lines`);
```

**After:**
```typescript
const trainRoutes = parseCSV<GTFSRoute>(
  path.join(process.cwd(), "populate-gtfs", "train", "routes.txt"),
  CONFIG.MAX_ROUTES
);

for (const route of trainRoutes) {
  const doc = {
    name: `Train ${route.route_short_name}`,
    transportType: "RAIL" as const,
    gtfsId: route.route_id,
  };
  const result = await db.collection("Lines").insertOne(doc);
  linesMap.set(route.route_id, result.insertedId);
}

console.log(`✅ Imported ${busRoutes.length + trainRoutes.length} lines`);
```

### 3. Summary Report (Lines ~325-335)
**Before:**
```typescript
console.log(`Total Stops:           ${busStops.length + tramStops.length}`);
console.log(`Total Lines:           ${busRoutes.length + tramRoutes.length}`);
```

**After:**
```typescript
console.log(`Total Stops:           ${busStops.length + trainStops.length}`);
console.log(`Total Lines:           ${busRoutes.length + trainRoutes.length}`);
```

## Key Changes Summary

| Change Type | Before | After |
|------------|--------|-------|
| **Folder Path** | `populate-gtfs/tram/` | `populate-gtfs/train/` |
| **Variable Names** | `tramStops`, `tramRoutes` | `trainStops`, `trainRoutes` |
| **Transport Type** | `"TRAM" as const` | `"RAIL" as const` |
| **Line Name Prefix** | `Tram ${route.route_short_name}` | `Train ${route.route_short_name}` |

## Files Modified
- ✅ `scripts/import-gtfs-full.ts` (3 sections updated)
- ✅ No changes needed to `scripts/import-gtfs.ts` (doesn't use tram)

## Not Changed
- `getRouteType()` function still includes TRAM type - this is intentional as it's a generic GTFS converter that handles all standard route types (0=Tram, 1=Metro, 2=Rail, 3=Bus)

## Expected Behavior
When running `npm run import:gtfs:full`, the script will now:
1. Import stops from `populate-gtfs/bus/stops.txt` (transportType: "BUS")
2. Import stops from `populate-gtfs/train/stops.txt` (transportType: "RAIL")
3. Import routes from both folders
4. Create schedules with stop times for bus routes only (CONFIG.ENABLE_STOP_TIMES controls this)

## Testing
To test the changes:
```bash
npm run import:gtfs:full
```

Expected output:
```
✅ Connected to MongoDB
🗑️  Clearing existing data...
📍 Importing Stops...
✅ Imported [X] stops
🚌 Importing Lines...
✅ Imported [Y] lines
⏰ Importing Schedules with Stop Times...
✅ Created [Z] bus routes with schedules
============================================================
📊 Full Import Summary:
============================================================
Total Stops:           [X]
Total Lines:           [Y]
Routes with Schedules: [Z]
Stop Times Enabled:    YES ✅
============================================================
✅ Full GTFS import completed!
```

## Compilation Status
- ✅ 0 TypeScript errors
- ✅ All type safety maintained
- ✅ Ready to execute
