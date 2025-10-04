# Testing WebSocket Subscriptions

## Quick Test Guide

### 1. Start the Server
```bash
npm run dev
```

### 2. Open GraphQL Playground
Navigate to: `http://localhost:4000/graphql`

### 3. Test Basic Subscription

**Tab 1 - Subscribe to new incidents:**
```graphql
subscription {
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

Click the Play button. You should see "Listening..." status.

**Tab 2 - Create a test incident:**
```graphql
mutation CreateTestIncident {
  createReport(input: {
    title: "Track maintenance on Line 1"
    description: "Emergency track maintenance between stops A and B"
    kind: MAINTENANCE
    status: PUBLISHED
  }) {
    id
    title
    status
  }
}
```

**Result:** Tab 1 should immediately receive the new incident data!

### 4. Test Line-Specific Subscription

First, get a line ID from your database:

```graphql
query GetLines {
  lines {
    id
    name
    transportType
  }
}
```

Then subscribe to updates for that specific line:

```graphql
subscription OnLineUpdates($lineId: ID!) {
  lineIncidentUpdates(lineId: $lineId) {
    id
    title
    description
    lineIds
    status
  }
}
```

Variables:
```json
{
  "lineId": "YOUR_LINE_ID_HERE"
}
```

Create an incident affecting that line to see the subscription fire.

### 5. Test Update and Resolve

**Subscribe to updates:**
```graphql
subscription {
  incidentUpdated {
    id
    title
    status
    updatedAt
  }
}
```

**Subscribe to resolved incidents:**
```graphql
subscription {
  incidentResolved {
    id
    title
    status
    updatedAt
  }
}
```

**Update an incident:**
```graphql
mutation UpdateIncident($id: ID!) {
  updateReport(
    id: $id
    input: {
      title: "Updated: Track maintenance extended"
      description: "Maintenance will take longer than expected"
    }
  ) {
    id
    title
    status
    updatedAt
  }
}
```

**Resolve an incident:**
```graphql
mutation ResolveIncident($id: ID!) {
  updateReport(
    id: $id
    input: {
      status: RESOLVED
    }
  ) {
    id
    title
    status
  }
}
```

### 6. Test Transport Type Filtering

Subscribe only to bus incidents:

```graphql
subscription {
  incidentCreated(transportType: BUS) {
    id
    title
    kind
    lineIds
  }
}
```

Create incidents with different transport types - only BUS incidents will appear.

### 7. Test Multiple Lines Subscription

```graphql
subscription OnMyLines($lineIds: [ID!]!) {
  myLinesIncidents(lineIds: $lineIds) {
    id
    title
    lineIds
    status
  }
}
```

Variables:
```json
{
  "lineIds": ["line1_id", "line2_id", "line3_id"]
}
```

Create incidents affecting any of these lines to see the subscription fire.

## Expected Behavior

1. **Immediate delivery**: Events should arrive within milliseconds
2. **No polling**: Connection stays open, server pushes updates
3. **Multiple subscribers**: Multiple clients can subscribe to same events
4. **Filtering works**: transportType filter should exclude non-matching incidents
5. **Line-specific**: lineIncidentUpdates only fires when lineIds match

## Troubleshooting

### Subscription doesn't connect
- Check server is running on port 4000
- Verify WebSocket endpoint: `ws://localhost:4000/graphql`
- Check browser console for connection errors

### No events received
- Verify mutation was executed successfully
- Check that incident has `PUBLISHED` status (drafts don't trigger events)
- For lineIncidentUpdates, ensure incident has the matching lineId

### Events received multiple times
- This is expected if multiple subscriptions match the same incident
- Each subscriber gets its own copy of the event

### Connection drops
- WebSocket connections can timeout after inactivity
- Implement reconnection logic in production clients
- Consider adding keepalive/ping messages

## Performance Testing

Test with multiple concurrent subscriptions:

1. Open 5+ GraphQL Playground tabs
2. Subscribe to `incidentCreated` in each
3. Create one incident in another tab
4. All subscriptions should receive the event simultaneously

This validates the PubSub fanout mechanism is working correctly.

## Next: Frontend Integration

Once subscriptions work in GraphQL Playground, integrate them into your React/Next.js frontend using Apollo Client or urql as shown in `WEBSOCKET_SUBSCRIPTIONS.md`.
