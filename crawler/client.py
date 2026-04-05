# step2_request_and_update.py
from playwright.async_api import async_playwright, StorageState, Playwright, APIRequestContext
import asyncio
import json
from typing import Dict, Any

class PersistentAPIClient:
    playwright: Playwright
    api_context: APIRequestContext

    """
    持久化的 API 客户端，支持状态保存和更新
    """
    def __init__(self, state_file: str = 'browser_state.json'):
        self.state_file = state_file
        self._current_state: StorageState | None = None

    async def __aenter__(self):
        """上下文管理器入口"""
        self.playwright = await async_playwright().start()
        await self._load_or_create_context()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """上下文管理器出口，自动保存状态"""
        if self.api_context:
            await self.save_state()
            await self.api_context.dispose()
        if self.playwright:
            await self.playwright.stop()

    async def _load_or_create_context(self):
        """加载已有状态或创建新上下文"""
        try:
            with open(self.state_file, 'r') as f:
                self._current_state = json.load(f)
            print(f"✅ 从 {self.state_file} 加载状态")

            # 使用保存的状态创建 API 上下文
            self.api_context = await self.playwright.request.new_context(
                storage_state=self._current_state,
                base_url="https://zujuan.xkw.com",
                extra_http_headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                }
            )
        except FileNotFoundError:
            print(f"⚠️ 状态文件不存在，创建新上下文")
            self.api_context = await self.playwright.request.new_context()
            self._current_state = None

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

        # 尝试解析 JSON 响应
        try:
            result['data'] = await response.json()
        except Exception:
            result['text'] = await response.text()

        return result

    async def save_state(self):
        """保存当前状态到文件"""
        if self.api_context:
            current_state = await self.api_context.storage_state()

            # 检查状态是否有变化
            if current_state != self._current_state:
                with open(self.state_file, 'w') as f:
                    json.dump(current_state, f, indent=2, ensure_ascii=False)
                print(f"✅ 状态已更新并保存到 {self.state_file}")
                # 统计变化
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

# # 使用示例
# def main():
#     # 使用上下文管理器，自动保存状态
#     with PersistentAPIClient('browser_state.json') as client:
#         # 查看当前状态信息
#         info = client.get_state_info()
#         print(f"\n📊 当前状态: {info['cookies_count']} 个 Cookies, {info['origins_count']} 个域")
        
#         # 发送 GET 请求
#         print("\n1️⃣ 发送 GET 请求...")
#         result = client.get('https://api.example.com/user/profile')
#         if result['status'] == 200:
#             print(f"   ✅ 获取用户信息成功")
#             print(f"   📝 响应数据: {result['data']}")
#         else:
#             print(f"   ❌ 请求失败: {result['status']}")
        
#         # 发送 POST 请求（可能会更新 Cookie）
#         print("\n2️⃣ 发送 POST 请求...")
#         post_data = {"action": "refresh_token"}
#         result = client.post(
#             'https://api.example.com/auth/refresh',
#             data=post_data
#         )
#         print(f"   POST 响应状态: {result['status']}")
        
#         # 再次发送 GET 请求（使用可能已更新的认证信息）
#         print("\n3️⃣ 发送第二个 GET 请求...")
#         result = client.get('https://api.example.com/orders')
#         if result['status'] == 200:
#             orders = result['data']
#             print(f"   ✅ 获取到 {len(orders) if isinstance(orders, list) else '一些'} 条订单数据")
        
#         # 上下文退出时会自动保存状态
#         print("\n💾 程序结束，状态将自动保存...")

# if __name__ == '__main__':
#     main()