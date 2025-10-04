import React, { useEffect, useState } from "react";

export default function ConfigurationPage() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConfig, setActiveConfig] = useState(null);

  // 🔹 Fetch all configs safely
  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/config`);
      const json = await res.json();

      if (Array.isArray(json)) {
        // Normal expected response
        setConfigs(json.sort((a, b) => a.apiName.localeCompare(b.apiName)));
      } else if (json?.data && Array.isArray(json.data)) {
        // Handle nested data structure
        setConfigs(json.data.sort((a, b) => a.apiName.localeCompare(b.apiName)));
      } else {
        console.warn("⚠️ Unexpected config format:", json);
        setConfigs([]);
      }
    } catch (err) {
      console.error("❌ Fetch config error:", err);
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  // 🔹 Save updated config to backend
  const saveConfig = async (cfg) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/config/${encodeURIComponent(cfg.apiName)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cfg),
        }
      );
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Save failed");

      setConfigs((prev) =>
        prev.map((p) => (p.apiName === json.apiName ? json : p))
      );
      setActiveConfig(null);
      alert(`✅ Saved configuration for ${cfg.apiName}`);
    } catch (err) {
      console.error("save config err", err);
      alert(`❌ Save failed: ${err.message}`);
    }
  };

  // Toggle (no change visually)
  const Toggle = ({ checked, onChange }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        checked ? "bg-blue-600" : "bg-gray-600"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white relative">
      <h1 className="text-2xl font-semibold mb-6">Configuration</h1>

      {/* Config Table */}
      <div className="bg-white/5 rounded-md overflow-hidden">
        <div className="grid grid-cols-12 gap-4 items-center py-3 px-4 border-b border-white/5 text-sm text-gray-300">
          <div className="col-span-6 font-medium">API Endpoint</div>
          <div className="col-span-3">Start Date</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="p-4 text-gray-400">Loading...</div>
        ) : configs.length === 0 ? (
          <div className="p-4 text-gray-400">No client APIs yet.</div>
        ) : (
          configs.map((c) => (
            <div
              key={c.apiName}
              className="grid grid-cols-12 items-center gap-4 py-3 px-4 border-b border-white/5"
            >
              <div className="col-span-6 text-white font-medium">{c.apiName}</div>
              <div className="col-span-3 text-gray-300">
                {new Date(c.startDate || Date.now()).toLocaleDateString()}
              </div>
              <div className="col-span-3 text-right">
                <button
                  className="px-3 py-1 bg-gray-700 rounded"
                  onClick={() => setActiveConfig(c)}
                >
                  •••
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Control Box */}
      {activeConfig && (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setActiveConfig(null)}
          />
          <div className="absolute bottom-10 right-10 bg-gray-800 text-white w-80 rounded-lg shadow-xl border border-gray-700 z-50 animate-fadeIn">
            <div className="bg-blue-600 px-4 py-2 rounded-t-lg text-sm font-semibold">
              Controls
            </div>

            <div className="p-4 space-y-4">
              {/* API Toggle */}
              <div className="flex items-center justify-between">
                <span>API</span>
                <Toggle
                  checked={!!activeConfig.enabled}
                  onChange={(val) =>
                    setActiveConfig((p) => ({ ...p, enabled: val }))
                  }
                />
              </div>

              {/* Tracer Toggle */}
              <div className="flex items-center justify-between">
                <span>Tracer</span>
                <Toggle
                  checked={!!activeConfig.tracerEnabled}
                  onChange={(val) =>
                    setActiveConfig((p) => ({ ...p, tracerEnabled: val }))
                  }
                />
              </div>

              {/* Limit */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span>Limit</span>
                  <Toggle
                    checked={!!activeConfig.limitEnabled}
                    onChange={(val) =>
                      setActiveConfig((p) => ({ ...p, limitEnabled: val }))
                    }
                  />
                </div>
                {activeConfig.limitEnabled && (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Requests"
                      value={activeConfig.limitCount || ""}
                      onChange={(e) =>
                        setActiveConfig((p) => ({
                          ...p,
                          limitCount: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="bg-gray-700 px-2 py-1 rounded w-24"
                    />
                    <input
                      type="number"
                      placeholder="Rate (min)"
                      value={activeConfig.limitRate || ""}
                      onChange={(e) =>
                        setActiveConfig((p) => ({
                          ...p,
                          limitRate: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="bg-gray-700 px-2 py-1 rounded w-24"
                    />
                  </div>
                )}
              </div>

              {/* Schedule */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span>Schedule</span>
                  <Toggle
                    checked={!!activeConfig.scheduling}
                    onChange={(val) =>
                      setActiveConfig((p) => ({ ...p, scheduling: val }))
                    }
                  />
                </div>
                {activeConfig.scheduling && (
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={activeConfig.startTime || ""}
                      onChange={(e) =>
                        setActiveConfig((p) => ({
                          ...p,
                          startTime: e.target.value,
                        }))
                      }
                      className="bg-gray-700 px-2 py-1 rounded"
                    />
                    <input
                      type="time"
                      value={activeConfig.endTime || ""}
                      onChange={(e) =>
                        setActiveConfig((p) => ({
                          ...p,
                          endTime: e.target.value,
                        }))
                      }
                      className="bg-gray-700 px-2 py-1 rounded"
                    />
                  </div>
                )}
              </div>

              {/* Save */}
              <button
                onClick={() => saveConfig(activeConfig)}
                className="w-full bg-blue-600 py-2 rounded mt-4 hover:bg-blue-700 transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
