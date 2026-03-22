import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from peewee import DoesNotExist
from pydantic import BaseModel

from agent_service import (
    MAX_SESSION_ID_GENERATION_ATTEMPTS,
    create_session_history_file,
    get_session_history,
    parse_int_id,
    run_agent_with_history,
)
from auth import get_current_user
from database import Paper, Question, UserRecord

router = APIRouter()


class ChatRequest(BaseModel):
    session_id: str
    question_id: str
    message: str


class SessionResponse(BaseModel):
    session_id: str
    message: str
    reply: str


class SessionCreateRequest(BaseModel):
    paper_id: str
    question_id: str


class ChatResponse(BaseModel):
    session_id: str
    reply: str


async def create_session_for_question(
    *,
    paper_id: str,
    question_id: str,
    user_id: int,
    username: str,
) -> dict[str, str]:
    paper_id_int = parse_int_id(paper_id, "paper_id")
    question_id_int = parse_int_id(question_id, "question_id")

    try:
        question = (
            Question.select(Question.id, Question.prompt)
            .join(Paper, on=(Question.paper_id == Paper.id))
            .where(
                (Question.id == question_id_int)
                & (Question.paper_id == paper_id_int)
                & (Paper.uid == user_id)
            )
            .get()
        )
    except DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )

    for _ in range(MAX_SESSION_ID_GENERATION_ATTEMPTS):
        new_session_id = f"session_{uuid.uuid4().hex[:8]}"

        if create_session_history_file(new_session_id):
            Question.update(session_id=new_session_id).where(
                (Question.id == question_id_int) & (Question.paper_id == paper_id_int)
            ).execute()

            first_user_message = "老师，我准备好开始做这道题了，请给我第一步的提示。"
            first_reply = await run_agent_with_history(
                session_id=new_session_id,
                user_input=first_user_message,
                problem_content=question.prompt,
                username=username,
            )

            return {
                "session_id": new_session_id,
                "message": "新会话已就绪",
                "reply": first_reply,
            }

    raise HTTPException(status_code=500, detail="无法生成唯一会话 ID，请稍后重试")


async def generate_chat_reply(
    *,
    session_id: str,
    question_id: str,
    message: str,
    user_id: int,
    username: str,
) -> str:
    question_id_int = parse_int_id(question_id, "question_id")

    try:
        question = (
            Question.select(Question.prompt)
            .join(Paper, on=(Question.paper_id == Paper.id))
            .where((Question.id == question_id_int) & (Paper.uid == user_id))
            .get()
        )
    except DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )

    logging.info("Received message for session %s: %s", session_id, message)
    response = await run_agent_with_history(
        session_id=session_id,
        user_input=message,
        problem_content=question.prompt,
        username=username,
    )
    logging.info("Generated reply for session %s: %s", session_id, response)
    return response


def get_history_messages(session_id: str) -> list[dict[str, str]]:
    history = get_session_history(session_id)
    formatted_messages = []
    for msg in history.messages:
        role = "ai" if msg.type == "ai" else "user" if msg.type == "human" else msg.type
        formatted_messages.append({"role": role, "content": msg.content})
    return formatted_messages


def clear_session_history(session_id: str) -> None:
    history = get_session_history(session_id)
    history.clear()


@router.post(
    "/agent/session",
    response_model=SessionResponse,
    summary="创建一个全新的会话",
)
async def create_session_endpoint(
    payload: SessionCreateRequest,
    current_user: UserRecord = Depends(get_current_user),
):
    """
    生成并返回一个新的、唯一的 Session ID。
    前端在开始全新对话时可调用此接口获取 ID，然后在后续的 /agent/chat 请求中使用该 ID。
    """
    return await create_session_for_question(
        paper_id=payload.paper_id,
        question_id=payload.question_id,
        user_id=current_user.id,
        username=current_user.username,
    )


@router.post(
    "/agent/chat",
    response_model=ChatResponse,
    summary="发送聊天消息",
)
async def chat_endpoint(
    request: ChatRequest,
    current_user: UserRecord = Depends(get_current_user),
):
    """
    接收用户的消息，并基于指定的 session_id 返回 AI 的回复。
    """
    response = await generate_chat_reply(
        session_id=request.session_id,
        question_id=request.question_id,
        message=request.message,
        user_id=current_user.id,
        username=current_user.username,
    )
    return ChatResponse(session_id=request.session_id, reply=response)


@router.get(
    "/agent/history/{session_id}",
    summary="获取历史记录",
    dependencies=[Depends(get_current_user)],
)
async def get_history_endpoint(session_id: str):
    """
    获取某个特定 session_id 的完整历史对话记录，常用于前端页面刷新时加载上下文。
    """
    return {"session_id": session_id, "messages": get_history_messages(session_id)}


@router.delete(
    "/agent/history/{session_id}",
    summary="清空会话",
    dependencies=[Depends(get_current_user)],
)
async def clear_history_endpoint(session_id: str):
    """
    清空指定的会话历史记录。
    """
    clear_session_history(session_id)
    return {"message": f"会话 {session_id} 已清空"}
