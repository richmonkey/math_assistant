import mimetypes
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status

from auth import get_current_user
from config import UPLOAD_IMAGE_DIR, UPLOAD_IMAGE_URL_PREFIX
from database import UserRecord
from schemas import UploadImageResponse


router = APIRouter()


def _resolve_file_extension(image: UploadFile) -> str:
    original_suffix = Path(image.filename or "").suffix.lower()
    if original_suffix:
        return original_suffix

    if image.content_type:
        guessed_suffix = mimetypes.guess_extension(image.content_type)
        if guessed_suffix:
            return guessed_suffix

    return ".img"


@router.post(
    "/images/upload",
    response_model=UploadImageResponse,
    summary="上传图片并返回可访问 URL",
)
async def upload_image(
    request: Request,
    image: UploadFile = File(...),
    current_user: UserRecord = Depends(get_current_user),
) -> UploadImageResponse:
    _ = current_user

    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be an image",
        )

    data = await image.read()
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image is empty",
        )

    upload_dir = Path(UPLOAD_IMAGE_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid4().hex}{_resolve_file_extension(image)}"
    file_path = upload_dir / filename
    file_path.write_bytes(data)

    image_url = UPLOAD_IMAGE_URL_PREFIX + "/" + filename
    return UploadImageResponse(url=image_url)