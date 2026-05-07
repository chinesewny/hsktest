/* ===========================================================
 * Leaderboard – กระดานผู้นำแยกระดับชั้น
 * โหมด: รายสัปดาห์ / รายซีซัน
 * =========================================================== */
const {
  useState: useStateL,
  useEffect: useEffectL,
  useMemo: useMemoL
} = React;
function LeaderboardAvatar({
  avatar,
  className = "h-14 w-14",
  textClassName = "text-3xl"
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
  }, avatar || "👤");
}
window.Leaderboard = function Leaderboard({
  user,
  onBack
}) {
  const game = window.SystemSettings?.getGame ? window.SystemSettings.getGame() : window.APP_CONFIG.game;
  const competitionEnabled = game.competitionEnabled !== false;
  const rewardCatalog = window.SystemSettings?.getRewards ? window.SystemSettings.getRewards() : [];
  const [classroom, setClass] = useStateL(user.classroom);
  const [mode, setMode] = useStateL("week"); // "week" | "season"
  const [board, setBoard] = useStateL([]);
  const [memberMap, setMemberMap] = useStateL({});
  const season = Progress.getSeason();
  const targetCycle = Progress.getTargetTestCycle().key;
  useEffectL(() => {
    if (!competitionEnabled) {
      U.toast("ระบบการแข่งขันยังไม่เปิด", "warn");
      onBack();
    }
  }, [competitionEnabled, onBack]);
  useEffectL(() => {
    if (!competitionEnabled) return;
    let cancelled = false;
    Progress.fetchLeaderboard({
      classroom,
      cycleKey: mode === "week" ? targetCycle : null,
      season: mode === "season" ? season.number : null,
      top: 100
    }).then(async rows => {
      if (cancelled) return;
      setBoard(rows || []);
      const users = await AuthService.fetchUsersByIds((rows || []).map(row => row.studentId));
      if (cancelled) return;
      const map = {};
      users.forEach(entry => {
        map[entry.studentId] = entry;
      });
      setMemberMap(map);
    }).catch(() => {
      if (!cancelled) {
        setBoard([]);
        setMemberMap({});
      }
    });
    return () => {
      cancelled = true;
    };
  }, [classroom, mode, targetCycle, season.number]);
  if (!competitionEnabled) return null;
  const enriched = useMemoL(() => board.map((b, i) => {
    const u = memberMap[b.studentId] || {};
    return {
      ...b,
      fullname: u.fullname || "ไม่ทราบชื่อ",
      avatar: u.avatar || "👤",
      rank: i + 1
    };
  }), [board, memberMap]);
  const myRank = enriched.find(e => e.studentId === user.studentId);
  return /*#__PURE__*/React.createElement("div", {
    className: "scholar-shell arena-shell arena-grid arena-noise min-h-screen text-[var(--arena-ink)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-3xl mx-auto p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    className: "ghost-btn px-4 py-2 rounded-lg"
  }, "\u2190 \u0E01\u0E25\u0E31\u0E1A"), /*#__PURE__*/React.createElement("h1", {
    className: "page-heading text-2xl font-bold"
  }, "\uD83C\uDFC6 \u0E01\u0E23\u0E30\u0E14\u0E32\u0E19\u0E1C\u0E39\u0E49\u0E19\u0E33"), /*#__PURE__*/React.createElement("div", null)), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2 mb-4 justify-center"
  }, window.APP_CONFIG.classes.map(c => /*#__PURE__*/React.createElement("button", {
    key: c,
    onClick: () => setClass(c),
    className: `px-3 py-1.5 rounded-lg text-sm font-bold ${classroom === c ? "gold-btn" : "ghost-btn"}`
  }, c))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center gap-2 mb-6"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setMode("week"),
    className: `px-4 py-2 rounded-lg ${mode === "week" ? "cinnabar-btn" : "ghost-btn"}`
  }, "\u0E23\u0E2D\u0E1A\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setMode("season"),
    className: `px-4 py-2 rounded-lg ${mode === "season" ? "cinnabar-btn" : "ghost-btn"}`
  }, "\u0E0B\u0E35\u0E0B\u0E31\u0E19 ", season.number, " \u0E2A\u0E30\u0E2A\u0E21 ", game.seasonRounds, " \u0E23\u0E2D\u0E1A")), enriched.length >= 1 && /*#__PURE__*/React.createElement("div", {
    className: "flex items-end justify-center gap-2 mb-6 mt-8"
  }, [1, 0, 2].map(rank => {
    const e = enriched[rank];
    if (!e) return /*#__PURE__*/React.createElement("div", {
      key: rank,
      className: "w-24"
    });
    const heights = ["h-32", "h-40", "h-24"];
    const colors = ["from-gray-300 to-gray-500", "from-yellow-300 to-yellow-500", "from-orange-400 to-orange-600"];
    const medals = ["🥈", "🥇", "🥉"];
    return /*#__PURE__*/React.createElement("div", {
      key: rank,
      className: "text-center w-24"
    }, /*#__PURE__*/React.createElement("div", {
      className: "mb-1 flex justify-center"
    }, /*#__PURE__*/React.createElement(LeaderboardAvatar, {
      avatar: e.avatar,
      className: "h-14 w-14",
      textClassName: "text-3xl"
    })), /*#__PURE__*/React.createElement("div", {
      className: "text-xs truncate"
    }, e.fullname), /*#__PURE__*/React.createElement("div", {
      className: "text-2xl font-bold"
    }, e.total), /*#__PURE__*/React.createElement("div", {
      className: `mt-2 bg-gradient-to-b ${colors[heights.indexOf(heights[rank === 0 ? 1 : rank === 1 ? 0 : 2])]} ${heights[rank === 0 ? 1 : rank === 1 ? 0 : 2]} rounded-t-xl flex items-center justify-center text-2xl shadow-2xl`
    }, medals[rank === 0 ? 1 : rank === 1 ? 0 : 2]));
  })), enriched[0] && /*#__PURE__*/React.createElement("div", {
    className: "lacquer-panel rounded-xl p-4 mb-4 text-center"
  }, "\uD83C\uDF81 \u0E23\u0E32\u0E07\u0E27\u0E31\u0E25\u0E1C\u0E39\u0E49\u0E0A\u0E19\u0E30\u0E02\u0E2D\u0E07 ", classroom, " ", mode === "week" ? `รอบ ${targetCycle}` : `ซีซัน ${season.number}`, ":", /*#__PURE__*/React.createElement("span", {
    className: "font-bold ml-2"
  }, mode === "week" ? rewardCatalog[0]?.name ? `${rewardCatalog[0].name} + ไอเทมช่วยสอบ` : "คูปองประจำสัปดาห์ + ไอเทมช่วยสอบ" : `รางวัลใหญ่รวมคะแนนทั้ง ${game.seasonRounds} รอบ`)), /*#__PURE__*/React.createElement("div", {
    className: "arena-panel rounded-2xl p-4 border border-white/10"
  }, enriched.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "text-center text-[#7b685f] py-8"
  }, "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E04\u0E30\u0E41\u0E19\u0E19\u0E43\u0E19\u0E15\u0E32\u0E23\u0E32\u0E07\u0E19\u0E35\u0E49") : /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, enriched.map(e => /*#__PURE__*/React.createElement("div", {
    key: e.studentId,
    className: `flex items-center justify-between p-3 rounded-xl ${e.studentId === user.studentId ? "bg-yellow-100 border-2 border-yellow-400" : "bg-[rgba(92,57,46,.06)]"}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: `w-10 text-center font-bold ${e.rank === 1 ? "text-yellow-300 text-2xl" : e.rank === 2 ? "text-gray-300 text-xl" : e.rank === 3 ? "text-orange-300 text-xl" : ""}`
  }, e.rank), /*#__PURE__*/React.createElement(LeaderboardAvatar, {
    avatar: e.avatar,
    className: "h-12 w-12",
    textClassName: "text-2xl"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "font-semibold"
  }, e.fullname), /*#__PURE__*/React.createElement("div", {
    className: "text-xs opacity-60"
  }, "\u0E23\u0E2B\u0E31\u0E2A ", e.studentId, " \u2022 ", e.count, " \u0E04\u0E23\u0E31\u0E49\u0E07"))), /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-[#9c6c1d]"
  }, e.total))))), !myRank && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 text-center text-[#7a665d] text-sm"
  }, "\u0E04\u0E38\u0E13\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E04\u0E30\u0E41\u0E19\u0E19\u0E43\u0E19\u0E23\u0E2D\u0E1A\u0E19\u0E35\u0E49 \u2014 \u0E40\u0E23\u0E34\u0E48\u0E21\u0E2A\u0E2D\u0E1A\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E02\u0E36\u0E49\u0E19\u0E01\u0E23\u0E30\u0E14\u0E32\u0E19\u0E40\u0E25\u0E22!")));
};