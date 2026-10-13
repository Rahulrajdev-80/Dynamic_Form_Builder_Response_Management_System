import json
from collections import Counter
from datetime import datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_managed_form
from app.db.session import get_db
from app.models import Form, FormResponse, ResponseDetail, User
from app.schemas.analytics import DashboardOut, DayCount, FieldStat, FormAnalyticsOut, TopForm
from app.services.validation import is_empty  # noqa: F401

router = APIRouter(prefix="/analytics", tags=["Dashboard & Analytics"])


def _per_day(db: Session, form_ids_q, days: int) -> list[DayCount]:
    since = datetime.combine((datetime.now(timezone.utc) - timedelta(days=days - 1)).date(), time.min)
    rows = db.execute(
        select(func.date(FormResponse.created_at), func.count())
        .where(FormResponse.form_id.in_(form_ids_q), FormResponse.created_at >= since)
        .group_by(func.date(FormResponse.created_at))
    ).all()
    counts = {str(d): c for d, c in rows}
    start = since.date()
    return [
        DayCount(date=str(start + timedelta(days=i)), count=counts.get(str(start + timedelta(days=i)), 0))
        for i in range(days)
    ]


@router.get("/dashboard", response_model=DashboardOut, summary="Dashboard totals, 30-day trend and top forms")
def dashboard(
    days: int = Query(30, ge=7, le=90),
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    scope = select(Form.id)
    if not user.is_admin:
        scope = scope.where(Form.owner_id == user.id)
    form_filter = Form.owner_id == user.id if not user.is_admin else True

    total_forms = db.scalar(select(func.count()).select_from(Form).where(form_filter))
    active = db.scalar(select(func.count()).select_from(Form).where(form_filter, Form.is_active.is_(True)))
    total_resp = db.scalar(select(func.count()).select_from(FormResponse).where(FormResponse.form_id.in_(scope)))
    today = datetime.combine(datetime.now(timezone.utc).date(), time.min)
    resp_today = db.scalar(
        select(func.count()).select_from(FormResponse)
        .where(FormResponse.form_id.in_(scope), FormResponse.created_at >= today)
    )
    top = db.execute(
        select(Form.id, Form.title, func.count(FormResponse.id).label("c"))
        .join(FormResponse, FormResponse.form_id == Form.id)
        .where(Form.id.in_(scope))
        .group_by(Form.id, Form.title)
        .order_by(func.count(FormResponse.id).desc())
        .limit(5)
    ).all()
    return DashboardOut(
        total_forms=total_forms, active_forms=active, disabled_forms=total_forms - active,
        total_responses=total_resp, responses_today=resp_today,
        total_users=db.scalar(select(func.count()).select_from(User)) if user.is_admin else None,
        responses_per_day=_per_day(db, scope, days),
        top_forms=[TopForm(form_id=i, title=t, responses=c) for i, t, c in top],
    )


@router.get("/forms/{form_id}", response_model=FormAnalyticsOut, summary="Form-wise analytics (owner/admin)")
def form_analytics(
    form_id: int, days: int = Query(30, ge=7, le=90),
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    form = get_managed_form(db, form_id, user)
    responses = db.execute(
        select(FormResponse.id, FormResponse.user_id, FormResponse.created_at).where(FormResponse.form_id == form.id)
    ).all()
    total = len(responses)
    details = db.execute(
        select(ResponseDetail.field_id, ResponseDetail.value, ResponseDetail.response_id)
        .join(FormResponse, FormResponse.id == ResponseDetail.response_id)
        .where(FormResponse.form_id == form.id)
        .order_by(ResponseDetail.response_id.desc())
    ).all()
    by_field: dict[int, list] = {}
    for fid, val, _rid in details:
        by_field.setdefault(fid, []).append(json.loads(val))

    stats = []
    for f in form.fields:
        values = by_field.get(f.id, [])
        s = FieldStat(field_id=f.id, label=f.label, field_type=f.field_type, answered=len(values), skipped=max(total - len(values), 0))
        if f.field_type in ("dropdown", "radio", "checkbox"):
            c: Counter = Counter()
            for v in values:
                for item in (v if isinstance(v, list) else [v]):
                    c[str(item)] += 1
            s.distribution = {o.label: c.get(o.value, 0) for o in f.options} or dict(c)
        elif f.field_type == "rating":
            scale = int(f.max_value or 5)
            c = Counter(int(v) for v in values)
            s.distribution = {str(i): c.get(i, 0) for i in range(1, scale + 1)}
            s.average = round(sum(int(v) for v in values) / len(values), 2) if values else None
        elif f.field_type == "number":
            nums = [float(v) for v in values]
            if nums:
                s.average, s.minimum, s.maximum = round(sum(nums) / len(nums), 2), min(nums), max(nums)
        elif f.field_type in ("text", "email", "date"):
            s.samples = values[:5]
        stats.append(s)

    authed = sum(1 for _, uid, _ in responses if uid is not None)
    last = max((c for _, _, c in responses), default=None)
    return FormAnalyticsOut(
        form_id=form.id, title=form.title, total_responses=total,
        authenticated_responses=authed, anonymous_responses=total - authed,
        last_response_at=last.isoformat() if last else None,
        responses_per_day=_per_day(db, select(Form.id).where(Form.id == form.id), days),
        fields=stats,
    )
