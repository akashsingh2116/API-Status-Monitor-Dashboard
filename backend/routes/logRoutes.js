// routes/logRoutes.js
import express from "express";
import Log from "../models/log.js";

const router = express.Router();

/**
 * ✅ GET /api/logs
 * Paginated raw logs for Tracer Page
 */
router.get("/", async (req, res) => {
  try {
    const { from, to, page = 1 } = req.query;
    const limit = 20;
    const skip = (page - 1) * limit;

    let filter = { apiName: { $ne: null } };
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        filter.timestamp.$lte = end;
      }
    }

    const logs = await Log.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Log.countDocuments(filter);

    res.json({
      data: logs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("❌ Error fetching logs:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

/**
 * ✅ GET /api/logs/grouped
 * Shows all APIs active in the selected month.
 * Deletes any stale APIs that no longer exist in logs.
 */
router.get("/grouped", async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ error: "month=YYYY-MM required" });

    // Parse month range (UTC)
    const [year, mon] = month.split("-");
    const fromDate = new Date(Date.UTC(year, mon - 1, 1));
    const toDate = new Date(Date.UTC(year, mon, 0, 23, 59, 59));

    // Get all APIs with logs for that month
    const grouped = await Log.aggregate([
      {
        $match: {
          timestamp: { $gte: fromDate, $lte: toDate },
          apiName: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$apiName",
          statuses: { $push: "$status" },
          lastTimestamp: { $max: "$timestamp" },
        },
      },
      { $sort: { lastTimestamp: -1 } },
    ]);

    // Ensure API names reflect only current logs (auto-sync)
    const activeApis = grouped.map((g) => g._id);

    // Format data for frontend
    const data = grouped.map((g) => ({
      apiName: g._id,
      statuses: g.statuses,
      lastTimestamp: g.lastTimestamp,
    }));

    res.json({
      data,
      activeApis, // for optional syncing on frontend
      pagination: { currentPage: 1, totalPages: 1 },
    });
  } catch (err) {
    console.error("❌ Error grouped logs:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

export default router;
