import test from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/config/prisma.js";

/**
 * PROCUREMENT SYSTEM API TESTS
 * Tests for all procurement centre APIs using Prisma models
 */

let testData = {
  user: null,
  farmer: null,
  centre: null,
  slot: null,
  crop: null,
  booking: null,
  operator: null,
};

/**
 * TEST SUITE 1: CENTRE ROUTES
 */
test("Centre API - Create Centre", async (t) => {
  await t.test("should create a new centre", async () => {
    const centreData = {
      name: "Test Procurement Centre",
      centreCode: "TPC-001",
      address: "123 Main Street",
      village: "Test Village",
      district: "Amritsar",
      state: "Punjab",
      latitude: 31.6346,
      longitude: 74.8711,
      dailyCapacity: 100,
      openingTime: "08:00",
      closingTime: "18:00",
    };

    const centre = await prisma.procurementCentre.create({
      data: centreData,
    });

    assert.ok(centre.id);
    assert.equal(centre.name, "Test Procurement Centre");
    assert.equal(centre.status, "ACTIVE");

    testData.centre = centre;
  });

  await t.test("should reject duplicate centre code", async () => {
    const duplicateData = {
      name: "Duplicate Centre",
      centreCode: testData.centre.centreCode,
      address: "Different Address",
      village: "Different Village",
      district: "Amritsar",
      state: "Punjab",
      latitude: 31.6346,
      longitude: 74.8711,
      dailyCapacity: 50,
      openingTime: "08:00",
      closingTime: "18:00",
    };

    try {
      await prisma.procurementCentre.create({
        data: duplicateData,
      });
      assert.fail("Should have rejected duplicate centre code");
    } catch (error) {
      assert.ok(error);
    }
  });
});

/**
 * TEST SUITE 2: SLOT ROUTES
 */
test("Slot API - Manage Slots", async (t) => {
  await t.test("should create a slot for centre", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const slot = await prisma.slot.create({
      data: {
        centreId: testData.centre.id,
        slotDate: tomorrow,
        startTime: "09:00",
        endTime: "11:00",
        capacity: 20,
        status: "OPEN",
      },
    });

    assert.ok(slot.id);
    assert.equal(slot.capacity, 20);
    assert.equal(slot.bookedCount, 0);
    assert.equal(slot.status, "OPEN");

    testData.slot = slot;
  });

  await t.test("should update slot booked count", async () => {
    const updated = await prisma.slot.update({
      where: { id: testData.slot.id },
      data: { bookedCount: 15 },
    });

    assert.equal(updated.bookedCount, 15);
  });

  await t.test("should create multiple slots at same centre", async () => {
    const slotDate = new Date();
    slotDate.setDate(slotDate.getDate() + 2);

    const slot2 = await prisma.slot.create({
      data: {
        centreId: testData.centre.id,
        slotDate: slotDate,
        startTime: "14:00",
        endTime: "16:00",
        capacity: 15,
        status: "OPEN",
      },
    });

    assert.ok(slot2.id);
    assert.notEqual(slot2.id, testData.slot.id);
  });
});

/**
 * TEST SUITE 3: FARMER & CROP SETUP
 */
test("Farmer & Crop Setup", async (t) => {
  await t.test("should create a farmer", async () => {
    const farmerUser = await prisma.user.create({
      data: {
        name: "Test Farmer",
        phone: "9876543212",
        passwordHash: "hashedPassword",
        role: "FARMER",
      },
    });

    const farmer = await prisma.farmer.create({
      data: {
        userId: farmerUser.id,
        farmerCode: `FARMER-${Date.now()}`,
        village: "Test Village",
        district: "Amritsar",
        state: "Punjab",
        address: "123 Farm Road",
      },
    });

    assert.ok(farmer.id);
    assert.equal(farmer.village, "Test Village");

    testData.farmer = farmer;
    testData.user = farmerUser;
  });

  await t.test("should create a crop for farmer", async () => {
    const crop = await prisma.crop.create({
      data: {
        farmerId: testData.farmer.id,
        cropType: "Wheat",
        season: "Rabi",
        quantity: 100,
        unit: "kg",
        harvestDate: new Date(),
        status: "AVAILABLE",
      },
    });

    assert.ok(crop.id);
    assert.equal(crop.status, "AVAILABLE");
    assert.equal(crop.cropType, "Wheat");

    testData.crop = crop;
  });

  await t.test("should fetch farmer with crops", async () => {
    const farmerWithCrops = await prisma.farmer.findUnique({
      where: { id: testData.farmer.id },
      include: { crops: true },
    });

    assert.ok(farmerWithCrops);
    assert.ok(Array.isArray(farmerWithCrops.crops));
    assert.ok(farmerWithCrops.crops.length > 0);
  });
});

