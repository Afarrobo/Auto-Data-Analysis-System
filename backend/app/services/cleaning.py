import pandas as pd
from app.services.outlier import iqr_mask


def remove_duplicates(df):
    return df.drop_duplicates()


def fill_missing(df, column, strategy, value=None):
    if column not in df.columns:
        raise ValueError(f"Column '{column}' not found")
    s = df[column]
    if strategy in ("mean", "median"):
        if not pd.api.types.is_numeric_dtype(s):
            raise ValueError(f"'{strategy}' needs a numeric column")
        fill = s.mean() if strategy == "mean" else s.median()
    elif strategy == "mode":
        m = s.mode()
        if m.empty:
            raise ValueError("No mode available")
        fill = m.iloc[0]
    elif strategy == "constant":
        if value is None:
            raise ValueError("'value' required for constant strategy")
        fill = pd.to_numeric(value) if pd.api.types.is_numeric_dtype(s) else value
    else:
        raise ValueError("strategy required")
    df = df.copy()
    df[column] = s.fillna(fill)
    return df


def drop_missing_rows(df, column=None):
    return df.dropna(subset=[column] if column else None)


def drop_column(df, column):
    if column not in df.columns:
        raise ValueError(f"Column '{column}' not found")
    return df.drop(columns=[column])


def remove_outliers(df, column):
    if column not in df.columns or not pd.api.types.is_numeric_dtype(df[column]):
        raise ValueError("Need a numeric column")
    mask = iqr_mask(df[column].dropna()).reindex(df.index, fill_value=False)
    return df[~mask]


def apply_operation(df, req):
    op = req.operation
    if op == "remove_duplicates":
        return remove_duplicates(df)
    if op == "fill_missing":
        return fill_missing(df, req.column, req.strategy, req.value)
    if op == "drop_missing_rows":
        return drop_missing_rows(df, req.column)
    if op == "drop_column":
        return drop_column(df, req.column)
    if op == "remove_outliers":
        return remove_outliers(df, req.column)
    raise ValueError("Unknown operation")
