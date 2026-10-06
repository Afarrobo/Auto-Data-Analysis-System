from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.services import ai_analyzer
from app.services.duplicate import duplicate_report
from app.services.missing import missing_report
from app.services.profiler import profile_dataset
from app.services.statistics import numeric_statistics
from app.utils.helpers import REPORT_DIR, get_df, jsonable

router = APIRouter(tags=["reports"])


def _fmt(v):
    return f"{v:,.2f}" if isinstance(v, float) else str(v)


@router.post("/{dataset_id}/report")
def report(dataset_id: str, ai: bool = False, db: Session = Depends(get_db)):
    ds, df = get_df(db, dataset_id)
    prof, stats, miss = profile_dataset(df), numeric_statistics(df), missing_report(df)
    dup = duplicate_report(df)
    st = getSampleStyleSheet()
    story = [Paragraph(f"Data Report: {ds.filename}", st["Title"]), Spacer(1, 12),
             Paragraph("Overview", st["Heading2"]),
             Table([["Rows", f"{prof['rows']:,}"], ["Columns", prof["columns"]],
                    ["Missing values", f"{prof['missing_values']:,} ({prof['missing_percent']}%)"],
                    ["Duplicate rows", dup["duplicate_rows"]]]), Spacer(1, 12)]
    if ai:
        try:
            summary = ai_analyzer.summarize_dataset(jsonable(prof), jsonable(stats), jsonable(miss))
            story += [Paragraph("AI Summary", st["Heading2"])]
            story += [Paragraph(line.lstrip("-*• ").replace("&", "&amp;"), st["BodyText"])
                      for line in summary.splitlines() if line.strip()]
        except Exception as e:  # report still works without AI
            story += [Paragraph(f"(AI summary unavailable: {getattr(e, 'detail', e)})", st["Italic"])]
    if stats:
        story += [Spacer(1, 12), Paragraph("Numeric statistics", st["Heading2"])]
        head = ["column", "mean", "median", "std", "min", "max"]
        rows = [head] + [[c] + [_fmt(s[k]) for k in head[1:]] for c, s in list(stats.items())[:25]]
        story.append(Table(rows, repeatRows=1))
    path = REPORT_DIR / f"{ds.id}.pdf"
    SimpleDocTemplate(str(path), pagesize=A4).build(story)
    return FileResponse(path, media_type="application/pdf", filename=f"report_{ds.id}.pdf")
