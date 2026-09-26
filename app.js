import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, addDoc, query, where, getDocs, onSnapshot,
  serverTimestamp, arrayUnion, Timestamp, runTransaction
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { questions } from "./questions.js";
import { words } from "./words.js";
import { lessons } from "./lessons.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const WEATHER_API_KEY = "6cb4ed33606386df572e12ae5e9c7e5c";

const $ = (id) => document.getElementById(id);

/* Склонение по полу. gender: "male" | "female" | "" */
function gendered(profile, maleForm, femaleForm) {
  const g = profile?.gender;
  if (g === "male") return maleForm;
  if (g === "female") return femaleForm;
  return `${maleForm}(а)`;
}

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
function isConvClosed(conv){ if(!conv) return false; if(conv.hasAgreement) return true; return (agreements||[]).some(function(x){ return x.fromConversation === conv.id; }); }
let customTopics = [];
let unsubCustomTopics = null;
let currentConversationId = null;
let selectedTopic = null;
let currentView = "today";
let truthState = { level: null, round: 0, history: [] };
let conversationsInitialized = false;
let quizInitialized = false;
let unsubSignals = null;
let signalsInitialized = false;

let journalNotes = {};
let unsubJournalNotes = null;
let rhythmFilter = "all";
let _noteDayKey = null;
let _rhythmCache = { moods: {}, answers: {}, conversations: [], agreements: [], loadedAt: 0 };

let lastSeenPartnerAnswerDay = null;
let answersListenerInitialized = false;

let cachedDay = null;
let cachedDayTime = 0;

let moodWatcherDay = null;
let dayWatcherInterval = null;

/* ---------- ФИЧИ ВОЛНЫ 1 ---------- */
let quietDayActive = false;
let _selectedPulseEmoji = null;
let pauseTimerInterval = null;
let _pauseTargetConvId = null;
let _pauseSelectedMinutes = 30;
let _lessonExpanded = false;
let _pendingTopic = null;

const PAUSE_OPTIONS = [
  { label: '15 минут', minutes: 15 },
  { label: '30 минут', minutes: 30 },
  { label: '1 час',    minutes: 60 },
  { label: 'До завтра', untilTomorrow: true }
];

/* ---------- ВИБРАЦИЯ ---------- */
function vibrate(pattern) {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  try { navigator.vibrate(pattern); } catch (e) {}
}

/* ---------- ПОЯВЛЕНИЕ КАРТОЧЕК ПРИ СКРОЛЛЕ ---------- */
let revealObserver = null;

function resetReveal(container) {
  if (!container) return;
  container.querySelectorAll(".reveal.is-visible").forEach(el => {
    el.classList.remove("is-visible");
  });
}

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

/* ---------- ЭКРАНЫ ---------- */
const screens = {
  loading: $("loading"),
  onboarding: $("onboarding-screen"),
  auth: $("auth-screen"),
  setup: $("setup-screen"),
  waiting: $("waiting-screen"),
  main: $("main-screen")
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
/* ---------- ОНБОРДИНГ ---------- */
let onboardingSlide = 0;
const ONBOARDING_TOTAL = 3;

function initOnboarding() {
  if (localStorage.getItem("onboarding-seen") === "1") return false;

  const slides = document.querySelectorAll(".onboarding-slide");
  const dots = document.querySelectorAll(".onboarding-dot");
  const nextBtn = $("onboarding-next");
  const skipBtn = $("onboarding-skip");
  const container = document.querySelector(".onboarding-slides");

  if (!slides.length || !nextBtn) return false;

  function render() {
    slides.forEach((s, i) => s.classList.toggle("active", i === onboardingSlide));
    dots.forEach((d, i) => d.classList.toggle("active", i === onboardingSlide));
    nextBtn.textContent = onboardingSlide === ONBOARDING_TOTAL - 1 ? "Начать" : "Далее";
  }

  function finish() {
    localStorage.setItem("onboarding-seen", "1");
    onboardingSlide = 0;
    showScreen("auth");
  }

  nextBtn.onclick = () => {
    vibrate(10);
    if (onboardingSlide < ONBOARDING_TOTAL - 1) {
      onboardingSlide++;
      render();
    } else {
      finish();
    }
  };

  skipBtn.onclick = () => {
    vibrate(10);
    finish();
  };

  // Свайп влево-вправо
  let startX = null;
  let startY = null;
  if (container) {
    container.addEventListener("pointerdown", (e) => {
      startX = e.clientX;
      startY = e.clientY;
    });
    container.addEventListener("pointerup", (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      startX = null;
      startY = null;
      if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
      if (dx < 0 && onboardingSlide < ONBOARDING_TOTAL - 1) {
        onboardingSlide++;
        render();
        vibrate(5);
      } else if (dx > 0 && onboardingSlide > 0) {
        onboardingSlide--;
        render();
        vibrate(5);
      }
    });
  }

  render();
  showScreen("onboarding");
  return true;
}

/* ---------- STATE ---------- */
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!user) {
    if (dayWatcherInterval) { clearInterval(dayWatcherInterval); dayWatcherInterval = null; }
    if (initOnboarding()) return;
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
const VIEW_ORDER = ["today", "conversation", "rhythm", "about"];

function initBottomNav() {
  document.querySelectorAll(".bottom-nav-item, .nav-btn").forEach(btn => {
    btn.onclick = () => { vibrate(10); switchNav(btn.dataset.view); };
  });
}
function switchNav(view) {
  if (view === currentView) return;
  const oldIndex = VIEW_ORDER.indexOf(currentView);
  const newIndex = VIEW_ORDER.indexOf(view);
  const direction = newIndex > oldIndex ? "right" : "left";

  currentView = view;
    document.body.classList.remove("screen-talk", "screen-rhythm", "screen-us");
  if (view === "conversation") document.body.classList.add("screen-talk");
  else if (view === "rhythm") document.body.classList.add("screen-rhythm");
  else if (view === "about") document.body.classList.add("screen-us");
  document.querySelectorAll(".bottom-nav-item, .nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });

  if (view === "today") {
    requestAnimationFrame(() => markTodaySeen());
  }
  $("today-view").classList.toggle("hidden", view !== "today");
  $("conversation-view").classList.toggle("hidden", view !== "conversation");
  $("rhythm-view").classList.toggle("hidden", view !== "rhythm");
  $("about-view").classList.toggle("hidden", view !== "about");

  const activeSection = $(
    view === "today" ? "today-view" :
    view === "conversation" ? "conversation-view" :
    view === "rhythm" ? "rhythm-view" : "about-view"
  );
  if (activeSection) {
    activeSection.classList.remove("view-enter-right", "view-enter-left");
    void activeSection.offsetWidth;
    activeSection.classList.add(direction === "right" ? "view-enter-right" : "view-enter-left");
  }

  if (view === "conversation") renderConversations();
  if (view === "about") renderAboutSubTab();
  window.scrollTo({ top: 0, behavior: "smooth" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  if (activeSection) resetReveal(activeSection);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (view === "rhythm") {
        renderRhythm();
      } else {
        initReveal();
      }
    });
  });
}

/* ---------- ПОД-ТАБЫ «Мы» ---------- */
let currentAboutSubTab = "archive";       // "games" | "archive"
let currentAboutGamesSubTab = "quiz";     // "quiz" | "lovelang" | "truth"

function initAboutSubTabs() {
  const g = $("sub-games");
  const lessonsBtn = $("sub-lessons");
  const a = $("sub-archive");
  if (g) g.onclick = () => { vibrate(10); setAboutSubTab("games"); };
  if (lessonsBtn) lessonsBtn.onclick = () => { vibrate(10); setAboutSubTab("lessons"); };
  if (a) a.onclick = () => { vibrate(10); setAboutSubTab("archive"); };

  const q = $("sub-quiz");
  const l = $("sub-lovelang");
  const t = $("sub-truth");
  if (q) q.onclick = () => { vibrate(10); setAboutGamesSubTab("quiz"); };
  if (l) l.onclick = () => { vibrate(10); setAboutGamesSubTab("lovelang"); };
  if (t) t.onclick = () => { vibrate(10); setAboutGamesSubTab("truth"); };
}
function setAboutSubTab(tab) {
  currentAboutSubTab = tab;
  const g = $("sub-games");
  const l = $("sub-lessons");
  const a = $("sub-archive");
  if (g) g.classList.toggle("active", tab === "games");
  if (l) l.classList.toggle("active", tab === "lessons");
  if (a) a.classList.toggle("active", tab === "archive");
  const gamesBox = $("about-games");
  const lessonsBox = $("about-lessons");
  const archiveBox = $("about-archive");
  gamesBox?.classList.toggle("hidden", tab !== "games");
  lessonsBox?.classList.toggle("hidden", tab !== "lessons");
  archiveBox?.classList.toggle("hidden", tab !== "archive");

  if (tab === "games") {
    setAboutGamesSubTab(currentAboutGamesSubTab);
  } else if (tab === "lessons") {
    renderLessonsList();
  } else if (tab === "archive") {
    renderStats();
    renderHeatmap();
    renderHistory();
  }

  const active = tab === "games" ? gamesBox : tab === "lessons" ? lessonsBox : archiveBox;
  resetReveal(active);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      initReveal();
    });
  });
}

function setAboutGamesSubTab(tab) {
  currentAboutGamesSubTab = tab;
  const q = $("sub-quiz");
  const l = $("sub-lovelang");
  const t = $("sub-truth");
  if (q) q.classList.toggle("active", tab === "quiz");
  if (l) l.classList.toggle("active", tab === "lovelang");
  if (t) t.classList.toggle("active", tab === "truth");
  const quizBox = $("about-quiz");
  const lovelangBox = $("about-lovelang");
  const truthBox = $("about-truth");
  quizBox?.classList.toggle("hidden", tab !== "quiz");
  lovelangBox?.classList.toggle("hidden", tab !== "lovelang");
  truthBox?.classList.toggle("hidden", tab !== "truth");

  if (tab === "quiz") renderQuizMain();

  const active = tab === "quiz" ? quizBox : tab === "lovelang" ? lovelangBox : truthBox;
  resetReveal(active);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      initReveal();
    });
  });
}

function renderAboutSubTab() {
  setAboutSubTab(currentAboutSubTab);
}

