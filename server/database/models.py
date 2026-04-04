from peewee import (
    AutoField,
    CharField,
    DateTimeField,
    Model,
    TextField,
    IntegerField,
    BooleanField,
)
from datetime import datetime

from .db import db


class BaseModel(Model):
    class Meta:
        database = db


class User(BaseModel):
    id = AutoField(primary_key=True)
    username = CharField(unique=True, index=True)
    password_hash = CharField()


class UserRecord:
    id: int
    username: str
    password_hash: str


class Question(BaseModel):
    id = AutoField(primary_key=True)
    paper_id = IntegerField()
    session_id = CharField(max_length=64, null=True, default=None)
    type = CharField(
        max_length=16,
        choices=(
            ("single", "single"),
            ("multiple", "multiple"),
            ("blank", "blank"),
            ("judge", "judge"),
            ("free", "free"),
        ),
    )
    prompt = TextField()
    answer = TextField()
    reference_image_url = TextField(null=True, default=None)


class QuestionRecord:
    id: int
    paper_id: int
    session_id: str | None
    type: str
    prompt: str
    answer: str
    reference_image_url: str | None


class Paper(BaseModel):
    id = AutoField(primary_key=True)
    uid = IntegerField()
    title = CharField(max_length=255)
    description = TextField(null=True, default=None)
    updated_at = DateTimeField(default=datetime.now)


class PaperRecord:
    id: int
    uid: int
    title: str
    description: str | None
    updated_at: datetime


class QuestionGradingResult(BaseModel):
    id = AutoField(primary_key=True)
    question_id = IntegerField()
    comment = TextField()
    score = IntegerField()
    max_score = IntegerField()
    is_correct = BooleanField()


class QuestionGradingResultRecord:
    id: int
    question_id: int
    comment: str
    score: int
    max_score: int
    is_correct: bool


class PaperGradingResult(BaseModel):
    id = AutoField(primary_key=True)
    paper_id = IntegerField()
    comment = TextField()
    score = IntegerField()
    max_score = IntegerField()


class PaperGradingResultRecord:
    id: int
    paper_id: int
    comment: str
    score: int
    max_score: int
