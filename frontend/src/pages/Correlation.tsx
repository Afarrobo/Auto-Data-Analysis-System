import ChartCard, { PlotlyChart } from "../components/ChartCard";
import Loading, { ErrorMessage } from "../components/Loading";
import { JsonView } from "../components/DataTable";
import { api } from "../services/api";
import { useAsync, useDataset } from "../hooks/useDataset";
import type { Json } from "../types/dataset";

// Finds a correlation matrix in the response: {a:{a:1,b:.4}, b:{...}} or {columns, matrix}.
function findMatrix(obj: Json, depth = 0): Json | null {
  if (!obj || typeof obj !== "object" || depth > 3) return null;
  if (Array.isArray(obj.matrix) && (obj.columns || obj.labels)) return { z: obj.matrix, labels: obj.columns ?? obj.labels };
  if (Array.isArray(obj.z) && (obj.x || obj.labels || obj.columns)) return { z: obj.z, labels: obj.x ?? obj.labels ?? obj.columns };
  const keys = Object.keys(obj);
  if (keys.length > 1 && keys.every((k) => obj[k] && typeof obj[k] === "object" && !Array.isArray(obj[k]) && keys.every((j) => typeof obj[k][j] === "number" || obj[k][j] === null))) {
    return { z: keys.map((k) => keys.map((j) => obj[k][j])), labels: keys };
  }
  for (const v of Object.values(obj)) {
    const m = findMatrix(v, depth + 1);
    if (m) return m;
  }
  return null;
}

export default function Correlation() {
  const { dataset } = useDataset();
  const { data, loading, error } = useAsync(() => api.correlation(dataset!.id), [dataset?.id]);

  if (loading) return <Loading label="Calculating correlations" />;
  if (error) return <ErrorMessage message={error} />;

  const m = findMatrix(data);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Correlation</h1>
      {m && (
        <ChartCard title="Correlation heatmap">
          <PlotlyChart chart={{ data: [{ type: "heatmap", z: m.z, x: m.labels, y: m.labels, colorscale: "RdBu", zmid: 0, zmin: -1, zmax: 1 }], layout: { yaxis: { autorange: "reversed" } } }} height={520} />
        </ChartCard>
      )}
      <details open={!m}>
        <summary className="cursor-pointer text-sm text-slate-600">Raw values</summary>
        <div className="mt-3"><JsonView data={data} /></div>
      </details>
    </div>
  );
}
