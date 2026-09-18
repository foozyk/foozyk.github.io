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
let currentConversationId = null;
let selectedTopic = null;

/* ---------- ТЕМА ---------- */
function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") {
    document.body.classList.add("dark");
    $("theme-btn").textContent = "☀️";
  } else {
    $("theme-btn").textContent = "🌙";
  }
  $("theme-btn").onclick = toggleTheme;
}
function toggleTheme() {
  const isDark = document.body.classList.toggle("dark");
  $("theme-btn").textContent = isDark ? "☀️" : "🌙";
  localStorage.setItem("theme", isDark ? "dark" : "light");
}

/* ---------- ЦВЕТОВЫЕ СХЕМЫ ---------- */
function applySavedScheme() {
  const saved = localStorage.getItem("scheme") || "classic";
  applyScheme(saved, false);
}
function applyScheme(name, save) {
  document.body.classList.remove("scheme-autumn", "scheme-spring", "scheme-ocean");
  if (name !== "classic") {
    document.body.classList.add("scheme-" + name);
  }
  if (save !== false) {
    localStorage.setItem("scheme", name);
  }
  document.querySelectorAll(".scheme-option").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.scheme === name);
  });
}
function initSchemeControls() {
  $("scheme-btn").onclick = () => {
    $("scheme-modal").classList.remove("hidden");
  };
  $("scheme-backdrop").onclick = () => $("scheme-modal").classList.add("hidden");
  $("close-scheme").onclick = () => $("scheme-modal").classList.add("hidden");
  document.querySelectorAll(".scheme-option").forEach(btn => {
    btn.onclick = () => {
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
  if (!user) { showScreen("auth"); return; }
  await loadCouple();
});

async function loadCouple() {
  const q = query(collection(db, "couples"), where("members", "array-contains", currentUser.uid));
  const snap = await getDocs(q);
  if (snap.empty) { showScreen("setup"); return; }
  const docSnap = snap.docs[0];
  currentCoupleId = docSnap.id;
  currentCouple = docSnap.data();
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

/* ---------- MAIN APP ---------- */
function startMainApp() {
  showScreen("main");
  renderToday();
  applySeasonTheme();

  if (localStorage.getItem("moon-visible") !== "0") {
    renderMoonWidget();
  } else {
    hideMoonBlocks();
  }

  initWeather();
  listenForAnswers();
  initProfile();
  initNotifications();
  initMood();
  initReactions();
  initLoveLang();
  initQuiz();
  initConversations();
  initAgreements();
  initPDFExport();
  initSchemeControls();
  $("nav-today").onclick = () => switchNav("today");
  $("nav-mood").onclick = () => switchNav("mood");
  $("nav-lovelang").onclick = () => switchNav("lovelang");
  $("nav-quiz").onclick = () => switchNav("quiz");
  $("nav-conversation").onclick = () => switchNav("conversation");
  $("nav-history").onclick = () => switchNav("history");
}
function switchNav(view) {
  $("nav-today").classList.toggle("active", view === "today");
  $("nav-mood").classList.toggle("active", view === "mood");
  $("nav-lovelang").classList.toggle("active", view === "lovelang");
  $("nav-quiz").classList.toggle("active", view === "quiz");
  $("nav-conversation").classList.toggle("active", view === "conversation");
  $("nav-history").classList.toggle("active", view === "history");
  $("today-view").classList.toggle("hidden", view !== "today");
  $("mood-view").classList.toggle("hidden", view !== "mood");
  $("lovelang-view").classList.toggle("hidden", view !== "lovelang");
  $("quiz-view").classList.toggle("hidden", view !== "quiz");
  $("conversation-view").classList.toggle("hidden", view !== "conversation");
  $("history-view").classList.toggle("hidden", view !== "history");
  if (view === "history") renderHistory();
  if (view === "mood") renderMoodHistory();
  if (view === "quiz") renderQuizMain();
  if (view === "conversation") renderConversations();
}
function getCurrentDay() {
  const start = currentCouple?.startDate?.toDate?.() || new Date();
  const days = Math.floor((Date.now() - start.getTime()) / 86400000);
  return Math.min(Math.max(days + 1, 1), 365);
}
function getQuestionForDay(day) { return questions.find(q => q.day === day); }

async function renderToday() {
  const day = getCurrentDay();
  const q = getQuestionForDay(day);
  if (!q) return;
  $("current-day").textContent = day;
  $("current-theme").textContent = q.theme;
  $("current-question").textContent = q.text;
  const percent = Math.round((day / 365) * 100);
  $("progress-bar").style.width = percent + "%";
  $("progress-label").textContent = "Пройдено " + percent + "% пути";
}

function listenForAnswers() {
  if (unsubAnswers) unsubAnswers();
  unsubAnswers = onSnapshot(
    collection(db, "couples", currentCoupleId, "answers"),
    (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const day = getCurrentDay();
      todayAnswers = all.filter(a => a.day === day);
      updateTodayView();
      updateStreak(all);
    }
  );
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
  fireConfetti();
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
  } catch (e) {
    console.error(e);
    alert("Ошибка сохранения: " + e.message);
  } finally {
    $("save-answer").disabled = false;
  }
};

/* ---------- HISTORY ---------- */
async function renderHistory() {
  const container = $("history-list");
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
    container.innerHTML = "<p class='hint'>Пока нет ответов.</p>";
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

/* ---------- ПРОФИЛИ И АВАТАРЫ ---------- */
async function initProfile() {
  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);

  const [mine, partners] = await Promise.all([
    getDoc(doc(db, "users", currentUser.uid)),
    getDoc(doc(db, "users", partnerUid))
  ]);

  myProfile = mine.exists() ? mine.data() : { displayName: "", photoURL: "" };
  partnerProfile = partners.exists() ? partners.data() : { displayName: "", photoURL: "" };

  renderAvatars();

  $("person-me").onclick = openProfileModal;
  $("modal-backdrop").onclick = closeProfileModal;
  $("close-profile").onclick = closeProfileModal;
  $("save-profile").onclick = saveProfileModal;
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
  renderOneAvatar("avatar-me", "name-me", myProfile, "Вы");
  renderOneAvatar("avatar-partner", "name-partner", partnerProfile, "Партнёр");
}

function renderOneAvatar(avatarId, nameId, profile, fallbackName) {
  const avatarEl = $(avatarId);
  const nameEl = $(nameId);
  const name = profile?.displayName?.trim() || fallbackName;
  nameEl.textContent = name;

  if (profile?.photoURL?.trim()) {
    avatarEl.innerHTML = `<img src="${escapeHtml(profile.photoURL)}" alt="${escapeHtml(name)}" onerror="this.parentElement.textContent='${escapeHtml(getInitials(name))}'">`;
  } else {
    avatarEl.textContent = getInitials(name);
    const hue = hashString(name) % 360;
    avatarEl.style.background = `linear-gradient(135deg, hsl(${hue}, 45%, 60%) 0%, hsl(${hue}, 50%, 42%) 100%)`;
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
  $("profile-name").value = myProfile?.displayName || "";
  $("profile-photo").value = myProfile?.photoURL || "";
  $("profile-modal").classList.remove("hidden");
}

function closeProfileModal() {
  $("profile-modal").classList.add("hidden");
}

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
  } catch (err) {
    alert("Ошибка сохранения: " + err.message);
  }
}

/* ---------- ПЕРЕКЛЮЧАТЕЛЬ ЛУНЫ ---------- */
function initMoonToggle() {
  const el = $("moon-toggle");
  if (!el) return;
  const visible = localStorage.getItem("moon-visible") !== "0";
  el.checked = visible;
  el.onchange = () => {
    const val = el.checked;
    localStorage.setItem("moon-visible", val ? "1" : "0");
    if (val) {
      showMoonBlocks();
      renderMoonWidget();
    } else {
      hideMoonBlocks();
    }
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
  $("notif-btn").textContent = (enabled && granted) ? "🔔" : "🔕";
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
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    alert("Разрешение не получено. Включите уведомления для этого сайта в настройках браузера.");
    return;
  }
  localStorage.setItem("notif-enabled", "1");
  updateNotifButton();
  try {
    new Notification("Уведомления включены 💛", {
      body: "Мы напомним вам вечером, если вы ещё не ответили на вопрос дня.",
      icon: "icon-192.png"
    });
  } catch (e) {
    console.log("Notif error:", e);
  }
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
      icon: "icon-192.png",
      tag: "daily-reminder"
    });
    localStorage.setItem("last-notif", today);
  } catch (e) {
    console.log("Notif error:", e);
  }
}

