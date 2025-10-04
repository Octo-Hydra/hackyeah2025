import { MongoClient, Db } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error("Missing environment variable MONGODB_URI");
}

const uri = process.env.MONGODB_URI;
let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (client) return client;
  if (!clientPromise) {
    client = new MongoClient(uri);
    clientPromise = client.connect();
  }
  client = await clientPromise;
  return client;
}

export async function DB(dbName?: string): Promise<Db> {
  const c = await getMongoClient();
  if (dbName) return c.db(dbName);
  return c.db();
}
