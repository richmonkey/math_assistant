from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from auth import get_current_user
from database import UserRecord
from ocr_service import (
    answer_ocr_from_data_url,
    encode_upload_file_to_data_url,
    paper_ocr_from_data_url,
    question_ocr_from_data_url,
)


router = APIRouter()


class PaperOcrResponse(BaseModel):
    raw_text: str
    payload: dict[str, Any] | list[Any]


class QuestionOcrResponse(BaseModel):
    raw_text: str
    payload: dict[str, Any] | list[Any]


class AnswerOcrResponse(BaseModel):
    text: str


@router.post(
    "/ocr/paper",
    response_model=PaperOcrResponse,
    summary="试卷图片 OCR（结构化 JSON）",
)
async def paper_ocr(
    image: UploadFile = File(...),
    current_user: UserRecord = Depends(get_current_user),
) -> PaperOcrResponse:
    _ = current_user
    data = await image.read()
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image is empty",
        )

    image_data_url = encode_upload_file_to_data_url(image, data)
    raw_text, payload = await paper_ocr_from_data_url(image_data_url)
    return PaperOcrResponse(raw_text=raw_text, payload=payload)


@router.post(
    "/ocr/question",
    response_model=QuestionOcrResponse,
    summary="单题图片 OCR（结构化 JSON）",
)
async def question_ocr(
    image: UploadFile = File(...),
    current_user: UserRecord = Depends(get_current_user),
) -> QuestionOcrResponse:
    _ = current_user
    data = await image.read()
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image is empty",
        )

    image_data_url = encode_upload_file_to_data_url(image, data)
    raw_text, payload = await question_ocr_from_data_url(image_data_url)
    return QuestionOcrResponse(raw_text=raw_text, payload=payload)


@router.post(
    "/ocr/answer",
    response_model=AnswerOcrResponse,
    summary="答案图片 OCR（纯文本）",
)
async def answer_ocr(
    image: UploadFile = File(...),
    current_user: UserRecord = Depends(get_current_user),
) -> AnswerOcrResponse:
    _ = current_user
    data = await image.read()
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image is empty",
        )

    image_data_url = encode_upload_file_to_data_url(image, data)
    text = await answer_ocr_from_data_url(image_data_url)
    return AnswerOcrResponse(text=text)
