import { $, vibrate } from "./dom.js";
import { state } from "./state.js";

/* ==========================================================
   ФИЧА №3 — «Тихий день»
   ========================================================== */

export function quietDayKey() {
  const d = new Date();
  return `quiet-${state.currentCoupleId}-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function isQuietDay() {
  return localStorage.getItem(quietDayKey()) === "1";
}

export async function setQuietDay(val) {
  // 1. Сразу локально — мгновенный отклик UI
  if (val) localStorage.setItem(quietDayKey(), "1");
  else localStorage.removeItem(quietDayKey());
  state.quietDayActive = val;
  applyQuietDayState();

  // Взаимоисключение с «Пропустить день»
  if (val && state.skipDayActive) {
    state.skipDayActive = false;
    localStorage.removeItem(skipDayKey());
    applySkipDayState();
  }

  // 2. Затем в Firestore — чтобы партнёр увидел
  if (!state.currentCoupleId || !state.currentUser) return;
  try {
    const day = state.getCurrentDay();
    const ref = doc(state.db, "couples", state.currentCoupleId, "moods", String(day));
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data() : {};
    const quiet = { ...(data.quiet || {}) };
    if (val) quiet[state.currentUser.uid] = true;
    else delete quiet[state.currentUser.uid];
    await setDoc(ref, { day, quiet }, { merge: true });
  } catch (e) {
    console.error("Quiet day sync error:", e);
  }
}

export function applyQuietDayState() {
  const card = $("questionCard");
  const icon = $("quietIconBtn");
  const area = $("answerArea");
  document.body.classList.toggle("state-quiet", state.quietDayActive);
  if (!card || !icon) return;
  card.classList.toggle("is-quiet", state.quietDayActive);
  icon.classList.toggle("is-active", state.quietDayActive);
  if (area) area.classList.toggle("hidden", state.quietDayActive);
}

export function openQuietModal() {
  const m = $("quiet-modal");
  if (m) m.classList.remove("hidden");
  vibrate(10);
}

export function closeQuietModal() {
  const m = $("quiet-modal");
  if (m) m.classList.add("hidden");
}

export function initQuietFeature() {
  state.quietDayActive = isQuietDay();
  applyQuietDayState();

  const icon = $("quietIconBtn");
  if (icon) {
    icon.onclick = () => {
      if (state.quietDayActive) {
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
   ЕДИНЫЙ ОБРАБОТЧИК КРЕСТИКА ЗАКРЫТИЯ МОДАЛОК
   ========================================================== */


/* ==========================================================
   АНТИ-БОЛЬ — «Пропустить день»
   ========================================================== */

export function skipDayKey() {
  const d = new Date();
  return `skip-${state.currentCoupleId}-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function isSkipDay() {
  return localStorage.getItem(skipDayKey()) === "1";
}

export async function setSkipDay(val) {
  if (val) localStorage.setItem(skipDayKey(), "1");
  else localStorage.removeItem(skipDayKey());
  state.skipDayActive = val;
  applySkipDayState();
  // Взаимоисключение с тихим днём
  if (val && state.quietDayActive) await setQuietDay(false);
  if (!state.currentCoupleId || !state.currentUser) return;
  try {
    const day = state.getCurrentDay();
    const ref = doc(state.db, "couples", state.currentCoupleId, "moods", String(day));
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data() : {};
    const skip = { ...(data.skip || {}) };
    if (val) skip[state.currentUser.uid] = true;
    else delete skip[state.currentUser.uid];
    await setDoc(ref, { day, skip }, { merge: true });
  } catch (e) {
    console.error("Skip day sync error:", e);
  }
}

export function applySkipDayState() {
  const card = $("questionCard");
  const icon = $("skipIconBtn");
  const area = $("answerArea");
  document.body.classList.toggle("state-skip", state.skipDayActive);
  if (card) card.classList.toggle("is-skip", state.skipDayActive);
  if (icon) icon.classList.toggle("is-active", state.skipDayActive);
  if (area) area.classList.toggle("hidden", state.skipDayActive || state.quietDayActive);
}

export function openSkipModal() {
  const m = $("skip-modal");
  if (m) m.classList.remove("hidden");
  vibrate(10);
}

export function closeSkipModal() {
  const m = $("skip-modal");
  if (m) m.classList.add("hidden");
}

export function initSkipFeature() {
  state.skipDayActive = isSkipDay();
  applySkipDayState();
  const icon = $("skipIconBtn");
  if (icon) {
    icon.onclick = () => {
      if (state.skipDayActive) {
        setSkipDay(false);
        vibrate(10);
      } else {
        openSkipModal();
      }
    };
  }
  const backdrop = $("skip-backdrop");
  if (backdrop) backdrop.onclick = closeSkipModal;
  const cancel = $("skip-cancel");
  if (cancel) cancel.onclick = closeSkipModal;
  const confirm = $("skip-confirm");
  if (confirm) {
    confirm.onclick = async () => {
      closeSkipModal();
      vibrate(15);
      await setSkipDay(true);
    };
  }
}
