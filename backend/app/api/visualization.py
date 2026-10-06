from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.analysis import VisualizeRequest
from app.services.charts import build_chart, recommend_charts
from app.utils.helpers import get_df, jsonable

router = APIRouter(tags=["visualization"])


@router.post("/{dataset_id}/visualize")
def visualize(dataset_id: str, body: VisualizeRequest, db: Session = Depends(get_db)):
    _, df = get_df(db, dataset_id)
    try:
        return jsonable(build_chart(df, body.chart_type, body.x, body.y, body.agg, body.bins))
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/{dataset_id}/charts/recommend")
def recommend(dataset_id: str, db: Session = Depends(get_db)):
    _, df = get_df(db, dataset_id)
    return recommend_charts(df)
