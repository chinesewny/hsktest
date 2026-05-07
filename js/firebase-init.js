/* ===========================================================
 * Firebase Init – auth + firestore (compat SDK)
 * =========================================================== */
(function () {
  if (typeof firebase === "undefined") {
    console.warn("[firebase-init] firebase SDK not loaded – running in OFFLINE mode");
    window.OFFLINE_MODE = true;
    return;
  }
  try {
    firebase.initializeApp(window.APP_CONFIG.firebase);
    window.fbAuth = firebase.auth();
    window.fbDB   = firebase.firestore();
    window.OFFLINE_MODE = false;
    console.log("[firebase-init] ready");
  } catch (e) {
    console.error("[firebase-init] failed:", e);
    window.OFFLINE_MODE = true;
  }
})();
