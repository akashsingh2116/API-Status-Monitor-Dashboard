// server.js
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

// ✅ Fix CORS for production (allow frontend from Vercel)
app.use(
  cors({
    origin: [
      "https://api-status-monitor-dashboard.vercel.app", // your deployed frontend
      "http://localhost:5173", // local dev
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: [
      "Content-Type",
      "x-api-key",
      "x-api-name",
      "x-client-id",
    ],
  })
);

app.use(express.json());

// 🧩 Attach tracer middleware
app.use(logger);

// 🧹 Cleanup function – removes internal logs so Config & Home stay clean
async function cleanupInternalLogs() {
  try {
    const result = await Log.deleteMany({
      endpoint: { $regex: "^/api/(logs|stats|config)", $options: "i" },
    });
    if (result.deletedCount > 0)
      console.log(`🧹 Cleaned ${result.deletedCount} internal log entries`);
  } catch (err) {
    console.error("❌ Cleanup failed:", err.message);
  }
}

// ✅ MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ MongoDB Atlas Connected");
    await cleanupInternalLogs();
  })
  .catch((err) => console.error("❌ DB Error:", err));

// 🧪 Test route
app.get("/", (req, res) => res.send("✅ API Backend Running Successfully!"));

// 🧠 Simulated routes (used by PowerShell testing)
app.get("/simulate/:code", (req, res) => {
  const code = Number(req.params.code) || 200;
  console.log(
    `[simulate] returning ${code} for ${req.header("x-api-name") || req.originalUrl}`
  );
  if (code >= 500) console.error("[simulate] Simulated server error");
  res.status(code).send(`Simulated response with status ${code}`);
});

// 📡 Real API routes
app.use("/api/logs", logRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/config", configRoutes);

// 🚀 Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
