from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class FieldType(str, Enum):
    text = "text"
    number = "number"
    email = "email"
    date = "date"
    dropdown = "dropdown"
    checkbox = "checkbox"
    radio = "radio"
    file = "file"
    rating = "rating"


class Operator(str, Enum):
    equals = "equals"
    not_equals = "not_equals"
    contains = "contains"
    gt = "gt"
    lt = "lt"
    not_empty = "not_empty"


CHOICE_TYPES = {FieldType.dropdown.value, FieldType.radio.value, FieldType.checkbox.value}


class OptionIn(BaseModel):
    label: str = Field(min_length=1, max_length=255, examples=["Chennai"])
    value: str | None = Field(default=None, max_length=255, description="Defaults to the label")


class OptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    label: str
    value: str
    order_index: int


class FieldBase(BaseModel):
    label: str = Field(min_length=1, max_length=255, examples=["Full name"])
    field_type: FieldType
    placeholder: str | None = Field(default=None, max_length=255)
    help_text: str | None = Field(default=None, max_length=500)
    is_required: bool = False
    min_value: float | None = Field(default=None, description="text: min length | number: min value")
    max_value: float | None = Field(default=None, description="text: max length | number: max value | rating: scale (default 5)")
    cond_field_id: int | None = Field(default=None, description="Show this field only when the parent field satisfies the rule")
    cond_operator: Operator | None = None
    cond_value: str | None = Field(default=None, max_length=255)


class FieldCreate(FieldBase):
    options: list[OptionIn] = []


class FieldUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=255)
    placeholder: str | None = None
    help_text: str | None = None
    is_required: bool | None = None
    min_value: float | None = None
    max_value: float | None = None
    cond_field_id: int | None = None
    cond_operator: Operator | None = None
    cond_value: str | None = None
    options: list[OptionIn] | None = Field(default=None, description="When provided, replaces all options")


class FieldReorderIn(BaseModel):
    field_ids: list[int] = Field(description="All field ids of the form in the new order")


class FieldOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    form_id: int
    label: str
    field_type: FieldType
    placeholder: str | None
    help_text: str | None
    is_required: bool
    order_index: int
    min_value: float | None
    max_value: float | None
    cond_field_id: int | None
    cond_operator: Operator | None
    cond_value: str | None
    options: list[OptionOut] = []


class FormCreate(BaseModel):
    title: str = Field(min_length=3, max_length=255, examples=["Customer Feedback"])
    description: str | None = None
    is_public: bool = False
    allow_response_editing: bool = False


class FormUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=255)
    description: str | None = None
    is_public: bool | None = None
    allow_response_editing: bool | None = None


class FormStatusIn(BaseModel):
    is_active: bool


class FormOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    slug: str
    owner_id: int
    is_active: bool
    is_public: bool
    allow_response_editing: bool
    created_at: datetime
    updated_at: datetime
    fields: list[FieldOut] = []


class FormListItem(BaseModel):
    id: int
    title: str
    description: str | None
    slug: str
    owner_id: int
    owner_name: str
    is_active: bool
    is_public: bool
    allow_response_editing: bool
    field_count: int
    response_count: int
    created_at: datetime
    updated_at: datetime


class PublicFormOut(BaseModel):
    """What an anonymous visitor may see about a form."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    slug: str
    fields: list[FieldOut] = []
