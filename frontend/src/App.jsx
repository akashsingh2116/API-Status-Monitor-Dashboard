import { useState } from "react";
import Sidebar from "./components/Sidebar";
import HomePage from "./pages/HomePage";
import TracerPage from "./pages/TracerPage";
import AnalysisPage from "./pages/AnalysisPage";
import ApisPage from "./pages/ApisPage";
import AuthPage from "./pages/AuthPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ApiProvider } from "./context/ApiContext";

function Dashboard() {
  const [selected, setSelected] = useState("home");

  return (
    <ApiProvider>
      <div className="flex bg-gray-900 h-screen">
        <Sidebar selected={selected} setSelected={setSelected} />
        <div className="flex-1 overflow-y-auto">
          {selected === "home" && <HomePage />}
          {selected === "tracer" && <TracerPage />}
          {selected === "analysis" && <AnalysisPage />}
          {selected === "apis" && <ApisPage />}
        </div>
      </div>
    </ApiProvider>
  );
}

function Root() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;
  }

  return user ? <Dashboard /> : <AuthPage />;
}

function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}

export default App;
