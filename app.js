import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, addDoc, query, where, getDocs, onSnapshot,
  serverTimestamp, arrayUnion, Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { questions } from "./questions.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const WEATHER_API_KEY = "6cb4ed33606386df572e12ae5e9c7e5c";

const $ = (id) => document.getElementById(id);

let currentUser = null;
let currentCoupleId = null;
let currentCouple = null;
let unsubCouple = null;
let unsubAnswers = null;
let todayAnswers = [];
let authMode = "login";
let partnerProfile = null;
let myProfile = null;
let todayMoods = {};
let unsubMood = null;
let moodNoteTimer = null;
let loveTestState = null;
let myLoveLang = null;
let partnerLoveLang = null;
let unsubLoveLang = null;
let quizState = null;
let quizData = {};
let unsubQuiz = null;
let conversations = [];
let unsubConversations = null;
let agreements = [];
let unsubAgreements = null;
let customTopics = [];
let unsubCustomTopics = null;
let currentConversationId = null;
let selectedTopic = null;
let currentView = "today";
let truthState = { level: null, round: 0, history: [] };

let lastSeenPartnerAnswerDay = null;
let answersListenerInitialized = false;

let cachedDay = null;
let cachedDayTime = 0;

let moodWatcherDay = null;
let dayWatcherInterval = null;

/* ---------- ВИБРАЦИЯ ---------- */
function vibrate(pattern) {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  try { navigator.vibrate(pattern); } catch (e) {}
}

/* ---------- ПУСТЫЕ СОСТОЯНИЯ ---------- */
function emptyStateHtml({ icon, title, text }) {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <div class="empty-state-title">${title}</div>
      <div class="empty-state-text">${text}</div>
    </div>
  `;
}
const ICONS = {
  chat: `<svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
  agreement: `<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>`,
  book: `<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
};

/* ---------- ТЕМА ---------- */
function initTheme() {
  const saved = localStorage.getItem("theme");
  const icon = $("theme-icon");
  const label = $("theme-label");
  if (saved === "dark") {
    document.body.classList.add("dark");
    if (icon) icon.textContent = "☀️";
    if (label) label.textContent = "Светлая тема";
  } else {
    if (icon) icon.textContent = "🌙";
    if (label) label.textContent = "Тёмная тема";
  }
  $("theme-btn").onclick = () => { vibrate(10); toggleTheme(); };
}
function toggleTheme() {
  const isDark = document.body.classList.toggle("dark");
  const icon = $("theme-icon");
  const label = $("theme-label");
  if (icon) icon.textContent = isDark ? "☀️" : "🌙";
  if (label) label.textContent = isDark ? "Светлая тема" : "Тёмная тема";
  localStorage.setItem("theme", isDark ? "dark" : "light");
}

/* ---------- ЦВЕТОВЫЕ СХЕМЫ ---------- */
function applySavedScheme() {
  const saved = localStorage.getItem("scheme") || "classic";
  applyScheme(saved, false);
}
function applyScheme(name, save) {
  document.body.classList.remove("scheme-autumn", "scheme-spring", "scheme-ocean");
  if (name !== "classic") document.body.classList.add("scheme-" + name);
  if (save !== false) localStorage.setItem("scheme", name);
  document.querySelectorAll(".scheme-option").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.scheme === name);
  });
}
function initSchemeControls() {
  $("scheme-btn").onclick = () => { vibrate(10); $("scheme-modal").classList.remove("hidden"); };
  $("scheme-backdrop").onclick = () => $("scheme-modal").classList.add("hidden");
  $("close-scheme").onclick = () => $("scheme-modal").classList.add("hidden");
  document.querySelectorAll(".scheme-option").forEach(btn => {
    btn.onclick = () => {
      vibrate(15);
      applyScheme(btn.dataset.scheme);
      setTimeout(() => $("scheme-modal").classList.add("hidden"), 200);
    };
  });
}

/* ---------- ЭКРАНЫ ---------- */
const screens = {
  loading: $("loading"), auth: $("auth-screen"), setup: $("setup-screen"),
  waiting: $("waiting-screen"), main: $("main-screen")
};
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
}
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}
function plural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
function pluralDays(n) {
  return plural(n, "день", "дня", "дней");
}

/* ---------- TOAST ---------- */
function showToast(title, body) {
  const toast = document.createElement("div");
  toast.className = "app-toast";
  toast.innerHTML = `
    <div class="app-toast-title">${escapeHtml(title)}</div>
    <div class="app-toast-body">${escapeHtml(body || "")}</div>
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));

  toast.onclick = () => {
    toast.remove();
    if (typeof switchNav === "function") switchNav("today");
  };

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 5000);
}

/* ---------- AUTH ---------- */
$("tab-login").onclick = () => setAuthMode("login");
$("tab-register").onclick = () => setAuthMode("register");
function setAuthMode(mode) {
  authMode = mode;
  $("tab-login").classList.toggle("active", mode === "login");
  $("tab-register").classList.toggle("active", mode === "register");
  $("auth-submit").textContent = mode === "login" ? "Войти" : "Создать аккаунт";
}
$("auth-form").onsubmit = async (e) => {
  e.preventDefault();
  const email = $("email").value.trim();
  const password = $("password").value;
  $("auth-error").textContent = "";
  try {
    if (authMode === "login") {
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      await createUserWithEmailAndPassword(auth, email, password);
    }
  } catch (err) {
    $("auth-error").textContent = translateError(err.code);
  }
};
function translateError(code) {
  const map = {
    "auth/invalid-email": "Неверный email",
    "auth/user-not-found": "Пользователь не найден",
    "auth/wrong-password": "Неверный пароль",
    "auth/invalid-credential": "Неверный email или пароль",
    "auth/email-already-in-use": "Этот email уже зарегистрирован",
    "auth/weak-password": "Пароль должен быть не короче 6 символов",
  };
  return map[code] || "Ошибка: " + code;
}
["logout-btn", "logout-btn-setup", "logout-btn-waiting"].forEach(id => {
  $(id).onclick = () => signOut(auth);
});

