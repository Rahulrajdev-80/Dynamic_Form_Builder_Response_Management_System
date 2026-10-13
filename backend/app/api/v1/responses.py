from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import exists, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import (
    can_edit_response, can_manage_form, get_current_user, get_form_or_404,
    get_managed_form, get_response_or_404,
)
from app.db.session import get_db
from app.models import Form, FormResponse, ResponseDetail, User
from app.schemas.common import Message, Page
from app.schemas.response import HistoryOut, ResponseOut, SubmitIn
from app.services.activity import log_activity
from app.services.responses import build_history_out, build_response_out, create_response, update_response

router = APIRouter(tags=["Responses"])

_LOAD = (
    selectinload(FormResponse.details),
    selectinload(FormResponse.user),
    selectinload(FormResponse.form).selectinload(Form.fields),
)


@router.post(
    "/forms/{form_id}/responses", response_model=ResponseOut, status_code=201,
    summary="Submit a response as a logged-in user",
)
def submit_response(
    form_id: int, data: SubmitIn, request: Request,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    form = get_form_or_404(db, form_id)
    if not form.is_active:
        raise HTTPException(403, "This form is currently disabled")
    resp = create_response(db, form, data.answers, user)
    log_activity(db, user, "response.submit", "response", resp.id, {"form_id": form.id}, request)
    db.commit()
    resp = db.scalars(select(FormResponse).where(FormResponse.id == resp.id).options(*_LOAD)).one()
    return build_response_out(resp)


@router.get(
    "/forms/{form_id}/responses", response_model=Page[ResponseOut],
    summary="List responses of a form with search & filters (owner/admin)",
)
def list_responses(
    form_id: int,
    search: str | None = Query(None, description="Free text across all answers and the submitter name"),
    field_id: int | None = Query(None, description="Filter on a specific field (use with field_value)"),
    field_value: str | None = Query(None, description="Answer of field_id must contain this text"),
    submitted_by: int | None = Query(None, description="User id of the submitter"),
    anonymous: bool | None = Query(None, description="true = only anonymous, false = only logged-in"),
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    form = get_managed_form(db, form_id, user)
    q = select(FormResponse).where(FormResponse.form_id == form.id)
    if search:
        like = f"%{search}%"
        q = q.where(
            or_(
                exists().where(ResponseDetail.response_id == FormResponse.id, ResponseDetail.value.like(like)),
                FormResponse.user_id.in_(select(User.id).where(User.full_name.like(like))),
            )
        )
    if field_id is not None and field_value:
        q = q.where(
            exists().where(
                ResponseDetail.response_id == FormResponse.id,
                ResponseDetail.field_id == field_id,
                ResponseDetail.value.like(f"%{field_value}%"),
            )
        )
    if submitted_by is not None:
        q = q.where(FormResponse.user_id == submitted_by)
    if anonymous is True:
        q = q.where(FormResponse.user_id.is_(None))
    elif anonymous is False:
        q = q.where(FormResponse.user_id.is_not(None))
    if date_from:
        q = q.where(FormResponse.created_at >= datetime.combine(date_from, time.min))
    if date_to:
        q = q.where(FormResponse.created_at < datetime.combine(date_to + timedelta(days=1), time.min))

    total = db.scalar(select(func.count()).select_from(q.subquery()))
    rows = db.scalars(
        q.options(*_LOAD).order_by(FormResponse.id.desc()).offset((page - 1) * size).limit(size)
    ).all()
    return Page.build([build_response_out(r) for r in rows], total, page, size)


@router.get("/responses/mine", response_model=Page[ResponseOut], summary="My own submissions across all forms")
def my_responses(
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    q = select(FormResponse).where(FormResponse.user_id == user.id)
    total = db.scalar(select(func.count()).select_from(q.subquery()))
    rows = db.scalars(
        q.options(*_LOAD).order_by(FormResponse.id.desc()).offset((page - 1) * size).limit(size)
    ).all()
    return Page.build([build_response_out(r, include_form_title=True) for r in rows], total, page, size)


def _load_readable(db: Session, response_id: int, user: User) -> FormResponse:
    resp = get_response_or_404(db, response_id)
    if not (can_manage_form(user, resp.form) or resp.user_id == user.id):
        raise HTTPException(403, "You do not have access to this response")
    return resp


@router.get("/responses/{response_id}", response_model=ResponseOut, summary="Get one response")
def get_response(response_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return build_response_out(_load_readable(db, response_id, user), include_form_title=True)


@router.put(
    "/responses/{response_id}", response_model=ResponseOut,
    summary="Edit a response (admin, form owner, or the submitter when the form allows editing)",
)
def edit_response(
    response_id: int, data: SubmitIn, request: Request,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    resp = get_response_or_404(db, response_id)
    if not can_edit_response(user, resp):
        raise HTTPException(403, "You are not allowed to edit this response")
    if not resp.form.is_active and not can_manage_form(user, resp.form):
        raise HTTPException(403, "This form is currently disabled")
    update_response(db, resp, data.answers, user)
    log_activity(db, user, "response.update", "response", resp.id, {"form_id": resp.form_id}, request)
    db.commit()
    resp = db.scalars(select(FormResponse).where(FormResponse.id == response_id).options(*_LOAD)).one()
    return build_response_out(resp)


@router.delete("/responses/{response_id}", response_model=Message, summary="Delete a response (admin / form owner)")
def delete_response(
    response_id: int, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    resp = get_response_or_404(db, response_id)
    if not can_manage_form(user, resp.form):
        raise HTTPException(403, "Only the form owner or an admin can delete responses")
    log_activity(db, user, "response.delete", "response", resp.id, {"form_id": resp.form_id}, request)
    db.delete(resp)
    db.commit()
    return Message(message="Response deleted")


@router.get("/responses/{response_id}/history", response_model=list[HistoryOut], summary="Change history of a response")
def response_history(response_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return build_history_out(_load_readable(db, response_id, user))
