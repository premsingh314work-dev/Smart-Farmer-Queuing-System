import express from "express";

import prisma from "../config/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

async function getCurrentFarmer(userId) {
  const farmer = await prisma.farmer.findUnique({
    where: { userId: userId },
  });

  if (!farmer) {
    throw Object.assign(new Error("Farmer profile not found"), {
      code: "FARMER_NOT_FOUND",
      status: 404,
    });
  }

  return farmer;
}

async function findOwnedCrop(userId, cropId) {
  const crop = await prisma.crop.findUnique({
    where: { id: cropId },
  });

  if (!crop) {
    throw Object.assign(new Error("Crop not found"), {
      code: "CROP_NOT_FOUND",
      status: 404,
    });
  }

  const farmer = await getCurrentFarmer(userId);

  if (crop.farmerId !== farmer.id) {
    throw Object.assign(new Error("Forbidden"), {
      code: "FORBIDDEN",
      status: 403,
    });
  }

  return crop;
}

router.use(requireAuth);
router.use(requireRole("FARMER"));

router.post("/", async (req, res) => {
  const payload = req.body || {};
  const cropType = String(payload.cropType || "").trim();
  const season = String(payload.season || "").trim();
  const quantity = Number(payload.quantity);
  const unit = String(payload.unit || "quintal").trim() || "quintal";
  const harvestDate = payload.harvestDate
    ? new Date(payload.harvestDate)
    : null;
  // Status is always AVAILABLE when farmer creates a crop
  // Only procurement centers can change status to BOOKED
  const status = "AVAILABLE";

  if (!cropType || !season || Number.isNaN(quantity) || quantity <= 0) {
    return res.status(422).json({
      success: false,
      message: "cropType, season, and valid quantity are required",
      code: "VALIDATION_ERROR",
    });
  }

  if (Number.isNaN(harvestDate?.getTime()) && payload.harvestDate) {
    return res.status(422).json({
      success: false,
      message: "harvestDate must be a valid date",
      code: "VALIDATION_ERROR",
    });
  }

  try {
    const farmer = await getCurrentFarmer(req.user.id);

    const crop = await prisma.crop.create({
      data: {
        farmerId: farmer.id,
        cropType,
        season,
        quantity,
        unit,
        harvestDate: harvestDate || null,
        status,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Crop created successfully",
      crop,
    });
  } catch (error) {
    const status = error.status || 500;
    const code = error.code || "INTERNAL_SERVER_ERROR";

    return res.status(status).json({
      success: false,
      message: error.message || "Something went wrong while creating the crop",
      code,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const farmer = await getCurrentFarmer(req.user.id);

    const crops = await prisma.crop.findMany({
      where: { farmerId: farmer.id },
      include: {
        bookings: {
          where: {
            status: {
              notIn: ["CANCELLED", "COMPLETED"],
            },
          },
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            centreId: true,
            slotId: true,
            tokenNumber: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const cropsWithBookingStatus = crops.map((crop) => ({
      ...crop,
      isBooked: crop.bookings.length > 0,
      status: crop.bookings.length > 0 ? "BOOKED" : crop.status,
    }));

    return res.status(200).json({
      success: true,
      crops: cropsWithBookingStatus,
      total: cropsWithBookingStatus.length,
    });
  } catch (error) {
    const status = error.status || 500;
    const code = error.code || "INTERNAL_SERVER_ERROR";

    return res.status(status).json({
      success: false,
      message: error.message || "Something went wrong while loading crops",
      code,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const crop = await findOwnedCrop(req.user.id, req.params.id);

    return res.status(200).json({
      success: true,
      crop,
    });
  } catch (error) {
    const status = error.status || 500;
    const code = error.code || "INTERNAL_SERVER_ERROR";

    return res.status(status).json({
      success: false,
      message: error.message || "Something went wrong while loading the crop",
      code,
    });
  }
});

router.patch("/:id", async (req, res) => {
  const payload = req.body || {};
  // Farmers can only update these fields
  // Status is NOT included - only procurement centers can change status
  const allowedFields = [
    "cropType",
    "season",
    "quantity",
    "unit",
    "harvestDate",
  ];
  const requestedFields = Object.keys(payload).filter((field) =>
    allowedFields.includes(field),
  );

  if (requestedFields.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No valid crop fields were provided for update",
      code: "BAD_REQUEST",
    });
  }

  try {
    const crop = await findOwnedCrop(req.user.id, req.params.id);
    const updateData = {};

    if (payload.cropType !== undefined) {
      updateData.cropType = String(payload.cropType).trim();
    }

    if (payload.season !== undefined) {
      updateData.season = String(payload.season).trim();
    }

    if (payload.quantity !== undefined) {
      const quantity = Number(payload.quantity);
      if (Number.isNaN(quantity) || quantity <= 0) {
        return res.status(422).json({
          success: false,
          message: "quantity must be a positive number",
          code: "VALIDATION_ERROR",
        });
      }
      updateData.quantity = quantity;
    }

    if (payload.unit !== undefined) {
      updateData.unit = String(payload.unit).trim() || crop.unit;
    }

    if (payload.harvestDate !== undefined) {
      updateData.harvestDate = payload.harvestDate
        ? new Date(payload.harvestDate)
        : null;
      if (
        payload.harvestDate &&
        Number.isNaN(updateData.harvestDate.getTime())
      ) {
        return res.status(422).json({
          success: false,
          message: "harvestDate must be a valid date",
          code: "VALIDATION_ERROR",
        });
      }
    }

    const updatedCrop = await prisma.crop.update({
      where: { id: crop.id },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: "Crop updated successfully",
      crop: updatedCrop,
    });
  } catch (error) {
    const status = error.status || 500;
    const code = error.code || "INTERNAL_SERVER_ERROR";

    return res.status(status).json({
      success: false,
      message: error.message || "Something went wrong while updating the crop",
      code,
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const crop = await findOwnedCrop(req.user.id, req.params.id);

    await prisma.crop.delete({
      where: { id: crop.id },
    });

    return res.status(200).json({
      success: true,
      message: "Crop deleted successfully",
      cropId: crop.id,
    });
  } catch (error) {
    const status = error.status || 500;
    const code = error.code || "INTERNAL_SERVER_ERROR";

    return res.status(status).json({
      success: false,
      message: error.message || "Something went wrong while deleting the crop",
      code,
    });
  }
});

export default router;