/* ---------- ВРЕМЯ НАПОМИНАНИЯ ---------- */
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

/* ---------- РЕАКЦИИ ---------- */
function initReactions() {
  document.querySelectorAll("#reactions-row button").forEach(btn => {
    btn.onclick = () => toggleReaction(btn.dataset.emoji);
  });
}
async function toggleReaction(emoji) {
  const partnerAnswer = todayAnswers.find(a => a.userId !== currentUser.uid);
  if (!partnerAnswer) return;
  const currentReactions = partnerAnswer.reactions || {};
  const myCurrent = currentReactions[currentUser.uid];
  const newReactions = { ...currentReactions };
  if (myCurrent === emoji) {
    delete newReactions[currentUser.uid];
  } else {
    newReactions[currentUser.uid] = emoji;
  }
  try {
    await updateDoc(
      doc(db, "couples", currentCoupleId, "answers", partnerAnswer.id),
      { reactions: newReactions }
    );
  } catch (e) {
    console.error(e);
    alert("Не удалось сохранить реакцию: " + e.message);
  }
}
function renderReactions() {
  const block = $("reactions-block");
  if (!block) return;
  const row = $("reactions-row");
  const info = $("partner-reaction-info");
  const myAnswer = todayAnswers.find(a => a.userId === currentUser.uid);
  const partnerAnswer = todayAnswers.find(a => a.userId !== currentUser.uid);
  if (!myAnswer || !partnerAnswer) {
    block.classList.add("hidden");
    return;
  }
  block.classList.remove("hidden");
  const myReaction = (partnerAnswer.reactions || {})[currentUser.uid];
  row.querySelectorAll("button").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.emoji === myReaction);
  });
  const partnerUid = currentCouple.members.find(uid => uid !== currentUser.uid);
  const partnerReactionEmoji = (myAnswer.reactions || {})[partnerUid];
  if (partnerReactionEmoji) {
    info.innerHTML = `Партнёр отреагировал на ваш ответ: <strong>${partnerReactionEmoji}</strong>`;
  } else {
    info.textContent = "Партнёр пока не отреагировал на ваш ответ.";
  }
}

