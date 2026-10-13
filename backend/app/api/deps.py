from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.security import decode_token
from app.db.session import get_db
from app.models import Form, FormResponse, User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/token", auto_error=False)


def _user_from_token(token: str | None, db: Session) -> User | None:
    if not token:
        return None
    user_id = decode_token(token, "access")
    if user_id is None:
        return None
    user = db.get(User, user_id)
    return user if user and user.is_active else None


def get_current_user(token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    user = _user_from_token(token, db)
    if user is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Invalid or expired token", headers={"WWW-Authenticate": "Bearer"}
        )
    return user


def get_optional_user(token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User | None:
    return _user_from_token(token, db)


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
    return user


def get_form_or_404(db: Session, form_id: int) -> Form:
    form = db.scalars(select(Form).where(Form.id == form_id).options(selectinload(Form.fields))).first()
    if not form:
        raise HTTPException(404, "Form not found")
    return form


def can_manage_form(user: User, form: Form) -> bool:
    return user.is_admin or form.owner_id == user.id


def get_managed_form(db: Session, form_id: int, user: User) -> Form:
    """Form that the user is allowed to modify / read responses of (admin or owner)."""
    form = get_form_or_404(db, form_id)
    if not can_manage_form(user, form):
        raise HTTPException(403, "You do not have permission to manage this form")
    return form


def get_response_or_404(db: Session, response_id: int) -> FormResponse:
    resp = db.get(FormResponse, response_id)
    if not resp:
        raise HTTPException(404, "Response not found")
    return resp


def can_edit_response(user: User, resp: FormResponse) -> bool:
    if can_manage_form(user, resp.form):
        return True
    return bool(resp.form.allow_response_editing and resp.user_id == user.id)
