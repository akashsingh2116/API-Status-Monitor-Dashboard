// middleware/logger.js
import crypto from "crypto";
import Log from "../models/log.js";
import ApiConfig from "../models/config.js";

/**
 * 🔍 SRD-Compliant Tracer Middleware
 * ✅ Captures method, endpoint, status, response time, console logs
 * ✅ Generates unique traceId
 * ✅ Auto-creates ApiConfig entries with correct firstSeen date (idempotent upsert)
 * ✅ Respects toggles: enabled, tracerEnabled, limit, scheduling
 * ✅ Skips internal dashboard routes
 */
const logger = async (req, res, next) => {
  const startNs = process.hrtime.bigint();
  const traceId = crypto.randomUUID();

  // Capture console logs per request
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };
  const buffer = [];

  const makePatch = (level) => (...args) => {
    try {
      const msg = args
        .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
        .join(" ");
      buffer.push({ level, message: msg, timestamp: new Date() });
    } catch {}
    originalConsole[level](...args);
  };

  console.log = makePatch("log");
  console.info = makePatch("info");
  console.warn = makePatch("warn");
  console.error = makePatch("error");

  // guard to ensure finish runs only once per request
  let finished = false;

  // Core finish logic
  const finish = async () => {
    // if already executed, skip
    if (finished) return;
    finished = true;

    // Restore console methods immediately
    Object.entries(originalConsole).forEach(([k, fn]) => (console[k] = fn));

    try {
      const endNs = process.hrtime.bigint();
      const responseTimeMs = Number((endNs - startNs) / 1_000_000n);
      const status = res.statusCode || 200;
      const method = req.method;
      const endpoint = req.originalUrl || req.url || "";

      // 🔒 Skip internal dashboard routes (use startsWith)
      const internalRoutes = ["/api/logs", "/api/stats", "/api/config", "/favicon.ico"];
      if (internalRoutes.some((r) => endpoint.startsWith(r))) return;

      // 🔑 API key check
      const apiKeyHeader = req.header("x-api-key") || req.header("apikey");
      const apiKeyValid = process.env.TRACER_API_KEY && apiKeyHeader === process.env.TRACER_API_KEY;

      // Normalize API name
      let apiName = (req.header("x-api-name") || endpoint || "").toString();
      apiName = apiName.trim().toLowerCase();
      if (!apiName.startsWith("/")) apiName = "/" + apiName;

      // 🧩 Ensure config exists for this API (idempotent upsert)
      let cfg = null;
      try {
        cfg = await ApiConfig.findOneAndUpdate(
          { apiName },
          {
            $setOnInsert: {
              apiName,
              startDate: new Date(),
              enabled: true,
              tracerEnabled: true,
              limitEnabled: false,
              limitCount: 0,
              limitRate: 0,
              scheduling: false,
              startTime: "",
              endTime: "",
            },
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        // If upsert fails for some reason, log it and try to fetch existing config
        originalConsole.error("[logger] ApiConfig upsert error:", err && err.message ? err.message : err);
        cfg = await ApiConfig.findOne({ apiName });
      }

      // If config has no startDate or it’s after this request, fix it
      try {
        const cfgStart = cfg && cfg.startDate ? new Date(cfg.startDate) : null;
        if (!cfgStart || cfgStart > new Date()) {
          cfg.startDate = new Date();
          await cfg.save();
        }
      } catch (err) {
        originalConsole.error("[logger] Error normalizing cfg.startDate:", err && err.message ? err.message : err);
      }

      // Skip if disabled
      if (cfg && cfg.enabled === false) return;

      // Scheduling check
      if (cfg && cfg.scheduling && cfg.startTime && cfg.endTime) {
        const now = new Date();
        const start = new Date(`1970-01-01T${cfg.startTime}:00Z`);
        const end = new Date(`1970-01-01T${cfg.endTime}:00Z`);
        const nowUTC = new Date(`1970-01-01T${now.toISOString().slice(11, 19)}Z`);
        if (nowUTC < start || nowUTC > end) return;
      }

      // Rate limit check
      if (cfg && cfg.limitEnabled && cfg.limitCount && cfg.limitRate) {
        const windowMs = cfg.limitRate * 60000; // rate in minutes
        const recentCount = await Log.countDocuments({
          apiName,
          timestamp: { $gte: new Date(Date.now() - windowMs) },
        });
        if (recentCount >= cfg.limitCount) {
          originalConsole.warn(`[logger] Rate limit hit for ${apiName}`);
          return;
        }
      }

      // Build log entry
      const logEntry = {
        traceId,
        apiName,
        method,
        endpoint,
        status,
        responseTimeMs,
        timestamp: new Date(),
        consoleLogs: apiKeyValid && cfg && cfg.tracerEnabled !== false ? buffer : [],
        apiKeyVerified: apiKeyValid,
      };

      await Log.create(logEntry);
    } catch (err) {
      originalConsole.error("❌ Error saving log:", err && (err.message || err));
    }
  };

  // attach listeners (guard ensures single execution)
  res.on("finish", finish);
  res.on("close", finish);
  next();
};

export default logger;
