import express from "express";
import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";
import { createAuthToken } from "../utils/auth.js";
import {
  normalizePhone,
  validateLoginInput,
  validateRegisterInput,
} from "../utils/validators.js";
import { requireAuth } from "../middleware/auth.js";

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

router.post("/register", async (req, res) => {
  const payload = req.body || {};
  const validation = validateRegisterInput(payload);

  if (!validation.isValid) {
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      errors: validation.errors,
    });
  }

  const name = String(payload.name).trim();
  const phone = normalizePhone(payload.phone);
  const email = payload.email
    ? String(payload.email).trim().toLowerCase()
    : null;
  const password = String(payload.password);
  const village = String(payload.village).trim();
  const district = String(payload.district).trim();
  const state = String(payload.state).trim();
  const preferredLanguage = String(payload.preferred_language || "en")
    .trim()
    .toLowerCase();

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ phone }, ...(email ? [{ email }] : [])],
      },
    });

    if (existingUser) {
      if (existingUser.phone === phone) {
        return res.status(409).json({
          success: false,
          message: "Phone number already registered",
          code: "PHONE_ALREADY_REGISTERED",
        });
      }

      if (email && existingUser.email === email) {
        return res.status(409).json({
          success: false,
          message: "Email already registered",
          code: "EMAIL_ALREADY_REGISTERED",
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const farmerCode = `FR-${Date.now().toString().slice(-8)}`;

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name,
          phone,
          email,
          passwordHash,
          role: "FARMER",
        },
      });

      await tx.farmer.create({
        data: {
          userId: createdUser.id,
          farmerCode,
          village,
          district,
          state,
          preferredLanguage,
        },
      });

      return createdUser;
    });

    const token = createAuthToken({
      id: user.id,
      role: user.role,
      phone: user.phone,
    });

    return res.status(201).json({
      success: true,
      message: "Farmer registered successfully",
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while registering the farmer",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

router.post("/login", async (req, res) => {
  const payload = req.body || {};
  const validation = validateLoginInput(payload);

  if (!validation.isValid) {
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      errors: validation.errors,
    });
  }

  const phone = normalizePhone(payload.phone);
  const password = String(payload.password);

  try {
    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account disabled",
        code: "ACCOUNT_DISABLED",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      });
    }
    const token = createAuthToken({
      id: user.id,
      role: user.role,
      phone: user.phone,
    });
    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while logging in",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

router.post("/logout", requireAuth, (_req, res) => {
  return res.status(204).send();
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    return res.status(200).json({
      success: true,
      user: serializeUser(user),
    });
  } catch (error) {
    console.error("Current user lookup error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while loading the current user",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

export default router;
