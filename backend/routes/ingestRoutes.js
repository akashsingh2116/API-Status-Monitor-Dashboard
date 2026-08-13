// routes/ingestRoutes.js
// Public endpoint called by the tracer SDK/middleware running in a user's own app.
// Authenticated by the per-API key, not by a logged-in session.
import express from "express";
import { recordEvent } from "../services/ingest.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const apiKey = req.header("x-api-key");
    const { method, endpoint, status, responseTimeMs, timestamp, consoleLogs } = req.body || {};

    if (!endpoint || typeof endpoint !== "string") {
      return res.status(400).json({ error: "endpoint is required" });
    }

    const result = await recordEvent(apiKey, {
      method,
      endpoint,
      status,
      responseTimeMs,
      timestamp,
      consoleLogs,
    });

    if (result.status === "not_found") {
      return res.status(401).json({ error: result.reason || "Invalid API key" });
    }

    res.status(202).json({ status: result.status });
  } catch (err) {
    console.error("Error ingesting event:", err.message);
    res.status(500).json({ error: "Server error while ingesting event" });
  }
});

export default router;
