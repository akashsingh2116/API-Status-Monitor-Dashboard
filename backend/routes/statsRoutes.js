// routes/statsRoutes.js
import express from "express";
import mongoose from "mongoose";
import Log from "../models/log.js";
import requireAuth from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

// GET /api/stats?apiId=<id>&days=7
router.get("/", async (req, res) => {
  try {
    const { apiId } = req.query;
    const days = Math.min(90, Math.max(1, parseInt(req.query.days) || 7));

    if (apiId && !mongoose.Types.ObjectId.isValid(apiId)) {
      return res.status(400).json({ error: "Invalid apiId" });
    }

    const now = new Date();
    const rangeStart = new Date(now);
    rangeStart.setDate(now.getDate() - (days - 1));
    rangeStart.setHours(0, 0, 0, 0);

    const filter = { userId: req.userId, timestamp: { $gte: rangeStart } };
    if (apiId) filter.configId = apiId;

    const logs = await Log.find(filter);

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
      logs.reduce((sum, log) => sum + (log.responseTimeMs || 0), 0) / totalRequests;

    const successLogs = logs.filter((l) => l.status >= 200 && l.status < 300);
    const errorLogs = logs.filter((l) => l.status >= 400);

    const uptimePct = (successLogs.length / totalRequests) * 100;
    const errorRate = (errorLogs.length / totalRequests) * 100;

    const errorCodes = errorLogs.map((l) => l.status);
    const mostCommonError =
      errorCodes.length > 0
        ? errorCodes.sort(
            (a, b) =>
              errorCodes.filter((v) => v === b).length -
              errorCodes.filter((v) => v === a).length
          )[0]
        : "None";

    const lastError = errorLogs.length
      ? new Date(Math.max(...errorLogs.map((e) => new Date(e.timestamp).getTime()))).toISOString()
      : "No downtime yet";

    const uptimeHistory = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);

      const dayLogs = logs.filter(
        (l) => new Date(l.timestamp).toDateString() === date.toDateString()
      );
      const daySuccess = dayLogs.filter((l) => l.status >= 200 && l.status < 300).length;
      const dayUptime = dayLogs.length > 0 ? (daySuccess / dayLogs.length) * 100 : 100;

      uptimeHistory.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
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
