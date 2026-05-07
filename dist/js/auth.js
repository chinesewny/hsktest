/* ===========================================================
 * Auth – ลงทะเบียน / เข้าสู่ระบบ / ลืมรหัสผ่าน
 * รองรับโหมด offline (ใช้ localStorage)
 * =========================================================== */
const {
  useState,
  useEffect
} = React;

// ===== Helpers =====
const USERS_KEY = "hsk_users_local";
const SESSION_KEY = "hsk_session";
const BOOTSTRAP_ADMIN_HASH = "d0179dc9e084078dacb3ef08f34414b00752c436bc08b48a785c9c9348cea413";
const FIRESTORE_READ_TIMEOUT_MS = 1500;
const FIRESTORE_WRITE_TIMEOUT_MS = 3000;
function loadUsers() {
  return U.ls.get(USERS_KEY, {});
}
function saveUsers(u) {
  U.ls.set(USERS_KEY, u);
}
function isOnlineAuth() {
  return !window.OFFLINE_MODE && !!window.fbAuth;
}
function withTimeout(promise, timeoutMs, label) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error(`${label} timeout`)), timeoutMs))]);
}
function getBootstrapAdminConfig() {
  return window.APP_CONFIG.admin?.bootstrapAccount || null;
}
function getBootstrapAdminProfile() {
  const cfg = getBootstrapAdminConfig();
  if (!cfg) return null;
  return normalizeUser({
    studentId: cfg.studentId || "00000",
    fullname: cfg.fullname || "System Administrator",
    email: cfg.email || "admin@hsk-arena.local",
    classroom: cfg.classroom || "Admin",
    classNumber: cfg.classNumber || "-",
    role: "admin",
    avatar: "👑",
    passHash: BOOTSTRAP_ADMIN_HASH,
    preferredLevel: 1
  });
}
function isBootstrapAdminIdentifier(identifier = "") {
  const cfg = getBootstrapAdminConfig();
  if (!cfg) return false;
  return String(identifier).trim().toLowerCase() === String(cfg.username || "admin").toLowerCase();
}
function normalizeLoginIdentifier(identifier = "") {
  if (isBootstrapAdminIdentifier(identifier)) {
    return getBootstrapAdminProfile()?.studentId || "00000";
  }
  return String(identifier || "").trim();
}
function normalizeUser(user = {}) {
  return {
    studentId: user.studentId || "",
    fullname: user.fullname || "",
    email: user.email || "",
    classroom: user.classroom || "",
    classNumber: user.classNumber || "",
    role: user.role || (window.APP_CONFIG.admin.studentIds.includes(user.studentId) ? "admin" : "student"),
    createdAt: user.createdAt || new Date().toISOString(),
    updatedAt: user.updatedAt || new Date().toISOString(),
    avatar: user.avatar || "🐉",
    coins: user.coins ?? 100,
    xp: user.xp ?? 0,
    streak: user.streak ?? 0,
    lastTrainingDate: user.lastTrainingDate || null,
    preferredLevel: user.preferredLevel || 1,
    items: user.items || {
      fifty: 1,
      time: 1,
      pinyin: 1,
      shield: 0,
      dice: 1,
      double: 0,
      ice: 0
    },
    uid: user.uid || "",
    passHash: user.passHash || ""
  };
}
function saveLocalUser(user) {
  const users = loadUsers();
  users[user.studentId] = {
    ...(users[user.studentId] || {}),
    ...user
  };
  saveUsers(users);
  return users[user.studentId];
}
function saveSession(user) {
  U.ls.set(SESSION_KEY, {
    studentId: user.studentId,
    email: user.email || "",
    uid: user.uid || "",
    ts: Date.now()
  });
}
function ensureBootstrapAdmin() {
  const profile = getBootstrapAdminProfile();
  if (!profile) return null;
  const users = loadUsers();
  const existing = users[profile.studentId] || {};
  users[profile.studentId] = normalizeUser({
    ...profile,
    ...existing,
    studentId: profile.studentId,
    fullname: existing.fullname || profile.fullname,
    email: existing.email || profile.email,
    classroom: existing.classroom || profile.classroom,
    classNumber: existing.classNumber || profile.classNumber,
    role: "admin",
    avatar: existing.avatar || profile.avatar,
    passHash: existing.passHash || profile.passHash
  });
  saveUsers(users);
  return users[profile.studentId];
}
async function fetchMemberByStudentId(studentId) {
  ensureBootstrapAdmin();
  const local = loadUsers()[studentId];
  if (local) return normalizeUser(local);
  if (window.fbDB) {
    try {
      const doc = await withTimeout(window.fbDB.collection("members").doc(studentId).get(), FIRESTORE_READ_TIMEOUT_MS, "firestore read");
      if (doc.exists) return saveLocalUser(normalizeUser(doc.data()));
    } catch (e) {
      console.warn("[auth] firestore offline, falling back", e.message);
    }
  }
  try {
    const rows = await GSheets.read("Members", {
      keyField: "studentId",
      keyValue: studentId,
      limit: 1
    });
    if (rows[0]) return saveLocalUser(normalizeUser(rows[0]));
  } catch (e) {
    console.warn("[auth] sheets read failed", e.message);
  }
  return null;
}
async function fetchMemberByEmail(email) {
  if (!email) return null;
  const local = Object.values(loadUsers()).find(u => u.email === email);
  if (local) return normalizeUser(local);
  if (window.fbDB) {
    try {
      const snap = await withTimeout(window.fbDB.collection("members").where("email", "==", email).limit(1).get(), FIRESTORE_READ_TIMEOUT_MS, "firestore read");
      if (!snap.empty) return saveLocalUser(normalizeUser(snap.docs[0].data()));
    } catch (e) {
      console.warn("[auth] firestore offline, falling back", e.message);
    }
  }
  try {
    const rows = await GSheets.read("Members", {
      keyField: "email",
      keyValue: email,
      limit: 1
    });
    if (rows[0]) return saveLocalUser(normalizeUser(rows[0]));
  } catch (e) {
    console.warn("[auth] sheets read failed", e.message);
  }
  return null;
}
async function persistMemberProfile(user, {
  keyField = "studentId"
} = {}) {
  const normalized = normalizeUser(user);
  saveLocalUser(normalized);
  if (window.fbDB) {
    try {
      await withTimeout(window.fbDB.collection("members").doc(normalized.studentId).set(normalized, {
        merge: true
      }), FIRESTORE_WRITE_TIMEOUT_MS, "firestore write");
    } catch (e) {
      console.warn("[auth] firestore write failed (saved locally)", e.message);
    }
  }
  if (GSheets.shouldMirror()) {
    GSheets.enqueueUpsert("Members", {
      field: keyField,
      value: normalized[keyField]
    }, normalized).catch(() => {});
  }
  return normalized;
}
async function hashPassword(pw) {
  // Simple hash for offline (SHA-256). Production: ใช้ Firebase Auth
  if (window.crypto && window.crypto.subtle) {
    const buf = new TextEncoder().encode(pw);
    const hash = await window.crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
  }
  return btoa(pw);
}
function waitForFirebaseAuth() {
  if (!window.fbAuth) return Promise.resolve(null);
  return new Promise(resolve => {
    const timeoutId = setTimeout(() => resolve(window.fbAuth.currentUser || null), 5000);
    const unsubscribe = window.fbAuth.onAuthStateChanged(firebaseUser => {
      clearTimeout(timeoutId);
      unsubscribe();
      resolve(firebaseUser || null);
    }, () => {
      clearTimeout(timeoutId);
      resolve(null);
    });
  });
}
function PasswordInput({
  value,
  onChange,
  placeholder = "",
  required = false,
  minLength,
  className = ""
}) {
  const [visible, setVisible] = useState(false);
  return /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("input", {
    type: visible ? "text" : "password",
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    required: required,
    minLength: minLength,
    className: `${className} pr-20`
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setVisible(v => !v),
    className: "absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 hover:text-rose-600"
  }, visible ? "ซ่อน" : "แสดง"));
}
function SystemLogo({
  size = "md",
  className = ""
}) {
  const sizeClass = size === "lg" ? "h-28 w-28" : size === "sm" ? "h-16 w-16" : "h-20 w-20";
  return /*#__PURE__*/React.createElement("img", {
    src: "logo-system.png",
    alt: "HSK Battle Arena Logo",
    className: `${sizeClass} object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.22)] ${className}`
  });
}
window.AuthService = {
  async register({
    studentId,
    password,
    fullname,
    email,
    classroom,
    classNumber
  }) {
    ensureBootstrapAdmin();
    if (!/^\d{5}$/.test(studentId)) throw new Error("เลขประจำตัวต้องเป็นตัวเลข 5 หลัก");
    if (!password || password.length < 6) throw new Error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
    if (!email || !email.includes("@")) throw new Error("กรุณากรอกอีเมลให้ถูกต้อง");
    if (!fullname) throw new Error("กรุณากรอกชื่อ-นามสกุล");
    if (!classroom) throw new Error("กรุณาเลือกชั้น");
    const existing = await fetchMemberByStudentId(studentId);
    if (existing) throw new Error("เลขประจำตัวนี้มีอยู่ในระบบแล้ว");
    const passHash = await hashPassword(password);
    let uid = "";
    if (isOnlineAuth()) {
      try {
        const cred = await Promise.race([window.fbAuth.createUserWithEmailAndPassword(email, password), new Promise((_, rej) => setTimeout(() => rej(new Error("firebase timeout")), 3000))]);
        uid = cred.user ? cred.user.uid : "";
      } catch (e) {
        console.warn("[auth] firebase auth offline, registering locally", e.message);
      }
    }
    const user = normalizeUser({
      studentId,
      fullname,
      email,
      classroom,
      classNumber,
      passHash,
      uid
    });
    const saved = await persistMemberProfile(user);
    saveSession(saved);
    return saved;
  },
  async login(studentId, password) {
    ensureBootstrapAdmin();
    const resolvedStudentId = normalizeLoginIdentifier(studentId);
    const u = await fetchMemberByStudentId(resolvedStudentId);
    if (!u) throw new Error("ไม่พบเลขประจำตัวนี้ในระบบ");
    let onlineOk = false;
    if (isOnlineAuth() && u.email) {
      try {
        await Promise.race([window.fbAuth.signInWithEmailAndPassword(u.email, password), new Promise((_, rej) => setTimeout(() => rej(new Error("firebase timeout")), 3000))]);
        onlineOk = true;
      } catch (e) {
        console.warn("[auth] firebase login offline, falling back to local", e.message);
      }
    }
    if (!onlineOk) {
      const passHash = await hashPassword(password);
      if (u.passHash && u.passHash !== passHash) throw new Error("รหัสผ่านไม่ถูกต้อง");
    }
    const saved = saveLocalUser(u);
    saveSession(saved);
    return saved;
  },
  current() {
    ensureBootstrapAdmin();
    const sess = U.ls.get(SESSION_KEY);
    if (!sess) return null;
    const u = loadUsers()[sess.studentId];
    return u || null;
  },
  async hydrateCurrent() {
    ensureBootstrapAdmin();
    const localCurrent = this.current();
    if (localCurrent) return localCurrent;
    const firebaseUser = await waitForFirebaseAuth();
    const email = firebaseUser?.email || window.fbAuth?.currentUser?.email || "";
    if (email) {
      const user = await fetchMemberByEmail(email);
      if (user) {
        const hydrated = normalizeUser({
          ...user,
          uid: user.uid || firebaseUser?.uid || ""
        });
        saveLocalUser(hydrated);
        saveSession(hydrated);
        return hydrated;
      }
    }
    return null;
  },
  logout() {
    U.ls.del(SESSION_KEY);
    if (window.fbAuth) window.fbAuth.signOut().catch(() => {});
  },
  async forgotPassword(studentId, email) {
    const u = await fetchMemberByStudentId(studentId);
    if (!u) throw new Error("ไม่พบเลขประจำตัวในระบบ");
    if (u.email !== email) throw new Error("อีเมลไม่ตรงกับที่ลงทะเบียนไว้");
    if (isOnlineAuth()) {
      await window.fbAuth.sendPasswordResetEmail(email);
      return {
        mode: "email",
        message: "ระบบได้ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลของคุณแล้ว"
      };
    }
    const users = loadUsers();
    if (!users[studentId]) users[studentId] = normalizeUser(u);
    const newPw = "Hsk" + Math.random().toString(36).slice(2, 8);
    users[studentId].passHash = await hashPassword(newPw);
    saveUsers(users);
    return {
      mode: "local",
      message: newPw
    };
  },
  updateUser(studentId, patch) {
    ensureBootstrapAdmin();
    const users = loadUsers();
    if (!users[studentId]) return;
    const updated = normalizeUser({
      ...users[studentId],
      ...patch,
      updatedAt: new Date().toISOString()
    });
    users[studentId] = updated;
    saveUsers(users);
    if (window.fbDB) window.fbDB.collection("members").doc(studentId).set(updated, {
      merge: true
    }).catch(() => {});
    if (GSheets.shouldMirror()) {
      GSheets.enqueueUpsert("Members", {
        field: "studentId",
        value: studentId
      }, updated).catch(() => {});
    }
    return updated;
  },
  allUsers() {
    ensureBootstrapAdmin();
    return Object.values(loadUsers());
  },
  async fetchUsersByIds(studentIds = []) {
    const uniqueIds = Array.from(new Set((studentIds || []).filter(Boolean)));
    if (!uniqueIds.length) return [];
    const localUsers = loadUsers();
    const resultMap = {};
    const missingIds = [];
    uniqueIds.forEach(studentId => {
      if (localUsers[studentId]) resultMap[studentId] = normalizeUser(localUsers[studentId]);else missingIds.push(studentId);
    });
    if (window.fbDB && missingIds.length) {
      await Promise.all(missingIds.map(async studentId => {
        try {
          const doc = await withTimeout(window.fbDB.collection("members").doc(studentId).get(), FIRESTORE_READ_TIMEOUT_MS, "firestore read");
          if (doc.exists) {
            const user = saveLocalUser(normalizeUser(doc.data()));
            resultMap[studentId] = normalizeUser(user);
          }
        } catch (e) {
          console.warn("[auth] fetchUsersByIds firestore failed", e.message);
        }
      }));
    }
    const stillMissing = uniqueIds.filter(studentId => !resultMap[studentId]);
    if (stillMissing.length) {
      await Promise.all(stillMissing.map(async studentId => {
        try {
          const rows = await GSheets.read("Members", {
            keyField: "studentId",
            keyValue: studentId,
            limit: 1
          });
          if (rows[0]) {
            const user = saveLocalUser(normalizeUser(rows[0]));
            resultMap[studentId] = normalizeUser(user);
          }
        } catch (e) {
          console.warn("[auth] fetchUsersByIds sheets failed", e.message);
        }
      }));
    }
    return uniqueIds.map(studentId => resultMap[studentId]).filter(Boolean);
  },
  async fetchAllUsers() {
    ensureBootstrapAdmin();
    const localList = this.allUsers();
    try {
      let remoteUsers = [];
      if (window.fbDB) {
        const snap = await withTimeout(window.fbDB.collection("members").get(), FIRESTORE_READ_TIMEOUT_MS, "firestore read");
        remoteUsers = snap.docs.map(doc => normalizeUser(doc.data()));
      } else {
        const rows = await GSheets.read("Members");
        remoteUsers = rows.map(row => normalizeUser(row));
      }
      remoteUsers.forEach(saveLocalUser);
      return remoteUsers.length ? remoteUsers : localList;
    } catch (e) {
      console.warn("[auth] fetchAllUsers failed", e.message);
      return localList;
    }
  }
};

