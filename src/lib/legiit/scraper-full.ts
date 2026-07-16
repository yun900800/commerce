/**
 * Legiit 完整抓取运行脚本
 * 抓取全部 ~20000+ 个服务
 * 运行: npx tsx src/lib/legiit/scraper-full.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { scrapeAll } from './scraper';

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  Legiit 完整数据抓取 (全部 ~20000+)  ║');
  console.log('╚══════════════════════════════════════╝\n');

  const startTime = Date.now();

  // 并发数 - 调高可加快速度，但注意不要被 Ban
  const CONCURRENCY = 8;

  console.log(`并发数: ${CONCURRENCY}`);
  console.log('开始时间:', new Date().toLocaleString(), '\n');

  const services = await scrapeAll(undefined, undefined, CONCURRENCY);

  const elapsedSec = (Date.now() - startTime) / 1000;

  // 保存完整数据
  const outputPath = path.resolve(process.cwd(), 'src/data/legiit-services.json');
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const jsonData = JSON.stringify(
    {
      scrapedAt: new Date().toISOString(),
      total: services.length,
      elapsedSeconds: elapsedSec,
      services,
    },
    null,
    2
  );
  fs.writeFileSync(outputPath, jsonData, 'utf-8');

  console.log('\n═══════════════════════════════════════');
  console.log('📊 抓取报告');
  console.log('═══════════════════════════════════════');
  console.log(`  成功抓取: ${services.length}`);
  console.log(`  总耗时: ${elapsedSec.toFixed(1)} 秒 (${(elapsedSec / 60).toFixed(1)} 分钟)`);
  console.log(`  速度: ${(services.length / (elapsedSec / 60)).toFixed(0)} 个/分钟`);
  console.log(`  数据文件: ${outputPath}`);
  console.log(`  文件大小: ${(Buffer.byteLength(jsonData, 'utf-8') / 1024 / 1024).toFixed(2)} MB`);

  // 分类统计
  const counts: Record<string, number> = {};
  services.forEach((s) => {
    counts[s.category] = (counts[s.category] || 0) + 1;
  });

  console.log('\n📂 分类分布:');
  Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .forEach(([cat, n]) => {
      const pct = ((n / services.length) * 100).toFixed(1);
      console.log(`   ${cat.padEnd(25)} ${String(n).padStart(5)} (${pct}%)`);
    });

  // 价格统计
  const withPrice = services.filter((s) => s.price !== null);
  if (withPrice.length > 0) {
    const prices = withPrice.map((s) => s.price!);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const sorted = [...prices].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    console.log('\n💰 价格统计:');
    console.log(`   平均价: $${avg.toFixed(2)}`);
    console.log(`   中位数: $${median.toFixed(2)}`);
    console.log(`   最低价: $${min.toFixed(2)}`);
    console.log(`   最高价: $${max.toFixed(2)}`);
  }

  // 评论统计
  const withReviews = services.filter((s) => s.reviews > 0);
  console.log(`\n⭐ 评论统计:`);
  console.log(`   有评论的服务: ${withReviews.length}`);
  const top10 = [...services].sort((a, b) => b.reviews - a.reviews).slice(0, 10);
  console.log(`   Top 10 最高评论:`);
  top10.forEach((s, i) => {
    console.log(`    ${i + 1}. ${s.title.slice(0, 50)} - ${s.reviews} 评论 - $${s.price ?? 'N/A'}`);
  });

  console.log('\n✅ 完成!');
}

main().catch((err) => {
  console.error('❌ 出错:', err);
  process.exit(1);
});
