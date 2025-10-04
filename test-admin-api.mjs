/**
 * Admin Panel API Test Script
 *
 * Tests:
 * - AdminQuery (users, incidents, stats, archived)
 * - AdminMutation (user CRUD, incident management, bulk ops)
 */

import fetch from "node-fetch";

const GRAPHQL_ENDPOINT = "http://localhost:3000/api/graphql";

// Test admin token (must be created first)
// Run: mutation { register(name: "Admin", email: "admin@test.com", password: "Admin123!") }
// Then update role to ADMIN in MongoDB
const ADMIN_TOKEN = "your_admin_token_here";

async function graphqlRequest(query, variables = {}) {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ADMIN_TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();

  if (result.errors) {
    console.error("❌ GraphQL Errors:", JSON.stringify(result.errors, null, 2));
    return null;
  }

  return result.data;
}

async function testAdminAPI() {
  console.log("=== Admin Panel API Test ===\n");

  // Test 1: Get Admin Stats
  console.log("📊 Test 1: Get Admin Statistics");
  console.log("================================");

  const statsQuery = `
    query GetStats {
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
  `;

  const statsData = await graphqlRequest(statsQuery);
  if (statsData?.admin?.stats) {
    console.log("\n✅ Statistics retrieved:");
    console.log(`   Total users: ${statsData.admin.stats.totalUsers}`);
    console.log(`   Total incidents: ${statsData.admin.stats.totalIncidents}`);
    console.log(`   Active incidents: ${statsData.admin.stats.activeIncidents}`);
    console.log(`   Users by role:`);
    console.log(`      Users: ${statsData.admin.stats.usersByRole.users}`);
    console.log(
      `      Moderators: ${statsData.admin.stats.usersByRole.moderators}`
    );
    console.log(`      Admins: ${statsData.admin.stats.usersByRole.admins}`);
    console.log(
      `   Average reputation: ${statsData.admin.stats.averageReputation.toFixed(2)}`
    );
    console.log(
      `   Average trust score: ${statsData.admin.stats.averageTrustScore.toFixed(2)}`
    );
  }

  // Test 2: List Users with Filtering
  console.log("\n\n👥 Test 2: List Users (First 5)");
  console.log("================================");

  const usersQuery = `
    query GetUsers($pagination: PaginationInput) {
      admin {
        users(pagination: $pagination) {
          edges {
            node {
              id
              name
              email
              role
              reputation
              trustScore
            }
            id
          }
          pageInfo {
            hasNextPage
            endCursor
          }
          totalCount
        }
      }
    }
  `;

  const usersData = await graphqlRequest(usersQuery, {
    pagination: { first: 5 },
  });

  if (usersData?.admin?.users) {
    console.log(`\n✅ Found ${usersData.admin.users.totalCount} users`);
    console.log(`   Showing first ${usersData.admin.users.edges.length}:`);

    usersData.admin.users.edges.forEach((edge, index) => {
      const user = edge.node;
      console.log(`\n   ${index + 1}. ${user.name}`);
      console.log(`      Email: ${user.email}`);
      console.log(`      Role: ${user.role}`);
      console.log(`      Reputation: ${user.reputation || 100}`);
      console.log(`      Trust Score: ${user.trustScore?.toFixed(2) || "N/A"}`);
    });

    console.log(
      `\n   Has next page: ${usersData.admin.users.pageInfo.hasNextPage}`
    );
  }

  // Test 3: Create User
  console.log("\n\n➕ Test 3: Create New User");
  console.log("==========================");

  const createUserMutation = `
    mutation CreateUser($input: CreateUserInput!) {
      admin {
        createUser(input: $input) {
          id
          name
          email
          role
          reputation
          trustScore
        }
      }
    }
  `;

  const newUserEmail = `test_${Date.now()}@example.com`;
  const createUserData = await graphqlRequest(createUserMutation, {
    input: {
      name: "Test User",
      email: newUserEmail,
      password: "TestPassword123!",
      role: "USER",
      reputation: 150,
    },
  });

  let createdUserId = null;
  if (createUserData?.admin?.createUser) {
    const user = createUserData.admin.createUser;
    createdUserId = user.id;
    console.log("\n✅ User created successfully:");
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Reputation: ${user.reputation}`);
  }

  // Test 4: Update User Role
  if (createdUserId) {
    console.log("\n\n🔄 Test 4: Update User Role");
    console.log("===========================");

    const updateRoleMutation = `
      mutation UpdateRole($id: ID!, $role: UserRole!) {
        admin {
          updateUserRole(id: $id, role: $role) {
            id
            name
            role
          }
        }
      }
    `;

    const updateData = await graphqlRequest(updateRoleMutation, {
      id: createdUserId,
      role: "MODERATOR",
    });

    if (updateData?.admin?.updateUserRole) {
      console.log("\n✅ Role updated:");
      console.log(`   User: ${updateData.admin.updateUserRole.name}`);
      console.log(`   New Role: ${updateData.admin.updateUserRole.role}`);
    }
  }

  // Test 5: List Active Incidents
  console.log("\n\n🚨 Test 5: List Active Incidents");
  console.log("=================================");

  const incidentsQuery = `
    query GetIncidents($filter: IncidentFilterInput, $pagination: PaginationInput) {
      admin {
        incidents(filter: $filter, pagination: $pagination) {
          edges {
            node {
              id
              title
              kind
              status
              isFake
              createdAt
              reporter {
                name
                trustScore
              }
            }
            id
          }
          totalCount
        }
      }
    }
  `;

  const incidentsData = await graphqlRequest(incidentsQuery, {
    filter: { status: "PUBLISHED" },
    pagination: { first: 5 },
  });

  if (incidentsData?.admin?.incidents) {
    console.log(
      `\n✅ Found ${incidentsData.admin.incidents.totalCount} active incidents`
    );
    console.log(`   Showing first ${incidentsData.admin.incidents.edges.length}:`);

    incidentsData.admin.incidents.edges.forEach((edge, index) => {
      const incident = edge.node;
      console.log(`\n   ${index + 1}. ${incident.title}`);
      console.log(`      Kind: ${incident.kind}`);
      console.log(`      Status: ${incident.status}`);
      console.log(`      Fake: ${incident.isFake || false}`);
      if (incident.reporter) {
        console.log(`      Reporter: ${incident.reporter.name}`);
        console.log(
          `      Reporter Trust: ${incident.reporter.trustScore?.toFixed(2) || "N/A"}`
        );
      }
    });
  }

  // Test 6: Create Admin Incident
  console.log("\n\n🔧 Test 6: Create Admin Incident");
  console.log("=================================");

  const createIncidentMutation = `
    mutation CreateIncident($input: CreateAdminIncidentInput!) {
      admin {
        createIncident(input: $input) {
          id
          title
          kind
          status
          createdAt
        }
      }
    }
  `;

  const createIncidentData = await graphqlRequest(createIncidentMutation, {
    input: {
      title: "Test Admin Incident - Network Maintenance",
      description: "Planned network maintenance for testing",
      kind: "NETWORK_FAILURE",
      status: "PUBLISHED",
    },
  });

  let createdIncidentId = null;
  if (createIncidentData?.admin?.createIncident) {
    const incident = createIncidentData.admin.createIncident;
    createdIncidentId = incident.id;
    console.log("\n✅ Incident created:");
    console.log(`   ID: ${incident.id}`);
    console.log(`   Title: ${incident.title}`);
    console.log(`   Kind: ${incident.kind}`);
    console.log(`   Status: ${incident.status}`);
  }

  // Test 7: Mark Incident as Fake
  if (createdIncidentId) {
    console.log("\n\n⚠️  Test 7: Mark Incident as Fake");
    console.log("==================================");

    const markFakeMutation = `
      mutation MarkFake($id: ID!) {
        admin {
          markIncidentAsFake(id: $id) {
            id
            title
            isFake
            status
          }
        }
      }
    `;

    const markFakeData = await graphqlRequest(markFakeMutation, {
      id: createdIncidentId,
    });

    if (markFakeData?.admin?.markIncidentAsFake) {
      const incident = markFakeData.admin.markIncidentAsFake;
      console.log("\n✅ Incident marked as fake:");
      console.log(`   Title: ${incident.title}`);
      console.log(`   Is Fake: ${incident.isFake}`);
      console.log(`   Status: ${incident.status}`);
    }
  }

  // Test 8: Get Archived Incidents
  console.log("\n\n📦 Test 8: Get Archived Incidents");
  console.log("==================================");

  const archivedQuery = `
    query GetArchived($pagination: PaginationInput) {
      admin {
        archivedIncidents(pagination: $pagination) {
          edges {
            node {
              id
              title
              status
              isFake
              createdAt
            }
            id
          }
          totalCount
        }
      }
    }
  `;

  const archivedData = await graphqlRequest(archivedQuery, {
    pagination: { first: 5 },
  });

  if (archivedData?.admin?.archivedIncidents) {
    console.log(
      `\n✅ Found ${archivedData.admin.archivedIncidents.totalCount} archived incidents`
    );
    console.log(
      `   Showing first ${archivedData.admin.archivedIncidents.edges.length}:`
    );

    archivedData.admin.archivedIncidents.edges.forEach((edge, index) => {
      const incident = edge.node;
      console.log(`\n   ${index + 1}. ${incident.title}`);
      console.log(`      Status: ${incident.status}`);
      console.log(`      Fake: ${incident.isFake || false}`);
      console.log(`      Created: ${incident.createdAt}`);
    });
  }

  // Test 9: Delete Test User (Cleanup)
  if (createdUserId) {
    console.log("\n\n🗑️  Test 9: Cleanup - Delete Test User");
    console.log("======================================");

    const deleteUserMutation = `
      mutation DeleteUser($id: ID!) {
        admin {
          deleteUser(id: $id)
        }
      }
    `;

    const deleteData = await graphqlRequest(deleteUserMutation, {
      id: createdUserId,
    });

    if (deleteData?.admin?.deleteUser) {
      console.log("\n✅ Test user deleted successfully");
    }
  }

  // Test 10: Delete Test Incident (Cleanup)
  if (createdIncidentId) {
    console.log("\n\n🗑️  Test 10: Cleanup - Delete Test Incident");
    console.log("==========================================");

    const deleteIncidentMutation = `
      mutation DeleteIncident($id: ID!) {
        admin {
          deleteIncident(id: $id)
        }
      }
    `;

    const deleteData = await graphqlRequest(deleteIncidentMutation, {
      id: createdIncidentId,
    });

    if (deleteData?.admin?.deleteIncident) {
      console.log("\n✅ Test incident deleted successfully");
    }
  }

  console.log("\n\n✅ All tests completed!");
  console.log("\n📝 Note: Update ADMIN_TOKEN at the top of this script");
  console.log("   with a valid admin JWT token to run these tests.");
}

// Run tests
testAdminAPI().catch((error) => {
  console.error("\n❌ Test failed:", error.message);
  console.error(error.stack);
});
