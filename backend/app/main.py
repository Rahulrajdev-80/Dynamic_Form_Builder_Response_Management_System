import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.security import hash_password
from app.db.session import Base, SessionLocal, engine
from app.models import Role, User

log = logging.getLogger("formbuilder")

DESCRIPTION = """
Backend for the **Dynamic Form Builder & Response Management System**.

**How to try it in Swagger**
1. `POST /auth/register` (or use the seeded admin) and then click **Authorize** - username is your *email*.
2. Create a form (`POST /forms`), add fields (`POST /forms/{id}/fields`), reorder them (`PUT /forms/{id}/fields/reorder`).
3. Submit responses as a logged-in user, or publicly through `/public/forms/{slug}`.
4. Explore responses, history, analytics, exports and activity logs.
"""

TAGS = [
    {"name": "Authentication", "description": "Register, login (JWT), refresh, current user"},
    {"name": "Users & Roles (Admin)", "description": "Admin-only user management and role assignment"},
    {"name": "Forms & Builder", "description": "Form CRUD, enable/disable, fields, options and drag-and-drop ordering"},
    {"name": "Public Forms (no login required)", "description": "Anonymous access via the public slug"},
    {"name": "Responses", "description": "Submit, search/filter, edit (permission based) and view history"},
    {"name": "File Uploads", "description": "File upload field support"},
    {"name": "Dashboard & Analytics", "description": "Overall and form-wise analytics"},
    {"name": "Exports (Excel & PDF)", "description": "Direct and background (Celery) exports"},
    {"name": "Activity Logs", "description": "Audit trail of user actions"},
    {"name": "System", "description": "Health check"},
]


def seed() -> None:
    with SessionLocal() as db:
        roles = {r.name: r for r in db.scalars(select(Role)).all()}
        for name, desc in (("admin", "Full access"), ("user", "Manage own forms and submit responses")):
            if name not in roles:
                roles[name] = Role(name=name, description=desc)
                db.add(roles[name])
        db.flush()
        if not db.scalars(select(User).where(User.email == settings.FIRST_ADMIN_EMAIL.lower())).first():
            db.add(
                User(
                    full_name=settings.FIRST_ADMIN_NAME, email=settings.FIRST_ADMIN_EMAIL.lower(),
                    hashed_password=hash_password(settings.FIRST_ADMIN_PASSWORD), role_id=roles["admin"].id,
                )
            )
            log.info("Seeded default admin %s", settings.FIRST_ADMIN_EMAIL)
        db.commit()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.EXPORT_DIR).mkdir(parents=True, exist_ok=True)
    if settings.AUTO_CREATE_TABLES:
        Base.metadata.create_all(engine)
    seed()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME, version="1.0.0", description=DESCRIPTION,
    openapi_tags=TAGS, lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware, allow_origins=settings.CORS_ORIGINS, allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["System"], summary="Health check")
def health():
    return {"status": "ok"}
