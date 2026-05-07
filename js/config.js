/* ===========================================================
 * HSK Vocab Battle Arena – Configuration
 * แก้ไขค่าเหล่านี้ก่อนใช้งานจริง
 * =========================================================== */

window.APP_CONFIG = {
  appName: "HSK Vocabulary Battle Arena",
  version: "3.1.0",

  // ===== Firebase =====
  firebase: {
    apiKey: "AIzaSyDjcHa8QzgJV82_QPpe-0HsNoeOgHh--Xw",
  authDomain: "chinese-class-f8f49.firebaseapp.com",
  projectId: "chinese-class-f8f49",
  storageBucket: "chinese-class-f8f49.firebasestorage.app",
  messagingSenderId: "338344525193",
  appId: "1:338344525193:web:efea681fd9e8b3b974b558"
},

  // ===== Google Sheets (เก็บ master data) =====
  // ทำ Apps Script Web App เปิดเป็น API หรือใช้ Sheets API ตรง
  googleSheets: {
    spreadsheetId: "1V2H5gIZIDqVC_KBlw99q-Pl6jNK18p5vuTqsJsBvgLo",
    apiEndpoint: "https://script.google.com/macros/s/AKfycbzx5tUoQ4YgEo1L8PyFwh36SN2or-ABLLAkxeHWQ6tV9T6fXQwp5lDPth-Mdu5iRyOZ/exec",
    apiKey: "Kong0861573117",
    liveMirror: false,
    sheets: {
      vocab:       "Vocabulary",
      members:     "Members",
      scores:      "TestScores",
      training:    "DailyTraining",
      rewards:     "Rewards",
      seasons:     "Seasons",
      transactions:"CoinTransactions",
      systemSettings:"SystemSettings"
    }
  },

  // ===== Google Drive (เก็บรูปคำศัพท์) =====
  googleDrive: {
    folderId: "11zyPPfcSyI91XttzPe5I6CHBoaPEGk1y"
  },

  // ===== Game Rules =====
  game: {
    competitionEnabled: true,
    wordsPerDay: 5,
    daysPerWeek: 5,            // จ-ศ
    questionsPerTest: 10,
    testDayOfWeek: 1,          // 1 = วันจันทร์
    seasonRounds: 10,          // 10 ครั้ง = 1 ซีซัน
    timePerQuestion: 30,       // วินาที
    speedBonusThreshold: 10,   // ตอบในเวลา ≤ 10 วินาที = โบนัส
    speedBonusPoints: 5,
    correctPoints: 10,
    streakMultiplier: 1.5,     // ตอบถูกติดกัน 3 ข้อ → x1.5
    xpPerCorrect: 20,
    xpPerTrainingComplete: 50,
    trainingCompleteCoins: 10,
    coinsPerCorrect: 2,
    coinsPerPerfectTest: 50
  },

  // ===== ระดับชั้น =====
  classes: ["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"],

  // ===== Admin =====
  admin: {
    // 5-digit student IDs ที่เป็น admin
    studentIds: ["00000", "00001", "00002"],
    bootstrapAccount: {
      username: "admin",
      studentId: "00000",
      password: "admin290936",
      fullname: "System Administrator",
      email: "admin@hsk-arena.local",
      classroom: "Admin",
      classNumber: "-",
      role: "admin"
    }
  }
};

console.log("[HSK Battle Arena] Config loaded v" + window.APP_CONFIG.version);
