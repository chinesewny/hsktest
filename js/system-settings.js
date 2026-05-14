/* ===========================================================
 * System Settings Service
 * จัดการค่าตั้งระบบสำหรับการฝึก/สอบ/คะแนน/รางวัล/ร้านค้า
 * =========================================================== */
(function () {
  const STORAGE_KEY = "hsk_system_settings";
  const REMOTE = { collection: "system", doc: "settings" };

  const DEFAULTS = {
    game: {
      ...window.APP_CONFIG.game,
      sentenceModeEnabled: false,
      trainingCompleteCoins: Number(window.APP_CONFIG.game.trainingCompleteCoins || 10)
    },
    rewards: [
      { id: "coupon-3pts", emoji: "🎟️", name: "คูปอง +3 คะแนนภาษาจีน", detail: "ใช้เพิ่มคะแนนรายวิชาภาษาจีน 3 คะแนน", color: "from-emerald-500 to-teal-500" },
      { id: "school-supply", emoji: "📚", name: "คูปองแลกอุปกรณ์การเรียน", detail: "แลกสมุด ปากกา หรือชุดเครื่องเขียน", color: "from-cyan-500 to-blue-500" },
      { id: "special-prize", emoji: "🎁", name: "ของรางวัลพิเศษ", detail: "ของขวัญประจำสัปดาห์จากคุณครู", color: "from-pink-500 to-rose-500" },
      { id: "item-bundle", emoji: "⚔️", name: "กล่องไอเทมช่วยสอบ x3", detail: "แนะนำ: 50/50 x1, +เวลา x1, โล่กันผิด x1", color: "from-amber-500 to-orange-500" }
    ],
    shopItems: [
      { key: "fifty", emoji: "🔍", name: "แว่นเซียน 50/50", desc: "ตัด choice ผิด 2 ตัว", cost: 50 },
      { key: "time", emoji: "⏰", name: "นาฬิกาเวลา", desc: "+15 วินาทีในข้อนั้น", cost: 30 },
      { key: "pinyin", emoji: "💡", name: "โคมไฟพินอิน", desc: "แสดง Pinyin ของคำที่ถาม", cost: 40 },
      { key: "shield", emoji: "🛡️", name: "โล่กันผิด", desc: "ข้อแรกที่ผิดเปลี่ยนเป็นถูก", cost: 100 },
      { key: "dice", emoji: "🎲", name: "ลูกเต๋าโชค", desc: "สุ่มข้อใหม่ที่ง่ายกว่า", cost: 60 },
      { key: "double", emoji: "⚡", name: "คาถาคูณ 2", desc: "คะแนนข้อถัดไป x2", cost: 80 },
      { key: "ice", emoji: "❄️", name: "น้ำแข็งสมาธิ", desc: "หยุดเวลา 10 วินาที", cost: 70 }
    ]
  };

  let state = null;
  let initPromise = null;
  let ready = false;
  const FIRESTORE_READ_TIMEOUT_MS = 1500;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function withTimeout(promise, timeoutMs, label) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs))
    ]);
  }

  function safeParse(value, fallback) {
    try { return JSON.parse(value); } catch { return fallback; }
  }

  function normalizeGame(game = {}) {
    const base = clone(DEFAULTS.game);
    Object.keys(base).forEach((key) => {
      if (game[key] === undefined || game[key] === null || game[key] === "") return;
      if (typeof base[key] === "boolean") {
        if (typeof game[key] === "string") {
          const normalized = game[key].trim().toLowerCase();
          base[key] = !(normalized === "false" || normalized === "0" || normalized === "off");
        } else {
          base[key] = Boolean(game[key]);
        }
        return;
      }
      if (typeof base[key] === "number") {
        const parsed = Number(game[key]);
        if (!Number.isNaN(parsed)) base[key] = parsed;
        return;
      }
      base[key] = game[key];
    });
    return base;
  }

  function normalizeRewards(rewards) {
    const list = Array.isArray(rewards) && rewards.length ? rewards : DEFAULTS.rewards;
    return list.map((reward, index) => ({
      id: String(reward.id || `reward-${index + 1}`).trim(),
      emoji: String(reward.emoji || "🎁").trim(),
      name: String(reward.name || `Reward ${index + 1}`).trim(),
      detail: String(reward.detail || "").trim(),
      color: String(reward.color || "from-gray-500 to-gray-700").trim()
    })).filter((reward) => reward.id);
  }

  function normalizeShopItems(shopItems) {
    const list = Array.isArray(shopItems) && shopItems.length ? shopItems : DEFAULTS.shopItems;
    return list.map((item, index) => ({
      key: String(item.key || `item-${index + 1}`).trim(),
      emoji: String(item.emoji || "🎒").trim(),
      name: String(item.name || `Item ${index + 1}`).trim(),
      desc: String(item.desc || "").trim(),
      cost: Number(item.cost || 0)
    })).filter((item) => item.key);
  }

  function normalizeState(raw = {}) {
    return {
      game: normalizeGame(raw.game || {}),
      rewards: normalizeRewards(raw.rewards),
      shopItems: normalizeShopItems(raw.shopItems),
      updatedAt: raw.updatedAt || new Date().toISOString()
    };
  }

  function loadLocal() {
    return normalizeState(U.ls.get(STORAGE_KEY, DEFAULTS));
  }

  function saveLocal(next) {
    state = normalizeState(next);
    U.ls.set(STORAGE_KEY, state);
    return state;
  }

  function getState() {
    if (!state) state = loadLocal();
    return normalizeState(state);
  }

  function getSheetName() {
    return window.APP_CONFIG.googleSheets?.sheets?.systemSettings || "SystemSettings";
  }

  function fromSheetRows(rows = []) {
    const bag = {};
    rows.forEach((row) => {
      if (!row.key) return;
      bag[String(row.key)] = row.value;
    });
    return normalizeState({
      game: safeParse(bag.game, DEFAULTS.game),
      rewards: safeParse(bag.rewards, DEFAULTS.rewards),
      shopItems: safeParse(bag.shopItems, DEFAULTS.shopItems),
      updatedAt: bag.updatedAt || new Date().toISOString()
    });
  }

  function toSheetRows(input = getState()) {
    const current = normalizeState(input);
    return [
      { key: "game", value: JSON.stringify(current.game), updatedAt: current.updatedAt },
      { key: "rewards", value: JSON.stringify(current.rewards), updatedAt: current.updatedAt },
      { key: "shopItems", value: JSON.stringify(current.shopItems), updatedAt: current.updatedAt },
      { key: "updatedAt", value: current.updatedAt, updatedAt: current.updatedAt }
    ];
  }

  async function fetchRemote() {
    if (window.fbDB) {
      const snap = await withTimeout(
        window.fbDB.collection(REMOTE.collection).doc(REMOTE.doc).get(),
        FIRESTORE_READ_TIMEOUT_MS,
        "settings read"
      );
      if (snap.exists) return normalizeState(snap.data());
    }
    if (window.GSheets) {
      const rows = await GSheets.read(getSheetName());
      if (rows.length) return fromSheetRows(rows);
    }
    return null;
  }

  async function init() {
    if (ready) return getState();
    if (initPromise) return initPromise;
    initPromise = (async () => {
      const local = loadLocal();
      state = local;
      try {
        const remote = await fetchRemote();
        if (remote) saveLocal(remote);
      } catch (error) {
        console.warn("[settings] init fallback to local cache", error);
      }
      ready = true;
      return getState();
    })();
    return initPromise;
  }

  async function syncToSheets(input = getState()) {
    if (!window.GSheets) throw new Error("Google Sheets bridge is not ready");
    const rows = toSheetRows(input);
    for (const row of rows) {
      await GSheets.upsert(getSheetName(), { field: "key", value: row.key }, row);
    }
    return { synced: rows.length, total: rows.length };
  }

  async function save(next) {
    const normalized = saveLocal({ ...next, updatedAt: new Date().toISOString() });
    if (window.fbDB) {
      await window.fbDB.collection(REMOTE.collection).doc(REMOTE.doc).set(normalized, { merge: true });
    } else if (window.GSheets) {
      await syncToSheets(normalized);
    }
    return getState();
  }

  async function reset() {
    return save(DEFAULTS);
  }

  function getGame() {
    return getState().game;
  }

  function getRewards() {
    return getState().rewards;
  }

  function getRewardMap() {
    return getRewards().reduce((map, reward) => {
      map[reward.id] = reward;
      return map;
    }, {});
  }

  function getShopItems() {
    return getState().shopItems;
  }

  window.SystemSettings = {
    init,
    isReady: () => ready,
    getState,
    getGame,
    getRewards,
    getRewardMap,
    getShopItems,
    save,
    reset,
    defaults: () => clone(DEFAULTS),
    toSheetRows,
    fromSheetRows,
    syncToSheets
  };
  console.log("[settings] service ready");
})();
