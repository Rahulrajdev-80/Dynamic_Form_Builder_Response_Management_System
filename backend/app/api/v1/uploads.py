from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import can_manage_form, get_current_user
from app.db.session import get_db
from app.models import Form, FormResponse, ResponseDetail, User
from app.schemas.response import UploadOut
from app.services.uploads import original_name, save_upload, stored_file_exists, upload_dir

router = APIRouter(tags=["File Uploads"])


@router.post("/uploads", response_model=UploadOut, status_code=201, summary="Upload a file for a 'file' field (logged-in users)")
async def upload_file(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    return await save_upload(file)


@router.get("/uploads/{file_id}", summary="Download an uploaded file (admin / form owner / submitter)")
def download_file(file_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not stored_file_exists(file_id):
        raise HTTPException(404, "File not found")
    if not user.is_admin:
        import json

        rows = db.execute(
            select(FormResponse, Form)
            .join(ResponseDetail, ResponseDetail.response_id == FormResponse.id)
            .join(Form, Form.id == FormResponse.form_id)
            .where(ResponseDetail.value == json.dumps(file_id, ensure_ascii=False))
        ).all()
        if not any(can_manage_form(user, form) or resp.user_id == user.id for resp, form in rows):
            raise HTTPException(403, "You do not have access to this file")
    return FileResponse(upload_dir() / file_id, filename=original_name(file_id))
