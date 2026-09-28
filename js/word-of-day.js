import { words } from "../words.js";
import { $, vibrate } from "./dom.js";
import { escapeHtml } from "./helpers.js";
import { state } from "./state.js";

/* ==========================================================
   СЛОВО ДНЯ
   ========================================================== */

function getWordForDay(day) {
  if (!words || words.length === 0) return null;
  const index = ((day - 1) % words.length + words.length) % words.length;
  return words[index];
}

export function initWord() {
  const card = $("word-card");
  if (card) card.onclick = openWordModal;

  const backdrop = $("word-backdrop");
  if (backdrop) backdrop.onclick = closeWordModal;

  renderWordCard();
}

export function renderWordCard() {
  const day = state.getCurrentDay();
  const w = getWordForDay(day);
  if (!w) return;
  const wordEl = $("word-card-word");
  if (wordEl) wordEl.textContent = w.word;
}

function openWordModal() {
  const day = state.getCurrentDay();
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
