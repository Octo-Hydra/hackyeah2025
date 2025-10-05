# Line Name Resolver - GTFS ID Display

## Overview
Custom resolver for the `Line` type that modifies the `name` field display based on transport type:
- **BUS lines**: Display name as-is (e.g., "174")
- **RAIL lines**: Display name with GTFS ID (e.g., "Train (R1)")

## Implementation

### File Created
**`src/backend/resolvers/lineResolvers.ts`**

Custom field resolvers for the `Line` GraphQL type:

```typescript
export const Line = {
  id(parent: LineModel) {
    return parent._id?.toString() || "";
  },

  name(parent: LineModel) {
    // BUS: return name as-is
    if (parent.transportType === "BUS") {
      return parent.name;
    }

    // RAIL: return "name (gtfsId)" if gtfsId exists
    if (parent.transportType === "RAIL" && parent.gtfsId) {
      return `${parent.name} (${parent.gtfsId})`;
    }

    // Fallback: just return name
    return parent.name;
  },

  transportType(parent: LineModel) {
    return parent.transportType;
  },
};
```

### Integration
**Modified: `src/backend/resolvers/index.ts`**

Added Line resolver to the resolvers object:

```typescript
import Line from "./lineResolvers.js";

const resolvers = {
  Query: { ... },
  Mutation: { ... },
  AdminQuery: { ... },
  AdminMutation: { ... },
  Incident,
  Line,  // ← New resolver added
  ...subscriptionResolvers,
};
```

## Database Schema

The `LineModel` interface includes the `gtfsId` field:

```typescript
export interface LineModel {
  _id?: ObjectId | string;
  name: string;
  transportType: TransportType;
  routeIds?: Array<ObjectId | string>;
  gtfsId?: string;  // ← Original GTFS ID from import
}
```

## Examples

### Query
```graphql
query GetLines {
  lines {
    id
    name
    transportType
  }
}
```

### Before (without resolver)
```json
{
  "lines": [
    { "id": "...", "name": "174", "transportType": "BUS" },
    { "id": "...", "name": "Train", "transportType": "RAIL" }
  ]
}
```

### After (with resolver)
```json
{
  "lines": [
    { "id": "...", "name": "174", "transportType": "BUS" },
    { "id": "...", "name": "Train (R1)", "transportType": "RAIL" }
  ]
}
```

## Use Cases

### 1. Line Selection UI
```tsx
// Bus lines display cleanly
<Badge>174</Badge>

// Rail lines show GTFS ID for clarity
<Badge>Train (R1)</Badge>
```

### 2. Incident Reports
```
"Opóźnienie na linii Train (R1)"  // Clear which train line
"Opóźnienie na linii 174"           // Bus number is self-explanatory
```

### 3. Admin Dashboard
Statistics and analytics will automatically show rail lines with their GTFS IDs, making it easier to identify specific train/tram routes.

## Benefits

### ✅ Improved Clarity
- Rail lines often have generic names like "Train" or "Tram"
- GTFS ID (e.g., R1, S2, T3) provides clear identification
- Bus numbers are already distinctive

### ✅ Automatic Application
- Resolver applies automatically to ALL GraphQL queries
- No need to manually append GTFS ID in frontend
- Consistent display across entire application

### ✅ Backwards Compatible
- If `gtfsId` is missing, falls back to plain name
- Bus lines unaffected by the change
- Existing queries work without modification

## Testing

### Test Query
```graphql
{
  lines(transportType: RAIL) {
    id
    name
    transportType
  }
}
```

### Expected Output
All rail lines should show format: `"Train Name (GTFS_ID)"`

### Affected Components
- ✅ `create-incident-form.tsx` - Line selection dropdown
- ✅ `incident-simulator.tsx` - Preset line selection
- ✅ `admin-statistics-dashboard.tsx` - Analytics display
- ✅ All line queries throughout the app

## GTFS Import

The `gtfsId` field is populated during GTFS import:

**`scripts/import-gtfs-full.ts`**
```typescript
{
  name: gtfsLine.route_short_name,
  transportType: gtfsLine.route_type === "3" ? "BUS" : "RAIL",
  gtfsId: gtfsLine.route_id,  // ← Stored here
  routeIds: []
}
```

## Future Enhancements

### Possible Improvements
1. **Customizable Format** - Allow different display formats via GraphQL argument
2. **Short Name Priority** - Use `route_short_name` if available
3. **Line Color** - Add line color from GTFS for visual identification
4. **Line Description** - Include route description in tooltips

### Example Advanced Resolver
```typescript
name(parent: LineModel, args: { format?: "short" | "full" | "gtfs" }) {
  const format = args.format || "default";
  
  switch (format) {
    case "short":
      return parent.name;
    case "full":
      return `${parent.name} (${parent.gtfsId}) - ${parent.description}`;
    case "gtfs":
      return parent.gtfsId || parent.name;
    default:
      // Current implementation
      if (parent.transportType === "RAIL" && parent.gtfsId) {
        return `${parent.name} (${parent.gtfsId})`;
      }
      return parent.name;
  }
}
```

## Notes

- Resolver executes on EVERY GraphQL query that requests the `name` field
- Performance impact is negligible (simple string concatenation)
- No database queries needed (data already loaded)
- Works with both direct queries and nested resolvers (e.g., `incident.lines.name`)
