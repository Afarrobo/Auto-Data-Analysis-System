import StatCard from "../components/StatCard";
import Loading, { ErrorMessage } from "../components/Loading";
import { JsonView } from "../components/DataTable";
import { api } from "../services/api";
import { useAsync, useDataset } from "../hooks/useDataset";

export default function Overview() {
  const { dataset } = useDataset();
  const { data, loading, error } = useAsync(() => api.profile(dataset!.id), [dataset?.id]);

  if (loading) return <Loading label="Profiling dataset" />;
  if (error) return <ErrorMessage message={error} />;

  const rows = Number(data?.rows ?? 0);
  const cols = Number(data?.columns ?? 0);
  const missing = Number(data?.missing_values ?? 0);
  const cells = rows * cols;
  const memory = Number(data?.memory_usage ?? 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Overview</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard title="Rows" value={rows} />
        <StatCard title="Columns" value={cols} />
        <StatCard title="Missing" value={cells ? `${((missing / cells) * 100).toFixed(1)}%` : "0%"} hint={`${missing.toLocaleString()} cells`} />
        <StatCard title="Duplicates" value={Number(data?.duplicates ?? 0)} />
        <StatCard title="Memory" value={`${(memory / 1024 / 1024).toFixed(1)} MB`} />
      </div>
      <JsonView data={data} />
    </div>
  );
}
