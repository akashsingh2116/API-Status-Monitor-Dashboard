import { useEffect, useState } from "react";
import StatCard from "../components/StatCard";
import UptimeChart from "../components/UptimeCharts";
import { useApis } from "../context/ApiContext";
import * as api from "../api";

export default function AnalysisPage() {
  const { selectedApiId, selectedApi, loading: apisLoading } = useApis();
  const [stats, setStats] = useState(null);
  const [days, setDays] = useState(7);

  useEffect(() => {
    if (!selectedApiId) return;
    api
      .fetchStats(selectedApiId, days)
      .then(setStats)
      .catch((err) => console.error("Error fetching stats", err));
  }, [selectedApiId, days]);

  if (!apisLoading && !selectedApiId) {
    return (
      <div className="p-6 text-white bg-gray-900 min-h-screen">
        <h1 className="text-3xl font-bold mb-4">Analysis</h1>
        <p className="text-gray-400">Add an API from "My APIs" to see analytics here.</p>
      </div>
    );
  }

  if (!stats) return <div className="p-6 text-white">Loading...</div>;

  return (
    <div className="flex-1 p-6 text-white bg-gray-900 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Analysis — {selectedApi?.name}</h1>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="bg-gray-800 text-white text-sm rounded px-3 py-1.5"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard
          title="Uptime Percentage"
          value={`${stats.uptimePct?.toFixed(1) || 100}%`}
          percentage={stats.uptimePct || 100}
          color="#34d399"
        />
        <StatCard
          title="Error Rate"
          value={`${stats.errorRate?.toFixed(1) || 0}%`}
          percentage={stats.errorRate || 0}
          color="#ef4444"
        />
        <StatCard
          title="Avg Response Time"
          value={`${stats.avgResponse || 0} ms`}
          percentage={Math.min((stats.avgResponse || 0) / 1000, 100)}
          color="#60a5fa"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard title="Total Requests" value={stats.totalRequests || 0} />
        <StatCard title="Most Common Error" value={stats.mostCommonError || "None"} />
        <StatCard title="Last Downtime" value={stats.lastDowntime || "No downtime yet"} />
      </div>

      <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/30 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-blue-500/20">
        <h2 className="text-lg font-semibold mb-4">Uptime (Last {days} days)</h2>
        <UptimeChart data={stats.uptimeHistory || []} />
      </div>
    </div>
  );
}
