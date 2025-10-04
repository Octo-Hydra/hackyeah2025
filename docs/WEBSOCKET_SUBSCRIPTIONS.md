# WebSocket Subscriptions - Real-Time Incident Updates

This document explains how to use GraphQL WebSocket subscriptions to receive real-time incident updates in the web frontend.

## Overview

The system supports real-time notifications for:
- **New incidents** (incidentCreated)
- **Incident updates** (incidentUpdated)
- **Resolved incidents** (incidentResolved)
- **Line-specific updates** (lineIncidentUpdates)
- **User's favorite lines** (myLinesIncidents)
- **Path-affecting incidents** (pathAffectedByIncident)

## Connection Details

- **WebSocket URL**: `ws://localhost:4000/graphql` (development)
- **Protocol**: GraphQL subscriptions over WebSocket
- **Transport**: Works with `graphql-ws` or `subscriptions-transport-ws`

## Available Subscriptions

### 1. All Incidents Created
```graphql
subscription OnIncidentCreated {
  incidentCreated {
    id
    title
    description
    kind
    incidentClass
    status
    lineIds
    createdAt
  }
}
```

### 2. All Incidents Updated
```graphql
subscription OnIncidentUpdated {
  incidentUpdated {
    id
    title
    description
    status
    updatedAt
  }
}
```

### 3. All Incidents Resolved
```graphql
subscription OnIncidentResolved {
  incidentResolved {
    id
    title
    status
    updatedAt
  }
}
```

### 4. Line-Specific Updates
Subscribe to incidents affecting a specific transit line:

```graphql
subscription OnLineIncidents($lineId: ID!) {
  lineIncidentUpdates(lineId: $lineId) {
    id
    title
    description
    kind
    lineIds
    status
  }
}
```

**Variables:**
```json
{
  "lineId": "60d5f484f1c4a20b1c8e4567"
}
```

### 5. Multiple Lines (User's Favorites)
Subscribe to incidents affecting any of the user's favorite lines:

```graphql
subscription OnMyLinesIncidents($lineIds: [ID!]!) {
  myLinesIncidents(lineIds: $lineIds) {
    id
    title
    description
    kind
    lineIds
    status
  }
}
```

**Variables:**
```json
{
  "lineIds": [
    "60d5f484f1c4a20b1c8e4567",
    "60d5f484f1c4a20b1c8e4568"
  ]
}
```

### 6. Path-Affecting Incidents
Get notified when incidents affect a specific route between origin and destination:

```graphql
subscription OnPathAffected($origin: CoordinatesInput!, $destination: CoordinatesInput!) {
  pathAffectedByIncident(origin: $origin, destination: $destination) {
    incident {
      id
      title
      description
      kind
      lineIds
    }
    affectedLines
    message
    originalPath {
      steps {
        stopName
        arrivalTime
      }
    }
    alternativePath {
      steps {
        stopName
        arrivalTime
      }
    }
  }
}
```

**Variables:**
```json
{
  "origin": {
    "latitude": 52.2297,
    "longitude": 21.0122
  },
  "destination": {
    "latitude": 52.4064,
    "longitude": 16.9252
  }
}
```

## Frontend Integration

### Using `graphql-ws` (Recommended)

```typescript
import { createClient } from 'graphql-ws';

const wsClient = createClient({
  url: 'ws://localhost:4000/graphql',
});

// Subscribe to all new incidents
const unsubscribe = wsClient.subscribe(
  {
    query: `
      subscription {
        incidentCreated {
          id
          title
          description
          kind
          status
        }
      }
    `,
  },
  {
    next: (data) => {
      console.log('New incident:', data.data.incidentCreated);
      // Update UI with new incident
    },
    error: (error) => {
      console.error('Subscription error:', error);
    },
    complete: () => {
      console.log('Subscription completed');
    },
  }
);

// Cleanup when component unmounts
// unsubscribe();
```

### Using Apollo Client

```typescript
import { ApolloClient, InMemoryCache, split, HttpLink } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

const httpLink = new HttpLink({
  uri: 'http://localhost:4000/graphql',
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: 'ws://localhost:4000/graphql',
  })
);

// Split traffic between HTTP and WebSocket
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

// In your component
import { useSubscription, gql } from '@apollo/client';

const INCIDENT_CREATED = gql`
  subscription OnIncidentCreated {
    incidentCreated {
      id
      title
      description
      kind
      status
    }
  }
`;

function IncidentNotifications() {
  const { data, loading, error } = useSubscription(INCIDENT_CREATED);

  if (loading) return <p>Waiting for incidents...</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (data) {
    // New incident received
    console.log('New incident:', data.incidentCreated);
  }

  return <div>Monitoring incidents...</div>;
}
```

### Using `urql`

```typescript
import { createClient, defaultExchanges, subscriptionExchange } from 'urql';
import { createClient as createWSClient } from 'graphql-ws';

const wsClient = createWSClient({
  url: 'ws://localhost:4000/graphql',
});

const client = createClient({
  url: 'http://localhost:4000/graphql',
  exchanges: [
    ...defaultExchanges,
    subscriptionExchange({
      forwardSubscription: (operation) => ({
        subscribe: (sink) => ({
          unsubscribe: wsClient.subscribe(operation, sink),
        }),
      }),
    }),
  ],
});

// In your component
import { useSubscription } from 'urql';

const INCIDENT_CREATED = `
  subscription {
    incidentCreated {
      id
      title
      description
      kind
      status
    }
  }
`;

function IncidentNotifications() {
  const [result] = useSubscription({ query: INCIDENT_CREATED });

  if (result.fetching) return <p>Waiting for incidents...</p>;
  if (result.error) return <p>Error: {result.error.message}</p>;
  if (result.data) {
    console.log('New incident:', result.data.incidentCreated);
  }

  return <div>Monitoring incidents...</div>;
}
```

## Testing with GraphQL Playground

1. Open GraphQL Playground: `http://localhost:4000/graphql`
2. Click on "SUBSCRIPTIONS" tab
3. Paste a subscription query (e.g., `incidentCreated`)
4. Click the "Play" button
5. In another tab, create a new incident with a mutation
6. See the subscription receive the event in real-time

## Event Flow

1. **Carrier creates incident** → `createReport` mutation
2. **Backend publishes event** → `pubsub.publish(CHANNELS.INCIDENT_CREATED, incident)`
3. **All subscribers receive** → `incidentCreated` subscription fires
4. **Line-specific subscribers** → If incident has lineIds, `lineIncidentUpdates` subscribers for those lines also receive it

## Transport Type Filtering

All subscriptions support optional transport type filtering:

```graphql
subscription OnBusIncidents {
  incidentCreated(transportType: BUS) {
    id
    title
  }
}
```

Available transport types:
- `BUS`
- `TRAM`
- `TRAIN`
- `METRO`

## Performance Notes

- **In-Memory PubSub**: Currently uses in-memory event emitter (single server)
- **Scalability**: For production with multiple servers, consider Redis PubSub
- **Connection Limit**: WebSocket connections are long-lived, monitor server resources
- **Reconnection**: Implement client-side reconnection logic for network issues

## Security Considerations

- **Authentication**: Add auth checks in subscription resolvers if needed
- **Rate Limiting**: Consider limiting subscription frequency
- **Authorization**: Filter incidents based on user permissions

## Next Steps

- [ ] Add Redis PubSub for multi-server deployment
- [ ] Implement `pathAffectedByIncident` logic (check if incident affects route)
- [ ] Add authentication to subscription context
- [ ] Implement subscription rate limiting
- [ ] Add subscription metrics/monitoring
