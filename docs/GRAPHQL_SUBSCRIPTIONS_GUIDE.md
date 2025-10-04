# Using GraphQL Subscriptions with Zustand Store

## Overview

The notification system now uses **GraphQL subscriptions via Yoga WebSocket** instead of a separate WebSocket server. This integrates seamlessly with your existing GraphQL setup.

## Why GraphQL Subscriptions?

✅ **Single WebSocket connection** - Reuses your existing Yoga GraphQL WebSocket  
✅ **Type-safe** - Fully integrated with GraphQL schema  
✅ **Easier to maintain** - One system instead of two  
✅ **Better authentication** - Uses your existing GraphQL auth  
✅ **GraphiQL support** - Test subscriptions in GraphiQL

## GraphQL Schema

New subscription types in `schema.graphql`:

```graphql
type Subscription {
  # Subscribe to new reports on specific lines
  notificationReported(lineIds: [String!]): NotificationReport!

  # Subscribe to report confirmations
  notificationConfirmed(lineIds: [String!]): NotificationReport!

  # Subscribe to official notifications (all lines)
  notificationOfficial: OfficialNotification!

  # Subscribe to your reputation updates
  reputationUpdated(userId: String!): ReputationUpdate!
}
```

## Usage with React Hooks

### 1. Subscribe to New Reports

```typescript
"use client";

import { useNotificationReportedSubscription } from "@/hooks/use-graphql-subscriptions";
import { useAppStore } from "@/store/use-app-store";

export function NotificationListener() {
  const journeyLines = useAppStore((state) => state.journeyLines);
  const addPendingNotification = useAppStore(
    (state) => state.addPendingNotification
  );

  useNotificationReportedSubscription(
    journeyLines.length > 0 ? journeyLines : null,
    (notification) => {
      console.log("New notification:", notification);
      addPendingNotification(notification);
    }
  );

  return null;
}
```

### 2. Subscribe to Report Confirmations

```typescript
"use client";

import { useNotificationConfirmedSubscription } from "@/hooks/use-graphql-subscriptions";
import { useAppStore } from "@/store/use-app-store";

export function ConfirmationListener() {
  const journeyLines = useAppStore((state) => state.journeyLines);
  const addPendingNotification = useAppStore(
    (state) => state.addPendingNotification
  );

  useNotificationConfirmedSubscription(
    journeyLines.length > 0 ? journeyLines : null,
    (notification) => {
      console.log("Notification confirmed:", notification);
      // Update existing notification with new confirmation
      addPendingNotification(notification);
    }
  );

  return null;
}
```

### 3. Subscribe to Official Notifications

```typescript
"use client";

import { useOfficialNotificationSubscription } from "@/hooks/use-graphql-subscriptions";
import { useAppStore } from "@/store/use-app-store";

export function OfficialNotificationListener() {
  const addOfficialNotification = useAppStore(
    (state) => state.addOfficialNotification
  );

  useOfficialNotificationSubscription((notification) => {
    console.log("Official notification!", notification);
    addOfficialNotification(notification);

    // Show browser notification
    if (Notification.permission === "granted") {
      new Notification("⚠️ Official Alert", {
        body: notification.title,
        icon: "/alert-icon.png",
      });
    }
  });

  return null;
}
```

### 4. Subscribe to Your Reputation Updates

```typescript
"use client";

import { useReputationUpdateSubscription } from "@/hooks/use-graphql-subscriptions";
import { useAppStore } from "@/store/use-app-store";

export function ReputationListener() {
  const user = useAppStore((state) => state.user);
  const updateUserReputation = useAppStore(
    (state) => state.updateUserReputation
  );
  const addReputationChange = useAppStore((state) => state.addReputationChange);

  useReputationUpdateSubscription(user?.id || null, (update) => {
    console.log("Reputation updated:", update);
    updateUserReputation(update.change);
    addReputationChange({
      userId: update.userId,
      change: update.change,
      reason: update.reason,
      notificationId: "", // If available
      timestamp: new Date(update.timestamp),
    });
  });

  return null;
}
```

### 5. Combine All Listeners

```typescript
"use client";

import {
  useNotificationReportedSubscription,
  useNotificationConfirmedSubscription,
  useOfficialNotificationSubscription,
  useReputationUpdateSubscription,
} from "@/hooks/use-graphql-subscriptions";
import { useAppStore } from "@/store/use-app-store";

export function SubscriptionManager() {
  const user = useAppStore((state) => state.user);
  const journeyLines = useAppStore((state) => state.journeyLines);
  const addPendingNotification = useAppStore(
    (state) => state.addPendingNotification
  );
  const addOfficialNotification = useAppStore(
    (state) => state.addOfficialNotification
  );
  const updateUserReputation = useAppStore(
    (state) => state.updateUserReputation
  );

  // Subscribe to new reports on active journey lines
  useNotificationReportedSubscription(
    journeyLines.length > 0 ? journeyLines : null,
    addPendingNotification
  );

  // Subscribe to confirmations
  useNotificationConfirmedSubscription(
    journeyLines.length > 0 ? journeyLines : null,
    addPendingNotification
  );

  // Subscribe to official notifications
  useOfficialNotificationSubscription(addOfficialNotification);

  // Subscribe to reputation updates
  useReputationUpdateSubscription(user?.id || null, (update) =>
    updateUserReputation(update.change)
  );

  return null;
}
```

