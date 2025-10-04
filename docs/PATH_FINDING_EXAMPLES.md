# Path Finding - Example Queries

## Test Query 1: Find path from Central Station to Tech Park

```graphql
query FindPathExample1 {
  findPath(input: {
    startCoordinates: {
      latitude: 52.2297
      longitude: 21.0122
    }
    endCoordinates: {
      latitude: 52.2450
      longitude: 21.0400
    }
    departureTime: "08:00"
    maxWalkingDistance: 500
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

**Expected result:** Walking 0m to Central Station platform 1, then Bus Line 1 departing at 08:02, arriving at Tech Park at 08:35.

---

## Test Query 2: Find path with transfer (University to Old Town)

```graphql
query FindPathWithTransfer {
  findPath(input: {
    startCoordinates: {
      latitude: 52.2356
      longitude: 21.0144
    }
    endCoordinates: {
      latitude: 52.2500
      longitude: 21.0300
    }
    departureTime: "08:10"
    maxWalkingDistance: 800
  }) {
    segments {
      segmentType
      from {
        stopName
      }
      to {
        stopName
      }
      lineName
      departureTime
      arrivalTime
      duration
      platformNumber
    }
    totalDuration
    totalTransfers
    warnings
  }
}
```

**Expected result:** Bus Line 1 from University Campus (08:12) to Business District (08:20), then Tram Line 2 from Business District (08:27) to Old Town Square (08:40).

---

## Test Query 3: Airport Express

```graphql
query AirportExpress {
  findPath(input: {
    startCoordinates: {
      latitude: 52.2297
      longitude: 21.0122
    }
    endCoordinates: {
      latitude: 52.1650
      longitude: 20.9670
    }
    departureTime: "08:00"
  }) {
    segments {
      segmentType
      from {
        stopName
      }
      to {
        stopName
      }
      lineName
      transportType
      departureTime
      arrivalTime
      duration
    }
    totalDuration
  }
}
```

**Expected result:** Rail Express A from Central Station (08:05) directly to Airport Terminal (08:35), 30 minutes total.

---

## List All Stops

```graphql
query ListAllStops {
  stops {
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

---

## List Bus Stops Only

```graphql
query ListBusStops {
  stops(transportType: BUS) {
    id
    name
    coordinates {
      latitude
      longitude
    }
    platformNumbers
  }
}
```

---

## Test with Incident Warning

First, create an incident:

```graphql
mutation CreateIncident {
  carrierMutations {
    create(input: {
      kind: VEHICLE_FAILURE
      description: "Bus Line 1 delayed by 10 minutes"
      lineIds: ["<LINE_1_ID>"]
      lineNames: ["Line 1"]
      vehicleIds: ["<VEHICLE_ID>"]
    }) {
      id
      description
      status
    }
  }
}
```

Then publish it:

```graphql
mutation PublishIncident {
  carrierMutations {
    publish(id: "<INCIDENT_ID>") {
      id
      status
    }
  }
}
```

Now find a path that uses Line 1:

```graphql
query FindPathWithIncident {
  findPath(input: {
    startCoordinates: {
      latitude: 52.2297
      longitude: 21.0122
    }
    endCoordinates: {
      latitude: 52.2450
      longitude: 21.0400
    }
    departureTime: "08:00"
  }) {
    segments {
      segmentType
      lineName
      warnings
    }
    warnings
  }
}
```

**Expected result:** The `warnings` field should contain the incident message about Line 1 being delayed.

---

## Testing with cURL

```bash
# Find path
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { findPath(input: { startCoordinates: { latitude: 52.2297, longitude: 21.0122 }, endCoordinates: { latitude: 52.2450, longitude: 21.0400 }, departureTime: \"08:00\" }) { segments { segmentType, lineName, departureTime, arrivalTime }, totalDuration } }"
  }'
```

---

## Notes

1. **Coordinates are real Warsaw locations** (approximated for demo)
2. **Times are in HH:mm format** (24-hour)
3. **Walking speed** is assumed at 80 meters/minute
4. **maxWalkingDistance** defaults to 500 meters if not specified
5. **Tight connections** (< 2 minutes between arrival and next departure) generate warnings
6. **Incidents** are automatically checked for each line in the journey

---

## Seed Data Command

Before testing, run:

```bash
npm run seed:path
```

This will populate:
- 7 stops (Central Station, University Campus, Old Town Square, Tech Park, Shopping Mall, Airport Terminal, Business District)
- 4 lines (Line 1 Bus, Line 2 Tram, Express A Rail, Metro M1)
- 6 routes with schedules at 08:00 and 09:00
