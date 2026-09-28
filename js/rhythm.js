import { collection, onSnapshot, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { $, vibrate } from "./dom.js";
import { escapeHtml } from "./helpers.js";
import { state } from "./state.js";

let journalNotes = {};
let unsubJournalNotes = null;
let rhythmFilter = "all";
let _noteDayKey = null;
let _rhythmCache = { moods: {}, answers: {}, conversations: [], agreements: [], loadedAt: 0 };

export function initRhythm() {
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

export function listenForJournalNotes() {
  if (unsubJournalNotes) unsubJournalNotes();
  unsubJournalNotes = onSnapshot(
    collection(state.db, "couples", state.currentCoupleId, "journalNotes"),
    (snap) => {
      journalNotes = {};
      snap.docs.forEach(d => { journalNotes[d.id] = { id: d.id, ...d.data() }; });
      if (state.currentView === "rhythm") {
        renderPulseStrip();
        renderRhythmTimeline();
      }
    }
  );
}

export function getDayDate(dayIndex) {
  if (!state.currentCouple?.startDate) return new Date();
  const start = state.currentCouple.startDate.toDate
    ? state.currentCouple.startDate.toDate()
    : new Date(state.currentCouple.startDate);
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  d.setDate(d.getDate() + (dayIndex - 1));
  return d;
}

export function dayFromTimestamp(ts) {
  if (!ts || !state.currentCouple?.startDate) return null;
  const t = ts.toDate ? ts.toDate() : new Date(ts);
  const start = state.currentCouple.startDate.toDate
    ? state.currentCouple.startDate.toDate()
    : new Date(state.currentCouple.startDate);
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const tDay = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  const diff = Math.round((tDay - startDay) / 86400000);
  const day = diff + 1;
  return day >= 1 && day <= 365 ? day : null;
}

export async function loadRhythmData() {
  const now = Date.now();
  if (now - _rhythmCache.loadedAt < 15000) return;

  const [moodsSnap, answersSnap, convSnap, agrSnap] = await Promise.all([
    getDocs(collection(state.db, "couples", state.currentCoupleId, "moods")),
    getDocs(collection(state.db, "couples", state.currentCoupleId, "answers")),
    getDocs(collection(state.db, "couples", state.currentCoupleId, "conversations")),
    getDocs(collection(state.db, "couples", state.currentCoupleId, "agreements"))
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

export function collectEventsByDay() {
  const map = {};
  const partnerUid = state.currentCouple.members.find(uid => uid !== state.currentUser.uid);

  for (const dayStr in _rhythmCache.answers) {
    const day = Number(dayStr);
    const arr = _rhythmCache.answers[dayStr];
    const mine = arr.find(a => a.userId === state.currentUser.uid);
    if (!mine) continue;
    const partner = arr.find(a => a.userId === partnerUid);
    const q = state.getQuestionForDay(day);
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
      const f = state.getDialogueFeelingInfo(c.feeling);
      map[day].push({
        type: "reconcile",
        feeling: f.label,
        status: c.phase === "done" ? "Мир" : "В процессе"
      });
    } else {
      const t = c.texts || {};
      const both = t[state.currentUser.uid] && t[partnerUid];
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
    if (n.userId !== state.currentUser.uid && !n.shared) continue;
    if (!map[n.day]) map[n.day] = [];
    map[n.day].push({
      type: "note",
      text: n.text || "",
      shared: !!n.shared,
      isMine: n.userId === state.currentUser.uid
    });
  }

  return map;
}

export async function renderRhythm() {
  try { await loadRhythmData(); } catch (e) { console.error("Rhythm load error:", e); }
  renderPulseStrip();
  renderRhythmTimeline();
}

export function renderPulseStrip() {
  const strip = $("pulse-strip");
  if (!strip) return;

  const today = state.getCurrentDay();
  const start = Math.max(1, today - 29);
  strip.innerHTML = "";

  const eventsByDay = collectEventsByDay();
  const partnerUid = state.currentCouple.members.find(uid => uid !== state.currentUser.uid);

  for (let day = start; day <= today; day++) {
    const moodSnap = _rhythmCache.moods[day] || {};
    const myMood = moodSnap[state.currentUser.uid] || null;
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

export function renderRhythmTimeline(opts = {}) {
  const tl = $("feed-timeline");
  if (!tl) return;

  const animateAll = !!opts.animateAll;

  const prevKeys = new Set();
  tl.querySelectorAll("[data-day-key]").forEach(el => {
    prevKeys.add(String(el.dataset.dayKey));
  });

  const eventsByDay = collectEventsByDay();
  const partnerUid = state.currentCouple.members.find(uid => uid !== state.currentUser.uid);

  const days = Object.keys(eventsByDay).map(Number)
    .filter(day => {
      if (rhythmFilter === "all") return true;
      return eventsByDay[day].some(e => e.type === rhythmFilter);
    })
    .sort((a, b) => b - a);

  if (days.length === 0) {
    tl.innerHTML = `<div class="hint" style="text-align:center; padding: 30px 20px;">Пока пусто. Начните отвечать на вопросы дня 💛</div>`;
    requestAnimationFrame(() => state.initReveal());
    return;
  }

  tl.innerHTML = "";

  let newIndex = 0;
  days.forEach(day => {
    const date = getDayDate(day);
    const events = eventsByDay[day].filter(e => rhythmFilter === "all" || e.type === rhythmFilter);
    const moodSnap = _rhythmCache.moods[day] || {};
    const myMood = moodSnap[state.currentUser.uid] || null;
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

  requestAnimationFrame(() => state.initReveal());
}

export function openNoteSheet(day) {
  _noteDayKey = day;
  const date = getDayDate(day);
  $("note-sheet-title").textContent = "Заметка · " + date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  $("note-text").value = "";
  $("note-share").checked = false;
  $("note-sheet").classList.remove("hidden");
  vibrate(10);
}

export function closeNoteSheet() {
  $("note-sheet").classList.add("hidden");
  _noteDayKey = null;
}

export async function saveNote() {
  const text = $("note-text").value.trim();
  if (!text || !_noteDayKey) { closeNoteSheet(); return; }
  const shared = $("note-share").checked;
  const btn = $("note-save");
  btn.disabled = true;
  try {
    await addDoc(collection(state.db, "couples", state.currentCoupleId, "journalNotes"), {
      day: _noteDayKey,
      userId: state.currentUser.uid,
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
