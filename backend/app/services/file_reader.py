import pandas as pd


def read_dataset(file_path, file_type: str) -> pd.DataFrame:
    if file_type == "csv":
        try:
            return pd.read_csv(file_path)
        except UnicodeDecodeError:  # common with Excel-exported / Bangla text
            return pd.read_csv(file_path, encoding="utf-8-sig", encoding_errors="replace")
    if file_type == "excel":
        return pd.read_excel(file_path)
    if file_type == "json":
        return pd.read_json(file_path)
    raise ValueError(f"Unsupported file type: {file_type}")