/* ---------- MAIN APP ---------- */
function startMainApp() {
  showScreen("main");
  renderToday();

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
  initWord();
  initMoonModal();
  initTruthOrDare();
  initConversations();
  initAgreements();
  initCustomTopics();
  initPDFExport();
  initRetro();
  initDayView();
  initBottomNav();
  initQuickReactions();
  initThinkSignals();
  initRhythm();
  initLessons();
  initPauseFeature();
  initQuietFeature();

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
      quietDayActive = isQuietDay();
      applyQuietDayState();
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

  const currentDayEl = $("current-day");
  if (currentDayEl) currentDayEl.textContent = day;
  const headerDayNum = $("header-day-num");
  if (headerDayNum) headerDayNum.textContent = day;
  const headerDayLabel = $("header-day-label");
  if (headerDayLabel) headerDayLabel.textContent = "день из 365";

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
    `${partnerName} ${gendered(partnerProfile, "ответил", "ответила")} на вопрос дня`,
    "Открой «Сегодня», чтобы прочитать.",
    "today",
    { avatar: { letter, photoURL } }
  );

  const partnerSection = document.querySelector(".partner-section");
  if (partnerSection) {
    partnerSection.classList.add("pulse-highlight");
    setTimeout(() => partnerSection.classList.remove("pulse-highlight"), 3000);
  }
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
  const partnerUid = currentCouple?.members?.find(uid => uid !== currentUser.uid);
  const quiet = todayMoods.quiet || {};
  const partnerIsQuiet = !!quiet[partnerUid];

  const myTa = $("my-answer");
  const savedText = myAnswer ? (myAnswer.text || "") : "";
  if (myTa && !myTa.matches(":focus") && myTa.value !== savedText) {
    myTa.value = savedText;
  }
  updateSaveButtonState();

  const partnerEl = $("partner-answer");
  const statusEl = $("answer-status");
  const section = document.querySelector(".partner-section");

  if (section) section.classList.remove("is-waiting", "is-locked", "is-open", "is-partner-quiet");

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
          Твой ответ сохранён.<br>
          Как только ${safeName} ответит — увидишь ответ здесь.
        </span>
      `;
      statusEl.textContent = "Твой ответ сохранён. Ждём партнёра...";
      statusEl.style.color = "#999";
    } else if (!myAnswer && partnerAnswer) {
      if (section) section.classList.add("is-locked");
      partnerEl.innerHTML = `
        <span class="partner-answer__icon">🔒</span>
        <span class="partner-answer__text">
          ${safeName} уже ${gendered(partnerProfile, "ответил", "ответила")}.<br>
          Напиши своё — и ответ откроется.
        </span>
      `;
      statusEl.textContent = "";
      statusEl.style.color = "";
    } else if (partnerIsQuiet) {
      if (section) section.classList.add("is-partner-quiet");
      partnerEl.innerHTML = `
        <span class="quiet-moon-icon">🌙</span>
        <span>
          ${safeName} сегодня в тихом дне.<br>
          Это не отдаление — это забота о себе.
        </span>
      `;
      statusEl.textContent = "";
      statusEl.style.color = "";
    } else {
      if (section) section.classList.add("is-waiting");
      partnerEl.innerHTML = `Пока пусто. Начни первым — или подожди партнёра ❤️`;
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

  updateTodayBadge();
}

/* ---------- СТАТИСТИКА ---------- */
async function renderStats() {
  try {
    const [answersSnap, moodsSnap] = await Promise.all([
      getDocs(collection(db, "couples", currentCoupleId, "answers")),
      getDocs(collection(db, "couples", currentCoupleId, "moods"))
    ]);

    const statAnswers = $("stat-answers");
    if (statAnswers) statAnswers.textContent = answersSnap.size;
    const daysTogether = getCurrentDay();
    const statDays = $("stat-days");
    if (statDays) statDays.textContent = daysTogether;

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
    const statActive = $("stat-active-days");
    if (statActive) statActive.textContent = activeDays;

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
    if (themeEl) {
      themeEl.textContent = favoriteTheme;
      themeEl.classList.add("text");
    }

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
    if (moodEl) {
      moodEl.textContent = favoriteMood;
      moodEl.classList.add("text");
    }

    const statAgr = $("stat-agreements");
    if (statAgr) statAgr.textContent = agreements.length;
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
      html = `<div class="retro-empty">Пока не хватает данных для итогов. Возвращайся, когда накопится история 💛</div>`;
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
        <strong>Ты:</strong> ${mine ? escapeHtml(mine.text) : "—"}
      </div>
      <div class="history-answer ${partner && showPartner ? "" : "empty"}">
        <strong>Партнёр:</strong> ${
          partner && showPartner ? escapeHtml(partner.text) :
          showPartner ? "Пока не ответил(а)" : "Скрыто (ты ещё не ответил(а))"
        }
      </div>
    `;
    markForAnim(div, "day-" + day, prevIds, idx++);
    container.appendChild(div);
  }
}

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

  document.querySelectorAll("#gender-tabs .tab").forEach(t => {
    t.onclick = () => {
      vibrate(8);
      document.querySelectorAll("#gender-tabs .tab").forEach(x => x.classList.remove("active"));
      t.classList.add("active");
    };
  });

  initNotifTime();
  initMoonToggle();
  onSnapshot(doc(db, "users", partnerUid), (snap) => {
    if (snap.exists()) {
      partnerProfile = snap.data();
      renderAvatars();
      renderTodayMood();
      updateLoveLangUI();
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
    polaroidEl.style.fontFamily = "'DM Serif Display', serif";
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
  const myGender = myProfile?.gender || "";
  document.querySelectorAll("#gender-tabs .tab").forEach(t => {
    t.classList.toggle("active", t.dataset.gender === myGender);
  });
  updateLoveLangUI();
  $("profile-modal").classList.remove("hidden");
}
function closeProfileModal() { $("profile-modal").classList.add("hidden"); }
async function saveProfileModal() {
  const name = $("profile-name").value.trim();
  const photoURL = $("profile-photo").value.trim();
  const activeGenderTab = document.querySelector("#gender-tabs .tab.active");
  const gender = activeGenderTab ? activeGenderTab.dataset.gender : "";
  try {
    await setDoc(doc(db, "users", currentUser.uid), {
      displayName: name,
      photoURL: photoURL,
      gender: gender
    }, { merge: true });
    myProfile = { displayName: name, photoURL, gender };
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
const MOON_VISIBLE_IDS = ["moon-info-item"];

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
    alert("Твой браузер не поддерживает уведомления.");
    return;
  }
  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") {
    alert("Разрешение не получено. Включи уведомления для этого сайта в настройках браузера.");
    return;
  }
  localStorage.setItem("notif-enabled", "1");
  updateNotifButton();
  try {
    new Notification("Уведомления включены 💛", {
      body: "Мы напомним вечером, если ты ещё не ответил(а) на вопрос дня.",
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
      body: "Ты ещё не ответил(а) на сегодняшний вопрос. Загляни!",
      icon: "./icon-192.png",
      tag: "daily-reminder"
    });
    localStorage.setItem("last-notif", today);
  } catch (e) { console.log("Notif error:", e); }
}
function initNotifTime() {
  const saved = localStorage.getItem("notif-time") || "21:00";
  const el = $("notif-time");
  const display = $("notif-time-display");
  if (!el) return;
  el.value = saved;
  if (display) display.textContent = saved;

  const handleChange = () => {
    const val = el.value || saved;
    localStorage.setItem("notif-time", val);
    if (display) display.textContent = val;
    const label = document.querySelector('label[for="notif-time"]');
    if (label) {
      const original = label.textContent;
      label.textContent = "Время напоминания ✓";
      setTimeout(() => { label.textContent = original; }, 1200);
    }
  };

  el.onchange = handleChange;
  el.oninput = handleChange;
}

/* ---------- ПУЛЬС ДНЯ ---------- */
function initMood() {
  const meDot = $("pulse-me");
  if (meDot) meDot.onclick = (e) => {
    e.stopPropagation();
    openPulseModal();
  };

  const backdrop = $("pulse-backdrop");
  if (backdrop) backdrop.onclick = closePulseModal;

  const cancelBtn = $("pulse-cancel-btn");
  if (cancelBtn) cancelBtn.onclick = closePulseModal;

  document.querySelectorAll("#pulse-emojis .pulse-emoji").forEach(btn => {
    btn.onclick = () => {
      _selectedPulseEmoji = btn.dataset.emoji;
      document.querySelectorAll("#pulse-emojis .pulse-emoji").forEach(b => {
        b.classList.toggle("selected", b.dataset.emoji === _selectedPulseEmoji);
      });
      const saveBtn = $("pulse-save-btn");
      if (saveBtn) saveBtn.disabled = false;
      vibrate(8);
    };
  });

  const saveBtn = $("pulse-save-btn");
  if (saveBtn) saveBtn.onclick = savePulse;

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
  const myMood = moods[currentUser.uid] || null;
  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
  const partnerMood = moods[partnerUid] || null;

  // --- Тихий день: синхронизация ---
  const quiet = todayMoods.quiet || {};
  const myQuiet = !!quiet[currentUser.uid];
  const partnerQuiet = !!quiet[partnerUid];

  // Своё состояние: Firestore — источник истины
  if (myQuiet !== quietDayActive) {
    quietDayActive = myQuiet;
    if (myQuiet) localStorage.setItem(quietDayKey(), "1");
    else localStorage.removeItem(quietDayKey());
    applyQuietDayState();
  }

  // --- Мой кружок ---
  // Если у меня тихий день — свой кружок скрыт. Партнёр всё равно видит 🌙 у меня.
  const meDot = $("pulse-me");
  if (meDot) {
    if (myQuiet) {
      meDot.classList.add("pulse-dot--hidden");
    } else {
      meDot.classList.remove("pulse-dot--hidden");
      if (myMood) {
        meDot.textContent = myMood;
        meDot.classList.remove("pulse-dot--empty");
        meDot.classList.add("pulse-dot--pulse");
      } else {
        meDot.textContent = "+";
        meDot.classList.add("pulse-dot--empty");
        meDot.classList.remove("pulse-dot--pulse");
      }
    }
  }

  // --- Кружок партнёра ---
  // Тихий день перекрывает пульс: показываем 🌙 в фиолетовом кружке
  const partnerDot = $("pulse-partner");
  if (partnerDot) {
    if (partnerQuiet) {
      partnerDot.textContent = "🌙";
      partnerDot.classList.remove("pulse-dot--empty", "pulse-dot--pulse");
      partnerDot.classList.add("pulse-dot--quiet");
    } else {
      partnerDot.classList.remove("pulse-dot--quiet");
      if (partnerMood) {
        partnerDot.textContent = partnerMood;
        partnerDot.classList.remove("pulse-dot--empty");
        partnerDot.classList.add("pulse-dot--pulse");
      } else {
        partnerDot.textContent = "+";
        partnerDot.classList.add("pulse-dot--empty");
        partnerDot.classList.remove("pulse-dot--pulse");
      }
    }
  }

  const sadEmojis = ["😔", "😡", "😢"];
  const partnerSad = partnerMood && sadEmojis.includes(partnerMood);

  const badge = $("pulse-badge-partner");
  if (badge) badge.classList.toggle("hidden", !partnerSad);

  const pulseModal = $("pulse-modal");
  const pulseModalOpen = pulseModal && !pulseModal.classList.contains("hidden");
  if (!pulseModalOpen) {
    document.querySelectorAll("#pulse-emojis .pulse-emoji").forEach(btn => {
      btn.classList.toggle("selected", btn.dataset.emoji === myMood);
    });
  }

  // Строка настроения партнёра над его ответом
  const moodLine = $("partner-mood-line");
  if (moodLine) {
    const notes = todayMoods.notes || {};
    const partnerNote = (notes[partnerUid] || "").trim();
    if (partnerMood && partnerNote && !partnerQuiet) {
      const partnerDisplayName = partnerProfile?.displayName?.trim() || "Партнёр";
      moodLine.innerHTML = `
        <span class="partner-mood-line__emoji">${partnerMood}</span>
        <span class="partner-mood-line__name">${escapeHtml(partnerDisplayName)}:</span>
        <span class="partner-mood-line__text">${escapeHtml(partnerNote)}</span>
      `;
      moodLine.classList.remove("hidden");
    } else {
      moodLine.classList.add("hidden");
      moodLine.innerHTML = "";
    }
  }

  // Перерисовываем блок «Ответ партнёра» — тихий день мог измениться
  updateTodayView();
}
async function savePulse() {
  if (!_selectedPulseEmoji) {
    vibrate(8);
    return;
  }
  const day = getCurrentDay();
  const whyInput = $("pulse-why");
  const noteText = whyInput ? whyInput.value.trim() : "";

  const docRef = doc(db, "couples", currentCoupleId, "moods", String(day));
  try {
    const snap = await getDoc(docRef);
    const data = snap.exists() ? snap.data() : {};
    const moods = { ...(data.moods || {}) };
    const notes = { ...(data.notes || {}) };
    moods[currentUser.uid] = _selectedPulseEmoji;
    if (noteText) notes[currentUser.uid] = noteText;
    else delete notes[currentUser.uid];
    await setDoc(docRef, { day, moods, notes }, { merge: true });
    vibrate(12);
  } catch (e) {
    console.error(e);
    alert("Не удалось сохранить пульс: " + e.message);
    return;
  }
  closePulseModal();
}

function openPulseModal() {
  const notes = todayMoods.notes || {};
  const myNote = notes[currentUser.uid] || "";
  const moods = todayMoods.moods || {};
  _selectedPulseEmoji = moods[currentUser.uid] || null;

  const whyInput = $("pulse-why");
  if (whyInput) whyInput.value = myNote;

  document.querySelectorAll("#pulse-emojis .pulse-emoji").forEach(b => {
    b.classList.toggle("selected", b.dataset.emoji === _selectedPulseEmoji);
  });

  const saveBtn = $("pulse-save-btn");
  if (saveBtn) saveBtn.disabled = !_selectedPulseEmoji;

  $("pulse-modal").classList.remove("hidden");
  vibrate(10);
}

function closePulseModal() {
  const m = $("pulse-modal");
  if (m) m.classList.add("hidden");
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
  const dayEl = $("moon-day");
  if (dayEl) dayEl.textContent = data.lunarDay + "-й лунный день";

  const modalIconEl = $("moon-icon-modal");
  if (modalIconEl) modalIconEl.textContent = data.phase.icon;
  const phaseEl = $("moon-phase");
  if (phaseEl) phaseEl.textContent = data.phase.name;
  const modalDayEl = $("moon-day-modal");
  if (modalDayEl) modalDayEl.textContent = data.lunarDay + "-й лунный день";
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
      if (wd) wd.textContent = "Разреши геолокацию";
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

  const iconEl = $("weather-icon");
  if (iconEl) iconEl.textContent = weatherEmoji(iconCode);
  const tempEl = $("weather-temp");
  if (tempEl) tempEl.textContent = temp + "° · " + desc;

  const descHidden = $("weather-desc");
  if (descHidden) descHidden.textContent = capitalize(desc) + (city ? " · " + city : "");

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
  const myName = myProfile?.displayName?.trim() || "Вы";
  const partnerName = partnerProfile?.displayName?.trim() || "Партнёр";

  const bothDone = myLoveLang && partnerLoveLang;
  if (myLoveLang) {
    $("lovelang-status").innerHTML =
      `<p>✓ Ты прошёл(ла) тест. Твой язык: <strong>${escapeHtml(myLoveLang.primary)}</strong></p>` +
      (partnerLoveLang
        ? `<p>✓ ${escapeHtml(partnerName)} тоже прошёл: <strong>${escapeHtml(partnerLoveLang.primary)}</strong></p>`
        : `<p>⏳ ${escapeHtml(partnerName)} ещё не прошёл тест.</p>`);
  } else {
    $("lovelang-status").innerHTML = partnerLoveLang
      ? `<p>${escapeHtml(partnerName)} уже прошёл тест. Твоя очередь!</p>`
      : `<p>Никто ещё не проходил.</p>`;
  }

  const myLabel = $("my-lovelang-label");
  const partnerLabel = $("partner-lovelang-label");
  if (myLabel) myLabel.textContent = myName + ":";
  if (partnerLabel) partnerLabel.textContent = partnerName + ":";

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

  if (!prevPartner.answers && currPartner.answers) {
    notifyUser(
      `${partnerName} ${gendered(partnerProfile, "создал", "создала")} квиз о себе`,
      "Угадайте ответы на 10 вопросов.",
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
    myStatus.innerHTML = `<div class="status-line">✓ Твой квиз готов.</div>
      <button id="quiz-view-my">Посмотреть мои ответы</button>
      <button id="quiz-retake" class="link">Пройти заново</button>`;
    $("quiz-view-my").onclick = () => showMyQuizResult();
    $("quiz-retake").onclick = () => startQuiz("me");
  } else {
    myStatus.innerHTML = `<div class="status-line">Ответь на 10 вопросов о себе — партнёр попробует угадать.</div>
      <button id="quiz-start-me">Создать квиз обо мне</button>`;
    $("quiz-start-me").onclick = () => startQuiz("me");
  }
  const partnerStatus = $("partner-quiz-status");
  if (!partnerData?.answers) {
    partnerStatus.innerHTML = `<div class="status-line">Партнёр ещё не создал квиз о себе. Ждём.</div>`;
  } else if (myData?.guesses && myData.guessesFor === partnerUid) {
    const correct = countCorrect(myData.guesses, partnerData.answers);
    partnerStatus.innerHTML = `<div class="status-line">✓ Ты угадал(а) <strong>${correct} из 10</strong> ответов партнёра.</div>
      <button id="quiz-view-my-result">Посмотреть разбор</button>
      <button id="quiz-retry" class="link">Пройти заново</button>`;
    $("quiz-view-my-result").onclick = () => showGuessResult();
    $("quiz-retry").onclick = () => startQuiz("partner");
  } else {
    partnerStatus.innerHTML = `<div class="status-line">Партнёр создал квиз о себе. Попробуй угадать его ответы!</div>
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
  $("quiz-result-title").textContent = "Твои ответы";
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
  initDialogue();
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
      renderPauseNavIndicator();
      if (conversations.some(isConvPaused)) startPauseTimer();

      if (currentConversationId) {
        const freshConv = conversations.find(c => c.id === currentConversationId);
        const convModal = $("conversation-modal");
        if (freshConv && convModal && !convModal.classList.contains("hidden")) {
          openConversation(currentConversationId);
        }
      }

      if (_currentDialogueId) {
        const fresh = conversations.find(c => c.id === _currentDialogueId);
        const modal = $("dialogue-modal");
        if (fresh && modal && !modal.classList.contains("hidden")) {
          renderDialogueContent(fresh);
          if (fresh.phase === "done") {
            setTimeout(() => burstDialogueHearts(), 150);
          }
        }
      }

      if (conversationsInitialized) {
        detectConversationEvents(prevConversations);
      } else {
        conversationsInitialized = true;
      }

      // Self-heal: примирение с обеими подписями, но phase всё ещё "signing"
      const partnerUidForHeal = currentCouple.members.find(uid => uid !== currentUser.uid);
      conversations.forEach(conv => {
        if (conv.mode !== "reconcile") return;
        if (conv.phase !== "signing") return;
        const sigs = conv.signatures || {};
        if (sigs[currentUser.uid] && sigs[partnerUidForHeal]) {
          updateDoc(doc(db, "couples", currentCoupleId, "conversations", conv.id), {
            phase: "done",
            doneAt: serverTimestamp()
          }).catch(err => console.error("Sign heal error:", err));
        }
      });
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

  const prevIds = new Set(prevConversations.map(c => c.id));
  for (const conv of conversations) {
    if (prevIds.has(conv.id)) continue;
    if (conv.createdBy === partnerUid) {
      if (conv.mode === "reconcile") {
        const f = getDialogueFeelingInfo(conv.feeling);
        notifyUser(
          `${partnerName} предлагает примирение`,
          `${f.label}`,
          "conversation",
          { avatar }
        );
      } else {
        notifyUser(
          `${partnerName} начал(а) разговор`,
          `Тема: «${conv.topic || "без темы"}»`,
          "conversation",
          { avatar }
        );
      }
    }
  }

  const prevMap = new Map(prevConversations.map(c => [c.id, c]));
  for (const conv of conversations) {
    const prev = prevMap.get(conv.id);
    const prevText = prev?.texts?.[partnerUid] || "";
    const currText = conv.texts?.[partnerUid] || "";

    if (!prevText && currText) {
      if (currentView === "conversation" && currentConversationId === conv.id) continue;

      notifyUser(
        `Новое сообщение от ${partnerName}`,
        conv.topic ? `Тема: «${conv.topic}»` : "Откройте раздел «Разговор»",
        "conversation",
        { avatar }
      );
    } else if (prevText && currText && prevText !== currText) {
      // Партнёр уточнил / ответил в уже начатом разговоре.
      // Дебаунс: не чаще раза в 60 секунд на один разговор.
      if (currentView === "conversation" && currentConversationId === conv.id) continue;

      const debounceKey = `conv-edit-notif-${currentCoupleId}-${conv.id}`;
      const lastNotif = parseInt(localStorage.getItem(debounceKey) || "0", 10);
      if (Date.now() - lastNotif < 60 * 1000) continue;

      localStorage.setItem(debounceKey, String(Date.now()));

      notifyUser(
        `${partnerName} дополнил(а) разговор`,
        conv.topic ? `«${conv.topic}» — открой, чтобы прочитать` : "Открой раздел «Разговор»",
        "conversation",
        { avatar }
      );
    }
  }

  // Пауза партнёра — оповещение
  for (const conv of conversations) {
    const prev = prevMap.get(conv.id);
    const prevPaused = prev ? isConvPaused(prev) : false;
    const nowPaused = isConvPaused(conv);

    if (!nowPaused) continue;
    if (conv.pausedBy !== partnerUid) continue;
    if (prevPaused) continue;

    const label = conv.pausedLabel || "пауза";
    let body;
    if (conv.mode === "reconcile") {
      const f = getDialogueFeelingInfo(conv.feeling);
      body = `Примирение · ${f.label} · ${label}`;
    } else {
      body = `«${conv.topic || "без темы"}» · ${label}`;
    }

    notifyUser(
      `${partnerName} на паузе`,
      body,
      "conversation",
      { avatar }
    );
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
    if (conv.mode === "reconcile") {
      if (conv.phase === "done") past.push(conv);
      else active.push(conv);
      return;
    }
    const texts = conv.texts || {};
    const hasBoth = texts[currentUser.uid] && texts[partnerUid];

    // Скрываем от партнёра разговор, пока инициатор не написал сам
    if (conv.createdBy !== currentUser.uid && !texts[conv.createdBy]) return;

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
      title: "Начни первый разговор",
      text: "Выбери тему и напиши, что для тебя важно. Партнёр ответит своим — и вы лучше узнаете друг друга."
    });
    pastBlock.classList.add("hidden");
    return;
  }
  if (active.length === 0) {
    activeBox.innerHTML = `<div class="hint" style="text-align:center; padding: 12px;">Нет активных разговоров.</div>`;
  } else {
    active.forEach((conv, i) => {
      const el = conv.mode === "reconcile"
        ? buildDialogueCard(conv)
        : buildConvCard(conv, partnerUid);
      markForAnim(el, conv.id, prevActiveIds, i);
      activeBox.appendChild(el);
    });
  }
  if (past.length === 0) pastBlock.classList.add("hidden");
  else {
    pastBlock.classList.remove("hidden");
    past.forEach((conv, i) => {
      const el = conv.mode === "reconcile"
        ? buildDialogueCard(conv, true)
        : buildConvCard(conv, partnerUid);
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

  const paused = isConvPaused(conv);
  if (paused) card.classList.add("conv-card--paused");

  let statusHtml = "";
  if (paused) {
    statusHtml = `
      <span class="conv-card__paused-tag">⏸ ${escapeHtml(conv.pausedLabel || 'пауза')}</span>
      <span data-pause-countdown data-pause-id="${conv.id}">${formatPauseRemaining(getConvPauseRemaining(conv))}</span>
    `;
  } else if (!myText && !partnerText) statusHtml = `<span class="status-dot waiting"></span> Никто ещё не написал`;
  else if (myText && !partnerText) statusHtml = `<span class="status-dot mine-done"></span> Вы написали, ждём партнёра`;
  else if (!myText && partnerText) statusHtml = `<span class="status-dot waiting"></span> Партнёр написал, ваша очередь`;
  else if (isConvClosed(conv)) statusHtml = `<span class="status-dot both-done"></span> ✓ Закрыто`;
  else statusHtml = `<span class="status-dot both-done"></span> Оба написали — можно договориться`;

  card.innerHTML = `
    <button class="conv-delete-btn" data-action="delete-conv" title="Удалить разговор">🗑</button>
    <div class="conv-card-title">${escapeHtml(conv.topic || "Без темы")}</div>
    <div class="conv-card-date">${formatDate(conv.createdAt)}</div>
    <div class="conv-card-status">${statusHtml}</div>
  `;
  card.onclick = () => openConversation(conv.id);
  const delBtn = card.querySelector('[data-action="delete-conv"]');
  if (delBtn) { if (isConvClosed(conv)) delBtn.remove(); else delBtn.addEventListener("click", (e) => { e.stopPropagation(); deleteConversation(conv.id); }); }
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
  if (!topic) { alert("Выбери тему или введи свою"); return; }
  $("topic-confirm").disabled = true;
  try {
    if ($("topic-save-custom").checked && custom) {
      const exists = customTopics.some(t => t.text.toLowerCase() === topic.toLowerCase());
      if (!exists) {
        await addDoc(collection(db, "couples", currentCoupleId, "customTopics"), {
          text: topic,
          createdBy: currentUser.uid,
          createdAt: serverTimestamp()
        });
      }
    }
    _pendingTopic = topic;
    closeTopicModal();
    vibrate(15);
    openPendingConversation();
  } catch (e) {
    console.error(e);
    alert("Ошибка: " + e.message);
  } finally {
    $("topic-confirm").disabled = false;
  }
}
function openPendingConversation() {
  // Разговор ещё не создан в Firestore — показываем черновик
  currentConversationId = null;

  const pausedBox = $("conversation-paused-content");
  const normalIds = [
    "conversation-title", "conversation-date", "conversation-my-text",
    "conversation-save-my", "conversation-partner-text",
    "conversation-make-agreement", "conversation-pause-btn", "conversation-close"
  ];
  const labelEls = document.querySelectorAll("#conversation-modal .field-label");

  normalIds.forEach(id => { const el = $(id); if (el) el.classList.remove("hidden"); });
  labelEls.forEach(el => el.classList.remove("hidden"));
  if (pausedBox) { pausedBox.classList.add("hidden"); pausedBox.innerHTML = ""; }

  $("conversation-title").textContent = _pendingTopic || "Разговор";
  $("conversation-date").textContent = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  $("conversation-my-text").value = "";

  const partnerBox = $("conversation-partner-text");
  partnerBox.textContent = "Пока никто не написал.";
  partnerBox.style.fontStyle = "italic";
  partnerBox.style.color = "var(--muted)";

  const agreementBtn = $("conversation-make-agreement");
  if (agreementBtn) agreementBtn.classList.add("hidden");

  const pauseBtn = $("conversation-pause-btn");
  if (pauseBtn) pauseBtn.classList.add("hidden");

  const saveBtn = $("conversation-save-my");
  saveBtn.textContent = "Сохранить";

  $("conversation-modal").classList.remove("hidden");
}

function openConversation(convId) {
  const conv = conversations.find(c => c.id === convId);
  if (!conv) return;
  if (conv.mode === "reconcile") return openDialogueModal(convId);
  currentConversationId = convId;

  const pausedBox = $("conversation-paused-content");
  const normalIds = [
    "conversation-title", "conversation-date", "conversation-my-text",
    "conversation-save-my", "conversation-partner-text",
    "conversation-make-agreement", "conversation-pause-btn", "conversation-close"
  ];
  const labelEls = document.querySelectorAll("#conversation-modal .field-label");

  if (isConvPaused(conv)) {
    normalIds.forEach(id => { const el = $(id); if (el) el.classList.add("hidden"); });
    labelEls.forEach(el => el.classList.add("hidden"));
    if (pausedBox) {
      pausedBox.classList.remove("hidden");
      pausedBox.innerHTML = `
        <h3>${escapeHtml(conv.topic || "Разговор")}</h3>
        <p class="hint conv-date">${formatDate(conv.createdAt)}</p>
        <div class="paused-state">
          <div class="paused-state__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
          </div>
          <div class="paused-state__title">Пауза</div>
          <div class="paused-state__origin">в этом разговоре · <b>${escapeHtml(conv.pausedLabel || '')}</b></div>
          <div class="paused-state__countdown" data-pause-countdown data-pause-id="${conv.id}">${formatPauseRemaining(getConvPauseRemaining(conv))}</div>
          <div class="paused-state__text">Ты взял(а) время подумать. Партнёр видит знак именно здесь и не торопит.</div>
          <button class="btn-pause" id="pause-cancel-conv" type="button" style="margin-top:6px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            Снять паузу
          </button>
        </div>
        <button class="link" id="conversation-close-paused">Закрыть</button>
      `;
      $("pause-cancel-conv").onclick = () => cancelPause(conv.id);
      $("conversation-close-paused").onclick = closeConversationModal;
    }
    startPauseTimer();
    $("conversation-modal").classList.remove("hidden");
    return;
  }

  // Обычное состояние — раскрываем всё, что было скрыто паузой
  normalIds.forEach(id => { const el = $(id); if (el) el.classList.remove("hidden"); });
  labelEls.forEach(el => el.classList.remove("hidden"));
  if (pausedBox) { pausedBox.classList.add("hidden"); pausedBox.innerHTML = ""; }

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
    if (isConvClosed(conv)) {
      agreementBtn.classList.add("hidden");
    } else {
      agreementBtn.classList.remove("hidden");
    }
  } else if (myText && !partnerText) {
    partnerBox.textContent = "Партнёр ещё не написал. Мы скажем, когда он(а) ответит.";
    partnerBox.style.fontStyle = "italic";
    partnerBox.style.color = "var(--muted)";
    agreementBtn.classList.add("hidden");
  } else if (!myText && partnerText) {
    partnerBox.textContent = partnerText;
    partnerBox.style.fontStyle = "normal";
    partnerBox.style.color = "";
    agreementBtn.classList.add("hidden");
  } else {
    partnerBox.textContent = "Пока никто не написал.";
    partnerBox.style.fontStyle = "italic";
    partnerBox.style.color = "var(--muted)";
    agreementBtn.classList.add("hidden");
  }
  const pauseBtn = $("conversation-pause-btn");
  if (pauseBtn) pauseBtn.onclick = () => openPauseModal(conv.id); if (isConvClosed(conv)) { saveBtn.classList.add("hidden"); agreementBtn.classList.add("hidden"); pauseBtn.classList.add("hidden"); $("conversation-my-text").readOnly = true; } else { $("conversation-my-text").readOnly = false; }
  $("conversation-modal").classList.remove("hidden");
}
function closeConversationModal() {
  $("conversation-modal").classList.add("hidden");
  currentConversationId = null;
  _pendingTopic = null;
}
async function saveMyConversationText() {
  const text = $("conversation-my-text").value.trim();
  if (!text) { alert("Напиши что-нибудь"); return; }
  const btn = $("conversation-save-my");
  btn.disabled = true;
  try {
    if (!currentConversationId && _pendingTopic) {
      // Первый раз — создаём документ сразу с текстом
      const ref = await addDoc(collection(db, "couples", currentCoupleId, "conversations"), {
        topic: _pendingTopic,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        texts: { [currentUser.uid]: text }
      });
      _pendingTopic = null;
      currentConversationId = ref.id;
      vibrate(15);
      // Дать onSnapshot догнать, потом перерисовать
      setTimeout(() => {
        if (currentConversationId === ref.id) openConversation(ref.id);
      }, 350);
    } else {
      // Обновляем существующий
      const docRef = doc(db, "couples", currentCoupleId, "conversations", currentConversationId);
      const snap = await getDoc(docRef);
      const current = snap.exists() ? (snap.data().texts || {}) : {};
      current[currentUser.uid] = text;
      await updateDoc(docRef, { texts: current });
      const conv = conversations.find(c => c.id === currentConversationId);
      if (conv) conv.texts = current;
      openConversation(currentConversationId);
      vibrate(15);
    }
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
function closeAgreementModal() {
  $("agreement-modal").classList.add("hidden");

  const fromDialogue = $("agreement-modal").dataset.fromDialogue || "";
  if (fromDialogue) {
    $("agreement-modal").dataset.fromDialogue = "";
    setTimeout(() => {
      const conv = conversations.find(c => c.id === fromDialogue);
      if (conv) openDialogueModal(fromDialogue);
    }, 300);
  }
}
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
      text: "Когда договоритесь о чём-то важном — сохрани здесь. Всегда можно перечитать."
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
  if (!title) { alert("Введи название договорённости"); return; }
  const fromConversation = $("agreement-modal").dataset.fromConversation || "";
  const fromDialogue = $("agreement-modal").dataset.fromDialogue || "";
  const btn = $("save-agreement");
  btn.disabled = true;
  try {
    const payload = { title, text, createdBy: currentUser.uid, createdAt: serverTimestamp(), done: false };
    if (fromConversation) payload.fromConversation = fromConversation;
    if (fromDialogue) payload.fromDialogue = true;
    const ref = await addDoc(collection(db, "couples", currentCoupleId, "agreements"), payload);
    closeAgreementModal();
    if (fromConversation && !fromDialogue) {
      await updateDoc(doc(db, "couples", currentCoupleId, "conversations", fromConversation), {
        hasAgreement: true,
        agreementId: ref.id
      });
      closeConversationModal();
    }
    if (fromDialogue) {
      await updateDoc(doc(db, "couples", currentCoupleId, "conversations", fromDialogue), {
        phase: "signing",
        agreementId: ref.id
      });
      $("agreement-modal").dataset.fromDialogue = "";
    }
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

  if (!partnerAnswer) {
    setBadge("badge-today", 0);
    return;
  }

  if (!myAnswer) {
    setBadge("badge-today", 1);
    return;
  }

  if (currentView === "today") {
    localStorage.setItem(todaySeenKey(day), "1");
    setBadge("badge-today", 0);
    return;
  }

  const seen = localStorage.getItem(todaySeenKey(day)) === "1";
  setBadge("badge-today", seen ? 0 : 1);
}

function markTodaySeen() {
  if (!currentCoupleId) return;
  const day = getCurrentDay();
  const myAnswer = todayAnswers.find(a => a.userId === currentUser.uid);
  if (!myAnswer) return;
  localStorage.setItem(todaySeenKey(day), "1");
  updateTodayBadge();
}
/* ==========================================================
   IN-APP БАННЕР + СИСТЕМНЫЕ УВЕДОМЛЕНИЯ
   ========================================================== */

/* ==========================================================
   IN-APP БАННЕР — СТЕК
   ========================================================== */

const BANNER_MAX_VISIBLE = 3;
const BANNER_LIFETIME_MS = 5000;

let _bannerStackEl = null;
const _activeBanners = []; // [{ el, timer, closing }]

function ensureBannerStack() {
  if (_bannerStackEl && document.body.contains(_bannerStackEl)) return _bannerStackEl;
  _bannerStackEl = document.createElement("div");
  _bannerStackEl.className = "app-banner-stack";
  document.body.appendChild(_bannerStackEl);
  return _bannerStackEl;
}

function closeBannerEntry(entry) {
  if (!entry || entry.closing) return;
  entry.closing = true;
  clearTimeout(entry.timer);

  const el = entry.el;
  const h = el.offsetHeight;

  // 1. Замораживаем текущую высоту — без transition, чтобы замер был честным
  el.style.transition = "none";
  el.style.maxHeight = h + "px";
  void el.offsetHeight; // форсируем reflow

  // 2. Возвращаем transition (из CSS) и запускаем схлопывание
  el.style.transition = "";
  requestAnimationFrame(() => {
    el.classList.remove("is-visible");
    el.classList.add("is-collapsing");
  });

  // 3. Убираем из активного списка (визуально он ещё исчезает ~450 мс)
  const idx = _activeBanners.indexOf(entry);
  if (idx >= 0) _activeBanners.splice(idx, 1);

  // 4. Реально удаляем из DOM после завершения анимации
  setTimeout(() => {
    el.remove();
    if (_activeBanners.length === 0 && _bannerStackEl) {
      const stack = _bannerStackEl;
      _bannerStackEl = null;
      stack.remove();
    }
  }, 460);
}

function showBanner(title, text, view, opts = {}) {
  const stack = ensureBannerStack();

  // Переполнение — прибить самый старый
  while (_activeBanners.length >= BANNER_MAX_VISIBLE) {
    closeBannerEntry(_activeBanners[0]);
  }

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

  const entry = { el, timer: null, closing: false };

  stack.appendChild(el);
  _activeBanners.push(entry);

  requestAnimationFrame(() => el.classList.add("is-visible"));

  el.addEventListener("click", (e) => {
    if (e.target.closest(".app-banner__close")) return;
    if (view && typeof switchNav === "function") {
      switchNav(view);
    }
    closeBannerEntry(entry);
  });

  el.querySelector(".app-banner__close").addEventListener("click", (e) => {
    e.stopPropagation();
    closeBannerEntry(entry);
  });

  // Свайп вверх — закрыть этот баннер
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
      el.style.transform = `translateY(${dy}px)`;
      el.style.opacity = String(Math.max(0, 1 + dy / 150));
    }
  });
  el.addEventListener("pointerup", () => {
    if (startY === null) return;
    el.style.transition = "";
    el.style.transform = "";
    el.style.opacity = "";
    if (dy < -60) closeBannerEntry(entry);
    startY = null;
    dy = 0;
  });

  entry.timer = setTimeout(() => closeBannerEntry(entry), BANNER_LIFETIME_MS);

  return entry;
}

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

const THINK_COOLDOWN_MS = 60 * 60 * 1000;

function thinkCooldownKey() {
  return `think-cooldown-${currentCoupleId}`;
}

function getThinkCooldownRemaining() {
  const last = parseInt(localStorage.getItem(thinkCooldownKey()) || "0");
  const remaining = last + THINK_COOLDOWN_MS - Date.now();
  return remaining > 0 ? remaining : 0;
}

function burstHearts() {
  const btn = $("partner-polaroid");
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

async function sendThinkSignal(thought) {
  if (!currentUser || !currentCoupleId) return;
  if (getThinkCooldownRemaining() > 0) return;

  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
  if (!partnerUid) return;

  burstHearts();
  vibrate([15, 30, 15]);

  localStorage.setItem(thinkCooldownKey(), String(Date.now()));

  try {
    await addDoc(collection(db, "couples", currentCoupleId, "signals"), {
      type: "think",
      thought: thought || "думаю о тебе",
      fromUserId: currentUser.uid,
      toUserId: partnerUid,
      ts: Date.now(),
      createdAt: serverTimestamp()
    });
    showToast("Отправлено", thought || "думаю о тебе");
  } catch (e) {
    console.error("Think signal error:", e);
    localStorage.removeItem(thinkCooldownKey());
    alert("Не удалось отправить сигнал: " + e.message);
  }
}

function initQuickReactions() {
  const polaroid = $("partner-polaroid");
  const ring = $("quick-ring");
  if (!polaroid || !ring) return;

  polaroid.addEventListener("click", (e) => {
    if (e.target.closest(".q-btn")) return;
    if (e.target.closest("#pulse-partner")) return;

    const remaining = getThinkCooldownRemaining();
    if (remaining > 0) {
      const min = Math.ceil(remaining / 60000);
      const label = min >= 60 ? Math.ceil(min / 60) + "ч" : min + "м";
      showToast("Подожди", `Следующий сигнал через ${label}`);
      return;
    }

    ring.classList.toggle("open");
    vibrate(10);
  });

  ring.querySelectorAll(".q-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const th = btn.dataset.th;
      ring.classList.remove("open");
      sendThinkSignal(th);
    });
  });

  document.addEventListener("click", (e) => {
    if (!ring.classList.contains("open")) return;
    if (e.target.closest("#partner-polaroid")) return;
    ring.classList.remove("open");
  });
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

      if (!signalsInitialized) {
        signalsInitialized = true;
        signals.forEach(s => processed.add(s.id));
        const keep = [...processed].slice(-100);
        localStorage.setItem(signalsProcessedKey(), JSON.stringify(keep));
        return;
      }

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

      const thinkSignals = newForMe.filter(s => s.type === "think" || !s.type);

      if (thinkSignals.length > 0) {
        const th = thinkSignals[0].thought || "думаю о тебе";
        const titles = {
          "скучаю":       `${partnerName} скучает 🥺`,
          "обнимаю":      `${partnerName} обнимает 🤗`,
          "целую":        `${partnerName} целует 😘`,
          "думаю о тебе": `${partnerName} думает о тебе ❤️`,
          "хочу тебя":    `${partnerName} хочет тебя 🔥`,
        };
        const title = titles[th] || `${partnerName} думает о тебе ❤️`;
        const body = thinkSignals.length > 1 ? `×${thinkSignals.length}` : "";
        notifyUser(title, body, "today", { avatar });
      }
    }
  );
}

/* ==========================================================
   АНИМАЦИЯ ДИНАМИЧЕСКИХ КАРТОЧЕК
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
  if (wordEl) wordEl.textContent = w.word;
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
/* ==========================================================
   МОДАЛКА «ЛУННЫЙ КАЛЕНДАРЬ»
   ========================================================== */

function initMoonModal() {
  const item = $("moon-info-item");
  if (item) item.onclick = openMoonModal;

  const backdrop = $("moon-backdrop");
  if (backdrop) backdrop.onclick = closeMoonModal;

  const closeBtn = $("moon-modal-close");
  if (closeBtn) closeBtn.onclick = closeMoonModal;

  const closeBtn2 = $("moon-modal-close-btn");
  if (closeBtn2) closeBtn2.onclick = closeMoonModal;
}

function openMoonModal() {
  const m = $("moon-modal");
  if (!m) return;
  m.classList.remove("hidden");
  vibrate(10);
}

function closeMoonModal() {
  const m = $("moon-modal");
  if (m) m.classList.add("hidden");
}
/* ==========================================================
   ПРИМИРЕНИЕ — режим внутри «Разговора»
   ========================================================== */

const DIALOGUE_ICONS = {
  dove: `<svg class="dialogue-icon" viewBox="0 0 24 24"><path d="M21 5 C18 5 16 6 14.5 8 C14 7 13 6.5 11.5 6.5 C8 6.5 5 9 5 12 L5 13 L2 14 L5 15 C5.5 18 8.5 21 13 21 C17.5 21 21 17.5 21 13 Z"/><path d="M12 8.5 L12 13"/><path d="M19 8 L20.5 6"/></svg>`,
  brokenHeart: `<svg class="dialogue-icon" viewBox="0 0 24 24"><path d="M12 21 C12 21 3 14 3 8.5 C3 5.5 5.5 3 8.5 3 C10.5 3 11.5 4 12 5 C12.5 4 13.5 3 15.5 3 C18.5 3 21 5.5 21 8.5 C21 14 12 21 12 21 Z"/><path d="M12 5 L10.5 9 L13.5 11 L12 15"/></svg>`,
  question: `<svg class="dialogue-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5 C9.5 8 10.7 7 12 7 C13.3 7 14.5 8 14.5 9.5 C14.5 11 13 12 12 12 L12 14"/><circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none"/></svg>`,
  drop: `<svg class="dialogue-icon" viewBox="0 0 24 24"><path d="M12 3 C12 3 6 10 6 14 C6 17.3 8.7 20 12 20 C15.3 20 18 17.3 18 14 C18 10 12 3 12 3 Z"/></svg>`,
  lightning: `<svg class="dialogue-icon" viewBox="0 0 24 24"><path d="M13 2 L4 13 L11 13 L11 22 L20 11 L13 11 Z"/></svg>`,
  hand: `<svg class="dialogue-icon" viewBox="0 0 24 24"><path d="M9 6 L9 12"/><path d="M12 4 L12 12"/><path d="M15 6 L15 12"/><path d="M6 13 C6 17 8.5 20 12 20 C15.5 20 18 17 18 13"/></svg>`,
  heart: `<svg class="dialogue-icon dialogue-icon--fill" viewBox="0 0 24 24"><path d="M12 21 C12 21 3 14 3 8.5 C3 5.5 5.5 3 8.5 3 C10.5 3 11.5 4 12 5 C12.5 4 13.5 3 15.5 3 C18.5 3 21 5.5 21 8.5 C21 14 12 21 12 21 Z"/></svg>`,
};

const DIALOGUE_FEELINGS = [
  { key: "обида",          label: "Обида",           icon: "brokenHeart" },
  { key: "недопонимание",  label: "Недопонимание",   icon: "question" },
  { key: "грусть",         label: "Просто грустно",  icon: "drop" },
  { key: "раздражение",    label: "Раздражение",     icon: "lightning" },
  { key: "поддержка",      label: "Нужна поддержка", icon: "hand" },
];

function getDialogueFeelingInfo(key) {
  return DIALOGUE_FEELINGS.find(f => f.key === key) || DIALOGUE_FEELINGS[0];
}

function getFeelingIcon(key, extraClass) {
  const f = getDialogueFeelingInfo(key);
  const svg = DIALOGUE_ICONS[f.icon] || "";
  if (!extraClass) return svg;
  return svg.replace('class="dialogue-icon"', `class="dialogue-icon ${extraClass}"`);
}

function getActiveReconcile() {
  return conversations.find(c => c.mode === "reconcile" && c.phase !== "done") || null;
}

function getPartnerNameForDialogue() {
  return partnerProfile?.displayName?.trim() || "Партнёр";
}
function getMyNameForDialogue() {
  return myProfile?.displayName?.trim() || "Вы";
}

function initDialogue() {
  const btn = $("reconcile-btn");
  if (btn) btn.onclick = onReconcileClick;
  const backdrop = $("dialogue-backdrop");
  if (backdrop) backdrop.onclick = closeDialogueModal;

  const content = $("dialogue-modal-content");
  if (content && content.dataset.dlgBound !== "1") {
    content.dataset.dlgBound = "1";
    content.addEventListener("click", (e) => {
      const el = e.target.closest("[data-dlg-action]");
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();

      const action = el.dataset.dlgAction;
      const id = el.dataset.dlgId;
      const key = el.dataset.dlgKey;

      switch (action) {
        case "close":            closeDialogueModal(); break;
        case "pick-feeling":     pickDialogueFeeling(key); break;
        case "submit-feeling":   submitDialogueFeeling(); break;
        case "cancel-dialogue":  cancelDialogue(id); break;
        case "accept":           acceptDialogue(id); break;
        case "save-text":        saveDialogueText(id); break;
        case "save-and-ready":   saveAndReadyDialogue(id); break;
        case "open-agreement":   openDialogueAgreement(id); break;
        case "cancel-ready":     cancelReadyToSign(id); break;
        case "save-agreement":   saveDialogueAgreement(id); break;
        case "cancel-draft":     cancelDraft(id); break;
        case "force-finalize":   forceFinalizeDraft(id); break;
        case "sign":             signDialogue(id); break;
        case "sign-for-partner": signForPartner(id); break;
        case "open-modal":       openDialogueModal(id); break;
        case "cancel-old-new":   cancelOldDialogueAndStartNew(id); break;
        case "open-pause":       openPauseModal(id); break;
        case "cancel-pause":     cancelPause(id); break;
      }
    });
  }
}

function onReconcileClick() {
  vibrate(10);
  const active = getActiveReconcile();
  if (active) {
    openDialogueBlockModal(active);
  } else {
    openFeelingPicker();
  }
}

function openDialogueBlockModal(conv) {
  const f = getDialogueFeelingInfo(conv.feeling);
  const iAmInitiator = conv.initiatedBy === currentUser.uid;
  const partnerName = getPartnerNameForDialogue();
  const dateStr = formatDate(conv.createdAt);

  let meta = "";
  if (conv.phase === "invite") {
    meta = iAmInitiator
      ? `от ${dateStr} · ждём <strong>${escapeHtml(partnerName)}</strong>`
      : `от ${dateStr} · <strong>${escapeHtml(partnerName)}</strong> ждёт твоего ответа`;
  } else if (conv.phase === "talking") {
    meta = `от ${dateStr} · оба пишете`;
  } else if (conv.phase === "signing") {
    meta = `от ${dateStr} · к подписи`;
  }

  const actionsHtml = iAmInitiator
    ? `
      <button class="dialogue-btn dialogue-btn--danger" data-dlg-action="cancel-old-new" data-dlg-id="${conv.id}">Отменить старое</button>
      <span class="dialogue-btn__sub">Сможешь создать новое</span>
      <button class="dialogue-link dialogue-link--muted" data-dlg-action="close">Отмена</button>
    `
    : `
      <div class="dialogue__block-footer">
        Закрыть это примирение может только <strong>${escapeHtml(partnerName)}</strong>
      </div>
      <button class="dialogue-link dialogue-link--muted" style="margin-top:12px;" data-dlg-action="close">Отмена</button>
    `;

  const content = $("dialogue-modal-content");
  content.innerHTML = `
    <div class="dialogue__block-icon">${DIALOGUE_ICONS.dove}</div>
    <div class="dialogue__block-title">У вас уже идёт примирение</div>

    <div class="dialogue__block-feeling">
      <span class="dialogue__block-feeling-icon">${getFeelingIcon(conv.feeling)}</span>
      <span>${escapeHtml(f.label)}</span>
    </div>
    <div class="dialogue__block-meta">${meta}</div>

    <button class="dialogue-btn" data-dlg-action="open-modal" data-dlg-id="${conv.id}">Открыть его</button>
    ${actionsHtml}
  `;

  $("dialogue-modal").classList.remove("hidden");
}

async function cancelOldDialogueAndStartNew(convId) {
  if (!confirm("Отменить старое примирение и создать новое?")) return;
  try {
    await deleteDoc(doc(db, "couples", currentCoupleId, "conversations", convId));
    closeDialogueModal();
    setTimeout(openFeelingPicker, 200);
  } catch (e) {
    console.error(e);
    alert("Ошибка: " + e.message);
  }
}

let _tmpDialogueFeeling = null;
let _tmpDialogueReason = "";
let _currentDialogueId = null;

function openFeelingPicker() {
  _tmpDialogueFeeling = null;
  _tmpDialogueReason = "";

  const partnerName = getPartnerNameForDialogue();

  const moodsHtml = DIALOGUE_FEELINGS.map(f => `
    <button class="dialogue-mood" data-dlg-action="pick-feeling" data-dlg-key="${f.key}" data-key="${f.key}">
      <span class="dialogue-mood__icon">${DIALOGUE_ICONS[f.icon]}</span>
      <span>${escapeHtml(f.label)}</span>
    </button>
  `).join("");

  const content = $("dialogue-modal-content");
  content.innerHTML = `
    <div class="dialogue__head">
      <div class="dialogue__label">Примирение</div>
      <button class="dialogue__close" data-dlg-action="close">✕</button>
    </div>

    <div class="dialogue__subtitle">Что сейчас между вами?</div>

    <div class="dialogue__mood-list" id="dialogue-mood-list">
      ${moodsHtml}
    </div>

    <label class="field-label">Что случилось? <span class="optional">(необязательно)</span></label>
    <textarea id="dialogue-reason-input" rows="2" placeholder="Коротко, чтобы ${escapeHtml(partnerName)} понял..."></textarea>

    <button class="dialogue-btn" id="dialogue-submit-btn" disabled data-dlg-action="submit-feeling">Предложить примирение</button>
  `;

  const ta = $("dialogue-reason-input");
  ta.addEventListener("input", () => { _tmpDialogueReason = ta.value; });

  $("dialogue-modal").classList.remove("hidden");
}

function pickDialogueFeeling(key) {
  vibrate(10);
  _tmpDialogueFeeling = key;
  document.querySelectorAll("#dialogue-mood-list .dialogue-mood").forEach(b => {
    b.classList.toggle("active", b.dataset.key === key);
  });
  const submitBtn = $("dialogue-submit-btn");
  if (submitBtn) submitBtn.disabled = false;
}

async function submitDialogueFeeling() {
  if (!_tmpDialogueFeeling) return;
  const btn = $("dialogue-submit-btn");
  btn.disabled = true;
  try {
    await addDoc(collection(db, "couples", currentCoupleId, "conversations"), {
      mode: "reconcile",
      phase: "invite",
      initiatedBy: currentUser.uid,
      feeling: _tmpDialogueFeeling,
      reason: _tmpDialogueReason.trim(),
      texts: {},
      signatures: {},
      createdBy: currentUser.uid,
      createdAt: serverTimestamp()
    });
    vibrate(15);
    closeDialogueModal();
  } catch (e) {
    console.error(e);
    alert("Ошибка: " + e.message);
    btn.disabled = false;
  }
}

function openDialogueModal(convId) {
  const conv = conversations.find(c => c.id === convId);
  if (!conv) return;

  _currentDialogueId = convId;
  renderDialogueContent(conv);

  $("dialogue-modal").classList.remove("hidden");
  document.body.classList.add("state-reconcile");
  vibrate(10);
}

function renderDialogueContent(conv) {
  // Если в примирении пауза — показываем paused-state вместо всего остального
  if (isConvPaused(conv)) {
    const f = getDialogueFeelingInfo(conv.feeling);
    const content = $("dialogue-modal-content");
    content.innerHTML = `
      <div class="dialogue__head">
        <div class="dialogue__label">Примирение</div>
        <button class="dialogue__close" data-dlg-action="close">✕</button>
      </div>
      <div style="text-align:center;">
        <div class="dialogue__context">
          <span class="dialogue__context-icon">${getFeelingIcon(conv.feeling)}</span>
          <span>${escapeHtml(f.label)}</span>
        </div>
      </div>
      <div class="paused-state">
        <div class="paused-state__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
        </div>
        <div class="paused-state__title">Пауза</div>
        <div class="paused-state__origin">в этом примирении · <b>${escapeHtml(conv.pausedLabel || '')}</b></div>
        <div class="paused-state__countdown" data-pause-countdown data-pause-id="${conv.id}">${formatPauseRemaining(getConvPauseRemaining(conv))}</div>
        <div class="paused-state__text">Ты взял(а) время подумать. Партнёр видит знак именно здесь и ждёт — без давления.</div>
        <button class="btn-pause" data-dlg-action="cancel-pause" data-dlg-id="${conv.id}" style="margin-top:6px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          Снять паузу
        </button>
      </div>
    `;
    startPauseTimer();
    return;
  }

  if (conv.phase === "done") {
    renderDialogueDone(conv);
  } else if (conv.phase === "invite") {
    if (conv.initiatedBy === currentUser.uid) renderDialogueWaiting(conv);
    else renderDialoguePartnerScreen(conv);
  } else if (conv.phase === "talking") {
    const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
    const ready = conv.readyToSign || {};
    const iReady = !!ready[currentUser.uid];
    const partnerReady = !!ready[partnerUid];
    const draft = conv.draftAgreement;

    if (iReady && partnerReady) {
      if (draft && draft.by === currentUser.uid) {
        renderDialogueWaitingDraft(conv);
      } else {
        renderDialogueAgreementForm(conv);
      }
    } else if (iReady && !partnerReady) {
      renderDialogueWaitingAgreement(conv);
    } else {
      renderDialogueTalking(conv);
    }
  } else if (conv.phase === "signing") {
    renderDialogueSigning(conv);
  }
}

function closeDialogueModal() {
  const m = $("dialogue-modal");
  if (m) m.classList.add("hidden");
  document.body.classList.remove("state-reconcile");
  _currentDialogueId = null;
}

function renderDialogueWaiting(conv) {
  const f = getDialogueFeelingInfo(conv.feeling);
  const partnerName = getPartnerNameForDialogue();

  const content = $("dialogue-modal-content");
  content.innerHTML = `
    <div class="dialogue__waiting">
      <div class="dialogue__waiting-icon">${DIALOGUE_ICONS.dove}</div>

      <div class="dialogue__feeling-hero">
        <div class="dialogue__feeling-hero-label">Между вами</div>
        <div class="dialogue__feeling-hero-value">
          <span class="dialogue__feeling-hero-icon">${getFeelingIcon(conv.feeling)}</span>
          <span>${escapeHtml(f.label)}</span>
        </div>
      </div>

      <div class="dialogue__waiting-title">Ждём ${escapeHtml(partnerName)}</div>
      <div class="dialogue__waiting-text">
        Вы предложили примирение.<br>
        Как только ${escapeHtml(partnerName)} откроет — начнём.
      </div>

      <button class="dialogue-btn" data-dlg-action="close">Понятно</button>
      <button class="dialogue-link dialogue-link--muted" data-dlg-action="cancel-dialogue" data-dlg-id="${conv.id}">Отменить предложение</button>
    </div>
  `;
}

async function cancelDialogue(convId) {
  const conv = conversations.find(c => c.id === convId);
  if (!conv) return;
  if (conv.initiatedBy !== currentUser.uid) return;
  if (!confirm("Отменить примирение?")) return;
  try {
    await deleteDoc(doc(db, "couples", currentCoupleId, "conversations", convId));
    closeDialogueModal();
  } catch (e) {
    console.error(e);
    alert("Ошибка: " + e.message);
  }
}

function renderDialoguePartnerScreen(conv) {
  const f = getDialogueFeelingInfo(conv.feeling);
  const myName = getMyNameForDialogue();
  const partnerName = getPartnerNameForDialogue();
  const reasonHtml = conv.reason
    ? `<div class="dialogue__partner-hint">«${escapeHtml(conv.reason)}»</div>`
    : "";

  const content = $("dialogue-modal-content");
  content.innerHTML = `
    <div class="dialogue__partner">
      <div class="dialogue__partner-title">Нужен диалог</div>

      <div class="dialogue__names">
        <span>${escapeHtml(myName)}</span>
        <span class="dialogue__names-heart">${DIALOGUE_ICONS.heart}</span>
        <span>${escapeHtml(partnerName)}</span>
      </div>

      <div class="dialogue__feeling-big">
        Сейчас между вами есть
        <em>${escapeHtml(f.label.toLowerCase())}</em>
      </div>

      <div class="dialogue__partner-text">
        Поговорите о чувствах и о ситуации —<br>
        скажите друг другу то, что важно.
      </div>

      ${reasonHtml}
      <div class="dialogue__partner-hint">${escapeHtml(partnerName)} предлагает перейти к договору</div>

      ${renderLessonHint()}

      <button class="dialogue-btn" data-dlg-action="accept" data-dlg-id="${conv.id}">К договору</button>

      <button class="btn-pause" data-dlg-action="open-pause" data-dlg-id="${conv.id}" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
        Мне нужно время
      </button>

      <button class="dialogue__secondary-link" data-dlg-action="close">Не сейчас</button>

      <div class="dialogue__partner-footer">
        Режим завершится, когда вы оба подпишете договор.
      </div>
    </div>
  `;
  bindLessonHint(conv);
}

async function acceptDialogue(convId) {
  try {
    await updateDoc(doc(db, "couples", currentCoupleId, "conversations", convId), {
      phase: "talking"
    });
    vibrate(10);
  } catch (e) {
    console.error(e);
    alert("Ошибка: " + e.message);
  }
}

function renderDialogueTalking(conv) {
  const f = getDialogueFeelingInfo(conv.feeling);
  const myText = (conv.texts || {})[currentUser.uid] || "";
  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
  const partnerText = (conv.texts || {})[partnerUid] || "";
  const partnerName = getPartnerNameForDialogue();
  const bothWrote = myText && partnerText;

  const partnerBoxHtml = partnerText
    ? `<div class="dialogue__partner-box dialogue__partner-box--open">${escapeHtml(partnerText)}</div>`
    : `<div class="dialogue__partner-box">${escapeHtml(partnerName)} ещё не ${gendered(partnerProfile, "написал", "написала")}.<br>Мы скажем, когда ответит.</div>`;

  const partnerReady = !!(conv.readyToSign || {})[partnerUid];
  const partnerReadyHint = partnerReady
    ? `<div class="dialogue__partner-hint" style="margin-top:10px;">${escapeHtml(partnerName)} уже готов перейти к договору</div>`
    : "";

  const saveBtnHtml = `<button class="dialogue-btn" data-dlg-action="save-and-ready" data-dlg-id="${conv.id}">К договору</button>`;

  const content = $("dialogue-modal-content");
  content.innerHTML = `
    <div style="text-align:center;">
      <div class="dialogue__context">
        <span class="dialogue__context-icon">${getFeelingIcon(conv.feeling)}</span>
        <span>${escapeHtml(f.label)}</span>
      </div>
    </div>

    <div class="dialogue__subtitle">Что важно для меня</div>

    <textarea id="dialogue-my-text" rows="${bothWrote ? 4 : 5}" placeholder="Напиши своё — ${escapeHtml(partnerName.toLowerCase())} увидит, когда напишет он.">${escapeHtml(myText)}</textarea>

    ${saveBtnHtml}
    ${partnerReadyHint}

    <div style="margin-top:14px;">
      ${partnerBoxHtml}
    </div>

    ${renderLessonHint()}

    <button class="btn-pause" data-dlg-action="open-pause" data-dlg-id="${conv.id}" type="button">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
      Мне нужно время
    </button>
  `;
  bindLessonHint(conv);
}
async function saveDialogueAgreement(convId) {
  const conv = conversations.find(c => c.id === convId);
  if (!conv) return;

  const title = ($("dlg-agr-title")?.value || "").trim();
  const text = ($("dlg-agr-text")?.value || "").trim();
  if (!title) { alert("Введи название договора"); return; }

  const draft = conv.draftAgreement;

  if (draft && draft.by !== currentUser.uid && draft.title === title && draft.text === text) {
    await acceptAndFinalize(convId, draft);
    return;
  }

  await proposeDraft(convId, title, text);
}

async function proposeDraft(convId, title, text) {
  try {
    const draft = {
      title,
      text,
      by: currentUser.uid,
      ts: Date.now()
    };
    await updateDoc(doc(db, "couples", currentCoupleId, "conversations", convId), {
      draftAgreement: draft
    });
    vibrate(15);
    const conv = conversations.find(c => c.id === convId);
    if (conv) renderDialogueWaitingDraft({ ...conv, draftAgreement: draft });
  } catch (e) {
    console.error(e);
    alert("Ошибка: " + e.message);
  }
}

async function acceptAndFinalize(convId, draft) {
  const btn = $("dlg-agr-submit");
  if (btn) btn.disabled = true;
  try {
    const ref = await addDoc(collection(db, "couples", currentCoupleId, "agreements"), {
      title: draft.title,
      text: draft.text,
      createdBy: draft.by,
      createdAt: serverTimestamp(),
      done: false,
      fromDialogue: true,
      fromConversation: convId
    });
    await updateDoc(doc(db, "couples", currentCoupleId, "conversations", convId), {
      phase: "signing",
      agreementId: ref.id,
      draftAgreement: null
    });
    vibrate(15);
  } catch (e) {
    console.error(e);
    alert("Ошибка: " + e.message);
    if (btn) btn.disabled = false;
  }
}

async function cancelDraft(convId) {
  try {
    await updateDoc(doc(db, "couples", currentCoupleId, "conversations", convId), {
      draftAgreement: null
    });
    vibrate(10);
  } catch (e) {
    console.error(e);
    alert("Ошибка: " + e.message);
  }
}

async function forceFinalizeDraft(convId) {
  const conv = conversations.find(c => c.id === convId);
  if (!conv || !conv.draftAgreement) return;
  if (!confirm("Отправить версию как есть, без согласования с партнёром?")) return;
  await acceptAndFinalize(convId, conv.draftAgreement);
}
async function saveDialogueText(convId) {
  const ta = $("dialogue-my-text");
  if (!ta) return;
  const text = ta.value.trim();
  if (!text) { alert("Напиши что-нибудь"); return; }

  try {
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;
    const texts = { ...(conv.texts || {}) };
    texts[currentUser.uid] = text;
    await updateDoc(doc(db, "couples", currentCoupleId, "conversations", convId), { texts });
    vibrate(10);
  } catch (e) {
    console.error(e);
    alert("Ошибка: " + e.message);
  }
}
async function saveAndReadyDialogue(convId) {
  const ta = $("dialogue-my-text");
  const conv = conversations.find(c => c.id === convId);
  if (!conv) return;

  const text = ta ? ta.value.trim() : "";
  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);

  const texts = { ...(conv.texts || {}) };
  if (text) texts[currentUser.uid] = text;

  const ready = { ...(conv.readyToSign || {}) };
  ready[currentUser.uid] = Date.now();

  try {
    await updateDoc(doc(db, "couples", currentCoupleId, "conversations", convId), {
      texts,
      readyToSign: ready
    });
    vibrate(15);

    if (ready[partnerUid]) {
      renderDialogueAgreementForm({ ...conv, texts, readyToSign: ready });
    } else {
      renderDialogueWaitingAgreement({ ...conv, texts, readyToSign: ready });
    }
  } catch (e) {
    console.error(e);
    alert("Ошибка: " + e.message);
  }
}
async function openDialogueAgreement(convId) {
  const conv = conversations.find(c => c.id === convId);
  if (!conv) return;

  // Ставим флаг «я готов к договору»
  const ready = { ...(conv.readyToSign || {}) };
  ready[currentUser.uid] = Date.now();

  try {
    await updateDoc(doc(db, "couples", currentCoupleId, "conversations", convId), {
      readyToSign: ready
    });
  } catch (e) {
    console.error(e);
    alert("Ошибка: " + e.message);
    return;
  }

  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
  const bothReady = ready[currentUser.uid] && ready[partnerUid];

  if (!bothReady) {
    renderDialogueWaitingAgreement(conv);
    vibrate(10);
    return;
  }

  renderDialogueAgreementForm(conv);
  vibrate(10);
}
async function cancelReadyToSign(convId) {
  const conv = conversations.find(c => c.id === convId);
  if (!conv) return;
  const ready = { ...(conv.readyToSign || {}) };
  delete ready[currentUser.uid];
  try {
    await updateDoc(doc(db, "couples", currentCoupleId, "conversations", convId), {
      readyToSign: ready
    });
    renderDialogueTalking({ ...conv, readyToSign: ready });
    vibrate(10);
  } catch (e) {
    console.error(e);
  }
}
function renderDialogueWaitingAgreement(conv) {
  const f = getDialogueFeelingInfo(conv.feeling);
  const partnerName = getPartnerNameForDialogue();

  const content = $("dialogue-modal-content");
  content.innerHTML = `
    <div style="text-align:center;">
      <div class="dialogue__context">
        <span class="dialogue__context-icon">${getFeelingIcon(conv.feeling)}</span>
        <span>${escapeHtml(f.label)}</span>
      </div>
    </div>

    <div class="dialogue__waiting">
      <div class="dialogue__waiting-title">Ждём ${escapeHtml(partnerName)}</div>
      <div class="dialogue__waiting-text">
        Ты готов перейти к договору.<br>
        Как только ${escapeHtml(partnerName)} тоже нажмёт «К договору» — откроется форма.
      </div>

      <button class="dialogue-btn" data-dlg-action="cancel-ready" data-dlg-id="${conv.id}">Вернуться к диалогу</button>
    </div>
  `;
}

function renderDialogueWaitingDraft(conv) {
  const f = getDialogueFeelingInfo(conv.feeling);
  const partnerName = getPartnerNameForDialogue();
  const draft = conv.draftAgreement || {};

  const content = $("dialogue-modal-content");
  content.innerHTML = `
    <div style="text-align:center;">
      <div class="dialogue__context">
        <span class="dialogue__context-icon">${getFeelingIcon(conv.feeling)}</span>
        <span>${escapeHtml(f.label)}</span>
      </div>
    </div>

    <div class="dialogue__waiting">
      <div class="dialogue__waiting-title">Ждём ${escapeHtml(partnerName)}</div>
      <div class="dialogue__waiting-text">
        Ты предложил версию договора.<br>
        ${escapeHtml(partnerName)} посмотрит и либо согласится, либо предложит свою.
      </div>

      <div class="dialogue__agreement-box" style="margin-top:14px;text-align:left;">
        <div class="dialogue__agreement-title">${escapeHtml(draft.title || "")}</div>
        <div class="dialogue__agreement-text">${escapeHtml(draft.text || "")}</div>
      </div>

      <button class="dialogue-btn" data-dlg-action="force-finalize" data-dlg-id="${conv.id}">Отправить как есть</button>
      <button class="dialogue-link dialogue-link--muted" data-dlg-action="cancel-draft" data-dlg-id="${conv.id}">Отозвать черновик</button>
    </div>
  `;
}

function renderDialogueAgreementForm(conv) {
  const f = getDialogueFeelingInfo(conv.feeling);
  const draft = conv.draftAgreement;
  const partnerName = getPartnerNameForDialogue();
  const draftByPartner = draft && draft.by !== currentUser.uid;

  const initialTitle = draft ? draft.title : "";
  const initialText = draft ? draft.text : "";

  const modeLabel = draftByPartner
    ? `<div class="dialogue__partner-hint" style="margin-bottom:14px;text-align:center;">Версия ${escapeHtml(partnerName)}</div>`
    : "";

  const btnLabel = draftByPartner ? "Согласен и подписать" : "Предложить партнёру";

  const content = $("dialogue-modal-content");
  content.innerHTML = `
    <div style="text-align:center;">
      <div class="dialogue__context">
        <span class="dialogue__context-icon">${getFeelingIcon(conv.feeling)}</span>
        <span>${escapeHtml(f.label)}</span>
      </div>
    </div>

    <div class="dialogue__subtitle">Что мы решили вместе</div>
    ${modeLabel}

    <label class="field-label">О чём договорились</label>
    <input type="text" id="dlg-agr-title" placeholder="Например: «Прощаемся перед уходом»" maxlength="80" value="${escapeHtml(initialTitle)}">

    <label class="field-label">Детали</label>
    <textarea id="dlg-agr-text" rows="4" placeholder="Что именно решили, как часто, с какого момента..." maxlength="1000">${escapeHtml(initialText)}</textarea>

    <button class="dialogue-btn" data-dlg-action="save-agreement" data-dlg-id="${conv.id}" id="dlg-agr-submit">${btnLabel}</button>
    <button class="dialogue-link" data-dlg-action="open-modal" data-dlg-id="${conv.id}">Назад</button>
  `;

  if (draftByPartner) {
    const titleEl = $("dlg-agr-title");
    const textEl = $("dlg-agr-text");
    const btnEl = $("dlg-agr-submit");
    const check = () => {
      const changed =
        titleEl.value.trim() !== initialTitle ||
        textEl.value.trim() !== initialText;
      btnEl.textContent = changed ? "Предложить свою версию" : "Согласен и подписать";
    };
    titleEl.addEventListener("input", check);
    textEl.addEventListener("input", check);
  }
}

function renderDialogueSigning(conv) {
  const f = getDialogueFeelingInfo(conv.feeling);
  const signatures = conv.signatures || {};
  const iSigned = !!signatures[currentUser.uid];
  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
  const partnerSigned = !!signatures[partnerUid];
  const partnerName = getPartnerNameForDialogue();
  const myName = getMyNameForDialogue();

  const agreementId = conv.agreementId;
  const agreement = (agreements || []).find(a => a.id === agreementId) || { title: "Договор", text: "" };

  const signsHtml = `
    <span class="dialogue__sign ${iSigned ? 'dialogue__sign--done' : 'dialogue__sign--waiting'}">${escapeHtml(myName)} ${iSigned ? '✓' : '…'}</span>
    <span class="dialogue__sign ${partnerSigned ? 'dialogue__sign--done' : 'dialogue__sign--waiting'}">${escapeHtml(partnerName)} ${partnerSigned ? '✓' : '…'}</span>
  `;

  const footerHtml = (!iSigned && !partnerSigned)
    ? `<div class="dialogue__partner-footer" style="margin-top:14px;">Режим завершится, когда подпишут оба.</div>`
    : "";

  const content = $("dialogue-modal-content");
  content.innerHTML = `
    <div style="text-align:center;">
      <div class="dialogue__context">
        <span class="dialogue__context-icon">${getFeelingIcon(conv.feeling)}</span>
        <span>${escapeHtml(f.label)}</span>
      </div>
    </div>

    <div class="dialogue__subtitle">Договор</div>

    <div class="dialogue__agreement-box">
      <div class="dialogue__agreement-title">${escapeHtml(agreement.title || "Договор")}</div>
      <div class="dialogue__agreement-text">${escapeHtml(agreement.text || "")}</div>
    </div>

    <button class="dialogue-btn" ${iSigned ? 'disabled' : ''} data-dlg-action="sign" data-dlg-id="${conv.id}">
      ${iSigned ? '✓ Подписано' : 'Подписываю'}
    </button>

    <div class="dialogue__signs" style="margin-top:14px;">
      ${signsHtml}
    </div>

    ${footerHtml}
  `;
}

async function signDialogue(convId) {
  try {
    const ref = doc(db, "couples", currentCoupleId, "conversations", convId);
    const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
    let isDone = false;

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error("Разговор не найден");
      const data = snap.data();
      const signatures = { ...(data.signatures || {}) };
      signatures[currentUser.uid] = Date.now();

      const update = { signatures };
      if (signatures[partnerUid]) {
        update.phase = "done";
        update.doneAt = serverTimestamp();
        isDone = true;
      }
      tx.update(ref, update);
    });

    vibrate(15);
    if (isDone) setTimeout(() => burstDialogueHearts(), 200);
  } catch (e) {
    console.error(e);
    alert("Ошибка: " + e.message);
  }
}

