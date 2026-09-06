import express from "express";

import prisma from "../config/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function getFarmerProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { farmer: true },
  });

  if (!user) {
    throw Object.assign(new Error("User not found"), {
      code: "USER_NOT_FOUND",
      status: 404,
    });
  }

  if (!user.farmer) {
    throw Object.assign(new Error("Farmer profile not found"), {
      code: "FARMER_NOT_FOUND",
      status: 404,
    });
  }

  return {
    user: serializeUser(user),
    farmer: user.farmer,
  };
}

router.use(requireAuth);
router.use(requireRole("FARMER"));

router.get("/me", async (req, res) => {
  try {
    const profile = await getFarmerProfile(req.user.id);

    return res.status(200).json({
      success: true,
      ...profile,
    });
  } catch (error) {
    const status = error.status || 500;
    const code = error.code || "INTERNAL_SERVER_ERROR";

    return res.status(status).json({
      success: false,
      message:
        error.message ||
        "Something went wrong while loading the farmer profile",
      code,
    });
  }
});

router.patch("/me", async (req, res) => {
  const payload = req.body || {};
  const allowedFields = [
    "name",
    "email",
    "village",
    "district",
    "state",
    "address",
    "latitude",
    "longitude",
    "preferred_language",
  ];

  const requestedFields = Object.keys(payload).filter((field) =>
    allowedFields.includes(field),
  );

  if (requestedFields.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No valid farmer fields were provided for update",
      code: "BAD_REQUEST",
    });
  }

  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { farmer: true },
    });

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    if (!currentUser.farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer profile not found",
        code: "FARMER_NOT_FOUND",
      });
    }

    if (payload.email !== undefined) {
      const email = String(payload.email).trim();

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(422).json({
          success: false,
          message: "Email must be valid",
          code: "VALIDATION_ERROR",
        });
      }
    }

    if (
      payload.latitude !== undefined &&
      (Number.isNaN(Number(payload.latitude)) ||
        Number(payload.latitude) < -90 ||
        Number(payload.latitude) > 90)
    ) {
      return res.status(422).json({
        success: false,
        message: "Latitude must be a number between -90 and 90",
        code: "VALIDATION_ERROR",
      });
    }

    if (
      payload.longitude !== undefined &&
      (Number.isNaN(Number(payload.longitude)) ||
        Number(payload.longitude) < -180 ||
        Number(payload.longitude) > 180)
    ) {
      return res.status(422).json({
        success: false,
        message: "Longitude must be a number between -180 and 180",
        code: "VALIDATION_ERROR",
      });
    }

    if (payload.email && payload.email !== currentUser.email) {
      const emailOwner = await prisma.user.findUnique({
        where: { email: String(payload.email).trim().toLowerCase() },
      });

      if (emailOwner && emailOwner.id !== currentUser.id) {
        return res.status(409).json({
          success: false,
          message: "Email already registered",
          code: "EMAIL_ALREADY_REGISTERED",
        });
      }
    }

    const userData = {};
    const farmerData = {};

    if (payload.name !== undefined) {
      userData.name = String(payload.name).trim();
    }

    if (payload.email !== undefined) {
      userData.email = String(payload.email).trim().toLowerCase() || null;
    }

    if (payload.village !== undefined) {
      farmerData.village = String(payload.village).trim();
    }

    if (payload.district !== undefined) {
      farmerData.district = String(payload.district).trim();
    }

    if (payload.state !== undefined) {
      farmerData.state = String(payload.state).trim();
    }

    if (payload.address !== undefined) {
      farmerData.address = String(payload.address).trim();
    }

    if (payload.latitude !== undefined) {
      farmerData.latitude =
        payload.latitude === null ? null : Number(payload.latitude);
    }

    if (payload.longitude !== undefined) {
      farmerData.longitude =
        payload.longitude === null ? null : Number(payload.longitude);
    }

    if (payload.preferred_language !== undefined) {
      farmerData.preferredLanguage =
        String(payload.preferred_language).trim().toLowerCase() || "en";
    }

    const updatedProfile = await prisma.$transaction(async (tx) => {
      const updatedUser = Object.keys(userData).length
        ? await tx.user.update({
            where: { id: currentUser.id },
            data: userData,
          })
        : currentUser;

      const updatedFarmer = Object.keys(farmerData).length
        ? await tx.farmer.update({
            where: { id: currentUser.farmer.id },
            data: farmerData,
          })
        : currentUser.farmer;

      return {
        user: updatedUser,
        farmer: updatedFarmer,
      };
    });

    return res.status(200).json({
      success: true,
      user: serializeUser(updatedProfile.user),
      farmer: updatedProfile.farmer,
    });
  } catch (error) {
    console.error("Update farmer profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating the farmer profile",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

export default router;
