import { requireAdmin, logoutAdmin } from "../js/auth.js";

export function initAdminShell(page) {
  if (!requireAdmin()) throw new Error("unauthorized");

  document.querySelectorAll("[data-nav]").forEach((link) => {
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
