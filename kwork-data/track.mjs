/**
 * Kwork Views Tracker
 * ====================
 *
 * 使用方法：
 *   1. 每周手动打开 https://kwork.com/manage_kworks
 *   2. Ctrl+S 保存为 kwork-data/raw/YYYY-MM-DD.html
 *   3. 运行 node kwork-data/track.mjs
 *   4. 打开 kwork-data/chart.html 查看趋势图
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, rmSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(__dirname, 'raw');
const DATA_FILE = join(__dirname, 'data.json');
const CHART_FILE = join(__dirname, 'chart.html');

/** 解析单个 HTML 文件 */
function parseHTML(filePath) {
  const html = readFileSync(filePath, 'utf-8');

  // 匹配每个 kwork 行
  const rowRegex = /<tr[^>]*class="[^"]*manage-kworks__row[^"]*js-kwork-row-(\d+)"[^>]*>[\s\S]*?<h3[^>]*class="manage-kworks-item__title"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<span[^>]*class="dib"[^>]*>(.*?)<\/span>[\s\S]*?icon-eye[^>]*>[\s\S]*?<span[^>]*>(\d+)<\/span>/g;

  const kworks = [];
  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    kworks.push({
      id: match[1],
      title: match[3].trim(),
      url: match[2],
      views: parseInt(match[4], 10),
    });
  }

  return kworks;
}

/** 加载已有数据 */
function loadData() {
  if (existsSync(DATA_FILE)) {
    return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
  }
  return [];
}

/** 获取最新的 HTML 文件 */
function getLatestHTML() {
  const files = readdirSync(RAW_DIR)
    .filter(f => f.endsWith('.html'))
    .sort();
  return files.length > 0 ? join(RAW_DIR, files[files.length - 1]) : null;
}

/** 删除 raw/ 目录下所有 _files 文件夹 */
function cleanupFiles() {
  const items = readdirSync(RAW_DIR);
  let count = 0;
  for (const item of items) {
    const fullPath = join(RAW_DIR, item);
    if (item.endsWith('_files') && statSync(fullPath).isDirectory()) {
      rmSync(fullPath, { recursive: true, force: true });
      count++;
    }
  }
  if (count > 0) console.log(`   🧹 Cleaned up ${count} _files folder(s)`);
}

