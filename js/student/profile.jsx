/* ===========================================================
 * Profile – ดูสถิติ + เปลี่ยนรหัสผ่าน
 * =========================================================== */
const { useState: useStateP, useMemo: useMemoP } = React;

function ProfileAvatar({ avatar }) {
  if (U.isImageAvatar(avatar)) {
    return <img src={avatar} alt="avatar" className="mx-auto mb-2 h-24 w-24 rounded-[24px] border border-white/20 object-cover shadow-xl" />;
  }
  return <div className="text-5xl mb-2">{avatar || "🐉"}</div>;
}

function ProfilePasswordInput({ value, onChange, placeholder, minLength }) {
  const [visible, setVisible] = useStateP(false);
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        minLength={minLength}
        className="w-full rounded-lg border border-[#decdb8] bg-[#fffaf2] px-3 py-2 pr-20 text-[var(--arena-ink)] outline-none placeholder:text-[#9b8478]"
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8a6d60] hover:text-[var(--arena-cinnabar)]"
      >
        {visible ? "ซ่อน" : "แสดง"}
      </button>
    </div>
  );
}

window.Profile = function Profile({ user, onBack }) {
  const game = window.SystemSettings?.getGame ? window.SystemSettings.getGame() : window.APP_CONFIG.game;
  const [oldPw, setOldPw] = useStateP("");
  const [newPw, setNewPw] = useStateP("");
  const [section, setSection] = useStateP("stats");
  const lvl = U.calcLevel(user.xp || 0);
  const shopMap = (window.SystemSettings?.getShopItems ? window.SystemSettings.getShopItems() : []).reduce((map, item) => {
    map[item.key] = item;
    return map;
  }, {});
  const tests = useMemoP(() => Progress.getMyTests(user.studentId), [user.studentId]);
  const totalScore = tests.reduce((s,t) => s + t.score, 0);
  const avgAccuracy = tests.length ? Math.round(tests.reduce((s,t) => s + (t.score/(t.total*game.correctPoints)), 0) / tests.length * 100) : 0;
  const bestScore = tests.reduce((m,t) => Math.max(m, t.score), 0);
  const trainedDays = (() => {
    const all = U.ls.get("hsk_daily_progress", {});
    return Object.keys((all[user.studentId])||{}).length;
  })();

  const changePw = async (e) => {
    e.preventDefault();
    try {
      await AuthService.login(user.studentId, oldPw);
      const newHash = await (async () => {
        const buf = new TextEncoder().encode(newPw);
        const h = await window.crypto.subtle.digest("SHA-256", buf);
        return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,"0")).join("");
      })();
      AuthService.updateUser(user.studentId, { passHash: newHash });
      U.toast("เปลี่ยนรหัสผ่านสำเร็จ", "success");
      setOldPw(""); setNewPw("");
    } catch (e) { U.toast(e.message, "error"); }
  };

  return (
    <div className="scholar-shell arena-grid arena-noise min-h-screen text-[var(--arena-ink)]">
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="ghost-btn px-4 py-2 rounded-lg">← กลับ</button>
          <h1 className="page-heading text-2xl font-bold">👤 โปรไฟล์นักเรียน</h1>
          <div></div>
        </div>

        {/* Header */}
        <div className="lacquer-panel rounded-3xl p-6 text-center mb-4">
          <ProfileAvatar avatar={user.avatar} />
          <div className="text-2xl font-bold">{user.fullname}</div>
            <div className="text-sm text-white/90">รหัส {user.studentId} • {user.classroom} • เลขที่ {user.classNumber||"-"}</div>
            <div className="mt-3 inline-block bg-white/20 px-4 py-1 rounded-full font-bold">
              Lv.{lvl.level} • {lvl.currentXp}/{lvl.nextXp} XP
            </div>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl border border-white/70 bg-white/70 p-2 backdrop-blur">
          {[
            ["stats", "สถิติ", "fa-chart-simple"],
            ["bag", "กระเป๋า", "fa-bag-shopping"],
            ["security", "รหัสผ่าน", "fa-key"]
          ].map(([key, label, icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSection(key)}
              className={`rounded-xl px-3 py-3 text-sm font-bold transition ${section === key ? "bg-blue-600 text-white shadow-lg" : "bg-white text-slate-600 hover:bg-blue-50"}`}
            >
              <i className={`fa-solid ${icon} mr-2`}></i>{label}
            </button>
          ))}
        </div>

        {section === "stats" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              ["🪙", user.coins||0, "เหรียญ"],
              ["🔥", user.streak||0, "วันต่อเนื่อง"],
              ["📚", trainedDays, "วันที่ฝึก"],
              ["⚔️", tests.length, "สอบทั้งหมด"],
              ["⭐", totalScore, "คะแนนรวม"],
              ["🎯", avgAccuracy + "%", "ความแม่นยำ"],
              ["🏆", bestScore, "คะแนนสูงสุด"],
              ["🎁", Progress.myRewards(user.studentId).length, "รางวัลที่ได้"]
            ].map((s,i) => (
              <div key={i} className="bg-[rgba(255,255,255,.86)] backdrop-blur rounded-xl p-3 text-center border border-blue-100">
                <div className="text-2xl">{s[0]}</div>
                <div className="text-xl font-bold">{s[1]}</div>
                <div className="text-xs text-slate-500">{s[2]}</div>
              </div>
            ))}
          </div>
        )}

        {section === "bag" && (
          <div className="arena-panel rounded-2xl p-4 border border-white/10 mb-4">
            <h3 className="font-bold mb-3">ไอเทมในกระเป๋า</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(user.items||{}).length ? Object.entries(user.items||{}).map(([k,v]) => (
                <div key={k} className="bg-blue-50 px-3 py-2 rounded-lg text-sm text-slate-700">
                  {shopMap[k]?.emoji || "🎒"} {shopMap[k]?.name || k} <b>{v}</b>
                </div>
              )) : (
                <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50 p-4 text-sm text-slate-500">
                  ยังไม่มีไอเทม ลองเข้าไปที่ร้านค้าเพื่อแลกของรางวัลได้
                </div>
              )}
            </div>
          </div>
        )}

        {section === "security" && (
          <form onSubmit={changePw} className="arena-panel rounded-2xl p-4 border border-white/10 space-y-3">
            <h3 className="font-bold">เปลี่ยนรหัสผ่าน</h3>
            <ProfilePasswordInput
              placeholder="รหัสผ่านเดิม"
              value={oldPw}
              onChange={e=>setOldPw(e.target.value)}
            />
            <ProfilePasswordInput
              placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)"
              value={newPw}
              onChange={e=>setNewPw(e.target.value)}
              minLength={6}
            />
            <button type="submit" className="cinnabar-btn w-full py-2 rounded-lg font-bold">บันทึก</button>
          </form>
        )}
      </div>
    </div>
  );
};
