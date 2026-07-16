/**
 * 查看頁面實際內容
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
  
  console.log('=== First 2000 chars ===');
  console.log(text.substring(0, 2000));
  console.log('\n\n=== Last 500 chars of body ===');
  
  // Find body tag
  const bodyStart = text.indexOf('<body');
  const bodyEnd = text.lastIndexOf('</body>');
  if (bodyStart >= 0 && bodyEnd >= 0) {
    console.log(text.substring(bodyEnd - 500, bodyEnd + 50));
  }
  
  // Count script tags
  const scriptTags = text.match(/<script/g);
  console.log('\n\nScript tags count:', scriptTags ? scriptTags.length : 0);
  
  // Check for React
  console.log('Has react:', text.includes('react') || text.includes('React'));
  console.log('Has #root or #app:', text.includes('id="root"') || text.includes('id="app"'));
  
  // Save for inspection
  const fs = require('fs');
  fs.writeFileSync('C:\\Users\\86135\\AppData\\Local\\Temp\\opencode\\page.html', text);
  console.log('\nFull HTML saved to temp dir for inspection');
}

main().catch(e => console.error('ERROR:', e));
