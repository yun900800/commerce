/**
 * 測試直接調用 Legiit API 獲取服務詳情
 */
const CF = 'cf_clearance=66koPw.QhsHDVIObrsBo3KWzjEXn2Q9LFS1uM58N8u0-1783824337-1.2.1.1-aXNpkljxA_TgX5.BC5745EF4E6q9CPPRnA4.nn8lATbsTmQv_ELlQLf_f2It96E4VNO9b_HrJlG.wPjbeMDCPRIG2bB3VvUm7S6Nink5OSp6OKpkANPgX1Fgym56EBHm4gMPGpfDzUSAVY1LfdRAaMycS3aDEDn8I1bzIXq.N9t0HP3aLasq80MrK2b8yL_0Z8FuIeVTOEAfo0y1l1gPCKf6UvvaxGFAYF_HjmlkS9NsSlyof3ivIzCXm9HXFSXjOtFlGCc68ktwvJ5aXWhiU0j7ci7W_p7gFBcwzeYTb2A.iHT339Xl5O6MprDmbuS90xhcje9XbWXjqD8Kg3a1HxtG3pgXnT3sKRMQ2xbzZt1WX.nPYWf9zaVMdkZpEkWjTpzhNE1lpwyY_ZSOG40J1Q8H4ilydGIfhax.XS6phpc.F4ABf2B8oGIM2vPE3CxoWKi3V85WPVVyDWnFlmCdA0Pd.NE5EP8GyOP3XKm_F56NnpF4TxIXGBVIdF64.5AT';
const PHPSESSID = 'PHPSESSID=n2lr5vtsbsbt6jsq1hkug5oa78';
const XSRF_TOKEN_COOKIE = 'XSRF-TOKEN=eyJpdiI6IjZEUnNKYkcvczROYnNDY3hqTkVab1E9PSIsInZhbHVlIjoiTWlyUkN2bWgrUjZ1SFBGa1NrbSsxRjJsZ3JDenNydzVwVGpXbk1yWXIyWWJHQzBDcUNxaUFCUGkxcXVKcTcxL1V0czNKT2NlbzB0ZVNESGh4M1JmcVhLWC9SMlE0d01sbHhBWXlDV28wMDJtUzN1OEJHbm5yQVpCL28xQXUzQUEiLCJtYWMiOiJhYWVmMjEwN2RiMDlmNjQ4MmJlYzk5ZjFlNDA1OWU3ODliNzZlNzJhODUxM2Y0ZDE5OGU0M2I1NDZhZTllM2FiIiwidGFnIjoiIn0%3D';
const XSRF_HEADER = 'eyJpdiI6IjZEUnNKYkcvczROYnNDY3hqTkVab1E9PSIsInZhbHVlIjoiTWlyUkN2bWgrUjZ1SFBGa1NrbSsxRjJsZ3JDenNydzVwVGpXbk1yWXIyWWJHQzBDcUNxaUFCUGkxcXVKcTcxL1V0czNKT2NlbzB0ZVNESGh4M1JmcVhLWC9SMlE0d01sbHhBWXlDV28wMDJtUzN1OEJHbm5yQVpCL28xQXUzQUEiLCJtYWMiOiJhYWVmMjEwN2RiMDlmNjQ4MmJlYzk5ZjFlNDA1OWU3ODliNzZlNzJhODUxM2Y0ZDE5OGU0M2I1NDZhZTllM2FiIiwidGFnIjoiIn0=';

async function main() {
  const apiUrl = 'https://legiit.com/api/frontend/service/get-service-detail';

  console.log('Calling API:', apiUrl);
  console.log('');

  const resp = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': [CF, PHPSESSID, XSRF_TOKEN_COOKIE].join('; '),
      'x-xsrf-token': XSRF_HEADER,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Origin': 'https://legiit.com',
      'Referer': 'https://legiit.com/',
    },
    body: JSON.stringify({
      seo_url: '125-google-map-citations-for-local-seo-domination',
      username: 'SuperstarSEO'
    })
  });

  console.log('Status:', resp.status, resp.statusText);

  if (resp.ok) {
    const data = await resp.json();
    console.log('\n✅ API 調用成功!');
    console.log('Title:', data.data.title);
    console.log('Rating:', data.data.service_rating);
    console.log('Total Reviews:', data.data.total_review_count);
    console.log('Seller:', data.data.user.username, `(${data.data.user.seller_level})`);
    console.log('Price (Basic):', '$' + data.data.basic_plans.price);
    console.log('Price (Standard):', '$' + data.data.standard_plans.price);
    console.log('Price (Premium):', '$' + data.data.premium_plans.price);
    console.log('Category:', data.data.category.category_name, '>', data.data.subcategory.subcategory_name);
    console.log('\n✅ 這就夠了! 我們可以直接調用 API 抓取全部 20,731 個服務!');
  } else {
    const text = await resp.text();
    console.log('Response:', text.substring(0, 500));
  }
}

main().catch(e => console.error('ERROR:', e));
