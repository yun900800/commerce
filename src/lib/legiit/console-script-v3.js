/**
 * Legiit Services Data Extractor v3
 *
 * 特點：
 * - ✅ Cookie 過期自動暫停，提示刷新
 * - ✅ 斷點續傳（localStorage 備份）
 * - ✅ 進度條 + 預計剩餘時間
 * - ✅ 隨時下載當前進度
 *
 * 使用方法：
 * 1. 啟動服務器: node src/lib/legiit/url-server.js
 * 2. 打開 https://legiit.com → F12 → Console
 * 3. 粘貼本腳本 → Enter
 * 4. Cookie 過期 → saveProgress() → F5 → 再次粘貼
 */

(function() {

  // ============================================================
  //  配置
  // ============================================================
  const CONFIG = {
    CONCURRENCY: 8,
    MAX_RETRIES: 2,
    PROGRESS_INTERVAL: 50,
    BACKUP_INTERVAL: 200,
    MAX_403_BEFORE_PAUSE: 5,
  };

  const LS_KEY = 'legiit_services_backup';
  const LS_TIMESTAMP_KEY = 'legiit_services_timestamp';

  // ============================================================
  //  工具函數
  // ============================================================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + '分' + s + '秒';
  };

  function extractData(apiData) {
    var d = apiData.data || apiData;
    var bp = d.basic_plans || (d.all_plans && d.all_plans[0]) || {};
    var sp = d.standard_plans || (d.all_plans && d.all_plans[1]) || {};
    var pp = d.premium_plans || (d.all_plans && d.all_plans[2]) || {};
    return {
      u: d.user && d.user.username || '',
      s: d.seo_url || '',
      t: d.title || '',
      r: d.service_rating != null ? d.service_rating : null,
      rc: d.total_review_count != null ? d.total_review_count : null,
      bp: bp.price != null ? bp.price : null,
      sp: sp.price != null ? sp.price : null,
      pp: pp.price != null ? pp.price : null,
      l: d.user && d.user.seller_level || '',
      cat: d.category && d.category.category_name || '',
      sub: d.subcategory && d.subcategory.subcategory_name || '',
      sr: d.user && d.user.user_details && d.user.user_details.total_review || null,
      cr: d.created_at || '',
    };
  }

  function lsSave(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('⚠️ localStorage 備份失敗:', e.message);
      return false;
    }
  }

  function lsLoad(key) {
    try {
      var v = localStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch (e) {
      return null;
    }
  }

  function downloadJSON(results) {
    if (!results || results.length === 0) {
      console.log('暫無數據可下載');
      return;
    }

    var sorted = results.slice().sort(function(a, b) {
      return (b.rc || 0) - (a.rc || 0);
    });

    var output = {
      total: sorted.length,
      generated_at: new Date().toISOString(),
      services: sorted
    };

    var jsonStr = JSON.stringify(output, null, 2);
    var blob = new Blob([jsonStr], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'legiit-services-' + sorted.length + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('📥 已下載: legiit-services-' + sorted.length + '.json (' +
      (jsonStr.length / 1024 / 1024).toFixed(1) + ' MB)');
  }

  // ============================================================
  //  主流程
  // ============================================================
  async function main() {
    console.log('');
    console.log('%c═══════════════════════════════════════', 'color:#4CAF50;');
    console.log('%c    Legiit 服務數據提取器 v3', 'color:#4CAF50; font-weight:bold; font-size:18px;');
    console.log('%c    斷點續傳 + Session 過期檢測', 'color:#4CAF50; font-size:12px;');
    console.log('%c═══════════════════════════════════════', 'color:#4CAF50;');
    console.log('');

    // ========== 1. 獲取 URL 列表 ==========
    console.log('🔄 正在連接本機服務器...');

    var services;
    try {
      var resp = await fetch('http://127.0.0.1:3456/urls.json');
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      services = await resp.json();
    } catch (e) {
      console.error('%c❌ 無法連接到本機服務器！', 'color:red; font-weight:bold;');
      console.error('   請在終端運行: node src/lib/legiit/url-server.js');
      console.error('   Error:', e.message);
      return;
    }

    if (!Array.isArray(services) || services.length === 0) {
      console.error('❌ URL 列表格式錯誤');
      return;
    }

    console.log('%c✅ URL 列表加載成功！共 ' + services.length + ' 個服務', 'color:#4CAF50; font-weight:bold;');

    // ========== 2. 檢查備份 ==========
    var savedResults = lsLoad(LS_KEY) || [];
    var processedSeoUrls = new Set();
    savedResults.forEach(function(r) { processedSeoUrls.add(r.s); });

    var remaining = [];
    for (var i = 0; i < services.length; i++) {
      if (!processedSeoUrls.has(services[i].s)) {
        remaining.push(services[i]);
      }
    }

    var savedCount = savedResults.length;

    if (savedCount > 0) {
      console.log('%c💾 檢測到本地備份：' + savedCount + ' 條已抓取', 'color:#FF9800;');
      console.log('   跳過已處理 → 剩餘 ' + remaining.length + ' 個服務');
    }

    if (remaining.length === 0) {
      console.log('%c✅ 所有服務都已經抓取完成！', 'color:#4CAF50; font-weight:bold; font-size:16px;');
      downloadJSON(savedResults);
      return;
    }

    // ========== 3. 初始化 ==========
    var results = savedResults.slice();
    var errors = [];
    var completed = savedCount;
    var startTime = Date.now();
    var consecutive403 = 0;
    var paused = false;

    // 暴露 saveProgress 到全局
    window.saveProgress = function() {
      downloadJSON(results);
    };

    console.log('');
    console.log('%c🚀 開始抓取 ' + remaining.length + ' 個服務 (並行: ' + CONFIG.CONCURRENCY + ')', 'color:#2196F3; font-weight:bold;');
    console.log('   提示: 隨時輸入 saveProgress() 下載當前進度');
    console.log('');

    // ========== 進度顯示 (v2 風格) ==========
    function printProgress() {
      var elapsed = (Date.now() - startTime) / 1000;
      var rate = elapsed > 0 ? completed / elapsed : 0;
      var remaining_count = services.length - completed;
      var eta = rate > 0 ? remaining_count / rate : 0;
      var pct = (completed / services.length * 100).toFixed(1);
      var barLen = 30;
      var filled = Math.floor(completed / services.length * barLen);
      var bar = '';
      for (var j = 0; j < barLen; j++) {
        bar += j < filled ? '█' : '░';
      }

      console.log(
        '  ' + bar + ' ' + pct + '%  |  ' + completed + '/' + services.length + '  |  ' +
        rate.toFixed(1) + '/秒  |  已用: ' + formatTime(elapsed) + '  |  ' +
        '預計剩餘: ' + formatTime(eta) + '  |  錯誤: ' + errors.length
      );
    }

    function printCompact() {
      if (completed % 10 === 0) {
        var elapsed = (Date.now() - startTime) / 1000;
        var rate = elapsed > 0 ? (completed - savedCount) / elapsed : 0;
        var remaining_count = services.length - completed;
        var eta = rate > 0 ? remaining_count / rate : 0;
        var pct = (completed / services.length * 100).toFixed(1);
        console.log(
          '  📊 ' + pct + '% | ' + completed + '/' + services.length + ' | ' +
          rate.toFixed(1) + '/s | ETA: ' + formatTime(eta) + ' | 錯誤: ' + errors.length
        );
      }
    }

    // ========== 保存到 localStorage ==========
    function saveBackup() {
      lsSave(LS_KEY, results);
      try {
        localStorage.setItem(LS_TIMESTAMP_KEY, new Date().toLocaleString());
      } catch (e) {}
    }

    // ========== Session 過期處理 ==========
    function pauseForSessionExpiry() {
      if (paused) return;
      paused = true;

      console.log('');
      console.log('%c═══════════════════════════════════════', 'color:#e53935;');
      console.log('%c  ⚠️   Cookie / Session 已過期  ⚠️', 'color:#e53935; font-weight:bold; font-size:16px;');
      console.log('%c═══════════════════════════════════════', 'color:#e53935;');
      console.log('');
      console.log('   連續 ' + consecutive403 + ' 個請求被 Cloudflare 攔截。');
      console.log('   當前進度: ' + results.length + ' / ' + services.length + ' 條');
      console.log('');
      console.log('   🔸 已自動保存到瀏覽器 localStorage');
      console.log('');
      console.log('   【繼續抓取步驟】');
      console.log('   第 1 步: 輸入 saveProgress()  → 下載當前數據');
      console.log('   第 2 步: 按 F5 刷新頁面（獲取新 cookie）');
      console.log('   第 3 步: 重新粘貼腳本 → 自動續傳');
      console.log('');

      // 自動下載當前進度
      downloadJSON(results);
    }

    // ========== API 調用 ==========
    async function fetchService(svc, retryCount) {
      if (retryCount === undefined) retryCount = 0;

      try {
        var resp = await fetch(
          'https://legiit.com/api/frontend/service/get-service-detail',
          {
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
          }
        );

        if (resp.status === 403) {
          consecutive403++;

          if (consecutive403 >= CONFIG.MAX_403_BEFORE_PAUSE) {
            saveBackup();
            pauseForSessionExpiry();
            // 等待 30 秒讓用戶有時間刷新
            console.log('   ⏳ 等待 30 秒後自動重試… (或現在按 F5 刷新)');
            await sleep(30000);
            consecutive403 = 0;
            paused = false;
            console.log('   🔄 恢復抓取…');
            if (retryCount < CONFIG.MAX_RETRIES + 1) {
              return fetchService(svc, retryCount + 1);
            }
          }

          if (retryCount < CONFIG.MAX_RETRIES) {
            await sleep(2000);
            return fetchService(svc, retryCount + 1);
          }
          throw new Error('HTTP 403');
        }

        // 成功 → 重置 403 計數
        consecutive403 = 0;

        if (!resp.ok) {
          if (resp.status === 429 && retryCount < CONFIG.MAX_RETRIES) {
            await sleep(3000);
            return fetchService(svc, retryCount + 1);
          }
          throw new Error('HTTP ' + resp.status);
        }

        var json = await resp.json();
        return extractData(json);

      } catch (e) {
        if (retryCount < CONFIG.MAX_RETRIES) {
          await sleep(1500);
          return fetchService(svc, retryCount + 1);
        }
        throw e;
      }
    }

    // ========== 並行池 ==========
    var idx = 0;
    var totalRemaining = remaining.length;

    async function processNext() {
      while (true) {
        if (paused) {
          await sleep(1000);
          continue;
        }

        var i = idx++;
        if (i >= totalRemaining) break;

        var svc = remaining[i];
        try {
          var data = await fetchService(svc);
          if (data === null) break;

          results.push(data);
          completed++;

          if (completed % CONFIG.PROGRESS_INTERVAL === 0) {
            printProgress();
            saveBackup();
          } else if (completed % CONFIG.BACKUP_INTERVAL === 0) {
            saveBackup();
            printCompact();
          } else {
            printCompact();
          }

        } catch (e) {
          errors.push({ u: svc.u, s: svc.s, error: e.message });
          completed++;
          if (completed % 20 === 0) {
            console.log('  ⚠️ 已失敗 ' + errors.length + ' 條 (例如: ' + svc.s + ')');
          }
        }
      }
    }

    var workers = [];
    for (var w = 0; w < CONFIG.CONCURRENCY; w++) {
      workers.push(processNext());
    }
    await Promise.all(workers);

    // ========== 完成 ==========
    var totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('');
    console.log('%c═══════════════════════════════════════', 'color:#4CAF50;');
    console.log('%c  ✅  抓取完成！', 'color:#4CAF50; font-weight:bold; font-size:18px;');
    console.log('%c═══════════════════════════════════════', 'color:#4CAF50;');
    console.log('   📊 成功: ' + results.length + ' / ' + services.length);
    console.log('   ❌ 失敗: ' + errors.length);
    console.log('   ⏱️  用時: ' + formatTime(totalTime));
    console.log('   📈 速度: ' + (results.length / totalTime).toFixed(1) + ' 個/秒');

    if (errors.length > 0) {
      console.log('   ⚠️  失敗示例:', errors.slice(0, 3));
    }

    saveBackup();
    downloadJSON(results);

    console.log('');
    console.log('💡 提示:');
    console.log('   - 再次粘貼腳本會自動續傳');
    console.log('   - 輸入 saveProgress() 隨時下載進度');

    // 重試功能
    if (errors.length > 0) {
      console.log('   - 輸入 retryFailed() 重試失敗的服務');

      window.retryFailed = async function() {
        var failed = errors.slice();
        errors.length = 0;
        console.log('🔄 重試 ' + failed.length + ' 個失敗的服務…');
        for (var f = 0; f < failed.length; f++) {
          var fd = failed[f];
          try {
            var data = await fetchService({ u: fd.u, s: fd.s });
            if (data) { results.push(data); console.log('  ✅ ' + fd.s); }
          } catch (er) {
            errors.push(fd);
            console.log('  ❌ ' + fd.s);
          }
        }
        console.log('重試完成! 成功: ' + (results.length - savedCount) + ', 仍失敗: ' + errors.length);
        saveBackup();
        downloadJSON(results);
      };
    }
  }

  // ============================================================
  //  啟動
  // ============================================================
  main().catch(function(e) {
    console.error('❌ 腳本異常:', e);
  });

})();
