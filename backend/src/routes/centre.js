import express from "express";
import prisma from "../config/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// GET /api/v1/centres - List all procurement centres with filters
router.get("/", async (req, res) => {
  try {
    const { district, state, status, latitude, longitude, radius } = req.query;

    const filters = {};
    if (district) filters.district = district;
    if (state) filters.state = state;
    if (status) filters.status = status;

    const centres = await prisma.procurementCentre.findMany({
      where: filters,
      include: {
        slots: {
          where: { status: "OPEN" },
          select: {
            id: true,
            slotDate: true,
            startTime: true,
            endTime: true,
            capacity: true,
            bookedCount: true,
          },
        },
      },
    });

    // TODO: Implement distance-based filtering if latitude, longitude, radius provided
    // This would require calculating haversine distance

    return res.status(200).json({
      success: true,
      data: centres,
      total: centres.length,
    });
  } catch (error) {
    console.error("Error fetching centres:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch centres",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

// GET /api/v1/centres/:id - Get centre details
router.get("/:id", async (req, res) => {
  try {
    const centre = await prisma.procurementCentre.findUnique({
      where: { id: req.params.id },
      include: {
        slots: {
          where: { slotDate: { gte: new Date() } },
          orderBy: { slotDate: "asc" },
        },
        centreOperators: {
          select: { user: { select: { id: true, name: true, phone: true } } },
        },
      },
    });

    if (!centre) {
      return res.status(404).json({
        success: false,
        message: "Centre not found",
        code: "CENTRE_NOT_FOUND",
      });
    }

    return res.status(200).json({
      success: true,
      data: centre,
    });
  } catch (error) {
    console.error("Error fetching centre:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch centre",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

// GET /api/v1/centres/:id/availability - Get centre availability and queue info
router.get("/:id/availability", async (req, res) => {
  try {
    const centre = await prisma.procurementCentre.findUnique({
      where: { id: req.params.id },
    });

    if (!centre) {
      return res.status(404).json({
        success: false,
        message: "Centre not found",
        code: "CENTRE_NOT_FOUND",
      });
    }

    // Get available slots for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const availableSlots = await prisma.slot.findMany({
      where: {
        centreId: req.params.id,
        slotDate: { gte: today, lt: tomorrow },
        status: "OPEN",
      },
    });

    // Get current queue count
    const queueCount = await prisma.queueEntry.findMany({
      where: {
        centreId: req.params.id,
        status: { in: ["WAITING", "CALLED", "SERVING"] },
      },
    });

    // Average estimated wait time (simplified)
    const avgWaitTime = queueCount.length * 15; // Assuming 15 mins per person

    return res.status(200).json({
      success: true,
      data: {
        centreId: centre.id,
        centreName: centre.name,
        availableSlots: availableSlots.length,
        currentQueueLength: queueCount.length,
        estimatedWaitingMinutes: avgWaitTime,
        capacity: centre.dailyCapacity,
        status: centre.status,
      },
    });
  } catch (error) {
    console.error("Error fetching centre availability:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch availability",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

// POST /api/v1/centres - Create new centre (MANAGER/ADMIN only)
router.post(
  "/",
  requireAuth,
  requireRole("CENTRE_MANAGER", "DISTRICT_ADMIN", "STATE_ADMIN"),
  async (req, res) => {
    try {
      const {
        name,
        centreCode,
        address,
        village,
        district,
        state,
        latitude,
        longitude,
        dailyCapacity,
        openingTime,
        closingTime,
      } = req.body;

      // Validation
      if (
        !name ||
        !centreCode ||
        !address ||
        !district ||
        !state ||
        !latitude ||
        !longitude ||
        !dailyCapacity
      ) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
          code: "VALIDATION_ERROR",
        });
      }

      // Check if centre code already exists
      const existingCentre = await prisma.procurementCentre.findUnique({
        where: { centreCode },
      });

      if (existingCentre) {
        return res.status(409).json({
          success: false,
          message: "Centre code already exists",
          code: "CENTRE_CODE_EXISTS",
        });
      }

      const newCentre = await prisma.procurementCentre.create({
        data: {
          name,
          centreCode,
          address,
          village: village || null,
          district,
          state,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          dailyCapacity: parseInt(dailyCapacity),
          openingTime: openingTime || "09:00",
          closingTime: closingTime || "17:00",
          status: "ACTIVE",
        },
      });

      return res.status(201).json({
        success: true,
        message: "Centre created successfully",
        data: newCentre,
      });
    } catch (error) {
      console.error("Error creating centre:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create centre",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },
);

// PATCH /api/v1/centres/:id - Update centre (MANAGER/ADMIN only)
router.patch(
  "/:id",
  requireAuth,
  requireRole("CENTRE_MANAGER", "DISTRICT_ADMIN", "STATE_ADMIN"),
  async (req, res) => {
    try {
      const {
        name,
        address,
        village,
        dailyCapacity,
        status,
        openingTime,
        closingTime,
      } = req.body;

      const centre = await prisma.procurementCentre.findUnique({
        where: { id: req.params.id },
      });

      if (!centre) {
        return res.status(404).json({
          success: false,
          message: "Centre not found",
          code: "CENTRE_NOT_FOUND",
        });
      }

      const updateData = {};
      if (name) updateData.name = name;
      if (address) updateData.address = address;
      if (village) updateData.village = village;
      if (dailyCapacity) updateData.dailyCapacity = parseInt(dailyCapacity);
      if (status) updateData.status = status;
      if (openingTime) updateData.openingTime = openingTime;
      if (closingTime) updateData.closingTime = closingTime;

      const updatedCentre = await prisma.procurementCentre.update({
        where: { id: req.params.id },
        data: updateData,
      });

      return res.status(200).json({
        success: true,
        message: "Centre updated successfully",
        data: updatedCentre,
      });
    } catch (error) {
      console.error("Error updating centre:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update centre",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },
);

export default router;
