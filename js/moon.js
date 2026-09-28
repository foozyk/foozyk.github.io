/* moon.js - modalka Lunnyj kalendar (etap C-2) */
import { $, vibrate } from "./dom.js";

export function initMoonModal() {
  const item = $("moon-info-item");
  if (item) item.onclick = openMoonModal;

  const backdrop = $("moon-backdrop");
  if (backdrop) backdrop.onclick = closeMoonModal;

  const closeBtn = $("moon-modal-close");
  if (closeBtn) closeBtn.onclick = closeMoonModal;

  const closeBtn2 = $("moon-modal-close-btn");
  if (closeBtn2) closeBtn2.onclick = closeMoonModal;
}

export function openMoonModal() {
  const m = $("moon-modal");
  if (!m) return;
  m.classList.remove("hidden");
  vibrate(10);
}

export function closeMoonModal() {
  const m = $("moon-modal");
  if (m) m.classList.add("hidden");
}

