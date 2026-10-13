from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "formbuilder",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.worker.tasks"],
)
celery_app.conf.update(
    task_serializer="json", result_serializer="json", accept_content=["json"],
    result_expires=3600, task_track_started=True, timezone="UTC",
)
