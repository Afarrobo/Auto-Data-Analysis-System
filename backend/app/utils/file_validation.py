from pathlib import Path
from fastapi import HTTPException

EXT_TO_TYPE = {".csv": "csv", ".xlsx": "excel", ".xls": "excel", ".json": "json"}
MAX_BYTES = 200 * 1024 * 1024  # 200 MB


def validate_extension(filename: str) -> str:
    ext = Path(filename or "").suffix.lower()
    if ext not in EXT_TO_TYPE:
        raise HTTPException(400, f"Unsupported file type '{ext}'. Use: {', '.join(EXT_TO_TYPE)}")
    return ext


def validate_size(size: int):
    if size == 0:
        raise HTTPException(400, "Empty file")
    if size > MAX_BYTES:
        raise HTTPException(413, "File too large")