/* ---------- ДНЕВНИК НАСТРОЕНИЯ ---------- */
function initMood() {
  document.querySelectorAll("#mood-picker button").forEach(btn => {
    btn.onclick = () => selectMood(btn.dataset.mood);
  });
  $("save-mood-note").onclick = saveMoodNote;
  $("mood-note").addEventListener("input", () => {
    clearTimeout(moodNoteTimer);
    moodNoteTimer = setTimeout(saveMoodNote, 1200);
  });
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
  const noteEl = $("mood-note");
  const myNote = notes[currentUser.uid] || "";
  if (!noteEl.matches(":focus") && noteEl.value !== myNote) {
    noteEl.value = myNote;
  }
  const el = $("mood-partner");
  if (partnerMood) {
    el.textContent = "Настроение партнёра сегодня: " + partnerMood;
  } else {
    el.textContent = "Партнёр ещё не отметил настроение.";
  }
  $("mood-partner-note").textContent = partnerNote ? "«" + partnerNote + "»" : "";
}
async function selectMood(emoji) {
  const day = getCurrentDay();
  const docRef = doc(db, "couples", currentCoupleId, "moods", String(day));
  try {
    const snap = await getDoc(docRef);
    const current = snap.exists() ? (snap.data().moods || {}) : {};
    current[currentUser.uid] = emoji;
    await setDoc(docRef, { day, moods: current }, { merge: true });
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
    const notes = snap.exists() ? (snap.data().notes || {}) : {};
    notes[currentUser.uid] = text;
    await setDoc(docRef, { day, notes }, { merge: true });
    $("save-mood-note").textContent = "Сохранено ✓";
    setTimeout(() => { $("save-mood-note").textContent = "Сохранить заметку"; }, 1500);
  } catch (e) {
    console.error(e);
    alert("Не удалось сохранить заметку: " + e.message);
  }
}
async function renderMoodHistory() {
  const container = $("mood-grid");
  container.innerHTML = "<p class='hint'>Загрузка...</p>";
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
    container.innerHTML = "";
    for (let d = today; d >= start; d--) {
      const moods = byDay[d] || {};
      const myMood = moods[currentUser.uid] || null;
      const partnerMood = moods[partnerUid] || null;
      const div = document.createElement("div");
      div.className = "mood-day";
      div.innerHTML = `
        <div class="mood-day-num">День ${d}</div>
        <div class="mood-day-emoji">${myMood || '<span class="mood-day-empty">·</span>'}</div>
        <div class="mood-day-partner">${partnerMood || '<span class="mood-day-empty">·</span>'}</div>
      `;
      container.appendChild(div);
    }
    if (container.children.length === 0) {
      container.innerHTML = "<p class='hint'>Пока нет данных.</p>";
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
  $("moon-icon").textContent = data.phase.icon;
  $("moon-phase").textContent = data.phase.name;
  $("moon-day").textContent = data.lunarDay + "-й лунный день";
  const adviceEl = $("moon-advice-text");
  if (adviceEl) {
    adviceEl.textContent = MOON_ADVICE[data.phase.name] || "";
  }
  const eventEl = $("moon-event");
  if (eventEl) {
    const event = getMoonEvent(new Date());
    if (event) {
      eventEl.textContent = event.text;
      eventEl.classList.remove("hidden");
    } else {
      eventEl.classList.add("hidden");
    }
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

/* ---------- ПОГОДНЫЙ ВИДЖЕТ ---------- */
async function initWeather() {
  const widget = $("weather-widget");
  if (!widget) return;
  if (!WEATHER_API_KEY) return;
  const cached = getCachedWeather();
  if (cached) {
    renderWeather(cached);
    return;
  }
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        const data = await fetchWeather(latitude, longitude);
        setCachedWeather(data);
        renderWeather(data);
      } catch (e) {
        console.error("Weather error:", e);
      }
    },
    (err) => {
      console.log("Geolocation denied:", err);
      widget.style.display = "";
      $("weather-icon").textContent = "📍";
      $("weather-temp").textContent = "—";
      $("weather-desc").textContent = "Разрешите геолокацию";
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
  try {
    localStorage.setItem("weather-cache", JSON.stringify({ t: Date.now(), data }));
  } catch {}
}
function getCurrentSeason() {
  const month = new Date().getMonth() + 1;
  if (month === 12 || month <= 2) return "winter";
  if (month <= 5) return "spring";
  if (month <= 8) return "summer";
  return "autumn";
}
function applySeasonTheme() {
  document.body.classList.remove(
    "season-winter", "season-spring", "season-summer", "season-autumn"
  );
  const season = getCurrentSeason();
  document.body.classList.add("season-" + season);
}
function applyWeatherTheme(iconCode) {
  document.body.classList.remove(
    "weather-sunny", "weather-cloudy", "weather-rainy",
    "weather-thunder", "weather-snowy"
  );
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
  const navTab = $("nav-lovelang");
  if (navTab) navTab.style.display = bothDone ? "none" : "";
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
  loveTestState.scores[lang]++;
  loveTestState.step++;
  if (loveTestState.step >= LOVE_QUESTIONS.length) {
    await finishLoveTest();
  } else {
    renderLoveQuestion();
  }
}
async function finishLoveTest() {
  const scores = loveTestState.scores;
  let primary = "words";
  let maxScore = -1;
  for (const k in scores) {
    if (scores[k] > maxScore) { maxScore = scores[k]; primary = k; }
  }
  const result = {
    primary: LOVE_LANGUAGES[primary],
    primaryKey: primary,
    scores,
    completedAt: Date.now()
  };
  try {
    await setDoc(
      doc(db, "couples", currentCoupleId, "lovelang", "results"),
      { [currentUser.uid]: result },
      { merge: true }
    );
    myLoveLang = result;
    showLoveResult(result);
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
    compareEl.textContent = `Партнёр прошёл: ${partnerLoveLang.primary}. Вкладка скоро исчезнет — результат всегда можно посмотреть в профиле.`;
  } else {
    compareEl.textContent = "Ждём партнёра — потом вкладка исчезнет, а результаты останутся в профиле.";
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
      quizData = snap.exists() ? snap.data() : {};
      if (!quizState) renderQuizMain();
    }
  );
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
  if (quizState.mode === "partner") {
    questionText = "Что, по-твоему, ответил(а) партнёр?\n\n" + q.q;
  }
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
  quizState.answers.push(idx);
  quizState.step++;
  if (quizState.step >= QUIZ_QUESTIONS.length) {
    await finishQuiz();
  } else {
    renderQuizQuestion();
  }
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
        {
          [currentUser.uid]: {
            ...(quizData[currentUser.uid] || {}),
            guesses: quizState.answers,
            guessesFor: partnerUid
          }
        },
        { merge: true }
      );
      quizData[currentUser.uid] = {
        ...(quizData[currentUser.uid] || {}),
        guesses: quizState.answers,
        guessesFor: partnerUid
      };
    }
    const savedMode = quizState.mode;
    quizState = null;
    if (savedMode === "me") {
      showMyQuizResult();
    } else {
      showGuessResult();
    }
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
  if (correct >= 7) fireConfetti();
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
      conversations = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      conversations.sort((a, b) => {
        const at = a.createdAt?.toDate?.() || new Date(0);
        const bt = b.createdAt?.toDate?.() || new Date(0);
        return bt - at;
      });
      renderConversations();
    }
  );
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
    if (hasBoth) {
      past.push(conv);
    } else {
      active.push(conv);
    }
  });

  activeBox.innerHTML = "";
  pastBox.innerHTML = "";

  if (active.length === 0 && past.length === 0) {
    activeBox.innerHTML = `<div class="empty-state">
      <span class="empty-icon">💬</span>
      Пока ни одного разговора.<br>Начните первый — напишите о том, что важно.
    </div>`;
    pastBlock.classList.add("hidden");
    return;
  }

  if (active.length === 0) {
    activeBox.innerHTML = `<div class="empty-state" style="padding: 16px;">
      Нет активных разговоров.
    </div>`;
  } else {
    active.forEach(conv => activeBox.appendChild(buildConvCard(conv, partnerUid, false)));
  }

  if (past.length === 0) {
    pastBlock.classList.add("hidden");
  } else {
    pastBlock.classList.remove("hidden");
    past.forEach(conv => pastBox.appendChild(buildConvCard(conv, partnerUid, true)));
  }
}

