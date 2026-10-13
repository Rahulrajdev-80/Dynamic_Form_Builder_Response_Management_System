from fastapi import Request
from sqlalchemy.orm import Session

from app.models import ActivityLog, User


def log_activity(
    db: Session,
    user: User | None,
    action: str,
    entity_type: str,
    entity_id: int | None = None,
    details: dict | None = None,
    request: Request | None = None,
) -> None:
    """Adds an activity log row to the current transaction (caller commits)."""
    ip = request.client.host if request and request.client else None
    db.add(
        ActivityLog(
            user_id=user.id if user else None,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
            ip_address=ip,
        )
    )
