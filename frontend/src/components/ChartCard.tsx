import createPlotlyComponent from "react-plotly.js/factory";
import Plotly from "plotly.js-dist-min";
import type { ReactNode } from "react";
import type { Json } from "../types/dataset";
import { JsonView } from "./DataTable";

const factory: typeof createPlotlyComponent = (createPlotlyComponent as Json).default ?? createPlotlyComponent;
const Plot = factory(Plotly);

const COLOR = "#1f6f6b";
const isArr = Array.isArray;
const isObj = (v: Json) => v !== null && typeof v === "object" && !isArr(v);

const pick = (o: Json, keys: string[]): Json => {
  for (const k of keys) if (o && o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
};

// Turns {a:{a:1,b:.3}, b:{a:.3,b:1}} into labels + matrix.
function dictMatrix(o: Json): { labels: string[]; z: Json[][] } | null {
  if (!isObj(o)) return null;
  const keys = Object.keys(o);
  if (keys.length < 2 || !keys.every((k) => isObj(o[k]))) return null;
  return { labels: keys, z: keys.map((k) => keys.map((j) => o[k][j] ?? null)) };
}

// Converts whatever chart payload the backend returns into a Plotly figure.
export function toFigure(raw: Json): { data: Json[]; layout: Json } | null {
  if (!raw || typeof raw !== "object") return null;

  let c: Json = raw;
  for (const k of ["figure", "chart", "result"]) if (isObj(c[k])) c = c[k];

  // 1. Already a Plotly figure
  if (isArr(c.data) && c.data.length && isObj(c.data[0]) && (c.data[0].type || c.data[0].x || c.data[0].y || c.data[0].z)) {
    return { data: c.data, layout: c.layout ?? {} };
  }

  const type = String(pick(c, ["chart_type", "type", "kind"]) ?? "").toLowerCase();
  const d: Json = isObj(c.data) ? { ...c, ...c.data } : c;
  const xName = typeof d.x === "string" ? d.x : d.x_label ?? d.x_title ?? d.xlabel;
  const yName = typeof d.y === "string" ? d.y : d.y_label ?? d.y_title ?? d.ylabel;
  const title = pick(c, ["title"]);
  const layout: Json = {
    title: title ? { text: String(title) } : undefined,
    xaxis: { title: { text: xName } },
    yaxis: { title: { text: yName } },
  };

  // 2. Heatmap
  const zRaw = pick(d, ["z", "matrix", "values", "correlation"]);
  if (type.includes("heat") || type.includes("corr") || (isArr(zRaw) && isArr(zRaw[0]))) {
    let z: Json = isArr(zRaw) && isArr(zRaw[0]) ? zRaw : null;
    let xl: Json = pick(d, ["columns", "labels", "x_labels"]) ?? (isArr(d.x) ? d.x : undefined);
    let yl: Json = pick(d, ["rows", "y_labels"]) ?? (isArr(d.y) ? d.y : xl);
    if (!z) {
      const dm = dictMatrix(zRaw) ?? dictMatrix(d.correlation) ?? dictMatrix(d.data);
      if (dm) { z = dm.z; xl = dm.labels; yl = dm.labels; }
    }
    if (z) {
      return { data: [{ type: "heatmap", z, x: xl, y: yl, colorscale: "RdBu", zmid: 0 }], layout: { ...layout, yaxis: { autorange: "reversed" } } };
    }
  }

  // 3. Box plot
  if (type.includes("box")) {
    const s: Json = pick(d, ["stats", "summary", "box"]) ?? d;
    const q1 = pick(s, ["q1", "Q1", "25%", "p25"]);
    const med = pick(s, ["median", "q2", "50%", "p50"]);
    const q3 = pick(s, ["q3", "Q3", "75%", "p75"]);
    if (q1 !== undefined && med !== undefined && q3 !== undefined) {
      const lo = pick(s, ["lowerfence", "lower_fence", "whisker_low", "lower_whisker", "min"]);
      const hi = pick(s, ["upperfence", "upper_fence", "whisker_high", "upper_whisker", "max"]);
      const name = typeof d.y === "string" ? d.y : typeof d.x === "string" ? d.x : "value";
      const traces: Json[] = [{ type: "box", name, q1: [q1], median: [med], q3: [q3], lowerfence: [lo ?? q1], upperfence: [hi ?? q3], mean: s.mean !== undefined ? [s.mean] : undefined, marker: { color: COLOR } }];
      const out = pick(d, ["outliers", "outlier_values"]);
      if (isArr(out) && out.length && out.every((v: Json) => typeof v === "number")) {
        traces.push({ type: "scatter", mode: "markers", name: "outliers", x: out.map(() => name), y: out, marker: { color: "#b45309", size: 5 } });
      }
      return { data: traces, layout };
    }
    const vals = pick(d, ["values", "data", "y", "sample"]);
    if (isArr(vals) && vals.every((v: Json) => typeof v === "number")) {
      return { data: [{ type: "box", y: vals, name: yName ?? xName ?? "value", marker: { color: COLOR } }], layout };
    }
    if (isArr(d.groups)) {
      return { data: d.groups.map((g: Json) => ({ type: "box", name: g.name ?? g.label, y: g.values ?? g.data })), layout };
    }
  }

  // 4. Histogram (bin edges + counts)
  const counts = pick(d, ["counts", "count", "frequency", "hist", "values", "y"]);
  const edges = pick(d, ["bin_edges", "edges", "bins", "x"]);
  if ((type.includes("hist") || isArr(d.bins) || isArr(d.bin_edges)) && isArr(counts) && isArr(edges) && counts.every((v: Json) => typeof v === "number")) {
    if (edges.length === counts.length + 1 && edges.every((v: Json) => typeof v === "number")) {
      const centers = counts.map((_: Json, i: number) => (edges[i] + edges[i + 1]) / 2);
      const widths = counts.map((_: Json, i: number) => edges[i + 1] - edges[i]);
      return { data: [{ type: "bar", x: centers, y: counts, width: widths, marker: { color: COLOR } }], layout: { ...layout, bargap: 0.02 } };
    }
    return { data: [{ type: "bar", x: edges, y: counts, marker: { color: COLOR } }], layout };
  }

  // 5. Generic x/y: parallel arrays or array of row objects
  let xs: Json = isArr(d.x) ? d.x : pick(d, ["labels", "categories", "x_values", "index", "bin_centers"]);
  let ys: Json = isArr(d.y) ? d.y : pick(d, ["values", "counts", "count", "y_values", "series"]);
  if (!(isArr(xs) && isArr(ys))) {
    const rows = pick(d, ["points", "rows", "records", "data", "items"]);
    if (isArr(rows) && rows.length) {
      if (isArr(rows[0]) && rows[0].length >= 2) {
        xs = rows.map((r: Json) => r[0]); ys = rows.map((r: Json) => r[1]);
      } else if (isObj(rows[0])) {
        const keys = Object.keys(rows[0]);
        const xk = typeof d.x === "string" && keys.includes(d.x) ? d.x : keys.includes("x") ? "x" : keys.includes("label") ? "label" : keys[0];
        const yk = typeof d.y === "string" && keys.includes(d.y) ? d.y : keys.includes("y") ? "y" : keys.includes("value") ? "value" : keys.find((k) => k !== xk && typeof rows[0][k] === "number") ?? keys[1];
        xs = rows.map((r: Json) => r[xk]); ys = rows.map((r: Json) => r[yk]);
      }
    }
  }
  if (isArr(xs) && isArr(ys)) {
    const kind = type.includes("scatter") ? { type: "scatter", mode: "markers" }
      : type.includes("line") ? { type: "scatter", mode: "lines+markers" }
      : { type: "bar" };
    return { data: [{ ...kind, x: xs, y: ys, marker: { color: COLOR }, line: { color: COLOR } }], layout };
  }

  // 6. Raw numeric values only
  const only = pick(d, ["values", "data"]);
  if (isArr(only) && only.length && only.every((v: Json) => typeof v === "number")) {
    return { data: [{ type: "histogram", x: only, marker: { color: COLOR } }], layout };
  }
  return null;
}

export function PlotlyChart({ chart, height = 420 }: { chart: Json; height?: number }) {
  const fig = toFigure(chart);
  if (!fig) {
    return (
      <div>
        <p className="mb-2 text-sm text-amber-700">This chart format is not recognised yet, so the raw data is shown below.</p>
        <JsonView data={chart} />
      </div>
    );
  }
  return (
    <Plot
      data={fig.data}
      layout={{ autosize: true, height, margin: { l: 55, r: 20, t: 40, b: 55 }, paper_bgcolor: "rgba(0,0,0,0)", font: { family: "Segoe UI, system-ui, sans-serif" }, ...fig.layout }}
      config={{ responsive: true, displaylogo: false }}
      style={{ width: "100%", height }}
      useResizeHandler
    />
  );
}

export default function ChartCard({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  );
}