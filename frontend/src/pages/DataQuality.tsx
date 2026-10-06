import { useState } from "react";
import Loading, { ErrorMessage } from "../components/Loading";
import { JsonView } from "../components/DataTable";
import { api } from "../services/api";
import { useAsync, useDataset } from "../hooks/useDataset";

export default function DataQuality() {
  const { dataset } = useDataset();
  const [method, setMethod] = useState("iqr");
  const quality = useAsync(() => api.quality(dataset!.id), [dataset?.id]);
  const outliers = useAsync(() => api.outliers(dataset!.id, method), [dataset?.id, method]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Data quality</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Missing values and duplicates</h2>
        {quality.loading ? <Loading /> : quality.error ? <ErrorMessage message={quality.error} /> : <JsonView data={quality.data} />}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Outliers</h2>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="rounded border border-slate-300 bg-white px-2 py-1 text-sm" aria-label="Outlier method">
            <option value="iqr">IQR</option>
            <option value="zscore">Z-score</option>
            <option value="isolation_forest">Isolation Forest</option>
          </select>
        </div>
        {outliers.loading ? <Loading /> : outliers.error ? <ErrorMessage message={outliers.error} /> : <JsonView data={outliers.data} />}
      </section>
    </div>
  );
}
