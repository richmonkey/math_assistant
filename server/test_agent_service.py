import pytest

import agent_service


@pytest.mark.asyncio
async def test_run_agent_with_history_real_llm_persists_history(tmp_path) -> None:
    if not agent_service.RUNTIME_LLM_PROVIDERS:
        pytest.skip("No LLM providers configured")

    original_history_dir = agent_service.HISTORY_DIR
    agent_service.HISTORY_DIR = str(tmp_path)

    try:
        session_id = "it_real_llm_session"
        created = agent_service.create_session_history_file(session_id)
        assert created is True

        user_input = "算出函数在x=2出的导数值"
        problem_content = "已知函数f(x)=x^2+1"
        username = "integration_test"

        reply = await agent_service.run_agent_with_history(
            session_id=session_id,
            user_input=user_input,
            problem_content=problem_content,
            username=username,
        )

        assert isinstance(reply, str)
        assert reply.strip() != ""
        print("Agent reply:", reply)
        history = agent_service.get_session_history(session_id)
        messages = history.messages
        assert len(messages) >= 2
        assert getattr(messages[-2], "content", "") == user_input
        assert getattr(messages[-1], "content", "").strip() != ""
    finally:
        agent_service.HISTORY_DIR = original_history_dir
