import { initAdminShell, escapeHtml } from "./shell.js";
import { getCommunityPosts, getCourses, getPlatformSettings } from "../js/data.js";

initAdminShell("streaming");

const root = document.getElementById("streamRoot");
const platform = getPlatformSettings();
const livePosts = getCommunityPosts({ published: true }).filter((p) => p.icon === "◷" || p.title.toLowerCase().includes("directo"));
const courses = getCourses();

root.innerHTML = `
  <section class="adm-hero adm-stream-hero">
    <div class="adm-hero-glow"></div>
    <div class="adm-hero-inner">
      <div class="adm-hero-text">
        <p class="adm-hero-kicker">Live classes</p>
        <h2 class="adm-hero-title">Masterclasses <em>en directo</em></h2>
        <p class="adm-hero-sub">Centraliza sesiones Q&A, webinars clínicos y streaming premium para tus alumnos. Integración con Zoom, YouTube Live y Vimeo próximamente.</p>
      </div>
      <div class="adm-hero-actions">
        <button type="button" class="adm-btn adm-btn--gold" disabled>+ Programar live</button>
        <a href="/admin/comunidad" class="adm-btn adm-btn--ghost">Anunciar en comunidad</a>
      </div>
    </div>
  </section>

  <div class="adm-stream-grid">
    <section class="adm-panel">
      <p class="login-kicker">Estado</p>
      <h3 class="adm-panel-title">Plataformas</h3>
      <ul class="adm-stream-platforms">
        ${[
          { name: "Zoom Webinars", status: "Próximamente", icon: "📹" },
          { name: "YouTube Live", status: "Próximamente", icon: "▶" },
          { name: "Vimeo OTT", status: "Próximamente", icon: "◷" },
        ]
          .map(
            (p) => `
          <li class="adm-stream-platform">
            <span>${p.icon}</span>
            <div><strong>${p.name}</strong><em>${p.status}</em></div>
          </li>`
          )
          .join("")}
      </ul>
    </section>

    <section class="adm-panel">
      <p class="login-kicker">Programación</p>
      <h3 class="adm-panel-title">Próximas sesiones</h3>
      ${
        livePosts.length
          ? livePosts
              .map(
                (p) => `
        <article class="adm-stream-session">
          <span>${p.icon}</span>
          <div>
            <strong>${escapeHtml(p.title)}</strong>
            <p>${escapeHtml(p.text)}</p>
            <a href="/admin/comunidad" class="admin-link-btn">Editar anuncio</a>
          </div>
        </article>`
              )
              .join("")
          : `<p class="admin-muted">Crea un anuncio en Comunidad con icono ◷ para promocionar tu próximo directo.</p>`
      }
    </section>

    <section class="adm-panel adm-panel--wide">
      <p class="login-kicker">Cursos</p>
      <h3 class="adm-panel-title">Listo para streaming</h3>
      <div class="adm-stream-courses">
        ${courses
          .map(
            (c) => `
          <div class="adm-stream-course">
            <div class="adm-stream-course-cover" style="background-image:url('${c.coverImage || ""}')"></div>
            <div>
              <strong>${escapeHtml(c.title)}</strong>
              <p class="admin-muted">${escapeHtml(c.instructor || platform.communication.teacherName)}</p>
            </div>
          </div>`
          )
          .join("")}
      </div>
    </section>
  </div>`;
