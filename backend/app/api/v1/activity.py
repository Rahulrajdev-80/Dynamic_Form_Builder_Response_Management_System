from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import ActivityLog, User
from app.schemas.common import Page
from app.schemas.response import ActivityLogOut

router = APIRouter(tags=["Activity Logs"])


@router.get("/activity-logs", response_model=Page[ActivityLogOut], summary="Activity logs (admin: everyone, user: own actions)")
def list_activity(
    user_id: int | None = Query(None, description="Admins only"),
    action: str | None = Query(None, description="e.g. form.create, response.submit, user.login"),
    entity_type: str | None = Query(None, description="form | field | response | user"),
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = select(ActivityLog)
    if user.is_admin:
        if user_id is not None:
            q = q.where(ActivityLog.user_id == user_id)
    else:
        q = q.where(ActivityLog.user_id == user.id)
    if action:
        q = q.where(ActivityLog.action.like(f"{action}%"))
    if entity_type:
        q = q.where(ActivityLog.entity_type == entity_type)
    if date_from:
        q = q.where(ActivityLog.created_at >= datetime.combine(date_from, time.min))
    if date_to:
        q = q.where(ActivityLog.created_at < datetime.combine(date_to + timedelta(days=1), time.min))
    total = db.scalar(select(func.count()).select_from(q.subquery()))
    rows = db.scalars(q.order_by(ActivityLog.id.desc()).offset((page - 1) * size).limit(size)).all()
    items = [
        ActivityLogOut(
            id=r.id, user_id=r.user_id, user_name=r.user.full_name if r.user else None, action=r.action,
            entity_type=r.entity_type, entity_id=r.entity_id, details=r.details,
            ip_address=r.ip_address, created_at=r.created_at,
        )
        for r in rows
    ]
    return Page.build(items, total, page, size)
