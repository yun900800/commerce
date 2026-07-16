/**
 * URL 列表本地服務器
 * 
 * 使用方法：
 *   node src/lib/legiit/url-server.js
 * 
 * 然後在瀏覽器控制台運行 console-script-v2.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
const urlsPath = path.resolve(__dirname, '../../data/service-urls.json');

let urlsData;
try {
  urlsData = fs.readFileSync(urlsPath, 'utf-8');
  const count = JSON.parse(urlsData).length;
  console.log(`✅ 已加載 ${count} 個服務 URL`);
} catch (e) {
  console.error(`❌ 無法讀取 ${urlsPath}:`, e.message);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  // CORS 頭：允許來自 legiit.com 的請求
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/urls.json' || req.url === '/') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.writeHead(200);
    res.end(urlsData);
    console.log(`📤 ${new Date().toLocaleTimeString()} 提供 URL 列表 (${(urlsData.length / 1024 / 1024).toFixed(2)} MB)`);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🚀 URL 服務器運行中: http://127.0.0.1:${PORT}/urls.json`);
  console.log(`📋 提供 20,731 個服務 URL`);
  console.log(`\n🔹 現在打開 https://legiit.com 的瀏覽器控制台`);
  console.log(`🔹 粘貼運行 console-script-v2.js`);
  console.log(`\n按 Ctrl+C 停止服務器\n`);
});
