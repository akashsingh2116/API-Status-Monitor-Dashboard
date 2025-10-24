// routes/configRoutes.js
import express from "express";
import ApiConfig from "../models/config.js";
import Log from "../models/log.js"; // ✅ to find first-seen log

const router = express.Router();

/**
 * ✅ GET all API configurations
 */
router.get("/", async (req, res) => {
  try {
    const configs = await ApiConfig.find().sort({ apiName: 1 });
    res.json({ data: configs });
  } catch (err) {
    console.error("Error fetching configs:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ✅ POST create new config
 * Automatically sets:
 * - startDate = date of first log entry for this API (if exists)
 * - default toggles = true
 */
router.post("/", async (req, res) => {
  try {
    const { apiName } = req.body;
    if (!apiName)
      return res.status(400).json({ error: "API name is required" });

    const normalized = apiName.trim().toLowerCase();
    const existing = await ApiConfig.findOne({ apiName: normalized });

    if (existing)
      return res.status(400).json({ error: "API config already exists" });

    // ✅ Find first log entry for this API (oldest timestamp)
    const firstLog = await Log.findOne({ apiName: normalized })
      .sort({ timestamp: 1 })
      .lean();

    const startDate = firstLog ? firstLog.timestamp : new Date();

    const config = await ApiConfig.create({
      apiName: normalized,
      startDate,
      enabled: true,
      tracerEnabled: true,
      limitEnabled: false,
      limitCount: 0,
      limitRate: 0,
      scheduling: false,
      startTime: "",
      endTime: "",
    });

    res.status(201).json(config);
  } catch (err) {
    console.error("Error creating config:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ✅ PUT update existing config
 * Updates any field for given API.
 */
router.put("/:apiName", async (req, res) => {
  try {
    const { apiName } = req.params;
    const updates = req.body;

    const normalized = apiName.trim().toLowerCase();
    const config = await ApiConfig.findOneAndUpdate(
      { apiName: normalized },
      updates,
      { new: true }
    );

    if (!config)
      return res.status(404).json({ error: "API config not found" });

    res.json(config);
  } catch (err) {
    console.error("Error updating config:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
