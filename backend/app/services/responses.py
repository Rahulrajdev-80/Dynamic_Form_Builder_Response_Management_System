import json
from typing import Any

from sqlalchemy.orm import Session

from app.models import Form, FormResponse, ResponseDetail, ResponseHistory, User
from app.schemas.response import AnswerOut, HistoryChange, HistoryOut, ResponseOut
from app.services.validation import validate_answers


def _answers_as_dicts(answers) -> list[dict]:
    return [a.model_dump() if hasattr(a, "model_dump") else a for a in answers]


def create_response(db: Session, form: Form, answers, user: User | None) -> FormResponse:
    cleaned = validate_answers(form.fields, _answers_as_dicts(answers))
    resp = FormResponse(form_id=form.id, user_id=user.id if user else None)
    resp.details = [ResponseDetail(field_id=fid, value=json.dumps(v, ensure_ascii=False)) for fid, v in cleaned.items()]
    resp.history = [
        ResponseHistory(
            changed_by=user.id if user else None,
            action="created",
            snapshot={str(k): v for k, v in cleaned.items()},
            changes=[],
        )
    ]
    db.add(resp)
    db.flush()
    return resp


def update_response(db: Session, resp: FormResponse, answers, user: User) -> FormResponse:
    form = resp.form
    cleaned = validate_answers(form.fields, _answers_as_dicts(answers))
    labels = {f.id: f.label for f in form.fields}
    existing = {d.field_id: d for d in resp.details}
    old_values = {fid: json.loads(d.value) for fid, d in existing.items()}

    changes = []
    for fid in set(old_values) | set(cleaned):
        if old_values.get(fid) != cleaned.get(fid):
            changes.append(
                {"field_id": fid, "label": labels.get(fid, str(fid)), "old": old_values.get(fid), "new": cleaned.get(fid)}
            )

    for fid, d in existing.items():
        if fid not in cleaned:
            resp.details.remove(d)
        elif old_values[fid] != cleaned[fid]:
            d.value = json.dumps(cleaned[fid], ensure_ascii=False)
    for fid, v in cleaned.items():
        if fid not in existing:
            resp.details.append(ResponseDetail(field_id=fid, value=json.dumps(v, ensure_ascii=False)))

    resp.history.append(
        ResponseHistory(
            changed_by=user.id,
            action="updated",
            snapshot={str(k): v for k, v in cleaned.items()},
            changes=changes,
        )
    )
    from app.models.models import utcnow

    resp.updated_at = utcnow()
    db.flush()
    return resp


def build_response_out(resp: FormResponse, include_form_title: bool = False) -> ResponseOut:
    fields = {f.id: f for f in resp.form.fields}
    values = {d.field_id: json.loads(d.value) for d in resp.details}
    answers = [
        AnswerOut(field_id=f.id, label=f.label, field_type=f.field_type, value=values[f.id])
        for f in resp.form.fields
        if f.id in values and f.id in fields
    ]
    return ResponseOut(
        id=resp.id,
        form_id=resp.form_id,
        form_title=resp.form.title if include_form_title else None,
        user_id=resp.user_id,
        submitted_by=resp.user.full_name if resp.user else None,
        created_at=resp.created_at,
        updated_at=resp.updated_at,
        answers=answers,
    )


def build_history_out(resp: FormResponse) -> list[HistoryOut]:
    return [
        HistoryOut(
            id=h.id,
            action=h.action,
            changed_by=h.changed_by,
            changed_by_name=h.user.full_name if h.user else None,
            created_at=h.created_at,
            changes=[HistoryChange(**c) for c in (h.changes or [])],
            snapshot=h.snapshot or {},
        )
        for h in resp.history
    ]


def display_value(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, list):
        return ", ".join(str(i) for i in v)
    if isinstance(v, bool):
        return "Yes" if v else "No"
    return str(v)
