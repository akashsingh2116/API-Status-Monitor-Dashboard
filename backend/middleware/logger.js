import crypto from "crypto";
import Log from "../models/log.js";
import ApiConfig from "../models/config.js";

/**
 * 🔍 SRD-Compliant Tracer Middleware (Final Production Build)
 * ✅ Captures API activity, method, status, and response time
 * ✅ Generates unique traceId
 * ✅ Auto-creates ApiConfig entries atomically (no duplicates)
 * ✅ Keeps firstSeen/startDate consistent
 * ✅ Respects: enabled, tracerEnabled, rateLimit, scheduling toggles
 * ✅ Skips internal dashboard routes (/api/logs, /api/config, etc.)
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

  // --- Core finish logic ---
  const finish = async () => {
    // Restore console methods
    Object.entries(originalConsole).forEach(([k, fn]) => (console[k] = fn));

    try {
      const endNs = process.hrtime.bigint();
      const responseTimeMs = Number((endNs - startNs) / 1_000_000n);
      const status = res.statusCode || 200;
      const method = req.method;
      const endpoint = req.originalUrl || req.url;

      // 🚫 Skip internal dashboard routes completely
      const internalRoutes = [
        "/api/logs",
        "/api/config",
        "/api/stats",
        "/api/health",
        "/favicon.ico",
        "/",
      ];

      if (
        internalRoutes.some((r) => endpoint.startsWith(r)) ||
        endpoint.includes("api/logs") ||
        endpoint.includes("api/config") ||
        endpoint.includes("api/stats")
      ) {
        return; // don't log internal dashboard API requests
      }

      // 🔑 API key verification
      const apiKeyHeader = req.header("x-api-key") || req.header("apikey");
      const apiKeyValid =
        process.env.TRACER_API_KEY &&
        apiKeyHeader === process.env.TRACER_API_KEY;

      // 🧩 Normalize client ID and API name
      const clientId = req.header("x-client-id")?.trim().toLowerCase() || "default";
      let rawApi = req.header("x-api-name") || endpoint;
      rawApi = rawApi.trim().toLowerCase();
      if (!rawApi.startsWith("/")) rawApi = "/" + rawApi;
      const apiName = `${clientId}:${rawApi}`;

      // ⚙️ Ensure ApiConfig exists (atomic, prevents duplicates)
      const cfg = await ApiConfig.findOneAndUpdate(
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
        { new: true, upsert: true }
      );

      // ⏰ Respect schedule toggle
      if (cfg.scheduling && cfg.startTime && cfg.endTime) {
        const now = new Date();
        const start = new Date(`1970-01-01T${cfg.startTime}:00Z`);
        const end = new Date(`1970-01-01T${cfg.endTime}:00Z`);
        const nowUTC = new Date(`1970-01-01T${now.toISOString().slice(11, 19)}Z`);
        if (nowUTC < start || nowUTC > end) return;
      }

      // 🚦 Rate limit enforcement
      if (cfg.limitEnabled && cfg.limitCount && cfg.limitRate) {
        const windowMs = cfg.limitRate * 60000;
        const recentCount = await Log.countDocuments({
          apiName,
          timestamp: { $gte: new Date(Date.now() - windowMs) },
        });
        if (recentCount >= cfg.limitCount) {
          originalConsole.warn(`[logger] Rate limit hit for ${apiName}`);
          return;
        }
      }

      // ❌ Skip disabled APIs
      if (cfg.enabled === false) return;

      // 🧾 Create and store log entry
      const logEntry = {
        traceId,
        apiName,
        method,
        endpoint,
        status,
        responseTimeMs,
        timestamp: new Date(),
        consoleLogs: apiKeyValid && cfg.tracerEnabled !== false ? buffer : [],
        apiKeyVerified: apiKeyValid,
      };

      await Log.create(logEntry);
    } catch (err) {
      originalConsole.error("❌ Error saving log:", err.message || err);
    }
  };

  res.on("finish", finish);
  next();
};

export default logger;
