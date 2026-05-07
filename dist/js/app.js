/* ===========================================================
 * App – Router หลัก
 * =========================================================== */
const {
  useState: useStateApp,
  useEffect: useEffectApp
} = React;
function settleWithin(promise, timeoutMs, fallbackValue = null) {
  return Promise.race([promise, new Promise(resolve => setTimeout(() => resolve(fallbackValue), timeoutMs))]);
}
function SiteFooter() {
  return /*#__PURE__*/React.createElement("footer", {
    className: "fixed inset-x-0 bottom-0 z-50 px-3 pb-3 pointer-events-none"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mx-auto max-w-4xl rounded-full border border-white/15 bg-slate-950/70 px-4 py-2 text-center text-[11px] text-white/80 shadow-lg backdrop-blur"
  }, "\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E23\u0E30\u0E1A\u0E1A\u0E42\u0E14\u0E22 \u0E04\u0E23\u0E39\u0E01\u0E35\u0E23\u0E15\u0E34 \u0E1B\u0E23\u0E30\u0E2A\u0E1E\u0E1E\u0E23\u0E23\u0E31\u0E07\u0E2A\u0E35 \u0E01\u0E25\u0E38\u0E48\u0E21\u0E2A\u0E32\u0E23\u0E30\u0E01\u0E32\u0E23\u0E40\u0E23\u0E35\u0E22\u0E19\u0E23\u0E39\u0E49\u0E20\u0E32\u0E29\u0E32\u0E15\u0E48\u0E32\u0E07\u0E1B\u0E23\u0E30\u0E40\u0E17\u0E28"));
}
function renderWithFooter(content) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, content, /*#__PURE__*/React.createElement(SiteFooter, null));
}
function CompetitionClosedScreen({
  onBack
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "scholar-shell arena-grid arena-noise min-h-screen flex items-center justify-center p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lacquer-panel max-w-lg w-full rounded-[32px] p-8 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-6xl mb-4"
  }, "\uD83D\uDD12"), /*#__PURE__*/React.createElement("div", {
    className: "font-display text-3xl font-black text-[var(--arena-paper)]"
  }, "\u0E23\u0E30\u0E1A\u0E1A\u0E01\u0E32\u0E23\u0E41\u0E02\u0E48\u0E07\u0E02\u0E31\u0E19\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E40\u0E1B\u0E34\u0E14"), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 text-sm text-white/70"
  }, "\u0E15\u0E2D\u0E19\u0E19\u0E35\u0E49\u0E22\u0E31\u0E07\u0E40\u0E02\u0E49\u0E32\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E01\u0E32\u0E23\u0E2A\u0E2D\u0E1A\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C\u0E41\u0E25\u0E30\u0E01\u0E23\u0E30\u0E14\u0E32\u0E19\u0E1C\u0E39\u0E49\u0E19\u0E33\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E2D\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E40\u0E1B\u0E34\u0E14\u0E23\u0E30\u0E1A\u0E1A\u0E01\u0E32\u0E23\u0E41\u0E02\u0E48\u0E07\u0E02\u0E31\u0E19\u0E01\u0E48\u0E2D\u0E19"), /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    className: "gold-btn mobile-btn mt-6 rounded-xl px-5 py-3 font-bold"
  }, "\u0E01\u0E25\u0E31\u0E1A\u0E2A\u0E39\u0E48\u0E41\u0E14\u0E0A\u0E1A\u0E2D\u0E23\u0E4C\u0E14")));
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
        const [,, hydratedUser] = await Promise.all([settleWithin(window.SystemSettings?.init?.().catch(error => {
          console.warn("[app] settings init failed", error);
          return null;
        }) || Promise.resolve(null), 2000, null), settleWithin(Progress.init().catch(error => {
          console.warn("[app] progress init failed", error);
          return null;
        }), 3500, null), settleWithin(AuthService.hydrateCurrent().catch(error => {
          console.warn("[app] auth hydrate failed", error);
          return null;
        }), 3500, null)]);
        if (!cancelled && hydratedUser) setUser(hydratedUser);
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  if (booting) {
    return renderWithFooter(/*#__PURE__*/React.createElement("div", {
      className: "scholar-shell arena-grid arena-noise min-h-screen flex items-center justify-center p-6"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-center"
    }, /*#__PURE__*/React.createElement("img", {
      src: "logo-system.png",
      alt: "HSK Battle Arena Logo",
      className: "mx-auto mb-6 h-28 w-28 object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.28)]"
    }), /*#__PURE__*/React.createElement("div", {
      className: "loader"
    }), /*#__PURE__*/React.createElement("div", {
      className: "font-display text-2xl font-bold text-[var(--arena-paper)]"
    }, "Synchronizing Hanzi Academy..."), /*#__PURE__*/React.createElement("div", {
      className: "mt-2 text-sm text-[#6d5149]"
    }, "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E19\u0E31\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19 \u0E1C\u0E25\u0E2A\u0E2D\u0E1A \u0E23\u0E32\u0E07\u0E27\u0E31\u0E25 \u0E41\u0E25\u0E30\u0E01\u0E32\u0E23\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19"))));
  }
  const refresh = () => {
    const u = AuthService.current();
    if (u) setUser({
      ...u
    });
    setRefreshKey(k => k + 1);
  };
  if (!user) {
    return renderWithFooter(/*#__PURE__*/React.createElement(AuthScreen, {
      onLogin: u => {
        setUser(u);
        setRoute(u.role === "admin" ? "admin" : "dashboard");
      }
    }));
  }
  const nav = r => {
    U.sfxClick();
    setRoute(r);
  };
  const back = () => {
    setRoute("dashboard");
    refresh();
  };
  const logout = () => {
    AuthService.logout();
    setUser(null);
  };
  const competitionEnabled = (window.SystemSettings?.getGame ? window.SystemSettings.getGame() : window.APP_CONFIG.game).competitionEnabled !== false;
  switch (route) {
    case "training":
      return renderWithFooter(/*#__PURE__*/React.createElement(DailyTraining, {
        key: refreshKey,
        user: user,
        onBack: back
      }));
    case "test":
      return renderWithFooter(competitionEnabled ? /*#__PURE__*/React.createElement(WeeklyTest, {
        user: user,
        onBack: back,
        onComplete: back
      }) : /*#__PURE__*/React.createElement(CompetitionClosedScreen, {
        onBack: back
      }));
    case "leaderboard":
      return renderWithFooter(competitionEnabled ? /*#__PURE__*/React.createElement(Leaderboard, {
        user: user,
        onBack: back
      }) : /*#__PURE__*/React.createElement(CompetitionClosedScreen, {
        onBack: back
      }));
    case "shop":
      return renderWithFooter(/*#__PURE__*/React.createElement(Shop, {
        user: user,
        onBack: back,
        refresh: refresh
      }));
    case "profile":
      return renderWithFooter(/*#__PURE__*/React.createElement(Profile, {
        user: user,
        onBack: back
      }));
    case "rewards":
      return renderWithFooter(/*#__PURE__*/React.createElement(MyRewards, {
        user: user,
        onBack: back
      }));
    case "admin":
      return renderWithFooter(user.role === "admin" ? /*#__PURE__*/React.createElement(AdminPanel, {
        user: user,
        onBack: back
      }) : /*#__PURE__*/React.createElement("div", {
        className: "p-10 text-center"
      }, "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E40\u0E02\u0E49\u0E32\u0E16\u0E36\u0E07"));
    default:
      return renderWithFooter(/*#__PURE__*/React.createElement(StudentDashboard, {
        key: refreshKey,
        user: user,
        onNav: nav,
        onLogout: logout
      }));
  }
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
console.log("[app] mounted");