import { initAdminShell, showToast, escapeHtml } from "./shell.js";
import { miniBars } from "./admin-layout.js";
import {
  getAdminCertificates,
  getCertificateStats,
  getCourses,
  getPlatformSettings,
  formatDate,
  CERTIFICATE_STATUS_LABELS,
} from "../js/data.js";

initAdminShell("certificados");

const root = document.getElementById("certsRoot");
let statusFilter = "all";
let courseFilter = "all";

function badge(status) {
  const cls =
    status === "issued" ? "published" : status === "almost" ? "draft" : status === "in_progress" ? "draft" : "blocked";
  return `<span class="admin-badge admin-badge--${cls}">${CERTIFICATE_STATUS_LABELS[status] || status}</span>`;
}

function filteredRecords() {
  let list = getAdminCertificates();
  if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
  if (courseFilter !== "all") list = list.filter((r) => r.courseId === courseFilter);
  return list;
}

function render() {
  const stats = getCertificateStats();
  const records = filteredRecords();
  const courses = getCourses();
  const platform = getPlatformSettings();
  const certsEnabled = platform.learning.certificatesEnabled;

  root.innerHTML = `
    ${!certsEnabled ? `<div class="adm-community-alert">Los certificados están desactivados en <a href="/admin/config">Configuración → Aprendizaje</a>.</div>` : ""}
    <div class="adm-stat-grid adm-stat-grid--compact">
      ${[
        { icon: "✓", label: "Emitidos", value: stats.issued, sub: "100% completado" },
        { icon: "◷", label: "Casi listos", value: stats.almost, sub: "≥ 50% progreso" },
        { icon: "▣", label: "En progreso", value: stats.inProgress, sub: "Formación activa" },
        { icon: "◉", label: "Matrículas", value: stats.total, sub: "Total registros" },
      ]
        .map(
          (c) => `
        <article class="adm-stat-card adm-stat-card--compact">
          <div class="adm-stat-head"><span class="adm-stat-icon">${c.icon}</span></div>
          <p class="adm-stat-label">${c.label}</p>
          <p class="adm-stat-value adm-stat-value--text">${c.value}</p>
          <p class="adm-stat-sub">${c.sub}</p>
          <div class="adm-spark">${miniBars(c.value + 14, 5)}</div>
        </article>`
        )
        .join("")}
    </div>

    <div class="adm-panel adm-cert-info">
      <div>
        <p class="login-kicker">Emisión</p>
        <h3 class="adm-panel-title">${escapeHtml(platform.certificates.issuerName)}</h3>
        <p class="admin-muted">Director: ${escapeHtml(platform.certificates.directorName)} · Los alumnos descargan PDF desde el campus al completar el 100% del curso.</p>
      </div>
      <a href="/campus/#certificados" class="adm-btn adm-btn--ghost" target="_blank">Vista alumno ↗</a>
    </div>

    <div class="adm-community-toolbar">
      <div class="adm-community-filters">
        ${[
          ["all", "Todos"],
          ["issued", "Emitidos"],
          ["almost", "Casi listos"],
          ["in_progress", "En progreso"],
          ["not_started", "Sin iniciar"],
        ]
          .map(
            ([id, label]) =>
              `<button type="button" class="adm-filter-chip ${statusFilter === id ? "is-active" : ""}" data-status="${id}">${label}</button>`
          )
          .join("")}
      </div>
      <select class="adm-select" id="courseCertFilter">
        <option value="all">Todos los cursos</option>
        ${courses.map((c) => `<option value="${c.id}">${escapeHtml(c.title)}</option>`).join("")}
      </select>
    </div>

    <div class="admin-card admin-card--wide adm-table-premium">
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Alumno</th>
              <th>Curso</th>
              <th>Progreso</th>
              <th>Estado</th>
              <th>Referencia</th>
              <th>Completado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${records.length
              ? records
                  .map(
                    (r) => `
              <tr>
                <td>
                  <div class="adm-student-cell">
                    <span class="adm-avatar">${r.studentName.charAt(0)}</span>
                    <div><strong>${escapeHtml(r.studentName)}</strong><span class="admin-muted">${escapeHtml(r.studentEmail)}</span></div>
                  </div>
                </td>
                <td>${escapeHtml(r.courseTitle)}</td>
                <td class="adm-progress-cell" style="min-width:120px">
                  <span>${r.percent}%</span>
                  <div class="progress-bar-wrap adm-progress-bar"><div class="progress-bar-fill" style="width:${r.percent}%"></div></div>
                </td>
                <td>${badge(r.status)}</td>
                <td><code class="adm-code">${escapeHtml(r.ref)}</code></td>
                <td>${r.completedAt ? formatDate(r.completedAt) : "—"}</td>
                <td>
                  <button type="button" class="admin-link-btn" data-copy="${escapeHtml(r.ref)}">Copiar ref.</button>
                </td>
              </tr>`
                  )
                  .join("")
              : `<tr><td colspan="7" class="admin-empty">No hay registros con estos filtros.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`;

  root.querySelectorAll("[data-status]").forEach((btn) => {
    btn.onclick = () => {
      statusFilter = btn.dataset.status;
      render();
    };
  });
  document.getElementById("courseCertFilter").onchange = (e) => {
    courseFilter = e.target.value;
    render();
  };
  root.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        showToast("Referencia copiada");
      } catch {
        showToast("No se pudo copiar", "error");
      }
    };
  });
}

render();
