import asyncio
import json
import os
from datetime import datetime
from typing import Dict
from urllib.parse import urljoin
from playwright.async_api import async_playwright
from browser_client import PersistentBrowserClient

async def main():
    # 创建一个存放截图的目录
    output_dir = "question_screenshots"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    async with PersistentBrowserClient(headless=False) as client:
        payload: Dict[str, str | float | bool]  = {
            "pageName": "zsd",
            "bankId": "11",
            "categoryId": "27929",
            "orderBy": "2",
            "curPage": "1",
        }

        print("1. 正在请求题库 API...")
        response = await client.post("/zujuan-api/question/list", form=payload)
        data = response.get("data", {})
        html_content = data.get("data", {}).get("html", "")

        if not html_content:
            print("未获取到 HTML 内容，请检查请求参数或网络状态。")
            return
            
        print("2. 获取 HTML 成功，启动 Playwright 进行渲染和截图...")
        
        # 2. 启动浏览器渲染页面
        # 注意这里不再是纯 API 请求了，我们需要真实浏览器引擎来排版
        browser = await client.playwright.chromium.launch(headless=True)
        #client.api_context
        context = await browser.new_context(
            # 设置一个足够宽的视口，防止题目排版换行过早
            viewport={"width": 1280, "height": 800}
        )
        page = await context.new_page()
        
        # 组装一个包含基础样式的完整 HTML，确保公式图片和排版正常显示
        # 学科网很多公式图片依赖网络加载，我们等网络空闲 (networkidle) 再进行下一步
        full_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5; padding: 20px; }}
                .tk-quest-item {{ background-color: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
                img {{ vertical-align: middle; }}
                /* 隐藏一些不需要截图出来的操作按钮，保持截图干净 */
                .right-msg, .ques-op {{ display: none !important; }}
            </style>
        </head>
        <body>
            {html_content}
        </body>
        </html>
        """
        
        # 将 HTML 内容注入页面，并等待所有图片等资源加载完毕
        await page.set_content(full_html, wait_until="networkidle")
        
        # 3. 提取题目并逐一截图
        # 定位所有包含单道题目的容器节点
        question_nodes = await page.locator(".tk-quest-item").all()
        total = len(question_nodes)
        
        print(f"3. 页面渲染完毕，共找到 {total} 道题目，开始逐一截图...")
        
        parsed_questions = []        
        for idx, node in enumerate(question_nodes):
            exam_node = node.locator(".exam-item__cnt")
            # 获取题目的真实 ID 用于命名，如果获取不到则用序号
            q_id = await node.get_attribute("questionid")
            if not q_id:
                q_id = f"unknown_{idx+1}"

            # 提取“详情”按钮链接
            detail_link = node.locator(".exam-item__info .ctrl-box a[data-btn-type='quesDetail']")
            detail_href = await detail_link.get_attribute("href") if await detail_link.count() > 0 else None
            detail_url = urljoin("https://zujuan.xkw.com", detail_href) if detail_href else ""

        
            # 获取题型和难度 (都在 .left-msg .info-cnt 里面)
            info_cnts = await node.locator(".left-msg .info-cnt").all_inner_texts()
            q_type = info_cnts[0].strip() if len(info_cnts) > 0 else ""
            q_diff = info_cnts[1].strip() if len(info_cnts) > 1 else ""
            
            # 获取考点/知识点
            knowledge_items = await node.locator(".knowledge-list .knowledge-item").all_inner_texts()
            knowledge_points = [k.strip() for k in knowledge_items]

                
            # 拼接保存路径
            file_path = os.path.join(output_dir, f"q_{q_id}.png")
            
            # 核心：调用 node 的 screenshot 方法，精准裁剪当前元素
            await exam_node.screenshot(path=file_path)
            print(f"  [{idx+1}/{total}] 截图已保存 -> {file_path}")

            # 打开详情页获取答案图片（复用已登录的 browser_context，携带 Cookie）
            answer_screenshots = []
            if detail_url:
                detail_page = await client.browser_context.new_page()
                try:
                    await detail_page.goto(detail_url, wait_until="networkidle")
                    answer_imgs = await detail_page.locator(
                        "body > main > section > section.answer-box > div.answer-txt > img"
                    ).all()
                    for img_idx, img in enumerate(answer_imgs):
                        suffix = f"_{img_idx + 1}" if len(answer_imgs) > 1 else ""
                        answer_path = os.path.join(output_dir, f"q_{q_id}_answer{suffix}.png")
                        await img.screenshot(path=answer_path)
                        answer_screenshots.append(answer_path)
                    print(f"     └─ 答案图片已保存 ({len(answer_imgs)} 张) -> {output_dir}/q_{q_id}_answer*.png")
                finally:
                    await detail_page.close()

            parsed_questions.append({
                "index": idx + 1,
                "question_id": q_id,
                "type": q_type,
                "difficulty": q_diff,
                "knowledge_points": knowledge_points,
                "content_screenshot": file_path,
                "detail_url": detail_url,
                "answer_screenshots": answer_screenshots,
            })

        run_suffix = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_json = os.path.join(output_dir, f"questions_{run_suffix}.json")
        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(parsed_questions, f, ensure_ascii=False, indent=2)

        print(f"\n📄 题目元数据已保存 -> {output_json}")
            
        await browser.close()
        print("\n✅ 所有题目截图任务完成！")

if __name__ == "__main__":
    asyncio.run(main())
