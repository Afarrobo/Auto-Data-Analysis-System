import pandas as pd


def duplicate_report(df: pd.DataFrame, sample: int = 5) -> dict:
    mask = df.duplicated(keep="first")
    dups = df[mask].head(sample)
    return {
        "duplicate_rows": int(mask.sum()),
        "percent": round(float(mask.mean() * 100), 2) if len(df) else 0.0,
        "sample": dups.astype(object).where(dups.notna(), None).to_dict(orient="records"),
    }
