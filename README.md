# Commerce — 订单处理系统

一个基于 **Next.js 16（App Router）** 构建的现代电商订单处理后台，使用 **Drizzle ORM** 操作 **SQLite** 数据库，提供仪表盘、商品/订单/客户管理以及完整的 REST API。

> 本项目使用 Next.js 16.2.9，包含多项破坏性变更（如 `params` / `searchParams` 为异步 API、Turbopack 默认启用）。详见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

---

## 功能特性

- **仪表盘（Dashboard）** — 实时概览总订单数、总收入、待处理订单数，并展示最近 5 笔订单
- **商品管理（Products）** — 商品的创建、编辑、按名称搜索，支持分类关联
- **订单管理（Orders）** — 按状态筛选（pending / confirmed / shipped / delivered / cancelled）、查看订单详情与明细、更新订单状态
- **客户管理（Customers）** — 客户列表（含订单数与累计消费）、按姓名/邮箱搜索、查看单个客户的订单历史
- **REST API** — 商品、订单、客户的完整 CRUD 接口
- **种子数据** — 一键生成示例数据（5 客户、5 分类、10 商品、7 订单）

---

## 技术栈

| 层 | 技术 | 版本 |
|----|------|------|
| 框架 | Next.js（App Router） | 16.2.9 |
| UI 库 | React / React DOM | 19.2.4 |
| 语言 | TypeScript | 5.x |
| 数据库 | SQLite（`better-sqlite3`） | 12.11.1 |
| ORM | Drizzle ORM | 0.45.2 |
| 迁移工具 | Drizzle Kit | 0.31.10 |
| 样式 | Tailwind CSS | 4.x |
| 打包器 | Turbopack（Next.js 16 默认） | — |

---

## 快速开始

### 环境要求

- **Node.js ≥ 20.9.0**（Next.js 16 已不再支持 Node 18）
- npm（或 pnpm / yarn / bun）

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

项目通过 `DB_URL` 指定 SQLite 数据库文件路径，默认值为 `sqlite.db`。

```bash
# .env 已存在，内容为：
# DB_URL=sqlite.db
```

> 注意：仓库中**没有** `.env.example` 文件（README 旧版曾提及 `cp .env.example .env`，现已不适用）。`.env` 已被 `.gitignore` 忽略，不会提交到版本库。如需自定义数据库路径，直接修改 `.env` 中的 `DB_URL` 即可。

### 3. 初始化数据库

```bash
# 将 schema 推送到 SQLite（创建表结构）
npm run db:push

# 写入示例数据（5 客户、5 分类、10 商品、7 订单）
npm run db:seed
```

### 4. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

### 5. 生产构建

```bash
npm run build
npm start
```

---

## 项目结构

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # 根布局（字体、Navbar、metadata）
│   ├── page.tsx                  # 仪表盘
│   ├── globals.css               # 全局样式（Tailwind v4）
│   ├── products/
│   │   ├── page.tsx              # 商品列表（支持 ?q= 搜索）
│   │   ├── new/page.tsx          # 新建商品
│   │   └── [id]/page.tsx         # 编辑商品
│   ├── orders/
│   │   ├── page.tsx              # 订单列表（支持 ?status= 筛选）
│   │   └── [id]/
│   │       ├── page.tsx          # 订单详情 + 明细
│   │       └── UpdateOrderStatus.tsx  # 客户端组件：更新订单状态
│   ├── customers/
│   │   ├── page.tsx              # 客户列表（支持 ?q= 搜索）
│   │   └── [id]/page.tsx         # 客户详情 + 订单历史
│   └── api/                      # REST API（Route Handlers）
│       ├── products/route.ts
│       ├── orders/route.ts
│       └── customers/route.ts
├── components/                   # 可复用 UI 组件
│   ├── Navbar.tsx                # 顶部导航
│   ├── StatCard.tsx              # 仪表盘统计卡片
│   ├── ProductForm.tsx           # 商品创建/编辑表单（客户端组件）
│   ├── OrderStatusBadge.tsx      # 订单状态徽章
│   ├── OrderItemsTable.tsx       # 订单明细表
│   └── CustomerOrdersTable.tsx   # 客户订单历史表
├── content/                      # 内容/文案资源（Markdown）
│   ├── hero-copy.md              # 首页 Hero 文案
│   └── seed-launch-email.md      # 种子用户上线通知邮件
├── db/
│   ├── schema.ts                 # 数据库 Schema（5 张表 + 关系）
│   └── index.ts                  # 单例数据库连接
└── lib/
    └── seed.ts                   # 数据库种子脚本
