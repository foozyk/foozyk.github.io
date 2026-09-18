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

  if (localStorage.getItem("moon-visible") !== "0") renderMoonWidget();
  else hideMoonBlocks();

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
  $("current-theme").textContent = q.theme;
  $("current-question").textContent = q.text;
  const percent = Math.round((day / 365) * 100);
  $("progress-bar").style.width = percent + "%";
  $("progress-label").textContent = "Пройдено " + percent + "%";
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
  $("my-answer").value = myAnswer ? (myAnswer.text || "") : "";
  $("save-answer").textContent = myAnswer ? "Обновить ответ" : "Сохранить ответ";
  const partnerEl = $("partner-answer");
  const statusEl = $("answer-status");
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
  renderReactions();
  checkConfetti();
}
$("save-answer").onclick = async () => {
  const text = $("my-answer").value.trim();
  if (!text) return;
  const day
