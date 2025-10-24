// models/config.js
import mongoose from "mongoose";

const configSchema = new mongoose.Schema({
  apiName: { type: String, unique: true, required: true },
  startDate: { type: Date, default: Date.now },
  enabled: { type: Boolean, default: true },
  tracerEnabled: { type: Boolean, default: true },
  limitEnabled: { type: Boolean, default: false },
  limitCount: { type: Number, default: 0 },
  limitRate: { type: Number, default: 0 }, // in minutes
  scheduling: { type: Boolean, default: false },
  startTime: { type: String },
  endTime: { type: String },
});

export default mongoose.model("ApiConfig", configSchema);
