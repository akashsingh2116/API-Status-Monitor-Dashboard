import { useState } from "react";
import { useApis } from "../context/ApiContext";
import * as api from "../api";

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

function snippetFor(apiKey) {
  return `// Drop this in your own Express app (npm i node-fetch if on Node < 18)
const API_KEY = "${apiKey}";
const INGEST_URL = "${api.API_BASE_URL}/api/ingest";

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    fetch(INGEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
      body: JSON.stringify({
        method: req.method,
        endpoint: req.originalUrl,
        status: res.statusCode,
        responseTimeMs: Date.now() - start,
      }),
    }).catch(() => {}); // never let monitoring break your app
  });
  next();
});`;
}

function ApiCard({ cfg, isSelected, onSelect, onChanged }) {
  const [draft, setDraft] = useState(cfg);
  const [showKey, setShowKey] = useState(false);
  const [showSnippet, setShowSnippet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const dirty = JSON.stringify(draft) !== JSON.stringify(cfg);

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const updated = await api.updateApi(cfg._id, {
        name: draft.name,
        enabled: draft.enabled,
        tracerEnabled: draft.tracerEnabled,
        limitEnabled: draft.limitEnabled,
        limitCount: draft.limitCount,
        limitRate: draft.limitRate,
        scheduling: draft.scheduling,
        startTime: draft.startTime,
        endTime: draft.endTime,
      });
      onChanged(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const regenerateKey = async () => {
    if (!confirm("Regenerate this API's key? Any code still using the old key will stop working.")) return;
    setBusy(true);
    try {
      const updated = await api.regenerateApiKey(cfg._id);
      onChanged(updated);
      setShowKey(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete "${cfg.name}" and all of its logs? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api.deleteApi(cfg._id);
      onChanged(null);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const copyKey = () => navigator.clipboard.writeText(cfg.apiKey);
  const copySnippet = () => navigator.clipboard.writeText(snippetFor(cfg.apiKey));

  return (
    <div
      className={`bg-white/5 rounded-lg p-4 border ${
        isSelected ? "border-blue-500" : "border-transparent"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onSelect}
            title="View this API's dashboard"
            className={`text-xs px-2 py-1 rounded ${
              isSelected ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"
            }`}
          >
            {isSelected ? "Viewing" : "View"}
          </button>
          <input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            className="bg-transparent text-white font-medium text-lg outline-none border-b border-transparent focus:border-gray-600"
          />
        </div>
        <span className="text-xs text-gray-400">
          Added {new Date(cfg.createdAt || cfg.startDate).toLocaleDateString()}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-4 text-sm">
        <span className="text-gray-400">API key:</span>
        <code className="bg-gray-800 px-2 py-1 rounded text-gray-200">
          {showKey ? cfg.apiKey : `${cfg.apiKey.slice(0, 6)}${"•".repeat(20)}`}
        </code>
        <button onClick={() => setShowKey((s) => !s)} className="text-blue-400 hover:underline">
          {showKey ? "Hide" : "Show"}
        </button>
        <button onClick={copyKey} className="text-blue-400 hover:underline">
          Copy
        </button>
        <button onClick={regenerateKey} className="text-yellow-400 hover:underline ml-auto">
          Regenerate
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-300 text-sm">Enabled</span>
          <Toggle checked={draft.enabled} onChange={(v) => setDraft((d) => ({ ...d, enabled: v }))} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-300 text-sm">Capture console logs</span>
          <Toggle
            checked={draft.tracerEnabled}
            onChange={(v) => setDraft((d) => ({ ...d, tracerEnabled: v }))}
          />
        </div>

        <div className="col-span-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-300 text-sm">Rate limit</span>
            <Toggle
              checked={draft.limitEnabled}
              onChange={(v) => setDraft((d) => ({ ...d, limitEnabled: v }))}
            />
          </div>
          {draft.limitEnabled && (
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Max requests"
                value={draft.limitCount || ""}
                onChange={(e) => setDraft((d) => ({ ...d, limitCount: parseInt(e.target.value) || 0 }))}
                className="bg-gray-800 px-2 py-1 rounded w-32 text-sm text-white"
              />
              <input
                type="number"
                placeholder="Per (minutes)"
                value={draft.limitRate || ""}
                onChange={(e) => setDraft((d) => ({ ...d, limitRate: parseInt(e.target.value) || 0 }))}
                className="bg-gray-800 px-2 py-1 rounded w-32 text-sm text-white"
              />
            </div>
          )}
        </div>

        <div className="col-span-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-300 text-sm">Schedule (UTC)</span>
            <Toggle
              checked={draft.scheduling}
              onChange={(v) => setDraft((d) => ({ ...d, scheduling: v }))}
            />
          </div>
          {draft.scheduling && (
            <div className="flex gap-2">
              <input
                type="time"
                value={draft.startTime || ""}
                onChange={(e) => setDraft((d) => ({ ...d, startTime: e.target.value }))}
                className="bg-gray-800 px-2 py-1 rounded text-sm text-white"
              />
              <input
                type="time"
                value={draft.endTime || ""}
                onChange={(e) => setDraft((d) => ({ ...d, endTime: e.target.value }))}
                className="bg-gray-800 px-2 py-1 rounded text-sm text-white"
              />
            </div>
          )}
        </div>
      </div>

      {error && <div className="text-red-400 text-sm mb-2">{error}</div>}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={!dirty || busy}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm px-4 py-1.5 rounded"
        >
          Save changes
        </button>
        <button
          onClick={() => setShowSnippet((s) => !s)}
          className="text-sm text-gray-300 hover:text-white"
        >
          {showSnippet ? "Hide install snippet" : "Show install snippet"}
        </button>
        <button onClick={remove} disabled={busy} className="text-sm text-red-400 hover:text-red-300 ml-auto">
          Delete
        </button>
      </div>

      {showSnippet && (
        <div className="mt-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-400">Add this to your own backend:</span>
            <button onClick={copySnippet} className="text-xs text-blue-400 hover:underline">
              Copy
            </button>
          </div>
          <pre className="bg-black/60 text-green-300 text-xs p-3 rounded overflow-x-auto">
            {snippetFor(cfg.apiKey)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function ApisPage() {
  const { apis, loading, selectedApiId, setSelectedApiId, refresh } = useApis();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const created = await api.createApi(newName.trim());
      setNewName("");
      await refresh();
      setSelectedApiId(created._id);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 text-white bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-semibold mb-6">My APIs</h1>

      <form onSubmit={handleCreate} className="flex gap-2 mb-6">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Name this API, e.g. Payments Service"
          className="bg-white/5 px-3 py-2 rounded flex-1 outline-none focus:ring-2 focus:ring-blue-600"
        />
        <button
          type="submit"
          disabled={creating}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded font-medium"
        >
          Add API
        </button>
      </form>
      {error && <div className="text-red-400 text-sm mb-4">{error}</div>}

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : apis.length === 0 ? (
        <div className="text-gray-400">
          You haven't added any APIs yet. Add one above to get its key and install snippet.
        </div>
      ) : (
        <div className="space-y-4">
          {apis.map((cfg) => (
            <ApiCard
              key={cfg._id}
              cfg={cfg}
              isSelected={cfg._id === selectedApiId}
              onSelect={() => setSelectedApiId(cfg._id)}
              onChanged={() => refresh()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
