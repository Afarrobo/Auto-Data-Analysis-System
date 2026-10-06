import { useRef, useState } from "react";
import ChartCard, { PlotlyChart } from "../components/ChartCard";
import Loading, { ErrorMessage } from "../components/Loading";
import { api } from "../services/api";
import { useAsync, useDataset } from "../hooks/useDataset";
import type { ChartRecommendation, Json } from "../types/dataset";

// Names must match what charts.py accepts.
const TYPES = ["histogram", "bar", "line", "scatter", "box", "heatmap"];

// ---------------------------------------------------------------------------
// Chart guide content (UI only - does not touch any chart logic)
// ---------------------------------------------------------------------------
type GuideItem = {
  label: string;
  tagline: string;
  intro: string;
  when: string[];
  why: string;
  example: string;
  needs: string;
};

const GUIDE: Record<string, GuideItem> = {
  histogram: {
    label: "Histogram",
    tagline: "See how values are spread",
    intro:
      "A histogram groups one numeric column into ranges (bins) and counts how many rows fall into each range.",
    when: [
      "You want to know the typical value of a column",
      "You want to spot skew, gaps or unusual peaks",
      "You are checking data before modelling or cleaning",
    ],
    why: "It shows the shape of your data, which a single average cannot do.",
    example:
      "Customer_Age: most customers are between 25 and 40, with a small group above 65.",
    needs: "X: one numeric column. Y is not needed.",
  },
  bar: {
    label: "Bar chart",
    tagline: "Compare groups side by side",
    intro:
      "A bar chart draws one bar per category. The bar height is a number for that category, such as a total or an average.",
    when: [
      "You want to compare categories (region, product, age group)",
      "You want to rank items from highest to lowest",
      "You want a total, average or count per group",
    ],
    why: "Bar lengths are the easiest thing for the eye to compare.",
    example: "Sales by Age_Group: which age group brings in the most revenue.",
    needs: "X: a category column. Y: a numeric column.",
  },
  line: {
    label: "Line chart",
    tagline: "Follow change over time",
    intro:
      "A line chart connects points in order, so you can see how a value rises or falls from one step to the next.",
    when: [
      "Your X column is a date, month or year",
      "You want to see a trend or seasonal pattern",
      "You want to find sudden jumps or drops",
    ],
    why: "The connected line makes direction and speed of change obvious.",
    example: "Revenue by Month: sales climb every winter and dip in summer.",
    needs: "X: a date or ordered column. Y: a numeric column.",
  },
  scatter: {
    label: "Scatter plot",
    tagline: "Check if two numbers are related",
    intro:
      "A scatter plot puts one dot per row on a grid. The position of each dot comes from two numeric columns.",
    when: [
      "You want to see if two columns move together",
      "You want to find outliers that sit far from the rest",
      "You suspect a link such as price and quantity",
    ],
    why: "Patterns in the dots reveal a relationship that tables hide.",
    example:
      "Customer_Age vs Revenue: do older customers spend more, or is there no link?",
    needs: "X: a numeric column. Y: a numeric column.",
  },
  box: {
    label: "Box plot",
    tagline: "Spot spread and outliers",
    intro:
      "A box plot shows the middle 50% of values as a box, the median as a line, and extreme values as separate dots.",
    when: [
      "You want to compare spread between groups",
      "You want to find outliers quickly",
      "You want the median and range in one view",
    ],
    why: "It summarizes a whole distribution in a small space.",
    example: "Revenue by Year: see if 2023 had more extreme orders than 2022.",
    needs: "Y: a numeric column. X (optional): a category to split by.",
  },
  heatmap: {
    label: "Heatmap",
    tagline: "Find strong patterns in a grid",
    intro:
      "A heatmap colors each cell of a grid by its value. Darker or brighter cells mean larger numbers.",
    when: [
      "You want to see which numeric columns relate to each other",
      "You have many columns and want a quick overview",
      "You want to compare two categories at once",
    ],
    why: "Color lets you scan dozens of values in a second.",
    example: "Correlation between all numeric columns: Quantity and Revenue light up together.",
    needs: "Usually no columns needed. It uses your numeric columns.",
  },
};

