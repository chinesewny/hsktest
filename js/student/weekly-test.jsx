/* ===========================================================
 * Weekly Test – 10 ข้อ จากคำศัพท์สัปดาห์นี้ + ระบบไอเทมช่วย
 * รูปแบบคำถาม: listen / read / pinyin / write
 * =========================================================== */
const { useState: useStateW, useEffect: useEffectW, useMemo: useMemoW, useRef: useRefW } = React;

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
  const uniqueWords = U.shuffle(
    learnedWords.filter((word, index, list) => list.findIndex(item => item.id === word.id) === index)
  );
  const totalNeeded = Math.min(GAME_CFG.questionsPerTest, uniqueWords.length);
  const scopeKey = `${studentId}_${cycleKey}`;
  const historyMap = U.ls.get(TEST_HISTORY_KEY, {});
  const usedIds = Array.isArray(historyMap[scopeKey]) ? historyMap[scopeKey] : [];
  const remaining = uniqueWords.filter(word => !usedIds.includes(word.id));

  let selected = remaining.slice(0, totalNeeded);
  let nextHistory;

  if (selected.length < totalNeeded) {
    const fallback = uniqueWords.filter(word => !selected.some(picked => picked.id === word.id))
      .slice(0, totalNeeded - selected.length);
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
    return { type, word: w, choices, correct: w.id };
  });
}

