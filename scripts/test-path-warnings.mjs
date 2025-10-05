/**
 * Test script for Path Finding with Structured Warnings
 */

const GRAPHQL_ENDPOINT = "http://localhost:3000/api/graphql";

async function testPathWithWarnings() {
  // Test path finding query with warnings in segments
  const query = `
    query FindPath {
      findPath(input: {
        from: { latitude: 50.0647, longitude: 19.9450 }
        to: { latitude: 50.0292, longitude: 19.2370 }
      }) {
        segments {
          from {
            stopName
          }
          to {
            stopName
          }
          lineName
          hasIncident
          warning {
            fromStop
            toStop
            lineName
            description
            incidentKind
            severity
          }
        }
        hasIncidents
        totalDuration
      }
    }
  `;

  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();

    if (result.errors) {
      console.log("❌ Query Error:");
      console.log(JSON.stringify(result.errors, null, 2));
      return;
    }

    const path = result.data.findPath;

    console.log("\n📍 Path Finding Results:");
    console.log(`  Segments: ${path.segments.length}`);
    console.log(`  Total Duration: ${path.totalDuration} minutes`);
    console.log(`  Has Incidents: ${path.hasIncidents}`);

    if (path.segments.length > 0) {
      console.log("\n🚏 Route:");
      path.segments.forEach((seg, i) => {
        const incidentIcon = seg.hasIncident ? "⚠️" : "✅";
        console.log(
          `  ${i + 1}. ${incidentIcon} ${seg.from.stopName} → ${seg.to.stopName} (Line: ${seg.lineName})`,
        );

        // Show warning details for this segment if exists
        if (seg.warning) {
          console.log(`      ⚠️  ${seg.warning.description}`);
          if (seg.warning.incidentKind) {
            console.log(`          Kind: ${seg.warning.incidentKind}`);
          }
          if (seg.warning.severity) {
            console.log(`          Severity: ${seg.warning.severity}`);
          }
        }
      });
    }

    if (!path.hasIncidents) {
      console.log("\n✅ No incidents - route is clear!");
    }

    console.log("\n✅ Test completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

console.log("🧪 Testing Path Finding with Structured Warnings...\n");
testPathWithWarnings();
