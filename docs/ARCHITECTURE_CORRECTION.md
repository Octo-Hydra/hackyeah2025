# Corrected Architecture: GraphQL Subscriptions

## What Changed?

I initially created a **separate WebSocket server** for notifications, which was incorrect since you already have **GraphQL Yoga with WebSocket subscriptions** set up.

### ❌ Old (Incorrect) Approach

- Separate WebSocket server on `/ws`
- Custom WebSocket message protocol
- Two different WebSocket connections
- Duplicate authentication logic

### ✅ New (Correct) Approach

- GraphQL subscriptions on `/api/graphql` (existing endpoint)
- Type-safe GraphQL schema
- Single WebSocket connection
- Reuses existing Yoga GraphQL setup

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Client                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │  React Components                                   │    │
│  │  - use*Subscription() hooks                        │    │
│  │  - useAppStore() for state                         │    │
│  └────────────────────────────────────────────────────┘    │
│                           │                                  │
│  ┌────────────────────────▼──────────────────────────┐    │
│  │  GraphQL Client (graphql-ws)                       │    │
│  │  - Single WebSocket connection                     │    │
│  │  - /api/graphql endpoint                          │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ WebSocket
                           │
┌─────────────────────────▼──────────────────────────────────┐
│                         Server                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │  GraphQL Yoga Server                               │    │
│  │  - HTTP on /api/graphql                           │    │
│  │  - WebSocket on /api/graphql                      │    │
│  └────────────────────────────────────────────────────┘    │
│                           │                                  │
│  ┌────────────────────────▼──────────────────────────┐    │
│  │  GraphQL Resolvers                                 │    │
│  │  - Query (queries)                                │    │
│  │  - Mutation (mutations)                           │    │
│  │  - Subscription (subscriptions) ← NEW             │    │
│  └────────────────────────────────────────────────────┘    │
│                           │                                  │
│  ┌────────────────────────▼──────────────────────────┐    │
│  │  PubSub System                                     │    │
│  │  - publishNotificationReported()                  │    │
│  │  - publishNotificationConfirmed()                 │    │
│  │  - publishNotificationOfficial()                  │    │
│  │  - publishReputationUpdated()                     │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

### ✅ Files to Keep (Correct Architecture)

```
src/
├── types/
│   └── store.ts                          # Type definitions
├── store/
│   └── use-app-store.ts                  # Zustand store
├── lib/
│   └── threshold-algorithm.ts            # Notification algorithm
├── hooks/
│   ├── use-store.ts                      # Store convenience hooks
│   └── use-graphql-subscriptions.ts      # GraphQL subscription hooks ✨ NEW
└── backend/
    ├── schema.graphql                    # Updated with subscriptions ✨
    └── resolvers/
        ├── index.ts                      # Updated with subscriptions ✨
        ├── subscriptions.ts              # Subscription resolvers ✨ NEW
        ├── query.ts
        ├── mutation.ts
        └── carrierMutation.ts
```

### ❌ Files to Remove (No Longer Needed)

```
src/
├── lib/
│   └── websocket-manager.ts              # ❌ Remove - not needed
└── backend/
    └── websocket-server.ts               # ❌ Remove - not needed
```

## How It Works Now

### 1. Client Subscribes to Events

```typescript
// Component subscribes to notifications
useNotificationReportedSubscription(lineIds, (notification) => {
  // New notification received
  addPendingNotification(notification);
});
```

### 2. GraphQL WebSocket Connection

```typescript
// Automatically connects to ws://localhost:3000/api/graphql
// Reuses your existing Yoga GraphQL WebSocket
```

### 3. Server Publishes Events

```typescript
// In your mutation resolver
export const reportIncident = async (input) => {
  const notification = createNotification(input);

  // Save to database
  await db.notifications.insert(notification);

  // Publish to all subscribers
  publishNotificationReported(notification);

  return notification;
};
```