window.WeeklyTest = function WeeklyTest({ user, onBack, onComplete }) {
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
  const [hidden, setHidden] = useStateW([]);     // 50/50
  const [showPinyin, setShowPinyin] = useStateW(false);
  const [shieldArmed, setShieldArmed] = useStateW(false);
  const [doubleArmed, setDoubleArmed] = useStateW(false);
  const [items, setItems] = useStateW({...(user.items||{})});
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
    if (timeLeft <= 0) { handleAnswer(null); return; }
    const t = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, answered, paused, done]);

  // Auto play audio for listen type
  useEffectW(() => {
    if (qList.length && qList[qIdx]?.type === "listen" && !answered) {
      setTimeout(() => U.speak(qList[qIdx].word.hanzi), 300);
    }
  }, [qIdx, qList]);

  if (!qList.length) return <div className="p-10 text-center text-[var(--arena-ink)]">กำลังเตรียมข้อสอบ...</div>;

  const q = qList[qIdx];
  const StrokeWriter = window.HanziStrokeWriter;

  function useItem(key) {
    if (!items[key] || items[key] <= 0) return U.toast("ไอเทมหมด", "warn");
    const itemInfo = itemsCatalog[key] || { emoji: "🎒", name: key };
    const updatedItems = { ...items, [key]: items[key] - 1 };
    if (key === "fifty") {
      const wrongs = q.choices.filter(c => c.id !== q.correct);
      const toHide = U.sample(wrongs, 2).map(c => c.id);
      setHidden(toHide);
    }
    if (key === "time")   setTimeLeft(t => t + 15);
    if (key === "pinyin") setShowPinyin(true);
    if (key === "shield") setShieldArmed(true);
    if (key === "double") setDoubleArmed(true);
    if (key === "ice") {
      setPaused(true);
      setTimeout(() => { setPaused(false); }, 10000);
    }
    if (key === "dice") {
      // เปลี่ยนคำถามเป็นคำที่ง่ายกว่า (ระดับต่ำสุดที่มี)
      const easy = U.sample(window.HSK1_VOCAB, 1)[0];
      const distractors = U.sample(window.ALL_VOCAB.filter(x => x.id !== easy.id), 3);
      const newQ = { type: "read", word: easy, choices: U.shuffle([easy, ...distractors]), correct: easy.id };
      const updated = [...qList]; updated[qIdx] = newQ;
      setQList(updated); setHidden([]); setShowPinyin(false);
    }
    setItems(updatedItems);
    AuthService.updateUser(user.studentId, { items: updatedItems });
    U.toast(`ใช้ ${itemInfo.emoji} ${itemInfo.name} แล้ว เหลือ ${updatedItems[key]} ชิ้น`, "info");
    U.sfxClick();
  }

  function handleAnswer(choiceId, meta = {}) {
    let isCorrect = choiceId === q.correct;
    if (!isCorrect && shieldArmed) {
      isCorrect = true; setShieldArmed(false);
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
      if (doubleArmed) { pts *= 2; setDoubleArmed(false); }
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
      qIdx: qIdx + 1, wordId: q.word.id, hanzi: q.word.hanzi,
      type: q.type, correct: isCorrect, points: pts, choseId: choiceId,
      strokeAccuracy: typeof meta.strokeAccuracy === "number" ? meta.strokeAccuracy : null
    }]);
    setAnswered({ id: choiceId, correct: isCorrect, points: pts, strokeAccuracy: meta.strokeAccuracy });
  }

  function nextQ() {
    if (qIdx + 1 >= qList.length) { finalize(); return; }
    const nextIdx = qIdx + 1;
    const nextType = qList[nextIdx]?.type || "read";
    setQIdx(nextIdx);
    setAnswered(null);
    setTimeLeft(timeBudgetForType(cfg.timePerQuestion, nextType));
    setHidden([]); setShowPinyin(false);
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
      studentId: user.studentId, classroom: user.classroom,
      score, total: qList.length, details, cycleKey: testSummary.cycle.key
    });
    setDone(true);
    setTimeout(() => U.sfxLevelUp(), 200);
  }

  // ───── DONE SCREEN ─────
  if (done) {
    const correctCount = details.filter(d => d.correct).length;
    const accuracy = Math.round(correctCount / qList.length * 100);
    const stars = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : accuracy >= 50 ? 1 : 0;
    return (
      <div className="scholar-shell arena-shell arena-grid arena-noise min-h-screen flex items-center justify-center p-4 text-[var(--arena-ink)]">
        <div className="arena-panel max-w-lg w-full rounded-3xl p-6">
          <div className="text-center">
            <div className="text-5xl mb-2">{stars === 3 ? "🏆" : stars === 2 ? "🥈" : stars === 1 ? "🥉" : "💪"}</div>
            <h2 className="text-3xl font-bold">ผลการสอบ</h2>
            <div className="flex justify-center gap-2 my-4">
              {[1,2,3].map(s => (
                <div key={s} className={`text-4xl ${s<=stars?"":"opacity-20"}`}>⭐</div>
              ))}
            </div>
            <div className="text-6xl font-black text-yellow-700">{score}</div>
            <div className="text-[#6e5a50]">คะแนน ({correctCount}/{qList.length} ข้อถูก = {accuracy}%)</div>
            <div className="mt-2 text-sm text-[#8a756b]">รอบสอบ {testSummary.cycle.key} จากคำฝึก {testSummary.totalWords} คำ</div>
          </div>
          <div className="grid grid-cols-2 gap-3 my-5 text-sm">
            <div className="rounded-xl bg-[#f7efe3] p-3 text-center">
              <div className="font-bold text-[var(--arena-ink)]">+{correctCount * cfg.xpPerCorrect}</div>
              <div className="text-[#8a756b]">⭐ XP</div>
            </div>
            <div className="rounded-xl bg-[#f7efe3] p-3 text-center">
              <div className="font-bold text-[var(--arena-ink)]">+{correctCount * cfg.coinsPerCorrect}</div>
              <div className="text-[#8a756b]">🪙 เหรียญ</div>
            </div>
          </div>
          <details className="rounded-xl bg-[#fbf6ef] p-3 mb-4">
            <summary className="cursor-pointer font-semibold">ดูรายละเอียดข้อสอบ</summary>
            <div className="mt-3 space-y-1 text-sm max-h-60 overflow-y-auto">
              {details.map((d,i) => (
                <div key={i} className={`flex items-center justify-between p-2 rounded ${d.correct?"bg-emerald-500/20":"bg-rose-500/20"}`}>
                  <span>{i+1}. {d.hanzi} <span className="opacity-60">({d.type})</span></span>
                  <span>{d.correct?"✓":"✗"} +{d.points}</span>
                </div>
              ))}
            </div>
          </details>
          <button onClick={onBack} className="gold-btn w-full py-3 rounded-xl font-bold">
            กลับสู่แดชบอร์ด
          </button>
        </div>
      </div>
    );
  }

  // ───── QUESTION SCREEN ─────
  return (
    <div className="scholar-shell arena-shell arena-grid arena-noise min-h-screen text-[var(--arena-ink)]">
      <div className="max-w-3xl mx-auto p-4">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold">ข้อ {qIdx+1}/{qList.length}</div>
            <div className={`px-3 py-1 rounded-full text-sm font-bold ${
              timeLeft <= 5 ? "bg-rose-500 animate-pulse" : timeLeft <= 10 ? "bg-amber-500" : "bg-emerald-600"
            }`}>⏱ {timeLeft}s</div>
            {paused && <div className="px-3 py-1 bg-cyan-500 rounded-full text-sm">❄️ หยุดเวลา</div>}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-lg font-bold">⭐ {score}</div>
            {streakCorrect >= 2 && <div className="text-sm bg-orange-500 px-2 py-1 rounded-full animate-pulse">🔥 {streakCorrect} ติด!</div>}
          </div>
        </div>
        <div className="w-full h-2 bg-[#eadfd1] rounded-full mb-4 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-rose-400 transition-all"
               style={{width: `${((qIdx+1)/qList.length)*100}%`}}></div>
        </div>
        <div className="mb-4 rounded-2xl border border-[#e2d4c4] bg-[#faf4ec] p-3 text-sm text-[#6b574d]">
          สอบรอบวันจันทร์จากคำศัพท์ที่ฝึกในสัปดาห์ {testSummary.cycle.key} จำนวน {testSummary.totalWords} คำ
        </div>

        {/* Question card */}
        <div className="arena-panel rounded-3xl p-6 mb-4">
          <div className="text-sm text-[#a46a18] font-bold mb-3 text-center uppercase tracking-wider">
            {q.type === "read"   && "📖 อ่านอักษร แล้วเลือกความหมาย"}
            {q.type === "listen" && "🎧 ฟังเสียง แล้วเลือกอักษร"}
            {q.type === "pinyin" && "🔤 เลือก Pinyin ที่ถูกต้อง"}
            {q.type === "write"  && "✍️ พิมพ์ Pinyin ของคำนี้"}
            {q.type === "stroke" && "🖌️ เขียนอักษรจีนตามลำดับขีด"}
          </div>

          <div className="text-center my-6">
            {q.type === "read" && (
              <div>
                <div className={`${hanziFitClass(q.word.hanzi)} font-bold mb-2 whitespace-nowrap leading-none`}>{q.word.hanzi}</div>
                {showPinyin && <div className="text-2xl text-yellow-700">{q.word.pinyin}</div>}
              </div>
            )}
            {q.type === "listen" && (
              <button onClick={()=>U.speak(q.word.hanzi)}
                      className="text-7xl hover:scale-110 transition">🔊</button>
            )}
            {q.type === "pinyin" && (
              <div>
                <div className={`${hanziFitClass(q.word.hanzi)} font-bold mb-2 whitespace-nowrap leading-none`}>{q.word.hanzi}</div>
                <div className="text-xl text-[#7a665d]">{U.getPrimaryMeaning(q.word.meaning)}</div>
              </div>
            )}
            {q.type === "write" && (
              <div>
                <div className={`${hanziFitClass(q.word.hanzi)} font-bold mb-3 whitespace-nowrap leading-none`}>{q.word.hanzi}</div>
                <div className="text-lg mb-3 text-[#7a665d]">{U.getPrimaryMeaning(q.word.meaning)}</div>
                <input ref={writeRef}
                       className="w-64 px-4 py-3 rounded-xl text-black text-xl text-center outline-none border-4 border-yellow-400"
                       placeholder="พิมพ์ Pinyin..." disabled={!!answered}
                       onKeyDown={(e) => {
                         if (e.key === "Enter") {
                           const a = e.target.value.trim().toLowerCase().replace(/[^a-z]/g,"");
                           const correct = q.word.pinyin.toLowerCase().replace(/[^a-z]/g,"");
                           handleAnswer(a === correct ? q.correct : "wrong");
                         }
                       }} />
                <button onClick={() => {
                  const a = writeRef.current.value.trim().toLowerCase().replace(/[^a-z]/g,"");
                  const correct = q.word.pinyin.toLowerCase().replace(/[^a-z]/g,"");
                  handleAnswer(a === correct ? q.correct : "wrong");
                }} disabled={!!answered}
                  className="ml-2 px-6 py-3 bg-yellow-400 text-black rounded-xl font-bold">ตอบ</button>
              </div>
            )}
            {q.type === "stroke" && (
              <div className="flex flex-col items-center">
                <div className="mb-2 text-xl text-yellow-700 font-semibold">{q.word.pinyin}</div>
                <div className="mb-3 text-lg text-[#7a665d]">{U.getPrimaryMeaning(q.word.meaning)}</div>
                <div className="text-xs text-[#866f64] mb-3">ดูแอนิเมชันลำดับขีดให้ครบก่อน แล้วกด <b>เริ่มเขียนตาม</b></div>
                {StrokeWriter ? (
                  <StrokeWriter
                    targetHanzi={q.word.hanzi}
                    disabled={!!answered}
                    accuracyResult={typeof answered?.strokeAccuracy === "number" ? answered.strokeAccuracy : null}
                    resetKey={`weekly-${qIdx}-${q.word.id}`}
                    size={200}
                    onSubmit={(accuracy) => handleAnswer(accuracy >= 50 ? q.correct : "wrong", { strokeAccuracy: accuracy })}
                  />
                ) : (
                  <div className="rounded-xl bg-rose-500/15 p-4 text-sm">
                    ไม่สามารถโหลดเครื่องมือเขียนอักษรได้
                    <button onClick={() => handleAnswer(q.correct, { strokeAccuracy: 0 })}
                            className="mt-2 ml-2 rounded-lg bg-amber-400 px-3 py-1 font-bold text-black">ข้าม</button>
                  </div>
                )}
                <button type="button" onClick={() => U.speak(q.word.hanzi)}
                        className="mt-3 rounded-xl bg-[#f6ecdf] px-4 py-1 text-sm text-[var(--arena-ink)]">🔊 ฟังเสียงคำนี้</button>
              </div>
            )}
          </div>

          {/* Choices (read/listen/pinyin) */}
          {q.type !== "write" && q.type !== "stroke" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {q.choices.map((c, i) => {
                const isHidden = hidden.includes(c.id);
                const isCorrect = answered && c.id === q.correct;
                const isPicked = answered && c.id === answered.id;
                let cls = "bg-[#fbf4ea] hover:bg-[#f3e6d6]";
                if (answered) {
                  if (isCorrect) cls = "bg-emerald-100 text-emerald-900";
                  else if (isPicked) cls = "bg-rose-100 text-rose-900";
                  else cls = "bg-[#f7efe3] opacity-55";
                }
                if (isHidden) cls = "bg-[#f7efe3] opacity-30 line-through";
                return (
                  <button key={i} onClick={() => !answered && !isHidden && handleAnswer(c.id)}
                          disabled={answered || isHidden}
                          className={`p-4 rounded-xl text-left text-lg font-semibold transition border border-[#e1d3c2] text-[var(--arena-ink)] ${cls}`}>
                    <span className="text-yellow-700 mr-2">{String.fromCharCode(65+i)}.</span>
                    {q.type === "read"   && U.getPrimaryMeaning(c.meaning)}
                    {q.type === "listen" && (<span className="text-2xl">{c.hanzi}</span>)}
                    {q.type === "pinyin" && c.pinyin}
                  </button>
                );
              })}
            </div>
          )}

          {answered && (
            <div className="mt-4 text-center">
              <div className={`text-2xl font-bold ${answered.correct?"text-emerald-700":"text-rose-700"}`}>
                {answered.correct ? `✓ ถูกต้อง! +${answered.points}` : `✗ ผิด — เฉลย: ${U.getPrimaryMeaning(q.word.meaning)} (${q.word.pinyin})`}
              </div>
              {q.type === "stroke" && typeof answered.strokeAccuracy === "number" && (
                <div className="mt-1 text-sm text-[#7a665d]">ความแม่นยำลำดับขีด {answered.strokeAccuracy}%</div>
              )}
              <button onClick={nextQ}
                      className="gold-btn mt-3 px-8 py-3 rounded-xl font-bold">
                {qIdx + 1 === qList.length ? "ดูผล →" : "ข้อถัดไป →"}
              </button>
            </div>
          )}
        </div>

        {/* Items bar */}
        {!answered && (
          <div className="arena-panel rounded-2xl p-3 border border-white/10">
            <div className="text-xs text-[#8a756b] mb-2">🎒 ไอเทมของคุณ</div>
            <div className="flex flex-wrap gap-2">
              {Object.values(itemsCatalog).map(it => (
                <button key={it.key} onClick={() => useItem(it.key)}
                        disabled={!items[it.key] || items[it.key] <= 0}
                        title={`${it.name}: ${it.desc}`}
                        className={`px-3 py-2 rounded-lg text-sm transition ${
                          items[it.key]>0 ? "bg-[#f7efe3] hover:bg-[#efdfcc]" : "bg-[#f7efe3] opacity-30"
                        }`}>
                  <span className="text-xl">{it.emoji}</span>
                  <span className="ml-1 font-bold">{items[it.key]||0}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
