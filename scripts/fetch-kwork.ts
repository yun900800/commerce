/**
 * Kwork 服务数据采集脚本 v3
 *
 * 从 Kwork Mobile API (api.kwork.ru) 拉取所有服务数据
 *
 * 使用方法:
 *   npx tsx scripts/fetch-kwork.ts
 *
 * 注意: Kwork API 的 `page` 参数无效，各页返回相同数据。
 *       改用 `limit` 参数控制每类获取数量。
 */

import fs from "fs";
import path from "path";
import { getCategoryEnglishName } from "../src/lib/kwork/category-translations";

// ─── 配置 ────────────────────────────────────────────────────

const API_HOST = "https://api.kwork.ru";
const AUTH_HEADER = "Basic bW9iaWxlX2FwaTpxRnZmUmw3dw==";

const CONFIG = {
  ITEMS_PER_CATEGORY: 200,      // 每类最大获取条数（API limit 参数）
  AUTO_SAVE_INTERVAL: 2000,     // 每多少条自动保存
  API_DELAY_MS: 300,            // API 调用间隔（防限流）
  DETAIL_CONCURRENCY: 5,        // 详情并发数
  DETAIL_TARGET: 200,           // 获取详情的目标条数（Top N）
};

const OUTPUT_DIR = path.resolve(__dirname, "../src/data");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "kwork-services.json");

// ─── 加载 .env.local ────────────────────────────────────────

function loadEnv() {
  const candidates = [
    path.resolve(__dirname, "../.env.local"),
    path.resolve(__dirname, "../../.env.local"),
  ];
  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let value = trimmed.slice(eqIdx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = value;
      }
      console.log(`📄 已加载环境变量: ${envPath}`);
      return;
    }
  }
}

loadEnv();

// ─── 工具函数 ────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function fmtTime(sec: number): string {
  if (sec < 60) return `${sec.toFixed(0)}秒`;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}分${s}秒`;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** 绘制进度条 */
function progressBar(current: number, total: number, width = 30): string {
  const pct = total > 0 ? (current / total) * 100 : 0;
  const filled = Math.floor((current / total) * width);
  const bar = "█".repeat(filled) + "░".repeat(Math.max(0, width - filled));
  return `${bar} ${pct.toFixed(1)}%`;
}

// ─── 进度显示器 ──────────────────────────────────────────────

class ProgressDisplay {
  private startTime: number;
  private lastLogTime = 0;
  private lastCount = 0;
  private totalCategories: number;
  private doneCategories = 0;
  private totalItems = 0;

  constructor(totalCategories: number) {
    this.startTime = Date.now();
    this.totalCategories = totalCategories;
  }

  /** 分类进度更新 */
  onCategoryProgress(done: number, total: number, catId: number, itemsInCategory: number, apiTotal?: number) {
    this.doneCategories = done;
    this.totalItems = total;
    const detail = itemsInCategory >= 0
      ? `获取 ${itemsInCategory} 条` + (apiTotal ? `（API 共 ${apiTotal.toLocaleString()} 条）` : ``)
      : `⚠️ 失败`;
    this.log(`📁 分类 [${done}/${this.totalCategories}]  #${catId}  ${detail}`);
  }

  /** 总体进度更新（用进度条） */
  onItemsProgress(current: number, target: number) {
    const now = Date.now();
    const elapsed = (now - this.startTime) / 1000;
    const rate = elapsed > 0 ? current / elapsed : 0;
    const remaining = target - current;
    const eta = rate > 0 ? remaining / rate : 0;

    const bar = progressBar(current, target);
    const itemsPerSec = rate.toFixed(1);
    const memSize = fmtSize(current * 200); // 估算每条 ~200 bytes

    this.log(
      `📊 ${bar}  ${current.toLocaleString()}/${target.toLocaleString()}  ` +
      `${itemsPerSec}条/秒  ETA: ${fmtTime(eta)}  [${memSize}]`
    );
    this.lastLogTime = now;
    this.lastCount = current;
  }

  /** 保存通知 */
  onAutoSave(count: number, filePath: string) {
    const elapsed = (Date.now() - this.startTime) / 1000;
    this.log(`💾 自动保存: ${count.toLocaleString()} 条 → ${path.basename(filePath)}  (已运行 ${fmtTime(elapsed)})`);
  }

  /** 详情进度 */
  onDetailProgress(done: number, total: number) {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const bar = progressBar(done, total, 20);
    this.log(`🔍 详情 ${bar}  ${done}/${total}  (${fmtTime(elapsed)})`);
  }

  private log(msg: string) {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const stamp = `[${fmtTime(elapsed).padStart(6)}]`;
    console.log(`  ${stamp} ${msg}`);
  }

  /** 最终统计 */
  done() {
    const totalTime = (Date.now() - this.startTime) / 1000;
    return totalTime;
  }
}

