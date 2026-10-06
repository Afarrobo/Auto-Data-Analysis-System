import uuid
from sqlalchemy.orm import Session
from app.models.dataset import Dataset
from app.models.analysis import CleaningOperation


def create_dataset(db: Session, **fields) -> Dataset:
    ds = Dataset(id=uuid.uuid4().hex[:12], **fields)
    db.add(ds)
    db.commit()
    db.refresh(ds)
    return ds


def get_dataset(db: Session, dataset_id: str):
    return db.get(Dataset, dataset_id)


def update_dataset(db: Session, ds: Dataset, **fields) -> Dataset:
    for k, v in fields.items():
        setattr(ds, k, v)
    db.commit()
    db.refresh(ds)
    return ds


def delete_dataset(db: Session, ds: Dataset):
    db.query(CleaningOperation).filter_by(dataset_id=ds.id).delete()
    db.delete(ds)
    db.commit()


def log_operation(db: Session, dataset_id, operation, params, rows_before, rows_after):
    op = CleaningOperation(
        dataset_id=dataset_id, operation=operation, params=params,
        rows_before=rows_before, rows_after=rows_after,
    )
    db.add(op)
    db.commit()
    return op
