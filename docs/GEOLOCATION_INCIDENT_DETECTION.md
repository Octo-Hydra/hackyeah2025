# Geolocation-Based Incident Detection System

## Overview

This system automatically detects which segment (between two stops) is affected when a user reports an incident by providing their GPS coordinates. The system stores this information in a dedicated collection and warns users during route planning when their journey includes affected segments.

## Architecture

### Data Flow

```
User Reports Incident with GPS
         ↓
Geolocation Utils Determine Segment
         ↓
Store in IncidentLocations Collection
         ↓
Query During Route Planning (findPath)
         ↓
Display Warnings in Results
```

## Components

### 1. Data Models (`src/backend/db/collections.ts`)

#### IncidentLocationModel
Tracks active incidents on specific segments between stops.

```typescript
interface IncidentLocationModel {
  incidentId: ObjectId;         // Reference to Incidents collection
  lineId: ObjectId;              // Which transit line is affected
  startStopId: ObjectId;         // First stop of segment
  endStopId: ObjectId;           // Second stop of segment
  severity: "HIGH" | "MEDIUM" | "LOW";
  active: boolean;               // false when resolved
  createdAt: string;
  resolvedAt?: string | null;
}
```

#### Extended IncidentModel
```typescript
interface IncidentModel {
  // ... existing fields ...
  reporterLocation?: Coordinates | null;  // User's GPS when reporting
  affectedSegment?: {                     // Detected segment
    startStopId: ObjectId | string;
    endStopId: ObjectId | string;
    lineId?: ObjectId | string | null;
  } | null;
}
```

#### Extended PathSegment
```typescript
interface PathSegment {
  // ... existing fields ...
  hasIncident?: boolean;                  // Whether this segment has active incidents
  incidentWarning?: string;               // Human-readable incident warning
  incidentSeverity?: "HIGH" | "MEDIUM" | "LOW";
}
```

#### Extended JourneyPath
```typescript
interface JourneyPath {
  // ... existing fields ...
  hasIncidents?: boolean;                 // Whether any segment has incidents
  affectedSegments?: number[];            // Indices of segments with incidents
}
```

### 2. Geolocation Utilities (`src/lib/geolocation-utils.ts`)

Core library for GPS calculations and segment detection.

#### Key Functions

##### `calculateDistance(point1: Coordinates, point2: Coordinates): number`
- Uses Haversine formula for accurate distance calculation
- Returns distance in meters
- Accounts for Earth's curvature

##### `findNearestStop(location: Coordinates, stops: StopModel[], maxDistance?: number): StopModel | null`
- Finds closest stop to a given location
- Default maxDistance: 500m
- Returns null if no stops within range

##### `findTwoNearestStops(location: Coordinates, stops: StopModel[], maxDistance?: number): [StopModel, StopModel] | null`
- Finds two closest stops to location
- Returns stops in ascending order by distance
- Returns null if fewer than 2 stops within range

##### `determineIncidentSegment(reporterLocation: Coordinates, stops: StopModel[], maxDistance?: number): IncidentSegment | null`
- Main function for segment detection
- Finds two nearest stops
- Validates location is on the line between stops
- Returns confidence level based on distances

**Confidence Levels:**
- **HIGH**: Average distance < 200m
- **MEDIUM**: Average distance < 500m (default maxDistance)
- **LOW**: Average distance ≥ 500m

**Algorithm:**
1. Find two nearest stops to reporter location
2. Calculate perpendicular distance to line segment between stops
3. Check if location is geometrically between the stops
4. Return segment with confidence level

##### `isLocationBetweenStops(location: Coordinates, stop1: StopModel, stop2: StopModel, maxDistanceFromLine?: number): boolean`
- Validates that location is on the line between two stops
- Calculates perpendicular distance to line segment
- Default maxDistanceFromLine: 100m (allows for street/track offset)

##### `formatIncidentSegment(segment: IncidentSegment): string`
- Formats segment information for logging/display
- Example: "Stop1 → Stop2 (HIGH confidence)"

### 3. GraphQL Schema (`src/backend/schema.graphql`)

#### New Types

```graphql
type IncidentSegment {
  startStopId: ID!
  endStopId: ID!
  lineId: ID
  confidence: SegmentConfidence!
  distanceToStart: Float
  distanceToEnd: Float
}

enum SegmentConfidence {
  HIGH
  MEDIUM
  LOW
}

enum IncidentSeverity {
  HIGH
  MEDIUM
  LOW
}
```

#### Extended Input

```graphql
input CreateReportInput {
  # ... existing fields ...
  reporterLocation: CoordinatesInput  # User's GPS when reporting
}
```

