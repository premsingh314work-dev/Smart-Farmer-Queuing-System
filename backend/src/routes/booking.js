import express from "express";
import prisma from "../config/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// Helper function to get farmer
async function getFarmer(userId) {
  const farmer = await prisma.farmer.findUnique({
    where: { userId },
  });

  if (!farmer) {
    throw Object.assign(new Error("Farmer profile not found"), {
      code: "FARMER_NOT_FOUND",
      status: 404,
    });
  }

  return farmer;
}

// Generate booking number
function generateBookingNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `BK${timestamp}${random}`.substring(0, 20);
}

// POST /api/v1/bookings - Create new booking
router.post("/", requireAuth, requireRole("FARMER"), async (req, res) => {
  const { crop_id, centre_id, slot_id } = req.body;

  // Validation
  if (!crop_id || !centre_id || !slot_id) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: crop_id, centre_id, slot_id",
      code: "INVALID_BOOKING_REQUEST",
    });
  }

  try {
    const farmer = await getFarmer(req.user.id);

    // Verify crop exists and belongs to farmer
    const crop = await prisma.crop.findUnique({
      where: { id: crop_id },
    });

    if (!crop) {
      return res.status(404).json({
        success: false,
        message: "Crop not found",
        code: "CROP_NOT_FOUND",
      });
    }

    if (crop.farmerId !== farmer.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Crop does not belong to you",
        code: "FORBIDDEN",
      });
    }

    if (crop.status !== "AVAILABLE") {
      return res.status(409).json({
        success: false,
        message: "Crop is not available for booking",
        code: "CROP_NOT_AVAILABLE",
      });
    }

    // Verify centre exists
    const centre = await prisma.procurementCentre.findUnique({
      where: { id: centre_id },
    });

    if (!centre) {
      return res.status(404).json({
        success: false,
        message: "Centre not found",
        code: "CENTRE_NOT_FOUND",
      });
    }

    // Verify slot exists and is available
    const slot = await prisma.slot.findUnique({
      where: { id: slot_id },
    });

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: "Slot not found",
        code: "SLOT_NOT_FOUND",
      });
    }

    if (slot.centreId !== centre_id) {
      return res.status(409).json({
        success: false,
        message: "Slot does not belong to this centre",
        code: "INVALID_BOOKING_REQUEST",
      });
    }

    if (slot.status !== "OPEN") {
      return res.status(409).json({
        success: false,
        message: "Slot is not open for booking",
        code: "SLOT_CLOSED",
      });
    }

    if (slot.bookedCount >= slot.capacity) {
      return res.status(409).json({
        success: false,
        message: "Slot is full",
        code: "SLOT_FULL",
      });
    }

    // Check if farmer already has booking for this crop at any centre
    const existingBooking = await prisma.booking.findFirst({
      where: {
        farmerId: farmer.id,
        cropId: crop_id,
        status: {
          in: [
            "BOOKED",
            "CONFIRMED",
            "ARRIVED",
            "IN_QUEUE",
            "CALLED",
            "VERIFICATION",
            "QUALITY_CHECK",
            "WEIGHING",
            "APPROVED",
          ],
        },
      },
    });

    if (existingBooking) {
      return res.status(409).json({
        success: false,
        message: "Crop is already booked at another centre",
        code: "CROP_ALREADY_BOOKED",
      });
    }

    // Transaction: Create booking and update slot
    const booking = await prisma.$transaction(async (tx) => {
      // Check again inside transaction to prevent race condition
      const slotCheck = await tx.slot.findUnique({
        where: { id: slot_id },
      });

      if (slotCheck.bookedCount >= slotCheck.capacity) {
        throw Object.assign(new Error("Slot is full"), {
          code: "SLOT_FULL",
          status: 409,
        });
      }

      // Get next token number for this slot
      const bookingCount = await tx.booking.count({
        where: { slotId: slot_id },
      });

      const tokenNumber = bookingCount + 1;

      // Create booking
      const newBooking = await tx.booking.create({
        data: {
          bookingNumber: generateBookingNumber(),
          farmerId: farmer.id,
          cropId: crop_id,
          centreId: centre_id,
          slotId: slot_id,
          tokenNumber,
          status: "BOOKED",
          bookedAt: new Date(),
        },
      });

      // Update slot bookedCount
      await tx.slot.update({
        where: { id: slot_id },
        data: { bookedCount: { increment: 1 } },
      });

      // Create queue entry
      await tx.queueEntry.create({
        data: {
          bookingId: newBooking.id,
          centreId: centre_id,
          tokenNumber,
          status: "WAITING",
        },
      });

      // Update crop status to BOOKED
      await tx.crop.update({
        where: { id: crop_id },
        data: { status: "BOOKED" },
      });

      return newBooking;
    });

    return res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: {
        ...booking,
        tokenNumber: booking.tokenNumber,
      },
    });
  } catch (error) {
    console.error("Error creating booking:", error);

    if (error.code === "FARMER_NOT_FOUND") {
      return res.status(error.status).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }

    if (error.code === "SLOT_FULL") {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create booking",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

// GET /api/v1/bookings - List farmer's bookings
router.get("/", requireAuth, requireRole("FARMER"), async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const farmer = await getFarmer(req.user.id);

    const whereClause = { farmerId: farmer.id };
    if (status) whereClause.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        crop: true,
        centre: true,
        slot: true,
        queueEntry: true,
      },
      orderBy: { bookedAt: "desc" },
      skip,
      take: parseInt(limit),
    });

    const total = await prisma.booking.count({ where: whereClause });

    return res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

