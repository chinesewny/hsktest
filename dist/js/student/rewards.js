/* ===========================================================
 * My Rewards – คูปองและของรางวัลที่ได้รับ
 * =========================================================== */
const {
  useMemo: useMemoR
} = React;
window.MyRewards = function MyRewards({
  user,
  onBack
}) {
  const list = useMemoR(() => Progress.myRewards(user.studentId), [user.studentId]);
  const rewardCatalog = window.SystemSettings?.getRewardMap ? window.SystemSettings.getRewardMap() : {};
  return /*#__PURE__*/React.createElement("div", {
    className: "scholar-shell arena-grid arena-noise min-h-screen text-[var(--arena-ink)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-3xl mx-auto p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    className: "ghost-btn px-4 py-2 rounded-lg"
  }, "\u2190 \u0E01\u0E25\u0E31\u0E1A"), /*#__PURE__*/React.createElement("h1", {
    className: "page-heading text-2xl font-bold"
  }, "\uD83C\uDF81 \u0E02\u0E2D\u0E07\u0E23\u0E32\u0E07\u0E27\u0E31\u0E25\u0E02\u0E2D\u0E07\u0E09\u0E31\u0E19"), /*#__PURE__*/React.createElement("div", null)), list.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "arena-panel rounded-2xl p-10 text-center border border-white/10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-4xl mb-3"
  }, "\uD83C\uDF81"), /*#__PURE__*/React.createElement("div", {
    className: "text-lg"
  }, "\u0E04\u0E38\u0E13\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E02\u0E2D\u0E07\u0E23\u0E32\u0E07\u0E27\u0E31\u0E25"), /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-[#7a665d] mt-2"
  }, "\u0E15\u0E34\u0E14\u0E2D\u0E31\u0E19\u0E14\u0E31\u0E1A Top 1 \u0E02\u0E2D\u0E07\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E0A\u0E31\u0E49\u0E19\u0E43\u0E19\u0E41\u0E15\u0E48\u0E25\u0E30\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E23\u0E31\u0E1A\u0E23\u0E32\u0E07\u0E27\u0E31\u0E25!")) : /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-3"
  }, list.map((r, i) => {
    const cat = rewardCatalog[r.rewardId] || {
      emoji: "🎁",
      name: r.rewardId,
      detail: "",
      color: "from-gray-500 to-gray-700"
    };
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: `bg-gradient-to-br ${cat.color} rounded-2xl p-4 shadow-lg`
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-3xl"
    }, cat.emoji), /*#__PURE__*/React.createElement("div", {
      className: "text-xs bg-black/30 px-2 py-1 rounded-full"
    }, r.weekKey)), /*#__PURE__*/React.createElement("div", {
      className: "font-bold mt-2"
    }, cat.name), /*#__PURE__*/React.createElement("div", {
      className: "text-xs opacity-90 mt-1 text-white [text-shadow:0_1px_2px_rgba(60,30,20,0.35)]"
    }, cat.detail), /*#__PURE__*/React.createElement("div", {
      className: "text-xs mt-1 text-white [text-shadow:0_1px_2px_rgba(60,30,20,0.4)]"
    }, "\u0E23\u0E31\u0E1A\u0E40\u0E21\u0E37\u0E48\u0E2D ", new Date(r.ts).toLocaleDateString("th-TH")), /*#__PURE__*/React.createElement("div", {
      className: "text-xs mt-2 bg-black/30 rounded p-2 font-mono"
    }, "\u0E23\u0E2B\u0E31\u0E2A\u0E04\u0E39\u0E1B\u0E2D\u0E07: ", (r.studentId + r.ts).slice(-8).toUpperCase()));
  })), /*#__PURE__*/React.createElement("div", {
    className: "lacquer-panel mt-4 rounded-xl p-3 text-sm"
  }, "\uD83D\uDCCC \u0E19\u0E33\u0E04\u0E39\u0E1B\u0E2D\u0E07\u0E19\u0E35\u0E49\u0E44\u0E1B\u0E41\u0E2A\u0E14\u0E07\u0E17\u0E35\u0E48\u0E04\u0E38\u0E13\u0E04\u0E23\u0E39\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E23\u0E31\u0E1A\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E15\u0E32\u0E21\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14")));
};