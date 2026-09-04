import express from "express";
import { Router } from "express";
import prisma from "../config/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

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

// GET /api/v1/bookings/:id/queue - Get queue position and info
router.get("/booking/:bookingId", requireAuth, async (req, res) => {
  try {
    const queueEntry = await prisma.queueEntry.findUnique({
      where: { bookingId: req.params.bookingId },
      include: { booking: true },
    });

    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        message: "Queue entry not found",
        code: "QUEUE_ENTRY_NOT_FOUND",
      });
    }

    // Get all queue entries for this centre that are ahead in queue
    const peopleAhead = await prisma.queueEntry.count({
      where: {
        centreId: queueEntry.centreId,
        status: "WAITING",
        queuePosition: { lt: queueEntry.queuePosition },
      },
    });

    // Get current serving token
    const currentServing = await prisma.queueEntry.findFirst({
      where: {
        centreId: queueEntry.centreId,
        status: "SERVING",
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        bookingId: queueEntry.bookingId,
        tokenNumber: queueEntry.tokenNumber,
        queuePosition: queueEntry.queuePosition,
        peopleAhead: peopleAhead,
        estimatedWaitingMinutes:
          queueEntry.estimatedWaitMinutes || peopleAhead * 15,
        currentlyServingToken: currentServing?.tokenNumber || null,
        status: queueEntry.status,
        arrivedAt: queueEntry.arrivedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching queue info:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch queue information",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

// POST /api/v1/bookings/:id/arrival - Mark farmer as arrived
router.post("/:bookingId/arrival", requireAuth, async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.bookingId },
      include: { queueEntry: true },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
        code: "BOOKING_NOT_FOUND",
      });
    }

    if (booking.status === "ARRIVED") {
      return res.status(409).json({
        success: false,
        message: "Farmer already marked as arrived",
        code: "ALREADY_ARRIVED",
      });
    }

    if (!["CONFIRMED", "BOOKED"].includes(booking.status)) {
      return res.status(409).json({
        success: false,
        message: "Invalid booking status for arrival",
        code: "INVALID_BOOKING_STATUS",
      });
    }

    const updatedBooking = await prisma.$transaction(async (tx) => {
      // Update booking status
      const updated = await tx.booking.update({
        where: { id: req.params.bookingId },
        data: { status: "ARRIVED" },
      });

      // Update queue entry
      if (booking.queueEntry) {
        await tx.queueEntry.update({
          where: { id: booking.queueEntry.id },
          data: {
            arrivedAt: new Date(),
            status: "WAITING",
          },
        });
      }

      return updated;
    });

    return res.status(200).json({
      success: true,
      message: "Arrival marked successfully",
      data: updatedBooking,
    });
  } catch (error) {
    console.error("Error marking arrival:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark arrival",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});
// POST /api/v1/queue/:bookingId/check-in - Check in farmer (OPERATOR only)
router.post(
  "/:bookingId/check-in",
  requireAuth,
  requireRole("OPERATOR"),
  async (req, res) => {
    try {
      const { bookingId } = req.params;

      // Get booking with queue entry
      const booking = await prisma.booking.findUnique({
        where: {
          id: bookingId,
        },
        include: {
          queueEntry: true,
          centre: true,
        },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found",
          code: "BOOKING_NOT_FOUND",
        });
      }

      // Verify that this operator belongs to the booking's centre
      await verifyOperatorAtCentre(req.user.id, booking.centreId);

      // Already checked in
      if (booking.status === "ARRIVED" || booking.status === "IN_QUEUE") {
        return res.status(409).json({
          success: false,
          message: "Farmer is already checked in",
          code: "ALREADY_CHECKED_IN",
        });
      }

      // Only booked/confirmed farmers can be checked in
      if (booking.status !== "BOOKED" && booking.status !== "CONFIRMED") {
        return res.status(409).json({
          success: false,
          message: `Cannot check in booking with status ${booking.status}`,
          code: "INVALID_BOOKING_STATUS",
        });
      }

      const now = new Date();

      const result = await prisma.$transaction(async (tx) => {
        // Update booking
        const updatedBooking = await tx.booking.update({
          where: {
            id: bookingId,
          },
          data: {
            status: "ARRIVED",
          },
        });

        // Update or create queue entry
        let updatedQueueEntry;

        if (booking.queueEntry) {
          updatedQueueEntry = await tx.queueEntry.update({
            where: {
              bookingId: bookingId,
            },
            data: {
              status: "WAITING",
              arrivedAt: now,
            },
          });
        } else {
          updatedQueueEntry = await tx.queueEntry.create({
            data: {
              bookingId: bookingId,
              centreId: booking.centreId,
              tokenNumber: booking.tokenNumber,
              status: "WAITING",
              arrivedAt: now,
            },
          });
        }

        return {
          booking: updatedBooking,
          queueEntry: updatedQueueEntry,
        };
      });

      // 🔴 REAL-TIME UPDATE
      const io = req.app.get("io");

      io.to(`centre:${booking.centreId}`).emit("queue:updated", {
        type: "CHECK_IN",
        bookingId: booking.id,
        queueEntryId: result.queueEntry.id,
        tokenNumber: result.queueEntry.tokenNumber,
        status: result.queueEntry.status,
      });

      return res.status(200).json({
        success: true,
        message: "Farmer checked in successfully",
        data: result,
      });
    } catch (error) {
      console.error("Check-in error:", error);

      return res.status(error.status || 500).json({
        success: false,
        message: error.message || "Failed to check in farmer",
        code: error.code || "INTERNAL_SERVER_ERROR",
      });
    }
  },
);