// Small drawings used on each card as a preview of the chart shape.
function MiniPreview({ type, active }: { type: string; active: boolean }) {
  const c = active ? "#1f766e" : "#94a3b8";
  const f = active ? "#bfe3dd" : "#e2e8f0";
  return (
    <svg viewBox="0 0 64 40" className="h-10 w-16" aria-hidden="true">
      {type === "histogram" && (
        <g fill={f} stroke={c} strokeWidth="1">
          <rect x="4" y="26" width="9" height="12" />
          <rect x="13" y="16" width="9" height="22" />
          <rect x="22" y="6" width="9" height="32" />
          <rect x="31" y="12" width="9" height="26" />
          <rect x="40" y="22" width="9" height="16" />
          <rect x="49" y="31" width="9" height="7" />
        </g>
      )}
      {type === "bar" && (
        <g fill={f} stroke={c} strokeWidth="1">
          <rect x="6" y="14" width="10" height="24" />
          <rect x="21" y="6" width="10" height="32" />
          <rect x="36" y="22" width="10" height="16" />
          <rect x="51" y="28" width="8" height="10" />
        </g>
      )}
      {type === "line" && (
        <g fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4,32 16,24 26,28 38,14 50,18 60,6" />
        </g>
      )}
      {type === "scatter" && (
        <g fill={c}>
          {[
            [8, 32], [14, 28], [20, 26], [24, 20], [30, 22], [36, 16], [42, 12], [48, 14], [55, 6], [18, 33], [34, 26], [50, 20],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="2" />
          ))}
        </g>
      )}
      {type === "box" && (
        <g fill={f} stroke={c} strokeWidth="1.5">
          <line x1="32" y1="3" x2="32" y2="12" />
          <rect x="20" y="12" width="24" height="16" />
          <line x1="20" y1="20" x2="44" y2="20" />
          <line x1="32" y1="28" x2="32" y2="37" />
          <line x1="26" y1="3" x2="38" y2="3" />
          <line x1="26" y1="37" x2="38" y2="37" />
        </g>
      )}
      {type === "heatmap" && (
        <g stroke="#fff" strokeWidth="1">
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3, 4].map((col) => (
              <rect
                key={`${r}-${col}`}
                x={4 + col * 11.5}
                y={3 + r * 9}
                width="11.5"
                height="9"
                fill={c}
                opacity={0.15 + (((r * 5 + col * 3) % 7) / 7) * 0.85}
              />
            ))
          )}
        </g>
      )}
    </svg>
  );
}

