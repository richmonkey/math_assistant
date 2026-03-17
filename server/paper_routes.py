from fastapi import APIRouter, Depends, HTTPException, status
from peewee import DoesNotExist

from auth import get_current_user
from database import Paper, Question, UserRecord
from schemas import (
    CreatePaperRequest,
    DeletePaperResponse,
    PaperResponse,
    PaperSummaryResponse,
    QuestionResponse,
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
    paper = Paper.create(uid=current_user.id, title=payload.title)
    return PaperResponse(id=str(paper.id), uid=str(paper.uid), title=paper.title)


@router.get("/papers", response_model=list[PaperSummaryResponse])
def list_papers(
    current_user: UserRecord = Depends(get_current_user),
) -> list[PaperSummaryResponse]:
    papers = (
        Paper.select(Paper.id, Paper.title)
        .where(Paper.uid == current_user.id)
        .order_by(Paper.id)
    )
    return [
        PaperSummaryResponse(id=str(paper.id), title=paper.title) for paper in papers
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
