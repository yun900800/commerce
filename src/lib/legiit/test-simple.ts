import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  console.log('Starting browser...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0'
  );

  const url =
    'https://legiit.com/SuperstarSEO/125-google-map-citations-for-local-seo-domination';
  console.log('Navigating to:', url);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  console.log('Page loaded, waiting for React...');
  await new Promise((r) => setTimeout(r, 4000));

  const title = await page.title();
  console.log('Title:', title);

  const text = await page.evaluate(() => document.body?.textContent || '');
  console.log('Body length:', text.length);
  console.log('First 300 chars:', text.substring(0, 300));

  // Try to find price
  const priceIdx = text.indexOf('$');
  if (priceIdx >= 0) {
    console.log('Found $ at position', priceIdx, ':', text.substring(priceIdx, priceIdx + 20));
  }

  // Count reviews
  const reviewPattern = /(\d+)\s*Reviews?/gi;
  let m;
  const reviews = [];
  while ((m = reviewPattern.exec(text)) !== null) {
    reviews.push(parseInt(m[1], 10));
  }
  console.log('Review counts found:', reviews);

  // Look for rating pattern
  const ratingMatch = text.match(/(\d\.\d)\s*\/\s*5/);
  console.log('Rating:', ratingMatch ? ratingMatch[1] : 'not found');

  await browser.close();
  console.log('Test complete!');
}

main().catch((e) => {
  console.error('FAILED:', e);
  process.exit(1);
});
