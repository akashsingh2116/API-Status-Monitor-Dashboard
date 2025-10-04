import { useEffect, useState } from "react";
import StatCard from "../components/StatCard";
import UptimeChart from "../components/UptimeCharts";

export default function AnalysisPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/stats`);
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error("Error fetching stats", err);
      }
    };
    fetchStats();
  }, []);

  if (!stats) return <div className="p-6 text-white">Loading...</div>;

  return (
    <div className="flex-1 p-6 text-white bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">Analysis</h1>

      {/* KPI Cards */}
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

      {/* Chart Section */}
      <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/30 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-blue-500/20">
        <h2 className="text-lg font-semibold mb-4">Uptime (Last 7 days)</h2>
        <UptimeChart data={stats.uptimeHistory || []} />

      </div>
    </div>
  );
}