// ─── API 调用 ────────────────────────────────────────────────

let lastApiCall = 0;
let apiCallCount = 0;

async function apiPost(
  endpoint: string,
  params: Record<string, string | number | undefined>,
  token?: string
): Promise<any> {
  // 限速
  const now = Date.now();
  const gap = now - lastApiCall;
  if (gap < CONFIG.API_DELAY_MS) await sleep(CONFIG.API_DELAY_MS - gap);
  lastApiCall = Date.now();
  apiCallCount++;

  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) body.set(k, String(v));
  }
  if (token) body.set("token", token);

  const resp = await fetch(`${API_HOST}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: AUTH_HEADER,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await resp.json();
  if (!data.success) {
    throw new Error(`API error /${endpoint}: ${data.error || JSON.stringify(data)}`);
  }
  return data;
}

// ─── API 方法 ────────────────────────────────────────────────

async function login(loginName: string, password: string): Promise<string> {
  const data = await apiPost("signIn", { login: loginName, password });
  console.log("✅ 登录成功");
  return data.response.token;
}

async function getCategories(token: string): Promise<any[]> {
  const data = await apiPost("categories", {}, token);
  return data.response || [];
}

function collectLeafCategoryIds(categories: any[]): number[] {
  const ids: number[] = [];
  function walk(list: any[]) {
    for (const cat of list) {
      if (cat.subcategories?.length) {
        walk(cat.subcategories);
      } else if (cat.id != null) {
        ids.push(cat.id);
      }
    }
  }
  walk(categories);
  return ids;
}

async function getKworks(
  token: string | undefined,
  categoryId: number
): Promise<{ projects: any[]; total: number }> {
  // NOTE: Kwork API 的 `page` 参数无效，各页返回相同数据。
  //       使用 `limit` 参数一次性获取尽可能多的数据。
  const data = await apiPost("kworks", { categoryId, limit: CONFIG.ITEMS_PER_CATEGORY }, token);
  const resp = data.response || {};
  const projects: any[] = Array.isArray(resp.kworks) ? resp.kworks : [];
  return { projects, total: resp.kworks_count || projects.length || 0 };
}

async function getKworkDetails(token: string, kworkId: number): Promise<any> {
  const data = await apiPost("getKworkDetails", { id: kworkId });
  return data.response || null;
}

async function getKworkReviews(token: string, kworkId: number): Promise<any[]> {
  const data = await apiPost("getKworkReviews", { id: kworkId, page: 1 });
  return data.response || [];
}

// ─── 数据转换 ────────────────────────────────────────────────

function extractKwork(raw: any) {
  const d = raw.data || raw;
  const worker = d.worker || d.user || {};
  const activity = d.activity || {};

  let fullUrl = d.share_url || d.url || "";
  if (fullUrl && !fullUrl.startsWith("http")) {
    fullUrl = fullUrl.startsWith("/") ? `https://kwork.ru${fullUrl}` : `https://kwork.ru/${fullUrl}`;
  }

  // 翻译分类名
  const categoryId = d.category_id ?? d.categoryId ?? null;
  const russianCatName = (d.category_name ?? d.categoryName) || (d.category || "");
  const categoryName = getCategoryEnglishName(categoryId, russianCatName);

  return {
    id: d.id ?? null,
    title: d.title || "",
    url: fullUrl,
    price: d.price ?? null,
    isPriceFrom: d.is_price_from ?? d.isPriceFrom ?? null,
    categoryId,
    categoryName,
    statusId: d.status_id ?? d.statusId ?? null,
    statusName: (d.status_name ?? d.statusName) || "",
    photo: d.photo || d.image_url || null,
    imageUrl: (d.image_url ?? d.imageUrl) || null,
    isBest: d.is_best ?? d.isBest ?? null,
    isHidden: d.is_hidden ?? d.isHidden ?? null,
    lang: d.lang || null,
    isSubscription: d.isSubscription ?? null,
    favoritesCount: d.kwork_in_favorites_count ?? null,
    ordersInQueue: d.orders_in_queue_count ?? null,
    worker: worker.id ? {
      id: worker.id ?? null,
      username: worker.username || "",
      fullname: worker.fullname || null,
      profilepicture: worker.profilepicture || null,
      rating: worker.rating ?? null,
      reviewsCount: worker.reviews_count ?? worker.reviewsCount ?? null,
      ratingCount: worker.rating_count ?? worker.ratingCount ?? null,
      isOnline: worker.is_online ?? worker.isOnline ?? null,
    } : null,
    activity: (activity.views !== undefined || activity.orders !== undefined) ? {
      views: (activity.views ?? null),
      orders: (activity.orders ?? null),
      earned: (activity.earned ?? null),
    } : null,
    badges: d.badges || null,
    editsList: d.edits_list || null,
    _hasDetail: !!d.activity,
  };
}

