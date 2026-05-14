/* ===========================================================
 * Sentence Practice – ฝึก/ทดสอบประโยคจากคลังคำศัพท์
 * ทักษะ: ฟัง พูด อ่าน (ยังไม่เปิดทั่วไปจนกว่าแอดมินเปิด)
 * =========================================================== */
const {
  useState: useStateSentence,
  useMemo: useMemoSentence,
  useRef: useRefSentence,
  useEffect: useEffectSentence
} = React;
const SENTENCE_PRACTICE_KEY = "hsk_sentence_practice_logs";
const SENTENCE_TEST_KEY = "hsk_sentence_test_scores";
const SENTENCE_TEMPLATES = [{
  zh: "我爱喝水。",
  py: "wǒ ài hē shuǐ",
  th: "ฉันชอบดื่มน้ำ",
  words: ["我", "爱", "喝", "水"],
  scene: "ชีวิตประจำวัน"
}, {
  zh: "我今天去学校。",
  py: "wǒ jīn tiān qù xué xiào",
  th: "วันนี้ฉันไปโรงเรียน",
  words: ["我", "今天", "去", "学校"],
  scene: "โรงเรียน"
}, {
  zh: "他在家学习中文。",
  py: "tā zài jiā xué xí zhōng wén",
  th: "เขาเรียนภาษาจีนที่บ้าน",
  words: ["他", "在", "家", "学习", "中文"],
  scene: "การเรียน"
}, {
  zh: "妈妈买了苹果。",
  py: "mā ma mǎi le píng guǒ",
  th: "แม่ซื้อแอปเปิลแล้ว",
  words: ["妈妈", "买", "苹果"],
  scene: "ซื้อของ"
}, {
  zh: "我们一起吃饭。",
  py: "wǒ men yì qǐ chī fàn",
  th: "พวกเรากินข้าวด้วยกัน",
  words: ["我们", "一起", "吃饭"],
  scene: "ครอบครัว"
}, {
  zh: "老师问学生问题。",
  py: "lǎo shī wèn xué sheng wèn tí",
  th: "ครูถามคำถามนักเรียน",
  words: ["老师", "问", "学生", "问题"],
  scene: "ห้องเรียน"
}, {
  zh: "明天我想看电影。",
  py: "míng tiān wǒ xiǎng kàn diàn yǐng",
  th: "พรุ่งนี้ฉันอยากดูภาพยนตร์",
  words: ["明天", "我", "想", "看", "电影"],
  scene: "พักผ่อน"
}, {
  zh: "朋友喜欢听音乐。",
  py: "péng you xǐ huan tīng yīn yuè",
  th: "เพื่อนชอบฟังเพลง",
  words: ["朋友", "喜欢", "听", "音乐"],
  scene: "งานอดิเรก"
}, {
  zh: "现在天气很好。",
  py: "xiàn zài tiān qì hěn hǎo",
  th: "ตอนนี้อากาศดีมาก",
  words: ["现在", "天气", "很", "好"],
  scene: "สภาพอากาศ"
}, {
  zh: "爸爸开车去医院。",
  py: "bà ba kāi chē qù yī yuàn",
  th: "พ่อขับรถไปโรงพยาบาล",
  words: ["爸爸", "开车", "去", "医院"],
  scene: "การเดินทาง"
}, {
  zh: "这本书很有意思。",
  py: "zhè běn shū hěn yǒu yì si",
  th: "หนังสือเล่มนี้น่าสนใจมาก",
  words: ["这", "本", "书", "很", "有意思"],
  scene: "การอ่าน"
}, {
  zh: "下课以后我回家。",
  py: "xià kè yǐ hòu wǒ huí jiā",
  th: "หลังเลิกเรียนฉันกลับบ้าน",
  words: ["下课", "以后", "我", "回家"],
  scene: "หลังเลิกเรียน"
}];
function stripSentenceText(value = "") {
  return String(value || "").replace(/[，。！？,.!?;:\s]/g, "");
}
function getWordMap() {
  return (window.ALL_VOCAB || []).reduce((map, word) => {
    map[word.hanzi] = word;
    return map;
  }, {});
}
function buildSentenceBank() {
  const wordMap = getWordMap();
  const curated = SENTENCE_TEMPLATES.map((template, index) => ({
    ...template,
    id: `sentence-${index + 1}`,
    vocab: template.words.map(word => wordMap[word]).filter(Boolean),
    availableCount: template.words.filter(word => wordMap[word]).length
  })).filter(sentence => sentence.availableCount >= Math.min(3, sentence.words.length));
  if (curated.length >= 6) return curated;
  const fallbackWords = U.shuffle(window.ALL_VOCAB || []).slice(0, 8).map((word, index) => ({
    id: `dynamic-${word.id || index}`,
    zh: `我学习${word.hanzi}。`,
    py: `wǒ xué xí ${word.pinyin}`,
    th: `ฉันฝึกใช้คำว่า ${U.getPrimaryMeaning(word.meaning)}`,
    words: ["我", "学习", word.hanzi],
    scene: "ทบทวนคำศัพท์",
    vocab: [word],
    availableCount: 1
  }));
  return [...curated, ...fallbackWords];
}
function makeSentenceQuestions(sentences, total = 6) {
  const picked = U.shuffle(sentences).slice(0, Math.min(total, sentences.length));
  const types = ["read", "listen", "speak"];
  return picked.map((sentence, index) => {
    const type = types[index % types.length];
    const choices = U.shuffle([sentence, ...U.sample(sentences.filter(item => item.id !== sentence.id), 3)]);
    return {
      id: `${sentence.id}-${type}-${index}`,
      type,
      sentence,
      choices
    };
  });
}
window.SentencePractice = function SentencePractice({
  user,
  onBack
}) {
  const sentenceBank = useMemoSentence(() => buildSentenceBank(), []);
  const [mode, setMode] = useStateSentence("practice");
  const [idx, setIdx] = useStateSentence(0);
  const [questions, setQuestions] = useStateSentence(() => makeSentenceQuestions(sentenceBank, 6));
  const [answered, setAnswered] = useStateSentence(null);
  const [score, setScore] = useStateSentence(0);
  const [details, setDetails] = useStateSentence([]);
  const [speechState, setSpeechState] = useStateSentence({
    listening: false,
    transcript: "",
    accuracy: null,
    error: "",
    unsupported: false
  });
  const speechRef = useRefSentence(null);
  useEffectSentence(() => () => {
    if (speechRef.current) speechRef.current.abort();
  }, []);
  const current = mode === "test" ? questions[idx]?.sentence : sentenceBank[idx];
  const q = mode === "test" ? questions[idx] : null;
  function resetTest() {
    setQuestions(makeSentenceQuestions(sentenceBank, 6));
    setIdx(0);
    setAnswered(null);
    setScore(0);
    setDetails([]);
    setSpeechState({
      listening: false,
      transcript: "",
      accuracy: null,
      error: "",
      unsupported: false
    });
    setMode("test");
  }
  function recordPractice(skill) {
    const logs = U.ls.get(SENTENCE_PRACTICE_KEY, []);
    U.ls.set(SENTENCE_PRACTICE_KEY, [{
      studentId: user.studentId,
      sentenceId: current.id,
      skill,
      ts: Date.now()
    }, ...logs].slice(0, 200));
  }
  function answerTest(correct, meta = {}) {
    if (!q || answered) return;
    const nextScore = score + (correct ? 1 : 0);
    const entry = {
      id: q.id,
      type: q.type,
      zh: q.sentence.zh,
      correct,
      answer: meta.answer || "",
      transcript: meta.transcript || "",
      speakAccuracy: typeof meta.speakAccuracy === "number" ? meta.speakAccuracy : null
    };
    setScore(nextScore);
    setDetails(list => [...list, entry]);
    setAnswered({
      correct,
      ...meta
    });
    if (correct) U.sfxCorrect();else U.sfxWrong();
  }
  function nextTest() {
    if (idx + 1 >= questions.length) {
      const finalScore = score;
      const rows = U.ls.get(SENTENCE_TEST_KEY, []);
      U.ls.set(SENTENCE_TEST_KEY, [{
        studentId: user.studentId,
        classroom: user.classroom,
        score: finalScore,
        total: questions.length,
        details,
        ts: Date.now()
      }, ...rows].slice(0, 200));
      setMode("result");
      U.sfxLevelUp();
      return;
    }
    setIdx(idx + 1);
    setAnswered(null);
    setSpeechState({
      listening: false,
      transcript: "",
      accuracy: null,
      error: "",
      unsupported: false
    });
  }
  async function startSpeech(sentence, testMode = false) {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (window.location.protocol === "file:") {
      const error = "เปิดผ่าน file:// ทำให้ระบบไมโครโฟนทำงานไม่ครบ กรุณาใช้เว็บที่เผยแพร่หรือ localhost";
      setSpeechState({
        listening: false,
        transcript: "",
        accuracy: null,
        error,
        unsupported: false
      });
      return;
    }
    if (!Recognition || !navigator.mediaDevices?.getUserMedia) {
      setSpeechState({
        listening: false,
        transcript: "",
        accuracy: null,
        error: "",
        unsupported: true
      });
      return;
    }
    try {
      setSpeechState({
        listening: false,
        transcript: "",
        accuracy: null,
        error: "",
        unsupported: false,
        requestingPermission: true
      });
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      setSpeechState({
        listening: false,
        transcript: "",
        accuracy: null,
        error: "ยังไม่ได้รับสิทธิ์ใช้ไมโครโฟน",
        unsupported: false
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
      unsupported: false
    });
    recognition.onerror = event => setSpeechState({
      listening: false,
      transcript: "",
      accuracy: null,
      error: event.error || "speech-error",
      unsupported: false
    });
    recognition.onresult = event => {
      const alternatives = [];
      Array.from(event.results || []).forEach(result => {
        Array.from(result || []).forEach(alt => {
          if (alt?.transcript) alternatives.push(alt.transcript);
        });
      });
      const transcript = alternatives[0] || "";
      const expected = stripSentenceText(sentence.zh);
      const accuracy = alternatives.reduce((best, alt) => {
        const direct = U.calcSpeechAccuracy(alt, expected, sentence.py);
        return Math.max(best, direct);
      }, 0);
      setSpeechState({
        listening: false,
        transcript,
        accuracy,
        error: "",
        unsupported: false
      });
      if (testMode) answerTest(accuracy >= 60, {
        transcript,
        answer: transcript,
        speakAccuracy: accuracy
      });else {
        recordPractice("speak");
        if (accuracy >= 60) U.sfxCorrect();
      }
    };
    recognition.onend = () => setSpeechState(state => ({
      ...state,
      listening: false,
      requestingPermission: false
    }));
    recognition.start();
  }
  if (!sentenceBank.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "scholar-shell arena-grid arena-noise min-h-screen flex items-center justify-center p-4 text-[var(--arena-ink)]"
    }, /*#__PURE__*/React.createElement("div", {
      className: "arena-panel max-w-md rounded-3xl p-8 text-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-5xl mb-3"
    }, "\uD83D\uDCAC"), /*#__PURE__*/React.createElement("div", {
      className: "text-2xl font-bold"
    }, "\u0E22\u0E31\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E1B\u0E23\u0E30\u0E42\u0E22\u0E04\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49"), /*#__PURE__*/React.createElement("div", {
      className: "mt-2 text-sm text-[#79655c]"
    }, "\u0E23\u0E30\u0E1A\u0E1A\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E04\u0E33\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E43\u0E19\u0E04\u0E25\u0E31\u0E07\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22\u0E1A\u0E32\u0E07\u0E2A\u0E48\u0E27\u0E19\u0E01\u0E48\u0E2D\u0E19"), /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      className: "jade-btn mt-5 w-full rounded-xl py-3 font-bold"
    }, "\u0E01\u0E25\u0E31\u0E1A\u0E2A\u0E39\u0E48\u0E41\u0E14\u0E0A\u0E1A\u0E2D\u0E23\u0E4C\u0E14")));
  }
  if (mode === "result") {
    const accuracy = Math.round(score / questions.length * 100);
    return /*#__PURE__*/React.createElement("div", {
      className: "scholar-shell arena-shell arena-grid arena-noise min-h-screen flex items-center justify-center p-4 text-[var(--arena-ink)]"
    }, /*#__PURE__*/React.createElement("div", {
      className: "arena-panel max-w-2xl rounded-3xl p-7"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-5xl mb-2"
    }, "\uD83D\uDCAC"), /*#__PURE__*/React.createElement("h2", {
      className: "text-3xl font-black"
    }, "\u0E1C\u0E25\u0E17\u0E14\u0E2A\u0E2D\u0E1A\u0E1B\u0E23\u0E30\u0E42\u0E22\u0E04"), /*#__PURE__*/React.createElement("div", {
      className: "mt-4 text-6xl font-black text-sky-700"
    }, score, "/", questions.length), /*#__PURE__*/React.createElement("div", {
      className: "text-[#6e5a50]"
    }, "\u0E04\u0E27\u0E32\u0E21\u0E41\u0E21\u0E48\u0E19\u0E22\u0E33 ", accuracy, "%")), /*#__PURE__*/React.createElement("div", {
      className: "mt-5 space-y-2"
    }, details.map((detail, index) => /*#__PURE__*/React.createElement("div", {
      key: detail.id,
      className: `rounded-2xl p-3 text-sm ${detail.correct ? "bg-emerald-500/15" : "bg-rose-500/15"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between gap-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-bold"
    }, index + 1, ". ", detail.zh), /*#__PURE__*/React.createElement("div", null, detail.correct ? "ถูก" : "ทบทวนอีกครั้ง")), detail.transcript && /*#__PURE__*/React.createElement("div", {
      className: "mt-1 text-xs text-[#6f5b52]"
    }, "\u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E14\u0E49\u0E22\u0E34\u0E19: ", detail.transcript, " \xB7 ", detail.speakAccuracy, "%")))), /*#__PURE__*/React.createElement("div", {
      className: "mt-6 grid grid-cols-2 gap-3"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: resetTest,
      className: "gold-btn rounded-xl py-3 font-bold"
    }, "\u0E17\u0E14\u0E2A\u0E2D\u0E1A\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07"), /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      className: "jade-btn rounded-xl py-3 font-bold"
    }, "\u0E01\u0E25\u0E31\u0E1A\u0E41\u0E14\u0E0A\u0E1A\u0E2D\u0E23\u0E4C\u0E14"))));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "scholar-shell arena-shell arena-grid arena-noise min-h-screen text-[var(--arena-ink)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mx-auto max-w-5xl p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-4 flex flex-wrap items-center justify-between gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    className: "ghost-btn rounded-lg px-4 py-2"
  }, "\u2190 \u0E01\u0E25\u0E31\u0E1A"), /*#__PURE__*/React.createElement("div", {
    className: "flex rounded-2xl bg-white/70 p-1 shadow"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setMode("practice");
      setIdx(0);
    },
    className: `rounded-xl px-4 py-2 font-bold ${mode === "practice" ? "bg-sky-600 text-white" : "text-slate-600"}`
  }, "\u0E1D\u0E36\u0E01\u0E1B\u0E23\u0E30\u0E42\u0E22\u0E04"), /*#__PURE__*/React.createElement("button", {
    onClick: resetTest,
    className: `rounded-xl px-4 py-2 font-bold ${mode === "test" ? "bg-sky-600 text-white" : "text-slate-600"}`
  }, "\u0E17\u0E14\u0E2A\u0E2D\u0E1A"))), /*#__PURE__*/React.createElement("div", {
    className: "lacquer-panel mb-4 rounded-[30px] p-6 text-white"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs uppercase tracking-[0.25em] text-sky-100"
  }, "Sentence Lab"), /*#__PURE__*/React.createElement("h1", {
    className: "mt-2 text-4xl font-black"
  }, "\u0E1D\u0E36\u0E01\u0E43\u0E0A\u0E49\u0E04\u0E33\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E40\u0E1B\u0E47\u0E19\u0E1B\u0E23\u0E30\u0E42\u0E22\u0E04\u0E08\u0E23\u0E34\u0E07"), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 max-w-2xl text-sm text-white/78"
  }, "\u0E41\u0E1A\u0E1A\u0E1D\u0E36\u0E01\u0E19\u0E35\u0E49\u0E40\u0E19\u0E49\u0E19\u0E1F\u0E31\u0E07 \u0E1E\u0E39\u0E14 \u0E2D\u0E48\u0E32\u0E19 \u0E42\u0E14\u0E22\u0E19\u0E33\u0E04\u0E33\u0E28\u0E31\u0E1E\u0E17\u0E4C HSK \u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A\u0E21\u0E32\u0E1B\u0E23\u0E30\u0E01\u0E2D\u0E1A\u0E40\u0E1B\u0E47\u0E19\u0E1B\u0E23\u0E30\u0E42\u0E22\u0E04\u0E17\u0E35\u0E48\u0E43\u0E0A\u0E49\u0E43\u0E19\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E27\u0E31\u0E19")), mode === "practice" && /*#__PURE__*/React.createElement("div", {
    className: "grid gap-4 lg:grid-cols-[1.3fr_.7fr]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "arena-panel rounded-3xl p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-3 flex items-center justify-between gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-full bg-sky-100 px-3 py-1 text-sm font-bold text-sky-700"
  }, current.scene), /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-[#7d675d]"
  }, idx + 1, "/", sentenceBank.length)), /*#__PURE__*/React.createElement("div", {
    className: "my-8 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-5xl font-black leading-tight",
    style: {
      fontFamily: "'Noto Sans SC',serif"
    }
  }, current.zh), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 text-2xl font-bold text-sky-700"
  }, current.py), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 text-lg text-[#6f5a50]"
  }, current.th)), /*#__PURE__*/React.createElement("div", {
    className: "grid gap-3 sm:grid-cols-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      U.speak(current.zh);
      recordPractice("listen");
    },
    className: "rounded-2xl bg-[#f3e7d7] p-4 font-bold text-[var(--arena-ink)]"
  }, "\uD83D\uDD0A \u0E1F\u0E31\u0E07\u0E1B\u0E23\u0E30\u0E42\u0E22\u0E04"), /*#__PURE__*/React.createElement("button", {
    onClick: () => startSpeech(current, false),
    className: "rounded-2xl bg-sky-600 p-4 font-bold text-white"
  }, speechState.listening ? "กำลังฟัง..." : "🎙️ ฝึกพูด"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      recordPractice("read");
      U.toast("บันทึกการฝึกอ่านแล้ว", "success");
    },
    className: "rounded-2xl bg-emerald-600 p-4 font-bold text-white"
  }, "\uD83D\uDCD6 \u0E2D\u0E48\u0E32\u0E19\u0E41\u0E25\u0E49\u0E27")), (speechState.transcript || speechState.error || speechState.unsupported) && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 rounded-2xl bg-[#f8efe3] p-4 text-sm"
  }, speechState.unsupported ? "อุปกรณ์นี้ยังไม่รองรับการจับเสียงอัตโนมัติ สามารถฟังและพูดตามเพื่อประเมินตนเองได้" : speechState.error ? `ยังจับเสียงไม่ได้: ${speechState.error}` : /*#__PURE__*/React.createElement("span", null, "\u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E14\u0E49\u0E22\u0E34\u0E19\u0E27\u0E48\u0E32: ", /*#__PURE__*/React.createElement("b", null, speechState.transcript), " \xB7 \u0E04\u0E27\u0E32\u0E21\u0E41\u0E21\u0E48\u0E19\u0E22\u0E33 ", /*#__PURE__*/React.createElement("b", null, speechState.accuracy, "%"))), /*#__PURE__*/React.createElement("div", {
    className: "mt-5 flex justify-between"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setIdx(Math.max(0, idx - 1)),
    disabled: idx === 0,
    className: "rounded-xl bg-[#f7efe3] px-5 py-3 font-bold disabled:opacity-40"
  }, "\u0E01\u0E48\u0E2D\u0E19\u0E2B\u0E19\u0E49\u0E32"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setIdx((idx + 1) % sentenceBank.length),
    className: "gold-btn rounded-xl px-6 py-3 font-bold"
  }, "\u0E1B\u0E23\u0E30\u0E42\u0E22\u0E04\u0E16\u0E31\u0E14\u0E44\u0E1B"))), /*#__PURE__*/React.createElement("div", {
    className: "arena-panel rounded-3xl p-5"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "mb-3 text-xl font-bold"
  }, "\u0E04\u0E33\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E43\u0E19\u0E1B\u0E23\u0E30\u0E42\u0E22\u0E04"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, current.vocab.map(word => /*#__PURE__*/React.createElement("div", {
    key: word.id,
    className: "rounded-2xl bg-[#fbf4ea] p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-black",
    style: {
      fontFamily: "'Noto Sans SC',serif"
    }
  }, word.hanzi), /*#__PURE__*/React.createElement("div", {
    className: "rounded-full bg-sky-100 px-2 py-1 text-xs font-bold text-sky-700"
  }, "HSK ", word.level)), /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-sky-700"
  }, word.pinyin), /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-[#6f5a50]"
  }, U.getPrimaryMeaning(word.meaning))))))), mode === "test" && q && /*#__PURE__*/React.createElement("div", {
    className: "arena-panel rounded-3xl p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-4 flex items-center justify-between gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-bold"
  }, "\u0E02\u0E49\u0E2D ", idx + 1, "/", questions.length), /*#__PURE__*/React.createElement("div", {
    className: "rounded-full bg-sky-100 px-3 py-1 text-sm font-bold text-sky-700"
  }, "\u0E04\u0E30\u0E41\u0E19\u0E19 ", score)), /*#__PURE__*/React.createElement("div", {
    className: "mb-4 h-2 overflow-hidden rounded-full bg-[#eadfd1]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-500",
    style: {
      width: `${(idx + 1) / questions.length * 100}%`
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-center text-sm font-bold uppercase tracking-[0.24em] text-sky-700"
  }, q.type === "read" && "อ่านประโยค แล้วเลือกความหมาย", q.type === "listen" && "ฟังประโยค แล้วเลือกประโยคที่ได้ยิน", q.type === "speak" && "พูดตามประโยค"), /*#__PURE__*/React.createElement("div", {
    className: "my-7 text-center"
  }, q.type === "listen" ? /*#__PURE__*/React.createElement("button", {
    onClick: () => U.speak(q.sentence.zh),
    className: "text-8xl transition hover:scale-110"
  }, "\uD83D\uDD0A") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "text-5xl font-black leading-tight",
    style: {
      fontFamily: "'Noto Sans SC',serif"
    }
  }, q.sentence.zh), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 text-xl text-sky-700"
  }, q.sentence.py))), q.type === "speak" ? /*#__PURE__*/React.createElement("div", {
    className: "text-center"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => startSpeech(q.sentence, true),
    disabled: !!answered || speechState.listening,
    className: "gold-btn rounded-xl px-8 py-3 font-bold"
  }, speechState.listening ? "กำลังฟัง..." : "เริ่มพูดประโยค"), /*#__PURE__*/React.createElement("button", {
    onClick: () => U.speak(q.sentence.zh),
    className: "ml-2 rounded-xl bg-[#f7efe3] px-5 py-3 font-bold"
  }, "\u0E1F\u0E31\u0E07\u0E15\u0E49\u0E19\u0E41\u0E1A\u0E1A"), (speechState.error || speechState.unsupported) && !answered && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 rounded-2xl bg-amber-500/15 p-4 text-sm"
  }, speechState.unsupported ? "อุปกรณ์นี้ยังไม่รองรับการจับเสียงอัตโนมัติ" : `ยังจับเสียงไม่ได้: ${speechState.error}`, /*#__PURE__*/React.createElement("button", {
    onClick: () => answerTest(true, {
      answer: "ประเมินตนเองว่าพูดได้"
    }),
    className: "mt-3 w-full rounded-xl bg-amber-400 px-4 py-2 font-bold text-black"
  }, "\u0E09\u0E31\u0E19\u0E1E\u0E39\u0E14\u0E15\u0E32\u0E21\u0E44\u0E14\u0E49\u0E41\u0E25\u0E49\u0E27"))) : /*#__PURE__*/React.createElement("div", {
    className: "grid gap-3 sm:grid-cols-2"
  }, q.choices.map((choice, choiceIdx) => {
    const correct = answered && choice.id === q.sentence.id;
    const picked = answered && answered.answer === choice.id;
    return /*#__PURE__*/React.createElement("button", {
      key: choice.id,
      disabled: !!answered,
      onClick: () => answerTest(choice.id === q.sentence.id, {
        answer: choice.id
      }),
      className: `rounded-2xl border border-[#e1d3c2] p-4 text-left font-bold transition ${correct ? "bg-emerald-100 text-emerald-900" : picked ? "bg-rose-100 text-rose-900" : "bg-[#fbf4ea] hover:bg-[#f3e6d6]"}`
    }, /*#__PURE__*/React.createElement("span", {
      className: "mr-2 text-sky-700"
    }, String.fromCharCode(65 + choiceIdx), "."), q.type === "read" ? choice.th : choice.zh);
  })), answered && /*#__PURE__*/React.createElement("div", {
    className: "mt-5 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: `text-2xl font-black ${answered.correct ? "text-emerald-700" : "text-rose-700"}`
  }, answered.correct ? "ถูกต้อง" : `ทบทวนอีกครั้ง: ${q.sentence.th}`), typeof answered.speakAccuracy === "number" && /*#__PURE__*/React.createElement("div", {
    className: "mt-1 text-sm text-[#6f5a50]"
  }, "\u0E04\u0E27\u0E32\u0E21\u0E41\u0E21\u0E48\u0E19\u0E22\u0E33\u0E40\u0E2A\u0E35\u0E22\u0E07 ", answered.speakAccuracy, "%"), /*#__PURE__*/React.createElement("button", {
    onClick: nextTest,
    className: "jade-btn mt-4 rounded-xl px-8 py-3 font-bold"
  }, idx + 1 === questions.length ? "ดูผล" : "ข้อถัดไป")))));
};