import express from "express";
import cors from "cors";
import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import setupSocket from "./socket/index.js";
import prisma from "./config/prisma.js";

import authRoutes from "./routes/auth.js";
import farmerRoutes from "./routes/farmer.js";
import cropRoutes from "./routes/crop.js";
import centreRoutes from "./routes/centre.js";
import slotRoutes from "./routes/slot.js";
import bookingRoutes from "./routes/booking.js";
import procurementRoutes from "./routes/procurement.js";
import queueRoutes from "./routes/queue.js";
import recommendationsRoutes from "./routes/recommendations.js";

const app = express();

const server = http.createServer(app);

const port = process.env.PORT || 8000;

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true,
  },
});

// Make Socket.IO available inside routes
app.set("io", io);
setupSocket(io);
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log("➡️ REQUEST:", req.method, req.url);
  next();
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Smart Farmer Queuing System API",
    version: "1.0.0",
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/farmers", farmerRoutes);
app.use("/api/v1/crops", cropRoutes);
app.use("/api/v1/centres", centreRoutes);
app.use("/api/v1/centres/:centreId/slots", slotRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/procurements", procurementRoutes);
app.use("/api/v1/queue", queueRoutes);
app.use("/api/v1/recommendations", recommendationsRoutes);

const startServer = async () => {
  try {
    await prisma.$connect();

    console.log("Database connected successfully");

    server.listen(port, () => {
      console.log(
        `Smart Farmer API + Socket.IO listening on http://localhost:${port}`,
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

export default app;
