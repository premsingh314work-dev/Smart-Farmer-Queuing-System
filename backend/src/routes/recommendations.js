import express from "express";
import prisma from "../config/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import {
  calculateHaversineDistance,
  filterCentresByDistance,
  calculateCongestionLevel,
  calculateEstimatedWaitTime,
} from "../utils/distance.js";

const router = express.Router();

// GET /api/v1/recommendations/centres - Smart centre recommendations based on location and date
router.get("/centres", requireAuth, async (req, res) => {
  try {
    const { latitude, longitude, radius = 50, date } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "latitude and longitude are required",
        code: "MISSING_COORDINATES",
      });
    }

    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);
    const radiusKm = parseInt(radius);

    // Validate coordinates
    if (isNaN(userLat) || isNaN(userLon)) {
      return res.status(422).json({
        success: false,
        message: "Invalid coordinate values",
        code: "VALIDATION_ERROR",
      });
    }

    if (radiusKm <= 0 || radiusKm > 500) {
      return res.status(422).json({
        success: false,
        message: "Radius must be between 1 and 500 km",
        code: "VALIDATION_ERROR",
      });
    }

    // Get all active centres
    let centres = await prisma.procurementCentre.findMany({
      where: { status: "ACTIVE" },
      include: {
        slots: {
          where: {
            status: "OPEN",
            ...(date && {
              slotDate: {
                gte: new Date(date),
                lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
              },
            }),
          },
          select: {
            id: true,
            capacity: true,
            bookedCount: true,
          },
        },
        queueEntries: {
          where: { status: { in: ["WAITING", "CALLED", "SERVING"] } },
          select: { id: true },
        },
      },
    });

    if (centres.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No centres found in the specified radius",
        data: {
          userLocation: {
            latitude: userLat,
            longitude: userLon,
          },
          recommendations: [],
          totalFound: 0,
        },
      });
    }

    // Filter by distance
    centres = filterCentresByDistance(centres, userLat, userLon, radiusKm);

    // Calculate recommendation scores
    const recommendations = centres
      .map((centre) => {
        const distance = centre.distance;

        const totalSlotCapacity = centre.slots.reduce(
          (sum, slot) => sum + Math.max(0, slot.capacity - slot.bookedCount),
          0,
        );

        const occupancyRate =
          centre.queueEntries.length / centre.dailyCapacity;
        const congestionLevel = calculateCongestionLevel(
          centre.queueEntries.length,
          centre.dailyCapacity,
        );
        const estimatedWait = calculateEstimatedWaitTime(
          centre.queueEntries.length,
        );

        // Scoring algorithm (0-100)
        // Distance: closer is better (40 points max)
        const distanceScore = Math.max(0, (1 - distance / radiusKm) * 40);

        // Capacity: more available capacity is better (30 points max)
        const capacityScore =
          (Math.min(totalSlotCapacity, centre.dailyCapacity) /
            centre.dailyCapacity) *
          30;

        // Congestion: lower is better (30 points max)
        const congestionScore = Math.max(0, (1 - occupancyRate) * 30);

        const totalScore = Math.round(
          distanceScore + capacityScore + congestionScore,
        );

        return {
          centreId: centre.id,
          centreName: centre.name,
          centreCode: centre.centreCode,
          address: centre.address,
          village: centre.village,
          district: centre.district,
          state: centre.state,
          latitude: parseFloat(centre.latitude),
          longitude: parseFloat(centre.longitude),
          score: totalScore,
          distanceKm: distance,
          availableCapacity: totalSlotCapacity,
          currentQueueLength: centre.queueEntries.length,
          congestionLevel,
          estimatedWaitMinutes: estimatedWait,
          availableSlotsCount: centre.slots.length,
          openingTime: centre.openingTime,
          closingTime: centre.closingTime,
          status: centre.status,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Return top 10

    return res.status(200).json({
      success: true,
      message: "Centre recommendations fetched successfully",
      data: {
        userLocation: {
          latitude: userLat,
          longitude: userLon,
        },
        recommendations,
        totalFound: recommendations.length,
      },
    });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return res.status(502).json({
      success: false,
      message: "Failed to fetch recommendations",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

// GET /api/v1/recommendations/slots - Recommend best slot for a given centre
router.get("/slots", requireAuth, async (req, res) => {
  try {
    const { centreId, date } = req.query;

    if (!centreId) {
      return res.status(400).json({
        success: false,
        message: "centreId is required",
        code: "MISSING_CENTRE",
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date is required",
        code: "MISSING_DATE",
      });
    }

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

    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const slots = await prisma.slot.findMany({
      where: {
        centreId,
        slotDate: {
          gte: selectedDate,
          lt: nextDate,
        },
        status: "OPEN",
      },
      orderBy: { startTime: "asc" },
    });

    if (slots.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No available slots for this date",
        code: "NO_SLOTS_AVAILABLE",
      });
    }

    // Score slots based on availability
    const recommendedSlots = slots
      .map((slot) => {
        const availableCapacity = slot.capacity - slot.bookedCount;
        const occupancyRate = slot.bookedCount / slot.capacity;

        // Prefer slots with more available capacity
        const score = availableCapacity * (1 - occupancyRate);

        return {
          slotId: slot.id,
          centreId: slot.centreId,
          slotDate: slot.slotDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
          capacity: slot.capacity,
          bookedCount: slot.bookedCount,
          availableCapacity,
          occupancyPercentage: Math.round(occupancyRate * 100),
          score: Math.round(score),
        };
      })
      .sort((a, b) => b.score - a.score);

    return res.status(200).json({
      success: true,
      message: "Slot recommendations fetched successfully",
      data: {
        centreId,
        date: selectedDate.toISOString().split("T")[0],
        recommendations: recommendedSlots,
        topRecommendation: recommendedSlots[0] || null,
      },
    });
  } catch (error) {
    console.error("Error fetching slot recommendations:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch slot recommendations",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

export default router;
