from typing import Literal, Optional
from pydantic import BaseModel


class CleanRequest(BaseModel):
    operation: Literal[
        "remove_duplicates", "fill_missing", "drop_missing_rows",
        "drop_column", "remove_outliers",
    ]
    column: Optional[str] = None
    strategy: Optional[Literal["mean", "median", "mode", "constant"]] = None
    value: Optional[str] = None


class VisualizeRequest(BaseModel):
    chart_type: Literal["histogram", "bar", "line", "scatter", "box", "heatmap"]
    x: Optional[str] = None
    y: Optional[str] = None
    agg: Literal["sum", "mean", "count", "min", "max"] = "sum"
    bins: int = 30


class QueryRequest(BaseModel):
    sql: str  # table name is `dataset`

