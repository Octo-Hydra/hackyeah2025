# GraphQL Client - SSR vs Client-Side Fetching Guide

## Overview

This guide explains how to use the GraphQL client in different Next.js contexts with proper handling for Server-Side Rendering (SSR) and Client-Side fetching.

## Quick Reference

| Context          | Use                            | Import From                |
| ---------------- | ------------------------------ | -------------------------- |
| Server Component | `serverQueries`                | `@/lib/graphql-client-ssr` |
| Client Component | `clientQueries`                | `@/lib/graphql-client-ssr` |
| Server Action    | `serverMutations`              | `@/lib/graphql-client-ssr` |
| Client Action    | `clientMutations`              | `@/lib/graphql-client-ssr` |
| API Route        | `serverQueries/Mutations`      | `@/lib/graphql-client-ssr` |
| Universal        | `createUniversalThunderClient` | `@/lib/graphql-client-ssr` |

## Server-Side Rendering (SSR)

### Server Components

Server Components run on the server and can access server-only APIs. They benefit from **automatic request deduplication** using React's `cache()`.

```typescript
// app/dashboard/page.tsx
import { serverQueries } from "@/lib/graphql-client-ssr";

export default async function DashboardPage() {
  // This query is cached and deduplicated automatically
  const { me } = await serverQueries.getCurrentUser();

  return (
    <div>
      <h1>Welcome, {me?.name}!</h1>
      <p>Email: {me?.email}</p>
      <p>Role: {me?.role}</p>
    </div>
  );
}
```

**Benefits:**

- ✅ Automatic caching with React `cache()`
- ✅ Request deduplication (same query called multiple times = single fetch)
- ✅ Access to server-only cookies and headers
- ✅ SEO-friendly (rendered HTML)
- ✅ Faster initial page load

### Server Actions

Server Actions are functions that run on the server but can be called from client components.

```typescript
// app/actions/reports.ts
"use server";

import { serverMutations, revalidateGraphQL } from "@/lib/graphql-client-ssr";
import type { ValueTypes } from "@/zeus";

export async function createReport(input: ValueTypes["CreateReportInput"]) {
  try {
    const result = await serverMutations.createIncidentReport(input);

    // Revalidate cached data after mutation
    await revalidateGraphQL(["graphql", "reports"]);

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

**Use from Client Component:**

```typescript
"use client";

import { createReport } from "@/app/actions/reports";

export function ReportForm() {
  const handleSubmit = async (data) => {
    const result = await createReport(data);
    if (result.success) {
      console.log("Report created:", result.data);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### API Routes

API Routes are server-side endpoints that can be called from anywhere.

```typescript
// app/api/user/route.ts
import { NextResponse } from "next/server";
import { serverQueries } from "@/lib/graphql-client-ssr";

export async function GET() {
  try {
    const { me } = await serverQueries.getCurrentUser();
    return NextResponse.json({ user: me });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## Client-Side Fetching

### Client Components

Client Components run in the browser and are great for interactive features.

```typescript
"use client";

import { useState, useEffect } from "react";
import { clientQueries } from "@/lib/graphql-client-ssr";

export function UserProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientQueries
      .getCurrentUser()
      .then((result) => setUser(result.me))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>{user?.name}</h2>
      <p>{user?.email}</p>
    </div>
  );
}
```

**Benefits:**

- ✅ Interactive and dynamic
- ✅ Can use React hooks
- ✅ Fresh data on every fetch
- ✅ User-specific data after authentication

### Client Mutations

Mutations that happen in response to user actions.

```typescript
"use client";

import { useState } from "react";
import { clientMutations } from "@/lib/graphql-client-ssr";

export function Enable2FAButton() {
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const result = await clientMutations.setup2FA();
      setQrCode(result.setup2FA.qrCode);
    } catch (error) {
      console.error("Failed to setup 2FA:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={handleEnable} disabled={loading}>
        {loading ? "Setting up..." : "Enable 2FA"}
      </button>
      {qrCode && <img src={qrCode} alt="2FA QR Code" />}
    </>
  );
}
```

## Custom Cache Control

### Fine-grained Cache Control

For advanced use cases where you need specific caching behavior:

```typescript
import { fetchWithCache } from "@/lib/graphql-client-ssr";

// Cache for 5 minutes
const data = await fetchWithCache(`query { me { id name email } }`, {
  revalidate: 300, // 5 minutes in seconds
  tags: ["user"],
});

// No caching (always fresh)
const freshData = await fetchWithCache(`query { me { id name email } }`, {
  revalidate: false,
});

// Cache with custom tags for targeted revalidation
const reports = await fetchWithCache(`query { reports { id title } }`, {
  revalidate: 60,
  tags: ["graphql", "reports"],
});
```

### On-Demand Revalidation

Revalidate cached data after mutations:

```typescript
"use server";

import { serverMutations, revalidateGraphQL } from "@/lib/graphql-client-ssr";

export async function updateReport(id: string, input) {
  const result = await serverMutations.updateIncidentReport(id, input);

  // Revalidate specific cache tags
  await revalidateGraphQL(["graphql", "reports"]);

  return result;
}
```

## Authentication

### Server-Side (Cookies)

Server-side requests automatically read authentication from cookies:

```typescript
// Automatically reads from:
// - next-auth.session-token
// - __Secure-next-auth.session-token
// - auth-token

const { me } = await serverQueries.getCurrentUser();
```

### Client-Side (localStorage)

Client-side requests read from localStorage:

```typescript
// After login, store the token
localStorage.setItem("auth-token", "your-jwt-token");

// Client queries will automatically include it
const { me } = await clientQueries.getCurrentUser();

// After logout, remove the token
localStorage.removeItem("auth-token");
```

## Performance Patterns

### 1. Parallel Data Fetching (Server)

```typescript
// ✅ Good: Parallel fetches
export default async function Page() {
  const [userData, reportsData] = await Promise.all([
    serverQueries.getCurrentUser(),
    fetchWithCache(`query { reports { id title } }`, { tags: ["reports"] }),
  ]);

  return <Dashboard user={userData.me} reports={reportsData.reports} />;
}
```

### 2. Sequential Data Fetching (Server)

```typescript
// ❌ Avoid: Sequential fetches (slower)
export default async function Page() {
  const userData = await serverQueries.getCurrentUser();
  const reportsData = await fetchWithCache(
    `query { reports(userId: "${userData.me.id}") { id title } }`
  );

  return <Dashboard user={userData.me} reports={reportsData.reports} />;
}
```

### 3. Request Deduplication (Server)

```typescript
// All three calls will only make ONE network request
// Thanks to React cache()
export default async function Layout({ children }) {
  const { me } = await serverQueries.getCurrentUser();

  return (
    <div>
      <Header user={me} />
      <Sidebar user={me} />
      <Main user={me}>{children}</Main>
    </div>
  );
}
```

### 4. Optimistic Updates (Client)

```typescript
"use client";

import { useState } from "react";
import { clientMutations } from "@/lib/graphql-client-ssr";

export function LikeButton({ reportId }) {
  const [liked, setLiked] = useState(false);

  const handleLike = async () => {
    // Optimistic update
    setLiked(true);

    try {
      await clientMutations.updateIncidentReport(reportId, { liked: true });
    } catch (error) {
      // Revert on error
      setLiked(false);
      console.error("Failed to like:", error);
    }
  };

  return <button onClick={handleLike}>{liked ? "❤️" : "🤍"}</button>;
}
```

## Caching Strategies

### 1. Static (Build Time)

```typescript
// Generate at build time, never revalidate
export const revalidate = false; // or 0

export default async function Page() {
  const data = await serverQueries.getCurrentUser();
  return <div>{data.me?.name}</div>;
}
```

### 2. Incremental Static Regeneration (ISR)

```typescript
// Revalidate every 60 seconds
export const revalidate = 60;

export default async function Page() {
  const data = await serverQueries.getCurrentUser();
  return <div>{data.me?.name}</div>;
}
```

### 3. Dynamic (No Caching)

```typescript
// Always fresh data
export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await serverQueries.getCurrentUser();
  return <div>{data.me?.name}</div>;
}
```

### 4. On-Demand (Revalidate When Needed)

```typescript
// Server Action
"use server";

