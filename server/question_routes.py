from fastapi import APIRouter, Depends, HTTPException, status
from peewee import DoesNotExist

from auth import get_current_user
from database import Paper, Question, QuestionGradingResult, UserRecord
from schemas import (
    CreateQuestionRequest,
    DeleteQuestionResponse,
    QuestionGradingResultResponse,
    QuestionResponse,
    UploadQuestionGradingResultRequest,
    UpdateQuestionRequest,
)


router = APIRouter()


def _parse_int_id(value: str, field_name: str) -> int:
    try:
        return int(value)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must be an integer string",
        )


@router.post("/questions", response_model=QuestionResponse)
def create_question(
    payload: CreateQuestionRequest,
    current_user: UserRecord = Depends(get_current_user),
) -> QuestionResponse:
    paper_id_int = _parse_int_id(payload.paper_id, "paper_id")
    try:
        Paper.get((Paper.id == paper_id_int) & (Paper.uid == current_user.id))
    except DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paper not found",
        )

    question = Question.create(
        paper_id=paper_id_int,
        type=payload.type,
        prompt=payload.prompt,
        answer=payload.answer,
    )
    return QuestionResponse(
        id=str(question.id),
        paper_id=str(question.paper_id),
        type=question.type,
        prompt=question.prompt,
        answer=question.answer,
    )


@router.delete("/questions/{question_id}", response_model=DeleteQuestionResponse)
def delete_question(
    question_id: str,
    current_user: UserRecord = Depends(get_current_user),
) -> DeleteQuestionResponse:
    question_id_int = _parse_int_id(question_id, "question_id")
    owned_paper_ids = Paper.select(Paper.id).where(Paper.uid == current_user.id)
    deleted_rows = (
        Question.delete()
        .where(
            (Question.id == question_id_int) & (Question.paper_id.in_(owned_paper_ids))
        )
        .execute()
    )
    if deleted_rows == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )
    return DeleteQuestionResponse(message="Question deleted")


@router.put("/questions/{question_id}", response_model=QuestionResponse)
def update_question(
    question_id: str,
    payload: UpdateQuestionRequest,
    current_user: UserRecord = Depends(get_current_user),
) -> QuestionResponse:
    question_id_int = _parse_int_id(question_id, "question_id")
    owned_paper_ids = Paper.select(Paper.id).where(Paper.uid == current_user.id)
    updated_rows = (
        Question.update(
            type=payload.type,
            prompt=payload.prompt,
            answer=payload.answer,
        )
        .where(
            (Question.id == question_id_int) & (Question.paper_id.in_(owned_paper_ids))
        )
        .execute()
    )
    if updated_rows == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )

    question = Question.get_by_id(question_id_int)
    return QuestionResponse(
        id=str(question.id),
        paper_id=str(question.paper_id),
        type=question.type,
        prompt=question.prompt,
        answer=question.answer,
    )


@router.post(
    "/questions/{question_id}/grading-result",
    response_model=QuestionGradingResultResponse,
)
def upload_question_grading_result(
    question_id: str,
    payload: UploadQuestionGradingResultRequest,
    current_user: UserRecord = Depends(get_current_user),
) -> QuestionGradingResultResponse:
    question_id_int = _parse_int_id(question_id, "question_id")

    try:
        Question.select(Question.id).join(
            Paper, on=(Question.paper_id == Paper.id)
        ).where((Question.id == question_id_int) & (Paper.uid == current_user.id)).get()
    except DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )

    result = QuestionGradingResult.get_or_none(
        QuestionGradingResult.question_id == question_id_int
    )
    if result is None:
        result = QuestionGradingResult.create(
            question_id=question_id_int,
            comment=payload.comment,
            score=payload.score,
            max_score=payload.max_score,
            is_correct=payload.is_correct,
        )
    else:
        result.comment = payload.comment
        result.score = payload.score
        result.max_score = payload.max_score
        result.is_correct = payload.is_correct
        result.save()

    return QuestionGradingResultResponse(
        id=str(result.id),
        question_id=str(result.question_id),
        comment=result.comment,
        score=result.score,
        max_score=result.max_score,
        is_correct=result.is_correct,
    )
