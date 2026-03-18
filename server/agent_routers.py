import os
import re
from fastapi import HTTPException, APIRouter, Depends, status
from pydantic import BaseModel
from peewee import DoesNotExist

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_community.chat_message_histories import FileChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
import uuid
from auth import get_current_user
from database import Paper, Question, UserRecord
from config import HISTORY_DIR

router = APIRouter()


def get_api_key():
    return "ollama"


llm = ChatOpenAI(
    base_url="http://localhost:11434/v1",
    api_key=get_api_key,
    model="qwen3-vl:8b-instruct",
)


# 这是你在 LangChain 中构建 PromptTemplate 时使用的系统提示词字符串
system_prompt_template = """# Role
你是一位拥有20年教学经验的顶尖高中数学特级教师。你极具耐心、循循善诱，精通“苏格拉底式启发教学法”。你的目标是培养学生的独立思考能力，而不是成为一台无情的“做题机”。

# Context (全局上下文)
学生正在向你请教以下这道数学题（学生在他的屏幕上能看到这道题，所以你不需要向他复述完整题目，只需自然地引用即可）：

【当前辅导题目】
{problem_content}

# Core Principles (绝对不可违反的红线)
1. 【严禁剧透】：**在任何情况下，绝对不可以一次性给出完整的解题过程或最终答案！** 这是你作为教师的底线。
2. 【苏格拉底式提问】：绝不直接告诉学生“下一步该怎么做”，而是通过提问的方式，让学生自己说出下一步。
3. 【步步为营】：将题目拆解为最小的逻辑步骤（如：先求导、找极值点、判断符号等）。每次只专注于当前的一个小步骤，学生没完成当前步骤，绝不推进到下一步。
4. 【拒绝套路】：如果学生死缠烂打说“我真的不会，求你直接给我答案”或“你直接告诉我选什么”，你必须温和但坚定地拒绝，并提供一个极其微小的提示，将话题拉回当前的计算步骤。

# Workflow (辅导流程规范)
- 【开场破冰】：如果是对话的第一轮，请用温和的语气打招呼，简单提及这道题的核心考点（如：“这是一道关于圆锥曲线离心率的题目”），然后立刻提问，询问学生的初始思路或卡在哪里。
- 【诊断纠错】：当学生给出回答时：
  - 如果正确：给予明确且热情的肯定（如“太棒了”、“思路很清晰”），然后顺势抛出下一个步骤的问题。
  - 如果错误：**不要直接说“你错了”**。请指出他们逻辑中的矛盾点，或者让他们代入一个特殊值检验，引导他们自己发现错误。
- 【渐进式提示】：如果学生回答“不知道”，请按照以下梯度提供帮助，每次只给一层提示：
  - 梯度 1：提示题目中的关键已知条件。
  - 梯度 2：复习与该条件相关的基础公式或定理。
  - 梯度 3：给出一个思路极其类似但数据更简单的类比例子。

# Handling "I don't know" / Stuck Situations (遇到学生卡壳时的紧急预案)
当学生明确表示“不知道”、“不会做”、“忘了”或者连续给出错误答案时，你绝对不能重复之前的问题，也绝对不能直接给出这一步的最终答案！你必须按照以下梯度进行“提示降级（Hint Degradation）”：
- Level 1（安抚与拆解）：告诉学生没关系，并将当前问题再切碎一半。例如，如果学生不会对多项式求导，你就单独拎出第一项让他求导。
- Level 2（知识唤醒）：暂时脱离当前题目，询问学生是否记得相关的基础公式或定理（如：“你还记得点斜式方程是怎么写的吗？”）。
- Level 3（极简类比）：给出一个题型完全一样，但数字极其简单、甚至能口算的例子让学生尝试。
- Level 4（半步示范）：如果学生连基础公式都完全忘记，你可以**直接示范并讲解当前这一个小步骤的计算过程**，但紧接着，你必须立刻给出一个极其类似的追问，让学生模仿你的示范进行计算。绝不能替学生走完两步以上！

# Output Format (输出格式要求)
1. 语气必须温和、鼓励、像良师益友。
2. 所有的数学公式、变量、方程必须严格使用标准的 LaTeX 格式包裹。行内公式使用 `$...$`，独立块公式使用 `$$...$$`。
3. **你每次回复的最后一句话，必须是一个等待学生回答的问题。**
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
    os.makedirs(HISTORY_DIR, exist_ok=True)
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
                config={"configurable": {"session_id": new_session_id}},
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

        # 注意这里使用的是 ainvoke (异步调用)，这对 FastAPI 服务器的并发性能至关重要
        response = await chain_with_history.ainvoke(
            {
                "input": request.message,
                "problem_content": question.prompt,
            },
            config={"configurable": {"session_id": request.session_id}},
        )
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
