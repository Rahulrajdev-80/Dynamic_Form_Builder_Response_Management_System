"""Server-side validation of submitted answers, including conditional visibility."""
import re
from datetime import date
from typing import Any

from fastapi import HTTPException

from app.models import FormField
from app.services.uploads import stored_file_exists

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def is_empty(v: Any) -> bool:
    return v is None or (isinstance(v, str) and v.strip() == "") or (isinstance(v, list) and len(v) == 0)


def _norm(x: Any) -> str:
    return str(x).strip().lower()


def _to_float(x: Any) -> float | None:
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def evaluate_rule(operator: str, actual: Any, expected: str | None) -> bool:
    if operator == "not_empty":
        return not is_empty(actual)
    if is_empty(actual):
        return operator == "not_equals"
    items = [_norm(i) for i in actual] if isinstance(actual, list) else [_norm(actual)]
    exp = _norm(expected if expected is not None else "")
    if operator == "equals":
        return exp in items
    if operator == "not_equals":
        return exp not in items
    if operator == "contains":
        return any(exp in i for i in items)
    if operator in ("gt", "lt"):
        a, e = _to_float(actual if not isinstance(actual, list) else None), _to_float(expected)
        if a is None or e is None:
            return False
        return a > e if operator == "gt" else a < e
    return True


def compute_visibility(fields: list[FormField], values: dict[int, Any]) -> dict[int, bool]:
    """A field is visible when its own rule passes AND its parent field is visible."""
    by_id = {f.id: f for f in fields}
    memo: dict[int, bool] = {}

    def visible(f: FormField, stack: tuple[int, ...] = ()) -> bool:
        if f.id in memo:
            return memo[f.id]
        if f.cond_field_id is None or f.cond_field_id not in by_id or f.id in stack:
            result = True
        else:
            parent = by_id[f.cond_field_id]
            result = visible(parent, stack + (f.id,)) and evaluate_rule(
                f.cond_operator or "equals", values.get(parent.id), f.cond_value
            )
        memo[f.id] = result
        return result

    return {f.id: visible(f) for f in fields}


def _validate_value(field: FormField, value: Any) -> tuple[Any, str | None]:
    """Returns (cleaned_value, error)."""
    t = field.field_type
    option_values = [o.value for o in field.options]

    if t == "text":
        if not isinstance(value, str):
            return None, "Must be text"
        value = value.strip()
        if field.min_value is not None and len(value) < field.min_value:
            return None, f"Must be at least {int(field.min_value)} characters"
        if field.max_value is not None and len(value) > field.max_value:
            return None, f"Must be at most {int(field.max_value)} characters"
        return value, None

    if t == "number":
        if isinstance(value, bool) or not isinstance(value, (int, float, str)):
            return None, "Must be a number"
        num = _to_float(value)
        if num is None:
            return None, "Must be a number"
        if field.min_value is not None and num < field.min_value:
            return None, f"Must be >= {field.min_value:g}"
        if field.max_value is not None and num > field.max_value:
            return None, f"Must be <= {field.max_value:g}"
        return (int(num) if num.is_integer() else num), None

    if t == "email":
        if not isinstance(value, str) or not EMAIL_RE.match(value.strip()):
            return None, "Must be a valid email address"
        return value.strip().lower(), None

    if t == "date":
        try:
            return date.fromisoformat(str(value)).isoformat(), None
        except ValueError:
            return None, "Must be a valid date (YYYY-MM-DD)"

    if t in ("dropdown", "radio"):
        if not isinstance(value, str) or value not in option_values:
            return None, "Must be one of the available options"
        return value, None

    if t == "checkbox":
        if not option_values:  # single tick-box
            if isinstance(value, bool):
                return value, None
            return None, "Must be true or false"
        if not isinstance(value, list) or any(v not in option_values for v in value):
            return None, "Must be a list of available options"
        return list(dict.fromkeys(value)), None

    if t == "rating":
        scale = int(field.max_value or 5)
        try:
            n = int(value)
        except (TypeError, ValueError):
            return None, f"Must be a whole number between 1 and {scale}"
        if isinstance(value, bool) or n != float(value) or not 1 <= n <= scale:
            return None, f"Must be a whole number between 1 and {scale}"
        return n, None

    if t == "file":
        if not isinstance(value, str) or not stored_file_exists(value):
            return None, "Upload the file first and send the returned file_id"
        return value, None

    return None, f"Unsupported field type '{t}'"


def validate_answers(fields: list[FormField], answers: list[dict]) -> dict[int, Any]:
    """Validates the answers against the form definition.

    Returns {field_id: cleaned_value} for visible, non-empty fields.
    Raises HTTP 422 with per-field errors otherwise.
    """
    by_id = {f.id: f for f in fields}
    errors: dict[str, str] = {}
    raw: dict[int, Any] = {}

    for a in answers:
        fid = a["field_id"]
        if fid not in by_id:
            errors[str(fid)] = "Field does not belong to this form"
        elif fid in raw:
            errors[str(fid)] = "Duplicate answer for this field"
        else:
            raw[fid] = a.get("value")

    visibility = compute_visibility(fields, raw)
    cleaned: dict[int, Any] = {}

    for f in fields:
        if not visibility[f.id]:
            continue  # hidden by conditional logic: ignore value, never required
        value = raw.get(f.id)
        if is_empty(value):
            if f.is_required:
                errors[str(f.id)] = f"'{f.label}' is required"
            continue
        clean, err = _validate_value(f, value)
        if err:
            errors[str(f.id)] = f"'{f.label}': {err}"
        else:
            cleaned[f.id] = clean

    if errors:
        raise HTTPException(status_code=422, detail={"message": "Validation failed", "errors": errors})
    return cleaned
