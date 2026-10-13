from typing import Any

from pydantic import BaseModel


class DayCount(BaseModel):
    date: str
    count: int


class TopForm(BaseModel):
    form_id: int
    title: str
    responses: int


class DashboardOut(BaseModel):
    total_forms: int
    active_forms: int
    disabled_forms: int
    total_responses: int
    responses_today: int
    total_users: int | None = None
    responses_per_day: list[DayCount]
    top_forms: list[TopForm]


class FieldStat(BaseModel):
    field_id: int
    label: str
    field_type: str
    answered: int
    skipped: int
    distribution: dict[str, int] | None = None  # choice / rating fields
    average: float | None = None
    minimum: float | None = None
    maximum: float | None = None
    samples: list[Any] | None = None  # latest text-like values


class FormAnalyticsOut(BaseModel):
    form_id: int
    title: str
    total_responses: int
    authenticated_responses: int
    anonymous_responses: int
    last_response_at: str | None
    responses_per_day: list[DayCount]
    fields: list[FieldStat]
