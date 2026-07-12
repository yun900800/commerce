/**
 * Legiit 数据抓取引擎 - 分步方案
 *
 * Step 1: 手动获取 sitemap（只需一次）
 *   用 Chrome 访问 https://legiit.com/services.xml
 *   Ctrl+S 保存为 src/data/services.xml
 *
 * Step 2: 自动抓取
 *   1. 读取本地的 services.xml
 *   2. 连接你的 Chrome（或自动启动）
 *   3. 批量抓取所有服务页面
 *   4. 生成 JSON
 *
 * 快速开始:
 *   npx tsx src/lib/legiit/scraper.ts
 *   npx tsx src/lib/legiit/scraper.ts --limit 5   # 测试用
 */

import * as fs from 'fs';
import * as path from 'path';
import { Browser, Page } from 'puppeteer-core';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { LegiitService } from './types';

puppeteer.use(StealthPlugin());

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9222;
const SITEMAP_LOCAL = path.resolve(process.cwd(), 'src/data/services.xml');
const CATEGORIES_URL = 'https://legiit.com/categories.xml';

// ============================================================
// Chrome 连接管理
// ============================================================

async function tryConnectChrome(): Promise<Browser | null> {
  try {
    const browser = await puppeteer.connect({
      browserURL: `http://127.0.0.1:${DEBUG_PORT}`,
      defaultViewport: null,
    });
    console.log('  ✅ 已连接到您的 Chrome');
    // 检测是否有 Legiit 会话
    const pages = await browser.pages();
    const hasLegiit = pages.some(p => p.url().includes('legiit.com'));
    if (hasLegiit) console.log('  ✅ 检测到 Legiit 登录会话');
    return browser;
  } catch {
    return null;
  }
}

async function launchChrome(): Promise<Browser> {
  const userDataDir = path.resolve(process.env.LOCALAPPDATA || '', 'Google/Chrome/User Data');
  console.log('  ⏳ 启动 Chrome（可见窗口，使用你的用户数据）...');
  console.log(`  📁 用户数据: ${userDataDir}`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-sync',
      `--user-data-dir=${userDataDir}`,
    ],
  });
  console.log('  ✅ Chrome 已启动（使用你的配置文件，应可绕过 Cloudflare）');
  return browser;
}

async function getBrowser(): Promise<Browser> {
  console.log('\n🔍 准备浏览器...');

  // 先尝试连接远程调试端口（如果用户手动启动了 Chrome）
  const connected = await tryConnectChrome();
  if (connected) return connected;

  // 否则用你的用户数据启动 Chrome（保留 cookies/会话）
  console.log('  💡 将使用你的 Chrome 用户数据启动（保留 Legiit 会话）');
  return launchChrome();
}

// ============================================================
// 本地 Sitemap 读取 + 解析
// ============================================================

function readLocalSitemap(): { url: string; lastmod: string }[] {
  if (!fs.existsSync(SITEMAP_LOCAL)) {
    console.error(`\n❌ 未找到 sitemap 文件: ${SITEMAP_LOCAL}`);
    console.error('   请先用 Chrome 访问 https://legiit.com/services.xml');
    console.error('   然后 Ctrl+S 保存到 src/data/services.xml\n');
    return [];
  }

  console.log(`\n📄 读取本地 sitemap: ${SITEMAP_LOCAL}`);
  const xml = fs.readFileSync(SITEMAP_LOCAL, 'utf-8');
  const urls: { url: string; lastmod: string }[] = [];
  const urlRegex = /<url>[\s\S]*?<\/url>/g;
  const locRegex = /<loc>([^<]+)<\/loc>/;
  const modRegex = /<lastmod>([^<]+)<\/lastmod>/;

  let match;
  while ((match = urlRegex.exec(xml)) !== null) {
    const block = match[0];
    const locMatch = block.match(locRegex);
    const modMatch = block.match(modRegex);
    if (locMatch) {
      urls.push({
        url: locMatch[1].trim(),
        lastmod: modMatch ? modMatch[1].trim() : '',
      });
    }
  }

  console.log(`  解析到 ${urls.length} 个服务 URL`);
  return urls;
}

// ============================================================
// 页面提取脚本
// ============================================================