async function signForPartner(convId) {
  try {
    const ref = doc(db, "couples", currentCoupleId, "conversations", convId);
    const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
    let isDone = false;

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error("Разговор не найден");
      const data = snap.data();
      const signatures = { ...(data.signatures || {}) };
      signatures[partnerUid] = Date.now();

      const update = { signatures };
      if (signatures[currentUser.uid]) {
        update.phase = "done";
        update.doneAt = serverTimestamp();
        isDone = true;
      }
      tx.update(ref, update);
    });

    vibrate(15);
    if (isDone) setTimeout(() => burstDialogueHearts(), 200);
  } catch (e) {
    console.error(e);
    alert("Ошибка: " + e.message);
  }
}

function renderDialogueDone(conv) {
  const content = $("dialogue-modal-content");
  content.innerHTML = `
    <div class="dialogue__done">
      <div class="dialogue__done-icon">${DIALOGUE_ICONS.heart}</div>
      <div class="dialogue__done-title">Мир</div>
      <div class="dialogue__done-text">Спасибо, что услышали друг друга.</div>
    </div>
    <button class="dialogue-link" style="margin-top:20px;" data-dlg-action="close">Закрыть</button>
    <div class="dialogue__heart-burst" id="dialogue-heart-burst"></div>
  `;
  setTimeout(() => burstDialogueHearts(), 150);
}

