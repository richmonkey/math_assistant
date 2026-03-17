from peewee import AutoField, CharField, Model, TextField

from .db import db


class BaseModel(Model):
    class Meta:
        database = db


class User(BaseModel):
    id = AutoField()
    username = CharField(unique=True, index=True)
    password_hash = CharField()


class UserRecord:
    id: int
    username: str
    password_hash: str
