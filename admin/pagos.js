import { initAdminShell, showToast, escapeHtml } from "./shell.js";
import { miniBars } from "./admin-layout.js";
import {
  getPayments,
  getPaymentStats,
  getPaymentChartData,
  getCourses,
  updatePaymentStatus,
  formatPrice,
  formatDate,
  PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from "../js/data.js";

initAdminShell("pagos");

const root = document.getElementById("paymentsRoot");
let statusFilter = "all";
let courseFilter = "all";

function badge(status) {
  const cls =
    status === "paid" ? "published" : status === "pending" ? "draft" : status === "refunded" ? "blocked" : "draft";
  return `<span class="admin-badge admin-badge--${cls}">${PAYMENT_STATUS_LABELS[status] || status}</span>`;
}

function filteredPayments() {
  let list = getPayments();
  if (statusFilter !== "all") list = list.filter((p) => p.status === statusFilter);
  if (courseFilter !== "all") list = list.filter((p) => p.courseId === courseFilter);
  return list;
}

function renderChart(bars) {
  if (!bars.some((b) => b.amount > 0)) {
    return `<p class="admin-empty">Sin ingresos registrados todavía.</p>`;
  }
  return `
    <div class="adm-pay-chart">
      ${bars
        .map(
          (b) => `
        <div class="adm-pay-chart-col">
          <div class="adm-pay-chart-bar" style="height:${Math.max(b.pct, 4)}%" title="${formatPrice(b.amount)}"></div>
          <span>${b.label}</span>
          <em>${formatPrice(b.amount)}</em>
        </div>`
        )
        .join("")}
    </div>`;
}

function render() {
  const stats = getPaymentStats();
  const bars = getPaymentChartData(6);
  const payments = filteredPayments();
  const courses = getCourses();

  root.innerHTML = `
    <div class="adm-stat-grid adm-stat-grid--compact adm-pay-stats">
      ${[
        { icon: "€", label: "Ingresos totales", value: formatPrice(stats.totalRevenue), sub: `${stats.paidCount} pagos` },
        { icon: "◷", label: "Este mes", value: formatPrice(stats.monthRevenue), sub: "Periodo actual" },
        { icon: "◎", label: "Pendientes", value: formatPrice(stats.pendingAmount), sub: `${stats.pendingCount} transacciones` },
        { icon: "▣", label: "Ticket medio", value: formatPrice(stats.avgOrder), sub: `${stats.transactions} total` },
      ]
        .map(
          (c) => `
        <article class="adm-stat-card adm-stat-card--compact">
          <div class="adm-stat-head"><span class="adm-stat-icon">${c.icon}</span></div>
          <p class="adm-stat-label">${c.label}</p>
          <p class="adm-stat-value adm-stat-value--text">${c.value}</p>
          <p class="adm-stat-sub">${c.sub}</p>
          <div class="adm-spark">${miniBars(String(c.value).length + 10, 5)}</div>
        </article>`
        )
        .join("")}
    </div>

    <div class="adm-pay-grid">
      <section class="adm-panel">
        <p class="login-kicker">Tendencia</p>
        <h3 class="adm-panel-title">Ingresos mensuales</h3>
        ${renderChart(bars)}
      </section>
      <section class="adm-panel adm-panel--stripe">
        <p class="login-kicker">Stripe</p>
        <h3 class="adm-panel-title">Pasarela conectada</h3>
        <div class="adm-stripe-card">
          <span class="adm-stripe-logo">stripe</span>
          <p class="adm-stripe-status">● Modo demostración</p>
          <p class="admin-muted">Los pagos se generan automáticamente al matricular alumnos. Conecta Stripe en producción para cobros reales.</p>
          <div class="adm-stripe-metrics">
            <div><strong>${stats.paidCount}</strong><span>Cobros</span></div>
            <div><strong>${stats.refundedCount}</strong><span>Reembolsos</span></div>
          </div>
        </div>
      </section>
    </div>

    <div class="adm-community-toolbar adm-pay-toolbar">
      <div class="adm-community-filters">
        ${[
          ["all", "Todos"],
          ["paid", "Pagados"],
          ["pending", "Pendientes"],
          ["refunded", "Reembolsados"],
        ]
          .map(
            ([id, label]) =>
              `<button type="button" class="adm-filter-chip ${statusFilter === id ? "is-active" : ""}" data-status="${id}">${label}</button>`
          )
          .join("")}
      </div>
      <select class="adm-select" id="coursePayFilter">
        <option value="all">Todos los cursos</option>
        ${courses.map((c) => `<option value="${c.id}" ${courseFilter === c.id ? "selected" : ""}>${escapeHtml(c.title)}</option>`).join("")}
      </select>
    </div>

    <div class="admin-card admin-card--wide adm-table-premium">
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Factura</th>
              <th>Alumno</th>
              <th>Curso</th>
              <th>Importe</th>
              <th>Método</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${payments.length
              ? payments
                  .map(
                    (p) => `
              <tr>
                <td><code class="adm-code">${escapeHtml(p.invoiceNumber)}</code></td>
                <td>
                  <div class="adm-student-cell">
                    <span class="adm-avatar">${p.studentName.charAt(0)}</span>
                    <div><strong>${escapeHtml(p.studentName)}</strong><span class="admin-muted">${escapeHtml(p.studentEmail)}</span></div>
                  </div>
                </td>
                <td>${escapeHtml(p.courseTitle)}</td>
                <td><strong>${formatPrice(p.amount)}</strong></td>
                <td>${PAYMENT_METHOD_LABELS[p.method] || p.method}</td>
                <td>${badge(p.status)}</td>
                <td>${formatDate(p.paidAt)}</td>
                <td class="admin-actions">
                  ${p.status === "paid" ? `<button type="button" class="admin-link-btn" data-refund="${p.id}">Reembolsar</button>` : ""}
                  ${p.status === "pending" ? `<button type="button" class="admin-link-btn admin-link-btn--gold" data-mark="${p.id}">Marcar pagado</button>` : ""}
                </td>
              </tr>`
                  )
                  .join("")
              : `<tr><td colspan="8" class="admin-empty">No hay transacciones con estos filtros.</td></tr>`}
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
  document.getElementById("coursePayFilter").onchange = (e) => {
    courseFilter = e.target.value;
    render();
  };
  root.querySelectorAll("[data-refund]").forEach((btn) => {
    btn.onclick = () => {
      updatePaymentStatus(btn.dataset.refund, "refunded");
      showToast("Pago marcado como reembolsado");
      render();
    };
  });
  root.querySelectorAll("[data-mark]").forEach((btn) => {
    btn.onclick = () => {
      updatePaymentStatus(btn.dataset.mark, "paid");
      showToast("Pago confirmado");
      render();
    };
  });
}

render();
