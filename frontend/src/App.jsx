import { useState } from "react";
import Sidebar from "./components/Sidebar";
import HomePage from "./pages/HomePage";
import TracerPage from "./pages/TracerPage";
import AnalysisPage from "./pages/AnalysisPage";
import ConfigurationPage from "./pages/ConfigurationPage";

function App() {
  const [selected, setSelected] = useState("home");

  return (
    <div className="flex bg-gray-900 h-screen"> 
      {/* Sidebar stays fixed */}
      <Sidebar selected={selected} setSelected={setSelected} />

      {/* Main content scrollable */}
      <div className="flex-1 overflow-y-auto">
        {selected === "home" && <HomePage />}
        {selected === "tracer" && <TracerPage />}
        {selected === "analysis" && <AnalysisPage />}
        {selected === "configuration" && <ConfigurationPage />}
      </div>
    </div>
  );
}

export default App;
