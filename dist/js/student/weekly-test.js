/* ===========================================================
 * Weekly Test – 10 ข้อ จากคำศัพท์สัปดาห์นี้ + ระบบไอเทมช่วย
 * รูปแบบคำถาม: listen / read / pinyin / write
 * =========================================================== */
const {
  useState: useStateW,
  useEffect: useEffectW,
  useMemo: useMemoW,
  useRef: useRefW
} = React;
const QUESTION_TYPES = ["read", "listen", "pinyin", "write", "stroke"];
const TEST_HISTORY_KEY = "hsk_test_question_history";

// stroke ต้องใช้เวลาเขียนหลายขีด — เพิ่มเวลามากกว่าข้ออื่น
function timeBudgetForType(baseSeconds, type) {
  if (type === "stroke") return baseSeconds * 3;
  return baseSeconds;
}
const GAME_CFG = new Proxy({}, {
  get(_, prop) {
    const source = window.SystemSettings?.getGame ? window.SystemSettings.getGame() : window.APP_CONFIG.game;
    return source[prop];
  }
});
function hanziFitClass(hanzi = "") {
  const length = String(hanzi).replace(/\s+/g, "").length;
  if (length >= 4) return "text-5xl sm:text-6xl";
  if (length === 3) return "text-6xl sm:text-7xl";
  return "text-7xl sm:text-8xl";
}
function makeQuestions(studentId, cycleKey, learnedWords, allVocab) {
  const uniqueWords = U.shuffle(learnedWords.filter((word, index, list) => list.findIndex(item => item.id === word.id) === index));
  const totalNeeded = Math.min(GAME_CFG.questionsPerTest, uniqueWords.length);
  const scopeKey = `${studentId}_${cycleKey}`;
  const historyMap = U.ls.get(TEST_HISTORY_KEY, {});
  const usedIds = Array.isArray(historyMap[scopeKey]) ? historyMap[scopeKey] : [];
  const remaining = uniqueWords.filter(word => !usedIds.includes(word.id));
  let selected = remaining.slice(0, totalNeeded);
  let nextHistory;
  if (selected.length < totalNeeded) {
    const fallback = uniqueWords.filter(word => !selected.some(picked => picked.id === word.id)).slice(0, totalNeeded - selected.length);
    selected = [...selected, ...fallback];
    nextHistory = selected.map(word => word.id);
  } else {
    nextHistory = [...usedIds, ...selected.map(word => word.id)].slice(-uniqueWords.length);
  }
  historyMap[scopeKey] = nextHistory;
  U.ls.set(TEST_HISTORY_KEY, historyMap);
  return selected.map((w, i) => {
    const type = QUESTION_TYPES[i % QUESTION_TYPES.length];
    const distractors = U.sample(allVocab.filter(x => x.id !== w.id), 3);
    const choices = U.shuffle([w, ...distractors]);
    return {
      type,
      word: w,
      choices,
      correct: w.id
    };
  });
}
window.WeeklyTest = function WeeklyTest({
  user,
  onBack,
  onComplete
}) {
  const cfg = window.SystemSettings?.getGame ? window.SystemSettings.getGame() : window.APP_CONFIG.game;
  const competitionEnabled = cfg.competitionEnabled !== false;
  const itemsCatalog = (window.SystemSettings?.getShopItems ? window.SystemSettings.getShopItems() : []).reduce((map, item) => {
    map[item.key] = item;
    return map;
  }, {});
  const testSummary = useMemoW(() => Progress.getTestCycleSummary(user.studentId), [user.studentId]);
  const weekWords = useMemoW(() => Progress.getTestWords(user.studentId), [user.studentId]);
  const [qList, setQList] = useStateW([]);
  const [qIdx, setQIdx] = useStateW(0);
  const [score, setScore] = useStateW(0);
  const [answered, setAnswered] = useStateW(null); // { id, correct, points }
  const [details, setDetails] = useStateW([]);
  const [timeLeft, setTimeLeft] = useStateW(timeBudgetForType(cfg.timePerQuestion, "read"));
  const [paused, setPaused] = useStateW(false);
  const [done, setDone] = useStateW(false);
  const [hidden, setHidden] = useStateW([]); // 50/50
  const [showPinyin, setShowPinyin] = useStateW(false);
  const [shieldArmed, setShieldArmed] = useStateW(false);
  const [doubleArmed, setDoubleArmed] = useStateW(false);
  const [items, setItems] = useStateW({
    ...(user.items || {})
  });
  const [streakCorrect, setStreakCorrect] = useStateW(0);
  const startTime = useRefW(Date.now());
  const writeRef = useRefW(null);
  useEffectW(() => {
    if (!competitionEnabled) {
      U.toast("ระบบการแข่งขันยังไม่เปิด", "warn");
      onBack();
    }
  }, [competitionEnabled, onBack]);

  // เริ่มสร้างคำถาม
  useEffectW(() => {
    if (!competitionEnabled) return;
    if (weekWords.length < 5) {
      U.toast("ยังมีคำศัพท์จากรอบฝึกก่อนหน้าไม่พอสำหรับการสอบ", "warn");
      onBack();
      return;
    }
    setQList(makeQuestions(user.studentId, testSummary.cycle.key, weekWords, window.ALL_VOCAB));
  }, [competitionEnabled, weekWords, user.studentId, testSummary.cycle.key, onBack]);
  if (!competitionEnabled) return null;

  // Timer
  useEffectW(() => {
    if (done || answered || paused) return;
    if (timeLeft <= 0) {
      handleAnswer(null);
      return;
    }
    const t = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, answered, paused, done]);

  // Auto play audio for listen type
  useEffectW(() => {
    if (qList.length && qList[qIdx]?.type === "listen" && !answered) {
      setTimeout(() => U.speak(qList[qIdx].word.hanzi), 300);
    }
  }, [qIdx, qList]);
  if (!qList.length) return /*#__PURE__*/React.createElement("div", {
    className: "p-10 text-center text-[var(--arena-ink)]"
  }, "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E02\u0E49\u0E2D\u0E2A\u0E2D\u0E1A...");
  const q = qList[qIdx];
  const StrokeWriter = window.HanziStrokeWriter;
  function useItem(key) {
    if (!items[key] || items[key] <= 0) return U.toast("ไอเทมหมด", "warn");
    const itemInfo = itemsCatalog[key] || {
      emoji: "🎒",
      name: key
    };
    const updatedItems = {
      ...items,
      [key]: items[key] - 1
    };
    if (key === "fifty") {
      const wrongs = q.choices.filter(c => c.id !== q.correct);
      const toHide = U.sample(wrongs, 2).map(c => c.id);
      setHidden(toHide);
    }
    if (key === "time") setTimeLeft(t => t + 15);
    if (key === "pinyin") setShowPinyin(true);
    if (key === "shield") setShieldArmed(true);
    if (key === "double") setDoubleArmed(true);
    if (key === "ice") {
      setPaused(true);
      setTimeout(() => {
        setPaused(false);
      }, 10000);
    }
    if (key === "dice") {
      // เปลี่ยนคำถามเป็นคำที่ง่ายกว่า (ระดับต่ำสุดที่มี)
      const easy = U.sample(window.HSK1_VOCAB, 1)[0];
      const distractors = U.sample(window.ALL_VOCAB.filter(x => x.id !== easy.id), 3);
      const newQ = {
        type: "read",
        word: easy,
        choices: U.shuffle([easy, ...distractors]),
        correct: easy.id
      };
      const updated = [...qList];
      updated[qIdx] = newQ;
      setQList(updated);
      setHidden([]);
      setShowPinyin(false);
    }
    setItems(updatedItems);
    AuthService.updateUser(user.studentId, {
      items: updatedItems
    });
    U.toast(`ใช้ ${itemInfo.emoji} ${itemInfo.name} แล้ว เหลือ ${updatedItems[key]} ชิ้น`, "info");
    U.sfxClick();
  }
  function handleAnswer(choiceId, meta = {}) {
    let isCorrect = choiceId === q.correct;
    if (!isCorrect && shieldArmed) {
      isCorrect = true;
      setShieldArmed(false);
      U.toast("🛡️ โล่กันผิดป้องกันให้!", "info");
    }
    let pts = 0;
    if (isCorrect) {
      pts = cfg.correctPoints;
      const timeBudget = timeBudgetForType(cfg.timePerQuestion, q.type);
      if (timeBudget - timeLeft <= cfg.speedBonusThreshold) pts += cfg.speedBonusPoints;
      // ถ้าเป็น stroke type คำนวณคะแนนตามเปอร์เซ็นต์ความแม่นยำลำดับขีด
      if (q.type === "stroke" && typeof meta.strokeAccuracy === "number") {
        pts = Math.round(pts * Math.max(0.5, meta.strokeAccuracy / 100));
      }
      if (doubleArmed) {
        pts *= 2;
        setDoubleArmed(false);
      }
      // streak multiplier
      const newStreak = streakCorrect + 1;
      setStreakCorrect(newStreak);
      if (newStreak >= 3) pts = Math.round(pts * cfg.streakMultiplier);
      U.sfxCorrect();
    } else {
      setStreakCorrect(0);
      U.sfxWrong();
    }
    setScore(s => s + pts);
    setDetails(d => [...d, {
      qIdx: qIdx + 1,
      wordId: q.word.id,
      hanzi: q.word.hanzi,
      type: q.type,
      correct: isCorrect,
      points: pts,
      choseId: choiceId,
      strokeAccuracy: typeof meta.strokeAccuracy === "number" ? meta.strokeAccuracy : null
    }]);
    setAnswered({
      id: choiceId,
      correct: isCorrect,
      points: pts,
      strokeAccuracy: meta.strokeAccuracy
    });
  }
  function nextQ() {
    if (qIdx + 1 >= qList.length) {
      finalize();
      return;
    }
    const nextIdx = qIdx + 1;
    const nextType = qList[nextIdx]?.type || "read";
    setQIdx(nextIdx);
    setAnswered(null);
    setTimeLeft(timeBudgetForType(cfg.timePerQuestion, nextType));
    setHidden([]);
    setShowPinyin(false);
    if (writeRef.current) writeRef.current.value = "";
  }
  function finalize() {
    const correctCount = details.filter(d => d.correct).length;
    const xpGain = correctCount * cfg.xpPerCorrect;
    const coinGain = correctCount * cfg.coinsPerCorrect + (correctCount === qList.length ? cfg.coinsPerPerfectTest : 0);
    AuthService.updateUser(user.studentId, {
      xp: (user.xp || 0) + xpGain,
      coins: (user.coins || 0) + coinGain,
      items
    });
    Progress.recordTestScore({
      studentId: user.studentId,
      classroom: user.classroom,
      score,
      total: qList.length,
      details,
      cycleKey: testSummary.cycle.key
    });
    setDone(true);
    setTimeout(() => U.sfxLevelUp(), 200);
  }

  // ───── DONE SCREEN ─────
  if (done) {
    const correctCount = details.filter(d => d.correct).length;
    const accuracy = Math.round(correctCount / qList.length * 100);
    const stars = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : accuracy >= 50 ? 1 : 0;
    return /*#__PURE__*/React.createElement("div", {
      className: "scholar-shell arena-shell arena-grid arena-noise min-h-screen flex items-center justify-center p-4 text-[var(--arena-ink)]"
    }, /*#__PURE__*/React.createElement("div", {
      className: "arena-panel max-w-lg w-full rounded-3xl p-6"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-5xl mb-2"
    }, stars === 3 ? "🏆" : stars === 2 ? "🥈" : stars === 1 ? "🥉" : "💪"), /*#__PURE__*/React.createElement("h2", {
      className: "text-3xl font-bold"
    }, "\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E2A\u0E2D\u0E1A"), /*#__PURE__*/React.createElement("div", {
      className: "flex justify-center gap-2 my-4"
    }, [1, 2, 3].map(s => /*#__PURE__*/React.createElement("div", {
      key: s,
      className: `text-4xl ${s <= stars ? "" : "opacity-20"}`
    }, "\u2B50"))), /*#__PURE__*/React.createElement("div", {
      className: "text-6xl font-black text-yellow-700"
    }, score), /*#__PURE__*/React.createElement("div", {
      className: "text-[#6e5a50]"
    }, "\u0E04\u0E30\u0E41\u0E19\u0E19 (", correctCount, "/", qList.length, " \u0E02\u0E49\u0E2D\u0E16\u0E39\u0E01 = ", accuracy, "%)"), /*#__PURE__*/React.createElement("div", {
      className: "mt-2 text-sm text-[#8a756b]"
    }, "\u0E23\u0E2D\u0E1A\u0E2A\u0E2D\u0E1A ", testSummary.cycle.key, " \u0E08\u0E32\u0E01\u0E04\u0E33\u0E1D\u0E36\u0E01 ", testSummary.totalWords, " \u0E04\u0E33")), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-2 gap-3 my-5 text-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "rounded-xl bg-[#f7efe3] p-3 text-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-bold text-[var(--arena-ink)]"
    }, "+", correctCount * cfg.xpPerCorrect), /*#__PURE__*/React.createElement("div", {
      className: "text-[#8a756b]"
    }, "\u2B50 XP")), /*#__PURE__*/React.createElement("div", {
      className: "rounded-xl bg-[#f7efe3] p-3 text-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-bold text-[var(--arena-ink)]"
    }, "+", correctCount * cfg.coinsPerCorrect), /*#__PURE__*/React.createElement("div", {
      className: "text-[#8a756b]"
    }, "\uD83E\uDE99 \u0E40\u0E2B\u0E23\u0E35\u0E22\u0E0D"))), /*#__PURE__*/React.createElement("details", {
      className: "rounded-xl bg-[#fbf6ef] p-3 mb-4"
    }, /*#__PURE__*/React.createElement("summary", {
      className: "cursor-pointer font-semibold"
    }, "\u0E14\u0E39\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E02\u0E49\u0E2D\u0E2A\u0E2D\u0E1A"), /*#__PURE__*/React.createElement("div", {
      className: "mt-3 space-y-1 text-sm max-h-60 overflow-y-auto"
    }, details.map((d, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: `flex items-center justify-between p-2 rounded ${d.correct ? "bg-emerald-500/20" : "bg-rose-500/20"}`
    }, /*#__PURE__*/React.createElement("span", null, i + 1, ". ", d.hanzi, " ", /*#__PURE__*/React.createElement("span", {
      className: "opacity-60"
    }, "(", d.type, ")")), /*#__PURE__*/React.createElement("span", null, d.correct ? "✓" : "✗", " +", d.points))))), /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      className: "gold-btn w-full py-3 rounded-xl font-bold"
    }, "\u0E01\u0E25\u0E31\u0E1A\u0E2A\u0E39\u0E48\u0E41\u0E14\u0E0A\u0E1A\u0E2D\u0E23\u0E4C\u0E14")));
  }

  // ───── QUESTION SCREEN ─────
  return /*#__PURE__*/React.createElement("div", {
    className: "scholar-shell arena-shell arena-grid arena-noise min-h-screen text-[var(--arena-ink)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-3xl mx-auto p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold"
  }, "\u0E02\u0E49\u0E2D ", qIdx + 1, "/", qList.length), /*#__PURE__*/React.createElement("div", {
    className: `px-3 py-1 rounded-full text-sm font-bold ${timeLeft <= 5 ? "bg-rose-500 animate-pulse" : timeLeft <= 10 ? "bg-amber-500" : "bg-emerald-600"}`
  }, "\u23F1 ", timeLeft, "s"), paused && /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-1 bg-cyan-500 rounded-full text-sm"
  }, "\u2744\uFE0F \u0E2B\u0E22\u0E38\u0E14\u0E40\u0E27\u0E25\u0E32")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-lg font-bold"
  }, "\u2B50 ", score), streakCorrect >= 2 && /*#__PURE__*/React.createElement("div", {
    className: "text-sm bg-orange-500 px-2 py-1 rounded-full animate-pulse"
  }, "\uD83D\uDD25 ", streakCorrect, " \u0E15\u0E34\u0E14!"))), /*#__PURE__*/React.createElement("div", {
    className: "w-full h-2 bg-[#eadfd1] rounded-full mb-4 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-rose-400 transition-all",
    style: {
      width: `${(qIdx + 1) / qList.length * 100}%`
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "mb-4 rounded-2xl border border-[#e2d4c4] bg-[#faf4ec] p-3 text-sm text-[#6b574d]"
  }, "\u0E2A\u0E2D\u0E1A\u0E23\u0E2D\u0E1A\u0E27\u0E31\u0E19\u0E08\u0E31\u0E19\u0E17\u0E23\u0E4C\u0E08\u0E32\u0E01\u0E04\u0E33\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E17\u0E35\u0E48\u0E1D\u0E36\u0E01\u0E43\u0E19\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C ", testSummary.cycle.key, " \u0E08\u0E33\u0E19\u0E27\u0E19 ", testSummary.totalWords, " \u0E04\u0E33"), /*#__PURE__*/React.createElement("div", {
    className: "arena-panel rounded-3xl p-6 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-[#a46a18] font-bold mb-3 text-center uppercase tracking-wider"
  }, q.type === "read" && "📖 อ่านอักษร แล้วเลือกความหมาย", q.type === "listen" && "🎧 ฟังเสียง แล้วเลือกอักษร", q.type === "pinyin" && "🔤 เลือก Pinyin ที่ถูกต้อง", q.type === "write" && "✍️ พิมพ์ Pinyin ของคำนี้", q.type === "stroke" && "🖌️ เขียนอักษรจีนตามลำดับขีด"), /*#__PURE__*/React.createElement("div", {
    className: "text-center my-6"
  }, q.type === "read" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: `${hanziFitClass(q.word.hanzi)} font-bold mb-2 whitespace-nowrap leading-none`
  }, q.word.hanzi), showPinyin && /*#__PURE__*/React.createElement("div", {
    className: "text-2xl text-yellow-700"
  }, q.word.pinyin)), q.type === "listen" && /*#__PURE__*/React.createElement("button", {
    onClick: () => U.speak(q.word.hanzi),
    className: "text-7xl hover:scale-110 transition"
  }, "\uD83D\uDD0A"), q.type === "pinyin" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: `${hanziFitClass(q.word.hanzi)} font-bold mb-2 whitespace-nowrap leading-none`
  }, q.word.hanzi), /*#__PURE__*/React.createElement("div", {
    className: "text-xl text-[#7a665d]"
  }, U.getPrimaryMeaning(q.word.meaning))), q.type === "write" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: `${hanziFitClass(q.word.hanzi)} font-bold mb-3 whitespace-nowrap leading-none`
  }, q.word.hanzi), /*#__PURE__*/React.createElement("div", {
    className: "text-lg mb-3 text-[#7a665d]"
  }, U.getPrimaryMeaning(q.word.meaning)), /*#__PURE__*/React.createElement("input", {
    ref: writeRef,
    className: "w-64 px-4 py-3 rounded-xl text-black text-xl text-center outline-none border-4 border-yellow-400",
    placeholder: "\u0E1E\u0E34\u0E21\u0E1E\u0E4C Pinyin...",
    disabled: !!answered,
    onKeyDown: e => {
      if (e.key === "Enter") {
        const a = e.target.value.trim().toLowerCase().replace(/[^a-z]/g, "");
        const correct = q.word.pinyin.toLowerCase().replace(/[^a-z]/g, "");
        handleAnswer(a === correct ? q.correct : "wrong");
      }
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const a = writeRef.current.value.trim().toLowerCase().replace(/[^a-z]/g, "");
      const correct = q.word.pinyin.toLowerCase().replace(/[^a-z]/g, "");
      handleAnswer(a === correct ? q.correct : "wrong");
    },
    disabled: !!answered,
    className: "ml-2 px-6 py-3 bg-yellow-400 text-black rounded-xl font-bold"
  }, "\u0E15\u0E2D\u0E1A")), q.type === "stroke" && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-2 text-xl text-yellow-700 font-semibold"
  }, q.word.pinyin), /*#__PURE__*/React.createElement("div", {
    className: "mb-3 text-lg text-[#7a665d]"
  }, U.getPrimaryMeaning(q.word.meaning)), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-[#866f64] mb-3"
  }, "\u0E14\u0E39\u0E41\u0E2D\u0E19\u0E34\u0E40\u0E21\u0E0A\u0E31\u0E19\u0E25\u0E33\u0E14\u0E31\u0E1A\u0E02\u0E35\u0E14\u0E43\u0E2B\u0E49\u0E04\u0E23\u0E1A\u0E01\u0E48\u0E2D\u0E19 \u0E41\u0E25\u0E49\u0E27\u0E01\u0E14 ", /*#__PURE__*/React.createElement("b", null, "\u0E40\u0E23\u0E34\u0E48\u0E21\u0E40\u0E02\u0E35\u0E22\u0E19\u0E15\u0E32\u0E21")), StrokeWriter ? /*#__PURE__*/React.createElement(StrokeWriter, {
    targetHanzi: q.word.hanzi,
    disabled: !!answered,
    accuracyResult: typeof answered?.strokeAccuracy === "number" ? answered.strokeAccuracy : null,
    resetKey: `weekly-${qIdx}-${q.word.id}`,
    size: 200,
    onSubmit: accuracy => handleAnswer(accuracy >= 50 ? q.correct : "wrong", {
      strokeAccuracy: accuracy
    })
  }) : /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl bg-rose-500/15 p-4 text-sm"
  }, "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E42\u0E2B\u0E25\u0E14\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E21\u0E37\u0E2D\u0E40\u0E02\u0E35\u0E22\u0E19\u0E2D\u0E31\u0E01\u0E29\u0E23\u0E44\u0E14\u0E49", /*#__PURE__*/React.createElement("button", {
    onClick: () => handleAnswer(q.correct, {
      strokeAccuracy: 0
    }),
    className: "mt-2 ml-2 rounded-lg bg-amber-400 px-3 py-1 font-bold text-black"
  }, "\u0E02\u0E49\u0E32\u0E21")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => U.speak(q.word.hanzi),
    className: "mt-3 rounded-xl bg-[#f6ecdf] px-4 py-1 text-sm text-[var(--arena-ink)]"
  }, "\uD83D\uDD0A \u0E1F\u0E31\u0E07\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E04\u0E33\u0E19\u0E35\u0E49"))), q.type !== "write" && q.type !== "stroke" && /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-3"
  }, q.choices.map((c, i) => {
    const isHidden = hidden.includes(c.id);
    const isCorrect = answered && c.id === q.correct;
    const isPicked = answered && c.id === answered.id;
    let cls = "bg-[#fbf4ea] hover:bg-[#f3e6d6]";
    if (answered) {
      if (isCorrect) cls = "bg-emerald-100 text-emerald-900";else if (isPicked) cls = "bg-rose-100 text-rose-900";else cls = "bg-[#f7efe3] opacity-55";
    }
    if (isHidden) cls = "bg-[#f7efe3] opacity-30 line-through";
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: () => !answered && !isHidden && handleAnswer(c.id),
      disabled: answered || isHidden,
      className: `p-4 rounded-xl text-left text-lg font-semibold transition border border-[#e1d3c2] text-[var(--arena-ink)] ${cls}`
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-yellow-700 mr-2"
    }, String.fromCharCode(65 + i), "."), q.type === "read" && U.getPrimaryMeaning(c.meaning), q.type === "listen" && /*#__PURE__*/React.createElement("span", {
      className: "text-2xl"
    }, c.hanzi), q.type === "pinyin" && c.pinyin);
  })), answered && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: `text-2xl font-bold ${answered.correct ? "text-emerald-700" : "text-rose-700"}`
  }, answered.correct ? `✓ ถูกต้อง! +${answered.points}` : `✗ ผิด — เฉลย: ${U.getPrimaryMeaning(q.word.meaning)} (${q.word.pinyin})`), q.type === "stroke" && typeof answered.strokeAccuracy === "number" && /*#__PURE__*/React.createElement("div", {
    className: "mt-1 text-sm text-[#7a665d]"
  }, "\u0E04\u0E27\u0E32\u0E21\u0E41\u0E21\u0E48\u0E19\u0E22\u0E33\u0E25\u0E33\u0E14\u0E31\u0E1A\u0E02\u0E35\u0E14 ", answered.strokeAccuracy, "%"), /*#__PURE__*/React.createElement("button", {
    onClick: nextQ,
    className: "gold-btn mt-3 px-8 py-3 rounded-xl font-bold"
  }, qIdx + 1 === qList.length ? "ดูผล →" : "ข้อถัดไป →"))), !answered && /*#__PURE__*/React.createElement("div", {
    className: "arena-panel rounded-2xl p-3 border border-white/10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-[#8a756b] mb-2"
  }, "\uD83C\uDF92 \u0E44\u0E2D\u0E40\u0E17\u0E21\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, Object.values(itemsCatalog).map(it => /*#__PURE__*/React.createElement("button", {
    key: it.key,
    onClick: () => useItem(it.key),
    disabled: !items[it.key] || items[it.key] <= 0,
    title: `${it.name}: ${it.desc}`,
    className: `px-3 py-2 rounded-lg text-sm transition ${items[it.key] > 0 ? "bg-[#f7efe3] hover:bg-[#efdfcc]" : "bg-[#f7efe3] opacity-30"}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, it.emoji), /*#__PURE__*/React.createElement("span", {
    className: "ml-1 font-bold"
  }, items[it.key] || 0)))))));
};