# GraphQL Client - SSR & Client-Side Implementation Summary

## Files Created

### 1. SSR & Client-Side GraphQL Client

**File:** `src/lib/graphql-client-ssr.ts`

Comprehensive implementation with:

- ✅ **Server-side queries** with React `cache()` for deduplication
- ✅ **Client-side queries** with fresh data
- ✅ **Server-side mutations** for Server Actions
- ✅ **Client-side mutations** for interactive features
- ✅ **Automatic authentication** (cookies for server, localStorage for client)
- ✅ **Fine-grained cache control** with Next.js ISR
- ✅ **On-demand revalidation** after mutations

### 2. Comprehensive Documentation

**File:** `docs/GRAPHQL_SSR_GUIDE.md`

Complete guide covering:

- Server-side rendering patterns
- Client-side fetching patterns
- Authentication handling
- Caching strategies
- Performance optimization
- Error handling
- Best practices
- Migration guide

## Key Features

### 🚀 Server-Side (SSR)

```typescript
import { serverQueries } from "@/lib/graphql-client-ssr";

// In Server Component
export default async function Page() {
  const { me } = await serverQueries.getCurrentUser();
  return <div>{me?.name}</div>;
}
```

**Benefits:**

- Automatic request deduplication via React `cache()`
- Reads auth from cookies (secure)
- SEO-friendly
- Faster initial page load
- ISR caching with Next.js

### 💻 Client-Side

```typescript
"use client";

import { clientQueries } from "@/lib/graphql-client-ssr";

export function Component() {
  useEffect(() => {
    clientQueries.getCurrentUser().then((result) => {
      // Handle result
    });
  }, []);
}
```

**Benefits:**

- Fresh data on every fetch
- Interactive and dynamic
- Can use React hooks
- Perfect for user actions

### 🔄 Server Actions

```typescript
"use server";

import { serverMutations, revalidateGraphQL } from "@/lib/graphql-client-ssr";

export async function createReport(input) {
  const result = await serverMutations.createIncidentReport(input);

  // Revalidate cached data
  await revalidateGraphQL(["graphql", "reports"]);

  return result;
}
```

**Benefits:**

- Type-safe mutations from client components
- Automatic revalidation
- Secure (runs on server)
- Progressive enhancement

## API Overview

### Server-Side Queries

```typescript
// Pre-built with caching
serverQueries.getCurrentUser()
serverQueries.check2FAStatus(username)

// Custom client
const client = createServerThunderClient();
await client("query")({ ... });
```

### Client-Side Queries

```typescript
// Pre-built, always fresh
clientQueries.getCurrentUser()
clientQueries.check2FAStatus(username)

// Custom client
const client = createClientThunderClient();
await client("query")({ ... });
```

### Server-Side Mutations

```typescript
serverMutations.register(input);
serverMutations.createIncidentReport(input);
serverMutations.updateIncidentReport(id, input);
serverMutations.deleteIncidentReport(id);
```

### Client-Side Mutations

```typescript
clientMutations.register(input);
clientMutations.createIncidentReport(input);
clientMutations.updateIncidentReport(id, input);
clientMutations.deleteIncidentReport(id);
clientMutations.setup2FA();
clientMutations.verify2FA(token, secret);
```

### Advanced Features

```typescript
// Custom cache control
await fetchWithCache(query, {
  revalidate: 60, // seconds
  tags: ["graphql", "reports"],
});

// Revalidate after mutations
await revalidateGraphQL(["graphql", "reports"]);

// Environment detection
const endpoint = getGraphQLEndpoint();

// Universal client (auto-detects environment)
const client = createUniversalThunderClient();
```

## Authentication

### Server-Side (Automatic)

Automatically reads from cookies:

- `next-auth.session-token`
- `__Secure-next-auth.session-token`
- `auth-token`

### Client-Side (Automatic)

Automatically reads from:

- `localStorage.getItem("auth-token")`

## Caching Strategies

### 1. Automatic Cache (Server Components)

```typescript
// Cached automatically with React cache()
const { me } = await serverQueries.getCurrentUser();
```

### 2. ISR (Incremental Static Regeneration)

```typescript
// Revalidate every 60 seconds
export const revalidate = 60;
```

### 3. Custom Cache Control

```typescript
await fetchWithCache(query, {
  revalidate: 300, // 5 minutes
  tags: ["user"],
});
```

### 4. On-Demand Revalidation

```typescript
// After mutation
await revalidateGraphQL(["graphql", "reports"]);
```

### 5. No Caching (Client-Side)

```typescript
// Always fresh data
const data = await clientQueries.getCurrentUser();
```

## Performance Patterns

### ✅ Request Deduplication (Server)

```typescript
// Multiple calls = ONE network request
async function Layout() {
  const user1 = await serverQueries.getCurrentUser();
  const user2 = await serverQueries.getCurrentUser();
  const user3 = await serverQueries.getCurrentUser();
  // Only 1 actual fetch thanks to React cache()
}
```

### ✅ Parallel Fetching

```typescript
const [user, reports] = await Promise.all([
  serverQueries.getCurrentUser(),
  fetchWithCache(`query { reports { ... } }`),
]);
```

