// models/config.js
import mongoose from "mongoose";

const configSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    apiKey: { type: String, required: true, unique: true },
    startDate: { type: Date, default: Date.now },
    enabled: { type: Boolean, default: true },
    tracerEnabled: { type: Boolean, default: true },
    limitEnabled: { type: Boolean, default: false },
    limitCount: { type: Number, default: 0 },
    limitRate: { type: Number, default: 0 }, // in minutes
    scheduling: { type: Boolean, default: false },
    startTime: { type: String, default: "" },
    endTime: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("ApiConfig", configSchema);
