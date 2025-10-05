// Comprehensive Admin API Test - Tests all admin queries/**/**

const GRAPHQL_ENDPOINT = 'http://localhost:3000/api/graphql';

 * Comprehensive Admin API Test * Admin Panel API Test Script

async function graphqlRequest(query) {

  const response = await fetch(GRAPHQL_ENDPOINT, { * Tests all admin queries and mutations *

    method: 'POST',

    headers: { 'Content-Type': 'application/json' }, */ * Tests:

    body: JSON.stringify({ query }),

  }); * - AdminQuery (users, incidents, stats, archived)

  return response.json();

}const GRAPHQL_ENDPOINT = 'http://localhost:3000/api/graphql'; * - AdminMutation (user CRUD, incident management, bulk ops)



async function runTests() { */

  console.log('🧪 Admin API Test Suite\n');

  console.log('='.repeat(60));// Test queries



  // Test 1: Statsconst QUERIES = {import fetch from "node-fetch";

  console.log('\n📊 Test 1: Admin Stats');

  const stats = await graphqlRequest(`  // 1. Get admin stats

    query { admin { stats {

      totalUsers totalIncidents activeIncidents resolvedIncidents  stats: `const GRAPHQL_ENDPOINT = "http://localhost:3000/api/graphql";

      usersByRole { users moderators admins }

    }}}    query GetAdminStats {

  `);

  if (stats.errors) {      admin {// Test admin token (must be created first)

    console.error('❌', stats.errors[0].message);

  } else {        stats {// Run: mutation { register(name: "Admin", email: "admin@test.com", password: "Admin123!") }

    const s = stats.data.admin.stats;

    console.log(`✅ Users: ${s.totalUsers}, Incidents: ${s.totalIncidents} (${s.activeIncidents} active)`);          totalUsers// Then update role to ADMIN in MongoDB

  }

          totalIncidentsconst ADMIN_TOKEN = "your_admin_token_here";

  // Test 2: Top Delays

  console.log('\n🚦 Test 2: Top Delays');          activeIncidents

  const delays = await graphqlRequest(`

    query { admin {          resolvedIncidentsasync function graphqlRequest(query, variables = {}) {

      topDelays(period: LAST_31D, limit: 10) {

        rank lineName transportType totalDelays averageDelayMinutes          fakeIncidents  const response = await fetch(GRAPHQL_ENDPOINT, {

      }

    }}          usersByRole {    method: "POST",

  `);

  if (delays.errors) {            users    headers: {

    console.error('❌', delays.errors[0].message);

  } else {            moderators      "Content-Type": "application/json",

    const top = delays.data.admin.topDelays;

    console.log(`✅ Found ${top.length} lines`);            admins      Authorization: `Bearer ${ADMIN_TOKEN}`,

    top.slice(0, 3).forEach(l => {

      console.log(`   ${l.rank}. ${l.lineName}: ${l.totalDelays} delays, avg ${l.averageDelayMinutes.toFixed(1)}min`);          }    },

    });

  }          incidentsByKind {    body: JSON.stringify({ query, variables }),



  // Test 3: Incidents            kind  });

  console.log('\n📋 Test 3: Incidents (paginated)');

  const incidents = await graphqlRequest(`            count

    query { admin {

      incidents(pagination: { first: 5 }) {          }  const result = await response.json();

        items { id title kind status delayMinutes }

        totalCount        }

        pageInfo { hasNextPage }

      }      }  if (result.errors) {

    }}

  `);    }    console.error("❌ GraphQL Errors:", JSON.stringify(result.errors, null, 2));

  if (incidents.errors) {

    console.error('❌', incidents.errors[0].message);  `,    return null;

  } else {

    const inc = incidents.data.admin.incidents;  }

    console.log(`✅ Total: ${inc.totalCount}, Showing: ${inc.items.length}`);

    inc.items.slice(0, 2).forEach(i => {  // 2. Get all incidents with pagination

      console.log(`   - ${i.title} (${i.kind}, delay: ${i.delayMinutes || 0}min)`);

    });  incidents: `  return result.data;

  }

    query GetIncidents {}

  // Test 4: Users

  console.log('\n👥 Test 4: Users');      admin {

  const users = await graphqlRequest(`

    query { admin {        incidents(pagination: { first: 5 }) {async function testAdminAPI() {

      users(pagination: { first: 5 }) {

        items { id name role reputation trustScore }          items {  console.log("=== Admin Panel API Test ===\n");

        totalCount

      }            id

    }}

  `);            title  // Test 1: Get Admin Stats

  if (users.errors) {

    console.error('❌', users.errors[0].message);            kind  console.log("📊 Test 1: Get Admin Statistics");

  } else {

    const u = users.data.admin.users;            status  console.log("================================");

    console.log(`✅ Total: ${u.totalCount}, Showing: ${u.items.length}`);

    u.items.slice(0, 2).forEach(user => {            delayMinutes

      console.log(`   - ${user.name} (${user.role}): rep ${user.reputation}, trust ${user.trustScore?.toFixed(2) || 'N/A'}`);

    });            createdAt  const statsQuery = `

  }

            isFake    query GetStats {

  // Test 5: Lines Overview

  console.log('\n🚌 Test 5: Lines Overview (LAST_7D)');          }      admin {

  const overview = await graphqlRequest(`

    query { admin {          totalCount        stats {

      linesIncidentOverview(period: LAST_7D) {

        lineName transportType incidentCount          pageInfo {          totalUsers

      }

    }}            hasNextPage          totalIncidents

  `);

  if (overview.errors) {            endCursor          activeIncidents

    console.error('❌', overview.errors[0].message);

  } else {          }          resolvedIncidents

    const lines = overview.data.admin.linesIncidentOverview;

    console.log(`✅ Found ${lines.length} lines`);        }          fakeIncidents

    lines.slice(0, 3).forEach(l => {

      console.log(`   - ${l.lineName} (${l.transportType}): ${l.incidentCount} incidents`);      }          usersByRole {

    });

  }    }            users



  // Test 6: Combined Dashboard  `,            moderators

  console.log('\n🎯 Test 6: Combined Dashboard Query');

  const dashboard = await graphqlRequest(`            admins

    query { admin {

      stats { totalIncidents totalUsers }  // 3. Get archived incidents          }

      incidents(pagination: { first: 2 }) { items { title } totalCount }

      topDelays(period: LAST_31D, limit: 3) { lineName totalDelays }  archivedIncidents: `          incidentsByKind {

    }}

  `);    query GetArchivedIncidents {            kind

  if (dashboard.errors) {

    console.error('❌', dashboard.errors[0].message);      admin {            count

  } else {

    const d = dashboard.data.admin;        archivedIncidents(pagination: { first: 3 }) {          }

    console.log(`✅ Dashboard loaded:`);

    console.log(`   ${d.stats.totalIncidents} incidents, ${d.stats.totalUsers} users`);          items {          averageReputation

    console.log(`   ${d.incidents.totalCount} total incidents`);

    console.log(`   Top ${d.topDelays.length} delayed lines`);            id          averageTrustScore

  }

            title        }

  console.log('\n' + '='.repeat(60));

  console.log('✅ All tests completed!\n');            status      }

}

            createdAt    }

runTests().catch(err => {

  console.error('💥 Test failed:', err);          }  `;

  process.exit(1);

});          totalCount


        }  const statsData = await graphqlRequest(statsQuery);

      }  if (statsData?.admin?.stats) {

    }    console.log("\n✅ Statistics retrieved:");

  `,    console.log(`   Total users: ${statsData.admin.stats.totalUsers}`);

    console.log(`   Total incidents: ${statsData.admin.stats.totalIncidents}`);

  // 4. Get users    console.log(`   Active incidents: ${statsData.admin.stats.activeIncidents}`);

  users: `    console.log(`   Users by role:`);

    query GetUsers {    console.log(`      Users: ${statsData.admin.stats.usersByRole.users}`);

      admin {    console.log(

        users(pagination: { first: 5 }) {      `      Moderators: ${statsData.admin.stats.usersByRole.moderators}`

          items {    );

            id    console.log(`      Admins: ${statsData.admin.stats.usersByRole.admins}`);

            name    console.log(

            email      `   Average reputation: ${statsData.admin.stats.averageReputation.toFixed(2)}`

            role    );

            reputation    console.log(

            trustScore      `   Average trust score: ${statsData.admin.stats.averageTrustScore.toFixed(2)}`

          }    );

          totalCount  }

          pageInfo {

            hasNextPage  // Test 2: List Users with Filtering

          }  console.log("\n\n👥 Test 2: List Users (First 5)");

        }  console.log("================================");

      }

    }  const usersQuery = `

  `,    query GetUsers($pagination: PaginationInput) {

      admin {

  // 5. Analytics - Top Delays        users(pagination: $pagination) {

  topDelays: `          edges {

    query GetTopDelays {            node {

      admin {              id

        topDelays(period: LAST_31D, limit: 10) {              name

          rank              email

          lineId              role

          lineName              reputation

          transportType              trustScore

          totalDelays            }

          averageDelayMinutes            id

          incidentCount          }

        }          pageInfo {

      }            hasNextPage

    }            endCursor

  `,          }

          totalCount

  // 6. Analytics - Lines Overview        }

  linesOverview: `      }

    query GetLinesOverview {    }

      admin {  `;

        linesIncidentOverview(period: LAST_7D) {

          lineId  const usersData = await graphqlRequest(usersQuery, {

          lineName    pagination: { first: 5 },

          transportType  });

          incidentCount

          lastIncidentTime  if (usersData?.admin?.users) {

        }    console.log(`\n✅ Found ${usersData.admin.users.totalCount} users`);

      }    console.log(`   Showing first ${usersData.admin.users.edges.length}:`);

    }

  `,    usersData.admin.users.edges.forEach((edge, index) => {

};      const user = edge.node;

      console.log(`\n   ${index + 1}. ${user.name}`);

// Combined query - test multiple at once      console.log(`      Email: ${user.email}`);

const COMBINED_QUERY = `      console.log(`      Role: ${user.role}`);

  query AdminDashboard {      console.log(`      Reputation: ${user.reputation || 100}`);

    admin {      console.log(`      Trust Score: ${user.trustScore?.toFixed(2) || "N/A"}`);

      stats {    });

        totalUsers

        totalIncidents    console.log(

        activeIncidents      `\n   Has next page: ${usersData.admin.users.pageInfo.hasNextPage}`

        resolvedIncidents    );

      }  }

      

      incidents(pagination: { first: 3 }) {  // Test 3: Create User

        items {  console.log("\n\n➕ Test 3: Create New User");

          id  console.log("==========================");

          title

          kind  const createUserMutation = `

          status    mutation CreateUser($input: CreateUserInput!) {

          delayMinutes      admin {

        }        createUser(input: $input) {

        totalCount          id

      }          name

                email

      topDelays(period: LAST_31D, limit: 5) {          role

        rank          reputation

        lineName          trustScore

        transportType        }

        totalDelays      }

        averageDelayMinutes    }

      }  `;

      

      users(pagination: { first: 3 }) {  const newUserEmail = `test_${Date.now()}@example.com`;

        items {  const createUserData = await graphqlRequest(createUserMutation, {

          id    input: {

          name      name: "Test User",

          role      email: newUserEmail,

          reputation      password: "TestPassword123!",

        }      role: "USER",

        totalCount      reputation: 150,

      }    },

    }  });

  }

