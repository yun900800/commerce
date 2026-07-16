import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  console.log('Starting browser with stealth...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-gpu',
      '--window-size=1280,800',
    ],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36'
  );

  // Set extra headers to look more like a real browser
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
  });

  const url =
    'https://legiit.com/SuperstarSEO/125-google-map-citations-for-local-seo-domination';
  console.log('Navigating to:', url);

  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  console.log('Page loaded, waiting for React render...');
  await new Promise((r) => setTimeout(r, 5000));

  const title = await page.title();
  console.log('Title:', title);

  // Check if we bypassed Cloudflare
  const pageContent = await page.content();
  const isCloudflare = pageContent.includes('challenge') || pageContent.includes('Cloudflare');
  console.log('Cloudflare blocked:', isCloudflare);

  if (!isCloudflare) {
    const text = await page.evaluate(() => document.body?.textContent || '');
    console.log('Body length:', text.length);

    // Try to find price
    const priceMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
    console.log('Price:', priceMatch ? '$' + priceMatch[1] : 'not found');

    // Count reviews
    const reviewPattern = /(\d+)\s*Reviews?/gi;
    let m;
    const reviews = [];
    while ((m = reviewPattern.exec(text)) !== null) {
      reviews.push(parseInt(m[1], 10));
    }
    console.log('Review counts:', reviews);

    // Rating
    const ratingMatch = text.match(/(\d\.\d)\s*\/\s*5/);
    console.log('Rating:', ratingMatch ? ratingMatch[1] : 'not found');
  } else {
    console.log('Still blocked by Cloudflare. First 500 chars:', pageContent.substring(0, 500));
  }

  await browser.close();
  console.log('Test complete!');
}

main().catch((e) => {
  console.error('FAILED:', e);
  process.exit(1);
});