function burstDialogueHearts() {
  const hb = $("dialogue-heart-burst");
  if (!hb) return;
  for (let i = 0; i < 10; i++) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = DIALOGUE_ICONS.heart;
    const svg = wrapper.firstElementChild;
    const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.4;
    const dist = 90 + Math.random() * 60;
    svg.style.setProperty("--dx", Math.cos(angle) * dist + "px");
    svg.style.setProperty("--dy", Math.sin(angle) * dist + "px");
    svg.style.animationDelay = (i * 0.04) + "s";
    hb.appendChild(svg);
  }
}

function buildDialogueCard(conv, isDone) {
  const f = getDialogueFeelingInfo(conv.feeling);
  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
  const partnerName = getPartnerNameForDialogue();

  const card = document.createElement("div");
  card.className = "conv-card conv-card--reconcile";
  card.dataset.animId = conv.id;
  if (isDone) card.classList.add("is-done");

  const paused = isConvPaused(conv);
  if (paused) card.classList.add("conv-card--paused");

  let statusHtml = "";
  let statusDot = "";

  if (paused) {
    statusDot = `<span class="status-dot paused"></span>`;
    statusHtml = `
      <span class="conv-card__paused-tag">⏸ ${escapeHtml(conv.pausedLabel || 'пауза')}</span>
      <span data-pause-countdown data-pause-id="${conv.id}">${formatPauseRemaining(getConvPauseRemaining(conv))}</span>
    `;
  } else if (conv.phase === "invite") {
    if (conv.initiatedBy === currentUser.uid) {
      statusHtml = `Ждём ${escapeHtml(partnerName)}`;
    } else {
      statusHtml = `${escapeHtml(partnerName)} ждёт вас`;
    }
    statusDot = `<span class="status-dot status-dot--invite"></span>`;
  } else if (conv.phase === "talking") {
    const myText = (conv.texts || {})[currentUser.uid];
    const partnerText = (conv.texts || {})[partnerUid];
    if (myText && !partnerText) statusHtml = `${escapeHtml(partnerName)} ещё не написал`;
    else if (!myText && partnerText) statusHtml = `${escapeHtml(partnerName)} написал, ваша очередь`;
    else statusHtml = "Оба пишут";
    statusDot = `<span class="status-dot status-dot--talking"></span>`;
  } else if (conv.phase === "signing") {
    const signatures = conv.signatures || {};
    if (signatures[currentUser.uid] && !signatures[partnerUid]) statusHtml = `Ждём подписи ${escapeHtml(partnerName)}`;
    else if (!signatures[currentUser.uid] && signatures[partnerUid]) statusHtml = `${escapeHtml(partnerName)} подписал, ваша очередь`;
    else statusHtml = "К подписи";
    statusDot = `<span class="status-dot status-dot--signing"></span>`;
  } else if (conv.phase === "done") {
    statusHtml = "Мир";
    statusDot = `<span class="status-dot status-dot--done"></span>`;
  }

  card.innerHTML = `
    <div class="conv-card__badge">${DIALOGUE_ICONS.dove}</div>
    <div class="conv-card__feeling">
      <span class="conv-card__icon">${getFeelingIcon(conv.feeling)}</span>
      <span class="conv-card__name">${escapeHtml(f.label)}</span>
    </div>
    <div class="conv-card__date">${formatDate(conv.createdAt)}</div>
    <div class="conv-card__status">
      ${statusDot}
      ${statusHtml}
    </div>
  `;

  card.onclick = () => openDialogueModal(conv.id);
  return card;
}

