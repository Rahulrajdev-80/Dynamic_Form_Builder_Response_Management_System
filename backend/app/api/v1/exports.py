from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_managed_form
from app.core.config import settings
from app.db.session import get_db
from app.models import User
from app.services.export import render

router = APIRouter(tags=["Exports (Excel & PDF)"])


class ExportJobOut(BaseModel):
    task_id: str
    status: str
    filename: str | None = None
    download_url: str | None = None
    error: str | None = None


def _sync_export(db: Session, form_id: int, user: User, fmt: str) -> Response:
    form = get_managed_form(db, form_id, user)
    content, media_type, filename = render(db, form, fmt)
    return Response(content, media_type=media_type, headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.get("/forms/{form_id}/export/excel", summary="Download all responses as Excel (.xlsx)")
def export_excel(form_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _sync_export(db, form_id, user, "xlsx")


@router.get("/forms/{form_id}/export/pdf", summary="Download all responses as PDF")
def export_pdf(form_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _sync_export(db, form_id, user, "pdf")


@router.post(
    "/forms/{form_id}/export-jobs", response_model=ExportJobOut, status_code=202,
    summary="Start a background (Celery) export for large forms",
)
def start_export_job(
    form_id: int,
    format: str = Query("xlsx", pattern="^(xlsx|pdf)$"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    get_managed_form(db, form_id, user)
    from app.worker.tasks import export_responses

    try:
        task = export_responses.delay(form_id, format, user.id)
    except Exception as exc:  # broker unreachable
        raise HTTPException(503, "Background worker is unavailable - use the direct export endpoints instead") from exc
    return ExportJobOut(task_id=task.id, status="PENDING")


def _job(task_id: str, user: User):
    from app.worker.celery_app import celery_app

    result = celery_app.AsyncResult(task_id)
    if result.successful():
        info = result.result
        if not (user.is_admin or info["user_id"] == user.id):
            raise HTTPException(403, "This export belongs to another user")
        return result, info
    return result, None


@router.get("/export-jobs/{task_id}", response_model=ExportJobOut, summary="Poll a background export job")
def export_job_status(task_id: str, user: User = Depends(get_current_user)):
    result, info = _job(task_id, user)
    if info:
        return ExportJobOut(
            task_id=task_id, status="SUCCESS", filename=info["filename"],
            download_url=f"/api/v1/export-jobs/{task_id}/download",
        )
    if result.failed():
        return ExportJobOut(task_id=task_id, status="FAILURE", error=str(result.result))
    return ExportJobOut(task_id=task_id, status=result.state)


@router.get("/export-jobs/{task_id}/download", summary="Download the finished export file")
def export_job_download(task_id: str, user: User = Depends(get_current_user)):
    _, info = _job(task_id, user)
    if not info:
        raise HTTPException(409, "Export is not finished yet")
    path = Path(settings.EXPORT_DIR) / info["file"]
    if not path.is_file():
        raise HTTPException(404, "Export file has expired")
    return FileResponse(path, media_type=info["media_type"], filename=info["filename"])