#### Extended Types

```graphql
type Incident {
  # ... existing fields ...
  reporterLocation: Coordinates
  affectedSegment: IncidentSegment
}

type PathSegment {
  # ... existing fields ...
  hasIncident: Boolean!
  incidentWarning: String
  incidentSeverity: IncidentSeverity
}

type JourneyPath {
  # ... existing fields ...
  hasIncidents: Boolean!
  affectedSegments: [Int!]!
}
```

### 4. Mutation Resolver (`src/backend/resolvers/userMutation.ts`)

#### createReport Mutation

**Flow:**
1. Receive incident report with optional `reporterLocation`
2. If location provided:
   - Fetch all stops from database
   - Call `determineIncidentSegment(reporterLocation, stops, 1000m)`
   - If segment detected with confidence ≠ LOW:
     - Store `affectedSegment` in IncidentModel
     - Create `IncidentLocationModel` record
     - Set severity based on incidentClass:
       - CLASS_1 → HIGH severity
       - CLASS_2 → MEDIUM severity
3. Return incident with segment information

**Example Usage:**
```graphql
mutation {
  createReport(input: {
    title: "Bus breakdown"
    description: "Bus stopped on route"
    kind: VEHICLE_FAILURE
    lineIds: ["line123"]
    reporterLocation: {
      latitude: 52.2297
      longitude: 21.0122
    }
  }) {
    id
    affectedSegment {
      startStopId
      endStopId
      confidence
    }
  }
}
```

### 5. Path Resolver (`src/backend/resolvers/pathResolversSimple.ts`)

#### findPath Query

**Enhanced Flow:**
1. Find route between start and end stops
2. For each segment between consecutive stops:
   - Call `getActiveIncidentsForSegment(db, lineId, stopId1, stopId2)`
   - Check both directions (stop1→stop2 and stop2→stop1)
   - If incident found:
     - Set `hasIncident = true`
     - Add incident warning with severity emoji
     - Set `incidentSeverity`
3. Return path with:
   - `hasIncidents` flag
   - `affectedSegments` array (indices)
   - Warnings in each affected segment

**Helper Function:**
```typescript
async function getActiveIncidentsForSegment(
  db: Db,
  lineId: ObjectId,
  stopId1: ObjectId,
  stopId2: ObjectId
): Promise<IncidentLocationModel | null>
```

**Example Output:**
```json
{
  "segments": [
    {
      "from": { "stopName": "Central Station" },
      "to": { "stopName": "Market Square" },
      "hasIncident": true,
      "incidentWarning": "🚨 Incident between Central Station and Market Square",
      "incidentSeverity": "HIGH",
      "warnings": [
        "📍 5 stops on route:",
        "  1. Central Station",
        "  2. City Hall",
        "  3. Market Square",
        "",
        "⚠️ INCIDENTS ON THIS ROUTE:",
        "🚨 Incident between Central Station and City Hall"
      ]
    }
  ],
  "hasIncidents": true,
  "affectedSegments": [0]
}
```

## Severity Emoji Mapping

- **HIGH**: 🚨 (CLASS_1 incidents: VEHICLE_FAILURE, NETWORK_FAILURE, PEDESTRIAN_ACCIDENT)
- **MEDIUM**: ⚠️ (CLASS_2 incidents: other types)
- **LOW**: ℹ️ (fallback)

## Database Collections

### Incidents
```javascript
db.Incidents.insertOne({
  title: "Bus breakdown",
  kind: "VEHICLE_FAILURE",
  incidentClass: "CLASS_1",
  lineIds: [ObjectId("...")],
  reporterLocation: { latitude: 52.2297, longitude: 21.0122 },
  affectedSegment: {
    startStopId: ObjectId("..."),
    endStopId: ObjectId("..."),
    lineId: ObjectId("...")
  },
  createdAt: "2025-01-15T10:30:00Z"
})
```

### IncidentLocations
```javascript
db.IncidentLocations.insertOne({
  incidentId: ObjectId("..."),
  lineId: ObjectId("..."),
  startStopId: ObjectId("..."),
  endStopId: ObjectId("..."),
  severity: "HIGH",
  active: true,
  createdAt: "2025-01-15T10:30:00Z",
  resolvedAt: null
})
```

## Testing

### Test Scenario 1: Report Incident with Location

```graphql
mutation {
  createReport(input: {
    title: "Vehicle breakdown"
    kind: VEHICLE_FAILURE
    lineIds: ["67872ce2e7c8de97c2d5c89f"]  # Line ID
    reporterLocation: {
      latitude: 52.2297
      longitude: 21.0122
    }
  }) {
    id
    affectedSegment {
      startStopId
      endStopId
      confidence
    }
  }
}
```

