from .models import (
    Paper,
    PaperGradingResult,
    PaperRecord,
    Question,
    QuestionGradingResult,
    QuestionRecord,
    User,
    UserRecord,
    BankQuestion,
    BankQuestionRecord,
)
from .db import db
import logging

VERSION = 2


def upgrade_v1_to_v2():
   db.execute_sql("ALTER TABLE question ADD COLUMN reference_image_url TEXT DEFAULT NULL")    

def init_database() -> None:
    db.connect(reuse_if_open=True)

    version = db.pragma("user_version")
    if not version:
        logging.info("create new database")
        if not Question.table_exists():
            db.create_tables([User, Paper, Question, BankQuestion, QuestionGradingResult, PaperGradingResult])
            db.pragma("user_version", VERSION)
            version = VERSION
        else:
            version = 1
            logging.warning(
                "Database version is unknown, but 'question' table exists. Assuming version 1."
            )
    if version == 1:
        logging.info("upgrade database from v1 to v2")
        upgrade_v1_to_v2()
        db.pragma("user_version", 2)
        version = 2

    if version != VERSION:
        raise RuntimeError(f"Unsupported database version: {version}")


def close_database() -> None:
    if not db.is_closed():
        db.close()
