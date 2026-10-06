import { createContext, createElement, useContext, useEffect, useState } from "react";
import type { DependencyList, ReactNode } from "react";
import type { DatasetInfo } from "../types/dataset";

interface Ctx {
  dataset: DatasetInfo | null;
  setDataset: (d: DatasetInfo | null) => void;
}

const DatasetContext = createContext<Ctx>({ dataset: null, setDataset: () => {} });
const KEY = "ada.dataset";

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [dataset, setDatasetState] = useState<DatasetInfo | null>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as DatasetInfo) : null;
    } catch {
      return null;
    }
  });

  const setDataset = (d: DatasetInfo | null) => {
    setDatasetState(d);
    try {
      if (d) localStorage.setItem(KEY, JSON.stringify(d));
      else localStorage.removeItem(KEY);
    } catch {
      /* storage unavailable */
    }
  };

  return createElement(DatasetContext.Provider, { value: { dataset, setDataset } }, children);
}

export function useDataset() {
  return useContext(DatasetContext);
}

// Runs an async loader and tracks loading and error state.
export function useAsync<T>(loader: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    loader()
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}
