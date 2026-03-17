from fastapi import Depends, FastAPI, HTTPException, status
from contextlib import asynccontextmanager
import logging
from peewee import IntegrityError
import traceback
from auth import authenticate_user, create_access_token, get_current_user, hash_password
from config import DEFAULT_ADMIN_PASSWORD, DEFAULT_ADMIN_USERNAME
from database import close_database, init_database
from models import User, UserRecord
from schemas import EchoRequest, EchoResponse, LoginRequest, TokenResponse

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


@app.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    user = authenticate_user(payload.username, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    token = create_access_token(user=user)
    return TokenResponse(access_token=token, token_type="bearer")


@app.post("/echo", response_model=EchoResponse)
def echo(
    payload: EchoRequest, current_user: UserRecord = Depends(get_current_user)
) -> EchoResponse:
    return EchoResponse(message=payload.message, user=current_user.username)


# print("hash:", hash_password("1"))
# run server
# fastapi dev --host 0.0.0.0 main.py
# 启动
# uvicorn app.app:app --host 0.0.0.0 --port 8000