```

> **关于 `src/content/`**：该目录目前存放的是「房贷计算器」相关的中文文案（`hero-copy.md`、`seed-launch-email.md`），与 Commerce 订单系统的主题不一致，疑似早期遗留内容或待接入的营销素材。当前代码并未引用这些文件。详见 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#已知问题注意事项) 的「已知问题」一节。

---

## 数据库概览

数据库包含 5 张表，关系如下：

```
customers 1───* orders *───1 customers
categories 1───* products
products   1───* order_items *───1 orders
```

| 表 | 说明 |
|----|------|
| `customers` | 客户信息（姓名、邮箱、电话、地址） |
| `categories` | 商品分类 |
| `products` | 商品（价格、库存、分类引用） |
| `orders` | 订单（状态、总额、客户引用） |
| `order_items` | 订单明细（关联订单与商品，含数量与单价） |

完整字段定义、约束与关系图见 [docs/DATABASE.md](docs/DATABASE.md)。

---

## API 概览

所有接口均返回 JSON，基础路径为 `/api`。

### Products

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/products` | 列出全部商品（支持 `?q=` 搜索） |
| GET | `/api/products?id=1` | 按 ID 获取商品 |
| POST | `/api/products` | 创建商品 |
| PUT | `/api/products?id=1` | 更新商品 |
| DELETE | `/api/products?id=1` | 删除商品 |

### Orders

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/orders` | 列出全部订单（支持 `?status=` 筛选） |
| GET | `/api/orders?id=1` | 按 ID 获取订单（含明细 items） |
| POST | `/api/orders` | 创建订单（含明细，自动计算总额） |
| PATCH | `/api/orders?id=1` | 更新订单状态 |

### Customers

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/customers` | 列出全部客户（支持 `?q=` 搜索） |
| GET | `/api/customers?id=1` | 按 ID 获取客户 |
| POST | `/api/customers` | 创建客户 |

完整的请求/响应示例、字段说明与错误码见 [docs/API.md](docs/API.md)。

---

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（Turbopack） |
| `npm run build` | 生产构建 |
| `npm start` | 启动生产服务器 |
| `npm run lint` | 运行 ESLint（Next.js 16 已移除 `next lint`，改用 ESLint CLI） |
| `npm run db:push` | 将 schema 推送到数据库 |
| `npm run db:generate` | 生成迁移文件 |
| `npm run db:migrate` | 执行迁移 |
| `npm run db:studio` | 打开 Drizzle Studio 可视化数据库管理 |
| `npm run db:seed` | 写入示例数据 |

---

## 文档导航

- [架构与技术栈](docs/ARCHITECTURE.md)
- [数据库设计](docs/DATABASE.md)
- [API 参考](docs/API.md)
- [开发指南与部署](docs/DEVELOPMENT.md)

---

## 部署说明

`better-sqlite3` 是原生模块，依赖本地文件系统，**最适合运行在 Node.js 服务器**（如 Railway、Fly.io、DigitalOcean、自托管 VPS）。

若部署到 Serverless 平台（如 Vercel），SQLite 文件无法持久化，建议改用 **Turso**（Serverless SQLite）或 **Neon**（Serverless PostgreSQL），并相应调整 `src/db/index.ts` 中的连接方式与 Drizzle 驱动。
