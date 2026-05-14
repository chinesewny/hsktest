/* ===========================================================
 * Student Dashboard – หน้าหลักนักเรียน
 * =========================================================== */
const { useState: useStateD, useEffect: useEffectD, useMemo: useMemoD } = React;

const SKILL_COLORS = {
  read: "#facc15",
  listen: "#38bdf8",
  speak: "#fb7185",
  write: "#34d399"
};

function AvatarBadge({ avatar, className = "h-14 w-14", textClassName = "text-2xl" }) {
  if (U.isImageAvatar(avatar)) {
    return <img src={avatar} alt="avatar" className={`${className} rounded-2xl object-cover border border-white/15 shadow-lg`} />;
  }
  return <div className={`${className} ${textClassName} flex items-center justify-center rounded-2xl bg-white/10`}>{avatar || "🐉"}</div>;
}

function SkillRadarChart({ skills }) {
  const points = skills.map((skill, index) => {
    const angle = (-Math.PI / 2) + (index * Math.PI * 2 / skills.length);
    const radius = 84 * ((skill.accuracy || 0) / 100);
    const x = 110 + Math.cos(angle) * radius;
    const y = 110 + Math.sin(angle) * radius;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="relative">
      <svg viewBox="0 0 220 220" className="mx-auto h-56 w-56 drop-shadow-[0_18px_40px_rgba(8,145,178,0.24)]">
        {[100, 75, 50, 25].map((ratio) => {
          const ring = skills.map((_, index) => {
            const angle = (-Math.PI / 2) + (index * Math.PI * 2 / skills.length);
            const radius = 84 * (ratio / 100);
            const x = 110 + Math.cos(angle) * radius;
            const y = 110 + Math.sin(angle) * radius;
            return `${x},${y}`;
          }).join(" ");
          return <polygon key={ratio} points={ring} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />;
        })}
        {skills.map((skill, index) => {
          const angle = (-Math.PI / 2) + (index * Math.PI * 2 / skills.length);
          const x = 110 + Math.cos(angle) * 92;
          const y = 110 + Math.sin(angle) * 92;
          return <line key={skill.type} x1="110" y1="110" x2={x} y2={y} stroke="rgba(255,255,255,0.14)" strokeWidth="1" />;
        })}
        <polygon points={points} fill="rgba(56,189,248,0.24)" stroke="rgba(125,211,252,0.9)" strokeWidth="3" />
        {skills.map((skill, index) => {
          const angle = (-Math.PI / 2) + (index * Math.PI * 2 / skills.length);
          const radius = 84 * ((skill.accuracy || 0) / 100);
          const x = 110 + Math.cos(angle) * radius;
          const y = 110 + Math.sin(angle) * radius;
          return <circle key={`${skill.type}-point`} cx={x} cy={y} r="5" fill={SKILL_COLORS[skill.type] || "#fff"} />;
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="rounded-full border border-[#d8c5ad] bg-[rgba(255,251,245,.96)] px-4 py-3 text-center backdrop-blur">
          <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--arena-jade)]">Average</div>
          <div className="text-3xl font-black text-[var(--arena-ink)]">
            {skills.length ? Math.round(skills.reduce((sum, skill) => sum + skill.accuracy, 0) / skills.length) : 0}%
          </div>
        </div>
      </div>
    </div>
  );
}

function TestBattleChart({ tests, maxScore }) {
  const recent = tests.slice(0, 5).reverse();
  if (!recent.length) {
    return <div className="rounded-2xl border border-dashed border-[#d8c5ad] bg-[#faf5ed] p-6 text-center text-sm text-[#7a665d]">ยังไม่มีผลสอบการแข่งขันในซีซันนี้</div>;
  }

  return (
    <div className="flex items-end gap-3 rounded-2xl border border-[#dfcfbb] bg-[#f8f2ea] p-4">
      {recent.map((test, index) => {
        const percent = maxScore ? Math.max(12, Math.round((Number(test.score || 0) / maxScore) * 100)) : 12;
        return (
          <div key={`${test.recordId || test.ts}-${index}`} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-40 w-full items-end justify-center rounded-2xl bg-[rgba(92,57,46,.06)] p-2">
              <div
                className="w-full rounded-xl bg-gradient-to-t from-rose-500 via-orange-400 to-yellow-300 shadow-[0_10px_30px_rgba(251,113,133,0.35)] transition-all"
                style={{ height: `${percent}%` }}
              ></div>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-[var(--arena-ink)]">{test.score}/{maxScore}</div>
              <div className="text-[11px] text-[#806b61]">{String(test.cycleKey || test.weekKey || "").replace(/^.+-W/, "W")}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

window.StudentDashboard = function StudentDashboard({ user, onNav, onLogout }) {
  const game = window.SystemSettings?.getGame ? window.SystemSettings.getGame() : window.APP_CONFIG.game;
  const competitionEnabled = game.competitionEnabled !== false;
  const [tick, setTick] = useStateD(0);
  const [openGuide, setOpenGuide] = useStateD(false);
  const [seasonStats, setSeasonStats] = useStateD(() => Progress.getStudentSeasonStats(user.studentId, user.classroom));
  const [classBoard, setClassBoard] = useStateD([]);
  useEffectD(() => { const i = setInterval(()=>setTick(t=>t+1), 60000); return () => clearInterval(i); }, []);
  useEffectD(() => {
    let cancelled = false;
    Progress.fetchStudentSeasonStats(user.studentId, user.classroom).then((stats) => {
      if (!cancelled && stats) setSeasonStats(stats);
    }).catch(() => {});
    Progress.fetchLeaderboard({ classroom: user.classroom, season: Progress.getSeason().number, top: 120 }).then((rows) => {
      if (!cancelled && rows) setClassBoard(rows);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user.studentId, user.classroom, tick]);

  const lvlInfo = useMemoD(() => U.calcLevel(user.xp || 0), [user.xp, tick]);
  const todayWords = useMemoD(() => Progress.getTodayWords(user.studentId, user.preferredLevel || 1), [user.studentId, tick]);
  const adaptivePlan = useMemoD(() => Progress.getAdaptiveSnapshot(user.studentId, user.preferredLevel || 1), [user.studentId, tick]);
  const myTests = useMemoD(() => Progress.getMyTests(user.studentId), [user.studentId, tick]);
  const season = Progress.getSeason();
  const training = useMemoD(() => Progress.getTrainingSummary(user.studentId), [user.studentId, tick]);
  const dailyReview = useMemoD(() => Progress.getDailyReviewSummary(user.studentId), [user.studentId, tick]);
  const dailySkills = useMemoD(() => Progress.getDailyReviewSkillSummary(user.studentId), [user.studentId, tick]);
  const testCycle = useMemoD(() => Progress.getTestCycleSummary(user.studentId), [user.studentId, tick]);
  const isTestDay = Progress.isTestDay();
  const tookThisWeek = Progress.hasTakenThisWeek(user.studentId);
  const seasonTests = useMemoD(() => myTests.filter(test => test.season === season.number), [myTests, season.number]);
  const competitionMaxScore = game.questionsPerTest * game.correctPoints;

  const cards = [
    {
      key:"train", title:"ฝึกวันนี้", emoji:"📚",
      desc: dailyReview.today
        ? `แบบฝึกหลังเรียน ${dailyReview.today.score}/${dailyReview.today.total} (${dailyReview.today.accuracy}%)`
        : (todayWords.length ? `${todayWords.length} คำใหม่รอคุณอยู่` : "วันนี้ไม่มีรอบฝึกใหม่"),
      color:"from-cyan-500 via-sky-500 to-blue-600",
      onClick: () => onNav("training"),
      badge: dailyReview.today
        ? `ทบทวนแล้ว ${dailyReview.today.accuracy}%`
        : (training.trainedToday ? "✓ ฝึกแล้ว" : (todayWords.length ? "ยังไม่ทำ" : "วันพัก")),
      attention: !dailyReview.today && !training.trainedToday && todayWords.length > 0
    },
    {
      key:"test", title:competitionEnabled && isTestDay ? "สอบวันนี้!" : "สอบรายสัปดาห์", emoji:"⚡",
      desc: !competitionEnabled
        ? "แอดมินยังไม่เปิดระบบการแข่งขัน"
        : (tookThisWeek ? "✓ สอบรอบนี้แล้ว" : (isTestDay ? `สุ่ม ${game.questionsPerTest} ข้อจาก ${testCycle.totalWords} คำ` : "เปิดตามวันที่ตั้งไว้")),
      color: competitionEnabled && isTestDay && !tookThisWeek ? "from-pink-500 via-rose-500 to-orange-400" : "from-slate-500 to-slate-700",
      onClick: () => competitionEnabled && isTestDay && !tookThisWeek && onNav("test"),
      disabled: !competitionEnabled || !isTestDay || tookThisWeek || !testCycle.isReady,
      attention: competitionEnabled && isTestDay && !tookThisWeek && testCycle.isReady
    },
    {
      key:"board", title:"อันดับห้อง", emoji:"🏆",
      desc: competitionEnabled ? `อันดับชั้น ${user.classroom}` : "จะเปิดเมื่อแอดมินเปิดระบบการแข่งขัน",
      color: competitionEnabled ? "from-amber-400 via-yellow-300 to-lime-400" : "from-slate-500 to-slate-700",
      onClick: () => competitionEnabled && onNav("leaderboard"),
      disabled: !competitionEnabled
    },
    {
      key:"shop", title:"ร้านไอเทม", emoji:"🛒",
      desc:`มีเหรียญ ${user.coins||0} 🪙`, color:"from-violet-500 via-fuchsia-500 to-pink-500",
      onClick: () => onNav("shop")
    },
    {
      key:"profile", title:"โปรไฟล์", emoji:"👤",
      desc:"สถิติและบัญชี", color:"from-emerald-400 via-teal-500 to-cyan-500",
      onClick: () => onNav("profile")
    },
    {
      key:"rewards", title:"รางวัลของฉัน", emoji:"🎁",
      desc:`${Progress.myRewards(user.studentId).length} ใบ`, color:"from-orange-400 via-amber-400 to-yellow-300",
      onClick: () => onNav("rewards")
    }
  ];

  if (user.role === "admin") {
    cards.push({
      key:"admin", title:"แผงควบคุมแอดมิน", emoji:"⚙️",
      desc:"จัดการทั้งระบบ", color:"from-[#4b1f24] via-[#69252c] to-[#2d1518]",
      onClick: () => onNav("admin")
    });
  }

  return (
    <div className="scholar-shell arena-shell arena-grid arena-noise min-h-screen text-[var(--arena-ink)]">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-white/40 bg-white/78 text-[var(--arena-ink)] backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AvatarBadge avatar={user.avatar} className="h-14 w-14" textClassName="text-2xl" />
            <div>
              <div className="font-bold">{user.fullname}</div>
              <div className="text-xs text-slate-500">{user.classroom} • รหัส {user.studentId}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-700 font-bold">🪙 {user.coins||0}</div>
            <div className="rounded-full bg-rose-100 px-3 py-1 text-sm text-rose-700 font-bold">🔥 {user.streak||0}</div>
            <button onClick={onLogout} className="cinnabar-btn px-3 py-1.5 rounded-lg text-sm">
              ออก
            </button>
          </div>
        </div>
      </div>

      {/* Hero – XP / Level */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="lacquer-panel rounded-[30px] p-6 shadow-2xl border border-white/15 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,.18),transparent_40%),linear-gradient(225deg,rgba(255,209,102,.20),transparent_46%)]"></div>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="relative z-10">
              <div className="font-display text-sm uppercase text-[var(--arena-gold-soft)]">My Learning Level</div>
              <div className="font-display text-5xl font-black text-[var(--arena-cream)]">Lv.{lvlInfo.level}</div>
              <div className="text-sm mt-2 text-white/88">XP {lvlInfo.currentXp} / {lvlInfo.nextXp}</div>
              <div className="w-64 h-3 bg-white/20 rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-yellow-300 to-orange-400 transition-all"
                     style={{width: `${(lvlInfo.currentXp/lvlInfo.nextXp)*100}%`}}></div>
              </div>
            </div>
            <div className="relative z-10 text-right">
              <div className="font-display text-sm uppercase text-cyan-100">Season Board</div>
              <div className="text-3xl font-bold">รอบ {season.roundsCompleted}/{game.seasonRounds}</div>
              <div className="text-sm mt-1 opacity-80">
                {seasonStats.rank ? `อันดับสะสม ${seasonStats.rank} ของ ${user.classroom}` : `รอคะแนนสะสมรอบแรกของ ${user.classroom}`}
              </div>
              <div className="w-48 h-2 bg-white/20 rounded-full mt-2 ml-auto overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-300 to-cyan-400"
                     style={{width: `${(season.roundsCompleted/game.seasonRounds)*100}%`}}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 lg:grid-cols-6 gap-3">
          {cards.map(c => (
            <button key={c.key} onClick={c.onClick} disabled={c.disabled}
                    className={`relative min-h-[132px] overflow-hidden bg-gradient-to-br ${c.color} rounded-2xl border border-white/20 p-4 text-left text-white shadow-lg hover:-translate-y-1 hover:shadow-xl transition disabled:opacity-50 disabled:hover:translate-y-0 ${c.attention ? "attention-glow ring-2 ring-white/50" : ""}`}>
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,.24),transparent_48%)]"></div>
              <div className="relative z-10 flex h-full flex-col justify-between">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-3xl">{c.emoji}</div>
                  {c.attention && (
                    <span className="attention-dot absolute right-3 top-3 h-3 w-3 rounded-full bg-yellow-300 shadow-[0_0_18px_rgba(250,204,21,.95)]"></span>
                  )}
                  {c.badge && <span className="max-w-[6rem] rounded-full bg-white/22 px-2 py-1 text-right text-[11px] leading-tight">{c.badge}</span>}
                </div>
                <div>
                  <div className="text-base font-bold leading-tight">{c.title}</div>
                  <div className="mt-1 text-xs leading-5 text-white/86">{c.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Student Summary */}
        <div className="mt-4 arena-panel rounded-2xl p-5">
          {!competitionEnabled && (
            <div className="mb-4 rounded-2xl border border-amber-300/40 bg-amber-100 px-4 py-3 text-sm text-[#7a4d22]">
              ระบบการแข่งขันยังปิดอยู่ในขณะนี้ นักเรียนยังฝึกคำศัพท์ประจำวันได้ตามปกติ และจะเข้าสอบได้เมื่อแอดมินเปิดระบบการแข่งขัน
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <div className="text-sm uppercase text-[var(--arena-jade)]">Today Plan</div>
              <h3 className="font-bold text-2xl">แผนฝึกของฉัน</h3>
            </div>
            <button type="button" onClick={() => setOpenGuide(v => !v)} className="ghost-btn rounded-full px-4 py-2 text-sm font-bold">
              {openGuide ? "ซ่อนรายละเอียด" : "ดูรายละเอียด HSK"}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
              <div className="text-sm text-cyan-700">คำวันนี้</div>
              <div className="text-3xl font-black text-cyan-700">{todayWords.length}</div>
              <div className="text-xs text-slate-500">คำศัพท์ที่รอฝึก</div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="text-sm text-emerald-700">ความแม่นยำล่าสุด</div>
              <div className="text-3xl font-black text-emerald-700">{dailyReview.today ? `${dailyReview.today.accuracy}%` : "--"}</div>
              <div className="text-xs text-slate-500">จากแบบฝึกหลังเรียน</div>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <div className="text-sm text-amber-700">ระดับที่เปิดแล้ว</div>
              <div className="text-3xl font-black text-amber-700">{adaptivePlan.unlocked.length}/3</div>
              <div className="text-xs text-slate-500">เริ่มจาก HSK {adaptivePlan.baseLevel}</div>
            </div>
          </div>
          {openGuide && (
            <div className="mt-4">
              <div className="mb-3 rounded-full bg-[#edf6ff] px-4 py-2 text-sm text-[#2d4764] inline-flex">
              เส้นทางการเรียน HSK {adaptivePlan.baseLevel} • ปลดล็อกแล้ว {adaptivePlan.unlocked.length}/3 ระดับ
              </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            {[1, 2, 3].map(lvl => {
              const isUnlocked = adaptivePlan.unlocked.includes(lvl);
              const isBase = lvl === adaptivePlan.baseLevel;
              const m = adaptivePlan.mastery[lvl] || 0;
              const s = adaptivePlan.samples[lvl] || 0;
              const allocated = adaptivePlan.distribution[lvl] || 0;
              const percent = Math.round(m * 100);
              const masteryLabel = s === 0 ? "ยังไม่มีข้อมูล" : `${percent}%`;
              const barColor = percent >= 70 ? "bg-emerald-400" : percent >= 50 ? "bg-yellow-400" : "bg-rose-400";
              return (
                <div key={lvl} className={`rounded-2xl border p-4 ${isUnlocked ? "border-emerald-300/40 bg-emerald-50" : "border-[#e5d8c7] bg-[#fbf7f1]"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold flex items-center gap-2">
                      HSK {lvl}
                      {isBase && <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] text-cyan-700">เริ่มต้น</span>}
                    </div>
                    {isUnlocked
                      ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">ปลดล็อก</span>
                      : <span className="rounded-full bg-[#efe5d8] px-2 py-0.5 text-xs text-[#7b665d]">🔒 ล็อก</span>}
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#eadfd1] mb-2">
                    <div className={`h-full rounded-full transition-all ${barColor}`}
                         style={{ width: `${Math.max(percent, 2)}%` }}></div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#7a665d]">
                    <span>ความแม่นยำ {masteryLabel}</span>
                    <span>{s} ข้อสะสม</span>
                  </div>
                  {isUnlocked ? (
                    <div className="mt-2 text-xs text-[#93651b]">
                      วันนี้แจก {allocated} คำ
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-[#8b776d]">
                      ปลดล็อกเมื่อระดับก่อนหน้า ≥ {Math.round((adaptivePlan.config?.unlockThreshold || 0.7) * 100)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {adaptivePlan.unlocked.length > 1 ? (
            <div className="rounded-xl bg-[#f5eee5] p-3 text-sm flex items-start gap-2">
              <span className="text-emerald-700">📈</span>
              <div>
                <div className="font-semibold text-emerald-800">แผนคำของวันนี้</div>
                <div className="text-[#5e4a42]">
                  {adaptivePlan.unlocked.map(lvl => `HSK ${lvl}: ${adaptivePlan.distribution[lvl] || 0} คำ`).join("  •  ")}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-[#f5eee5] p-3 text-xs text-[#78645c]">
              💡 ทำแบบฝึกหลังเรียนต่อเนื่อง — เมื่อความแม่นยำสูงพอ ระบบจะค่อย ๆ เริ่มแจกคำของระดับถัดไปให้ฝึกควบคู่
            </div>
          )}
            </div>
          )}
        </div>

        <details className="mt-4 arena-panel rounded-2xl p-5" open={false}>
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm uppercase text-[var(--arena-jade)]">Progress Center</div>
              <h3 className="font-bold text-2xl">สรุปความก้าวหน้าของนักเรียน</h3>
            </div>
            <div className="rounded-full bg-[#edf6ff] px-4 py-2 text-sm font-bold text-[#2d4764]">
              ฝึกแล้ว {training.completedDays}/{training.totalDays} วัน • สอบแล้ว {seasonStats.testCount}/{game.seasonRounds} รอบ
            </div>
          </summary>
          <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="rounded-[28px] border border-cyan-200/80 bg-[linear-gradient(145deg,#eff8ff,#dff1fb_55%,#eef8fb)] p-5 text-[var(--arena-ink)] shadow-[0_20px_60px_rgba(6,182,212,0.12)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm uppercase tracking-[0.26em] text-[#238f98]">Daily Review</div>
                  <div className="text-xl font-bold">พัฒนาการจากแบบฝึกหัดรายวัน</div>
                </div>
                <div className="rounded-2xl border border-cyan-200 bg-white/75 px-4 py-2 text-right">
                  <div className="text-xs text-[#5f8288]">วันนี้</div>
                  <div className="text-lg font-bold text-[#238f98]">
                    {dailyReview.today ? `${dailyReview.today.score}/${dailyReview.today.total}` : "--"}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1.1fr_.9fr] gap-4">
                <SkillRadarChart skills={dailySkills.skills} />
                <div className="space-y-3">
                  {dailySkills.skills.map((skill) => (
                    <div key={skill.type} className="rounded-2xl border border-cyan-100 bg-white/72 p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">{skill.label}</span>
                        <span className="text-[#56737a]">{skill.correct}/{skill.total || 0} ข้อ</span>
                      </div>
                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#d7e8ee]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${skill.accuracy}%`, background: SKILL_COLORS[skill.type] || "#fff" }}
                        ></div>
                      </div>
                      <div className="mt-1 text-right text-xs text-[#63828a]">{skill.accuracy}%</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl bg-white/72 p-3 border border-cyan-100">
                  <div className="text-[#5f8288]">เฉลี่ยสัปดาห์นี้</div>
                  <div className="text-2xl font-bold text-cyan-600">{dailyReview.avgAccuracy || 0}%</div>
                </div>
                <div className="rounded-xl bg-white/72 p-3 border border-emerald-100">
                  <div className="text-[#5d8474]">วันที่ทำแล้ว</div>
                  <div className="text-2xl font-bold text-emerald-600">{dailyReview.completedDays}</div>
                </div>
                <div className="rounded-xl bg-white/72 p-3 border border-yellow-100">
                  <div className="text-[#8e7442]">คำศัพท์รอบนี้</div>
                  <div className="text-2xl font-bold text-yellow-600">{training.totalWords}</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-5 gap-2">
                {dailySkills.timeline.slice(0, 5).map((day) => {
                  const dayLabel = new Date(day.date).toLocaleDateString("th-TH", { weekday: "short" });
                  return (
                    <div key={day.date} className={`rounded-2xl border p-3 text-center ${day.review ? "border-emerald-200 bg-emerald-50" : "border-cyan-100 bg-white/72"}`}>
                      <div className="text-xs text-[#6f8489]">{dayLabel}</div>
                      <div className="mt-1 text-2xl">{day.review ? "✨" : "•"}</div>
                      <div className="text-xs font-semibold text-[#44575e]">{day.review ? `${day.accuracy}%` : "รอฝึก"}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[28px] border border-rose-200/80 bg-[linear-gradient(145deg,#fbf1f4,#f5e1e8_55%,#f8eef2)] p-5 text-[var(--arena-ink)] shadow-[0_20px_60px_rgba(244,114,182,0.10)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm uppercase tracking-[0.26em] text-[#b9772a]">Battle Progress</div>
                  <div className="text-xl font-bold">ความคืบหน้าการแข่งขันของสายชั้น</div>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-white/75 px-4 py-2 text-right">
                  <div className="text-xs text-[#8a6d4c]">อันดับปัจจุบัน</div>
                  <div className="text-lg font-bold text-[#b9772a]">
                    {seasonStats.rank ? `#${seasonStats.rank}` : "--"}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl border border-yellow-100 bg-white/72 p-3">
                  <div className="text-[#8f7444]">คะแนนสะสมซีซัน</div>
                  <div className="text-2xl font-bold text-yellow-600">{seasonStats.totalScore}</div>
                </div>
                <div className="rounded-xl border border-rose-100 bg-white/72 p-3">
                  <div className="text-[#8a6870]">อันดับในห้อง</div>
                  <div className="text-2xl font-bold text-rose-600">
                    {seasonStats.rank ? `${seasonStats.rank}/${classBoard.length || 0}` : "--"}
                  </div>
                </div>
                <div className="rounded-xl border border-cyan-100 bg-white/72 p-3">
                  <div className="text-[#637f86]">รอบสอบที่ทำ</div>
                  <div className="text-2xl font-bold text-cyan-600">{seasonStats.testCount}/{game.seasonRounds}</div>
                </div>
              </div>
              <div className="mt-4">
                <TestBattleChart tests={seasonTests} maxScore={competitionMaxScore} />
              </div>
              <div className="mt-4 rounded-2xl border border-rose-100 bg-white/72 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold">ภารกิจซีซัน</div>
                  <div className="text-sm text-[#876c6d]">{season.roundsCompleted}/{game.seasonRounds} รอบ</div>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-[#ead7db]">
                  <div className="h-full bg-gradient-to-r from-rose-400 via-orange-400 to-yellow-300 transition-all"
                       style={{width: `${(season.roundsCompleted/game.seasonRounds)*100}%`}}></div>
                </div>
                <div className="mt-3 grid grid-cols-7 gap-2">
                  {["จ","อ","พ","พฤ","ศ","ส","อา"].map((d,i) => {
                    const monday = training.cycle.monday;
                    const day = new Date(monday); day.setDate(monday.getDate()+i);
                    const all = U.ls.get("hsk_daily_progress", {});
                    const done = (all[user.studentId]||{})[U.toISO(day)];
                    const isToday = U.toISO(day) === U.toISO();
                    const isTestD = i === 0 && Progress.hasTakenThisWeek(user.studentId);
                    return (
                      <div key={i} className={`text-center p-2 rounded-lg border-2 ${
                        isToday ? "border-yellow-400" : "border-rose-100"
                      } ${done ? "bg-emerald-50" : "bg-white/78"}`}>
                        <div className="text-xs">{d}</div>
                        <div className="text-xl">{done ? "✓" : (i===0 && isTestD ? "⚔️" : (i<5 ? "📝" : "🎮"))}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 text-sm text-[#765f60]">
                  รอบสอบถัดไป: <span className="font-semibold text-[#b9772a]">{testCycle.cycle.key}</span>
                  {isTestDay && !tookThisWeek ? ` • วันนี้เปิดสอบ ${game.questionsPerTest} ข้อ` : ""}
                </div>
              </div>
            </div>
          </div>
        </details>

        <div className="mt-4 rounded-2xl border border-yellow-400/30 bg-yellow-50 p-4 text-[var(--arena-ink)]">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-sm text-[#9a6818]">สรุปแบบ 2 ส่วน</div>
              <div className="text-lg font-bold">ด้านซ้ายคือพัฒนาการรายวัน ด้านขวาคือความคืบหน้าการแข่งขันทั้งซีซัน</div>
            </div>
            <div className="text-sm text-[#8b6748]">
              ยิ่งทำแบบฝึกรายวันสม่ำเสมอ โอกาสไต่อันดับในการแข่งขันก็ยิ่งดีขึ้น
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-10">
        {/* Recent Tests */}
        {myTests.length > 0 && (
          <div className="mt-6 arena-panel rounded-2xl p-5 border border-white/10">
            <h3 className="font-bold text-lg mb-3">📊 ประวัติการสอบล่าสุด</h3>
            <div className="space-y-2">
              {myTests.slice(0,5).map((t,i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-[rgba(92,57,46,.06)] p-3">
                  <div>
                    <div className="font-semibold">สอบ {t.weekKey}</div>
                    <div className="text-xs text-[#816b61]">{new Date(t.ts).toLocaleString("th-TH")}</div>
                  </div>
                  <div className={`text-2xl font-bold ${t.score >= t.total*0.8 ? "text-emerald-600" : t.score >= t.total*0.5 ? "text-yellow-600" : "text-rose-600"}`}>
                    {t.score}/{t.total*game.correctPoints}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-yellow-300 bg-yellow-50 p-5 text-[var(--arena-ink)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm text-[#a26d19]">ภารกิจชิงแชมป์ {game.seasonRounds} รอบ</div>
              <div className="text-xl font-bold">คะแนนรวมทั้งซีซันใช้ตัดสินรางวัลใหญ่ปลายรอบ</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-yellow-700">{seasonStats.testCount}/{game.seasonRounds}</div>
              <div className="text-sm text-[#8a6a4f]">ครั้งที่ทำสอบแล้ว</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
