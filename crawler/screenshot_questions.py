import argparse
import asyncio
import json
import os
import random
import sys
from datetime import datetime
from typing import Dict
from urllib.parse import urljoin
from playwright.async_api import async_playwright, Browser
from browser_client import PersistentBrowserClient

ANSWER_CONCURRENCY = 2  # 同时打开的答案页面数上限
SLEEP_MIN = 1.0  # 请求间隔最小秒数
SLEEP_MAX = 5.0  # 请求间隔最大秒数
LOGIN_CHECK_URL = "https://zujuan.xkw.com"


async def verify_login(client: PersistentBrowserClient) -> None:
    """打开固定页面供用户确认是否仍处于登录状态，按 Enter 继续。"""
    page = await client.browser_context.new_page()
    await page.goto(LOGIN_CHECK_URL, wait_until="domcontentloaded")
    print(f"\n🔍 已打开登录验证页面：{LOGIN_CHECK_URL}")
    print("请在浏览器中确认是否处于登录状态，确认后按 Enter 继续...")
    await asyncio.get_event_loop().run_in_executor(None, input)
    await page.close()
    print("✅ 登录验证完成，继续执行。\n")

async def login():
    async with PersistentBrowserClient(headless=False) as client:
        await verify_login(client)

async def fetch_answer(client: PersistentBrowserClient, q_id: str, detail_url: str,
                       output_dir: str, sem: asyncio.Semaphore) -> str:
    """并发安全地打开详情页，下载答案图片并返回本地路径。"""
    async with sem:
        detail_page = await client.browser_context.new_page()
        try:
            await detail_page.goto(detail_url, wait_until="networkidle")
            src = None
            for _ in range(2):
                img = detail_page.locator(
                    "body > main > section > section.answer-box > div.answer-txt > img"
                )
                if await img.count() == 0:
                    print(f"  ⚠️  未找到答案图片 q_{q_id}")
                    #等待人工干预，可能是验证码或者登录状态问题
                    await asyncio.sleep(30)
                    continue
                src = await img.get_attribute("src")
                if not src:
                    #等待人工干预，可能是验证码或者登录状态问题                    
                    await asyncio.sleep(30)
                    continue

            if not src:
                print("  ⚠️  未获取到答案图片链接 q_{q_id}")
                return ""
            
            img_url = src#urljoin("https://zujuan.xkw.com", src)
            response = await client.browser_context.request.get(img_url)
            content_type = response.headers.get("content-type", "image/png").split(";")[0].strip()
            ext = {"image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp"}.get(content_type, "png")
            answer_path = os.path.join(output_dir, f"q_{q_id}_answer.{ext}")
            with open(answer_path, "wb") as f:
                f.write(await response.body())
            print(f"  答案图片已保存 q_{q_id} -> {answer_path}")

            return answer_path
        except Exception as e:
            print(f"  ⚠️  获取答案失败 q_{q_id}: {e}")
            return ""
        finally:
            await detail_page.close()


async def fetch_page_html(client: PersistentBrowserClient, category_id: str, page: int) -> str:
    """请求单页题目列表，返回 HTML 字符串。"""
    payload: Dict[str, str | float | bool] = {
        "pageName": "zsd",
        "bankId": "11",
        "categoryId": category_id,
        "orderBy": "2",
        "curPage": str(page),
    }
    response = await client.post("/zujuan-api/question/list", form=payload)
    data = response.get("data", {})
    return data.get("data", {}).get("html", "")


async def process_page_html(browser: Browser, html_content: str, output_dir: str, index_offset: int) -> list:
    """在独立的浏览器页面中渲染单页 HTML，提取并截图所有题目，然后关闭该页面。"""
    full_html = f"""<!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5; padding: 20px; }}
            .tk-quest-item {{ background-color: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
            img {{ vertical-align: middle; }}
            .right-msg, .ques-op {{ display: none !important; }}
        </style>
    </head>
    <body>
        {html_content}
    </body>
    </html>"""

    context = await browser.new_context(viewport={"width": 1280, "height": 800})
    page = await context.new_page()
    try:
        await page.set_content(full_html, wait_until="networkidle")
        question_nodes = await page.locator(".tk-quest-item").all()
        questions: list = []

        for idx, node in enumerate(question_nodes):
            exam_node = node.locator(".exam-item__cnt")
            q_id = await node.get_attribute("questionid") or f"unknown_{index_offset + idx + 1}"

            detail_link = node.locator(".exam-item__info .ctrl-box a[data-btn-type='quesDetail']")
            detail_href = await detail_link.get_attribute("href") if await detail_link.count() > 0 else None
            detail_url = urljoin("https://zujuan.xkw.com", detail_href) if detail_href else ""

            info_cnts = await node.locator(".left-msg .info-cnt").all_inner_texts()
            q_type = info_cnts[0].strip() if len(info_cnts) > 0 else ""
            q_diff = info_cnts[1].strip() if len(info_cnts) > 1 else ""

            knowledge_items = await node.locator(".knowledge-list .knowledge-item").all_inner_texts()
            knowledge_points = [k.strip() for k in knowledge_items]

            file_path = os.path.join(output_dir, f"q_{q_id}.png")
            await exam_node.screenshot(path=file_path)
            print(f"  [{index_offset + idx + 1}] 截图已保存 -> {file_path}")

            questions.append({
                "index": index_offset + idx + 1,
                "question_id": q_id,
                "type": q_type,
                "difficulty": q_diff,
                "knowledge_points": knowledge_points,
                "content_screenshot": file_path,
                "detail_url": detail_url,
                "answer_screenshot": "",
            })

        print(f"  本页共提取 {len(questions)} 道题目。")
        return questions
    finally:
        await page.close()
        await context.close()