window.openDialogueModal = openDialogueModal;
window.closeDialogueModal = closeDialogueModal;
window.pickDialogueFeeling = pickDialogueFeeling;
window.submitDialogueFeeling = submitDialogueFeeling;
window.cancelDialogue = cancelDialogue;
window.acceptDialogue = acceptDialogue;
window.saveDialogueText = saveDialogueText;
window.openDialogueAgreement = openDialogueAgreement;
window.signDialogue = signDialogue;
window.signForPartner = signForPartner;
window.cancelOldDialogueAndStartNew = cancelOldDialogueAndStartNew;

/* ==========================================================
   РИТМ — лента жизни пары
   ========================================================== */

function initRhythm() {
  listenForJournalNotes();

  const backdrop = $("note-backdrop");
  if (backdrop) backdrop.onclick = closeNoteSheet;

  const cancel = $("note-cancel");
  if (cancel) cancel.onclick = closeNoteSheet;

  const save = $("note-save");
  if (save) save.onclick = saveNote;

  document.querySelectorAll("#feed-chips .feed-chip").forEach(btn => {
    btn.onclick = () => {
      vibrate(10);
      document.querySelectorAll("#feed-chips .feed-chip").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      rhythmFilter = btn.dataset.filter;
      renderRhythmTimeline({ animateAll: true });
    };
  });
}

