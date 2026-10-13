from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.session import get_db
from app.models import Form, Role, User
from app.schemas.common import Message, Page
from app.schemas.user import RoleOut, RoleUpdate, UserOut, UserUpdate
from app.services.activity import log_activity

router = APIRouter(tags=["Users & Roles (Admin)"])


@router.get("/roles", response_model=list[RoleOut], summary="List roles")
def list_roles(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.scalars(select(Role).order_by(Role.id)).all()


@router.get("/users", response_model=Page[UserOut], summary="List / search users")
def list_users(
    search: str | None = Query(None, description="Matches name or email"),
    role: str | None = Query(None, pattern="^(admin|user)$"),
    is_active: bool | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    q = select(User)
    if search:
        like = f"%{search}%"
        q = q.where(or_(User.full_name.like(like), User.email.like(like)))
    if role:
        q = q.join(Role, User.role_id == Role.id).where(Role.name == role)
    if is_active is not None:
        q = q.where(User.is_active == is_active)
    total = db.scalar(select(func.count()).select_from(q.subquery()))
    items = db.scalars(q.order_by(User.id).offset((page - 1) * size).limit(size)).unique().all()
    return Page.build(items, total, page, size)


def _get_user(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user


@router.get("/users/{user_id}", response_model=UserOut, summary="Get a user")
def get_user(user_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return _get_user(db, user_id)


@router.patch("/users/{user_id}", response_model=UserOut, summary="Update name / activate / deactivate a user")
def update_user(
    user_id: int, data: UserUpdate, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_admin),
):
    user = _get_user(db, user_id)
    if data.is_active is False and user.id == admin.id:
        raise HTTPException(400, "You cannot deactivate your own account")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(user, k, v)
    log_activity(db, admin, "user.update", "user", user.id, data.model_dump(exclude_unset=True), request)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/role", response_model=UserOut, summary="Change a user's role")
def change_role(
    user_id: int, data: RoleUpdate, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_admin),
):
    user = _get_user(db, user_id)
    if user.id == admin.id:
        raise HTTPException(400, "You cannot change your own role")
    role = db.scalars(select(Role).where(Role.name == data.role)).one()
    user.role_id = role.id
    log_activity(db, admin, "user.role_change", "user", user.id, {"role": data.role}, request)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", response_model=Message, summary="Delete a user (only if they own no forms)")
def delete_user(
    user_id: int, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_admin)
):
    user = _get_user(db, user_id)
    if user.id == admin.id:
        raise HTTPException(400, "You cannot delete your own account")
    if db.scalar(select(func.count()).select_from(Form).where(Form.owner_id == user.id)):
        raise HTTPException(409, "User owns forms - deactivate the account instead")
    log_activity(db, admin, "user.delete", "user", user.id, {"email": user.email}, request)
    db.delete(user)
    db.commit()
    return Message(message="User deleted")
