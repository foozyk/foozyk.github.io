import { lessons } from "../lessons.js";
import { $ } from "./dom.js";
import { escapeHtml } from "./helpers.js";
import { state } from "./state.js";

let _lessonExpanded = false;

/* ==========================================================
   ФИЧА №8 — «Обучение в моменте» (60 сек)
   ========================================================== */

function getLessonSnippet() {
  return lessons.find(l => l.week === 8) || lessons[0];
}

function lessonReadKey() {
  const d = new Date();
  return `lesson-read-${state.currentCoupleId}-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function isLessonReadToday() {
  if (!state.currentCoupleId) return false;
  return localStorage.getItem(lessonReadKey()) === "1";
}

function markLessonRead() {
  if (!state.currentCoupleId) return;
  localStorage.setItem(lessonReadKey(), "1");
}

export function renderLessonHint() {
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

export function bindLessonHint(conv, rerender) {
  const hint = $("lessonHint");
  if (!hint) return;
  hint.onclick = (e) => {
    if (e.target.closest("button")) return;
    _lessonExpanded = !_lessonExpanded;
    if (_lessonExpanded) markLessonRead();
    if (rerender) rerender(conv);
  };
}
