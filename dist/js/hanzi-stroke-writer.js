/* ===========================================================
 * HanziStrokeWriter – แสดงลำดับขีดอักษรจีนแล้วให้ผู้ใช้เขียนตาม
 *  - Phase 1: watch  → เล่น animation ลำดับขีดให้ดู
 *  - Phase 2: quiz   → ผู้ใช้ลากเขียนตามทีละขีด ทีละตัวอักษร
 *  - Phase 3: done   → คำนวณความแม่นยำลำดับขีด ส่งกลับ onSubmit
 *
 *  ใช้ไลบรารี HanziWriter (CDN) ครอบคลุมข้อมูลขีดของอักษรจีน 9000+ ตัว
 *  รองรับ multi-character เช่น 北京, 杯子, 学习
 * =========================================================== */
const {
  useState: useStateHW,
  useEffect: useEffectHW,
  useRef: useRefHW
} = React;
const StrokeDataLoader = (() => {
  const cache = new Map();
  return char => {
    if (cache.has(char)) return cache.get(char);
    if (!window.HanziWriter || !window.HanziWriter.loadCharacterData) {
      return Promise.reject(new Error("HanziWriter library not loaded"));
    }
    const promise = window.HanziWriter.loadCharacterData(char).catch(err => {
      cache.delete(char);
      throw err;
    });
    cache.set(char, promise);
    return promise;
  };
})();
window.HanziStrokeWriter = function HanziStrokeWriter({
  targetHanzi,
  disabled,
  onSubmit,
  accuracyResult,
  resetKey,
  size = 200,
  autoWatch = true,
  showFinalCharacter = true
}) {
  const containerRef = useRefHW(null);
  const writersRef = useRefHW([]);
  const strokeCountsRef = useRefHW([]);
  const resultsRef = useRefHW([]);
  const [phase, setPhase] = useStateHW("loading");
  const [quizIdx, setQuizIdx] = useStateHW(0);
  const [error, setError] = useStateHW(null);
  const chars = String(targetHanzi || "").replace(/\s+/g, "").split("");
  useEffectHW(() => {
    let cancelled = false;
    setPhase("loading");
    setError(null);
    setQuizIdx(0);
    resultsRef.current = [];
    strokeCountsRef.current = [];
    writersRef.current = [];
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";
    if (typeof window.HanziWriter === "undefined") {
      setError("ไม่พบไลบรารี HanziWriter (ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต)");
      return;
    }
    Promise.all(chars.map(c => StrokeDataLoader(c))).then(dataList => {
      if (cancelled) return;
      strokeCountsRef.current = dataList.map(d => d && d.strokes ? d.strokes.length : 1);
      chars.forEach((ch, i) => {
        const wrap = document.createElement("div");
        wrap.style.display = "inline-block";
        wrap.style.verticalAlign = "middle";
        wrap.style.margin = "0 4px";
        wrap.dataset.charIdx = String(i);
        container.appendChild(wrap);
        const data = dataList[i];
        const writer = window.HanziWriter.create(wrap, ch, {
          charDataLoader: () => data,
          width: size,
          height: size,
          padding: 5,
          strokeColor: "#fbbf24",
          outlineColor: "rgba(255,255,255,0.22)",
          radicalColor: "#34d399",
          highlightColor: "#22d3ee",
          drawingColor: "#fde68a",
          drawingWidth: 18,
          showOutline: true,
          showCharacter: false,
          strokeAnimationSpeed: 1.4,
          delayBetweenStrokes: 220,
          delayBetweenLoops: 1500
        });
        writersRef.current.push(writer);
      });
      setPhase("watch");
      if (autoWatch) {
        setTimeout(() => {
          if (!cancelled) playAnimation();
        }, 300);
      }
    }).catch(err => {
      if (cancelled) return;
      console.warn("[stroke-writer] load failed", err);
      setError(`โหลดข้อมูลลำดับขีดไม่สำเร็จ${err && err.message ? `: ${err.message}` : ""}`);
    });
    return () => {
      cancelled = true;
      writersRef.current.forEach(w => {
        try {
          w.cancelQuiz && w.cancelQuiz();
        } catch (e) {}
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetHanzi, resetKey, size]);
  function playAnimation() {
    let i = 0;
    const next = () => {
      if (i >= writersRef.current.length) return;
      const w = writersRef.current[i];
      if (!w) return;
      try {
        w.cancelQuiz && w.cancelQuiz();
      } catch (e) {}
      try {
        w.hideCharacter && w.hideCharacter();
      } catch (e) {}
      w.animateCharacter({
        onComplete: () => {
          i += 1;
          setTimeout(next, 350);
        }
      });
    };
    next();
  }
  function startQuiz() {
    setPhase("quiz");
    setQuizIdx(0);
    resultsRef.current = [];
    // hide ทุกตัวก่อนเริ่ม quiz เพื่อให้ผู้ใช้เขียนเองทั้งหมด
    writersRef.current.forEach(w => {
      try {
        w.cancelQuiz && w.cancelQuiz();
      } catch (e) {}
      try {
        w.hideCharacter && w.hideCharacter();
      } catch (e) {}
    });
    runQuiz(0);
  }
  function runQuiz(idx) {
    const w = writersRef.current[idx];
    if (!w) return;
    try {
      w.cancelQuiz && w.cancelQuiz();
    } catch (e) {}
    try {
      w.hideCharacter && w.hideCharacter();
    } catch (e) {}
    w.quiz({
      leniency: 1.0,
      showHintAfterMisses: 2,
      highlightOnComplete: true,
      onComplete: ({
        totalMistakes
      }) => {
        const strokes = strokeCountsRef.current[idx] || 1;
        resultsRef.current.push({
          mistakes: totalMistakes || 0,
          strokes
        });
        if (idx + 1 < writersRef.current.length) {
          setQuizIdx(idx + 1);
          setTimeout(() => runQuiz(idx + 1), 500);
        } else {
          setTimeout(finishQuiz, 300);
        }
      }
    });
  }
  function finishQuiz() {
    if (showFinalCharacter) {
      writersRef.current.forEach(w => {
        try {
          w.showCharacter && w.showCharacter();
        } catch (e) {}
      });
    }
    const totalStrokes = resultsRef.current.reduce((s, r) => s + r.strokes, 0);
    const totalMistakes = resultsRef.current.reduce((s, r) => s + r.mistakes, 0);
    const accuracy = totalStrokes ? Math.round(Math.max(0, totalStrokes - totalMistakes) / totalStrokes * 100) : 0;
    setPhase("done");
    if (onSubmit) onSubmit(accuracy, {
      totalStrokes,
      totalMistakes
    });
  }
  if (error) {
    return /*#__PURE__*/React.createElement("div", {
      className: "rounded-xl bg-rose-500/15 p-4 text-sm text-center"
    }, /*#__PURE__*/React.createElement("div", null, "\u26A0\uFE0F ", error), /*#__PURE__*/React.createElement("div", {
      className: "mt-2 text-[#7f5f60]"
    }, "\u0E2B\u0E32\u0E01\u0E1B\u0E31\u0E0D\u0E2B\u0E32\u0E22\u0E31\u0E07\u0E40\u0E01\u0E34\u0E14\u0E02\u0E36\u0E49\u0E19 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E25\u0E2D\u0E07\u0E23\u0E35\u0E40\u0E1F\u0E23\u0E0A\u0E2B\u0E19\u0E49\u0E32"));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center gap-3 w-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border-2 border-yellow-400/70 bg-slate-900/40 p-3",
    style: {
      touchAction: "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: containerRef,
    className: "flex items-center justify-center min-h-[220px]"
  }), phase === "loading" && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 text-xs text-center text-[#d7c6b6]"
  }, "\u23F3 \u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E25\u0E33\u0E14\u0E31\u0E1A\u0E02\u0E35\u0E14...")), phase === "watch" && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-center gap-2 text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rounded-full bg-cyan-500/20 px-3 py-1"
  }, "\uD83D\uDC40 \u0E14\u0E39\u0E25\u0E33\u0E14\u0E31\u0E1A\u0E02\u0E35\u0E14\u0E43\u0E2B\u0E49\u0E04\u0E23\u0E1A\u0E01\u0E48\u0E2D\u0E19\u0E40\u0E02\u0E35\u0E22\u0E19\u0E15\u0E32\u0E21"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: playAnimation,
    className: "rounded-xl bg-[#f7efe3] px-4 py-2 text-[var(--arena-ink)]"
  }, "\u25B6 \u0E14\u0E39\u0E25\u0E33\u0E14\u0E31\u0E1A\u0E02\u0E35\u0E14\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: startQuiz,
    disabled: disabled,
    className: "rounded-xl bg-yellow-400 px-5 py-2 font-bold text-black disabled:opacity-40"
  }, "\u270F\uFE0F \u0E40\u0E23\u0E34\u0E48\u0E21\u0E40\u0E02\u0E35\u0E22\u0E19\u0E15\u0E32\u0E21")), phase === "quiz" && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-center gap-2 text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rounded-full bg-yellow-400/20 px-3 py-1"
  }, "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E02\u0E35\u0E22\u0E19\u0E15\u0E31\u0E27\u0E17\u0E35\u0E48 ", quizIdx + 1, "/", chars.length, " :", /*#__PURE__*/React.createElement("span", {
    className: "ml-1 font-bold",
    style: {
      fontFamily: "'Noto Sans SC', serif"
    }
  }, chars[quizIdx])), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => runQuiz(quizIdx),
    className: "rounded-xl bg-[#f7efe3] px-4 py-2 text-[var(--arena-ink)]"
  }, "\u21BB \u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E31\u0E27\u0E19\u0E35\u0E49\u0E43\u0E2B\u0E21\u0E48")), phase === "done" && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-center gap-2 text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rounded-full bg-emerald-500/20 px-3 py-1"
  }, "\u2713 \u0E40\u0E02\u0E35\u0E22\u0E19\u0E04\u0E23\u0E1A\u0E17\u0E38\u0E01\u0E15\u0E31\u0E27\u0E41\u0E25\u0E49\u0E27")), typeof accuracyResult === "number" && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl bg-[#f7efe3] px-4 py-2 text-sm text-[var(--arena-ink)]"
  }, "\u0E04\u0E27\u0E32\u0E21\u0E41\u0E21\u0E48\u0E19\u0E22\u0E33\u0E25\u0E33\u0E14\u0E31\u0E1A\u0E02\u0E35\u0E14: ", /*#__PURE__*/React.createElement("span", {
    className: `font-bold ${accuracyResult >= 80 ? "text-emerald-700" : accuracyResult >= 60 ? "text-yellow-700" : "text-rose-700"}`
  }, accuracyResult, "%"), /*#__PURE__*/React.createElement("span", {
    className: "ml-2 text-[#7b665d]"
  }, accuracyResult >= 90 ? "เยี่ยม เขียนตามลำดับได้แม่น" : accuracyResult >= 70 ? "ดีมาก" : accuracyResult >= 50 ? "ผ่านเกณฑ์ ฝึกอีกนิด" : "ลำดับยังคลาดเคลื่อน ลองทบทวนใหม่")));
};