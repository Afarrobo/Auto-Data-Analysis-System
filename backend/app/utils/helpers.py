import math
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import HTTPException

BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
REPORT_DIR = DATA_DIR / "reports"
for _d in (UPLOAD_DIR, REPORT_DIR):
    _d.mkdir(parents=True, exist_ok=True)


def jsonable(o):
    """Convert numpy/pandas values (and NaN/inf) into JSON-safe Python values."""
    if isinstance(o, dict):
        return {str(k): jsonable(v) for k, v in o.items()}
    if isinstance(o, (list, tuple, set)):
        return [jsonable(v) for v in o]
    if o is pd.NaT:
        return None
    if isinstance(o, (pd.Timestamp, pd.Timedelta)):
        return str(o)
    if isinstance(o, np.bool_):
        return bool(o)
    if isinstance(o, np.integer):
        return int(o)
    if isinstance(o, (np.floating, float)):
        return None if (math.isnan(o) or math.isinf(o)) else float(o)
    return o


def get_df(db, dataset_id: str):
    """Return (dataset_row, DataFrame) or raise 404."""
    from app.database import crud
    from app.services.file_reader import read_dataset

    ds = crud.get_dataset(db, dataset_id)
    if not ds:
        raise HTTPException(404, "Dataset not found")
    return ds, read_dataset(ds.path, ds.file_type)
