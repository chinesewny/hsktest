/* ===========================================================
 * Utility helpers shared across the app
 * =========================================================== */
(function () {
  // ────────────────────────── Date helpers ──────────────────────────
  const toISO = (d = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // คืนค่าเลขวันที่ (1 = จันทร์ ... 7 = อาทิตย์)
  const getDayOfWeek = (d = new Date()) => {
    const w = d.getDay(); // 0 = Sun ... 6 = Sat
    return w === 0 ? 7 : w;
  };

  // คำนวณเลขสัปดาห์ของปี
  const getWeekNumber = (d = new Date()) => {
    const onejan = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  };

  // ดึงวันจันทร์ของสัปดาห์นั้น
  const getMondayOfWeek = (d = new Date()) => {
    const day = d.getDay() || 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - day + 1);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const addDays = (d, days) => {
    const next = new Date(d);
    next.setDate(next.getDate() + days);
    return next;
  };

  // ────────────────────────── Random helpers ──────────────────────────
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const sample = (arr, n) => shuffle(arr).slice(0, n);

  // สุ่มแบบ deterministic ตาม seed (เพื่อให้ทุกคนได้คำเดียวกันในวันเดียวกัน)
  const seededShuffle = (arr, seed) => {
    const a = [...arr];
    let s = seed;
    const rand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // ────────────────────────── TTS (อ่านภาษาจีน เสียงผู้หญิง) ──────────────────────────
  let cachedVoices = [];
  const refreshVoices = () => {
    if (!("speechSynthesis" in window)) return [];
    const list = window.speechSynthesis.getVoices() || [];
    if (list.length) cachedVoices = list;
    return cachedVoices;
  };
  if ("speechSynthesis" in window) {
    refreshVoices();
    if (typeof window.speechSynthesis.addEventListener === "function") {
      window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
    } else {
      window.speechSynthesis.onvoiceschanged = refreshVoices;
    }
  }

  // คีย์เวิร์ดของชื่อ voice ที่เป็นเสียงหญิงในระบบต่าง ๆ (macOS / iOS / Edge / Google / Microsoft)
  const FEMALE_ZH_VOICE_HINTS = [
    "tingting", "ting-ting", "mei-jia", "meijia", "sinji",
    "huihui", "yaoyao", "kangkang", "hanhan", "zhiwei", "yunxia",
    "xiaoxiao", "xiaoyi", "xiaomeng", "xiaoshuang", "xiaohan",
    "xiaomo", "xiaoxuan", "xiaorui", "xiaoqiu", "xiaochen",
    "female", "woman", "girl", "女"
  ];
  const MALE_ZH_VOICE_HINTS = ["male", "man", "yunyang", "yunjian", "yunxi", "yunhao", "yunfeng", "kangkang"];

  const pickFemaleZhVoice = () => {
    const voices = cachedVoices.length ? cachedVoices : refreshVoices();
    const zhVoices = voices.filter(v => /^zh/i.test(v.lang || ""));
    if (!zhVoices.length) return null;
    const named = zhVoices.find(v => {
      const name = (v.name || "").toLowerCase();
      return FEMALE_ZH_VOICE_HINTS.some(hint => name.includes(hint));
    });
    if (named) return named;
    const notMale = zhVoices.find(v => {
      const name = (v.name || "").toLowerCase();
      return !MALE_ZH_VOICE_HINTS.some(hint => name.includes(hint));
    });
    if (notMale) return notMale;
    const cn = zhVoices.find(v => /zh-cn/i.test(v.lang || ""));
    return cn || zhVoices[0];
  };

  const speak = (text, lang = "zh-CN", rate = 0.85) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    u.pitch = 1.08;
    const voice = pickFemaleZhVoice();
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  };

  // ────────────────────────── String similarity ──────────────────────────
  const levenshtein = (a = "", b = "") => {
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
        else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  };

  const stringSimilarity = (a, b) => {
    const x = String(a || ""), y = String(b || "");
    if (!x || !y) return 0;
    if (x === y) return 1;
    const maxLen = Math.max(x.length, y.length);
    return Math.max(0, 1 - levenshtein(x, y) / maxLen);
  };

  // ประเมินความแม่นยำการออกเสียง: เทียบทั้ง hanzi และ pinyin แล้วเลือกค่ามากกว่า
  const calcSpeechAccuracy = (transcript, expectedHanzi, expectedPinyin) => {
    if (!transcript) return 0;
    const stripPunct = s => String(s || "").replace(/[\s​.,!?;:()\[\]{}'"\-]/g, "");
    // ลบเครื่องหมายวรรณยุกต์ pinyin (ā á ǎ à ē é ě è ī í ǐ ì ō ó ǒ ò ū ú ǔ ù ǖ ǘ ǚ ǜ) ก่อนเทียบ
    const stripLatin = s => String(s || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z]/g, "");
    const tHanzi = stripPunct(transcript);
    const eHanzi = stripPunct(expectedHanzi);
    const tLatin = stripLatin(transcript);
    const ePinyin = stripLatin(expectedPinyin);
    const containsBonus = (eHanzi && tHanzi.includes(eHanzi)) ? 1 : 0;
    const sim = Math.max(
      containsBonus,
      stringSimilarity(tHanzi, eHanzi),
      stringSimilarity(tLatin, ePinyin)
    );
    return Math.round(sim * 100);
  };

  // ────────────────────────── LocalStorage helpers ──────────────────────────
  const ls = {
    get: (k, def = null) => {
      try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; }
      catch { return def; }
    },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
    del: (k) => { try { localStorage.removeItem(k); } catch {} }
  };

  // ────────────────────────── XP / Level ──────────────────────────
  // Lv N → ต้องการ XP = 100 * N * 1.2^(N-1)
  const xpForLevel = (lvl) => Math.floor(100 * lvl * Math.pow(1.2, lvl - 1));
  const calcLevel = (totalXp) => {
    let lvl = 1, used = 0;
    while (used + xpForLevel(lvl) <= totalXp && lvl < 99) {
      used += xpForLevel(lvl); lvl++;
    }
    return { level: lvl, currentXp: totalXp - used, nextXp: xpForLevel(lvl) };
  };

  // ────────────────────────── Class colors ──────────────────────────
  const classColor = (cls) => ({
    "ม.1": "from-cyan-500 to-blue-600",
    "ม.2": "from-emerald-500 to-teal-600",
    "ม.3": "from-amber-500 to-orange-600",
    "ม.4": "from-pink-500 to-rose-600",
    "ม.5": "from-violet-500 to-purple-600",
    "ม.6": "from-red-500 to-rose-700"
  })[cls] || "from-gray-500 to-gray-700";

  const isImageAvatar = (value = "") => {
    const src = String(value || "").trim();
    return /^data:image\//.test(src) || /^https?:\/\//.test(src) || src.startsWith("/");
  };

  const getPrimaryMeaning = (value = "") => {
    const raw = String(value || "")
      .replace(/&#x27;|&quot;|&amp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!raw) return "";

    const candidates = raw
      .split(/[;；]/)
      .map(item => item.trim())
      .filter(Boolean)
      .flatMap(item => item.split(/,/).map(part => part.trim()).filter(Boolean));

    const cleaned = candidates
      .map(item => item
        .replace(/\bWHO\b|\bSB\b|\bSTH\b/gi, "")
        .replace(/\s+/g, " ")
        .replace(/[.。]$/g, "")
        .trim())
      .filter(Boolean);

    if (!cleaned.length) return raw;

    const first = cleaned[0];
    const normalizedFirst = first.toLowerCase();
    const deduped = cleaned.filter((item, index) => index === 0 || item.toLowerCase() !== normalizedFirst);
    return deduped[0] || first;
  };

  // ────────────────────────── Toast ──────────────────────────
  const toast = (msg, type = "info") => {
    const colors = {
      info:    "bg-blue-600",
      success: "bg-emerald-600",
      warn:    "bg-amber-600",
      error:   "bg-rose-600"
    };
    const el = document.createElement("div");
    el.className = `fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl text-white shadow-2xl ${colors[type]||colors.info} animate-fade-in-down`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = 0; el.style.transition = "opacity .4s"; }, 2200);
    setTimeout(() => el.remove(), 2700);
  };

  // ────────────────────────── Sound FX ──────────────────────────
  const beep = (freq = 800, ms = 150, type = "sine", vol = 0.15) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.value = vol;
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + ms / 1000);
      setTimeout(() => ctx.close(), ms + 100);
    } catch {}
  };
  const sfxCorrect = () => { beep(880, 100); setTimeout(() => beep(1320, 180), 110); };
  const sfxWrong   = () => { beep(220, 250, "sawtooth", 0.18); };
  const sfxLevelUp = () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 150), i * 130)); };
  const sfxClick   = () => { beep(660, 50, "square", 0.08); };

  window.U = {
    toISO, getDayOfWeek, getWeekNumber, getMondayOfWeek, addDays,
    shuffle, sample, seededShuffle,
    speak, pickFemaleZhVoice, refreshVoices, ls,
    isImageAvatar,
    getPrimaryMeaning,
    levenshtein, stringSimilarity, calcSpeechAccuracy,
    xpForLevel, calcLevel, classColor, toast,
    sfxCorrect, sfxWrong, sfxLevelUp, sfxClick
  };
  console.log("[utils] loaded");
})();
