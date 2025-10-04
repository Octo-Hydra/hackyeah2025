# Admin Panel API Documentation

## 🎯 Overview

Admin Panel API provides comprehensive **CRUD operations** for:
- **Users**: Create, update, delete users without registration flow
- **Incidents**: Advanced incident management including bulk operations
- **Statistics**: System-wide analytics and reports

**Authorization**:
- 👤 **USER CRUD**: ADMIN only
- 🔧 **Incident Management**: ADMIN or MODERATOR
- 📊 **Statistics**: ADMIN or MODERATOR

---

## 📊 AdminQuery

### 1. Get Users (with Filtering & Pagination)

```graphql
query GetUsers {
  admin {
    users(
      filter: {
        role: MODERATOR
        minReputation: 100
        search: "john"
      }
      pagination: {
        first: 20
        after: "507f1f77bcf86cd799439011" # User ID, not cursor
      }
    ) {
      edges {
        node {
          id
          name
          email
          role
          reputation
          trustScore
          trustScoreBreakdown {
            baseScore
            accuracyBonus
            highRepBonus
            validationRate
            updatedAt
          }
        }
        id # User ID (same as node.id)
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor # First user ID
        endCursor # Last user ID
      }
      totalCount
    }
  }
}
```

**Filters**:
- `role`: USER | MODERATOR | ADMIN
- `minReputation`: Minimum reputation score
- `maxReputation`: Maximum reputation score
- `minTrustScore`: Minimum trust score (0.5-2.5)
- `maxTrustScore`: Maximum trust score
- `search`: Search by name or email (case-insensitive)

**Response**:
```json
{
  "data": {
    "admin": {
      "users": {
        "edges": [
          {
            "node": {
              "id": "507f1f77bcf86cd799439011",
              "name": "John Moderator",
              "email": "john@example.com",
              "role": "MODERATOR",
              "reputation": 150,
              "trustScore": 1.5,
              "trustScoreBreakdown": {
                "baseScore": 1.5,
                "accuracyBonus": 0.2,
                "highRepBonus": 0.3,
                "validationRate": 0.85
              }
            },
            "id": "507f1f77bcf86cd799439011"
          }
        ],
        "pageInfo": {
          "hasNextPage": true,
          "hasPreviousPage": false,
          "startCursor": "507f1f77bcf86cd799439011",
          "endCursor": "507f1f77bcf86cd799439012"
        },
        "totalCount": 45
      }
    }
  }
}
```

---

### 2. Get Single User

```graphql
query GetUser {
  admin {
    user(id: "507f1f77bcf86cd799439011") {
      id
      name
      email
      role
      reputation
      trustScore
      activeJourney {
        segments {
          lineName
        }
        startTime
        expectedEndTime
      }
    }
  }
}
```

---

### 3. Get Incidents (with Filtering & Pagination)

```graphql
query GetIncidents {
  admin {
    incidents(
      filter: {
        status: PUBLISHED
        kind: TRAFFIC_JAM
        lineId: "507f1f77bcf86cd799439011"
        dateFrom: "2025-01-01T00:00:00Z"
        dateTo: "2025-12-31T23:59:59Z"
      }
      pagination: {
        first: 10
      }
    ) {
      edges {
        node {
          id
          title
          description
          kind
          status
          lines {
            id
            name
            transportType
          }
          isFake
          reporter {
            name
            trustScore
          }
          createdAt
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
}
```

**Filters**:
- `status`: DRAFT | PUBLISHED | RESOLVED
- `kind`: INCIDENT | NETWORK_FAILURE | VEHICLE_FAILURE | ACCIDENT | TRAFFIC_JAM | PLATFORM_CHANGES
- `lineId`: Filter by specific line
- `transportType`: BUS | RAIL
- `isFake`: true | false
- `reportedBy`: User ID who reported
- `dateFrom`: ISO date string (start date)
- `dateTo`: ISO date string (end date)

---

### 4. Get Archived Incidents