/** 生成 chart.html */
function generateChart(records, kworkIds) {
  const dates = [...new Set(records.map(r => r.date))].sort();

  // 为每个 kwork 构建数据集
  const datasets = {};
  for (const kid of kworkIds) {
    // 找标题
    let title = kid;
    for (const rec of records) {
      const found = rec.kworks.find(k => k.id === kid);
      if (found) {
        title = found.title;
        break;
      }
    }

    datasets[kid] = {
      title: title.length > 50 ? title.substring(0, 50) + '…' : title,
      values: dates.map(d => {
        const rec = records.find(r => r.date === d);
        if (rec) {
          const k = rec.kworks.find(k => k.id === kid);
          return k ? k.views : 0;
        }
        return 0;
      }),
    };
  }

  const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

  const datasetsJS = Object.entries(datasets).map(([kid, ds], i) => `    {
      label: "${ds.title}",
      data: ${JSON.stringify(ds.values)},
      borderColor: "${colors[i % colors.length]}",
      backgroundColor: "${colors[i % colors.length]}22",
      borderWidth: 2,
      tension: 0.3,
      pointRadius: 4,
      pointHoverRadius: 6
    }`);

  // 表格行
  const tableRows = dates.map((d, i) => {
    const cells = Object.values(datasets).map(ds => ds.values[i]);
    const total = cells.reduce((a, b) => a + b, 0);
    return `          <tr><td>${d}</td>${cells.map(v => `<td>${v}</td>`).join('')}<td><strong>${total}</strong></td></tr>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kwork Views Tracker</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
         background: #f5f5f5; padding: 20px; }
  .container { max-width: 1000px; margin: 0 auto; }
  h1 { font-size: 24px; margin-bottom: 8px; color: #333; }
  .subtitle { color: #666; margin-bottom: 24px; font-size: 14px; }
  .chart-card { background: white; border-radius: 12px; padding: 24px;
                 box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin-bottom: 24px; }
  canvas { max-height: 500px; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; }
  th { background: #fafafa; font-weight: 600; color: #555; }
  tr:hover { background: #f8f8f8; }
  .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .summary-card { background: white; border-radius: 10px; padding: 16px;
                   box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .summary-card .label { font-size: 12px; color: #888; margin-bottom: 4px; }
  .summary-card .value { font-size: 28px; font-weight: 700; color: #333; }
</style>
</head>
<body>
<div class="container">
  <h1>👁️ Kwork Views Tracker</h1>
  <p class="subtitle">Last updated: ${dates[dates.length - 1] || 'N/A'} | Total records: ${records.length}</p>

  <div class="summary">
    <div class="summary-card">
      <div class="label">Total Kworks</div>
      <div class="value">${kworkIds.length}</div>
    </div>
    <div class="summary-card">
      <div class="label">Latest Total Views</div>
      <div class="value">${Object.values(datasets).reduce((sum, ds) => sum + ds.values[ds.values.length - 1], 0)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Tracking Since</div>
      <div class="value" style="font-size:16px">${dates[0] || 'N/A'}</div>
    </div>
  </div>

  <div class="chart-card">
    <canvas id="viewsChart"></canvas>
  </div>

  <div class="chart-card">
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            ${Object.values(datasets).map(ds => `<th>${ds.title}</th>`).join('')}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
${tableRows}
        </tbody>
      </table>
    </div>
  </div>
</div>

<script>
const ctx = document.getElementById('viewsChart').getContext('2d');
new Chart(ctx, {
  type: 'line',
  data: {
    labels: ${JSON.stringify(dates)},
    datasets: [${datasetsJS.join(',\n')}
    ]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, padding: 16 } },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } },
      x: { grid: { display: false } }
    }
  }
});
</script>
</body>
</html>`;

  writeFileSync(CHART_FILE, html, 'utf-8');
  console.log(`✅ Chart generated: ${CHART_FILE}`);
}

function main() {
  const htmlFile = getLatestHTML();
  if (!htmlFile) {
    console.error('❌ No HTML files found in kwork-data/raw/');
    return;
  }

  // 从文件名提取日期 (YYYY-MM-DD.html)
  const dateStr = htmlFile.split(/[/\\]/).pop().replace('.html', '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    console.error(`❌ Invalid date in filename: ${dateStr}`);
    console.error('   File should be named YYYY-MM-DD.html');
    return;
  }

  // 解析 HTML
  const kworks = parseHTML(htmlFile);
  if (kworks.length === 0) {
    console.error('❌ No kwork data found. The HTML structure might have changed.');
    return;
  }

  console.log(`\n📄 ${htmlFile.split(/[/\\]/).pop()}`);
  console.log(`   Found ${kworks.length} kworks:`);
  for (const k of kworks) {
    console.log(`   [${k.id}] ${k.title.substring(0, 60)}... 👁️ ${k.views} views`);
  }

  // 加载已有数据
  const records = loadData();

  // 检查当天是否已记录
  const existingDates = new Set(records.map(r => r.date));
  if (existingDates.has(dateStr)) {
    for (const r of records) {
      if (r.date === dateStr) {
        r.kworks = kworks;
        break;
      }
    }
    console.log(`   🔄 Updated existing record for ${dateStr}`);
  } else {
    records.push({ date: dateStr, kworks });
    console.log(`   ✅ Added new record for ${dateStr}`);
  }

  // 保存
  writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), 'utf-8');
  console.log(`   💾 Saved to ${DATA_FILE}`);

  // 收集所有 kwork ID
  const seenIds = new Set();
  const allIds = [];
  for (const rec of records) {
    for (const k of rec.kworks) {
      if (!seenIds.has(k.id)) {
        seenIds.add(k.id);
        allIds.push(k.id);
      }
    }
  }

  // 生成图表
  generateChart(records, allIds);

  // 显示变化
  if (records.length >= 2) {
    const latest = records[records.length - 1].kworks;
    const prev = records[records.length - 2].kworks;
    const prevMap = {};
    for (const k of prev) prevMap[k.id] = k.views;

    console.log('\n📊 Week-over-week changes:');
    for (const k of latest) {
      const prevV = prevMap[k.id];
      if (prevV !== undefined && prevV !== k.views) {
        const diff = k.views - prevV;
        const arrow = diff > 0 ? '🔼' : '🔽';
        console.log(`   ${arrow} [${k.id}] ${k.title.substring(0, 50)}... ${prevV} → ${k.views} (${diff >= 0 ? '+' : ''}${diff})`);
      }
    }
  }
  // 清理 _files 文件夹
  cleanupFiles();
}

main();
