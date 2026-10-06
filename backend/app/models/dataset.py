from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Integer, String
from app.database.connection import Base


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(String, primary_key=True)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)       # csv | excel | json (of `path`)
    path = Column(String, nullable=False)            # current version (cleaned if any)
    original_path = Column(String, nullable=False)   # untouched upload
    rows = Column(Integer, default=0)
    columns = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