/* ---------- STATE ---------- */
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!user) {
    if (dayWatcherInterval) { clearInterval(dayWatcherInterval); dayWatcherInterval = null; }
    showScreen("auth");
    return;
  }
  await loadCouple();
});

async function loadCouple() {
  const q = query(collection(db, "couples"), where("members", "array-contains", currentUser.uid));
  const snap = await getDocs(q);
  if (snap.empty) { showScreen("setup"); return; }
  const docSnap = snap.docs[0];
  currentCoupleId = docSnap.id;
  currentCouple = docSnap.data();
  cachedDay = null;
  moodWatcherDay = null;
  if (currentCouple.members.length < 2) {
    $("invite-code-display").textContent = currentCouple.inviteCode;
    showScreen("waiting");
    listenForPartner();
  } else {
    if (unsubCouple) unsubCouple();
    startMainApp();
  }
}
function listenForPartner() {
  if (unsubCouple) unsubCouple();
  unsubCouple = onSnapshot(doc(db, "couples", currentCoupleId), (snap) => {
    if (snap.data().members.length >= 2) { unsubCouple(); loadCouple(); }
  });
}

/* ---------- SETUP COUPLE ---------- */
$("create-couple").onclick = async () => {
  const inviteCode = generateCode();
  const coupleRef = doc(collection(db, "couples"));
  await setDoc(coupleRef, {
    members: [currentUser.uid],
    inviteCode,
    startDate: Timestamp.now(),
    createdAt: serverTimestamp()
  });
  await setDoc(doc(db, "inviteCodes", inviteCode), { coupleId: coupleRef.id });
  loadCouple();
};
$("join-couple").onclick = async () => {
  const code = $("invite-code").value.trim().toUpperCase();
  $("setup-error").textContent = "";
  if (code.length !== 6) { $("setup-error").textContent = "Код должен быть 6 символов"; return; }
  const codeSnap = await getDoc(doc(db, "inviteCodes", code));
  if (!codeSnap.exists()) { $("setup-error").textContent = "Пара с таким кодом не найдена"; return; }
  const coupleId = codeSnap.data().coupleId;
  const coupleRef = doc(db, "couples", coupleId);
  const coupleSnap = await getDoc(coupleRef);
  const data = coupleSnap.data();
  if (data.members.includes(currentUser.uid)) { loadCouple(); return; }
  if (data.members.length >= 2) { $("setup-error").textContent = "В этой паре уже два человека"; return; }
  await updateDoc(coupleRef, { members: arrayUnion(currentUser.uid) });
  await deleteDoc(doc(db, "inviteCodes", code));
  loadCouple();
};
function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/* ---------- НИЖНЯЯ НАВИГАЦИЯ ---------- */
const VIEW_ORDER = ["today", "conversation", "about", "archive"];

