from datetime import datetime, timedelta, timezone
import logging
from fastapi import Header, HTTPException, status
from jose import ExpiredSignatureError, JWTError, jwt
from passlib.context import CryptContext
from peewee import DoesNotExist

from config import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM, SECRET_KEY
from database import User, UserRecord

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def authenticate_user(username: str, password: str) -> User | None:
    try:
        user = User.get(User.username == username)
        logging.info("Authenticating user: %s", username)
    except DoesNotExist:
        return None
    logging.info(
        "User found: %s, verifying password %s %s",
        username,
        user.password_hash,
        password,
    )
    if not verify_password(password, user.password_hash):
        return None
    return user


def create_access_token(*, user: User, expires_delta: timedelta | None = None) -> str:
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload = {"sub": str(user.id), "username": user.username, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> UserRecord:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing authentication token",
    )

    if not authorization:
        raise credentials_exception

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise credentials_exception

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired",
        )
    except JWTError:
        raise credentials_exception

    try:
        return User.get_by_id(int(user_id))
    except (DoesNotExist, TypeError, ValueError):
        raise credentials_exception
