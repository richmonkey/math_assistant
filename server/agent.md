# Agent API 文档

## 概述

Agent API 提供了一个基于会话的聊天接口，支持上下文记忆的多轮对话。通过调用这些接口，可以与 AI 助手进行交互式对话。

**所有端点都需要认证**。请在请求头中包含有效的 JWT Bearer Token。

**基础 URL**: `http://localhost:8000`

## 认证

所有 Agent API 端点都需要身份验证。使用 **JWT Bearer Token** 进行认证。

### 获取 Token

首先，通过用户登录端点获取 Access Token：

```
POST /auth/login
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
```

响应包含 Access Token：
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### 使用 Token

在所有请求中，在 `Authorization` 请求头中包含 Bearer Token：

```
Authorization: Bearer <your_access_token>
```

**Token 有效期**: 由服务器配置的 `ACCESS_TOKEN_EXPIRE_MINUTES` 决定（默认通常为 30 分钟）

## 数据模型

### ChatRequest
创建聊天请求的数据模型。

```json
{
  "session_id": "string",  // 会话ID
  "question_id": "string", // 题目ID（整数类型字符串）
  "message": "string"      // 用户消息内容
}
```

### ChatResponse
聊天接口的响应数据模型。

```json
{
  "session_id": "string",  // 会话ID
  "reply": "string"        // AI 助手的回复
}
```

### SessionCreateRequest
创建会话接口的请求数据模型。

```json
{
  "paper_id": "string",     // 试卷ID（整数类型字符串）
  "question_id": "string"   // 题目ID（整数类型字符串）
}
```

### SessionResponse
创建会话接口的响应数据模型。

```json
{
  "session_id": "string",  // 新创建的会话ID
  "message": "string",     // 提示信息
  "reply": "string"        // AI 的首条引导回复
}
```

## API 端点

### 1. 创建会话

**端点**: `POST /agent/session`

创建一个全新的会话。前端在开始全新对话时调用此接口获取唯一的 Session ID。
接口在创建成功后，会自动向 AI 发送首条引导提问“老师，我准备好开始做这道题了，请给我第一步的提示。”，并将 AI 的首条回复一并返回。

**请求**:
- 方法: `POST`
- 请求头:
  - `Content-Type: application/json`
  - `Authorization: Bearer <your_access_token>` (必需)
- 请求体:
```json
{
  "paper_id": "1",
  "question_id": "12"
}
```

**响应**:
- 状态码: `200`
- 响应体:
```json
{
  "session_id": "session_3f9a2b1c",
  "message": "新会话已就绪",
  "reply": "太好了！我们先从审题开始。这道题最关键的已知条件是什么，你能先把它找出来吗？"
}
```

**错误处理**:
- `404`: 题目不存在，或题目不属于当前用户
- `422`: `paper_id`/`question_id` 不是整数类型字符串
- `500`: 无法生成唯一会话 ID，请稍后重试

**使用示例**:
```bash
curl -X POST http://localhost:8000/agent/session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_access_token" \
  -d '{
    "paper_id": "1",
    "question_id": "12"
  }'
```

---

### 2. 发送聊天消息

**端点**: `POST /agent/chat`

接收用户的消息，并基于指定的 session_id 返回 AI 的回复。支持多轮对话，AI 会根据历史消息进行上下文理解。

**请求**:
- 方法: `POST`
- 请求头: 
  - `Content-Type: application/json`
  - `Authorization: Bearer <your_access_token>` (必需)
- 请求体:
```json
{
  "session_id": "session_3f9a2b1c",
  "question_id": "12",
  "message": "你好，请问你是谁？"
}
```

**响应**:
- 状态码: `200`
- 响应体:
```json
{
  "session_id": "session_3f9a2b1c",
  "reply": "你好！我是一个友善的 AI 助手。很高兴认识你！有什么我可以帮助你的吗？"
}
```

**错误处理**:
- `404`: 题目不存在，或题目不属于当前用户
- `422`: `question_id` 不是整数类型字符串
- `500`: 服务器内部错误

**使用示例**:
```bash
curl -X POST http://localhost:8000/agent/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_access_token" \
  -d '{
    "session_id": "session_3f9a2b1c",
    "question_id": "12",
    "message": "你好，请问你是谁？"
  }'
```

---

### 3. 获取会话历史记录

**端点**: `GET /agent/history/{session_id}`

获取某个特定 session_id 的完整历史对话记录。常用于前端页面刷新时加载上下文或查看完整对话历史。

**请求**:
- 方法: `GET`
- 请求头:
  - `Authorization: Bearer <your_access_token>` (必需)
- 路径参数:
  - `session_id` (string): 会话ID

**响应**:
- 状态码: `200`
- 响应体:
```json
{
  "session_id": "session_3f9a2b1c",
  "messages": [
    {
      "role": "user",
      "content": "你好，请问你是谁？"
    },
    {
      "role": "ai",
      "content": "你好！我是一个友善的 AI 助手。很高兴认识你！"
    },
    {
      "role": "user",
      "content": "你能帮我解答数学问题吗？"
    },
    {
      "role": "ai",
      "content": "当然可以！我很乐意帮助你解答数学问题。请告诉我具体的问题内容。"
    }
  ]
}
```

**消息角色**:
- `user`: 用户消息
- `ai`: AI 助手消息

**错误处理**:
- `400`: 无效的 session_id
- `404`: 会话不存在或历史记录文件不存在

**使用示例**:
```bash
curl http://localhost:8000/agent/history/session_3f9a2b1c \
  -H "Authorization: Bearer your_access_token"
```

---

### 4. 清空会话历史

**端点**: `DELETE /agent/history/{session_id}`

