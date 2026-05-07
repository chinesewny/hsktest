/* ===========================================================
 * Progress / Game State Service
 * ใช้ localStorage เป็น cache หน้าเว็บ
 * sync ข้อมูลกับ Firestore + Google Sheets เพื่อใช้งานหลายเครื่อง
 * =========================================================== */
(function () {
  const KEYS = {
    daily: "hsk_daily_progress",
    tests: "hsk_test_scores",
    season: "hsk_current_season",
    rewards: "hsk_rewards_claimed",
    reviews: "hsk_daily_reviews"
  };

  const REMOTE = {
    daily: "dailyTraining",
    reviews: "dailyReviews",
    tests: "testScores",
    rewards: "rewards",
    rankings: "rankings",
    system: "system"
  };

  const cfg = new Proxy({}, {
    get(_, prop) {
      const source = window.SystemSettings?.getGame ? window.SystemSettings.getGame() : window.APP_CONFIG.game;
      return source[prop];
    }
  });
  let initPromise = null;
  let ready = false;
  const memCache = {
    leaderboard: new Map(),
    winners: new Map(),
    seasonStats: new Map()
  };
  const CACHE_TTL_MS = 60 * 1000;
  const FIRESTORE_READ_TIMEOUT_MS = 1500;

  function withTimeout(promise, timeoutMs, label) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs))
    ]);
  }

  function getDefaultSeason() {
    return { number: 1, startedAt: U.toISO(), roundsCompleted: 0, weekKeys: [], updatedAt: new Date().toISOString() };
  }

  function getBootstrapStudentId() {
    return AuthService.current()?.studentId || U.ls.get("hsk_session", {})?.studentId || "";
  }

  function loadLocalState() {
    return {
      daily: U.ls.get(KEYS.daily, {}),
      tests: U.ls.get(KEYS.tests, []),
      season: U.ls.get(KEYS.season, getDefaultSeason()),
      rewards: U.ls.get(KEYS.rewards, []),
      reviews: U.ls.get(KEYS.reviews, [])
    };
  }

  function saveLocalState(state) {
    U.ls.set(KEYS.daily, state.daily);
    U.ls.set(KEYS.tests, state.tests);
    U.ls.set(KEYS.season, state.season);
    U.ls.set(KEYS.rewards, state.rewards);
    U.ls.set(KEYS.reviews, state.reviews || []);
  }

  function weekKeyFor(d) {
    const monday = U.getMondayOfWeek(d);
    return monday.getFullYear() + "-W" + String(U.getWeekNumber(monday)).padStart(2, "0");
  }

  function buildCycleForDate(date = new Date()) {
    const monday = U.getMondayOfWeek(date);
    const friday = U.addDays(monday, cfg.daysPerWeek - 1);
    return {
      key: weekKeyFor(monday),
      monday,
      friday,
      dates: Array.from({ length: cfg.daysPerWeek }, (_, i) => U.toISO(U.addDays(monday, i)))
    };
  }

  function getCurrentTrainingCycle(date = new Date()) {
    return buildCycleForDate(date);
  }

  function getPreviousTrainingCycle(date = new Date()) {
    return buildCycleForDate(U.addDays(date, -7));
  }

  function getTargetTestCycle(date = new Date()) {
    return getPreviousTrainingCycle(date);
  }

  function normalizeDailyDoc(doc) {
    const ids = Array.isArray(doc.wordIds)
      ? doc.wordIds
      : String(doc.wordIds || "").split(",").map(s => s.trim()).filter(Boolean);
    return {
      recordId: doc.recordId || `${doc.studentId}_${doc.date}`,
      studentId: String(doc.studentId || ""),
      date: String(doc.date || ""),
      cycleKey: doc.cycleKey || "",
      level: Number(doc.level || 0) || "",
      wordIds: ids,
      updatedAt: doc.updatedAt || doc.createdAt || ""
    };
  }

  function normalizeTestDoc(doc) {
    return {
      recordId: doc.recordId || `${doc.studentId}_${doc.cycleKey}_${doc.ts}`,
      studentId: String(doc.studentId || ""),
      classroom: doc.classroom || "",
      score: Number(doc.score || 0),
      total: Number(doc.total || 0),
      weekKey: doc.weekKey || "",
      cycleKey: doc.cycleKey || "",
      ts: Number(doc.ts || Date.now()),
      season: Number(doc.season || 1),
      seasonRound: Number(doc.seasonRound || 1),
      details: Array.isArray(doc.details) ? doc.details : safeJsonParse(doc.details, [])
    };
  }

  function normalizeRewardDoc(doc) {
    return {
      recordId: doc.recordId || `${doc.studentId}_${doc.rewardId}_${doc.ts}`,
      studentId: String(doc.studentId || ""),
      rewardId: doc.rewardId || "",
      weekKey: doc.weekKey || "",
      classroom: doc.classroom || "",
      season: Number(doc.season || 1),
      note: doc.note || "",
      ts: Number(doc.ts || Date.now())
    };
  }

  function normalizeReviewDoc(doc) {
    return {
      recordId: doc.recordId || `${doc.studentId}_${doc.date}_review`,
      studentId: String(doc.studentId || ""),
      date: String(doc.date || ""),
      cycleKey: doc.cycleKey || "",
      level: Number(doc.level || 1),
      score: Number(doc.score || 0),
      total: Number(doc.total || 0),
      accuracy: Number(doc.accuracy || 0),
      details: Array.isArray(doc.details) ? doc.details : safeJsonParse(doc.details, []),
      ts: Number(doc.ts || Date.now())
    };
  }

  function normalizeSeasonDoc(doc) {
    const season = { ...getDefaultSeason(), ...(doc || {}) };
    if (!Array.isArray(season.weekKeys)) {
      season.weekKeys = String(season.weekKeys || "").split(",").map(s => s.trim()).filter(Boolean);
    }
    season.number = Number(season.number || 1);
    season.roundsCompleted = Number(season.roundsCompleted || season.weekKeys.length || 0);
    season.updatedAt = season.updatedAt || new Date().toISOString();
    return season;
  }

  function safeJsonParse(value, fallback) {
    try { return JSON.parse(value); } catch { return fallback; }
  }

  function mergeDaily(localDaily, remoteDocs) {
    const merged = { ...(localDaily || {}) };
    remoteDocs.forEach(doc => {
      if (!doc.studentId || !doc.date) return;
      if (!merged[doc.studentId]) merged[doc.studentId] = {};
      merged[doc.studentId][doc.date] = doc.wordIds;
    });
    return merged;
  }

  function dedupeByRecordId(items) {
    const map = {};
    items.forEach(item => {
      const key = item.recordId || `${item.studentId}_${item.ts || item.date || Math.random()}`;
      if (!map[key] || Number(map[key].ts || 0) <= Number(item.ts || 0)) {
        map[key] = item;
      }
    });
    return Object.values(map);
  }

  function scopeKeyForRanking(options = {}) {
    if (options.cycleKey) return { scopeType: "week", scopeKey: options.cycleKey };
    if (options.season) return { scopeType: "season", scopeKey: String(options.season) };
    return { scopeType: "season", scopeKey: String(getSeason().number) };
  }

  function rankingDocId(scopeType, scopeKey, classroom, studentId) {
    return [scopeType, scopeKey, classroom || "all", studentId].join("__");
  }

  function toRankingRow(data) {
    return {
      studentId: String(data.studentId || ""),
      classroom: data.classroom || "",
      total: Number(data.total || 0),
      count: Number(data.count || 0),
      bestScore: Number(data.bestScore || 0),
      scopeType: data.scopeType || "",
      scopeKey: String(data.scopeKey || "")
    };
  }

  function getCacheEntry(bucket, key) {
    const item = bucket.get(key);
    if (!item) return null;
    if (Date.now() - item.ts > CACHE_TTL_MS) {
      bucket.delete(key);
      return null;
    }
    return item.value;
  }

  function setCacheEntry(bucket, key, value) {
    bucket.set(key, { value, ts: Date.now() });
    return value;
  }

  function clearAggregateCaches() {
    memCache.leaderboard.clear();
    memCache.winners.clear();
    memCache.seasonStats.clear();
  }

  async function fetchRemoteState(studentId = "") {
    const remote = {
      dailyDocs: [],
      reviews: [],
      tests: [],
      rewards: [],
      season: getDefaultSeason()
    };

    if (window.fbDB) {
      const jobs = [
        withTimeout(
          window.fbDB.collection(REMOTE.system).doc("season").get(),
          FIRESTORE_READ_TIMEOUT_MS,
          "progress season read"
        )
      ];
      if (studentId) {
        jobs.push(
          withTimeout(
            window.fbDB.collection(REMOTE.daily).where("studentId", "==", studentId).get(),
            FIRESTORE_READ_TIMEOUT_MS,
            "progress daily read"
          ),
          withTimeout(
            window.fbDB.collection(REMOTE.tests).where("studentId", "==", studentId).get(),
            FIRESTORE_READ_TIMEOUT_MS,
            "progress tests read"
          ),
          withTimeout(
            window.fbDB.collection(REMOTE.reviews).where("studentId", "==", studentId).get(),
            FIRESTORE_READ_TIMEOUT_MS,
            "progress reviews read"
          ),
          withTimeout(
            window.fbDB.collection(REMOTE.rewards).where("studentId", "==", studentId).get(),
            FIRESTORE_READ_TIMEOUT_MS,
            "progress rewards read"
          )
        );
      }
      const [seasonSnap, dailySnap, testsSnap, reviewsSnap, rewardsSnap] = await Promise.all(jobs);
      remote.dailyDocs = (dailySnap?.docs || []).map(d => normalizeDailyDoc(d.data()));
      remote.tests = (testsSnap?.docs || []).map(d => normalizeTestDoc(d.data()));
      remote.reviews = (reviewsSnap?.docs || []).map(d => normalizeReviewDoc(d.data()));
      remote.rewards = (rewardsSnap?.docs || []).map(d => normalizeRewardDoc(d.data()));
      if (seasonSnap.exists) remote.season = normalizeSeasonDoc(seasonSnap.data());
    } else {
      const [dailyRows, reviewRows, testRows, rewardRows, seasonRows] = await Promise.all([
        GSheets.read("DailyTraining"),
        GSheets.read("DailyReviews"),
        GSheets.read("TestScores"),
        GSheets.read("Rewards"),
        GSheets.read("Seasons")
      ]);
      const filterByStudent = (row) => !studentId || String(row.studentId || "") === String(studentId);
      remote.dailyDocs = dailyRows.filter(filterByStudent).map(normalizeDailyDoc);
      remote.reviews = reviewRows.filter(filterByStudent).map(normalizeReviewDoc);
      remote.tests = testRows.filter(filterByStudent).map(normalizeTestDoc);
      remote.rewards = rewardRows.filter(filterByStudent).map(normalizeRewardDoc);
      if (seasonRows.length) {
        remote.season = normalizeSeasonDoc(
          seasonRows.sort((a, b) => Number(b.number || 0) - Number(a.number || 0))[0]
        );
      }
    }

    return remote;
  }

  async function init() {
    if (ready) return loadLocalState();
    if (initPromise) return initPromise;

    initPromise = (async () => {
      const local = loadLocalState();
      try {
        const remote = await fetchRemoteState(getBootstrapStudentId());
        const state = {
          daily: mergeDaily(local.daily, remote.dailyDocs),
          reviews: dedupeByRecordId([...(local.reviews || []), ...remote.reviews]).sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0)),
          tests: dedupeByRecordId([...(local.tests || []), ...remote.tests]).sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0)),
          rewards: dedupeByRecordId([...(local.rewards || []), ...remote.rewards]).sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0)),
          season: normalizeSeasonDoc(remote.season || local.season),
        };
        saveLocalState(state);
        ready = true;
        return state;
      } catch (error) {
        console.warn("[progress] init fallback to local cache", error);
        ready = true;
        saveLocalState(local);
        return local;
      }
    })();

    return initPromise;
  }

  async function persistDailyRecord(record) {
    const doc = {
      ...record,
      wordIds: record.wordIds,
      updatedAt: new Date().toISOString(),
      createdAt: record.createdAt || new Date().toISOString()
    };
    if (window.fbDB) {
      await window.fbDB.collection(REMOTE.daily).doc(doc.recordId).set(doc, { merge: true });
    }
    if (GSheets.shouldMirror()) {
      GSheets.enqueueUpsert("DailyTraining", { field: "recordId", value: doc.recordId }, { ...doc, wordIds: doc.wordIds.join(",") }).catch(() => {});
    }
  }

  async function updateRankingAggregate(entry, scopeType, scopeKey) {
    if (!window.fbDB) return;
    const docId = rankingDocId(scopeType, scopeKey, entry.classroom, entry.studentId);
    const docRef = window.fbDB.collection(REMOTE.rankings).doc(docId);
    await window.fbDB.runTransaction(async (transaction) => {
      const snap = await transaction.get(docRef);
      const current = snap.exists ? snap.data() : {};
      const total = Number(current.total || 0) + Number(entry.score || 0);
      const count = Number(current.count || 0) + 1;
      const bestScore = Math.max(Number(current.bestScore || 0), Number(entry.score || 0));
      transaction.set(docRef, {
        studentId: entry.studentId,
        classroom: entry.classroom,
        scopeType,
        scopeKey: String(scopeKey),
        total,
        count,
        bestScore,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    });
  }

  async function persistTestRecord(entry) {
    if (window.fbDB) {
      await Promise.all([
        window.fbDB.collection(REMOTE.tests).doc(entry.recordId).set(entry, { merge: true }),
        updateRankingAggregate(entry, "week", entry.cycleKey),
        updateRankingAggregate(entry, "season", entry.season)
      ]);
    }
    if (GSheets.shouldMirror()) {
      GSheets.enqueueUpsert("TestScores", { field: "recordId", value: entry.recordId }, { ...entry, details: JSON.stringify(entry.details || []) }).catch(() => {});
    }
    clearAggregateCaches();
  }

  async function persistRewardRecord(reward) {
    if (window.fbDB) {
      await window.fbDB.collection(REMOTE.rewards).doc(reward.recordId).set(reward, { merge: true });
    }
    if (GSheets.shouldMirror()) {
      GSheets.enqueueUpsert("Rewards", { field: "recordId", value: reward.recordId }, reward).catch(() => {});
    }
  }

  async function persistReviewRecord(review) {
    if (window.fbDB) {
      await window.fbDB.collection(REMOTE.reviews).doc(review.recordId).set(review, { merge: true });
    }
    if (GSheets.shouldMirror()) {
      GSheets.enqueueUpsert("DailyReviews", { field: "recordId", value: review.recordId }, { ...review, details: JSON.stringify(review.details || []) }).catch(() => {});
    }
  }

  async function persistSeason(season) {
    const payload = normalizeSeasonDoc(season);
    if (window.fbDB) {
      await window.fbDB.collection(REMOTE.system).doc("season").set(payload, { merge: true });
    }
    if (GSheets.shouldMirror()) {
      GSheets.enqueueUpsert("Seasons", { field: "season", value: payload.number }, { ...payload, weekKeys: payload.weekKeys.join(",") }).catch(() => {});
    }
    clearAggregateCaches();
  }

  // ───────── Adaptive learning engine ─────────
  // หลักการ:
  // 1. คำนวณ mastery ของแต่ละ HSK level จากผลแบบฝึกหลังเรียนล่าสุด (rolling window)
  // 2. ถ้า mastery(L) ≥ threshold และมี samples พอ → ปลดล็อก L+1
  // 3. แจกคำแต่ละวันตาม weight ที่คำนวณจาก mastery (ระดับใหม่เริ่มจากสัดส่วนเล็ก ค่อยเพิ่ม)
  // 4. ระดับที่ mastery ตก (< 0.5) จะถูกเพิ่ม weight ทบทวนอัตโนมัติ
  const ADAPTIVE_DEFAULTS = {
    enabled: true,
    unlockThreshold: 0.7,    // ต้อง mastery ≥ 70% เพื่อปลดล็อกระดับถัดไป
    minSamples: 5,           // ต้องมีสถิติอย่างน้อย 5 ข้อ
    recentDays: 7,
    baseLevelMinShare: 0.4,
    newLevelInitialShare: 0.2,
    maxLevel: 3
  };

  function getAdaptiveConfig() {
    const game = window.SystemSettings?.getGame ? window.SystemSettings.getGame() : window.APP_CONFIG.game;
    return { ...ADAPTIVE_DEFAULTS, ...((game && game.adaptive) || {}) };
  }

  function lookupWordLevel(detail) {
    if (typeof detail.level === "number") return detail.level;
    const word = (window.ALL_VOCAB || []).find(w => w.hanzi === detail.hanzi);
    return word ? word.level : null;
  }

  function computeMasteryByLevel(reviews, recentDays) {
    const cutoff = Date.now() - Math.max(1, recentDays) * 24 * 60 * 60 * 1000;
    const recent = reviews.filter(r => Number(r.ts || 0) >= cutoff);
    const stats = { 1: { c: 0, t: 0 }, 2: { c: 0, t: 0 }, 3: { c: 0, t: 0 } };
    recent.forEach(r => {
      const reviewLevel = Number(r.level) || null;
      const details = Array.isArray(r.details) ? r.details : [];
      details.forEach(d => {
        const lvl = lookupWordLevel(d) || reviewLevel;
        if (!stats[lvl]) return;
        stats[lvl].t += 1;
        if (d.correct) stats[lvl].c += 1;
      });
    });
    const mastery = {};
    const samples = {};
    for (const [lvl, s] of Object.entries(stats)) {
      mastery[Number(lvl)] = s.t ? s.c / s.t : 0;
      samples[Number(lvl)] = s.t;
    }
    return { mastery, samples };
  }

  function distributeByWeights(weights, total) {
    const lvls = Object.keys(weights).map(Number).sort((a, b) => a - b);
    if (lvls.length === 0) return {};
    if (lvls.length === 1) return { [lvls[0]]: total };

    const sum = lvls.reduce((s, lvl) => s + (weights[lvl] || 0), 0);
    if (sum <= 0) return { [lvls[0]]: total };

    const raw = {};
    lvls.forEach(lvl => { raw[lvl] = (weights[lvl] / sum) * total; });

    const counts = {};
    let assigned = 0;
    lvls.forEach(lvl => {
      counts[lvl] = Math.max(1, Math.floor(raw[lvl]));
      assigned += counts[lvl];
    });

    let remaining = total - assigned;
    if (remaining > 0) {
      const sorted = lvls.slice().sort((a, b) => (raw[b] - counts[b]) - (raw[a] - counts[a]));
      let i = 0;
      while (remaining > 0) {
        counts[sorted[i % sorted.length]] += 1;
        remaining -= 1;
        i += 1;
      }
    } else if (remaining < 0) {
      const sorted = lvls.slice().sort((a, b) => (weights[a] || 0) - (weights[b] || 0));
      let i = 0;
      let safety = 60;
      while (remaining < 0 && safety > 0) {
        const lvl = sorted[i % sorted.length];
        if (counts[lvl] > 1) {
          counts[lvl] -= 1;
          remaining += 1;
        }
        i += 1;
        safety -= 1;
      }
    }
    return counts;
  }

  function computeAdaptivePlan(studentId, baseLevel) {
    const config = getAdaptiveConfig();
    const baseLevelNum = Math.max(1, Math.min(config.maxLevel, Number(baseLevel || 1)));
    const total = cfg.wordsPerDay || 5;

    if (!config.enabled) {
      return {
        enabled: false,
        baseLevel: baseLevelNum,
        mastery: {}, samples: {},
        unlocked: [baseLevelNum],
        weights: { [baseLevelNum]: 1 },
        distribution: { [baseLevelNum]: total },
        config
      };
    }

    const reviews = getDailyReviews(studentId);
    const { mastery, samples } = computeMasteryByLevel(reviews, config.recentDays);

    // Sequential unlock — ต้องผ่านทีละขั้น
    const unlocked = [baseLevelNum];
    for (let lvl = baseLevelNum; lvl < config.maxLevel; lvl++) {
      const m = mastery[lvl] || 0;
      const s = samples[lvl] || 0;
      if (m >= config.unlockThreshold && s >= config.minSamples) {
        unlocked.push(lvl + 1);
      } else {
        break;
      }
    }

    const weights = {};
    unlocked.forEach((lvl, idx) => {
      const m = mastery[lvl] || 0;
      if (idx === 0) {
        weights[lvl] = Math.max(config.baseLevelMinShare, 1 - m * 0.5);
      } else {
        const newShare = Math.max(config.newLevelInitialShare, Math.min(0.5, m + 0.1));
        weights[lvl] = newShare;
      }
    });

    // ระดับที่ mastery ตก (< 0.5) → เพิ่ม weight เพื่อทบทวน
    unlocked.forEach((lvl) => {
      const m = mastery[lvl];
      if (typeof m === "number" && samples[lvl] >= 3 && m < 0.5) {
        weights[lvl] = Math.max(weights[lvl], 0.6);
      }
    });

    const distribution = distributeByWeights(weights, total);

    return {
      enabled: true,
      baseLevel: baseLevelNum,
      mastery, samples,
      unlocked, weights, distribution, config
    };
  }

  function getTodayWords(studentId, level) {
    if (U.getDayOfWeek(new Date()) > cfg.daysPerWeek) return [];
    const today = U.toISO();
    const all = U.ls.get(KEYS.daily, {});
    const userMap = all[studentId] || {};
    if (userMap[today]) {
      return userMap[today].map(id => window.ALL_VOCAB.find(w => w.id === id)).filter(Boolean);
    }

    const cycle = getCurrentTrainingCycle(new Date());
    const usedThisCycle = new Set();
    cycle.dates.forEach(key => (userMap[key] || []).forEach(id => usedThisCycle.add(id)));

    const plan = computeAdaptivePlan(studentId, level);
    const baseSeed = parseInt(studentId, 10) + parseInt(today.replace(/-/g, ""), 10);

    const collected = [];
    Object.entries(plan.distribution).forEach(([lvlStr, count]) => {
      if (count <= 0) return;
      const lvl = Number(lvlStr);
      const fresh = window.ALL_VOCAB.filter(w => w.level === lvl && !usedThisCycle.has(w.id));
      const recycled = window.ALL_VOCAB.filter(w => w.level === lvl && usedThisCycle.has(w.id));
      const source = fresh.length >= count ? fresh : [...fresh, ...recycled];
      const picked = U.seededShuffle(source, baseSeed + lvl * 1000).slice(0, count);
      collected.push(...picked);
    });

    // เผื่อกรณี distribution ขาดหายเพราะคำในระดับนั้นหมด — เติมจาก fallback pool
    if (collected.length < cfg.wordsPerDay) {
      const have = new Set(collected.map(w => w.id));
      const fallback = window.ALL_VOCAB.filter(w => plan.unlocked.includes(w.level) && !have.has(w.id));
      const need = cfg.wordsPerDay - collected.length;
      collected.push(...U.seededShuffle(fallback, baseSeed + 7777).slice(0, need));
    }

    const todayWords = U.seededShuffle(collected, baseSeed + 99);

    userMap[today] = todayWords.map(w => w.id);
    all[studentId] = userMap;
    U.ls.set(KEYS.daily, all);

    persistDailyRecord({
      recordId: `${studentId}_${today}`,
      studentId,
      date: today,
      cycleKey: cycle.key,
      level: level || "",
      wordIds: userMap[today]
    }).catch(() => {});

    return todayWords;
  }

  function getAdaptiveSnapshot(studentId, baseLevel) {
    return computeAdaptivePlan(studentId, baseLevel);
  }

  function markTodayComplete(studentId) {
    const u = AuthService.current();
    if (!u) return;
    const today = U.toISO();
    if (u.lastTrainingDate === today) return;

    const yesterday = U.toISO(U.addDays(new Date(), -1));
    const newStreak = u.lastTrainingDate === yesterday ? (u.streak || 0) + 1 : 1;

    AuthService.updateUser(studentId, {
      lastTrainingDate: today,
      streak: newStreak,
      xp: (u.xp || 0) + cfg.xpPerTrainingComplete,
      coins: (u.coins || 0) + cfg.trainingCompleteCoins
    });
  }

  function getWordsFromCycle(studentId, cycle = getCurrentTrainingCycle()) {
    const all = U.ls.get(KEYS.daily, {});
    const userMap = all[studentId] || {};
    const ids = new Set();
    cycle.dates.forEach(key => (userMap[key] || []).forEach(id => ids.add(id)));
    return Array.from(ids).map(id => window.ALL_VOCAB.find(w => w.id === id)).filter(Boolean);
  }

  function getLearnedWordsUntil(studentId, endDate = new Date()) {
    const all = U.ls.get(KEYS.daily, {});
    const userMap = all[studentId] || {};
    const limit = typeof endDate === "string" ? endDate : U.toISO(endDate);
    const ids = new Set();
    Object.keys(userMap)
      .filter(date => date <= limit)
      .sort()
      .forEach(date => (userMap[date] || []).forEach(id => ids.add(id)));
    return Array.from(ids).map(id => window.ALL_VOCAB.find(w => w.id === id)).filter(Boolean);
  }

  function getWeekTrainedWords(studentId, cycle) {
    return getWordsFromCycle(studentId, cycle || getCurrentTrainingCycle());
  }

  function getDailyReviews(studentId = "") {
    const all = U.ls.get(KEYS.reviews, []);
    const filtered = studentId ? all.filter(review => review.studentId === studentId) : all;
    return filtered.sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0));
  }

  function recordDailyReview({ studentId, level, score, total, accuracy, details }) {
    const today = U.toISO();
    const cycle = getCurrentTrainingCycle();
    const all = U.ls.get(KEYS.reviews, []).filter(review => !(review.studentId === studentId && review.date === today));
    const entry = normalizeReviewDoc({
      recordId: `${studentId}_${today}_review`,
      studentId,
      date: today,
      cycleKey: cycle.key,
      level: Number(level || 1),
      score: Number(score || 0),
      total: Number(total || 0),
      accuracy: Number(accuracy || 0),
      details: Array.isArray(details) ? details : [],
      ts: Date.now()
    });
    all.push(entry);
    U.ls.set(KEYS.reviews, all);
    persistReviewRecord(entry).catch(() => {});
    return entry;
  }

  function getDailyReviewSummary(studentId, date = new Date()) {
    const today = U.toISO(date);
    const cycle = getCurrentTrainingCycle(date);
    const reviews = getDailyReviews(studentId);
    const cycleReviews = reviews.filter(review => review.cycleKey === cycle.key);
    const todayReview = cycleReviews.find(review => review.date === today) || null;
    const avgAccuracy = cycleReviews.length
      ? Math.round(cycleReviews.reduce((sum, review) => sum + Number(review.accuracy || 0), 0) / cycleReviews.length)
      : 0;
    return {
      cycle,
      today: todayReview,
      avgAccuracy,
      completedDays: cycleReviews.length,
      recent: cycleReviews.slice(0, 5)
    };
  }

  function getDailyReviewSkillSummary(studentId, date = new Date()) {
    const cycle = getCurrentTrainingCycle(date);
    const reviews = getDailyReviews(studentId).filter(review => review.cycleKey === cycle.key);
    const skills = ["read", "listen", "speak", "write"].map((type) => {
      const details = reviews.flatMap(review => Array.isArray(review.details) ? review.details.filter(detail => detail.type === type) : []);
      const correct = details.filter(detail => detail.correct).length;
      const total = details.length;
      return {
        type,
        label: ({ read: "อ่าน", listen: "ฟัง", speak: "พูด", write: "เขียน" })[type] || type,
        correct,
        total,
        accuracy: total ? Math.round((correct / total) * 100) : 0
      };
    });
    const timeline = cycle.dates.map((day) => {
      const review = reviews.find(item => item.date === day);
      return {
        date: day,
        review,
        accuracy: Number(review?.accuracy || 0),
        score: Number(review?.score || 0),
        total: Number(review?.total || 0)
      };
    });
    return {
      cycle,
      skills,
      timeline,
      averageAccuracy: skills.some(skill => skill.total > 0)
        ? Math.round(skills.reduce((sum, skill) => sum + skill.accuracy, 0) / skills.length)
        : 0
    };
  }

  function buildReviewClassroomStats(reviews, users, cycleKey = getCurrentTrainingCycle().key) {
    const skillTypes = ["read", "listen", "speak", "write"];
    const userMap = Object.fromEntries((users || []).map(user => [String(user.studentId || ""), user]));
    const filtered = reviews.filter(review => review.cycleKey === cycleKey);
    const byStudent = {};

    filtered.forEach((review) => {
      const user = userMap[review.studentId];
      if (!user) return;
      if (!byStudent[review.studentId]) {
        byStudent[review.studentId] = {
          studentId: review.studentId,
          fullname: user.fullname || review.studentId,
          classroom: user.classroom || "",
          attempts: 0,
          avgAccuracy: 0,
          totalScore: 0,
          totalQuestions: 0,
          skills: Object.fromEntries(skillTypes.map(type => [type, { correct: 0, total: 0, accuracy: 0 }]))
        };
      }
      const row = byStudent[review.studentId];
      row.attempts += 1;
      row.totalScore += Number(review.score || 0);
      row.totalQuestions += Number(review.total || 0);
      (Array.isArray(review.details) ? review.details : []).forEach((detail) => {
        if (!row.skills[detail.type]) return;
        row.skills[detail.type].total += 1;
        if (detail.correct) row.skills[detail.type].correct += 1;
      });
    });

    const rows = Object.values(byStudent).map((row) => {
      skillTypes.forEach((type) => {
        const skill = row.skills[type];
        skill.accuracy = skill.total ? Math.round((skill.correct / skill.total) * 100) : 0;
      });
      row.avgAccuracy = row.totalQuestions ? Math.round((row.totalScore / row.totalQuestions) * 100) : 0;
      return row;
    });

    const classrooms = {};
    rows.forEach((row) => {
      if (!classrooms[row.classroom]) {
        classrooms[row.classroom] = {
          classroom: row.classroom,
          students: 0,
          attempts: 0,
          avgAccuracy: 0,
          skills: Object.fromEntries(skillTypes.map(type => [type, { correct: 0, total: 0, accuracy: 0 }]))
        };
      }
      const group = classrooms[row.classroom];
      group.students += 1;
      group.attempts += row.attempts;
      skillTypes.forEach((type) => {
        group.skills[type].correct += row.skills[type].correct;
        group.skills[type].total += row.skills[type].total;
      });
    });

    Object.values(classrooms).forEach((group) => {
      const accuracies = skillTypes.map((type) => {
        const skill = group.skills[type];
        skill.accuracy = skill.total ? Math.round((skill.correct / skill.total) * 100) : 0;
        return skill.accuracy;
      });
      group.avgAccuracy = accuracies.some(value => value > 0)
        ? Math.round(accuracies.reduce((sum, value) => sum + value, 0) / accuracies.length)
        : 0;
    });

    return {
      cycleKey,
      classrooms: Object.values(classrooms).sort((a, b) => a.classroom.localeCompare(b.classroom)),
      students: rows.sort((a, b) => (b.avgAccuracy - a.avgAccuracy) || a.studentId.localeCompare(b.studentId))
    };
  }

  function getTestWords(studentId, date = new Date()) {
    const cycle = getTargetTestCycle(date);
    return getLearnedWordsUntil(studentId, cycle.friday);
  }

  function hasCompletedTrainingToday(studentId) {
    const all = U.ls.get(KEYS.daily, {});
    return !!((all[studentId] || {})[U.toISO()]);
  }

  function getTrainingSummary(studentId, date = new Date()) {
    const cycle = getCurrentTrainingCycle(date);
    const all = U.ls.get(KEYS.daily, {});
    const userMap = all[studentId] || {};
    const completedDays = cycle.dates.filter(day => (userMap[day] || []).length > 0).length;
    const uniqueWords = getWordsFromCycle(studentId, cycle);
    return {
      cycle,
      completedDays,
      totalDays: cfg.daysPerWeek,
      totalWords: uniqueWords.length,
      progressPercent: Math.min(100, (completedDays / cfg.daysPerWeek) * 100),
      trainedToday: !!userMap[U.toISO()]
    };
  }

  function getTestCycleSummary(studentId, date = new Date()) {
    const cycle = getTargetTestCycle(date);
    const trainedWords = getLearnedWordsUntil(studentId, cycle.friday);
    return {
      cycle,
      totalWords: trainedWords.length,
      isReady: trainedWords.length > 0
    };
  }

  function getSeason() {
    return normalizeSeasonDoc(U.ls.get(KEYS.season, getDefaultSeason()));
  }

  function ensureSeasonForWeek(weekKey) {
    const season = getSeason();
    if (!season.weekKeys.includes(weekKey)) {
      if (season.weekKeys.length >= cfg.seasonRounds) {
        season.number += 1;
        season.startedAt = U.toISO();
        season.weekKeys = [];
      }
      season.weekKeys.push(weekKey);
      season.roundsCompleted = season.weekKeys.length;
      season.updatedAt = new Date().toISOString();
      U.ls.set(KEYS.season, season);
      persistSeason(season).catch(() => {});
    }
    return season;
  }

  function recordTestScore({ studentId, classroom, score, total, details, cycleKey }) {
    const all = U.ls.get(KEYS.tests, []);
    const testCycle = getTargetTestCycle();
    const wk = cycleKey || testCycle.key;
    const season = ensureSeasonForWeek(wk);
    const ts = Date.now();
    const entry = {
      recordId: `${studentId}_${wk}_${ts}`,
      studentId,
      classroom,
      score,
      total,
      weekKey: weekKeyFor(new Date()),
      cycleKey: wk,
      ts,
      season: season.number,
      seasonRound: season.weekKeys.indexOf(wk) + 1,
      details
    };
    all.push(entry);
    U.ls.set(KEYS.tests, dedupeByRecordId(all));
    persistTestRecord(entry).catch(() => {});
    return entry;
  }

  function hasTakenThisWeek(studentId, date = new Date()) {
    const all = U.ls.get(KEYS.tests, []);
    const cycleKey = getTargetTestCycle(date).key;
    return all.some(t => t.studentId === studentId && t.cycleKey === cycleKey);
  }

  function getMyTests(studentId) {
    return U.ls.get(KEYS.tests, [])
      .filter(t => t.studentId === studentId)
      .sort((a, b) => b.ts - a.ts);
  }

  function getLeaderboard({ classroom, cycleKey, season, top = 100 } = {}) {
    let all = U.ls.get(KEYS.tests, []);
    if (classroom) all = all.filter(t => t.classroom === classroom);
    if (cycleKey) all = all.filter(t => t.cycleKey === cycleKey);
    if (season) all = all.filter(t => t.season === season);

    const map = {};
    all.forEach(t => {
      if (!map[t.studentId]) {
        map[t.studentId] = { studentId: t.studentId, classroom: t.classroom, total: 0, count: 0, bestScore: 0 };
      }
      map[t.studentId].total += Number(t.score || 0);
      map[t.studentId].count += 1;
      map[t.studentId].bestScore = Math.max(map[t.studentId].bestScore, Number(t.score || 0));
    });

    return Object.values(map)
      .sort((a, b) => (b.total - a.total) || (b.bestScore - a.bestScore) || a.studentId.localeCompare(b.studentId))
      .slice(0, top);
  }

  function getWeeklyWinners(cycleKey = getTargetTestCycle().key) {
    return window.APP_CONFIG.classes
      .map(classroom => {
        const winner = getLeaderboard({ classroom, cycleKey, top: 1 })[0];
        return winner ? { classroom, ...winner, cycleKey } : null;
      })
      .filter(Boolean);
  }

  function getStudentSeasonStats(studentId, classroom) {
    const season = getSeason();
    const board = getLeaderboard({ classroom, season: season.number });
    const me = board.findIndex(row => row.studentId === studentId);
    const myTests = U.ls.get(KEYS.tests, []).filter(t => t.studentId === studentId && t.season === season.number);
    return {
      season,
      rank: me >= 0 ? me + 1 : null,
      totalScore: myTests.reduce((sum, t) => sum + Number(t.score || 0), 0),
      testCount: myTests.length,
      remainingRounds: Math.max(0, cfg.seasonRounds - season.roundsCompleted)
    };
  }

  async function fetchLeaderboard(options = {}) {
    const { classroom, top = 100 } = options;
    const scope = scopeKeyForRanking(options);
    const cacheKey = JSON.stringify({ classroom, top, scope });
    const cached = getCacheEntry(memCache.leaderboard, cacheKey);
    if (cached) return cached;
    if (!window.fbDB) return getLeaderboard({ ...options, top });
    if (!classroom) return [];
    try {
      const snap = await window.fbDB.collection(REMOTE.rankings)
        .where("scopeType", "==", scope.scopeType)
        .where("scopeKey", "==", String(scope.scopeKey))
        .where("classroom", "==", classroom)
        .get();
      return setCacheEntry(memCache.leaderboard, cacheKey, snap.docs
        .map(doc => toRankingRow(doc.data()))
        .sort((a, b) => (b.total - a.total) || (b.bestScore - a.bestScore) || a.studentId.localeCompare(b.studentId))
        .slice(0, top));
    } catch (error) {
      console.warn("[progress] fetchLeaderboard fallback", error.message);
      return getLeaderboard({ ...options, top });
    }
  }

  async function fetchWeeklyWinners(cycleKey = getTargetTestCycle().key) {
    const cached = getCacheEntry(memCache.winners, cycleKey);
    if (cached) return cached;
    const winners = await Promise.all(window.APP_CONFIG.classes.map(async (classroom) => {
      const rows = await fetchLeaderboard({ classroom, cycleKey, top: 1 });
      return rows[0] ? { classroom, ...rows[0], cycleKey } : null;
    }));
    return setCacheEntry(memCache.winners, cycleKey, winners.filter(Boolean));
  }

  async function fetchStudentSeasonStats(studentId, classroom) {
    const season = getSeason();
    const cacheKey = `${studentId}__${classroom}__${season.number}`;
    const cached = getCacheEntry(memCache.seasonStats, cacheKey);
    if (cached) return cached;
    const myTests = getMyTests(studentId).filter(t => t.season === season.number);
    const stats = {
      season,
      rank: null,
      totalScore: myTests.reduce((sum, t) => sum + Number(t.score || 0), 0),
      testCount: myTests.length,
      remainingRounds: Math.max(0, cfg.seasonRounds - season.roundsCompleted)
    };
    const board = await fetchLeaderboard({ classroom, season: season.number, top: 120 });
    const rankIndex = board.findIndex(row => row.studentId === studentId);
    if (rankIndex >= 0) stats.rank = rankIndex + 1;
    return setCacheEntry(memCache.seasonStats, cacheKey, stats);
  }

  async function fetchAllTestScores() {
    if (!window.fbDB) return U.ls.get(KEYS.tests, []);
    try {
      const snap = await window.fbDB.collection(REMOTE.tests).get();
      return snap.docs.map(doc => normalizeTestDoc(doc.data())).sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0));
    } catch (error) {
      console.warn("[progress] fetchAllTestScores fallback", error.message);
      return U.ls.get(KEYS.tests, []);
    }
  }

  async function fetchAllDailyReviews() {
    if (!window.fbDB) return getDailyReviews();
    try {
      const snap = await window.fbDB.collection(REMOTE.reviews).get();
      return snap.docs.map(doc => normalizeReviewDoc(doc.data())).sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0));
    } catch (error) {
      console.warn("[progress] fetchAllDailyReviews fallback", error.message);
      return getDailyReviews();
    }
  }

  function claimReward(studentId, rewardId, meta = {}) {
    const all = U.ls.get(KEYS.rewards, []);
    const reward = {
      recordId: `${studentId}_${rewardId}_${Date.now()}`,
      studentId,
      rewardId,
      weekKey: meta.weekKey || getTargetTestCycle().key,
      classroom: meta.classroom || "",
      season: meta.season || getSeason().number,
      note: meta.note || "",
      ts: Date.now()
    };
    all.push(reward);
    U.ls.set(KEYS.rewards, dedupeByRecordId(all));
    persistRewardRecord(reward).catch(() => {});
    return reward;
  }

  function myRewards(studentId) {
    return U.ls.get(KEYS.rewards, []).filter(r => r.studentId === studentId);
  }

  function isTestDay(date = new Date()) {
    return U.getDayOfWeek(date) === cfg.testDayOfWeek;
  }

  window.Progress = {
    init,
    isReady: () => ready,
    getTodayWords,
    getAdaptiveSnapshot,
    markTodayComplete,
    getWeekTrainedWords,
    getTestWords,
    getTrainingSummary,
    recordDailyReview,
    getDailyReviewSummary,
    getDailyReviewSkillSummary,
    getDailyReviews,
    buildReviewClassroomStats,
    getTestCycleSummary,
    hasCompletedTrainingToday,
    recordTestScore,
    hasTakenThisWeek,
    getMyTests,
    getLeaderboard,
    fetchLeaderboard,
    getWeeklyWinners,
    fetchWeeklyWinners,
    getStudentSeasonStats,
    fetchStudentSeasonStats,
    fetchAllTestScores,
    fetchAllDailyReviews,
    getSeason,
    claimReward,
    myRewards,
    isTestDay,
    weekKeyFor,
    getCurrentTrainingCycle,
    getPreviousTrainingCycle,
    getTargetTestCycle
  };
  console.log("[progress] service ready");
})();
