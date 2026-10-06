import Loading, { ErrorMessage } from "../components/Loading";
import { JsonView } from "../components/DataTable";
import { api } from "../services/api";
import { useAsync, useDataset } from "../hooks/useDataset";

export default function AIInsights() {
  const { dataset } = useDataset();
  const { data, loading, error } = useAsync(() => api.aiInsights(dataset!.id), [dataset?.id]);

  const text: string | null = typeof data === "string" ? data : data?.summary ?? data?.insights_text ?? null;
  const list: string[] | null = Array.isArray(data?.insights) && data.insights.every((i: unknown) => typeof i === "string") ? data.insights : null;

  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="text-2xl font-semibold">AI insights</h1>
      {loading ? <Loading label="Asking the model" /> : error ? (
        <ErrorMessage message={error.includes("503") || /api.?key/i.test(error) ? `${error} — set ANTHROPIC_API_KEY for the backend and restart uvicorn.` : error} />
      ) : (
        <>
          {text && <p className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-4 leading-relaxed">{text}</p>}
          {list && <ul className="list-disc space-y-2 rounded-lg border border-slate-200 bg-white p-4 pl-8">{list.map((i, k) => <li key={k}>{i}</li>)}</ul>}
          {!text && !list && <JsonView data={data} />}
        </>
      )}
    </div>
  );
}
