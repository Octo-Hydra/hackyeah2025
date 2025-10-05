import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/hackyeah2025";

async function clearCache() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();

    console.log("🗑️  Clearing PathCache...");
    const result = await db.collection("PathCache").deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} cache entries`);
  } finally {
    await client.close();
  }
}

clearCache().catch(console.error);
