import logging
import os
import re
from typing import Any

from fastapi import HTTPException, status
from langchain.agents import create_agent
from langchain_community.chat_message_histories import FileChatMessageHistory
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, ToolMessage
from langchain_openai import ChatOpenAI
from pydantic import SecretStr

from agent_tools import MATH_TOOLS
from config import HISTORY_DIR, LLM_PROVIDERS, LLM_PROVIDER_ORDER_BY_CALLER

MAX_AGENT_ITERATIONS = 6


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
4. 当需要做精确符号计算（例如普通因式分解）时，优先调用工具，不要凭心算硬算。
"""


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

    for provider in LLM_PROVIDERS:
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

    logging.info(
        "Resolved provider order for caller=%s -> %s",
        caller,
        [p["name"] for p in ordered],
    )
    return ordered


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


def get_session_history(session_id: str) -> FileChatMessageHistory:
    safe_session_id = re.sub(r"[^a-zA-Z0-9_-]", "", session_id)
    if not safe_session_id:
        raise HTTPException(status_code=400, detail="Invalid session_id")

    file_path = os.path.join(HISTORY_DIR, f"{safe_session_id}.json")
    return FileChatMessageHistory(file_path)


def create_session_history_file(session_id: str) -> bool:
    file_path = os.path.join(HISTORY_DIR, f"{session_id}.json")

    if os.path.exists(file_path):
        return False

    try:
        fd = os.open(file_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL)
        try:
            os.write(fd, b"[]")
        finally:
            os.close(fd)
        return True
    except FileExistsError:
        return False


async def run_agent_with_history(
    *,
    session_id: str,
    user_input: str,
    problem_content: str,
    username: str,
) -> str:
    history = get_session_history(session_id)
    last_error = None
    system_prompt = system_prompt_template.format(problem_content=problem_content)

    for provider in get_ordered_providers(username):
        try:
            agent: Any = create_agent(
                model=provider["llm"],
                tools=MATH_TOOLS,
                system_prompt=system_prompt,
            )
            result = await agent.ainvoke(
                {
                    "messages": [
                        *history.messages,
                        HumanMessage(content=user_input),
                    ]
                },
                config={
                    "configurable": {
                        "session_id": session_id,
                        "llm_caller": username,
                    }
                },
            )

            result_messages = result.get("messages")
            if isinstance(result_messages, list):
                _log_tool_calls_from_messages(result_messages)

            output_text = _extract_agent_output(result)
            history.add_user_message(user_input)
            history.add_ai_message(output_text)

            log_llm_success(provider)
            return output_text
        except Exception as error:
            last_error = error
            log_llm_failure(provider, error)

    if last_error is not None:
        raise last_error
    raise RuntimeError("No LLM providers configured")


def _extract_agent_output(result: Any) -> str:
    if not isinstance(result, dict):
        return str(result)

    messages = result.get("messages")
    if not isinstance(messages, list) or not messages:
        return ""

    last_message = messages[-1]
    content = getattr(last_message, "content", "")
    if isinstance(content, str):
        return content
    return str(content)


def _log_tool_calls_from_messages(messages: list[BaseMessage]) -> None:
    step = 0
    call_name_by_id: dict[str, str] = {}

    for message in messages:
        if isinstance(message, AIMessage) and message.tool_calls:
            for tool_call in message.tool_calls:
                step += 1
                tool_name = str(tool_call.get("name", ""))
                tool_id = str(tool_call.get("id", ""))
                tool_args = tool_call.get("args", {})
                call_name_by_id[tool_id] = tool_name
                logging.info(
                    "Agent tool step %s call -> name=%s id=%s args=%s",
                    step,
                    tool_name,
                    tool_id,
                    tool_args,
                )

        if isinstance(message, ToolMessage):
            tool_id = str(message.tool_call_id)
            tool_name = message.name or call_name_by_id.get(tool_id, "unknown")
            logging.info(
                "Agent tool step result -> name=%s id=%s content=%s",
                tool_name,
                tool_id,
                str(message.content),
            )
