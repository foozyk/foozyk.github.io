import { doc, updateDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { $, vibrate } from "./dom.js";
import { escapeHtml } from "./helpers.js";
import { state } from "./state.js";

let pauseTimerInterval = null;
let _pauseTargetConvId = null;
let _pauseSelectedMinutes = 30;
const PAUSE_OPTIONS = [
  { label: "15 минут", minutes: 15 },
  { label: "30 минут", minutes: 30 },
  { label: "1 час",    minutes: 60 },
  { label: "До завтра", untilTomorrow: true }
];

export function isConvPaused(conv) {
  if (!conv || !conv.pausedUntil) return false;
  const until = conv.pausedUntil.toMillis ? conv.pausedUntil.toMillis() : Number(conv.pausedUntil);
  return until > Date.now();
}

export function getConvPauseRemaining(conv) {
  if (!conv || !conv.pausedUntil) return 0;
  const until = conv.pausedUntil.toMillis ? conv.pausedUntil.toMillis() : Number(conv.pausedUntil);
  return Math.max(0, until - Date.now());
}

export function formatPauseRemaining(ms) {
  if (ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}ч ${String(m).padStart(2, '0')}м`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function startPauseTimer() {
  if (pauseTimerInterval) return;
  pauseTimerInterval = setInterval(tickPauseTimer, 1000);
  tickPauseTimer();
}

export function tickPauseTimer() {
  const active = state.conversations.filter(isConvPaused);

  document.querySelectorAll('[data-pause-countdown]').forEach(el => {
    const id = el.dataset.pauseId;
    const conv = state.conversations.find(c => c.id === id);
    if (conv && isConvPaused(conv)) {
      el.textContent = formatPauseRemaining(getConvPauseRemaining(conv));
    }
  });

  renderPauseNavIndicator();

  if (active.length === 0) {
    clearInterval(pauseTimerInterval);
    pauseTimerInterval = null;
  }

  if (state.currentConversationId) {
    const c = state.conversations.find(x => x.id === state.currentConversationId);
    const modal = $("conversation-modal");
    if (c && modal && !modal.classList.contains("hidden") && !isConvPaused(c)) {
      state.openConversation(state.currentConversationId);
    }
  }
  if (state._currentDialogueId) {
    const c = state.conversations.find(x => x.id === state._currentDialogueId);
    const modal = $("dialogue-modal");
    if (c && modal && !modal.classList.contains("hidden") && !isConvPaused(c)) {
      state.renderDialogueContent(c);
    }
  }
}

export function renderPauseNavIndicator() {
  const btn = document.querySelector('.nav-btn[data-view="conversation"]');
  if (!btn) return;
  const active = state.conversations.filter(isConvPaused);
  btn.classList.toggle("has-pause", active.length > 0);
}

export function openPauseModal(convId) {
  const conv = state.conversations.find(c => c.id === convId);
  if (!conv) return;
  _pauseTargetConvId = convId;
  _pauseSelectedMinutes = 30;
  renderPauseOptions();
  $("pause-modal").classList.remove("hidden");
  vibrate(10);
}

export function renderPauseOptions() {
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

export function closePauseModal() {
  const m = $("pause-modal");
  if (m) m.classList.add("hidden");
  _pauseTargetConvId = null;
}

export async function confirmPause() {
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
    await updateDoc(doc(state.db, "couples", state.currentCoupleId, "conversations", _pauseTargetConvId), {
      pausedUntil: until,
      pausedBy: state.currentUser.uid,
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

export async function cancelPause(convId) {
  try {
    const conv = (state.conversations || []).find(c => c.id === convId);
    if (conv && conv.pausedBy && conv.pausedBy !== state.currentUser.uid) {
      alert("Снять паузу может только тот, кто её поставил.");
      return;
    }
    await updateDoc(doc(state.db, "couples", state.currentCoupleId, "conversations", convId), {
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

export function initPauseFeature() {
  const backdrop = $("pause-backdrop");
  if (backdrop) backdrop.onclick = closePauseModal;
  const cancel = $("pause-cancel-btn");
  if (cancel) cancel.onclick = closePauseModal;
  const confirm = $("pause-confirm");
  if (confirm) confirm.onclick = confirmPause;
}
