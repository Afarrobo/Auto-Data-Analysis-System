import { useState } from "react";
import Loading, { ErrorMessage } from "../components/Loading";
import { JsonView } from "../components/DataTable";
import { api } from "../services/api";
import { useAsync, useDataset } from "../hooks/useDataset";

export default function EDA() {
  const { dataset } = useDataset();
  const [tab, setTab] = useState<"statistics" | "eda">("statistics");
  const { data, loading, error } = useAsync(
    () => (tab === "statistics" ? api.statistics(dataset!.id) : api.eda(dataset!.id)),
    [dataset?.id, tab]
  );

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Exploratory analysis</h1>
      <div className="flex gap-2" role="tablist">
        {([["statistics", "Statistics"], ["eda", "Univariate and bivariate"]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`rounded px-4 py-1.5 text-sm ${tab === k ? "bg-accent text-white" : "border border-slate-300 bg-white hover:bg-slate-50"}`}>
            {l}
          </button>
        ))}
      </div>
      {loading ? <Loading /> : error ? <ErrorMessage message={error} /> : <JsonView data={data} />}
    </div>
  );
}
