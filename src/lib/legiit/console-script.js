/**
 * Legiit Services Data Extractor
 * 
 * 使用方法：
 * 1. 在 Chrome 中打開 https://legiit.com （確保已經登入並通過 Cloudflare）
 * 2. 按 F12 打開 DevTools
 * 3. 點 Console 選項卡
 * 4. 複製粘貼整個腳本，按 Enter
 * 5. 等待所有數據抓取完成（約 10-20 分鐘，取決於網路速度）
 * 6. 腳本會自動下載結果 JSON 文件
 * 
 * 安全：
 * - 所有代碼都在你的瀏覽器中本地執行
 * - 只調用 Legiit 官方的 API
 * - 不會將任何數據發送到第三方
 */

(async function extractLegiitServices() {
  // ============ 配置 ============
  const CONFIG = {
    CONCURRENCY: 8,           // 並行請求數（不要太高，避免觸發限流）
    MAX_RETRIES: 3,            // 失敗重試次數
    PROGRESS_INTERVAL: 50,     // 每 N 個輸出一次進度
    BACKUP_INTERVAL: 200,      // 每 N 個保存一次備份到 localStorage
    BATCH_DELAY_MS: 100,       // 每批之間的延遲（ms）
  };

  // ============ 工具函數 ============
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}分${s}秒`;
  };

  function getFromUrl(url) {
    const path = url.replace('https://legiit.com/', '').replace(/\/$/, '');
    const parts = path.split('/');
    return {
      username: decodeURIComponent(parts[0]),
      seo_url: decodeURIComponent(parts[1]),
      url: url
    };
  }

  function extractRelevantData(apiData, serviceInfo) {
    const d = apiData.data || apiData;
    const bp = d.basic_plans || (d.all_plans && d.all_plans[0]) || {};
    const sp = d.standard_plans || (d.all_plans && d.all_plans[1]) || {};
    const pp = d.premium_plans || (d.all_plans && d.all_plans[2]) || {};

    return {
      u: serviceInfo.username,
      s: d.seo_url || serviceInfo.seo_url,
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

  // ============ 主邏輯 ============
  console.log('%c📊 Legiit 服務數據提取器', 'font-size:20px; font-weight:bold; color:#4CAF50;');
  console.log('%c正在抓取站點地圖... (約 3MB XML)', 'color:#2196F3;');

  let xmlText;
  try {
    const resp = await fetch('https://legiit.com/sitemaps/services.xml');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    xmlText = await resp.text();
  } catch (e) {
    console.error('%c❌ 站點地圖抓取失敗！請確認：', 'color:red; font-weight:bold;');
    console.error('  1. 你正在 https://legiit.com 這個頁面上 (而不是其他網站)');
    console.error('  2. 你已經通過了 Cloudflare 驗證');
    console.error('  3. 如果刷新頁面後重試');
    console.error('  Error:', e.message);
    return;
  }

  // 解析 XML
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  const locs = xmlDoc.querySelectorAll('url > loc');
  
  if (!locs || locs.length === 0) {
    console.error('%c❌ 無法解析站點地圖，XML 格式可能不對', 'color:red;');
    console.log('XML 前 500 字符:', xmlText.substring(0, 500));
    return;
  }

  const allUrls = Array.from(locs).map(el => el.textContent.trim());
  console.log(`%c✅ 站點地圖解析成功！共 ${allUrls.length} 個服務`, 'color:#4CAF50; font-weight:bold;');

  // 解析 URL 列表
  const services = allUrls.map(getFromUrl);

  // ============ 檢查 localStorage 備份 ============
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
  } catch (e) {
    // ignore localStorage errors
  }

  // 跳過已處理的
  const processedSeoUrls = new Set(savedResults.map(r => r.s));
  const remaining = services.filter(s => !processedSeoUrls.has(s.seo_url));
  
  console.log(`📋 總計: ${services.length} | 已處理: ${savedCount} | 剩餘: ${remaining.length}`);

  if (remaining.length === 0) {
    console.log('%c✅ 所有服務都已經抓取完成！', 'color:#4CAF50; font-weight:bold; font-size:16px;');
    downloadResults(savedResults);
    return;
  }

  // ============ 並行處理 ============
  const results = [...savedResults];
  const errors = [];
  let completed = savedCount;
  const startTime = Date.now();
  let lastLogTime = startTime;

  console.log(`\n🚀 開始抓取 ${remaining.length} 個服務 (並行: ${CONFIG.CONCURRENCY})...`);
  console.log('');

  // 進度條
  function printProgress() {
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = completed / elapsed;
    const remaining_count = remaining.length - (completed - savedCount);
    const eta = remaining_count / rate;
    const pct = ((completed / services.length) * 100).toFixed(1);
    const barLen = 30;
    const filled = Math.floor((completed / services.length) * barLen);
    const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
    
    console.log(
      `  ${bar} ${pct}%  |  ${completed}/${services.length}  |  ` +
      `${rate.toFixed(1)}/秒  |  已用: ${formatTime(elapsed)}  |  ` +
      `預計剩餘: ${formatTime(eta)}  |  錯誤: ${errors.length}`
    );
  }

  function printCompactProgress() {
    // 只在每 10 個輸出一次簡單進度（避免刷屏）
    if (completed % 10 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = (completed - savedCount) / elapsed;
      const remaining_count = services.length - completed;
      const eta = remaining_count / rate;
      const pct = ((completed / services.length) * 100).toFixed(1);
      console.log(`  📊 ${pct}% | ${completed}/${services.length} | ${rate.toFixed(1)}/s | ETA: ${formatTime(eta)} | 錯誤: ${errors.length}`);
    }
  }

  // 保存備份
  function saveBackup() {
    try {
      localStorage.setItem('legiit_services_backup', JSON.stringify(results));
      localStorage.setItem('legiit_services_timestamp', new Date().toISOString());
    } catch (e) {
      console.warn('⚠️ localStorage 備份失敗（可能已滿）：', e.message);
    }
  }

  // 嘗試調用 API
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
          seo_url: svc.seo_url,
          username: svc.username
        }),
        credentials: 'include'  // 重要：攜帶瀏覽器 cookies
      });

      if (!resp.ok) {
        if (resp.status === 403 && retryCount < CONFIG.MAX_RETRIES) {
          // Cloudflare challenge - wait and retry
          await sleep(2000 * (retryCount + 1));
          return fetchService(svc, retryCount + 1);
        }
        if (resp.status === 429 && retryCount < CONFIG.MAX_RETRIES) {
          // Rate limited - wait longer
          await sleep(5000 * (retryCount + 1));
          return fetchService(svc, retryCount + 1);
        }
        throw new Error(`HTTP ${resp.status}`);
      }

      const json = await resp.json();
      if (!json || !json.data) {
        throw new Error('Unexpected response format');
      }

      return extractRelevantData(json, svc);
    } catch (e) {
      if (retryCount < CONFIG.MAX_RETRIES) {
        await sleep(1000 * (retryCount + 1));
        return fetchService(svc, retryCount + 1);
      }
      throw e;
    }
  }

  // ============ 並行池 ============
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
          printCompactProgress();
        }

        // 定期備份
        if (completed % CONFIG.BACKUP_INTERVAL === 0) {
          saveBackup();
        }

        // 短延遲避免過快
        if (CONFIG.BATCH_DELAY_MS > 0 && i % CONFIG.CONCURRENCY === 0) {
          await sleep(CONFIG.BATCH_DELAY_MS);
        }
      } catch (e) {
        errors.push({ seo_url: svc.seo_url, username: svc.username, error: e.message });
        completed++;
        printCompactProgress();
      }
    }
  }

  // 啟動並行池
  const workers = Array.from({ length: CONFIG.CONCURRENCY }, () => processNext());
  await Promise.all(workers);

  // ============ 完成 ============
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
    console.log(`\n⚠️  ${errors.length} 個服務抓取失敗（已跳過）`);
    console.log('錯誤示例:', errors.slice(0, 5));
  }

  // 保存最終備份
  saveBackup();

  // 下載結果
  downloadResults(results);
  console.log('\n💡 提示: 如果以後想繼續（例如有遺漏），再次運行此腳本即可，它會從上一次中斷的地方繼續。');

  // 如果還有失敗的，顯示重試列表
  if (errors.length > 0) {
    console.log('\n🔄 要重試失敗的服務，請運行: retryFailed()');
    window.__legiit_errors = errors;
    window.__legiit_all_services = services;
    window.retryFailed = async function() {
      const failedServices = window.__legiit_errors.map(e => ({
        username: e.username,
        seo_url: e.seo_url,
        url: `https://legiit.com/${e.username}/${e.seo_url}`
      }));
      console.log(`重試 ${failedServices.length} 個失敗的服務...`);
      // 清空錯誤列表
      window.__legiit_errors = [];
      // 重新處理
      for (const svc of failedServices) {
        try {
          const data = await fetchService(svc);
          results.push(data);
          completed++;
          console.log(`  ✅ ${svc.seo_url}`);
        } catch(e) {
          window.__legiit_errors.push({...svc, error: e.message});
          console.log(`  ❌ ${svc.seo_url}: ${e.message}`);
        }
      }
      console.log(`\n重試完成！成功: ${results.length - errors.length}, 失敗: ${window.__legiit_errors.length}`);
      downloadResults(results);
    };
  }

  function downloadResults(data) {
    // 按評論數降序排序
    data.sort((a, b) => (b.rc || 0) - (a.rc || 0));
    
    // 生成完整的 JSON
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
    
    console.log(`\n📥 文件已下載: legiit-services-${data.length}.json (${(jsonStr.length / 1024 / 1024).toFixed(1)} MB)`);
  }

})();
