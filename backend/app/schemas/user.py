from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120, examples=["Sandhiya"])
    email: EmailStr = Field(examples=["sandhiya@example.com"])
    password: str = Field(min_length=8, max_length=72, examples=["StrongPass@123"])


class LoginIn(BaseModel):
    email: EmailStr = Field(examples=["admin@example.com"])
    password: str = Field(examples=["Admin@12345"])


class RefreshIn(BaseModel):
    refresh_token: str


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    role_name: str
    is_active: bool
    created_at: datetime


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    is_active: bool | None = None


class RoleUpdate(BaseModel):
    role: str = Field(pattern="^(admin|user)$", examples=["admin"])


class RoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None
