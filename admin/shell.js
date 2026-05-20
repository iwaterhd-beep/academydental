import { requireAdmin, logoutAdmin, isAdminLoggedIn } from "../js/auth.js";
import {
  exportCourseJson,
  exportAllCoursesJson,
  getCourse,
  getCourses,
  getCourseDownloadFilename,
} from "../js/data.js";
import { downloadCoursePDF, downloadAllCoursesPDF } from "./course-pdf.js";
import { mountAdminLayout } from "./admin-layout.js";

export function initAdminShell(page) {
  if (!requireAdmin()) throw new Error("unauthorized");
  mountAdminLayout(page);
  document.querySelectorAll(".adm-nav-link[data-nav]").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.nav === page);
  });
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logoutAdmin);
}

export function showToast(message, type = "success") {
  let toast = document.getElementById("adminToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "adminToast";
    toast.className = "admin-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `admin-toast admin-toast--${type} is-visible`;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove("is-visible"), 2800);
}

export function confirmAction(message) {
  return window.confirm(message);
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Descarga un archivo de texto (solo admin). */
export function downloadTextFile(content, filename) {
  if (!isAdminLoggedIn() || !content) return false;
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
  return true;
}

/** Descarga un curso en JSON (solo admin). */
export function downloadCourse(courseId) {
  if (!isAdminLoggedIn()) return false;
  const course = getCourse(courseId);
  const json = exportCourseJson(courseId);
  if (!course || !json) return false;
  return downloadTextFile(json, getCourseDownloadFilename(course));
}

/** Descarga un curso en PDF (solo admin). */
export async function downloadCoursePdf(courseId) {
  if (!isAdminLoggedIn()) return false;
  return downloadCoursePDF(courseId);
}

/** Descarga todos los cursos en JSON (solo admin). */
export function downloadAllCourses() {
  if (!isAdminLoggedIn()) return false;
  if (!getCourses().length) return false;
  const date = new Date().toISOString().slice(0, 10);
  return downloadTextFile(exportAllCoursesJson(), `vallodental-cursos-${date}.json`);
}

/** Descarga todos los cursos en PDF (solo admin). */
export async function downloadAllCoursesPdf() {
  if (!isAdminLoggedIn()) return false;
  const courses = getCourses();
  if (!courses.length) return false;
  return downloadAllCoursesPDF(courses);
}