**Expected Result:**
- System finds 2 nearest stops
- Determines segment with confidence level
- Creates IncidentLocation record
- Returns incident with affected segment

### Test Scenario 2: Find Path with Incidents

```graphql
query {
  findPath(input: {
    from: { latitude: 52.2297, longitude: 21.0122 }
    to: { latitude: 52.2396, longitude: 21.0196 }
    departureTime: "10:00"
  }) {
    segments {
      from { stopName }
      to { stopName }
      hasIncident
      incidentWarning
      incidentSeverity
    }
    hasIncidents
    affectedSegments
  }
}
```

**Expected Result:**
- System checks each segment for active incidents
- Returns warnings for affected segments
- Sets hasIncidents flag
- Lists affected segment indices

## Edge Cases Handled

1. **No stops nearby**: Returns null from `determineIncidentSegment`
2. **Only 1 stop nearby**: Returns null (need 2 stops for segment)
3. **Location too far from line**: Returns LOW confidence or null
4. **No lineId provided**: Still stores segment but with lineId=null
5. **Incident resolved**: `active=false` in IncidentLocations, not returned in queries
6. **Bidirectional segments**: Checks both stop1→stop2 and stop2→stop1

## Performance Considerations

1. **Stop fetching**: All stops loaded once per report (could be optimized with spatial index)
2. **Distance calculations**: O(n) for n stops, acceptable for typical city datasets (<10,000 stops)
3. **Path queries**: One additional query per segment to check incidents
4. **Caching**: Consider caching active incidents for frequently queried routes

## Future Enhancements

1. **Spatial indexing**: Use MongoDB geospatial queries for faster nearest stop lookup
2. **Incident resolution**: Add mutation to mark incidents as resolved
3. **Alternative routes**: Suggest routes avoiding affected segments
4. **Real-time updates**: Push notifications when user's active journey is affected
5. **Incident visualization**: Show incidents on map interface
6. **Historical data**: Track incident patterns for predictive analysis
7. **Confidence threshold**: Filter segments by confidence level in queries
8. **Multi-segment incidents**: Handle incidents affecting multiple consecutive segments
9. **Time-based incidents**: Specify duration or auto-expire incidents

## API Summary

### Mutations
- `createReport(input: CreateReportInput!)` - Create incident with optional location

### Queries
- `findPath(input: FindPathInput!)` - Find route with incident warnings

### Helper Functions
- `determineIncidentSegment()` - Detect segment from GPS
- `getActiveIncidentsForSegment()` - Query incidents on segment
- `calculateDistance()` - Haversine distance calculation
- `isLocationBetweenStops()` - Validate location on line

## Logs

The system logs important events:

```
📍 Reporter location: 52.2297, 21.0122
✅ Detected incident segment: Central Station → Market Square (HIGH confidence)
✅ Created IncidentLocation for line 67872ce2e7c8de97c2d5c89f between stops
```

## Integration with Frontend

Frontend should:
1. Request user's GPS location when creating incident
2. Display warnings in route results with appropriate severity styling
3. Show affected segments on map
4. Allow users to report location or select stops manually
5. Provide option to find alternative routes

**Example Frontend Code:**
```typescript
// Get user location
navigator.geolocation.getCurrentPosition((position) => {
  const reporterLocation = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude
  };
  
  // Create report with location
  createReport({
    variables: {
      input: {
        title: "Bus breakdown",
        kind: "VEHICLE_FAILURE",
        reporterLocation
      }
    }
  });
});

// Display warnings
{path.hasIncidents && (
  <Alert severity="warning">
    This route has {path.affectedSegments.length} affected segment(s)
  </Alert>
)}

{path.segments.map((segment, idx) => (
  <div key={idx}>
    {segment.hasIncident && (
      <div className={`incident ${segment.incidentSeverity?.toLowerCase()}`}>
        {segment.incidentWarning}
      </div>
    )}
  </div>
))}
```

## Summary

This geolocation-based incident detection system provides:
- ✅ Automatic segment detection from GPS coordinates
- ✅ Confidence scoring based on distance and geometry
- ✅ Storage of incident-segment mappings
- ✅ Real-time warnings during route planning
- ✅ Severity-based prioritization
- ✅ Bidirectional segment matching
- ✅ Type-safe GraphQL API

The system enhances user experience by providing location-aware incident reporting and intelligent route warnings based on real-time transit conditions.