function listenForJournalNotes() {
  if (unsubJournalNotes) unsubJournalNotes();
  unsubJournalNotes = onSnapshot(
    collection(db, "couples", currentCoupleId, "journalNotes"),
    (snap) => {
      journalNotes = {};
      snap.docs.forEach(d => { journalNotes[d.id] = { id: d.id, ...d.data() }; });
      if (currentView === "rhythm") {
        renderPulseStrip();
        renderRhythmTimeline();
      }
    }
  );
}

function getDayDate(dayIndex) {
  if (!currentCouple?.startDate) return new Date();
  const start = currentCouple.startDate.toDate
    ? currentCouple.startDate.toDate()
    : new Date(currentCouple.startDate);
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  d.setDate(d.getDate() + (dayIndex - 1));
  return d;
}

function dayFromTimestamp(ts) {
  if (!ts || !currentCouple?.startDate) return null;
  const t = ts.toDate ? ts.toDate() : new Date(ts);
  const start = currentCouple.startDate.toDate
    ? currentCouple.startDate.toDate()
    : new Date(currentCouple.startDate);
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const tDay = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  const diff = Math.round((tDay - startDay) / 86400000);
  const day = diff + 1;
  return day >= 1 && day <= 365 ? day : null;
}

async function loadRhythmData() {
  const now = Date.now();
  if (now - _rhythmCache.loadedAt < 15000) return;

  const [moodsSnap, answersSnap, convSnap, agrSnap] = await Promise.all([
    getDocs(collection(db, "couples", currentCoupleId, "moods")),
    getDocs(collection(db, "couples", currentCoupleId, "answers")),
    getDocs(collection(db, "couples", currentCoupleId, "conversations")),
    getDocs(collection(db, "couples", currentCoupleId, "agreements"))
  ]);

  const moods = {};
  moodsSnap.docs.forEach(d => {
    const data = d.data();
    moods[data.day] = data.moods || {};
  });

  const answersByDay = {};
  answersSnap.docs.forEach(d => {
    const data = d.data();
    if (!answersByDay[data.day]) answersByDay[data.day] = [];
    answersByDay[data.day].push({ id: d.id, ...data });
  });

  _rhythmCache = {
    moods,
    answers: answersByDay,
    conversations: convSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    agreements: agrSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    loadedAt: now
  };
}

