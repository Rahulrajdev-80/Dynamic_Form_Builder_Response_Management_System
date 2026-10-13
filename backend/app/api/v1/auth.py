from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import (
    create_access_token, create_refresh_token, decode_token, hash_password, verify_password,
)
from app.db.session import get_db
from app.models import Role, User
from app.schemas.user import LoginIn, RefreshIn, RegisterIn, TokenOut, UserOut
from app.services.activity import log_activity

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _issue_tokens(user: User) -> TokenOut:
    return TokenOut(access_token=create_access_token(user.id), refresh_token=create_refresh_token(user.id))


def _authenticate(db: Session, email: str, password: str) -> User:
    user = db.scalars(select(User).where(User.email == email.lower())).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(401, "Incorrect email or password")
    if not user.is_active:
        raise HTTPException(403, "This account has been deactivated")
    return user


@router.post("/register", response_model=UserOut, status_code=201, summary="Register a new user (role: user)")
def register(data: RegisterIn, request: Request, db: Session = Depends(get_db)):
    if db.scalars(select(User).where(User.email == data.email.lower())).first():
        raise HTTPException(409, "Email is already registered")
    role = db.scalars(select(Role).where(Role.name == "user")).one()
    user = User(
        full_name=data.full_name.strip(), email=data.email.lower(),
        hashed_password=hash_password(data.password), role_id=role.id,
    )
    db.add(user)
    db.flush()
    log_activity(db, user, "user.register", "user", user.id, request=request)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenOut, summary="Login with email & password (JSON) and get JWT tokens")
def login(data: LoginIn, request: Request, db: Session = Depends(get_db)):
    user = _authenticate(db, data.email, data.password)
    log_activity(db, user, "user.login", "user", user.id, request=request)
    db.commit()
    return _issue_tokens(user)


@router.post(
    "/token", response_model=TokenOut, include_in_schema=True,
    summary="OAuth2 password flow (used by the Swagger 'Authorize' button; username = email)",
)
def login_form(request: Request, form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = _authenticate(db, form.username, form.password)
    log_activity(db, user, "user.login", "user", user.id, request=request)
    db.commit()
    return _issue_tokens(user)


@router.post("/refresh", response_model=TokenOut, summary="Exchange a refresh token for new tokens")
def refresh(data: RefreshIn, db: Session = Depends(get_db)):
    user_id = decode_token(data.refresh_token, "refresh")
    user = db.get(User, user_id) if user_id else None
    if not user or not user.is_active:
        raise HTTPException(401, "Invalid or expired refresh token")
    return _issue_tokens(user)


@router.get("/me", response_model=UserOut, summary="Current logged-in user")
def me(user: User = Depends(get_current_user)):
    return user
