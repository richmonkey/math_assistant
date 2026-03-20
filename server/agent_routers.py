import os
import re
import logging
from typing import Any
from fastapi import HTTPException, APIRouter, Depends, status
from pydantic import BaseModel, SecretStr
from peewee import DoesNotExist

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_community.chat_message_histories import FileChatMessageHistory
from langchain_core.runnables import RunnableLambda
from langchain_core.runnables.history import RunnableWithMessageHistory
import uuid
from auth import get_current_user
from database import Paper, Question, UserRecord
from config import (
    HISTORY_DIR,
    LLM_PROVIDERS,
    LLM_PROVIDER_ORDER_BY_CALLER,
)

router = APIRouter()


def build_chat_llm(
    *,
    base_url: str,
    api_key: str,
    model: str,
    timeout: int | None,
    openai_proxy: str | None = None,
) -> ChatOpenAI:
    return ChatOpenAI(
        base_url=base_url,
        api_key=SecretStr(api_key),
        openai_proxy=openai_proxy,
        model=model,
        timeout=timeout,
        temperature=0.3,
    )


def build_llm_providers() -> list[dict[str, Any]]:
    providers = []

    for index, provider in enumerate(LLM_PROVIDERS):
        providers.append(
            {
                "name": provider["name"],
                "base_url": provider["base_url"],
                "model": provider["model"],
                "timeout": provider.get("timeout", None),
                "llm": build_chat_llm(
                    base_url=provider["base_url"],
                    api_key=provider["api_key"],
                    model=provider["model"],
                    timeout=provider.get("timeout", None),
                    openai_proxy=provider.get("openai_proxy", None),
                ),
            }
        )

    logging.info("Configured %s LLM provider(s)", len(providers))
    return providers


RUNTIME_LLM_PROVIDERS = build_llm_providers()
LLM_PROVIDER_BY_NAME = {
    provider["name"]: provider for provider in RUNTIME_LLM_PROVIDERS
}
if RUNTIME_LLM_PROVIDERS:
    LLM_PROVIDER_BY_NAME.setdefault("primary", RUNTIME_LLM_PROVIDERS[0])


def _ordered_provider_names_for_caller(caller: str | None) -> list[str] | None:
    if not caller:
        return None

    provider_names = LLM_PROVIDER_ORDER_BY_CALLER.get(caller)
    if provider_names is None:
        provider_names = LLM_PROVIDER_ORDER_BY_CALLER.get("*")
    return provider_names


def get_ordered_providers(caller: str | None) -> list[dict[str, Any]]:
    preferred_names = _ordered_provider_names_for_caller(caller)
    if not preferred_names:
        return RUNTIME_LLM_PROVIDERS

    ordered = []
    used = set()
    for name in preferred_names:
        provider = LLM_PROVIDER_BY_NAME.get(name)
        if provider is None:
            logging.warning(
                "Unknown provider name '%s' in LLM_PROVIDER_ORDER_BY_CALLER for caller=%s",
                name,
                caller,
            )
            continue
        ordered.append(provider)
        used.add(name)

    logging.info(
        "Resolved provider order for caller=%s -> %s",
        caller,
        [p["name"] for p in ordered],
    )
    return ordered


def _extract_caller(config: Any) -> str | None:
    if not isinstance(config, dict):
        return None
    configurable = config.get("configurable")
    if not isinstance(configurable, dict):
        return None
    caller = configurable.get("llm_caller")
    return caller if isinstance(caller, str) and caller else None


def log_llm_success(provider: dict[str, Any]) -> None:
    logging.info(
        "LLM call succeeded with provider=%s model=%s base_url=%s timeout=%s",
        provider["name"],
        provider["model"],
        provider["base_url"],
        provider["timeout"],
    )


def log_llm_failure(provider: dict[str, Any], error: Exception) -> None:
    logging.warning(
        "LLM call failed with provider=%s model=%s base_url=%s: %s",
        provider["name"],
        provider["model"],
        provider["base_url"],
        error,
    )


def invoke_llm_with_fallbacks(prompt_value, config=None):
    last_error = None
    caller = _extract_caller(config)

    for provider in get_ordered_providers(caller):
        try:
            response = provider["llm"].invoke(prompt_value, config=config)
            log_llm_success(provider)
            return response
        except Exception as error:
            last_error = error
            log_llm_failure(provider, error)

    if last_error is not None:
        raise last_error

    raise RuntimeError("No LLM providers configured")


async def ainvoke_llm_with_fallbacks(prompt_value, config=None):
    last_error = None
    caller = _extract_caller(config)

    for provider in get_ordered_providers(caller):
        try:
            response = await provider["llm"].ainvoke(prompt_value, config=config)
            log_llm_success(provider)
            return response
        except Exception as error:
            last_error = error
            log_llm_failure(provider, error)

    if last_error is not None:
        raise last_error

    raise RuntimeError("No LLM providers configured")


llm = RunnableLambda(
    invoke_llm_with_fallbacks,
    afunc=ainvoke_llm_with_fallbacks,
    name="llm_with_fallbacks",
)


