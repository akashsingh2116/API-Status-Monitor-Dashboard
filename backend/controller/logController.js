import Log from "../models/log.js";

// GET /api/logs?from=YYYY-MM-DD&to=YYYY-MM-DD&page=X
export const getLogs = async (req, res) => {
  try {
    const { from, to, page = 1 } = req.query;
    const limit = 20; // logs per page
    const skip = (page - 1) * limit;

    // Date filter
    let filter = {};
    if (from || to) {
      filter.timestamp = {};
      if (from) {
        const fromDate = new Date(from);
        fromDate.setUTCHours(0, 0, 0, 0);
        filter.timestamp.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setUTCHours(23, 59, 59, 999);
        filter.timestamp.$lte = toDate;
      }
    }

    // Query logs
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
  } catch (error) {
    console.error("❌ Error fetching logs:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
};
