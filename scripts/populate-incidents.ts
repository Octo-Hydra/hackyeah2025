/**
 * Populate database with test incidents for analytics
 *
 * This script creates realistic incident data with delays for testing the admin analytics features:
 * - Line incident statistics
 * - Delay reports
 * - Top delays ranking
 *
 * Usage: node --import=tsx/esm --env-file .env scripts/populate-incidents.ts
 */

import clientPromise from "../src/lib/mongodb.js";
import { ObjectId } from "mongodb";

// Types
interface Line {
  _id: ObjectId;
  name: string;
  transportType: "BUS" | "RAIL";
}

interface IncidentKind {
  kind:
    | "INCIDENT"
    | "NETWORK_FAILURE"
    | "VEHICLE_FAILURE"
    | "ACCIDENT"
    | "TRAFFIC_JAM"
    | "PLATFORM_CHANGES";
  weight: number; // Probability weight
  avgDelay: number; // Average delay in minutes
  delayVariance: number; // +/- variance
}

// Incident types with their characteristics
const INCIDENT_TYPES: IncidentKind[] = [
  { kind: "TRAFFIC_JAM", weight: 40, avgDelay: 8, delayVariance: 5 },
  { kind: "ACCIDENT", weight: 15, avgDelay: 20, delayVariance: 10 },
  { kind: "VEHICLE_FAILURE", weight: 20, avgDelay: 15, delayVariance: 8 },
  { kind: "NETWORK_FAILURE", weight: 10, avgDelay: 30, delayVariance: 15 },
  { kind: "PLATFORM_CHANGES", weight: 10, avgDelay: 5, delayVariance: 3 },
  { kind: "INCIDENT", weight: 5, avgDelay: 12, delayVariance: 7 },
];

// Status distribution
const STATUS_DISTRIBUTION = [
  { status: "PUBLISHED", weight: 30 },
  { status: "RESOLVED", weight: 70 },
];

/**
 * Get random item from weighted array
 */
function getWeightedRandom<T extends { weight: number }>(items: T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of items) {
    random -= item.weight;
    if (random <= 0) {
      return item;
    }
  }

  return items[items.length - 1];
}

/**
 * Generate random delay based on incident type
 */
function generateDelay(incidentType: IncidentKind): number {
  const delay =
    incidentType.avgDelay +
    (Math.random() * 2 - 1) * incidentType.delayVariance;
  return Math.max(1, Math.round(delay)); // At least 1 minute
}

/**
 * Generate random date within period
 */
function generateDateInPeriod(daysAgo: number): Date {
  const now = Date.now();
  const periodMs = daysAgo * 24 * 60 * 60 * 1000;
  const randomMs = Math.random() * periodMs;
  return new Date(now - randomMs);
}

/**
 * Generate incident title
 */
