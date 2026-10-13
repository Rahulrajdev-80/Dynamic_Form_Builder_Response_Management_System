import os
import re
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.core.config import settings

ALLOWED_EXT = {".pdf", ".png", ".jpg", ".jpeg", ".gif", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt"}
_SAFE = re.compile(r"[^A-Za-z0-9._-]")


def upload_dir() -> Path:
    p = Path(settings.UPLOAD_DIR)
    p.mkdir(parents=True, exist_ok=True)
    return p


def stored_file_exists(file_id: str) -> bool:
    return bool(file_id) and os.path.basename(file_id) == file_id and (upload_dir() / file_id).is_file()


def original_name(file_id: str) -> str:
    return file_id.split("__", 1)[1] if "__" in file_id else file_id


async def save_upload(file: UploadFile) -> dict:
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(415, f"File type '{ext or 'unknown'}' is not allowed")
    data = await file.read()
    if len(data) > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(413, f"File exceeds {settings.MAX_UPLOAD_MB} MB")
    safe = _SAFE.sub("_", Path(file.filename or "file").name)
    file_id = f"{uuid.uuid4().hex}__{safe}"
    (upload_dir() / file_id).write_bytes(data)
    return {
        "file_id": file_id,
        "original_name": safe,
        "size": len(data),
        "content_type": file.content_type,
        "url": f"{settings.API_V1_PREFIX}/uploads/{file_id}",
    }