// POST /api/v1/queue/:centreId/call-next - Call next token (OPERATOR only)
router.post(
  "/:centreId/call-next",
  requireAuth,
  requireRole("OPERATOR"),
  async (req, res) => {
    try {
      const centreId = req.params.centreId;

      // Verify operator is assigned to this centre
      await verifyOperatorAtCentre(req.user.id, centreId);

      // 🔴 Check if a farmer is already called or being served
      const currentActive = await prisma.queueEntry.findFirst({
        where: {
          centreId,
          status: {
            in: ["CALLED", "SERVING"],
          },
        },
      });

      if (currentActive) {
        return res.status(409).json({
          success: false,
          message:
            "A farmer is already called or being served. Complete the current farmer first.",
          code: "CURRENT_TOKEN_ACTIVE",
        });
      }

      // Get next waiting farmer who has actually arrived
      const nextQueue = await prisma.queueEntry.findFirst({
        where: {
          centreId,
          status: "WAITING",
          arrivedAt: {
            not: null,
          },
        },
        orderBy: [
          {
            queuePosition: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
      });

      if (!nextQueue) {
        return res.status(409).json({
          success: false,
          message: "No one in queue to call",
          code: "QUEUE_EMPTY",
        });
      }

      // Update queue + booking atomically
      const updatedQueue = await prisma.$transaction(async (tx) => {
        // Update queue entry
        const updated = await tx.queueEntry.update({
          where: {
            id: nextQueue.id,
          },
          data: {
            status: "CALLED",
            calledAt: new Date(),
          },
        });

        // Update booking status
        await tx.booking.update({
          where: {
            id: nextQueue.bookingId,
          },
          data: {
            status: "IN_QUEUE",
          },
        });

        return updated;
      });

      // 🔴 REAL-TIME UPDATE
      const io = req.app.get("io");

      io.to(`centre:${centreId}`).emit("queue:updated", {
        type: "CALL_NEXT",
        bookingId: updatedQueue.bookingId,
        tokenNumber: updatedQueue.tokenNumber,
        status: updatedQueue.status,
      });

      return res.status(200).json({
        success: true,
        message: "Next token called successfully",
        data: {
          tokenNumber: updatedQueue.tokenNumber,
          bookingId: updatedQueue.bookingId,
          status: updatedQueue.status,
        },
      });
    } catch (error) {
      console.error("Error calling next token:", error);

      return res.status(error.status || 500).json({
        success: false,
        message: error.message || "Failed to call next token",
        code: error.code || "INTERNAL_SERVER_ERROR",
      });
    }
  },
);

// POST /api/v1/queue/:bookingId/no-show - Mark as no-show (OPERATOR only)
router.post(
  "/:bookingId/no-show",
  requireAuth,
  requireRole("OPERATOR"),
  async (req, res) => {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: req.params.bookingId },
        include: { queueEntry: true },
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

      if (!["CALLED", "IN_QUEUE"].includes(booking.status)) {
        return res.status(409).json({
          success: false,
          message: "Invalid booking status for no-show",
          code: "INVALID_QUEUE_STATE",
        });
      }

      const updatedBooking = await prisma.$transaction(async (tx) => {
        // Update booking
        const updated = await tx.booking.update({
          where: { id: req.params.bookingId },
          data: { status: "NO_SHOW" },
        });

        // Update queue entry
        if (booking.queueEntry) {
          await tx.queueEntry.update({
            where: { id: booking.queueEntry.id },
            data: { status: "NO_SHOW" },
          });
        }

        // Reset crop status to AVAILABLE
        await tx.crop.update({
          where: { id: booking.cropId },
          data: { status: "AVAILABLE" },
        });

        return updated;
      });

      return res.status(200).json({
        success: true,
        message: "Marked as no-show",
        data: updatedBooking,
      });
    } catch (error) {
      console.error("Error marking no-show:", error);
      return res.status(error.status || 500).json({
        success: false,
        message: error.message || "Failed to mark no-show",
        code: error.code || "INTERNAL_SERVER_ERROR",
      });
    }
  },
);
// GET /api/v1/queue/centre/current
// Get the logged-in operator's assigned centre and current queue
router.get(
  "/centre/current",
  requireAuth,
  requireRole("OPERATOR"),
  async (req, res) => {
    try {
      // Find the centre assigned to this operator
      const operatorAssignment = await prisma.centreOperator.findUnique({
        where: {
          userId: req.user.id,
        },
        include: {
          centre: true,
        },
      });

      if (!operatorAssignment) {
        return res.status(404).json({
          success: false,
          message: "No procurement centre assigned to this operator",
          code: "CENTRE_NOT_ASSIGNED",
        });
      }

      const centre = operatorAssignment.centre;

      // Get active queue entries for this centre
      const queue = await prisma.queueEntry.findMany({
        where: {
          centreId: centre.id,
          status: {
            in: ["WAITING", "CALLED", "SERVING"],
          },
        },
        include: {
          booking: {
            include: {
              farmer: {
                include: {
                  user: true,
                },
              },
              crop: true,
            },
          },
        },
        orderBy: [
          {
            status: "asc",
          },
          {
            queuePosition: "asc",
          },
        ],
      });

      // Find currently serving farmer
      const currentServing = await prisma.queueEntry.findFirst({
        where: {
          centreId: centre.id,
          status: "SERVING",
        },
        include: {
          booking: {
            include: {
              farmer: {
                include: {
                  user: true,
                },
              },
              crop: true,
            },
          },
        },
      });

      return res.status(200).json({
        success: true,
        centre: {
          id: centre.id,
          name: centre.name,
          centreCode: centre.centreCode,
          address: centre.address,
          district: centre.district,
          state: centre.state,
          dailyCapacity: centre.dailyCapacity,
          status: centre.status,
          openingTime: centre.openingTime,
          closingTime: centre.closingTime,
        },
        queue,
        currentServing,
      });
    } catch (error) {
      console.error("Get operator current centre error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to load operator centre and queue",
      });
    }
  },
);
// GET /api/v1/centres/:centreId/queue - Get current queue at centre (OPERATOR only)
router.get(
  "/centre/:centreId/queue",
  requireAuth,
  requireRole("OPERATOR"),
  async (req, res) => {
    try {
      // Verify operator is assigned to this centre
      await verifyOperatorAtCentre(req.user.id, req.params.centreId);

      const queue = await prisma.queueEntry.findMany({
        where: {
          centreId: req.params.centreId,
          status: {
            in: ["WAITING", "CALLED", "SERVING"],
          },
        },
        include: {
          booking: {
            include: {
              crop: true,

              farmer: {
                include: {
                  user: true,
                },
              },

              // Booking date + time
              slot: true,

              // Centre information if needed by frontend
              centre: true,
            },
          },
        },
        orderBy: [{ queuePosition: "asc" }, { createdAt: "asc" }],
      });

      return res.status(200).json({
        success: true,
        data: queue,
        total: queue.length,
      });
    } catch (error) {
      console.error("Error fetching queue:", error);

      return res.status(error.status || 500).json({
        success: false,
        message: error.message || "Failed to fetch queue",
        code: error.code || "INTERNAL_SERVER_ERROR",
      });
    }
  },
);

export default router;
