from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from openai import APIConnectionError, APIError, APITimeoutError, OpenAI
from pydantic import BaseModel, Field

from auth import get_current_user
from config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
from database import UserRecord


router = APIRouter()
openai_client = OpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL)


class OpenAIChatCompletionsRequest(BaseModel):
    model: str | None = None
    messages: list[dict[str, Any]] = Field(default_factory=list)
    stream: bool = False
    temperature: float | None = None
    max_tokens: int | None = None
    top_p: float | None = None
    frequency_penalty: float | None = None
    presence_penalty: float | None = None


def _upstream_chat_completions(payload: dict[str, Any]) -> dict[str, Any]:
    try:
        completion = openai_client.chat.completions.create(**payload, timeout=90)
        return completion.model_dump()
    except APITimeoutError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Upstream OpenAI request timed out",
        )
    except APIConnectionError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect upstream OpenAI service: {exc}",
        )
    except APIError as exc:
        status_code = getattr(exc, "status_code", None) or status.HTTP_502_BAD_GATEWAY
        detail = getattr(exc, "message", None) or str(exc)
        raise HTTPException(status_code=status_code, detail=detail)


@router.post(
    "/openai/chat/completions",
    summary="OpenAI 代理接口（不支持 stream）",
)
def openai_chat_completions(
    payload: OpenAIChatCompletionsRequest,
    current_user: UserRecord = Depends(get_current_user),
):
    if payload.stream:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="stream mode is not supported",
        )

    if not payload.messages:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="messages cannot be empty",
        )

    request_payload = payload.model_dump(exclude_none=True)
    request_payload["stream"] = False
    request_payload["model"] = payload.model or LLM_MODEL

    # 仅用于触发鉴权依赖，避免未使用变量告警。
    _ = current_user

    return _upstream_chat_completions(request_payload)