function initBottomNav() {
  document.querySelectorAll(".bottom-nav-item").forEach(btn => {
    btn.onclick = () => { vibrate(10); switchNav(btn.dataset.view); };
  });
}
function switchNav(view) {
  if (view === currentView) return;
  const oldIndex = VIEW_ORDER.indexOf(currentView);
  const newIndex = VIEW_ORDER.indexOf(view);
  const direction = newIndex > oldIndex ? "right" : "left";

  currentView = view;
  document.querySelectorAll(".bottom-nav-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
  $("today-view").classList.toggle("hidden", view !== "today");
  $("conversation-view").classList.toggle("hidden", view !== "conversation");
  $("about-view").classList.toggle("hidden", view !== "about");
  $("archive-view").classList.toggle("hidden", view !== "archive");

  const activeSection = $(
    view === "today" ? "today-view" :
    view === "conversation" ? "conversation-view" :
    view === "about" ? "about-view" : "archive-view"
  );
  if (activeSection) {
    activeSection.classList.remove("view-enter-right", "view-enter-left");
    void activeSection.offsetWidth;
    activeSection.classList.add(direction === "right" ? "view-enter-right" : "view-enter-left");
  }

  if (view === "conversation") renderConversations();
  if (view === "about") renderAboutSubTab();
  if (view === "archive") {
    renderStats();
    renderHeatmap();
    renderMoodHistory();
    renderHistory();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- ПОД-ТАБЫ «Мы» ---------- */
let currentAboutSubTab = "quiz";
function initAboutSubTabs() {
  $("sub-quiz").onclick = () => { vibrate(10); setAboutSubTab("quiz"); };
  $("sub-lovelang").onclick = () => { vibrate(10); setAboutSubTab("lovelang"); };
  $("sub-truth").onclick = () => { vibrate(10); setAboutSubTab("truth"); };
}
function setAboutSubTab(tab) {
  currentAboutSubTab = tab;
  $("sub-quiz").classList.toggle("active", tab === "quiz");
  $("sub-lovelang").classList.toggle("active", tab === "lovelang");
  $("sub-truth").classList.toggle("active", tab === "truth");
  $("about-quiz").classList.toggle("hidden", tab !== "quiz");
  $("about-lovelang").classList.toggle("hidden", tab !== "lovelang");
  $("about-truth").classList.toggle("hidden", tab !== "truth");
}
function renderAboutSubTab() {
  setAboutSubTab(currentAboutSubTab);
  if (currentAboutSubTab === "quiz") renderQuizMain();
}

/* ---------- MAIN APP ---------- */
function startMainApp() {
  showScreen("main");
  renderToday();
  applySeasonTheme();

  renderMoonWidget();
  if (localStorage.getItem("moon-visible") === "0") hideMoonBlocks();

  initWeather();
  listenForAnswers();
  initProfile();
  initNotifications();
  initMood();
  initReactions();
  initLoveLang();
  initQuiz();
  initAboutSubTabs();
  initTruthOrDare();
  initConversations();
  initAgreements();
  initCustomTopics();
  initPDFExport();
  initRetro();
  initDayView();
  initSchemeControls();
  initBottomNav();

  startDayWatcher();
}

/* ---------- ПОДСЧЁТ ДНЯ ---------- */
function getCurrentDay() {
  const now = Date.now();
  if (cachedDay !== null && now - cachedDayTime < 60000) return cachedDay;

  if (!currentCouple?.startDate) {
    cachedDay = 1;
    cachedDayTime = now;
    return 1;
  }

  const start = currentCouple.startDate.toDate
    ? currentCouple.startDate.toDate()
    : new Date(currentCouple.startDate);

  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const today = new Date();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const days = Math.round((todayDay - startDay) / 86400000);
  cachedDay = Math.min(Math.max(days + 1, 1), 365);
  cachedDayTime = now;
  return cachedDay;
}
function getQuestionForDay(day) { return questions.find(q => q.day === day); }

/* ---------- НАБЛЮДАТЕЛЬ ЗА СМЕНОЙ ДНЯ ---------- */
function startDayWatcher() {
  if (dayWatcherInterval) clearInterval(dayWatcherInterval);
  moodWatcherDay = getCurrentDay();
  dayWatcherInterval = setInterval(() => {
    if (!currentCoupleId || !currentUser) return;
    const day = getCurrentDay();
    if (moodWatcherDay !== day) {
      moodWatcherDay = day;
      listenForMood();
      renderToday();
      todayAnswers = [];
      updateTodayView();
    }
  }, 60000);
}

async function renderToday() {
  const day = getCurrentDay();

  if (lastSeenPartnerAnswerDay !== null && lastSeenPartnerAnswerDay !== day) {
    lastSeenPartnerAnswerDay = null;
  }

  const q = getQuestionForDay(day);
  if (!q) return;

  $("current-day").textContent = day;
  const headerDayNum = $("header-day-num");
  if (headerDayNum) headerDayNum.textContent = day;
  const headerDayLabel = $("header-day-label");
  if (headerDayLabel) headerDayLabel.textContent = pluralDays(day) + " вместе";

  $("current-theme").textContent = q.theme;
  $("current-question").textContent = q.text;
  const percent = Math.round((day / 365) * 100);
  const pb = $("progress-bar");
  if (pb) pb.style.width = percent + "%";
  const pl = $("progress-label");
  if (pl) pl.textContent = "Пройдено " + percent + "%";
}

function listenForAnswers() {
  if (unsubAnswers) unsubAnswers();
  answersListenerInitialized = false;

  unsubAnswers = onSnapshot(
    collection(db, "couples", currentCoupleId, "answers"),
    (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const day = getCurrentDay();

      const prevPartnerAnswer = todayAnswers.find(a => a.userId !== currentUser.uid);
      const hadPartnerAnswerBefore = !!prevPartnerAnswer;

      todayAnswers = all.filter(a => a.day === day);
      updateTodayView();
      updateStreak(all);
      updateBadges();

      const partnerAnswerNow = todayAnswers.find(a => a.userId !== currentUser.uid);
      const myAnswerNow = todayAnswers.find(a => a.userId === currentUser.uid);

      if (!answersListenerInitialized) {
        answersListenerInitialized = true;
        if (partnerAnswerNow) lastSeenPartnerAnswerDay = day;
        return;
      }

      if (
        partnerAnswerNow &&
        !hadPartnerAnswerBefore &&
        lastSeenPartnerAnswerDay !== day &&
        myAnswerNow
      ) {
        lastSeenPartnerAnswerDay = day;
        notifyPartnerAnswered(partnerAnswerNow);
      }
    }
  );
}

function notifyPartnerAnswered(partnerAnswer) {
  vibrate([30, 60, 30, 60, 30]);
  showToast("❤️ Партнёр ответил!", "Откройте «Сегодня», чтобы прочитать.");

  const partnerSection = document.querySelector(".partner-section");
  if (partnerSection) {
    partnerSection.classList.add("pulse-highlight");
    setTimeout(() => partnerSection.classList.remove("pulse-highlight"), 3000);
  }

  if (
    typeof Notification !== "undefined" &&
    Notification.permission === "granted" &&
    document.visibilityState === "hidden"
  ) {
    try {
      new Notification("❤️ Партнёр ответил!", {
        body: "Откройте «Наш год», чтобы прочитать.",
        icon: "./icon-192.png",
        tag: "partner-answered"
      });
    } catch (e) {}
  }
}

function updateStreak(allAnswers) {
  const byDay = {};
  allAnswers.forEach(a => {
    if (!byDay[a.day]) byDay[a.day] = new Set();
    byDay[a.day].add(a.userId);
  });
  const day = getCurrentDay();
  let start = day;
  if (!(byDay[day] && byDay[day].size >= 2)) start = day - 1;
  let streak = 0;
  for (let d = start; d >= 1; d--) {
    if (byDay[d] && byDay[d].size >= 2) streak++;
    else break;
  }
  const el = $("streak-count");
  if (el) el.textContent = streak;
}
function checkConfetti() {
  const myAnswer = todayAnswers.find(a => a.userId === currentUser.uid);
  const partnerAnswer = todayAnswers.find(a => a.userId !== currentUser.uid);
  if (!myAnswer || !partnerAnswer) return;
  const day = getCurrentDay();
  const key = "confetti-day-" + day;
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, "1");
  setTimeout(() => { fireConfetti(); vibrate([30, 60, 30, 60, 30]); }, 300);
}
function fireConfetti() {
  if (typeof confetti !== "function") return;
  const colors = ["#b25a5a", "#8b3a3a", "#f5d9d3", "#fdf6f0", "#d48383"];
  confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors });
  setTimeout(() => {
    confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 }, colors });
  }, 200);
}
function updateTodayView() {
  const myAnswer = todayAnswers.find(a => a.userId === currentUser.uid);
  const partnerAnswer = todayAnswers.find(a => a.userId !== currentUser.uid);
  const myTa = $("my-answer");
  if (myTa) myTa.value = myAnswer ? (myAnswer.text || "") : "";
  const sa = $("save-answer");
  if (sa) sa.textContent = myAnswer ? "Обновить ответ" : "Сохранить ответ";
  const partnerEl = $("partner-answer");
  const statusEl = $("answer-status");
  if (partnerEl && statusEl) {
    if (myAnswer && partnerAnswer) {
      partnerEl.textContent = partnerAnswer.text || "(без текста)";
      statusEl.textContent = "✓ Оба ответили — ответы открыты!";
      statusEl.style.color = "#4a8b4a";
    } else if (myAnswer && !partnerAnswer) {
      partnerEl.textContent = "Партнёр ещё не ответил. Ответ появится, когда он(а) напишет.";
      statusEl.textContent = "Ваш ответ сохранён. Ждём партнёра...";
      statusEl.style.color = "#999";
    } else if (!myAnswer && partnerAnswer) {
      partnerEl.textContent = "Сначала напишите свой ответ, чтобы увидеть ответ партнёра.";
      statusEl.textContent = "";
    } else {
      partnerEl.textContent = "Пока скрыт.";
      statusEl.textContent = "";
    }
  }
  renderReactions();
  checkConfetti();
}
$("save-answer").onclick = async () => {
  const text = $("my-answer").value.trim();
  if (!text) return;
  const day = getCurrentDay();
  const existing = todayAnswers.find(a => a.userId === currentUser.uid);
  $("save-answer").disabled = true;
  try {
    if (existing) {
      await updateDoc(doc(db, "couples", currentCoupleId, "answers", existing.id), {
        text, updatedAt: serverTimestamp()
      });
    } else {
      await addDoc(collection(db, "couples", currentCoupleId, "answers"), {
        day, userId: currentUser.uid, text, createdAt: serverTimestamp()
      });
    }
    vibrate(15);
  } catch (e) {
    console.error(e);
    alert("Ошибка сохранения: " + e.message);
  } finally {
    $("save-answer").disabled = false;
  }
};

