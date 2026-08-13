// src/pages/HomePage.jsx
import { useEffect, useState } from "react";
import { useApis } from "../context/ApiContext";
import * as api from "../api";

function StatusDot({ status }) {
  if (status >= 100 && status < 200) {
    return <span className="w-7 h-7 inline-block bg-yellow-400 rounded-sm" />;
  }
  if (status >= 200 && status < 300) {
    return <span className="w-7 h-7 inline-block bg-green-500 rounded-sm" />;
  }
  if (status >= 300 && status < 400) {
    return <span className="w-7 h-7 inline-block bg-orange-500 rounded-sm" />;
  }
  return (
    <span className="w-7 h-7 inline-block rounded-sm relative">
      <span className="absolute bottom-0 left-0 w-full h-1 bg-red-500 rounded-sm" />
    </span>
  );
}

export default function HomePage() {
  const { selectedApi, selectedApiId, loading: apisLoading } = useApis();
  const [statuses, setStatuses] = useState([]);
  const [lastTimestamp, setLastTimestamp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (!selectedApiId) return;
    setLoading(true);
    const month = currentMonth.toISOString().slice(0, 7);
    api
      .fetchGroupedLogs(month, selectedApiId)
      .then((json) => {
        const group = json?.data?.[0];
        setStatuses(group?.statuses || []);
        setLastTimestamp(group?.lastTimestamp || null);
      })
      .catch((err) => console.error("Home fetch error:", err))
      .finally(() => setLoading(false));
  }, [selectedApiId, currentMonth]);

  const changeMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const formatMonth = (date) => date.toLocaleString("default", { month: "short", year: "numeric" });

  if (!apisLoading && !selectedApiId) {
    return (
      <div className="p-6 text-white bg-gray-900 min-h-screen">
        <h1 className="text-2xl font-semibold mb-4">APIs</h1>
        <p className="text-gray-400">
          You don't have any APIs yet. Go to "My APIs" to add one and get its install snippet.
        </p>
      </div>
    );
  }

  const recent = statuses.slice(-30);
  const lastStatus = recent.length ? recent[recent.length - 1] : null;

  return (
    <div className="p-6 text-white bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-semibold mb-4">{selectedApi?.name || "..."}</h1>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">System status</h2>
        <div className="flex items-center gap-4">
          <button onClick={() => changeMonth(-1)} className="px-2 py-1 bg-gray-700 rounded">
            ←
          </button>
          <span className="text-gray-300">{formatMonth(currentMonth)}</span>
          <button onClick={() => changeMonth(1)} className="px-2 py-1 bg-gray-700 rounded">
            →
          </button>
        </div>
      </div>

      <div className="bg-white/5 p-4 rounded-md flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">
            {lastTimestamp ? `Last check: ${new Date(lastTimestamp).toLocaleString()}` : "No checks yet"}
          </span>
          {lastStatus !== null &&
            (lastStatus >= 200 && lastStatus < 300 ? (
              <span className="text-green-400 font-semibold">Healthy</span>
            ) : (
              <span className="text-red-400 font-semibold">Issue detected</span>
            ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {loading ? (
            <span className="text-gray-400 text-sm">Loading...</span>
          ) : recent.length > 0 ? (
            recent.map((s, i) => <StatusDot key={i} status={s} />)
          ) : (
            <span className="text-gray-400 text-sm">
              No traffic for {formatMonth(currentMonth)} yet. Install the snippet from "My APIs" to
              start sending events.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