// GET /api/v1/bookings/:id - Get booking details
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        crop: true,
        centre: true,
        slot: true,
        queueEntry: true,
        qualityCheck: true,
        weighment: true,
        procurement: true,
      },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
        code: "BOOKING_NOT_FOUND",
      });
    }

    // Check authorization (farmer can only see their own, operators/admins can see all)
    if (req.user.role === "FARMER") {
      const farmer = await getFarmer(req.user.id);
      if (booking.farmerId !== farmer.id) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized",
          code: "FORBIDDEN",
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error("Error fetching booking:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch booking",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

// POST /api/v1/bookings/:id/cancel - Cancel booking
router.post(
  "/:id/cancel",
  requireAuth,
  requireRole("FARMER"),
  async (req, res) => {
    try {
      const { cancellation_reason } = req.body;

      const booking = await prisma.booking.findUnique({
        where: { id: req.params.id },
        include: { crop: true, slot: true },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found",
          code: "BOOKING_NOT_FOUND",
        });
      }

      const farmer = await getFarmer(req.user.id);
      if (booking.farmerId !== farmer.id) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized",
          code: "FORBIDDEN",
        });
      }

      if (booking.status === "CANCELLED") {
        return res.status(409).json({
          success: false,
          message: "Booking is already cancelled",
          code: "BOOKING_ALREADY_CANCELLED",
        });
      }

      // Can only cancel if status is BOOKED or CONFIRMED
      if (!["BOOKED", "CONFIRMED"].includes(booking.status)) {
        return res.status(409).json({
          success: false,
          message: "Booking cannot be cancelled in current status",
          code: "BOOKING_CANNOT_BE_CANCELLED",
        });
      }

      const updatedBooking = await prisma.$transaction(async (tx) => {
        // Update booking
        const updated = await tx.booking.update({
          where: { id: req.params.id },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancellationReason: cancellation_reason || null,
          },
        });

        // Update slot
        await tx.slot.update({
          where: { id: booking.slotId },
          data: { bookedCount: { decrement: 1 } },
        });

        // Update crop to AVAILABLE
        await tx.crop.update({
          where: { id: booking.cropId },
          data: { status: "AVAILABLE" },
        });

        // Delete queue entry
        await tx.queueEntry.deleteMany({
          where: { bookingId: req.params.id },
        });

        return updated;
      });

      return res.status(200).json({
        success: true,
        message: "Booking cancelled successfully",
        data: updatedBooking,
      });
    } catch (error) {
      console.error("Error cancelling booking:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to cancel booking",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },
);

export default router;
