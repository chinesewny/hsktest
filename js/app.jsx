/* ===========================================================
 * App – Router หลัก
 * =========================================================== */
const { useState: useStateApp, useEffect: useEffectApp } = React;

function settleWithin(promise, timeoutMs, fallbackValue = null) {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(fallbackValue), timeoutMs))
  ]);
}

function SiteFooter() {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 pointer-events-none">
      <div className="mx-auto max-w-4xl rounded-full border border-white/15 bg-slate-950/70 px-4 py-2 text-center text-[11px] text-white/80 shadow-lg backdrop-blur">
        พัฒนาระบบโดย ครูกีรติ ประสพพรรังสี กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ
      </div>
    </footer>
  );
}

function renderWithFooter(content) {
  return (
    <>
      {content}
      <SiteFooter />
    </>
  );
}

function CompetitionClosedScreen({ onBack }) {
  return (
    <div className="scholar-shell arena-grid arena-noise min-h-screen flex items-center justify-center p-6">
      <div className="lacquer-panel max-w-lg w-full rounded-[32px] p-8 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <div className="font-display text-3xl font-black text-[var(--arena-paper)]">ระบบการแข่งขันยังไม่เปิด</div>
        <div className="mt-3 text-sm text-white/70">
          ตอนนี้ยังเข้าใช้งานการสอบประจำสัปดาห์และกระดานผู้นำไม่ได้ กรุณารอแอดมินเปิดระบบการแข่งขันก่อน
        </div>
        <button onClick={onBack} className="gold-btn mobile-btn mt-6 rounded-xl px-5 py-3 font-bold">
          กลับสู่แดชบอร์ด
        </button>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useStateApp(() => AuthService.current());
  const [route, setRoute] = useStateApp("dashboard");
  const [refreshKey, setRefreshKey] = useStateApp(0);
  const [booting, setBooting] = useStateApp(() => !!AuthService.current());

  useEffectApp(() => {
    let cancelled = false;
    (async () => {
      const localUser = AuthService.current();
      const hasFirebaseSession = !!window.fbAuth?.currentUser;

      if (!localUser && !hasFirebaseSession) {
        setBooting(false);
        window.SystemSettings?.init?.().catch(error => {
          console.warn("[app] background settings init failed", error);
        });
        Progress.init().catch(error => {
          console.warn("[app] background progress init failed", error);
        });
        return;
      }

      try {
        const [, , hydratedUser] = await Promise.all([
          settleWithin(window.SystemSettings?.init?.().catch(error => {
            console.warn("[app] settings init failed", error);
            return null;
          }) || Promise.resolve(null), 2000, null),
          settleWithin(Progress.init().catch(error => {
            console.warn("[app] progress init failed", error);
            return null;
          }), 3500, null),
          settleWithin(AuthService.hydrateCurrent().catch(error => {
            console.warn("[app] auth hydrate failed", error);
            return null;
          }), 3500, null)
        ]);
        if (!cancelled && hydratedUser) setUser(hydratedUser);
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (booting) {
    return renderWithFooter(
      <div className="scholar-shell arena-grid arena-noise min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <img
            src="logo-system.png"
            alt="HSK Battle Arena Logo"
            className="mx-auto mb-6 h-28 w-28 object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.28)]"
          />
          <div className="loader"></div>
          <div className="font-display text-2xl font-bold text-[var(--arena-paper)]">Synchronizing Hanzi Academy...</div>
          <div className="mt-2 text-sm text-[#6d5149]">กำลังเชื่อมต่อข้อมูลนักเรียน ผลสอบ รางวัล และการตั้งค่าห้องเรียน</div>
        </div>
      </div>
    );
  }

  const refresh = () => {
    const u = AuthService.current();
    if (u) setUser({ ...u });
    setRefreshKey(k => k + 1);
  };

  if (!user) {
    return renderWithFooter(
      <AuthScreen onLogin={(u) => { setUser(u); setRoute(u.role === "admin" ? "admin" : "dashboard"); }} />
    );
  }

  const nav = (r) => { U.sfxClick(); setRoute(r); };
  const back = () => { setRoute("dashboard"); refresh(); };
  const logout = () => { AuthService.logout(); setUser(null); };
  const competitionEnabled = (window.SystemSettings?.getGame ? window.SystemSettings.getGame() : window.APP_CONFIG.game).competitionEnabled !== false;

  switch (route) {
    case "training":
      return renderWithFooter(<DailyTraining key={refreshKey} user={user} onBack={back} />);
    case "test":
      return renderWithFooter(
        competitionEnabled
          ? <WeeklyTest user={user} onBack={back} onComplete={back} />
          : <CompetitionClosedScreen onBack={back} />
      );
    case "leaderboard":
      return renderWithFooter(
        competitionEnabled
          ? <Leaderboard user={user} onBack={back} />
          : <CompetitionClosedScreen onBack={back} />
      );
    case "shop":
      return renderWithFooter(<Shop user={user} onBack={back} refresh={refresh} />);
    case "profile":
      return renderWithFooter(<Profile user={user} onBack={back} />);
    case "rewards":
      return renderWithFooter(<MyRewards user={user} onBack={back} />);
    case "admin":
      return renderWithFooter(
        user.role === "admin"
          ? <AdminPanel user={user} onBack={back} />
          : <div className="p-10 text-center">ไม่มีสิทธิ์เข้าถึง</div>
      );
    default:
      return renderWithFooter(<StudentDashboard key={refreshKey} user={user} onNav={nav} onLogout={logout} />);
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
console.log("[app] mounted");
