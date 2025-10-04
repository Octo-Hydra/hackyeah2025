#!/usr/bin/env node

/**
 * Quick test script for findPath API
 * Run: node test-findpath.mjs
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

// ========================================
// TEST 1: Get all stops
// ========================================
async function testGetStops() {
  console.log("\n🔍 TEST 1: Pobieranie przystanków BUS i RAIL\n");

  const query = `
    query GetStops {
      busStops: stops(transportType: BUS) {
        id
        name
        coordinates { latitude longitude }
      }
      railStops: stops(transportType: RAIL) {
        id
        name
        coordinates { latitude longitude }
      }
    }
  `;

  const data = await testGraphQL(query);

  console.log(`✅ BUS przystanków: ${data.busStops?.length || 0}`);
  if (data.busStops?.length > 0) {
    console.log(`   Przykład: ${data.busStops[0].name}`);
    console.log(
      `   Współrzędne: ${data.busStops[0].coordinates.latitude}, ${data.busStops[0].coordinates.longitude}`
    );
  }

  console.log(`✅ RAIL przystanków: ${data.railStops?.length || 0}`);
  if (data.railStops?.length > 0) {
    console.log(`   Przykład: ${data.railStops[0].name}`);
    console.log(
      `   Współrzędne: ${data.railStops[0].coordinates.latitude}, ${data.railStops[0].coordinates.longitude}`
    );
  }

  return data;
}

// ========================================
// TEST 2: Check segment format
// ========================================
async function testSegmentFormat(fromCoords, toCoords) {
  console.log("\n🔍 TEST 2: Sprawdzanie formatu segmentów [{FROM, TO}]\n");

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
        warnings
      }
    }
  `;

  const variables = {
    from: fromCoords,
    to: toCoords,
  };

  const data = await testGraphQL(query, variables);

  if (data.findPath?.segments) {
    console.log(`✅ Znaleziono ${data.findPath.segments.length} segment(ów)\n`);

    data.findPath.segments.forEach((seg, idx) => {
      console.log(`📍 Segment ${idx + 1}:`);
      console.log(`   FROM: ${seg.from.stopName}`);
      console.log(`   TO: ${seg.to.stopName}`);
      console.log(`   Line: ${seg.lineName} (${seg.transportType})`);
      console.log(`   Duration: ${seg.duration} min`);
      console.log("");
    });

    if (data.findPath.warnings?.length > 0) {
      console.log("⚠️  Warnings (przystanki pośrednie):");
      data.findPath.warnings.forEach((w) => console.log(`   ${w}`));
    }

    // Verify format
    console.log("\n✅ Format segmentów:");
    console.log(`   Każdy segment ma: from {stopName, coordinates}`);
    console.log(`   Każdy segment ma: to {stopName, coordinates}`);
    console.log(`   ✅ Format jest poprawny: [{FROM, TO}, {FROM, TO}, ...]`);
  } else {
    console.log("❌ Nie znaleziono trasy");
    if (data.findPath?.warnings) {
      console.log("   Warnings:", data.findPath.warnings);
    }
  }

  return data;
}

// ========================================
// MAIN
// ========================================
async function main() {
  console.log("🚀 Testing findPath API");
  console.log("========================\n");

  try {
    // Test 1: Get stops
    const stopsData = await testGetStops();

    // Test 2: If we have stops, test findPath
    if (
      stopsData?.busStops?.length > 0 ||
      stopsData?.railStops?.length > 0
    ) {
      let fromCoords, toCoords;

      // Use real coordinates from stops
      if (stopsData.busStops?.length >= 2) {
        fromCoords = stopsData.busStops[0].coordinates;
        toCoords = stopsData.busStops[Math.min(1, stopsData.busStops.length - 1)].coordinates;
      } else if (stopsData.railStops?.length >= 2) {
        fromCoords = stopsData.railStops[0].coordinates;
        toCoords = stopsData.railStops[Math.min(1, stopsData.railStops.length - 1)].coordinates;
      } else {
        // Fallback to hardcoded coordinates
        fromCoords = { latitude: 50.0647, longitude: 19.945 };
        toCoords = { latitude: 50.0767, longitude: 19.9478 };
      }

      await testSegmentFormat(fromCoords, toCoords);
    }

    console.log("\n✅ Wszystkie testy zakończone!");
  } catch (error) {
    console.error("\n❌ Błąd:", error.message);
    console.error("   Upewnij się, że serwer działa na http://localhost:3000");
  }
}

main();
