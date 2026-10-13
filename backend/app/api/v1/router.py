from fastapi import APIRouter

from app.api.v1 import activity, analytics, auth, exports, forms, public, responses, uploads, users

api_router = APIRouter()
for module in (auth, users, forms, public, responses, uploads, analytics, exports, activity):
    api_router.include_router(module.router)
