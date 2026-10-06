import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorMessage } from "../components/Loading";
import { api } from "../services/api";
import { useDataset } from "../hooks/useDataset";

const OK_EXT = [".csv", ".xlsx", ".xls", ".json"];
const STEPS = ["Uploading", "Reading columns", "Profiling data"];

const NEXT = [
  { emoji: "🔍", title: "Check quality", text: "Missing values and duplicates are found for you." },
  { emoji: "🧼", title: "Clean it", text: "Fix problems with a few clicks." },
  { emoji: "💬", title: "Chart and ask", text: "See charts and ask in plain words." },
];

const AVOID = [
  "Passwords and API keys",
  "ID, passport or card numbers",
  "Bank and payment details",
  "Medical records",
  "Private contact details",
];

const SAMPLE_CSV = `date,region,product,units,revenue
2026-01-04,North,Widget,12,240
2026-01-09,South,Gadget,7,315
2026-01-15,East,Widget,20,400
2026-02-02,West,Gizmo,5,275
2026-02-11,North,Gadget,9,405
2026-02-20,South,Widget,15,300
2026-03-03,East,Gizmo,11,605
2026-03-18,West,Widget,18,360`;

const STYLES = `
.face .mouth{transform-box:fill-box;transform-origin:center;transition:transform .2s}
.face.open .mouth{transform:scale(1.15,2.6)}
.face.chew .mouth{animation:up-chew .45s ease-in-out infinite}
.face.happy .mouth{transform:scale(1.1,.5)}
.face.sad .mouth{transform:translateY(6px) scale(.7,.5)}
.face.idle,.face.open{animation:up-bob 3s ease-in-out infinite}
.face.chew{animation:up-wiggle .9s ease-in-out infinite}
@keyframes up-bob{50%{transform:translateY(-6px)}}
@keyframes up-chew{50%{transform:scale(1,2.2)}}
@keyframes up-wiggle{25%{transform:rotate(-3deg)}75%{transform:rotate(3deg)}}
@keyframes up-pulse{50%{transform:scale(1.5)}}
.up-pulse{animation:up-pulse 1s infinite}
@media (prefers-reduced-motion: reduce){.face,.face .mouth,.up-pulse{animation:none!important;transition:none!important}}
`;

type Phase = "idle" | "drag" | "busy" | "done" | "error";

const BODY: Record<string, string> = {
  idle: "#6366f1", open: "#6366f1", chew: "#6366f1", happy: "#10b981", sad: "#f87171",
};

