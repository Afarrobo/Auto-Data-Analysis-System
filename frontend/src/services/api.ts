import type { Json } from "../types/dataset";

const BASE: string = import.meta.env.VITE_API_URL ?? "";
const DS = `${BASE}/api/datasets`;

async function request<T = Json>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error("Cannot reach the backend. Is uvicorn running on port 8000?");
  }
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      const d = body?.detail ?? body;
      msg = typeof d === "string" ? d : JSON.stringify(d);
    } catch {
      /* keep default message */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

const post = (url: string, body?: Json) =>
  request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });

export const api = {
  upload(file: File) {
    const form = new FormData();
    form.append("file", file);
    return request(`${DS}/upload`, { method: "POST", body: form });
  },
  getDataset: (id: string) => request(`${DS}/${id}`),
  deleteDataset: (id: string) => request(`${DS}/${id}`, { method: "DELETE" }),

  profile: (id: string) => request(`${DS}/${id}/profile`),
  quality: (id: string) => request(`${DS}/${id}/quality`),
  statistics: (id: string) => request(`${DS}/${id}/statistics`),
  eda: (id: string) => request(`${DS}/${id}/eda`),
  correlation: (id: string) => request(`${DS}/${id}/correlation`),
  outliers: (id: string, method = "iqr") =>
    request(`${DS}/${id}/outliers?method=${encodeURIComponent(method)}`),

  // Body: { operation, column?, ... }. Check the exact field names in /docs.
  clean: (id: string, body: Json) => post(`${DS}/${id}/clean`, body),

  recommendCharts: (id: string) => request(`${DS}/${id}/charts/recommend`),
  // Body: { chart_type, x?, y?, ... }. Check the exact field names in /docs.
  visualize: (id: string, body: Json) => post(`${DS}/${id}/visualize`, body),

  query: (id: string, sql: string) => post(`${DS}/${id}/query`, { sql }),

  
  aiInsights: (id: string) => request(`${DS}/${id}/ai/insights`),

  async report(id: string, ai: boolean): Promise<Blob> {
    const res = await fetch(`${DS}/${id}/report?ai=${ai}`, { method: "POST" });
    if (!res.ok) {
      let msg = `${res.status} ${res.statusText}`;
      try {
        const b = await res.json();
        msg = typeof b.detail === "string" ? b.detail : JSON.stringify(b);
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    return res.blob();
  },
};
