#!/usr/bin/env node

/**
 * Test findPath with REAL RAIL stops from GTFS
 * Run: node test-rail-route.mjs
 */

const GRAPHQL_ENDPOINT = "http://localhost:3000/api/graphql";

async function testGraphQL(query, variables = {}) {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();
  if (result.errors) {
    console.error("❌ GraphQL Errors:", JSON.stringify(result.errors, null, 2));
  }
  return result.data;
}

async function main() {
  console.log("🚂 Testing RAIL Route with Multiple Stops");
  console.log("==========================================\n");

  // Real coordinates from GTFS train/stops.txt
  const tests = [
    {
      name: "WIELICZKA RYNEK → KRAKÓW GŁÓWNY (should have ~9 stops)",
      from: { latitude: 49.985686, longitude: 20.056641 }, // WIELICZKA RYNEK-KOPALNIA
      to: { latitude: 50.0683947, longitude: 19.9475035 }, // KRAKÓW GŁÓWNY
    },
    {
      name: "KRAKÓW GŁÓWNY → KRAKÓW BRONOWICE (should have ~2 stops)",
      from: { latitude: 50.0683947, longitude: 19.9475035 }, // KRAKÓW GŁÓWNY
      to: { latitude: 50.0828134, longitude: 19.8919081 }, // KRAKÓW BRONOWICE
    },
    {
      name: "KRAKÓW GRZEGÓRZKI → KRAKÓW GŁÓWNY (should have 1 segment)",
      from: { latitude: 50.0575341, longitude: 19.9479191 }, // KRAKÓW GRZEGÓRZKI
      to: { latitude: 50.0683947, longitude: 19.9475035 }, // KRAKÓW GŁÓWNY
    },
  ];

  const query = `
    query TestPath($from: CoordinatesInput!, $to: CoordinatesInput!) {
      findPath(input: { from: $from, to: $to }) {
        segments {
          from {
            stopName
            coordinates { latitude longitude }
          }
          to {
            stopName
            coordinates { latitude longitude }
          }
          lineId
          lineName
          transportType
          departureTime
          arrivalTime
          duration
        }
        totalDuration
        warnings
      }
    }
  `;

  for (const test of tests) {
    console.log(`\n📍 Test: ${test.name}`);
    console.log("=".repeat(60));

    const variables = {
      from: test.from,
      to: test.to,
    };

    const data = await testGraphQL(query, variables);

    if (data?.findPath?.segments && data.findPath.segments.length > 0) {
      console.log(`✅ Found ${data.findPath.segments.length} segment(s)\n`);

      data.findPath.segments.forEach((seg, idx) => {
        console.log(`Segment ${idx + 1}:`);
        console.log(`  FROM: ${seg.from.stopName}`);
        console.log(`  TO:   ${seg.to.stopName}`);
        console.log(`  Line: ${seg.lineName} (${seg.transportType})`);
        console.log(`  Time: ${seg.departureTime} → ${seg.arrivalTime}`);
        console.log(`  Duration: ${seg.duration} min\n`);
      });

      console.log(`📊 Total Duration: ${data.findPath.totalDuration} min`);

      // Verify format
      const allSegmentsValid = data.findPath.segments.every(
        (seg) => seg.from && seg.to && seg.from.stopName && seg.to.stopName
      );

      if (allSegmentsValid) {
        console.log("✅ All segments have correct [{FROM, TO}] format");
      } else {
        console.log("❌ Some segments are missing FROM or TO");
      }
    } else {
      console.log("❌ No route found");
      if (data?.findPath?.warnings) {
        console.log("\nWarnings:");
        data.findPath.warnings.forEach((w) => console.log(`  ${w}`));
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ All tests completed!");
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  console.error("   Make sure server is running on http://localhost:3000");
});
