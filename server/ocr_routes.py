import base64
import json
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from openai import APIConnectionError, APIError, APITimeoutError, OpenAI
from pydantic import BaseModel

from auth import get_current_user
from config import OCR_LLM_API_KEY, OCR_LLM_BASE_URL, OCR_LLM_MODEL
from database import UserRecord


router = APIRouter()
openai_client = OpenAI(api_key=OCR_LLM_API_KEY, base_url=OCR_LLM_BASE_URL)


PAPER_OCR_PROMPT = """You are a professional OCR system specialized in high school mathematics exams.

Your task is to extract ONLY printed content from the provided exam image and convert it into structured JSON.

STRICT RULES:

1. Extract only printed text. Ignore ALL handwritten answers, scribbles, corrections, underlines, marks, or stamps.
2. Preserve question numbering exactly as shown.
3. Convert all mathematical expressions into standard LaTeX format.
   - Use $...$ for inline formulas
   - Use $$...$$ for displayed equations
4. Do NOT summarize.
5. Do NOT explain.
6. Do NOT guess missing parts.
7. Do NOT repeat any content.
8. If a question is incomplete or unclear, extract only the visible part.
9. When the page ends, STOP immediately.
10. Output VALID JSON only. No extra text before or after JSON.

JSON FORMAT:

{
  "page": 1,
  "exam_title": "",
  "questions": [
    {
      "number": "",
      "type": "multiple_choice | fill_blank | calculation | proof | judge | unknown",
      "content": ""
    }
  ]
}

Additional rules:
- If the exam title is visible, extract it. Otherwise leave it empty.
- Keep line breaks inside content using \\n+.
- Ensure the output is strictly valid JSON.

Return JSON only."""


ANSWER_OCR_PROMPT = """You are a professional OCR system specialized in math exam answers.

Extract text from the image and return plain text.

Rules:
1. Convert all math expressions into LaTeX format.
2. Use $...$ for inline math and $$...$$ for display math.
3. Preserve line breaks if they exist.
4. Do not summarize or add explanations.
5. Output text only, no JSON or extra wrapper."""


class PaperOcrResponse(BaseModel):
    raw_text: str
    payload: dict[str, Any] | list[Any]


class AnswerOcrResponse(BaseModel):
    text: str


def _encode_upload_file_to_data_url(upload: UploadFile, data: bytes) -> str:
    content_type = upload.content_type or "application/octet-stream"
    encoded = base64.b64encode(data).decode("ascii")
    return f"data:{content_type};base64,{encoded}"


def _extract_json_payload(raw: str) -> str:
    content = raw.strip()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OCR output is empty",
        )

    if content.startswith("```") and content.endswith("```"):
        payload = content
        if payload.lower().startswith("```json"):
            payload = payload[7:]
        else:
            payload = payload[3:]
        return payload[:-3].strip()

    object_start = content.find("{")
    array_start = content.find("[")

    if object_start >= 0 and array_start >= 0:
        start = min(object_start, array_start)
    else:
        start = object_start if object_start >= 0 else array_start

    if start < 0:
        return content

    object_end = content.rfind("}")
    array_end = content.rfind("]")
    end = max(object_end, array_end)

    if end <= start:
        return content[start:]

    return content[start : end + 1]


def _repair_invalid_json_escapes(json_text: str) -> str:
    result_chars: list[str] = []
    in_string = False
    string_quote = ""

    i = 0
    while i < len(json_text):
        char = json_text[i]
        prev_char = json_text[i - 1] if i > 0 else ""

        if (char == '"' or char == "'") and prev_char != "\\":
            if not in_string:
                in_string = True
                string_quote = char
            elif char == string_quote:
                in_string = False
                string_quote = ""
            result_chars.append(char)
            i += 1
            continue

        if in_string and char == "\\":
            next_char = json_text[i + 1] if i + 1 < len(json_text) else ""
            is_valid_escape = next_char in {
                '"',
                "\\",
                "/",
                "b",
                "f",
                "n",
                "r",
                "t",
                "u",
            }
            if not is_valid_escape:
                result_chars.append("\\")

        result_chars.append(char)
        i += 1

    return "".join(result_chars)


def _parse_ocr_json(raw: str) -> dict[str, Any] | list[Any]:
    payload = _extract_json_payload(raw)
    try:
        parsed = json.loads(payload)
    except json.JSONDecodeError:
        repaired = _repair_invalid_json_escapes(payload)
        try:
            parsed = json.loads(repaired)
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to parse OCR JSON output: {exc}",
            )

    if not isinstance(parsed, (dict, list)):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OCR JSON output must be an object or array",
        )
    return parsed


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


def _ocr_chat_completion(prompt: str, image_data_url: str) -> str:
    try:
        completion = openai_client.chat.completions.create(
            model=OCR_LLM_MODEL,
            stream=False,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": image_data_url},
                        },
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
            timeout=120,
        )
    except APITimeoutError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Upstream OCR request timed out",
        )
    except APIConnectionError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect upstream OCR service: {exc}",
        )
    except APIError as exc:
        status_code = getattr(exc, "status_code", None) or status.HTTP_502_BAD_GATEWAY
        detail = getattr(exc, "message", None) or str(exc)
        raise HTTPException(status_code=status_code, detail=detail)

    if not completion.choices:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Upstream OCR response has no choices",
        )
    return _normalize_message_content(completion.choices[0].message.content).strip()


@router.post(
    "/ocr/paper",
    response_model=PaperOcrResponse,
    summary="试卷图片 OCR（结构化 JSON）",
)
async def paper_ocr(
    image: UploadFile = File(...),
    current_user: UserRecord = Depends(get_current_user),
) -> PaperOcrResponse:
    _ = current_user
    data = await image.read()
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image is empty",
        )

    image_data_url = _encode_upload_file_to_data_url(image, data)
    raw_text = _ocr_chat_completion(PAPER_OCR_PROMPT, image_data_url)
    payload = _parse_ocr_json(raw_text)
    return PaperOcrResponse(raw_text=raw_text, payload=payload)


@router.post(
    "/ocr/answer",
    response_model=AnswerOcrResponse,
    summary="答案图片 OCR（纯文本）",
)
async def answer_ocr(
    image: UploadFile = File(...),
    current_user: UserRecord = Depends(get_current_user),
) -> AnswerOcrResponse:
    _ = current_user
    data = await image.read()
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image is empty",
        )

    image_data_url = _encode_upload_file_to_data_url(image, data)
    text = _ocr_chat_completion(ANSWER_OCR_PROMPT, image_data_url)
    return AnswerOcrResponse(text=text)
