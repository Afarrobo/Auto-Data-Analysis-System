import pandas as pd
from app.services.statistics import numeric_statistics


def univariate(df: pd.DataFrame, top_n: int = 10) -> dict:
    cats = {}
    for c in df.select_dtypes(exclude="number").columns:
        vc = df[c].value_counts(dropna=True)
        cats[str(c)] = {
            "unique": int(df[c].nunique()),
            "top_values": [
                {"value": str(k), "count": int(v), "percent": round(v / len(df) * 100, 2)}
                for k, v in vc.head(top_n).items()
            ],
        }
    return {"numeric": numeric_statistics(df), "categorical": cats}


def bivariate(df: pd.DataFrame, x: str, y: str) -> dict:
    for c in (x, y):
        if c not in df.columns:
            raise ValueError(f"Column '{c}' not found")
    xn, yn = pd.api.types.is_numeric_dtype(df[x]), pd.api.types.is_numeric_dtype(df[y])
    if xn and yn:
        return {"type": "numeric_numeric", "pearson": df[x].corr(df[y]),
                "spearman": df[x].corr(df[y], method="spearman")}
    if xn != yn:
        cat, num = (y, x) if xn else (x, y)
        g = (df.groupby(cat)[num].agg(["count", "mean", "median", "std"])
               .sort_values("mean", ascending=False).head(20))
        return {"type": "categorical_numeric", "group_by": cat, "value": num,
                "groups": g.reset_index().to_dict("records")}
    ct = pd.crosstab(df[x], df[y])
    top_r, top_c = ct.sum(axis=1).nlargest(10).index, ct.sum(axis=0).nlargest(10).index
    return {"type": "categorical_categorical", "crosstab": ct.loc[top_r, top_c].reset_index().to_dict("records")}


def run_eda(df: pd.DataFrame) -> dict:
    return {"univariate": univariate(df)}
