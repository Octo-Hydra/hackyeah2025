# GraphQL Client - Quick Reference

## Import

```typescript
import {
  queries,
  mutations,
  thunderClient,
  chainClient,
  graphqlClient,
} from "@/lib/graphql-client";
import type { ValueTypes } from "@/zeus";
```

## Queries

### Get Current User

```typescript
const { me } = await queries.getCurrentUser();
// Returns: { id, name, email, role, twoFactorEnabled, createdAt, updatedAt }
```

### Check 2FA Status

```typescript
const { check2FAStatus } = await queries.check2FAStatus("username");
// Returns: { requires2FA, userExists }
```

### Custom Query (Thunder)

```typescript
const result = await thunderClient("query")({
  me: {
    id: true,
    name: true,
    email: true,
  },
});
```

### Custom Query (Chain)

```typescript
const result = await chainClient("query")({
  me: {
    id: true,
    name: true,
  },
});
```

## Mutations

### Register User

```typescript
const result = await mutations.register({
  name: "John Doe",
  email: "john@example.com",
  password: "password123",
});
// Returns: { success, message, userId }
```

### Verify Email

```typescript
const result = await mutations.verifyEmail("token-here");
// Returns: { success, message }
```

### Setup 2FA

```typescript
const result = await mutations.setup2FA();
// Returns: { secret, qrCode }
```

### Verify 2FA

```typescript
const result = await mutations.verify2FA("123456", "secret");
// Returns: { success, message }
```

### Disable 2FA

```typescript
const result = await mutations.disable2FA();
// Returns: { success, message }
```

### Create Incident Report

```typescript
const result = await mutations.createIncidentReport({
  title: "Bus Delay",
  description: "Delayed by 15 minutes",
  kind: "TRAFFIC_JAM",
  lineIds: ["line-1", "line-2"],
});
// Returns: Incident object
```

### Save Draft

```typescript
const result = await mutations.saveDraft({
  title: "Draft Report",
  kind: "INCIDENT",
  status: "DRAFT",
  lineIds: [],
});
// Returns: Incident object
```

### Update Report

```typescript
const result = await mutations.updateIncidentReport("report-id", {
  title: "Updated Title",
  status: "RESOLVED",
});
// Returns: Incident object
```

### Delete Report

```typescript
const result = await mutations.deleteIncidentReport("report-id");
// Returns: { success, message }
```

### Publish Report

```typescript
const result = await mutations.publishIncidentReport("report-id");
// Returns: Incident object
```

## Error Handling

```typescript
try {
  const result = await queries.getCurrentUser();
} catch (error) {
  const message = graphqlClient.handleGraphQLError(error);
  console.error(message);
}
```

## React Component Example

```typescript
"use client";

import { useState, useEffect } from "react";
import { queries } from "@/lib/graphql-client";

export function MyComponent() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    queries.getCurrentUser().then(result => {
      setUser(result.me);
    });
  }, []);

  return <div>{user?.name}</div>;
}
```

## React Hook Example

```typescript
function useCurrentUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    queries
      .getCurrentUser()
      .then((result) => setUser(result.me))
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}
```

## Server Component Example

```typescript
import { queries } from "@/lib/graphql-client";

export default async function Page() {
  const { me } = await queries.getCurrentUser();
  return <div>Welcome, {me?.name}!</div>;
}
```

## API Route Example

```typescript
import { NextRequest, NextResponse } from "next/server";
import { mutations } from "@/lib/graphql-client";

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const result = await mutations.createIncidentReport(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## Type Definitions

```typescript
import type { ValueTypes } from "@/zeus";

// Input types
type RegisterInput = ValueTypes["RegisterInput"];
type CreateReportInput = ValueTypes["CreateReportInput"];
type UpdateReportInput = ValueTypes["UpdateReportInput"];

// Enum types
type UserRole = "USER" | "MODERATOR" | "ADMIN";
type IncidentKind =
  | "INCIDENT"
  | "NETWORK_FAILURE"
  | "VEHICLE_FAILURE"
  | "PEDESTRIAN_ACCIDENT"
  | "TRAFFIC_JAM"
  | "PLATFORM_CHANGES";
type ReportStatus = "DRAFT" | "PUBLISHED" | "RESOLVED";
```

## Selectors

```typescript
import { Selector } from "@/lib/graphql-client";

// Pre-built selectors
import { UserSelector, IncidentSelector } from "@/lib/graphql-client";

// Custom selector
const MySelector = Selector("User")({
  id: true,
  name: true,
  email: true,
});

const result = await thunderClient("query")({
  me: MySelector,
});
```

## Authentication

```typescript
// Store token (after login)
localStorage.setItem("auth-token", "your-jwt-token");

// Client automatically includes it in requests

// Remove token (logout)
localStorage.removeItem("auth-token");
```

## Common Patterns

### Loading State

```typescript
const [loading, setLoading] = useState(true);
const [data, setData] = useState(null);

useEffect(() => {
  queries
    .getCurrentUser()
    .then((result) => setData(result.me))
    .finally(() => setLoading(false));
}, []);
```

### Error State

```typescript
const [error, setError] = useState(null);

try {
  await queries.getCurrentUser();
} catch (err) {
  setError(graphqlClient.handleGraphQLError(err));
}
```

### Refetch Function

```typescript
const [data, setData] = useState(null);

const fetchData = async () => {
  const result = await queries.getCurrentUser();
  setData(result.me);
};

// Initial fetch
useEffect(() => { fetchData(); }, []);

// Refetch on demand
<button onClick={fetchData}>Refresh</button>
```

## Cheat Sheet

| Task            | Method                                      |
| --------------- | ------------------------------------------- |
| Get user        | `queries.getCurrentUser()`                  |
| Register        | `mutations.register(input)`                 |
| Create report   | `mutations.createIncidentReport(input)`     |
| Update report   | `mutations.updateIncidentReport(id, input)` |
| Delete report   | `mutations.deleteIncidentReport(id)`        |
| Custom query    | `thunderClient("query")(selection)`         |
| Custom mutation | `thunderClient("mutation")(selection)`      |
| Handle error    | `graphqlClient.handleGraphQLError(error)`   |

## Endpoints

- **Client-side:** `/api/graphql`
- **Server-side:** `http://localhost:3000/api/graphql`
- **WebSocket:** `ws://localhost:3000/api/graphql` (for subscriptions)

## Files

- **Client:** `src/lib/graphql-client.ts`
- **Examples:** `src/lib/graphql-client.examples.ts`
- **Components:** `src/components/graphql-client-examples.tsx`
- **Types:** `src/zeus/`
- **Schema:** `src/backend/schema.graphql`
- **Docs:** `docs/GRAPHQL_CLIENT.md`