function collectEventsByDay() {
  const map = {};
  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);

  for (const dayStr in _rhythmCache.answers) {
    const day = Number(dayStr);
    const arr = _rhythmCache.answers[dayStr];
    const mine = arr.find(a => a.userId === currentUser.uid);
    if (!mine) continue;
    const partner = arr.find(a => a.userId === partnerUid);
    const q = getQuestionForDay(day);
    if (!q) continue;
    if (!map[day]) map[day] = [];
    map[day].push({
      type: "qod",
      question: q.text,
      myAnswer: mine.text || "",
      partnerAnswer: partner ? (partner.text || "") : null
    });
  }

  for (const c of _rhythmCache.conversations) {
    const day = dayFromTimestamp(c.createdAt);
    if (!day) continue;
    if (!map[day]) map[day] = [];
    if (c.mode === "reconcile") {
      const f = getDialogueFeelingInfo(c.feeling);
      map[day].push({
        type: "reconcile",
        feeling: f.label,
        status: c.phase === "done" ? "Мир" : "В процессе"
      });
    } else {
      const t = c.texts || {};
      const both = t[currentUser.uid] && t[partnerUid];
      map[day].push({
        type: "conv",
        topic: c.topic || "Без темы",
        status: both ? "Оба написали" : "В процессе"
      });
    }
  }

  for (const a of _rhythmCache.agreements) {
    const day = dayFromTimestamp(a.createdAt);
    if (!day) continue;
    if (!map[day]) map[day] = [];
    map[day].push({ type: "agr", title: a.title || "Без названия", text: a.text || "" });
  }

  for (const id in journalNotes) {
    const n = journalNotes[id];
    if (!n.day) continue;
    if (n.userId !== currentUser.uid && !n.shared) continue;
    if (!map[n.day]) map[n.day] = [];
    map[n.day].push({
      type: "note",
      text: n.text || "",
      shared: !!n.shared,
      isMine: n.userId === currentUser.uid
    });
  }

  return map;
}

async function renderRhythm() {
  try { await loadRhythmData(); } catch (e) { console.error("Rhythm load error:", e); }
  renderPulseStrip();
  renderRhythmTimeline();
}

