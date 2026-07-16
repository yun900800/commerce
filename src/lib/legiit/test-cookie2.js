/**
 * 分析 Legiit 頁面中的內嵌數據和 API 端點
 */
const CF_COOKIE = 'cf_clearance=66koPw.QhsHDVIObrsBo3KWzjEXn2Q9LFS1uM58N8u0-1783824337-1.2.1.1-aXNpkljxA_TgX5.BC5745EF4E6q9CPPRnA4.nn8lATbsTmQv_ELlQLf_f2It96E4VNO9b_HrJlG.wPjbeMDCPRIG2bB3VvUm7S6Nink5OSp6OKpkANPgX1Fgym56EBHm4gMPGpfDzUSAVY1LfdRAaMycS3aDEDn8I1bzIXq.N9t0HP3aLasq80MrK2b8yL_0Z8FuIeVTOEAfo0y1l1gPCKf6UvvaxGFAYF_HjmlkS9NsSlyof3ivIzCXm9HXFSXjOtFlGCc68ktwvJ5aXWhiU0j7ci7W_p7gFBcwzeYTb2A.iHT339Xl5O6MprDmbuS90xhcje9XbWXjqD8Kg3a1HxtG3pgXnT3sKRMQ2xbzZt1WX.nPYWf9zaVMdkZpEkWjTpzhNE1lpwyY_ZSOG40J1Q8H4ilydGIfhax.XS6phpc.F4ABf2B8oGIM2vPE3CxoWKi3V85WPVVyDWnFlmCdA0Pd.NE5EP8GyOP3XKm_F56NnpF4TxIXGBVIdF64.5AT';

async function main() {
  const url = 'https://legiit.com/SuperstarSEO/125-google-map-citations-for-local-seo-domination';
  
  const resp = await fetch(url, {
    headers: {
      'Cookie': CF_COOKIE,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36',
    }
  });
  
  const text = await resp.text();
  
  // 1. Look for __INITIAL_STATE__ or __NEXT_DATA__ or similar
  const patterns = [
    '__INITIAL_STATE__', '__NEXT_DATA__', '__NUXT__', '__REACT_QUERY_STATE__',
    'window.__', 'window.initial', 'window.__INITIAL',
    '"@context"', '"aggregateRating"', '"offers"',
    'application/json', 'application/ld+json',
    'price":', 'reviewCount', 'ratingValue',
    'api.legiit', '/api/', '/graphql',
  ];
  
  console.log('=== Searching for embedded data patterns ===\n');
  for (const pattern of patterns) {
    const idx = text.indexOf(pattern);
    if (idx >= 0) {
      console.log(`Found "${pattern}" at position ${idx}`);
      console.log('  Context:', text.substring(idx, idx + 200).replace(/\n/g, ' ').trim());
      console.log('');
    }
  }
  
  // 2. Look for all JSON-LD blocks
  console.log('\n=== JSON-LD blocks ===');
  const jsonldRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let match;
  while ((match = jsonldRegex.exec(text)) !== null) {
    try {
      console.log(JSON.stringify(JSON.parse(match[1]), null, 2).substring(0, 500));
      console.log('---');
    } catch(e) {}
  }
  
  // 3. Search for price in JS variables
  console.log('\n=== Price-related JS variables ===');
  const priceVars = text.match(/price\s*=\s*['"][^'"]+['"]|price:\s*['"][^'"]+['"]|\$\d+(?:\.\d{2})?/g);
  if (priceVars) {
    priceVars.forEach(v => console.log(' ', v));
  }
  
  // 4. Look for API endpoints
  console.log('\n=== API endpoints ===');
  const apiMatches = text.match(/\/api\/[a-zA-Z0-9_\/-]+|legiit\.com\/api\/[a-zA-Z0-9_\/.-]+|['"](https?:\/\/[^'"]*api[^'"]*)['"]/g);
  if (apiMatches) {
    [...new Set(apiMatches)].slice(0, 20).forEach(v => console.log(' ', v.replace(/['"]/g, '')));
  }
  
  // 5. Find the meta tags / OG tags
  console.log('\n=== OG / Meta tags ===');
  const ogTags = text.match(/<meta[^>]+>/g);
  if (ogTags) {
    ogTags.filter(t => t.includes('og:') || t.includes('description') || t.includes('price') || t.includes('price'))
      .forEach(t => console.log(' ', t));
  }
}

main().catch(e => console.error('ERROR:', e));
