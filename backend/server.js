// server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

import logger from "./middleware/logger.js";
import logRoutes from "./routes/logRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import configRoutes from "./routes/configRoutes.js";
import Log from "./models/log.js"; // ✅ added for cleanup

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// 🧩 Attach middleware (tracer/logger)
app.use(logger);

// 🧹 Cleanup Function (removes internal logs)
async function cleanupInternalLogs() {
  try {
    const result = await Log.deleteMany({
      endpoint: { $regex: "^/api/(logs|stats|config)", $options: "i" },
    });
    if (result.deletedCount > 0) {
      console.log(`🧹 Cleaned ${result.deletedCount} internal log entries`);
    } else {
      console.log("🧹 No internal logs found to clean.");
    }
  } catch (err) {
    console.error("❌ Cleanup failed:", err.message);
  }
}

// ✅ MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB Atlas Connected");
    await cleanupInternalLogs(); // 👈 Clean internal logs on startup
  })
  .catch((err) => console.error("❌ DB Error:", err));

// 🧪 Test route
app.get("/", (req, res) => res.send("API is working!"));

// 🧠 Simulate endpoints (for testing APIs with middleware)
app.get("/simulate/:code", (req, res) => {
  const code = Number(req.params.code) || 200;
  console.log(`[simulate] returning ${code} for ${req.header("x-api-name") || req.originalUrl}`);
  if (code >= 500) console.error("[simulate] Simulated server error");
  res.status(code).send(`Simulated response with status ${code}`);
});

// 📡 API routes
app.use("/api/logs", logRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/config", configRoutes);

// 🚀 Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
