/* ===========================================================
 * Admin Panel – จัดการระบบทั้งหมด (รวมไว้ไฟล์เดียวเพื่อความง่าย)
 *   - ภาพรวม
 *   - สมาชิก
 *   - คลังคำศัพท์
 *   - ของรางวัล (มอบรางวัล)
 *   - ซีซัน
 *   - รายงาน / Export
 *   - ตั้งค่า
 * =========================================================== */
const { useState: useStateA, useMemo: useMemoA, useEffect: useEffectA } = React;

function AdminAvatar({ avatar }) {
  if (U.isImageAvatar(avatar)) {
    return <img src={avatar} alt="avatar" className="h-10 w-10 rounded-xl object-cover border border-slate-200" />;
  }
  return <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-2xl">{avatar || "👤"}</div>;
}

async function syncCollectionToSheets({ collectionName, sheetName, mapDoc, keyField }) {
  if (!window.fbDB) throw new Error("Firestore is not ready");
  const snap = await window.fbDB.collection(collectionName).get();
  const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  let synced = 0;

  for (const doc of docs) {
    const payload = mapDoc ? mapDoc(doc) : doc;
    const keyValue = payload[keyField];
    if (keyValue === undefined || keyValue === null || keyValue === "") continue;
    await GSheets.upsert(sheetName, { field: keyField, value: keyValue }, payload);
    synced += 1;
  }
  return { synced, total: docs.length };
}

async function syncSystemSeasonToSheets() {
  if (!window.fbDB) throw new Error("Firestore is not ready");
  const snap = await window.fbDB.collection("system").doc("season").get();
  if (!snap.exists) return { synced: 0, total: 0 };
  const doc = snap.data();
  const payload = {
    ...doc,
    season: Number(doc.number || doc.season || 1),
    weekKeys: Array.isArray(doc.weekKeys) ? doc.weekKeys.join(",") : String(doc.weekKeys || "")
  };
  await GSheets.upsert("Seasons", { field: "season", value: payload.season }, payload);
  return { synced: 1, total: 1 };
}

async function syncSystemSettingsToSheets() {
  if (!window.SystemSettings) throw new Error("System settings service is not ready");
  return window.SystemSettings.syncToSheets();
}

function getGameSettings() {
  return window.SystemSettings?.getGame ? window.SystemSettings.getGame() : window.APP_CONFIG.game;
}

function getRewardCatalog() {
  return window.SystemSettings?.getRewards ? window.SystemSettings.getRewards() : [];
}

function getRewardMap() {
  return window.SystemSettings?.getRewardMap ? window.SystemSettings.getRewardMap() : {};
}

function getShopCatalog() {
  return window.SystemSettings?.getShopItems ? window.SystemSettings.getShopItems() : [];
}

const SETTINGS_FIELDS = [
  { key: "competitionEnabled", label: "เปิดระบบการแข่งขัน", type: "boolean", description: "เปิด/ปิดการเข้าสอบประจำสัปดาห์และกระดานผู้นำ" },
  { key: "sentenceModeEnabled", label: "เปิดฟังก์ชั่นประโยค", type: "boolean", description: "เปิด/ปิดเมนูฝึกและทดสอบประโยคสำหรับนักเรียน" },
  { key: "wordsPerDay", label: "คำศัพท์ต่อวัน", type: "number", min: 1 },
  { key: "daysPerWeek", label: "วันฝึกต่อสัปดาห์", type: "number", min: 1, max: 7 },
  { key: "questionsPerTest", label: "จำนวนข้อสอบ", type: "number", min: 1 },
  { key: "testDayOfWeek", label: "วันสอบประจำสัปดาห์", type: "select", options: [[1, "จันทร์"], [2, "อังคาร"], [3, "พุธ"], [4, "พฤหัสบดี"], [5, "ศุกร์"], [6, "เสาร์"], [7, "อาทิตย์"]] },
  { key: "seasonRounds", label: "จำนวนรอบต่อซีซัน", type: "number", min: 1 },
  { key: "timePerQuestion", label: "เวลาต่อข้อ (วินาที)", type: "number", min: 5 },
  { key: "speedBonusThreshold", label: "เวลาได้โบนัสสปีด", type: "number", min: 0 },
  { key: "speedBonusPoints", label: "คะแนนโบนัสสปีด", type: "number", min: 0 },
  { key: "correctPoints", label: "คะแนนตอบถูก", type: "number", min: 1 },
  { key: "streakMultiplier", label: "ตัวคูณสตรีค", type: "number", min: 1, step: "0.1" },
  { key: "xpPerCorrect", label: "XP ต่อข้อถูก", type: "number", min: 0 },
  { key: "xpPerTrainingComplete", label: "XP เมื่อฝึกครบวัน", type: "number", min: 0 },
  { key: "trainingCompleteCoins", label: "เหรียญเมื่อฝึกครบวัน", type: "number", min: 0 },
  { key: "coinsPerCorrect", label: "เหรียญต่อข้อถูก", type: "number", min: 0 },
  { key: "coinsPerPerfectTest", label: "โบนัสเหรียญเมื่อเต็ม", type: "number", min: 0 }
];

