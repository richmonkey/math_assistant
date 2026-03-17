from peewee import AutoField, CharField, Model, TextField, IntegerField

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
    type = CharField(
        max_length=16,
        choices=(
            ("single", "single"),
            ("multiple", "multiple"),
            ("blank", "blank"),
            ("essay", "essay"),
        ),
    )
    prompt = TextField()
    answer = TextField()


class QuestionRecord:
    id: int
    paper_id: int
    type: str
    prompt: str
    answer: str


class Paper(BaseModel):
    id = AutoField(primary_key=True)
    uid = IntegerField()
    title = CharField(max_length=255)


class PaperRecord:
    id: int
    uid: int
    title: str
