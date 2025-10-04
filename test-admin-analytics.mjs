/**
 * Test admin analytics API
 * Tests the topDelays query after fixing collection names
 */

const query = `
  query {
    admin {
      topDelays(period: LAST_31D, limit: 10) {
        rank
        lineName
        transportType
        totalDelays
        averageDelayMinutes
        incidentCount
      }
    }
  }
`;

async function testAdminAPI() {
  try {
    console.log('🧪 Testing Admin Analytics API...\n');
    console.log('Query:', query);
    console.log('\n📡 Sending request to http://localhost:3000/api/graphql\n');

    const response = await fetch('http://localhost:3000/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();

    if (result.errors) {
      console.error('❌ GraphQL Errors:');
      result.errors.forEach((error) => {
        console.error(`  - ${error.message}`);
        if (error.extensions) {
          console.error('    Extensions:', error.extensions);
        }
      });
    }

    if (result.data) {
      console.log('✅ Success! Data received:\n');
      console.log(JSON.stringify(result.data, null, 2));
      
      const topDelays = result.data.admin?.topDelays;
      if (topDelays && topDelays.length > 0) {
        console.log(`\n📊 Found ${topDelays.length} lines with delays`);
        console.log('\nTop 3:');
        topDelays.slice(0, 3).forEach(line => {
          console.log(`  ${line.rank}. ${line.lineName} (${line.transportType})`);
          console.log(`     Total delays: ${line.totalDelays}, Avg: ${line.averageDelayMinutes.toFixed(1)} min`);
        });
      } else {
        console.log('⚠️ No data returned');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAdminAPI();