export default function Visualization() {
  const { dataset } = useDataset();
  const recs = useAsync(() => api.recommendCharts(dataset!.id), [dataset?.id]);
  const [type, setType] = useState("histogram");
  const [x, setX] = useState("");
  const [y, setY] = useState("");
  const [chart, setChart] = useState<Json>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const result = useRef<HTMLDivElement>(null);

  const build = async (body: Json, name: string) => {
    setBusy(true);
    setError(null);
    setChart(null);
    setLabel(name);
    try {
      const res = await api.visualize(dataset!.id, body);
      console.log("visualize request:", body, "response:", res);
      setChart(res ?? {});
      setTimeout(() => result.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const list: ChartRecommendation[] = Array.isArray(recs.data)
    ? recs.data
    : recs.data?.recommendations ?? recs.data?.charts ?? recs.data?.suggestions ?? [];

  const pickRec = (r: ChartRecommendation) => {
    const t = r.chart_type ?? r.type ?? "histogram";
    setType(t);
    setX(r.x ?? "");
    setY(r.y ?? "");
    build({ chart_type: t, x: r.x, y: r.y, agg: r.agg, bins: r.bins }, r.title ?? `${t}${r.x ? `: ${r.x}` : ""}${r.y ? ` by ${r.y}` : ""}`);
  };

  // Guide helpers (UI only). The selected card is the same `type` state used by the builder.
  const guide = GUIDE[type];
  const matchingRec = list.find((r) => (r.chart_type ?? r.type) === type);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Charts</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Suggested for this dataset</h2>
        {recs.loading ? <Loading /> : recs.error ? <ErrorMessage message={recs.error} /> : list.length === 0 ? (
          <p className="text-sm text-slate-500">No suggestions available.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((r, i) => (
              <button key={i} onClick={() => pickRec(r)} disabled={busy}
                className="rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-accent disabled:opacity-60">
                <p className="font-medium">{r.title ?? `${r.chart_type ?? r.type}${r.x ? `: ${r.x}` : ""}${r.y ? ` by ${r.y}` : ""}`}</p>
                {r.reason && <p className="mt-1 text-xs text-slate-500">{r.reason}</p>}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------- Chart guide cards ------------------------- */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Which chart should I use?</h2>
          <p className="text-sm text-slate-500">
            Pick a card to learn when to use that chart. Your choice is also set in the builder below.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6" role="tablist" aria-label="Chart types">
          {TYPES.map((t) => {
            const g = GUIDE[t];
            const active = type === t;
            return (
              <button
                key={t}
                role="tab"
                aria-selected={active}
                onClick={() => setType(t)}
                className={`flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  active
                    ? "border-accent bg-white ring-1 ring-accent"
                    : "border-slate-200 bg-white hover:border-accent"
                }`}
              >
                <MiniPreview type={t} active={active} />
                <span className="font-medium">{g.label}</span>
                <span className="text-xs text-slate-500">{g.tagline}</span>
              </button>
            );
          })}
        </div>

        {guide && (
          <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3" role="tabpanel">
            <div className="space-y-2 md:col-span-1">
              <h3 className="text-base font-semibold">{guide.label}</h3>
              <p className="text-sm text-slate-600">{guide.intro}</p>
              <p className="text-sm text-slate-600">
                <span className="font-medium text-slate-700">Why it helps: </span>
                {guide.why}
              </p>
            </div>

            <div className="space-y-2 md:col-span-1">
              <h4 className="text-sm font-semibold text-slate-700">Use it when</h4>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
                {guide.when.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-3 md:col-span-1">
              <div className="rounded-md bg-slate-50 p-3">
                <h4 className="text-sm font-semibold text-slate-700">Example</h4>
                <p className="mt-1 text-sm text-slate-600">{guide.example}</p>
              </div>
              <p className="text-xs text-slate-500">
                <span className="font-medium text-slate-600">Columns: </span>
                {guide.needs}
              </p>
              {matchingRec ? (
                <button
                  disabled={busy}
                  onClick={() => pickRec(matchingRec)}
                  className="w-full rounded bg-accent px-3 py-2 text-sm text-white hover:bg-accent-dark disabled:opacity-50"
                >
                  Try it on my data
                </button>
              ) : (
                <p className="text-xs text-slate-400">
                  No suggestion for this chart yet. Enter columns below and build it yourself.
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-4">
        <label className="text-sm"><span className="mb-1 block text-slate-600">Chart type</span>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-2">
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="text-sm"><span className="mb-1 block text-slate-600">X column</span>
          <input value={x} onChange={(e) => setX(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-2" /></label>
        <label className="text-sm"><span className="mb-1 block text-slate-600">Y column</span>
          <input value={y} onChange={(e) => setY(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-2" /></label>
        <div className="flex items-end">
          <button disabled={busy} onClick={() => build({ chart_type: type, x: x || undefined, y: y || undefined }, `${type}${x ? `: ${x}` : ""}${y ? ` / ${y}` : ""}`)}
            className="w-full rounded bg-accent px-4 py-2 text-white hover:bg-accent-dark disabled:opacity-50">{busy ? "Building…" : "Build chart"}</button>
        </div>
      </section>

      <div ref={result} className="space-y-4">
        {busy && <Loading label="Building chart" />}
        {error && <ErrorMessage message={`Chart request failed: ${error}`} />}
        {chart && (
          <>
            <ChartCard title={label}><PlotlyChart chart={chart} /></ChartCard>
            <details className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
              <summary className="cursor-pointer text-slate-600">Raw response from the backend</summary>
              <pre className="mt-2 max-h-72 overflow-auto text-xs">{JSON.stringify(chart, null, 2)}</pre>
            </details>
          </>
        )}
      </div>
    </div>
  );
}