async def main(category_id: str, total_pages: int, start_page: int = 1):
    # 创建一个存放截图的目录
    output_dir = "question_screenshots"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    async with PersistentBrowserClient(headless=False) as client:
        browser = await client.playwright.chromium.launch(headless=True)

        parsed_questions: list = []
        for page_num in range(start_page, start_page + total_pages):
            print(f"\n--- 第 {page_num} 页（{page_num - start_page + 1}/{total_pages}）---")
            print(f"1. 正在请求第 {page_num} 页题目...")
            html = await fetch_page_html(client, category_id, page_num)
            if not html:
                print(f"   ⚠️  第 {page_num} 页未获取到内容，结束请求")
                break
            print(f"2. 渲染第 {page_num} 页并逐题截图...")
            questions = await process_page_html(browser, html, output_dir, len(parsed_questions))
            parsed_questions.extend(questions)

        await browser.close()

        if not parsed_questions:
            print("未获取到任何题目。")
            return

        # 并发抓取所有题目的答案页
        print(f"\n3. 开始并发获取答案（并发数={ANSWER_CONCURRENCY}）...")
        sem = asyncio.Semaphore(ANSWER_CONCURRENCY)

        for q in parsed_questions:
            if not q["detail_url"]:
                continue
            res = await fetch_answer(client, q["question_id"], q["detail_url"], output_dir, sem)
            q["answer_screenshot"] = res
            await asyncio.sleep(random.uniform(SLEEP_MIN, SLEEP_MAX))

        run_suffix = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_json = os.path.join(output_dir, f"questions_{category_id}_{run_suffix}.json")
        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(parsed_questions, f, ensure_ascii=False, indent=2)
        print(f"\n📄 题目元数据已保存 -> {output_json}")
            
        await browser.close()
        print("\n✅ 所有题目截图任务完成！")

async def retry_missing_answers(json_path: str) -> None:
    """读取 fetch 生成的 JSON，对未获取到答案的题目重新抓取。"""
    with open(json_path, encoding="utf-8") as f:
        questions: list = json.load(f)

    output_dir = os.path.dirname(json_path)
    missing = [q for q in questions if not q.get("answer_screenshot") and q.get("detail_url")]
    print(f"共 {len(questions)} 道题目，其中 {len(missing)} 道缺少答案，开始重新抓取...")

    if not missing:
        print("✅ 所有题目均已有答案，无需重试。")
        return

    async with PersistentBrowserClient(headless=False) as client:
        sem = asyncio.Semaphore(ANSWER_CONCURRENCY)
        for q in missing:
            res = await fetch_answer(client, q["question_id"], q["detail_url"], output_dir, sem)
            q["answer_screenshot"] = res
            await asyncio.sleep(random.uniform(SLEEP_MIN, SLEEP_MAX))

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print(f"\n📄 已更新 -> {json_path}")
    print("\n✅ 重试完成！")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="抓取题库题目截图及答案")
    subparsers = parser.add_subparsers(dest="command", required=True)

    fetch_parser = subparsers.add_parser("fetch", help="抓取题目截图及答案")
    fetch_parser.add_argument("--category-id", required=True, help="知识点分类 ID")
    fetch_parser.add_argument("--pages", type=int, default=1, help="请求总页数（默认：1）")
    fetch_parser.add_argument("--start-page", type=int, default=1, help="起始页码（默认：1）")

    retry_parser = subparsers.add_parser("retry", help="重新抓取 JSON 中缺少答案的题目")
    retry_parser.add_argument("--json", required=True, dest="json_path", help="fetch 生成的 JSON 文件路径")

    subparsers.add_parser("login", help="打开浏览器验证登录状态")

    args = parser.parse_args()

    if args.command == "login":
        asyncio.run(login())
    elif args.command == "fetch":
        asyncio.run(main(args.category_id, args.pages, start_page=args.start_page))
    elif args.command == "retry":
        asyncio.run(retry_missing_answers(args.json_path))
