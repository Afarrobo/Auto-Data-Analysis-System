from datetime import datetime, timezone
from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String
from app.database.connection import Base


class CleaningOperation(Base):
    __tablename__ = "cleaning_operations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(String, ForeignKey("datasets.id"), index=True)
    operation = Column(String, nullable=False)
    params = Column(JSON, default=dict)
    rows_before = Column(Integer)
    rows_after = Column(Integer)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
