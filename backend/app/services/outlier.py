import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest


def iqr_mask(s: pd.Series, k: float = 1.5) -> pd.Series:
    q1, q3 = s.quantile(0.25), s.quantile(0.75)
    iqr = q3 - q1
    return (s < q1 - k * iqr) | (s > q3 + k * iqr)


def zscore_mask(s: pd.Series, threshold: float = 3.0) -> pd.Series:
    std = s.std()
    if not std or np.isnan(std):
        return pd.Series(False, index=s.index)
    return ((s - s.mean()) / std).abs() > threshold


def detect_outliers(df: pd.DataFrame, method: str = "iqr") -> dict:
    result = {}
    for c in df.select_dtypes("number").columns:
        s = df[c].dropna()
        if len(s) < 4:
            continue
        mask = iqr_mask(s) if method == "iqr" else zscore_mask(s)
        result[str(c)] = {
            "outliers": int(mask.sum()),
            "percent": round(float(mask.mean() * 100), 2),
            "examples": s[mask].head(5).tolist(),
        }
    return result


def isolation_forest(df: pd.DataFrame, contamination: float = 0.05) -> dict:
    num = df.select_dtypes("number")
    if num.shape[1] == 0 or len(num) < 10:
        return {"outlier_rows": 0, "indices": []}
    X = num.fillna(num.median())
    pred = IsolationForest(contamination=contamination, random_state=42).fit_predict(X)
    idx = X.index[pred == -1]
    return {"outlier_rows": int(len(idx)), "indices": idx[:100].tolist()}
