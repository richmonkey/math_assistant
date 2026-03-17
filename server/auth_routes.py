from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timedelta, timezone

from auth import authenticate_user, create_access_token, get_current_user
from config import ACCESS_TOKEN_EXPIRE_MINUTES
from database import UserRecord
from schemas import EchoRequest, EchoResponse, LoginRequest, TokenResponse


router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    user = authenticate_user(payload.username, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    expires_at = datetime.now(timezone.utc) + expires_delta
    token = create_access_token(user=user, expires_delta=expires_delta)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_at=expires_at,
        expires_in=int(expires_delta.total_seconds()),
    )


@router.post("/echo", response_model=EchoResponse)
def echo(
    payload: EchoRequest, current_user: UserRecord = Depends(get_current_user)
) -> EchoResponse:
    return EchoResponse(message=payload.message, user=current_user.username)
