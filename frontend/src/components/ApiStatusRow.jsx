function ApiStatusRow({ name, statuses }) {
  // get the last status
  const lastStatus = statuses[statuses.length - 1];

  const getLastIcon = () => {
    if (!lastStatus) return <span className="text-gray-500">—</span>;

    switch (lastStatus) {
      case "ok":
        return <span className="text-green-400">✔</span>; // 200
      case "warn":
        return <span className="text-orange-400">✖</span>; // 3xx still failure
      case "degraded":
        return <span className="text-yellow-400">✖</span>; // 1xx not ok
      case "error":
        return <span className="text-red-500">✖</span>; // 4xx/5xx
      default:
        return <span className="text-gray-500">—</span>;
    }
  };

  return (
    <div className="mb-8">
      {/* API Name */}
      <div className="text-sm text-gray-300 mb-2">{name}</div>

      {/* Status Row */}
      <div className="flex items-center relative">
        <div className="flex gap-1 flex-wrap">
          {statuses.map((s, i) => (
            <div
              key={i}
              className={`w-6 h-6 rounded-sm ${
                s === "ok"
                  ? "bg-green-500"
                  : s === "warn"
                  ? "bg-orange-500"
                  : s === "degraded"
                  ? "bg-yellow-500"
                  : s === "error"
                  ? "border-2 border-red-600 border-dashed"
                  : "bg-gray-500"
              }`}
            ></div>
          ))}
        </div>

        {/* Last Status Indicator */}
        <div className="absolute -top-4 right-0 text-xs">{getLastIcon()}</div>
      </div>
    </div>
  );
}

export default ApiStatusRow;
