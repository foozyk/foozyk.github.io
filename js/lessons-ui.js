/* lessons-ui.js - urok nedeli (etap C-3) */
import { $, vibrate } from "./dom.js";
import { escapeHtml } from "./helpers.js";
import { lessons } from "../lessons.js";


/* ==========================================================
   УРОК НЕДЕЛИ
   ========================================================== */

export function getWeekOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  const dayOfYear = Math.floor(diff / 86400000) + 1;
  return Math.ceil(dayOfYear / 7);
}

export function getLessonForWeek(week) {
  const idx = (week - 1) % lessons.length;
  return lessons[idx];
}

export function isLessonDayVisible() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Вс, 1 = Пн, ..., 6 = Сб
  const seed = now.getFullYear() * 1000 + (now.getMonth() * 100) + now.getDate();
  const lessonDay = seed % 7;
  return dayOfWeek === lessonDay;
}

export function initLessons() {
  const card = $("lesson-card");
  if (card) card.onclick = openLessonModal;

  const backdrop = $("lesson-backdrop");
  if (backdrop) backdrop.onclick = closeLessonModal;

  renderLessonCard();
}

export function renderLessonCard() {
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

export function openLessonModal() {
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

export function closeLessonModal() {
  const m = $("lesson-modal");
  if (m) m.classList.add("hidden");
}

export function renderLessonsList() {
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

export function openLessonModalByWeek(week) {
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
