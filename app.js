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
import { words } from "./words.js";

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
let conversationsInitialized = false;
let quizInitialized = false;
let tasks = [];
let unsubTasks = null;
let tasksInitialized = false;
let currentTasksFilter = "active";
let editingTaskId = null;
let selectedTaskWho = "none";
let notes = [];
let unsubNotes = null;
let notesInitialized = false;
let editingNoteId = null;
let selectedStickerColor = 0;
let events = [];
let unsubEvents = null;
let eventsInitialized = false;
let editingEventId = null;
let selectedEventRepeat = "none";
let currentCalYear = new Date().getFullYear();
let currentCalMonth = new Date().getMonth();
let selectedCalDate = null;
let unsubSignals = null;
let signalsInitialized = false;

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

/* ---------- ПОЯВЛЕНИЕ КАРТОЧЕК ПРИ СКРОЛЛЕ ---------- */
let revealObserver = null;

function initReveal() {
  const els = document.querySelectorAll(".reveal:not(.is-visible)");
  if (!els.length) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    els.forEach(el => el.classList.add("is-visible"));
    return;
  }

  if (revealObserver) revealObserver.disconnect();

  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        void el.offsetHeight;
        el.classList.add("is-visible");
        revealObserver.unobserve(el);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: "0px 0px -30px 0px"
  });

  void document.body.offsetHeight;
  els.forEach(el => revealObserver.observe(el));

  // Страховка на всякий случай
  setTimeout(() => {
    document.querySelectorAll(".reveal:not(.is-visible)").forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        el.classList.add("is-visible");
      }
    });
  }, 900);
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
const VIEW_ORDER = ["today", "conversation", "plans", "about"];

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

  // Зашли на «Сегодня» — отмечаем ответ партнёра как увиденный
  if (view === "today") {
    requestAnimationFrame(() => markTodaySeen());
  }
  $("today-view").classList.toggle("hidden", view !== "today");
  $("conversation-view").classList.toggle("hidden", view !== "conversation");
  $("plans-view").classList.toggle("hidden", view !== "plans");
  $("about-view").classList.toggle("hidden", view !== "about");

  const activeSection = $(
    view === "today" ? "today-view" :
    view === "conversation" ? "conversation-view" :
    view === "plans" ? "plans-view" : "about-view"
  );
  if (activeSection) {
    activeSection.classList.remove("view-enter-right", "view-enter-left");
    void activeSection.offsetWidth;
    activeSection.classList.add(direction === "right" ? "view-enter-right" : "view-enter-left");
  }

  if (view === "conversation") renderConversations();
  if (view === "plans") renderPlansSubTab();
  if (view === "about") renderAboutSubTab();
  window.scrollTo({ top: 0, behavior: "smooth" });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      initReveal();
    });
  });
}

/* ---------- ПОД-ТАБЫ «Мы» ---------- */
let currentAboutSubTab = "quiz";
function initAboutSubTabs() {
  $("sub-quiz").onclick = () => { vibrate(10); setAboutSubTab("quiz"); };
  $("sub-lovelang").onclick = () => { vibrate(10); setAboutSubTab("lovelang"); };
  $("sub-truth").onclick = () => { vibrate(10); setAboutSubTab("truth"); };
  $("sub-archive").onclick = () => { vibrate(10); setAboutSubTab("archive"); };
}
function setAboutSubTab(tab) {
  currentAboutSubTab = tab;
  $("sub-quiz").classList.toggle("active", tab === "quiz");
  $("sub-lovelang").classList.toggle("active", tab === "lovelang");
  $("sub-truth").classList.toggle("active", tab === "truth");
  $("sub-archive").classList.toggle("active", tab === "archive");
  $("about-quiz").classList.toggle("hidden", tab !== "quiz");
  $("about-lovelang").classList.toggle("hidden", tab !== "lovelang");
  $("about-truth").classList.toggle("hidden", tab !== "truth");
  $("about-archive").classList.toggle("hidden", tab !== "archive");

  // Ленивая загрузка данных архива — только когда открыли под-таб
  if (tab === "archive") {
    renderStats();
    renderHeatmap();
    renderMoodHistory();
    renderHistory();
  }
}
function renderAboutSubTab() {
  setAboutSubTab(currentAboutSubTab);
  if (currentAboutSubTab === "quiz") renderQuizMain();
  if (currentAboutSubTab === "archive") {
    renderStats();
    renderHeatmap();
    renderMoodHistory();
    renderHistory();
  }
}

/* ---------- ПОД-ТАБЫ «Планы» ---------- */
let currentPlansSubTab = "tasks";
function initPlansSubTabs() {
  $("sub-tasks").onclick = () => { vibrate(10); setPlansSubTab("tasks"); };
  $("sub-notes").onclick = () => { vibrate(10); setPlansSubTab("notes"); };
  $("sub-calendar").onclick = () => { vibrate(10); setPlansSubTab("calendar"); };
}
function setPlansSubTab(tab) {
  currentPlansSubTab = tab;
  $("sub-tasks").classList.toggle("active", tab === "tasks");
  $("sub-notes").classList.toggle("active", tab === "notes");
  $("sub-calendar").classList.toggle("active", tab === "calendar");
  $("plans-tasks").classList.toggle("hidden", tab !== "tasks");
  $("plans-notes").classList.toggle("hidden", tab !== "notes");
  $("plans-calendar").classList.toggle("hidden", tab !== "calendar");
}
function renderPlansSubTab() {
  setPlansSubTab(currentPlansSubTab);
  if (currentPlansSubTab === "tasks") renderTasks();
  if (currentPlansSubTab === "notes") renderNotes();
  if (currentPlansSubTab === "calendar") {
    renderCalendar();
    renderEventsList();
  }
}

/* ---------- MAIN APP ---------- */
function startMainApp() {
  showScreen("main");
  renderToday();
  applySeasonTheme();

  // Сбрасываем флаги — новые слушатели разговоров/квизов
  // должны один раз «прогреться» без уведомлений
  conversationsInitialized = false;
  quizInitialized = false;

  renderMoonWidget();
  if (localStorage.getItem("moon-visible") === "0") hideMoonBlocks();

  initWeather();
  listenForAnswers();
  initProfile();
  initNotifications();
  initMood();
  initLoveLang();
  initQuiz();
  initAboutSubTabs();
  initPlansSubTabs();
  initTasks();
  initNotes();
  initEvents();
  initWord();
  initTruthOrDare();
  initConversations();
  initAgreements();
  initCustomTopics();
  initPDFExport();
  initRetro();
  initDayView();
  initSchemeControls();
  initBottomNav();
  initThinkButton();
  initThinkSignals();

  startDayWatcher();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      initReveal();
    });
  });
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
      renderWordCard();
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
  if (pl) pl.textContent = percent + "%";
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
  const partnerName = partnerProfile?.displayName?.trim() || "Партнёр";
  const letter = getInitials(partnerName).slice(0, 1);
  const photoURL = partnerProfile?.photoURL?.trim() || "";

  notifyUser(
    `${partnerName} ответила на вопрос дня`,
    "Откройте «Сегодня», чтобы прочитать.",
    "today",
    { avatar: { letter, photoURL } }
  );

  const partnerSection = document.querySelector(".partner-section");
  if (partnerSection) {
    partnerSection.classList.add("pulse-highlight");
    setTimeout(() => partnerSection.classList.remove("pulse-highlight"), 3000);
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
  const savedText = myAnswer ? (myAnswer.text || "") : "";
  if (myTa && !myTa.matches(":focus") && myTa.value !== savedText) {
    myTa.value = savedText;
  }
  updateSaveButtonState();

  const partnerEl = $("partner-answer");
  const statusEl = $("answer-status");
  const section = document.querySelector(".partner-section");

  if (section) section.classList.remove("is-waiting", "is-locked", "is-open");

  const partnerName = partnerProfile?.displayName?.trim() || "Партнёр";
  const safeName = `<span class="partner-answer__name">${escapeHtml(partnerName)}</span>`;

  if (partnerEl && statusEl) {
    if (myAnswer && partnerAnswer) {
      if (section) section.classList.add("is-open");
      partnerEl.textContent = partnerAnswer.text || "(без текста)";
      statusEl.textContent = "✓ Оба ответили — ответы открыты!";
      statusEl.style.color = "#4a8b4a";
    } else if (myAnswer && !partnerAnswer) {
      if (section) section.classList.add("is-waiting");
      partnerEl.innerHTML = `
        <span class="partner-answer__icon">⏳</span>
        <span class="partner-answer__text">
          Ваш ответ сохранён.<br>
          Как только ${safeName} ответит — увидите ответ здесь.
        </span>
      `;
      statusEl.textContent = "Ваш ответ сохранён. Ждём партнёра...";
      statusEl.style.color = "#999";
    } else if (!myAnswer && partnerAnswer) {
      if (section) section.classList.add("is-locked");
      partnerEl.innerHTML = `
        <span class="partner-answer__icon">🔒</span>
        <span class="partner-answer__text">
          ${safeName} уже ответила.<br>
          Напишите своё — и её ответ откроется.
        </span>
      `;
      statusEl.textContent = "";
      statusEl.style.color = "";
    } else {
      if (section) section.classList.add("is-waiting");
      partnerEl.innerHTML = `Пока пусто. Начните первым — или подождите партнёра ❤️`;
      statusEl.textContent = "";
      statusEl.style.color = "";
    }
  }

  checkConfetti();
}
$("save-answer").onclick = async () => {
  const text = $("my-answer").value.trim();
  if (!text) return;

  const day = getCurrentDay();
  const existing = todayAnswers.find(a => a.userId === currentUser.uid);

  if (existing && (existing.text || "").trim() === text) return;

  const sa = $("save-answer");
  sa.disabled = true;
  sa.classList.remove("state-idle", "state-saved");
  sa.classList.add("state-saving");
  sa.textContent = "Сохраняем...";

  try {
    if (existing) {
      await updateDoc(doc(db, "couples", currentCoupleId, "answers", existing.id), {
        text, updatedAt: serverTimestamp()
      });
      existing.text = text;
    } else {
      const ref = await addDoc(collection(db, "couples", currentCoupleId, "answers"), {
        day, userId: currentUser.uid, text, createdAt: serverTimestamp()
      });
      todayAnswers.push({ id: ref.id, day, userId: currentUser.uid, text });
    }
    vibrate(15);
  } catch (e) {
    console.error(e);
    alert("Ошибка сохранения: " + e.message);
  } finally {
    sa.disabled = false;
    sa.classList.remove("state-saving");
    updateSaveButtonState();
    updateBadges();
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

  // Бейдж «Планы» — задачи
  updateTasksBadge();

  // Бейдж «Сегодня»
  updateTodayBadge();
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
  const prevIds = collectPrevIds(container);
  container.innerHTML = "";
  const snap = await getDocs(collection(db, "couples", currentCoupleId, "answers"));
  const byDay = {};
  snap.docs.forEach(d => {
    const data = d.data();
    if (!byDay[data.day]) byDay[data.day] = [];
    byDay[data.day].push({ id: d.id, ...data });
  });
  const days = Object.keys(byDay).map(Number).sort((a, b) => b - a);
  if (days.length === 0) {
    container.innerHTML = emptyStateHtml({
      icon: ICONS.book,
      title: "Здесь появится ваша история",
      text: "Как только вы с партнёром ответите на первые вопросы, здесь соберутся все ваши ответы."
    });
    return;
  }
  let idx = 0;
  for (const day of days) {
    const answers = byDay[day];
    const mine = answers.find(a => a.userId === currentUser.uid);
    const partner = answers.find(a => a.userId !== currentUser.uid);
    const q = getQuestionForDay(day);
    const showPartner = !!mine;
    const div = document.createElement("div");
    div.className = "history-item";
    div.dataset.animId = "day-" + day;
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
    markForAnim(div, "day-" + day, prevIds, idx++);
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
  renderTodayMood();
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
      renderTodayMood();
    }
  });
}
function renderAvatars() {
  renderOnePolaroid("polaroid-me", "polaroid-name-me", myProfile, "Вы");
  renderOnePolaroid("polaroid-partner", "polaroid-name-partner", partnerProfile, "Партнёр");
  initPolaroidTap();
}
function initPolaroidTap() {
  document.querySelectorAll(".polaroid").forEach(el => {
    if (el.dataset.tapBound === "1") return;
    el.dataset.tapBound = "1";
    el.addEventListener("pointerdown", () => {
      el.classList.add("tapped");
      vibrate(10);
    });
    const release = () => {
      setTimeout(() => el.classList.remove("tapped"), 200);
    };
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    el.addEventListener("pointerleave", release);
  });
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
const MOON_VISIBLE_IDS = ["moon-info-item", "moon-info-divider", "moon-tip-line"];

function hideMoonBlocks() {
  MOON_VISIBLE_IDS.forEach(id => {
    const el = $(id);
    if (el) el.classList.add("hidden");
  });
}
function showMoonBlocks() {
  MOON_VISIBLE_IDS.forEach(id => {
    const el = $(id);
    if (el) el.classList.remove("hidden");
  });
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
    new Notification("Уведомления включены 💛", {
      body: "Мы напомним вам вечером, если вы ещё не ответили на вопрос дня.",
      icon: "./icon-192.png"
    });
  } catch (e) { console.log("Notif error:", e); }
}
function checkReminder() {
  if (!currentUser) return;
  if (localStorage.getItem("notif-enabled") !== "1") return;
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  const saved = localStorage.getItem("notif-time") || "21:00";
  const [rh, rm] = saved.split(":").map(Number);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const reminderMinutes = rh * 60 + rm;
  if (nowMinutes < reminderMinutes) return;
  const today = now.toISOString().slice(0, 10);
  if (localStorage.getItem("last-notif") === today) return;
  const myAnswer = todayAnswers.find(a => a.userId === currentUser.uid);
  if (myAnswer) return;
  try {
    new Notification("Наш год 💛", {
      body: "Вы ещё не ответили на сегодняшний вопрос. Загляните!",
      icon: "./icon-192.png",
      tag: "daily-reminder"
    });
    localStorage.setItem("last-notif", today);
  } catch (e) { console.log("Notif error:", e); }
}
function initNotifTime() {
  const saved = localStorage.getItem("notif-time") || "21:00";
  const el = $("notif-time");
  if (!el) return;
  el.value = saved;
  el.onchange = () => {
    localStorage.setItem("notif-time", el.value);
    const label = document.querySelector('label[for="notif-time"]');
    if (label) {
      const original = label.textContent;
      label.textContent = "Время напоминания ✓";
      setTimeout(() => { label.textContent = original; }, 1200);
    }
  };
}