// ───────── Sub: Overview ─────────
function AdminOverview() {
  const game = getGameSettings();
  const [users, setUsers] = useStateA(AuthService.allUsers());
  const [tests, setTests] = useStateA(U.ls.get("hsk_test_scores", []));
  const [winners, setWinners] = useStateA([]);
  const [seasonLeaders, setSeasonLeaders] = useStateA([]);
  const season = Progress.getSeason();
  const totalCoins = users.reduce((s,u) => s + (u.coins||0), 0);
  const latestCycle = Progress.getTargetTestCycle().key;
  useEffectA(() => {
    let cancelled = false;
    AuthService.fetchAllUsers().then((rows) => { if (!cancelled) setUsers(rows || []); }).catch(() => {});
    Progress.fetchAllTestScores().then((rows) => { if (!cancelled) setTests(rows || []); }).catch(() => {});
    Progress.fetchWeeklyWinners(latestCycle).then((rows) => { if (!cancelled) setWinners(rows || []); }).catch(() => {});
    Promise.all(window.APP_CONFIG.classes.map(async (classroom) => {
      const top = await Progress.fetchLeaderboard({ classroom, season: season.number, top: 1 });
      return top[0] ? { classroom, ...top[0] } : null;
    })).then((rows) => {
      if (!cancelled) setSeasonLeaders(rows.filter(Boolean));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [latestCycle, season.number]);

  const byClass = {};
  window.APP_CONFIG.classes.forEach(c => byClass[c] = users.filter(u => u.classroom === c).length);

  const cards = [
    ["👥", users.length, "นักเรียนทั้งหมด", "from-blue-500 to-cyan-500"],
    ["⚔️", tests.length, "การสอบทั้งหมด", "from-rose-500 to-pink-500"],
    ["📦", window.ALL_VOCAB.length, "คำในคลัง", "from-emerald-500 to-teal-500"],
    ["🏆", season.number, `ซีซัน (รอบ ${season.roundsCompleted}/${game.seasonRounds})`, "from-amber-500 to-orange-500"],
    ["🪙", totalCoins, "เหรียญในระบบ", "from-yellow-500 to-amber-500"],
    ["🎁", U.ls.get("hsk_rewards_claimed",[]).length, "รางวัลที่มอบ", "from-purple-500 to-violet-500"]
  ];

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        {cards.map((c,i) => (
          <div key={i} className={`bg-gradient-to-br ${c[3]} rounded-2xl p-4 text-white`}>
            <div className="text-3xl">{c[0]}</div>
            <div className="text-3xl font-bold">{c[1]}</div>
            <div className="text-xs opacity-90">{c[2]}</div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl p-4 border">
        <h3 className="font-bold mb-2">นักเรียนแยกตามระดับชั้น</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {Object.entries(byClass).map(([cls,n]) => (
            <div key={cls} className="bg-slate-100 rounded-lg p-3 text-center">
              <div className="text-sm font-semibold">{cls}</div>
              <div className="text-2xl font-bold text-rose-600">{n}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div className="bg-white rounded-2xl p-4 border">
          <h3 className="font-bold mb-3">ผู้ชนะประจำรอบ {latestCycle}</h3>
          <div className="space-y-2">
            {winners.length ? winners.map((w, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-amber-50 p-3">
                <div>
                  <div className="font-semibold">{w.classroom}</div>
                  <div className="text-sm text-slate-600">{w.studentId}</div>
                </div>
                <div className="text-xl font-black text-amber-600">{w.total}</div>
              </div>
            )) : <div className="text-sm text-slate-400">ยังไม่มีผลสอบรอบนี้</div>}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border">
          <h3 className="font-bold mb-3">ผู้นำซีซัน {season.number}</h3>
          <div className="space-y-2">
            {seasonLeaders.length ? seasonLeaders.map((w, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <div>
                  <div className="font-semibold">{w.classroom}</div>
                  <div className="text-sm text-slate-600">{w.studentId}</div>
                </div>
                <div className="text-xl font-black text-rose-600">{w.total}</div>
              </div>
            )) : <div className="text-sm text-slate-400">ยังไม่มีคะแนนสะสมซีซันนี้</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────── Sub: Members ─────────
function AdminMembers() {
  const [users, setUsers] = useStateA(AuthService.allUsers());
  const [q, setQ] = useStateA("");
  useEffectA(() => {
    AuthService.fetchAllUsers().then(setUsers).catch(() => {});
  }, []);
  const filtered = users.filter(u =>
    !q || u.studentId.includes(q) || (u.fullname||"").includes(q) || (u.classroom||"").includes(q)
  );
  const remove = (sid) => {
    if (!confirm(`ลบนักเรียน ${sid}?`)) return;
    const all = U.ls.get("hsk_users_local", {});
    delete all[sid];
    U.ls.set("hsk_users_local", all);
    setUsers(AuthService.allUsers());
    U.toast("ลบเรียบร้อย", "success");
  };
  const adjust = (sid, field) => {
    const val = prompt(`ค่าใหม่ของ ${field} สำหรับ ${sid}`);
    if (val === null) return;
    AuthService.updateUser(sid, { [field]: isNaN(+val) ? val : +val });
    setUsers(AuthService.allUsers());
  };
  return (
    <div>
      <div className="flex justify-between mb-3">
        <input placeholder="ค้นหา รหัส/ชื่อ/ชั้น" value={q} onChange={e=>setQ(e.target.value)}
               className="px-3 py-2 border rounded-lg w-64" />
        <button onClick={()=>AuthService.fetchAllUsers().then(setUsers)} className="px-3 py-2 bg-slate-200 rounded-lg">รีเฟรช</button>
      </div>
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr><th className="p-2 text-left">รหัส</th><th>ชื่อ</th><th>ชั้น</th><th>เลขที่</th><th>อีเมล</th><th>XP</th><th>🪙</th><th>🔥</th><th>บทบาท</th><th>การจัดการ</th></tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.studentId} className="border-t hover:bg-slate-50">
                <td className="p-2 font-mono">{u.studentId}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <AdminAvatar avatar={u.avatar} />
                    <span>{u.fullname}</span>
                  </div>
                </td>
                <td className="text-center">{u.classroom}</td>
                <td className="text-center">{u.classNumber}</td>
                <td className="text-xs">{u.email}</td>
                <td className="text-center">{u.xp||0}</td>
                <td className="text-center">{u.coins||0}</td>
                <td className="text-center">{u.streak||0}</td>
                <td className="text-center">{u.role}</td>
                <td className="text-right space-x-1">
                  <button onClick={()=>adjust(u.studentId,"coins")} className="text-xs px-2 py-1 bg-amber-100 rounded">🪙</button>
                  <button onClick={()=>adjust(u.studentId,"xp")}    className="text-xs px-2 py-1 bg-blue-100 rounded">XP</button>
                  <button onClick={()=>remove(u.studentId)} className="text-xs px-2 py-1 bg-rose-100 rounded">ลบ</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={10} className="p-4 text-center text-gray-400">ไม่พบข้อมูล</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ───────── Sub: Vocabulary ─────────
function AdminVocab() {
  const [list, setList] = useStateA(window.ALL_VOCAB);
  const [level, setLevel] = useStateA(1);
  const [q, setQ] = useStateA("");
  const [editing, setEditing] = useStateA(null);
  const [form, setForm] = useStateA({ id:"", hanzi:"", pinyin:"", meaning:"", pos:"", image:"", level:1 });

  const filtered = list.filter(w =>
    w.level === level && (!q || w.hanzi.includes(q) || (w.pinyin||"").includes(q) || (w.meaning||"").includes(q))
  );

  const save = () => {
    if (!form.hanzi || !form.pinyin || !form.meaning) return U.toast("กรอกข้อมูลให้ครบ", "warn");
    const newWord = { ...form, level: +form.level || level, id: form.id || `${form.level||level}-${Date.now().toString().slice(-6)}` };
    if (window.VocabImages) window.VocabImages.ensureWordImage(newWord);
    const arr = window.ALL_VOCAB.filter(w => w.id !== newWord.id);
    arr.push(newWord);
    window.ALL_VOCAB = arr;
    setList([...arr]); setEditing(null); setForm({ id:"", hanzi:"", pinyin:"", meaning:"", pos:"", image:"", level });
    U.toast("บันทึกแล้ว", "success");
    GSheets.enqueueWrite("Vocabulary", newWord).catch(()=>{});
  };
  const del = (id) => {
    if (!confirm("ลบคำนี้?")) return;
    const arr = window.ALL_VOCAB.filter(w => w.id !== id);
    window.ALL_VOCAB = arr; setList([...arr]);
  };
  const importCSV = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const lines = r.result.split(/\r?\n/).filter(Boolean);
      const added = [];
      lines.slice(1).forEach(line => {
        const [hanzi,pinyin,meaning,pos,lvl,image] = line.split(",");
        if (hanzi && pinyin && meaning) {
          const w = { id:`${lvl||level}-${Date.now()}-${Math.random().toString(36).slice(2,5)}`,
                      hanzi, pinyin, meaning, pos:pos||"", image:image||"", level:+(lvl||level) };
          if (window.VocabImages) window.VocabImages.ensureWordImage(w);
          window.ALL_VOCAB.push(w); added.push(w);
        }
      });
      setList([...window.ALL_VOCAB]);
      U.toast(`นำเข้า ${added.length} คำ`, "success");
    };
    r.readAsText(f, "utf-8");
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex gap-1">
          {[1,2,3].map(l => (
            <button key={l} onClick={()=>setLevel(l)}
                    className={`px-3 py-1.5 rounded-lg ${level===l?"bg-rose-600 text-white":"bg-slate-200"}`}>
              HSK {l} ({list.filter(w=>w.level===l).length})
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input placeholder="ค้นหา" value={q} onChange={e=>setQ(e.target.value)}
                 className="px-3 py-2 border rounded-lg" />
          <label className="px-3 py-2 bg-emerald-600 text-white rounded-lg cursor-pointer">
            📥 นำเข้า CSV<input type="file" accept=".csv" onChange={importCSV} className="hidden"/>
          </label>
          <button onClick={()=>{setEditing("new"); setForm({ id:"", hanzi:"", pinyin:"", meaning:"", pos:"", image:"", level });}}
                  className="px-3 py-2 bg-rose-600 text-white rounded-lg">+ เพิ่มคำ</button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3 text-xs">
        💡 รูปแบบ CSV: <code>hanzi,pinyin,meaning,pos,level,image</code>
      </div>

      {editing && (
        <div className="bg-white border-2 border-rose-300 rounded-2xl p-4 mb-3">
          <h3 className="font-bold mb-3">{editing === "new" ? "เพิ่มคำใหม่" : "แก้ไขคำ"}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <input placeholder="汉字" value={form.hanzi} onChange={e=>setForm({...form, hanzi:e.target.value})} className="px-3 py-2 border rounded text-2xl" />
            <input placeholder="pinyin" value={form.pinyin} onChange={e=>setForm({...form, pinyin:e.target.value})} className="px-3 py-2 border rounded" />
            <input placeholder="ความหมายไทย" value={form.meaning} onChange={e=>setForm({...form, meaning:e.target.value})} className="px-3 py-2 border rounded" />
            <input placeholder="ชนิดคำ (น./ก./ค.ศ.)" value={form.pos} onChange={e=>setForm({...form, pos:e.target.value})} className="px-3 py-2 border rounded" />
            <select value={form.level} onChange={e=>setForm({...form, level:+e.target.value})} className="px-3 py-2 border rounded">
              <option value={1}>HSK 1</option><option value={2}>HSK 2</option><option value={3}>HSK 3</option>
            </select>
            <input placeholder="URL รูป (optional)" value={form.image} onChange={e=>setForm({...form, image:e.target.value})} className="px-3 py-2 border rounded col-span-3" />
          </div>
          {form.image && (
            <div className="mt-3">
              <img src={form.image} alt={form.hanzi || "preview"} className="h-28 w-28 rounded-2xl object-cover border" />
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <button onClick={save} className="px-4 py-2 bg-emerald-600 text-white rounded">บันทึก</button>
            <button onClick={()=>setEditing(null)} className="px-4 py-2 bg-slate-200 rounded">ยกเลิก</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border overflow-hidden max-h-[60vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 sticky top-0">
            <tr><th className="p-2">รูป</th><th className="p-2">汉字</th><th>Pinyin</th><th>ความหมาย</th><th>ชนิดคำ</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map(w => (
              <tr key={w.id} className="border-t hover:bg-slate-50">
                <td className="p-2 text-center">
                  {w.image ? <img src={w.image} alt={w.hanzi} className="mx-auto h-12 w-12 rounded-xl object-cover border" /> : <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">🖼️</div>}
                </td>
                <td className="p-2 text-2xl text-center">{w.hanzi}</td>
                <td className="text-center">{w.pinyin}</td>
                <td>{w.meaning}</td>
                <td className="text-xs text-center">{w.pos}</td>
                <td className="text-right space-x-1">
                  <button onClick={()=>{setEditing(w.id); setForm(w);}} className="text-xs px-2 py-1 bg-blue-100 rounded">แก้ไข</button>
                  <button onClick={()=>del(w.id)} className="text-xs px-2 py-1 bg-rose-100 rounded">ลบ</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ───────── Sub: Rewards (มอบให้นักเรียน) ─────────
function AdminRewards() {
  const rewardCatalog = getRewardCatalog();
  const rewardMap = getRewardMap();
  const [users, setUsers] = useStateA(AuthService.allUsers());
  const [sel, setSel] = useStateA("");
  const [reward, setReward] = useStateA(rewardCatalog[0]?.id || "coupon-3pts");
  const [list, setList] = useStateA(U.ls.get("hsk_rewards_claimed", []));
  useEffectA(() => {
    AuthService.fetchAllUsers().then(setUsers).catch(() => {});
  }, []);
  useEffectA(() => {
    if (!rewardCatalog.some((item) => item.id === reward)) {
      setReward(rewardCatalog[0]?.id || "");
    }
  }, [rewardCatalog.map((item) => item.id).join("|"), reward]);

  const give = () => {
    if (!sel) return U.toast("เลือกนักเรียนก่อน", "warn");
    Progress.claimReward(sel, reward);
    setList(U.ls.get("hsk_rewards_claimed", []));
    U.toast("มอบรางวัลเรียบร้อย", "success");
  };

  return (
    <div>
      <div className="bg-white border rounded-2xl p-4 mb-4">
        <h3 className="font-bold mb-3">🎁 มอบรางวัลให้นักเรียน</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select value={sel} onChange={e=>setSel(e.target.value)} className="px-3 py-2 border rounded">
            <option value="">— เลือกนักเรียน —</option>
            {users.map(u => <option key={u.studentId} value={u.studentId}>{u.studentId} {u.fullname} ({u.classroom})</option>)}
          </select>
          <select value={reward} onChange={e=>setReward(e.target.value)} className="px-3 py-2 border rounded">
            {rewardCatalog.map((item) => (
              <option key={item.id} value={item.id}>{item.emoji} {item.name}</option>
            ))}
          </select>
          <button onClick={give} className="px-4 py-2 bg-rose-600 text-white rounded font-bold">มอบ</button>
        </div>
      </div>

      <h3 className="font-bold mb-2">ประวัติการมอบรางวัล ({list.length})</h3>
      <div className="bg-white border rounded-xl max-h-[50vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 sticky top-0">
            <tr><th className="p-2">นักเรียน</th><th>รางวัล</th><th>สัปดาห์</th><th>วันที่</th></tr>
          </thead>
          <tbody>
            {list.slice().reverse().map((r,i) => {
              const u = users.find(x => x.studentId === r.studentId);
              return (
                <tr key={i} className="border-t">
                  <td className="p-2">{u?.fullname || r.studentId}</td>
                  <td className="text-xs">{rewardMap[r.rewardId]?.emoji || "🎁"} {rewardMap[r.rewardId]?.name || r.rewardId}</td>
                  <td className="text-xs">{r.weekKey}</td>
                  <td className="text-xs">{new Date(r.ts).toLocaleString("th-TH")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ───────── Sub: Settings ─────────
function AdminSettings() {
  const [settings, setSettings] = useStateA(() => window.SystemSettings?.getState ? window.SystemSettings.getState() : {
    game: getGameSettings(),
    rewards: getRewardCatalog(),
    shopItems: getShopCatalog()
  });
  const [saving, setSaving] = useStateA(false);

  useEffectA(() => {
    let cancelled = false;
    window.SystemSettings?.init?.().then(() => {
      if (!cancelled) setSettings(window.SystemSettings.getState());
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const patchGame = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      game: { ...prev.game, [key]: value }
    }));
  };

  const patchReward = (index, key, value) => {
    setSettings((prev) => ({
      ...prev,
      rewards: prev.rewards.map((reward, i) => i === index ? { ...reward, [key]: value } : reward)
    }));
  };

  const patchShopItem = (index, key, value) => {
    setSettings((prev) => ({
      ...prev,
      shopItems: prev.shopItems.map((item, i) => i === index ? { ...item, [key]: value } : item)
    }));
  };

  const addReward = () => {
    setSettings((prev) => ({
      ...prev,
      rewards: [
        ...prev.rewards,
        { id: `reward-${prev.rewards.length + 1}`, emoji: "🎁", name: "รางวัลใหม่", detail: "รายละเอียดรางวัล", color: "from-slate-500 to-slate-700" }
      ]
    }));
  };

  const addShopItem = () => {
    setSettings((prev) => ({
      ...prev,
      shopItems: [
        ...prev.shopItems,
        { key: `item-${prev.shopItems.length + 1}`, emoji: "🎒", name: "ไอเทมใหม่", desc: "คำอธิบายไอเทม", cost: 10 }
      ]
    }));
  };

  const removeReward = (index) => {
    setSettings((prev) => ({
      ...prev,
      rewards: prev.rewards.filter((_, i) => i !== index)
    }));
  };

  const removeShopItem = (index) => {
    setSettings((prev) => ({
      ...prev,
      shopItems: prev.shopItems.filter((_, i) => i !== index)
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await window.SystemSettings.save(settings);
      setSettings(window.SystemSettings.getState());
      U.toast("บันทึกการตั้งค่าระบบแล้ว", "success");
    } catch (error) {
      U.toast(`บันทึกไม่สำเร็จ: ${error.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = async () => {
    if (!confirm("รีเซ็ตค่าทั้งหมดกลับเป็นค่าเริ่มต้น?")) return;
    setSaving(true);
    try {
      const next = await window.SystemSettings.reset();
      setSettings(next);
      U.toast("รีเซ็ตค่าเริ่มต้นเรียบร้อย", "success");
    } catch (error) {
      U.toast(`รีเซ็ตไม่สำเร็จ: ${error.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const competitionEnabled = !!settings.game.competitionEnabled;
  const sentenceModeEnabled = !!settings.game.sentenceModeEnabled;

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-lg">⚙️ ตั้งค่าระบบการฝึกและการสอบ</h3>
            <div className="text-sm text-slate-500">แอดมินสามารถปรับกติกา คะแนน รางวัล และร้านค้าได้โดยไม่ต้องแก้โค้ด</div>
          </div>
          <div className="flex gap-2">
            <button onClick={resetDefaults} disabled={saving} className="px-4 py-2 bg-slate-200 rounded-lg disabled:opacity-50">รีเซ็ตค่าเริ่มต้น</button>
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-rose-600 text-white rounded-lg font-bold disabled:opacity-50">
              {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
            </button>
          </div>
        </div>
      </div>

      <div className={`rounded-3xl border p-5 text-white shadow-xl ${competitionEnabled ? "border-emerald-300/40 bg-gradient-to-br from-emerald-600 to-teal-700" : "border-rose-300/40 bg-gradient-to-br from-rose-600 to-orange-600"}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-white/75">Competition Control</div>
            <h3 className="mt-2 text-2xl font-black">{competitionEnabled ? "ระบบการแข่งขันเปิดอยู่" : "ระบบการแข่งขันปิดอยู่"}</h3>
            <div className="mt-2 max-w-2xl text-sm text-white/85">
              {competitionEnabled
                ? "นักเรียนสามารถเข้าสอบประจำสัปดาห์และดูกระดานผู้นำได้ตามปกติ"
                : "นักเรียนจะยังฝึกคำศัพท์รายวันได้ แต่จะไม่สามารถเข้าสอบประจำสัปดาห์หรือเปิดกระดานผู้นำได้"}
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => patchGame("competitionEnabled", true)}
              className={`rounded-2xl px-5 py-4 text-left font-bold transition ${competitionEnabled ? "bg-white text-emerald-700 shadow-lg" : "bg-white/12 text-white hover:bg-white/20"}`}
            >
              <div className="text-lg">เปิดระบบการแข่งขัน</div>
              <div className={`mt-1 text-xs ${competitionEnabled ? "text-emerald-600" : "text-white/70"}`}>อนุญาตให้สอบและดูอันดับได้</div>
            </button>
            <button
              type="button"
              onClick={() => patchGame("competitionEnabled", false)}
              className={`rounded-2xl px-5 py-4 text-left font-bold transition ${!competitionEnabled ? "bg-white text-rose-700 shadow-lg" : "bg-white/12 text-white hover:bg-white/20"}`}
            >
              <div className="text-lg">ปิดระบบการแข่งขัน</div>
              <div className={`mt-1 text-xs ${!competitionEnabled ? "text-rose-600" : "text-white/70"}`}>ล็อกการสอบและกระดานผู้นำชั่วคราว</div>
            </button>
          </div>
        </div>
      </div>

      <div className={`rounded-3xl border p-5 text-white shadow-xl ${sentenceModeEnabled ? "border-sky-300/40 bg-gradient-to-br from-sky-600 to-indigo-700" : "border-slate-300/40 bg-gradient-to-br from-slate-700 to-slate-900"}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-white/75">Sentence Practice Control</div>
            <h3 className="mt-2 text-2xl font-black">{sentenceModeEnabled ? "โหมดฝึกประโยคเปิดอยู่" : "โหมดฝึกประโยคยังปิดอยู่"}</h3>
            <div className="mt-2 max-w-2xl text-sm text-white/85">
              {sentenceModeEnabled
                ? "นักเรียนจะเห็นเมนูฝึกประโยค พร้อมแบบฝึกฟัง พูด อ่าน และการทดสอบประโยค"
                : "ระบบเตรียมฟังก์ชั่นไว้แล้ว แต่จะยังไม่แสดงให้นักเรียนทั่วไปจนกว่าแอดมินเปิด"}
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => patchGame("sentenceModeEnabled", true)}
              className={`rounded-2xl px-5 py-4 text-left font-bold transition ${sentenceModeEnabled ? "bg-white text-sky-700 shadow-lg" : "bg-white/12 text-white hover:bg-white/20"}`}
            >
              <div className="text-lg">เปิดโหมดประโยค</div>
              <div className={`mt-1 text-xs ${sentenceModeEnabled ? "text-sky-600" : "text-white/70"}`}>ให้นักเรียนฝึกและทดสอบประโยคได้</div>
            </button>
            <button
              type="button"
              onClick={() => patchGame("sentenceModeEnabled", false)}
              className={`rounded-2xl px-5 py-4 text-left font-bold transition ${!sentenceModeEnabled ? "bg-white text-slate-800 shadow-lg" : "bg-white/12 text-white hover:bg-white/20"}`}
            >
              <div className="text-lg">ปิดโหมดประโยค</div>
              <div className={`mt-1 text-xs ${!sentenceModeEnabled ? "text-slate-600" : "text-white/70"}`}>ซ่อนเมนูจากนักเรียนชั่วคราว</div>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-4">
        <h3 className="font-bold mb-3">🎯 กติกาหลักของระบบ</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {SETTINGS_FIELDS.filter((field) => field.type !== "boolean").map((field) => (
            <label key={field.key} className="block">
              <div className="mb-1 text-sm font-medium text-slate-700">{field.label}</div>
              {field.type === "select" ? (
                <select
                  value={settings.game[field.key]}
                  onChange={(e) => patchGame(field.key, Number(e.target.value))}
                  className="w-full rounded-xl border px-3 py-2"
                >
                  {field.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              ) : (
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step || "1"}
                  value={settings.game[field.key]}
                  onChange={(e) => patchGame(field.key, e.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                />
              )}
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">🎁 แคตตาล็อกรางวัล</h3>
          <button onClick={addReward} className="px-3 py-2 bg-emerald-600 text-white rounded-lg">+ เพิ่มรางวัล</button>
        </div>
        <div className="space-y-3">
          {settings.rewards.map((reward, index) => (
            <div key={`${reward.id}-${index}`} className="rounded-2xl border bg-slate-50 p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <input value={reward.id} onChange={(e) => patchReward(index, "id", e.target.value)} placeholder="reward id" className="rounded-lg border px-3 py-2" />
                <input value={reward.emoji} onChange={(e) => patchReward(index, "emoji", e.target.value)} placeholder="emoji" className="rounded-lg border px-3 py-2" />
                <input value={reward.name} onChange={(e) => patchReward(index, "name", e.target.value)} placeholder="ชื่อรางวัล" className="rounded-lg border px-3 py-2 md:col-span-2" />
                <input value={reward.color} onChange={(e) => patchReward(index, "color", e.target.value)} placeholder="gradient class" className="rounded-lg border px-3 py-2" />
                <input value={reward.detail} onChange={(e) => patchReward(index, "detail", e.target.value)} placeholder="รายละเอียด" className="rounded-lg border px-3 py-2 md:col-span-4" />
              </div>
              <div className="mt-3 flex justify-between items-center">
                <div className={`rounded-xl bg-gradient-to-br ${reward.color || "from-slate-500 to-slate-700"} px-4 py-3 text-white`}>
                  <div className="text-2xl">{reward.emoji || "🎁"}</div>
                  <div className="font-bold">{reward.name || "รางวัลใหม่"}</div>
                  <div className="text-xs opacity-90">{reward.detail || "รายละเอียดรางวัล"}</div>
                </div>
                <button onClick={() => removeReward(index)} className="px-3 py-2 bg-rose-100 text-rose-700 rounded-lg">ลบรางวัล</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">🛒 ไอเทมร้านค้าและไอเทมช่วยสอบ</h3>
          <button onClick={addShopItem} className="px-3 py-2 bg-blue-600 text-white rounded-lg">+ เพิ่มไอเทม</button>
        </div>
        <div className="space-y-3">
          {settings.shopItems.map((item, index) => (
            <div key={`${item.key}-${index}`} className="rounded-2xl border bg-slate-50 p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <input value={item.key} onChange={(e) => patchShopItem(index, "key", e.target.value)} placeholder="item key" className="rounded-lg border px-3 py-2" />
                <input value={item.emoji} onChange={(e) => patchShopItem(index, "emoji", e.target.value)} placeholder="emoji" className="rounded-lg border px-3 py-2" />
                <input value={item.name} onChange={(e) => patchShopItem(index, "name", e.target.value)} placeholder="ชื่อไอเทม" className="rounded-lg border px-3 py-2" />
                <input value={item.cost} type="number" min="0" onChange={(e) => patchShopItem(index, "cost", e.target.value)} placeholder="ราคา" className="rounded-lg border px-3 py-2" />
                <input value={item.desc} onChange={(e) => patchShopItem(index, "desc", e.target.value)} placeholder="คำอธิบาย" className="rounded-lg border px-3 py-2 md:col-span-5" />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="rounded-xl bg-slate-900 px-4 py-3 text-white">
                  <div className="text-2xl">{item.emoji || "🎒"}</div>
                  <div className="font-bold">{item.name || "ไอเทมใหม่"}</div>
                  <div className="text-xs opacity-80">{item.desc || "คำอธิบายไอเทม"}</div>
                  <div className="text-sm mt-1 text-yellow-300">🪙 {item.cost || 0}</div>
                </div>
                <button onClick={() => removeShopItem(index)} className="px-3 py-2 bg-rose-100 text-rose-700 rounded-lg">ลบไอเทม</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ───────── Sub: Reports ─────────
function AdminReports() {
  const game = getGameSettings();
  const [tests, setTests] = useStateA(U.ls.get("hsk_test_scores", []));
  const [users, setUsers] = useStateA(AuthService.allUsers());
  const [syncing, setSyncing] = useStateA("");
  const [syncLog, setSyncLog] = useStateA([]);
  useEffectA(() => {
    Progress.fetchAllTestScores().then(setTests).catch(() => {});
    AuthService.fetchAllUsers().then(setUsers).catch(() => {});
  }, []);

  const pushSyncLog = (message) => setSyncLog((prev) => [`${new Date().toLocaleTimeString("th-TH")} ${message}`, ...prev].slice(0, 12));

  const runSync = async (label, job) => {
    setSyncing(label);
    pushSyncLog(`เริ่ม sync ${label}`);
    try {
      const result = await job();
      pushSyncLog(`เสร็จ ${label}: ${result.synced}/${result.total}`);
      U.toast(`Sync ${label} สำเร็จ ${result.synced}/${result.total}`, "success");
    } catch (error) {
      pushSyncLog(`ผิดพลาด ${label}: ${error.message}`);
      U.toast(`Sync ${label} ไม่สำเร็จ`, "error");
    } finally {
      setSyncing("");
    }
  };

  const exportCSV = () => {
    const rows = ["studentId,fullname,classroom,cycleKey,score,total,season,seasonRound,date"];
    tests.forEach(t => {
      const u = users.find(x => x.studentId === t.studentId);
      rows.push([t.studentId, u?.fullname||"", t.classroom, t.cycleKey || t.weekKey, t.score, t.total, t.season, t.seasonRound || 1, new Date(t.ts).toLocaleString()].join(","));
    });
    const blob = new Blob(["﻿"+rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "test_scores.csv"; a.click();
  };
  return (
    <div>
      <div className="bg-white border rounded-2xl p-4 mb-4">
        <h3 className="font-bold mb-3">📊 Export ข้อมูล</h3>
        <button onClick={exportCSV} className="px-4 py-2 bg-emerald-600 text-white rounded">⬇ Export ผลคะแนน CSV</button>
      </div>
      <div className="bg-white border rounded-2xl p-4 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold">🔄 Sync Firestore -> Google Sheets</h3>
            <div className="text-sm text-slate-500">เหมาะสำหรับ sync หลังบ้านเป็นรอบ แทนการ mirror ทุก action ของนักเรียน</div>
          </div>
          <div className="text-sm rounded-full bg-slate-100 px-3 py-1">
            liveMirror: <b>{window.APP_CONFIG.googleSheets.liveMirror === false ? "OFF" : "ON"}</b>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
          <button disabled={!!syncing} onClick={() => runSync("Members", () => syncCollectionToSheets({
            collectionName: "members",
            sheetName: "Members",
            keyField: "studentId",
            mapDoc: (doc) => ({ ...doc, studentId: String(doc.studentId || doc.id) })
          }))} className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50">Members</button>
          <button disabled={!!syncing} onClick={() => runSync("DailyTraining", () => syncCollectionToSheets({
            collectionName: "dailyTraining",
            sheetName: "DailyTraining",
            keyField: "recordId",
            mapDoc: (doc) => ({ ...doc, wordIds: Array.isArray(doc.wordIds) ? doc.wordIds.join(",") : String(doc.wordIds || "") })
          }))} className="px-3 py-2 bg-emerald-600 text-white rounded disabled:opacity-50">DailyTraining</button>
          <button disabled={!!syncing} onClick={() => runSync("TestScores", () => syncCollectionToSheets({
            collectionName: "testScores",
            sheetName: "TestScores",
            keyField: "recordId",
            mapDoc: (doc) => ({ ...doc, details: JSON.stringify(doc.details || []) })
          }))} className="px-3 py-2 bg-amber-600 text-white rounded disabled:opacity-50">TestScores</button>
          <button disabled={!!syncing} onClick={() => runSync("Rewards", () => syncCollectionToSheets({
            collectionName: "rewards",
            sheetName: "Rewards",
            keyField: "recordId"
          }))} className="px-3 py-2 bg-fuchsia-600 text-white rounded disabled:opacity-50">Rewards</button>
          <button disabled={!!syncing} onClick={() => runSync("SystemSettings", () => syncSystemSettingsToSheets())} className="px-3 py-2 bg-indigo-600 text-white rounded disabled:opacity-50">Settings</button>
          <button disabled={!!syncing} onClick={() => runSync("Season", () => syncSystemSeasonToSheets())} className="px-3 py-2 bg-slate-700 text-white rounded disabled:opacity-50">Season</button>
          <button disabled={!!syncing} onClick={async () => {
            await runSync("Members", () => syncCollectionToSheets({
              collectionName: "members",
              sheetName: "Members",
              keyField: "studentId",
              mapDoc: (doc) => ({ ...doc, studentId: String(doc.studentId || doc.id) })
            }));
            await runSync("DailyTraining", () => syncCollectionToSheets({
              collectionName: "dailyTraining",
              sheetName: "DailyTraining",
              keyField: "recordId",
              mapDoc: (doc) => ({ ...doc, wordIds: Array.isArray(doc.wordIds) ? doc.wordIds.join(",") : String(doc.wordIds || "") })
            }));
            await runSync("TestScores", () => syncCollectionToSheets({
              collectionName: "testScores",
              sheetName: "TestScores",
              keyField: "recordId",
              mapDoc: (doc) => ({ ...doc, details: JSON.stringify(doc.details || []) })
            }));
            await runSync("Rewards", () => syncCollectionToSheets({
              collectionName: "rewards",
              sheetName: "Rewards",
              keyField: "recordId"
            }));
            await runSync("SystemSettings", () => syncSystemSettingsToSheets());
            await runSync("Season", () => syncSystemSeasonToSheets());
          }} className="px-3 py-2 bg-rose-600 text-white rounded disabled:opacity-50">Sync All</button>
        </div>
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
          <div className="font-semibold mb-2">Sync Log</div>
          <div className="space-y-1 text-slate-600">
            {syncLog.length ? syncLog.map((line, index) => <div key={index}>{line}</div>) : <div>ยังไม่มีการ sync</div>}
          </div>
        </div>
      </div>
      <div className="bg-white border rounded-xl max-h-[60vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 sticky top-0">
            <tr><th className="p-2">นักเรียน</th><th>ชั้น</th><th>รอบฝึก</th><th>คะแนน</th><th>ซีซัน</th><th>วันที่</th></tr>
          </thead>
          <tbody>
            {tests.slice().reverse().map((t,i) => {
              const u = users.find(x => x.studentId === t.studentId);
              return (
                <tr key={i} className="border-t">
                  <td className="p-2">{u?.fullname||t.studentId}</td>
                  <td className="text-center">{t.classroom}</td>
                  <td className="text-xs">{t.cycleKey || t.weekKey}</td>
                  <td className="text-center font-bold">{t.score}/{t.total*game.correctPoints}</td>
                  <td className="text-center">{t.season}.{t.seasonRound || 1}</td>
                  <td className="text-xs">{new Date(t.ts).toLocaleString("th-TH")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ───────── Sub: Season ─────────
function AdminSeason() {
  const game = getGameSettings();
  const [s, setS] = useStateA(Progress.getSeason());
  const reset = () => {
    if (!confirm("รีเซ็ตซีซันใหม่? คะแนนเก่าจะถูกเก็บแต่เริ่มซีซันใหม่")) return;
    const ns = { number: s.number+1, startedAt: U.toISO(), roundsCompleted: 0 };
    U.ls.set("hsk_current_season", ns); setS(ns);
    U.toast("เริ่มซีซันใหม่ #" + ns.number, "success");
  };
  return (
    <div className="bg-white rounded-2xl p-6 border">
      <div className="text-center">
        <div className="text-6xl mb-2">🏆</div>
        <div className="text-3xl font-bold">ซีซันที่ {s.number}</div>
        <div className="opacity-60">เริ่ม: {s.startedAt}</div>
        <div className="text-2xl mt-3">รอบที่ {s.roundsCompleted} / {game.seasonRounds}</div>
        <div className="w-full max-w-md mx-auto h-3 bg-slate-200 rounded-full mt-2 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
               style={{width: `${s.roundsCompleted/game.seasonRounds*100}%`}}></div>
        </div>
        <button onClick={reset} className="mt-6 px-6 py-3 bg-rose-600 text-white rounded-lg font-bold">
          🔄 ปิดซีซันและเริ่มซีซันใหม่
        </button>
      </div>
    </div>
  );
}

// ───────── MAIN ─────────
window.AdminPanel = function AdminPanel({ user, onBack }) {
  const [tab, setTab] = useStateA("overview");
  const tabs = [
    ["overview","📊 ภาพรวม"],
    ["members","👥 สมาชิก"],
    ["vocab","📚 คลังคำศัพท์"],
    ["rewards","🎁 ของรางวัล"],
    ["settings","⚙️ ตั้งค่า"],
    ["season","🏆 ซีซัน"],
    ["reports","📋 รายงาน"]
  ];
  return (
    <div className="scholar-shell">
      <div className="lacquer-panel border-b border-white/10 text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="ghost-btn px-3 py-1.5 rounded-lg text-sm">← กลับ</button>
            <h1 className="page-heading text-xl font-bold">⚙️ Admin Console</h1>
          </div>
          <div className="text-sm text-white/70">{user.fullname}</div>
        </div>
        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {tabs.map(([k,t]) => (
            <button key={k} onClick={()=>setTab(k)}
                    className={`px-4 py-2 rounded-t-lg whitespace-nowrap ${tab===k?"paper-card text-[#532721] font-bold":"text-white/70 hover:text-white"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="max-w-6xl mx-auto p-4">
        {tab === "overview" && <AdminOverview />}
        {tab === "members"  && <AdminMembers />}
        {tab === "vocab"    && <AdminVocab />}
        {tab === "rewards"  && <AdminRewards />}
        {tab === "settings" && <AdminSettings />}
        {tab === "season"   && <AdminSeason />}
        {tab === "reports"  && <AdminReports />}
      </div>
    </div>
  );
};
