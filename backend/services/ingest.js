// services/ingest.js
import ApiConfig from "../models/config.js";
import Log from "../models/log.js";

const isWithinSchedule = (cfg) => {
  if (!cfg.scheduling || !cfg.startTime || !cfg.endTime) return true;

  const now = new Date();
  const start = new Date(`1970-01-01T${cfg.startTime}:00Z`);
  const end = new Date(`1970-01-01T${cfg.endTime}:00Z`);
  const nowUTC = new Date(`1970-01-01T${now.toISOString().slice(11, 19)}Z`);

  return nowUTC >= start && nowUTC <= end;
};

const VALID_LEVELS = new Set(["log", "info", "warn", "error"]);

const sanitizeConsoleLogs = (logs) => {
  if (!Array.isArray(logs)) return [];
  return logs.slice(0, 50).map((entry) => ({
    level: VALID_LEVELS.has(entry?.level) ? entry.level : "log",
    message: String(entry?.message ?? "").slice(0, 2000),
    timestamp: entry?.timestamp ? new Date(entry.timestamp) : new Date(),
  }));
};

const isUnderRateLimit = async (cfg) => {
  if (!cfg.limitEnabled || !cfg.limitCount || !cfg.limitRate) return true;

  const windowMs = cfg.limitRate * 60000;
  const recentCount = await Log.countDocuments({
    configId: cfg._id,
    timestamp: { $gte: new Date(Date.now() - windowMs) },
  });

  return recentCount < cfg.limitCount;
};

// Records one traced request against the ApiConfig identified by apiKey.
// Returns { status: "logged" | "skipped" | "not_found" | "disabled", log?, reason? }
export const recordEvent = async (apiKey, event) => {
  if (!apiKey) return { status: "not_found", reason: "Missing API key" };

  const cfg = await ApiConfig.findOne({ apiKey });
  if (!cfg) return { status: "not_found", reason: "Unknown API key" };

  if (!cfg.enabled) return { status: "disabled" };
  if (!isWithinSchedule(cfg)) return { status: "skipped", reason: "Outside scheduled window" };
  if (!(await isUnderRateLimit(cfg))) return { status: "skipped", reason: "Rate limit reached" };

  const log = await Log.create({
    userId: cfg.userId,
    configId: cfg._id,
    method: event.method || "GET",
    endpoint: event.endpoint || "/",
    status: Number(event.status) || 200,
    responseTimeMs: Number(event.responseTimeMs) || 0,
    timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
    consoleLogs: cfg.tracerEnabled ? sanitizeConsoleLogs(event.consoleLogs) : [],
  });

  return { status: "logged", log };
};
