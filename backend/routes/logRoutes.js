// routes/logRoutes.js
import express from "express";
import mongoose from "mongoose";
import Log from "../models/log.js";
import requireAuth from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

/**
 * GET /api/logs
 * Paginated logs for the logged-in user, optionally filtered to one API (apiId).
 */
router.get("/", async (req, res) => {
  try {
    const { from, to, page = 1, apiId } = req.query;
    const limit = 20;
    const skip = (Math.max(1, parseInt(page) || 1) - 1) * limit;

    const filter = { userId: req.userId };

    if (apiId) {
      if (!mongoose.Types.ObjectId.isValid(apiId)) {
        return res.status(400).json({ error: "Invalid apiId" });
      }
      filter.configId = apiId;
    }

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
        currentPage: parseInt(page) || 1,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error fetching logs:", err.message);
    res.status(500).json({ error: "Server error while fetching logs" });
  }
});

/**
 * GET /api/logs/grouped
 * Groups this user's logs by API for the selected month.
 */
router.get("/grouped", async (req, res) => {
  try {
    const { month, apiId } = req.query;
    if (!month) return res.status(400).json({ error: "month=YYYY-MM required" });
    if (apiId && !mongoose.Types.ObjectId.isValid(apiId)) {
      return res.status(400).json({ error: "Invalid apiId" });
    }

    const [year, mon] = month.split("-");
    const fromDate = new Date(Date.UTC(year, mon - 1, 1));
    const toDate = new Date(Date.UTC(year, mon, 0, 23, 59, 59));

    const match = {
      userId: new mongoose.Types.ObjectId(req.userId),
      timestamp: { $gte: fromDate, $lte: toDate },
    };
    if (apiId) match.configId = new mongoose.Types.ObjectId(apiId);

    const grouped = await Log.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$configId",
          statuses: { $push: "$status" },
          lastTimestamp: { $max: "$timestamp" },
        },
      },
      { $sort: { lastTimestamp: -1 } },
    ]);

    const data = grouped.map((g) => ({
      apiId: g._id,
      statuses: g.statuses,
      lastTimestamp: g.lastTimestamp,
    }));

    res.json({ data, pagination: { currentPage: 1, totalPages: 1 } });
  } catch (err) {
    console.error("Error fetching grouped logs:", err.message);
    res.status(500).json({ error: "Server error while fetching grouped logs" });
  }
});

export default router;