const EXTRACT_SCRIPT = `
(function() {
  var result = { price: null, reviews: 0, rating: 0, sellerLevel: '' };
  var text = document.body ? document.body.textContent || '' : '';

  function tryPrice() {
    // Strategy A: JSON-LD
    var scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (var j = 0; j < scripts.length; j++) {
      try {
        var data = JSON.parse(scripts[j].textContent || '{}');
        if (data.offers) {
          if (data.offers.price) return parseFloat(data.offers.price);
          if (data.offers.lowPrice) return parseFloat(data.offers.lowPrice);
        }
        if (data.price) return parseFloat(data.price);
      } catch(e) {}
    }

    // Strategy B: "starting at/from $X"
    var priceKeywords = ['starting at', 'starting from', 'starts at', '从 '];
    for (var k = 0; k < priceKeywords.length; k++) {
      var idx = text.toLowerCase().indexOf(priceKeywords[k]);
      if (idx >= 0) {
        var near = text.substring(idx, idx + 50);
        var m = near.match(/\\$(\\d+(?:\\.\\d{2})?)/);
        if (m) return parseFloat(m[1]);
      }
    }

    // Strategy C: First reasonable $ amount in page
    var priceMatches = text.match(/\\$(\\d+(?:\\.\\d{2})?)/g);
    if (priceMatches) {
      var nums = priceMatches.map(function(p) { return parseFloat(p.replace('$', '')); });
      var valid = nums.filter(function(n) { return n >= 1 && n <= 10000; });
      if (valid.length > 0) {
        valid.sort(function(a, b) { return a - b; });
        return valid[0];
      }
    }
    return null;
  }

  function tryReviews() {
    var counts = [];
    var reviewMatches = text.matchAll(/(\\d{1,5})\\s*Review(?:s)?/gi);
    for (var m2 of reviewMatches) counts.push(parseInt(m2[1], 10));
    if (counts.length === 0) {
      var scripts2 = document.querySelectorAll('script[type="application/ld+json"]');
      for (var j2 = 0; j2 < scripts2.length; j2++) {
        try {
          var data2 = JSON.parse(scripts2[j2].textContent || '{}');
          if (data2.aggregateRating && data2.aggregateRating.reviewCount)
            counts.push(parseInt(data2.aggregateRating.reviewCount, 10));
        } catch(e) {}
      }
    }
    return counts.length > 0 ? Math.max.apply(null, counts) : 0;
  }

  function tryRating() {
    var ratingMatch = text.match(/(\\d\\.\\d)\\s*\\/\\s*5/);
    if (ratingMatch) return parseFloat(ratingMatch[1]);
    var scripts3 = document.querySelectorAll('script[type="application/ld+json"]');
    for (var j3 = 0; j3 < scripts3.length; j3++) {
      try {
        var data3 = JSON.parse(scripts3[j3].textContent || '{}');
        if (data3.aggregateRating && data3.aggregateRating.ratingValue)
          return parseFloat(data3.aggregateRating.ratingValue);
      } catch(e) {}
    }
    return 0;
  }

  function trySellerLevel() {
    var levelMatch = text.match(/(Level\\s+\\d+|Tier\\s+\\d+|Premier|Pro|Top\\s+Rated|New\\s+seller)/i);
    return levelMatch ? levelMatch[1] : '';
  }

  result.price = tryPrice();
  result.reviews = tryReviews();
  result.rating = tryRating();
  result.sellerLevel = trySellerLevel();
  return result;
})();
`;

// ============================================================
// 工具函数
// ============================================================

function extractSeller(url: string): string {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    return parts[0] || '';
  } catch { return ''; }
}

