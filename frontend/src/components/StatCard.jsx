export default function StatCard({ title, value, percentage, color }) {
  return (
    <div
      className="p-6 rounded-xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 
                 backdrop-blur-md border border-gray-700 shadow-md 
                 transition transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/40"
    >
      <h3 className="text-sm text-gray-400 mb-2">{title}</h3>
      <div className="text-2xl font-bold">{value}</div>

      {percentage !== undefined && (
        <div className="w-full bg-gray-700/40 h-2 rounded mt-3">
          <div
            className="h-2 rounded"
            style={{ width: `${percentage}%`, backgroundColor: color }}
          />
        </div>
      )}
    </div>
  );
}
