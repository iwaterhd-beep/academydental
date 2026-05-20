import { validateAdmin, validateStudent, setAdminSession, setStudentSession, isAdminLoggedIn, isStudentLoggedIn } from "./auth.js";
import { getStudentByEmail } from "./data.js";

const form = document.getElementById("loginForm");
const statusEl = document.getElementById("loginStatus");

function showStatus(message, isError = false) {
  statusEl.hidden = false;
  statusEl.textContent = message;
  statusEl.classList.toggle("is-error", isError);
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
    const student = getStudentByEmail(email);
    setStudentSession(student?.id || "s-demo");
    window.location.href = "/campus/";
    return;
  }

  showStatus("Email o contraseña incorrectos.", true);
});