### 4. Subscribers Receive Updates

```typescript
// All clients subscribed to that line receive the update
// Store is automatically updated via the hook
```

## GraphQL Subscriptions Schema

```graphql
type Subscription {
  # New reports on specific lines
  notificationReported(lineIds: [String!]): NotificationReport!

  # Confirmations on specific lines
  notificationConfirmed(lineIds: [String!]): NotificationReport!

  # Official notifications (all lines)
  notificationOfficial: OfficialNotification!

  # User's reputation updates
  reputationUpdated(userId: String!): ReputationUpdate!
}
```

## Implementation Checklist

### ✅ Done

- [x] GraphQL subscription types in schema
- [x] Subscription resolvers with PubSub
- [x] GraphQL subscription React hooks
- [x] Updated resolvers index
- [x] Removed separate WebSocket server from server.ts

### ⏳ TODO (Next Steps)

- [ ] Add mutations that publish events:
  - `reportIncident` → publishes `notificationReported`
  - `confirmReport` → publishes `notificationConfirmed`
  - `resolveNotification` → publishes `reputationUpdated`
- [ ] Integrate threshold algorithm in confirm mutation
- [ ] Add authentication to subscription context
- [ ] Persist notifications to MongoDB
- [ ] Add SubscriptionManager component to app layout

## Quick Start

### 1. Start Server

```bash
npm run dev
# GraphQL WebSocket available at ws://localhost:3000/api/graphql
```

### 2. Add SubscriptionManager to Layout

```typescript
// app/layout.tsx
"use client";
import { SubscriptionManager } from "@/components/subscription-manager";

export default function Layout({ children }) {
  return (
    <html>
      <body>
        <SubscriptionManager />
        {children}
      </body>
    </html>
  );
}
```

### 3. Create SubscriptionManager Component

```typescript
// src/components/subscription-manager.tsx
"use client";

import {
  useNotificationReportedSubscription,
  useOfficialNotificationSubscription,
} from "@/hooks/use-graphql-subscriptions";
import { useAppStore } from "@/store/use-app-store";

export function SubscriptionManager() {
  const journeyLines = useAppStore((state) => state.journeyLines);
  const addPendingNotification = useAppStore(
    (state) => state.addPendingNotification
  );
  const addOfficialNotification = useAppStore(
    (state) => state.addOfficialNotification
  );

  // Subscribe to notifications on active journey
  useNotificationReportedSubscription(
    journeyLines.length > 0 ? journeyLines : null,
    addPendingNotification
  );

  // Subscribe to official notifications
  useOfficialNotificationSubscription(addOfficialNotification);

  return null; // This is a provider component
}
```

## Benefits of This Approach

1. **Single Connection** - Only one WebSocket instead of two
2. **Type Safety** - GraphQL schema provides type checking
3. **GraphiQL Support** - Test subscriptions in the browser
4. **Simpler Auth** - Reuses existing GraphQL auth
5. **Standard Protocol** - GraphQL subscriptions are well-documented
6. **Better DX** - Schema-first development

## Testing Subscriptions

### In GraphiQL

1. Open `http://localhost:3000/api/graphql`
2. Write subscription:

```graphql
subscription {
  notificationReported(lineIds: ["line-123"]) {
    id
    title
    description
    reportCount
  }
}
```

3. In another tab, trigger a mutation:

```graphql
mutation {
  reportIncident(
    input: {
      title: "Bus Delay"
      lineId: "line-123"
      # ...
    }
  ) {
    id
  }
}
```

4. See the subscription update in real-time!

## Conclusion

The architecture is now **correct and simplified**:

- ✅ Uses existing GraphQL Yoga WebSocket
- ✅ Single endpoint for queries, mutations, AND subscriptions
- ✅ Type-safe with GraphQL schema
- ✅ Easier to maintain and test

**Next step**: Implement the mutations that publish events to make the system fully functional.
