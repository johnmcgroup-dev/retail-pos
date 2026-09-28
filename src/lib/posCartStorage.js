// Per-user POS cart persistence.
// An in-progress sale survives page refreshes, navigation and session timeouts.
// The saved copy is only removed by an explicit Clear or a completed sale.

const KEY_PREFIX = "pos_cart_v1_";

const storageKey = (owner) => `${KEY_PREFIX}${owner}`;

export function loadCart(owner) {
  if (!owner) return null;
  try {
    const raw = localStorage.getItem(storageKey(owner));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

export function saveCart(owner, cart) {
  if (!owner) return;
  try {
    localStorage.setItem(storageKey(owner), JSON.stringify(cart || []));
  } catch (_) {
    // Storage unavailable (private mode / quota) — the in-memory cart still works.
  }
}

export function clearSavedCart(owner) {
  if (!owner) return;
  try {
    localStorage.removeItem(storageKey(owner));
  } catch (_) {}
}