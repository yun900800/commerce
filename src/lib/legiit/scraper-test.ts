/**
 * Legiit 抓取测试脚本
 * 只抓取少量页面验证 Puppeteer 是否正常工作
 */

import * as fs from 'fs';
import * as path from 'path';
import { scrapeAll } from './scraper';

async function testScrape() {
  console.log('=== Legiit 抓取测试 ===');
  console.log('只抓取 5 个页面用于验证...\n');

  try {
    const result = await scrapeAll(
      (status: any) => {
        if (typeof status === 'object' && status.status === 'running') {
          process.stdout.write(
            `\r进度: ${status.scrapedCount}/${status.totalUrls} (${status.progressPercent.toFixed(1)}%)`
          );
        }
      },
      5,  // 只抓取 5 个页面
      2   // 2 个并发
    );

    console.log('\n\n=== 测试结果 ===');
    console.log(`成功抓取: ${result.scrapedCount} 个`);
    console.log(`失败: ${result.errors} 个`);
    console.log(`耗时: ${(result.elapsedMs / 1000).toFixed(1)}s`);

    if (result.services.length > 0) {
      console.log('\n前 3 个服务示例:');
      result.services.slice(0, 3).forEach((s, i) => {
        console.log(`\n  [${i + 1}] ${s.title}`);
        console.log(`      卖家: ${s.seller}`);
        console.log(`      价格: $${s.price ?? 'N/A'}`);
        console.log(`      评论: ${s.reviews}`);
        console.log(`      评分: ${s.rating}`);
        console.log(`      分类: ${s.category}`);
        console.log(`      URL: ${s.url}`);
      });

      // 保存测试数据
      const testOutputPath = path.resolve(__dirname, '../../data/legiit-services-test.json');
      const dir = path.dirname(testOutputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        testOutputPath,
        JSON.stringify({
          scrapedAt: new Date().toISOString(),
          total: result.scrapedCount,
          services: result.services,
        }, null, 2),
        'utf-8'
      );
      console.log(`\n测试数据已保存: ${testOutputPath}`);
    }

    return result;
  } catch (err) {
    console.error('测试失败:', err);
    process.exit(1);
  }
}

testScrape();
