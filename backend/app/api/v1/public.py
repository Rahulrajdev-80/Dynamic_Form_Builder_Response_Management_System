from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_optional_user
from app.db.session import get_db
from app.models import Form, User
from app.schemas.form import PublicFormOut
from app.schemas.response import SubmitIn, UploadOut
from app.services.activity import log_activity
from app.services.responses import create_response
from app.services.uploads import save_upload

router = APIRouter(prefix="/public", tags=["Public Forms (no login required)"])


class SubmitAck(BaseModel):
    response_id: int
    message: str = "Thank you! Your response has been recorded."


def _public_form(db: Session, slug: str) -> Form:
    form = db.scalars(select(Form).where(Form.slug == slug).options(selectinload(Form.fields))).first()
    if not form or not form.is_public:
        raise HTTPException(404, "Form not found")
    if not form.is_active:
        raise HTTPException(403, "This form is currently disabled")
    return form


@router.get("/forms/{slug}", response_model=PublicFormOut, summary="Fetch a public form definition by its slug")
def get_public_form(slug: str, db: Session = Depends(get_db)):
    return _public_form(db, slug)


@router.post(
    "/forms/{slug}/responses", response_model=SubmitAck, status_code=201,
    summary="Submit a public form (anonymous; attributed to the user if a valid token is sent)",
)
def submit_public(
    slug: str, data: SubmitIn, request: Request,
    db: Session = Depends(get_db), user: User | None = Depends(get_optional_user),
):
    form = _public_form(db, slug)
    resp = create_response(db, form, data.answers, user)
    log_activity(db, user, "response.submit_public", "response", resp.id, {"form_id": form.id}, request)
    db.commit()
    return SubmitAck(response_id=resp.id)


@router.post("/forms/{slug}/uploads", response_model=UploadOut, status_code=201, summary="Upload a file for a public form's file field")
async def upload_public(slug: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    _public_form(db, slug)
    return await save_upload(file)