function buildConvCard(conv, partnerUid, isPast) {
  const texts = conv.texts || {};
  const myText = texts[currentUser.uid] || "";
  const partnerText = texts[partnerUid] || "";
  const card = document.createElement("div");
  card.className = "conv-card";

  let statusHtml = "";
  if (!myText && !partnerText) {
    statusHtml = `<span class="status-dot waiting"></span> Никто ещё не написал`;
  } else if (myText && !partnerText) {
    statusHtml = `<span class="status-dot mine-done"></span> Вы написали, ждём партнёра`;
  } else if (!myText && partnerText) {
    statusHtml = `<span class="status-dot waiting"></span> Партнёр написал, ваша очередь`;
  } else {
    statusHtml = `<span class="status-dot both-done"></span> Оба написали — можно договориться`;
  }

  card.innerHTML = `
    <div class="conv-card-title">${escapeHtml(conv.topic || "Без темы")}</div>
    <div class="conv-card-date">${formatDate(conv.createdAt)}</div>
    <div class="conv-card-status">${statusHtml}</div>
  `;
  card.onclick = () => openConversation(conv.id);
  return card;
}

function openTopicModal() {
  const list = $("topic-list");
  list.innerHTML = "";
  selectedTopic = null;
  CONVERSATION_TOPICS.forEach(topic => {
    const btn = document.createElement("button");
    btn.className = "topic-option";
    btn.textContent = topic;
    btn.onclick = () => {
      selectedTopic = topic;
      list.querySelectorAll(".topic-option").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      $("topic-custom").value = "";
    };
    list.appendChild(btn);
  });
  $("topic-custom").value = "";
  $("topic-modal").classList.remove("hidden");
}
function closeTopicModal() {
  $("topic-modal").classList.add("hidden");
}
async function confirmTopic() {
  const custom = $("topic-custom").value.trim();
  const topic = custom || selectedTopic;
  if (!topic) {
    alert("Выберите тему или введите свою");
    return;
  }
  $("topic-confirm").disabled = true;
  try {
    const ref = await addDoc(collection(db, "couples", currentCoupleId, "conversations"), {
      topic,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      texts: {}
    });
    closeTopicModal();
    // Открываем созданный разговор сразу
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

  if (myText) {
    saveBtn.textContent = "Обновить";
  } else {
    saveBtn.textContent = "Сохранить";
  }

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
  if (!text) {
    alert("Напишите что-нибудь");
    return;
  }
  const btn = $("conversation-save-my");
  btn.disabled = true;
  try {
    const docRef = doc(db, "couples", currentCoupleId, "conversations", currentConversationId);
    const snap = await getDoc(docRef);
    const current = snap.exists() ? (snap.data().texts || {}) : {};
    current[currentUser.uid] = text;
    await updateDoc(docRef, { texts: current });
    // Обновляем локально, чтобы UI сразу показал
    const conv = conversations.find(c => c.id === currentConversationId);
    if (conv) {
      conv.texts = current;
    }
    openConversation(currentConversationId);
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
  $("agreement-modal").classList.remove("hidden");
  // Сохраним ID разговора для привязки
  $("agreement-modal").dataset.fromConversation = currentConversationId || "";
}

/* ---------- ДОГОВОРЁННОСТИ ---------- */
function initAgreements() {
  $("add-agreement-btn").onclick = () => {
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

  activeBox.innerHTML = "";
  doneBox.innerHTML = "";

  if (active.length === 0 && done.length === 0) {
    activeBox.innerHTML = `<div class="empty-state" style="padding: 16px;">
      Пока ни одной договорённости.
    </div>`;
    doneBlock.classList.add("hidden");
    return;
  }

  if (active.length === 0) {
    activeBox.innerHTML = `<div class="empty-state" style="padding: 16px;">
      Все договорённости выполнены 🎉
    </div>`;
  } else {
    active.forEach(a => activeBox.appendChild(buildAgreementItem(a, false)));
  }

  if (done.length === 0) {
    doneBlock.classList.add("hidden");
  } else {
    doneBlock.classList.remove("hidden");
    done.forEach(a => doneBox.appendChild(buildAgreementItem(a, true)));
  }
}

function buildAgreementItem(agr, isDone) {
  const div = document.createElement("div");
  div.className = "agreement-item" + (isDone ? " done" : "");
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
  if (!title) {
    alert("Введите название договорённости");
    return;
  }
  const fromConversation = $("agreement-modal").dataset.fromConversation || "";
  const btn = $("save-agreement");
  btn.disabled = true;
  try {
    const payload = {
      title,
      text,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      done: false
    };
    if (fromConversation) payload.fromConversation = fromConversation;
    await addDoc(collection(db, "couples", currentCoupleId, "agreements"), payload);
    closeAgreementModal();
    if (fromConversation) {
      closeConversationModal();
    }
  } catch (e) {
    console.error(e);
    alert("Ошибка сохранения: " + e.message);
  } finally {
    btn.disabled = false;
  }
}

async function markAgreementDone(id, done) {
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
    setTimeout(() => { btn.textContent = originalText; }, 2500);
  } catch (e) {
    console.error(e);
    alert("Ошибка при создании PDF: " + e.message);
    btn.textContent = originalText;
  } finally {
    btn.disabled = false;
  }
}
function pluralDays(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return "дней";
  if (mod10 === 1) return "день";
  if (mod10 >= 2 && mod10 <= 4) return "дня";
  return "дней";
}