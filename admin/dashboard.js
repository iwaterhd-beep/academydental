import { initAdminShell, escapeHtml } from "./shell.js";
import {
  getStats,
  getAdminActivityFeed,
  getAdminInsights,
  formatPrice,
  formatDate,
} from "../js/data.js";
import { animateCounter, miniBars } from "./admin-layout.js";

initAdminShell("dashboard");

const root = document.getElementById("dashboardRoot");
const stats = getStats();
const insights = getAdminInsights();
const activity = getAdminActivityFeed(10);
const now = new Date();
const hour = now.getHours();
const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buena noche";

root.innerHTML = `
  <section class="adm-hero">
    <div class="adm-hero-glow"></div>
    <div class="adm-hero-inner">
      <div class="adm-hero-text">
        <p class="adm-hero-kicker">${greeting}</p>
        <h2 class="adm-hero-title">Panel de control <em>académico</em></h2>
        <p class="adm-hero-sub">Vista general de cursos, alumnos, ingresos y actividad reciente de Vallodental Academy.</p>
      </div>
      <div class="adm-hero-actions">
        <a href="/admin/curso-editor?new=1" class="adm-btn adm-btn--gold">+ Nuevo curso</a>
        <a href="/admin/correcciones" class="adm-btn adm-btn--ghost">Revisar entregas</a>
      </div>
    </div>
  </section>

  <div class="adm-stat-grid">
    ${[
      { icon: "▤", label: "Cursos activos", value: stats.publishedCourses, sub: `${stats.totalCourses} totales`, trend: "+12%", seed: 42 },
      { icon: "◉", label: "Alumnos activos", value: stats.activeStudents, sub: `${stats.totalStudents} registrados`, trend: "+8%", seed: 128 },
      { icon: "€", label: "Ingresos est.", value: null, display: formatPrice(stats.revenue), sub: "Por matrículas", trend: "+18%", seed: 77, text: true },
      { icon: "◎", label: "Tareas pendientes", value: insights.pendingReviews, sub: "Por corregir", trend: insights.pendingReviews ? "Acción" : "Al día", seed: 19, warn: insights.pendingReviews > 0 },
      { icon: "▣", label: "Finalización media", value: insights.avgCompletion, suffix: "%", sub: "Progreso global", trend: "+5%", seed: 55 },
      { icon: "✉", label: "Mensajes nuevos", value: insights.unreadMessages, sub: "Sin responder", trend: insights.unreadMessages ? "Revisar" : "Al día", seed: 91 },
      { icon: "◷", label: "Matrículas", value: stats.enrollments, sub: "Asignaciones", trend: "+3%", seed: 33 },
    ]
      .map(
        (c) => `
    <article class="adm-stat-card ${c.warn ? "is-warn" : ""}">
      <div class="adm-stat-head">
        <span class="adm-stat-icon">${c.icon}</span>
        <span class="adm-stat-trend ${c.trend.includes("+") ? "is-up" : ""}">${c.trend}</span>
      </div>
      <p class="adm-stat-label">${c.label}</p>
      <p class="adm-stat-value ${c.text ? "adm-stat-value--text" : ""}" data-count="${c.text ? "" : c.value}" data-suffix="${c.suffix || ""}">${c.text ? c.display : c.value}${c.suffix || ""}</p>
      <p class="adm-stat-sub">${c.sub}</p>
      <div class="adm-spark">${miniBars(c.seed)}</div>
    </article>`
      )
      .join("")}
  </div>

  <div class="adm-dash-grid">
    <section class="adm-panel adm-panel--wide">
      <header class="adm-panel-head">
        <div>
          <p class="login-kicker">Timeline</p>
          <h3 class="adm-panel-title">Actividad reciente</h3>
        </div>
        <input type="search" class="adm-panel-search" id="activitySearch" placeholder="Filtrar actividad…" />
      </header>
      <div class="adm-timeline" id="activityTimeline">
        ${activity.length
          ? activity
              .map(
                (item) => `
          <a href="${item.href || "#"}" class="adm-timeline-item adm-timeline-item--${item.type}">
            <span class="adm-timeline-icon">${item.icon}</span>
            <div class="adm-timeline-body">
              <strong>${escapeHtml(item.title)}</strong>
              <p>${escapeHtml(item.detail)}</p>
            </div>
            <time>${formatDate(item.date)}</time>
          </a>`
              )
              .join("")
          : `<p class="admin-empty">Sin actividad todavía.</p>`}
      </div>
    </section>

    <aside class="adm-panel-stack">
      <section class="adm-panel adm-insights">
        <p class="login-kicker">✦ IA Insights</p>
        <h3 class="adm-panel-title">Recomendaciones</h3>
        <ul class="adm-insight-list">
          ${insights.tips.map((t) => `<li><strong>${escapeHtml(t.title)}</strong><span>${escapeHtml(t.text)}</span></li>`).join("")}
        </ul>
      </section>
      <section class="adm-panel">
        <p class="login-kicker">Accesos rápidos</p>
        <h3 class="adm-panel-title">Gestión</h3>
        <div class="adm-quick-grid">
          <a href="/admin/cursos" class="adm-quick-tile"><span>▤</span>Cursos</a>
          <a href="/admin/alumnos" class="adm-quick-tile"><span>◉</span>Alumnos</a>
          <a href="/admin/progreso" class="adm-quick-tile"><span>▣</span>Analíticas</a>
          <a href="/admin/mensajes" class="adm-quick-tile"><span>✉</span>Mensajes</a>
          <a href="/admin/comunidad" class="adm-quick-tile"><span>◈</span>Comunidad</a>
          <a href="/admin/pagos" class="adm-quick-tile"><span>€</span>Pagos</a>
          <a href="/admin/certificados" class="adm-quick-tile"><span>✓</span>Certificados</a>
          <a href="/admin/correcciones" class="adm-quick-tile"><span>◎</span>Correcciones</a>
          <a href="/admin/config" class="adm-quick-tile"><span>⚙</span>Configuración</a>
          <a href="/campus/" class="adm-quick-tile"><span>◆</span>Vista alumno</a>
        </div>
      </section>
    </aside>
  </div>`;

root.querySelectorAll("[data-count]").forEach((el) => {
  const target = Number(el.dataset.count);
  if (!Number.isNaN(target)) animateCounter(el, target, { suffix: el.dataset.suffix || "" });
});

document.getElementById("activitySearch")?.addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll(".adm-timeline-item").forEach((item) => {
    item.hidden = q && !item.textContent.toLowerCase().includes(q);
  });
});
