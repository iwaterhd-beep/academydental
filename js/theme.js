/** Tema claro / oscuro — Vallodental Academy */

export const THEME_KEY = "vallodental_theme";

export function getTheme() {
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

export function setTheme(theme) {
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (_) {}
  syncToggleLabels();
}

export function toggleTheme() {
  setTheme(getTheme() === "light" ? "dark" : "light");
}

export function syncToggleLabels() {
  const isLight = getTheme() === "light";
  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.setAttribute("aria-label", isLight ? "Activar modo oscuro" : "Activar modo claro");
  });
}

export function bindThemeToggle(root = document) {
  root.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    if (btn.dataset.themeBound) return;
    btn.dataset.themeBound = "1";
    btn.addEventListener("click", toggleTheme);
  });
  syncToggleLabels();
}

export function themeToggleButton(extraClass = "") {
  return `<button type="button" class="theme-toggle ${extraClass}" data-theme-toggle aria-label="Activar modo claro">
    <svg class="theme-icon theme-icon--sun" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4"></circle>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
    </svg>
    <svg class="theme-icon theme-icon--moon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
    </svg>
  </button>`;
}