/* ---------- БЕЙДЖИ ---------- */
function setBadge(id, count) {
  const el = $(id);
  if (!el) return;
  if (count > 0) {
    el.textContent = count > 9 ? "9+" : count;
    el.classList.remove("hidden");
  } else {
    el.classList.add("hidden");
  }
}
function updateBadges() {
  const partnerUid = currentCouple?.members?.find(uid => uid !== currentUser.uid);
  let convNew = 0;
  conversations.forEach(conv => {
    const texts = conv.texts || {};
    if (texts[partnerUid] && !texts[currentUser.uid]) convNew++;
  });
  setBadge("badge-conversation", convNew);
  let aboutNew = 0;
  if (partnerUid) {
    const partnerQuiz = quizData[partnerUid];
    const myQuiz = quizData[currentUser.uid];
    if (partnerQuiz?.answers && (!myQuiz?.guesses || myQuiz.guessesFor !== partnerUid)) aboutNew++;
  }
  setBadge("badge-about", aboutNew);
  setBadge("badge-archive", 0);
}
/* ---------- СТАТИСТИКА ---------- */
async function renderStats() {
  try {
    const [answersSnap, moodsSnap] = await Promise.all([
      getDocs(collection(db, "couples", currentCoupleId, "answers")),
      getDocs(collection(db, "couples", currentCoupleId, "moods"))
    ]);

    $("stat-answers").textContent = answersSnap.size;
    const daysTogether = getCurrentDay();
    $("stat-days").textContent = daysTogether;

    const byDay = {};
    answersSnap.docs.forEach(d => {
      const data = d.data();
      if (!byDay[data.day]) byDay[data.day] = new Set();
      byDay[data.day].add(data.userId);
    });
    let activeDays = 0;
    for (let d = 1; d <= daysTogether; d++) {
      if (byDay[d] && byDay[d].size >= 2) activeDays++;
    }
    $("stat-active-days").textContent = activeDays;

    const themeCount = {};
    answersSnap.docs.forEach(d => {
      const day = d.data().day;
      const q = getQuestionForDay(day);
      if (q) themeCount[q.theme] = (themeCount[q.theme] || 0) + 1;
    });
    let favoriteTheme = "—";
    let maxThemeCount = 0;
    for (const k in themeCount) {
      if (themeCount[k] > maxThemeCount) {
        maxThemeCount = themeCount[k];
        favoriteTheme = k;
      }
    }
    const themeEl = $("stat-favorite");
    themeEl.textContent = favoriteTheme;
    themeEl.classList.add("text");

    const moodCount = {};
    moodsSnap.docs.forEach(d => {
      const moods = d.data().moods || {};
      Object.values(moods).forEach(emoji => {
        moodCount[emoji] = (moodCount[emoji] || 0) + 1;
      });
    });
    let favoriteMood = "—";
    let maxMoodCount = 0;
    for (const k in moodCount) {
      if (moodCount[k] > maxMoodCount) {
        maxMoodCount = moodCount[k];
        favoriteMood = k;
      }
    }
    const moodEl = $("stat-mood");
    moodEl.textContent = favoriteMood;
    moodEl.classList.add("text");

    $("stat-agreements").textContent = agreements.length;
  } catch (e) {
    console.error("Stats error:", e);
  }
}

