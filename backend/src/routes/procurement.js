import express from "express";
import prisma from "../config/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { notifyAffectedFarmers } from "../utils/queueSocket.js";

const router = express.Router();

// Helper to verify operator at centre
async function verifyOperatorAtCentre(userId, centreId) {
  const operator = await prisma.centreOperator.findUnique({
    where: { userId },
  });

  if (!operator || operator.centreId !== centreId) {
    throw Object.assign(new Error("Operator not assigned to this centre"), {
      code: "FORBIDDEN",
      status: 403,
    });
  }

  return operator;
}

// POST /api/v1/procurements/:bookingId/start - Start procurement process
router.post(
  "/:bookingId/start",
  requireAuth,
  requireRole("OPERATOR"),
  async (req, res) => {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: req.params.bookingId },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found",
          code: "BOOKING_NOT_FOUND",
        });
      }

      // Verify operator is at this centre
      await verifyOperatorAtCentre(req.user.id, booking.centreId);

      if (!["ARRIVED", "IN_QUEUE", "CALLED"].includes(booking.status)) {
        return res.status(409).json({
          success: false,
          message: "Invalid booking status for starting procurement",
          code: "INVALID_BOOKING_STATUS",
        });
      }

      const updatedBooking = await prisma.booking.update({
        where: { id: req.params.bookingId },
        data: { status: "VERIFICATION" },
      });

      // Update queue entry
      await prisma.queueEntry.update({
        where: { bookingId: req.params.bookingId },
        data: {
          status: "SERVING",
          serviceStartedAt: new Date(),
        },
      });

      const io = req.app.get("io");
      if (io) notifyAffectedFarmers(io, booking.centreId, req.params.bookingId);

      return res.status(200).json({
        success: true,
        message: "Procurement started",
        data: updatedBooking,
      });
    } catch (error) {
      console.error("Error starting procurement:", error);
      return res.status(error.status || 500).json({
        success: false,
        message: error.message || "Failed to start procurement",
        code: error.code || "INTERNAL_SERVER_ERROR",
      });
    }
  },
);

// POST /api/v1/procurements/:bookingId/quality - Submit quality check
// POST /api/v1/procurements/:bookingId/quality - Submit quality check
router.post(
  "/:bookingId/quality",
  requireAuth,
  requireRole("OPERATOR"),
  async (req, res) => {
    try {
      const { quality_status, grade, moisture_percentage, remarks } = req.body;

      if (!quality_status) {
        return res.status(400).json({
          success: false,
          message: "Missing required field: quality_status",
          code: "VALIDATION_ERROR",
        });
      }

      // Only allow valid quality results
      if (!["PASSED", "FAILED", "CONDITIONAL"].includes(quality_status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid quality status",
          code: "INVALID_QUALITY_STATUS",
        });
      }

      const booking = await prisma.booking.findUnique({
        where: { id: req.params.bookingId },
        include: {
          crop: true,
          qualityCheck: true,
        },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found",
          code: "BOOKING_NOT_FOUND",
        });
      }

      // Verify operator is at this centre
      await verifyOperatorAtCentre(req.user.id, booking.centreId);

      // Quality check must only happen during verification
      if (booking.status !== "VERIFICATION") {
        return res.status(409).json({
          success: false,
          message: "Quality check can only be performed during verification",
          code: "INVALID_BOOKING_STATUS",
        });
      }

      // Check if quality check already exists
      if (booking.qualityCheck) {
        return res.status(409).json({
          success: false,
          message: "Quality check already submitted for this booking",
          code: "QUALITY_ALREADY_SUBMITTED",
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        // Create quality check
        const qualityCheck = await tx.qualityCheck.create({
          data: {
            bookingId: req.params.bookingId,
            checkedBy: req.user.id,
            qualityStatus: quality_status,
            grade: grade || null,
            moisturePercentage: moisture_percentage
              ? parseFloat(moisture_percentage)
              : null,
            remarks: remarks || null,
            checkedAt: new Date(),
          },
        });

        // ❌ FAILED → Reject crop and stop procurement
        if (quality_status === "FAILED") {
          const rejectedBooking = await tx.booking.update({
            where: { id: req.params.bookingId },
            data: {
              status: "REJECTED",
            },
          });

          // Mark crop as rejected
          await tx.crop.update({
            where: { id: booking.cropId },
            data: {
              status: "REJECTED",
            },
          });

          // Remove farmer from active queue
          await tx.queueEntry.update({
            where: { bookingId: req.params.bookingId },
            data: {
              status: "COMPLETED",
              completedAt: new Date(),
            },
          });

          return {
            qualityCheck,
            booking: rejectedBooking,
            rejected: true,
          };
        }

        // ✅ PASSED / CONDITIONAL → Continue to weighment
        const updatedBooking = await tx.booking.update({
          where: { id: req.params.bookingId },
          data: {
            status: "QUALITY_CHECK",
          },
        });

        return {
          qualityCheck,
          booking: updatedBooking,
          rejected: false,
        };
      });

      const io = req.app.get("io");

      if (io) {
        notifyAffectedFarmers(io, booking.centreId, req.params.bookingId);
      }

      if (result.rejected) {
        return res.status(201).json({
          success: true,
          message: "Quality check failed. Crop has been rejected.",
          data: result.qualityCheck,
          rejected: true,
          bookingStatus: "REJECTED",
        });
      }

      return res.status(201).json({
        success: true,
        message: "Quality check passed. Proceed to weighment.",
        data: result.qualityCheck,
        rejected: false,
        bookingStatus: "QUALITY_CHECK",
      });
    } catch (error) {
      console.error("Error submitting quality check:", error);

      return res.status(error.status || 500).json({
        success: false,
        message: error.message || "Failed to submit quality check",
        code: error.code || "INTERNAL_SERVER_ERROR",
      });
    }
  },
);

