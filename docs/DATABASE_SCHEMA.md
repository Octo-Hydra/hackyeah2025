# MongoDB Collections Schema

This document describes the MongoDB collections used in the HackYeah 2025 application.

## Collections Overview

1. **users** - User accounts (managed by NextAuth.js)
2. **accounts** - OAuth accounts (managed by NextAuth.js)
3. **sessions** - User sessions (managed by NextAuth.js)
4. **verificationTokens** - Email verification (managed by NextAuth.js)
5. **pushSubscriptions** - Push notification subscriptions (custom)

---

## 1. users Collection

Stores user account information. Managed by NextAuth.js MongoDB Adapter.

```typescript
{
  _id: ObjectId,
  name: string,
  email: string,
  password?: string,           // Only for credentials users (hashed with bcrypt)
  emailVerified: Date | null,
  image: string | null,
  createdAt: Date,
  updatedAt: Date,
}
```

### Indexes

- `email` (unique)

### Example Document

```json
{
  "_id": ObjectId("..."),
  "name": "John Doe",
  "email": "john@example.com",
  "password": "$2a$10$...",
  "emailVerified": null,
  "image": null,
  "createdAt": ISODate("2025-10-04T10:00:00Z"),
  "updatedAt": ISODate("2025-10-04T10:00:00Z")
}
```

---

## 2. accounts Collection

Stores OAuth provider account information. Managed by NextAuth.js MongoDB Adapter.

```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  type: string,                // e.g., "oauth"
  provider: string,            // e.g., "google"
  providerAccountId: string,
  refresh_token?: string,
  access_token?: string,
  expires_at?: number,
  token_type?: string,
  scope?: string,
  id_token?: string,
  session_state?: string,
}
```

### Indexes

- `userId`
- `provider`, `providerAccountId` (compound, unique)

---

## 3. sessions Collection

Stores active user sessions. Managed by NextAuth.js MongoDB Adapter.

```typescript
{
  _id: ObjectId,
  sessionToken: string,
  userId: ObjectId,
  expires: Date,
}
```

### Indexes

- `sessionToken` (unique)
- `userId`

---

## 4. verificationTokens Collection

Stores email verification tokens. Managed by NextAuth.js MongoDB Adapter.

```typescript
{
  _id: ObjectId,
  identifier: string,
  token: string,
  expires: Date,
}
```

### Indexes

- `identifier`, `token` (compound, unique)

---

## 5. pushSubscriptions Collection

**Custom collection** for storing Web Push API subscriptions.

```typescript
{
  _id: ObjectId,
  endpoint: string,              // Push service endpoint URL
  expirationTime: number | null, // Subscription expiration (null = no expiration)
  keys: {
    p256dh: string,              // P-256 ECDH public key
    auth: string,                // Authentication secret
  },
  createdAt: Date,
  updatedAt: Date,
}
```

### Indexes

- `endpoint` (unique)

### Example Document

```json
{
  "_id": ObjectId("..."),
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "expirationTime": null,
  "keys": {
    "p256dh": "BK...",
    "auth": "xY..."
  },
  "createdAt": ISODate("2025-10-04T10:00:00Z"),
  "updatedAt": ISODate("2025-10-04T10:00:00Z")
}
```

### Operations

#### Subscribe User

```typescript
await db.collection("pushSubscriptions").insertOne({
  endpoint: subscription.endpoint,
  expirationTime: subscription.expirationTime,
  keys: subscription.keys,
  createdAt: new Date(),
  updatedAt: new Date(),
});
```

#### Unsubscribe User

```typescript
await db.collection("pushSubscriptions").deleteOne({
  endpoint: subscription.endpoint,
});
```

#### Get All Active Subscriptions

```typescript
const subscriptions = await db
  .collection("pushSubscriptions")
  .find({})
  .toArray();
```

#### Remove Invalid Subscription (410 Gone)

```typescript
// Automatically called when push service returns 410 or 404
await db.collection("pushSubscriptions").deleteOne({
  endpoint: subscription.endpoint,
});
```

---

## Database Setup

### Create Indexes

Run this in MongoDB shell or using MongoDB Compass:

```javascript
// Users collection
db.users.createIndex({ email: 1 }, { unique: true });

// Accounts collection
db.accounts.createIndex({ userId: 1 });
db.accounts.createIndex(
  { provider: 1, providerAccountId: 1 },
  { unique: true }
);

// Sessions collection
db.sessions.createIndex({ sessionToken: 1 }, { unique: true });
db.sessions.createIndex({ userId: 1 });

// Verification tokens collection
db.verificationTokens.createIndex(
  { identifier: 1, token: 1 },
  { unique: true }
);

// Push subscriptions collection (custom)
db.pushSubscriptions.createIndex({ endpoint: 1 }, { unique: true });
```

### Automatic Index Creation

NextAuth.js MongoDB Adapter automatically creates indexes for users, accounts, sessions, and verificationTokens on first use.

For `pushSubscriptions`, the index is created automatically when the first subscription is inserted with the unique constraint.

---

## MongoDB Connection

### Connection String

```env
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/hackyeah2025

# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hackyeah2025?retryWrites=true&w=majority
```

### Connection Management

The application uses a singleton pattern for MongoDB connection (see `src/lib/mongodb.ts`):

- **Development**: Connection is cached globally to survive HMR
- **Production**: New connection per serverless function invocation
- **Connection Pooling**: Automatically managed by MongoDB driver

---

## Data Retention & Cleanup

### Automatic Cleanup

1. **Invalid Push Subscriptions**: Automatically removed when push service returns 410 (Gone) or 404 (Not Found)
2. **Expired Sessions**: Consider implementing a cleanup cron job

### Manual Cleanup Example

```javascript
// Remove expired sessions
db.sessions.deleteMany({ expires: { $lt: new Date() } });

// Remove old verification tokens
db.verificationTokens.deleteMany({ expires: { $lt: new Date() } });

// Remove push subscriptions older than 90 days without updates
const ninetyDaysAgo = new Date();
ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
db.pushSubscriptions.deleteMany({
  updatedAt: { $lt: ninetyDaysAgo },
});
```

---

## Performance Considerations

1. **Indexes**: All recommended indexes are created for optimal query performance
2. **Connection Pooling**: Configured in `src/lib/mongodb.ts`
3. **Query Optimization**: Use projection to limit returned fields when not all are needed
4. **Aggregation**: For complex queries, consider using MongoDB aggregation pipeline

---

## Security Best Practices

1. ✅ **Never store plain text passwords** - Use bcrypt (10 rounds)
2. ✅ **Validate input** - Use Zod schemas before database operations
3. ✅ **Sanitize queries** - MongoDB driver handles this automatically
4. ✅ **Use environment variables** - Never commit connection strings
5. ✅ **Enable authentication** - MongoDB should require username/password
6. ✅ **Whitelist IPs** - For MongoDB Atlas, configure IP whitelist
7. ✅ **Regular backups** - Configure automatic backups in MongoDB Atlas

---

## Monitoring & Debugging

### Check Connection Status

```typescript
import clientPromise from "@/lib/mongodb";

const client = await clientPromise;
const admin = client.db().admin();
const status = await admin.serverStatus();
console.log("MongoDB status:", status);
```

### Query Examples

```typescript
// Count total users
const userCount = await db.collection("users").countDocuments();

// Count active push subscriptions
const subCount = await db.collection("pushSubscriptions").countDocuments();

// Find users with push subscriptions
const usersWithPush = await db
  .collection("users")
  .aggregate([
    {
      $lookup: {
        from: "pushSubscriptions",
        localField: "email",
        foreignField: "userEmail", // You can add this field if needed
        as: "subscriptions",
      },
    },
    {
      $match: {
        subscriptions: { $ne: [] },
      },
    },
  ])
  .toArray();
```

---

## Future Enhancements

Consider adding these collections/fields for Yanosik-like features:

1. **alerts** - Store traffic alerts, speed cameras, police reports
2. **locations** - Store user location history (privacy considerations!)
3. **reports** - User-generated reports
4. **routes** - Saved routes and navigation history
5. **userPreferences** - Notification settings, map preferences

Example alerts collection:

```typescript
{
  _id: ObjectId,
  type: "speed_camera" | "police" | "traffic" | "hazard",
  location: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  description: string,
  severity: "low" | "medium" | "high",
  reportedBy: ObjectId,  // User ID
  verifiedBy: ObjectId[], // Users who confirmed
  createdAt: Date,
  expiresAt: Date,
}
```

With geospatial index:

```javascript
db.alerts.createIndex({ location: "2dsphere" });
```