function cleanTitle(title: string): string {
  return title
    .replace(/^(?:I will|I'll|Get|Buy|Order)\s+/i, '')
    .replace(/\s*\|\s*Legiit.*$/i, '')
    .replace(/\s*-\s*Legiit.*$/i, '')
    .trim();
}

function inferCategory(title: string, url: string): string {
  const lowerTitle = title.toLowerCase();
  const lowerUrl = url.toLowerCase();
  const rules: [string, string[]][] = [
    ['seo', ['seo', 'backlink', 'pbn', 'guest post', 'link building', 'ranking', 'google', 'keyword', 'niche edit', 'citation', 'map pack', 'local seo', 'authority', 'dofollow', 'web 2.0', 'foundation link', 'social signal', 'press release', 'off-page', 'on-page', 'serp']],
    ['writing', ['writing', 'content', 'article', 'blog post', 'copywriting', 'press release', 'ebook', 'script', 'copy', 'text', 'resume', 'cover letter', 'proofreading', 'editing']],
    ['graphics-design', ['design', 'logo', 'graphic', 'illustration', 'banner', 'flyer', 'brochure', 'branding', 'vector', 'photoshop', 't-shirt', 'book cover', 'thumbnail', 'social media design', 'canva', 'figma', 'ui design']],
    ['video', ['video', 'animation', 'motion', 'explainer', 'editing', 'stinger', 'intro', 'youtube', 'tiktok', 'reel', 'short']],
    ['internet-marketing', ['marketing', 'social media', 'facebook', 'instagram', 'traffic', 'ppc', 'email', 'campaign', 'lead', 'conversion']],
    ['programming-technology', ['web', 'wordpress', 'website', 'development', 'programming', 'code', 'php', 'javascript', 'html', 'css', 'app', 'react', 'next', 'node', 'python', 'api', 'database', 'mobile app']],
    ['audio-services', ['voice', 'audio', 'sound', 'music', 'narration', 'podcast', 'voiceover', 'mixing', 'mastering', 'beat', 'song']],
    ['virtual-assistant', ['virtual assistant', 'va', 'admin', 'support', 'data entry', 'research', 'customer service']],
    ['ecommerce', ['ecommerce', 'shopify', 'woocommerce', 'product', 'amazon', 'etsy', 'dropshipping']],
    ['ai-marketplace', ['ai', 'chatgpt', 'gpt', 'artificial intelligence', 'machine learning', 'midjourney', 'dalle']],
  ];
  for (const [cat, keywords] of rules) {
    for (const kw of keywords) {
      if (lowerTitle.includes(kw)) return cat;
      if (lowerUrl.includes(kw.replace(/\s+/g, '-'))) return cat;
    }
  }
  return 'uncategorized';
}

// ============================================================
// 单页抓取
// ============================================================

async function scrapeOne(browser: Browser, url: string, lastmod: string): Promise<LegiitService | null> {
  let page: Page | null = null;
  try {
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36');

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const t = req.resourceType();
      if (t === 'image' || t === 'font' || t === 'media' || t === 'stylesheet') req.abort();
      else req.continue();
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise((r) => setTimeout(r, 4000));

    const extracted = await page.evaluate(EXTRACT_SCRIPT);
    const title = await page.title();
    const seller = extractSeller(url);

    return {
      id: Buffer.from(url).toString('base64').slice(0, 24).replace(/[+/=]/g, ''),
      title: cleanTitle(title),
      seller,
      category: inferCategory(title, url),
      url,
      price: extracted.price,
      reviews: extracted.reviews,
      rating: extracted.rating,
      sellerLevel: extracted.sellerLevel,
      lastmod,
      scrapedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

// ============================================================
// 批量抓取入口
// ============================================================

export async function scrapeAll(
  onProgress?: (msg: string) => void,
  maxPages?: number,
  concurrency: number = 5
): Promise<LegiitService[]> {
  const startTime = Date.now();
  const log = (msg: string) => { console.log(msg); onProgress?.(msg); };

  // [1] 读取本地 sitemap
  log('\n📄 [1/4] 读取本地 sitemap...');
  const allUrls = readLocalSitemap();
  if (allUrls.length === 0) return [];

  const urlsToScrape = maxPages ? allUrls.slice(0, maxPages) : allUrls;
  const total = urlsToScrape.length;
  log(`  本次将抓取 ${total} 个`);

  // [2] 连接浏览器
  log('\n🌐 [2/4] 连接浏览器...');
  const browser = await getBrowser();
  // 提示用户在 Chrome 中访问 Legiit 完成验证
  if (browser.process() !== null) {
    log('  =====================================================');
    log('  🔴 请在【新打开的 Chrome 窗口】中操作:');
    log('     1. 在地址栏输入 legiit.com 并回车');
    log('     2. 如果出现 Cloudflare 验证，手动点击通过');
    log('     3. 看到 Legiit 首页后，即可回到这里');
    log('  =====================================================');
    log('  ⏳ 等待 30 秒让你完成验证...');
    await new Promise((r) => setTimeout(r, 30000));
  }

  // [3] 开始抓取
  log('\n🚀 [3/4] 开始抓取...');
  const services: LegiitService[] = [];
  let completed = 0;
  let failed = 0;
  const queue = [...urlsToScrape];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift()!;
      const result = await scrapeOne(browser, item.url, item.lastmod);
      completed++;
      if (result) services.push(result);
      else failed++;
      if (completed % 5 === 0 || completed === total) {
        const pct = ((completed / total) * 100).toFixed(1);
        const rate = (completed / ((Date.now() - startTime) / 1000)).toFixed(1);
        log(`  进度: ${completed}/${total} (${pct}%) | 成功: ${services.length} | 失败: ${failed} | ${rate}页/秒`);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  // [4] 清理
  if (browser.process() !== null) await browser.close().catch(() => {});
  else log('\n  🔗 保持 Chrome 连接');

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`\n✅ 完成! 成功: ${services.length}, 失败: ${failed}, 耗时: ${elapsed}s`);
  return services;
}

// ============================================================
// 命令行入口
// ============================================================

async function main() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║     Legiit 数据抓取工具                   ║');
  console.log('║     分步方案: 本地 sitemap + 浏览器抓取  ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  console.log('【第一步】获取 sitemap:');
  console.log('  用 Chrome 访问 https://legiit.com/services.xml');
  console.log('  按 Ctrl+S 保存到: src/data/services.xml\n');

  // 检查 sitemap 是否存在
  if (!fs.existsSync(SITEMAP_LOCAL)) {
    console.log('⚠️  尚未保存 sitemap，请按上面的指示操作');
    console.log('   保存完成后重新运行此脚本\n');

    // 尝试创建 data 目录
    const dir = path.dirname(SITEMAP_LOCAL);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    console.log('📁 data 目录已创建，请保存文件到:');
    console.log('   ' + SITEMAP_LOCAL);
    return;
  }

  // 解析参数
  const maxPages = process.argv.includes('--limit')
    ? parseInt(process.argv[process.argv.indexOf('--limit') + 1], 10)
    : undefined;
  const concurrency = process.argv.includes('--concurrency')
    ? parseInt(process.argv[process.argv.indexOf('--concurrency') + 1], 10)
    : 5;

  if (maxPages) console.log(`\n🔧 测试模式: 仅抓取 ${maxPages} 页`);
  console.log(`并发数: ${concurrency}`);
  if (!maxPages) console.log('\n💡 先用 --limit 5 测试，确认没问题再跑完整抓取\n');

  const services = await scrapeAll(undefined, maxPages, concurrency);

  // 保存结果
  const outputPath = path.resolve(process.cwd(), 'src/data/legiit-services.json');
  const jsonData = JSON.stringify(
    { scrapedAt: new Date().toISOString(), total: services.length, services },
    null,
    2
  );
  fs.writeFileSync(outputPath, jsonData, 'utf-8');
  console.log(`\n💾 数据已保存: ${outputPath}`);
  console.log(`   文件大小: ${(Buffer.byteLength(jsonData, 'utf-8') / 1024 / 1024).toFixed(2)} MB`);

  if (services.length === 0) return;

  // 统计
  const counts: Record<string, number> = {};
  services.forEach(s => { counts[s.category] = (counts[s.category] || 0) + 1; });

  console.log('\n📊 分类分布:');
  Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 10)
    .forEach(([cat, n]) => console.log(`    ${cat}: ${n}`));

  const withPrice = services.filter(s => s.price !== null);
  if (withPrice.length > 0) {
    const prices = withPrice.map(s => s.price!);
    console.log(`\n💰 价格: 平均 $${(prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)}`);
  }

  console.log('\n🏆 Top 10 评论最多:');
  [...services].sort((a, b) => b.reviews - a.reviews).slice(0, 10)
    .forEach((s, i) => {
      const p = s.price !== null ? `$${s.price}` : 'N/A';
      console.log(`  ${i + 1}. ${s.title.slice(0, 45).padEnd(45)} ${String(s.reviews).padStart(4)}评论 ${p.padStart(8)}`);
    });
}

if (require.main === module) main();
