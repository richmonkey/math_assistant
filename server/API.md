# Math Assistant Server API 文档

- 生成日期：2026-03-17
- 服务框架：FastAPI
- 应用标题：`Math Assistant Auth Service`
- 认证方式：JWT Bearer Token（`Authorization: Bearer <token>`）

## 基本信息

- Base URL（本地开发）：`http://127.0.0.1:8000`
- Token 过期时间：60 分钟
- JWT 算法：HS256

## 通用约定

### 1. 认证

除 `POST /login` 外，其余接口都需要请求头：

```http
Authorization: Bearer <access_token>
```

未携带、格式错误、无效或过期 Token 时，返回：

- `401 Unauthorized`
- 无效或缺失 Token 响应体：

```json
{
  "detail": "Invalid or missing authentication token"
}
```

- 过期 Token 响应体：

```json
{
  "detail": "Authentication token has expired"
}
```

### 2. 题目类型枚举

`type` 字段可选值：

- `single`
- `multiple`
- `blank`
- `essay`

### 3. 常见错误格式

业务异常统一使用 FastAPI 默认错误结构：

```json
{
  "detail": "<错误信息>"
}
```

---

## 接口列表

## 1. 用户登录

### `POST /login`

使用用户名密码登录，返回访问令牌。

### 请求体

```json
{
  "username": "admin",
  "password": "123456"
}
```

字段约束：

- `username`: string，最小长度 1
- `password`: string，最小长度 1

### 成功响应

