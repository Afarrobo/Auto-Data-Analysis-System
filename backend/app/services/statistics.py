import pandas as pd
from scipy.stats import kurtosis, skew


def numeric_statistics(df: pd.DataFrame) -> dict:
    out = {}
    for c in df.select_dtypes("number").columns:
        s = df[c].dropna()
        if s.empty:
            continue
        mode = s.mode()
        out[str(c)] = {
            "count": int(s.count()),
            "mean": s.mean(),
            "median": s.median(),
            "mode": mode.iloc[0] if not mode.empty else None,
            "std": s.std(),
            "variance": s.var(),
            "min": s.min(),
            "q1": s.quantile(0.25),
            "q3": s.quantile(0.75),
            "max": s.max(),
            "skewness": skew(s) if len(s) > 2 else None,
            "kurtosis": kurtosis(s) if len(s) > 3 else None,
        }
    return out
