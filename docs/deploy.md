# 部署指南

本文档记录 Commerce 项目的完整部署流程：从数据库选型、代码改造、推送到 GitHub，再到部署到 Vercel 公网可访问的全过程。

---

## 目录

1. [数据库选型：从 SQLite 到 Turso](#1-数据库选型从-sqlite-到-turso)
2. [代码改造：适配 Turso](#2-代码改造适配-turso)
3. [注册 Turso 并创建数据库](#3-注册-turso-并创建数据库)
4. [推送表结构和种子数据](#4-推送表结构和种子数据)
5. [推送到 GitHub](#5-推送到-github)
6. [部署到 Vercel](#6-部署到-vercel)
7. [验证部署结果](#7-验证部署结果)
8. [附：本地开发说明](#8-附本地开发说明)
9. [常见问题](#9-常见问题)

---

## 1. 数据库选型：从 SQLite 到 Turso

### 为什么不能直接用 SQLite 部署到 Vercel？

Vercel 使用 Serverless 函数运行应用，具有以下限制：

| SQLite 特性 | Vercel 问题 |
|-------------|-------------|
| 基于本地文件（`sqlite.db`） | 文件系统是**只读的**，不能写入 |
| 数据持久化在磁盘 | 每次请求可能在不同实例执行，数据不共享 |
| `better-sqlite3` 原生模块 | Vercel 环境可能缺少编译工具链 |

### 为什么选 Turso？

| 对比项 | Turso | Neon / Supabase |
|--------|-------|-----------------|
| 数据库类型 | **SQLite**（兼容） | PostgreSQL |
| Schema 改动量 | **零改动** | 需改数据类型 |
| 驱动替换 | `@libsql/client` | 不同驱动 |
| 免费额度 | 9GB 存储 | 各有免费档 |
| 适用场景 | 想最小改动快速部署 | 需要复杂查询 |

**结论**：Turso 是 Serverless SQLite，与本项目的 `drizzle-orm/sqlite` 天然兼容，schema 不用改一个字。

---

## 2. 代码改造：适配 Turso

### 2.1 安装依赖

```bash
npm install @libsql/client
npm uninstall better-sqlite3 @types/better-sqlite3
```

### 2.2 修改数据库连接 `src/db/index.ts`

**改造前（本地 SQLite）**：
```ts
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  conn: Database.Database | undefined;
};

const conn = globalForDb.conn ?? new Database(process.env.DB_URL ?? "sqlite.db");
globalForDb.conn = conn;
conn.pragma("journal_mode = WAL");
export const db = drizzle(conn, { schema });
```

**改造后（Turso + 本地回退）**：
```ts
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient(
  tursoUrl
    ? { url: tursoUrl, authToken: tursoToken }
    : { url: "file:sqlite.db" }
);

export const db = drizzle(client, { schema });
```

关键点：
- 设了 `TURSO_DATABASE_URL` → 连接 Turso 云端
- 未设置 → 自动回退本地 `file:sqlite.db`（本地开发不受影响）

### 2.3 修改 Drizzle Kit 配置 `drizzle.config.ts`

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "turso",              // 从 "sqlite" 改为 "turso"
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
```

### 2.4 更新 `.env`

```env
# Turso database — 从 turso.tech 获取
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-auth-token
```

> ⚠️ `.env` 已被 `.gitignore` 中的 `.env*` 规则忽略，**不会**提交到 GitHub，凭证安全。

### 2.5 `.gitignore` 补充

在原有基础上添加：

```gitignore
# local sqlite database
*.db
*.db-shm
*.db-wal

# temporary files
.tmp/

# opencode context
.opencode/
```

---

## 3. 注册 Turso 并创建数据库

### 方式一：网页控制台（推荐 Windows 用户）

1. 打开 **https://turso.tech**，点击 **"Start for free now"**
2. 使用 GitHub 账号登录授权
3. 进入 Dashboard，点击 **"Create Database"**

   | 字段 | 填写 |
   |------|------|
   | Database name | 自定义，如 `commerce-db` |
   | Location | 选择就近区域，如 `ap-southeast`（新加坡）或 `aws-eu-west-1` |

4. 创建成功后，页面显示 **Database URL**，格式如：
   ```
   libsql://commerce-db-xxxx.aws-eu-west-1.turso.io
   ```
5. 点击 **"Create Token"** 生成认证令牌（token），**复制保存**（关闭后不再显示）

### 方式二：Turso CLI

```bash
# 安装 CLI（macOS/Linux）
brew install tursodatabase/tap/turso

# 或 Windows 从 GitHub Releases 下载
# https://github.com/tursodatabase/turso-cli/releases

# 登录
turso auth login

# 创建数据库
turso db create commerce-db

# 获取 URL
turso db show commerce-db --url

# 生成 token
turso db tokens create commerce-db
```

### 获取的信息

成功后会得到两个关键值：

| 变量名 | 示例值 |
|--------|--------|
| `TURSO_DATABASE_URL` | `libsql://commerce-db-yun900800.aws-eu-west-1.turso.io` |
| `TURSO_AUTH_TOKEN` | `eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...` |

---

## 4. 推送表结构和种子数据

配置好 `.env` 后执行：

```bash
# 推送 schema 到 Turso（创建所有表）
npx drizzle-kit push

# 填充示例数据
npm run db:seed
```

`drizzle-kit push` 会读取 `.env` 中的 `TURSO_DATABASE_URL` 和 `TURSO_AUTH_TOKEN`，将 `src/db/schema.ts` 的表结构同步到远程 Turso 数据库。

### 创建测试用户

启动开发服务器后，注册一个测试用户：

```bash
npm run dev
```

然后用 `curl` 或直接在浏览器打开 `http://localhost:3000/auth` 注册。

---

## 5. 推送到 GitHub

### 5.1 安装并授权 GitHub CLI

```bash
# 安装 gh CLI（如已安装可跳过）
winget install GitHub.cli   # Windows
brew install gh             # macOS

# 登录授权（需要浏览器）
gh auth login -h github.com -p https -w
```

会生成一次性验证码，打开 **https://github.com/login/device** 输入后授权。

### 5.2 创建仓库并推送

```bash
# 在 GitHub 上创建仓库并推送本地代码
gh repo create <用户名>/<仓库名> --public --source=. --remote=origin --push

# 示例
gh repo create yun900800/commerce --public --source=. --remote=origin --push
```

如果已经创建了仓库但没推送成功，可以手动：

```bash
# 添加远程仓库
git remote add origin https://github.com/yun900800/commerce.git

# 添加所有文件、提交、推送
git add -A
git commit -m "feat: complete commerce app"
git push origin master
```

---

## 6. 部署到 Vercel

### 6.1 通过 Vercel Dashboard

1. 打开 **https://vercel.com/new**
2. 点击 **"Import Git Repository"**
3. 选择 `yun900800/commerce`（或你的仓库）
4. 在 **"Environment Variables"** 步骤添加：

   | 变量名 | 值 |
   |--------|-----|
   | `TURSO_DATABASE_URL` | 你的 Turso 数据库 URL |
   | `TURSO_AUTH_TOKEN` | 你的 Turso 认证令牌 |

   ![Vercel 环境变量配置](https://vercel.com/docs/_next/static/media/env-vars.e8b1c0e1.png)

5. 点击 **"Deploy"**，等待几分钟

### 6.2 通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm install -g vercel

# 部署
vercel

# 按照提示登录、关联仓库，部署到生产
vercel --prod
```

### 6.3 后续更新

每次推送新代码到 `master` 分支，Vercel 会自动重新部署。

```bash
git add -A
git commit -m "新功能"
git push origin master
# Vercel 自动部署 ✅
```

### 6.4 自定义域名（可选）

在 Vercel 项目设置 → **Domains** 中添加你的域名。

---

## 7. 验证部署结果

部署完成后，访问 Vercel 分配的域名（如 `https://commerce-sepia-rho-39.vercel.app`）：

### 验证清单

| 功能 | 路径 | 预期结果 |
|------|------|----------|
| 首页 | `/` | 显示仪表盘（订单统计 + 最近订单）|
| 注册 | `/auth` → Register | 创建新用户成功 |
| 登录 | `/auth` → Sign In | 登录成功，导航栏显示用户名 |
| 导航栏 | 所有页面 | 显示 Orders / Products / Customers / Users |
| 注销 | 点击 Sign Out | Cookie 清除，跳转回登录页 |
| 用户列表 | `/users` | 显示所有注册用户（姓名、邮箱、注册时间）|
| 商品 | `/products` | 显示种子数据的商品列表 |
| 客户 | `/customers` | 显示客户列表 |
| 订单 | `/orders` | 显示订单列表 |

---

## 8. 附：本地开发说明

### 8.1 本地开发（使用本地 SQLite）

注释掉 `.env` 中的 Turso 配置即可自动回退本地 SQLite：

```env
# 注释掉这两行就用本地 sqlite.db
# TURSO_DATABASE_URL=libsql://...
# TURSO_AUTH_TOKEN=...
```

```bash
npm run dev
```

### 8.2 本地开发（使用远程 Turso）

保持 `.env` 中的 Turso 配置，开发服务器直接连接远程数据库：

```bash
npm run dev
```

所有数据操作实时同步到 Turso 云端。

### 8.3 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（Turbopack） |
| `npm run build` | 生产构建 |
| `npm run db:push` | 同步 schema 到数据库 |
| `npm run db:seed` | 填充测试数据 |
| `npm run db:generate` | 生成迁移文件 |
| `npm run db:migrate` | 执行迁移 |
| `npm run db:studio` | 启动 Drizzle Studio |

---

## 9. 常见问题

### Q1: 部署后页面显示 "Cannot find module better-sqlite3"

**原因**：`package.json` 中还保留着 `better-sqlite3` 依赖。

**解决**：
```bash
npm uninstall better-sqlite3 @types/better-sqlite3
```
然后重新提交推送，Vercel 会自动重新部署。

### Q2: 部署后页面白屏或 500 错误

**原因**：Turso 环境变量未正确设置。

**解决**：
1. 在 Vercel 项目 → **Settings** → **Environment Variables** 检查 `TURSO_DATABASE_URL` 和 `TURSO_AUTH_TOKEN` 是否已添加
2. 确认 URL 以 `libsql://` 开头
3. 重新部署

### Q3: 数据库连接超时

**原因**：Turso 数据库所在区域与 Vercel 函数所在区域相隔较远。

**解决**：创建 Turso 数据库时选择与 Vercel 部署区域相近的位置（如 `aws-eu-west-1`）。

### Q4: `drizzle-kit push` 报错

**原因**：`.env` 中缺少或格式错误的 Turso 凭证。

**解决**：
```bash
# 检查环境变量是否加载
echo $TURSO_DATABASE_URL
echo $TURSO_AUTH_TOKEN
```

### Q5: 本地 `npm run dev` 报 libsql 相关错误

**原因**：缺少 `@libsql/client` 依赖。

**解决**：
```bash
npm install @libsql/client
```

### Q6: hydation mismatch 警告

**现象**：浏览器控制台显示 `A tree hydrated but some attributes of the server rendered HTML didn't match...`

**原因**：浏览器扩展（如广告拦截器、密码管理器）向页面注入了额外的 HTML 属性。

**解决**：不影响功能，可忽略。确认方式：在无痕模式下打开页面看是否还有此警告。

---

## 附录：文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `package.json` | 修改 | 添加 `@libsql/client`，移除 `better-sqlite3` |
| `src/db/index.ts` | 重写 | 改用 `@libsql/client`，支持 Turso/本地自动切换 |
| `drizzle.config.ts` | 重写 | 改为 `turso` 方言 |
| `.env` | 修改 | 添加 Turso 环境变量 |
| `.gitignore` | 修改 | 添加 `*.db`、`.tmp/`、`.opencode/` |
| `src/components/Navbar.tsx` | 修改 | 添加 Users 链接和 Sign Out |
| `src/app/users/page.tsx` | 新增 | 用户列表页面 |
| `src/app/api/auth/logout/route.ts` | 新增 | 注销 API |
| `.opencode/` | 新增 | 开发工具配置（无需提交） |
| `docs/deploy.md` | 新增 | 本文档 |