function generateTitle(kind: string, lineName: string, delay: number): string {
  const templates: Record<string, string[]> = {
    TRAFFIC_JAM: [
      `${lineName}: Korek - opóźnienie ${delay} min`,
      `${lineName}: Duże natężenie ruchu +${delay} min`,
    ],
    ACCIDENT: [
      `${lineName}: Wypadek - opóźnienie ${delay} min`,
      `${lineName}: Kolizja powoduje opóźnienie ${delay} min`,
    ],
    VEHICLE_FAILURE: [
      `${lineName}: Awaria pojazdu - ${delay} min opóźnienia`,
      `${lineName}: Usterka techniczna +${delay} min`,
    ],
    NETWORK_FAILURE: [
      `${lineName}: Awaria sieci trakcyjnej - ${delay} min`,
      `${lineName}: Problemy z infrastrukturą +${delay} min`,
    ],
    PLATFORM_CHANGES: [
      `${lineName}: Zmiana peronu - ${delay} min opóźnienia`,
      `${lineName}: Zmiana rozkładu jazdy +${delay} min`,
    ],
    INCIDENT: [
      `${lineName}: Zdarzenie losowe - ${delay} min`,
      `${lineName}: Utrudnienia +${delay} min`,
    ],
  };

  const options = templates[kind] || [`${lineName}: Opóźnienie ${delay} min`];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Main population function
 */
async function populateIncidents() {
  console.log("🚀 Starting incident population...\n");

  const client = await clientPromise;
  const db = client.db();

  // Fetch all lines
  const lines = await db.collection<Line>("Lines").find({}).toArray();

  if (lines.length === 0) {
    console.error(
      "❌ No lines found in database. Please run GTFS import first."
    );
    process.exit(1);
  }

  console.log(`📍 Found ${lines.length} lines in database\n`);

  // Get or create admin user
  let adminUser = await db.collection("Users").findOne({ role: "ADMIN" });

  if (!adminUser) {
    console.log("👤 Creating admin user for incidents...");
    const result = await db.collection("Users").insertOne({
      name: "System Admin",
      email: "admin@ontime.pl",
      role: "ADMIN",
      reputation: 1000,
      trustScore: 2.5,
    });
    adminUser = { _id: result.insertedId };
    console.log(`✅ Admin user created: ${result.insertedId}\n`);
  }

  // Delete existing test incidents (optional - keep commented to preserve data)
  // console.log("🗑️  Clearing existing incidents...");
  // await db.collection("Incidents").deleteMany({});
  // console.log("✅ Incidents cleared\n");

  // Configuration
  const INCIDENTS_PER_LINE = {
    last24h: 5, // 0-5 incidents in last 24h
    last7d: 15, // 5-15 incidents in last 7 days
    last31d: 30, // 15-30 incidents in last 31 days
  };

  const incidentsToCreate: any[] = [];
  let totalIncidents = 0;

  // For each line, generate incidents
  for (const line of lines) {
    // Last 24 hours
    const count24h = Math.floor(Math.random() * INCIDENTS_PER_LINE.last24h);
    for (let i = 0; i < count24h; i++) {
      const incidentType = getWeightedRandom(INCIDENT_TYPES);
      const delay = generateDelay(incidentType);
      const status = getWeightedRandom(STATUS_DISTRIBUTION);

      incidentsToCreate.push({
        title: generateTitle(incidentType.kind, line.name, delay),
        description: `Wygenerowany incydent testowy dla ${line.name}`,
        kind: incidentType.kind,
        status: status.status,
        lineIds: [line._id],
        delayMinutes: delay,
        isFake: false,
        reportedBy: adminUser._id,
        createdAt: generateDateInPeriod(1).toISOString(),
      });
      totalIncidents++;
    }

    // Last 7 days (excluding last 24h)
    const count7d = Math.floor(
      Math.random() * (INCIDENTS_PER_LINE.last7d - count24h)
    );
    for (let i = 0; i < count7d; i++) {
      const incidentType = getWeightedRandom(INCIDENT_TYPES);
      const delay = generateDelay(incidentType);
      const status = getWeightedRandom(STATUS_DISTRIBUTION);

      incidentsToCreate.push({
        title: generateTitle(incidentType.kind, line.name, delay),
        description: `Wygenerowany incydent testowy dla ${line.name}`,
        kind: incidentType.kind,
        status: status.status,
        lineIds: [line._id],
        delayMinutes: delay,
        isFake: false,
        reportedBy: adminUser._id,
        createdAt: generateDateInPeriod(7).toISOString(),
      });
      totalIncidents++;
    }

    // Last 31 days (excluding last 7d)
    const count31d = Math.floor(
      Math.random() * (INCIDENTS_PER_LINE.last31d - count7d - count24h)
    );
    for (let i = 0; i < count31d; i++) {
      const incidentType = getWeightedRandom(INCIDENT_TYPES);
      const delay = generateDelay(incidentType);
      const status = getWeightedRandom(STATUS_DISTRIBUTION);

      incidentsToCreate.push({
        title: generateTitle(incidentType.kind, line.name, delay),
        description: `Wygenerowany incydent testowy dla ${line.name}`,
        kind: incidentType.kind,
        status: status.status,
        lineIds: [line._id],
        delayMinutes: delay,
        isFake: false,
        reportedBy: adminUser._id,
        createdAt: generateDateInPeriod(31).toISOString(),
      });
      totalIncidents++;
    }
  }

  // Insert in batches
  console.log(`📝 Creating ${totalIncidents} test incidents...`);
  const BATCH_SIZE = 100;

  for (let i = 0; i < incidentsToCreate.length; i += BATCH_SIZE) {
    const batch = incidentsToCreate.slice(i, i + BATCH_SIZE);
    await db.collection("Incidents").insertMany(batch);
    console.log(
      `   ✓ Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(incidentsToCreate.length / BATCH_SIZE)} (${batch.length} incidents)`
    );
  }

  console.log("\n✅ Incident population complete!");
  console.log(`📊 Statistics:`);
  console.log(`   Total incidents: ${totalIncidents}`);
  console.log(`   Lines with incidents: ${lines.length}`);

  // Show sample stats
  const busIncidents = incidentsToCreate.filter(
    (i) =>
      lines.find((l) => l._id.equals(i.lineIds[0]))?.transportType === "BUS"
  ).length;
  const railIncidents = totalIncidents - busIncidents;

  console.log(`   Bus incidents: ${busIncidents}`);
  console.log(`   Rail incidents: ${railIncidents}`);

  const avgDelay =
    incidentsToCreate.reduce((sum, i) => sum + i.delayMinutes, 0) /
    totalIncidents;
  console.log(`   Average delay: ${avgDelay.toFixed(1)} minutes`);

  console.log("\n🎉 Done! You can now test the analytics API.");
  console.log("\n📝 Example query:");
  console.log(`
query {
  admin {
    topDelays(period: LAST_31D, limit: 10) {
      rank
      lineName
      transportType
      totalDelays
      averageDelayMinutes
    }
  }
}
  `);

  process.exit(0);
}

// Run
populateIncidents().catch((error) => {
  console.error("❌ Error populating incidents:", error);
  process.exit(1);
});
