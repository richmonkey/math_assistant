from fastapi import APIRouter, Depends, HTTPException, status
from peewee import DoesNotExist

from auth import get_current_user
from database import (
    Paper,
    PaperGradingResult,
    Question,
    QuestionGradingResult,
    UserRecord,
)
from schemas import (
    CreatePaperRequest,
    DeletePaperResponse,
    PaperDetailResponse,
    PaperGradingResultResponse,
    PaperResponse,
    QuestionDetailResponse,
    QuestionGradingResultResponse,
    QuestionResponse,
    UploadPaperGradingResultRequest,
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


@router.post("/papers", response_model=PaperResponse)
def create_paper(
    payload: CreatePaperRequest,
    current_user: UserRecord = Depends(get_current_user),
) -> PaperResponse:
    paper = Paper.create(
        uid=current_user.id, title=payload.title, description=payload.description
    )
    return PaperResponse(
        id=str(paper.id),
        title=paper.title,
        description=paper.description,
        updated_at=paper.updated_at,
    )


@router.get("/papers", response_model=list[PaperResponse])
def list_papers(
    current_user: UserRecord = Depends(get_current_user),
) -> list[PaperResponse]:
    papers = (
        Paper.select(Paper.id, Paper.title, Paper.description, Paper.updated_at)
        .where(Paper.uid == current_user.id)
        .order_by(Paper.id)
    )
    return [
        PaperResponse(
            id=str(paper.id),
            title=paper.title,
            description=paper.description,
            updated_at=paper.updated_at,
        )
        for paper in papers
    ]


@router.delete("/papers/{paper_id}", response_model=DeletePaperResponse)
def delete_paper(
    paper_id: str,
    current_user: UserRecord = Depends(get_current_user),
) -> DeletePaperResponse:
    paper_id_int = _parse_int_id(paper_id, "paper_id")
    deleted_rows = (
        Paper.delete()
        .where((Paper.id == paper_id_int) & (Paper.uid == current_user.id))
        .execute()
    )
    if deleted_rows == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found"
        )
    return DeletePaperResponse(message="Paper deleted")


@router.get("/papers/{paper_id}", response_model=PaperDetailResponse)
def get_paper(
    paper_id: str,
    current_user: UserRecord = Depends(get_current_user),
) -> PaperDetailResponse:
    paper_id_int = _parse_int_id(paper_id, "paper_id")
    try:
        paper = Paper.get((Paper.id == paper_id_int) & (Paper.uid == current_user.id))
    except DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paper not found",
        )

    grading_result = PaperGradingResult.get_or_none(
        PaperGradingResult.paper_id == paper_id_int
    )
    grading_result_response = (
        PaperGradingResultResponse(
            id=str(grading_result.id),
            paper_id=str(grading_result.paper_id),
            comment=grading_result.comment,
            score=grading_result.score,
            max_score=grading_result.max_score,
        )
        if grading_result is not None
        else None
    )

    questions = (
        Question.select().where(Question.paper_id == paper_id_int).order_by(Question.id)
    )
    question_ids = [q.id for q in questions]
    grading_results_by_question = {}
    if question_ids:
        for qr in QuestionGradingResult.select().where(
            QuestionGradingResult.question_id.in_(question_ids)
        ):
            grading_results_by_question[qr.question_id] = qr

    question_details = [
        QuestionDetailResponse(
            id=str(q.id),
            paper_id=str(q.paper_id),
            session_id=q.session_id,
            type=q.type,
            prompt=q.prompt,
            answer=q.answer,
            grading_result=(
                QuestionGradingResultResponse(
                    id=str(grading_results_by_question[q.id].id),
                    question_id=str(q.id),
                    comment=grading_results_by_question[q.id].comment,
                    score=grading_results_by_question[q.id].score,
                    max_score=grading_results_by_question[q.id].max_score,
                    is_correct=grading_results_by_question[q.id].is_correct,
                )
                if q.id in grading_results_by_question
                else None
            ),
        )
        for q in questions
    ]

    return PaperDetailResponse(
        id=str(paper.id),
        uid=str(paper.uid),
        title=paper.title,
        description=paper.description,
        updated_at=paper.updated_at,
        grading_result=grading_result_response,
        questions=question_details,
    )


@router.get("/papers/{paper_id}/questions", response_model=list[QuestionResponse])
def list_paper_questions(
    paper_id: str,
    current_user: UserRecord = Depends(get_current_user),
) -> list[QuestionResponse]:
    paper_id_int = _parse_int_id(paper_id, "paper_id")
    try:
        Paper.get((Paper.id == paper_id_int) & (Paper.uid == current_user.id))
    except DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paper not found",
        )

    questions = (
        Question.select().where(Question.paper_id == paper_id_int).order_by(Question.id)
    )
    return [
        QuestionResponse(
            id=str(question.id),
            paper_id=str(question.paper_id),
            type=question.type,
            prompt=question.prompt,
            answer=question.answer,
        )
        for question in questions
    ]


@router.post(
    "/papers/{paper_id}/grading-result", response_model=PaperGradingResultResponse
)
def upload_paper_grading_result(
    paper_id: str,
    payload: UploadPaperGradingResultRequest,
    current_user: UserRecord = Depends(get_current_user),
) -> PaperGradingResultResponse:
    paper_id_int = _parse_int_id(paper_id, "paper_id")
    try:
        Paper.get((Paper.id == paper_id_int) & (Paper.uid == current_user.id))
    except DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paper not found",
        )

    result = PaperGradingResult.get_or_none(PaperGradingResult.paper_id == paper_id_int)
    if result is None:
        result = PaperGradingResult.create(
            paper_id=paper_id_int,
            comment=payload.comment,
            score=payload.score,
            max_score=payload.max_score,
        )
    else:
        result.comment = payload.comment
        result.score = payload.score
        result.max_score = payload.max_score
        result.save()

    return PaperGradingResultResponse(
        id=str(result.id),
        paper_id=str(result.paper_id),
        comment=result.comment,
        score=result.score,
        max_score=result.max_score,
    )
