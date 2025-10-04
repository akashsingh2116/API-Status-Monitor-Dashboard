// controller/statsController.js
import Log from "../models/log.js";

export const getStats = async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24h
    const logs = await Log.find({ timestamp: { $gte: since }, apiName: { $ne: null } }).lean();

    const totalRequests = logs.length;
    const responseTimes = logs.map((l) => l.responseTimeMs).filter((n) => n !== undefined);
    const avgResponse = responseTimes.length
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

    const errorCount = logs.filter((l) => l.status >= 400).length;
    const serverErrors = logs.filter((l) => l.status >= 500).length;

    const errorRate = totalRequests ? (errorCount / totalRequests) * 100 : 0;
    const uptimePct = totalRequests ? ((totalRequests - serverErrors) / totalRequests) * 100 : 100;

    const lastDowntimeDoc = logs.filter((l) => l.status >= 500).sort((a, b) => b.timestamp - a.timestamp)[0];
    const lastDowntime = lastDowntimeDoc ? new Date(lastDowntimeDoc.timestamp).toISOString() : null;

    let mostCommonError = null;
    const statusCounts = {};
    logs.forEach((l) => {
      if (l.status >= 400) statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
    });
    const entries = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);
    if (entries.length > 0) mostCommonError = `HTTP ${entries[0][0]}`;

    const requestsPerEndpoint = {};
    logs.forEach((l) => {
      requestsPerEndpoint[l.apiName] = (requestsPerEndpoint[l.apiName] || 0) + 1;
    });

    res.json({
      totalRequests,
      avgResponse,
      uptimePct: Number(uptimePct.toFixed(2)),
      errorRate: Number(errorRate.toFixed(2)),
      lastDowntime,
      mostCommonError,
      requestsPerEndpoint,
    });
  } catch (err) {
    console.error("❌ Stats error:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};
