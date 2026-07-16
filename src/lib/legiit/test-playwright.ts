/**
 * 用 Playwright + 系统 Chrome 测试 Legiit 抓取
 * 使用 channel: 'chrome' 自动使用系统已安装的 Chrome
 */
import { chromium } from 'playwright';

async function main() {
  console.log('Starting Playwright with system Chrome (channel: chrome)...');
  const browser = await chromium.launch({
    channel: 'chrome', // 使用系统已安装的 Chrome
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
  });

  const page = await context.newPage();

  const url =
    'https://legiit.com/SuperstarSEO/125-google-map-citations-for-local-seo-domination';
  console.log('Navigating to:', url);

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Page loaded!');
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log('Title:', title);

    const html = await page.content();
    const isCloudflare =
      html.includes('challenge') || html.includes('cloudflare');
    console.log('Cloudflare blocked:', isCloudflare);

    if (!isCloudflare) {
      const text = await page.evaluate(() => document.body?.textContent || '');
      console.log('Body length:', text.length);

      const priceMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
      console.log('Price:', priceMatch ? '$' + priceMatch[1] : 'not found');

      const reviewRegex = /(\d+)\s*Reviews?/gi;
      const reviews = [];
      let m;
      while ((m = reviewRegex.exec(text)) !== null) {
        reviews.push(parseInt(m[1], 10));
      }
      console.log('Review counts:', reviews);

      const ratingMatch = text.match(/(\d\.\d)\s*\/\s*5/);
      console.log('Rating:', ratingMatch ? ratingMatch[1] : 'not found');

      await page.screenshot({
        path: 'C:\\Users\\86135\\AppData\\Local\\Temp\\opencode\\legiit-pw.png',
        fullPage: true,
      });
      console.log('Screenshot saved');
    } else {
      console.log('Blocked! First 300 chars:', html.substring(0, 300));
    }
  } catch (e: any) {
    console.error('Error:', e.message);
  }

  await browser.close();
  console.log('Done!');
}

main().catch((e) => {
  console.error('FAILED:', e);
  process.exit(1);
});
