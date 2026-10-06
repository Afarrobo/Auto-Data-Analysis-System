import pandas as pd


def correlation_matrix(df: pd.DataFrame, method: str = "pearson", top: int = 10) -> dict:
    num = df.select_dtypes("number")
    if num.shape[1] < 2:
        return {"columns": [], "matrix": [], "top_pairs": []}
    corr = num.corr(method=method)
    pairs = [
        {"x": a, "y": b, "correlation": corr.loc[a, b]}
        for i, a in enumerate(corr.columns) for b in corr.columns[i + 1:]
        if pd.notna(corr.loc[a, b])
    ]
    pairs.sort(key=lambda p: abs(p["correlation"]), reverse=True)
    return {"columns": list(corr.columns), "matrix": corr.values.tolist(), "top_pairs": pairs[:top]}
