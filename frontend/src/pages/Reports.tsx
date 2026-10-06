import { useState } from "react";
import { ErrorMessage } from "../components/Loading";
import { api } from "../services/api";
import { useDataset } from "../hooks/useDataset";

export default function Reports() {
  const { dataset } = useDataset();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    if (!dataset) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await api.report(dataset.id, false); // AI summary always off
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${dataset.filename.replace(/\.[^.]+$/, "")}-report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <p className="text-slate-600">
        Download a PDF with the profile, quality checks and statistics for this dataset.
      </p>
      <button
        onClick={download}
        disabled={busy}
        className="rounded bg-accent px-5 py-2 text-white hover:bg-accent-dark disabled:opacity-50"
      >
        {busy ? "Generating…" : "Download PDF report"}
      </button>
      {error && <ErrorMessage message={error} />}
    </div>
  );
}