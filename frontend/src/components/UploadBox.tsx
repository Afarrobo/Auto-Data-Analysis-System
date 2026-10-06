import { useEffect, useRef, useState } from "react";

// Same props as before: Upload.tsx keeps working without changes to its logic.
type Props = { onFile: (file: File) => void; busy?: boolean };

const ACCEPT = ".csv,.xlsx,.xls,.json";
const ALLOWED = ["csv", "xlsx", "xls", "json"];
const STEPS = ["Uploading file", "Reading columns", "Profiling data"];

const ext = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

const fmtSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function UploadBox({ onFile, busy = false }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [step, setStep] = useState(0);

  // Walk through the progress steps while the upload request is running.
  useEffect(() => {
    if (!busy) return;
    setStep(0);
    const id = window.setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 1400);
    return () => window.clearInterval(id);
  }, [busy]);

  const accept = (f: File | undefined | null) => {
    if (!f || busy) return;
    if (!ALLOWED.includes(ext(f.name))) {
      setLocalError(`"${f.name}" is not supported. Choose a CSV, Excel or JSON file.`);
      setShake((n) => n + 1);
      return;
    }
    setLocalError(null);
    setFile(f);
    onFile(f);
  };

  const pick = () => !busy && input.current?.click();

  const progress = busy ? ((step + 1) / STEPS.length) * 88 : 0;

  return (
    <div className="space-y-3">
      <div
        onDragEnter={(e) => { e.preventDefault(); if (!busy) setDragging(true); }}
        onDragOver={(e) => { e.preventDefault(); if (!busy) setDragging(true); }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files?.[0]);
        }}
        onClick={() => !file && pick()}
        className={`relative overflow-hidden rounded-2xl border-2 border-dashed bg-white/90 px-6 py-12 text-center backdrop-blur transition-all duration-300 ${
          dragging
            ? "scale-[1.02] border-accent bg-white shadow-xl shadow-teal-900/10"
            : "border-slate-300 hover:border-accent"
        } ${!file && !busy ? "cursor-pointer" : ""}`}
      >
        {/* pulsing ring while a file is dragged over the box */}
        {dragging && <span className="upload-ring pointer-events-none absolute inset-0 rounded-2xl" />}

        {!file ? (
          <div className="relative flex flex-col items-center gap-3">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-accent ${dragging ? "upload-float" : ""}`}>
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 16V4" />
                <path d="M7 9l5-5 5 5" />
                <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
              </svg>
            </div>
            <p className="text-lg font-semibold">{dragging ? "Release to upload" : "Drop a dataset here"}</p>
            <p className="text-sm text-slate-500">CSV, Excel or JSON</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); pick(); }}
              className="mt-2 rounded-lg bg-accent px-5 py-2.5 text-white transition hover:bg-accent-dark active:scale-95"
            >
              Choose file
            </button>
            <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs text-slate-500">
              {["CSV", "XLSX", "JSON"].map((t) => (
                <span key={t} className="rounded-full border border-slate-200 bg-white px-2.5 py-1">{t}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="upload-pop relative mx-auto max-w-md space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-sm font-semibold uppercase text-accent">
                {ext(file.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{file.name}</p>
                <p className="text-xs text-slate-500">{fmtSize(file.size)}</p>
              </div>
              {!busy && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setLocalError(null); if (input.current) input.current.value = ""; }}
                  className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
                  aria-label="Remove file"
                >
                  Remove
                </button>
              )}
            </div>

            {busy ? (
              <div className="space-y-3" aria-live="polite">
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="upload-shimmer h-full rounded-full bg-accent transition-all duration-1000 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <ul className="space-y-1.5 text-sm">
                  {STEPS.map((s, i) => (
                    <li key={s} className={`flex items-center gap-2 transition-colors ${i <= step ? "text-slate-800" : "text-slate-400"}`}>
                      <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                        i < step ? "bg-accent text-white" : i === step ? "border-2 border-accent" : "border border-slate-300"
                      }`}>
                        {i < step ? "✓" : ""}
                      </span>
                      {s}{i === step ? "…" : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); pick(); }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm transition hover:border-accent"
              >
                Choose another file
              </button>
            )}
          </div>
        )}

        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ""; }}
        />
      </div>

      {localError && (
        <p key={shake} role="alert" className="upload-shake rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {localError}
        </p>
      )}
    </div>
  );
}