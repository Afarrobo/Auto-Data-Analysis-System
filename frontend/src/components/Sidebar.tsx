import { NavLink } from "react-router-dom";

const links = [
  ["/overview", "Overview"],
  ["/quality", "Data quality"],
  ["/cleaning", "Cleaning"],
  ["/eda", "EDA"],
  ["/visualization", "Charts"],
  ["/correlation", "Correlation"],
  ["/ai-insights", "AI insights"],
  
  ["/reports", "Reports"],
] as const;

export default function Sidebar() {
  return (
    <nav
      className="w-52 shrink-0 border-r border-white/60 bg-white/70 p-3 backdrop-blur"
      aria-label="Sections"
    >
      <ul className="space-y-1">
        {links.map(([to, label]) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `block rounded px-3 py-2 text-sm ${
                  isActive
                    ? "bg-accent font-medium text-white"
                    : "text-slate-700 hover:bg-white/80"
                }`
              }
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}