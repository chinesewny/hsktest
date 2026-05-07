/* ===========================================================
 * Google Sheets bridge (Apps Script Web App)
 * รองรับ: health / schema / read / write / update / upsert
 * =========================================================== */
(function () {
  const cfg = window.APP_CONFIG.googleSheets;
  const queue = [];
  let flushTimer = null;
  let batchSupported = true;
  const BATCH_SIZE = 20;
  const FLUSH_DELAY_MS = 2500;

  function shouldMirror() {
    return cfg.liveMirror !== false;
  }

  function isOffline() {
    return window.OFFLINE_MODE || !cfg.apiEndpoint || cfg.apiEndpoint.startsWith("YOUR_");
  }

  function withAuth(payload = {}) {
    return {
      ...payload,
      apiKey: cfg.apiKey || ""
    };
  }

  async function parseResponse(response) {
    const data = await response.json();
    if (!response.ok || data.ok === false) {
      const message = data.error || `HTTP ${response.status}`;
      throw new Error(message);
    }
    return data;
  }

  async function get(action, params = {}) {
    if (isOffline()) return { ok: false, offline: true, data: [] };
    const search = new URLSearchParams(withAuth({ action, ...params }));
    const response = await fetch(`${cfg.apiEndpoint}?${search.toString()}`);
    return parseResponse(response);
  }

  async function post(action, body = {}, options = {}) {
    if (isOffline()) return { ok: false, offline: true };
    const response = await fetch(cfg.apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(withAuth({ action, ...body })),
      keepalive: !!options.keepalive
    });
    return parseResponse(response);
  }

  async function health() {
    try {
      return await get("health");
    } catch (error) {
      console.error("[sheets] health error", error);
      return { ok: false, error: error.message };
    }
  }

  async function schema() {
    try {
      return await get("schema");
    } catch (error) {
      console.error("[sheets] schema error", error);
      return { ok: false, error: error.message, sheets: {} };
    }
  }

  async function read(sheetName, params = {}) {
    if (isOffline()) return [];
    try {
      const result = await get("read", { sheet: sheetName, ...params });
      return result.data || [];
    } catch (error) {
      console.error("[sheets] read error", error);
      return [];
    }
  }

  async function write(sheetName, payload) {
    if (isOffline()) {
      console.log("[sheets] (offline) would write", sheetName, payload);
      return { ok: false, offline: true };
    }
    try {
      return await post("write", { sheet: sheetName, payload });
    } catch (error) {
      console.error("[sheets] write error", error);
      return { ok: false, error: error.message };
    }
  }

  async function update(sheetName, key, payload) {
    if (isOffline()) {
      console.log("[sheets] (offline) would update", sheetName, key, payload);
      return { ok: false, offline: true };
    }
    try {
      return await post("update", { sheet: sheetName, key, payload });
    } catch (error) {
      console.error("[sheets] update error", error);
      return { ok: false, error: error.message };
    }
  }

  async function upsert(sheetName, key, payload) {
    if (isOffline()) {
      console.log("[sheets] (offline) would upsert", sheetName, key, payload);
      return { ok: false, offline: true };
    }
    try {
      return await post("upsert", { sheet: sheetName, key, payload });
    } catch (error) {
      console.error("[sheets] upsert error", error);
      return { ok: false, error: error.message };
    }
  }

  function enqueue(action, sheetName, key, payload) {
    if (!shouldMirror()) return Promise.resolve({ ok: true, skipped: true, reason: "liveMirror disabled" });
    if (isOffline()) return Promise.resolve({ ok: false, offline: true });
    return new Promise((resolve) => {
      queue.push({ action, sheet: sheetName, key, payload, resolve });
      if (queue.length >= BATCH_SIZE) {
        flushQueue({ immediate: true }).catch(() => {});
        return;
      }
      if (!flushTimer) {
        flushTimer = setTimeout(() => {
          flushQueue().catch(() => {});
        }, FLUSH_DELAY_MS);
      }
    });
  }

  async function flushQueue(options = {}) {
    if (!queue.length || isOffline()) return { ok: false, offline: true, count: 0 };
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }

    const operations = queue.splice(0, BATCH_SIZE);
    if (!batchSupported) {
      const fallbackResults = await Promise.all(operations.map(async (operation) => {
        try {
          return await post(operation.action, {
            sheet: operation.sheet,
            key: operation.key,
            payload: operation.payload
          }, { keepalive: !!options.keepalive });
        } catch (error) {
          return { ok: false, error: error.message };
        }
      }));
      operations.forEach((operation, index) => operation.resolve(fallbackResults[index] || { ok: false }));
      return { ok: fallbackResults.every(result => result.ok !== false), action: "fallback", count: fallbackResults.length, results: fallbackResults };
    }

    try {
      const result = await post("batch", {
        operations: operations.map(item => ({
          action: item.action,
          sheet: item.sheet,
          key: item.key,
          payload: item.payload
        }))
      }, { keepalive: !!options.keepalive });

      const results = Array.isArray(result.results) ? result.results : [];
      operations.forEach((operation, index) => operation.resolve(results[index] || { ok: true }));
      if (queue.length) {
        flushTimer = setTimeout(() => {
          flushQueue().catch(() => {});
        }, 250);
      }
      return result;
    } catch (error) {
      if (String(error.message || "").includes("Unsupported POST action")) {
        batchSupported = false;
        queue.unshift(...operations);
        return flushQueue(options);
      }
      operations.forEach(operation => operation.resolve({ ok: false, error: error.message }));
      console.error("[sheets] batch flush error", error);
      return { ok: false, error: error.message };
    }
  }

  function enqueueWrite(sheetName, payload) {
    return enqueue("write", sheetName, null, payload);
  }

  function enqueueUpdate(sheetName, key, payload) {
    return enqueue("update", sheetName, key, payload);
  }

  function enqueueUpsert(sheetName, key, payload) {
    return enqueue("upsert", sheetName, key, payload);
  }

  window.addEventListener("pagehide", () => {
    flushQueue({ immediate: true, keepalive: true }).catch(() => {});
  });

  window.GSheets = {
    health, schema, read, write, update, upsert,
    enqueueWrite, enqueueUpdate, enqueueUpsert, flushQueue, shouldMirror
  };
  console.log("[sheets] bridge ready");
})();