// ============ Components ============
function AuthCard({
  children
}) {
  const game = window.SystemSettings?.getGame ? window.SystemSettings.getGame() : window.APP_CONFIG.game;
  return /*#__PURE__*/React.createElement("div", {
    className: "scholar-shell arena-shell arena-grid arena-noise min-h-screen flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "arena-orb bg-emerald-300/20 h-40 w-40 left-[10%] top-[12%]"
  }), /*#__PURE__*/React.createElement("div", {
    className: "arena-orb bg-amber-300/20 h-52 w-52 right-[8%] top-[18%]",
    style: {
      animationDelay: "1.3s"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "arena-orb bg-rose-500/20 h-44 w-44 left-[20%] bottom-[10%]",
    style: {
      animationDelay: "2.1s"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 overflow-hidden pointer-events-none"
  }, [...Array(20)].map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "absolute text-white/5 text-6xl font-bold animate-pulse font-zh",
    style: {
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 3}s`
    }
  }, ["汉", "语", "学", "中", "文", "你", "好", "爱", "学", "习"][i % 10]))), /*#__PURE__*/React.createElement("div", {
    className: "relative z-10 grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_.95fr] items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hidden lg:block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-xl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "arena-badge inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
  }, /*#__PURE__*/React.createElement("span", {
    className: "arena-signal"
  }, "\u25CF"), " Chinese Scholar Arena"), /*#__PURE__*/React.createElement("h1", {
    className: "font-display mt-5 text-5xl font-bold leading-none text-[var(--arena-cream)]"
  }, "HSK Vocabulary", /*#__PURE__*/React.createElement("span", {
    className: "block text-[var(--arena-gold)]"
  }, "Hanzi Academy 3.1")), /*#__PURE__*/React.createElement("p", {
    className: "mt-5 text-lg text-[#5f4a43]"
  }, "\u0E1D\u0E36\u0E01\u0E04\u0E33\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E23\u0E32\u0E22\u0E27\u0E31\u0E19 \u0E17\u0E1A\u0E17\u0E27\u0E19 4 \u0E17\u0E31\u0E01\u0E29\u0E30 \u0E41\u0E25\u0E30\u0E2A\u0E30\u0E2A\u0E21\u0E04\u0E30\u0E41\u0E19\u0E19\u0E01\u0E32\u0E23\u0E41\u0E02\u0E48\u0E07\u0E02\u0E31\u0E19\u0E43\u0E19\u0E1A\u0E23\u0E23\u0E22\u0E32\u0E01\u0E32\u0E28\u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E20\u0E32\u0E29\u0E32\u0E08\u0E35\u0E19\u0E17\u0E35\u0E48\u0E14\u0E39\u0E08\u0E23\u0E34\u0E07\u0E08\u0E31\u0E07\u0E41\u0E15\u0E48\u0E22\u0E31\u0E07\u0E2A\u0E19\u0E38\u0E01"), /*#__PURE__*/React.createElement("div", {
    className: "mt-8 grid grid-cols-3 gap-3"
  }, [[`${game.daysPerWeek} วัน`, "รอบฝึก"], [`${game.questionsPerTest} ข้อ`, "รอบสอบ"], [`${game.seasonRounds} ครั้ง`, "ชิงแชมป์"]].map(([n, l]) => /*#__PURE__*/React.createElement("div", {
    key: n,
    className: "arena-panel rounded-2xl p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-display text-3xl font-bold text-[var(--arena-gold)]"
  }, n), /*#__PURE__*/React.createElement("div", {
    className: "mt-1 text-sm text-[#6a544d]"
  }, l)))))), /*#__PURE__*/React.createElement("div", {
    className: "arena-panel relative w-full max-w-md overflow-hidden rounded-[28px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lacquer-panel p-6 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-display text-xs font-bold uppercase tracking-[0.28em] text-[var(--arena-gold-soft)]"
  }, "Student Login Portal"), /*#__PURE__*/React.createElement(SystemLogo, {
    size: "sm",
    className: "mx-auto mt-3"
  }), /*#__PURE__*/React.createElement("h1", {
    className: "font-display text-3xl font-bold text-[var(--arena-paper)]"
  }, "HSK Battle Arena"), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-sm font-medium text-white/80"
  }, "\u0E23\u0E30\u0E1A\u0E1A\u0E1D\u0E36\u0E01\u0E1D\u0E19\u0E04\u0E33\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E20\u0E32\u0E29\u0E32\u0E08\u0E35\u0E19 v3.1"), /*#__PURE__*/React.createElement("p", {
    className: "mt-3 text-xs font-medium text-white/70"
  }, "\u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E20\u0E32\u0E29\u0E32\u0E08\u0E35\u0E19 \u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E27\u0E31\u0E07\u0E19\u0E49\u0E33\u0E40\u0E22\u0E47\u0E19\u0E27\u0E34\u0E17\u0E22\u0E32\u0E04\u0E21")), /*#__PURE__*/React.createElement("div", {
    className: "paper-card p-6"
  }, children))));
}
function LoginForm({
  onSwitch,
  onSuccess
}) {
  const [studentId, setSid] = useState("");
  const [password, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await AuthService.login(studentId, password);
      U.toast("ยินดีต้อนรับ " + u.fullname, "success");
      U.sfxLevelUp();
      onSuccess(u);
    } catch (e) {
      U.toast(e.message, "error");
      U.sfxWrong();
    } finally {
      setLoading(false);
    }
  };
  return /*#__PURE__*/React.createElement("form", {
    onSubmit: submit,
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold text-gray-800 text-center"
  }, "\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-semibold text-gray-700 mb-1"
  }, "\u0E40\u0E25\u0E02\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E15\u0E31\u0E27\u0E19\u0E31\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19 \u0E2B\u0E23\u0E37\u0E2D admin"), /*#__PURE__*/React.createElement("input", {
    className: "w-full bg-white text-slate-900 placeholder:text-slate-400 caret-slate-900 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-500 outline-none text-lg tracking-wider",
    maxLength: "20",
    value: studentId,
    onChange: e => setSid(e.target.value.trimStart()),
    placeholder: "00000 \u0E2B\u0E23\u0E37\u0E2D admin",
    required: true
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-semibold text-gray-700 mb-1"
  }, "\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19"), /*#__PURE__*/React.createElement(PasswordInput, {
    value: password,
    onChange: e => setPw(e.target.value),
    required: true,
    className: "w-full bg-white text-slate-900 placeholder:text-slate-400 caret-slate-900 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-500 outline-none"
  })), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: loading,
    className: "cinnabar-btn mobile-btn w-full rounded-xl py-3 font-bold text-lg transition hover:brightness-105 disabled:opacity-50"
  }, loading ? "กำลังเข้าสู่ระบบ..." : "🚀 เข้าสู่ระบบ"), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-sm"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => onSwitch("register"),
    className: "text-rose-600 hover:underline"
  }, "\u0E2A\u0E21\u0E31\u0E04\u0E23\u0E2A\u0E21\u0E32\u0E0A\u0E34\u0E01\u0E43\u0E2B\u0E21\u0E48"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => onSwitch("forgot"),
    className: "text-gray-600 hover:underline"
  }, "\u0E25\u0E37\u0E21\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19?")));
}
function RegisterForm({
  onSwitch,
  onSuccess
}) {
  const [f, setF] = useState({
    studentId: "",
    password: "",
    confirmPw: "",
    fullname: "",
    email: "",
    classroom: "ม.1",
    classNumber: ""
  });
  const [loading, setLoading] = useState(false);
  const setField = (k, v) => setF(p => ({
    ...p,
    [k]: v
  }));
  const submit = async e => {
    e.preventDefault();
    if (f.password !== f.confirmPw) return U.toast("รหัสผ่านไม่ตรงกัน", "error");
    setLoading(true);
    try {
      const u = await AuthService.register(f);
      U.toast("สมัครสมาชิกสำเร็จ! เริ่มผจญภัยกันเลย", "success");
      U.sfxLevelUp();
      onSuccess(u);
    } catch (e) {
      U.toast(e.message, "error");
      U.sfxWrong();
    } finally {
      setLoading(false);
    }
  };
  return /*#__PURE__*/React.createElement("form", {
    onSubmit: submit,
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold text-gray-800 text-center"
  }, "\u0E2A\u0E21\u0E31\u0E04\u0E23\u0E2A\u0E21\u0E32\u0E0A\u0E34\u0E01\u0E43\u0E2B\u0E21\u0E48"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col-span-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-600 mb-1"
  }, "\u0E40\u0E25\u0E02\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E15\u0E31\u0E27 (5 \u0E2B\u0E25\u0E31\u0E01) *"), /*#__PURE__*/React.createElement("input", {
    className: "w-full bg-white text-slate-900 placeholder:text-slate-400 caret-slate-900 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-rose-500 outline-none",
    maxLength: "5",
    value: f.studentId,
    onChange: e => setField("studentId", e.target.value.replace(/\D/g, "")),
    required: true
  })), /*#__PURE__*/React.createElement("div", {
    className: "col-span-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-600 mb-1"
  }, "\u0E0A\u0E37\u0E48\u0E2D-\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25 *"), /*#__PURE__*/React.createElement("input", {
    className: "w-full bg-white text-slate-900 placeholder:text-slate-400 caret-slate-900 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-rose-500 outline-none",
    value: f.fullname,
    onChange: e => setField("fullname", e.target.value),
    required: true
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-600 mb-1"
  }, "\u0E0A\u0E31\u0E49\u0E19 *"), /*#__PURE__*/React.createElement("select", {
    className: "w-full bg-white text-slate-900 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-rose-500 outline-none",
    value: f.classroom,
    onChange: e => setField("classroom", e.target.value)
  }, window.APP_CONFIG.classes.map(c => /*#__PURE__*/React.createElement("option", {
    key: c,
    value: c
  }, c)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-600 mb-1"
  }, "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48"), /*#__PURE__*/React.createElement("input", {
    className: "w-full bg-white text-slate-900 placeholder:text-slate-400 caret-slate-900 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-rose-500 outline-none",
    value: f.classNumber,
    onChange: e => setField("classNumber", e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    className: "col-span-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-600 mb-1"
  }, "\u0E2D\u0E35\u0E40\u0E21\u0E25 (\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E25\u0E37\u0E21\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19) *"), /*#__PURE__*/React.createElement("input", {
    type: "email",
    className: "w-full bg-white text-slate-900 placeholder:text-slate-400 caret-slate-900 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-rose-500 outline-none",
    value: f.email,
    onChange: e => setField("email", e.target.value),
    required: true
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-600 mb-1"
  }, "\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19 *"), /*#__PURE__*/React.createElement(PasswordInput, {
    value: f.password,
    onChange: e => setField("password", e.target.value),
    required: true,
    minLength: 6,
    className: "w-full bg-white text-slate-900 placeholder:text-slate-400 caret-slate-900 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-rose-500 outline-none"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-semibold text-gray-600 mb-1"
  }, "\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19 *"), /*#__PURE__*/React.createElement(PasswordInput, {
    value: f.confirmPw,
    onChange: e => setField("confirmPw", e.target.value),
    required: true,
    className: "w-full bg-white text-slate-900 placeholder:text-slate-400 caret-slate-900 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-rose-500 outline-none"
  }))), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: loading,
    className: "jade-btn mobile-btn w-full rounded-xl py-3 font-bold text-lg transition hover:brightness-105 disabled:opacity-50"
  }, loading ? "กำลังสมัคร..." : "✨ สมัครสมาชิก"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => onSwitch("login"),
    className: "w-full text-center text-rose-600 hover:underline text-sm"
  }, "\u0E21\u0E35\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E41\u0E25\u0E49\u0E27? \u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A"));
}
function ForgotForm({
  onSwitch
}) {
  const [studentId, setSid] = useState("");
  const [email, setEmail] = useState("");
  const [resetResult, setResetResult] = useState(null);
  const submit = async e => {
    e.preventDefault();
    try {
      const result = await AuthService.forgotPassword(studentId, email);
      setResetResult(result);
      U.toast("รีเซ็ตรหัสผ่านสำเร็จ", "success");
    } catch (e) {
      U.toast(e.message, "error");
    }
  };
  if (resetResult) return /*#__PURE__*/React.createElement("div", {
    className: "text-center space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-4xl"
  }, "\uD83D\uDD11"), /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-gray-800"
  }, resetResult.mode === "email" ? "ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว" : "รหัสผ่านใหม่ของคุณ"), resetResult.mode === "local" && /*#__PURE__*/React.createElement("div", {
    className: "bg-amber-50 border-2 border-amber-300 rounded-xl p-4"
  }, /*#__PURE__*/React.createElement("code", {
    className: "text-2xl font-mono font-bold text-amber-700"
  }, resetResult.message)), resetResult.mode === "email" && /*#__PURE__*/React.createElement("div", {
    className: "bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 text-sm text-emerald-800"
  }, resetResult.message), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, resetResult.mode === "email" ? "กรุณาเปิดอีเมลเพื่อกำหนดรหัสผ่านใหม่" : "กรุณาเปลี่ยนรหัสผ่านหลังเข้าสู่ระบบ"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onSwitch("login"),
    className: "cinnabar-btn mobile-btn w-full rounded-xl py-3 font-bold"
  }, "\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A"));
  return /*#__PURE__*/React.createElement("form", {
    onSubmit: submit,
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold text-gray-800 text-center"
  }, "\u0E25\u0E37\u0E21\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600 text-center"
  }, "\u0E01\u0E23\u0E2D\u0E01\u0E40\u0E25\u0E02\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E15\u0E31\u0E27\u0E41\u0E25\u0E30\u0E2D\u0E35\u0E40\u0E21\u0E25\u0E17\u0E35\u0E48\u0E25\u0E07\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E44\u0E27\u0E49"), /*#__PURE__*/React.createElement("input", {
    className: "w-full bg-white text-slate-900 placeholder:text-slate-400 caret-slate-900 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-500 outline-none",
    maxLength: "5",
    value: studentId,
    onChange: e => setSid(e.target.value.replace(/\D/g, "")),
    placeholder: "\u0E40\u0E25\u0E02\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E15\u0E31\u0E27\u0E19\u0E31\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19",
    required: true
  }), /*#__PURE__*/React.createElement("input", {
    type: "email",
    className: "w-full bg-white text-slate-900 placeholder:text-slate-400 caret-slate-900 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-500 outline-none",
    value: email,
    onChange: e => setEmail(e.target.value),
    placeholder: "\u0E2D\u0E35\u0E40\u0E21\u0E25",
    required: true
  }), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "cinnabar-btn mobile-btn w-full rounded-xl py-3 font-bold"
  }, "\u0E23\u0E35\u0E40\u0E0B\u0E47\u0E15\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => onSwitch("login"),
    className: "w-full text-center text-gray-600 hover:underline text-sm"
  }, "\u0E01\u0E25\u0E31\u0E1A\u0E44\u0E1B\u0E2B\u0E19\u0E49\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A"));
}
window.AuthScreen = function AuthScreen({
  onLogin
}) {
  const [mode, setMode] = useState("login");
  return /*#__PURE__*/React.createElement(AuthCard, null, mode === "login" && /*#__PURE__*/React.createElement(LoginForm, {
    onSwitch: setMode,
    onSuccess: onLogin
  }), mode === "register" && /*#__PURE__*/React.createElement(RegisterForm, {
    onSwitch: setMode,
    onSuccess: onLogin
  }), mode === "forgot" && /*#__PURE__*/React.createElement(ForgotForm, {
    onSwitch: setMode
  }));
};