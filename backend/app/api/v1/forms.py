import re
import secrets

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_form_or_404, get_managed_form
from app.db.session import get_db
from app.models import FieldOption, Form, FormField, FormResponse, ResponseDetail, User
from app.schemas.common import Message, Page
from app.schemas.form import (
    CHOICE_TYPES, FieldCreate, FieldOut, FieldReorderIn, FieldUpdate, FormCreate,
    FormListItem, FormOut, FormStatusIn, FormUpdate, OptionIn, OptionOut,
)
from app.services.activity import log_activity

router = APIRouter(tags=["Forms & Builder"])


def _slugify(title: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:60] or "form"
    return f"{base}-{secrets.token_hex(3)}"


# ---------------------------------------------------------------- forms
@router.post("/forms", response_model=FormOut, status_code=201, summary="Create a form")
def create_form(
    data: FormCreate, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    form = Form(**data.model_dump(), slug=_slugify(data.title), owner_id=user.id)
    db.add(form)
    db.flush()
    log_activity(db, user, "form.create", "form", form.id, {"title": form.title}, request)
    db.commit()
    db.refresh(form)
    return form


@router.get("/forms", response_model=Page[FormListItem], summary="List / search forms (admin: all, user: own)")
def list_forms(
    search: str | None = Query(None, description="Matches title or description"),
    is_active: bool | None = None,
    is_public: bool | None = None,
    mine: bool = Query(False, description="Admins only: restrict to forms they own"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = select(Form)
    if not user.is_admin or mine:
        q = q.where(Form.owner_id == user.id)
    if search:
        like = f"%{search}%"
        q = q.where(Form.title.like(like) | Form.description.like(like))
    if is_active is not None:
        q = q.where(Form.is_active == is_active)
    if is_public is not None:
        q = q.where(Form.is_public == is_public)
    total = db.scalar(select(func.count()).select_from(q.subquery()))
    forms = db.scalars(q.order_by(Form.id.desc()).offset((page - 1) * size).limit(size)).all()

    ids = [f.id for f in forms]
    resp_counts = dict(
        db.execute(
            select(FormResponse.form_id, func.count()).where(FormResponse.form_id.in_(ids)).group_by(FormResponse.form_id)
        ).all()
    ) if ids else {}
    field_counts = dict(
        db.execute(
            select(FormField.form_id, func.count()).where(FormField.form_id.in_(ids)).group_by(FormField.form_id)
        ).all()
    ) if ids else {}
    items = [
        FormListItem(
            id=f.id, title=f.title, description=f.description, slug=f.slug, owner_id=f.owner_id,
            owner_name=f.owner.full_name, is_active=f.is_active, is_public=f.is_public,
            allow_response_editing=f.allow_response_editing,
            field_count=field_counts.get(f.id, 0), response_count=resp_counts.get(f.id, 0),
            created_at=f.created_at, updated_at=f.updated_at,
        )
        for f in forms
    ]
    return Page.build(items, total, page, size)


@router.get(
    "/forms/{form_id}", response_model=FormOut,
    summary="Get a form with fields (owner/admin, or any user when the form is enabled - used to fill it)",
)
def get_form(form_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    form = get_form_or_404(db, form_id)
    if not (user.is_admin or form.owner_id == user.id) and not form.is_active:
        raise HTTPException(403, "This form is currently disabled")
    return form


@router.put("/forms/{form_id}", response_model=FormOut, summary="Edit form settings")
def update_form(
    form_id: int, data: FormUpdate, request: Request,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    form = get_managed_form(db, form_id, user)
    changes = data.model_dump(exclude_unset=True)
    for k, v in changes.items():
        setattr(form, k, v)
    log_activity(db, user, "form.update", "form", form.id, changes, request)
    db.commit()
    db.refresh(form)
    return form


@router.patch("/forms/{form_id}/status", response_model=FormOut, summary="Enable / disable a form")
def set_form_status(
    form_id: int, data: FormStatusIn, request: Request,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    form = get_managed_form(db, form_id, user)
    form.is_active = data.is_active
    log_activity(db, user, "form.enable" if data.is_active else "form.disable", "form", form.id, request=request)
    db.commit()
    db.refresh(form)
    return form


@router.post("/forms/{form_id}/duplicate", response_model=FormOut, status_code=201, summary="Duplicate a form with its fields")
def duplicate_form(
    form_id: int, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    src = get_managed_form(db, form_id, user)
    copy = Form(
        title=f"{src.title} (Copy)"[:255], description=src.description, slug=_slugify(src.title),
        owner_id=user.id, is_public=False, allow_response_editing=src.allow_response_editing,
    )
    db.add(copy)
    db.flush()
    mapping: dict[int, FormField] = {}
    for f in src.fields:
        nf = FormField(
            form_id=copy.id, label=f.label, field_type=f.field_type, placeholder=f.placeholder,
            help_text=f.help_text, is_required=f.is_required, order_index=f.order_index,
            min_value=f.min_value, max_value=f.max_value, cond_operator=f.cond_operator, cond_value=f.cond_value,
        )
        nf.options = [FieldOption(label=o.label, value=o.value, order_index=o.order_index) for o in f.options]
        db.add(nf)
        mapping[f.id] = nf
    db.flush()
    for f in src.fields:
        if f.cond_field_id in mapping:
            mapping[f.id].cond_field_id = mapping[f.cond_field_id].id
    log_activity(db, user, "form.duplicate", "form", copy.id, {"source_form_id": src.id}, request)
    db.commit()
    db.refresh(copy)
    return copy


@router.delete("/forms/{form_id}", response_model=Message, summary="Delete a form and all its responses")
def delete_form(
    form_id: int, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    form = get_managed_form(db, form_id, user)
    log_activity(db, user, "form.delete", "form", form.id, {"title": form.title}, request)
    db.delete(form)
    db.commit()
    return Message(message="Form deleted")


# ---------------------------------------------------------------- fields
def _clean_options(options: list[OptionIn]) -> list[FieldOption]:
    seen, out = set(), []
    for i, o in enumerate(options):
        value = (o.value or o.label).strip()
        if value in seen:
            raise HTTPException(422, f"Duplicate option value '{value}'")
        seen.add(value)
        out.append(FieldOption(label=o.label.strip(), value=value, order_index=i))
    return out


def _check_condition(form: Form, field_id: int | None, cond_field_id: int | None, operator: str | None) -> None:
    if cond_field_id is None:
        return
    by_id = {f.id: f for f in form.fields}
    if cond_field_id not in by_id:
        raise HTTPException(422, "cond_field_id must be a field of the same form")
    if field_id is not None:
        if cond_field_id == field_id:
            raise HTTPException(422, "A field cannot depend on itself")
        cursor, seen = by_id[cond_field_id], set()
        while cursor is not None and cursor.id not in seen:  # cycle detection
            if cursor.id == field_id:
                raise HTTPException(422, "Circular conditional logic is not allowed")
            seen.add(cursor.id)
            cursor = by_id.get(cursor.cond_field_id) if cursor.cond_field_id else None
    if operator is None:
        raise HTTPException(422, "cond_operator is required when cond_field_id is set")


def _check_bounds(min_v, max_v):
    if min_v is not None and max_v is not None and min_v > max_v:
        raise HTTPException(422, "min_value cannot be greater than max_value")


@router.get("/forms/{form_id}/fields", response_model=list[FieldOut], summary="List fields in display order")
def list_fields(form_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return get_form_or_404(db, form_id).fields


@router.post("/forms/{form_id}/fields", response_model=FieldOut, status_code=201, summary="Add a field (appended at the end)")
def add_field(
    form_id: int, data: FieldCreate, request: Request,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    form = get_managed_form(db, form_id, user)
    ftype = data.field_type.value
    if ftype in ("dropdown", "radio") and not data.options:
        raise HTTPException(422, f"'{ftype}' fields need at least one option")
    if data.options and ftype not in CHOICE_TYPES:
        raise HTTPException(422, f"'{ftype}' fields do not accept options")
    _check_bounds(data.min_value, data.max_value)
    _check_condition(form, None, data.cond_field_id, data.cond_operator.value if data.cond_operator else None)

    field = FormField(
        form_id=form.id, label=data.label.strip(), field_type=ftype, placeholder=data.placeholder,
        help_text=data.help_text, is_required=data.is_required, min_value=data.min_value,
        max_value=data.max_value, cond_field_id=data.cond_field_id,
        cond_operator=data.cond_operator.value if data.cond_operator else None,
        cond_value=data.cond_value,
        order_index=(max((f.order_index for f in form.fields), default=-1) + 1),
    )
    field.options = _clean_options(data.options)
    db.add(field)
    db.flush()
    log_activity(db, user, "field.create", "field", field.id, {"form_id": form.id, "label": field.label}, request)
    db.commit()
    db.refresh(field)
    return field


@router.put("/forms/{form_id}/fields/reorder", response_model=list[FieldOut], summary="Reorder fields (drag & drop)")
def reorder_fields(
    form_id: int, data: FieldReorderIn, request: Request,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    form = get_managed_form(db, form_id, user)
    if sorted(data.field_ids) != sorted(f.id for f in form.fields):
        raise HTTPException(422, "field_ids must contain every field of the form exactly once")
    by_id = {f.id: f for f in form.fields}
    for idx, fid in enumerate(data.field_ids):
        by_id[fid].order_index = idx
    log_activity(db, user, "field.reorder", "form", form.id, {"order": data.field_ids}, request)
    db.commit()
    db.refresh(form)
    return form.fields


@router.put("/forms/{form_id}/fields/{field_id}", response_model=FieldOut, summary="Edit a field (type cannot change)")
def update_field(
    form_id: int, field_id: int, data: FieldUpdate, request: Request,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    form = get_managed_form(db, form_id, user)
    field = next((f for f in form.fields if f.id == field_id), None)
    if not field:
        raise HTTPException(404, "Field not found in this form")
    changes = data.model_dump(exclude_unset=True)
    options = changes.pop("options", None)

    new_min = changes.get("min_value", field.min_value)
    new_max = changes.get("max_value", field.max_value)
    _check_bounds(new_min, new_max)
    if "cond_field_id" in changes or "cond_operator" in changes:
        cond_id = changes.get("cond_field_id", field.cond_field_id)
        op = changes.get("cond_operator", field.cond_operator)
        _check_condition(form, field.id, cond_id, op.value if hasattr(op, "value") else op)
        if cond_id is None:  # clearing the rule
            changes.update(cond_field_id=None, cond_operator=None, cond_value=None)
    for k, v in changes.items():
        setattr(field, k, v.value if hasattr(v, "value") else v)
    if "label" in changes:
        field.label = field.label.strip()

    if options is not None:
        if field.field_type not in CHOICE_TYPES:
            raise HTTPException(422, f"'{field.field_type}' fields do not accept options")
        if field.field_type in ("dropdown", "radio") and not options:
            raise HTTPException(422, f"'{field.field_type}' fields need at least one option")
        field.options = _clean_options([OptionIn(**o) for o in options])
    log_activity(db, user, "field.update", "field", field.id, {"form_id": form.id}, request)
    db.commit()
    db.refresh(field)
    return field


@router.delete("/forms/{form_id}/fields/{field_id}", response_model=Message, summary="Delete a field (and its collected answers)")
def delete_field(
    form_id: int, field_id: int, request: Request,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    form = get_managed_form(db, form_id, user)
    field = next((f for f in form.fields if f.id == field_id), None)
    if not field:
        raise HTTPException(404, "Field not found in this form")
    db.execute(delete(ResponseDetail).where(ResponseDetail.field_id == field.id))
    db.execute(
        update(FormField).where(FormField.cond_field_id == field.id)
        .values(cond_field_id=None, cond_operator=None, cond_value=None)
    )
    db.expire(form, ["fields"])
    log_activity(db, user, "field.delete", "field", field.id, {"form_id": form.id, "label": field.label}, request)
    db.delete(field)
    db.commit()
    return Message(message="Field deleted")


# ---------------------------------------------------------------- options
def _get_field(form: Form, field_id: int) -> FormField:
    field = next((f for f in form.fields if f.id == field_id), None)
    if not field:
        raise HTTPException(404, "Field not found in this form")
    if field.field_type not in CHOICE_TYPES:
        raise HTTPException(422, f"'{field.field_type}' fields do not accept options")
    return field


@router.post(
    "/forms/{form_id}/fields/{field_id}/options", response_model=OptionOut, status_code=201,
    summary="Add an option to a dropdown / radio / checkbox field",
)
def add_option(
    form_id: int, field_id: int, data: OptionIn,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    field = _get_field(get_managed_form(db, form_id, user), field_id)
    value = (data.value or data.label).strip()
    if any(o.value == value for o in field.options):
        raise HTTPException(422, f"Duplicate option value '{value}'")
    opt = FieldOption(field_id=field.id, label=data.label.strip(), value=value, order_index=len(field.options))
    db.add(opt)
    db.commit()
    db.refresh(opt)
    return opt


@router.put(
    "/forms/{form_id}/fields/{field_id}/options/{option_id}", response_model=OptionOut, summary="Edit an option"
)
def update_option(
    form_id: int, field_id: int, option_id: int, data: OptionIn,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    field = _get_field(get_managed_form(db, form_id, user), field_id)
    opt = next((o for o in field.options if o.id == option_id), None)
    if not opt:
        raise HTTPException(404, "Option not found")
    value = (data.value or data.label).strip()
    if any(o.value == value and o.id != opt.id for o in field.options):
        raise HTTPException(422, f"Duplicate option value '{value}'")
    opt.label, opt.value = data.label.strip(), value
    db.commit()
    db.refresh(opt)
    return opt


@router.delete("/forms/{form_id}/fields/{field_id}/options/{option_id}", response_model=Message, summary="Delete an option")
def delete_option(
    form_id: int, field_id: int, option_id: int,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    field = _get_field(get_managed_form(db, form_id, user), field_id)
    opt = next((o for o in field.options if o.id == option_id), None)
    if not opt:
        raise HTTPException(404, "Option not found")
    if field.field_type in ("dropdown", "radio") and len(field.options) == 1:
        raise HTTPException(422, "A dropdown/radio field needs at least one option")
    db.delete(opt)
    db.commit()
    return Message(message="Option deleted")
