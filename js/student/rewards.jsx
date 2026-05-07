/* ===========================================================
 * My Rewards – คูปองและของรางวัลที่ได้รับ
 * =========================================================== */
const { useMemo: useMemoR } = React;

window.MyRewards = function MyRewards({ user, onBack }) {
  const list = useMemoR(() => Progress.myRewards(user.studentId), [user.studentId]);
  const rewardCatalog = window.SystemSettings?.getRewardMap ? window.SystemSettings.getRewardMap() : {};

  return (
    <div className="scholar-shell arena-grid arena-noise min-h-screen text-[var(--arena-ink)]">
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="ghost-btn px-4 py-2 rounded-lg">← กลับ</button>
          <h1 className="page-heading text-2xl font-bold">🎁 ของรางวัลของฉัน</h1>
          <div></div>
        </div>

        {list.length === 0 ? (
          <div className="arena-panel rounded-2xl p-10 text-center border border-white/10">
            <div className="text-4xl mb-3">🎁</div>
            <div className="text-lg">คุณยังไม่มีของรางวัล</div>
            <div className="text-sm text-[#7a665d] mt-2">ติดอันดับ Top 1 ของระดับชั้นในแต่ละสัปดาห์เพื่อรับรางวัล!</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {list.map((r,i) => {
              const cat = rewardCatalog[r.rewardId] || { emoji:"🎁", name:r.rewardId, detail:"", color:"from-gray-500 to-gray-700" };
              return (
                <div key={i} className={`bg-gradient-to-br ${cat.color} rounded-2xl p-4 shadow-lg`}>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl">{cat.emoji}</div>
                    <div className="text-xs bg-black/30 px-2 py-1 rounded-full">{r.weekKey}</div>
                  </div>
                  <div className="font-bold mt-2">{cat.name}</div>
                  <div className="text-xs opacity-90 mt-1 text-white [text-shadow:0_1px_2px_rgba(60,30,20,0.35)]">{cat.detail}</div>
                  <div className="text-xs mt-1 text-white [text-shadow:0_1px_2px_rgba(60,30,20,0.4)]">รับเมื่อ {new Date(r.ts).toLocaleDateString("th-TH")}</div>
                  <div className="text-xs mt-2 bg-black/30 rounded p-2 font-mono">รหัสคูปอง: {(r.studentId+r.ts).slice(-8).toUpperCase()}</div>
                </div>
              );
            })}
          </div>
        )}

        <div className="lacquer-panel mt-4 rounded-xl p-3 text-sm">
          📌 นำคูปองนี้ไปแสดงที่คุณครูเพื่อรับสิทธิ์ตามรายละเอียด
        </div>
      </div>
    </div>
  );
};
