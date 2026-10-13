import uuid
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import Form
from app.services.export import render
from app.worker.celery_app import celery_app


@celery_app.task(name="export_responses")
def export_responses(form_id: int, fmt: str, user_id: int) -> dict:
    """Builds the Excel/PDF export in the background (useful for forms with thousands of responses)."""
    with SessionLocal() as db:
        form = db.scalars(select(Form).where(Form.id == form_id).options(selectinload(Form.fields))).one()
        content, media_type, filename = render(db, form, fmt)
    out_dir = Path(settings.EXPORT_DIR)
    out_dir.mkdir(parents=True, exist_ok=True)
    stored = f"{uuid.uuid4().hex}_{filename}"
    (out_dir / stored).write_bytes(content)
    return {"file": stored, "filename": filename, "media_type": media_type, "form_id": form_id, "user_id": user_id}