export default function Upload() {
  const { setDataset } = useDataset();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showTips, setShowTips] = useState(false);
  const [look, setLook] = useState({ x: 0, y: 0 });

  const faceRef = useRef<SVGSVGElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);

  // eyes follow the cursor
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const r = faceRef.current?.getBoundingClientRect();
      if (!r) return;
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 200) * 5;
      setLook({ x: (dx / d) * k, y: (dy / d) * k });
    };
    window.addEventListener("pointermove", move);
    return () => {
      window.removeEventListener("pointermove", move);
      timers.current.forEach(clearTimeout);
    };
  }, []);

  const handle = async (file: File) => {
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    setFileName(file.name);
    if (!OK_EXT.includes(ext)) {
      setError(`${ext} files aren't supported. Try CSV, Excel or JSON.`);
      setPhase("error");
      return;
    }
    setError(null);
    setStep(0);
    setPhase("busy");
    // api.upload gives no progress events, so the steps advance on a short timer
    timers.current = [
      window.setTimeout(() => setStep(1), 700),
      window.setTimeout(() => setStep(2), 1600),
    ];
    try {
      const res = await api.upload(file);
      const id = res?.dataset_id ?? res?.id ?? res?.dataset?.id;
      if (!id) throw new Error("Upload worked, but the response had no dataset id. Check the upload response in /docs.");
      timers.current.forEach(clearTimeout);
      setStep(3);
      setPhase("done");
      setDataset({ id: String(id), filename: res?.filename ?? file.name });
      window.setTimeout(() => navigate("/overview"), 900);
    } catch (e) {
      timers.current.forEach(clearTimeout);
      setError((e as Error).message);
      setPhase("error");
    }
  };

  const trySample = () =>
    handle(new File([SAMPLE_CSV], "sample_sales.csv", { type: "text/csv" }));

  const mood =
    phase === "drag" ? "open" : phase === "busy" ? "chew" : phase === "done" ? "happy" : phase === "error" ? "sad" : "idle";

  const headline = {
    idle: "Feed me a spreadsheet",
    drag: "Yes! Drop it!",
    busy: "Nom nom nom…",
    done: "Tasty. Taking you in…",
    error: "Hmm, that didn't work",
  }[phase];

  const border =
    phase === "drag" ? "border-indigo-500 bg-indigo-50 scale-[1.03] -rotate-1"
    : phase === "done" ? "border-emerald-400 border-solid"
    : phase === "error" ? "border-red-300"
    : "border-indigo-200";

  return (
    <div className="mx-auto max-w-xl space-y-5 py-10">
      <style>{STYLES}</style>

      <div
        onDragOver={(e) => { e.preventDefault(); if (phase === "idle") setPhase("drag"); }}
        onDragLeave={() => phase === "drag" && setPhase("idle")}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) handle(f); else setPhase("idle");
        }}
        className={`rounded-[2rem] border-[3px] border-dashed bg-white px-7 py-9 text-center shadow-sm transition-all duration-300 ease-out ${border}`}
      >
        <svg ref={faceRef} className={`face ${mood} mx-auto mb-2 block h-auto w-36 overflow-visible`} viewBox="0 0 160 140" aria-hidden="true">
          <rect x="10" y="14" width="140" height="116" rx="38" fill={BODY[mood]} style={{ transition: "fill .3s" }} />
          <circle cx="56" cy="60" r="15" fill="#fff" />
          <circle cx="104" cy="60" r="15" fill="#fff" />
          <circle cx={56 + look.x} cy={60 + look.y} r="7" fill="#1e1b4b" />
          <circle cx={104 + look.x} cy={60 + look.y} r="7" fill="#1e1b4b" />
          <ellipse className="mouth" cx="80" cy="100" rx="20" ry="9" fill="#1e1b4b" />
        </svg>

        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{headline}</h1>

        {(phase === "idle" || phase === "drag") && (
          <>
            <p className="mx-auto mb-6 mt-2 max-w-sm text-slate-600">
              Drop a CSV, Excel or JSON file anywhere on this card. It's profiled the moment it arrives.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => inputRef.current?.click()}
                className="rounded-full bg-slate-900 px-6 py-3 font-semibold text-white shadow-[0_4px_0_#6366f1] transition hover:-translate-y-0.5 hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              >
                Choose a file
              </button>
              <button
                onClick={trySample}
                className="rounded-full bg-indigo-50 px-6 py-3 font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              >
                Try sample data
              </button>
            </div>
          </>
        )}

        {phase === "busy" && (
          <div className="mx-auto mt-4 max-w-xs text-left" role="status">
            <ul className="grid gap-2">
              {STEPS.map((s, i) => (
                <li key={s} className={`flex items-center gap-3 font-semibold ${i <= step ? "text-slate-900" : "text-slate-400"}`}>
                  <span
                    className={`h-3 w-3 rounded-full ${i < step ? "bg-emerald-400" : i === step ? "up-pulse bg-amber-400" : "bg-slate-200"}`}
                  />
                  {s}
                </li>
              ))}
            </ul>
            <p className="mt-3 truncate text-sm text-slate-500">{fileName}</p>
          </div>
        )}

        {phase === "done" && (
          <p className="mt-2 text-slate-600"><b>{fileName}</b> is ready.</p>
        )}

        {phase === "error" && (
          <>
            <p className="mx-auto mb-5 mt-2 max-w-sm text-red-600">{error}</p>
            <button
              onClick={() => setPhase("idle")}
              className="rounded-full bg-slate-900 px-6 py-3 font-semibold text-white shadow-[0_4px_0_#6366f1] transition hover:-translate-y-0.5 active:scale-95"
            >
              Try again
            </button>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          hidden
          accept={OK_EXT.join(",")}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handle(f);
            e.target.value = "";
          }}
        />
      </div>

      {/* Privacy note: one small line that expands */}
      <div className="text-center">
        <button
          onClick={() => setShowTips((v) => !v)}
          aria-expanded={showTips}
          className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          <span className="mr-2 inline-grid h-[18px] w-[18px] place-items-center rounded-full bg-amber-300 text-xs font-extrabold text-slate-900">!</span>
          Keep it safe: use sample or anonymised data
        </button>
        {showTips && (
          <aside role="note" className="mx-auto mt-2 max-w-md rounded-2xl bg-amber-50 p-4 text-left text-sm text-amber-900">
            <p>
              Uploaded files are stored on the server, and AI features may send your questions and results to an external AI
              service. Remove personal columns first. Don't upload:
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {AVOID.map((a) => (
                <li key={a} className="rounded-full border border-amber-300 bg-white/80 px-3 py-1 text-xs font-medium">
                  {a}
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>

      {error && phase !== "error" && <ErrorMessage message={error} />}

      <div className="grid gap-3 pt-2 sm:grid-cols-3">
        {NEXT.map((n) => (
          <div
            key={n.title}
            className="rounded-2xl border border-slate-200 bg-white/70 p-3 transition-transform duration-200 hover:-translate-y-1 hover:shadow-md"
          >
            <p className="text-sm font-semibold">{n.emoji} {n.title}</p>
            <p className="mt-1 text-xs text-slate-500">{n.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}