# GraphQL Client - SSR vs Client-Side Comparison

## Quick Decision Chart

```
┌─────────────────────────────────────────────────────────────────┐
│  Where am I?                                                    │
└─────────────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┴──────────────────┐
         │                                    │
         ▼                                    ▼
   SERVER COMPONENT                     CLIENT COMPONENT
   (No "use client")                    ("use client" at top)
         │                                    │
         │                                    │
         ▼                                    ▼
   serverQueries                        clientQueries
   serverMutations                      clientMutations
   (from graphql-client-ssr)           (from graphql-client-ssr)
```

## Feature Comparison

| Feature            | Server Component    | Client Component     | Server Action     |
| ------------------ | ------------------- | -------------------- | ----------------- |
| **Runs on**        | Server              | Browser              | Server            |
| **Called from**    | Server only         | Browser              | Browser or Server |
| **Authentication** | Cookies             | localStorage         | Cookies           |
| **Caching**        | React cache() + ISR | No automatic caching | No caching        |
| **SEO**            | ✅ Yes              | ❌ No                | N/A               |
| **Interactive**    | ❌ No               | ✅ Yes               | ✅ Yes            |
| **Use hooks**      | ❌ No               | ✅ Yes               | ❌ No             |
| **Mutations**      | ❌ Avoid            | ✅ Yes               | ✅ Yes            |
| **Revalidation**   | Automatic           | Manual               | Can trigger       |
| **Bundle size**    | No impact           | Included in bundle   | No impact         |
| **Data freshness** | Cached              | Always fresh         | Always fresh      |

## When to Use What

### Use Server Components (`serverQueries`) When:

✅ **Initial page load** - Fastest time to interactive

```typescript
export default async function Page() {
  const { me } = await serverQueries.getCurrentUser();
  return <div>{me?.name}</div>;
}
```

✅ **SEO is important** - Content is pre-rendered

```typescript
export default async function BlogPost() {
  const post = await serverQueries.getPost(id);
  return <article>{post.title}</article>; // Crawlable by search engines
}
```

✅ **Static or semi-static data** - Leverage ISR

```typescript
export const revalidate = 3600; // Revalidate every hour

export default async function Page() {
  const data = await serverQueries.getData();
  return <div>{data}</div>;
}
```

✅ **Large datasets** - Don't send to client bundle

```typescript
export default async function Page() {
  const reports = await serverQueries.getAllReports(); // Could be 1000+ items
  return <ReportList reports={reports} />;
}
```

✅ **Sensitive operations** - Keep secrets server-side

```typescript
export default async function AdminPage() {
  const adminData = await serverQueries.getAdminData(); // API key stays on server
  return <AdminDashboard data={adminData} />;
}
```

### Use Client Components (`clientQueries`) When:

✅ **User interactions** - Respond to clicks, forms, etc.

```typescript
"use client";

export function LikeButton() {
  const handleClick = async () => {
    await clientMutations.likePost(postId);
  };
  return <button onClick={handleClick}>Like</button>;
}
```

✅ **Real-time updates** - Poll for fresh data

```typescript
"use client";

export function LiveStatus() {
  useEffect(() => {
    const interval = setInterval(() => {
      clientQueries.getStatus().then(setStatus);
    }, 5000);
    return () => clearInterval(interval);
  }, []);
}
```

✅ **User-specific dynamic data** - After authentication

```typescript
"use client";

export function Notifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    clientQueries.getNotifications().then(setNotifications);
  }, []);
}
```

✅ **Forms with validation** - Interactive validation

```typescript
"use client";

export function Form() {
  const [errors, setErrors] = useState({});

  const handleSubmit = async (data) => {
    // Client-side validation
    if (!validate(data)) return;

    // Submit
    await clientMutations.createReport(data);
  };
}
```

✅ **Optimistic updates** - Instant UI feedback

```typescript
"use client";

export function TodoItem({ todo }) {
  const [completed, setCompleted] = useState(todo.completed);

  const toggle = async () => {
    setCompleted(!completed); // Optimistic
    try {
      await clientMutations.toggleTodo(todo.id);
    } catch {
      setCompleted(completed); // Revert
    }
  };
}
```

### Use Server Actions When:

✅ **Mutations from client components** - Type-safe, secure

```typescript
// actions.ts
"use server";

export async function createReport(input) {
  const result = await serverMutations.createIncidentReport(input);
  await revalidateGraphQL(["reports"]);
  return result;
}

// Component.tsx
"use client";

export function Form() {
  return <form action={createReport}>...</form>;
}
```

✅ **Need to revalidate** - Invalidate cache after mutation

```typescript
"use server";

export async function deleteReport(id: string) {
  await serverMutations.deleteIncidentReport(id);
  await revalidateGraphQL(["reports"]);
  revalidatePath("/reports");
}
```

✅ **Progressive enhancement** - Works without JavaScript

```typescript
"use server";

export async function submitForm(formData: FormData) {
  const result = await serverMutations.createReport({
    title: formData.get("title"),
    // ...
  });
  redirect("/reports");
}
```

## Performance Comparison

### Initial Page Load

| Approach                 | Time to First Byte | Time to Interactive | SEO      |
| ------------------------ | ------------------ | ------------------- | -------- |
| Server Component         | ⚡ Fast            | ⚡ Fast             | ✅ Great |
| Client Component         | ⚡ Fast            | 🐢 Slower           | ❌ Poor  |
| Hybrid (Server + Client) | ⚡ Fast            | ⚡ Fast             | ✅ Great |

### Data Freshness

| Approach                   | Freshness       | Use Case          |
| -------------------------- | --------------- | ----------------- |
| Server Component (ISR)     | 🔄 Periodic     | Semi-static data  |
| Server Component (dynamic) | ✅ Always fresh | Dynamic data      |
| Client Component           | ✅ Always fresh | User interactions |

