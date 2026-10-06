import numpy as np
import pandas as pd

MAX_POINTS = 5000  # never send the whole dataset to the browser


def _need(df, *cols):
    for c in cols:
        if c is None or c not in df.columns:
            raise ValueError(f"Column '{c}' not found")


def build_chart(df: pd.DataFrame, chart_type: str, x=None, y=None, agg="sum", bins=30) -> dict:
    if chart_type == "histogram":
        _need(df, x)
        s = pd.to_numeric(df[x], errors="coerce").dropna()
        counts, edges = np.histogram(s, bins=bins)
        return {"type": "histogram", "x": x, "bin_edges": edges.tolist(), "counts": counts.tolist()}

    if chart_type == "bar":
        _need(df, x)
        if y and y in df.columns and agg != "count":
            g = df.groupby(x)[y].agg(agg)
        else:
            g = df[x].value_counts()
        g = g.sort_values(ascending=False).head(20)
        return {"type": "bar", "x": x, "y": y, "agg": agg,
                "labels": [str(i) for i in g.index], "values": g.tolist()}

    if chart_type == "line":
        _need(df, x, y)
        d = df[[x, y]].dropna().copy()
        if not pd.api.types.is_numeric_dtype(d[x]):
            d[x] = pd.to_datetime(d[x], errors="coerce")
        d = d.dropna().sort_values(x)
        if len(d) > MAX_POINTS:
            d = d.iloc[np.linspace(0, len(d) - 1, MAX_POINTS).astype(int)]
        return {"type": "line", "x": x, "y": y, "xs": d[x].astype(str).tolist(), "ys": d[y].tolist()}

    if chart_type == "scatter":
        _need(df, x, y)
        d = df[[x, y]].dropna()
        if len(d) > MAX_POINTS:
            d = d.sample(MAX_POINTS, random_state=42)
        return {"type": "scatter", "x": x, "y": y, "xs": d[x].tolist(), "ys": d[y].tolist(),
                "sampled": len(df) > MAX_POINTS}

    if chart_type == "box":
        _need(df, y)
        s = pd.to_numeric(df[y], errors="coerce").dropna()
        q1, med, q3 = s.quantile([0.25, 0.5, 0.75])
        iqr = q3 - q1
        return {"type": "box", "column": y, "min": s.min(), "q1": q1, "median": med, "q3": q3,
                "max": s.max(), "lower_fence": q1 - 1.5 * iqr, "upper_fence": q3 + 1.5 * iqr}

    if chart_type == "heatmap":
        from app.services.correlation import correlation_matrix
        c = correlation_matrix(df)
        return {"type": "heatmap", "labels": c["columns"], "z": c["matrix"]}

    raise ValueError(f"Unsupported chart type: {chart_type}")


def recommend_charts(df: pd.DataFrame, limit: int = 8) -> list:
    """Rule-based chart recommendation (no LLM needed)."""
    num = list(df.select_dtypes("number").columns)
    dates = list(df.select_dtypes("datetime").columns)
    cats = [c for c in df.select_dtypes(exclude="number").columns
            if c not in dates and 1 < df[c].nunique() <= 30]
    recs = []
    for d in dates[:1]:
        for n in num[:2]:
            recs.append({"chart_type": "line", "x": d, "y": n, "reason": "date + numeric -> trend"})
    for c in cats[:2]:
        for n in num[:1]:
            recs.append({"chart_type": "bar", "x": c, "y": n, "reason": "category + numeric -> comparison"})
    for n in num[:3]:
        recs.append({"chart_type": "histogram", "x": n, "reason": "numeric -> distribution"})
        recs.append({"chart_type": "box", "y": n, "reason": "numeric -> spread and outliers"})
    if len(num) >= 2:
        recs.append({"chart_type": "scatter", "x": num[0], "y": num[1], "reason": "numeric + numeric -> relationship"})
    if len(num) >= 3:
        recs.append({"chart_type": "heatmap", "reason": "multiple numeric -> correlation heatmap"})
    return recs[:limit]