/* ---------- НАСТРОЕНИЕ ---------- */
function initMood() {
  document.querySelectorAll("#mood-picker button").forEach(btn => {
    btn.onclick = () => selectMood(btn.dataset.mood);
  });
  const saveBtn = $("save-mood-note");
  if (saveBtn) saveBtn.onclick = saveMoodNote;
  const moodNote = $("mood-note");
  if (moodNote) {
    moodNote.addEventListener("input", () => {
      clearTimeout(moodNoteTimer);
      moodNoteTimer = setTimeout(saveMoodNote, 1200);
    });
  }
  listenForMood();
}
function listenForMood() {
  if (unsubMood) unsubMood();
  const day = getCurrentDay();
  unsubMood = onSnapshot(
    doc(db, "couples", currentCoupleId, "moods", String(day)),
    (snap) => {
      todayMoods = snap.exists() ? snap.data() : {};
      renderTodayMood();
    }
  );
}
function renderTodayMood() {
  const moods = todayMoods.moods || {};
  const notes = todayMoods.notes || {};
  const myMood = moods[currentUser.uid] || null;
  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
  const partnerMood = moods[partnerUid] || null;
  const partnerNote = notes[partnerUid] || "";
  document.querySelectorAll("#mood-picker button").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.mood === myMood);
  });
  const myMoodEl = $("mood-me");
  if (myMoodEl) {
    if (myMood) { myMoodEl.textContent = myMood; myMoodEl.classList.remove("hidden"); }
    else myMoodEl.classList.add("hidden");
  }
  const partnerMoodEl = $("mood-partner");
  if (partnerMoodEl) {
    if (partnerMood) { partnerMoodEl.textContent = partnerMood; partnerMoodEl.classList.remove("hidden"); }
    else partnerMoodEl.classList.add("hidden");
  }
  const noteEl = $("mood-note");
  const myNote = notes[currentUser.uid] || "";
  if (noteEl && !noteEl.matches(":focus") && noteEl.value !== myNote) noteEl.value = myNote;
  const textEl = $("mood-partner-text");
  if (textEl) {
    const partnerName = partnerProfile?.displayName?.trim() || "Партнёр";
    const safeName = `<strong class="mood-partner-name">${escapeHtml(partnerName)}</strong>`;
    if (partnerMood) {
      textEl.innerHTML = `${safeName} сегодня ${partnerMood}`;
    } else {
      textEl.innerHTML = `${safeName} пока без настроения`;
    }
  }
  const noteTextEl = $("mood-partner-note");
  if (noteTextEl) noteTextEl.textContent = partnerNote ? "«" + partnerNote + "»" : "";
}
async function selectMood(emoji) {
  const day = getCurrentDay();
  const docRef = doc(db, "couples", currentCoupleId, "moods", String(day));
  try {
    const snap = await getDoc(docRef);
    const data = snap.exists() ? snap.data() : {};
    const moods = { ...(data.moods || {}) };
    const notes = { ...(data.notes || {}) };
    moods[currentUser.uid] = emoji;
    await setDoc(docRef, { day, moods, notes }, { merge: true });
    vibrate(10);
  } catch (e) {
    console.error(e);
    alert("Не удалось сохранить настроение: " + e.message);
  }
}
async function saveMoodNote() {
  const day = getCurrentDay();
  const text = $("mood-note").value.trim();
  const docRef = doc(db, "couples", currentCoupleId, "moods", String(day));
  try {
    const snap = await getDoc(docRef);
    const data = snap.exists() ? snap.data() : {};
    const moods = { ...(data.moods || {}) };
    const notes = { ...(data.notes || {}) };
    notes[currentUser.uid] = text;
    await setDoc(docRef, { day, moods, notes }, { merge: true });
    $("save-mood-note").textContent = "Сохранено ✓";
    setTimeout(() => { $("save-mood-note").textContent = "Сохранить заметку"; }, 1500);
  } catch (e) {
    console.error(e);
    alert("Не удалось сохранить заметку: " + e.message);
  }
}
async function renderMoodHistory() {
  const container = $("mood-grid");
  if (!container) return;
  const prevIds = collectPrevIds(container);
  container.innerHTML = "";
  try {
    const snap = await getDocs(collection(db, "couples", currentCoupleId, "moods"));
    const byDay = {};
    snap.docs.forEach(d => {
      const data = d.data();
      byDay[data.day] = data.moods || {};
    });
    const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
    const today = getCurrentDay();
    const start = Math.max(1, today - 29);
    let hasAny = false;
    let idx = 0;
    for (let d = today; d >= start; d--) {
      const moods = byDay[d] || {};
      const myMood = moods[currentUser.uid] || null;
      const partnerMood = moods[partnerUid] || null;
      if (myMood || partnerMood) hasAny = true;
      const div = document.createElement("div");
      div.className = "mood-day";
      div.dataset.animId = "day-" + d;
      div.innerHTML = `
        <div class="mood-day-num">День ${d}</div>
        <div class="mood-day-emoji">${myMood || '<span class="mood-day-empty">·</span>'}</div>
        <div class="mood-day-partner">${partnerMood || '<span class="mood-day-empty">·</span>'}</div>
      `;
      markForAnim(div, "day-" + d, prevIds, idx++);
      container.appendChild(div);
    }
    if (!hasAny) {
      container.innerHTML = emptyStateHtml({
        icon: ICONS.calendar,
        title: "Дневник пока пуст",
        text: "Отмечайте настроение каждый день — через месяц увидите красивую картину."
      });
    }
  } catch (e) {
    console.error(e);
    container.innerHTML = "<p class='hint'>Ошибка загрузки.</p>";
  }
}

/* ---------- ЛУННЫЙ КАЛЕНДАРЬ ---------- */
function getMoonData(date) {
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
  const lunarCycleMs = 29.530588853 * 24 * 60 * 60 * 1000;
  const now = date.getTime();
  let phase = ((now - knownNewMoon) % lunarCycleMs + lunarCycleMs) % lunarCycleMs;
  const phasePercent = phase / lunarCycleMs;
  const phases = [
    { name: "Новолуние", icon: "🌑" },
    { name: "Растущий серп", icon: "🌒" },
    { name: "Первая четверть", icon: "🌓" },
    { name: "Растущая луна", icon: "🌔" },
    { name: "Полнолуние", icon: "🌕" },
    { name: "Убывающая луна", icon: "🌖" },
    { name: "Последняя четверть", icon: "🌗" },
    { name: "Убывающий серп", icon: "🌘" }
  ];
  const phaseIndex = Math.round(phasePercent * 8) % 8;
  const daysSinceNewMoon = phase / (24 * 60 * 60 * 1000);
  let lunarDay = Math.floor(daysSinceNewMoon) + 1;
  if (lunarDay < 1) lunarDay = 1;
  if (lunarDay > 30) lunarDay = 30;
  return { phase: phases[phaseIndex], lunarDay };
}
const MOON_ADVICE = {
  "Новолуние": "Время начинаний. Загадайте желание вдвоём.",
  "Растущий серп": "Энергия растёт. Хороший день для маленьких шагов.",
  "Первая четверть": "Действуйте. Преодолейте одну небольшую преграду.",
  "Растущая луна": "Полный вперёд. Отличный день для планов на будущее.",
  "Полнолуние": "Эмоции на пике. Будьте мягче друг к другу.",
  "Убывающая луна": "Время отпускать. Скажите спасибо за день.",
  "Последняя четверть": "Отпустите старое. Простите мелкое.",
  "Убывающий серп": "Отдых и тишина. Вечер вдвоём без спешки."
};
const MOON_EVENTS = [
  { date: "2025-03-14", text: "🌒 Полное лунное затмение" },
  { date: "2025-09-07", text: "🌒 Полное лунное затмение" },
  { date: "2025-10-07", text: "🌕 Суперлуние — самая яркая луна года" },
  { date: "2025-11-05", text: "🌕 Суперлуние" },
  { date: "2025-12-04", text: "🌕 Суперлуние" },
  { date: "2026-01-03", text: "🌕 Суперлуние" },
  { date: "2026-03-03", text: "🌒 Полное лунное затмение" },
  { date: "2026-08-28", text: "🌘 Частное лунное затмение" },
  { date: "2026-11-24", text: "🌕 Суперлуние" },
  { date: "2026-12-24", text: "🌕 Суперлуние" },
  { date: "2027-02-20", text: "🌘 Полутеневое затмение" },
  { date: "2027-07-18", text: "🌘 Полутеневое затмение" },
  { date: "2027-08-17", text: "🌘 Полутеневое затмение" }
];
function localIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function getMoonEvent(date) {
  for (const offset of [0, -1, 1]) {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    const iso = localIso(d);
    const found = MOON_EVENTS.find(e => e.date === iso);
    if (found) {
      if (offset === 0) return { text: found.text };
      if (offset === -1) return { text: found.text + " (было вчера)" };
      return { text: found.text + " (будет завтра)" };
    }
  }
  return null;
}
function renderMoonWidget() {
  const widget = $("moon-widget");
  if (!widget) return;
  const data = getMoonData(new Date());
  const iconEl = $("moon-icon");
  if (iconEl) iconEl.textContent = data.phase.icon;
  const phaseEl = $("moon-phase");
  if (phaseEl) phaseEl.textContent = data.phase.name;
  const dayEl = $("moon-day");
  if (dayEl) dayEl.textContent = data.lunarDay + "-й лунный день";
  const adviceEl = $("moon-advice-text");
  if (adviceEl) adviceEl.textContent = MOON_ADVICE[data.phase.name] || "";
  const eventEl = $("moon-event");
  if (eventEl) {
    const event = getMoonEvent(new Date());
    if (event) { eventEl.textContent = event.text; eventEl.classList.remove("hidden"); }
    else eventEl.classList.add("hidden");
  }
  renderMoonWeek();
}
function renderMoonWeek() {
  const container = $("moon-week");
  if (!container) return;
  const dayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const today = new Date();
  let html = "";
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const moon = getMoonData(d);
    const label = dayNames[d.getDay()];
    const cls = i === 0 ? "moon-week-day today" : "moon-week-day";
    html += `
      <div class="${cls}">
        <div class="moon-week-label">${label}</div>
        <div class="moon-week-icon">${moon.phase.icon}</div>
        <div class="moon-week-num">${d.getDate()}</div>
      </div>
    `;
  }
  container.innerHTML = html;
}