```graphql
query GetArchivedIncidents {
  admin {
    archivedIncidents(
      filter: {
        kind: ACCIDENT
        isFake: false
        dateFrom: "2025-09-01T00:00:00Z"
      }
      pagination: { first: 50 }
    ) {
      edges {
        node {
          id
          title
          status # Always RESOLVED
          createdAt
        }
      }
      totalCount
    }
  }
}
```

**Note**: `archivedIncidents` automatically filters for `status: RESOLVED`.

---

### 5. Get Statistics

```graphql
query GetAdminStats {
  admin {
    stats {
      totalUsers
      totalIncidents
      activeIncidents
      resolvedIncidents
      fakeIncidents
      usersByRole {
        users
        moderators
        admins
      }
      incidentsByKind {
        kind
        count
      }
      averageReputation
      averageTrustScore
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "admin": {
      "stats": {
        "totalUsers": 1250,
        "totalIncidents": 3400,
        "activeIncidents": 45,
        "resolvedIncidents": 3200,
        "fakeIncidents": 155,
        "usersByRole": {
          "users": 1200,
          "moderators": 45,
          "admins": 5
        },
        "incidentsByKind": [
          { "kind": "TRAFFIC_JAM", "count": 1200 },
          { "kind": "ACCIDENT", "count": 800 },
          { "kind": "NETWORK_FAILURE", "count": 600 }
        ],
        "averageReputation": 105.5,
        "averageTrustScore": 1.15
      }
    }
  }
}
```

---

## 🔧 AdminMutation

### 1. Create User (ADMIN only)

```graphql
mutation CreateUser {
  admin {
    createUser(input: {
      name: "New Admin"
      email: "admin@example.com"
      password: "SecurePassword123!"
      role: ADMIN
      reputation: 200
    }) {
      id
      name
      email
      role
      reputation
      trustScore
    }
  }
}
```

**Features**:
- ✅ No registration flow needed
- ✅ Direct password creation (hashed with bcrypt)
- ✅ Set initial reputation (defaults to 100)
- ✅ Assign any role immediately
- ❌ Email must be unique

**Response**:
```json
{
  "data": {
    "admin": {
      "createUser": {
        "id": "507f1f77bcf86cd799439099",
        "name": "New Admin",
        "email": "admin@example.com",
        "role": "ADMIN",
        "reputation": 200,
        "trustScore": 1.0
      }
    }
  }
}
```

---

### 2. Update User (ADMIN only)

```graphql
mutation UpdateUser {
  admin {
    updateUser(
      id: "507f1f77bcf86cd799439011"
      input: {
        name: "Updated Name"
        email: "newemail@example.com"
        password: "NewPassword123!"
        role: MODERATOR
        reputation: 150
      }
    ) {
      id
      name
      email
      role
      reputation
    }
  }
}
```

**Features**:
- ✅ Update any field (all optional)
- ✅ Password automatically hashed if provided
- ✅ Change role on the fly
- ✅ Adjust reputation manually

---

### 3. Delete User (ADMIN only)

```graphql
mutation DeleteUser {
  admin {
    deleteUser(id: "507f1f77bcf86cd799439011")
  }
}
```

**Response**: `true` if deleted, `false` if not found

---

### 4. Update User Role (ADMIN only)

```graphql
mutation UpdateUserRole {
  admin {
    updateUserRole(
      id: "507f1f77bcf86cd799439011"
      role: MODERATOR
    ) {
      id
      name
      role
    }
  }
}
```

Quick way to promote/demote users.

---

### 5. Update User Reputation (ADMIN only)

```graphql
mutation UpdateReputation {
  admin {
    updateUserReputation(
      id: "507f1f77bcf86cd799439011"
      reputation: 250
    ) {
      id
      name
      reputation
      trustScore
    }
  }
}
```

Manually adjust reputation (e.g., for testing or corrections).

---

### 6. Create Admin Incident (ADMIN/MODERATOR)

