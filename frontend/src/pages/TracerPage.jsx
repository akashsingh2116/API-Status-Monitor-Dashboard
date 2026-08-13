import { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import { useApis } from "../context/ApiContext";
import * as api from "../api";

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return dayjs(date).format("MMM D, YYYY");
}

function ConsoleLine({ log }) {
  const color =
    log.level === "error"
      ? "text-red-400"
      : log.level === "warn"
      ? "text-yellow-400"
      : log.level === "info"
      ? "text-blue-400"
      : "text-green-400";

  return (
    <div className={`text-sm ${color}`}>
      [{log.level.toUpperCase()}] {log.message}
    </div>
  );
}

function LogEntry({ log }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-100 shadow">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-white">{log.method}</span>
          <span className="text-gray-400">{log.endpoint}</span>
        </div>
        <div>
          <span
            className={`px-2 py-1 rounded text-xs font-semibold ${
              log.status >= 400
                ? "bg-red-500/20 text-red-400"
                : log.status >= 300
                ? "bg-orange-500/20 text-orange-400"
                : log.status >= 100 && log.status < 200
                ? "bg-yellow-400/20 text-yellow-300"
                : "bg-green-500/20 text-green-400"
            }`}
          >
            {log.status}
          </span>
        </div>
      </div>

      <div className="flex justify-between text-gray-400 text-xs mb-2">
        <div>{dayjs(log.timestamp).format("HH:mm:ss")}</div>
        <div>{log.responseTimeMs} ms</div>
      </div>

      {Array.isArray(log.consoleLogs) && log.consoleLogs.length > 0 && (
        <div className="mt-2 pl-3 border-l-2 border-gray-700 space-y-1">
          {log.consoleLogs.map((cl, i) => (
            <ConsoleLine key={i} log={cl} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TracerPage() {
  const { selectedApiId, selectedApi, loading: apisLoading } = useApis();
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(null);
  const loaderRef = useRef(null);

  const fetchLogs = async (pageNum = 1) => {
    if (!selectedApiId) return;
    setLoading(true);
    try {
      const data = await api.fetchLogs({ apiId: selectedApiId, page: pageNum });
      setTotalPages(data.pagination?.totalPages ?? null);
      if (pageNum === 1) setLogs(data.data || []);
      else setLogs((prev) => [...prev, ...(data.data || [])]);
    } catch (err) {
      console.error("Tracer fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedApiId]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          if (totalPages === null || page < totalPages) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchLogs(nextPage);
          }
        }
      },
      { threshold: 0.5 }
    );

    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, page, selectedApiId]);

  if (!apisLoading && !selectedApiId) {
    return (
      <div className="p-6 text-white bg-gray-900 min-h-screen">
        <h1 className="text-2xl font-semibold mb-4">Tracer Logs</h1>
        <p className="text-gray-400">Add an API from "My APIs" to see its traced requests here.</p>
      </div>
    );
  }

  const grouped = logs.reduce((acc, log) => {
    const key = formatDate(log.timestamp);
    acc[key] = acc[key] || [];
    acc[key].push(log);
    return acc;
  }, {});

  return (
    <div className="p-6 text-white bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-semibold mb-6">Tracer Logs — {selectedApi?.name}</h1>

      {Object.keys(grouped).map((date) => (
        <div key={date} className="mb-8">
          <div className="flex items-center mb-4">
            <div className="flex-grow border-t border-gray-700"></div>
            <span className="px-3 text-gray-400 text-sm">{date}</span>
            <div className="flex-grow border-t border-gray-700"></div>
          </div>

          <div className="space-y-3">
            {grouped[date].map((log, i) => (
              <LogEntry key={i} log={log} />
            ))}
          </div>
        </div>
      ))}

      <div ref={loaderRef} className="text-center py-6 text-gray-400">
        {loading
          ? "Loading more logs..."
          : logs.length === 0
          ? "No logs yet — install the snippet from \"My APIs\" to start sending events."
          : totalPages && page >= totalPages
          ? "No more logs"
          : "Scroll to load more"}
      </div>
    </div>
  );
}
