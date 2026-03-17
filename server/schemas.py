from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    expires_in: int


class EchoRequest(BaseModel):
    message: str


class EchoResponse(BaseModel):
    message: str
    user: str


class CreatePaperRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None


class PaperResponse(BaseModel):
    id: str

    title: str
    description: str | None = None
    updated_at: datetime


class DeletePaperResponse(BaseModel):
    message: str


QuestionType = Literal["single", "multiple", "blank", "essay"]


class CreateQuestionRequest(BaseModel):
    paper_id: str
    type: QuestionType
    prompt: str = Field()
    answer: str = Field()


class UpdateQuestionRequest(BaseModel):
    type: QuestionType
    prompt: str = Field()
    answer: str = Field()


class QuestionResponse(BaseModel):
    id: str
    paper_id: str
    type: QuestionType
    prompt: str
    answer: str


class DeleteQuestionResponse(BaseModel):
    message: str


class UploadQuestionGradingResultRequest(BaseModel):
    comment: str = Field()
    score: int
    max_score: int
    is_correct: bool


class QuestionGradingResultResponse(BaseModel):
    id: str
    question_id: str
    comment: str
    score: int
    max_score: int
    is_correct: bool


class UploadPaperGradingResultRequest(BaseModel):
    comment: str = Field()
    score: int
    max_score: int


class PaperGradingResultResponse(BaseModel):
    id: str
    paper_id: str
    comment: str
    score: int
    max_score: int


class QuestionDetailResponse(BaseModel):
    id: str
    paper_id: str
    type: QuestionType
    prompt: str
    answer: str
    grading_result: QuestionGradingResultResponse | None = None


class PaperDetailResponse(BaseModel):
    id: str
    uid: str
    title: str
    description: str | None = None
    updated_at: datetime
    grading_result: PaperGradingResultResponse | None = None
    questions: list[QuestionDetailResponse] = []