/* ---------- ХИТМАП ГОДА ---------- */
async function renderHeatmap() {
  const container = $("hm-grid");
  const monthsEl = $("hm-months");
  const subtitleEl = $("hm-subtitle");
  const streakEl = $("hm-streak");
  const streakCountEl = $("hm-streak-count");
  const statBoth = $("hm-stat-both");
  const statOne = $("hm-stat-one");
  const statMiss = $("hm-stat-miss");

  if (!container || !currentCouple || !currentUser) return;

  container.innerHTML = "";
  if (monthsEl) monthsEl.innerHTML = "";

  let snap;
  try {
    snap = await getDocs(collection(db, "couples", currentCoupleId, "answers"));
  } catch (e) {
    console.error("Heatmap fetch error:", e);
    return;
  }

  const byDay = {};
  snap.docs.forEach(d => {
    const data = d.data();
    if (!byDay[data.day]) byDay[data.day] = [];
    byDay[data.day].push(data);
  });

  const currentDay = getCurrentDay();
  const startDate = currentCouple.startDate?.toDate?.() || new Date();
  const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

  const jsDay = startDay.getDay();
  const offset = (jsDay + 6) % 7;

  let both = 0, one = 0, miss = 0;
  for (let d = 1; d <= currentDay; d++) {
    const arr = byDay[d] || [];
    const hasMe = arr.some(a => a.userId === currentUser.uid);
    const hasPartner = arr.some(a => a.userId !== currentUser.uid);
    if (hasMe && hasPartner) both++;
    else if (hasMe || hasPartner) one++;
    else miss++;
  }

  if (statBoth) statBoth.textContent = both;
  if (statOne) statOne.textContent = one;
  if (statMiss) statMiss.textContent = miss;

  if (subtitleEl) {
    subtitleEl.textContent = `${currentDay} ${pluralDays(currentDay)} вместе • ${both} ${plural(both, "ответ", "ответа", "ответов")} обоих`;
  }

  let streak = 0;
  for (let d = currentDay; d >= 1; d--) {
    const arr = byDay[d] || [];
    const hasMe = arr.some(a => a.userId === currentUser.uid);
    const hasPartner = arr.some(a => a.userId !== currentUser.uid);
    if (hasMe && hasPartner) streak++;
    else break;
  }
  if (streakCountEl) streakCountEl.textContent = streak;
  if (streakEl) streakEl.classList.toggle("hidden", streak === 0);

  const totalCells = offset + currentDay;
  const totalCols = Math.ceil(totalCells / 7);

  const monthNames = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];
  const monthStart = {};
  for (let d = 0; d < currentDay; d++) {
    const dt = new Date(startDay);
    dt.setDate(dt.getDate() + d);
    const m = dt.getMonth();
    const col = Math.floor((offset + d) / 7);
    if (monthStart[m] === undefined) monthStart[m] = col;
  }

  if (monthsEl) {
    const sorted = Object.entries(monthStart).sort((a, b) => a[1] - b[1]);
    for (let i = 0; i < sorted.length; i++) {
      const [m, startCol] = sorted[i];
      const nextCol = i + 1 < sorted.length ? sorted[i + 1][1] : totalCols;
      const span = Math.max(nextCol - startCol, 1);
      const div = document.createElement("div");
      div.className = "hm-month";
      div.style.width = (span * 14) + "px";
      div.textContent = monthNames[Number(m)];
      monthsEl.appendChild(div);
    }
  }

  for (let col = 0; col < totalCols; col++) {
    for (let row = 0; row < 7; row++) {
      const absIndex = col * 7 + row;
      const cell = document.createElement("div");
      cell.className = "hm-cell";

      if (absIndex < offset) {
        cell.classList.add("future");
      } else {
        const dayIndex = absIndex - offset + 1;
        if (dayIndex > currentDay) {
          cell.classList.add("future");
        } else {
          const arr = byDay[dayIndex] || [];
          const hasMe = arr.some(a => a.userId === currentUser.uid);
          const hasPartner = arr.some(a => a.userId !== currentUser.uid);

          if (hasMe && hasPartner) cell.classList.add("both");
          else if (hasMe || hasPartner) cell.classList.add("one");
          else cell.classList.add("empty");

          cell.title = `День ${dayIndex}`;
          cell.onclick = () => openDayView(dayIndex, arr);
        }
      }
      container.appendChild(cell);
    }
  }
}

