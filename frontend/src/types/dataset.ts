// The backend response shapes are flexible, so most types are loose on purpose.
export type Json = any;

export interface DatasetInfo {
  id: string;
  filename: string;
}

export interface ChartRecommendation {
  chart_type?: string;
  type?: string;
  x?: string;
  y?: string;
  reason?: string;
  title?: string;
  [key: string]: Json;
}

