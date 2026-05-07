/* ===========================================================
 * Profile – ดูสถิติ + เปลี่ยนรหัสผ่าน
 * =========================================================== */
const {
  useState: useStateP,
  useMemo: useMemoP
} = React;
function ProfileAvatar({
  avatar
}) {
  if (U.isImageAvatar(avatar)) {
    return /*#__PURE__*/React.createElement("img", {
      src: avatar,
      alt: "avatar",
      className: "mx-auto mb-2 h-24 w-24 rounded-[24px] border border-white/20 object-cover shadow-xl"
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "text-5xl mb-2"
  }, avatar || "🐉");
}
function ProfilePasswordInput({
  value,
  onChange,
  placeholder,
  minLength
}) {
  const [visible, setVisible] = useStateP(false);
  return /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("input", {
    type: visible ? "text" : "password",
    placeholder: placeholder,
    value: value,
    onChange: onChange,
    minLength: minLength,
    className: "w-full rounded-lg border border-[#decdb8] bg-[#fffaf2] px-3 py-2 pr-20 text-[var(--arena-ink)] outline-none placeholder:text-[#9b8478]"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setVisible(v => !v),
    className: "absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8a6d60] hover:text-[var(--arena-cinnabar)]"
  }, visible ? "ซ่อน" : "แสดง"));
}
window.Profile = function Profile({
  user,
  onBack
}) {
  const game = window.SystemSettings?.getGame ? window.SystemSettings.getGame() : window.APP_CONFIG.game;
  const [oldPw, setOldPw] = useStateP("");
  const [newPw, setNewPw] = useStateP("");
  const lvl = U.calcLevel(user.xp || 0);
  const shopMap = (window.SystemSettings?.getShopItems ? window.SystemSettings.getShopItems() : []).reduce((map, item) => {
    map[item.key] = item;
    return map;
  }, {});
  const tests = useMemoP(() => Progress.getMyTests(user.studentId), [user.studentId]);
  const totalScore = tests.reduce((s, t) => s + t.score, 0);
  const avgAccuracy = tests.length ? Math.round(tests.reduce((s, t) => s + t.score / (t.total * game.correctPoints), 0) / tests.length * 100) : 0;
  const bestScore = tests.reduce((m, t) => Math.max(m, t.score), 0);
  const trainedDays = (() => {
    const all = U.ls.get("hsk_daily_progress", {});
    return Object.keys(all[user.studentId] || {}).length;
  })();
  const changePw = async e => {
    e.preventDefault();
    try {
      await AuthService.login(user.studentId, oldPw);
      const newHash = await (async () => {
        const buf = new TextEncoder().encode(newPw);
        const h = await window.crypto.subtle.digest("SHA-256", buf);
        return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("");
      })();
      AuthService.updateUser(user.studentId, {
        passHash: newHash
      });
      U.toast("เปลี่ยนรหัสผ่านสำเร็จ", "success");
      setOldPw("");
      setNewPw("");
    } catch (e) {
      U.toast(e.message, "error");
    }
  };
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
  }, "\uD83D\uDC64 \u0E42\u0E1B\u0E23\u0E44\u0E1F\u0E25\u0E4C\u0E19\u0E31\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19"), /*#__PURE__*/React.createElement("div", null)), /*#__PURE__*/React.createElement("div", {
    className: "lacquer-panel rounded-3xl p-6 text-center mb-4"
  }, /*#__PURE__*/React.createElement(ProfileAvatar, {
    avatar: user.avatar
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold"
  }, user.fullname), /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-white/90"
  }, "\u0E23\u0E2B\u0E31\u0E2A ", user.studentId, " \u2022 ", user.classroom, " \u2022 \u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 ", user.classNumber || "-"), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 inline-block bg-white/20 px-4 py-1 rounded-full font-bold"
  }, "Lv.", lvl.level, " \u2022 ", lvl.currentXp, "/", lvl.nextXp, " XP")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4"
  }, [["🪙", user.coins || 0, "เหรียญ"], ["🔥", user.streak || 0, "วันต่อเนื่อง"], ["📚", trainedDays, "วันที่ฝึก"], ["⚔️", tests.length, "สอบทั้งหมด"], ["⭐", totalScore, "คะแนนรวม"], ["🎯", avgAccuracy + "%", "ความแม่นยำ"], ["🏆", bestScore, "คะแนนสูงสุด"], ["🎁", Progress.myRewards(user.studentId).length, "รางวัลที่ได้"]].map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "bg-[rgba(255,255,255,.82)] backdrop-blur rounded-xl p-3 text-center border border-[#e7dac7]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl"
  }, s[0]), /*#__PURE__*/React.createElement("div", {
    className: "text-xl font-bold"
  }, s[1]), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-[#7a665d]"
  }, s[2])))), /*#__PURE__*/React.createElement("div", {
    className: "arena-panel rounded-2xl p-4 border border-white/10 mb-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold mb-2"
  }, "\uD83C\uDF92 \u0E44\u0E2D\u0E40\u0E17\u0E21\u0E43\u0E19\u0E01\u0E23\u0E30\u0E40\u0E1B\u0E4B\u0E32"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, Object.entries(user.items || {}).map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    className: "bg-[rgba(92,57,46,.08)] px-3 py-2 rounded-lg text-sm"
  }, shopMap[k]?.emoji || "🎒", " ", shopMap[k]?.name || k, " ", /*#__PURE__*/React.createElement("b", null, v))))), /*#__PURE__*/React.createElement("form", {
    onSubmit: changePw,
    className: "arena-panel rounded-2xl p-4 border border-white/10 space-y-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold"
  }, "\uD83D\uDD11 \u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19"), /*#__PURE__*/React.createElement(ProfilePasswordInput, {
    placeholder: "\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E40\u0E14\u0E34\u0E21",
    value: oldPw,
    onChange: e => setOldPw(e.target.value)
  }), /*#__PURE__*/React.createElement(ProfilePasswordInput, {
    placeholder: "\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E43\u0E2B\u0E21\u0E48 (\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 6 \u0E15\u0E31\u0E27)",
    value: newPw,
    onChange: e => setNewPw(e.target.value),
    minLength: 6
  }), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "cinnabar-btn w-full py-2 rounded-lg font-bold"
  }, "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01"))));
};