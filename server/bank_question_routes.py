from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional

from auth import get_current_user
from database import BankQuestion, UserRecord
from schemas import BankQuestionResponse, CreateBankQuestionRequest, UpdateBankQuestionRequest


router = APIRouter()


@router.post("/bank-questions", response_model=BankQuestionResponse, status_code=status.HTTP_201_CREATED)
def create_bank_question(
    payload: CreateBankQuestionRequest,
    current_user: UserRecord = Depends(get_current_user),
) -> BankQuestionResponse:
    if current_user.username != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied",
        )
    if payload.external_url is not None:
        exists = BankQuestion.select().where(BankQuestion.external_url == payload.external_url).exists()
        if exists:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="BankQuestion with this external_url already exists",
            )
        
    q = BankQuestion.create(
        type=payload.type,
        prompt=payload.prompt,
        answer=payload.answer,
        standard_answer_image_url=payload.standard_answer_image_url,
        reference_image_url=payload.reference_image_url,
        content_image_url=payload.content_image_url,
        external_url=payload.external_url,
        has_image=payload.has_image,
        difficulty=payload.difficulty,
        knowledge_points=payload.knowledge_points,
    )
    return BankQuestionResponse(
        id=str(q.id),
        type=q.type,
        prompt=q.prompt,
        answer=q.answer,
        standard_answer_image_url=q.standard_answer_image_url,
        reference_image_url=q.reference_image_url,
        content_image_url=q.content_image_url,
        external_url=q.external_url,
        has_image=q.has_image,
        is_published=q.is_published,
        difficulty=q.difficulty,
        knowledge_points=q.knowledge_points,
    )


@router.get("/bank-questions", response_model=list[BankQuestionResponse])
def list_bank_questions(
    is_published: Optional[bool] = Query(None, description="过滤已发布(true)或未发布(false)的题目，不传则返回全部"),
    current_user: UserRecord = Depends(get_current_user),
) -> list[BankQuestionResponse]:
    if current_user.username != "admin":
        return []
    
    query = BankQuestion.select()
    if is_published is not None:
        query = query.where(BankQuestion.is_published == is_published)
    query = query.order_by(BankQuestion.id)

    return [
        BankQuestionResponse(
            id=str(q.id),
            type=q.type,
            prompt=q.prompt,
            answer=q.answer,
            standard_answer_image_url=q.standard_answer_image_url,
            reference_image_url=q.reference_image_url,
            content_image_url=q.content_image_url,
            external_url=q.external_url,
            has_image=q.has_image,
            is_published=q.is_published,
            difficulty=q.difficulty,
            knowledge_points=q.knowledge_points,
        )
        for q in query
    ]


@router.put("/bank-questions/{question_id}", response_model=BankQuestionResponse)
def update_bank_question(
    question_id: str,
    payload: UpdateBankQuestionRequest,
    current_user: UserRecord = Depends(get_current_user),
) -> BankQuestionResponse:
    try:
        question_id_int = int(question_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="question_id must be an integer string",
        )
    update_fields: dict = dict(
        prompt=payload.prompt,
        answer=payload.answer,
        reference_image_url=payload.reference_image_url,
        difficulty=payload.difficulty,
        knowledge_points=payload.knowledge_points,
    )
    if payload.type is not None:
        update_fields["type"] = payload.type
    updated = (
        BankQuestion.update(**update_fields)
        .where(BankQuestion.id == question_id_int)
        .execute()
    )
    if updated == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="BankQuestion not found",
        )
    q = BankQuestion.get_by_id(question_id_int)
    return BankQuestionResponse(
        id=str(q.id),
        type=q.type,
        prompt=q.prompt,
        answer=q.answer,
        standard_answer_image_url=q.standard_answer_image_url,
        reference_image_url=q.reference_image_url,
        content_image_url=q.content_image_url,
        external_url=q.external_url,
        has_image=q.has_image,
        is_published=q.is_published,
        difficulty=q.difficulty,
        knowledge_points=q.knowledge_points,
    )


@router.put("/bank-questions/{question_id}/publish", response_model=BankQuestionResponse)
def publish_bank_question(
    question_id: str,
    current_user: UserRecord = Depends(get_current_user),
) -> BankQuestionResponse:
    try:
        question_id_int = int(question_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="question_id must be an integer string",
        )
    updated = (
        BankQuestion.update(is_published=True)
        .where(BankQuestion.id == question_id_int)
        .execute()
    )
    if updated == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="BankQuestion not found",
        )
    q = BankQuestion.get_by_id(question_id_int)
    return BankQuestionResponse(
        id=str(q.id),
        type=q.type,
        prompt=q.prompt,
        answer=q.answer,
        standard_answer_image_url=q.standard_answer_image_url,
        reference_image_url=q.reference_image_url,
        content_image_url=q.content_image_url,
        external_url=q.external_url,
        has_image=q.has_image,
        is_published=q.is_published,
        difficulty=q.difficulty,
        knowledge_points=q.knowledge_points,
    )