/* ---------- ПРОСМОТР ДНЯ ---------- */
function initDayView() {
  const backdrop = $("day-view-backdrop");
  const closeBtn = $("day-view-close");
  if (backdrop) backdrop.onclick = closeDayView;
  if (closeBtn) closeBtn.onclick = closeDayView;
}

function closeDayView() {
  const m = $("day-view-modal");
  if (m) m.classList.add("hidden");
}

function openDayView(day, answers) {
  if (!currentCouple) return;

  const myName = myProfile?.displayName?.trim() || "Вы";
  const partnerName = partnerProfile?.displayName?.trim() || "Партнёр";

  const q = getQuestionForDay(day);
  const startDate = currentCouple.startDate?.toDate?.() || new Date();
  const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const dateOfDay = new Date(startDay);
  dateOfDay.setDate(dateOfDay.getDate() + (day - 1));
  const dateStr = dateOfDay.toLocaleDateString("ru-RU", {
    day: "numeric", month: "long", year: "numeric"
  });

  $("day-view-title").textContent = `День ${day}`;
  $("day-view-date").textContent = dateStr;
  $("day-view-question").textContent = q?.text || "—";
  $("day-view-label-me").textContent = myName;
  $("day-view-label-partner").textContent = partnerName;

  const arr = answers || [];
  const myAnswer = arr.find(a => a.userId === currentUser.uid);
  const partnerAnswer = arr.find(a => a.userId !== currentUser.uid);

  $("day-view-answer-me").textContent = myAnswer ? (myAnswer.text || "") : "";
  $("day-view-answer-partner").textContent = partnerAnswer ? (partnerAnswer.text || "") : "";

  $("day-view-modal").classList.remove("hidden");
  vibrate(10);
}

/* ---------- РЕТРОСПЕКТИВА ---------- */
function initRetro() {
  const btn = $("retro-btn");
  if (!btn) return;
  btn.onclick = openRetro;
  $("retro-backdrop").onclick = closeRetro;
  $("retro-close").onclick = closeRetro;
}
function closeRetro() { $("retro-modal").classList.add("hidden"); }