```graphql
mutation CreateAdminIncident {
  admin {
    createIncident(input: {
      title: "Metro M1 - Planowana przerwa techniczna"
      description: "Przerwa techniczna na stacji Centrum w godz. 22:00-06:00"
      kind: NETWORK_FAILURE
      status: PUBLISHED
      lineIds: ["507f1f77bcf86cd799439011"]
      affectedSegment: {
        startStopId: "507f1f77bcf86cd799439022"
        endStopId: "507f1f77bcf86cd799439023"
        lineId: "507f1f77bcf86cd799439011"
      }
    }) {
      id
      title
      status
      lines {
        name
      }
    }
  }
}
```

**Features**:
- ✅ No reporter location required
- ✅ Can use all incident kinds (including MODERATOR/ADMIN only)
- ✅ Direct PUBLISHED status
- ✅ Automatically assigned to current admin/moderator as reporter

---

### 7. Update Incident (ADMIN/MODERATOR)

```graphql
mutation UpdateIncident {
  admin {
    updateIncident(
      id: "507f1f77bcf86cd799439011"
      input: {
        title: "Updated title"
        status: RESOLVED
        isFake: false
      }
    ) {
      id
      title
      status
      isFake
    }
  }
}
```

---

### 8. Delete Incident (ADMIN/MODERATOR)

```graphql
mutation DeleteIncident {
  admin {
    deleteIncident(id: "507f1f77bcf86cd799439011")
  }
}
```

**Note**: Also deletes associated `IncidentLocations`.

---

### 9. Mark Incident as Fake (ADMIN/MODERATOR)

```graphql
mutation MarkAsFake {
  admin {
    markIncidentAsFake(id: "507f1f77bcf86cd799439011") {
      id
      isFake
      status # Will be RESOLVED
    }
  }
}
```

**Effects**:
- Sets `isFake: true`
- Sets `status: RESOLVED`
- Deactivates incident locations

---

### 10. Restore Incident from Fake (ADMIN/MODERATOR)

```graphql
mutation RestoreIncident {
  admin {
    restoreIncident(id: "507f1f77bcf86cd799439011") {
      id
      isFake # false
      status # PUBLISHED
    }
  }
}
```

**Effects**:
- Sets `isFake: false`
- Sets `status: PUBLISHED`
- Reactivates incident locations

---

### 11. Bulk Resolve Incidents (ADMIN/MODERATOR)

```graphql
mutation BulkResolve {
  admin {
    bulkResolveIncidents(ids: [
      "507f1f77bcf86cd799439011",
      "507f1f77bcf86cd799439012",
      "507f1f77bcf86cd799439013"
    ]) {
      id
      status
    }
  }
}
```

**Use case**: Close multiple incidents at once (e.g., after event ends).

---

### 12. Bulk Delete Incidents (ADMIN/MODERATOR)

```graphql
mutation BulkDelete {
  admin {
    bulkDeleteIncidents(ids: [
      "507f1f77bcf86cd799439011",
      "507f1f77bcf86cd799439012"
    ])
  }
}
```

**Response**: `true` if any deleted, `false` otherwise.

---

## 🔐 Authorization Examples

### Correct Authorization (ADMIN)

```typescript
// Headers
{
  "Authorization": "Bearer <admin_token>"
}

// User role in token: ADMIN
```

### Failed Authorization (USER tries admin query)

```json
{
  "errors": [
    {
      "message": "Admin or Moderator privileges required",
      "path": ["admin", "users"]
    }
  ]
}
```

### Failed Authorization (MODERATOR tries to create user)

```json
{
  "errors": [
    {
      "message": "Admin privileges required",
      "path": ["admin", "createUser"]
    }
  ]
}
```

---

## 📝 Common Use Cases

### Use Case 1: Create New Moderator

