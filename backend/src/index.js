import express from "express";
import cors from "cors";
import "dotenv/config";

import authRoutes from "./routes/auth.js";
import farmerRoutes from "./routes/farmer.js";
import cropRoutes from "./routes/crop.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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

app.listen(port, () => {
  console.log(`Smart Farmer API listening on http://localhost:${port}`);
});

export default app;
