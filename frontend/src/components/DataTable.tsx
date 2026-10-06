import type { Json } from "../types/dataset";

const isObj = (v: Json) => v !== null && typeof v === "object" && !Array.isArray(v);
const isPrim = (v: Json) => v === null || typeof v !== "object";

export const fmt = (v: Json): string => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 4 });
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

const label = (k: string) => k.replace(/_/g, " ");

export default function DataTable({ rows, maxRows = 200 }: { rows: Record<string, Json>[]; maxRows?: number }) {
  if (!rows.length) return <p className="text-sm text-slate-500">No rows.</p>;
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-600">
          <tr>
            {cols.map((c) => (
              <th key={c} className="whitespace-nowrap px-3 py-2 font-medium">{label(c)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, maxRows).map((r, i) => (
            <tr key={i} className="border-t border-slate-100">
              {cols.map((c) => (
                <td key={c} className="whitespace-nowrap px-3 py-1.5 tabular-nums">{fmt(r[c])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > maxRows && <p className="px-3 py-2 text-xs text-slate-500">Showing {maxRows} of {rows.length} rows.</p>}
    </div>
  );
}

// Dict of dicts, e.g. { colA: { mean: 1, std: 2 }, colB: {...} }  ->  table with a row per key.
function dictOfDicts(v: Json): Record<string, Json>[] | null {
  if (!isObj(v)) return null;
  const vals = Object.values(v);
  if (vals.length < 2 || !vals.every((x) => isObj(x) && Object.values(x as object).every(isPrim))) return null;
  return Object.entries(v).map(([k, x]) => ({ name: k, ...(x as object) }));
}

// Renders any JSON from the backend as readable tables and key/value grids.
export function JsonView({ data, depth = 0 }: { data: Json; depth?: number }) {
  if (isPrim(data)) return <span>{fmt(data)}</span>;

  if (Array.isArray(data)) {
    if (data.length && data.every(isObj) && data.every((r) => Object.values(r).every(isPrim))) {
      return <DataTable rows={data} />;
    }
    if (data.every(isPrim)) return <p className="text-sm">{data.map(fmt).join(", ") || "—"}</p>;
    return (
      <div className="space-y-3">
        {data.map((d, i) => (
          <div key={i} className="rounded border border-slate-200 bg-white p-3"><JsonView data={d} depth={depth + 1} /></div>
        ))}
      </div>
    );
  }

  const table = dictOfDicts(data);
  if (table) return <DataTable rows={table} />;

  const entries = Object.entries(data);
  const prims = entries.filter(([, v]) => isPrim(v));
  const nested = entries.filter(([, v]) => !isPrim(v));
  return (
    <div className="space-y-4">
      {prims.length > 0 && (
        <dl className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
          {prims.map(([k, v]) => (
            <div key={k} className="rounded border border-slate-200 bg-white px-3 py-2">
              <dt className="text-xs text-slate-500">{label(k)}</dt>
              <dd className="text-sm font-medium tabular-nums">{fmt(v)}</dd>
            </div>
          ))}
        </dl>
      )}
      {nested.map(([k, v]) => (
        <section key={k}>
          <h3 className={`mb-2 font-semibold ${depth === 0 ? "text-base" : "text-sm"}`}>{label(k)}</h3>
          <JsonView data={v} depth={depth + 1} />
        </section>
      ))}
    </div>
  );
}