```graphql
mutation CreateModerator {
  admin {
    createUser(input: {
      name: "Jane Moderator"
      email: "jane@ontime.app"
      password: "ModeratorPass123!"
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

### Use Case 2: Find All High-Rep Users

```graphql
query FindHighRepUsers {
  admin {
    users(filter: { minReputation: 200 }) {
      edges {
        node {
          name
          reputation
          trustScore
        }
      }
      totalCount
    }
  }
}
```

### Use Case 3: Archive Old Resolved Incidents

```graphql
query GetOldIncidents {
  admin {
    archivedIncidents(
      filter: {
        dateTo: "2025-09-01T00:00:00Z"
      }
      pagination: { first: 100 }
    ) {
      edges {
        node {
          id
          title
          createdAt
        }
      }
    }
  }
}
```

### Use Case 4: Create Planned Maintenance Incident

```graphql
mutation PlannedMaintenance {
  admin {
    createIncident(input: {
      title: "Planowana konserwacja - Linia M2"
      description: "Linia M2 będzie nieczynna 10.10.2025 w godz. 01:00-05:00"
      kind: PLATFORM_CHANGES
      status: PUBLISHED
      lineIds: ["line_m2_id"]
    }) {
      id
      title
      status
    }
  }
}
```

### Use Case 5: Cleanup Fake Reports

```graphql
# Step 1: Find fake incidents
query FindFakeIncidents {
  admin {
    incidents(filter: { isFake: true }) {
      edges {
        node {
          id
          title
        }
      }
    }
  }
}

# Step 2: Bulk delete
mutation CleanupFakes {
  admin {
    bulkDeleteIncidents(ids: ["id1", "id2", "id3"])
  }
}
```

---

## 🎯 Best Practices

### 1. User Management
- ✅ Create admins/moderators directly (skip registration)
- ✅ Set high initial reputation for trusted staff
- ✅ Use `updateUserRole` for quick promotions
- ❌ Don't delete users with active incidents (check first)

### 2. Incident Management
- ✅ Use admin incident creation for official notifications
- ✅ Archive old incidents (move to `archivedIncidents`)
- ✅ Use bulk operations for efficiency
- ✅ Mark fake incidents properly (affects reporter reputation)

### 3. Pagination
- ✅ Use `first: 20` for reasonable page sizes
- ✅ Store `endCursor` (last user/incident ID) for next page
- ✅ Check `hasNextPage` before fetching more
- ❌ Don't fetch all records at once (use pagination)

### 4. Filtering
- ✅ Combine multiple filters for precise queries
- ✅ Use date ranges for historical data
- ✅ Search by email/name for user lookup
- ✅ Filter by reputation/trust score for quality control

---

## 🐛 Troubleshooting

### Error: "Admin privileges required"

**Solution**: Check user role in JWT token:
```typescript
// Token payload must have:
{
  id: "user_id",
  role: "ADMIN" // or "MODERATOR" for some queries
}
```

### Error: "User with this email already exists"

**Solution**: Check existing users first:
```graphql
query CheckEmail {
  admin {
    users(filter: { search: "email@example.com" }) {
      edges {
        node {
          id
          email
        }
      }
    }
  }
}
```

### Pagination not working

**Solution**: Make sure to use ID from previous page's `endCursor`:
```graphql
# Page 1
query Page1 {
  admin {
    users(pagination: { first: 20 }) {
      pageInfo { 
        endCursor # This is the last user's ID, e.g., "507f1f77bcf86cd799439014"
      }
    }
  }
}

# Page 2
query Page2 {
  admin {
    users(pagination: { 
      first: 20, 
      after: "507f1f77bcf86cd799439014" # Use endCursor from Page 1
    }) {
      # ...
    }
  }
}
```

---

## 📚 Related Documentation

- **Authentication**: See `docs/NEXTAUTH_SETUP.md`
- **Trust Score**: See `docs/THRESHOLD_ALGORITHM_INTEGRATION.md`
- **Incident System**: See `docs/PATH_FINDING_WITH_INCIDENTS.md`
- **GraphQL Client**: See `docs/GRAPHQL_CLIENT.md`

---

System jest **w pełni gotowy** do zarządzania użytkownikami i incydentami! 🎉
