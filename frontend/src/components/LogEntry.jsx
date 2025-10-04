// src/components/LogEntry.jsx
import React from "react";

function ConsoleLine({ cl }) {
  const cls = cl.level === "error" ? "text-red-400" : cl.level === "warn" ? "text-yellow-300" : "text-green-300";
  return (
    <div className={`text-xs ${cls} truncate`}>
      <span className="font-semibold text-gray-200">{cl.level}:</span> {String(cl.message)}
    </div>
  );
}

export default function LogEntry({ log }) {
  return (
    <div className="bg-white/4 p-3 rounded-md border border-white/5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm text-gray-200 font-medium">{log.apiName || log.endpoint}</div>
          <div className="text-xs text-gray-400">{log.endpoint}</div>
        </div>
        <div className="text-right">
          <div className={`font-semibold ${log.status >= 500 ? "text-red-400" : log.status >= 400 ? "text-yellow-300" : "text-green-300"}`}>
            {log.status}
          </div>
          <div className="text-xs text-gray-400">{log.responseTimeMs ?? "-"} ms</div>
        </div>
      </div>

      {Array.isArray(log.consoleLogs) && log.consoleLogs.length > 0 && (
        <div className="mt-2 space-y-1">
          {log.consoleLogs.slice(-5).map((c, i) => (
            <ConsoleLine key={i} cl={c} />
          ))}
        </div>
      )}
      <div className="mt-2 text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</div>
    </div>
  );
}