// ─── 保存 ────────────────────────────────────────────────────

function saveToFile(projects: any[], filePath: string) {
  const output = {
    total: projects.length,
    generatedAt: new Date().toISOString(),
    projects,
  };
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
}

// ─── 主流程 ────────────────────────────────────────────────

async function main() {
  console.log("");
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║        Kwork 服务数据采集器 v3              ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`   配置: 每类取 Top ${CONFIG.ITEMS_PER_CATEGORY} 条`);
  console.log(`         自动保存: 每 ${CONFIG.AUTO_SAVE_INTERVAL.toLocaleString()} 条`);
  console.log(`         API限速: ${CONFIG.API_DELAY_MS}ms`);
  console.log("");

  // 1. 读取凭据
  const loginName = process.env.KWORK_LOGIN;
  const password = process.env.KWORK_PASSWORD;
  if (!loginName || !password) {
    console.error("❌ 请在 .env.local 中配置 KWORK_LOGIN 和 KWORK_PASSWORD");
    process.exit(1);
  }

  // 2. 登录
  const token = await login(loginName, password);
  if (!token) { console.error("❌ 登录失败"); process.exit(1); }

  // 3. 获取分类
  console.log("\n📂 获取分类树...");
  const categories = await getCategories(token);
  const leafIds = collectLeafCategoryIds(categories);
  const totalLeafCats = leafIds.length;
  console.log(`   一级分类: ${categories.length}  →  叶子分类: ${totalLeafCats}`);

  // 预估总数（仅用于进度条）
  const estimatedTotal = totalLeafCats * CONFIG.ITEMS_PER_CATEGORY;

  // 4. 初始化进度显示器
  const display = new ProgressDisplay(totalLeafCats);
  const allKworks: any[] = [];
  const startTime = Date.now();
  let emptyCats = 0;
  let lastSaveCount = 0;

  // 全局去重（不同分类之间可能出现重复服务）
  const seenIds = new Set<number>();

  // ====== 阶段 1: 列表获取 ======
  console.log("\n━━━ 阶段 1/2: 遍历分类获取服务列表（每类取 Top 200）━━━\n");

  for (let ci = 0; ci < totalLeafCats; ci++) {
    const catId = leafIds[ci];

    try {
      const { projects, total } = await getKworks(token, catId);

      if (!projects || projects.length === 0) {
        emptyCats++;
        display.onCategoryProgress(ci + 1, totalLeafCats, catId, 0);
        continue;
      }

      // 实时去重
      let newCount = 0;
      for (const p of projects) {
        const item = extractKwork(p);
        if (item.id != null && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          allKworks.push(item);
          newCount++;
        }
      }

      // 更新进度
      display.onItemsProgress(allKworks.length, estimatedTotal);

      // 分类进度
      display.onCategoryProgress(ci + 1, totalLeafCats, catId, newCount, total);

    } catch (e: any) {
      console.error(`\n   ⚠️  分类 #${catId} 失败: ${e.message}`);
      display.onCategoryProgress(ci + 1, totalLeafCats, catId, -1);
    }

    // ⭐ 自动保存
    const saveThreshold = Math.floor(allKworks.length / CONFIG.AUTO_SAVE_INTERVAL);
    if (saveThreshold > Math.floor(lastSaveCount / CONFIG.AUTO_SAVE_INTERVAL)) {
      const savePath = path.join(OUTPUT_DIR, `kwork-services-${allKworks.length}.json`);
      saveToFile(allKworks, savePath);
      display.onAutoSave(allKworks.length, savePath);
      lastSaveCount = allKworks.length;
    }
  }

  // 最终保存
  const phase1Time = (Date.now() - startTime) / 1000;
  const dedupRate = ((1 - allKworks.length / (totalLeafCats * CONFIG.ITEMS_PER_CATEGORY)) * 100).toFixed(0);
  console.log(`\n✅ 列表获取完成! 共 ${allKworks.length.toLocaleString()} 条（去重 ${dedupRate}%）`);
  console.log(`   空分类: ${emptyCats}  |  API 总调用: ${apiCallCount} 次`);
  console.log(`   用时: ${fmtTime(phase1Time)}`);

  // ====== 阶段 2: 获取详情 ======
  console.log("\n━━━ 阶段 2/2: 获取 Top 200 详情 + 评论 ━━━\n");

  // 按 reviewsCount 排序取 Top N（获取详情的人）
  const sortedByReviews = [...allKworks].sort((a, b) => {
    const aScore = a.worker?.reviewsCount ?? 0;
    const bScore = b.worker?.reviewsCount ?? 0;
    return bScore - aScore;
  });

  const topTarget = Math.min(CONFIG.DETAIL_TARGET, allKworks.length);
  const topItems = sortedByReviews.slice(0, topTarget);
  const rest = sortedByReviews.slice(topTarget);
  let detailDone = 0;

  const queue = [...topItems];
  async function detailWorker() {
    while (queue.length > 0) {
      const kw = queue.shift()!;
      if (!kw.id) { detailDone++; continue; }

      try {
        const details = await getKworkDetails(token, kw.id);
        if (details) {
          const merged = extractKwork(details);
          // 只补充详情特有的字段，不覆盖列表阶段已翻译好的分类名
          kw.activity = merged.activity || kw.activity;
          kw.worker = merged.worker || kw.worker;
          kw.favoritesCount = merged.favoritesCount ?? kw.favoritesCount;
          kw.ordersInQueue = merged.ordersInQueue ?? kw.ordersInQueue;
          kw._hasDetail = true;
        }

        const reviews = await getKworkReviews(token, kw.id);
        if (Array.isArray(reviews)) {
          if (!kw.activity) kw.activity = { views: null, orders: null, earned: null };
          kw._reviewCount = reviews.length;
        }
      } catch { /* 忽略详情失败 */ }

      detailDone++;
      if (detailDone % 20 === 0 || detailDone === topTarget) {
        display.onDetailProgress(detailDone, topTarget);
      }
      await sleep(150);
    }
  }

  const detailWorkers = Array.from({ length: CONFIG.DETAIL_CONCURRENCY }, () => detailWorker());
  await Promise.all(detailWorkers);

  // ====== 最终输出 ======
  console.log("\n━━━ 最终输出 ━━━\n");

  // 按评论数排序后输出
  const finalList = [...topItems, ...rest].sort((a, b) => {
    const aScore = a.worker?.reviewsCount ?? 0;
    const bScore = b.worker?.reviewsCount ?? 0;
    return bScore - aScore;
  });

  saveToFile(finalList, OUTPUT_PATH);
  const totalTime = display.done();
  const fileSize = fs.existsSync(OUTPUT_PATH) ? fs.statSync(OUTPUT_PATH).size : 0;

  console.log("");
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║              ✅  完成！                      ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`   📊 数据条数: ${finalList.length.toLocaleString()}`);
  console.log(`   💾 输出文件: ${OUTPUT_PATH}`);
  console.log(`   📦 文件大小: ${fmtSize(fileSize)}`);
  console.log(`   ⏱️  总用时: ${fmtTime(totalTime)}`);
  console.log(`   📞 API 调用: ${apiCallCount} 次`);
  console.log(`   📈 平均速度: ${(finalList.length / totalTime).toFixed(1)} 条/秒`);
  console.log("");
  console.log(`   温馨提示: 运行中已自动保存了以下增量文件:`);
  // 列出自动保存的文件
  const autoFiles = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.startsWith("kwork-services-") && f.endsWith(".json") && f !== "kwork-services.json")
    .sort();
  for (const f of autoFiles) {
    const p = path.join(OUTPUT_DIR, f);
    const s = fs.statSync(p);
    console.log(`     📄 ${f}  (${fmtSize(s.size)})`);
  }
  console.log("");
}

main().catch((e) => {
  console.error("\n❌ 脚本异常:", e);
  process.exit(1);
});
