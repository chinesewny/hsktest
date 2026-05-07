/* ===========================================================
 * Vocabulary Images – auto-generate illustrated cards
 * เติมรูปภาพให้คำศัพท์ที่ยังไม่มี image แบบ deterministic
 * =========================================================== */
(function () {
  const ICON_RULES = [
    { keywords: ["พ่อ", "พ่อแม่", "คุณพ่อ"], emoji: "👨" },
    { keywords: ["แม่", "คุณแม่"], emoji: "👩" },
    { keywords: ["ลูกชาย"], emoji: "👦" },
    { keywords: ["ลูกสาว"], emoji: "👧" },
    { keywords: ["เพื่อน", "เพื่อนร่วมชั้น", "นักเรียน"], emoji: "🧑‍🎓" },
    { keywords: ["ครู", "อาจารย์"], emoji: "👩‍🏫" },
    { keywords: ["หมอ", "แพทย์"], emoji: "👨‍⚕️" },
    { keywords: ["โรงพยาบาล"], emoji: "🏥" },
    { keywords: ["โรงเรียน"], emoji: "🏫" },
    { keywords: ["มหาวิทยาลัย"], emoji: "🎓" },
    { keywords: ["บ้าน"], emoji: "🏠" },
    { keywords: ["ห้อง", "ห้องเรียน"], emoji: "🚪" },
    { keywords: ["โต๊ะ"], emoji: "🪑" },
    { keywords: ["เก้าอี้"], emoji: "🪑" },
    { keywords: ["เตียง"], emoji: "🛏️" },
    { keywords: ["เสื้อผ้า", "เสื้อ", "กางเกง", "กระโปรง", "รองเท้า"], emoji: "👕" },
    { keywords: ["กระเป๋า"], emoji: "🎒" },
    { keywords: ["หนังสือ"], emoji: "📘" },
    { keywords: ["สมุด"], emoji: "📓" },
    { keywords: ["ปากกา", "ดินสอ"], emoji: "✏️" },
    { keywords: ["โทรศัพท์", "โทรออก"], emoji: "📱" },
    { keywords: ["คอมพิวเตอร์"], emoji: "💻" },
    { keywords: ["โทรทัศน์", "ทีวี"], emoji: "📺" },
    { keywords: ["ภาพยนตร์", "หนัง"], emoji: "🎬" },
    { keywords: ["กล้อง", "รูปถ่าย"], emoji: "📷" },
    { keywords: ["อีเมล", "จดหมายอิเล็กทรอนิกส์"], emoji: "📧" },
    { keywords: ["แผนที่"], emoji: "🗺️" },
    { keywords: ["จักรยาน"], emoji: "🚲" },
    { keywords: ["แท็กซี่"], emoji: "🚕" },
    { keywords: ["รถไฟ", "รถไฟใต้ดิน"], emoji: "🚇" },
    { keywords: ["เครื่องบิน"], emoji: "✈️" },
    { keywords: ["เรือ"], emoji: "🚤" },
    { keywords: ["ถ้วย", "แก้ว", "ชา", "กาแฟ"], emoji: "☕" },
    { keywords: ["น้ำ", "ของเหลว"], emoji: "💧" },
    { keywords: ["ผลไม้", "แอปเปิล"], emoji: "🍎" },
    { keywords: ["ข้าว", "อาหาร", "ร้านอาหาร", "เค้ก"], emoji: "🍚" },
    { keywords: ["ผัก", "จาน"], emoji: "🥬" },
    { keywords: ["สุนัข"], emoji: "🐶" },
    { keywords: ["แมว"], emoji: "🐱" },
    { keywords: ["สัตว์"], emoji: "🐾" },
    { keywords: ["ปลา"], emoji: "🐟" },
    { keywords: ["ดอกไม้"], emoji: "🌸" },
    { keywords: ["หญ้า"], emoji: "🌿" },
    { keywords: ["ต้นไม้"], emoji: "🌳" },
    { keywords: ["สวนสาธารณะ"], emoji: "🌳" },
    { keywords: ["พระจันทร์", "ดวงจันทร์"], emoji: "🌙" },
    { keywords: ["พระอาทิตย์", "แดด"], emoji: "☀️" },
    { keywords: ["ฝน", "ฝนตก"], emoji: "🌧️" },
    { keywords: ["หิมะ"], emoji: "❄️" },
    { keywords: ["ลม"], emoji: "🌬️" },
    { keywords: ["อากาศ"], emoji: "⛅" },
    { keywords: ["ฤดูใบไม้ผลิ"], emoji: "🌱" },
    { keywords: ["ฤดูหนาว"], emoji: "⛄" },
    { keywords: ["เมือง", "ประเทศ", "จีน", "ปักกิ่ง"], emoji: "🏙️" },
    { keywords: ["เวลา", "นาที", "เดือน", "ปี", "วันนี้", "พรุ่งนี้", "เมื่อวาน", "ตอนบ่าย", "กลางวัน", "สุดสัปดาห์", "สัปดาห์"], emoji: "🕒" },
    { keywords: ["เงิน", "ราคา", "กิโลกรัม"], emoji: "💴" },
    { keywords: ["อ่าน"], emoji: "📖" },
    { keywords: ["เขียน"], emoji: "✍️" },
    { keywords: ["พูด", "บอก"], emoji: "🗣️" },
    { keywords: ["ฟัง", "ได้ยิน"], emoji: "👂" },
    { keywords: ["ดู", "มองเห็น"], emoji: "👀" },
    { keywords: ["คิด", "วางแผน"], emoji: "💭" },
    { keywords: ["เรียนรู้", "ศึกษา"], emoji: "🧠" },
    { keywords: ["ซื้อ"], emoji: "🛍️" },
    { keywords: ["กิน"], emoji: "🍽️" },
    { keywords: ["ดื่ม"], emoji: "🥤" },
    { keywords: ["นอน"], emoji: "😴" },
    { keywords: ["ทำความสะอาด"], emoji: "🧹" },
    { keywords: ["เปิด"], emoji: "🔓" },
    { keywords: ["ปิด"], emoji: "🔒" },
    { keywords: ["เดินทาง", "มา", "ไป", "กลับ"], emoji: "🧭" },
    { keywords: ["ชอบ", "รัก"], emoji: "❤️" },
    { keywords: ["มีความสุข", "ยินดี"], emoji: "😊" },
    { keywords: ["กังวล", "กลัว"], emoji: "😟" },
    { keywords: ["หิว"], emoji: "😋" },
    { keywords: ["เย็น"], emoji: "🧊" },
    { keywords: ["ใหญ่"], emoji: "⬛" },
    { keywords: ["เล็ก"], emoji: "⬜" },
    { keywords: ["ภาษา", "ภาษาจีน"], emoji: "🈶" }
  ];

  const PALETTES = [
    ["#1d4ed8", "#22d3ee"],
    ["#7c3aed", "#ec4899"],
    ["#ea580c", "#facc15"],
    ["#059669", "#34d399"],
    ["#dc2626", "#fb7185"],
    ["#0f766e", "#60a5fa"]
  ];

  function hash(text) {
    let value = 0;
    const source = String(text || "");
    for (let i = 0; i < source.length; i += 1) {
      value = ((value << 5) - value) + source.charCodeAt(i);
      value |= 0;
    }
    return Math.abs(value);
  }

  function pickPalette(seed) {
    return PALETTES[hash(seed) % PALETTES.length];
  }

  function truncateMeaning(meaning = "") {
    const raw = String(meaning).split(";").map(item => item.trim()).filter(Boolean)[0] || String(meaning || "").trim();
    return raw.length > 26 ? `${raw.slice(0, 24)}…` : raw;
  }

  function detectEmoji(word) {
    const searchText = `${word.hanzi || ""} ${word.meaning || ""} ${word.pos || ""}`.toLowerCase();
    const match = ICON_RULES.find((rule) => rule.keywords.some((keyword) => searchText.includes(keyword.toLowerCase())));
    return match ? match.emoji : "";
  }

  function createSvgDataUri(word) {
    const [from, to] = pickPalette(word.id || word.hanzi || word.meaning);
    const emoji = detectEmoji(word);
    if (!emoji) return "";
    const meaning = truncateMeaning(word.meaning);
    const hanzi = String(word.hanzi || "");
    const pinyin = String(word.pinyin || "");
    const level = `HSK ${word.level || ""}`.trim();
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="720" height="720" viewBox="0 0 720 720">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${from}" />
            <stop offset="100%" stop-color="${to}" />
          </linearGradient>
        </defs>
        <rect width="720" height="720" rx="48" fill="url(#g)"/>
        <circle cx="580" cy="120" r="96" fill="rgba(255,255,255,.10)"/>
        <circle cx="120" cy="620" r="120" fill="rgba(255,255,255,.08)"/>
        <text x="64" y="110" font-size="40" font-family="Arial, sans-serif" fill="rgba(255,255,255,.88)">${level}</text>
        <text x="360" y="210" text-anchor="middle" font-size="120" font-family="Arial, sans-serif">${emoji}</text>
        <text x="360" y="410" text-anchor="middle" font-size="${hanzi.length >= 4 ? 110 : hanzi.length === 3 ? 126 : 154}" font-weight="700" font-family="'Noto Sans SC', 'Microsoft YaHei', sans-serif" fill="#ffffff">${hanzi}</text>
        <text x="360" y="495" text-anchor="middle" font-size="42" font-family="Arial, sans-serif" fill="rgba(255,255,255,.92)">${pinyin}</text>
        <rect x="70" y="550" width="580" height="96" rx="28" fill="rgba(8,17,31,.22)"/>
        <text x="360" y="610" text-anchor="middle" font-size="40" font-family="Arial, sans-serif" fill="#ffffff">${meaning}</text>
      </svg>
    `.trim();
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function ensureWordImage(word) {
    if (!word) return word;
    if (word.image && String(word.image).trim()) return word;
    const generated = createSvgDataUri(word);
    if (generated) word.image = generated;
    return word;
  }

  function hydrateCollection(list) {
    if (!Array.isArray(list)) return [];
    list.forEach(ensureWordImage);
    return list;
  }

  function hydrateAllVocabulary() {
    hydrateCollection(window.HSK1_VOCAB);
    hydrateCollection(window.HSK2_VOCAB);
    hydrateCollection(window.HSK3_VOCAB);
    hydrateCollection(window.ALL_VOCAB);
  }

  window.VocabImages = {
    ensureWordImage,
    hydrateCollection,
    hydrateAllVocabulary
  };

  hydrateAllVocabulary();
  console.log("[vocab-images] auto illustrations ready");
})();
