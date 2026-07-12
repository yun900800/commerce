/**
 * 從本地 sitemap XML 提取 URL 列表，生成緊湊 JSON
 */
const fs = require('fs');
const path = require('path');

const sitemapPath = path.resolve(__dirname, '../../data/services.xml');
const outputPath = path.resolve(__dirname, '../../data/service-urls.json');

console.log(`📖 讀取: ${sitemapPath}`);

const xml = fs.readFileSync(sitemapPath, 'utf-8');

// 正則提取所有 <loc>URL</loc>
const locRegex = /<loc>(https:\/\/legiit\.com\/[^<]+)<\/loc>/g;
const urls = [];
let match;

while ((match = locRegex.exec(xml)) !== null) {
  urls.push(match[1]);
}

console.log(`✅ 提取到 ${urls.length} 個 URL`);

// 解析為 {username, seo_url} 格式
const services = urls.map(url => {
  const pathPart = url.replace('https://legiit.com/', '').replace(/\/$/, '');
  const parts = pathPart.split('/');
  return {
    u: decodeURIComponent(parts[0]),
    s: decodeURIComponent(parts[1]),
  };
});

// 保存為 JSON（無縮進以減小體積）
const json = JSON.stringify(services);
fs.writeFileSync(outputPath, json, 'utf-8');

console.log(`💾 已保存: ${outputPath}`);
console.log(`📦 大小: ${(json.length / 1024 / 1024).toFixed(2)} MB`);
console.log(`📊 總數: ${services.length} 個服務`);
console.log(`\n前 3 條示例:`);
services.slice(0, 3).forEach(s => console.log(`  ${s.u}/${s.s}`));