// POST /api/v1/procurements/:bookingId/weighment - Submit weighment
router.post(
  "/:bookingId/weighment",
  requireAuth,
  requireRole("OPERATOR"),
  async (req, res) => {
    try {
      const { actual_quantity, unit } = req.body;

      if (!actual_quantity || !unit) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: actual_quantity, unit",
          code: "VALIDATION_ERROR",
        });
      }

      const booking = await prisma.booking.findUnique({
        where: { id: req.params.bookingId },
        include: { crop: true },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found",
          code: "BOOKING_NOT_FOUND",
        });
      }

      // Verify operator is at this centre
      await verifyOperatorAtCentre(req.user.id, booking.centreId);
      if (booking.status !== "QUALITY_CHECK") {
        return res.status(409).json({
          success: false,
          message: "Weighment is only allowed after a successful quality check",
          code: "QUALITY_NOT_PASSED",
        });
      }

      if (booking.crop.status === "REJECTED") {
        return res.status(409).json({
          success: false,
          message:
            "This crop has been rejected and cannot proceed to weighment",
          code: "CROP_REJECTED",
        });
      }

      // Check if weighment already exists
      const existingWeighment = await prisma.weighment.findUnique({
        where: { bookingId: req.params.bookingId },
      });

      if (existingWeighment) {
        return res.status(409).json({
          success: false,
          message: "Weighment already submitted for this booking",
          code: "WEIGHMENT_ALREADY_SUBMITTED",
        });
      }

      const weighment = await prisma.weighment.create({
        data: {
          bookingId: req.params.bookingId,
          measuredBy: req.user.id,
          expectedQuantity: booking.crop.quantity,
          actualQuantity: parseFloat(actual_quantity),
          unit: unit,
          measuredAt: new Date(),
        },
      });

      // Update booking status
      await prisma.booking.update({
        where: { id: req.params.bookingId },
        data: { status: "WEIGHING" },
      });

      const io = req.app.get("io");
      if (io) notifyAffectedFarmers(io, booking.centreId, req.params.bookingId);

      return res.status(201).json({
        success: true,
        message: "Weighment submitted",
        data: weighment,
      });
    } catch (error) {
      console.error("Error submitting weighment:", error);
      return res.status(error.status || 500).json({
        success: false,
        message: error.message || "Failed to submit weighment",
        code: error.code || "INTERNAL_SERVER_ERROR",
      });
    }
  },
);

// POST /api/v1/procurements/:bookingId/complete - Complete procurement
router.post(
  "/:bookingId/complete",
  requireAuth,
  requireRole("OPERATOR"),
  async (req, res) => {
    try {
      const { procurement_amount, remarks } = req.body;

      if (!procurement_amount) {
        return res.status(400).json({
          success: false,
          message: "Missing required field: procurement_amount",
          code: "VALIDATION_ERROR",
        });
      }

      const booking = await prisma.booking.findUnique({
        where: { id: req.params.bookingId },
        include: {
          qualityCheck: true,
          weighment: true,
        },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found",
          code: "BOOKING_NOT_FOUND",
        });
      }

      // Verify operator is at this centre
      await verifyOperatorAtCentre(req.user.id, booking.centreId);

      // Verify quality check and weighment are completed
      if (!booking.qualityCheck) {
        return res.status(409).json({
          success: false,
          message: "Quality check must be completed before completion",
          code: "QUALITY_NOT_COMPLETED",
        });
      }

      if (!booking.weighment) {
        return res.status(409).json({
          success: false,
          message: "Weighment must be completed before completion",
          code: "WEIGHMENT_NOT_COMPLETED",
        });
      }

      const updatedBooking = await prisma.$transaction(async (tx) => {
        // Create procurement record
        await tx.procurement.create({
          data: {
            bookingId: req.params.bookingId,
            operatorId: req.user.id,
            procurementAmount: parseFloat(procurement_amount),
            status: "APPROVED",
            completedAt: new Date(),
            remarks: remarks || null,
          },
        });

        // Update booking status
        const updated = await tx.booking.update({
          where: { id: req.params.bookingId },
          data: { status: "PROCURED" },
        });

        // Update crop status
        await tx.crop.update({
          where: { id: booking.cropId },
          data: { status: "PROCURED" },
        });

        // Update queue entry
        await tx.queueEntry.update({
          where: { bookingId: req.params.bookingId },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });

        return updated;
      });

      const io = req.app.get("io");
      if (io) notifyAffectedFarmers(io, booking.centreId, req.params.bookingId);

      return res.status(200).json({
        success: true,
        message: "Procurement completed successfully",
        data: updatedBooking,
      });
    } catch (error) {
      console.error("Error completing procurement:", error);
      return res.status(error.status || 500).json({
        success: false,
        message: error.message || "Failed to complete procurement",
        code: error.code || "INTERNAL_SERVER_ERROR",
      });
    }
  },
);

// GET /api/v1/procurements/:bookingId - Get procurement status
router.get("/:bookingId", requireAuth, async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.bookingId },
      include: {
        crop: true,
        centre: true,
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

    return res.status(200).json({
      success: true,
      data: {
        booking,
        qualityCheck: booking.qualityCheck,
        weighment: booking.weighment,
        procurement: booking.procurement,
      },
    });
  } catch (error) {
    console.error("Error fetching procurement:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch procurement details",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

export default router;
