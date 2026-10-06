from datetime import datetime
from pydantic import BaseModel, ConfigDict


class DatasetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    filename: str
    file_type: str
    rows: int
    columns: int
    created_at: datetime


class UploadOut(BaseModel):
    dataset: DatasetOut
    profile: dict
    message: str = "Dataset uploaded successfully"
