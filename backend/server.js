// backend/server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

import logger from "./middleware/logger.js";
import logRoutes from "./routes/logRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import configRoutes from "./routes/configRoutes.js";
import Log from "./models/log.js";

dotenv.config();
const app = express();

// ✅ CORS: allow your frontend(s)
app.use(
  cors({
    origin: [
      "https://api-status-monitor-dashboard.vercel.app", // frontend production
      "http://localhost:5173", // local dev
      // add any other allowed origins here
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "x-api-key",
      "x-api-name",
      "x-client-id",
      "authorization",
    ],
    credentials: true,
  })
);

app.use(express.json());

// attach tracer middleware
app.use(logger);

// cleanup internal logs (delete any logs coming from dashboard internal endpoints)
async function cleanupInternalLogs() {
  try {
    const result = await Log.deleteMany({
      endpoint: { $regex: "^/api/(logs|stats|config)", $options: "i" },
    });
    if (result.deletedCount > 0) {
      console.log(`🧹 Cleaned ${result.deletedCount} internal log entries`);
    }
  } catch (err) {
    console.error("❌ Cleanup failed:", err.message);
  }
}

// connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB Atlas Connected");
    await cleanupInternalLogs();
  })
  .catch((err) => console.error("❌ DB Error:", err));

// Test route
app.get("/", (req, res) => res.send("✅ API Backend Running Successfully!"));

// Simulation route (used by your PowerShell scripts)
app.get("/simulate/:code", (req, res) => {
  const code = Number(req.params.code) || 200;
  console.log(
    `[simulate] returning ${code} for ${req.header("x-api-name") || req.originalUrl}`
  );
  if (code >= 500) console.error("[simulate] Simulated server error");
  res.status(code).send(`Simulated response with status ${code}`);
});

// API routes
app.use("/api/logs", logRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/config", configRoutes);

// If you previously had app.options('*', ...) or app.use('*', ...), remove or change to '/*'.
// We do not register any raw '*' route here.

// start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
