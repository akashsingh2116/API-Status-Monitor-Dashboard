import { Home, Activity, BarChart3, Settings } from "lucide-react";

function Sidebar({ selected, setSelected }) {
  const menuItems = [
    { id: "home", label: "Home", icon: <Home size={18} /> },
    { id: "tracer", label: "Tracer", icon: <Activity size={18} /> },
    { id: "analysis", label: "Analysis", icon: <BarChart3 size={18} /> },
    { id: "configuration", label: "Configuration", icon: <Settings size={18} /> },
  ];

  return (
    <div className="w-64 h-screen bg-gray-900 text-white flex flex-col shadow-lg">
      {/* Title */}
      <h1 className="text-2xl font-bold p-4 border-b border-gray-700 text-center">
        API DASHBOARD
      </h1>

      {/* Navigation */}
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
            {/* Left indicator bar */}
            {selected === item.id && (
              <span className="absolute left-0 top-0 h-full w-1 bg-blue-400 rounded-r"></span>
            )}
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default Sidebar;
