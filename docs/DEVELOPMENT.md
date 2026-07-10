# 开发指南与部署

本文档面向开发者，涵盖环境搭建、日常开发、代码质量、部署与故障排查。

---

## 1. 环境要求

| 依赖 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | **≥ 20.9.0** | Next.js 16 已弃用 Node 18 |
| npm | 任意较新版本 | 或 pnpm / yarn / bun |
| TypeScript | ≥ 5.1.0 | 项目使用 5.x |
| 操作系统 | Windows / macOS / Linux | `better-sqlite3` 需本地编译原生模块 |

---

## 2. 本地开发

### 2.1 安装依赖

```bash
npm install
```

> `better-sqlite3` 是原生模块，安装时会本地编译。若编译失败，请确认已安装对应平台的 C++ 构建工具链（Windows 需 Visual Studio Build Tools；macOS 需 Xcode CLI；Linux 需 `build-essential` + `python`）。

### 2.2 配置环境变量

编辑项目根目录的 `.env`：

```
DB_URL=sqlite.db
```

- `DB_URL` 为 SQLite 数据库文件路径（相对或绝对）。
- `.env` 已被 `.gitignore` 忽略，**不会**提交到仓库。
- 仓库中**没有** `.env.example`，请勿执行旧文档中的 `cp .env.example .env`。

### 2.3 初始化数据库

```bash
npm run db:push     # 创建表结构（schema → sqlite.db）
npm run db:seed     # 写入示例数据
```

### 2.4 启动开发服务器

```bash
npm run dev
```

- 使用 **Turbopack**（Next.js 16 默认），无需 `--turbopack` 标志。
- 开发服务器输出到 `.next/dev`（与 `next build` 的 `.next` 分离，可并行运行）。
- 访问 http://localhost:3000。

---

## 3. 构建与生产运行

```bash
npm run build       # 生产构建（Turbopack）
npm start           # 启动生产服务器（默认端口 3000）
```

> 若项目含自定义 `webpack` 配置，`next build` 会失败（Turbopack 默认启用）。可改用 `next build --webpack` 回退，或迁移到 Turbopack 配置。本项目无自定义 webpack 配置，不受影响。

---

## 4. 代码质量

### 4.1 Lint

Next.js 16 **已移除 `next lint`**，改用 ESLint CLI：

```bash
npm run lint        # 等价于直接运行 eslint
```

配置位于 `eslint.config.mjs`，使用 `eslint-config-next` 16.x（Flat Config 格式）。

### 4.2 类型检查

```bash
npx tsc --noEmit
```

项目 `tsconfig.json` 开启 `strict: true`，建议提交前执行类型检查。

---

## 5. 数据库工作流

| 场景 | 命令 |
|------|------|
| 修改 schema 后同步到本地库 | `npm run db:push` |
| 生成可复现的迁移文件 | `npm run db:generate` → 产出到 `drizzle/` |
| 执行迁移 | `npm run db:migrate` |
| 可视化浏览/编辑数据 | `npm run db:studio`（http://localhost:4983） |
| 重置并填充示例数据 | `npm run db:seed` |

> 当前采用 `db:push` 直接推送模式，`drizzle/` 目录为空。若团队需要可审计的迁移历史，建议切换到 `db:generate` + `db:migrate`。

---

## 6. 部署

### 6.1 Node.js 服务器（推荐）

`better-sqlite3` 依赖本地文件系统与原生模块，最适合运行在常驻 Node.js 环境：

- **Railway / Fly.io / Render / DigitalOcean / 自托管 VPS**
- 构建：`npm run build`
- 运行：`npm start`
- 确保 `DB_URL` 指向持久化存储路径（容器需挂载卷，否则重启后数据丢失）

### 6.2 Serverless 平台（Vercel 等）

SQLite 文件在 Serverless 实例间无法持久化，需替换数据库层：

- **Turso**（Serverless SQLite）：替换 `better-sqlite3` 为 `@libsql/client` + `drizzle-orm/libsql`。
- **Neon**（Serverless PostgreSQL）：替换驱动为 `drizzle-orm/neon-http` 并改写 schema 为 `pgTable`。

仅需修改 `src/db/index.ts` 的连接方式与 `src/db/schema.ts` 的表定义，上层查询代码基本不变。

### 6.3 环境变量

生产环境通过平台控制台设置 `DB_URL`（及未来可能新增的密钥）。**切勿**将 `.env` 提交到仓库。

---

## 7. 可选：启用 Cache Components

若希望引入静态预渲染与缓存优化（Partial Prerendering），可在 `next.config.ts` 启用：

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
};

export default nextConfig;
```

启用后需配合 `use cache` 指令标记可缓存的组件/函数，并将动态数据用 `<Suspense>` 包裹。由于本项目页面直接查询同步数据库（`better-sqlite3`），默认即动态渲染，启用前请充分评估缓存策略与数据新鲜度要求。详见 [ARCHITECTURE.md](docs/ARCHITECTURE.md#渲染与缓存模型重要)。

---

## 8. 故障排查

### 8.1 `better-sqlite3` 编译/加载失败

- **现象**：`npm install` 报错或运行时 `Error: Could not locate the bindings file`。
- **解决**：安装平台构建工具后删除 `node_modules` 与 `package-lock.json` 重新 `npm install`；或确认 Node 版本 ≥ 20.9。

### 8.2 数据库为空 / 页面无数据

- 确认已执行 `npm run db:push` 与 `npm run db:seed`。
- 确认 `.env` 中 `DB_URL` 指向的文件与运行进程工作目录一致（默认 `sqlite.db` 位于项目根）。

### 8.3 `params` / `searchParams` 相关类型错误

- Next.js 16 中二者均为 `Promise`，必须 `await`。若从旧版迁移，可运行 `npx next typegen` 生成 `PageProps` / `LayoutProps` 等类型辅助。

### 8.4 端口被占用

- `next dev` 默认 3000，被占用时 Next.js 会自动递增端口（3001、3002…）。可用 `next dev -p 4000` 显式指定。

### 8.5 多个 `next dev` / `next build` 冲突

- Next.js 16 引入了锁文件机制，同一项目不允许并发运行多个 `dev` 或 `build`。请先停止已有进程。

---

## 9. 已知问题 / 注意事项

1. **`src/content/` 文案与项目主题不符**：该目录下的 `hero-copy.md`（首页 Hero 文案）与 `seed-launch-email.md`（种子用户上线邮件）内容均围绕「房贷计算器」，与 Commerce 订单系统无关，且当前代码未引用。疑似早期遗留或待接入的营销素材。建议：
   - 若不再需要，删除该目录；
   - 若计划用于营销页，请在代码中显式加载并在文档中说明用途。
2. **`status` 字段无数据库层枚举约束**：`orders.status` 为自由文本，合法性仅在应用层校验。新增状态需同步更新 `src/app/api/orders/route.ts`（白名单）与 `src/app/orders/[id]/UpdateOrderStatus.tsx`（`STATUSES` 数组）。
3. **删除商品不级联**：`DELETE /api/products` 不会清理 `order_items` 中引用该商品的明细，可能产生悬空外键。生产环境建议增加保护逻辑或启用外键约束。
4. **Customers API 不完整**：仅提供 GET / POST，无 PUT / DELETE。编辑/删除客户需自行扩展。
5. **无认证/授权**：所有页面与 API 均公开访问，未做任何身份验证。生产部署前必须补充（如中间件、Server Actions 鉴权或反向代理层鉴权）。
