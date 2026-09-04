#!/usr/bin/env node

/**
 * Seed Script - Add Sample Procurement Centres
 * 
 * This script creates sample centres, slots, and data for testing the UI
 * 
 * Usage: node seed-centres.js
 */
import "dotenv/config";
import prisma from "./src/config/prisma.js";

const seedCentres = async () => {
  try {
    console.log("🌱 Starting seed data for Procurement Centres...\n");

    // Clear existing data (optional)
    // await prisma.procurementCentre.deleteMany({});

    // Sample centres with realistic data
    const centres = [
      {
        name: "Amritsar Procurement Centre",
        centreCode: "AMR-001",
        address: "123 Golden Temple Road",
        village: "Amritsar City",
        district: "Amritsar",
        state: "Punjab",
        latitude: 31.6340,
        longitude: 74.8711,
        dailyCapacity: 100,
        status: "ACTIVE",
        openingTime: "09:00",
        closingTime: "17:00",
      },
      {
        name: "Ludhiana Central Procurement Centre",
        centreCode: "LUD-001",
        address: "456 Industrial Area",
        village: "Ludhiana City",
        district: "Ludhiana",
        state: "Punjab",
        latitude: 30.9010,
        longitude: 75.8573,
        dailyCapacity: 150,
        status: "ACTIVE",
        openingTime: "08:00",
        closingTime: "18:00",
      },
      {
        name: "Jalandhar Grain Centre",
        centreCode: "JAL-001",
        address: "789 Bhagwan Avenue",
        village: "Jalandhar",
        district: "Jalandhar",
        state: "Punjab",
        latitude: 31.8261,
        longitude: 75.5762,
        dailyCapacity: 120,
        status: "ACTIVE",
        openingTime: "09:00",
        closingTime: "17:30",
      },
      {
        name: "Patiala Regional Centre",
        centreCode: "PAT-001",
        address: "321 Bahadur Avenue",
        village: "Patiala",
        district: "Patiala",
        state: "Punjab",
        latitude: 30.3398,
        longitude: 76.3869,
        dailyCapacity: 100,
        status: "ACTIVE",
        openingTime: "08:30",
        closingTime: "17:00",
      },
      {
        name: "Bathinda Market Centre",
        centreCode: "BAT-001",
        address: "654 Market Street",
        village: "Bathinda",
        district: "Bathinda",
        state: "Punjab",
        latitude: 29.7589,
        longitude: 74.9126,
        dailyCapacity: 80,
        status: "ACTIVE",
        openingTime: "08:00",
        closingTime: "16:00",
      },
      {
        name: "Mohali Tech Procurement",
        centreCode: "MOH-001",
        address: "987 Sector 23",
        village: "Mohali",
        district: "Mohali",
        state: "Punjab",
        latitude: 30.6394,
        longitude: 76.8198,
        dailyCapacity: 110,
        status: "ACTIVE",
        openingTime: "09:00",
        closingTime: "17:00",
      },
    ];

    // Create centres
    const createdCentres = [];
    for (const centre of centres) {
      const existing = await prisma.procurementCentre.findUnique({
        where: { centreCode: centre.centreCode },
      });

      if (existing) {
        console.log(`⚠️  Centre ${centre.centreCode} already exists, skipping...`);
        createdCentres.push(existing);
      } else {
        const created = await prisma.procurementCentre.create({
          data: centre,
        });
        console.log(`✅ Created: ${created.name} (${created.centreCode})`);
        createdCentres.push(created);
      }
    }

    // Create sample slots for each centre
    console.log("\n📅 Creating sample slots...\n");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const centre of createdCentres) {
      // Create slots for next 16 days (to cover the 15-day maximum)
      for (let dayOffset = 0; dayOffset <= 15; dayOffset++) {
        const slotDate = new Date(today);
        slotDate.setDate(slotDate.getDate() + dayOffset);

        // Morning slot
        const morningSlot = await prisma.slot.upsert({
          where: {
            centreId_slotDate_startTime: {
              centreId: centre.id,
              slotDate,
              startTime: "09:00",
            },
          },
          update: { bookedCount: 0 },
          create: {
            centreId: centre.id,
            slotDate,
            startTime: "09:00",
            endTime: "11:00",
            capacity: 30,
            bookedCount: 0,
            status: "OPEN",
          },
        });

        // Afternoon slot
        const afternoonSlot = await prisma.slot.upsert({
          where: {
            centreId_slotDate_startTime: {
              centreId: centre.id,
              slotDate,
              startTime: "12:00",
            },
          },
          update: { bookedCount: 0 },
          create: {
            centreId: centre.id,
            slotDate,
            startTime: "12:00",
            endTime: "14:00",
            capacity: 25,
            bookedCount: 0,
            status: "OPEN",
          },
        });

        // Evening slot
        const eveningSlot = await prisma.slot.upsert({
          where: {
            centreId_slotDate_startTime: {
              centreId: centre.id,
              slotDate,
              startTime: "15:00",
            },
          },
          update: { bookedCount: 0 },
          create: {
            centreId: centre.id,
            slotDate,
            startTime: "15:00",
            endTime: "17:00",
            capacity: 20,
            bookedCount: 0,
            status: "OPEN",
          },
        });
      }

      console.log(`✅ Created 21 slots for ${centre.name}`);
    }

    console.log("\n✨ Seed data created successfully!\n");
    console.log("📊 Summary:");
    console.log(`   - Centres created: ${createdCentres.length}`);
    console.log(`   - Slots created: ${createdCentres.length * 21}`);
    console.log("\n🎯 Test the system by:");
    console.log("   1. Login as a farmer");
    console.log("   2. Go to 'Find Procurement Centre'");
    console.log("   3. Or login as centre manager to 'Centre Manager Dashboard'");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
  } finally {
    await prisma.$disconnect();
  }
};

seedCentres();