import { revalidatePath } from "next/cache";
import { serverMutations } from "@/lib/graphql-client-ssr";

export async function createReport(input) {
  await serverMutations.createIncidentReport(input);

  // Revalidate specific path
  revalidatePath("/reports");
  // Or revalidate by tag
  await revalidateGraphQL(["reports"]);
}
```

## Error Handling

### Server-Side

```typescript
import { serverQueries, handleGraphQLError } from "@/lib/graphql-client-ssr";

export default async function Page() {
  try {
    const { me } = await serverQueries.getCurrentUser();
    return <div>{me?.name}</div>;
  } catch (error) {
    const message = handleGraphQLError(error);
    return <div>Error: {message}</div>;
  }
}
```

### Client-Side

```typescript
"use client";

import { useState, useEffect } from "react";
import { clientQueries, handleGraphQLError } from "@/lib/graphql-client-ssr";

export function UserProfile() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    clientQueries.getCurrentUser().catch((err) => {
      setError(handleGraphQLError(err));
    });
  }, []);

  if (error) return <div>Error: {error}</div>;

  return <div>...</div>;
}
```

## Best Practices

### ✅ DO

- Use `serverQueries` in Server Components for faster initial loads
- Use `clientQueries` for user interactions and dynamic updates
- Leverage React `cache()` for automatic deduplication
- Use Server Actions for mutations from client components
- Add proper error handling
- Use `revalidateGraphQL()` after mutations
- Keep sensitive data in server-side queries

### ❌ DON'T

- Don't use client queries in Server Components
- Don't store sensitive tokens in localStorage on the client
- Don't make unnecessary sequential requests
- Don't forget to handle loading states
- Don't skip error boundaries
- Don't cache user-specific data globally

## Migration Guide

### From Old Client to SSR Client

**Before:**

```typescript
import { queries } from "@/lib/graphql-client";

const { me } = await queries.getCurrentUser();
```

**After (Server Component):**

```typescript
import { serverQueries } from "@/lib/graphql-client-ssr";

const { me } = await serverQueries.getCurrentUser();
```

**After (Client Component):**

```typescript
"use client";

import { clientQueries } from "@/lib/graphql-client-ssr";

const { me } = await clientQueries.getCurrentUser();
```

## Troubleshooting

### "cookies() can only be used in Server Components"

**Solution:** Make sure you're using `serverQueries` only in Server Components, Server Actions, or API Routes.

### "localStorage is not defined"

**Solution:** Use `clientQueries` only in Client Components, or check `typeof window !== "undefined"`.

### Stale data after mutation

**Solution:** Use `revalidateGraphQL()` or `revalidatePath()` after mutations.

### Too many requests

**Solution:** Use `serverQueries` with React `cache()` for automatic deduplication.

## Summary

- **Server Components**: Use `serverQueries` with automatic caching
- **Client Components**: Use `clientQueries` for fresh, interactive data
- **Server Actions**: Use `serverMutations` with revalidation
- **Client Mutations**: Use `clientMutations` for user actions
- **Custom Control**: Use `fetchWithCache` for fine-grained control
- **Revalidation**: Use `revalidateGraphQL()` after mutations
