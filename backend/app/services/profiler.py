import pandas as pd


def profile_dataset(df: pd.DataFrame) -> dict:
    return {
        "rows": len(df),
        "columns": len(df.columns),
        "missing_values": int(df.isna().sum().sum()),
        "missing_percent": round(float(df.isna().sum().sum() / max(df.size, 1) * 100), 2),
        "duplicates": int(df.duplicated().sum()),
        "memory_usage": int(df.memory_usage(deep=True).sum()),
        "column_info": [
            {
                "name": str(c),
                "dtype": str(df[c].dtype),
                "missing": int(df[c].isna().sum()),
                "unique": int(df[c].nunique(dropna=True)),
            }
            for c in df.columns
        ],
    }
