from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.services import ai_analyzer
from app.services.missing import missing_report
from app.services.profiler import profile_dataset
from app.services.statistics import numeric_statistics
from app.utils.helpers import get_df, jsonable

router = APIRouter(tags=["ai"])
_cache: dict = {}


@router.get("/{dataset_id}/ai/insights")
def insights(dataset_id: str, refresh: bool = False, db: Session = Depends(get_db)):
    ds, df = get_df(db, dataset_id)
    key = (dataset_id, ds.rows, ds.columns)  # changes after cleaning
    if not refresh and key in _cache:
        return {"summary": _cache[key]}
    summary = ai_analyzer.summarize_dataset(
        jsonable(profile_dataset(df)),
        jsonable(numeric_statistics(df)),
        jsonable(missing_report(df)),
    )
    _cache[key] = summary
    return {"summary": summary}