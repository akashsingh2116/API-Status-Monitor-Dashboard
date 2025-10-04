import React, { useEffect, useState } from "react";

function StatusDot({ status }) {
  // 1xx informational → Yellow
  if (status >= 100 && status < 200) {
    return <span className="w-7 h-7 inline-block bg-yellow-400 rounded-sm" />;
  }
  // 2xx success → Green
  if (status >= 200 && status < 300) {
    return <span className="w-7 h-7 inline-block bg-green-500 rounded-sm" />;
  }
  // 3xx redirect → Orange
  if (status >= 300 && status < 400) {
    return <span className="w-7 h-7 inline-block bg-orange-500 rounded-sm" />;
  }
  // 4xx/5xx error → Red dash at bottom
  return (
    <span className="w-7 h-7 inline-block rounded-sm relative">
      <span className="absolute bottom-0 left-0 w-full h-1 bg-red-500 rounded-sm" />
    </span>
  );
}

export default function HomePage() {
  const [apis, setApis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fetchApis = async (monthDate) => {
    setLoading(true);
    try {
      const month = monthDate.toISOString().slice(0, 7);
      const url = `${
        import.meta.env.VITE_API_BASE_URL || ""
      }/api/logs/grouped?month=${month}&page=1&limit=999`;
      const res = await fetch(url);
      const json = await res.json();
      setApis(json?.data || []);
    } catch (err) {
      console.error("Home fetchApis error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApis(currentMonth);
  }, [currentMonth]);

  const changeMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const formatMonth = (date) =>
    date.toLocaleString("default", { month: "short", year: "numeric" });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4 text-white">APIs</h1>

      {/* Month header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-white">System status</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => changeMonth(-1)}
            className="px-2 py-1 bg-gray-700 rounded text-white"
          >
            ←
          </button>
          <span className="text-gray-300">{formatMonth(currentMonth)}</span>
          <button
            onClick={() => changeMonth(1)}
            className="px-2 py-1 bg-gray-700 rounded text-white"
          >
            →
          </button>
        </div>
      </div>

      {/* API rows */}
      <div className="space-y-4">
        {apis.length === 0 && !loading ? (
          <div className="text-gray-600">
            No client APIs found for {formatMonth(currentMonth)}.
          </div>
        ) : (
          apis.map((api, idx) => {
            const statuses = Array.isArray(api.statuses) ? api.statuses : [];
            const lastStatus = statuses.at(-1) || null;

            return (
              <div
                key={api.apiName}
                className="bg-white/5 p-4 rounded-md flex flex-col"
              >
                {/* Header with API name + ✔/❌ */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-gray-300 w-6 text-right">
                      {idx + 1}.
                    </div>
                    <div className="text-white font-medium">{api.apiName}</div>
                  </div>
                  <div>
                    {lastStatus !== null ? (
                      lastStatus >= 200 && lastStatus < 300 ? (
                        <div className="text-green-400 font-semibold">✔️</div>
                      ) : (
                        <div className="text-red-400 font-semibold">❌</div>
                      )
                    ) : (
                      <div className="text-gray-400">—</div>
                    )}
                  </div>
                </div>

                {/* Status Dots Row (subtle horizontal scroll) */}
                <div className="mt-3 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent hover:scrollbar-thumb-gray-600 transition">
                  <div className="flex gap-2 min-w-max pb-1">
                    {statuses.length > 0 ? (
                      statuses.map((s, i) => <StatusDot key={i} status={s} />)
                    ) : (
                      <div className="text-gray-400 text-sm">No checks yet</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
