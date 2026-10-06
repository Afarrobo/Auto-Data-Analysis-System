import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useDataset } from "../hooks/useDataset";

// Animations live here so the navbar works without touching index.css
const STYLES = `
@keyframes nb-drop  { from { opacity: 0; transform: translateY(-100%); } to { opacity: 1; transform: none; } }
@keyframes nb-pop   { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: none; } }
@keyframes nb-flow  { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
@keyframes nb-ping  { 0% { transform: scale(1); opacity: .6; } 100% { transform: scale(2.4); opacity: 0; } }
@keyframes nb-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
.nb-drop  { animation: nb-drop .5s cubic-bezier(.2,.8,.2,1) both; }
.nb-pop   { animation: nb-pop .5s ease-out both; }
.nb-flow  { background-size: 200% 100%; animation: nb-flow 8s linear infinite; }
.nb-ping  { animation: nb-ping 2s ease-out infinite; }
.nb-float { animation: nb-float 4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .nb-drop, .nb-pop, .nb-flow, .nb-ping, .nb-float { animation: none; }
}
`;

function LogoMark() {
  return (
    <span className="nb-float flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white shadow-sm">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 20V10" />
        <path d="M10 20V4" />
        <path d="M16 20v-8" />
        <path d="M22 20H2" />
      </svg>
    </span>
  );
}

export default function Navbar() {
  const { dataset, setDataset } = useDataset();
  const navigate = useNavigate();

  const remove = async () => {
    if (!dataset) return;
    if (!window.confirm(`Delete "${dataset.filename}" from the server?`)) return;
    try {
      await api.deleteDataset(dataset.id);
    } catch (e) {
      window.alert((e as Error).message);
      return;
    }
    setDataset(null);
    navigate("/upload");
  };

  return (
    <header className="nb-drop relative flex h-14 items-center justify-between border-b border-white/60 bg-white/70 px-5 backdrop-blur">
      <style>{STYLES}</style>

      {/* Logo + title */}
      <button
        onClick={() => navigate(dataset ? "/overview" : "/upload")}
        className="group flex items-center gap-2.5 rounded"
        aria-label="AI Analyst home"
      >
        <LogoMark />
        <span className="text-lg font-semibold tracking-tight text-accent-dark transition-colors group-hover:text-accent">
          Auto Analyst
        </span>
      </button>

      {dataset ? (
        <div className="flex items-center gap-3 text-sm">
          {/* Active dataset chip */}
          <span
            key={dataset.id}
            className="nb-pop flex max-w-[40vw] items-center gap-2 rounded-full border border-teal-200 bg-teal-50/80 px-3 py-1 text-slate-700"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="nb-ping absolute inset-0 rounded-full bg-emerald-400" />
              <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="truncate">{dataset.filename}</span>
          </span>

          <button
            onClick={() => navigate("/upload")}
            className="rounded border border-slate-300 bg-white/60 px-3 py-1 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md active:translate-y-0"
          >
            New dataset
          </button>
          <button
            onClick={remove}
            className="rounded border border-red-300 bg-white/60 px-3 py-1 text-red-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-md active:translate-y-0"
          >
            Delete
          </button>
        </div>
      ) : (
        <span className="nb-pop text-sm text-slate-500">No dataset loaded</span>
      )}

      {/* Slowly flowing gradient line along the bottom edge */}
      <div
        className="nb-flow pointer-events-none absolute inset-x-0 bottom-0 h-[2px]"
        style={{
          background:
            "linear-gradient(90deg, transparent, #1f6f6b, #7fb7d9, #a7d6c8, #1f6f6b, transparent)",
        }}
      />
    </header>
  );
}