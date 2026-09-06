import express from "express";
import prisma from "../config/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router({ mergeParams: true });

// --------------------------------------------------
// GET /api/v1/centres/:centreId/slots
// Get slots for a centre
// --------------------------------------------------
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

    const whereClause = { centreId };

    if (date) {
      const selectedDate = new Date(date);

      if (Number.isNaN(selectedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date",
          code: "VALIDATION_ERROR",
        });
      }

      selectedDate.setHours(0, 0, 0, 0);

      const nextDate = new Date(selectedDate);
      nextDate.setDate(nextDate.getDate() + 1);

      whereClause.slotDate = {
        gte: selectedDate,
        lt: nextDate,
      };
    }

    const slots = await prisma.slot.findMany({
      where: whereClause,
      orderBy: [{ slotDate: "asc" }, { startTime: "asc" }],
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

// --------------------------------------------------
// POST /api/v1/centres/:centreId/slots
// Create new slot
// --------------------------------------------------
router.post("/", requireAuth, requireRole("GOVERNMENT"), async (req, res) => {
  try {
    const { centreId } = req.params;
    const { slot_date, start_time, end_time, capacity } = req.body;

    // ----------------------------------------------
    // Validate required fields
    // ----------------------------------------------
    if (!slot_date || !start_time || !end_time || capacity === undefined) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: slot_date, start_time, end_time, capacity",
        code: "VALIDATION_ERROR",
      });
    }

    // ----------------------------------------------
    // Validate capacity
    // ----------------------------------------------
    const parsedCapacity = Number(capacity);

    if (!Number.isInteger(parsedCapacity) || parsedCapacity <= 0) {
      return res.status(422).json({
        success: false,
        message: "Capacity must be a positive whole number",
        code: "VALIDATION_ERROR",
      });
    }

    // ----------------------------------------------
    // Validate time
    // ----------------------------------------------
    if (start_time >= end_time) {
      return res.status(422).json({
        success: false,
        message: "End time must be after start time",
        code: "VALIDATION_ERROR",
      });
    }

    // ----------------------------------------------
    // Validate date
    // ----------------------------------------------
    const slotDate = new Date(slot_date);

    if (Number.isNaN(slotDate.getTime())) {
      return res.status(422).json({
        success: false,
        message: "Invalid slot date",
        code: "VALIDATION_ERROR",
      });
    }

    slotDate.setHours(0, 0, 0, 0);

    // ----------------------------------------------
    // Check centre exists
    // ----------------------------------------------
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

    // ----------------------------------------------
    // Check duplicate slot
    // ----------------------------------------------
    const nextDate = new Date(slotDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const existingSlot = await prisma.slot.findFirst({
      where: {
        centreId,
        slotDate: {
          gte: slotDate,
          lt: nextDate,
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

    // ----------------------------------------------
    // Create slot
    // ----------------------------------------------
    const newSlot = await prisma.slot.create({
      data: {
        centreId,
        slotDate,
        startTime: start_time,
        endTime: end_time,
        capacity: parsedCapacity,
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

// --------------------------------------------------
// PATCH /api/v1/slots/:slotId
// Update slot
// --------------------------------------------------
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
        const parsedCapacity = Number(capacity);

        if (!Number.isInteger(parsedCapacity) || parsedCapacity <= 0) {
          return res.status(422).json({
            success: false,
            message: "Capacity must be a positive whole number",
            code: "VALIDATION_ERROR",
          });
        }

        if (parsedCapacity < slot.bookedCount) {
          return res.status(422).json({
            success: false,
            message: "Capacity cannot be less than already booked count",
            code: "VALIDATION_ERROR",
          });
        }

        updateData.capacity = parsedCapacity;
      }

      if (status !== undefined) {
        const allowedStatuses = ["OPEN", "CLOSED"];

        if (!allowedStatuses.includes(status)) {
          return res.status(422).json({
            success: false,
            message: "Invalid slot status",
            code: "VALIDATION_ERROR",
          });
        }

        updateData.status = status;
      }

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

// --------------------------------------------------
// DELETE /api/v1/slots/:slotId
// Delete slot
// --------------------------------------------------
router.delete(
  "/:slotId",
  requireAuth,
  requireRole("GOVERNMENT"),
  async (req, res) => {
    try {
      const { slotId } = req.params;

      const slot = await prisma.slot.findUnique({
        where: { id: slotId },
        include: {
          bookings: true,
        },
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
