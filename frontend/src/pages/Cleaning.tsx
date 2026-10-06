import { useState } from "react";
import { ErrorMessage } from "../components/Loading";
import { JsonView } from "../components/DataTable";
import { api } from "../services/api";
import { useDataset } from "../hooks/useDataset";
import type { Json } from "../types/dataset";

// Operation names must match what the backend cleaning service accepts (see /docs).
const OPERATIONS = [
  { value: "remove_duplicates", label: "Remove duplicate rows", needsColumn: false },
  { value: "fill_mean", label: "Fill missing with mean", needsColumn: true },
  { value: "fill_median", label: "Fill missing with median", needsColumn: true },
  { value: "fill_mode", label: "Fill missing with most common value", needsColumn: true },
  { value: "drop_missing", label: "Drop rows with missing values", needsColumn: false },
  { value: "drop_column", label: "Drop column", needsColumn: true },
];

export default function Cleaning() {
  const { dataset } = useDataset();
  const [operation, setOperation] = useState(OPERATIONS[0].value);
  const [column, setColumn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Json>(null);

  const op = OPERATIONS.find((o) => o.value === operation)!;

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await api.clean(dataset!.id, { operation, ...(op.needsColumn ? { column } : {}) }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="text-2xl font-semibold">Cleaning</h1>
      <p className="text-slate-600">Each step saves a new version. Your original file stays untouched.</p>

      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Operation</span>
          <select value={operation} onChange={(e) => setOperation(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-2">
            {OPERATIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        {op.needsColumn && (
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Column name</span>
            <input value={column} onChange={(e) => setColumn(e.target.value)} placeholder="e.g. price" className="w-full rounded border border-slate-300 px-2 py-2" />
          </label>
        )}
        <div className="sm:col-span-2">
          <button onClick={run} disabled={busy || (op.needsColumn && !column.trim())} className="rounded bg-accent px-5 py-2 text-white hover:bg-accent-dark disabled:opacity-50">
            {busy ? "Applying…" : "Apply cleaning"}
          </button>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}
      {result && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Result</h2>
          <JsonView data={result} />
        </section>
      )}
    </div>
  );
}
