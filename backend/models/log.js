// models/log.js
import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
  apiName: { type: String, default: null },
  method: String,
  endpoint: String,
  status: Number,
  responseTimeMs: Number,
  timestamp: { type: Date, default: Date.now },
  consoleLogs: [{ level: String, message: String, timestamp: Date }],
  apiKeyVerified: Boolean,
  extra: Object,
});

export default mongoose.model("Log", logSchema);
