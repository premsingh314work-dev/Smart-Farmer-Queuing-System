import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

const setupSocket = (io) => {
  // Authenticate every socket connection
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // IMPORTANT:
      // This assumes your JWT stores the user ID as `id`.
      // We will verify this if authentication fails.
      const user = await prisma.user.findUnique({
        where: {
          id: decoded.id,
        },
        select: {
          id: true,
          name: true,
          role: true,
        },
      });

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.user = user;

      next();
    } catch (error) {
      console.error("Socket authentication error:", error.message);
      next(new Error("Invalid authentication token"));
    }
  });

  io.on("connection", async (socket) => {
    console.log(
      `🔌 Socket connected: ${socket.id} | ${socket.user.role} | ${socket.user.name}`,
    );

    try {
      // Every authenticated user gets their own room
      socket.join(`user:${socket.user.id}`);

      // OPERATOR → join assigned centre room
      if (socket.user.role === "OPERATOR") {
        const assignment = await prisma.centreOperator.findUnique({
          where: {
            userId: socket.user.id,
          },
        });

        if (assignment) {
          socket.join(`centre:${assignment.centreId}`);

          console.log(
            `👨‍💼 Operator ${socket.user.name} joined centre:${assignment.centreId}`,
          );
        } else {
          console.log(
            `⚠️ Operator ${socket.user.name} has no centre assignment`,
          );
        }
      }

      // GOVERNMENT → system-wide room
      if (socket.user.role === "GOVERNMENT") {
        socket.join("government");

        console.log(
          `🏛️ Government user ${socket.user.name} joined government room`,
        );
      }
    } catch (error) {
      console.error("Socket room setup error:", error);
    }

    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${socket.id} | ${socket.user.name}`);
    });
  });
};

export default setupSocket;
