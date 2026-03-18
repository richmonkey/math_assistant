import json
from typing import Any

from fastapi import APIRouter, Depends
from openai import APIConnectionError, APIError, APITimeoutError, OpenAI
from pydantic import BaseModel, Field

from auth import get_current_user
from config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
from database import UserRecord


router = APIRouter()
openai_client = OpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL)


class QuestionData(BaseModel):
    id: str
    type: str
    prompt: str
    answer: str


class QuestionGradingResult(BaseModel):
    questionId: str
    score: float
    maxScore: float
    comment: str
    isCorrect: bool


class GradeQuestionRequest(BaseModel):
    question: QuestionData
    maxScore: float = Field(default=10)


class OverallCommentRequest(BaseModel):
    questionResults: list[QuestionGradingResult]
    totalScore: float
    maxTotalScore: float


class OverallCommentResponse(BaseModel):
    comment: str


def _normalize_message_content(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        texts: list[str] = []
        for item in value:
            if isinstance(item, dict) and item.get("type") == "text":
                text_value = item.get("text")
                if isinstance(text_value, str):
                    texts.append(text_value)
        return "\n".join(texts).strip()
    return str(value)


def _chat_completion_text(prompt: str) -> str:
    completion = openai_client.chat.completions.create(
        model=LLM_MODEL,
        stream=False,
        messages=[{"role": "user", "content": prompt}],
        timeout=120,
    )
    if not completion.choices:
        return ""
    return _normalize_message_content(completion.choices[0].message.content).strip()


def _extract_json_object_text(raw: str) -> str:
    content = raw.strip()
    if not content:
        raise ValueError("Empty response")

    json_start = content.find("{")
    json_end = content.rfind("}")
    if json_start < 0 or json_end <= json_start:
        raise ValueError("Invalid response format")
    return content[json_start : json_end + 1]


@router.post(
    "/grading/question",
    response_model=QuestionGradingResult,
    summary="单题 AI 阅卷",
)
def grade_question(
    payload: GradeQuestionRequest,
    current_user: UserRecord = Depends(get_current_user),
) -> QuestionGradingResult:
    _ = current_user
    question = payload.question
    max_score = payload.maxScore

    prompt = f"""你是一位专业的数学教师，请对学生的答案进行批改。

题目类型：{question.type}
题目内容：{question.prompt}
学生答案：{question.answer}
满分：{max_score}分

请根据以下标准进行评分：
1. 答案的正确性（占70%）
2. 解题步骤的完整性（占20%）
3. 书写的规范性（占10%）

请以 JSON 格式返回评分结果，格式如下：
{{
  "score": <得分，0-{max_score}之间的数字>,
  "isCorrect": <true或false，表示答案是否完全正确>,
  "comment": "<详细的批改意见，指出优点和不足>"
}}

注意：
- 只返回 JSON，不要有其他内容
- comment 要具体、有建设性
- 如果学生答案为空或明显错误，给0分"""

    try:
        content = _chat_completion_text(prompt)
        json_text = _extract_json_object_text(content)
        parsed = json.loads(json_text)

        raw_score = parsed.get("score", 0)
        try:
            score = float(raw_score)
        except (TypeError, ValueError):
            score = 0.0
        score = min(max(score, 0.0), max_score)

        return QuestionGradingResult(
            questionId=question.id,
            score=score,
            maxScore=max_score,
            comment=str(parsed.get("comment", "批改完成")),
            isCorrect=bool(parsed.get("isCorrect", False)),
        )
    except (APIConnectionError, APITimeoutError, APIError, ValueError, TypeError):
        return QuestionGradingResult(
            questionId=question.id,
            score=0,
            maxScore=max_score,
            comment="批改过程中出现错误，请稍后重试。",
            isCorrect=False,
        )
    except Exception:
        return QuestionGradingResult(
            questionId=question.id,
            score=0,
            maxScore=max_score,
            comment="批改过程中出现错误，请稍后重试。",
            isCorrect=False,
        )


@router.post(
    "/grading/overall-comment",
    response_model=OverallCommentResponse,
    summary="整卷 AI 评语",
)
def generate_overall_comment(
    payload: OverallCommentRequest,
    current_user: UserRecord = Depends(get_current_user),
) -> OverallCommentResponse:
    _ = current_user
    score_rate = (
        (payload.totalScore / payload.maxTotalScore) * 100
        if payload.maxTotalScore > 0
        else 0
    )

    question_summary = "\n".join(
        [
            f"第{index + 1}题：得分{result.score}/{result.maxScore}，{'正确' if result.isCorrect else '错误'}"
            for index, result in enumerate(payload.questionResults)
        ]
    )

    prompt = f"""你是一位经验丰富的数学教师，请根据学生的答题情况写一份整体评语。

考试总分：{payload.totalScore}/{payload.maxTotalScore}（得分率：{score_rate:.1f}%）

各题得分情况：
{question_summary}

请写一份200字左右的整体评语，包括：
1. 对学生整体表现的评价
2. 指出掌握较好的知识点
3. 指出需要加强的薄弱环节
4. 给出具体的学习建议

要求：
- 语言亲切、鼓励为主
- 建议具体、可操作
- 只返回评语文本，不要有其他格式"""

    try:
        content = _chat_completion_text(prompt)
        return OverallCommentResponse(
            comment=content if content else "评语生成失败，请稍后重试。"
        )
    except (APIConnectionError, APITimeoutError, APIError):
        return OverallCommentResponse(comment="评语生成过程中出现错误，请稍后重试。")
    except Exception:
        return OverallCommentResponse(comment="评语生成过程中出现错误，请稍后重试。")
