# WebSocket Subscriptions - Quick Reference

## 🚀 Start Testing NOW

```bash
npm run dev
```

Open: `http://localhost:4000/graphql`

## 📡 Basic Subscriptions

### Listen to ALL new incidents
```graphql
subscription {
  incidentCreated {
    id
    title
    description
    kind
    status
  }
}
```

### Listen to updates
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

### Listen to resolved incidents
```graphql
subscription {
  incidentResolved {
    id
    title
    status
  }
}
```

## 🎯 Line-Specific Subscriptions

### Single line
```graphql
subscription OnLine($lineId: ID!) {
  lineIncidentUpdates(lineId: $lineId) {
    id
    title
    lineIds
  }
}
```
Variables: `{ "lineId": "your_line_id" }`

### Multiple lines (favorites)
```graphql
subscription OnFavorites($lineIds: [ID!]!) {
  myLinesIncidents(lineIds: $lineIds) {
    id
    title
    lineIds
  }
}
```
Variables: `{ "lineIds": ["id1", "id2", "id3"] }`

## 🚌 Transport Type Filter

```graphql
subscription {
  incidentCreated(transportType: BUS) {
    id
    title
  }
}
```

Types: `BUS`, `TRAM`, `TRAIN`, `METRO`

## 🧪 Test Mutation

Create incident in another tab:
```graphql
mutation {
  createReport(input: {
    title: "Test incident"
    description: "Testing subscriptions"
    kind: DELAY
    status: PUBLISHED
  }) {
    id
  }
}
```

## 💻 Frontend Integration (Apollo Client)

```typescript
import { useSubscription, gql } from '@apollo/client';

const INCIDENT_SUB = gql`
  subscription {
    incidentCreated {
      id
      title
      status
    }
  }
`;

function App() {
  const { data } = useSubscription(INCIDENT_SUB);
  
  useEffect(() => {
    if (data?.incidentCreated) {
      showNotification(data.incidentCreated);
    }
  }, [data]);
}
```

## 🔗 WebSocket URL

- **Development**: `ws://localhost:4000/graphql`
- **Production**: `wss://your-domain.com/graphql`

## 📊 Event Flow

```
User creates incident
    ↓
createReport() mutation
    ↓
pubsub.publish(INCIDENT_CREATED)
    ↓
All subscribers receive event
    ↓
Frontend updates UI in real-time
```

## 🔑 Key Features

✅ **Real-time** - Events arrive in milliseconds  
✅ **Filtered** - Subscribe only to what you need  
✅ **Multiple subscribers** - Many clients can listen  
✅ **Line-specific** - Monitor individual lines  
✅ **Transport filtering** - BUS/TRAM/TRAIN/METRO  
✅ **Status tracking** - CREATED/UPDATED/RESOLVED  

## 📚 Full Documentation

- **Technical Guide**: `docs/WEBSOCKET_SUBSCRIPTIONS.md`
- **Testing Guide**: `docs/SUBSCRIPTION_TESTING.md`
- **Polish Summary**: `docs/SUBSCRIPTION_SUMMARY_PL.md`

## 🐛 Troubleshooting

**No connection?**
- Check server is running: `npm run dev`
- Verify URL: `ws://localhost:4000/graphql`

**No events?**
- Ensure incident status is `PUBLISHED` (not DRAFT)
- Check mutation executed successfully
- Verify lineId matches for line subscriptions

**Multiple events?**
- Expected if multiple subscriptions match
- Each subscriber gets their own copy

---

**Ready to test!** Open GraphQL Playground and try the subscriptions above. 🎉