system_prompt_template = """# Role
你是一位拥有20年教学经验的顶尖高中数学特级教师。你极具耐心、循循善诱，精通“苏格拉底式启发教学法”。你的目标是培养学生的数学思维、破题能力和知识迁移能力，而不是成为一台无情的“做题机”或“计算器”。

# Context (全局上下文)
学生正在向你请教以下这道数学题（学生在他的屏幕上能看到这道题，所以你不需要向他复述完整题目，只需自然地引用即可）：

【当前辅导题目】
{problem_content}

# Core Principles (绝对不可违反的红线)
1. 【严禁剧透】：**在任何情况下，绝对不可以一次性给出完整的解题过程或最终答案！** 这是你作为教师的底线。
2. 【苏格拉底式提问】：绝不直接告诉学生“第一步该怎么做”，而是通过提问的方式，引导学生自己说出破题的切入点。
3. 【重思路，轻计算】：**不要在基础计算（如解一元二次方程、通分、求导的具体过程）上过度纠缠。** 你的引导重点必须放在：如何“翻译”已知条件？目标与已知之间缺少什么桥梁？这道题背后的核心数学模型是什么？
4. 【拒绝套路】：如果学生死缠烂打说“我真的不会，求你直接给我答案”或“你直接告诉我选什么”，你必须温和但坚定地拒绝，并提供一个思维视角的提示，将话题拉回对题目条件的分析上。

# Workflow (辅导流程规范)
- 【开场破冰】：如果是对话的第一轮，请用温和的语气打招呼，一语道破这道题的核心知识板块（如：“这是一道经典的导数与不等式结合的问题”），然后立刻提问，询问学生对题干中**最核心条件**的直觉反应。
- 【诊断纠错】：当学生给出回答时：
  - 如果思路正确：给予明确且热情的肯定（如“眼光很准！”、“切中要害！”），然后顺势让他思考这一步结论如何向最终目标推进。
  - 如果思路偏离：**不要直接说“你错了”**。请引导他分析当前思路可能会遇到的死胡同，或者让他画个草图/代入特殊值感受一下，引导他自己调整方向。
- 【渐进式启发】：如果学生表示“没有思路”，请按照以下梯度提供帮助，每次只给一层提示：
  - 梯度 1（条件翻译）：引导学生挖掘单个已知条件背后的数学语言。例如：“看到‘直线与抛物线相切’，你脑海中第一个浮现的等价代数关系是什么？”
  - 梯度 2（目标倒推）：引导学生从结论出发。例如：“我们要证明最后这个不等式，通常有哪些方向？（比如：放缩、构造函数求最值？）”
  - 梯度 3（知识连结）：点出条件与目标之间的桥梁。例如：“现在我们有了条件A，要求解目标B。高中阶段哪几个定理或公式能把A和B串联起来？”

# Handling "I don't know" / Stuck Situations (遇到学生卡壳时的紧急预案)
当学生明确表示“不知道从何下手”、“完全没思路”或者连续陷入死胡同时，你必须按照以下梯度进行“提示降级（Hint Degradation）”：
- Level 1（回归本源）：告诉学生没关系，遇到难题先退回最基础的定义。暂时放下最终的求解目标，引导学生先“榨干”某个条件的价值。例如：“咱们先不管最后要证什么，单看条件一，你能把它转化成什么熟悉的式子？”
- Level 2（模型唤醒）：跳出当前题目的繁杂数据，询问学生是否遇到过类似的经典模型。例如：“你还记得我们在处理‘焦点弦’问题时，最常用的那两个结论吗？”
- Level 3（极简类比）：给出一个核心思想完全一致，但剥离了复杂背景的极简例子，让学生先看清本质。
- Level 4（核心思路点拨）：如果学生对该题型完全陌生，你可以**直接点破这道题的“破题切入点”或“构造方法”**（例如：“遇到这种含有 $x_1-x_2$ 且不对称的结构，我们通常会考虑‘极值点偏移’的处理套路。在这里，我们需要构造一个对称函数……”），重点讲解**“为什么要这么想”**，紧接着提问让学生尝试顺着这个思路列出第一步的式子。绝不能替学生完成后续的推导！

# Output Format (输出格式要求)
1. 语气必须温和、鼓励、像良师益友，充满对数学的美感和逻辑的赞赏。
2. 所有的数学公式、变量、方程必须严格使用标准的 LaTeX 格式包裹。行内公式使用 `$...$`，独立块公式使用 `$$...$$`。
3. **你每次回复的最后一句话，必须是一个等待学生回答的问题（通常是关于下一步的思路、条件翻译或方法选择）。**
"""

prompt = ChatPromptTemplate.from_messages(
    [
        ("system", system_prompt_template),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
    ]
)

# 构建基础对话链
chain = prompt | llm | StrOutputParser()


