# GraphQL Client with Zeus-GraphQL

A type-safe GraphQL client implementation using [Zeus-GraphQL](https://github.com/graphql-editor/graphql-zeus) for your application.

## Overview

This GraphQL client provides a fully type-safe way to interact with your GraphQL API. It leverages Zeus-GraphQL's code generation to ensure type safety at compile time.

## Files

- **`src/lib/graphql-client.ts`** - Main client implementation
- **`src/lib/graphql-client.examples.ts`** - Usage examples
- **`src/zeus/`** - Auto-generated Zeus types and utilities

## Setup

The GraphQL types are automatically generated from your schema (`src/backend/schema.graphql`) using the `zeus-plugin.ts` Next.js plugin. Types are regenerated automatically when the schema changes during development.

## Basic Usage

### Import the Client

```typescript
import { graphqlClient, queries, mutations } from "@/lib/graphql-client";
```

### Making Queries

#### Using Pre-built Query Helpers

```typescript
// Get current user
const { me } = await queries.getCurrentUser();
console.log(me);

// Check 2FA status
const { check2FAStatus } = await queries.check2FAStatus("username");
console.log(check2FAStatus);
```

#### Using Thunder Client Directly

```typescript
import { thunderClient } from "@/lib/graphql-client";

const result = await thunderClient("query")({
  me: {
    id: true,
    name: true,
    email: true,
    role: true,
  },
});
```

#### Using Chain Client

```typescript
import { chainClient } from "@/lib/graphql-client";

const result = await chainClient("query")({
  me: {
    id: true,
    name: true,
    email: true,
  },
});
```

### Making Mutations

#### Using Pre-built Mutation Helpers

```typescript
import { mutations } from "@/lib/graphql-client";
import type { ValueTypes } from "@/zeus";

// Register a user
const result = await mutations.register({
  name: "John Doe",
  email: "john@example.com",
  password: "securepassword123",
});

// Create an incident report
const incident = await mutations.createIncidentReport({
  title: "Bus Delay",
  description: "Bus delayed by 15 minutes",
  kind: "TRAFFIC_JAM",
  lineIds: ["line-1"],
});

// Update a report
const updated = await mutations.updateIncidentReport("report-id", {
  status: "RESOLVED",
});
```

#### Using Thunder Client Directly

```typescript
import { thunderClient } from "@/lib/graphql-client";

const result = await thunderClient("mutation")({
  register: [
    {
      input: {
        name: "John Doe",
        email: "john@example.com",
        password: "securepassword123",
      },
    },
    {
      success: true,
      message: true,
      userId: true,
    },
  ],
});
```

## Advanced Usage

### Complex Nested Queries

```typescript
import { thunderClient } from "@/lib/graphql-client";

const result = await thunderClient("query")({
  me: {
    id: true,
    name: true,
    email: true,
    role: true,
    twoFactorEnabled: true,
  },
  check2FAStatus: [
    { username: "john" },
    {
      requires2FA: true,
      userExists: true,
    },
  ],
});
```

### Using Selectors

Selectors allow you to create reusable field selections:

```typescript
import { Selector } from "@/lib/graphql-client";

// Create a custom selector
const MyUserSelector = Selector("User")({
  id: true,
  name: true,
  email: true,
});

// Use it in queries
const result = await thunderClient("query")({
  me: MyUserSelector,
});
```

### Error Handling

```typescript
import { graphqlClient } from "@/lib/graphql-client";

try {
  const result = await queries.getCurrentUser();
  console.log(result.me);
} catch (error) {
  const errorMessage = graphqlClient.handleGraphQLError(error);
  console.error("Error:", errorMessage);
}
```

### Authentication

The client automatically includes authentication tokens from `localStorage` (key: `auth-token`) and includes cookies in requests. To customize authentication:

```typescript
// Store auth token
localStorage.setItem("auth-token", "your-jwt-token");

// The client will automatically include it in headers
const result = await queries.getCurrentUser();
```

## Type Safety

All queries and mutations are fully type-safe. TypeScript will autocomplete available fields and catch errors at compile time:

```typescript
import type { ValueTypes } from "@/zeus";

// TypeScript knows the exact shape of input types
const input: ValueTypes["CreateReportInput"] = {
  title: "Bus Delay",
  description: "Delayed by 15 minutes",
  kind: "TRAFFIC_JAM", // Autocompleted from enum
  lineIds: ["line-1"],
};

const result = await mutations.createIncidentReport(input);

// TypeScript knows the exact shape of the result
console.log(result.carrierMutations?.createReport?.title);
```

## API Reference

### Thunder Client

The Thunder client provides a chainable API for building queries:

```typescript
thunderClient(operation: "query" | "mutation" | "subscription")(selection)
```

### Chain Client

The Chain client provides more granular control:

```typescript
chainClient(operation: "query" | "mutation" | "subscription")(selection)
```

### Pre-built Helpers

#### Queries

- `queries.getCurrentUser()` - Get current logged-in user
- `queries.check2FAStatus(username)` - Check 2FA status for a user

#### Mutations

- `mutations.register(input)` - Register a new user
- `mutations.verifyEmail(token)` - Verify email with token
- `mutations.setup2FA()` - Setup two-factor authentication
- `mutations.verify2FA(token, secret)` - Verify 2FA token
- `mutations.disable2FA()` - Disable 2FA
- `mutations.createIncidentReport(input)` - Create an incident report
- `mutations.saveDraft(input)` - Save report as draft
- `mutations.updateIncidentReport(id, input)` - Update a report
- `mutations.deleteIncidentReport(id)` - Delete a report
- `mutations.publishIncidentReport(id)` - Publish a report

## Usage in React Components

### Client Component

```typescript
"use client";

import { useState, useEffect } from "react";
import { queries } from "@/lib/graphql-client";

export function UserProfile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    queries.getCurrentUser().then((result) => {
      setUser(result.me);
    });
  }, []);

  return <div>{user?.name}</div>;
}
```

### Server Component

```typescript
import { queries } from "@/lib/graphql-client";

export default async function ServerPage() {
  const { me } = await queries.getCurrentUser();

  return <div>Welcome, {me?.name}!</div>;
}
```

### API Route

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

## Examples

See `src/lib/graphql-client.examples.ts` for comprehensive usage examples including:

- Basic queries and mutations
- Complex nested queries
- Error handling
- Authentication handling
- React hooks patterns
- Server-side usage

## Troubleshooting

### Types not updating

If your GraphQL schema changes but types aren't updating:

1. The zeus-plugin should auto-regenerate during development
2. Manually regenerate: `npx graphql-zeus --graphql ./src/backend/schema.graphql ./src/zeus`
3. Restart your development server

### Authentication errors

Make sure your auth token is stored correctly:

```typescript
// After login
localStorage.setItem("auth-token", token);

// Check if token exists
const token = localStorage.getItem("auth-token");
console.log("Token:", token);
```

### CORS issues

If you're making requests from a different origin, ensure your GraphQL server has proper CORS configuration.

## Learn More

- [Zeus-GraphQL Documentation](https://github.com/graphql-editor/graphql-zeus)
- [GraphQL Yoga Documentation](https://the-guild.dev/graphql/yoga-server)
- [Next.js GraphQL Documentation](https://nextjs.org/docs/app/building-your-application/data-fetching)
