import { useEffect, useRef, useState } from "react";

export default function ConfigRowMenu({ config = {}, onChange, onSave }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  // Local state mirrors parent config
  const [local, setLocal] = useState(config);

  // Sync when parent changes
  useEffect(() => {
    setLocal(config);
  }, [config]);

  // Close on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const applyChange = (field, value) => {
    setLocal((s) => ({ ...s, [field]: value }));
    if (typeof onChange === "function") onChange(field, value);
  };

  const handleSave = () => {
    if (typeof onChange === "function") {
      Object.keys(local).forEach((k) => onChange(k, local[k]));
    }
    if (typeof onSave === "function") onSave();
    setOpen(false);
  };

  return (
    <div className="relative inline-block text-right" ref={ref}>
      <button
        onClick={() => setOpen((s) => !s)}
        className="p-1 rounded hover:bg-white/5"
        aria-expanded={open}
        aria-label="Open config menu"
      >
        <span className="text-gray-300 text-lg">⋯</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 z-50 panel shadow-lg transform origin-top-right animate-fade-slide">
          {/* Header */}
          <div className="mb-3 border-b border-blue-600 pb-2 text-left">
            <div className="text-sm font-semibold text-blue-400">Controls</div>
            <div className="text-xs text-blue-300">Configure</div>
          </div>

          {/* API toggle */}
          <ToggleRow
            label="API"
            desc="On / Off"
            checked={local.enabled}
            onChange={(val) => applyChange("enabled", val)}
          />

          {/* Tracer toggle */}
          <ToggleRow
            label="Tracer"
            desc="Trace logging"
            checked={local.tracerEnabled}
            onChange={(val) => applyChange("tracerEnabled", val)}
          />

          {/* Limit toggle + nested inputs */}
          <ToggleRow
            label="Limit"
            desc="Enable request limiting"
            checked={local.limitEnabled}
            onChange={(val) => applyChange("limitEnabled", val)}
          />
          {local.limitEnabled && (
            <div className="ml-6 mt-3 grid grid-cols-2 gap-2 text-sm">
              <label className="flex flex-col text-gray-400">
                Requests
                <input
                  type="number"
                  value={local.limitCount}
                  onChange={(e) => applyChange("limitCount", e.target.value)}
                  className="mt-1 bg-gray-900/60 border border-gray-700 text-white px-2 py-1 rounded-md outline-none"
                />
              </label>
              <label className="flex flex-col text-gray-400">
                Rate (/hr)
                <input
                  type="number"
                  value={local.limitRate}
                  onChange={(e) => applyChange("limitRate", e.target.value)}
                  className="mt-1 bg-gray-900/60 border border-gray-700 text-white px-2 py-1 rounded-md outline-none"
                />
              </label>
            </div>
          )}

          {/* Schedule toggle + nested inputs */}
          <ToggleRow
            label="Schedule"
            desc="Enable scheduled monitoring"
            checked={local.scheduling}
            onChange={(val) => applyChange("scheduling", val)}
          />
          {local.scheduling && (
            <div className="ml-6 mt-3 grid grid-cols-2 gap-2 text-sm">
              <label className="flex flex-col text-gray-400">
                Start Time
                <input
                  type="time"
                  value={local.startTime}
                  onChange={(e) => applyChange("startTime", e.target.value)}
                  className="mt-1 bg-gray-900/60 border border-gray-700 text-white px-2 py-1 rounded-md outline-none"
                />
              </label>
              <label className="flex flex-col text-gray-400">
                End Time
                <input
                  type="time"
                  value={local.endTime}
                  onChange={(e) => applyChange("endTime", e.target.value)}
                  className="mt-1 bg-gray-900/60 border border-gray-700 text-white px-2 py-1 rounded-md outline-none"
                />
              </label>
            </div>
          )}

          {/* Save */}
          <div className="mt-4 text-right">
            <button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-1 rounded-md shadow"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Toggle Row Component */
function ToggleRow({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-700">
      <div className="text-left">
        <div className="text-sm text-gray-300">{label}</div>
        <div className="text-xs text-gray-400">{desc}</div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          className={`w-11 h-6 inline-block rounded-full transition-colors ${
            checked ? "bg-blue-600" : "bg-gray-700"
          }`}
        />
        <span
          className={`absolute left-0 top-0.5 w-5 h-5 bg-white rounded-full transform transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </label>
    </div>
  );
}
