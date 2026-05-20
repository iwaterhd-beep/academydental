const ADMIN_EMAIL = "cursos@admin.com";
const ADMIN_PASSWORD = "9999";
const STUDENT_EMAIL = "cursos@alumno.com";
const STUDENT_PASSWORD = "9999";
const ADMIN_SESSION_KEY = "vallodental_admin_session";
const STUDENT_SESSION_KEY = "vallodental_student_session";

export function validateAdmin(email, password) {
  return (
    email.trim().toLowerCase() === ADMIN_EMAIL &&
    password === ADMIN_PASSWORD
  );
}

export function validateStudent(email, password) {
  return (
    email.trim().toLowerCase() === STUDENT_EMAIL &&
    password === STUDENT_PASSWORD
  );
}

export function setAdminSession() {
  sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
  sessionStorage.removeItem(STUDENT_SESSION_KEY);
}

export function setStudentSession(studentId) {
  sessionStorage.setItem(STUDENT_SESSION_KEY, studentId);
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

export function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

export function clearStudentSession() {
  sessionStorage.removeItem(STUDENT_SESSION_KEY);
}

export function isAdminLoggedIn() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
}

export function isStudentLoggedIn() {
  return !!sessionStorage.getItem(STUDENT_SESSION_KEY);
}

export function getStudentSessionId() {
  return sessionStorage.getItem(STUDENT_SESSION_KEY);
}

export function requireAdmin() {
  if (!isAdminLoggedIn()) {
    window.location.href = "/";
    return false;
  }
  return true;
}

export function requireStudent() {
  if (!isStudentLoggedIn()) {
    window.location.href = "/";
    return false;
  }
  return getStudentSessionId();
}

export function logoutAdmin() {
  clearAdminSession();
  window.location.href = "/";
}

export function logoutStudent() {
  clearStudentSession();
  window.location.href = "/";
}
