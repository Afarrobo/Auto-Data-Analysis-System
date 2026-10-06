import uuid
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import crud
from app.database.connection import get_db
from app.schemas.dataset import UploadOut
from app.services.file_reader import read_dataset
from app.services.profiler import profile_dataset
from app.utils.file_validation import EXT_TO_TYPE, validate_extension, validate_size
from app.utils.helpers import UPLOAD_DIR, jsonable

router = APIRouter(tags=["upload"])


@router.post("/upload", response_model=UploadOut)
async def upload_dataset(file: UploadFile = File(...), db: Session = Depends(get_db)):
    ext = validate_extension(file.filename)                 # 1. validate extension
    content = await file.read()
    validate_size(len(content))
    path = UPLOAD_DIR / f"{uuid.uuid4().hex}{ext}"          # 2. save file
    path.write_bytes(content)
    file_type = EXT_TO_TYPE[ext]
    try:
        df = read_dataset(path, file_type)                  # 3. read
    except Exception as e:
        path.unlink(missing_ok=True)
        raise HTTPException(400, f"Could not read file: {e}")
    ds = crud.create_dataset(                               # 4. dataset ID + metadata
        db, filename=file.filename, file_type=file_type, path=str(path),
        original_path=str(path), rows=len(df), columns=len(df.columns),
    )
    return {"dataset": ds, "profile": jsonable(profile_dataset(df))}  # 5-6. profile + return