`;  let createdUserId = null;

  if (createUserData?.admin?.createUser) {

// Helper to execute GraphQL query    const user = createUserData.admin.createUser;

async function graphqlRequest(query, variables = {}) {    createdUserId = user.id;

  try {    console.log("\n✅ User created successfully:");

    const response = await fetch(GRAPHQL_ENDPOINT, {    console.log(`   ID: ${user.id}`);

      method: 'POST',    console.log(`   Name: ${user.name}`);

      headers: {    console.log(`   Email: ${user.email}`);

        'Content-Type': 'application/json',    console.log(`   Role: ${user.role}`);

      },    console.log(`   Reputation: ${user.reputation}`);

      body: JSON.stringify({ query, variables }),  }

    });

  // Test 4: Update User Role

    const result = await response.json();  if (createdUserId) {

    return result;    console.log("\n\n🔄 Test 4: Update User Role");

  } catch (error) {    console.log("===========================");

    console.error('Request failed:', error.message);

    return { errors: [{ message: error.message }] };    const updateRoleMutation = `

  }      mutation UpdateRole($id: ID!, $role: UserRole!) {

}        admin {

          updateUserRole(id: $id, role: $role) {

// Test runner            id

async function runTests() {            name

  console.log('🧪 Starting Admin API Tests...\n');            role

  console.log('='.repeat(60));          }

        }

  // Test 1: Stats      }

  console.log('\n📊 Test 1: Admin Stats');    `;

  console.log('-'.repeat(60));

  const statsResult = await graphqlRequest(QUERIES.stats);    const updateData = await graphqlRequest(updateRoleMutation, {

  if (statsResult.errors) {      id: createdUserId,

    console.error('❌ Error:', statsResult.errors[0].message);      role: "MODERATOR",

  } else {    });

    const stats = statsResult.data.admin.stats;

    console.log('✅ Success!');    if (updateData?.admin?.updateUserRole) {

    console.log(`   Total Users: ${stats.totalUsers}`);      console.log("\n✅ Role updated:");

    console.log(`   Total Incidents: ${stats.totalIncidents}`);      console.log(`   User: ${updateData.admin.updateUserRole.name}`);

    console.log(`   Active: ${stats.activeIncidents}, Resolved: ${stats.resolvedIncidents}`);      console.log(`   New Role: ${updateData.admin.updateUserRole.role}`);

  }    }

  }

  // Test 2: Top Delays

  console.log('\n🚦 Test 2: Top Delays (LAST_31D)');  // Test 5: List Active Incidents

  console.log('-'.repeat(60));  console.log("\n\n🚨 Test 5: List Active Incidents");

  const delaysResult = await graphqlRequest(QUERIES.topDelays);  console.log("=================================");

  if (delaysResult.errors) {

    console.error('❌ Error:', delaysResult.errors[0].message);  const incidentsQuery = `

  } else {    query GetIncidents($filter: IncidentFilterInput, $pagination: PaginationInput) {

    const delays = delaysResult.data.admin.topDelays;      admin {

    console.log(`✅ Success! Found ${delays.length} lines with delays`);        incidents(filter: $filter, pagination: $pagination) {

    delays.slice(0, 3).forEach(line => {          edges {

      console.log(`   ${line.rank}. ${line.lineName} (${line.transportType})`);            node {

      console.log(`      Delays: ${line.totalDelays}, Avg: ${line.averageDelayMinutes.toFixed(1)} min`);              id

    });              title

  }              kind

              status

  // Test 3: Incidents with pagination              isFake

  console.log('\n📋 Test 3: Incidents (paginated)');              createdAt

  console.log('-'.repeat(60));              reporter {

  const incidentsResult = await graphqlRequest(QUERIES.incidents);                name

  if (incidentsResult.errors) {                trustScore

    console.error('❌ Error:', incidentsResult.errors[0].message);              }

  } else {            }

    const conn = incidentsResult.data.admin.incidents;            id

    console.log(`✅ Success! Total: ${conn.totalCount}, Showing: ${conn.items.length}`);          }

    console.log(`   Has Next Page: ${conn.pageInfo.hasNextPage}`);          totalCount

    conn.items.slice(0, 2).forEach(inc => {        }

      console.log(`   - ${inc.title} (${inc.kind}, ${inc.status})`);      }

      if (inc.delayMinutes) {    }

        console.log(`     Delay: ${inc.delayMinutes} min`);  `;

      }

    });  const incidentsData = await graphqlRequest(incidentsQuery, {

  }    filter: { status: "PUBLISHED" },

    pagination: { first: 5 },

  // Test 4: Users  });

  console.log('\n👥 Test 4: Users');

  console.log('-'.repeat(60));  if (incidentsData?.admin?.incidents) {

  const usersResult = await graphqlRequest(QUERIES.users);    console.log(

  if (usersResult.errors) {      `\n✅ Found ${incidentsData.admin.incidents.totalCount} active incidents`

    console.error('❌ Error:', usersResult.errors[0].message);    );

  } else {    console.log(`   Showing first ${incidentsData.admin.incidents.edges.length}:`);

    const conn = usersResult.data.admin.users;

    console.log(`✅ Success! Total: ${conn.totalCount}, Showing: ${conn.items.length}`);    incidentsData.admin.incidents.edges.forEach((edge, index) => {

    conn.items.slice(0, 2).forEach(user => {      const incident = edge.node;

      console.log(`   - ${user.name} (${user.role})`);      console.log(`\n   ${index + 1}. ${incident.title}`);

      console.log(`     Reputation: ${user.reputation}, Trust: ${user.trustScore?.toFixed(2) || 'N/A'}`);      console.log(`      Kind: ${incident.kind}`);

    });      console.log(`      Status: ${incident.status}`);

  }      console.log(`      Fake: ${incident.isFake || false}`);

      if (incident.reporter) {

  // Test 5: Lines Overview        console.log(`      Reporter: ${incident.reporter.name}`);

  console.log('\n🚌 Test 5: Lines Incident Overview (LAST_7D)');        console.log(

  console.log('-'.repeat(60));          `      Reporter Trust: ${incident.reporter.trustScore?.toFixed(2) || "N/A"}`

  const overviewResult = await graphqlRequest(QUERIES.linesOverview);        );

  if (overviewResult.errors) {      }

    console.error('❌ Error:', overviewResult.errors[0].message);    });

  } else {  }

    const lines = overviewResult.data.admin.linesIncidentOverview;

    console.log(`✅ Success! Found ${lines.length} lines`);  // Test 6: Create Admin Incident

    lines.slice(0, 3).forEach(line => {  console.log("\n\n🔧 Test 6: Create Admin Incident");

      console.log(`   - ${line.lineName} (${line.transportType}): ${line.incidentCount} incidents`);  console.log("=================================");

    });

  }  const createIncidentMutation = `

    mutation CreateIncident($input: CreateAdminIncidentInput!) {

  // Test 6: Combined Query      admin {

  console.log('\n🎯 Test 6: Combined Dashboard Query');        createIncident(input: $input) {

  console.log('-'.repeat(60));          id

  const combinedResult = await graphqlRequest(COMBINED_QUERY);          title

  if (combinedResult.errors) {          kind

    console.error('❌ Error:', combinedResult.errors[0].message);          status

  } else {          createdAt

    console.log('✅ Success! Dashboard data received:');        }

    const admin = combinedResult.data.admin;      }

    console.log(`   Stats: ${admin.stats.totalIncidents} incidents, ${admin.stats.totalUsers} users`);    }

    console.log(`   Recent Incidents: ${admin.incidents.items.length}/${admin.incidents.totalCount}`);  `;

    console.log(`   Top Delays: ${admin.topDelays.length} lines`);

    console.log(`   Users: ${admin.users.items.length}/${admin.users.totalCount}`);  const createIncidentData = await graphqlRequest(createIncidentMutation, {

  }    input: {

      title: "Test Admin Incident - Network Maintenance",

  // Summary      description: "Planned network maintenance for testing",

  console.log('\n' + '='.repeat(60));      kind: "NETWORK_FAILURE",

  console.log('✨ All tests completed!');      status: "PUBLISHED",

  console.log('='.repeat(60));    },

}  });



// Run tests  let createdIncidentId = null;

console.log('🚀 Admin API Comprehensive Test Suite');  if (createIncidentData?.admin?.createIncident) {

console.log('Endpoint:', GRAPHQL_ENDPOINT);    const incident = createIncidentData.admin.createIncident;

console.log('');    createdIncidentId = incident.id;

    console.log("\n✅ Incident created:");

runTests().catch(error => {    console.log(`   ID: ${incident.id}`);

  console.error('💥 Test suite failed:', error);    console.log(`   Title: ${incident.title}`);

  process.exit(1);    console.log(`   Kind: ${incident.kind}`);

});    console.log(`   Status: ${incident.status}`);

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
