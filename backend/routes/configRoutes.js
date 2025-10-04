// routes/configRoutes.js
import express from "express";
import ApiConfig from "../models/config.js";
import Log from "../models/log.js"; // ✅ used for syncing

const router = express.Router();

/**
 * ✅ GET all API configurations
 * Shows only APIs that currently exist in logs.
 * Removes stale configs automatically.
 */
router.get("/", async (req, res) => {
  try {
    // Step 1: Get distinct API names from logs
    const activeApis = await Log.distinct("apiName");

    // Step 2: Delete any configs not in active logs
    await ApiConfig.deleteMany({ apiName: { $nin: activeApis } });

    // Step 3: Get updated configs list
    const configs = await ApiConfig.find({
      apiName: { $in: activeApis },
    }).sort({ apiName: 1 });

    // Step 4: Return clean synced data
    res.json({ data: configs });
  } catch (err) {
    console.error("Error fetching configs:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ✅ POST create new config
 * Sets startDate = date of first log entry if exists, otherwise now.
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

    // ✅ Find first log entry (oldest) for correct startDate
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
 * Fully SRD-compliant update logic.
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
