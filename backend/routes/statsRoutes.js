// routes/statsRoutes.js
import express from "express";
import Log from "../models/log.js";

const router = express.Router();

// GET /api/stats
router.get("/", async (req, res) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);

    const logs = await Log.find({ timestamp: { $gte: weekAgo } });

    if (!logs.length) {
      return res.json({
        totalRequests: 0,
        avgResponse: 0,
        uptimePct: 100,
        errorRate: 0,
        mostCommonError: "None",
        lastDowntime: "No downtime yet",
        uptimeHistory: [],
      });
    }

    const totalRequests = logs.length;
    const avgResponse =
      logs.reduce((sum, log) => sum + (log.responseTimeMs || 0), 0) /
      totalRequests;

    const successLogs = logs.filter((l) => l.status >= 200 && l.status < 300);
    const errorLogs = logs.filter((l) => l.status >= 400);

    const uptimePct = (successLogs.length / totalRequests) * 100;
    const errorRate = (errorLogs.length / totalRequests) * 100;

    const errorCodes = errorLogs.map((l) => l.status);
    const mostCommonError =
      errorCodes.length > 0
        ? errorCodes
            .sort(
              (a, b) =>
                errorCodes.filter((v) => v === b).length -
                errorCodes.filter((v) => v === a).length
            )[0]
        : "None";

    const lastError = errorLogs.length
      ? new Date(
          Math.max(...errorLogs.map((e) => new Date(e.timestamp).getTime()))
        ).toISOString()
      : "No downtime yet";

    // Build 7-day uptime trend
    const uptimeHistory = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);

      const dayLogs = logs.filter(
        (l) =>
          new Date(l.timestamp).toDateString() === date.toDateString()
      );
      const daySuccess = dayLogs.filter((l) => l.status >= 200 && l.status < 300)
        .length;

      const dayUptime =
        dayLogs.length > 0 ? (daySuccess / dayLogs.length) * 100 : 100;

      uptimeHistory.push({
        date: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        uptime: Number(dayUptime.toFixed(1)),
      });
    }

    res.json({
      totalRequests,
      avgResponse: Number(avgResponse.toFixed(1)),
      uptimePct: Number(uptimePct.toFixed(1)),
      errorRate: Number(errorRate.toFixed(1)),
      mostCommonError,
      lastDowntime: lastError,
      uptimeHistory,
    });
  } catch (err) {
    console.error("Error computing stats:", err.message);
    res.status(500).json({ error: "Server error while computing stats" });
  }
});

export default router;
