# 架构与技术栈

本文档说明 Commerce 项目的整体架构、技术选型依据，以及 Next.js 16 在本项目中的关键行为。

---

## 1. 系统架构概览

Commerce 是一个**单体全栈应用（Monolithic Full-Stack App）**：前端页面与后端 API 同处于一个 Next.js 项目中，共享同一套类型定义与数据库访问层。

```
┌─────────────────────────────────────────────────────────────┐
│                       浏览器 (Client)                         │
│   页面导航 / 表单提交 / 状态更新 (fetch → /api/*)            │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP
┌───────────────────────────▼─────────────────────────────────┐
│                   Next.js 16 (App Router)                    │
│                                                               │
│  ┌────────────────────┐        ┌──────────────────────────┐  │
│  │  Server Components  │        │   Route Handlers (/api)   │  │
│  │  (页面直接查库)      │        │   (REST API)              │  │
│  └─────────┬──────────┘        └────────────┬─────────────┘  │
│            │                                  │                │
│  ┌─────────▼──────────┐        ┌─────────────▼─────────────┐  │
│  │  Client Components  │        │   Drizzle ORM 查询构建器    │  │
│  │  (ProductForm 等)   │        └─────────────┬─────────────┘  │
│  └────────────────────┘                        │                │
└───────────────────────────────────────────────┼────────────────┘
                                                │
┌───────────────────────────────────────────────▼────────────────┐
│              SQLite (better-sqlite3, 文件: sqlite.db)            │
└────────────────────────────────────────────────────────────────┘
```

**关键设计点：**

- **页面即数据层**：列表页、详情页等均为 `async` 服务端组件（Server Component），在渲染时直接通过 Drizzle 查询 SQLite，无需经过 API 层。
- **API 独立存在**：`/api/*` Route Handlers 提供 REST 接口，主要供客户端组件（如 `ProductForm`、`UpdateOrderStatus`）通过 `fetch` 调用，实现创建/更新等写操作。
- **单一数据库访问层**：所有数据访问都经由 `src/db/index.ts` 导出的 `db` 单例，schema 定义集中在 `src/db/schema.ts`。

---

## 2. 技术栈详解

### Next.js 16（App Router）

- 使用 **App Router**（`src/app/` 目录约定式路由）。
- **Turbopack 默认启用**：`next dev` 与 `next build` 均使用 Turbopack，无需 `--turbopack` 标志。
- **React 19.2**：App Router 使用 React Canary，包含 View Transitions、`useEffectEvent`、`Activity` 等特性。

### 渲染与缓存模型（重要）

本项目**未启用** `cacheComponents`（Next.js 16 的 Cache Components / PPR 模型），因此使用的是默认的「Previous Model」渲染行为：

- **页面默认动态渲染**：由于页面组件读取了 `searchParams`（如 `?q=`、`?status=`）并直接查询数据库，它们被标记为动态路由，每次请求都会重新执行查询，保证数据新鲜。
- **`params` / `searchParams` 为异步 API**：Next.js 16 已完全移除同步访问方式。本项目已正确实现为 `Promise`，例如：

  ```tsx
  // src/app/products/[id]/page.tsx
  interface EditProductPageProps {
    params: Promise<{ id: string }>;
  }
  export default async function EditProductPage({ params }: EditProductPageProps) {
    const { id } = await params;   // ✅ 异步解包
    // ...
  }
  ```

- **GET Route Handlers 默认不缓存**：`/api/*` 的 GET 请求不会被自动缓存，每次都执行数据库查询。
- **`better-sqlite3` 是同步 API**：在默认渲染模型下，直接查询同步数据库会使路由动态化（不会进入静态预渲染），这正是本后台系统的预期行为——数据需实时。

> 若未来希望引入静态/缓存优化，可在 `next.config.ts` 中设置 `cacheComponents: true` 并配合 `use cache` 指令。详见 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#可选启用-cache-components)。

### Drizzle ORM + SQLite

- **SQLite** 通过 `better-sqlite3` 原生模块访问，数据库为单个文件 `sqlite.db`（启用 WAL 模式）。
- **Drizzle ORM** 提供类型安全的查询构建器，schema 用 `sqliteTable` 声明，关系用 `relations` 定义。
- 数据库文件与 `.next/` 一样属于本地状态，不提交到版本库（见 `.gitignore`）。

