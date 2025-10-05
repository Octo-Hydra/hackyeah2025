import clientPromise from "../src/lib/mongodb.js";

async function checkData() {
  try {
    const client = await clientPromise;
    const db = client.db();

    console.log("📊 Checking incidents in database...\n");

    // List all collections first
    const collections = await db.listCollections().toArray();
    console.log("Available collections:");
    collections.forEach((col) => console.log(`  - ${col.name}`));
    console.log("");

    // Total incidents (try both)
    const totalCountLower = await db.collection("incidents").countDocuments();
    const totalCountUpper = await db.collection("Incidents").countDocuments();
    console.log(`Total incidents (lowercase): ${totalCountLower}`);
    console.log(`Total Incidents (uppercase): ${totalCountUpper}`);

    // Use the one that has data
    const incidentsCol = totalCountUpper > 0 ? "Incidents" : "incidents";

    // Incidents with delay
    const withDelayCount = await db.collection(incidentsCol).countDocuments({
      delayMinutes: { $exists: true, $gt: 0 },
    });
    console.log(`Incidents with delay: ${withDelayCount}`);

    // Check lineIds field type
    const sampleIncident = await db.collection(incidentsCol).findOne({
      delayMinutes: { $exists: true, $gt: 0 },
    });

    if (sampleIncident) {
      console.log("\n📝 Sample incident:");
      console.log("ID:", sampleIncident._id);
      console.log("Title:", sampleIncident.title);
      console.log("Delay:", sampleIncident.delayMinutes, "minutes");
      console.log("LineIds:", sampleIncident.lineIds);
      console.log(
        "LineIds type:",
        Array.isArray(sampleIncident.lineIds)
          ? "array"
          : typeof sampleIncident.lineIds,
      );

      if (
        Array.isArray(sampleIncident.lineIds) &&
        sampleIncident.lineIds.length > 0
      ) {
        console.log("First lineId type:", typeof sampleIncident.lineIds[0]);
        console.log("First lineId value:", sampleIncident.lineIds[0]);
      }
    }

    // Check lines collection
    const linesCount = await db.collection("Lines").countDocuments();
    console.log(`\n📍 Total lines: ${linesCount}`);

    const sampleLine = await db.collection("Lines").findOne();
    if (sampleLine) {
      console.log("Sample line ID:", sampleLine._id);
      console.log("Sample line ID type:", typeof sampleLine._id);
      console.log("Sample line name:", sampleLine.name);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkData();
