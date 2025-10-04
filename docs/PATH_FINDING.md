# Path Finding System - MongoDB Collections Setup

## Collections Structure

### 1. Stops Collection
Stores all bus stops and train stations with their geographic locations.

```json
{
  "_id": ObjectId,
  "name": "Central Station",
  "coordinates": {
    "latitude": 52.2297,
    "longitude": 21.0122
  },
  "transportType": "RAIL",
  "platformNumbers": ["1", "2", "3", "4"]
}
```

### 2. Lines Collection
Represents bus/train lines.

```json
{
  "_id": ObjectId,
  "name": "Line 1",
  "transportType": "BUS",
  "routeIds": [ObjectId, ObjectId]
}
```

### 3. Routes Collection
Contains schedules - which stops a line visits and at what times.

```json
{
  "_id": ObjectId,
  "lineId": ObjectId,
  "direction": "A -> B",
  "stops": [
    {
      "stopId": ObjectId,
      "arrivalTime": "08:00",
      "departureTime": "08:02",
      "platformNumber": "1"
    },
    {
      "stopId": ObjectId,
      "arrivalTime": "08:15",
      "departureTime": "08:17",
      "platformNumber": "2"
    }
  ],
  "validDays": ["MON", "TUE", "WED", "THU", "FRI"],
  "validFrom": "2025-01-01",
  "validTo": "2025-12-31"
}
```

### 4. Incidents Collection
Already exists - used to provide warnings about delays/issues.

## GraphQL Usage

### Find Path Query

```graphql
query FindPath {
  findPath(input: {
    startCoordinates: {
      latitude: 52.2297
      longitude: 21.0122
    }
    endCoordinates: {
      latitude: 52.2500
      longitude: 21.0300
    }
    departureTime: "14:30"
    maxWalkingDistance: 800
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

### List Stops

```graphql
query ListStops {
  stops(transportType: BUS) {
    id
    name
    coordinates {
      latitude
      longitude
    }
    transportType
    platformNumbers
  }
}
```

## Algorithm Features

1. **Nearest Stop Finding**: Uses Haversine formula to find closest stops to start/end coordinates
2. **Walking Time Calculation**: Assumes 80m/min walking speed
3. **Route Matching**: Finds routes that connect two stops with appropriate departure times
4. **Transfer Detection**: Identifies when user needs to walk between stops
5. **Incident Integration**: Checks Incidents collection for warnings on the route
6. **Tight Connection Warning**: Alerts if less than 2 minutes between arrival and departure

## Next Steps for Production

1. **Add Multi-leg Journeys**: Current implementation finds direct routes - extend to handle transfers
2. **Implement A* Algorithm**: For optimal multi-stop routing
3. **Real-time Data**: Integrate with real transport APIs for live schedules
4. **Caching**: Cache route calculations for popular origin-destination pairs
5. **Alternative Routes**: Return multiple journey options
6. **Time Windows**: Consider multiple departure times
7. **Accessibility Options**: Add wheelchair-accessible route filtering
8. **Historical Data**: Use past incident data to predict delays
