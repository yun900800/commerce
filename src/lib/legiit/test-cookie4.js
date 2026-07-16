/**
 * 用完整 cookies 測試 - 包含 cf_clearance + PHPSESSID
 */
const CF = 'cf_clearance=66koPw.QhsHDVIObrsBo3KWzjEXn2Q9LFS1uM58N8u0-1783824337-1.2.1.1-aXNpkljxA_TgX5.BC5745EF4E6q9CPPRnA4.nn8lATbsTmQv_ELlQLf_f2It96E4VNO9b_HrJlG.wPjbeMDCPRIG2bB3VvUm7S6Nink5OSp6OKpkANPgX1Fgym56EBHm4gMPGpfDzUSAVY1LfdRAaMycS3aDEDn8I1bzIXq.N9t0HP3aLasq80MrK2b8yL_0Z8FuIeVTOEAfo0y1l1gPCKf6UvvaxGFAYF_HjmlkS9NsSlyof3ivIzCXm9HXFSXjOtFlGCc68ktwvJ5aXWhiU0j7ci7W_p7gFBcwzeYTb2A.iHT339Xl5O6MprDmbuS90xhcje9XbWXjqD8Kg3a1HxtG3pgXnT3sKRMQ2xbzZt1WX.nPYWf9zaVMdkZpEkWjTpzhNE1lpwyY_ZSOG40J1Q8H4ilydGIfhax.XS6phpc.F4ABf2B8oGIM2vPE3CxoWKi3V85WPVVyDWnFlmCdA0Pd.NE5EP8GyOP3XKm_F56NnpF4TxIXGBVIdF64.5AT';
const PHPSESSID = 'PHPSESSID=n2lr5vtsbsbt6jsq1hkug5oa78';

async function main() {
  const url = 'https://legiit.com/SuperstarSEO/125-google-map-citations-for-local-seo-domination';
  
  const resp = await fetch(url, {
    headers: {
      'Cookie': CF + '; ' + PHPSESSID,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    }
  });
  
  console.log('Status:', resp.status);
  const text = await resp.text();
  const title = text.match(/<title>([^<]+)<\/title>/)?.[1] || 'N/A';
  console.log('Title:', title);
  console.log('Body length:', text.length);
  
  const isChallenge = text.includes('Managed Challenge') || text.includes('Just a moment');
  console.log('Cloudflare challenge:', isChallenge);
  
  if (!isChallenge) {
    // Save for inspection
    const fs = require('fs');
    fs.writeFileSync('C:\\Users\\86135\\AppData\\Local\\Temp\\opencode\\page-success.html', text);
    console.log('Saved page-success.html');
    
    // Extract useful data
    console.log('\n--- Price patterns ---');
    const prices = text.match(/\$(\d+(?:\.\d{2})?)/g);
    if (prices) console.log(prices.filter(p => parseFloat(p.replace('$','')) >= 1 && parseFloat(p.replace('$','')) <= 10000).slice(0,5));
    
    console.log('\n--- React data ---');
    const initState = text.match(/window\.__[^;]+/g);
    if (initState) initState.forEach(s => console.log(s.substring(0, 200)));
    
    console.log('\n--- JSON-LD ---');
    const jld = text.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g);
    if (jld) jld.forEach(j => console.log(j.substring(0, 300)));
    
    console.log('\n--- API endpoints ---');
    const apis = text.match(/["'](https?:\/\/[^"']*(?:api|graphql)[^"']*)["']/g);
    if (apis) [...new Set(apis)].slice(0,10).forEach(a => console.log(a));
  }
}

main().catch(e => console.error('ERROR:', e));
