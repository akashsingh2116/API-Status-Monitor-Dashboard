// routes/configRoutes.js
import express from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import ApiConfig from "../models/config.js";
import Log from "../models/log.js";
import requireAuth from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

const generateApiKey = () => `ak_${crypto.randomBytes(24).toString("hex")}`;

const UPDATABLE_FIELDS = [
  "name",
  "enabled",
  "tracerEnabled",
  "limitEnabled",
  "limitCount",
  "limitRate",
  "scheduling",
  "startTime",
  "endTime",
];

const FIELD_VALIDATORS = {
  name: (v) => typeof v === "string" && v.trim().length > 0 && v.trim().length <= 80,
  enabled: (v) => typeof v === "boolean",
  tracerEnabled: (v) => typeof v === "boolean",
  limitEnabled: (v) => typeof v === "boolean",
  limitCount: (v) => typeof v === "number" && v >= 0,
  limitRate: (v) => typeof v === "number" && v >= 0,
  scheduling: (v) => typeof v === "boolean",
  startTime: (v) => typeof v === "string",
  endTime: (v) => typeof v === "string",
};

const pickValidUpdates = (body) => {
  const updates = {};
  for (const field of UPDATABLE_FIELDS) {
    if (body[field] === undefined) continue;
    if (!FIELD_VALIDATORS[field](body[field])) {
      throw new Error(`Invalid value for field "${field}"`);
    }
    updates[field] = field === "name" ? body[field].trim() : body[field];
  }
  return updates;
};

// GET all APIs registered by the logged-in user
router.get("/", async (req, res) => {
  try {
    const configs = await ApiConfig.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ data: configs });
  } catch (err) {
    console.error("Error fetching configs:", err.message);
    res.status(500).json({ error: "Server error while fetching configs" });
  }
});

// POST create a new tracked API for the logged-in user
router.post("/", async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "A name for the API is required" });
    }

    const config = await ApiConfig.create({
      userId: req.userId,
      name: name.trim(),
      apiKey: generateApiKey(),
    });

    res.status(201).json(config);
  } catch (err) {
    console.error("Error creating config:", err.message);
    res.status(500).json({ error: "Server error while creating config" });
  }
});

// PUT update an existing API config (only fields owned by this user)
router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid config id" });
    }

    let updates;
    try {
      updates = pickValidUpdates(req.body || {});
    } catch (validationErr) {
      return res.status(400).json({ error: validationErr.message });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const config = await ApiConfig.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updates,
      { new: true }
    );

    if (!config) return res.status(404).json({ error: "API config not found" });
    res.json(config);
  } catch (err) {
    console.error("Error updating config:", err.message);
    res.status(500).json({ error: "Server error while updating config" });
  }
});

// POST regenerate the API key for a config (e.g. if it leaked)
router.post("/:id/regenerate-key", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid config id" });
    }

    const config = await ApiConfig.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { apiKey: generateApiKey() },
      { new: true }
    );

    if (!config) return res.status(404).json({ error: "API config not found" });
    res.json(config);
  } catch (err) {
    console.error("Error regenerating key:", err.message);
    res.status(500).json({ error: "Server error while regenerating key" });
  }
});

// DELETE a tracked API and its logs
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid config id" });
    }

    const config = await ApiConfig.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!config) return res.status(404).json({ error: "API config not found" });

    await Log.deleteMany({ configId: config._id });
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting config:", err.message);
    res.status(500).json({ error: "Server error while deleting config" });
  }
});

export default router;
