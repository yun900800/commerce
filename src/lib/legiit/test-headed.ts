/**
 * 测试：用可见模式打开 Legiit 页面
 * 这样可以确认是 headless 被检测到，还是 IP 被限制
 */
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  console.log('Starting browser in VISIBLE mode...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false, // 可见模式
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,800',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36'
  );

  const url =
    'https://legiit.com/SuperstarSEO/125-google-map-citations-for-local-seo-domination';
  console.log('Navigating to:', url);

  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 });
    console.log('Page loaded!');

    await new Promise((r) => setTimeout(r, 5000));

    const title = await page.title();
    console.log('Title:', title);

    const isCF = await page.evaluate(() =>
      document.body?.innerHTML?.includes('challenge') ? true : false
    );
    console.log('Cloudflare blocked:', isCF);

    if (!isCF) {
      const text = await page.evaluate(() => document.body?.textContent || '');
      console.log('Body length:', text.length);
      const priceMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
      console.log('Price:', priceMatch ? '$' + priceMatch[1] : 'not found');

      // Screenshot for verification
      await page.screenshot({ path: 'C:\\Users\\86135\\AppData\\Local\\Temp\\opencode\\legiit-page.png' });
      console.log('Screenshot saved!');
    }
  } catch (e) {
    console.error('Navigation error:', e.message);
  }

  // 等待 30 秒手动观察
  console.log('Waiting 30s for manual inspection...');
  await new Promise((r) => setTimeout(r, 30000));

  await browser.close();
  console.log('Done!');
}

main().catch((e) => {
  console.error('FAILED:', e);
  process.exit(1);
});
