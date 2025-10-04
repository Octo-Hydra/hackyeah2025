# GraphQL Client Implementation Summary

## Overview

A complete, type-safe GraphQL client implementation using **zeus-graphql** for your Next.js application. This client provides seamless integration with your GraphQL API with full TypeScript support.

## Files Created

### 1. Main Client Implementation

**File:** `src/lib/graphql-client.ts`

The core GraphQL client with:

- Thunder client for simple, chainable queries
- Chain client for granular control
- Pre-built query and mutation helpers
- Type-safe selectors
- Error handling utilities
- Automatic authentication header injection

### 2. Usage Examples

**File:** `src/lib/graphql-client.examples.ts`

Comprehensive examples covering:

- Basic queries and mutations
- Complex nested queries
- Error handling patterns
- Authentication workflows
- 2FA setup and verification
- Incident report CRUD operations
- React hooks patterns
- Server-side usage

### 3. React Component Examples

**File:** `src/components/graphql-client-examples.tsx`

Real-world React components demonstrating:

- Fetching user data in client components
- Form submission with mutations
- Custom hooks for data fetching
- Optimistic updates
- Loading and error states
- Using Thunder client directly in components

### 4. Documentation

**File:** `docs/GRAPHQL_CLIENT.md`

Complete documentation including:

- Setup instructions
- API reference
- Usage patterns
- Type safety guide
- Troubleshooting tips
- Integration examples

## Key Features

### ✅ Type Safety

- Full TypeScript support with auto-generated types
- Compile-time error checking
- IntelliSense autocomplete for all queries and mutations
- Type-safe input validation

### ✅ Easy to Use

```typescript
import { queries, mutations } from "@/lib/graphql-client";

// Simple query
const { me } = await queries.getCurrentUser();

// Simple mutation
await mutations.createIncidentReport({
  title: "Bus Delay",
  kind: "TRAFFIC_JAM",
  lineIds: ["line-1"],
});
```

### ✅ Flexible API

Choose the approach that fits your needs:

- **Pre-built helpers** for common operations
- **Thunder client** for chainable, type-safe queries
- **Chain client** for granular control
- **Zeus** for manual query construction

### ✅ Authentication Built-in

- Automatic token injection from localStorage
- Cookie-based session support
- Configurable auth headers

### ✅ Error Handling

```typescript
try {
  const result = await queries.getCurrentUser();
} catch (error) {
  const message = graphqlClient.handleGraphQLError(error);
  console.error(message);
}
```

## Quick Start

### 1. Import the client

```typescript
import { queries, mutations } from "@/lib/graphql-client";
```

### 2. Make a query

```typescript
const { me } = await queries.getCurrentUser();
console.log(me.name, me.email);
```

### 3. Make a mutation

```typescript
const result = await mutations.register({
  name: "John Doe",
  email: "john@example.com",
  password: "password123",
});
```

## Available Pre-built Helpers

### Queries

- `getCurrentUser()` - Get current logged-in user
- `check2FAStatus(username)` - Check 2FA status

### Mutations

#### User Management

- `register(input)` - Register new user
- `verifyEmail(token)` - Verify email
- `setup2FA()` - Setup two-factor auth
- `verify2FA(token, secret)` - Verify 2FA token
- `disable2FA()` - Disable 2FA

#### Incident Reports

- `createIncidentReport(input)` - Create new report
- `saveDraft(input)` - Save as draft
- `updateIncidentReport(id, input)` - Update report
- `deleteIncidentReport(id)` - Delete report
- `publishIncidentReport(id)` - Publish report

## Advanced Usage

### Custom Queries with Thunder

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

### Using Selectors

```typescript
import { Selector } from "@/lib/graphql-client";

const UserSelector = Selector("User")({
  id: true,
  name: true,
  email: true,
});

const result = await thunderClient("query")({
  me: UserSelector,
});
```

### React Hook Example

```typescript
function useCurrentUser() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    queries.getCurrentUser().then((result) => {
      setUser(result.me);
    });
  }, []);

  return user;
}
```

## Type Safety Example

```typescript
import type { ValueTypes } from "@/zeus";

// TypeScript knows the exact input shape
const input: ValueTypes["CreateReportInput"] = {
  title: "Bus Delay",
  description: "15 minutes late",
  kind: "TRAFFIC_JAM", // ✅ Autocompleted from enum
  lineIds: ["line-1"],
};

const result = await mutations.createIncidentReport(input);

// TypeScript knows the exact result shape
console.log(result.carrierMutations?.createReport?.title);
```

## GraphQL Endpoint Configuration

The client automatically detects the correct endpoint:

- **Client-side:** `/api/graphql` (relative path)
- **Server-side:** `http://localhost:3000/api/graphql` (absolute URL)

## Authentication

Store your auth token after login:

```typescript
localStorage.setItem("auth-token", yourToken);
```

The client automatically includes it in all requests.

## Integration with Existing Code

The client is ready to use in:

- ✅ Client Components (`"use client"`)
- ✅ Server Components
- ✅ API Routes
- ✅ Server Actions
- ✅ Middleware

## Error Handling Patterns

```typescript
// Pattern 1: Try-catch
try {
  const result = await queries.getCurrentUser();
} catch (error) {
  console.error(graphqlClient.handleGraphQLError(error));
}

// Pattern 2: Promise chains
queries
  .getCurrentUser()
  .then((result) => console.log(result.me))
  .catch((error) => console.error(graphqlClient.handleGraphQLError(error)));

// Pattern 3: Async/await with state
const [error, setError] = useState(null);
try {
  await queries.getCurrentUser();
} catch (err) {
  setError(graphqlClient.handleGraphQLError(err));
}
```

## Schema Updates

When you update `src/backend/schema.graphql`:

1. Types are auto-regenerated by the zeus-plugin during development
2. TypeScript will catch any breaking changes
3. No manual codegen step needed (automatic in dev mode)

## Testing

```typescript
import { thunderClient } from "@/lib/graphql-client";

// Mock the client in tests
jest.mock("@/lib/graphql-client", () => ({
  thunderClient: jest.fn(),
  queries: {
    getCurrentUser: jest.fn(),
  },
}));
```

## Performance Tips

1. **Use selectors** to avoid over-fetching
2. **Batch queries** when possible
3. **Cache results** in React state or a global store
4. **Use loading states** to improve UX

## Troubleshooting

### Types not updating?

- Restart dev server
- Check `src/zeus/` for generated types
- Verify `zeus-plugin.ts` is running

### Authentication errors?

- Check localStorage for "auth-token"
- Verify token format
- Check server CORS settings

### CORS issues?

- Ensure GraphQL server allows credentials
- Check server CORS configuration
- Verify endpoint URL

## Next Steps

1. Read the full documentation: `docs/GRAPHQL_CLIENT.md`
2. Check examples: `src/lib/graphql-client.examples.ts`
3. See React components: `src/components/graphql-client-examples.tsx`
4. Start using in your code!

## Support

For issues or questions:

1. Check documentation
2. Review examples
3. Inspect generated types in `src/zeus/`
4. Check GraphQL schema: `src/backend/schema.graphql`

---

**Ready to use!** Import and start querying your GraphQL API with full type safety. 🚀
