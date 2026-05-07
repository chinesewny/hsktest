/* ===========================================================
 * Student Dashboard – หน้าหลักนักเรียน
 * =========================================================== */
const {
  useState: useStateD,
  useEffect: useEffectD,
  useMemo: useMemoD
} = React;
const SKILL_COLORS = {
  read: "#facc15",
  listen: "#38bdf8",
  speak: "#fb7185",
  write: "#34d399"
};
function AvatarBadge({
  avatar,
  className = "h-14 w-14",
  textClassName = "text-2xl"
}) {
  if (U.isImageAvatar(avatar)) {
    return /*#__PURE__*/React.createElement("img", {
      src: avatar,
      alt: "avatar",
      className: `${className} rounded-2xl object-cover border border-white/15 shadow-lg`
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    className: `${className} ${textClassName} flex items-center justify-center rounded-2xl bg-white/10`
  }, avatar || "🐉");
}
function SkillRadarChart({
  skills
}) {
  const points = skills.map((skill, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / skills.length;
    const radius = 84 * ((skill.accuracy || 0) / 100);
    const x = 110 + Math.cos(angle) * radius;
    const y = 110 + Math.sin(angle) * radius;
    return `${x},${y}`;
  }).join(" ");
  return /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 220 220",
    className: "mx-auto h-56 w-56 drop-shadow-[0_18px_40px_rgba(8,145,178,0.24)]"
  }, [100, 75, 50, 25].map(ratio => {
    const ring = skills.map((_, index) => {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / skills.length;
      const radius = 84 * (ratio / 100);
      const x = 110 + Math.cos(angle) * radius;
      const y = 110 + Math.sin(angle) * radius;
      return `${x},${y}`;
    }).join(" ");
    return /*#__PURE__*/React.createElement("polygon", {
      key: ratio,
      points: ring,
      fill: "none",
      stroke: "rgba(255,255,255,0.16)",
      strokeWidth: "1"
    });
  }), skills.map((skill, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / skills.length;
    const x = 110 + Math.cos(angle) * 92;
    const y = 110 + Math.sin(angle) * 92;
    return /*#__PURE__*/React.createElement("line", {
      key: skill.type,
      x1: "110",
      y1: "110",
      x2: x,
      y2: y,
      stroke: "rgba(255,255,255,0.14)",
      strokeWidth: "1"
    });
  }), /*#__PURE__*/React.createElement("polygon", {
    points: points,
    fill: "rgba(56,189,248,0.24)",
    stroke: "rgba(125,211,252,0.9)",
    strokeWidth: "3"
  }), skills.map((skill, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / skills.length;
    const radius = 84 * ((skill.accuracy || 0) / 100);
    const x = 110 + Math.cos(angle) * radius;
    const y = 110 + Math.sin(angle) * radius;
    return /*#__PURE__*/React.createElement("circle", {
      key: `${skill.type}-point`,
      cx: x,
      cy: y,
      r: "5",
      fill: SKILL_COLORS[skill.type] || "#fff"
    });
  })), /*#__PURE__*/React.createElement("div", {
    className: "pointer-events-none absolute inset-0 flex items-center justify-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-full border border-[#d8c5ad] bg-[rgba(255,251,245,.96)] px-4 py-3 text-center backdrop-blur"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-[0.28em] text-[var(--arena-jade)]"
  }, "Average"), /*#__PURE__*/React.createElement("div", {
    className: "text-3xl font-black text-[var(--arena-ink)]"
  }, skills.length ? Math.round(skills.reduce((sum, skill) => sum + skill.accuracy, 0) / skills.length) : 0, "%"))));
}
function TestBattleChart({
  tests,
  maxScore
}) {
  const recent = tests.slice(0, 5).reverse();
  if (!recent.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "rounded-2xl border border-dashed border-[#d8c5ad] bg-[#faf5ed] p-6 text-center text-sm text-[#7a665d]"
    }, "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E1C\u0E25\u0E2A\u0E2D\u0E1A\u0E01\u0E32\u0E23\u0E41\u0E02\u0E48\u0E07\u0E02\u0E31\u0E19\u0E43\u0E19\u0E0B\u0E35\u0E0B\u0E31\u0E19\u0E19\u0E35\u0E49");
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-end gap-3 rounded-2xl border border-[#dfcfbb] bg-[#f8f2ea] p-4"
  }, recent.map((test, index) => {
    const percent = maxScore ? Math.max(12, Math.round(Number(test.score || 0) / maxScore * 100)) : 12;
    return /*#__PURE__*/React.createElement("div", {
      key: `${test.recordId || test.ts}-${index}`,
      className: "flex flex-1 flex-col items-center gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex h-40 w-full items-end justify-center rounded-2xl bg-[rgba(92,57,46,.06)] p-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-full rounded-xl bg-gradient-to-t from-rose-500 via-orange-400 to-yellow-300 shadow-[0_10px_30px_rgba(251,113,133,0.35)] transition-all",
      style: {
        height: `${percent}%`
      }
    })), /*#__PURE__*/React.createElement("div", {
      className: "text-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-xs font-bold text-[var(--arena-ink)]"
    }, test.score, "/", maxScore), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-[#806b61]"
    }, String(test.cycleKey || test.weekKey || "").replace(/^.+-W/, "W"))));
  }));
}
window.StudentDashboard = function StudentDashboard({
  user,
  onNav,
  onLogout
}) {
  const game = window.SystemSettings?.getGame ? window.SystemSettings.getGame() : window.APP_CONFIG.game;
  const competitionEnabled = game.competitionEnabled !== false;
  const [tick, setTick] = useStateD(0);
  const [seasonStats, setSeasonStats] = useStateD(() => Progress.getStudentSeasonStats(user.studentId, user.classroom));
  const [classBoard, setClassBoard] = useStateD([]);
  useEffectD(() => {
    const i = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(i);
  }, []);
  useEffectD(() => {
    let cancelled = false;
    Progress.fetchStudentSeasonStats(user.studentId, user.classroom).then(stats => {
      if (!cancelled && stats) setSeasonStats(stats);
    }).catch(() => {});
    Progress.fetchLeaderboard({
      classroom: user.classroom,
      season: Progress.getSeason().number,
      top: 120
    }).then(rows => {
      if (!cancelled && rows) setClassBoard(rows);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
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
  const cards = [{
    key: "train",
    title: "ฝึกฝนวันนี้",
    emoji: "📚",
    desc: dailyReview.today ? `แบบฝึกหลังเรียน ${dailyReview.today.score}/${dailyReview.today.total} (${dailyReview.today.accuracy}%)` : todayWords.length ? `${todayWords.length} คำใหม่รอคุณอยู่` : "วันนี้ไม่มีรอบฝึกใหม่",
    color: "from-emerald-500 via-teal-500 to-cyan-500",
    onClick: () => onNav("training"),
    badge: dailyReview.today ? `ทบทวนแล้ว ${dailyReview.today.accuracy}%` : training.trainedToday ? "✓ ฝึกแล้ว" : todayWords.length ? "ยังไม่ทำ" : "วันพัก"
  }, {
    key: "test",
    title: competitionEnabled && isTestDay ? "🔥 สอบประจำสัปดาห์!" : "ทดสอบประจำสัปดาห์",
    emoji: "⚔️",
    desc: !competitionEnabled ? "แอดมินยังไม่เปิดระบบการแข่งขัน" : tookThisWeek ? "✓ สอบรอบนี้แล้ว" : isTestDay ? `สุ่ม ${game.questionsPerTest} ข้อจาก ${testCycle.totalWords} คำ` : "เปิดตามวันที่ตั้งไว้",
    color: competitionEnabled && isTestDay && !tookThisWeek ? "from-rose-700 via-red-600 to-amber-500" : "from-stone-500 to-stone-700",
    onClick: () => competitionEnabled && isTestDay && !tookThisWeek && onNav("test"),
    disabled: !competitionEnabled || !isTestDay || tookThisWeek || !testCycle.isReady
  }, {
    key: "board",
    title: "กระดานผู้นำ",
    emoji: "🏆",
    desc: competitionEnabled ? `อันดับชั้น ${user.classroom}` : "จะเปิดเมื่อแอดมินเปิดระบบการแข่งขัน",
    color: competitionEnabled ? "from-amber-500 via-yellow-400 to-orange-400" : "from-stone-500 to-stone-700",
    onClick: () => competitionEnabled && onNav("leaderboard"),
    disabled: !competitionEnabled
  }, {
    key: "shop",
    title: "ร้านค้าไอเทม",
    emoji: "🛒",
    desc: `มีเหรียญ ${user.coins || 0} 🪙`,
    color: "from-red-600 via-rose-600 to-orange-500",
    onClick: () => onNav("shop")
  }, {
    key: "profile",
    title: "โปรไฟล์",
    emoji: "👤",
    desc: "ดูสถิติและความสำเร็จ",
    color: "from-slate-700 via-zinc-700 to-stone-700",
    onClick: () => onNav("profile")
  }, {
    key: "rewards",
    title: "ของรางวัลของฉัน",
    emoji: "🎁",
    desc: `${Progress.myRewards(user.studentId).length} ใบ`,
    color: "from-amber-600 via-orange-500 to-red-500",
    onClick: () => onNav("rewards")
  }];
  if (user.role === "admin") {
    cards.push({
      key: "admin",
      title: "แผงควบคุมแอดมิน",
      emoji: "⚙️",
      desc: "จัดการทั้งระบบ",
      color: "from-[#4b1f24] via-[#69252c] to-[#2d1518]",
      onClick: () => onNav("admin")
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "scholar-shell arena-shell arena-grid arena-noise min-h-screen text-[var(--arena-ink)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "arena-orb bg-emerald-300/20 h-36 w-36 left-[6%] top-[10%]"
  }), /*#__PURE__*/React.createElement("div", {
    className: "arena-orb bg-yellow-300/20 h-52 w-52 right-[8%] top-[22%]",
    style: {
      animationDelay: "1.8s"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "sticky top-0 z-40 border-b border-white/10 bg-[rgba(44,20,22,.78)] text-white backdrop-blur"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-6xl mx-auto px-4 py-3 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement(AvatarBadge, {
    avatar: user.avatar,
    className: "h-14 w-14",
    textClassName: "text-2xl"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "font-bold"
  }, user.fullname), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-white/60"
  }, user.classroom, " \u2022 \u0E23\u0E2B\u0E31\u0E2A ", user.studentId))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-amber-300 font-bold"
  }, "\uD83E\uDE99 ", user.coins || 0), /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-orange-300 font-bold"
  }, "\uD83D\uDD25 ", user.streak || 0), /*#__PURE__*/React.createElement("button", {
    onClick: onLogout,
    className: "cinnabar-btn px-3 py-1.5 rounded-lg text-sm"
  }, "\u0E2D\u0E2D\u0E01")))), /*#__PURE__*/React.createElement("div", {
    className: "max-w-6xl mx-auto px-4 py-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lacquer-panel rounded-[30px] p-6 shadow-2xl border border-white/15 relative overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(78,216,223,.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(241,91,76,.16),transparent_28%),linear-gradient(135deg,rgba(246,198,79,.14),transparent_50%)]"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between flex-wrap gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative z-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-display text-sm uppercase tracking-[0.28em] text-[var(--arena-gold-soft)]"
  }, "Scholar Rank"), /*#__PURE__*/React.createElement("div", {
    className: "font-display text-5xl font-black text-[var(--arena-cream)]"
  }, "Lv.", lvlInfo.level), /*#__PURE__*/React.createElement("div", {
    className: "text-sm mt-2"
  }, "XP ", lvlInfo.currentXp, " / ", lvlInfo.nextXp), /*#__PURE__*/React.createElement("div", {
    className: "w-64 h-3 bg-white/20 rounded-full mt-1 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-gradient-to-r from-yellow-300 to-orange-400 transition-all",
    style: {
      width: `${lvlInfo.currentXp / lvlInfo.nextXp * 100}%`
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "relative z-10 text-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-display text-sm uppercase tracking-[0.28em] text-[var(--arena-jade-soft)]"
  }, "Season Board"), /*#__PURE__*/React.createElement("div", {
    className: "text-3xl font-bold"
  }, "\u0E23\u0E2D\u0E1A ", season.roundsCompleted, "/", game.seasonRounds), /*#__PURE__*/React.createElement("div", {
    className: "text-sm mt-1 opacity-80"
  }, seasonStats.rank ? `อันดับสะสม ${seasonStats.rank} ของ ${user.classroom}` : `รอคะแนนสะสมรอบแรกของ ${user.classroom}`), /*#__PURE__*/React.createElement("div", {
    className: "w-48 h-2 bg-white/20 rounded-full mt-2 ml-auto overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-gradient-to-r from-emerald-300 to-cyan-400",
    style: {
      width: `${season.roundsCompleted / game.seasonRounds * 100}%`
    }
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 arena-panel rounded-2xl p-5"
  }, !competitionEnabled && /*#__PURE__*/React.createElement("div", {
    className: "mb-4 rounded-2xl border border-amber-300/40 bg-amber-100 px-4 py-3 text-sm text-[#7a4d22]"
  }, "\u0E23\u0E30\u0E1A\u0E1A\u0E01\u0E32\u0E23\u0E41\u0E02\u0E48\u0E07\u0E02\u0E31\u0E19\u0E22\u0E31\u0E07\u0E1B\u0E34\u0E14\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E02\u0E13\u0E30\u0E19\u0E35\u0E49 \u0E19\u0E31\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19\u0E22\u0E31\u0E07\u0E1D\u0E36\u0E01\u0E04\u0E33\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E27\u0E31\u0E19\u0E44\u0E14\u0E49\u0E15\u0E32\u0E21\u0E1B\u0E01\u0E15\u0E34 \u0E41\u0E25\u0E30\u0E08\u0E30\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E2D\u0E1A\u0E44\u0E14\u0E49\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E40\u0E1B\u0E34\u0E14\u0E23\u0E30\u0E1A\u0E1A\u0E01\u0E32\u0E23\u0E41\u0E02\u0E48\u0E07\u0E02\u0E31\u0E19"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-sm uppercase tracking-[0.28em] text-[var(--arena-jade)]"
  }, "Adaptive Learning"), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-2xl"
  }, "\u0E01\u0E32\u0E23\u0E2A\u0E38\u0E48\u0E21\u0E04\u0E33\u0E15\u0E32\u0E21\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E40\u0E23\u0E35\u0E22\u0E19\u0E23\u0E39\u0E49"), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-[#75625a] mt-1"
  }, "\u0E23\u0E30\u0E1A\u0E1A\u0E08\u0E30\u0E1B\u0E25\u0E14\u0E25\u0E47\u0E2D\u0E01 HSK \u0E23\u0E30\u0E14\u0E31\u0E1A\u0E16\u0E31\u0E14\u0E44\u0E1B\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E41\u0E21\u0E48\u0E19\u0E22\u0E33\u0E02\u0E2D\u0E07\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19\u0E16\u0E36\u0E07 ", Math.round((adaptivePlan.config?.unlockThreshold || 0.7) * 100), "%")), /*#__PURE__*/React.createElement("div", {
    className: "rounded-full bg-[#f3eadc] px-4 py-2 text-sm text-[#5b433b]"
  }, "\u0E40\u0E2A\u0E49\u0E19\u0E17\u0E32\u0E07\u0E01\u0E32\u0E23\u0E40\u0E23\u0E35\u0E22\u0E19 HSK ", adaptivePlan.baseLevel, " \u2022 \u0E1B\u0E25\u0E14\u0E25\u0E47\u0E2D\u0E01\u0E41\u0E25\u0E49\u0E27 ", adaptivePlan.unlocked.length, "/3 \u0E23\u0E30\u0E14\u0E31\u0E1A")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-3 gap-3 mb-3"
  }, [1, 2, 3].map(lvl => {
    const isUnlocked = adaptivePlan.unlocked.includes(lvl);
    const isBase = lvl === adaptivePlan.baseLevel;
    const m = adaptivePlan.mastery[lvl] || 0;
    const s = adaptivePlan.samples[lvl] || 0;
    const allocated = adaptivePlan.distribution[lvl] || 0;
    const percent = Math.round(m * 100);
    const masteryLabel = s === 0 ? "ยังไม่มีข้อมูล" : `${percent}%`;
    const barColor = percent >= 70 ? "bg-emerald-400" : percent >= 50 ? "bg-yellow-400" : "bg-rose-400";
    return /*#__PURE__*/React.createElement("div", {
      key: lvl,
      className: `rounded-2xl border p-4 ${isUnlocked ? "border-emerald-300/40 bg-emerald-50" : "border-[#e5d8c7] bg-[#fbf7f1]"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-bold flex items-center gap-2"
    }, "HSK ", lvl, isBase && /*#__PURE__*/React.createElement("span", {
      className: "rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] text-cyan-700"
    }, "\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19")), isUnlocked ? /*#__PURE__*/React.createElement("span", {
      className: "rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700"
    }, "\u0E1B\u0E25\u0E14\u0E25\u0E47\u0E2D\u0E01") : /*#__PURE__*/React.createElement("span", {
      className: "rounded-full bg-[#efe5d8] px-2 py-0.5 text-xs text-[#7b665d]"
    }, "\uD83D\uDD12 \u0E25\u0E47\u0E2D\u0E01")), /*#__PURE__*/React.createElement("div", {
      className: "h-2 overflow-hidden rounded-full bg-[#eadfd1] mb-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: `h-full rounded-full transition-all ${barColor}`,
      style: {
        width: `${Math.max(percent, 2)}%`
      }
    })), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between text-xs text-[#7a665d]"
    }, /*#__PURE__*/React.createElement("span", null, "\u0E04\u0E27\u0E32\u0E21\u0E41\u0E21\u0E48\u0E19\u0E22\u0E33 ", masteryLabel), /*#__PURE__*/React.createElement("span", null, s, " \u0E02\u0E49\u0E2D\u0E2A\u0E30\u0E2A\u0E21")), isUnlocked ? /*#__PURE__*/React.createElement("div", {
      className: "mt-2 text-xs text-[#93651b]"
    }, "\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49\u0E41\u0E08\u0E01 ", allocated, " \u0E04\u0E33") : /*#__PURE__*/React.createElement("div", {
      className: "mt-2 text-xs text-[#8b776d]"
    }, "\u0E1B\u0E25\u0E14\u0E25\u0E47\u0E2D\u0E01\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E01\u0E48\u0E2D\u0E19\u0E2B\u0E19\u0E49\u0E32 \u2265 ", Math.round((adaptivePlan.config?.unlockThreshold || 0.7) * 100), "%"));
  })), adaptivePlan.unlocked.length > 1 ? /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl bg-[#f5eee5] p-3 text-sm flex items-start gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-emerald-700"
  }, "\uD83D\uDCC8"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "font-semibold text-emerald-800"
  }, "\u0E41\u0E1C\u0E19\u0E04\u0E33\u0E02\u0E2D\u0E07\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49"), /*#__PURE__*/React.createElement("div", {
    className: "text-[#5e4a42]"
  }, adaptivePlan.unlocked.map(lvl => `HSK ${lvl}: ${adaptivePlan.distribution[lvl] || 0} คำ`).join("  •  ")))) : /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl bg-[#f5eee5] p-3 text-xs text-[#78645c]"
  }, "\uD83D\uDCA1 \u0E17\u0E33\u0E41\u0E1A\u0E1A\u0E1D\u0E36\u0E01\u0E2B\u0E25\u0E31\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E15\u0E48\u0E2D\u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07 \u2014 \u0E40\u0E21\u0E37\u0E48\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E41\u0E21\u0E48\u0E19\u0E22\u0E33\u0E2A\u0E39\u0E07\u0E1E\u0E2D \u0E23\u0E30\u0E1A\u0E1A\u0E08\u0E30\u0E04\u0E48\u0E2D\u0E22 \u0E46 \u0E40\u0E23\u0E34\u0E48\u0E21\u0E41\u0E08\u0E01\u0E04\u0E33\u0E02\u0E2D\u0E07\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E16\u0E31\u0E14\u0E44\u0E1B\u0E43\u0E2B\u0E49\u0E1D\u0E36\u0E01\u0E04\u0E27\u0E1A\u0E04\u0E39\u0E48")), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 arena-panel rounded-2xl p-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-sm uppercase tracking-[0.28em] text-[var(--arena-jade)]"
  }, "Student Summary"), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-2xl"
  }, "\u0E2A\u0E23\u0E38\u0E1B\u0E04\u0E27\u0E32\u0E21\u0E01\u0E49\u0E32\u0E27\u0E2B\u0E19\u0E49\u0E32\u0E02\u0E2D\u0E07\u0E19\u0E31\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19")), /*#__PURE__*/React.createElement("div", {
    className: "rounded-full bg-[#f5eee5] px-4 py-2 text-sm text-[#6f5a50]"
  }, "\u0E1D\u0E36\u0E01\u0E41\u0E25\u0E49\u0E27 ", training.completedDays, "/", training.totalDays, " \u0E27\u0E31\u0E19 \u2022 \u0E2A\u0E2D\u0E1A\u0E41\u0E25\u0E49\u0E27 ", seasonStats.testCount, "/", game.seasonRounds, " \u0E23\u0E2D\u0E1A")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 xl:grid-cols-2 gap-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-[28px] border border-cyan-200/80 bg-[linear-gradient(145deg,#eff8ff,#dff1fb_55%,#eef8fb)] p-5 text-[var(--arena-ink)] shadow-[0_20px_60px_rgba(6,182,212,0.12)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-sm uppercase tracking-[0.26em] text-[#238f98]"
  }, "Daily Review"), /*#__PURE__*/React.createElement("div", {
    className: "text-xl font-bold"
  }, "\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E01\u0E32\u0E23\u0E08\u0E32\u0E01\u0E41\u0E1A\u0E1A\u0E1D\u0E36\u0E01\u0E2B\u0E31\u0E14\u0E23\u0E32\u0E22\u0E27\u0E31\u0E19")), /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-cyan-200 bg-white/75 px-4 py-2 text-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-[#5f8288]"
  }, "\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49"), /*#__PURE__*/React.createElement("div", {
    className: "text-lg font-bold text-[#238f98]"
  }, dailyReview.today ? `${dailyReview.today.score}/${dailyReview.today.total}` : "--"))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 grid grid-cols-1 lg:grid-cols-[1.1fr_.9fr] gap-4"
  }, /*#__PURE__*/React.createElement(SkillRadarChart, {
    skills: dailySkills.skills
  }), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, dailySkills.skills.map(skill => /*#__PURE__*/React.createElement("div", {
    key: skill.type,
    className: "rounded-2xl border border-cyan-100 bg-white/72 p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, skill.label), /*#__PURE__*/React.createElement("span", {
    className: "text-[#56737a]"
  }, skill.correct, "/", skill.total || 0, " \u0E02\u0E49\u0E2D")), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 h-3 overflow-hidden rounded-full bg-[#d7e8ee]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full rounded-full transition-all",
    style: {
      width: `${skill.accuracy}%`,
      background: SKILL_COLORS[skill.type] || "#fff"
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-1 text-right text-xs text-[#63828a]"
  }, skill.accuracy, "%"))))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl bg-white/72 p-3 border border-cyan-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[#5f8288]"
  }, "\u0E40\u0E09\u0E25\u0E35\u0E48\u0E22\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C\u0E19\u0E35\u0E49"), /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-cyan-600"
  }, dailyReview.avgAccuracy || 0, "%")), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl bg-white/72 p-3 border border-emerald-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[#5d8474]"
  }, "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E17\u0E33\u0E41\u0E25\u0E49\u0E27"), /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-emerald-600"
  }, dailyReview.completedDays)), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl bg-white/72 p-3 border border-yellow-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[#8e7442]"
  }, "\u0E04\u0E33\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E23\u0E2D\u0E1A\u0E19\u0E35\u0E49"), /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-yellow-600"
  }, training.totalWords))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 grid grid-cols-5 gap-2"
  }, dailySkills.timeline.slice(0, 5).map(day => {
    const dayLabel = new Date(day.date).toLocaleDateString("th-TH", {
      weekday: "short"
    });
    return /*#__PURE__*/React.createElement("div", {
      key: day.date,
      className: `rounded-2xl border p-3 text-center ${day.review ? "border-emerald-200 bg-emerald-50" : "border-cyan-100 bg-white/72"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-[#6f8489]"
    }, dayLabel), /*#__PURE__*/React.createElement("div", {
      className: "mt-1 text-2xl"
    }, day.review ? "✨" : "•"), /*#__PURE__*/React.createElement("div", {
      className: "text-xs font-semibold text-[#44575e]"
    }, day.review ? `${day.accuracy}%` : "รอฝึก"));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "rounded-[28px] border border-rose-200/80 bg-[linear-gradient(145deg,#fbf1f4,#f5e1e8_55%,#f8eef2)] p-5 text-[var(--arena-ink)] shadow-[0_20px_60px_rgba(244,114,182,0.10)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-sm uppercase tracking-[0.26em] text-[#b9772a]"
  }, "Battle Progress"), /*#__PURE__*/React.createElement("div", {
    className: "text-xl font-bold"
  }, "\u0E04\u0E27\u0E32\u0E21\u0E04\u0E37\u0E1A\u0E2B\u0E19\u0E49\u0E32\u0E01\u0E32\u0E23\u0E41\u0E02\u0E48\u0E07\u0E02\u0E31\u0E19\u0E02\u0E2D\u0E07\u0E2A\u0E32\u0E22\u0E0A\u0E31\u0E49\u0E19")), /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-amber-200 bg-white/75 px-4 py-2 text-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-[#8a6d4c]"
  }, "\u0E2D\u0E31\u0E19\u0E14\u0E31\u0E1A\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19"), /*#__PURE__*/React.createElement("div", {
    className: "text-lg font-bold text-[#b9772a]"
  }, seasonStats.rank ? `#${seasonStats.rank}` : "--"))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-yellow-100 bg-white/72 p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[#8f7444]"
  }, "\u0E04\u0E30\u0E41\u0E19\u0E19\u0E2A\u0E30\u0E2A\u0E21\u0E0B\u0E35\u0E0B\u0E31\u0E19"), /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-yellow-600"
  }, seasonStats.totalScore)), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-rose-100 bg-white/72 p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[#8a6870]"
  }, "\u0E2D\u0E31\u0E19\u0E14\u0E31\u0E1A\u0E43\u0E19\u0E2B\u0E49\u0E2D\u0E07"), /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-rose-600"
  }, seasonStats.rank ? `${seasonStats.rank}/${classBoard.length || 0}` : "--")), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-cyan-100 bg-white/72 p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[#637f86]"
  }, "\u0E23\u0E2D\u0E1A\u0E2A\u0E2D\u0E1A\u0E17\u0E35\u0E48\u0E17\u0E33"), /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-cyan-600"
  }, seasonStats.testCount, "/", game.seasonRounds))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4"
  }, /*#__PURE__*/React.createElement(TestBattleChart, {
    tests: seasonTests,
    maxScore: competitionMaxScore
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 rounded-2xl border border-rose-100 bg-white/72 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-bold"
  }, "\u0E20\u0E32\u0E23\u0E01\u0E34\u0E08\u0E0B\u0E35\u0E0B\u0E31\u0E19"), /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-[#876c6d]"
  }, season.roundsCompleted, "/", game.seasonRounds, " \u0E23\u0E2D\u0E1A")), /*#__PURE__*/React.createElement("div", {
    className: "h-3 overflow-hidden rounded-full bg-[#ead7db]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-gradient-to-r from-rose-400 via-orange-400 to-yellow-300 transition-all",
    style: {
      width: `${season.roundsCompleted / game.seasonRounds * 100}%`
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 grid grid-cols-7 gap-2"
  }, ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((d, i) => {
    const monday = training.cycle.monday;
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const all = U.ls.get("hsk_daily_progress", {});
    const done = (all[user.studentId] || {})[U.toISO(day)];
    const isToday = U.toISO(day) === U.toISO();
    const isTestD = i === 0 && Progress.hasTakenThisWeek(user.studentId);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: `text-center p-2 rounded-lg border-2 ${isToday ? "border-yellow-400" : "border-rose-100"} ${done ? "bg-emerald-50" : "bg-white/78"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-xs"
    }, d), /*#__PURE__*/React.createElement("div", {
      className: "text-xl"
    }, done ? "✓" : i === 0 && isTestD ? "⚔️" : i < 5 ? "📝" : "🎮"));
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 text-sm text-[#765f60]"
  }, "\u0E23\u0E2D\u0E1A\u0E2A\u0E2D\u0E1A\u0E16\u0E31\u0E14\u0E44\u0E1B: ", /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-[#b9772a]"
  }, testCycle.cycle.key), isTestDay && !tookThisWeek ? ` • วันนี้เปิดสอบ ${game.questionsPerTest} ข้อ` : ""))))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 rounded-2xl border border-yellow-400/30 bg-yellow-50 p-4 text-[var(--arena-ink)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-[#9a6818]"
  }, "\u0E2A\u0E23\u0E38\u0E1B\u0E41\u0E1A\u0E1A 2 \u0E2A\u0E48\u0E27\u0E19"), /*#__PURE__*/React.createElement("div", {
    className: "text-lg font-bold"
  }, "\u0E14\u0E49\u0E32\u0E19\u0E0B\u0E49\u0E32\u0E22\u0E04\u0E37\u0E2D\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E01\u0E32\u0E23\u0E23\u0E32\u0E22\u0E27\u0E31\u0E19 \u0E14\u0E49\u0E32\u0E19\u0E02\u0E27\u0E32\u0E04\u0E37\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E04\u0E37\u0E1A\u0E2B\u0E19\u0E49\u0E32\u0E01\u0E32\u0E23\u0E41\u0E02\u0E48\u0E07\u0E02\u0E31\u0E19\u0E17\u0E31\u0E49\u0E07\u0E0B\u0E35\u0E0B\u0E31\u0E19")), /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-[#8b6748]"
  }, "\u0E22\u0E34\u0E48\u0E07\u0E17\u0E33\u0E41\u0E1A\u0E1A\u0E1D\u0E36\u0E01\u0E23\u0E32\u0E22\u0E27\u0E31\u0E19\u0E2A\u0E21\u0E48\u0E33\u0E40\u0E2A\u0E21\u0E2D \u0E42\u0E2D\u0E01\u0E32\u0E2A\u0E44\u0E15\u0E48\u0E2D\u0E31\u0E19\u0E14\u0E31\u0E1A\u0E43\u0E19\u0E01\u0E32\u0E23\u0E41\u0E02\u0E48\u0E07\u0E02\u0E31\u0E19\u0E01\u0E47\u0E22\u0E34\u0E48\u0E07\u0E14\u0E35\u0E02\u0E36\u0E49\u0E19")))), /*#__PURE__*/React.createElement("div", {
    className: "max-w-6xl mx-auto px-4 pb-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 lg:grid-cols-3 gap-4"
  }, cards.map(c => /*#__PURE__*/React.createElement("button", {
    key: c.key,
    onClick: c.onClick,
    disabled: c.disabled,
    className: `relative aspect-square overflow-hidden bg-gradient-to-br ${c.color} rounded-[28px] border border-white/10 p-5 text-left shadow-xl hover:scale-[1.03] transition transform disabled:opacity-50 disabled:hover:scale-100`
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-[linear-gradient(135deg,rgba(255,248,235,.24),transparent_42%),radial-gradient(circle_at_top_right,rgba(240,193,91,.18),transparent_28%)]"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex h-full flex-col justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-start"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-3xl sm:text-4xl"
  }, c.emoji), c.badge && /*#__PURE__*/React.createElement("span", {
    className: "text-xs bg-white/20 px-2 py-1 rounded-full max-w-[7.5rem] text-right"
  }, c.badge)), /*#__PURE__*/React.createElement("div", {
    className: "relative z-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mt-4 font-bold text-lg leading-tight"
  }, c.title), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 text-sm opacity-90 leading-6"
  }, c.desc)), /*#__PURE__*/React.createElement("div", {
    className: "text-xs uppercase tracking-[0.24em] text-white/70"
  }, "Open module"))))), myTests.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mt-6 arena-panel rounded-2xl p-5 border border-white/10"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-lg mb-3"
  }, "\uD83D\uDCCA \u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E01\u0E32\u0E23\u0E2A\u0E2D\u0E1A\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, myTests.slice(0, 5).map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex items-center justify-between rounded-lg bg-[rgba(92,57,46,.06)] p-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "font-semibold"
  }, "\u0E2A\u0E2D\u0E1A ", t.weekKey), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-[#816b61]"
  }, new Date(t.ts).toLocaleString("th-TH"))), /*#__PURE__*/React.createElement("div", {
    className: `text-2xl font-bold ${t.score >= t.total * 0.8 ? "text-emerald-600" : t.score >= t.total * 0.5 ? "text-yellow-600" : "text-rose-600"}`
  }, t.score, "/", t.total * game.correctPoints))))), /*#__PURE__*/React.createElement("div", {
    className: "mt-6 rounded-2xl border border-yellow-300 bg-yellow-50 p-5 text-[var(--arena-ink)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-[#a26d19]"
  }, "\u0E20\u0E32\u0E23\u0E01\u0E34\u0E08\u0E0A\u0E34\u0E07\u0E41\u0E0A\u0E21\u0E1B\u0E4C ", game.seasonRounds, " \u0E23\u0E2D\u0E1A"), /*#__PURE__*/React.createElement("div", {
    className: "text-xl font-bold"
  }, "\u0E04\u0E30\u0E41\u0E19\u0E19\u0E23\u0E27\u0E21\u0E17\u0E31\u0E49\u0E07\u0E0B\u0E35\u0E0B\u0E31\u0E19\u0E43\u0E0A\u0E49\u0E15\u0E31\u0E14\u0E2A\u0E34\u0E19\u0E23\u0E32\u0E07\u0E27\u0E31\u0E25\u0E43\u0E2B\u0E0D\u0E48\u0E1B\u0E25\u0E32\u0E22\u0E23\u0E2D\u0E1A")), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-3xl font-black text-yellow-700"
  }, seasonStats.testCount, "/", game.seasonRounds), /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-[#8a6a4f]"
  }, "\u0E04\u0E23\u0E31\u0E49\u0E07\u0E17\u0E35\u0E48\u0E17\u0E33\u0E2A\u0E2D\u0E1A\u0E41\u0E25\u0E49\u0E27"))))));
};