async function openRetro() {
  const content = $("retro-content");
  content.innerHTML = "<p class='hint'>Собираем ваш год...</p>";
  $("retro-modal").classList.remove("hidden");
  vibrate(15);

  try {
    const [answersSnap, moodsSnap, convSnap, agrSnap] = await Promise.all([
      getDocs(collection(db, "couples", currentCoupleId, "answers")),
      getDocs(collection(db, "couples", currentCoupleId, "moods")),
      getDocs(collection(db, "couples", currentCoupleId, "conversations")),
      getDocs(collection(db, "couples", currentCoupleId, "agreements"))
    ]);

    const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
    const myName = myProfile?.displayName?.trim() || "Вы";
    const partnerName = partnerProfile?.displayName?.trim() || "Партнёр";

    const allAnswers = answersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const totalAnswers = allAnswers.length;
    const bothAnsweredDays = (() => {
      const map = {};
      allAnswers.forEach(a => {
        if (!map[a.day]) map[a.day] = new Set();
        map[a.day].add(a.userId);
      });
      return Object.values(map).filter(s => s.size >= 2).length;
    })();

    const themeCount = {};
    allAnswers.forEach(a => {
      const q = getQuestionForDay(a.day);
      if (q) themeCount[q.theme] = (themeCount[q.theme] || 0) + 1;
    });
    const topThemes = Object.entries(themeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const stopWords = new Set(["и", "в", "во", "не", "что", "он", "на", "я", "с", "со", "как", "а", "то", "все", "она", "так", "его", "но", "да", "ты", "к", "у", "же", "вы", "за", "бы", "по", "только", "ее", "мне", "было", "вот", "от", "меня", "еще", "нет", "о", "из", "ему", "теперь", "когда", "даже", "ну", "вдруг", "ли", "если", "уже", "или", "ни", "быть", "был", "него", "до", "вас", "нибудь", "опять", "уж", "вам", "ведь", "там", "потом", "себя", "ничего", "ей", "может", "они", "тут", "где", "есть", "надо", "ней", "для", "мы", "тебя", "их", "чем", "была", "сам", "чтоб", "без", "будто", "чего", "раз", "тоже", "себе", "под", "будет", "ж", "тогда", "кто", "этот", "того", "потому", "этого", "какой", "совсем", "ним", "здесь", "этом", "один", "почти", "мой", "тем", "чтобы", "нее", "сейчас", "были", "куда", "зачем", "всех", "никогда", "можно", "при", "наконец", "два", "об", "другой", "хоть", "после", "над", "больше", "тот", "через", "эти", "нас", "про", "всего", "них", "какая", "много", "разве", "три", "эту", "моя", "впрочем", "хорошо", "свою", "этой", "перед", "иногда", "лучше", "чуть", "том", "нельзя", "такой", "им", "более", "всегда", "конечно", "всю", "между", "это", "та", "мы", "вы", "они", "я", "бы", "всё", "таки", "тоже", "же", "ли"]);

    const wordCount = {};
    allAnswers.forEach(a => {
      if (!a.text) return;
      const words = a.text.toLowerCase()
        .replace(/[.,!?;:()«»""''—\-–\n\r]/g, " ")
        .split(/\s+/)
        .filter(w => w.length >= 4 && !stopWords.has(w) && !/^\d+$/.test(w));
      words.forEach(w => wordCount[w] = (wordCount[w] || 0) + 1);
    });
    const topWords = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .filter(([, count]) => count >= 3);

    const sortedByLength = allAnswers
      .filter(a => a.text && a.text.length > 80)
      .sort((a, b) => b.text.length - a.text.length)
      .slice(0, 3);

    const moodCount = {};
    moodsSnap.docs.forEach(d => {
      const moods = d.data().moods || {};
      Object.values(moods).forEach(emoji => {
        moodCount[emoji] = (moodCount[emoji] || 0) + 1;
      });
    });
    const topMoods = Object.entries(moodCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const totalConvs = convSnap.size;
    const totalAgr = agrSnap.size;

    let html = "";

    html += `
      <div class="retro-section">
        <div class="retro-section-title">${escapeHtml(myName)} и ${escapeHtml(partnerName)}</div>
        <div class="retro-numbers">
          <div class="retro-number">
            <div class="retro-number-value">${totalAnswers}</div>
            <div class="retro-number-label">ответов</div>
          </div>
          <div class="retro-number">
            <div class="retro-number-value">${bothAnsweredDays}</div>
            <div class="retro-number-label">дней вдвоём</div>
          </div>
          <div class="retro-number">
            <div class="retro-number-value">${totalConvs}</div>
            <div class="retro-number-label">разговоров</div>
          </div>
          <div class="retro-number">
            <div class="retro-number-value">${totalAgr}</div>
            <div class="retro-number-label">договорённостей</div>
          </div>
        </div>
      </div>
    `;

    if (topThemes.length > 0) {
      html += `
        <div class="retro-section">
          <div class="retro-section-title">Любимые темы</div>
          ${topThemes.map(([theme, count]) => `
            <div class="retro-top-item">
              <strong>${escapeHtml(theme)}</strong>
              <span class="retro-count">${count} ${plural(count, "ответ", "ответа", "ответов")}</span>
            </div>
          `).join("")}
        </div>
      `;
    }

    if (topMoods.length > 0) {
      html += `
        <div class="retro-section">
          <div class="retro-section-title">Настроения года</div>
          <div class="retro-top-item" style="font-size:24px;text-align:center;padding:20px;">
            ${topMoods.map(([emoji, count]) => `
              <span style="margin: 0 8px;">${emoji}<sup style="font-size:12px;color:var(--muted);">${count}</sup></span>
            `).join("")}
          </div>
        </div>
      `;
    }

    if (sortedByLength.length > 0) {
      html += `
        <div class="retro-section">
          <div class="retro-section-title">Лучшие ответы года</div>
          ${sortedByLength.map(a => {
            const authorName = a.userId === currentUser.uid ? myName : partnerName;
            return `
              <div class="retro-quote">
                <span class="retro-quote-day">День ${a.day} • ${escapeHtml(authorName)}</span>
                ${escapeHtml(a.text)}
              </div>
            `;
          }).join("")}
        </div>
      `;
    }

    if (topWords.length > 0) {
      const maxCount = topWords[0][1];
      const minCount = topWords[topWords.length - 1][1];
      const range = Math.max(maxCount - minCount, 1);
      html += `
        <div class="retro-section">
          <div class="retro-section-title">Слова года</div>
          <div class="retro-words">
            ${topWords.map(([word, count]) => {
              const size = Math.min(5, Math.max(1, Math.ceil((count - minCount) / range * 4) + 1));
              return `<span class="retro-word size-${size}">${escapeHtml(word)}</span>`;
            }).join("")}
          </div>
        </div>
      `;
    }

    if (!html.includes("retro-section")) {
      html = `<div class="retro-empty">Пока не хватает данных для итогов. Возвращайтесь, когда накопится история 💛</div>`;
    }

    content.innerHTML = html;
  } catch (e) {
    console.error(e);
    content.innerHTML = `<p class="hint">Ошибка загрузки: ${escapeHtml(e.message)}</p>`;
  }
}

/* ---------- HISTORY ---------- */
async function renderHistory() {
  const container = $("history-list");
  if (!container) return;
  container.innerHTML = "<p class='hint'>Загрузка...</p>";
  const snap = await getDocs(collection(db, "couples", currentCoupleId, "answers"));
  const byDay = {};
  snap.docs.forEach(d => {
    const data = d.data();
    if (!byDay[data.day]) byDay[data.day] = [];
    byDay[data.day].push({ id: d.id, ...data });
  });
  container.innerHTML = "";
  const days = Object.keys(byDay).map(Number).sort((a, b) => b - a);
  if (days.length === 0) {
    container.innerHTML = emptyStateHtml({
      icon: ICONS.book,
      title: "Здесь появится ваша история",
      text: "Как только вы с партнёром ответите на первые вопросы, здесь соберутся все ваши ответы."
    });
    return;
  }
  for (const day of days) {
    const answers = byDay[day];
    const mine = answers.find(a => a.userId === currentUser.uid);
    const partner = answers.find(a => a.userId !== currentUser.uid);
    const q = getQuestionForDay(day);
    const showPartner = !!mine;
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `
      <div class="history-day">День ${day}${q ? " • " + escapeHtml(q.theme) : ""}</div>
      <div class="history-question">${escapeHtml(q?.text || "—")}</div>
      <div class="history-answer ${mine ? "" : "empty"}">
        <strong>Вы:</strong> ${mine ? escapeHtml(mine.text) : "—"}
      </div>
      <div class="history-answer ${partner && showPartner ? "" : "empty"}">
        <strong>Партнёр:</strong> ${
          partner && showPartner ? escapeHtml(partner.text) :
          showPartner ? "Пока не ответил(а)" : "Скрыто (вы ещё не ответили)"
        }
      </div>
    `;
    container.appendChild(div);
  }
}

/* ---------- ЗАПУСК ТЕМЫ И СХЕМЫ ---------- */
initTheme();
applySavedScheme();

/* ---------- ПРОФИЛИ ---------- */
async function initProfile() {
  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
  const [mine, partners] = await Promise.all([
    getDoc(doc(db, "users", currentUser.uid)),
    getDoc(doc(db, "users", partnerUid))
  ]);
  myProfile = mine.exists() ? mine.data() : { displayName: "", photoURL: "" };
  partnerProfile = partners.exists() ? partners.data() : { displayName: "", photoURL: "" };
  renderAvatars();
  const personMe = $("person-me");
  if (personMe) personMe.onclick = openProfileModal;
  const backdrop = $("modal-backdrop");
  if (backdrop) backdrop.onclick = closeProfileModal;
  const closeBtn = $("close-profile");
  if (closeBtn) closeBtn.onclick = closeProfileModal;
  const saveBtn = $("save-profile");
  if (saveBtn) saveBtn.onclick = saveProfileModal;
  initNotifTime();
  initMoonToggle();
  onSnapshot(doc(db, "users", partnerUid), (snap) => {
    if (snap.exists()) {
      partnerProfile = snap.data();
      renderAvatars();
    }
  });
}
function renderAvatars() {
  renderOnePolaroid("polaroid-me", "polaroid-name-me", myProfile, "Вы");
  renderOnePolaroid("polaroid-partner", "polaroid-name-partner", partnerProfile, "Партнёр");
}
function renderOnePolaroid(polaroidId, nameId, profile, fallbackName) {
  const polaroidEl = $(polaroidId);
  const nameEl = $(nameId);
  if (!polaroidEl || !nameEl) return;
  const name = profile?.displayName?.trim() || fallbackName;
  nameEl.textContent = name;
  if (profile?.photoURL?.trim()) {
    polaroidEl.innerHTML = `<img src="${escapeHtml(profile.photoURL)}" alt="${escapeHtml(name)}" onerror="this.parentElement.textContent='${escapeHtml(getInitials(name))}'">`;
    polaroidEl.style.background = "";
  } else {
    polaroidEl.textContent = getInitials(name);
    const hue = hashString(name) % 360;
    polaroidEl.style.background = `linear-gradient(135deg, hsl(${hue}, 45%, 60%) 0%, hsl(${hue}, 50%, 42%) 100%)`;
    polaroidEl.style.fontFamily = "'Bodoni Moda', serif";
    polaroidEl.style.fontSize = "48px";
    polaroidEl.style.color = "#fff";
    polaroidEl.style.fontStyle = "italic";
  }
}
function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
function openProfileModal() {
  vibrate(10);
  $("profile-name").value = myProfile?.displayName || "";
  $("profile-photo").value = myProfile?.photoURL || "";
  $("profile-modal").classList.remove("hidden");
}
function closeProfileModal() { $("profile-modal").classList.add("hidden"); }
async function saveProfileModal() {
  const name = $("profile-name").value.trim();
  const photoURL = $("profile-photo").value.trim();
  try {
    await setDoc(doc(db, "users", currentUser.uid), {
      displayName: name,
      photoURL: photoURL
    }, { merge: true });
    myProfile = { displayName: name, photoURL };
    renderAvatars();
    closeProfileModal();
    vibrate(15);
  } catch (err) {
    alert("Ошибка сохранения: " + err.message);
  }
}

/* ---------- ЛУНА ---------- */
function initMoonToggle() {
  const el = $("moon-toggle");
  if (!el) return;
  const visible = localStorage.getItem("moon-visible") !== "0";
  el.checked = visible;
  el.onchange = () => {
    const val = el.checked;
    localStorage.setItem("moon-visible", val ? "1" : "0");
    if (val) { showMoonBlocks(); renderMoonWidget(); }
    else hideMoonBlocks();
    vibrate(10);
  };
}
function hideMoonBlocks() {
  ["moon-widget", "moon-event", "moon-week"].forEach(id => {
    const el = $(id);
    if (el) el.classList.add("hidden");
  });
  const advice = document.querySelector(".moon-advice");
  if (advice) advice.classList.add("hidden");
}
function showMoonBlocks() {
  ["moon-widget", "moon-week"].forEach(id => {
    const el = $(id);
    if (el) el.classList.remove("hidden");
  });
  const advice = document.querySelector(".moon-advice");
  if (advice) advice.classList.remove("hidden");
}

/* ---------- УВЕДОМЛЕНИЯ ---------- */
function initNotifications() {
  updateNotifButton();
  $("notif-btn").onclick = toggleNotifications;
  setInterval(checkReminder, 60000);
  checkReminder();
}
function updateNotifButton() {
  const enabled = localStorage.getItem("notif-enabled") === "1";
  const granted = typeof Notification !== "undefined" && Notification.permission === "granted";
  const label = $("notif-label");
  if (label) {
    label.textContent = (enabled && granted) ? "Уведомления вкл" : "Уведомления выкл";
  }
}
async function toggleNotifications() {
  if (localStorage.getItem("notif-enabled") === "1") {
    localStorage.setItem("notif-enabled", "0");
    updateNotifButton();
    return;
  }
  if (typeof Notification === "undefined") {
    alert("Ваш браузер не поддерживает уведомления.");
    return;
  }
  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") {
    alert("Разрешение не получено. Включите уведомления для этого сайта в настройках браузера.");
    return;
  }
  localStorage.setItem("notif-enabled", "1");
  updateNotifButton();
  try {
    new Notification
