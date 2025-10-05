#!/usr/bin/env node
/**
 * Script to create test journey notifications directly in MongoDB
 * Usage: node scripts/create-test-journey-notifications.mjs [user-email]
 */

import { MongoClient } from "mongodb";
import { config } from "dotenv";

// Load environment variables
config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not found in environment variables");
  process.exit(1);
}

const userEmail = process.argv[2];

if (!userEmail) {
  console.error("❌ Please provide user email as argument");
  console.error("Usage: node scripts/create-test-journey-notifications.mjs user@example.com");
  process.exit(1);
}

async function createTestNotifications() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db();
    
    // Find user by email
    const user = await db.collection("users").findOne({ email: userEmail });
    
    if (!user) {
      console.error(`❌ User with email "${userEmail}" not found`);
      process.exit(1);
    }
    
    const userId = user._id.toString();
    console.log(`✅ Found user: ${user.name} (${userId})`);

    // Create test notifications
    const testNotifications = [
      {
        userId,
        incidentId: `test-delay-${Date.now()}`,
        title: "🚌 Opóźnienie na linii 123",
        description: "Autobus ma około 15 minut opóźnienia z powodu korków",
        kind: "DELAY",
        status: "PUBLISHED",
        lineId: "line-123",
        lineName: "Linia 123",
        delayMinutes: 15,
        receivedAt: new Date().toISOString(),
        dismissedAt: null,
      },
      {
        userId,
        incidentId: `test-accident-${Date.now()}`,
        title: "⚠️ Wypadek na trasie",
        description: "Wypadek powoduje opóźnienia w rejonie centrum",
        kind: "ACCIDENT",
        status: "PUBLISHED",
        lineId: "line-456",
        lineName: "Linia 456",
        delayMinutes: 30,
        receivedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
        dismissedAt: null,
      },
      {
        userId,
        incidentId: `test-resolved-${Date.now()}`,
        title: "✅ Problem rozwiązany",
        description: "Ruch został przywrócony do normy",
        kind: "OTHER",
        status: "RESOLVED",
        lineId: "line-789",
        lineName: "Linia 789",
        delayMinutes: 0,
        receivedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
        dismissedAt: null,
      },
      {
        userId,
        incidentId: `test-dismissed-${Date.now()}`,
        title: "📍 Odrzucone powiadomienie",
        description: "To powiadomienie zostało odrzucone przez użytkownika",
        kind: "PLATFORM_CHANGE",
        status: "PUBLISHED",
        lineId: "line-101",
        lineName: "Linia 101",
        delayMinutes: 5,
        receivedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
        dismissedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 min ago
      },
    ];

    // Insert notifications
    const result = await db
      .collection("journeyNotifications")
      .insertMany(testNotifications);

    console.log(`✅ Created ${result.insertedCount} test notifications:`);
    testNotifications.forEach((notif, index) => {
      console.log(`   ${index + 1}. ${notif.title} ${notif.dismissedAt ? "(odrzucone)" : "(aktywne)"}`);
    });

    console.log("\n✅ Test notifications created successfully!");
    console.log(`👉 Visit http://localhost:3000/pwa to see them`);

  } catch (error) {
    console.error("❌ Error creating test notifications:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("✅ Connection closed");
  }
}

createTestNotifications();
