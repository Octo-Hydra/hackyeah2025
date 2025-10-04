# Admin Panel Quick Start Guide

## 🚀 Quick Setup

### 1. Create First Admin User

```bash
# Method 1: Via MongoDB directly
mongosh

use ontime

db.Users.insertOne({
  name: "Super Admin",
  email: "admin@ontime.app",
  password: "$2a$10$YourHashedPasswordHere", // Hash with bcrypt
  role: "ADMIN",
  reputation: 200,
  trustScore: 2.0
})
```

```bash
# Method 2: Via GraphQL (register + manual role update)
# Step 1: Register
mutation {
  register(
    name: "Admin User"
    email: "admin@ontime.app"
    password: "SecurePassword123!"
  )
}

# Step 2: Update role in MongoDB
db.Users.updateOne(
  { email: "admin@ontime.app" },
  { $set: { role: "ADMIN" } }
)
```

### 2. Get Admin Token

```graphql
# Login to get JWT token (use NextAuth or your auth system)
# Token will contain: { id: "userId", role: "ADMIN" }
```

### 3. Test Admin Access

```graphql
query TestAdminAccess {
  admin {
    stats {
      totalUsers
      totalIncidents
    }
  }
}
```

---

## 📊 Common Admin Queries

### Get All Users

```graphql
query {
  admin {
    users(pagination: { first: 20 }) {
      edges {
        node {
          id
          name
          email
          role
          reputation
        }
      }
      totalCount
    }
  }
}
```

### Find High-Reputation Users

```graphql
query {
  admin {
    users(filter: { minReputation: 150 }) {
      edges {
        node {
          name
          reputation
          trustScore
        }
      }
    }
  }
}
```

### Get Active Incidents

```graphql
query {
  admin {
    incidents(filter: { status: PUBLISHED }) {
      edges {
        node {
          title
          kind
          reporter { name }
        }
      }
    }
  }
}
```

---

## 🔧 Common Admin Mutations

### Create Moderator

```graphql
mutation {
  admin {
    createUser(input: {
      name: "Jane Moderator"
      email: "jane@ontime.app"
      password: "ModPass123!"
      role: MODERATOR
      reputation: 150
    }) {
      id
      name
      role
    }
  }
}
```

### Create Official Incident

```graphql
mutation {
  admin {
    createIncident(input: {
      title: "Metro M1 - Planowana przerwa"
      description: "Przerwa techniczna 01:00-05:00"
      kind: NETWORK_FAILURE
      status: PUBLISHED
      lineIds: ["line_id_here"]
    }) {
      id
      title
    }
  }
}
```

### Resolve Multiple Incidents

```graphql
mutation {
  admin {
    bulkResolveIncidents(ids: ["id1", "id2", "id3"]) {
      id
      status
    }
  }
}
```

---

## 🎯 Authorization

### Headers

```javascript
{
  "Authorization": "Bearer <admin_jwt_token>",
  "Content-Type": "application/json"
}
```

### Permissions

| Operation | USER | MODERATOR | ADMIN |
|-----------|------|-----------|-------|
| View stats | ❌ | ✅ | ✅ |
| View users | ❌ | ✅ | ✅ |
| Create user | ❌ | ❌ | ✅ |
| Update user | ❌ | ❌ | ✅ |
| Delete user | ❌ | ❌ | ✅ |
| View incidents | ❌ | ✅ | ✅ |
| Create incident | ❌ | ✅ | ✅ |
| Delete incident | ❌ | ✅ | ✅ |

---

## 🧪 Testing

```bash
# Run test script
node test-admin-api.mjs
```

Update `ADMIN_TOKEN` in the script first!

---

## 📚 Full Documentation

See `docs/ADMIN_PANEL_API.md` for complete API reference.
