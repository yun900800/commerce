# 数据库设计

本文档描述 Commerce 的数据库选型、连接管理、Schema 结构、迁移与种子数据。

---

## 1. 数据库选型

| 项目 | 说明 |
|------|------|
| 引擎 | **SQLite**（单文件嵌入式数据库） |
| 驱动 | `better-sqlite3`（同步原生模块） |
| 文件 | `sqlite.db`（由 `DB_URL` 环境变量指定，默认 `sqlite.db`） |
| 日志模式 | **WAL（Write-Ahead Logging）** |
| ORM | Drizzle ORM 0.45.2 |
| 迁移工具 | Drizzle Kit 0.31.10 |

**为何选 SQLite？** 项目定位为本地/单机订单后台，SQLite 零运维、单文件、启动即用，配合 `better-sqlite3` 的同步 API 与 Next.js 服务端组件天然契合。生产环境若需水平扩展或 Serverless，可平滑迁移到 Turso / Neon（见 [DEVELOPMENT.md](docs/DEVELOPMENT.md#部署)）。

---

## 2. 连接管理

数据库连接在 `src/db/index.ts` 中通过**全局单例**管理，避免开发模式下热重载（HMR）反复创建连接导致文件句柄泄漏：

```ts
// src/db/index.ts
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  conn: Database.Database | undefined;
};

const conn =
  globalForDb.conn ?? new Database(process.env.DB_URL ?? "sqlite.db");
globalForDb.conn = conn;

conn.pragma("journal_mode = WAL");   // 启用 WAL 提升并发读写性能

export const db = drizzle(conn, { schema });
```

- 连接缓存在 `globalThis`，在 Next.js 开发服务器的多次模块重载间复用。
- `WAL` 模式允许一个写者 + 多个读者并发，适合后台读写场景。
- `drizzle(conn, { schema })` 将 schema 与连接绑定，使查询具备完整类型推断。

---

## 3. Schema 详解

所有表定义位于 `src/db/schema.ts`，使用 Drizzle 的 `sqliteTable` API。

### 3.1 实体关系图

```
┌─────────────┐         ┌──────────────┐
│  customers  │ 1     * │   orders     │
└─────────────┘         └──────┬───────┘
                                │ *
                                │
                                │ *      ┌──────────────┐
                                └────────┤ order_items │
                                         └──────┬───────┘
                                                │ *
                                                │
                                    ┌───────────▼─────────┐    ┌──────────────┐
                                    │     products        │ *  │  categories  │
                                    └───────────┬─────────┘ 1  └──────────────┘
                                                │
                                          category_id (FK)
```

### 3.2 表结构

#### `customers` — 客户

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `INTEGER` | PK, 自增 | 客户 ID |
| `name` | `TEXT` | NOT NULL | 姓名 |
| `email` | `TEXT` | NOT NULL, UNIQUE | 邮箱（唯一） |
| `phone` | `TEXT` | 可空 | 电话 |
| `address` | `TEXT` | 可空 | 地址 |
| `created_at` | `TEXT` | 默认 `CURRENT_TIMESTAMP` | 创建时间 |

#### `categories` — 商品分类

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `INTEGER` | PK, 自增 | 分类 ID |
| `name` | `TEXT` | NOT NULL | 分类名 |
| `slug` | `TEXT` | NOT NULL, UNIQUE | URL 友好标识 |
| `description` | `TEXT` | 可空 | 描述 |

#### `products` — 商品

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `INTEGER` | PK, 自增 | 商品 ID |
| `name` | `TEXT` | NOT NULL | 名称 |
| `slug` | `TEXT` | NOT NULL, UNIQUE | URL 友好标识 |
| `description` | `TEXT` | 可空 | 描述 |
| `price` | `REAL` | NOT NULL | 单价 |
| `stock` | `INTEGER` | NOT NULL, 默认 0 | 库存 |
| `image_url` | `TEXT` | 可空 | 图片地址 |
| `category_id` | `INTEGER` | FK → `categories.id` | 所属分类（可空） |
| `created_at` | `TEXT` | 默认 `CURRENT_TIMESTAMP` | 创建时间 |
| `updated_at` | `TEXT` | 默认 `CURRENT_TIMESTAMP` | 更新时间 |

#### `orders` — 订单

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `INTEGER` | PK, 自增 | 订单 ID |
| `customer_id` | `INTEGER` | NOT NULL, FK → `customers.id` | 下单客户 |
| `status` | `TEXT` | NOT NULL, 默认 `'pending'` | 订单状态 |
| `total_amount` | `REAL` | NOT NULL, 默认 0 | 订单总额 |
| `created_at` | `TEXT` | 默认 `CURRENT_TIMESTAMP` | 创建时间 |
| `updated_at` | `TEXT` | 默认 `CURRENT_TIMESTAMP` | 更新时间 |

**订单状态（`status`）取值：**

| 值 | 含义 |
|----|------|
| `pending` | 待处理 |
| `confirmed` | 已确认 |
| `shipped` | 已发货 |
| `delivered` | 已送达 |
| `cancelled` | 已取消 |

> 注意：数据库层 `status` 为自由文本字段，**未使用枚举约束**。应用层在 API 与 UI 中对状态值做了白名单校验（如 `orders/route.ts` 中 `status` 过滤、`UpdateOrderStatus.tsx` 中固定 `STATUSES` 数组）。新增状态需同步更新这两处。

#### `order_items` — 订单明细

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `INTEGER` | PK, 自增 | 明细 ID |
| `order_id` | `INTEGER` | NOT NULL, FK → `orders.id` | 所属订单 |
| `product_id` | `INTEGER` | NOT NULL, FK → `products.id` | 商品 |
| `quantity` | `INTEGER` | NOT NULL, 默认 1 | 数量 |
| `unit_price` | `REAL` | NOT NULL | 下单时单价（快照） |

> `unit_price` 在创建订单时从商品当前价格快照写入，即使后续商品改价，历史订单金额也不受影响。

### 3.3 关系定义（Drizzle `relations`）

```ts
customersRelations   → orders (many)
categoriesRelations  → products (many)
productsRelations    → category (one) + orderItems (many)
ordersRelations      → customer (one) + items (many)
orderItemsRelations  → order (one) + product (one)
```

这些关系用于 Drizzle 的「关系查询 API」（`db.query.*`）以及类型推导。当前项目主要使用显式 `leftJoin` 而非关系查询，但关系定义仍保留以备扩展。

---

## 4. 迁移（Migrations）

Drizzle Kit 配置位于 `drizzle.config.ts`：

```ts
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DB_URL ?? "sqlite.db" },
});
```

| 命令 | 作用 |
|------|------|
| `npm run db:push` | 将 schema 直接同步到数据库（开发常用，无需迁移文件） |
| `npm run db:generate` | 根据 schema 差异生成 SQL 迁移文件到 `drizzle/` |
| `npm run db:migrate` | 执行 `drizzle/` 中的迁移文件 |
| `npm run db:studio` | 启动 Drizzle Studio（默认 http://localhost:4983）可视化浏览/编辑数据 |

> 当前 `drizzle/` 目录为空，项目采用 **`db:push` 直接推送** 的工作流，未生成独立迁移文件。如需可复现的迁移历史，建议改用 `db:generate` + `db:migrate`。

---

## 5. 种子数据（Seed）

`src/lib/seed.ts` 通过 `npm run db:seed` 执行，流程如下：

1. **清空现有数据**：依次 `DELETE` `order_items` → `orders` → `products` → `categories` → `customers`（注意顺序以满足外键依赖）。
2. **插入客户**：5 条（Alice、Bob、Carol、David、Eve）。
3. **插入分类**：5 条（Electronics、Clothing、Home & Garden、Books、Sports）。
4. **插入商品**：10 条，分布在各分类下，含价格与库存。
5. **插入订单**：7 条，状态覆盖 delivered / shipped / confirmed / pending。
6. **插入订单明细**：12 条，关联订单与商品。
7. **修正总额**：脚本末尾对第 5、6 笔订单的 `total_amount` 做了二次 `UPDATE`，使其与明细金额一致（见脚本注释）。

> 种子脚本是**幂等覆盖式**的（先清空再插入），可反复运行。

---

## 6. 常用查询示例

```ts
import { db } from "@/db";
import { orders, orderItems, products, customers } from "@/db/schema";
import { eq, sql, desc, like } from "drizzle-orm";

// 1. 仪表盘统计：总数、总收入、待处理数
const [stats] = await db
  .select({
    totalOrders: sql<number>`count(*)`.mapWith(Number),
    totalRevenue: sql<number>`coalesce(sum(${orders.totalAmount}), 0)`.mapWith(Number),
    pendingOrders: sql<number>`count(case when ${orders.status} = 'pending' then 1 end)`.mapWith(Number),
  })
  .from(orders);

// 2. 订单 + 客户（左连接）
const list = await db
  .select({ id: orders.id, status: orders.status, customerName: customers.name })
  .from(orders)
  .leftJoin(customers, eq(orders.customerId, customers.id))
  .orderBy(desc(orders.createdAt));

// 3. 订单明细 + 商品名
const items = await db
  .select({ productName: products.name, quantity: orderItems.quantity, unitPrice: orderItems.unitPrice })
  .from(orderItems)
  .leftJoin(products, eq(orderItems.productId, products.id))
  .where(eq(orderItems.orderId, 1));

// 4. 客户搜索（姓名或邮箱）
const found = await db
  .select()
  .from(customers)
  .where(sql`(${customers.name} like ${`%${q}%`} or ${customers.email} like ${`%${q}%`})`);
```
