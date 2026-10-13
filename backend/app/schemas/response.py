from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class AnswerIn(BaseModel):
    field_id: int
    value: Any = Field(default=None, description="string | number | boolean | list[str] depending on the field type")


class SubmitIn(BaseModel):
    answers: list[AnswerIn]

    model_config = {
        "json_schema_extra": {
            "example": {
                "answers": [
                    {"field_id": 1, "value": "Sandhiya"},
                    {"field_id": 2, "value": "sandhiya@example.com"},
                    {"field_id": 3, "value": 4},
                ]
            }
        }
    }


class AnswerOut(BaseModel):
    field_id: int
    label: str
    field_type: str
    value: Any


class ResponseOut(BaseModel):
    id: int
    form_id: int
    form_title: str | None = None
    user_id: int | None
    submitted_by: str | None
    created_at: datetime
    updated_at: datetime
    answers: list[AnswerOut]


class HistoryChange(BaseModel):
    field_id: int
    label: str
    old: Any
    new: Any


class HistoryOut(BaseModel):
    id: int
    action: str
    changed_by: int | None
    changed_by_name: str | None
    created_at: datetime
    changes: list[HistoryChange]
    snapshot: dict[str, Any]


class UploadOut(BaseModel):
    file_id: str = Field(description="Send this as the answer value of a 'file' field")
    original_name: str
    size: int
    content_type: str | None
    url: str


class ActivityLogOut(BaseModel):
    id: int
    user_id: int | None
    user_name: str | None
    action: str
    entity_type: str
    entity_id: int | None
    details: dict | None
    ip_address: str | None
    created_at: datetime
