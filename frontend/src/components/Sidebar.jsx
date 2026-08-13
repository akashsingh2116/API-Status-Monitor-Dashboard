import { Home, Activity, BarChart3, KeyRound, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useApis } from "../context/ApiContext";

function Sidebar({ selected, setSelected }) {
  const { user, logout } = useAuth();
  const { apis, selectedApiId, setSelectedApiId } = useApis();

  const menuItems = [
    { id: "home", label: "Home", icon: <Home size={18} /> },
    { id: "tracer", label: "Tracer", icon: <Activity size={18} /> },
    { id: "analysis", label: "Analysis", icon: <BarChart3 size={18} /> },
    { id: "apis", label: "My APIs", icon: <KeyRound size={18} /> },
  ];

  return (
    <div className="w-64 h-screen bg-gray-900 text-white flex flex-col shadow-lg">
      <h1 className="text-2xl font-bold p-4 border-b border-gray-700 text-center">
        API DASHBOARD
      </h1>

      {apis.length > 0 && (
        <div className="p-3 border-b border-gray-700">
          <label className="text-xs text-gray-400 block mb-1">Viewing</label>
          <select
            value={selectedApiId || ""}
            onChange={(e) => setSelectedApiId(e.target.value)}
            className="w-full bg-gray-800 text-white text-sm rounded px-2 py-1.5"
          >
            {apis.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelected(item.id)}
            className={`flex items-center gap-3 w-full text-left p-3 rounded-lg relative transition-all
              ${
                selected === item.id
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
          >
            {selected === item.id && (
              <span className="absolute left-0 top-0 h-full w-1 bg-blue-400 rounded-r"></span>
            )}
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="text-xs text-gray-400 mb-2 truncate">{user?.email}</div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-300 hover:text-white"
        >
          <LogOut size={16} /> Log out
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