/* ---------- ПОГОДА ---------- */
async function initWeather() {
  const widget = $("weather-widget");
  if (!widget) return;
  if (!WEATHER_API_KEY) return;
  const cached = getCachedWeather();
  if (cached) { renderWeather(cached); return; }
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        const data = await fetchWeather(latitude, longitude);
        setCachedWeather(data);
        renderWeather(data);
      } catch (e) { console.error("Weather error:", e); }
    },
    (err) => {
      console.log("Geolocation denied:", err);
      widget.style.display = "";
      const wi = $("weather-icon");
      if (wi) wi.textContent = "📍";
      const wt = $("weather-temp");
      if (wt) wt.textContent = "—";
      const wd = $("weather-desc");
      if (wd) wd.textContent = "Разрешите геолокацию";
    },
    { timeout: 8000, maximumAge: 30 * 60 * 1000 }
  );
}
async function fetchWeather(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric&lang=ru`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather API error: " + res.status);
  return res.json();
}
function getCachedWeather() {
  try {
    const raw = localStorage.getItem("weather-cache");
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (Date.now() - obj.t > 30 * 60 * 1000) return null;
    return obj.data;
  } catch { return null; }
}
function setCachedWeather(data) {
  try { localStorage.setItem("weather-cache", JSON.stringify({ t: Date.now(), data })); } catch {}
}
function getCurrentSeason() {
  const month = new Date().getMonth() + 1;
  if (month === 12 || month <= 2) return "winter";
  if (month <= 5) return "spring";
  if (month <= 8) return "summer";
  return "autumn";
}
function applySeasonTheme() {
  document.body.classList.remove("season-winter", "season-spring", "season-summer", "season-autumn");
  document.body.classList.add("season-" + getCurrentSeason());
}
function applyWeatherTheme(iconCode) {
  document.body.classList.remove("weather-sunny", "weather-cloudy", "weather-rainy", "weather-thunder", "weather-snowy");
  if (!iconCode) return;
  let cls = null;
  if (iconCode.startsWith("01")) cls = "weather-sunny";
  else if (iconCode.startsWith("02") || iconCode.startsWith("03") || iconCode.startsWith("04")) cls = "weather-cloudy";
  else if (iconCode.startsWith("09") || iconCode.startsWith("10")) cls = "weather-rainy";
  else if (iconCode.startsWith("11")) cls = "weather-thunder";
  else if (iconCode.startsWith("13")) cls = "weather-snowy";
  if (cls) document.body.classList.add(cls);
}
function renderWeather(data) {
  const widget = $("weather-widget");
  if (!widget) return;
  widget.style.display = "";
  const temp = Math.round(data.main.temp);
  const iconCode = data.weather[0].icon;
  const desc = data.weather[0].description;
  const city = data.name;
  $("weather-icon").textContent = weatherEmoji(iconCode);
  $("weather-temp").textContent = temp + "°C";
  $("weather-desc").textContent = capitalize(desc) + (city ? " · " + city : "");
  applyWeatherTheme(iconCode);
}
function weatherEmoji(code) {
  const map = {
    "01d": "☀️", "01n": "🌙",
    "02d": "🌤", "02n": "🌙",
    "03d": "☁️", "03n": "☁️",
    "04d": "☁️", "04n": "☁️",
    "09d": "🌧", "09n": "🌧",
    "10d": "🌦", "10n": "🌧",
    "11d": "⛈", "11n": "⛈",
    "13d": "❄️", "13n": "❄️",
    "50d": "🌫", "50n": "🌫"
  };
  return map[code] || "🌡";
}
function capitalize(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ---------- ЯЗЫКИ ЛЮБВИ ---------- */
const LOVE_LANGUAGES = {
  words: "Слова поощрения",
  time: "Время вместе",
  gifts: "Подарки",
  help: "Помощь и забота",
  touch: "Прикосновения"
};
const LOVE_QUESTIONS = [
  { q: "Что для вас важнее в отношениях?",
    a: { text: "Тёплые слова поддержки", lang: "words" },
    b: { text: "Совместно проведённое время", lang: "time" } },
  { q: "Что вам приятнее получить?",
    a: { text: "Что-то материальное, о чём я мечтал(а)", lang: "gifts" },
    b: { text: "Помощь в том, что мне трудно", lang: "help" } },
  { q: "Как вы чаще выражаете любовь?",
    a: { text: "Через прикосновения и объятия", lang: "touch" },
    b: { text: "Через тёплые слова", lang: "words" } },
  { q: "Идеальные выходные?",
    a: { text: "Вдвоём, без телефонов", lang: "time" },
    b: { text: "Поездка с сюрпризом", lang: "gifts" } },
  { q: "Что вас ранит сильнее?",
    a: { text: "Когда партнёр не помогает по дому", lang: "help" },
    b: { text: "Когда партнёр не обнимает", lang: "touch" } },
  { q: "Что вы цените в партнёре больше?",
    a: { text: "Тёплые слова и комплименты", lang: "words" },
    b: { text: "Готовность помочь", lang: "help" } },
  { q: "Что для вас лучший подарок?",
    a: { text: "Вечер наедине, без спешки", lang: "time" },
    b: { text: "Объятия и нежность", lang: "touch" } },
  { q: "Что бы вы выбрали?",
    a: { text: "Маленький сюрприз без повода", lang: "gifts" },
    b: { text: "Ужин, приготовленный вместе", lang: "time" } },
  { q: "Что важнее услышать?",
    a: { text: "«Я тебя люблю»", lang: "words" },
    b: { text: "«Я кое-что тебе купил(а)»", lang: "gifts" } },
  { q: "Что для вас признак заботы?",
    a: { text: "Партнёр делает что-то для меня", lang: "help" },
    b: { text: "Партнёр обнимает, держит за руку", lang: "touch" } }
];
function initLoveLang() {
  $("start-lovelang-test").onclick = startLoveTest;
  listenForLoveLang();
}
function listenForLoveLang() {
  if (unsubLoveLang) unsubLoveLang();
  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
  unsubLoveLang = onSnapshot(
    doc(db, "couples", currentCoupleId, "lovelang", "results"),
    (snap) => {
      const data = snap.exists() ? snap.data() : {};
      myLoveLang = data[currentUser.uid] || null;
      partnerLoveLang = data[partnerUid] || null;
      updateLoveLangUI();
    }
  );
}
function updateLoveLangUI() {
  const bothDone = myLoveLang && partnerLoveLang;
  if (myLoveLang) {
    $("lovelang-status").innerHTML =
      `<p>✓ Вы прошли тест. Ваш язык: <strong>${escapeHtml(myLoveLang.primary)}</strong></p>` +
      (partnerLoveLang
        ? `<p>✓ Партнёр тоже прошёл: <strong>${escapeHtml(partnerLoveLang.primary)}</strong></p>`
        : `<p>⏳ Партнёр ещё не прошёл тест.</p>`);
  } else {
    $("lovelang-status").innerHTML = partnerLoveLang
      ? `<p>Партнёр уже прошёл тест. Ваша очередь!</p>`
      : `<p>Никто ещё не проходил.</p>`;
  }
  if (bothDone) {
    $("lovelang-info").classList.remove("hidden");
    $("my-lovelang").textContent = myLoveLang.primary;
    $("partner-lovelang").textContent = partnerLoveLang.primary;
  } else if (myLoveLang) {
    $("lovelang-info").classList.remove("hidden");
    $("my-lovelang").textContent = myLoveLang.primary;
    $("partner-lovelang").textContent = "ещё не прошёл(ла)";
  } else {
    $("lovelang-info").classList.add("hidden");
  }
}
function startLoveTest() {
  vibrate(10);
  loveTestState = { step: 0, scores: { words: 0, time: 0, gifts: 0, help: 0, touch: 0 } };
  $("lovelang-intro").classList.add("hidden");
  $("lovelang-result").classList.add("hidden");
  $("lovelang-test").classList.remove("hidden");
  renderLoveQuestion();
}
function renderLoveQuestion() {
  const step = loveTestState.step;
  const q = LOVE_QUESTIONS[step];
  $("lovelang-progress").textContent = `Вопрос ${step + 1} из ${LOVE_QUESTIONS.length}`;
  $("lovelang-progress-fill").style.width = ((step) / LOVE_QUESTIONS.length * 100) + "%";
  $("lovelang-question").textContent = q.q;
  const optionsEl = $("lovelang-options");
  optionsEl.innerHTML = "";
  [q.a, q.b].forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "lovelang-option";
    btn.textContent = opt.text;
    btn.onclick = () => answerLoveQuestion(opt.lang);
    optionsEl.appendChild(btn);
  });
}
async function answerLoveQuestion(lang) {
  vibrate(10);
  loveTestState.scores[lang]++;
  loveTestState.step++;
  if (loveTestState.step >= LOVE_QUESTIONS.length) await finishLoveTest();
  else renderLoveQuestion();
}
async function finishLoveTest() {
  const scores = loveTestState.scores;
  let primary = "words";
  let maxScore = -1;
  for (const k in scores) {
    if (scores[k] > maxScore) { maxScore = scores[k]; primary = k; }
  }
  const result = { primary: LOVE_LANGUAGES[primary], primaryKey: primary, scores, completedAt: Date.now() };
  try {
    await setDoc(
      doc(db, "couples", currentCoupleId, "lovelang", "results"),
      { [currentUser.uid]: result },
      { merge: true }
    );
    myLoveLang = result;
    showLoveResult(result);
    vibrate([20, 50, 20]);
  } catch (e) {
    console.error(e);
    alert("Ошибка сохранения: " + e.message);
  }
}
function showLoveResult(result) {
  $("lovelang-test").classList.add("hidden");
  $("lovelang-intro").classList.add("hidden");
  $("lovelang-result").classList.remove("hidden");
  $("lovelang-primary").textContent = result.primary;
  const scoresEl = $("lovelang-scores");
  scoresEl.innerHTML = "";
  const total = Object.values(result.scores).reduce((a, b) => a + b, 0);
  const sorted = Object.entries(result.scores).sort((a, b) => b[1] - a[1]);
  sorted.forEach(([key, val]) => {
    const percent = Math.round(val / total * 100);
    const row = document.createElement("div");
    row.className = "lovelang-score-row";
    row.innerHTML = `
      <div class="label">${escapeHtml(LOVE_LANGUAGES[key])}</div>
      <div class="bar"><div style="width:${percent}%"></div></div>
      <div class="num">${percent}%</div>
    `;
    scoresEl.appendChild(row);
  });
  const compareEl = $("lovelang-compare");
  if (partnerLoveLang) {
    compareEl.textContent = `Партнёр прошёл: ${partnerLoveLang.primary}. Результат всегда можно посмотреть в профиле.`;
  } else {
    compareEl.textContent = "Ждём партнёра — потом результаты останутся в профиле.";
  }
}

/* ---------- КВИЗ ---------- */
const QUIZ_QUESTIONS = [
  { q: "Какой мой любимый цвет?", options: ["Синий", "Красный", "Зелёный", "Чёрный"] },
  { q: "Что я выберу на ужин?", options: ["Пиццу", "Суши", "Стейк", "Пасту"] },
  { q: "Куда я хочу поехать в отпуск?", options: ["На море", "В горы", "В большой город", "Остаться дома"] },
  { q: "Что меня бесит больше всего?", options: ["Опоздания", "Грязная посуда", "Громкая музыка", "Холод"] },
  { q: "Какой мой любимый фильм?", options: ["Комедия", "Драма", "Фантастика", "Ужасы"] },
  { q: "Что я делаю, когда грущу?", options: ["Молчу", "Хочу обниматься", "Иду гулять", "Смотрю что-то"] },
  { q: "Что для меня важнее в подарке?", options: ["Цена", "Внимание", "Польза", "Сюрприз"] },
  { q: "Как я предпочитаю отдыхать?", options: ["Дома", "На природе", "В кафе", "В поездке"] },
  { q: "Что я ценю в людях больше?", options: ["Честность", "Юмор", "Ум", "Доброту"] },
  { q: "Какое моё утро идеально?", options: ["Проснуться поздно", "Рано и бодро", "Кофе в тишине", "Обнимашки"] }
];
function initQuiz() {
  listenForQuiz();
  $("quiz-cancel").onclick = () => { quizState = null; showQuizMain(); };
  $("quiz-back").onclick = () => { showQuizMain(); renderQuizMain(); };
}
function listenForQuiz() {
  if (unsubQuiz) unsubQuiz();
  unsubQuiz = onSnapshot(
    doc(db, "couples", currentCoupleId, "quiz", "results"),
    (snap) => {
      const prevQuizData = quizData;

      quizData = snap.exists() ? snap.data() : {};
      if (!quizState) renderQuizMain();
      updateBadges();

      if (quizInitialized) {
        detectQuizEvents(prevQuizData);
      } else {
        quizInitialized = true;
      }
    }
  );
}

function detectQuizEvents(prevData) {
  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
  if (!partnerUid) return;

  const prevPartner = prevData[partnerUid] || {};
  const currPartner = quizData[partnerUid] || {};

  const partnerName = partnerProfile?.displayName?.trim() || "Партнёр";
  const avatar = {
    letter: getInitials(partnerName).slice(0, 1),
    photoURL: partnerProfile?.photoURL?.trim() || "",
  };

  // Партнёр создал квиз о себе (появилось поле answers)
  if (!prevPartner.answers && currPartner.answers) {
    notifyUser(
      `${partnerName} создала квиз о себе`,
      "Угадайте её ответы на 10 вопросов.",
      "about",
      { avatar }
    );
  }
}
function showQuizMain() {
  $("quiz-main").classList.remove("hidden");
  $("quiz-play").classList.add("hidden");
  $("quiz-result").classList.add("hidden");
}
function renderQuizMain() {
  showQuizMain();
  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
  const myData = quizData[currentUser.uid] || null;
  const partnerData = quizData[partnerUid] || null;
  const myStatus = $("my-quiz-status");
  if (myData?.answers) {
    myStatus.innerHTML = `<div class="status-line">✓ Ваш квиз готов.</div>
      <button id="quiz-view-my">Посмотреть мои ответы</button>
      <button id="quiz-retake" class="link">Пройти заново</button>`;
    $("quiz-view-my").onclick = () => showMyQuizResult();
    $("quiz-retake").onclick = () => startQuiz("me");
  } else {
    myStatus.innerHTML = `<div class="status-line">Ответьте на 10 вопросов о себе — партнёр попробует угадать.</div>
      <button id="quiz-start-me">Создать квиз обо мне</button>`;
    $("quiz-start-me").onclick = () => startQuiz("me");
  }
  const partnerStatus = $("partner-quiz-status");
  if (!partnerData?.answers) {
    partnerStatus.innerHTML = `<div class="status-line">Партнёр ещё не создал квиз о себе. Ждём.</div>`;
  } else if (myData?.guesses && myData.guessesFor === partnerUid) {
    const correct = countCorrect(myData.guesses, partnerData.answers);
    partnerStatus.innerHTML = `<div class="status-line">✓ Вы угадали <strong>${correct} из 10</strong> ответов партнёра.</div>
      <button id="quiz-view-my-result">Посмотреть разбор</button>
      <button id="quiz-retry" class="link">Пройти заново</button>`;
    $("quiz-view-my-result").onclick = () => showGuessResult();
    $("quiz-retry").onclick = () => startQuiz("partner");
  } else {
    partnerStatus.innerHTML = `<div class="status-line">Партнёр создал квиз о себе. Попробуйте угадать его ответы!</div>
      <button id="quiz-start-partner">Пройти квиз партнёра</button>`;
    $("quiz-start-partner").onclick = () => startQuiz("partner");
  }
}
function startQuiz(mode) {
  vibrate(10);
  quizState = { mode, step: 0, answers: [] };
  $("quiz-main").classList.add("hidden");
  $("quiz-result").classList.add("hidden");
  $("quiz-play").classList.remove("hidden");
  renderQuizQuestion();
}
function renderQuizQuestion() {
  const step = quizState.step;
  const q = QUIZ_QUESTIONS[step];
  $("quiz-progress").textContent = `Вопрос ${step + 1} из ${QUIZ_QUESTIONS.length}`;
  $("quiz-progress-fill").style.width = ((step) / QUIZ_QUESTIONS.length * 100) + "%";
  let questionText = q.q;
  if (quizState.mode === "partner") questionText = "Что, по-твоему, ответил(а) партнёр?\n\n" + q.q;
  $("quiz-question").textContent = questionText;
  const optionsEl = $("quiz-options");
  optionsEl.innerHTML = "";
  q.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "quiz-option";
    btn.textContent = opt;
    btn.onclick = () => answerQuizQuestion(idx);
    optionsEl.appendChild(btn);
  });
}
async function answerQuizQuestion(idx) {
  vibrate(10);
  quizState.answers.push(idx);
  quizState.step++;
  if (quizState.step >= QUIZ_QUESTIONS.length) await finishQuiz();
  else renderQuizQuestion();
}
async function finishQuiz() {
  try {
    if (quizState.mode === "me") {
      await setDoc(
        doc(db, "couples", currentCoupleId, "quiz", "results"),
        { [currentUser.uid]: { ...(quizData[currentUser.uid] || {}), answers: quizState.answers } },
        { merge: true }
      );
      quizData[currentUser.uid] = { ...(quizData[currentUser.uid] || {}), answers: quizState.answers };
    } else {
      const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
      await setDoc(
        doc(db, "couples", currentCoupleId, "quiz", "results"),
        { [currentUser.uid]: { ...(quizData[currentUser.uid] || {}), guesses: quizState.answers, guessesFor: partnerUid } },
        { merge: true }
      );
      quizData[currentUser.uid] = { ...(quizData[currentUser.uid] || {}), guesses: quizState.answers, guessesFor: partnerUid };
    }
    const savedMode = quizState.mode;
    quizState = null;
    if (savedMode === "me") showMyQuizResult();
    else showGuessResult();
    vibrate([20, 50, 20]);
  } catch (e) {
    console.error(e);
    alert("Ошибка сохранения: " + e.message);
  }
}
function countCorrect(guesses, answers) {
  let count = 0;
  for (let i = 0; i < QUIZ_QUESTIONS.length; i++) {
    if (guesses[i] === answers[i]) count++;
  }
  return count;
}
function showMyQuizResult() {
  const myData = quizData[currentUser.uid];
  if (!myData?.answers) return;
  $("quiz-main").classList.add("hidden");
  $("quiz-play").classList.add("hidden");
  $("quiz-result").classList.remove("hidden");
  $("quiz-result-title").textContent = "Ваши ответы";
  $("quiz-score").textContent = "10 ответов";
  const breakdown = $("quiz-breakdown");
  breakdown.innerHTML = "";
  QUIZ_QUESTIONS.forEach((q, i) => {
    const div = document.createElement("div");
    div.className = "quiz-breakdown-item";
    div.innerHTML = `
      <div class="q-text">${escapeHtml(q.q)}</div>
      <div class="ans you"><span class="dot">●</span> ${escapeHtml(q.options[myData.answers[i]])}</div>
    `;
    breakdown.appendChild(div);
  });
}
function showGuessResult() {
  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
  const myData = quizData[currentUser.uid];
  const partnerData = quizData[partnerUid];
  if (!myData?.guesses || !partnerData?.answers) return;
  const correct = countCorrect(myData.guesses, partnerData.answers);
  $("quiz-main").classList.add("hidden");
  $("quiz-play").classList.add("hidden");
  $("quiz-result").classList.remove("hidden");
  $("quiz-result-title").textContent = "Результат";
  $("quiz-score").textContent = `${correct} из 10`;
  if (correct >= 7) setTimeout(() => { fireConfetti(); vibrate([30, 60, 30, 60, 30]); }, 300);
  const breakdown = $("quiz-breakdown");
  breakdown.innerHTML = "";
  QUIZ_QUESTIONS.forEach((q, i) => {
    const isCorrect = myData.guesses[i] === partnerData.answers[i];
    const div = document.createElement("div");
    div.className = "quiz-breakdown-item";
    div.innerHTML = `
      <div class="q-text">${isCorrect ? "✓" : "✗"} ${escapeHtml(q.q)}</div>
      <div class="ans you"><span class="dot">●</span> Вы: ${escapeHtml(q.options[myData.guesses[i]])}</div>
      <div class="ans partner"><span class="dot">●</span> Партнёр: ${escapeHtml(q.options[partnerData.answers[i]])}</div>
    `;
    breakdown.appendChild(div);
  });
}

/* ---------- ПРАВДА ИЛИ ДЕЙСТВИЕ ---------- */
const TRUTH_DATA = {
  easy: {
    truth: [
      "Какой мой самый неловкий момент, который ты видел(а)?",
      "Что я делаю, что тебя бесит, но ты молчишь?",
      "Какой мой самый глупый страх?",
      "Что ты подумал(а) при первой встрече, но не сказал(а)?",
      "Какой фильм я заставил(а) тебя посмотреть, а тебе не понравилось?",
      "Какой мой самый странный вкус в еде?",
      "Что тебя рассмешило во мне в самый первый раз?",
      "Что я делаю, когда думаю, что никто не видит?",
      "Какой мой самый дурацкий поступок за последний год?",
      "Что тебя удивило во мне после того, как мы начали жить вместе?",
      "Какая моя привычка тебя смешит?",
      "Что ты обо мне подумал(а), но оказалось неправдой?",
      "Что я делаю не так, как ты?",
      "Какая моя черта тебе сначала не нравилась, а теперь нравится?",
      "Что бы ты хотел(а) во мне изменить, но боишься сказать?"
    ],
    dare: [
      "Изобрази меня в плохом настроении.",
      "Спой припев любой песни.",
      "Скажи мне три комплимента подряд.",
      "Покажи последнее фото в галерее.",
      "30 секунд смотри мне в глаза без слов.",
      "Сделай мне массаж плеч 1 минуту.",
      "Расскажи самый смешной анекдот, который знаешь.",
      "Изобрази моё лицо, когда я недоволен(на).",
      "Станцуй без музыки 20 секунд.",
      "Покажи свой любимый мем.",
      "Скажи скороговорку три раза подряд.",
      "Сделай мне комплимент на букву «М».",
      "Прочитай вслух последнее сообщение, которое ты мне писал(а).",
      "Спой моё имя в стиле оперы.",
      "Обними меня и не отпускай 30 секунд."
    ]
  },
  medium: {
    truth: [
      "О чём ты жалеешь в наших отношениях?",
      "Что ты хотел(а) бы изменить во мне, но боишься сказать?",
      "Какой наш момент был самым неловким для тебя?",
      "Что ты думаешь о моих родителях на самом деле?",
      "Если бы можно было переиграть один день — какой?",
      "Что ты чувствуешь, когда я тебя не слушаю?",
      "В чём я тебя разочаровал(а)?",
      "Какая наша ссора запомнилась больше всего и почему?",
      "Что ты скрываешь от меня из страха?",
      "Что бы ты сказал(а) мне, если бы знал(а), что я не обижусь?",
      "Как ты думаешь, в чём я тебя не понимаю?",
      "Что тебя беспокоит в нашем будущем?",
      "Какое моё решение ты до сих пор не одобряешь?",
      "Что ты боишься мне сказать о своих чувствах?",
      "О чём ты думаешь, когда мы молчим?"
    ],
    dare: [
      "Расскажи историю из детства, которую я не слышал(а).",
      "Покажи мою фотографию и объясни, что чувствуешь.",
      "Напиши мне смс с признанием прямо сейчас.",
      "Скажи, за что ты больше всего благодарен(на) мне.",
      "Расскажи, что ты чувствовал(а) в день нашей свадьбы (или первого серьёзного шага).",
      "Признайся в чём-то, что давно хотел(а) сказать.",
      "Опиши меня тремя словами и объясни каждое.",
      "Скажи мне то, что редко говоришь.",
      "Расскажи о своём самом тёплом воспоминании со мной.",
      "Обними меня так, будто мы не виделись год.",
      "Поцелуй меня так, будто мы только начали встречаться.",
      "Скажи мне, за что ты меня ценишь больше всего.",
      "Расскажи, какой момент со мной изменил тебя.",
      "Поделись одним страхом, о котором я не знаю.",
      "Скажи мне «спасибо» за что-то конкретное."
    ]
  },
  bold: {
    truth: [
      "Что тебя заводит во мне больше всего?",
      "О чём ты фантазируешь, но не говорил(а)?",
      "Что бы ты хотел(а) попробовать вместе в интимной жизни?",
      "Что тебе не хватает в нашей близости?",
      "Когда ты последний раз думал(а) обо мне «в этом смысле»?",
      "Что тебя возбуждает, но ты стесняешься сказать?",
      "Какая наша ночь была самой лучшей?",
      "Что бы ты хотел(а) изменить в нашей интимной жизни?",
      "Что тебя останавливает в твоих желаниях?",
      "Что бы ты хотел(а) сделать со мной прямо сейчас?",
      "О чём ты мечтаешь, когда мы вместе в постели?",
      "Что тебя привлекает в моём теле больше всего?",
      "Есть ли что-то, что ты хотел(а) бы попробовать, но боишься?",
      "Что тебе нравится в наших ласках больше всего?",
      "Что бы ты хотел(а) делать чаще?"
    ],
    dare: [
      "Поцелуй меня так, как будто мы только начали встречаться.",
      "Скажи мне то, что давно хотел(а) сказать, но не решался(лась).",
      "Обними меня на 60 секунд, не отпуская.",
      "Приготовь мне что-нибудь приятное прямо сейчас.",
      "Сними одну вещь и отдай мне.",
      "Прошепчи мне на ухо что-то, что меня заведёт.",
      "Потанцуй со мной медленный танец прямо здесь.",
      "Проведи пальцами по моей руке очень медленно.",
      "Скажи мне три вещи, которые хочешь со мной сделать.",
      "Поцелуй меня в шею.",
      "Сделай мне массаж 3 минуты.",
      "Расскажи мне свою самую смелую фантазию.",
      "Прикоснись ко мне так, будто мы одни в мире.",
      "Скажи мне то, что редко говоришь в постели.",
      "Смотри мне в глаза и говори, что чувствуешь."
    ]
  }
};

function initTruthOrDare() {
  document.querySelectorAll(".truth-level-btn").forEach(btn => {
    btn.onclick = () => startTruthGame(btn.dataset.level);
  });
  $("truth-pick-truth").onclick = () => pickTruth("truth");
  $("truth-pick-dare").onclick = () => pickTruth("dare");
  $("truth-pick-random").onclick = () => {
    const type = Math.random() < 0.5 ? "truth" : "dare";
    pickTruth(type);
  };
  $("truth-done").onclick = nextTruthRound;
  $("truth-skip").onclick = nextTruthRound;
  $("truth-end").onclick = endTruthGame;
  $("truth-restart").onclick = () => {
    $("truth-final").classList.add("hidden");
    $("truth-intro").classList.remove("hidden");
  };
}

function startTruthGame(level) {
  vibrate(15);
  truthState = { level, round: 0, history: [] };
  $("truth-intro").classList.add("hidden");
  $("truth-final").classList.add("hidden");
  $("truth-game").classList.remove("hidden");
  $("truth-round").textContent = "1";
  showTruthChoose();
}

function showTruthChoose() {
  $("truth-choose").classList.remove("hidden");
  $("truth-card").classList.add("hidden");
}

function pickTruth(type) {
  vibrate(10);
  const level = truthState.level;
  const data = TRUTH_DATA[level];
  const pool = type === "truth" ? data.truth : data.dare;

  const usedKey = type + "-" + level;
  const used = truthState.history.filter(h => h.startsWith(usedKey)).map(h => parseInt(h.split("-").pop()));
  const available = pool.filter((_, i) => !used.includes(i));
  if (available.length === 0) {
    truthState.history = truthState.history.filter(h => !h.startsWith(usedKey));
  }
  const finalPool = available.length > 0 ? available : pool;
  const idx = pool.indexOf(finalPool[Math.floor(Math.random() * finalPool.length)]);
  const text = pool[idx];

  truthState.history.push(usedKey + "-" + idx);
  truthState.round++;

  $("truth-choose").classList.add("hidden");
  const card = $("truth-card");
  const typeEl = $("truth-card-type");
  typeEl.textContent = type === "truth" ? "Правда" : "Действие";
  typeEl.classList.toggle("dare", type === "dare");
  $("truth-card-text").textContent = text;
  card.classList.remove("hidden");
  vibrate(15);
}

function nextTruthRound() {
  vibrate(10);
  $("truth-round").textContent = String(truthState.round + 1);
  showTruthChoose();
}

function endTruthGame() {
  vibrate([20, 50, 20]);
  $("truth-game").classList.add("hidden");
  $("truth-final").classList.remove("hidden");
  $("truth-final-rounds").textContent = truthState.round;
}

/* ---------- РАЗГОВОРЫ ---------- */
const CONVERSATION_TOPICS = [
  "Как я себя чувствую в последнее время",
  "Что меня беспокоит",
  "Что бы я хотел(а) изменить в наших отношениях",
  "О чём нам стоит поговорить",
  "Что мне важно в нашей жизни вместе",
  "Что я ценю в тебе",
  "Планы на будущее",
  "Что мне не хватает"
];
function initConversations() {
  $("new-conversation-btn").onclick = openTopicModal;
  $("topic-backdrop").onclick = closeTopicModal;
  $("topic-cancel").onclick = closeTopicModal;
  $("topic-confirm").onclick = confirmTopic;
  $("conversation-backdrop").onclick = closeConversationModal;
  $("conversation-close").onclick = closeConversationModal;
  $("conversation-save-my").onclick = saveMyConversationText;
  $("conversation-make-agreement").onclick = openAgreementFromConversation;
  listenForConversations();
}
function listenForConversations() {
  if (unsubConversations) unsubConversations();
  unsubConversations = onSnapshot(
    collection(db, "couples", currentCoupleId, "conversations"),
    (snap) => {
      const prevConversations = conversations.slice();

      conversations = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      conversations.sort((a, b) => {
        const at = a.createdAt?.toDate?.() || new Date(0);
        const bt = b.createdAt?.toDate?.() || new Date(0);
        return bt - at;
      });

      renderConversations();
      updateBadges();

      if (conversationsInitialized) {
        detectConversationEvents(prevConversations);
      } else {
        conversationsInitialized = true;
      }
    }
  );
}

function detectConversationEvents(prevConversations) {
  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
  if (!partnerUid) return;

  const partnerName = partnerProfile?.displayName?.trim() || "Партнёр";
  const avatar = {
    letter: getInitials(partnerName).slice(0, 1),
    photoURL: partnerProfile?.photoURL?.trim() || "",
  };

  // 1. Партнёр создал новый разговор
  const prevIds = new Set(prevConversations.map(c => c.id));
  for (const conv of conversations) {
    if (prevIds.has(conv.id)) continue;
    if (conv.createdBy === partnerUid) {
      notifyUser(
        `${partnerName} начал(а) разговор`,
        `Тема: «${conv.topic || "без темы"}»`,
        "conversation",
        { avatar }
      );
    }
  }

  // 2. Партнёр написал в разговор впервые
  const prevMap = new Map(prevConversations.map(c => [c.id, c]));
  for (const conv of conversations) {
    const prev = prevMap.get(conv.id);
    const prevText = prev?.texts?.[partnerUid] || "";
    const currText = conv.texts?.[partnerUid] || "";

    if (!prevText && currText) {
      // Не спамим, если пользователь уже в этом разговоре
      if (currentView === "conversation" && currentConversationId === conv.id) continue;

      notifyUser(
        `Новое сообщение от ${partnerName}`,
        conv.topic ? `Тема: «${conv.topic}»` : "Откройте раздел «Разговор»",
        "conversation",
        { avatar }
      );
    }
  }
}
function renderConversations() {
  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
  const activeBox = $("conversations-active");
  const pastBox = $("conversations-past");
  const pastBlock = $("conversations-past-block");
  if (!activeBox || !pastBox) return;
  const active = [];
  const past = [];
  conversations.forEach(conv => {
    const texts = conv.texts || {};
    const hasBoth = texts[currentUser.uid] && texts[partnerUid];
    if (hasBoth) past.push(conv);
    else active.push(conv);
  });
  const prevActiveIds = collectPrevIds(activeBox);
  const prevPastIds = collectPrevIds(pastBox);

  activeBox.innerHTML = "";
  pastBox.innerHTML = "";
  if (active.length === 0 && past.length === 0) {
    activeBox.innerHTML = emptyStateHtml({
      icon: ICONS.chat,
      title: "Начните первый разговор",
      text: "Выберите тему и напишите, что для вас важно. Партнёр ответит своим — и вы лучше узнаете друг друга."
    });
    pastBlock.classList.add("hidden");
    return;
  }
  if (active.length === 0) {
    activeBox.innerHTML = `<div class="hint" style="text-align:center; padding: 12px;">Нет активных разговоров.</div>`;
  } else {
    active.forEach((conv, i) => {
      const el = buildConvCard(conv, partnerUid);
      markForAnim(el, conv.id, prevActiveIds, i);
      activeBox.appendChild(el);
    });
  }
  if (past.length === 0) pastBlock.classList.add("hidden");
  else {
    pastBlock.classList.remove("hidden");
    past.forEach((conv, i) => {
      const el = buildConvCard(conv, partnerUid);
      markForAnim(el, conv.id, prevPastIds, i);
      pastBox.appendChild(el);
    });
  }
}
function buildConvCard(conv, partnerUid) {
  const texts = conv.texts || {};
  const myText = texts[currentUser.uid] || "";
  const partnerText = texts[partnerUid] || "";
  const card = document.createElement("div");
  card.className = "conv-card";
  card.dataset.animId = conv.id;
  let statusHtml = "";
  if (!myText && !partnerText) statusHtml = `<span class="status-dot waiting"></span> Никто ещё не написал`;
  else if (myText && !partnerText) statusHtml = `<span class="status-dot mine-done"></span> Вы написали, ждём партнёра`;
  else if (!myText && partnerText) statusHtml = `<span class="status-dot waiting"></span> Партнёр написал, ваша очередь`;
  else statusHtml = `<span class="status-dot both-done"></span> Оба написали — можно договориться`;
  card.innerHTML = `
    <button class="conv-delete-btn" data-action="delete-conv" title="Удалить разговор">🗑</button>
    <div class="conv-card-title">${escapeHtml(conv.topic || "Без темы")}</div>
    <div class="conv-card-date">${formatDate(conv.createdAt)}</div>
    <div class="conv-card-status">${statusHtml}</div>
  `;
  card.onclick = () => openConversation(conv.id);
  const delBtn = card.querySelector('[data-action="delete-conv"]');
  if (delBtn) delBtn.addEventListener("click", (e) => { e.stopPropagation(); deleteConversation(conv.id); });
  return card;
}
function openTopicModal() {
  vibrate(10);
  const list = $("topic-list");
  list.innerHTML = "";
  selectedTopic = null;
  if (customTopics.length > 0) {
    customTopics.forEach(t => {
      const btn = document.createElement("button");
      btn.className = "topic-option";
      btn.textContent = t.text;
      btn.onclick = () => {
        selectedTopic = t.text;
        list.querySelectorAll(".topic-option").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        $("topic-custom").value = "";
        vibrate(10);
      };
      list.appendChild(btn);
    });
  }
  CONVERSATION_TOPICS.forEach(topic => {
    const btn = document.createElement("button");
    btn.className = "topic-option";
    btn.textContent = topic;
    btn.onclick = () => {
      selectedTopic = topic;
      list.querySelectorAll(".topic-option").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      $("topic-custom").value = "";
      vibrate(10);
    };
    list.appendChild(btn);
  });
  $("topic-custom").value = "";
  $("topic-save-custom").checked = false;
  $("topic-modal").classList.remove("hidden");
}
function closeTopicModal() { $("topic-modal").classList.add("hidden"); }
async function confirmTopic() {
  const custom = $("topic-custom").value.trim();
  const topic = custom || selectedTopic;
  if (!topic) { alert("Выберите тему или введите свою"); return; }
  $("topic-confirm").disabled = true;
  try {
    if ($("topic-save-custom").checked) {
      const exists = customTopics.some(t => t.text.toLowerCase() === topic.toLowerCase());
      if (!exists) {
        await addDoc(collection(db, "couples", currentCoupleId, "customTopics"), {
          text: topic,
          createdBy: currentUser.uid,
          createdAt: serverTimestamp()
        });
      }
    }
    const ref = await addDoc(collection(db, "couples", currentCoupleId, "conversations"), {
      topic,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      texts: {}
    });
    closeTopicModal();
    vibrate(15);
    setTimeout(() => {
      const conv = conversations.find(c => c.id === ref.id);
      if (conv) openConversation(ref.id);
    }, 400);
  } catch (e) {
    console.error(e);
    alert("Ошибка создания: " + e.message);
  } finally {
    $("topic-confirm").disabled = false;
  }
}
function openConversation(convId) {
  const conv = conversations.find(c => c.id === convId);
  if (!conv) return;
  currentConversationId = convId;
  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
  const texts = conv.texts || {};
  const myText = texts[currentUser.uid] || "";
  const partnerText = texts[partnerUid] || "";
  $("conversation-title").textContent = conv.topic || "Разговор";
  $("conversation-date").textContent = formatDate(conv.createdAt);
  $("conversation-my-text").value = myText;
  const partnerBox = $("conversation-partner-text");
  const agreementBtn = $("conversation-make-agreement");
  const saveBtn = $("conversation-save-my");
  saveBtn.textContent = myText ? "Обновить" : "Сохранить";
  if (myText && partnerText) {
    partnerBox.textContent = partnerText;
    partnerBox.style.fontStyle = "normal";
    partnerBox.style.color = "";
    agreementBtn.classList.remove("hidden");
  } else if (myText && !partnerText) {
    partnerBox.textContent = "Партнёр ещё не написал. Мы скажем, когда он(а) ответит.";
    partnerBox.style.fontStyle = "italic";
    partnerBox.style.color = "var(--muted)";
    agreementBtn.classList.add("hidden");
  } else if (!myText && partnerText) {
    partnerBox.textContent = "Сначала напишите своё — потом увидите, что написал партнёр.";
    partnerBox.style.fontStyle = "italic";
    partnerBox.style.color = "var(--muted)";
    agreementBtn.classList.add("hidden");
  } else {
    partnerBox.textContent = "Пока никто не написал.";
    partnerBox.style.fontStyle = "italic";
    partnerBox.style.color = "var(--muted)";
    agreementBtn.classList.add("hidden");
  }
  $("conversation-modal").classList.remove("hidden");
}
function closeConversationModal() {
  $("conversation-modal").classList.add("hidden");
  currentConversationId = null;
}
async function saveMyConversationText() {
  if (!currentConversationId) return;
  const text = $("conversation-my-text").value.trim();
  if (!text) { alert("Напишите что-нибудь"); return; }
  const btn = $("conversation-save-my");
  btn.disabled = true;
  try {
    const docRef = doc(db, "couples", currentCoupleId, "conversations", currentConversationId);
    const snap = await getDoc(docRef);
    const current = snap.exists() ? (snap.data().texts || {}) : {};
    current[currentUser.uid] = text;
    await updateDoc(docRef, { texts: current });
    const conv = conversations.find(c => c.id === currentConversationId);
    if (conv) conv.texts = current;
    openConversation(currentConversationId);
    vibrate(15);
  } catch (e) {
    console.error(e);
    alert("Ошибка сохранения: " + e.message);
  } finally {
    btn.disabled = false;
  }
}
function openAgreementFromConversation() {
  const conv = conversations.find(c => c.id === currentConversationId);
  if (!conv) return;
  $("agreement-modal-title").textContent = "Новая договорённость";
  $("agreement-title-input").value = conv.topic || "";
  $("agreement-text-input").value = "";
  $("agreement-modal").dataset.fromConversation = currentConversationId || "";
  $("agreement-modal").classList.remove("hidden");
  vibrate(10);
}
async function deleteConversation(id) {
  if (!confirm("Удалить разговор? Это действие нельзя отменить.")) return;
  vibrate(15);
  try {
    await deleteDoc(doc(db, "couples", currentCoupleId, "conversations", id));
  } catch (e) {
    console.error(e);
    alert("Ошибка удаления: " + e.message);
  }
}

/* ---------- СВОИ ТЕМЫ ---------- */
function initCustomTopics() {
  if (unsubCustomTopics) unsubCustomTopics();
  unsubCustomTopics = onSnapshot(
    collection(db, "couples", currentCoupleId, "customTopics"),
    (snap) => {
      customTopics = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      customTopics.sort((a, b) => {
        const at = a.createdAt?.toDate?.() || new Date(0);
        const bt = b.createdAt?.toDate?.() || new Date(0);
        return bt - at;
      });
    }
  );
}

/* ---------- ДОГОВОРЁННОСТИ ---------- */
function initAgreements() {
  $("add-agreement-btn").onclick = () => {
    vibrate(10);
    $("agreement-modal-title").textContent = "Новая договорённость";
    $("agreement-title-input").value = "";
    $("agreement-text-input").value = "";
    $("agreement-modal").dataset.fromConversation = "";
    $("agreement-modal").classList.remove("hidden");
  };
  $("agreement-backdrop").onclick = closeAgreementModal;
  $("close-agreement").onclick = closeAgreementModal;
  $("save-agreement").onclick = saveAgreement;
  listenForAgreements();
}
function closeAgreementModal() { $("agreement-modal").classList.add("hidden"); }
function listenForAgreements() {
  if (unsubAgreements) unsubAgreements();
  unsubAgreements = onSnapshot(
    collection(db, "couples", currentCoupleId, "agreements"),
    (snap) => {
      agreements = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      agreements.sort((a, b) => {
        const at = a.createdAt?.toDate?.() || new Date(0);
        const bt = b.createdAt?.toDate?.() || new Date(0);
        return bt - at;
      });
      renderAgreements();
    }
  );
}
function renderAgreements() {
  const activeBox = $("agreements-list");
  const doneBox = $("agreements-done-list");
  const doneBlock = $("agreements-done-block");
  if (!activeBox || !doneBox) return;
  const active = agreements.filter(a => !a.done);
  const done = agreements.filter(a => a.done);
  const prevActiveIds = collectPrevIds(activeBox);
  const prevDoneIds = collectPrevIds(doneBox);
  activeBox.innerHTML = "";
  doneBox.innerHTML = "";
  if (active.length === 0 && done.length === 0) {
    activeBox.innerHTML = emptyStateHtml({
      icon: ICONS.agreement,
      title: "Пока ни одной договорённости",
      text: "Когда договоритесь о чём-то важном — сохраните здесь. Всегда можно перечитать."
    });
    doneBlock.classList.add("hidden");
    return;
  }
  if (active.length === 0) {
    activeBox.innerHTML = `<div class="hint" style="text-align:center; padding: 12px;">Все договорённости выполнены 🎉</div>`;
  } else {
    active.forEach((a, i) => {
      const el = buildAgreementItem(a, false);
      markForAnim(el, a.id, prevActiveIds, i);
      activeBox.appendChild(el);
    });
  }
  if (done.length === 0) doneBlock.classList.add("hidden");
  else {
    doneBlock.classList.remove("hidden");
    done.forEach((a, i) => {
      const el = buildAgreementItem(a, true);
      markForAnim(el, a.id, prevDoneIds, i);
      doneBox.appendChild(el);
    });
  }
}
function buildAgreementItem(agr, isDone) {
  const div = document.createElement("div");
  div.className = "agreement-item" + (isDone ? " done" : "");
  div.dataset.animId = agr.id;
  const author = agr.createdBy === currentUser.uid ? "вами" : "партнёром";
  const dateStr = formatDate(agr.createdAt);
  div.innerHTML = `
    <div class="agreement-title">${escapeHtml(agr.title || "Без названия")}</div>
    <div class="agreement-text">${escapeHtml(agr.text || "")}</div>
    <div class="agreement-meta">Создано ${author} • ${dateStr}</div>
    <div class="agreement-actions">
      ${isDone
        ? `<button class="done-btn" data-action="undone">↩ Вернуть</button>`
        : `<button class="done-btn" data-action="done">✓ Выполнено</button>`}
      <button class="delete-btn" data-action="delete">🗑 Удалить</button>
    </div>
  `;
  div.querySelector('[data-action="done"]')?.addEventListener("click", () => markAgreementDone(agr.id, true));
  div.querySelector('[data-action="undone"]')?.addEventListener("click", () => markAgreementDone(agr.id, false));
  div.querySelector('[data-action="delete"]')?.addEventListener("click", () => deleteAgreement(agr.id));
  return div;
}
async function saveAgreement() {
  const title = $("agreement-title-input").value.trim();
  const text = $("agreement-text-input").value.trim();
  if (!title) { alert("Введите название договорённости"); return; }
  const fromConversation = $("agreement-modal").dataset.fromConversation || "";
  const btn = $("save-agreement");
  btn.disabled = true;
  try {
    const payload = { title, text, createdBy: currentUser.uid, createdAt: serverTimestamp(), done: false };
    if (fromConversation) payload.fromConversation = fromConversation;
    await addDoc(collection(db, "couples", currentCoupleId, "agreements"), payload);
    closeAgreementModal();
    if (fromConversation) closeConversationModal();
    vibrate(15);
  } catch (e) {
    console.error(e);
    alert("Ошибка сохранения: " + e.message);
  } finally {
    btn.disabled = false;
  }
}
async function markAgreementDone(id, done) {
  vibrate(10);
  try {
    await updateDoc(doc(db, "couples", currentCoupleId, "agreements", id), {
      done,
      doneAt: done ? serverTimestamp() : null
    });
  } catch (e) {
    console.error(e);
    alert("Ошибка: " + e.message);
  }
}
async function deleteAgreement(id) {
  if (!confirm("Удалить договорённость?")) return;
  vibrate(15);
  try {
    await deleteDoc(doc(db, "couples", currentCoupleId, "agreements", id));
  } catch (e) {
    console.error(e);
    alert("Ошибка удаления: " + e.message);
  }
}

/* ---------- ЭКСПОРТ В PDF ---------- */
function initPDFExport() {
  const btn = $("export-pdf-btn");
  if (!btn) return;
  btn.onclick = exportToPDF;
}
async function exportToPDF() {
  const btn = $("export-pdf-btn");
  if (!btn) return;
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Готовим PDF...";
  try {
    if (typeof window.html2pdf === "undefined") {
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    const answersSnap = await getDocs(collection(db, "couples", currentCoupleId, "answers"));
    const byDay = {};
    answersSnap.docs.forEach(d => {
      const data = d.data();
      if (!byDay[data.day]) byDay[data.day] = {};
      byDay[data.day][data.userId] = data;
    });
    const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
    const myName = myProfile?.displayName?.trim() || "Вы";
    const partnerName = partnerProfile?.displayName?.trim() || "Партнёр";
    const dayKeys = Object.keys(byDay).map(Number).sort((a, b) => a - b);
    const bothAnswered = dayKeys.filter(d => byDay[d][currentUser.uid] && byDay[d][partnerUid]);
    const container = document.createElement("div");
    container.className = "pdf-render-container";
    let html = `
      <div class="pdf-cover">
        <h1>Наш год</h1>
        <p class="pdf-names">${escapeHtml(myName)} ❤️ ${escapeHtml(partnerName)}</p>
        <p class="pdf-sub">${bothAnswered.length} ${pluralDays(bothAnswered.length)} с ответами обоих</p>
        <p class="pdf-date">Создано: ${new Date().toLocaleDateString("ru-RU")}</p>
      </div>
    `;
    for (const day of dayKeys) {
      const q = getQuestionForDay(day);
      if (!q) continue;
      const mine = byDay[day][currentUser.uid];
      const partner = byDay[day][partnerUid];
      if (!mine && !partner) continue;
      html += `
        <div class="pdf-day">
          <div class="pdf-day-head">День ${day} • ${escapeHtml(q.theme)}</div>
          <div class="pdf-question">${escapeHtml(q.text)}</div>
          <div class="pdf-answer">
            <div class="pdf-answer-label">${escapeHtml(myName)}</div>
            <div class="pdf-answer-text">${mine ? escapeHtml(mine.text || "(без текста)") : "—"}</div>
          </div>
          <div class="pdf-answer">
            <div class="pdf-answer-label">${escapeHtml(partnerName)}</div>
            <div class="pdf-answer-text">${partner ? escapeHtml(partner.text || "(без текста)") : "—"}</div>
          </div>
        </div>
      `;
    }
    container.innerHTML = html;
    document.body.appendChild(container);
    const filename = `Наш-год-${new Date().toISOString().slice(0, 10)}.pdf`;
    await window.html2pdf().set({
      margin: [15, 15, 15, 15],
      filename: filename,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"], avoid: [".pdf-day", ".pdf-cover"] }
    }).from(container).save();
    container.remove();
    btn.textContent = "✓ Готово!";
    vibrate(20);
    setTimeout(() => { btn.textContent = originalText; }, 2500);
  } catch (e) {
    console.error(e);
    alert("Ошибка при создании PDF: " + e.message);
    btn.textContent = originalText;
  } finally {
    btn.disabled = false;
  }
}

/* ==========================================================
   СОСТОЯНИЕ КНОПКИ «СОХРАНИТЬ ОТВЕТ»
   ========================================================== */

function updateSaveButtonState() {
  const sa = $("save-answer");
  const ta = $("my-answer");
  if (!sa || !ta) return;

  sa.classList.remove("state-idle", "state-saved", "state-saving");

  if (!currentUser || !todayAnswers) {
    sa.textContent = "Сохранить ответ";
    sa.classList.add("state-idle");
    return;
  }

  const myAnswer = todayAnswers.find(a => a.userId === currentUser.uid);
  const savedText = myAnswer ? (myAnswer.text || "") : "";
  const currentText = ta.value;
  const hasChanges = currentText.trim() !== savedText.trim();

  if (myAnswer && !hasChanges) {
    sa.textContent = "✓ Ответ сохранён";
    sa.classList.add("state-saved");
    return;
  }

  sa.textContent = myAnswer ? "Обновить ответ" : "Сохранить ответ";
  sa.classList.add("state-idle");
}

// Навешиваем обработчик ввода на textarea — чтобы кнопка
// переключалась между «Сохранён» и «Обновить» при печати
const myAnswerInput = $("my-answer");
if (myAnswerInput) {
  myAnswerInput.addEventListener("input", updateSaveButtonState);
}
/* ==========================================================
   БЕЙДЖ «СЕГОДНЯ» В НИЖНЕМ БАРЕ
   ========================================================== */

function todaySeenKey(day) {
  return `today-seen-${currentCoupleId}-${day}`;
}

function updateTodayBadge() {
  if (!currentUser || !currentCoupleId) {
    setBadge("badge-today", 0);
    return;
  }

  const day = getCurrentDay();
  const myAnswer = todayAnswers.find(a => a.userId === currentUser.uid);
  const partnerAnswer = todayAnswers.find(a => a.userId !== currentUser.uid);

  // 1. Партнёр ещё не ответил — нечего показывать
  if (!partnerAnswer) {
    setBadge("badge-today", 0);
    return;
  }

  // 2. Партнёр ответил, я ещё нет — бейдж висит, пока не отвечу
  if (!myAnswer) {
    setBadge("badge-today", 1);
    return;
  }

  // 3. Оба ответили. Если я прямо сейчас на «Сегодня» — считаем, что видел.
  if (currentView === "today") {
    localStorage.setItem(todaySeenKey(day), "1");
    setBadge("badge-today", 0);
    return;
  }

  // 4. Оба ответили, но я на другой вкладке
  const seen = localStorage.getItem(todaySeenKey(day)) === "1";
  setBadge("badge-today", seen ? 0 : 1);
}

function markTodaySeen() {
  if (!currentCoupleId) return;
  const day = getCurrentDay();
  const myAnswer = todayAnswers.find(a => a.userId === currentUser.uid);
  // Пока я не ответил — не сбрасываем бейдж (вариант 3 «надо ответить»)
  if (!myAnswer) return;
  localStorage.setItem(todaySeenKey(day), "1");
  updateTodayBadge();
}
/* ==========================================================
   IN-APP БАННЕР + СИСТЕМНЫЕ УВЕДОМЛЕНИЯ
   ========================================================== */

let _bannerEl = null;
let _bannerTimer = null;

function closeBanner() {
  if (!_bannerEl) return;
  clearTimeout(_bannerTimer);
  _bannerEl.classList.remove("is-visible");
  _bannerEl.classList.add("is-dismissed");
  const el = _bannerEl;
  _bannerEl = null;
  setTimeout(() => el.remove(), 500);
}

/**
 * Показывает баннер сверху экрана.
 * @param {string} title   - заголовок
 * @param {string} text    - подзаголовок / тело
 * @param {string} view    - куда перейти по тапу: "today" | "conversation" | "about" | "archive" | null
 * @param {Object} [opts]  - { avatar: {letter, photoURL} }
 */
function showBanner(title, text, view, opts = {}) {
  if (_bannerEl) _bannerEl.remove();

  const avatar = opts.avatar || {};
  const letter = avatar.letter || "❤";
  const photoURL = avatar.photoURL || "";

  const avatarHtml = photoURL
    ? `<img src="${escapeHtml(photoURL)}" alt="">`
    : escapeHtml(letter);

  const el = document.createElement("div");
  el.className = "app-banner";
  el.innerHTML = `
    <div class="app-banner__avatar">${avatarHtml}</div>
    <div class="app-banner__body">
      <div class="app-banner__title">${escapeHtml(title)}</div>
      <div class="app-banner__text">${escapeHtml(text || "")}</div>
    </div>
    <button class="app-banner__close" aria-label="Закрыть">✕</button>
    <div class="app-banner__progress">
      <div class="app-banner__progress-fill"></div>
    </div>
  `;
  document.body.appendChild(el);
  _bannerEl = el;

  requestAnimationFrame(() => el.classList.add("is-visible"));

  // Клик — переход в раздел
  el.addEventListener("click", (e) => {
    if (e.target.closest(".app-banner__close")) return;
    if (view && typeof switchNav === "function") {
      switchNav(view);
    }
    closeBanner();
  });

  // Крестик
  el.querySelector(".app-banner__close").addEventListener("click", (e) => {
    e.stopPropagation();
    closeBanner();
  });

  // Свайп вверх
  let startY = null, dy = 0;
  el.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".app-banner__close")) return;
    startY = e.clientY;
    el.setPointerCapture(e.pointerId);
    el.style.transition = "none";
  });
  el.addEventListener("pointermove", (e) => {
    if (startY === null) return;
    dy = e.clientY - startY;
    if (dy < 0) {
      el.style.transform = `translate(-50%, ${dy}px)`;
      el.style.opacity = String(Math.max(0, 1 + dy / 150));
    }
  });
  el.addEventListener("pointerup", () => {
    if (startY === null) return;
    el.style.transition = "";
    el.style.transform = "";
    el.style.opacity = "";
    if (dy < -60) closeBanner();
    startY = null;
    dy = 0;
  });

  // Авто-скрытие
  _bannerTimer = setTimeout(closeBanner, 5000);
}

/**
 * Универсальная точка оповещения.
 * Если вкладка видна — баннер, если скрыта — системное уведомление.
 */
function notifyUser(title, text, view, opts = {}) {
  vibrate([30, 60, 30]);

  if (document.visibilityState === "visible") {
    showBanner(title, text, view, opts);
    return;
  }

  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;

  try {
    new Notification(title, {
      body: text,
      icon: "./icon-192.png",
      tag: "partner-event-" + (view || "generic"),
      renotify: true,
    });
  } catch (e) {
    console.error("Notification error:", e);
  }
}
/* ==========================================================
   «ДУМАЮ О ТЕБЕ» — сигнал близости
   ========================================================== */

const THINK_COOLDOWN_MS = 60 * 60 * 1000; // 1 час

function thinkCooldownKey() {
  return `think-cooldown-${currentCoupleId}`;
}

function getThinkCooldownRemaining() {
  const last = parseInt(localStorage.getItem(thinkCooldownKey()) || "0");
  const remaining = last + THINK_COOLDOWN_MS - Date.now();
  return remaining > 0 ? remaining : 0;
}

function updateThinkButtonState() {
  const btn = $("think-btn");
  if (!btn) return;

  const remaining = getThinkCooldownRemaining();
  if (remaining <= 0) {
    btn.classList.remove("is-cooldown");
    btn.innerHTML = `<span class="think-btn__emoji">❤️</span>`;
  } else {
    btn.classList.add("is-cooldown");
    const min = Math.ceil(remaining / 60000);
    const label = min >= 60 ? Math.ceil(min / 60) + "ч" : min + "м";
    btn.innerHTML = `<span class="think-btn__cooldown">${label}</span>`;
  }
}

function burstHearts() {
  const btn = $("think-btn");
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (let i = 0; i < 8; i++) {
    const heart = document.createElement("div");
    heart.className = "heart-burst";
    heart.textContent = ["❤️", "💕", "💗", "💖"][i % 4];
    const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
    const dist = 60 + Math.random() * 40;
    heart.style.left = cx + "px";
    heart.style.top = cy + "px";
    heart.style.setProperty("--dx", Math.cos(angle) * dist + "px");
    heart.style.setProperty("--dy", Math.sin(angle) * dist + "px");
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 1200);
  }
}

async function sendThinkSignal() {
  if (!currentUser || !currentCoupleId) return;
  if (getThinkCooldownRemaining() > 0) return;

  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
  if (!partnerUid) return;

  // Визуально сразу откликаемся
  burstHearts();
  vibrate([15, 30, 15]);

  // Оптимистично ставим кулдаун
  localStorage.setItem(thinkCooldownKey(), String(Date.now()));
  updateThinkButtonState();

  try {
    await addDoc(collection(db, "couples", currentCoupleId, "signals"), {
      type: "think",
      fromUserId: currentUser.uid,
      toUserId: partnerUid,
      ts: Date.now(),
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.error("Think signal error:", e);
    // Откатываем кулдаун
    localStorage.removeItem(thinkCooldownKey());
    updateThinkButtonState();
    alert("Не удалось отправить сигнал: " + e.message);
  }
}

function initThinkButton() {
  const btn = $("think-btn");
  if (!btn) return;
  btn.onclick = sendThinkSignal;
  updateThinkButtonState();

  // Обновляем отображение кулдауна раз в 30 секунд
  setInterval(updateThinkButtonState, 30000);
}

function signalsProcessedKey() {
  return `processed-signals-${currentCoupleId}`;
}

function initThinkSignals() {
  if (unsubSignals) unsubSignals();
  signalsInitialized = false;

  const processed = new Set(
    JSON.parse(localStorage.getItem(signalsProcessedKey()) || "[]")
  );

  unsubSignals = onSnapshot(
    collection(db, "couples", currentCoupleId, "signals"),
    (snap) => {
      const signals = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Первый снапшот — просто запоминаем всё как обработанное
      if (!signalsInitialized) {
        signalsInitialized = true;
        signals.forEach(s => processed.add(s.id));
        const keep = [...processed].slice(-100);
        localStorage.setItem(signalsProcessedKey(), JSON.stringify(keep));
        return;
      }

      // Ищем новые сигналы, адресованные мне
      const newForMe = signals.filter(s =>
        s.toUserId === currentUser.uid && !processed.has(s.id)
      );

      if (newForMe.length === 0) return;

      newForMe.forEach(s => processed.add(s.id));
      const keep = [...processed].slice(-100);
      localStorage.setItem(signalsProcessedKey(), JSON.stringify(keep));

      const partnerName = partnerProfile?.displayName?.trim() || "Партнёр";
      const avatar = {
        letter: getInitials(partnerName).slice(0, 1),
        photoURL: partnerProfile?.photoURL?.trim() || ""
      };
      const text = newForMe.length === 1
        ? "Тёплый привет 💛"
        : `×${newForMe.length} 💛`;

      notifyUser(
        `${partnerName} думает о тебе ❤️`,
        text,
        "today",
        { avatar }
      );
    }
  );
}
/* ==========================================================
   ПЛАГИНЫ «ПЛАНЫ» → ЗАДАЧИ
   ========================================================== */

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTaskDue(dueDate, dueTime) {
  if (!dueDate) return null;
  const today = todayISO();
  const tomorrow = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  })();

  let label;
  let cls = "";
  if (dueDate < today) {
    const days = Math.round((new Date(today) - new Date(dueDate)) / 86400000);
    label = `просрочено (${days} ${plural(days, "день", "дня", "дней")})`;
    cls = "overdue";
  } else if (dueDate === today) {
    label = "сегодня";
    cls = "soon";
  } else if (dueDate === tomorrow) {
    label = "завтра";
  } else {
    const [y, m, d] = dueDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    label = dt.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  }

  const time = dueTime ? ` <span class="time">${dueTime}</span>` : "";
  return { html: `📅 ${label}${time}`, cls };
}

function initTasks() {
  $("add-task-btn").onclick = () => openTaskModal(null);
  $("task-backdrop").onclick = closeTaskModal;
  $("task-cancel-btn").onclick = closeTaskModal;
  $("task-save-btn").onclick = saveTask;
  $("task-delete-btn").onclick = deleteTaskFromModal;

  document.querySelectorAll("#task-who-picker .who-option").forEach(btn => {
    btn.onclick = () => {
      vibrate(10);
      selectedTaskWho = btn.dataset.who;
      document.querySelectorAll("#task-who-picker .who-option").forEach(b => {
        b.classList.remove("active", "me", "partner", "none");
      });
      btn.classList.add("active", selectedTaskWho);
    };
  });

  document.querySelectorAll("#tasks-filters .filter-chip").forEach(chip => {
    chip.onclick = () => {
      vibrate(10);
      currentTasksFilter = chip.dataset.filter;
      document.querySelectorAll("#tasks-filters .filter-chip").forEach(c => {
        c.classList.toggle("active", c.dataset.filter === currentTasksFilter);
      });
      renderTasks();
    };
  });

  listenForTasks();
}

function listenForTasks() {
  if (unsubTasks) unsubTasks();
  tasksInitialized = false;

  unsubTasks = onSnapshot(
    collection(db, "couples", currentCoupleId, "tasks"),
    (snap) => {
      const prevTasks = tasks.slice();
      tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      renderTasks();
      updateBadges();

      if (tasksInitialized) {
        detectTaskEvents(prevTasks);
      } else {
        tasksInitialized = true;
      }
    }
  );
}

function detectTaskEvents(prevTasks) {
  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
  if (!partnerUid) return;

  const partnerName = partnerProfile?.displayName?.trim() || "Партнёр";
  const avatar = {
    letter: getInitials(partnerName).slice(0, 1),
    photoURL: partnerProfile?.photoURL?.trim() || ""
  };

  const prevMap = new Map(prevTasks.map(t => [t.id, t]));

  for (const task of tasks) {
    const prev = prevMap.get(task.id);
    if (!prev) {
      // Новая задача
      if (task.createdBy === partnerUid && task.assignee === currentUser.uid) {
        notifyUser(
          `${partnerName} назначила тебе задачу`,
          `«${task.title}»`,
          "plans",
          { avatar }
        );
      } else if (task.createdBy === partnerUid && !task.assignee) {
        notifyUser(
          `${partnerName} добавила задачу`,
          `«${task.title}»`,
          "plans",
          { avatar }
        );
      }
    } else {
      // Изменение существующей
      // Партнёр взял свободную задачу, которую создал я
      if (!prev.assignee && task.assignee === partnerUid && task.createdBy === currentUser.uid) {
        notifyUser(
          `${partnerName} взяла задачу`,
          `«${task.title}»`,
          "plans",
          { avatar }
        );
      }
      // Партнёр выполнил задачу, которую создал я
      if (!prev.done && task.done && task.createdBy === currentUser.uid && task.doneBy === partnerUid) {
        notifyUser(
          `${partnerName} выполнила задачу`,
          `«${task.title}»`,
          "plans",
          { avatar }
        );
      }
    }
  }
}

function sortTasks(arr) {
  const today = todayISO();
  return arr.sort((a, b) => {
    // Выполненные — всегда вниз (сортируются отдельно)
    if (a.done !== b.done) return a.done ? 1 : -1;

    const aDate = a.dueDate || "";
    const bDate = b.dueDate || "";

    // Просроченные — вверх
    const aOverdue = aDate && aDate < today;
    const bOverdue = bDate && bDate < today;
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

    // С датой — раньше по дате
    if (aDate && !bDate) return -1;
    if (!aDate && bDate) return 1;
    if (aDate && bDate && aDate !== bDate) return aDate < bDate ? -1 : 1;

    // Одинаковая дата — по времени
    const aTime = a.dueTime || "99:99";
    const bTime = b.dueTime || "99:99";
    if (aTime !== bTime) return aTime < bTime ? -1 : 1;

    // Иначе по createdAt (свежие сверху)
    const at = a.createdAt?.toDate?.()?.getTime?.() || 0;
    const bt = b.createdAt?.toDate?.()?.getTime?.() || 0;
    return bt - at;
  });
}

function renderTasks() {
  const container = $("tasks-active-list");
  const doneBlock = $("tasks-done-block");
  const doneList = $("tasks-done-list");
  if (!container || !doneBlock || !doneList) return;

  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);

  let filtered = tasks.filter(t => {
    if (currentTasksFilter === "active") return !t.done;
    if (currentTasksFilter === "mine") return !t.done && t.assignee === currentUser.uid;
    if (currentTasksFilter === "partner") return !t.done && t.assignee === partnerUid;
    if (currentTasksFilter === "free") return !t.done && !t.assignee;
    return true;
  });

  const active = sortTasks(filtered.filter(t => !t.done));
  const done = sortTasks(tasks.filter(t => t.done));

  const prevActiveIds = collectPrevIds(container);
  const prevDoneIds = collectPrevIds(doneList);

  container.innerHTML = "";
  doneList.innerHTML = "";

  // Пустое состояние
  if (active.length === 0) {
    const emptyText = currentTasksFilter === "mine"
      ? "У вас пока нет задач"
      : currentTasksFilter === "partner"
      ? "У партнёра пока нет задач"
      : currentTasksFilter === "free"
      ? "Нет свободных задач"
      : "Активных задач нет — можно отдохнуть 💛";
    container.innerHTML = emptyStateHtml({
      icon: ICONS.book,
      title: "Пусто",
      text: emptyText
    });
  } else {
    active.forEach((t, i) => {
      const el = buildTaskItem(t);
      markForAnim(el, t.id, prevActiveIds, i);
      container.appendChild(el);
    });
  }

  if (done.length === 0) {
    doneBlock.classList.add("hidden");
  } else {
    doneBlock.classList.remove("hidden");
    done.forEach((t, i) => {
      const el = buildTaskItem(t);
      markForAnim(el, t.id, prevDoneIds, i);
      doneList.appendChild(el);
    });
  }
}

function buildTaskItem(task) {
  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
  const div = document.createElement("div");
  div.className = "task-item";
  div.dataset.animId = task.id;
  if (task.done) div.classList.add("done");
  if (task.assignee === currentUser.uid) div.classList.add("who-me");
  else if (task.assignee === partnerUid) div.classList.add("who-partner");
  else div.classList.add("who-none");

  const whoLabel = task.assignee === currentUser.uid ? "Я"
                  : task.assignee === partnerUid ? (partnerProfile?.displayName?.trim() || "Партнёр")
                  : "Свободная";

  const due = formatTaskDue(task.dueDate, task.dueTime);
  const dueHtml = due
    ? `<span class="due ${due.cls}">${due.html}</span>`
    : (task.done && task.doneAt?.toDate
        ? `<span class="due">📅 выполнено</span>`
        : "");

  div.innerHTML = `
    <button class="task-check" data-action="toggle">${task.done ? "✓" : ""}</button>
    <div class="task-body" data-action="edit">
      <div class="task-title">${escapeHtml(task.title)}</div>
      <div class="task-meta">
        <span class="who"><span class="dot"></span> ${escapeHtml(whoLabel)}</span>
        ${dueHtml}
      </div>
    </div>
    ${!task.assignee && !task.done ? `<button class="take-btn" data-action="take">Беру</button>` : ""}
  `;

  const checkBtn = div.querySelector('[data-action="toggle"]');
  if (checkBtn) {
    checkBtn.onclick = (e) => {
      e.stopPropagation();
      toggleTaskDone(task.id, !task.done);
    };
  }

  const takeBtn = div.querySelector('[data-action="take"]');
  if (takeBtn) {
    takeBtn.onclick = (e) => {
      e.stopPropagation();
      takeTask(task.id);
    };
  }

  const body = div.querySelector('[data-action="edit"]');
  if (body) {
    body.onclick = () => openTaskModal(task.id);
  }

  return div;
}

async function toggleTaskDone(taskId, done) {
  vibrate(done ? 15 : 10);
  try {
    const update = {
      done,
      doneAt: done ? serverTimestamp() : null,
      doneBy: done ? currentUser.uid : null,
      updatedAt: serverTimestamp()
    };
    await updateDoc(doc(db, "couples", currentCoupleId, "tasks", taskId), update);
  } catch (e) {
    console.error(e);
    alert("Ошибка: " + e.message);
  }
}

async function takeTask(taskId) {
  vibrate(15);
  try {
    await updateDoc(doc(db, "couples", currentCoupleId, "tasks", taskId), {
      assignee: currentUser.uid,
      updatedAt: serverTimestamp()
    });
  } catch (e) {
    console.error(e);
    alert("Ошибка: " + e.message);
  }
}

function openTaskModal(taskId) {
  editingTaskId = taskId;
  const isEdit = !!taskId;

  const titleEl = $("task-modal-title");
  titleEl.textContent = isEdit ? "Редактировать задачу" : "Новая задача";

  const deleteBtn = $("task-delete-btn");
  deleteBtn.classList.toggle("hidden", !isEdit);

  if (isEdit) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    $("task-title-input").value = task.title || "";
    $("task-due-date").value = task.dueDate || "";
    $("task-due-time").value = task.dueTime || "";
    $("task-note-input").value = task.note || "";

    const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
    if (task.assignee === currentUser.uid) selectedTaskWho = "me";
    else if (task.assignee === partnerUid) selectedTaskWho = "partner";
    else selectedTaskWho = "none";
  } else {
    $("task-title-input").value = "";
    $("task-due-date").value = "";
    $("task-due-time").value = "";
    $("task-note-input").value = "";
    selectedTaskWho = "none";
  }

  document.querySelectorAll("#task-who-picker .who-option").forEach(b => {
    b.classList.remove("active", "me", "partner", "none");
    if (b.dataset.who === selectedTaskWho) {
      b.classList.add("active", selectedTaskWho);
    }
  });

  $("task-modal").classList.remove("hidden");
  setTimeout(() => $("task-title-input").focus(), 100);
}

function closeTaskModal() {
  $("task-modal").classList.add("hidden");
  editingTaskId = null;
}

async function saveTask() {
  const title = $("task-title-input").value.trim();
  if (!title) { alert("Введите название задачи"); return; }

  const dueDate = $("task-due-date").value || null;
  const dueTime = $("task-due-time").value || null;
  const note = $("task-note-input").value.trim();

  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
  let assignee = null;
  if (selectedTaskWho === "me") assignee = currentUser.uid;
  else if (selectedTaskWho === "partner") assignee = partnerUid;

  const btn = $("task-save-btn");
  btn.disabled = true;

  try {
    if (editingTaskId) {
      await updateDoc(doc(db, "couples", currentCoupleId, "tasks", editingTaskId), {
        title, assignee, dueDate, dueTime, note,
        updatedAt: serverTimestamp()
      });
    } else {
      await addDoc(collection(db, "couples", currentCoupleId, "tasks"), {
        title,
        assignee,
        dueDate,
        dueTime,
        note,
        done: false,
        doneAt: null,
        doneBy: null,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    vibrate(15);
    closeTaskModal();
  } catch (e) {
    console.error(e);
    alert("Ошибка сохранения: " + e.message);
  } finally {
    btn.disabled = false;
  }
}

async function deleteTaskFromModal() {
  if (!editingTaskId) return;
  if (!confirm("Удалить задачу? Это действие нельзя отменить.")) return;
  try {
    await deleteDoc(doc(db, "couples", currentCoupleId, "tasks", editingTaskId));
    vibrate(15);
    closeTaskModal();
  } catch (e) {
    console.error(e);
    alert("Ошибка удаления: " + e.message);
  }
}

function updateTasksBadge() {
  if (!currentUser || !currentCoupleId) {
    setBadge("badge-plans", 0);
    return;
  }
  // Считаем: сколько задач на мне + сколько свободных
  const activeMineOrFree = tasks.filter(t => !t.done && (!t.assignee || t.assignee === currentUser.uid)).length;
  setBadge("badge-plans", activeMineOrFree);
}
/* ==========================================================
   ПЛАГИНЫ «ПЛАНЫ» → ЗАМЕТКИ
   ========================================================== */

function formatNoteTimeShort(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "сейчас";
  if (diffMin < 60) return diffMin + "м";
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return diffH + "ч";
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "вчера";
  if (diffD < 7) return diffD + "д";
  if (diffD < 14) return "неделю";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function formatNoteTimeFull(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const y = new Date(now); y.setDate(y.getDate() - 1);
  const isYesterday = d.toDateString() === y.toDateString();
  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `сегодня, ${time}`;
  if (isYesterday) return `вчера, ${time}`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

function initNotes() {
  $("add-sticker-btn").onclick = () => openStickerModal(null);
  $("add-note-btn").onclick = () => openNoteModal(null);

  $("sticker-backdrop").onclick = closeNoteModals;
  $("sticker-cancel-btn").onclick = closeNoteModals;
  $("sticker-save-btn").onclick = saveSticker;
  $("sticker-delete-btn").onclick = deleteNoteFromModal;

  $("note-backdrop").onclick = closeNoteModals;
  $("note-cancel-btn").onclick = closeNoteModals;
  $("note-save-btn").onclick = saveNote;
  $("note-delete-btn").onclick = deleteNoteFromModal;

  document.querySelectorAll("#sticker-color-picker .color-dot").forEach(dot => {
    dot.onclick = () => {
      vibrate(10);
      selectedStickerColor = Number(dot.dataset.color);
      document.querySelectorAll("#sticker-color-picker .color-dot").forEach(d => {
        d.classList.toggle("active", Number(d.dataset.color) === selectedStickerColor);
      });
    };
  });

  listenForNotes();
}

function listenForNotes() {
  if (unsubNotes) unsubNotes();
  notesInitialized = false;

  unsubNotes = onSnapshot(
    collection(db, "couples", currentCoupleId, "notes"),
    (snap) => {
      const prevNotes = notes.slice();
      notes = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      renderNotes();

      if (notesInitialized) {
        detectNoteEvents(prevNotes);
      } else {
        notesInitialized = true;
      }
    }
  );
}

function detectNoteEvents(prevNotes) {
  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
  if (!partnerUid) return;

  const prevIds = new Set(prevNotes.map(n => n.id));
  const partnerName = partnerProfile?.displayName?.trim() || "Партнёр";
  const avatar = {
    letter: getInitials(partnerName).slice(0, 1),
    photoURL: partnerProfile?.photoURL?.trim() || ""
  };

  for (const note of notes) {
    if (prevIds.has(note.id)) continue;
    if (note.createdBy !== partnerUid) continue;

    const typeLabel = note.type === "sticker" ? "стикер" : "заметку";
    const preview = (note.text || "").slice(0, 60);
    notifyUser(
      `${partnerName} оставила ${typeLabel}`,
      preview + ((note.text || "").length > 60 ? "…" : ""),
      "plans",
      { avatar }
    );
  }
}

function renderNotes() {
  const stickerContainer = $("stickers-container");
  const notesContainer = $("notes-container");
  if (!stickerContainer || !notesContainer) return;

  const sortFn = (a, b) => {
    const at = a.createdAt?.toDate?.()?.getTime?.() || 0;
    const bt = b.createdAt?.toDate?.()?.getTime?.() || 0;
    return bt - at;
  };
  const stickers = notes.filter(n => n.type === "sticker").sort(sortFn);
  const longNotes = notes.filter(n => n.type === "long").sort(sortFn);

  const prevStickerIds = collectPrevIds(stickerContainer);
  const prevNoteIds = collectPrevIds(notesContainer);

  stickerContainer.innerHTML = "";
  notesContainer.innerHTML = "";

  if (stickers.length === 0 && longNotes.length === 0) {
    stickerContainer.innerHTML = emptyStateHtml({
      icon: ICONS.book,
      title: "Пока пусто",
      text: "Стикеры — для быстрых мыслей. Заметки — для длинных записей. Оба типа видны вам двоим."
    });
    return;
  }

  if (stickers.length > 0) {
    const grid = document.createElement("div");
    grid.className = "sticker-grid";
    stickers.forEach((s, i) => {
      const el = buildStickerCard(s);
      markForAnim(el, s.id, prevStickerIds, i);
      grid.appendChild(el);
    });
    stickerContainer.appendChild(grid);
  }

  if (longNotes.length > 0) {
    if (stickers.length > 0) {
      const divider = document.createElement("div");
      divider.className = "section-divider";
      divider.textContent = "Заметки";
      notesContainer.appendChild(divider);
    }
    longNotes.forEach((n, i) => {
      const el = buildLongNoteCard(n);
      markForAnim(el, n.id, prevNoteIds, i);
      notesContainer.appendChild(el);
    });
  }
}

function buildStickerCard(note) {
  const isMine = note.createdBy === currentUser.uid;
  const authorName = isMine
    ? (myProfile?.displayName?.trim() || "Я")
    : (partnerProfile?.displayName?.trim() || "Партнёр");
  const colorIdx = (typeof note.color === "number" && note.color >= 0 && note.color <= 5)
    ? note.color : 0;

  const div = document.createElement("div");
  div.className = `sticker color-${colorIdx}`;
  div.dataset.animId = note.id;
  div.innerHTML = `
    <div class="sticker-text">${escapeHtml(note.text || "")}</div>
    <div class="sticker-meta">
      <span class="sticker-author">${escapeHtml(authorName)}</span>
      <span class="sticker-time">${formatNoteTimeShort(note.createdAt)}</span>
    </div>
  `;
  div.onclick = () => openStickerModal(note.id);
  return div;
}

function buildLongNoteCard(note) {
  const isMine = note.createdBy === currentUser.uid;
  const authorName = isMine
    ? (myProfile?.displayName?.trim() || "Я")
    : (partnerProfile?.displayName?.trim() || "Партнёр");

  const div = document.createElement("div");
  div.className = `long-note ${isMine ? "author-me" : "author-partner"}`;
  div.dataset.animId = note.id;
  div.innerHTML = `
    <div class="long-note-text">${escapeHtml(note.text || "")}</div>
    <div class="long-note-meta">
      <span class="long-note-author"><span class="dot"></span> ${escapeHtml(authorName)}</span>
      <span>${formatNoteTimeFull(note.createdAt)}</span>
    </div>
  `;
  div.onclick = () => openNoteModal(note.id);
  return div;
}

function openStickerModal(noteId) {
  editingNoteId = noteId;
  const isEdit = !!noteId;
  const titleEl = $("sticker-modal-title");
  const deleteBtn = $("sticker-delete-btn");
  const saveBtn = $("sticker-save-btn");
  const ta = $("sticker-text-input");

  if (isEdit) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    const isMine = note.createdBy === currentUser.uid;

    ta.value = note.text || "";
    ta.readOnly = !isMine;
    selectedStickerColor = (typeof note.color === "number") ? note.color : 0;
    titleEl.textContent = isMine ? "Редактировать стикер" : "Стикер партнёра";
    saveBtn.classList.toggle("hidden", !isMine);
    deleteBtn.classList.toggle("hidden", !isMine);
  } else {
    ta.value = "";
    ta.readOnly = false;
    selectedStickerColor = 0;
    titleEl.textContent = "Новый стикер";
    saveBtn.classList.remove("hidden");
    deleteBtn.classList.add("hidden");
  }

  document.querySelectorAll("#sticker-color-picker .color-dot").forEach(d => {
    d.classList.toggle("active", Number(d.dataset.color) === selectedStickerColor);
  });

  $("sticker-modal").classList.remove("hidden");
  setTimeout(() => { if (!ta.readOnly) ta.focus(); }, 100);
}

function openNoteModal(noteId) {
  editingNoteId = noteId;
  const isEdit = !!noteId;
  const titleEl = $("note-modal-title");
  const deleteBtn = $("note-delete-btn");
  const saveBtn = $("note-save-btn");
  const ta = $("note-text-input");

  if (isEdit) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    const isMine = note.createdBy === currentUser.uid;

    ta.value = note.text || "";
    ta.readOnly = !isMine;
    titleEl.textContent = isMine ? "Редактировать заметку" : "Заметка партнёра";
    saveBtn.classList.toggle("hidden", !isMine);
    deleteBtn.classList.toggle("hidden", !isMine);
  } else {
    ta.value = "";
    ta.readOnly = false;
    titleEl.textContent = "Новая заметка";
    saveBtn.classList.remove("hidden");
    deleteBtn.classList.add("hidden");
  }

  $("note-modal").classList.remove("hidden");
  setTimeout(() => { if (!ta.readOnly) ta.focus(); }, 100);
}

function closeNoteModals() {
  $("sticker-modal").classList.add("hidden");
  $("note-modal").classList.add("hidden");
  editingNoteId = null;
}

async function saveSticker() {
  const text = $("sticker-text-input").value.trim();
  if (!text) { alert("Введите текст стикера"); return; }

  const btn = $("sticker-save-btn");
  btn.disabled = true;
  try {
    if (editingNoteId) {
      await updateDoc(doc(db, "couples", currentCoupleId, "notes", editingNoteId), {
        text,
        color: selectedStickerColor,
        updatedAt: serverTimestamp()
      });
    } else {
      await addDoc(collection(db, "couples", currentCoupleId, "notes"), {
        type: "sticker",
        text,
        color: selectedStickerColor,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    vibrate(15);
    closeNoteModals();
  } catch (e) {
    console.error(e);
    alert("Ошибка: " + e.message);
  } finally {
    btn.disabled = false;
  }
}

async function saveNote() {
  const text = $("note-text-input").value.trim();
  if (!text) { alert("Введите текст заметки"); return; }

  const btn = $("note-save-btn");
  btn.disabled = true;
  try {
    if (editingNoteId) {
      await updateDoc(doc(db, "couples", currentCoupleId, "notes", editingNoteId), {
        text,
        updatedAt: serverTimestamp()
      });
    } else {
      await addDoc(collection(db, "couples", currentCoupleId, "notes"), {
        type: "long",
        text,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    vibrate(15);
    closeNoteModals();
  } catch (e) {
    console.error(e);
    alert("Ошибка: " + e.message);
  } finally {
    btn.disabled = false;
  }
}

async function deleteNoteFromModal() {
  if (!editingNoteId) return;
  if (!confirm("Удалить? Это действие нельзя отменить.")) return;
  try {
    await deleteDoc(doc(db, "couples", currentCoupleId, "notes", editingNoteId));
    vibrate(15);
    closeNoteModals();
  } catch (e) {
    console.error(e);
    alert("Ошибка удаления: " + e.message);
  }
}
/* ==========================================================
   ПЛАГИНЫ «ПЛАНЫ» → КАЛЕНДАРЬ
   ========================================================== */

function pad2(n) { return String(n).padStart(2, "0"); }

function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseISODate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/* Проверяет, попадает ли событие в указанную дату (учитывая повторы) */
function eventMatchesDate(ev, targetDate) {
  if (!ev.date) return false;
  const start = parseISODate(ev.date);
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());

  // Событие не может быть раньше даты старта
  if (target < startDay) return false;

  if (ev.repeat === "year") {
    return target.getMonth() === start.getMonth() && target.getDate() === start.getDate();
  }
  if (ev.repeat === "month") {
    return target.getDate() === start.getDate();
  }
  if (ev.repeat === "week") {
    return target.getDay() === start.getDay();
  }
  // none
  return target.getTime() === startDay.getTime();
}

/* Возвращает события на конкретную дату, отсортированные */
function getEventsForDate(date, eventsArr) {
  const result = eventsArr.filter(ev => eventMatchesDate(ev, date));
  return sortEvents(result);
}

/* Сортировка событий: по времени, потом по названию */
function sortEvents(arr) {
  return arr.slice().sort((a, b) => {
    const at = a.time || "99:99";
    const bt = b.time || "99:99";
    if (at !== bt) return at < bt ? -1 : 1;
    return (a.title || "").localeCompare(b.title || "");
  });
}

function initEvents() {
  $("cal-prev").onclick = () => {
    vibrate(10);
    currentCalMonth--;
    if (currentCalMonth < 0) { currentCalMonth = 11; currentCalYear--; }
    selectedCalDate = null;
    renderCalendar();
    renderEventsList();
  };
  $("cal-next").onclick = () => {
    vibrate(10);
    currentCalMonth++;
    if (currentCalMonth > 11) { currentCalMonth = 0; currentCalYear++; }
    selectedCalDate = null;
    renderCalendar();
    renderEventsList();
  };

  $("add-event-btn").onclick = () => openEventModal(null);
  $("event-backdrop").onclick = closeEventModal;
  $("event-cancel-btn").onclick = closeEventModal;
  $("event-save-btn").onclick = saveEvent;
  $("event-delete-btn").onclick = deleteEventFromModal;

  document.querySelectorAll("#event-repeat-picker .repeat-option").forEach(btn => {
    btn.onclick = () => {
      vibrate(10);
      selectedEventRepeat = btn.dataset.repeat;
      document.querySelectorAll("#event-repeat-picker .repeat-option").forEach(b => {
        b.classList.toggle("active", b.dataset.repeat === selectedEventRepeat);
      });
    };
  });

  listenForEvents();
}

function listenForEvents() {
  if (unsubEvents) unsubEvents();
  eventsInitialized = false;

  unsubEvents = onSnapshot(
    collection(db, "couples", currentCoupleId, "events"),
    (snap) => {
      const prevEvents = events.slice();
      events = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      renderCalendar();
      renderEventsList();

      if (eventsInitialized) {
        detectEventChanges(prevEvents);
      } else {
        eventsInitialized = true;
      }
    }
  );
}

function detectEventChanges(prevEvents) {
  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
  if (!partnerUid) return;

  const prevIds = new Set(prevEvents.map(e => e.id));
  const partnerName = partnerProfile?.displayName?.trim() || "Партнёр";
  const avatar = {
    letter: getInitials(partnerName).slice(0, 1),
    photoURL: partnerProfile?.photoURL?.trim() || ""
  };

  for (const ev of events) {
    if (prevIds.has(ev.id)) continue;
    if (ev.createdBy !== partnerUid) continue;

    notifyUser(
      `${partnerName} добавила событие`,
      ev.title || "Без названия",
      "plans",
      { avatar }
    );
  }
}

function renderCalendar() {
  const grid = $("cal-grid");
  const label = $("cal-month-label");
  if (!grid || !label) return;

  const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
                      "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  label.textContent = `${monthNames[currentCalMonth]} ${currentCalYear}`;

  // Первый день месяца
  const firstDay = new Date(currentCalYear, currentCalMonth, 1);
  // День недели первого дня: 0 = Пн по нашей сетке
  const startDow = (firstDay.getDay() + 6) % 7;

  const daysInMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();
  const prevMonthDays = new Date(currentCalYear, currentCalMonth, 0).getDate();

  const todayISOStr = todayISO();
  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);

  grid.innerHTML = "";

  // Заголовки дней
  ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].forEach(d => {
    const el = document.createElement("div");
    el.className = "cal-dayname";
    el.textContent = d;
    grid.appendChild(el);
  });

  // Ячейки
  const totalCells = 42;
  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement("div");
    cell.className = "cal-day";

    let dateObj;
    let isOtherMonth = false;

    if (i < startDow) {
      // Прошлый месяц
      const dayNum = prevMonthDays - (startDow - i) + 1;
      dateObj = new Date(currentCalYear, currentCalMonth - 1, dayNum);
      isOtherMonth = true;
    } else if (i >= startDow + daysInMonth) {
      // Следующий месяц
      const dayNum = i - (startDow + daysInMonth) + 1;
      dateObj = new Date(currentCalYear, currentCalMonth + 1, dayNum);
      isOtherMonth = true;
    } else {
      const dayNum = i - startDow + 1;
      dateObj = new Date(currentCalYear, currentCalMonth, dayNum);
    }

    const iso = toISODate(dateObj);
    cell.textContent = dateObj.getDate();

    if (isOtherMonth) {
      cell.classList.add("other-month");
    } else {
      // Проверяем события
      const dayEvents = getEventsForDate(dateObj, events);
      const hasMine = dayEvents.some(e => e.createdBy === currentUser.uid);
      const hasPartner = dayEvents.some(e => e.createdBy === partnerUid);

      if (dayEvents.length > 0) cell.classList.add("has-events");
      if (iso === todayISOStr) cell.classList.add("today");
      if (selectedCalDate === iso) cell.classList.add("selected");

      if (hasMine || hasPartner) {
        const dots = document.createElement("div");
        dots.className = "dots";
        if (hasMine) {
          const d = document.createElement("span");
          d.className = "dot mine";
          dots.appendChild(d);
        }
        if (hasPartner) {
          const d = document.createElement("span");
          d.className = "dot partner";
          dots.appendChild(d);
        }
        cell.appendChild(dots);
      }

      cell.onclick = () => {
        vibrate(10);
        selectedCalDate = (selectedCalDate === iso) ? null : iso;
        renderCalendar();
        renderEventsList();
      };
    }

    grid.appendChild(cell);
  }
}

function renderEventsList() {
  const container = $("events-list");
  if (!container) return;
  const prevEventIds = collectPrevIds(container);
  container.innerHTML = "";

  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
  const todayDate = new Date();
  const todayISOStr = todayISO();

  // Если выбран день — показываем его первым
  if (selectedCalDate) {
    const selDate = parseISODate(selectedCalDate);
    const dayEvents = getEventsForDate(selDate, events);

    const title = document.createElement("div");
    title.className = "events-title";
    const dateLabel = selDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
    title.innerHTML = `<span>${dateLabel}</span>`;
    const clearBtn = document.createElement("span");
    clearBtn.className = "clear-selection";
    clearBtn.textContent = "Сбросить выбор";
    clearBtn.onclick = () => {
      selectedCalDate = null;
      renderCalendar();
      renderEventsList();
    };
    title.appendChild(clearBtn);
    container.appendChild(title);

    if (dayEvents.length === 0) {
      const empty = document.createElement("div");
      empty.className = "events-empty";
      empty.textContent = "На этот день ничего нет.";
      container.appendChild(empty);
    } else {
      dayEvents.forEach((ev, i) => {
        const el = buildEventItem(ev, selDate);
        markForAnim(el, ev.id, prevEventIds, i);
        container.appendChild(el);
      });
    }
    return;
  }

  // Иначе: «Сегодня» + «Ближайшие 30 дней»
  const todayEvents = getEventsForDate(todayDate, events);
  if (todayEvents.length > 0) {
    const title = document.createElement("div");
    title.className = "events-title";
    title.textContent = "Сегодня";
    container.appendChild(title);
    todayEvents.forEach((ev, i) => {
      const el = buildEventItem(ev, todayDate);
      markForAnim(el, ev.id, prevEventIds, i);
      container.appendChild(el);
    });
  }

  // Ближайшие 30 дней (начиная с завтра)
  const upcoming = [];
  for (let i = 1; i <= 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const evs = getEventsForDate(d, events);
    evs.forEach(ev => upcoming.push({ ev, date: new Date(d) }));
  }

  if (upcoming.length === 0 && todayEvents.length === 0) {
    const empty = document.createElement("div");
    empty.className = "events-empty";
    empty.textContent = "Пока нет ближайших событий. Добавьте годовщины, ДР родных, встречи — и они появятся здесь.";
    container.appendChild(empty);
    return;
  }

  if (upcoming.length > 0) {
    const title = document.createElement("div");
    title.className = "events-title";
    title.style.marginTop = todayEvents.length > 0 ? "16px" : "0";
    title.textContent = "Ближайшие 30 дней";
    container.appendChild(title);
    upcoming.forEach(({ ev, date }, i) => {
      const el = buildEventItem(ev, date);
      markForAnim(el, ev.id, prevEventIds, i);
      container.appendChild(el);
    });
  }
}

function buildEventItem(ev, dateObj) {
  const isMine = ev.createdBy === currentUser.uid;
  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
  const authorName = isMine
    ? (myProfile?.displayName?.trim() || "Я")
    : (partnerProfile?.displayName?.trim() || "Партнёр");

  const div = document.createElement("div");
  div.className = `event-item ${isMine ? "author-me" : "author-partner"}`;
  div.dataset.animId = ev.id;

  const day = dateObj.getDate();
  const monthShort = dateObj.toLocaleDateString("ru-RU", { month: "short" }).replace(".", "");

  // Повтор
  let repeatBadge = "";
  if (ev.repeat === "year") repeatBadge = `<span class="repeat-badge">каждый год</span>`;
  else if (ev.repeat === "month") repeatBadge = `<span class="repeat-badge">каждый месяц</span>`;
  else if (ev.repeat === "week") repeatBadge = `<span class="repeat-badge">каждую неделю</span>`;

  // «Скоро»-бейдж для ближайших дней
  let soonBadge = "";
  const todayISOStr = todayISO();
  const targetISO = toISODate(dateObj);
  if (targetISO !== todayISOStr) {
    const diffDays = Math.round((parseISODate(targetISO) - parseISODate(todayISOStr)) / 86400000);
    if (diffDays === 1) soonBadge = `<span class="soon-badge">завтра</span>`;
    else if (diffDays === 2) soonBadge = `<span class="soon-badge">через 2 дня</span>`;
    else if (diffDays === 3) soonBadge = `<span class="soon-badge">через 3 дня</span>`;
  }

  div.innerHTML = `
    <div class="event-date">
      <div class="event-day">${day}</div>
      <div class="event-month">${monthShort}</div>
    </div>
    <div class="event-body">
      <div class="event-title">${escapeHtml(ev.title || "Без названия")}</div>
      <div class="event-sub">
        <span class="time">${ev.time ? ev.time : "весь день"}</span>
        <span class="author">${escapeHtml(authorName)}</span>
        ${repeatBadge}
        ${soonBadge}
      </div>
    </div>
  `;
  div.onclick = () => openEventModal(ev.id);
  return div;
}

function openEventModal(eventId) {
  editingEventId = eventId;
  const isEdit = !!eventId;

  const titleEl = $("event-modal-title");
  const deleteBtn = $("event-delete-btn");

  if (isEdit) {
    const ev = events.find(e => e.id === eventId);
    if (!ev) return;
    titleEl.textContent = "Редактировать событие";
    deleteBtn.classList.remove("hidden");
    $("event-title-input").value = ev.title || "";
    $("event-date-input").value = ev.date || "";
    $("event-time-input").value = ev.time || "";
    $("event-note-input").value = ev.note || "";
    selectedEventRepeat = ev.repeat || "none";
  } else {
    titleEl.textContent = "Новое событие";
    deleteBtn.classList.add("hidden");
    $("event-title-input").value = "";
    $("event-date-input").value = selectedCalDate || todayISO();
    $("event-time-input").value = "";
    $("event-note-input").value = "";
    selectedEventRepeat = "none";
  }

  document.querySelectorAll("#event-repeat-picker .repeat-option").forEach(b => {
    b.classList.toggle("active", b.dataset.repeat === selectedEventRepeat);
  });

  $("event-modal").classList.remove("hidden");
  setTimeout(() => $("event-title-input").focus(), 100);
}

function closeEventModal() {
  $("event-modal").classList.add("hidden");
  editingEventId = null;
}

async function saveEvent() {
  const title = $("event-title-input").value.trim();
  if (!title) { alert("Введите название события"); return; }
  const date = $("event-date-input").value;
  if (!date) { alert("Выберите дату"); return; }
  const time = $("event-time-input").value || null;
  const note = $("event-note-input").value.trim();

  const btn = $("event-save-btn");
  btn.disabled = true;
  try {
    if (editingEventId) {
      await updateDoc(doc(db, "couples", currentCoupleId, "events", editingEventId), {
        title, date, time, note,
        repeat: selectedEventRepeat,
        updatedAt: serverTimestamp()
      });
    } else {
      await addDoc(collection(db, "couples", currentCoupleId, "events"), {
        title, date, time, note,
        repeat: selectedEventRepeat,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    vibrate(15);
    closeEventModal();
  } catch (e) {
    console.error(e);
    alert("Ошибка сохранения: " + e.message);
  } finally {
    btn.disabled = false;
  }
}

async function deleteEventFromModal() {
  if (!editingEventId) return;
  if (!confirm("Удалить событие? Это действие нельзя отменить.")) return;
  try {
    await deleteDoc(doc(db, "couples", currentCoupleId, "events", editingEventId));
    vibrate(15);
    closeEventModal();
  } catch (e) {
    console.error(e);
    alert("Ошибка удаления: " + e.message);
  }
}
/* ==========================================================
   АНИМАЦИЯ ДИНАМИЧЕСКИХ КАРТОЧЕК (Задачи, Заметки, Календарь)
   ========================================================== */

function collectPrevIds(container) {
  if (!container) return new Set();
  const ids = new Set();
  container.querySelectorAll("[data-anim-id]").forEach(el => {
    ids.add(el.dataset.animId);
  });
  return ids;
}

function markForAnim(el, id, prevIds, index) {
  el.dataset.animId = id;
  if (!prevIds.has(id)) {
    el.classList.add("fade-in-up");
    el.style.setProperty("--i", Math.min(index || 0, 6));
  }
}
/* ==========================================================
   СЛОВО ДНЯ
   ========================================================== */

function getWordForDay(day) {
  if (!words || words.length === 0) return null;
  // Циклично: если день больше, чем слов — возвращаемся к началу
  const index = ((day - 1) % words.length + words.length) % words.length;
  return words[index];
}

function initWord() {
  const card = $("word-card");
  if (card) card.onclick = openWordModal;

  const backdrop = $("word-backdrop");
  if (backdrop) backdrop.onclick = closeWordModal;

  renderWordCard();
}

function renderWordCard() {
  const day = getCurrentDay();
  const w = getWordForDay(day);
  if (!w) return;

  const wordEl = $("word-card-word");
  const defEl = $("word-card-def");
  if (wordEl) wordEl.textContent = w.word;
  if (defEl) defEl.textContent = w.meaning || "";
}

function openWordModal() {
  const day = getCurrentDay();
  const w = getWordForDay(day);
  if (!w) return;

  const content = $("word-modal-content");
  if (!content) return;

  const synonymsHtml = (w.synonyms && w.synonyms.length)
    ? `<div class="word-modal__section">
         <div class="word-modal__section-label">Синонимы</div>
         <div class="word-modal__chips">
           ${w.synonyms.map(s => `<span class="word-modal__chip">${escapeHtml(s)}</span>`).join("")}
         </div>
       </div>`
    : "";

  const antonymsHtml = (w.antonyms && w.antonyms.length)
    ? `<div class="word-modal__section">
         <div class="word-modal__section-label">Антонимы</div>
         <div class="word-modal__chips">
           ${w.antonyms.map(a => `<span class="word-modal__chip word-modal__chip--ant">${escapeHtml(a)}</span>`).join("")}
         </div>
       </div>`
    : "";

  const exampleHtml = w.example
    ? `<div class="word-modal__section">
         <div class="word-modal__section-label">Пример</div>
         <div class="word-modal__example">
           ${escapeHtml(w.example)}
           ${w.exampleAuthor ? `<span class="word-modal__example-author">${escapeHtml(w.exampleAuthor)}</span>` : ""}
         </div>
       </div>`
    : "";

  const etymologyHtml = w.etymology
    ? `<div class="word-modal__section">
         <div class="word-modal__section-label">Этимология</div>
         <div class="word-modal__section-text">${escapeHtml(w.etymology)}</div>
       </div>`
    : "";

  const factHtml = w.fact
    ? `<div class="word-modal__section">
         <div class="word-modal__section-label">Интересный факт</div>
         <div class="word-modal__section-text">${escapeHtml(w.fact)}</div>
       </div>`
    : "";

  content.innerHTML = `
    <div class="word-modal__head">
      <div class="word-modal__label">Слово дня</div>
      <button class="word-modal__close" id="word-modal-close" aria-label="Закрыть">✕</button>
    </div>

    <div class="word-modal__word">${escapeHtml(w.word)}</div>
    <div class="word-modal__part">${escapeHtml(w.part || "")}</div>

    <div class="word-modal__section">
      <div class="word-modal__section-label">Значение</div>
      <div class="word-modal__section-text">${escapeHtml(w.meaning || "")}</div>
    </div>

    ${exampleHtml}
    ${synonymsHtml}
    ${antonymsHtml}
    ${etymologyHtml}
    ${factHtml}
  `;

  const closeBtn = $("word-modal-close");
  if (closeBtn) closeBtn.onclick = closeWordModal;

  $("word-modal").classList.remove("hidden");
  vibrate(10);
}

function closeWordModal() {
  const m = $("word-modal");
  if (m) m.classList.add("hidden");
}
/* Страховка: блокировка прокрутки body при открытой модалке */
const modalObserver = new MutationObserver(() => {
  const hasOpenModal = document.querySelector(".modal:not(.hidden)");
  document.body.style.overflow = hasOpenModal ? "hidden" : "";
});
document.querySelectorAll(".modal").forEach(m => {
  modalObserver.observe(m, { attributes: true, attributeFilter: ["class"] });
});