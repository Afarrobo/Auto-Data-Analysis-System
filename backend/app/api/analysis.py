from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.analysis import QueryRequest
from app.services import eda as eda_svc
from app.services.ai_analyzer import run_sql
from app.services.correlation import correlation_matrix
from app.services.outlier import detect_outliers, isolation_forest
from app.services.statistics import numeric_statistics
from app.utils.helpers import get_df, jsonable

router = APIRouter(tags=["analysis"])


@router.get("/{dataset_id}/statistics")
def statistics(dataset_id: str, db: Session = Depends(get_db)):
    _, df = get_df(db, dataset_id)
    return jsonable(numeric_statistics(df))


@router.get("/{dataset_id}/eda")
def eda(dataset_id: str, x: Optional[str] = None, y: Optional[str] = None, db: Session = Depends(get_db)):
    _, df = get_df(db, dataset_id)
    try:
        if x and y:
            return jsonable(eda_svc.bivariate(df, x, y))
        return jsonable(eda_svc.run_eda(df))
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/{dataset_id}/correlation")
def correlation(dataset_id: str, method: str = Query("pearson", pattern="^(pearson|spearman|kendall)$"),
                db: Session = Depends(get_db)):
    _, df = get_df(db, dataset_id)
    return jsonable(correlation_matrix(df, method))


@router.get("/{dataset_id}/outliers")
def outliers(dataset_id: str, method: str = Query("iqr", pattern="^(iqr|zscore|isolation_forest)$"),
             db: Session = Depends(get_db)):
    _, df = get_df(db, dataset_id)
    if method == "isolation_forest":
        return jsonable(isolation_forest(df))
    return jsonable(detect_outliers(df, method))


@router.post("/{dataset_id}/query")
def query(dataset_id: str, body: QueryRequest, db: Session = Depends(get_db)):
    _, df = get_df(db, dataset_id)
    res = run_sql(df, body.sql)
    return jsonable({"columns": list(res.columns), "rows": res.to_dict("records"), "row_count": len(res)})
