from pathlib import Path
from peewee import SqliteDatabase
from config import DATABASE_FILENAME

db = SqliteDatabase(DATABASE_FILENAME, pragmas={"foreign_keys": 1})
