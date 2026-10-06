import pandas as pd


def missing_report(df: pd.DataFrame) -> dict:
    n = max(len(df), 1)
    cols = [
        {"column": str(c), "missing": int(df[c].isna().sum()),
         "percent": round(float(df[c].isna().sum() / n * 100), 2)}
        for c in df.columns if df[c].isna().any()
    ]
    cols.sort(key=lambda x: x["missing"], reverse=True)
    return {
        "total_missing": int(df.isna().sum().sum()),
        "rows_with_missing": int(df.isna().any(axis=1).sum()),
        "columns": cols,
    }
