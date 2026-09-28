/* dom.js - DOM-helpery (etap C-2) */

export const $ = (id) => document.getElementById(id);

export function vibrate(pattern) {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  try { navigator.vibrate(pattern); } catch (e) {}
}