清空指定的会话历史记录。调用此接口后，该会话的所有对话历史将被删除，但会话 ID 仍然有效。

**请求**:
- 方法: `DELETE`
- 请求头:
  - `Authorization: Bearer <your_access_token>` (必需)
- 路径参数:
  - `session_id` (string): 会话ID

**响应**:
- 状态码: `200`
- 响应体:
```json
{
  "message": "会话 session_3f9a2b1c 已清空"
}
```

**错误处理**:
- `400`: 无效的 session_id
- `500`: 清空历史时发生错误

**使用示例**:
```bash
curl -X DELETE http://localhost:8000/agent/history/session_3f9a2b1c \
  -H "Authorization: Bearer your_access_token"
```

---

## 使用流程

### 标准对话流程

1. **获取 Access Token**（首次使用或 Token 过期时）
   ```bash
   curl -X POST http://localhost:8000/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "username": "your_username",
       "password": "your_password"
     }'
   # 得到 access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   ```

2. **创建会话**
   ```bash
   curl -X POST http://localhost:8000/agent/session \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your_access_token" \
     -d '{
       "paper_id": "1",
       "question_id": "12"
     }'
   # 得到 session_id: "session_3f9a2b1c"，并同时得到 AI 的首条引导回复 reply
   ```

3. **发送下一条消息**（首条引导消息已由创建会话接口自动发送）
   ```bash
   curl -X POST http://localhost:8000/agent/chat \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your_access_token" \
     -d '{
       "session_id": "session_3f9a2b1c",
       "question_id": "12",
       "message": "请解答这个数学问题：2+2等于多少？"
     }'
   ```

4. **继续多轮对话**（使用同一 session_id）
   ```bash
   curl -X POST http://localhost:8000/agent/chat \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your_access_token" \
     -d '{
       "session_id": "session_3f9a2b1c",
       "question_id": "12",
       "message": "那3+5呢？"
     }'
   # AI 会自动记得前面的对话上下文
   ```

5. **查看历史记录**
   ```bash
   curl http://localhost:8000/agent/history/session_3f9a2b1c \
     -H "Authorization: Bearer your_access_token"
   ```

6. **清空会话**（可选）
   ```bash
   curl -X DELETE http://localhost:8000/agent/history/session_3f9a2b1c \
     -H "Authorization: Bearer your_access_token"
   ```

---

## 技术细节

### 会话管理

- 每个 session_id 对应一个独立的聊天会话
- 创建会话时会把新生成的 session_id 绑定到对应 `question_id`
- 会话数据存储在本地文件中（JSON 格式）
- session_id 遵循格式: `session_` + 8位十六进制字符串
- Session ID 验证：只允许字母、数字、下划线和连字符

### 并发安全

- 会话文件创建使用原子操作 (`O_EXCL` + `O_CREAT`)，确保并发场景下的数据一致性
- 最多尝试 10 次生成唯一的 Session ID

### 性能特性

- 聊天接口使用异步调用 (`ainvoke`)，支持高并发
- 消息历史以 JSON 文件形式持久化存储

### 配置

- 历史记录存储目录由 `config.py` 中的 `HISTORY_DIR` 定义
- AI 模型使用 Ollama 本地服务，基础 URL: `http://localhost:11434/v1`
- 当前使用的模型: `qwen3-vl:8b-instruct`

---

## 错误处理

所有错误响应均遵循以下格式：

```json
{
  "detail": "错误信息描述"
}
```

### 常见错误

| 错误码 | 错误原因 | 解决方案 |
|--------|--------|--------|
| 401 | 缺少或无效的认证令牌 | 检查 Authorization 请求头，确保包含有效的 Bearer Token |
| 401 | 认证令牌已过期 | 重新登录获取新的 Access Token |
| 404 | 题目不存在或不属于当前用户 | 检查 `paper_id` 和 `question_id` 是否匹配且归属当前登录用户 |
| 422 | `paper_id` 或 `question_id` 不是整数类型字符串 | 传入可转为整数的字符串，如 `"1"` |
| 400 | Session ID 无效或包含不允许的字符 | 确保 Session ID 只包含字母、数字、下划线和连字符 |
| 400 | 请求体格式不正确 | 检查请求体是否符合 JSON 格式要求 |
| 500 | 服务器内部错误 | 检查服务器日志，确保 Ollama 服务正常运行 |
| 500 | 无法生成唯一 Session ID | 稍后重试或清理旧的会话文件 |

---

## 注意事项

1. **认证凭证**: 所有 API 请求都需要在 `Authorization` 请求头中包含有效的 Bearer Token
2. **Token 管理**: 
   - Token 有过期时间，需要定期更新
   - 请妥善保管 Token，避免在不安全的环境中传输
   - 不要在代码中硬编码 Token
3. **会话隔离**: 不同的 session_id 完全独立，不会共享对话历史
4. **持久化存储**: 会话历史保存在文件系统中，服务重启后数据不丢失
5. **内存占用**: 长期使用会积累会话文件，建议定期清理古老的会话
6. **安全考虑**: session_id 中的特殊字符会被自动过滤，防止目录穿越攻击
7. **请求超时**: 对话回复时间取决于 Ollama 模型的处理速度，请设置合理的超时时间

---

## 版本历史

- **v1.3** (2026-03-18): `POST /agent/session` 响应新增 `reply` 字段，并在创建成功后自动返回 AI 首条引导回复
- **v1.2** (2026-03-18): `POST /agent/session` 新增 `paper_id`、`question_id` 请求字段，并将会话绑定到题目
- **v1.1** (2026-03-18): 添加 JWT Bearer Token 认证，所有端点现在都需要认证
- **v1.0** (2026-03-18): 初始发布，包含基础聊天、历史记录和会话管理功能
