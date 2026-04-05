# browser_client.py
from playwright.async_api import async_playwright, StorageState, Playwright, Browser, BrowserContext, APIRequestContext
import json
from typing import Dict, Any


class PersistentBrowserClient:
    playwright: Playwright
    browser: Browser
    browser_context: BrowserContext
    api_context: APIRequestContext

    """
    持久化的浏览器 API 客户端。
    与 PersistentAPIClient 的关键区别在于：api_context 来自浏览器上下文，
    因此请求会自动携带浏览器中的 Cookie 和认证状态，适合需要先经过浏览器登录的场景。
    """

    def __init__(self, state_file: str = 'browser_state.json', headless: bool = True):
        self.state_file = state_file
        self.headless = headless
        self._current_state: StorageState | None = None

    async def __aenter__(self):
        """上下文管理器入口"""
        self.playwright = await async_playwright().start()
        await self._load_or_create_context()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """上下文管理器出口，自动保存状态"""
        if self.browser_context:
            await self.save_state()
            await self.browser_context.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()

    async def _load_or_create_context(self):
        """启动浏览器，加载已有状态或创建新上下文"""
        self.browser = await self.playwright.chromium.launch(headless=self.headless)

        try:
            with open(self.state_file, 'r') as f:
                self._current_state = json.load(f)
            print(f"✅ 从 {self.state_file} 加载状态")

            self.browser_context = await self.browser.new_context(
                storage_state=self._current_state,
                base_url="https://zujuan.xkw.com",
                extra_http_headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                }
            )
        except FileNotFoundError:
            print(f"⚠️ 状态文件不存在，创建新浏览器上下文")
            self.browser_context = await self.browser.new_context()
            self._current_state = None

        # api_context 来自浏览器上下文，共享 Cookie 和认证状态
        self.api_context = self.browser_context.request

    async def new_page(self):
        """创建一个新的浏览器页面，与 api_context 共享同一上下文"""
        return await self.browser_context.new_page()

    async def get(self, url: str, **kwargs) -> Dict[str, Any]:
        """发送 GET 请求"""
        response = await self.api_context.get(url, **kwargs)
        return await self._handle_response(response)

    async def post(self, url: str, **kwargs) -> Dict[str, Any]:
        """发送 POST 请求"""
        response = await self.api_context.post(url, **kwargs)
        return await self._handle_response(response)

    async def put(self, url: str, **kwargs) -> Dict[str, Any]:
        """发送 PUT 请求"""
        response = await self.api_context.put(url, **kwargs)
        return await self._handle_response(response)

    async def delete(self, url: str, **kwargs) -> Dict[str, Any]:
        """发送 DELETE 请求"""
        response = await self.api_context.delete(url, **kwargs)
        return await self._handle_response(response)

    async def _handle_response(self, response) -> Dict[str, Any]:
        """处理响应，提取状态码和 JSON 数据"""
        result: Dict[str, Any] = {
            'status': response.status,
            'headers': dict(response.headers),
            'url': response.url
        }

        try:
            result['data'] = await response.json()
        except Exception:
            result['text'] = await response.text()

        return result

    async def save_state(self):
        """保存当前浏览器上下文状态到文件"""
        if self.browser_context:
            current_state = await self.browser_context.storage_state()

            if current_state != self._current_state:
                with open(self.state_file, 'w') as f:
                    json.dump(current_state, f, indent=2, ensure_ascii=False)
                print(f"✅ 状态已更新并保存到 {self.state_file}")

                old_cookies = set((c.get('name', ""), c.get('domain', "")) for c in self._current_state.get('cookies', [])) if self._current_state else set()
                new_cookies = set((c.get('name', ""), c.get('domain', "")) for c in current_state.get('cookies', []))

                added = new_cookies - old_cookies
                removed = old_cookies - new_cookies

                if added:
                    print(f"   ➕ 新增 {len(added)} 个 Cookies")
                if removed:
                    print(f"   ➖ 减少 {len(removed)} 个 Cookies")

                self._current_state = current_state
            else:
                print("ℹ️ 状态无变化，跳过保存")

    def get_state_info(self) -> Dict:
        """获取当前状态信息"""
        if self._current_state:
            return {
                'cookies_count': len(self._current_state.get('cookies', [])),
                'origins_count': len(self._current_state.get('origins', [])),
                'cookies': self._current_state.get('cookies', [])
            }
        return {}
