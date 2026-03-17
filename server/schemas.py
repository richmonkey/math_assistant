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


class PaperResponse(BaseModel):
    id: str
    uid: str
    title: str


class DeletePaperResponse(BaseModel):
    message: str


class PaperSummaryResponse(BaseModel):
    id: str
    title: str


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
