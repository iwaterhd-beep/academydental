import { validateAdmin, validateStudent, setAdminSession, setStudentSession, isAdminLoggedIn, isStudentLoggedIn } from "./auth.js";
import { getStudentByEmail, getPlatformSettings, resetDemoStudent } from "./data.js";
import { bindThemeToggle } from "./theme.js";

const form = document.getElementById("loginForm");
const statusEl = document.getElementById("loginStatus");
const platform = getPlatformSettings();
const didResetDemo = new URLSearchParams(location.search).get("resetDemo") === "1";

if (didResetDemo) {
  resetDemoStudent();
  history.replaceState({}, "", "/");
}

function showStatus(message, isError = false) {
  statusEl.hidden = false;
  statusEl.textContent = message;
  statusEl.classList.toggle("is-error", isError);
}

function applyBranding() {
  const title = document.querySelector(".login-logo-title");
  const tag = document.querySelector(".login-logo-tag");
  if (title && platform.branding.academyName) title.textContent = platform.branding.academyName;
  if (tag && platform.branding.tagline) tag.textContent = platform.branding.tagline;
  if (platform.access.maintenanceMode) {
    const panel = document.querySelector(".login-panel-inner");
    if (panel && !document.getElementById("maintenanceBanner")) {
      const banner = document.createElement("p");
      banner.id = "maintenanceBanner";
      banner.className = "login-status is-error";
      banner.style.marginBottom = "20px";
      banner.textContent = "Campus en mantenimiento. Solo acceso administrador disponible.";
      panel.insertBefore(banner, panel.firstChild);
    }
  }
}

applyBranding();
bindThemeToggle();

if (didResetDemo) {
  showStatus("Progreso del alumno demo reiniciado. Inicia sesión para ver el campus en blanco.");
}

if (isAdminLoggedIn()) {
  window.location.href = "/admin/";
} else if (isStudentLoggedIn()) {
  window.location.href = "/campus/";
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const email = form.email.value.trim();
  const password = form.password.value;

  if (!email || !password) {
    showStatus("Introduce email y contraseña.", true);
    return;
  }

  if (validateAdmin(email, password)) {
    setAdminSession();
    window.location.href = "/admin/";
    return;
  }

  if (validateStudent(email, password)) {
    if (platform.access.maintenanceMode) {
      showStatus("El campus está en mantenimiento. Inténtalo más tarde.", true);
      return;
    }
    const student = getStudentByEmail(email);
    setStudentSession(student?.id || "s-demo");
    window.location.href = "/campus/";
    return;
  }

  showStatus("Email o contraseña incorrectos.", true);
});
