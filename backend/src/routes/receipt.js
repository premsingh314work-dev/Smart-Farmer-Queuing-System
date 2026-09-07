import express from "express";
import prisma from "../config/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

/*
  GET /api/v1/receipts/booking/:bookingId

  Only the farmer who owns the booking can access
  the procurement receipt.
*/
router.get(
  "/booking/:bookingId",
  requireAuth,
  requireRole("FARMER"),
  async (req, res) => {
    try {
      const { bookingId } = req.params;

      // Find farmer profile belonging to logged-in user
      const farmer = await prisma.farmer.findUnique({
        where: {
          userId: req.user.id,
        },
        select: {
          id: true,
        },
      });

      if (!farmer) {
        return res.status(404).json({
          success: false,
          message: "Farmer profile not found",
        });
      }

      /*
        SECURITY:
        We check both:
        - booking ID
        - farmer ID belonging to req.user

        Therefore a farmer cannot access another farmer's receipt
        simply by changing bookingId in the URL.
      */
      const booking = await prisma.booking.findFirst({
        where: {
          id: bookingId,
          farmerId: farmer.id,
          status: "PROCURED",
        },

        include: {
          farmer: {
            include: {
              user: {
                select: {
                  name: true,
                  phone: true,
                  email: true,
                },
              },
            },
          },

          crop: true,
          centre: true,
          slot: true,
          qualityCheck: true,
          weighment: true,
          procurement: true,
        },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Receipt not found",
        });
      }

      // A PROCURED booking should have a procurement record
      if (!booking.procurement) {
        return res.status(404).json({
          success: false,
          message: "Procurement record not found",
        });
      }

      const receipt = {
        receiptNumber: `KISAN-${booking.bookingNumber}`,

        issuedAt:
          booking.procurement.completedAt || booking.procurement.createdAt,

        farmer: {
          name: booking.farmer.user.name,
          phone: booking.farmer.user.phone,
          email: booking.farmer.user.email,
          farmerCode: booking.farmer.farmerCode,
          village: booking.farmer.village,
          district: booking.farmer.district,
          state: booking.farmer.state,
        },

        booking: {
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          tokenNumber: booking.tokenNumber,
          bookedAt: booking.bookedAt,
        },

        crop: {
          cropType: booking.crop.cropType,
          season: booking.crop.season,
          expectedQuantity: booking.crop.quantity,
          unit: booking.crop.unit,
        },

        centre: {
          name: booking.centre.name,
          centreCode: booking.centre.centreCode,
          address: booking.centre.address,
          village: booking.centre.village,
          district: booking.centre.district,
          state: booking.centre.state,
        },

        slot: {
          date: booking.slot.slotDate,
          startTime: booking.slot.startTime,
          endTime: booking.slot.endTime,
        },

        quality: booking.qualityCheck
          ? {
              status: booking.qualityCheck.qualityStatus,
              grade: booking.qualityCheck.grade,
              moisturePercentage: booking.qualityCheck.moisturePercentage,
              remarks: booking.qualityCheck.remarks,
              checkedAt: booking.qualityCheck.checkedAt,
            }
          : null,

        weighment: booking.weighment
          ? {
              expectedQuantity: booking.weighment.expectedQuantity,
              actualQuantity: booking.weighment.actualQuantity,
              unit: booking.weighment.unit,
              remarks: booking.weighment.remarks,
              measuredAt: booking.weighment.measuredAt,
            }
          : null,

        procurement: {
          amount: booking.procurement.procurementAmount,
          status: booking.procurement.status,
          completedAt: booking.procurement.completedAt,
          remarks: booking.procurement.remarks,
        },

        status: booking.status,
      };

      return res.json({
        success: true,
        data: receipt,
      });
    } catch (error) {
      console.error("Receipt error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch receipt",
      });
    }
  },
);

export default router;
