// Comprehensive Admin API Test
const ENDPOINT = 'http://localhost:3000/api/graphql';

async function gql(query) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  return res.json();
}

async function test() {
  console.log('🧪 Admin API Tests\n');

  // Test 1
  console.log('📊 Stats...');
  let r = await gql(`query { admin { stats { totalUsers totalIncidents activeIncidents }}}`);
  console.log(r.errors ? `❌ ${r.errors[0].message}` : `✅ ${r.data.admin.stats.totalIncidents} incidents`);

  // Test 2
  console.log('\n🚦 Top Delays...');
  r = await gql(`query { admin { topDelays(period: LAST_31D, limit: 5) { rank lineName totalDelays averageDelayMinutes }}}`);
  console.log(r.errors ? `❌ ${r.errors[0].message}` : `✅ ${r.data.admin.topDelays.length} lines`);
  if (!r.errors) r.data.admin.topDelays.slice(0,2).forEach(l => console.log(`   ${l.rank}. ${l.lineName}: ${l.totalDelays} delays`));

  // Test 3
  console.log('\n📋 Incidents...');
  r = await gql(`query { admin { incidents(pagination: {first: 3}) { items { id title kind } totalCount }}}`);
  if (r.errors) {
    console.log(`❌ ${r.errors[0].message}`);
    if (r.errors[0].extensions) console.log('   ', JSON.stringify(r.errors[0].extensions));
  } else {
    console.log(`✅ ${r.data.admin.incidents.totalCount} total`);
  }

  // Test 4
  console.log('\n👥 Users...');
  r = await gql(`query { admin { users(pagination: {first: 3}) { items { name role } totalCount }}}`);
  console.log(r.errors ? `❌ ${r.errors[0].message}` : `✅ ${r.data.admin.users.totalCount} users`);

  // Test 5
  console.log('\n🚌 Lines Overview...');
  r = await gql(`query { admin { linesIncidentOverview(period: LAST_7D) { lineName incidentCount }}}`);
  if (r.errors) {
    console.log(`❌ ${r.errors[0].message}`);
    if (r.errors[0].extensions) console.log('   ', JSON.stringify(r.errors[0].extensions));
  } else {
    console.log(`✅ ${r.data.admin.linesIncidentOverview.length} lines`);
  }

  console.log('\n✅ Done!\n');
}

test().catch(e => console.error('💥', e));
