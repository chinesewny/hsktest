/* ===========================================================
 * Daily Training – ฝึก 5 คำของวัน (Flashcard mode)
 * =========================================================== */
const {
  useState: useStateT,
  useEffect: useEffectT,
  useRef: useRefT
} = React;

/* -----------------------------------------------------------
 * HanziWriteCanvas – ผืนกระดาษให้นักเรียนเขียนทับแบบร่าง
 *  - แสดงอักษรเป้าหมายเป็นเงาจาง พร้อมเส้นช่วยกึ่งกลาง (米字格)
 *  - รองรับเมาส์และสัมผัส
 *  - คำนวณความตรงตามแบบร่างด้วย F1 ของ pixel overlap
 * --------------------------------------------------------- */
function HanziWriteCanvas({
  targetHanzi,
  disabled,
  onSubmit,
  accuracyResult,
  resetKey
}) {
  const canvasRef = useRefT(null);
  const drawingRef = useRefT(null);
  const isDrawingRef = useRefT(false);
  const lastPointRef = useRefT(null);
  const strokeCountRef = useRefT(0);
  const [strokeCount, setStrokeCount] = useStateT(0);
  const [submitting, setSubmitting] = useStateT(false);
  const chars = String(targetHanzi || "").replace(/\s+/g, "").split("");
  const charCount = Math.max(1, chars.length);
  const cellSize = 220;
  const W = cellSize * Math.min(charCount, 4);
  const H = cellSize;
  useEffectT(() => {
    initCanvas();
    isDrawingRef.current = false;
    strokeCountRef.current = 0;
    setStrokeCount(0);
    setSubmitting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetHanzi, resetKey]);
  function initCanvas() {
    const cv = canvasRef.current;
    if (!cv) return;
    cv.width = W;
    cv.height = H;
    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    drawingRef.current = off;
    drawTemplate();
  }
  function drawTemplate() {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    chars.forEach((ch, i) => {
      const left = i * cellSize;
      const cx = left + cellSize / 2;
      const cy = cellSize / 2;

      // กรอบช่อง
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.fillRect(left + 2, 2, cellSize - 4, cellSize - 4);

      // เส้นแบ่งกลาง + เส้นทแยง (米字格)
      ctx.strokeStyle = "rgba(251,191,36,0.35)";
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(cx, 4);
      ctx.lineTo(cx, cellSize - 4);
      ctx.moveTo(left + 4, cy);
      ctx.lineTo(left + cellSize - 4, cy);
      ctx.moveTo(left + 4, 4);
      ctx.lineTo(left + cellSize - 4, cellSize - 4);
      ctx.moveTo(left + cellSize - 4, 4);
      ctx.lineTo(left + 4, cellSize - 4);
      ctx.stroke();
      ctx.setLineDash([]);

      // กรอบนอก
      ctx.strokeStyle = "rgba(251,191,36,0.55)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(left + 2, 2, cellSize - 4, cellSize - 4);

      // อักษรแบบร่าง (จาง)
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.font = `900 ${cellSize * 0.78}px "Noto Sans SC", serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(ch, cx, cy);
    });

    // วาดเส้นที่ผู้ใช้เขียนไปแล้วซ้อนทับ
    if (drawingRef.current) ctx.drawImage(drawingRef.current, 0, 0);
  }
  function getCoords(e) {
    const cv = canvasRef.current;
    const rect = cv.getBoundingClientRect();
    const scaleX = cv.width / rect.width;
    const scaleY = cv.height / rect.height;
    const t = e.touches && e.touches[0] || e.changedTouches && e.changedTouches[0] || e;
    return {
      x: (t.clientX - rect.left) * scaleX,
      y: (t.clientY - rect.top) * scaleY
    };
  }
  function strokeSegment(from, to) {
    const visible = canvasRef.current.getContext("2d");
    const buffer = drawingRef.current.getContext("2d");
    [visible, buffer].forEach(ctx => {
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 9;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    });
  }
  function startDraw(e) {
    if (disabled) return;
    e.preventDefault();
    isDrawingRef.current = true;
    lastPointRef.current = getCoords(e);
    // จุดเล็ก ๆ เพื่อให้กดแล้วเห็นทันที
    strokeSegment(lastPointRef.current, lastPointRef.current);
  }
  function moveDraw(e) {
    if (!isDrawingRef.current || disabled) return;
    e.preventDefault();
    const coords = getCoords(e);
    strokeSegment(lastPointRef.current, coords);
    lastPointRef.current = coords;
  }
  function endDraw() {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    strokeCountRef.current += 1;
    setStrokeCount(strokeCountRef.current);
  }
  function clearAll() {
    if (drawingRef.current) {
      drawingRef.current.getContext("2d").clearRect(0, 0, W, H);
    }
    strokeCountRef.current = 0;
    setStrokeCount(0);
    drawTemplate();
  }
  function calculateAccuracy() {
    if (strokeCountRef.current === 0) return 0;
    const tplCv = document.createElement("canvas");
    tplCv.width = W;
    tplCv.height = H;
    const tCtx = tplCv.getContext("2d");
    tCtx.fillStyle = "#ffffff";
    tCtx.font = `900 ${cellSize * 0.78}px "Noto Sans SC", serif`;
    tCtx.textAlign = "center";
    tCtx.textBaseline = "middle";
    chars.forEach((ch, i) => {
      const cx = i * cellSize + cellSize / 2;
      tCtx.fillText(ch, cx, cellSize / 2);
    });
    const tData = tCtx.getImageData(0, 0, W, H).data;
    const dData = drawingRef.current.getContext("2d").getImageData(0, 0, W, H).data;
    let templatePixels = 0,
      drawnPixels = 0,
      overlap = 0;
    for (let i = 3; i < tData.length; i += 4) {
      const tA = tData[i] > 50;
      const dA = dData[i] > 50;
      if (tA) templatePixels++;
      if (dA) drawnPixels++;
      if (tA && dA) overlap++;
    }
    if (!templatePixels || !drawnPixels) return 0;
    const recall = overlap / templatePixels;
    const precision = overlap / drawnPixels;
    if (recall + precision === 0) return 0;
    const f1 = 2 * recall * precision / (recall + precision);
    return Math.round(Math.min(1, f1) * 100);
  }
  function handleSubmit() {
    if (submitting || disabled || strokeCountRef.current === 0) return;
    setSubmitting(true);
    const acc = calculateAccuracy();
    onSubmit && onSubmit(acc);
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center gap-3"
  }, /*#__PURE__*/React.createElement("canvas", {
    ref: canvasRef,
    className: "rounded-2xl border-2 border-yellow-400/70 bg-slate-900/40 w-full",
    style: {
      maxWidth: `${W}px`,
      aspectRatio: `${W} / ${H}`,
      touchAction: "none"
    },
    onMouseDown: startDraw,
    onMouseMove: moveDraw,
    onMouseUp: endDraw,
    onMouseLeave: endDraw,
    onTouchStart: startDraw,
    onTouchMove: moveDraw,
    onTouchEnd: endDraw,
    onTouchCancel: endDraw
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-center gap-2 text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rounded-full bg-[#f7efe3] px-3 py-1 text-[#6f5a50]"
  }, "\u0E40\u0E2A\u0E49\u0E19\u0E17\u0E35\u0E48\u0E40\u0E02\u0E35\u0E22\u0E19 ", strokeCount), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: clearAll,
    disabled: disabled || strokeCount === 0,
    className: "rounded-xl bg-[#f7efe3] px-4 py-2 text-[var(--arena-ink)] disabled:opacity-40"
  }, "\uD83D\uDDD1\uFE0F \u0E25\u0E49\u0E32\u0E07"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleSubmit,
    disabled: disabled || strokeCount === 0,
    className: "rounded-xl bg-yellow-400 px-5 py-2 font-bold text-black disabled:opacity-40"
  }, "\u0E15\u0E23\u0E27\u0E08\u0E01\u0E32\u0E23\u0E40\u0E02\u0E35\u0E22\u0E19")), typeof accuracyResult === "number" && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl bg-[#f7efe3] px-4 py-2 text-sm text-[var(--arena-ink)]"
  }, "\u0E04\u0E27\u0E32\u0E21\u0E15\u0E23\u0E07\u0E15\u0E32\u0E21\u0E41\u0E1A\u0E1A\u0E23\u0E48\u0E32\u0E07: ", /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-yellow-700"
  }, accuracyResult, "%"), /*#__PURE__*/React.createElement("span", {
    className: "ml-2 text-[#7b665d]"
  }, accuracyResult >= 80 ? "เยี่ยม" : accuracyResult >= 50 ? "ผ่านเกณฑ์" : "ต้องฝึกอีก")));
}
const DAILY_REVIEW_PATTERN = ["read", "listen", "speak", "write", "write"];
const DAILY_REVIEW_SKILLS = ["read", "listen", "speak", "write"];
const DAILY_REVIEW_HISTORY_KEY = "hsk_daily_review_question_history";
function normalizeLatin(value = "") {
  return String(value).toLowerCase().replace(/[^a-z]/g, "");
}
function normalizeHanziInput(value = "") {
  return String(value).replace(/[\s\u200b.,!?;:()\[\]{}'"-]/g, "");
}
function makeDailyReviewQuestions(studentId, words, date = new Date()) {
  const pool = words.flatMap(word => DAILY_REVIEW_SKILLS.map(type => {
    const distractorPool = window.ALL_VOCAB.filter(item => item.id !== word.id && item.level === word.level);
    const fallbackPool = window.ALL_VOCAB.filter(item => item.id !== word.id);
    const sampled = U.sample(distractorPool.length >= 3 ? distractorPool : fallbackPool, 3);
    return {
      id: `${word.id}_${type}`,
      type,
      word,
      choices: type === "read" || type === "listen" ? U.shuffle([word, ...sampled]) : []
    };
  }));
  const totalNeeded = Math.min(words.length, pool.length);
  const scopeKey = `${studentId}_${U.toISO(date)}`;
  const historyMap = U.ls.get(DAILY_REVIEW_HISTORY_KEY, {});
  const usedIds = Array.isArray(historyMap[scopeKey]) ? historyMap[scopeKey] : [];
  const remaining = pool.filter(item => !usedIds.includes(item.id));
  let selected = U.shuffle(remaining).slice(0, totalNeeded);
  let nextHistory;
  if (selected.length < totalNeeded) {
    const fallback = U.shuffle(pool.filter(item => !selected.some(picked => picked.id === item.id))).slice(0, totalNeeded - selected.length);
    selected = [...selected, ...fallback];
    nextHistory = selected.map(item => item.id);
  } else {
    nextHistory = [...usedIds, ...selected.map(item => item.id)].slice(-pool.length);
  }
  historyMap[scopeKey] = nextHistory;
  U.ls.set(DAILY_REVIEW_HISTORY_KEY, historyMap);
  return selected;
}
function getSkillLabel(type) {
  return {
    read: "อ่าน",
    listen: "ฟัง",
    speak: "พูด",
    write: "เขียน"
  }[type] || type;
}
function hanziFitClass(hanzi = "", mode = "hero") {
  const length = String(hanzi).replace(/\s+/g, "").length;
  if (mode === "hero") {
    if (length >= 4) return "text-5xl sm:text-6xl";
    if (length === 3) return "text-6xl sm:text-7xl";
    return "text-8xl sm:text-9xl";
  }
  if (length >= 4) return "text-2xl sm:text-3xl";
  if (length === 3) return "text-3xl sm:text-4xl";
  return "text-3xl";
}
window.DailyTraining = function DailyTraining({
  user,
  onBack
}) {
  const game = window.SystemSettings?.getGame ? window.SystemSettings.getGame() : window.APP_CONFIG.game;
  const [level, setLevel] = useStateT(user.preferredLevel || 1);
  const [words, setWords] = useStateT([]);
  const [idx, setIdx] = useStateT(0);
  const [flipped, setFlipped] = useStateT(false);
  const [phase, setPhase] = useStateT("flashcard");
  const [reviewQuestions, setReviewQuestions] = useStateT([]);
  const [reviewIdx, setReviewIdx] = useStateT(0);
  const [reviewScore, setReviewScore] = useStateT(0);
  const [reviewDetails, setReviewDetails] = useStateT([]);
  const [reviewAnswered, setReviewAnswered] = useStateT(null);
  const [writingAnswer, setWritingAnswer] = useStateT("");
  const [speechState, setSpeechState] = useStateT({
    listening: false,
    transcript: "",
    error: "",
    errorCode: "",
    unsupported: false,
    requestingPermission: false
  });
  const speechRef = useRefT(null);
  useEffectT(() => {
    setWords(Progress.getTodayWords(user.studentId, level));
    setIdx(0);
    setFlipped(false);
    setPhase("flashcard");
    setReviewQuestions([]);
    setReviewIdx(0);
    setReviewScore(0);
    setReviewDetails([]);
    setReviewAnswered(null);
    setWritingAnswer("");
    setSpeechState({
      listening: false,
      transcript: "",
      accuracy: null,
      error: "",
      errorCode: "",
      unsupported: false,
      requestingPermission: false
    });
  }, [level]);
  useEffectT(() => {
    return () => {
      if (speechRef.current) speechRef.current.abort();
    };
  }, []);
  if (!words.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "scholar-shell arena-grid arena-noise min-h-screen flex items-center justify-center p-4 text-[var(--arena-ink)]"
    }, /*#__PURE__*/React.createElement("div", {
      className: "arena-panel max-w-md rounded-3xl p-8 text-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "mb-3 text-4xl"
    }, "\uD83C\uDF3F"), /*#__PURE__*/React.createElement("div", {
      className: "text-2xl font-bold"
    }, "\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E2D\u0E1A\u0E1D\u0E36\u0E01\u0E43\u0E2B\u0E21\u0E48"), /*#__PURE__*/React.createElement("div", {
      className: "mt-2 text-sm text-[#79655c]"
    }, "\u0E23\u0E30\u0E1A\u0E1A\u0E41\u0E08\u0E01\u0E04\u0E33\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E40\u0E09\u0E1E\u0E32\u0E30 ", game.daysPerWeek, " \u0E27\u0E31\u0E19\u0E15\u0E48\u0E2D\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E2A\u0E2D\u0E1A\u0E15\u0E32\u0E21\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E15\u0E31\u0E49\u0E07\u0E44\u0E27\u0E49"), /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      className: "jade-btn mt-5 w-full rounded-xl py-3 font-bold"
    }, "\u0E01\u0E25\u0E31\u0E1A\u0E2A\u0E39\u0E48\u0E41\u0E14\u0E0A\u0E1A\u0E2D\u0E23\u0E4C\u0E14")));
  }
  const w = words[idx];
  const currentReview = reviewQuestions[reviewIdx];
  const StrokeWriter = window.HanziStrokeWriter;
  const startDailyReview = () => {
    setReviewQuestions(makeDailyReviewQuestions(user.studentId, words));
    setReviewIdx(0);
    setReviewScore(0);
    setReviewDetails([]);
    setReviewAnswered(null);
    setWritingAnswer("");
    setSpeechState({
      listening: false,
      transcript: "",
      accuracy: null,
      error: "",
      errorCode: "",
      unsupported: false,
      requestingPermission: false
    });
    setPhase("quiz");
  };
  const next = () => {
    if (idx + 1 < words.length) {
      setIdx(idx + 1);
      setFlipped(false);
      U.sfxClick();
    } else {
      Progress.markTodayComplete(user.studentId);
      U.sfxLevelUp();
      setPhase("quiz_intro");
    }
  };
  const prev = () => {
    if (idx > 0) {
      setIdx(idx - 1);
      setFlipped(false);
    }
  };
  function answerReview(isCorrect, meta = {}) {
    if (!currentReview || reviewAnswered) return;
    if (speechRef.current) speechRef.current.abort();
    const nextScore = reviewScore + (isCorrect ? 1 : 0);
    setReviewScore(nextScore);
    setReviewDetails(list => [...list, {
      questionId: currentReview.id,
      type: currentReview.type,
      hanzi: currentReview.word.hanzi,
      correct: isCorrect,
      expected: currentReview.word.hanzi,
      transcript: meta.transcript || "",
      answer: meta.answer || "",
      prompt: meta.prompt || "",
      speakAccuracy: typeof meta.speakAccuracy === "number" ? meta.speakAccuracy : null,
      writeAccuracy: typeof meta.writeAccuracy === "number" ? meta.writeAccuracy : null
    }]);
    setReviewAnswered({
      correct: isCorrect,
      meta
    });
    if (isCorrect) U.sfxCorrect();else U.sfxWrong();
  }
  function nextReviewQuestion() {
    if (reviewIdx + 1 >= reviewQuestions.length) {
      const currentDetail = reviewAnswered ? {
        questionId: currentReview.id,
        type: currentReview.type,
        hanzi: currentReview.word.hanzi,
        correct: reviewAnswered.correct,
        expected: currentReview.word.hanzi,
        transcript: reviewAnswered.meta?.transcript || "",
        answer: reviewAnswered.meta?.answer || "",
        prompt: reviewAnswered.meta?.prompt || "",
        speakAccuracy: typeof reviewAnswered.meta?.speakAccuracy === "number" ? reviewAnswered.meta.speakAccuracy : null,
        writeAccuracy: typeof reviewAnswered.meta?.writeAccuracy === "number" ? reviewAnswered.meta.writeAccuracy : null
      } : null;
      const finalDetails = currentDetail && !reviewDetails.some(detail => detail.questionId === currentDetail.questionId) ? [...reviewDetails, currentDetail] : reviewDetails;
      const total = reviewQuestions.length;
      const finalScore = reviewScore;
      const accuracy = total ? Math.round(finalScore / total * 100) : 0;
      Progress.recordDailyReview({
        studentId: user.studentId,
        level,
        score: finalScore,
        total,
        accuracy,
        details: finalDetails
      });
      setReviewDetails(finalDetails);
      setPhase("result");
      return;
    }
    setReviewIdx(reviewIdx + 1);
    setReviewAnswered(null);
    setWritingAnswer("");
    setSpeechState({
      listening: false,
      transcript: "",
      accuracy: null,
      error: "",
      errorCode: "",
      unsupported: false,
      requestingPermission: false
    });
  }
  async function startSpeechChallenge() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let microphoneGranted = false;
    if (window.location.protocol === "file:") {
      setSpeechState({
        listening: false,
        transcript: "",
        accuracy: null,
        error: "หน้าเว็บถูกเปิดแบบ file:// ทำให้ระบบไมโครโฟนและรู้จำเสียงทำงานไม่ครบ กรุณาเปิดผ่าน http://127.0.0.1:8080/",
        errorCode: "file-protocol",
        unsupported: false,
        requestingPermission: false
      });
      return;
    }
    if (!Recognition) {
      setSpeechState({
        listening: false,
        transcript: "",
        accuracy: null,
        error: "",
        errorCode: "recognition-unsupported",
        unsupported: true,
        requestingPermission: false
      });
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setSpeechState({
        listening: false,
        transcript: "",
        accuracy: null,
        error: "อุปกรณ์นี้ไม่รองรับการขอสิทธิ์ไมโครโฟน",
        errorCode: "permission-unsupported",
        unsupported: false,
        requestingPermission: false
      });
      return;
    }
    setSpeechState({
      listening: false,
      transcript: "",
      accuracy: null,
      error: "",
      errorCode: "",
      unsupported: false,
      requestingPermission: true
    });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      microphoneGranted = true;
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      const denied = error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError";
      const noDevice = error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError";
      setSpeechState({
        listening: false,
        transcript: "",
        accuracy: null,
        error: denied ? "ยังไม่ได้รับสิทธิ์ใช้ไมโครโฟน กรุณาอนุญาตก่อนเริ่มพูด" : noDevice ? "ไม่พบไมโครโฟนบนอุปกรณ์นี้" : "ไม่สามารถเปิดไมโครโฟนได้",
        errorCode: denied ? "not-allowed" : noDevice ? "audio-capture" : "permission-error",
        unsupported: false,
        requestingPermission: false
      });
      return;
    }
    if (speechRef.current) speechRef.current.abort();
    const recognition = new Recognition();
    speechRef.current = recognition;
    recognition.lang = "zh-CN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    recognition.onstart = () => setSpeechState({
      listening: true,
      transcript: "",
      accuracy: null,
      error: "",
      errorCode: "",
      unsupported: false,
      requestingPermission: false
    });
    recognition.onerror = event => {
      if (event.error === "aborted") {
        setSpeechState(state => ({
          ...state,
          listening: false,
          requestingPermission: false
        }));
        return;
      }
      const errorCode = event.error === "not-allowed" && microphoneGranted ? "service-not-allowed" : event.error || "speech-error";
      const errorMessage = errorCode === "not-allowed" ? "ยังไม่ได้รับสิทธิ์ใช้ไมโครโฟน กรุณาอนุญาตก่อนเริ่มพูด" : errorCode === "service-not-allowed" ? "เบราว์เซอร์ยังไม่อนุญาตบริการรู้จำเสียงพูด แม้ไมโครโฟนจะอนุญาตแล้ว" : event.error === "audio-capture" ? "ไม่สามารถเข้าถึงไมโครโฟนได้" : event.error === "no-speech" ? "ยังไม่ได้ยินเสียงพูด ลองพูดใกล้ไมโครโฟนแล้วกดใหม่" : event.error === "network" ? "บริการแปลงเสียงไม่พร้อมใช้งานในขณะนี้ ลองใหม่อีกครั้ง" : errorCode === "service-not-allowed" ? "เบราว์เซอร์ยังไม่อนุญาตบริการรู้จำเสียงพูด แม้ไมโครโฟนจะอนุญาตแล้ว" : event.error || "speech-error";
      setSpeechState({
        listening: false,
        transcript: "",
        accuracy: null,
        error: errorMessage,
        errorCode,
        unsupported: false,
        requestingPermission: false
      });
    };
    recognition.onresult = event => {
      const alternatives = [];
      Array.from(event.results || []).forEach(result => {
        Array.from(result || []).forEach(alt => {
          if (alt && alt.transcript) alternatives.push(alt.transcript);
        });
      });
      const primary = alternatives[0] || "";
      // ลองทุก alternative แล้วเลือกค่า accuracy สูงสุด
      const accuracy = alternatives.reduce((best, alt) => {
        const acc = U.calcSpeechAccuracy(alt, currentReview.word.hanzi, currentReview.word.pinyin);
        return acc > best ? acc : best;
      }, 0);
      const correct = accuracy >= 60;
      setSpeechState({
        listening: false,
        transcript: primary,
        accuracy,
        error: "",
        errorCode: "",
        unsupported: false,
        requestingPermission: false
      });
      answerReview(correct, {
        transcript: primary,
        answer: primary,
        speakAccuracy: accuracy,
        prompt: U.getPrimaryMeaning(currentReview.word.meaning)
      });
    };
    recognition.onend = () => {
      setSpeechState(state => ({
        ...state,
        listening: false,
        requestingPermission: false
      }));
    };
    recognition.start();
  }
  if (phase === "quiz_intro") {
    return /*#__PURE__*/React.createElement("div", {
      className: "scholar-shell arena-grid arena-noise min-h-screen flex items-center justify-center p-4 text-[var(--arena-ink)]"
    }, /*#__PURE__*/React.createElement("div", {
      className: "arena-panel rounded-3xl p-8 max-w-2xl text-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-5xl mb-3"
    }, "\uD83E\uDDE0"), /*#__PURE__*/React.createElement("h2", {
      className: "text-3xl font-bold mb-2"
    }, "\u0E41\u0E1A\u0E1A\u0E1D\u0E36\u0E01\u0E2B\u0E25\u0E31\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E27\u0E31\u0E19"), /*#__PURE__*/React.createElement("p", {
      className: "mb-6 text-[#75625a]"
    }, "\u0E04\u0E38\u0E13\u0E40\u0E23\u0E35\u0E22\u0E19\u0E23\u0E39\u0E49\u0E04\u0E33\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E04\u0E23\u0E1A ", words.length, " \u0E04\u0E33\u0E41\u0E25\u0E49\u0E27 \u0E15\u0E48\u0E2D\u0E14\u0E49\u0E27\u0E22\u0E41\u0E1A\u0E1A\u0E1D\u0E36\u0E01\u0E17\u0E1A\u0E17\u0E27\u0E19\u0E2A\u0E31\u0E49\u0E19 \u0E46 \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E27\u0E31\u0E14\u0E04\u0E27\u0E32\u0E21\u0E01\u0E49\u0E32\u0E27\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E31\u0E49\u0E07\u0E01\u0E32\u0E23\u0E1F\u0E31\u0E07 \u0E1E\u0E39\u0E14 \u0E2D\u0E48\u0E32\u0E19 \u0E41\u0E25\u0E30\u0E40\u0E02\u0E35\u0E22\u0E19"), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 text-sm"
    }, DAILY_REVIEW_SKILLS.map(type => /*#__PURE__*/React.createElement("div", {
      key: type,
      className: "rounded-xl bg-[#f7efe3] p-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl mb-1"
    }, type === "read" && "📖", type === "listen" && "🎧", type === "speak" && "🗣️", type === "write" && "✍️"), /*#__PURE__*/React.createElement("div", null, getSkillLabel(type))))), /*#__PURE__*/React.createElement("div", {
      className: "rounded-2xl bg-[#fbf5ed] p-4 text-left text-sm space-y-2 mb-6"
    }, /*#__PURE__*/React.createElement("p", null, "\u0E41\u0E1A\u0E1A\u0E40\u0E02\u0E35\u0E22\u0E19\u0E04\u0E33\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E20\u0E32\u0E29\u0E32\u0E08\u0E35\u0E19\u0E08\u0E30\u0E43\u0E2B\u0E49\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E21\u0E32\u0E22\u0E41\u0E25\u0E30 Pinyin \u0E41\u0E25\u0E49\u0E27\u0E43\u0E2B\u0E49\u0E19\u0E31\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19\u0E1E\u0E34\u0E21\u0E1E\u0E4C\u0E2D\u0E31\u0E01\u0E29\u0E23\u0E08\u0E35\u0E19\u0E08\u0E23\u0E34\u0E07"), /*#__PURE__*/React.createElement("p", null, "\u0E21\u0E35\u0E15\u0E31\u0E27\u0E0A\u0E48\u0E27\u0E22\u0E40\u0E1B\u0E47\u0E19\u0E08\u0E33\u0E19\u0E27\u0E19\u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23\u0E41\u0E25\u0E30\u0E1B\u0E38\u0E48\u0E21\u0E1F\u0E31\u0E07\u0E40\u0E2A\u0E35\u0E22\u0E07 \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E04\u0E48\u0E2D\u0E22 \u0E46 \u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E04\u0E33\u0E2D\u0E48\u0E32\u0E19\u0E01\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E40\u0E02\u0E35\u0E22\u0E19")), /*#__PURE__*/React.createElement("button", {
      onClick: startDailyReview,
      className: "jade-btn w-full py-3 rounded-xl font-bold"
    }, "\u0E40\u0E23\u0E34\u0E48\u0E21\u0E17\u0E33\u0E41\u0E1A\u0E1A\u0E1D\u0E36\u0E01\u0E2B\u0E25\u0E31\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19")));
  }
  if (phase === "result") {
    const summary = Progress.getDailyReviewSummary(user.studentId).today;
    const total = reviewQuestions.length || 1;
    const accuracy = summary?.accuracy ?? Math.round(reviewScore / total * 100);
    const bySkill = DAILY_REVIEW_SKILLS.map(type => {
      const items = reviewDetails.filter(detail => detail.type === type);
      return {
        type,
        total: items.length,
        correct: items.filter(detail => detail.correct).length
      };
    });
    return /*#__PURE__*/React.createElement("div", {
      className: "scholar-shell arena-grid arena-noise min-h-screen flex items-center justify-center p-4 text-[var(--arena-ink)]"
    }, /*#__PURE__*/React.createElement("div", {
      className: "arena-panel rounded-3xl p-8 max-w-2xl text-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-5xl mb-3"
    }, "\uD83C\uDF89"), /*#__PURE__*/React.createElement("h2", {
      className: "text-3xl font-bold mb-2"
    }, "\u0E2A\u0E23\u0E38\u0E1B\u0E01\u0E32\u0E23\u0E40\u0E23\u0E35\u0E22\u0E19\u0E23\u0E39\u0E49\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E27\u0E31\u0E19"), /*#__PURE__*/React.createElement("p", {
      className: "mb-6 text-[#75625a]"
    }, "\u0E04\u0E38\u0E13\u0E1D\u0E36\u0E01 ", words.length, " \u0E04\u0E33\u0E02\u0E2D\u0E07\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u0E41\u0E25\u0E49\u0E27 \u0E41\u0E25\u0E30\u0E17\u0E33\u0E41\u0E1A\u0E1A\u0E1D\u0E36\u0E01\u0E2B\u0E25\u0E31\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E04\u0E23\u0E1A\u0E17\u0E38\u0E01\u0E17\u0E31\u0E01\u0E29\u0E30"), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-3 gap-3 mb-6 text-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "rounded-xl bg-[#f7efe3] p-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl"
    }, "\u2B50"), /*#__PURE__*/React.createElement("div", null, "+", game.xpPerTrainingComplete, " XP")), /*#__PURE__*/React.createElement("div", {
      className: "rounded-xl bg-[#f7efe3] p-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl"
    }, "\uD83E\uDE99"), /*#__PURE__*/React.createElement("div", null, "+", game.trainingCompleteCoins, " \u0E40\u0E2B\u0E23\u0E35\u0E22\u0E0D")), /*#__PURE__*/React.createElement("div", {
      className: "rounded-xl bg-[#f7efe3] p-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl"
    }, "\uD83D\uDD25"), /*#__PURE__*/React.createElement("div", null, "Streak +1"))), /*#__PURE__*/React.createElement("div", {
      className: "rounded-2xl bg-[#fbf5ed] p-5 mb-5"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-sm uppercase tracking-[0.25em] text-[var(--arena-jade)]"
    }, "Daily Review Score"), /*#__PURE__*/React.createElement("div", {
      className: "text-6xl font-black text-yellow-700 mt-2"
    }, reviewScore, "/", reviewQuestions.length), /*#__PURE__*/React.createElement("div", {
      className: "mt-2 text-lg"
    }, "\u0E04\u0E27\u0E32\u0E21\u0E41\u0E21\u0E48\u0E19\u0E22\u0E33 ", accuracy, "%")), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-6"
    }, bySkill.map(skill => /*#__PURE__*/React.createElement("div", {
      key: skill.type,
      className: "rounded-xl bg-[#f7efe3] p-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-bold"
    }, getSkillLabel(skill.type)), /*#__PURE__*/React.createElement("div", {
      className: "mt-1 text-xl text-yellow-700"
    }, skill.correct, "/", skill.total || 1)))), /*#__PURE__*/React.createElement("details", {
      className: "rounded-xl bg-[#fbf6ef] p-3 mb-4 text-left"
    }, /*#__PURE__*/React.createElement("summary", {
      className: "cursor-pointer font-semibold text-center"
    }, "\u0E14\u0E39\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E41\u0E1A\u0E1A\u0E1D\u0E36\u0E01\u0E2B\u0E25\u0E31\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19"), /*#__PURE__*/React.createElement("div", {
      className: "mt-3 space-y-2 text-sm max-h-60 overflow-y-auto"
    }, reviewDetails.map((detail, detailIndex) => /*#__PURE__*/React.createElement("div", {
      key: detail.questionId,
      className: `rounded-xl p-3 ${detail.correct ? "bg-emerald-500/15" : "bg-rose-500/15"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between gap-3"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "font-bold"
    }, detailIndex + 1, ". ", detail.hanzi), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-[#7f6a61]"
    }, "\u0E17\u0E31\u0E01\u0E29\u0E30 ", getSkillLabel(detail.type))), /*#__PURE__*/React.createElement("div", {
      className: "font-bold"
    }, detail.correct ? "✓ ถูก" : "✗ ผิด")), (detail.answer || detail.transcript) && /*#__PURE__*/React.createElement("div", {
      className: "mt-2 text-xs text-[#6f5b52]"
    }, "\u0E04\u0E33\u0E15\u0E2D\u0E1A\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13: ", detail.answer || detail.transcript, typeof detail.speakAccuracy === "number" && /*#__PURE__*/React.createElement("span", {
      className: "ml-2"
    }, "\xB7 \u0E40\u0E2A\u0E35\u0E22\u0E07\u0E15\u0E23\u0E07 ", detail.speakAccuracy, "%"), typeof detail.writeAccuracy === "number" && /*#__PURE__*/React.createElement("span", {
      className: "ml-2"
    }, "\xB7 \u0E40\u0E02\u0E35\u0E22\u0E19\u0E15\u0E23\u0E07 ", detail.writeAccuracy, "%")))))), /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      className: "jade-btn w-full py-3 rounded-xl font-bold"
    }, "\u0E01\u0E25\u0E31\u0E1A\u0E2A\u0E39\u0E48\u0E41\u0E14\u0E0A\u0E1A\u0E2D\u0E23\u0E4C\u0E14")));
  }
  if (phase === "quiz") {
    const hintBoxes = Array.from({
      length: String(currentReview.word.hanzi || "").replace(/\s+/g, "").length || 1
    });
    return /*#__PURE__*/React.createElement("div", {
      className: "scholar-shell arena-shell arena-grid arena-noise min-h-screen text-[var(--arena-ink)]"
    }, /*#__PURE__*/React.createElement("div", {
      className: "max-w-3xl mx-auto p-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-4"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      className: "ghost-btn px-4 py-2 rounded-lg"
    }, "\u2190 \u0E01\u0E25\u0E31\u0E1A"), /*#__PURE__*/React.createElement("div", {
      className: "text-right"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-sm uppercase tracking-[0.22em] text-[var(--arena-jade)]"
    }, "\u0E41\u0E1A\u0E1A\u0E1D\u0E36\u0E01\u0E2B\u0E25\u0E31\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19"), /*#__PURE__*/React.createElement("div", {
      className: "font-bold"
    }, "\u0E02\u0E49\u0E2D ", reviewIdx + 1, "/", reviewQuestions.length))), /*#__PURE__*/React.createElement("div", {
      className: "w-full h-2 bg-[#eadfd1] rounded-full mb-4 overflow-hidden"
    }, /*#__PURE__*/React.createElement("div", {
      className: "h-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-yellow-300 transition-all",
      style: {
        width: `${(reviewIdx + 1) / reviewQuestions.length * 100}%`
      }
    })), /*#__PURE__*/React.createElement("div", {
      className: "arena-panel rounded-3xl p-6"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-center text-[#a26d19] font-bold uppercase tracking-[0.28em] text-sm mb-3"
    }, currentReview.type === "read" && "📖 อ่านแล้วเลือกความหมาย", currentReview.type === "listen" && "🎧 ฟังเสียงแล้วเลือกคำ", currentReview.type === "speak" && "🗣️ พูดตามคำศัพท์", currentReview.type === "write" && "✍️ เขียนคำศัพท์ภาษาจีน"), /*#__PURE__*/React.createElement("div", {
      className: "text-center my-6"
    }, currentReview.type === "read" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: `${hanziFitClass(currentReview.word.hanzi, "hero")} font-bold mb-3 whitespace-nowrap leading-none`,
      style: {
        fontFamily: "'Noto Sans SC',serif"
      }
    }, currentReview.word.hanzi), /*#__PURE__*/React.createElement("div", {
      className: "text-xl text-yellow-700"
    }, currentReview.word.pinyin)), currentReview.type === "listen" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
      onClick: () => U.speak(currentReview.word.hanzi),
      className: "text-8xl hover:scale-110 transition"
    }, "\uD83D\uDD0A"), /*#__PURE__*/React.createElement("div", {
      className: "mt-3 text-sm text-[#7b665d]"
    }, "\u0E01\u0E14\u0E1F\u0E31\u0E07\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E41\u0E25\u0E49\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E04\u0E33\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E17\u0E35\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07")), currentReview.type === "speak" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: `${hanziFitClass(currentReview.word.hanzi, "card")} font-bold mb-2 whitespace-nowrap leading-none`,
      style: {
        fontFamily: "'Noto Sans SC',serif"
      }
    }, currentReview.word.hanzi), /*#__PURE__*/React.createElement("div", {
      className: "text-2xl text-yellow-700 mb-1"
    }, currentReview.word.pinyin), /*#__PURE__*/React.createElement("div", {
      className: "text-lg text-[#75625a] mb-4"
    }, U.getPrimaryMeaning(currentReview.word.meaning)), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col items-center gap-3"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: startSpeechChallenge,
      disabled: reviewAnswered?.correct || speechState.listening || speechState.requestingPermission,
      className: "gold-btn rounded-xl px-6 py-3 font-bold"
    }, speechState.requestingPermission ? "กำลังขอสิทธิ์ไมโครโฟน..." : speechState.listening ? "กำลังฟังเสียง..." : "เริ่มพูดคำศัพท์"), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => U.speak(currentReview.word.hanzi),
      className: "rounded-xl bg-[#f7efe3] px-5 py-2 text-sm text-[var(--arena-ink)]"
    }, "\u0E1F\u0E31\u0E07\u0E15\u0E49\u0E19\u0E41\u0E1A\u0E1A\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07"), (speechState.unsupported || speechState.error) && !reviewAnswered && /*#__PURE__*/React.createElement("div", {
      className: "rounded-xl bg-amber-500/15 p-4 text-sm"
    }, speechState.unsupported ? "อุปกรณ์นี้ยังไม่รองรับการจับเสียงอัตโนมัติ ลองพูดตามเสียงต้นแบบแล้วกดปุ่มด้านล่างเพื่อประเมินตนเอง" : speechState.errorCode === "file-protocol" ? "หน้านี้เปิดผ่าน file:// ทำให้ browser ไม่รองรับการจับเสียงเต็มรูปแบบ กรุณาเปิดระบบผ่าน http://127.0.0.1:8080/" : speechState.errorCode === "no-speech" ? "ระบบยังไม่ได้ยินเสียงพูดจากไมโครโฟน ลองพูดให้ชัดขึ้นหรือขยับเข้าใกล้ไมโครโฟนแล้วกดใหม่" : speechState.errorCode === "network" || speechState.errorCode === "service-not-allowed" ? "บริการแปลงเสียงของเบราว์เซอร์ยังไม่พร้อมใช้งานในขณะนี้ คุณยังฟังต้นแบบและประเมินตนเองได้" : speechState.errorCode === "not-allowed" || speechState.errorCode === "permission-unsupported" || speechState.errorCode === "permission-error" ? "ระบบยังใช้ไมโครโฟนไม่ได้ กรุณาตรวจสอบสิทธิ์การใช้งานไมโครโฟนก่อน" : "ระบบจับเสียงมีปัญหาชั่วคราว ลองกดใหม่อีกครั้ง หรือใช้การประเมินตนเองแทน", /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => answerReview(true, {
        answer: "ประเมินตนเองว่าออกเสียงได้"
      }),
      className: "mt-3 w-full rounded-xl bg-amber-400 px-4 py-2 font-bold text-black"
    }, "\u0E09\u0E31\u0E19\u0E1E\u0E39\u0E14\u0E15\u0E32\u0E21\u0E44\u0E14\u0E49\u0E41\u0E25\u0E49\u0E27")), speechState.transcript && /*#__PURE__*/React.createElement("div", {
      className: "rounded-xl bg-[#f7efe3] px-4 py-2 text-sm"
    }, /*#__PURE__*/React.createElement("div", null, "\u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E14\u0E49\u0E22\u0E34\u0E19\u0E27\u0E48\u0E32: ", /*#__PURE__*/React.createElement("span", {
      className: "font-semibold text-[var(--arena-ink)]"
    }, speechState.transcript)), typeof speechState.accuracy === "number" && /*#__PURE__*/React.createElement("div", {
      className: "mt-1"
    }, "\u0E04\u0E27\u0E32\u0E21\u0E41\u0E21\u0E48\u0E19\u0E22\u0E33\u0E01\u0E32\u0E23\u0E2D\u0E2D\u0E01\u0E40\u0E2A\u0E35\u0E22\u0E07:", /*#__PURE__*/React.createElement("span", {
      className: `ml-2 font-bold ${speechState.accuracy >= 80 ? "text-emerald-700" : speechState.accuracy >= 60 ? "text-yellow-700" : "text-rose-700"}`
    }, speechState.accuracy, "%"), /*#__PURE__*/React.createElement("span", {
      className: "ml-2 text-[#7b665d]"
    }, speechState.accuracy >= 90 ? "ออกเสียงแม่นมาก" : speechState.accuracy >= 75 ? "ออกเสียงดี" : speechState.accuracy >= 60 ? "ผ่านเกณฑ์" : speechState.accuracy >= 40 ? "ใกล้แล้ว ลองอีกครั้ง" : "ฝึกอ่านอีกครั้ง"))), speechState.error && /*#__PURE__*/React.createElement("div", {
      className: "text-sm text-rose-700"
    }, "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E08\u0E31\u0E1A\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E44\u0E14\u0E49: ", speechState.error))), currentReview.type === "write" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-lg text-[#75625a]"
    }, "\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E21\u0E32\u0E22: ", /*#__PURE__*/React.createElement("span", {
      className: "font-bold text-[var(--arena-ink)]"
    }, U.getPrimaryMeaning(currentReview.word.meaning))), /*#__PURE__*/React.createElement("div", {
      className: "mt-2 text-2xl text-yellow-700 font-semibold"
    }, currentReview.word.pinyin), /*#__PURE__*/React.createElement("div", {
      className: "mt-3 text-sm text-[#7b665d]"
    }, "\u0E14\u0E39\u0E25\u0E33\u0E14\u0E31\u0E1A\u0E02\u0E35\u0E14\u0E43\u0E2B\u0E49\u0E40\u0E02\u0E49\u0E32\u0E43\u0E08\u0E01\u0E48\u0E2D\u0E19 \u0E41\u0E25\u0E49\u0E27\u0E01\u0E14 ", /*#__PURE__*/React.createElement("b", null, "\u0E40\u0E23\u0E34\u0E48\u0E21\u0E40\u0E02\u0E35\u0E22\u0E19\u0E15\u0E32\u0E21"), " \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E25\u0E32\u0E01\u0E40\u0E02\u0E35\u0E22\u0E19\u0E15\u0E32\u0E21\u0E17\u0E35\u0E25\u0E30\u0E02\u0E35\u0E14"), /*#__PURE__*/React.createElement("div", {
      className: "mt-4"
    }, StrokeWriter ? /*#__PURE__*/React.createElement(StrokeWriter, {
      targetHanzi: currentReview.word.hanzi,
      disabled: !!reviewAnswered,
      accuracyResult: typeof reviewAnswered?.meta?.writeAccuracy === "number" ? reviewAnswered.meta.writeAccuracy : null,
      resetKey: currentReview.id,
      size: 200,
      onSubmit: accuracy => answerReview(accuracy >= 50, {
        answer: `เขียนตามลำดับขีด ${accuracy}%`,
        prompt: U.getPrimaryMeaning(currentReview.word.meaning),
        writeAccuracy: accuracy
      })
    }) : /*#__PURE__*/React.createElement(HanziWriteCanvas, {
      targetHanzi: currentReview.word.hanzi,
      disabled: !!reviewAnswered,
      accuracyResult: typeof reviewAnswered?.meta?.writeAccuracy === "number" ? reviewAnswered.meta.writeAccuracy : null,
      resetKey: currentReview.id,
      onSubmit: accuracy => answerReview(accuracy >= 50, {
        answer: `เขียนตามแบบร่าง ${accuracy}%`,
        prompt: U.getPrimaryMeaning(currentReview.word.meaning),
        writeAccuracy: accuracy
      })
    })), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => U.speak(currentReview.word.hanzi),
      className: "mt-4 rounded-xl bg-[#f7efe3] px-5 py-2 text-sm text-[var(--arena-ink)]"
    }, "\uD83D\uDD0A \u0E1F\u0E31\u0E07\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E04\u0E33\u0E19\u0E35\u0E49"))), (currentReview.type === "read" || currentReview.type === "listen") && /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-1 sm:grid-cols-2 gap-3"
    }, currentReview.choices.map((choice, choiceIndex) => {
      const isCorrect = reviewAnswered && choice.id === currentReview.word.id;
      const isPicked = reviewAnswered && reviewAnswered.meta?.choiceId === choice.id;
      let cls = "bg-[#fbf4ea] hover:bg-[#f2e4d2]";
      if (reviewAnswered) {
        if (isCorrect) cls = "bg-emerald-100 text-emerald-900";else if (isPicked) cls = "bg-rose-100 text-rose-900";else cls = "bg-[#f7efe3] opacity-55";
      }
      return /*#__PURE__*/React.createElement("button", {
        key: choice.id,
        type: "button",
        onClick: () => answerReview(choice.id === currentReview.word.id, {
          choiceId: choice.id,
          answer: currentReview.type === "read" ? U.getPrimaryMeaning(choice.meaning) : choice.hanzi
        }),
        disabled: !!reviewAnswered,
        className: `rounded-xl border border-[#e1d3c2] p-4 text-left text-lg font-semibold text-[var(--arena-ink)] transition ${cls}`
      }, /*#__PURE__*/React.createElement("span", {
        className: "mr-2 text-yellow-700"
      }, String.fromCharCode(65 + choiceIndex), "."), currentReview.type === "read" ? U.getPrimaryMeaning(choice.meaning) : /*#__PURE__*/React.createElement("span", {
        className: "text-2xl"
      }, choice.hanzi));
    })), reviewAnswered && /*#__PURE__*/React.createElement("div", {
      className: "mt-5 text-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: `text-2xl font-bold ${reviewAnswered.correct ? "text-emerald-700" : "text-rose-700"}`
    }, reviewAnswered.correct ? "✓ ถูกต้อง" : currentReview.type === "write" ? `✗ เฉลย: ${currentReview.word.hanzi}` : currentReview.type === "speak" ? `✗ ลองอีกครั้ง คำนี้คือ ${currentReview.word.hanzi}` : `✗ เฉลย: ${U.getPrimaryMeaning(currentReview.word.meaning)} (${currentReview.word.hanzi})`), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: nextReviewQuestion,
      className: "jade-btn mt-3 rounded-xl px-8 py-3 font-bold"
    }, reviewIdx + 1 === reviewQuestions.length ? "ดูสรุปผล →" : "ข้อถัดไป →")))));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "scholar-shell arena-shell arena-grid arena-noise min-h-screen text-[var(--arena-ink)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-3xl mx-auto p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    className: "ghost-btn px-4 py-2 rounded-lg"
  }, "\u2190 \u0E01\u0E25\u0E31\u0E1A"), /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-yellow-300 bg-gradient-to-br from-yellow-300 to-amber-400 px-5 py-3 text-center shadow-[0_12px_24px_rgba(240,193,91,0.24)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-[0.22em] text-[#6e4612]"
  }, "Word Level"), /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-black text-[#2f241f]"
  }, "HSK ", w.level))), /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-3 text-sm text-[#7a665d]"
  }, "\u0E04\u0E33\u0E17\u0E35\u0E48 ", idx + 1, " / ", words.length), /*#__PURE__*/React.createElement("div", {
    className: "w-full h-2 bg-[#eadfd1] rounded-full mb-6 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all",
    style: {
      width: `${(idx + 1) / words.length * 100}%`
    }
  })), /*#__PURE__*/React.createElement("div", {
    onClick: () => setFlipped(!flipped),
    className: "relative mx-auto h-[380px] max-w-[500px] cursor-pointer overflow-hidden rounded-3xl shadow-2xl transition duration-300 hover:-translate-y-1"
  }, !flipped ? /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-rose-500 via-pink-500 to-orange-500 p-8 text-white"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 overflow-hidden rounded-3xl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute left-6 top-6 text-5xl font-black text-white/18"
  }, "HSK ", w.level), /*#__PURE__*/React.createElement("div", {
    className: "absolute right-8 top-8 h-28 w-28 rounded-full bg-white/8 blur-sm"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-6 left-1/2 h-24 w-52 -translate-x-1/2 rounded-[28px] bg-black/8 blur-sm"
  })), /*#__PURE__*/React.createElement("div", {
    className: `relative z-10 ${hanziFitClass(w.hanzi, "hero")} mb-6 font-bold leading-none drop-shadow-[0_4px_12px_rgba(60,24,38,0.18)]`,
    style: {
      fontFamily: "'Noto Sans SC',serif"
    }
  }, w.hanzi), /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      U.speak(w.hanzi);
    },
    className: "relative z-10 rounded-full bg-white/20 px-6 py-3 font-bold backdrop-blur hover:bg-white/30"
  }, "\uD83D\uDD0A \u0E1F\u0E31\u0E07\u0E40\u0E2A\u0E35\u0E22\u0E07"), /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-4 z-10 text-sm opacity-80"
  }, "\u0E41\u0E15\u0E30\u0E01\u0E32\u0E23\u0E4C\u0E14\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E14\u0E39\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E21\u0E32\u0E22")) : /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 p-8 text-center text-white"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 overflow-hidden rounded-3xl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute left-6 top-6 h-24 w-24 rounded-full bg-white/8 blur-sm"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-8 right-8 h-32 w-32 rounded-full bg-cyan-200/10 blur-md"
  })), /*#__PURE__*/React.createElement("div", {
    className: "absolute right-4 top-4 rounded-xl bg-white/14 px-3 py-1 text-xs font-semibold"
  }, "HSK ", w.level), /*#__PURE__*/React.createElement("div", {
    className: `relative z-10 ${hanziFitClass(w.hanzi, "hero")} max-w-full font-bold leading-none`,
    style: {
      fontFamily: "'Noto Sans SC',serif"
    }
  }, w.hanzi), /*#__PURE__*/React.createElement("div", {
    className: "relative z-10 mt-4 text-2xl font-bold text-yellow-200"
  }, w.pinyin), /*#__PURE__*/React.createElement("div", {
    className: "relative z-10 mt-5 max-w-[90%] rounded-2xl bg-white/16 px-5 py-3 text-2xl font-bold leading-snug"
  }, U.getPrimaryMeaning(w.meaning)), w.pos && /*#__PURE__*/React.createElement("div", {
    className: "relative z-10 mt-3 rounded-full bg-white/18 px-4 py-2 text-sm font-semibold"
  }, w.pos), /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-4 z-10 text-xs text-white/72"
  }, "\u0E41\u0E15\u0E30\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E01\u0E25\u0E31\u0E1A\u0E44\u0E1B\u0E14\u0E39\u0E04\u0E33\u0E28\u0E31\u0E1E\u0E17\u0E4C"))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mt-8"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: prev,
    disabled: idx === 0,
    className: "px-6 py-3 bg-[#f6ecdf] rounded-xl text-[var(--arena-ink)] disabled:opacity-30"
  }, "\u2190 \u0E01\u0E48\u0E2D\u0E19\u0E2B\u0E19\u0E49\u0E32"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, words.map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: `w-3 h-3 rounded-full ${i === idx ? "bg-yellow-400" : i < idx ? "bg-emerald-400" : "bg-white/20"}`
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: next,
    className: "jade-btn px-6 py-3 rounded-xl font-bold"
  }, idx + 1 === words.length ? "เสร็จสิ้น 🎉" : "ถัดไป →"))));
};