### 6. Add to Your App Layout

```typescript
// app/layout.tsx
"use client";

import { SubscriptionManager } from "@/components/subscription-manager";
import { useStoreInitializer } from "@/hooks/use-store";

export default function RootLayout({ children }) {
  useStoreInitializer();

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

## Backend: Publishing Events

In your GraphQL mutations, publish events using the pubsub:

```typescript
// src/backend/resolvers/notificationMutations.ts
import {
  publishNotificationReported,
  publishNotificationConfirmed,
  publishNotificationOfficial,
  publishReputationUpdated,
} from "./subscriptions";

export const notificationMutations = {
  reportIncident: async (parent: unknown, args: { input: ReportInput }) => {
    // Create notification
    const notification = {
      id: `notif-${Date.now()}`,
      reportedBy: args.input.userId,
      title: args.input.title,
      description: args.input.description,
      kind: args.input.kind,
      lineId: args.input.lineId,
      lineName: args.input.lineName,
      timestamp: new Date().toISOString(),
      status: "PENDING",
      supportingReports: [],
      totalReputation: 50, // User's reputation
      reportCount: 1,
    };

    // Save to database
    // await db.notifications.insert(notification);

    // Publish to subscribers
    publishNotificationReported(notification);

    return notification;
  },

  confirmNotification: async (
    parent: unknown,
    args: { notificationId: string; userId: string }
  ) => {
    // Get notification
    // const notification = await db.notifications.findById(args.notificationId);

    // Add confirmation
    // notification.supportingReports.push(args.userId);
    // notification.reportCount += 1;
    // notification.totalReputation += userReputation;

    // Check if should become official
    // if (shouldBeOfficial(notification)) {
    //   const official = promoteToOfficial(notification);
    //   publishNotificationOfficial(official);
    // } else {
    //   publishNotificationConfirmed(notification);
    // }

    return notification;
  },
};
```

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_GRAPHQL_WS_URL=ws://localhost:3000/api/graphql
```

## Testing in GraphiQL

1. Start your server: `npm run dev`
2. Open GraphiQL: `http://localhost:3000/api/graphql`
3. Test subscriptions:

```graphql
subscription {
  notificationReported(lineIds: ["line-123"]) {
    id
    title
    description
    lineId
    reportCount
  }
}
```

## Migration from Separate WebSocket

The old WebSocket server (`src/backend/websocket-server.ts`) is **no longer needed**.

**What changed:**

- ❌ Removed: Separate WebSocket server on `/ws`
- ✅ Added: GraphQL subscriptions on `/api/graphql` (WebSocket)
- ❌ Removed: Custom WebSocket message types
- ✅ Added: GraphQL subscription types
- ❌ Removed: `useWebSocket()` hook for custom WS
- ✅ Added: `use*Subscription()` hooks for GraphQL

**Benefits:**

- Single WebSocket connection instead of two
- Type-safe with GraphQL schema
- Easier authentication
- Better error handling
- GraphiQL support

## Complete Example Component

```typescript
"use client";

import { useState } from "react";
import {
  useNotificationReportedSubscription,
  useOfficialNotificationSubscription,
} from "@/hooks/use-graphql-subscriptions";
import { useAppStore } from "@/store/use-app-store";

export function NotificationDashboard() {
  const [notifications, setNotifications] = useState([]);
  const journeyLines = useAppStore((state) => state.journeyLines);

  // Subscribe to new reports
  useNotificationReportedSubscription(
    journeyLines.length > 0 ? journeyLines : null,
    (notification) => {
      setNotifications((prev) => [notification, ...prev]);
    }
  );

  // Subscribe to official notifications
  useOfficialNotificationSubscription((notification) => {
    // Show alert for official notifications
    alert(`⚠️ Official: ${notification.title}`);
  });

  return (
    <div>
      <h2>Active Notifications</h2>
      {notifications.map((notif) => (
        <div key={notif.id}>
          <h3>{notif.title}</h3>
          <p>{notif.description}</p>
          <p>Line: {notif.lineName}</p>
          <p>Reports: {notif.reportCount}</p>
        </div>
      ))}
    </div>
  );
}
```

## Next Steps

1. ✅ GraphQL subscriptions are set up
2. ⏳ Add mutations to publish events (`reportIncident`, `confirmReport`)
3. ⏳ Integrate with threshold algorithm in mutations
4. ⏳ Add authentication to subscriptions
5. ⏳ Persist notifications to MongoDB
6. ⏳ Add resolver logic for reputation updates

## Files to Remove

You can safely delete these files (they're no longer needed):

- `src/backend/websocket-server.ts` (replaced by GraphQL subscriptions)
- Old WebSocket integration code

## Files to Keep and Update

- ✅ `src/types/store.ts` - Type definitions (still valid)
- ✅ `src/store/use-app-store.ts` - Zustand store (still valid)
- ✅ `src/lib/threshold-algorithm.ts` - Algorithm (still valid)
- ✅ `src/hooks/use-store.ts` - Store hooks (still valid)
- ✅ **NEW**: `src/hooks/use-graphql-subscriptions.ts` - GraphQL subscription hooks
- ✅ **NEW**: `src/backend/resolvers/subscriptions.ts` - Subscription resolvers