- `200 OK`

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "expires_at": "2026-03-17T12:34:56.789000Z",
  "expires_in": 3600
}
```

### 失败响应

- `401 Unauthorized`

```json
{
  "detail": "Invalid username or password"
}
```

---

## 2. 鉴权回显

### `POST /echo`

测试鉴权是否成功，回显消息与当前用户名。

### 请求头

- `Authorization: Bearer <access_token>`

### 请求体

```json
{
  "message": "hello"
}
```

### 成功响应

- `200 OK`

```json
{
  "message": "hello",
  "user": "admin"
}
```

### 失败响应

- `401 Unauthorized`（Token 无效或缺失）

---

## 3. 创建试卷

### `POST /papers`

为当前登录用户创建试卷。

### 请求头

- `Authorization: Bearer <access_token>`

### 请求体

```json
{
  "title": "2026 高三数学模拟卷",
  "description": "本卷共 25 题，满分 150 分"
}
```

字段约束：

- `title`: string，长度 1~255
- `description`: string，可选，默认为 `null`

### 成功响应

- `200 OK`

```json
{
  "id": "1",
  "title": "2026 高三数学模拟卷",
  "description": "本卷共 25 题，满分 150 分",
  "updated_at": "2026-03-18T10:00:00"
}
```

字段说明：

- `description`: 可为 `null`
- `updated_at`: 试卷最近更新时间，ISO 8601 格式

### 失败响应

- `401 Unauthorized`
- `422 Unprocessable Entity`（参数校验失败）

---

## 4. 获取试卷列表

### `GET /papers`

获取当前用户的试卷列表（按 `id` 升序）。

### 请求头

- `Authorization: Bearer <access_token>`

### 成功响应

- `200 OK`

```json
[
  {
    "id": "1",
    "title": "2026 高三数学模拟卷",
    "description": "本卷共 25 题，满分 150 分",
    "updated_at": "2026-03-18T10:00:00"
  }
]
```

字段说明：

- 列表项字段与 `POST /papers` 成功响应一致

### 失败响应

- `401 Unauthorized`

---

## 5. 获取试卷详情

### `GET /papers/{paper_id}`

获取指定试卷的完整详情，包括试卷整体批改结果、所有题目及每道题目的批改结果。

### 路径参数

- `paper_id`: string

### 请求头

- `Authorization: Bearer <access_token>`

### 成功响应

- `200 OK`

```json
{
  "id": "1",
  "uid": "1",
  "title": "2026 高三数学模拟卷",
  "description": "本卷共 25 题，满分 150 分",
  "updated_at": "2026-03-18T10:00:00",
  "grading_result": {
    "id": "1",
    "paper_id": "1",
    "comment": "整体思路清晰，个别小题有计算失误",
    "score": 88,
    "max_score": 100
  },
  "questions": [
    {
      "id": "1",
      "paper_id": "1",
      "type": "single",
      "prompt": "已知函数...",
      "answer": "A",
      "grading_result": {
        "id": "1",
        "question_id": "1",
        "comment": "选项正确",
        "score": 5,
        "max_score": 5,
        "is_correct": true
      }
    }
  ]
}
```

字段说明：

- `updated_at`: 试卷最近更新时间，ISO 8601 格式
- `grading_result`: 试卷批改结果，未批改时为 `null`
- `questions`: 题目列表，按 `id` 升序；每题的 `grading_result` 未批改时为 `null`

### 失败响应

- `401 Unauthorized`
- `404 Not Found`

```json
{
  "detail": "Paper not found"
}
```

---

## 6. 删除试卷

### `DELETE /papers/{paper_id}`

删除当前用户指定试卷。

### 路径参数

- `paper_id`: string

### 请求头

- `Authorization: Bearer <access_token>`

### 成功响应

- `200 OK`

```json
{
  "message": "Paper deleted"
}
```

### 失败响应

- `401 Unauthorized`
- `404 Not Found`

```json
{
  "detail": "Paper not found"
}
```

---

## 7. 获取试卷下题目列表

### `GET /papers/{paper_id}/questions`

获取指定试卷下所有题目（按 `id` 升序）。

### 路径参数

- `paper_id`: string

### 请求头

- `Authorization: Bearer <access_token>`

### 成功响应

- `200 OK`

```json
[
  {
    "id": "1",
    "paper_id": "1",
    "type": "single",
    "prompt": "已知函数...",
    "answer": "A"
  }
]
```

### 失败响应

- `401 Unauthorized`
- `404 Not Found`

```json
{
  "detail": "Paper not found"
}
```

---

## 8. 创建题目

### `POST /questions`

在当前用户所属试卷下创建题目。

### 请求头

- `Authorization: Bearer <access_token>`

### 请求体

```json
{
  "paper_id": "1",
  "type": "single",
  "prompt": "函数 f(x) 在 x=0 处的导数是...",
  "answer": "B"
}
```

字段约束：

- `paper_id`: string
- `type`: `single | multiple | blank | essay`
- `prompt`: string
- `answer`: string

### 成功响应

- `200 OK`

```json
{
  "id": "1",
  "paper_id": "1",
  "type": "single",
  "prompt": "函数 f(x) 在 x=0 处的导数是...",
  "answer": "B"
}
```

### 失败响应

- `401 Unauthorized`
- `404 Not Found`

```json
{
  "detail": "Paper not found"
}
```

- `422 Unprocessable Entity`

---

## 9. 更新题目

### `PUT /questions/{question_id}`

更新当前用户可访问题目（通过题目所属试卷进行归属校验）。

### 路径参数

- `question_id`: string

### 请求头

- `Authorization: Bearer <access_token>`

### 请求体

```json
{
  "type": "essay",
  "prompt": "证明：若 a>b>0，则...",
  "answer": "略"
}
```

### 成功响应

- `200 OK`

```json
{
  "id": "1",
  "paper_id": "1",
  "type": "essay",
  "prompt": "证明：若 a>b>0，则...",
  "answer": "略"
}
```

### 失败响应

- `401 Unauthorized`
- `404 Not Found`

```json
{
  "detail": "Question not found"
}
```

- `422 Unprocessable Entity`

---

## 10. 删除题目

### `DELETE /questions/{question_id}`

删除当前用户可访问题目。

### 路径参数

- `question_id`: string

### 请求头

- `Authorization: Bearer <access_token>`

### 成功响应

- `200 OK`

```json
{
  "message": "Question deleted"
}
```

### 失败响应

- `401 Unauthorized`
- `404 Not Found`

```json
{
  "detail": "Question not found"
}
```

---

## 11. 上传单题批改结果

### `POST /questions/{question_id}/grading-result`

上传（或覆盖）指定题目的批改结果。若该题目已有批改记录，则会更新原记录；否则创建新记录。

### 路径参数

- `question_id`: string

### 请求头

- `Authorization: Bearer <access_token>`

### 请求体

```json
{
  "comment": "步骤完整，计算正确",
  "score": 8,
  "max_score": 10,
  "is_correct": true
}
```

字段说明：

- `comment`: string
- `score`: integer
- `max_score`: integer
- `is_correct`: boolean

### 成功响应

- `200 OK`

```json
{
  "id": "1",
  "question_id": "12",
  "comment": "步骤完整，计算正确",
  "score": 8,
  "max_score": 10,
  "is_correct": true
}
```

### 失败响应

- `401 Unauthorized`
- `404 Not Found`

```json
{
  "detail": "Question not found"
}
```

- `422 Unprocessable Entity`

---

## 12. 上传整张试卷批改结果

### `POST /papers/{paper_id}/grading-result`

上传（或覆盖）指定试卷的整体批改结果。若该试卷已有批改记录，则会更新原记录；否则创建新记录。

### 路径参数

- `paper_id`: string

### 请求头

- `Authorization: Bearer <access_token>`

### 请求体

```json
{
  "comment": "整体思路清晰，个别小题有计算失误",
  "score": 88,
  "max_score": 100
}
```

字段说明：

- `comment`: string
- `score`: integer
- `max_score`: integer

### 成功响应

- `200 OK`

```json
{
  "id": "1",
  "paper_id": "3",
  "comment": "整体思路清晰，个别小题有计算失误",
  "score": 88,
  "max_score": 100
}
```

### 失败响应

- `401 Unauthorized`
- `404 Not Found`

```json
{
  "detail": "Paper not found"
}
```

- `422 Unprocessable Entity`

---

## 附：默认测试账号（初始化时自动创建）

服务启动时会尝试创建默认管理员账号（若不存在）：

- `username`: `admin`
- `password`: `123456`

> 建议在生产环境替换默认密码与密钥配置。
