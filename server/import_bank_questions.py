"""Import questions from a JSON file into the BankQuestion table."""

import argparse
import asyncio
import json
import mimetypes
import sys
from pathlib import Path
from uuid import uuid4
import io
from PIL import Image

from config import UPLOAD_IMAGE_DIR, UPLOAD_IMAGE_URL_PREFIX
from database import BankQuestion, close_database, init_database
from ocr_service import encode_image_bytes_to_data_url, question_ocr_from_data_url
from logger import init_logger

# Map Chinese question types to model enum values
TYPE_MAP = {
    "单选题": "single",
    "多选题": "multiple",
    "填空题": "blank",
    "判断题": "judge",
    "解答题": "free",
}


def map_type(raw_type: str) -> str:
    for key, value in TYPE_MAP.items():
        if key in raw_type:
            return value
    return "free"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import questions from a JSON file into the BankQuestion table"
    )
    parser.add_argument("--json_file", help="Path to the JSON file to import")
    parser.add_argument(
        "--base-dir",
        help="Base directory for resolving image paths (default: parent of JSON file's directory)",
    )
    return parser.parse_args()


def _save_image_to_upload_dir(image_path: Path) -> str:
    upload_dir = Path(UPLOAD_IMAGE_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    suffix = image_path.suffix or ".jpg"
    filename = f"{uuid4().hex}{suffix}"
    (upload_dir / filename).write_bytes(image_path.read_bytes())
    return UPLOAD_IMAGE_URL_PREFIX + "/" + filename


async def _ocr_image_file(image_path: Path) -> tuple[str, bool]:
    """Run OCR on a question image.

    Returns (prompt_text, has_image).
    """
    data = image_path.read_bytes()
    content_type = mimetypes.guess_type(str(image_path))[0] or "image/jpeg"
    data_url = encode_image_bytes_to_data_url(content_type, data)
    _, payload = await question_ocr_from_data_url(data_url)
    prompt = ""
    if not isinstance(payload, dict):
        return prompt, False

    prompt = payload.get("content", "")
    has_image = payload.get("has_image", False)
  
    return prompt, has_image


def _image_to_png_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


async def main() -> int:
    init_logger()
    args = parse_args()
    json_path = Path(args.json_file).resolve()

    try:
        with open(json_path, encoding="utf-8") as f:
            questions = json.load(f)
    except FileNotFoundError:
        print(f"Error: file not found: {args.json_file}", file=sys.stderr)
        return 1
    except json.JSONDecodeError as e:
        print(f"Error: invalid JSON: {e}", file=sys.stderr)
        return 1

    if not isinstance(questions, list):
        print("Error: JSON root must be an array", file=sys.stderr)
        return 1

    base_dir = Path(args.base_dir).resolve() if args.base_dir else json_path.parent.parent

    init_database()

    inserted = 0
    skipped = 0
    errors = 0
    for item in questions:
        detail_url = item.get("detail_url")
        raw_content_screenshot = item.get("content_screenshot")
        raw_answer_screenshot = item.get("answer_screenshot")
        difficulty = item.get("difficulty")
        raw_knowledge_points = item.get("knowledge_points", [])
        knowledge_points = ",".join(raw_knowledge_points) if raw_knowledge_points else ""
        raw_type = item.get("type", "")
        qtype = map_type(raw_type)

        # Skip duplicates by original screenshot path (stored as reference_image_url on first import)
        if detail_url and raw_content_screenshot and BankQuestion.select().where(
            BankQuestion.external_url == detail_url
        ).exists():
            skipped += 1
            continue

        # OCR the content screenshot to get prompt text and sub-images
        prompt = ""
        has_image = False
        if raw_content_screenshot:
            image_path = base_dir / raw_content_screenshot
            if not image_path.exists():
                print(f"Warning: image not found: {image_path}", file=sys.stderr)
                errors += 1
                continue
            try:
                prompt, has_image = await _ocr_image_file(image_path)
            except Exception as e:
                print(f"Warning: OCR failed for {image_path}: {e}", file=sys.stderr)
                try:
                    # Retry with 40px white padding on top and bottom
                    img = Image.open(image_path).convert("RGB")
                    padded = Image.new("RGB", (img.width, img.height + 80), (255, 255, 255))
                    padded.paste(img, (0, 40))
                    padded_data = _image_to_png_bytes(padded)
                    data_url = encode_image_bytes_to_data_url("image/png", padded_data)
                    _, payload = await question_ocr_from_data_url(data_url)

                    if not isinstance(payload, dict):
                        prompt = ""
                        has_image = False
                    else:
                        prompt = payload.get("content", "")
                        has_image = payload.get("has_image", False)
                except Exception as e2:
                    print(f"Warning: OCR retry with padding also failed for {image_path}: {e2}", file=sys.stderr)
                    errors += 1
                    continue

        # Copy answer screenshot to upload dir
        standard_answer_image_url: str | None = None
        if raw_answer_screenshot:
            answer_path = base_dir / raw_answer_screenshot
            if answer_path.exists():
                standard_answer_image_url = _save_image_to_upload_dir(answer_path)
            else:
                print(f"Warning: answer image not found: {answer_path}", file=sys.stderr)

        content_image_url: str | None = None
        if raw_content_screenshot:
            question_path = base_dir / raw_content_screenshot
            if question_path.exists():
                content_image_url = _save_image_to_upload_dir(question_path)
            else:
                print(f"Warning: question image not found: {question_path}", file=sys.stderr)

        BankQuestion.create(
            type=qtype,
            prompt=prompt,
            answer="",
            standard_answer_image_url=standard_answer_image_url,
            reference_image_url=None,
            external_url=detail_url,
            content_image_url=content_image_url,
            has_image=has_image,
            difficulty=difficulty,
            knowledge_points=knowledge_points,
        )
        inserted += 1
        print(f"[{inserted}] Inserted question {item.get('question_id', '')}")


    close_database()
    print(f"Done: {inserted} inserted, {skipped} skipped (duplicate), {errors} errors.")
    return 0


if __name__ == "__main__":
    asyncio.run(main())

