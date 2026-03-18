from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from peewee import IntegrityError
import traceback
from auth import hash_password
from auth_routes import router as auth_router
from config import DEFAULT_ADMIN_PASSWORD, DEFAULT_ADMIN_USERNAME
from database import close_database, init_database
from database import User
from paper_routes import router as paper_router
from question_routes import router as question_router
from agent_routers import router as agent_router
from logger import init_logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 创建连接池
    try:
        init_logger()
        init_database()
        ensure_default_user()
    except Exception as e:
        logging.error(
            "Failed to initialize database: %s", "".join(traceback.format_exception(e))
        )
    yield

    close_database()


def ensure_default_user() -> None:
    try:
        r = User.create(
            username=DEFAULT_ADMIN_USERNAME,
            password_hash=hash_password(DEFAULT_ADMIN_PASSWORD),
        )
        logging.info(
            "Created default admin user: %s, ID: %s", DEFAULT_ADMIN_USERNAME, r.id
        )
    except IntegrityError:
        # User already exists.
        logging.info("Default admin user already exists: %s", DEFAULT_ADMIN_USERNAME)
        pass


app = FastAPI(title="Math Assistant Auth Service", lifespan=lifespan)


# 允许跨域请求 (为了方便前端调用)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router, prefix="/v1")
app.include_router(paper_router, prefix="/v1")
app.include_router(question_router, prefix="/v1")
app.include_router(agent_router, prefix="/v1")


# print("hash:", hash_password("1"))
# run server
# fastapi dev --host 0.0.0.0 main.py
# 启动
# uvicorn app.app:app --host 0.0.0.0 --port 8000
