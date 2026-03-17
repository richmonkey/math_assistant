from .models import Paper, PaperRecord, Question, QuestionRecord, User, UserRecord
from .db import db


def init_database() -> None:
    db.connect(reuse_if_open=True)
    db.create_tables([User, Paper, Question])


def close_database() -> None:
    if not db.is_closed():
        db.close()
