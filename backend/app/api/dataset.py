from pathlib import Path
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import crud
from app.database.connection import get_db
from app.schemas.dataset import DatasetOut
from app.services.duplicate import duplicate_report
from app.services.missing import missing_report
from app.services.outlier import detect_outliers
from app.services.profiler import profile_dataset
from app.utils.helpers import get_df, jsonable

router = APIRouter(tags=["dataset"])


@router.get("/{dataset_id}", response_model=DatasetOut)
def get_dataset(dataset_id: str, db: Session = Depends(get_db)):
    ds, _ = get_df(db, dataset_id)
    return ds


@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: str, db: Session = Depends(get_db)):
    ds, _ = get_df(db, dataset_id)
    for p in {ds.path, ds.original_path}:
        Path(p).unlink(missing_ok=True)
    crud.delete_dataset(db, ds)
    return {"deleted": dataset_id}


@router.get("/{dataset_id}/profile")
def profile(dataset_id: str, db: Session = Depends(get_db)):
    _, df = get_df(db, dataset_id)
    return jsonable(profile_dataset(df))


@router.get("/{dataset_id}/quality")
def quality(dataset_id: str, db: Session = Depends(get_db)):
    _, df = get_df(db, dataset_id)
    return jsonable({
        "missing": missing_report(df),
        "duplicates": duplicate_report(df),
        "outliers": detect_outliers(df, "iqr"),
    })
