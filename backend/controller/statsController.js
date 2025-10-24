// backend/controller/statsController.js
import Log from "../models/log.js";

/**
 * GET /api/stats
 * Optional query params:
 *  - from=YYYY-MM-DD
 *  - to=YYYY-MM-DD
 *  - days=N   (for uptimeHistory, defaults to 7)
 *
 * Returns KPIs computed from logs (normalized).
 */
export const getStats = async (req, res) => {
  try {
    const { from, to, days = 30 } = req.query;

    const toDate = to ? new Date(to) : new Date();
    const fromDate = from
      ? new Date(from)
      : new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);

    const validFrom = isNaN(fromDate) ? new Date(0) : fromDate;
    const validTo = isNaN(toDate) ? new Date() : toDate;

    // Fetch logs in the requested range (do not require apiName to exist)
    let logs = await Log.find({
      timestamp: { $gte: validFrom, $lte: validTo },
    }).lean();

    // If no logs in range, fallback to all logs (helps debugging)
    if (!logs || logs.length === 0) {
      logs = await Log.find({}).lean();
    }

    const statusOf = (l) => {
      if (!l) return null;
      if (typeof l.status === "number") return l.status;
      if (typeof l.statusCode === "number") return l.statusCode;
      if (typeof l.code === "number") return l.code;
      const s = l.status ?? l.statusCode ?? l.code ?? null;
      if (s === null || s === undefined) return null;
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    };

    const responseTimeOf = (l) => {
      if (!l) return undefined;
      if (typeof l.responseTimeMs === "number") return l.responseTimeMs;
      if (typeof l.responseTime === "number") return l.responseTime;
      const s = l.responseTimeMs ?? l.responseTime ?? null;
      const n = Number(s);
      return Number.isFinite(n) ? n : undefined;
    };

    const totalRequests = logs.length;

    const responseTimes = logs
      .map((l) => responseTimeOf(l))
      .filter((v) => v !== undefined && v !== null);

    const avgResponse = responseTimes.length
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

    const errorCount = logs.filter((l) => {
      const s = statusOf(l);
      return s !== null && s >= 400;
    }).length;

    const serverErrors = logs.filter((l) => {
      const s = statusOf(l);
      return s !== null && s >= 500;
    }).length;

    const errorRate = totalRequests ? (errorCount / totalRequests) * 100 : 0;

    const successfulCount = logs.filter((l) => {
      const s = statusOf(l);
      return s !== null && s >= 200 && s < 300;
    }).length;
    const uptimePct = totalRequests ? (successfulCount / totalRequests) * 100 : 100;

    const lastDowntimeDoc = logs
      .filter((l) => {
        const s = statusOf(l);
        return s !== null && s >= 400;
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    const lastDowntime = lastDowntimeDoc ? new Date(lastDowntimeDoc.timestamp).toISOString() : null;

    const statusCounts = {};
    logs.forEach((l) => {
      const s = statusOf(l);
      if (s !== null && s >= 400) {
        statusCounts[s] = (statusCounts[s] || 0) + 1;
      }
    });
    let mostCommonError = null;
    let maxCount = 0;
    Object.keys(statusCounts).forEach((k) => {
      if (statusCounts[k] > maxCount) {
        maxCount = statusCounts[k];
        mostCommonError = Number(k);
      }
    });

    const requestsPerEndpoint = {};
    logs.forEach((l) => {
      const name = l.apiName ?? l.endpoint ?? l.originalUrl ?? "/unknown";
      requestsPerEndpoint[name] = (requestsPerEndpoint[name] || 0) + 1;
    });

    const uptimeHistory = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(validTo);
      dayStart.setUTCHours(0, 0, 0, 0);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setUTCHours(23, 59, 59, 999);

      const dayLogs = logs.filter((l) => {
        const t = new Date(l.timestamp);
        return t >= dayStart && t <= dayEnd;
      });

      const dayTotal = dayLogs.length;
      const daySuccess = dayLogs.filter((l) => {
        const s = statusOf(l);
        return s !== null && s >= 200 && s < 300;
      }).length;

      const dayUptime = dayTotal ? (daySuccess / dayTotal) * 100 : 100;
      uptimeHistory.push({
        date: dayStart.toISOString().slice(0, 10),
        uptimePct: Number(dayUptime.toFixed(2)),
        totalRequests: dayTotal,
      });
    }

    res.json({
      totalRequests,
      avgResponse,
      uptimePct: Number(uptimePct.toFixed(2)),
      errorRate: Number(errorRate.toFixed(2)),
      mostCommonError,
      lastDowntime,
      requestsPerEndpoint,
      uptimeHistory,
    });
  } catch (err) {
    console.error("❌ Stats error:", err && err.message ? err.message : err);
    res.status(500).json({ error: "Server Error" });
  }
};
