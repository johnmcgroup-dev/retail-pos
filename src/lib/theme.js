/**
 * App theme. The app opens in the dark theme by default — it is much easier to
 * read on the shop-floor screens — and each user can switch to light from the
 * header. The choice is remembered on the device.
 */
const KEY = "mrp-theme";
export const DEFAULT_THEME = "dark";

export function getTheme() {
  try {
    return localStorage.getItem(KEY) || DEFAULT_THEME;
  } catch (_) {
    return DEFAULT_THEME;
  }
}

export function applyTheme(theme) {
  const isDark = theme !== "light";
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

export function setTheme(theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch (_) {}
  applyTheme(theme);
}

export function initTheme() {
  applyTheme(getTheme());
}