### Tailwind CSS v4

- 使用 Tailwind CSS 4 的新语法：在 `globals.css` 中通过 `@import "tailwindcss";` 引入，主题变量通过 `@theme` 定义。
- 无独立的 `tailwind.config.js`（v4 默认零配置，按需扫描）。

### 字体

- 通过 `next/font/google` 加载 `Geist` 与 `Geist_Mono`，以 CSS 变量 `--font-geist-sans` / `--font-geist-mono` 注入，避免布局抖动（FOUT）。

---

## 3. 目录结构与职责

| 路径 | 职责 |
|------|------|
| `src/app/layout.tsx` | 根布局：加载字体、渲染 `<Navbar>`、设置 `<metadata>`、定义全局 `<html>/<body>` 结构 |
| `src/app/page.tsx` | 仪表盘：聚合统计（总数/收入/待处理）+ 最近订单 |
| `src/app/products/*` | 商品列表、新建、编辑页 |
| `src/app/orders/*` | 订单列表、详情页；`UpdateOrderStatus.tsx` 为客户端组件 |
| `src/app/customers/*` | 客户列表、详情页 |
| `src/app/api/*` | REST API Route Handlers |
| `src/components/*` | 纯展示/交互组件，可在服务端或客户端复用 |
| `src/db/schema.ts` | 全部表结构与关系定义（单一事实来源） |
| `src/db/index.ts` | 数据库连接单例（全局缓存 + WAL） |
| `src/lib/seed.ts` | 种子数据脚本 |
| `src/content/*` | 文案资源（当前为「房贷计算器」遗留内容，见 README 说明） |

---

## 4. 服务端组件 vs 客户端组件

| 文件 | 类型 | 原因 |
|------|------|------|
| `app/**/page.tsx`（除表单外） | Server Component | 直接 `await db.query()`，无需 hydration |
| `components/Navbar.tsx` | Server Component | 纯静态导航链接 |
| `components/StatCard.tsx` | Server Component | 纯展示 |
| `components/OrderStatusBadge.tsx` | Server Component | 纯展示（根据 status 映射样式） |
| `components/OrderItemsTable.tsx` | Server Component | 纯展示表格 |
| `components/CustomerOrdersTable.tsx` | Server Component | 纯展示表格 |
| `components/ProductForm.tsx` | **Client Component** | 需要 `useState` 管理表单状态、提交时 `fetch` |
| `app/orders/[id]/UpdateOrderStatus.tsx` | **Client Component** | 需要 `useState` + `router.refresh()` 更新状态 |

**交互模式**：客户端组件提交写操作后，调用 `router.push()` / `router.refresh()` 触发服务端组件重新获取数据并刷新 UI，而非在前端手动维护状态。

---

## 5. 数据流示例

### 读取流程（列表页）

```
用户访问 /products?q=headphones
  → ProductsPage (Server Component)
  → await searchParams  (Promise)
  → db.select().from(products).leftJoin(categories).where(like(name, %q%))
  → 渲染表格
```

### 写入流程（创建商品）

```
用户在 /products/new 填写表单
  → ProductForm (Client Component) 收集 formData
  → fetch('/api/products', { method: 'POST', body: JSON })
  → POST /api/products (Route Handler)
  → db.insert(products).values(...)
  → 返回 201 + 新建记录
  → ProductForm 调用 router.push('/products') + router.refresh()
  → 列表页重新查询并展示新商品
```

### 状态更新流程（订单）

```
用户在 /orders/1 选择新状态并点击 Update
  → UpdateOrderStatus (Client Component)
  → fetch('/api/orders?id=1', { method: 'PATCH', body: { status } })
  → PATCH /api/orders (Route Handler)
  → db.update(orders).set({ status }).where(eq(id, 1))
  → 返回更新后的订单
  → UpdateOrderStatus 调用 router.refresh()
  → 订单详情页重新渲染，徽章与状态同步
```

---

## 6. 类型安全

- 全程 TypeScript 严格模式（`tsconfig.json` 中 `"strict": true`）。
- 路径别名 `@/*` 映射到 `src/*`，例如 `@/db`、`@/components/Navbar`。
- Drizzle 的 `sqliteTable` 定义自动推导出入参类型，API 与页面共享同一套类型，避免前后端字段不一致。
