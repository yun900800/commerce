/**
 * 用 cf_clearance cookie 測試直接請求 Legiit
 * 運行: node src/lib/legiit/test-cookie.js
 */

const CF_COOKIE = 'cf_clearance=66koPw.QhsHDVIObrsBo3KWzjEXn2Q9LFS1uM58N8u0-1783824337-1.2.1.1-aXNpkljxA_TgX5.BC5745EF4E6q9CPPRnA4.nn8lATbsTmQv_ELlQLf_f2It96E4VNO9b_HrJlG.wPjbeMDCPRIG2bB3VvUm7S6Nink5OSp6OKpkANPgX1Fgym56EBHm4gMPGpfDzUSAVY1LfdRAaMycS3aDEDn8I1bzIXq.N9t0HP3aLasq80MrK2b8yL_0Z8FuIeVTOEAfo0y1l1gPCKf6UvvaxGFAYF_HjmlkS9NsSlyof3ivIzCXm9HXFSXjOtFlGCc68ktwvJ5aXWhiU0j7ci7W_p7gFBcwzeYTb2A.iHT339Xl5O6MprDmbuS90xhcje9XbWXjqD8Kg3a1HxtG3pgXnT3sKRMQ2xbzZt1WX.nPYWf9zaVMdkZpEkWjTpzhNE1lpwyY_ZSOG40J1Q8H4ilydGIfhax.XS6phpc.F4ABf2B8oGIM2vPE3CxoWKi3V85WPVVyDWnFlmCdA0Pd.NE5EP8GyOP3XKm_F56NnpF4TxIXGBVIdF64.5AT';
const SESSION_COOKIE = 'PHPSESSID=n2lr5vtsbsbt6jsq1hkug5oa78';
const XSRF_TOKEN = 'XSRF-TOKEN=eyJpdiI6InNlM3RRQms0Uy9UM0RtLzJ4OHczakE9PSIsInZhbHVlIjoiZTYrN253Qm9UWWNHbWtxblN1WXkvUlNObmErOW00NlVmOUVrbHFTUkQzbjBYajFDazYxTUU5VEtRS2ZkVXNWY3hZdlgvV3BWYWYxVkhwV3dldzNKSUVsalJ5SHhpUXdnLzNlZXlWUDZZN21QRnlXRVBzSzlDT2Y2d3RldDZIcUEiLCJtYWMiOiJjNzEyZGFjMTU1NTE3ZjZkZmQwYjFmYzFmODc1ZWZjOTMwMDkxZmQ0MmI5YjVlMGY5ZGJkMThmYWZiM2MzYjc0IiwidGFnIjoiIn0%3D';

async function main() {
  const url = 'https://legiit.com/SuperstarSEO/125-google-map-citations-for-local-seo-domination';
  
  console.log('Testing direct HTTP request with cf_clearance cookie...\n');
  
  const resp = await fetch(url, {
    headers: {
      'Cookie': [CF_COOKIE, SESSION_COOKIE, XSRF_TOKEN].join('; '),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    }
  });

  console.log('Status:', resp.status, resp.statusText);
  console.log('Headers:', JSON.stringify([...resp.headers.entries()].slice(0, 10)));
  
  const text = await resp.text();
  console.log('Body length:', text.length);
  
  const title = text.match(/<title>([^<]+)<\/title>/)?.[1] || 'N/A';
  console.log('Title:', title);
  
  const isBlocked = text.includes('challenge') || text.includes('cf-browser') || text.includes('Just a moment');
  console.log('Cloudflare blocked:', isBlocked);
  
  if (!isBlocked) {
    // Look for JSON-LD structured data (most reliable)
    const jsonldMatches = text.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
    for (const match of jsonldMatches) {
      try {
        const data = JSON.parse(match[1]);
        console.log('\nJSON-LD found:', JSON.stringify(data, null, 2).substring(0, 500));
      } catch(e) {}
    }
    
    // Find prices
    const priceRegex = /\$(\d+(?:\.\d{2})?)/g;
    const prices = [];
    let m;
    while ((m = priceRegex.exec(text)) !== null) {
      prices.push(parseFloat(m[1]));
    }
    console.log('\nPrices found:', prices.filter(p => p >= 1 && p <= 10000).slice(0, 10));
    
    // Find review counts
    const reviewRegex = /(\d{1,5})\s*Reviews?/gi;
    const reviews = [];
    while ((m = reviewRegex.exec(text)) !== null) {
      reviews.push(parseInt(m[1], 10));
    }
    console.log('Review counts:', reviews);
    
    // Show a snippet around the word "price"
    const priceIdx = text.toLowerCase().indexOf('starting');
    if (priceIdx >= 0) {
      console.log('\nSnippet around "starting":', text.substring(priceIdx, priceIdx + 120));
    } else {
      const pIdx = text.toLowerCase().indexOf('price');
      if (pIdx >= 0) console.log('Snippet around "price":', text.substring(pIdx, pIdx + 120));
    }
    
    // Check for meta description
    const desc = text.match(/<meta name="description" content="([^"]+)"/);
    if (desc) console.log('\nMeta description:', desc[1].substring(0, 200));
  } else {
    console.log('Body preview:', text.substring(0, 300));
  }
}

main().catch(e => console.error('ERROR:', e));
