import express from "express";
import prisma from "../config/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router({ mergeParams: true });

// GET /api/v1/centres/:centreId/slots - Get slots for a centre
router.get("/", async (req, res) => {
  try {
    const { centreId } = req.params;
    const { date } = req.query;

    const centre = await prisma.procurementCentre.findUnique({
      where: { id: centreId },
    });

    if (!centre) {
      return res.status(404).json({
        success: false,
        message: "Centre not found",
        code: "CENTRE_NOT_FOUND",
      });
    }

    let whereClause = { centreId };

    if (date) {
      const selectedDate = new Date(date);
      const nextDate = new Date(selectedDate);
      nextDate.setDate(nextDate.getDate() + 1);

      whereClause.slotDate = {
        gte: selectedDate,
        lt: nextDate,
      };
    }

    const slots = await prisma.slot.findMany({
      where: whereClause,
      orderBy: { slotDate: "asc" },
    });

    return res.status(200).json({
      success: true,
      data: slots,
      total: slots.length,
    });
  } catch (error) {
    console.error("Error fetching slots:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch slots",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

// POST /api/v1/centres/:centreId/slots - Create new slot (MANAGER/ADMIN only)
router.post("/", requireAuth, requireRole("GOVERNMENT"), async (req, res) => {
  try {
    const { centreId } = req.params;
    const { slot_date, start_time, end_time, capacity } = req.body;

    // Validation
    if (!slot_date || !start_time || !end_time || !capacity) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: slot_date, start_time, end_time, capacity",
        code: "VALIDATION_ERROR",
      });
    }

    // Check centre exists
    const centre = await prisma.procurementCentre.findUnique({
      where: { id: centreId },
    });

    if (!centre) {
      return res.status(404).json({
        success: false,
        message: "Centre not found",
        code: "CENTRE_NOT_FOUND",
      });
    }

    // Validate capacity
    if (parseInt(capacity) <= 0) {
      return res.status(422).json({
        success: false,
        message: "Capacity must be greater than 0",
        code: "VALIDATION_ERROR",
      });
    }

    const slotDate = new Date(slot_date);
    slotDate.setHours(0, 0, 0, 0);

    // Check for duplicate slot on same date
    const existingSlot = await prisma.slot.findFirst({
      where: {
        centreId,
        slotDate: {
          gte: slotDate,
          lt: new Date(slotDate.getTime() + 24 * 60 * 60 * 1000),
        },
        startTime: start_time,
        endTime: end_time,
      },
    });

    if (existingSlot) {
      return res.status(409).json({
        success: false,
        message: "Slot already exists for this time",
        code: "SLOT_EXISTS",
      });
    }

    const newSlot = await prisma.slot.create({
      data: {
        centreId,
        slotDate,
        startTime: start_time,
        endTime: end_time,
        capacity: parseInt(capacity),
        bookedCount: 0,
        status: "OPEN",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Slot created successfully",
      data: newSlot,
    });
  } catch (error) {
    console.error("Error creating slot:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create slot",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

// PATCH /api/v1/slots/:id - Update slot (MANAGER/ADMIN only)
router.patch(
  "/:slotId",
  requireAuth,
  requireRole("GOVERNMENT"),
  async (req, res) => {
    try {
      const { slotId } = req.params;
      const { capacity, status } = req.body;

      const slot = await prisma.slot.findUnique({
        where: { id: slotId },
      });

      if (!slot) {
        return res.status(404).json({
          success: false,
          message: "Slot not found",
          code: "SLOT_NOT_FOUND",
        });
      }

      const updateData = {};
      if (capacity !== undefined) {
        if (parseInt(capacity) < slot.bookedCount) {
          return res.status(422).json({
            success: false,
            message: "Capacity cannot be less than already booked count",
            code: "VALIDATION_ERROR",
          });
        }
        updateData.capacity = parseInt(capacity);
      }

      if (status) updateData.status = status;

      const updatedSlot = await prisma.slot.update({
        where: { id: slotId },
        data: updateData,
      });

      return res.status(200).json({
        success: true,
        message: "Slot updated successfully",
        data: updatedSlot,
      });
    } catch (error) {
      console.error("Error updating slot:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update slot",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },
);

// DELETE /api/v1/slots/:id - Delete slot (MANAGER/ADMIN only)
router.delete(
  "/:slotId",
  requireAuth,
  requireRole("GOVERNMENT"),
  async (req, res) => {
    try {
      const { slotId } = req.params;

      const slot = await prisma.slot.findUnique({
        where: { id: slotId },
        include: { bookings: true },
      });

      if (!slot) {
        return res.status(404).json({
          success: false,
          message: "Slot not found",
          code: "SLOT_NOT_FOUND",
        });
      }

      if (slot.bookings.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Cannot delete slot with existing bookings",
          code: "SLOT_HAS_BOOKINGS",
        });
      }

      await prisma.slot.delete({
        where: { id: slotId },
      });

      return res.status(204).send();
    } catch (error) {
      console.error("Error deleting slot:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete slot",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },
);

export default router;
