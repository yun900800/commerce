# API 参考

本文档描述 Commerce 的 REST API（Route Handlers）。所有接口基础路径为 `/api`，请求与响应均为 JSON。

---

## 通用约定

- **Base URL**：`/api`
- **Content-Type**：`application/json`（写操作需在请求头设置 `Content-Type: application/json`）
- **查询参数**：通过 URL query string 传递（如 `?id=1`、`?q=headphones`、`?status=pending`）
- **响应格式**：成功返回数据对象/数组；失败返回 `{ "error": "消息" }`。
- **缓存**：GET 接口默认**不缓存**（每次请求实时查询数据库）。
- **ID 类型**：所有 `id` 为整数。

### 错误码

| 状态码 | 含义 |
|--------|------|
| `200` | 成功（GET / PUT / PATCH） |
| `201` | 创建成功（POST） |
| `400` | 请求参数缺失或无效 |
| `404` | 资源不存在 |
| `500` | 服务器内部错误（未显式处理，由框架返回） |

---

## Products API

基础路径：`/api/products`

### GET /api/products

列出全部商品，按 `created_at` 降序。支持可选搜索。

**查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `q` | string | 按商品名称模糊匹配（`LIKE %q%`） |
| `id` | number | 若提供，则返回单个商品（见下） |

**响应（列表）：**

```json
[
  {
    "id": 1,
    "name": "Wireless Headphones",
    "slug": "wireless-headphones",
    "description": "Bluetooth noise-cancelling headphones",
    "price": 79.99,
    "stock": 50,
    "imageUrl": null,
    "categoryId": 1,
    "createdAt": "2026-07-08 10:00:00",
    "updatedAt": "2026-07-08 10:00:00"
  }
]
```

### GET /api/products?id=1

按 ID 获取单个商品。不存在时返回 `404`。

```json
{ "error": "Not found" }
```

### POST /api/products

创建商品。

**请求体：**

```json
{
  "name": "New Product",
  "slug": "new-product",
  "description": "Optional description",
  "price": 19.99,
  "stock": 100,
  "imageUrl": "https://...",
  "categoryId": 1
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | ✅ | 名称 |
| `slug` | ✅ | 唯一标识 |
| `description` | ❌ | 默认 `null` |
| `price` | ✅ | 会被 `Number()` 转换 |
| `stock` | ❌ | 默认 `0` |
| `imageUrl` | ❌ | 默认 `null` |
| `categoryId` | ❌ | 默认 `null` |

**响应：** `201` + 新建记录对象。

### PUT /api/products?id=1

更新商品。`id` 可来自 query（`?id=`）或请求体（`body.id`）。

**请求体：** 同 POST（字段均可选，缺省不更新对应列）。

**响应：** 更新后的记录；若 `id` 缺失返回 `400`，若记录不存在返回 `404`。

### DELETE /api/products?id=1

删除商品。`id` 必填（query）。

**响应：**

```json
{ "success": true }
```

> 注意：删除商品**不会**级联删除引用它的 `order_items`，相关明细将变为悬空外键（SQLite 默认不强制外键）。生产环境建议先处理关联订单或启用外键约束。

---

## Orders API

基础路径：`/api/orders`

### GET /api/orders

列出全部订单，按 `created_at` 降序。支持状态筛选。

**查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `status` | string | 仅返回该状态的订单；非白名单值（pending/confirmed/shipped/delivered/cancelled）会被忽略 |
| `id` | number | 若提供，返回单个订单（含明细，见下） |

**响应（列表）：**

```json
[
  {
    "id": 1,
    "customerId": 1,
    "status": "delivered",
    "totalAmount": 114.98,
    "createdAt": "2026-07-08 10:00:00",
    "updatedAt": "2026-07-08 10:00:00"
  }
]
```

### GET /api/orders?id=1

按 ID 获取订单，**包含 `items` 明细数组**。不存在返回 `404`。

```json
{
  "id": 1,
  "customerId": 1,
  "status": "delivered",
  "totalAmount": 114.98,
  "createdAt": "2026-07-08 10:00:00",
  "updatedAt": "2026-07-08 10:00:00",
  "items": [
    {
      "id": 10,
      "quantity": 1,
      "unitPrice": 79.99,
      "productId": 1,
      "productName": "Wireless Headphones"
    }
  ]
}
```

### POST /api/orders

创建订单（含明细），**自动计算 `total_amount`**。

**请求体：**

```json
{
  "customerId": 1,
  "items": [
    { "productId": 1, "quantity": 2, "unitPrice": 79.99 },
    { "productId": 3 }
  ]
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `customerId` | ✅ | 客户 ID |
| `items` | ✅ | 非空数组 |
| `items[].productId` | ✅ | 商品 ID（必须存在，否则 `404`） |
| `items[].quantity` | ❌ | 默认 `1` |
| `items[].unitPrice` | ❌ | 默认取商品当前 `price`（快照写入） |

**行为：**
1. 校验 `customerId` 与 `items` 非空。
2. 遍历 `items`，逐条查商品；商品不存在则返回 `404 { "error": "Product X not found" }`。
3. `total_amount = Σ(unitPrice × quantity)`。
4. 插入 `orders`，再批量插入 `order_items`（关联新订单 ID）。

**响应：** `201` + `{ ...order, items: [...] }`。

### PATCH /api/orders?id=1

更新订单状态。`id` 可来自 query 或 body。

**请求体：**

```json
{ "status": "shipped" }
```

**响应：** 更新后的订单对象；`id` 缺失返回 `400`，不存在返回 `404`。

> 该接口**仅更新 `status`**，不校验状态合法性（应用层 UI 已限制可选值）。

---

## Customers API

基础路径：`/api/customers`

### GET /api/customers

列出全部客户，按 `created_at` 降序。支持搜索。

**查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `q` | string | 按姓名或邮箱模糊匹配 |
| `id` | number | 若提供，返回单个客户 |

**响应（列表）：**

```json
[
  {
    "id": 1,
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "phone": "555-0101",
    "address": "123 Main St, Springfield",
    "createdAt": "2026-07-08 10:00:00"
  }
]
```

### GET /api/customers?id=1

按 ID 获取单个客户。不存在返回 `404`。

### POST /api/customers

创建客户。

**请求体：**

```json
{
  "name": "Frank Miller",
  "email": "frank@example.com",
  "phone": "555-0106",
  "address": "999 Oak St, Boston"
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | ✅ | 姓名 |
| `email` | ✅ | 邮箱（数据库层 UNIQUE，重复会报错） |
| `phone` | ❌ | 默认 `null` |
| `address` | ❌ | 默认 `null` |

**响应：** `201` + 新建记录对象。

> 当前 Customers API **未提供** PUT / DELETE 端点。如需编辑或删除客户，需自行扩展 `src/app/api/customers/route.ts`。

---

## 调用示例（cURL）

```bash
# 列出所有商品
curl http://localhost:3000/api/products

# 搜索商品
curl "http://localhost:3000/api/products?q=headphones"

# 创建订单
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerId":1,"items":[{"productId":1,"quantity":2}]}'

# 更新订单状态
curl -X PATCH "http://localhost:3000/api/orders?id=1" \
  -H "Content-Type: application/json" \
  -d '{"status":"shipped"}'
```