function renderPulseStrip() {
  const strip = $("pulse-strip");
  if (!strip) return;

  const today = getCurrentDay();
  const start = Math.max(1, today - 29);
  strip.innerHTML = "";

  const eventsByDay = collectEventsByDay();
  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);

  for (let day = start; day <= today; day++) {
    const moodSnap = _rhythmCache.moods[day] || {};
    const myMood = moodSnap[currentUser.uid] || null;
    const partnerMood = moodSnap[partnerUid] || null;
    const main = partnerMood || myMood;

    const cell = document.createElement("div");
    cell.className = "pulse-cell" + (day === today ? " is-today" : "");

    const cls = ["pulse-cell__emoji"];
    if (!main) cls.push("is-empty");
    if (myMood) cls.push("has-mine");

    const types = eventsByDay[day] ? [...new Set(eventsByDay[day].map(e => e.type))] : [];
    const markers = types.map(t => `<span class="marker-dot ${t}"></span>`).join("");

    cell.innerHTML = `
      <div class="${cls.join(" ")}">${main || "·"}</div>
      <div class="pulse-cell__marker">${markers}</div>
    `;

    cell.onclick = () => {
      const el = document.querySelector(`[data-day-key="${day}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.style.transition = "background .6s";
        el.style.background = "rgba(178,90,90,.08)";
        setTimeout(() => el.style.background = "", 1600);
      }
    };
    strip.appendChild(cell);
  }
  setTimeout(() => strip.scrollLeft = strip.scrollWidth, 60);
}

function renderRhythmTimeline(opts = {}) {
  const tl = $("feed-timeline");
  if (!tl) return;

  const animateAll = !!opts.animateAll;

  const prevKeys = new Set();
  tl.querySelectorAll("[data-day-key]").forEach(el => {
    prevKeys.add(String(el.dataset.dayKey));
  });

  const eventsByDay = collectEventsByDay();
  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);

  const days = Object.keys(eventsByDay).map(Number)
    .filter(day => {
      if (rhythmFilter === "all") return true;
      return eventsByDay[day].some(e => e.type === rhythmFilter);
    })
    .sort((a, b) => b - a);

  if (days.length === 0) {
    tl.innerHTML = `<div class="hint" style="text-align:center; padding: 30px 20px;">Пока пусто. Начните отвечать на вопросы дня 💛</div>`;
    requestAnimationFrame(() => initReveal());
    return;
  }

  tl.innerHTML = "";

  let newIndex = 0;
  days.forEach(day => {
    const date = getDayDate(day);
    const events = eventsByDay[day].filter(e => rhythmFilter === "all" || e.type === rhythmFilter);
    const moodSnap = _rhythmCache.moods[day] || {};
    const myMood = moodSnap[currentUser.uid] || null;
    const partnerMood = moodSnap[partnerUid] || null;

    const dayEl = document.createElement("div");
    dayEl.className = "feed-day";
    dayEl.dataset.dayKey = String(day);
    dayEl.dataset.animId = "rhythm-day-" + day;

    const isNew = animateAll || !prevKeys.has(String(day));
    if (isNew) {
      dayEl.classList.add("reveal", "stagger");
      dayEl.style.setProperty("--i", Math.min(newIndex, 6));
      newIndex++;
    }

    const moods = `${myMood ? `<span title="Я">${myMood}</span>` : ""}${partnerMood ? `<span title="Партнёр">${partnerMood}</span>` : ""}`;

    dayEl.innerHTML = `
      <div class="feed-day__head">
        <div class="feed-day__dot"></div>
        <div class="feed-day__date">${date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</div>
        <div class="feed-day__weekday">${date.toLocaleDateString("ru-RU", { weekday: "short" })}</div>
        <div class="feed-day__moods">${moods}</div>
      </div>
      <div class="feed-day__cards"></div>
      <div class="feed-day__actions">
        <button class="add-note-btn" data-add-note="${day}">+ Заметка</button>
      </div>
    `;

    const box = dayEl.querySelector(".feed-day__cards");

    events.forEach(ev => {
      const card = document.createElement("div");
      card.className = "feed-card" + (ev.type === "note" ? " feed-card--note" : "");
      const typeLabel = { qod: "Вопрос дня", conv: "Разговор", agr: "Договорённость", reconcile: "Примирение", note: "Заметка" }[ev.type];
      const typeIco = { qod: "💬", conv: "🗣", agr: "🤝", reconcile: "🕊", note: "📝" }[ev.type];

      let title = "", text = "", meta = "", mark = "";
      if (ev.type === "qod") {
        title = ev.question;
        text = ev.partnerAnswer
          ? `Вы: ${ev.myAnswer} · Партнёр: ${ev.partnerAnswer}`
          : `Вы: ${ev.myAnswer}`;
      } else if (ev.type === "conv") { title = ev.topic; text = ev.status; }
      else if (ev.type === "agr") { title = ev.title; text = ev.text; }
      else if (ev.type === "reconcile") { title = ev.feeling; text = ev.status; }
      else if (ev.type === "note") {
        title = ev.shared ? "Общая заметка" : "Приватная заметка";
        text = ev.text;
        meta = ev.shared ? "Видят оба" : "Видна только вам";
        mark = ev.shared ? "👁" : "🔒";
      }

      card.innerHTML = `
        ${mark ? `<div class="feed-card__mark">${mark}</div>` : ""}
        <div class="feed-card__icon ${ev.type}">${typeIco}</div>
        <div class="feed-card__body">
          <div class="feed-card__type ${ev.type}">${typeLabel}</div>
          <div class="feed-card__title">${escapeHtml(title)}</div>
          <div class="feed-card__text">${escapeHtml(text)}</div>
          ${meta ? `<div class="feed-card__meta">${escapeHtml(meta)}</div>` : ""}
        </div>
      `;
      box.appendChild(card);
    });

    tl.appendChild(dayEl);
  });

  tl.querySelectorAll("[data-add-note]").forEach(btn => {
    btn.onclick = () => openNoteSheet(parseInt(btn.dataset.addNote));
  });

  requestAnimationFrame(() => initReveal());
}

function openNoteSheet(day) {
  _noteDayKey = day;
  const date = getDayDate(day);
  $("note-sheet-title").textContent = "Заметка · " + date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  $("note-text").value = "";
  $("note-share").checked = false;
  $("note-sheet").classList.remove("hidden");
  vibrate(10);
}

function closeNoteSheet() {
  $("note-sheet").classList.add("hidden");
  _noteDayKey = null;
}

async function saveNote() {
  const text = $("note-text").value.trim();
  if (!text || !_noteDayKey) { closeNoteSheet(); return; }
  const shared = $("note-share").checked;
  const btn = $("note-save");
  btn.disabled = true;
  try {
    await addDoc(collection(db, "couples", currentCoupleId, "journalNotes"), {
      day: _noteDayKey,
      userId: currentUser.uid,
      text,
      shared,
      createdAt: serverTimestamp()
    });
    vibrate(15);
    closeNoteSheet();
  } catch (e) {
    console.error(e);
    alert("Не удалось сохранить: " + e.message);
  } finally {
    btn.disabled = false;
  }
}

/* ==========================================================
   УРОК НЕДЕЛИ
   ========================================================== */

function getWeekOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  const dayOfYear = Math.floor(diff / 86400000) + 1;
  return Math.ceil(dayOfYear / 7);
}

function getLessonForWeek(week) {
  const idx = (week - 1) % lessons.length;
  return lessons[idx];
}

function isLessonDayVisible() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Вс, 1 = Пн, ..., 6 = Сб
  const seed = now.getFullYear() * 1000 + (now.getMonth() * 100) + now.getDate();
  const lessonDay = seed % 7;
  return dayOfWeek === lessonDay;
}

function initLessons() {
  const card = $("lesson-card");
  if (card) card.onclick = openLessonModal;

  const backdrop = $("lesson-backdrop");
  if (backdrop) backdrop.onclick = closeLessonModal;

  renderLessonCard();
}

function renderLessonCard() {
  const card = $("lesson-card");
  if (!card) return;
  if (!isLessonDayVisible()) {
    card.style.display = "none";
    return;
  }
  const week = getWeekOfYear();
  const lesson = getLessonForWeek(week);
  if (!lesson) return;
  const titleEl = $("lesson-card-title");
  if (titleEl) titleEl.textContent = lesson.title;
  card.style.display = "";
}

function openLessonModal() {
  const week = getWeekOfYear();
  const lesson = getLessonForWeek(week);
  if (!lesson) return;

  const content = $("lesson-modal-content");
  if (!content) return;

  const bodyHtml = lesson.body.map(p => `<p>${escapeHtml(p)}</p>`).join("");
  const tryHtml = lesson.try
    ? `<div class="lesson-try">
         <div class="lesson-try__label">Попробуй сегодня</div>
         <div class="lesson-try__text">${escapeHtml(lesson.try)}</div>
       </div>`
    : "";

  content.innerHTML = `
    <div class="lesson-modal__head">
      <div class="lesson-modal__label">Урок недели</div>
      <button class="lesson-modal__close" id="lesson-modal-close" aria-label="Закрыть">✕</button>
    </div>
    <div class="lesson-modal__title">${escapeHtml(lesson.title)}</div>
    <div class="lesson-modal__body">${bodyHtml}</div>
    ${tryHtml}
    <div class="lesson-modal__footer">
      <button class="lesson-modal__btn lesson-modal__btn--ghost" id="lesson-later">Позже</button>
      <button class="lesson-modal__btn lesson-modal__btn--primary" id="lesson-done">Понятно</button>
    </div>
  `;

  $("lesson-modal-close").onclick = closeLessonModal;
  $("lesson-later").onclick = closeLessonModal;
  $("lesson-done").onclick = closeLessonModal;

  $("lesson-modal").classList.remove("hidden");
  vibrate(10);
}

function closeLessonModal() {
  const m = $("lesson-modal");
  if (m) m.classList.add("hidden");
}

function renderLessonsList() {
  const box = $("lessons-list");
  if (!box) return;

  const week = getWeekOfYear();
  box.innerHTML = "";

  const past = lessons.filter(l => l.week <= week).sort((a, b) => b.week - a.week);

  if (past.length === 0) {
    box.innerHTML = `<div class="hint" style="text-align:center; padding: 24px 16px;">Уроки появятся по мере хода года 💛</div>`;
    return;
  }

  past.forEach(l => {
    const el = document.createElement("div");
    el.className = "lesson-item fade-in-up";
    el.innerHTML = `
      <div class="lesson-item__week">Урок ${l.week}</div>
      <div class="lesson-item__title">${escapeHtml(l.title)}</div>
    `;
    el.onclick = () => openLessonModalByWeek(l.week);
    box.appendChild(el);
  });
}

function openLessonModalByWeek(week) {
  const lesson = lessons.find(l => l.week === week);
  if (!lesson) return;
  const content = $("lesson-modal-content");
  if (!content) return;

  const bodyHtml = lesson.body.map(p => `<p>${escapeHtml(p)}</p>`).join("");
  const tryHtml = lesson.try
    ? `<div class="lesson-try">
         <div class="lesson-try__label">Попробуй сегодня</div>
         <div class="lesson-try__text">${escapeHtml(lesson.try)}</div>
       </div>`
    : "";

  content.innerHTML = `
    <div class="lesson-modal__head">
      <div class="lesson-modal__label">Урок ${lesson.week}</div>
      <button class="lesson-modal__close" id="lesson-modal-close" aria-label="Закрыть">✕</button>
    </div>
    <div class="lesson-modal__title">${escapeHtml(lesson.title)}</div>
    <div class="lesson-modal__body">${bodyHtml}</div>
    ${tryHtml}
    <div class="lesson-modal__footer">
      <button class="lesson-modal__btn lesson-modal__btn--primary" id="lesson-done">Закрыть</button>
    </div>
  `;

  $("lesson-modal-close").onclick = closeLessonModal;
  $("lesson-done").onclick = closeLessonModal;

  $("lesson-modal").classList.remove("hidden");
  vibrate(10);
}

/* ==========================================================
   ФИЧА №2 — «Мне нужно время» (пауза, по контекстам)
   ========================================================== */

function isConvPaused(conv) {
  if (!conv || !conv.pausedUntil) return false;
  const until = conv.pausedUntil.toMillis ? conv.pausedUntil.toMillis() : Number(conv.pausedUntil);
  return until > Date.now();
}

function getConvPauseRemaining(conv) {
  if (!conv || !conv.pausedUntil) return 0;
  const until = conv.pausedUntil.toMillis ? conv.pausedUntil.toMillis() : Number(conv.pausedUntil);
  return Math.max(0, until - Date.now());
}

function formatPauseRemaining(ms) {
  if (ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}ч ${String(m).padStart(2, '0')}м`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function startPauseTimer() {
  if (pauseTimerInterval) return;
  pauseTimerInterval = setInterval(tickPauseTimer, 1000);
  tickPauseTimer();
}

function tickPauseTimer() {
  const active = conversations.filter(isConvPaused);

  document.querySelectorAll('[data-pause-countdown]').forEach(el => {
    const id = el.dataset.pauseId;
    const conv = conversations.find(c => c.id === id);
    if (conv && isConvPaused(conv)) {
      el.textContent = formatPauseRemaining(getConvPauseRemaining(conv));
    }
  });

  renderPauseNavIndicator();

  if (active.length === 0) {
    clearInterval(pauseTimerInterval);
    pauseTimerInterval = null;
  }

  if (currentConversationId) {
    const c = conversations.find(x => x.id === currentConversationId);
    const modal = $("conversation-modal");
    if (c && modal && !modal.classList.contains("hidden") && !isConvPaused(c)) {
      openConversation(currentConversationId);
    }
  }
  if (_currentDialogueId) {
    const c = conversations.find(x => x.id === _currentDialogueId);
    const modal = $("dialogue-modal");
    if (c && modal && !modal.classList.contains("hidden") && !isConvPaused(c)) {
      renderDialogueContent(c);
    }
  }
}

function renderPauseNavIndicator() {
  const btn = document.querySelector('.nav-btn[data-view="conversation"]');
  if (!btn) return;
  const active = conversations.filter(isConvPaused);
  btn.classList.toggle("has-pause", active.length > 0);
}

function openPauseModal(convId) {
  const conv = conversations.find(c => c.id === convId);
  if (!conv) return;
  _pauseTargetConvId = convId;
  _pauseSelectedMinutes = 30;
  renderPauseOptions();
  $("pause-modal").classList.remove("hidden");
  vibrate(10);
}

function renderPauseOptions() {
  const box = $("pause-options");
  if (!box) return;
  box.innerHTML = PAUSE_OPTIONS.map((opt, i) => {
    const isActive = (opt.minutes === _pauseSelectedMinutes) ||
                     (opt.untilTomorrow && _pauseSelectedMinutes === null);
    return `<button class="pause-option${isActive ? ' active' : ''}" data-idx="${i}">${opt.label}</button>`;
  }).join("");
  box.querySelectorAll(".pause-option").forEach((btn, i) => {
    btn.onclick = () => {
      _pauseSelectedMinutes = PAUSE_OPTIONS[i].untilTomorrow ? null : PAUSE_OPTIONS[i].minutes;
      renderPauseOptions();
    };
  });
}

function closePauseModal() {
  const m = $("pause-modal");
  if (m) m.classList.add("hidden");
  _pauseTargetConvId = null;
}

async function confirmPause() {
  if (!_pauseTargetConvId) return;
  const opt = PAUSE_OPTIONS.find(o =>
    o.untilTomorrow ? _pauseSelectedMinutes === null : o.minutes === _pauseSelectedMinutes
  ) || PAUSE_OPTIONS[1];

  let until;
  if (opt.untilTomorrow) {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    t.setHours(0, 0, 0, 0);
    until = Timestamp.fromDate(t);
  } else {
    until = Timestamp.fromMillis(Date.now() + opt.minutes * 60 * 1000);
  }

  const btn = $("pause-confirm");
  if (btn) btn.disabled = true;
  try {
    await updateDoc(doc(db, "couples", currentCoupleId, "conversations", _pauseTargetConvId), {
      pausedUntil: until,
      pausedBy: currentUser.uid,
      pausedLabel: opt.label
    });
    closePauseModal();
    startPauseTimer();
    vibrate(15);
  } catch (e) {
    console.error(e);
    alert("Ошибка: " + e.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function cancelPause(convId) {
  try {
    await updateDoc(doc(db, "couples", currentCoupleId, "conversations", convId), {
      pausedUntil: null,
      pausedBy: null,
      pausedLabel: null
    });
    vibrate(10);
  } catch (e) {
    console.error(e);
    alert("Ошибка: " + e.message);
  }
}

function initPauseFeature() {
  const backdrop = $("pause-backdrop");
  if (backdrop) backdrop.onclick = closePauseModal;
  const cancel = $("pause-cancel-btn");
  if (cancel) cancel.onclick = closePauseModal;
  const confirm = $("pause-confirm");
  if (confirm) confirm.onclick = confirmPause;
}

/* ==========================================================
   ФИЧА №3 — «Тихий день»
   ========================================================== */

function quietDayKey() {
  const d = new Date();
  return `quiet-${currentCoupleId}-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function isQuietDay() {
  return localStorage.getItem(quietDayKey()) === "1";
}

async function setQuietDay(val) {
  // 1. Сразу локально — мгновенный отклик UI
  if (val) localStorage.setItem(quietDayKey(), "1");
  else localStorage.removeItem(quietDayKey());
  quietDayActive = val;
  applyQuietDayState();

  // 2. Затем в Firestore — чтобы партнёр увидел
  if (!currentCoupleId || !currentUser) return;
  try {
    const day = getCurrentDay();
    const ref = doc(db, "couples", currentCoupleId, "moods", String(day));
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data() : {};
    const quiet = { ...(data.quiet || {}) };
    if (val) quiet[currentUser.uid] = true;
    else delete quiet[currentUser.uid];
    await setDoc(ref, { day, quiet }, { merge: true });
  } catch (e) {
    console.error("Quiet day sync error:", e);
  }
}

function applyQuietDayState() {
  const card = $("questionCard");
  const icon = $("quietIconBtn");
  const area = $("answerArea");
  document.body.classList.toggle("state-quiet", quietDayActive);
  if (!card || !icon) return;
  card.classList.toggle("is-quiet", quietDayActive);
  icon.classList.toggle("is-active", quietDayActive);
  if (area) area.classList.toggle("hidden", quietDayActive);
}

function openQuietModal() {
  const m = $("quiet-modal");
  if (m) m.classList.remove("hidden");
  vibrate(10);
}

function closeQuietModal() {
  const m = $("quiet-modal");
  if (m) m.classList.add("hidden");
}

function initQuietFeature() {
  quietDayActive = isQuietDay();
  applyQuietDayState();

  const icon = $("quietIconBtn");
  if (icon) {
    icon.onclick = () => {
      if (quietDayActive) {
        setQuietDay(false);
        vibrate(10);
      } else {
        openQuietModal();
      }
    };
  }

  const backdrop = $("quiet-backdrop");
  if (backdrop) backdrop.onclick = closeQuietModal;
  const cancel = $("quiet-cancel");
  if (cancel) cancel.onclick = closeQuietModal;
  const confirm = $("quiet-confirm");
  if (confirm) {
    confirm.onclick = async () => {
      closeQuietModal();
      vibrate(15);
      await setQuietDay(true);
    };
  }
}

/* ==========================================================
   ФИЧА №8 — «Обучение в моменте» (60 сек)
   ========================================================== */

function getLessonSnippet() {
  return lessons.find(l => l.week === 8) || lessons[0];
}

function lessonReadKey() {
  const d = new Date();
  return `lesson-read-${currentCoupleId}-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function isLessonReadToday() {
  if (!currentCoupleId) return false;
  return localStorage.getItem(lessonReadKey()) === "1";
}

function markLessonRead() {
  if (!currentCoupleId) return;
  localStorage.setItem(lessonReadKey(), "1");
}

function renderLessonHint() {
  const lesson = getLessonSnippet();
  if (!lesson) return "";

  const read = isLessonReadToday();
  const showRead = read && !_lessonExpanded;

  const toggleLabel = _lessonExpanded ? 'Свернуть' : (read ? '✓ Прочитано' : 'Развернуть');
  const classes = [
    'lesson-hint',
    _lessonExpanded ? 'is-expanded' : '',
    showRead ? 'is-read' : ''
  ].filter(Boolean).join(' ');

  return `
    <div class="${classes}" id="lessonHint">
      <div class="lesson-hint__head">
        <div class="lesson-hint__icon">📖</div>
        <div>
          <div class="lesson-hint__label">Урок в моменте</div>
          <div class="lesson-hint__time">60 секунд</div>
        </div>
      </div>
      <div class="lesson-hint__title">${escapeHtml(lesson.title)}</div>
      <div class="lesson-hint__snippet">${escapeHtml(lesson.body[0] || '')}</div>
      <div class="lesson-hint__more">
        ${lesson.body.slice(1).map(p => `<p>${escapeHtml(p)}</p>`).join("")}
        ${lesson.try ? `<div class="lesson-hint__try"><b>Попробуй сегодня:</b> ${escapeHtml(lesson.try)}</div>` : ""}
      </div>
      <span class="lesson-hint__toggle">
        <span>${toggleLabel}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
      </span>
    </div>
  `;
}

function bindLessonHint(conv) {
  const hint = $("lessonHint");
  if (!hint) return;
  hint.onclick = (e) => {
    if (e.target.closest("button")) return;
    _lessonExpanded = !_lessonExpanded;
    if (_lessonExpanded) markLessonRead();
    renderDialogueContent(conv);
  };
}

/* ==========================================================
   ЕДИНЫЙ ОБРАБОТЧИК КРЕСТИКА ЗАКРЫТИЯ МОДАЛОК
   ========================================================== */

const MODAL_CLOSE_FNS = {
  closeProfileModal,
  closeTopicModal,
  closeConversationModal,
  closeAgreementModal,
  closePulseModal,
  closePauseModal,
  closeQuietModal,
  closeRetro,
  closeDayView,
  closeNoteSheet,
  closeMoonModal,
};

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-modal-close]");
  if (!btn) return;
  const fnName = btn.dataset.modalClose;
  const fn = MODAL_CLOSE_FNS[fnName];
  if (typeof fn === "function") {
    fn();
  } else {
    const modal = btn.closest(".modal");
    if (modal) modal.classList.add("hidden");
  }
});

/* Страховка: блокировка прокрутки body при открытой модалке */
const modalObserver = new MutationObserver(() => {
  const hasOpenModal = document.querySelector(".modal:not(.hidden)");
  document.body.style.overflow = hasOpenModal ? "hidden" : "";
});
document.querySelectorAll(".modal").forEach(m => {
  modalObserver.observe(m, { attributes: true, attributeFilter: ["class"] });
});

/* Дата в топ-баре */
(function setTodayDate() {
  const dateEl = document.getElementById('today-date');
  if (!dateEl) return;
  const d = new Date();
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  dateEl.textContent = d.getDate() + ' ' + months[d.getMonth()];
})();
/* ==========================================================
   Скрываем дату в топ-баре — убрана (этап A→B).
   Ставим display: none с !important ПОСЛЕ основного блока
   установки даты, чтобы перебить её inline-стили.
   ========================================================== */
(function hideTopDate() {
  function hide() {
    var el = document.getElementById('today-date');
    if (el) el.style.setProperty('display', 'none', 'important');
  }
  hide();
  setTimeout(hide, 800);
})();