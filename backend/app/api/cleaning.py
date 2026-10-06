import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import crud
from app.database.connection import get_db
from app.schemas.analysis import CleanRequest
from app.services.cleaning import apply_operation
from app.services.profiler import profile_dataset
from app.utils.helpers import UPLOAD_DIR, get_df, jsonable

router = APIRouter(tags=["cleaning"])


@router.post("/{dataset_id}/clean")
def clean(dataset_id: str, body: CleanRequest, db: Session = Depends(get_db)):
    ds, df = get_df(db, dataset_id)
    before = len(df)
    try:
        new_df = apply_operation(df, body)
    except ValueError as e:
        raise HTTPException(400, str(e))
    out = UPLOAD_DIR / f"{uuid.uuid4().hex}_cleaned.csv"   # original file is kept
    new_df.to_csv(out, index=False)
    crud.update_dataset(db, ds, path=str(out), file_type="csv", rows=len(new_df), columns=len(new_df.columns))
    crud.log_operation(db, ds.id, body.operation, body.model_dump(exclude_none=True), before, len(new_df))
    return {"rows_before": before, "rows_after": len(new_df), "profile": jsonable(profile_dataset(new_df))}