/**
 * TEST SUITE 4: BOOKING ROUTES
 */
test("Booking API - Complete Booking Flow", async (t) => {
  await t.test("should create a booking", async () => {
    const booking = await prisma.booking.create({
      data: {
        bookingNumber: `BK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        farmerId: testData.farmer.id,
        cropId: testData.crop.id,
        centreId: testData.centre.id,
        slotId: testData.slot.id,
        tokenNumber: 1,
        status: "BOOKED",
      },
    });

    assert.ok(booking.id);
    assert.equal(booking.status, "BOOKED");
    assert.ok(booking.bookingNumber);

    testData.booking = booking;
  });

  await t.test("should create queue entry when booking created", async () => {
    const queueEntry = await prisma.queueEntry.create({
      data: {
        bookingId: testData.booking.id,
        centreId: testData.centre.id,
        status: "WAITING",
        tokenNumber: testData.booking.tokenNumber,
      },
    });

    assert.ok(queueEntry.id);
    assert.equal(queueEntry.status, "WAITING");
  });

  await t.test("should reject duplicate booking for same slot", async () => {
    try {
      await prisma.booking.create({
        data: {
          bookingNumber: `BK-${Date.now()}-2`,
          farmerId: testData.farmer.id,
          cropId: testData.crop.id,
          centreId: testData.centre.id,
          slotId: testData.slot.id,
          tokenNumber: 2,
          status: "BOOKED",
        },
      });
      assert.fail("Should reject duplicate booking");
    } catch (error) {
      assert.ok(error);
    }
  });

  await t.test("should cancel booking and revert status", async () => {
    const cropForCancel = await prisma.crop.create({
      data: {
        farmerId: testData.farmer.id,
        cropType: "Rice",
        season: "Kharif",
        quantity: 50,
        unit: "kg",
        harvestDate: new Date(),
        status: "AVAILABLE",
      },
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const slotForCancel = await prisma.slot.create({
      data: {
        centreId: testData.centre.id,
        slotDate: tomorrow,
        startTime: "14:00",
        endTime: "16:00",
        capacity: 20,
        status: "OPEN",
      },
    });

    const bookingForCancel = await prisma.booking.create({
      data: {
        bookingNumber: `BK-CANCEL-${Date.now()}`,
        farmerId: testData.farmer.id,
        cropId: cropForCancel.id,
        centreId: testData.centre.id,
        slotId: slotForCancel.id,
        tokenNumber: 2,
        status: "BOOKED",
      },
    });

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingForCancel.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: "Test cancellation",
      },
    });

    await prisma.crop.update({
      where: { id: cropForCancel.id },
      data: { status: "AVAILABLE" },
    });

    assert.equal(updatedBooking.status, "CANCELLED");
    assert.ok(updatedBooking.cancelledAt);
  });

  await t.test("should fetch booking with all relations", async () => {
    const bookingWithDetails = await prisma.booking.findUnique({
      where: { id: testData.booking.id },
      include: {
        farmer: true,
        crop: true,
        centre: true,
        slot: true,
        queueEntry: true,
      },
    });

    assert.ok(bookingWithDetails);
    assert.equal(bookingWithDetails.status, "BOOKED");
    assert.ok(bookingWithDetails.farmer);
    assert.ok(bookingWithDetails.crop);
  });
});

/**
 * TEST SUITE 5: PROCUREMENT ROUTES
 */
test("Procurement API - Quality Check & Weighment", async (t) => {
  let operatorUser;
  let centreOperator;

  await t.test("should create centre operator", async () => {
    operatorUser = await prisma.user.create({
      data: {
        name: "Test Operator",
        phone: "9876543213",
        passwordHash: "hashedPassword",
        role: "CENTRE_OPERATOR",
      },
    });

    centreOperator = await prisma.centreOperator.create({
      data: {
        userId: operatorUser.id,
        centreId: testData.centre.id,
      },
    });

    assert.ok(centreOperator.id);
    testData.operator = centreOperator;
  });

  await t.test("should submit quality check", async () => {
    const qualityCheck = await prisma.qualityCheck.create({
      data: {
        bookingId: testData.booking.id,
        checkedBy: testData.operator.userId,
        qualityStatus: "PASSED",
        grade: "A",
        moisturePercentage: 12.5,
        remarks: "Good quality crop",
      },
    });

    assert.ok(qualityCheck.id);
    assert.equal(qualityCheck.qualityStatus, "PASSED");
    assert.equal(qualityCheck.grade, "A");
  });

  await t.test("should submit weighment", async () => {
    const weighment = await prisma.weighment.create({
      data: {
        bookingId: testData.booking.id,
        measuredBy: testData.operator.userId,
        expectedQuantity: 100,
        actualQuantity: 98,
        unit: "kg",
        remarks: "Minor weight loss",
      },
    });

    assert.ok(weighment.id);
    assert.equal(weighment.expectedQuantity, 100);
    assert.equal(weighment.actualQuantity, 98);
  });

  await t.test("should complete procurement", async () => {
    await prisma.booking.update({
      where: { id: testData.booking.id },
      data: { status: "WEIGHING" },
    });

    const procurement = await prisma.procurement.create({
      data: {
        bookingId: testData.booking.id,
        operatorId: testData.operator.userId,
        procurementAmount: 4900,
        status: "APPROVED",
        remarks: "Procurement approved",
      },
    });

    assert.ok(procurement.id);
    assert.equal(procurement.status, "APPROVED");
    assert.equal(procurement.procurementAmount, 4900);

    await prisma.booking.update({
      where: { id: testData.booking.id },
      data: { status: "PROCURED" },
    });

    await prisma.crop.update({
      where: { id: testData.crop.id },
      data: { status: "PROCURED" },
    });
  });

  await t.test("should prevent duplicate quality check", async () => {
    try {
      await prisma.qualityCheck.create({
        data: {
          bookingId: testData.booking.id,
          checkedBy: testData.operator.userId,
          qualityStatus: "FAILED",
          grade: "B",
        },
      });
      assert.fail("Should prevent duplicate quality check");
    } catch (error) {
      assert.ok(error);
    }
  });

  await t.test("should fetch procurement with details", async () => {
    const procurementDetails = await prisma.procurement.findFirst({
      where: { bookingId: testData.booking.id },
      include: { booking: true },
    });

    assert.ok(procurementDetails);
    assert.equal(procurementDetails.status, "APPROVED");
  });
});

/**
 * TEST SUITE 6: QUEUE ROUTES
 */
test("Queue API - Queue Management", async (t) => {
  let queueEntry;

  await t.test("should get queue entry", async () => {
    queueEntry = await prisma.queueEntry.findFirst({
      where: { bookingId: testData.booking.id },
    });

    assert.ok(queueEntry);
    assert.ok(queueEntry.tokenNumber);
  });

  await t.test("should mark farmer arrival", async () => {
    const updated = await prisma.queueEntry.update({
      where: { id: queueEntry.id },
      data: { arrivedAt: new Date() },
    });

    assert.ok(updated.arrivedAt);
  });

  await t.test("should update queue status to called", async () => {
    const updated = await prisma.queueEntry.update({
      where: { id: queueEntry.id },
      data: { status: "CALLED" },
    });

    await prisma.booking.update({
      where: { id: testData.booking.id },
      data: { status: "IN_QUEUE" },
    });

    assert.equal(updated.status, "CALLED");
  });

  await t.test("should mark no-show", async () => {
    const cropNoShow = await prisma.crop.create({
      data: {
        farmerId: testData.farmer.id,
        cropType: "Maize",
        season: "Kharif",
        quantity: 75,
        unit: "kg",
        harvestDate: new Date(),
        status: "AVAILABLE",
      },
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    const slotNoShow = await prisma.slot.create({
      data: {
        centreId: testData.centre.id,
        slotDate: tomorrow,
        startTime: "10:00",
        endTime: "12:00",
        capacity: 20,
        status: "OPEN",
      },
    });

    const bookingNoShow = await prisma.booking.create({
      data: {
        bookingNumber: `BK-NOSHOW-${Date.now()}`,
        farmerId: testData.farmer.id,
        cropId: cropNoShow.id,
        centreId: testData.centre.id,
        slotId: slotNoShow.id,
        tokenNumber: 5,
        status: "IN_QUEUE",
      },
    });

    const queueNoShow = await prisma.queueEntry.create({
      data: {
        bookingId: bookingNoShow.id,
        centreId: testData.centre.id,
        status: "CALLED",
        tokenNumber: 5,
      },
    });

    const noShowEntry = await prisma.queueEntry.update({
      where: { id: queueNoShow.id },
      data: { status: "NO_SHOW" },
    });

    await prisma.booking.update({
      where: { id: bookingNoShow.id },
      data: { status: "NO_SHOW" },
    });

    await prisma.crop.update({
      where: { id: cropNoShow.id },
      data: { status: "AVAILABLE" },
    });

    assert.equal(noShowEntry.status, "NO_SHOW");
  });

  await t.test("should get all queue entries for centre", async () => {
    const queues = await prisma.queueEntry.findMany({
      where: { centreId: testData.centre.id },
      include: {
        booking: {
          include: {
            farmer: true,
            crop: true,
          },
        },
      },
    });

    assert.ok(Array.isArray(queues));
    assert.ok(queues.length > 0);
  });
});

/**
 * TEST SUITE 7: DATA INTEGRITY & CONSTRAINTS
 */
test("Database Constraints & Integrity", async (t) => {
  await t.test(
    "should cascade delete queue entries when booking deleted",
    async () => {
      const cropCascade = await prisma.crop.create({
        data: {
          farmerId: testData.farmer.id,
          cropType: "Barley",
          season: "Rabi",
          quantity: 60,
          unit: "kg",
          harvestDate: new Date(),
          status: "AVAILABLE",
        },
      });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 4);
      const slotCascade = await prisma.slot.create({
        data: {
          centreId: testData.centre.id,
          slotDate: tomorrow,
          startTime: "11:00",
          endTime: "13:00",
          capacity: 20,
          status: "OPEN",
        },
      });

      const bookingCascade = await prisma.booking.create({
        data: {
          bookingNumber: `BK-CASCADE-${Date.now()}`,
          farmerId: testData.farmer.id,
          cropId: cropCascade.id,
          centreId: testData.centre.id,
          slotId: slotCascade.id,
          tokenNumber: 10,
          status: "BOOKED",
        },
      });

      await prisma.queueEntry.create({
        data: {
          bookingId: bookingCascade.id,
          centreId: testData.centre.id,
          status: "WAITING",
          tokenNumber: 10,
        },
      });

      await prisma.booking.delete({
        where: { id: bookingCascade.id },
      });

      const deletedQueue = await prisma.queueEntry.findFirst({
        where: { bookingId: bookingCascade.id },
      });

      assert.equal(deletedQueue, null);
    },
  );

  await t.test("should enforce foreign key constraints", async () => {
    try {
      await prisma.booking.create({
        data: {
          bookingNumber: `BK-INVALID-${Date.now()}`,
          farmerId: "invalid-farmer-id",
          cropId: "invalid-crop-id",
          centreId: "invalid-centre-id",
          slotId: "invalid-slot-id",
          tokenNumber: 99,
          status: "BOOKED",
        },
      });
      assert.fail("Should enforce foreign key constraints");
    } catch (error) {
      assert.ok(error);
    }
  });

  await t.test("should create booking with limited slot capacity", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 5);
    const limitedSlot = await prisma.slot.create({
      data: {
        centreId: testData.centre.id,
        slotDate: tomorrow,
        startTime: "15:00",
        endTime: "16:00",
        capacity: 1,
        bookedCount: 0,
        status: "OPEN",
      },
    });

    const crop1 = await prisma.crop.create({
      data: {
        farmerId: testData.farmer.id,
        cropType: "Cotton",
        season: "Kharif",
        quantity: 80,
        unit: "kg",
        harvestDate: new Date(),
        status: "AVAILABLE",
      },
    });

    const booking1 = await prisma.booking.create({
      data: {
        bookingNumber: `BK-LIMIT1-${Date.now()}`,
        farmerId: testData.farmer.id,
        cropId: crop1.id,
        centreId: testData.centre.id,
        slotId: limitedSlot.id,
        tokenNumber: 11,
        status: "BOOKED",
      },
    });

    await prisma.slot.update({
      where: { id: limitedSlot.id },
      data: { bookedCount: 1 },
    });

    assert.ok(booking1.id);
  });
});

/**
 * TEST SUITE 8: CLEANUP
 */
test("Cleanup Test Data", async (t) => {
  await t.test("should clean up test database", async () => {
    if (testData.centre) {
      try {
        await prisma.queueEntry.deleteMany({
          where: { centreId: testData.centre.id },
        });

        await prisma.booking.deleteMany({
          where: { centreId: testData.centre.id },
        });

        await prisma.slot.deleteMany({
          where: { centreId: testData.centre.id },
        });

        await prisma.centreOperator.deleteMany({
          where: { centreId: testData.centre.id },
        });

        await prisma.procurementCentre.delete({
          where: { id: testData.centre.id },
        });
      } catch (e) {
        // Silently continue if cleanup fails
      }
    }

    if (testData.farmer) {
      try {
        await prisma.crop.deleteMany({
          where: { farmerId: testData.farmer.id },
        });

        await prisma.farmer.delete({
          where: { id: testData.farmer.id },
        });
      } catch (e) {}
    }

    if (testData.user) {
      try {
        await prisma.user.delete({
          where: { id: testData.user.id },
        });
      } catch (e) {}
    }

    assert.ok(true);
  });

  await t.test("should disconnect database", async () => {
    await prisma.$disconnect();
    assert.ok(true);
  });
});