### ✅ Optimistic Updates (Client)

```typescript
"use client";

function Component() {
  const [state, setState] = useState(false);

  const handleAction = async () => {
    // Optimistic update
    setState(true);

    try {
      await clientMutations.updateReport(id, { ... });
    } catch {
      // Revert on error
      setState(false);
    }
  };
}
```

## Common Use Cases

### 1. Dashboard (Server Component)

```typescript
// app/dashboard/page.tsx
import { serverQueries } from "@/lib/graphql-client-ssr";

export default async function Dashboard() {
  const { me } = await serverQueries.getCurrentUser();
  return <div>Welcome, {me?.name}!</div>;
}
```

### 2. Form with Server Action

```typescript
// app/actions.ts
"use server";
import { serverMutations, revalidateGraphQL } from "@/lib/graphql-client-ssr";

export async function createReport(input) {
  const result = await serverMutations.createIncidentReport(input);
  await revalidateGraphQL(["reports"]);
  return result;
}

// app/components/Form.tsx
"use client";
import { createReport } from "@/app/actions";

export function Form() {
  const handleSubmit = async (data) => {
    await createReport(data);
  };
  return <form onSubmit={handleSubmit}>...</form>;
}
```

### 3. Interactive Component (Client)

```typescript
"use client";
import { clientMutations } from "@/lib/graphql-client-ssr";

export function Enable2FA() {
  const handleClick = async () => {
    const result = await clientMutations.setup2FA();
    console.log(result.setup2FA.qrCode);
  };
  return <button onClick={handleClick}>Enable 2FA</button>;
}
```

### 4. API Route

```typescript
// app/api/user/route.ts
import { serverQueries } from "@/lib/graphql-client-ssr";
import { NextResponse } from "next/server";

export async function GET() {
  const { me } = await serverQueries.getCurrentUser();
  return NextResponse.json({ user: me });
}
```

## Migration Path

### From Basic Client

**Before:**

```typescript
import { queries } from "@/lib/graphql-client";
const data = await queries.getCurrentUser();
```

**After (Server Component):**

```typescript
import { serverQueries } from "@/lib/graphql-client-ssr";
const data = await serverQueries.getCurrentUser();
```

**After (Client Component):**

```typescript
"use client";
import { clientQueries } from "@/lib/graphql-client-ssr";
const data = await clientQueries.getCurrentUser();
```

## Best Practices

### ✅ DO

- Use `serverQueries` in Server Components
- Use `clientQueries` in Client Components
- Use Server Actions for mutations from client
- Revalidate after mutations
- Handle loading and error states
- Use parallel fetching when possible
- Leverage React `cache()` for deduplication

### ❌ DON'T

- Don't use `clientQueries` in Server Components
- Don't use `serverQueries` in Client Components
- Don't store sensitive data in localStorage
- Don't make sequential requests unnecessarily
- Don't forget error handling
- Don't skip revalidation after mutations

## Error Handling

```typescript
import { handleGraphQLError } from "@/lib/graphql-client-ssr";

try {
  const data = await serverQueries.getCurrentUser();
} catch (error) {
  const message = handleGraphQLError(error);
  console.error(message);
}
```

## Environment Detection

The client automatically detects the environment:

**Server-side:**

- Uses absolute URL (`http://localhost:3000/api/graphql`)
- Reads cookies for auth
- Enables Next.js caching

**Client-side:**

- Uses relative path (`/api/graphql`)
- Reads localStorage for auth
- No server-side caching

## Quick Reference

| Need                      | Use This                                                       |
| ------------------------- | -------------------------------------------------------------- |
| Server Component query    | `serverQueries.getCurrentUser()`                               |
| Client Component query    | `clientQueries.getCurrentUser()`                               |
| Server Action mutation    | `serverMutations.createReport(...)`                            |
| Client Component mutation | `clientMutations.createReport(...)`                            |
| Custom caching            | `fetchWithCache(query, { revalidate: 60 })`                    |
| Revalidate cache          | `await revalidateGraphQL(["tag"])`                             |
| Error handling            | `handleGraphQLError(error)`                                    |
| Custom client             | `createServerThunderClient()` or `createClientThunderClient()` |

## Next Steps

1. ✅ Use `serverQueries` in Server Components
2. ✅ Use `clientQueries` in Client Components
3. ✅ Use Server Actions for mutations
4. ✅ Add `revalidateGraphQL()` after mutations
5. ✅ Implement proper error handling
6. ✅ Test both SSR and client-side paths

## Summary

You now have a **complete, production-ready GraphQL client** that:

- 🚀 Optimizes performance with automatic caching and deduplication
- 🔒 Handles authentication securely (cookies on server, localStorage on client)
- ⚡ Works seamlessly in both SSR and client-side contexts
- 🎯 Provides type-safe queries and mutations
- 🔄 Supports ISR with on-demand revalidation
- 📦 Includes pre-built helpers for common operations
- 🛠️ Offers fine-grained control when needed

**Ready to use in your Next.js 15 application!** 🎉
