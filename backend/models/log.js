// models/log.js
import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  configId: { type: mongoose.Schema.Types.ObjectId, ref: "ApiConfig", required: true, index: true },
  method: String,
  endpoint: String,
  status: Number,
  responseTimeMs: Number,
  timestamp: { type: Date, default: Date.now },
  consoleLogs: [{ level: String, message: String, timestamp: Date }],
  extra: Object,
});

logSchema.index({ configId: 1, timestamp: -1 });

export default mongoose.model("Log", logSchema);
