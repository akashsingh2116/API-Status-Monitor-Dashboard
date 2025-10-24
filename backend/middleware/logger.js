// middleware/logger.js
import crypto from "crypto";
import Log from "../models/log.js";
import ApiConfig from "../models/config.js";

/**
 * SRD-Compliant Tracer Middleware (corrected)
 *
 * Changes / protections included:
 * - Ensures finish() runs only once (guard).
 * - Only treats requests as monitored APIs when an `x-api-name` header is present
 *   or when the request path starts with the configured monitoring prefix (default: /api).
 * - Skips logging for root ("/"), static assets, health checks, favicons, and internal dashboard routes.
 * - Uses an idempotent upsert for ApiConfig to avoid duplicate config docs.
 * - Restores console if middleware returns early (prevents console monkeypatch from leaking).
 */
const logger = async (req, res, next) => {
  const startNs = process.hrtime.bigint();
  const traceId = crypto.randomUUID();

  // Capture console logs per request (temporary override)
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
    // still call original to keep console behaviour
    originalConsole[level](...args);
  };

  console.log = makePatch("log");
  console.info = makePatch("info");
  console.warn = makePatch("warn");
  console.error = makePatch("error");

  // monitor prefix (only paths that start with this will be considered APIs unless x-api-name provided)
  const MONITOR_PREFIX = (process.env.MONITOR_PREFIX || "/api").toString();

  // guard to ensure finish runs only once per request
  let finished = false;

  const restoreConsole = () => {
    try {
      Object.entries(originalConsole).forEach(([k, fn]) => (console[k] = fn));
    } catch {}
  };

  // Core finish logic
  const finish = async () => {
    if (finished) return;
    finished = true;

    // restore console immediately
    restoreConsole();

    try {
      const endNs = process.hrtime.bigint();
      const responseTimeMs = Number((endNs - startNs) / 1_000_000n);
      const status = typeof res.statusCode === "number" ? res.statusCode : 200;
      const method = req.method;
      // normalize endpoint (strip query)
      const endpointFull = (req.originalUrl || req.url || "").toString();
      const endpoint = endpointFull.split("?")[0];

      // internal routes and static assets to skip
      const internalRoutes = [
        "/api/logs",
        "/api/stats",
        "/api/config",
        "/favicon.ico",
        "/health",
        "/",
        "/static",
        "/assets",
      ];
      if (internalRoutes.some((r) => endpoint.startsWith(r))) return;

      // API key check
      const apiKeyHeader = req.header?.("x-api-key") || req.header?.("apikey");
      const apiKeyValid = process.env.TRACER_API_KEY && apiKeyHeader === process.env.TRACER_API_KEY;

      // Determine apiName:
      // - prefer explicit header x-api-name
      // - else only accept paths starting with MONITOR_PREFIX (e.g., /api/)
      let apiName = null;
      const headerName = req.header?.("x-api-name");
      if (headerName && headerName.toString().trim() !== "") {
        apiName = headerName.toString().trim().toLowerCase();
        if (!apiName.startsWith("/")) apiName = "/" + apiName;
      } else if (endpoint && endpoint.startsWith(MONITOR_PREFIX)) {
        apiName = endpoint.toLowerCase();
      }

      // If there is no apiName (not a monitored endpoint), do NOT create ApiConfig or write logs.
      if (!apiName) return;

      // Idempotent upsert for ApiConfig (avoid duplicates)
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
        // fallback: try to fetch existing config if upsert fails
        originalConsole.error("[logger] ApiConfig upsert error:", err && err.message ? err.message : err);
        cfg = await ApiConfig.findOne({ apiName });
      }

      // Normalize and fix startDate if needed
      try {
        const cfgStart = cfg?.startDate ? new Date(cfg.startDate) : null;
        if (!cfgStart || cfgStart > new Date()) {
          if (cfg) {
            cfg.startDate = new Date();
            await cfg.save();
          }
        }
      } catch (err) {
        originalConsole.error("[logger] Error normalizing cfg.startDate:", err && err.message ? err.message : err);
      }

      // Skip if disabled
      if (cfg && cfg.enabled === false) return;

      // Scheduling check (if scheduling enabled)
      if (cfg && cfg.scheduling && cfg.startTime && cfg.endTime) {
        try {
          const now = new Date();
          const start = new Date(`1970-01-01T${cfg.startTime}:00Z`);
          const end = new Date(`1970-01-01T${cfg.endTime}:00Z`);
          const nowUTC = new Date(`1970-01-01T${now.toISOString().slice(11, 19)}Z`);
          if (nowUTC < start || nowUTC > end) return;
        } catch (err) {
          // if parsing fails, be permissive (do not block)
          originalConsole.error("[logger] scheduling check error:", err && err.message ? err.message : err);
        }
      }

      // Rate limit check
      if (cfg && cfg.limitEnabled && cfg.limitCount && cfg.limitRate) {
        const windowMs = cfg.limitRate * 60000; // minutes -> ms
        const recentCount = await Log.countDocuments({
          apiName,
          timestamp: { $gte: new Date(Date.now() - windowMs) },
        });
        if (recentCount >= cfg.limitCount) {
          originalConsole.warn(`[logger] Rate limit hit for ${apiName}`);
          return;
        }
      }

      // Build and save log entry
      const logEntry = {
        traceId,
        apiName,
        method,
        endpoint,
        status,
        responseTimeMs,
        timestamp: new Date(),
        consoleLogs: apiKeyValid && cfg && cfg.tracerEnabled !== false ? buffer : [],
        apiKeyVerified: !!apiKeyValid,
      };

      await Log.create(logEntry);
    } catch (err) {
      originalConsole.error("❌ Error saving log:", err && (err.message || err));
    }
  };

  // Attach listeners (finish guarded to run once)
  res.on("finish", finish);
  res.on("close", finish);

  // In case middleware decides to skip logging early (before finish), ensure console is restored.
  // To support early skip detection we override next to a wrapper that does nothing special here;
  // actual early skipping happens inside finish; however protect against unexpected synchronous returns.
  try {
    next();
  } catch (err) {
    // restore console if next throws synchronously
    restoreConsole();
    throw err;
  }
};

export default logger;
