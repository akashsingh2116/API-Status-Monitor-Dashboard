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

// --- CORS setup: read ALLOWED_ORIGINS from env or fall back to sensible defaults
// Example env value: "https://api-status-monitor-dashboard.vercel.app,http://localhost:5173"
const allowedEnv = process.env.ALLOWED_ORIGINS || "https://api-status-monitor-dashboard.vercel.app,http://localhost:5173";
const allowedOrigins = allowedEnv.split(",").map(s => s.trim()).filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (curl, server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "authorization",
    "x-api-key",
    "x-api-name",
    "x-client-id",
    "Accept",
    "Origin",
  ],
  optionsSuccessStatus: 200,
  // credentials: true, // enable if you plan to send cookies from frontend
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // handle preflight

app.use(express.json());

// 🧩 Attach tracer middleware (keep it after CORS + body parser)
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
    // modern mongoose options; ok if redundant
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

// Return JSON 404 for unknown API endpoints (prevents HTML being returned)
app.use("/api", (req, res) => {
  res.status(404).json({ error: "API route not found" });
});

// Fallback for other routes (optional)
app.use((req, res) => {
  res.status(404).send("Not found");
});

// 🚀 Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
