import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { useDataset } from "./hooks/useDataset";
import Upload from "./pages/Upload";
import Overview from "./pages/Overview";
import DataQuality from "./pages/DataQuality";
import Cleaning from "./pages/Cleaning";
import EDA from "./pages/EDA";
import Visualization from "./pages/Visualization";
import Correlation from "./pages/Correlation";
import AIInsights from "./pages/AIInsights";

import Reports from "./pages/Reports";

function Dashboard() {
  const { dataset } = useDataset();
  if (!dataset) return <Navigate to="/upload" replace />;
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <Sidebar />
      {/* key resets page state when the dataset changes */}
      <main key={dataset.id} className="min-w-0 flex-1 p-6"><Outlet /></main>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/upload" element={<div className="px-6"><Upload /></div>} />
        <Route element={<Dashboard />}>
          <Route path="/overview" element={<Overview />} />
          <Route path="/quality" element={<DataQuality />} />
          <Route path="/cleaning" element={<Cleaning />} />
          <Route path="/eda" element={<EDA />} />
          <Route path="/visualization" element={<Visualization />} />
          <Route path="/correlation" element={<Correlation />} />
          <Route path="/ai-insights" element={<AIInsights />} />
          
          <Route path="/reports" element={<Reports />} />
        </Route>
        <Route path="*" element={<Navigate to="/upload" replace />} />
      </Routes>
    </>
  );
}
