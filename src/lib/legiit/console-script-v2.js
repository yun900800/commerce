/**
 * Legiit Services Data Extractor v2
 * 
 * 使用方法：
 * 1. 在終端運行: node src/lib/legiit/url-server.js
 * 2. 在 Chrome 中打開 https://legiit.com （已登入並通過 Cloudflare）
 * 3. 按 F12 → Console → 粘貼本腳本 → Enter
 * 4. 等待完成，自動下載 JSON
 */

(async function extractLegiitServices() {
  const CONFIG = {
    CONCURRENCY: 8,
    MAX_RETRIES: 3,
    PROGRESS_INTERVAL: 50,
    BACKUP_INTERVAL: 200,
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}分${s}秒`;
  };

  function extractRelevantData(apiData) {
    const d = apiData.data || apiData;
    const bp = d.basic_plans || (d.all_plans && d.all_plans[0]) || {};
    const sp = d.standard_plans || (d.all_plans && d.all_plans[1]) || {};
    const pp = d.premium_plans || (d.all_plans && d.all_plans[2]) || {};

    return {
      u: d.user?.username || '',
      s: d.seo_url || '',
      t: d.title || '',
      r: d.service_rating ?? null,
      rc: d.total_review_count ?? null,
      bp: bp.price ?? null,
      sp: sp.price ?? null,
      pp: pp.price ?? null,
      l: d.user?.seller_level || '',
      cat: d.category?.category_name || '',
      sub: d.subcategory?.subcategory_name || '',
      sr: d.user?.user_details?.total_review ?? null,
      cr: d.created_at || '',
    };
  }

  console.log('%c📊 Legiit 服務數據提取器 v2', 'font-size:20px; font-weight:bold; color:#4CAF50;');
  console.log('%c正在從本機服務器獲取 URL 列表...', 'color:#2196F3;');

  // 從本機服務器獲取 URL 列表
  let services;
  try {
    const resp = await fetch('http://127.0.0.1:3456/urls.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    services = await resp.json();
  } catch (e) {
    console.error('%c❌ 無法連接到本機服務器！', 'color:red; font-weight:bold;');
    console.error('  Error:', e.message);
    console.error('');
    console.error('  請確認：');
    console.error('  1. 已經在終端運行了: node src/lib/legiit/url-server.js');
    console.error('  2. 服務器端口 3456 沒有被佔用');
    console.error('');
    console.error('  或者手動加載 URL（從 service-urls.json 複製內容到剪貼板）:');
    console.error('  fetch("http://127.0.0.1:3456/urls.json")');
    return;
  }

  if (!Array.isArray(services) || services.length === 0) {
    console.error('%c❌ URL 列表格式錯誤', 'color:red;');
    return;
  }

  console.log(`%c✅ URL 列表加載成功！共 ${services.length} 個服務`, 'color:#4CAF50; font-weight:bold;');

  // 檢查 localStorage 備份
  let savedResults = [];
  let savedCount = 0;
  try {
    const backup = localStorage.getItem('legiit_services_backup');
    if (backup) {
      const parsed = JSON.parse(backup);
      if (Array.isArray(parsed) && parsed.length > 0) {
        savedResults = parsed;
        savedCount = parsed.length;
        console.log(`%c💾 發現本地備份：${savedCount} 個已保存的結果`, 'color:#FF9800;');
      }
    }
  } catch (e) {}

  // 跳過已處理的
  const processedSeoUrls = new Set(savedResults.map(r => r.s));
  const remaining = services.filter(s => !processedSeoUrls.has(s.s));
  
  console.log(`📋 總計: ${services.length} | 已處理: ${savedCount} | 剩餘: ${remaining.length}`);

  if (remaining.length === 0) {
    console.log('%c✅ 所有服務都已抓取完成！', 'color:#4CAF50; font-weight:bold; font-size:16px;');
    downloadResults(savedResults);
    return;
  }

  // 並行處理
  const results = [...savedResults];
  const errors = [];
  let completed = savedCount;
  const startTime = Date.now();

  console.log(`\n🚀 開始抓取 ${remaining.length} 個服務 (並行: ${CONFIG.CONCURRENCY})...\n`);

  function printProgress() {
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = completed / elapsed;
    const remaining_count = services.length - completed;
    const eta = remaining_count / rate;
    const pct = ((completed / services.length) * 100).toFixed(1);
    const barLen = 30;
    const filled = Math.floor((completed / services.length) * barLen);
    const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
    
    console.log(
      `  ${bar} ${pct}% | ${completed}/${services.length} | ` +
      `${rate.toFixed(1)}/s | 已用: ${formatTime(elapsed)} | ` +
      `剩餘: ${formatTime(eta)} | 錯誤: ${errors.length}`
    );
  }

  function printCompact() {
    if (completed % 10 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = (completed - savedCount) / elapsed;
      const eta = (services.length - completed) / rate;
      const pct = ((completed / services.length) * 100).toFixed(1);
      console.log(`  📊 ${pct}% | ${completed}/${services.length} | ${rate.toFixed(1)}/s | ETA: ${formatTime(eta)} | 錯誤: ${errors.length}`);
    }
  }

  function saveBackup() {
    try {
      localStorage.setItem('legiit_services_backup', JSON.stringify(results));
      localStorage.setItem('legiit_services_timestamp', new Date().toISOString());
    } catch (e) {
      console.warn('⚠️ 備份失敗:', e.message);
    }
  }

  async function fetchService(svc, retryCount = 0) {
    try {
      const resp = await fetch('https://legiit.com/api/frontend/service/get-service-detail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          seo_url: svc.s,
          username: svc.u
        }),
        credentials: 'include'
      });

      if (!resp.ok) {
        if ((resp.status === 403 || resp.status === 429) && retryCount < CONFIG.MAX_RETRIES) {
          await sleep(2000 * (retryCount + 1));
          return fetchService(svc, retryCount + 1);
        }
        throw new Error(`HTTP ${resp.status}`);
      }

      const json = await resp.json();
      return extractRelevantData(json);
    } catch (e) {
      if (retryCount < CONFIG.MAX_RETRIES) {
        await sleep(1000 * (retryCount + 1));
        return fetchService(svc, retryCount + 1);
      }
      throw e;
    }
  }

  // 並行池
  let index = 0;
  const totalRemaining = remaining.length;

  async function processNext() {
    while (true) {
      const i = index++;
      if (i >= totalRemaining) break;

      const svc = remaining[i];
      try {
        const data = await fetchService(svc);
        results.push(data);
        completed++;

        if (completed % CONFIG.PROGRESS_INTERVAL === 0) {
          printProgress();
        } else {
          printCompact();
        }

        if (completed % CONFIG.BACKUP_INTERVAL === 0) {
          saveBackup();
        }
      } catch (e) {
        errors.push({ u: svc.u, s: svc.s, error: e.message });
        completed++;
        printCompact();
      }
    }
  }

  const workers = Array.from({ length: CONFIG.CONCURRENCY }, () => processNext());
  await Promise.all(workers);

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n');
  console.log('%c══════════════════════════════════════', 'color:#4CAF50;');
  console.log(`%c✅ 完成！`, 'color:#4CAF50; font-weight:bold; font-size:18px;');
  console.log(`   📊 成功: ${results.length} / ${services.length}`);
  console.log(`   ❌ 失敗: ${errors.length}`);
  console.log(`   ⏱️  用時: ${formatTime(totalTime)}`);
  console.log(`   📈 速度: ${(results.length / totalTime).toFixed(1)} 個/秒`);
  console.log('%c══════════════════════════════════════', 'color:#4CAF50;');

  if (errors.length > 0) {
    console.log(`\n⚠️  ${errors.length} 個服務抓取失敗`);
    console.log('失敗示例:', errors.slice(0, 3));
  }

  saveBackup();
  downloadResults(results);
  console.log('\n💡 再次運行腳本會從中斷處繼續');

  if (errors.length > 0) {
    console.log('\n🔄 要重試失敗項，請運行: retryFailed()');
    window.__legiit_errors = errors;
    window.retryFailed = async function() {
      const failed = window.__legiit_errors.map(e => ({ u: e.u, s: e.s }));
      console.log(`重試 ${failed.length} 個...`);
      window.__legiit_errors = [];
      for (const svc of failed) {
        try {
          const data = await fetchService(svc);
          results.push(data);
          console.log(`  ✅ ${svc.s}`);
        } catch(e) {
          window.__legiit_errors.push({...svc, error: e.message});
          console.log(`  ❌ ${svc.s}: ${e.message}`);
        }
      }
      console.log(`重試完成！成功: ${results.length}, 失敗: ${window.__legiit_errors.length}`);
      downloadResults(results);
    };
  }

  function downloadResults(data) {
    data.sort((a, b) => (b.rc || 0) - (a.rc || 0));
    
    const output = {
      total: data.length,
      generated_at: new Date().toISOString(),
      services: data
    };

    const jsonStr = JSON.stringify(output, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `legiit-services-${data.length}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`\n📥 下載: legiit-services-${data.length}.json (${(jsonStr.length / 1024 / 1024).toFixed(1)} MB)`);
  }
})();