# 定义获取历史记录的工厂函数
def get_session_history(session_id: str) -> FileChatMessageHistory:
    # 安全过滤：只允许字母、数字、下划线和连字符，防止目录穿越攻击
    safe_session_id = re.sub(r"[^a-zA-Z0-9_-]", "", session_id)
    if not safe_session_id:
        raise HTTPException(status_code=400, detail="Invalid session_id")

    file_path = os.path.join(HISTORY_DIR, f"{safe_session_id}.json")
    return FileChatMessageHistory(file_path)


# 包装成带有记忆的链
chain_with_history = RunnableWithMessageHistory(
    chain,
    get_session_history,
    input_messages_key="input",
    history_messages_key="chat_history",
)


MAX_SESSION_ID_GENERATION_ATTEMPTS = 10


def create_session_history_file(session_id: str) -> bool:
    """
    原子创建会话历史文件。
    返回 True 表示创建成功；返回 False 表示该 session_id 已存在。
    """
    file_path = os.path.join(HISTORY_DIR, f"{session_id}.json")

    # 先做一次显式存在性检查，便于快速跳过明显冲突的 ID。
    if os.path.exists(file_path):
        return False

    try:
        # O_EXCL + O_CREAT 保证并发场景下只有一个请求能成功创建同名文件。
        fd = os.open(file_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL)
        try:
            os.write(fd, b"[]")
        finally:
            os.close(fd)
        return True
    except FileExistsError:
        return False


# 定义请求体的数据结构
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


# 定义响应体的数据结构
class ChatResponse(BaseModel):
    session_id: str
    reply: str


def _parse_int_id(value: str, field_name: str) -> int:
    try:
        return int(value)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must be an integer string",
        )


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
    paper_id_int = _parse_int_id(payload.paper_id, "paper_id")
    question_id_int = _parse_int_id(payload.question_id, "question_id")

    try:
        question = (
            Question.select(Question.id, Question.prompt)
            .join(Paper, on=(Question.paper_id == Paper.id))
            .where(
                (Question.id == question_id_int)
                & (Question.paper_id == paper_id_int)
                & (Paper.uid == current_user.id)
            )
            .get()
        )
    except DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )

    for _ in range(MAX_SESSION_ID_GENERATION_ATTEMPTS):
        # 使用 uuid 生成一个简短且唯一的 ID，例如: session_3f9a2b1c
        new_session_id = f"session_{uuid.uuid4().hex[:8]}"

        # 检查目录中是否已存在，并通过原子创建规避并发竞态。
        if create_session_history_file(new_session_id):
            Question.update(session_id=new_session_id).where(
                (Question.id == question_id_int) & (Question.paper_id == paper_id_int)
            ).execute()

            first_user_message = "老师，我准备好开始做这道题了，请给我第一步的提示。"
            first_reply = await chain_with_history.ainvoke(
                {
                    "input": first_user_message,
                    "problem_content": question.prompt,
                },
                config={
                    "configurable": {
                        "session_id": new_session_id,
                        "llm_caller": current_user.username,
                    }
                },
            )

            return {
                "session_id": new_session_id,
                "message": "新会话已就绪",
                "reply": first_reply,
            }

    raise HTTPException(status_code=500, detail="无法生成唯一会话 ID，请稍后重试")


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
    try:
        question_id_int = _parse_int_id(request.question_id, "question_id")
        try:
            question = (
                Question.select(Question.prompt)
                .join(Paper, on=(Question.paper_id == Paper.id))
                .where(
                    (Question.id == question_id_int) & (Paper.uid == current_user.id)
                )
                .get()
            )
        except DoesNotExist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found",
            )
        logging.info(
            "Received message for session %s: %s", request.session_id, request.message
        )
        # 注意这里使用的是 ainvoke (异步调用)，这对 FastAPI 服务器的并发性能至关重要
        response = await chain_with_history.ainvoke(
            {
                "input": request.message,
                "problem_content": question.prompt,
            },
            config={
                "configurable": {
                    "session_id": request.session_id,
                    "llm_caller": current_user.username,
                }
            },
        )
        logging.info("Generated reply for session %s: %s", request.session_id, response)
        return ChatResponse(session_id=request.session_id, reply=response)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/agent/history/{session_id}",
    summary="获取历史记录",
    dependencies=[Depends(get_current_user)],
)
async def get_history_endpoint(session_id: str):
    """
    获取某个特定 session_id 的完整历史对话记录，常用于前端页面刷新时加载上下文。
    """
    history = get_session_history(session_id)

    # 将 LangChain 的 Message 对象转换成前端容易解析的 JSON 格式
    formatted_messages = []
    for msg in history.messages:
        role = "ai" if msg.type == "ai" else "user" if msg.type == "human" else msg.type
        formatted_messages.append({"role": role, "content": msg.content})

    return {"session_id": session_id, "messages": formatted_messages}


@router.delete(
    "/agent/history/{session_id}",
    summary="清空会话",
    dependencies=[Depends(get_current_user)],
)
async def clear_history_endpoint(session_id: str):
    """
    清空指定的会话历史记录。
    """
    history = get_session_history(session_id)
    history.clear()
    return {"message": f"会话 {session_id} 已清空"}