### Bundle Size

| Approach         | JavaScript Bundle | Impact            |
| ---------------- | ----------------- | ----------------- |
| Server Component | 0 KB              | ✅ No impact      |
| Client Component | ~5-50 KB          | ⚠️ Adds to bundle |
| Server Action    | 0 KB              | ✅ No impact      |

## Caching Behavior

### Server Component Caching

```typescript
// Cached automatically with React cache()
// Multiple calls = 1 network request
export default async function Layout() {
  const user1 = await serverQueries.getCurrentUser(); // Fetch
  const user2 = await serverQueries.getCurrentUser(); // Cached
  const user3 = await serverQueries.getCurrentUser(); // Cached
}
```

### Next.js ISR Caching

```typescript
// Cached at edge/CDN level
export const revalidate = 60; // Revalidate every 60s

export default async function Page() {
  const data = await serverQueries.getData();
  return <div>{data}</div>;
}
```

### Client Component (No Caching)

```typescript
"use client";

// Always fetches fresh data
export function Component() {
  useEffect(() => {
    clientQueries.getCurrentUser(); // Fresh fetch every time
  }, []);
}
```

## Authentication Comparison

| Approach         | Auth Source       | Security  | Notes            |
| ---------------- | ----------------- | --------- | ---------------- |
| Server Component | HTTP-only cookies | 🔒 High   | XSS safe         |
| Client Component | localStorage      | ⚠️ Medium | Accessible to JS |
| Server Action    | HTTP-only cookies | 🔒 High   | XSS safe         |

## Real-World Patterns

### Pattern 1: Static Landing Page

```typescript
// ✅ Use Server Component
export const revalidate = 3600; // 1 hour

export default async function LandingPage() {
  const content = await serverQueries.getStaticContent();
  return <div>{content}</div>;
}
```

### Pattern 2: User Dashboard

```typescript
// ✅ Hybrid: Server for initial load, Client for interactions

// Server Component
export default async function Dashboard() {
  const { me } = await serverQueries.getCurrentUser();

  return (
    <div>
      <h1>Welcome, {me?.name}</h1>
      <ClientSideNotifications userId={me?.id} />
    </div>
  );
}

// Client Component
"use client";
function ClientSideNotifications({ userId }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    clientQueries.getNotifications(userId).then(setNotifications);
  }, [userId]);

  return <NotificationsList items={notifications} />;
}
```

### Pattern 3: Form Submission

```typescript
// ✅ Client Component + Server Action

// actions.ts
"use server";
export async function createReport(input) {
  const result = await serverMutations.createIncidentReport(input);
  await revalidateGraphQL(["reports"]);
  return result;
}

// Form.tsx
"use client";
export function ReportForm() {
  const handleSubmit = async (data) => {
    const result = await createReport(data);
    if (result.success) {
      router.push("/reports");
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Pattern 4: Admin Panel

```typescript
// ✅ Server Component (security)

export default async function AdminPanel() {
  // Runs on server, API keys never exposed
  const adminData = await serverQueries.getAdminData();

  return <AdminDashboard data={adminData} />;
}
```

### Pattern 5: Live Updates

```typescript
// ✅ Client Component (polling)

"use client";
export function LiveStatus() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const poll = () => {
      clientQueries.getStatus().then(setStatus);
    };

    poll(); // Initial
    const interval = setInterval(poll, 5000); // Every 5s

    return () => clearInterval(interval);
  }, []);

  return <div>Status: {status}</div>;
}
```

## Decision Tree

```
Need data?
  ├─ Is it for initial page load?
  │  ├─ Yes → Use Server Component (serverQueries)
  │  └─ No → Continue
  │
  ├─ Is it user-specific and dynamic?
  │  ├─ Yes → Use Client Component (clientQueries)
  │  └─ No → Continue
  │
  ├─ Does it need SEO?
  │  ├─ Yes → Use Server Component (serverQueries)
  │  └─ No → Continue
  │
  ├─ Is it based on user interaction?
  │  ├─ Yes → Use Client Component (clientQueries)
  │  └─ No → Use Server Component (serverQueries)

Need to mutate?
  ├─ Called from Client Component?
  │  ├─ Yes → Use Server Action (serverMutations)
  │  └─ No → Use Server Component (serverMutations)
  │
  ├─ Need immediate UI feedback?
  │  ├─ Yes → Use Client Component (clientMutations) + optimistic update
  │  └─ No → Use Server Action (serverMutations)
  │
  └─ Need to revalidate cache?
     └─ Yes → Use Server Action with revalidateGraphQL()
```

## Summary Table

| Use Case                 | Best Approach    | Why                          |
| ------------------------ | ---------------- | ---------------------------- |
| Landing page             | Server Component | SEO + Performance            |
| Blog post                | Server Component | SEO + ISR                    |
| User dashboard (initial) | Server Component | Fast initial load            |
| Live notifications       | Client Component | Real-time updates            |
| Form submission          | Server Action    | Type-safe + secure           |
| Like button              | Client Component | Instant feedback             |
| Admin panel              | Server Component | Security                     |
| Search bar               | Client Component | Interactive                  |
| Static content           | Server Component | Caching                      |
| User settings            | Hybrid           | Initial SSR + client updates |

## Best Practices Summary

1. **Start with Server Components** - Default to SSR for better performance
2. **Use Client Components sparingly** - Only for interactive features
3. **Prefer Server Actions** - For mutations from client components
4. **Leverage caching** - Use ISR for semi-static data
5. **Revalidate after mutations** - Keep cache fresh
6. **Handle errors** - Both server and client side
7. **Type safety** - Use TypeScript for all queries/mutations
8. **Progressive enhancement** - Use Server Actions when possible
