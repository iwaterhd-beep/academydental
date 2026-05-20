import { initAdminShell, showToast, confirmAction, escapeHtml } from "./shell.js";
import { miniBars } from "./admin-layout.js";
import {
  getCommunityPosts,
  getCommunityStats,
  getCommunityPost,
  createCommunityPost,
  saveCommunityPost,
  deleteCommunityPost,
  getCourses,
  getPlatformSettings,
  COMMUNITY_ICONS,
  formatDate,
} from "../js/data.js";

initAdminShell("comunidad");

const root = document.getElementById("communityRoot");
const modal = document.getElementById("postModal");
const form = document.getElementById("postForm");
let filter = "all";

function courseLabel(courseId) {
  if (!courseId) return "Global · toda la academia";
  return getCourses().find((c) => c.id === courseId)?.title || "Curso";
}

function filteredPosts() {
  const posts = getCommunityPosts();
  if (filter === "published") return posts.filter((p) => p.published);
  if (filter === "draft") return posts.filter((p) => !p.published);
  if (filter === "global") return posts.filter((p) => !p.courseId);
  if (filter === "pinned") return posts.filter((p) => p.pinned);
  return posts;
}

function renderStats() {
  const s = getCommunityStats();
  return [
    { icon: "◈", label: "Anuncios", value: s.total, sub: `${s.published} publicados` },
    { icon: "📌", label: "Fijados", value: s.pinned, sub: "Prioridad alta" },
    { icon: "◆", label: "Globales", value: s.global, sub: "Toda la academia" },
    { icon: "◉", label: "Alcance", value: s.reach, sub: `${s.reach} alumnos activos` },
  ]
    .map(
      (c) => `
    <article class="adm-stat-card adm-stat-card--compact">
      <div class="adm-stat-head"><span class="adm-stat-icon">${c.icon}</span></div>
      <p class="adm-stat-label">${c.label}</p>
      <p class="adm-stat-value adm-stat-value--text">${c.value}</p>
      <p class="adm-stat-sub">${c.sub}</p>
      <div class="adm-spark">${miniBars(c.value + 17, 5)}</div>
    </article>`
    )
    .join("");
}

function renderPostCard(post) {
  return `
    <article class="adm-community-card ${post.published ? "" : "is-draft"} ${post.pinned ? "is-pinned" : ""}">
      <div class="adm-community-card-head">
        <span class="adm-community-icon">${post.icon}</span>
        <div class="adm-community-card-meta">
          ${post.pinned ? `<span class="admin-badge admin-badge--published">Fijado</span>` : ""}
          ${post.published ? `<span class="admin-badge admin-badge--published">Publicado</span>` : `<span class="admin-badge admin-badge--draft">Borrador</span>`}
          <span class="admin-muted">${escapeHtml(courseLabel(post.courseId))}</span>
        </div>
      </div>
      <h3>${escapeHtml(post.title)}</h3>
      <p class="adm-community-card-text">${escapeHtml(post.text)}</p>
      <footer class="adm-community-card-foot">
        <span>${escapeHtml(post.authorName)} · ${formatDate(post.createdAt)}</span>
        <div class="adm-community-card-actions">
          <button type="button" class="admin-link-btn" data-edit="${post.id}">Editar</button>
          <button type="button" class="admin-link-btn" data-toggle="${post.id}">${post.published ? "Ocultar" : "Publicar"}</button>
          <button type="button" class="admin-link-btn admin-link-btn--danger" data-del="${post.id}">Eliminar</button>
        </div>
      </footer>
    </article>`;
}

function render() {
  const posts = filteredPosts();
  const platform = getPlatformSettings();
  const enabled = platform.communication.communityEnabled;

  root.innerHTML = `
    ${!enabled ? `<div class="adm-community-alert">La comunidad está desactivada en <a href="/admin/config">Configuración → Comunicación</a>. Los alumnos no verán anuncios.</div>` : ""}
    <div class="adm-stat-grid adm-stat-grid--compact adm-community-stats">${renderStats()}</div>
    <div class="adm-community-toolbar">
      <div class="adm-community-filters">
        ${[
          ["all", "Todos"],
          ["published", "Publicados"],
          ["draft", "Borradores"],
          ["global", "Globales"],
          ["pinned", "Fijados"],
        ]
          .map(
            ([id, label]) =>
              `<button type="button" class="adm-filter-chip ${filter === id ? "is-active" : ""}" data-filter="${id}">${label}</button>`
          )
          .join("")}
      </div>
      <a href="/campus/#comunidad" class="adm-btn adm-btn--ghost" target="_blank">Vista alumno ↗</a>
    </div>
    <div class="adm-community-grid">
      ${posts.length ? posts.map(renderPostCard).join("") : `<div class="adm-empty-panel admin-empty" style="padding:48px">No hay anuncios con este filtro. <button type="button" class="admin-link-btn" id="emptyCreateBtn">Crear el primero</button></div>`}
    </div>`;

  root.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.onclick = () => {
      filter = btn.dataset.filter;
      render();
    };
  });
  root.querySelectorAll("[data-edit]").forEach((btn) => btn.onclick = () => openEdit(btn.dataset.edit));
  root.querySelectorAll("[data-del]").forEach((btn) => btn.onclick = () => removePost(btn.dataset.del));
  root.querySelectorAll("[data-toggle]").forEach((btn) => btn.onclick = () => togglePublish(btn.dataset.toggle));
  document.getElementById("emptyCreateBtn")?.addEventListener("click", openCreate);
}

function fillIconSelect(selected = "📢") {
  const sel = document.getElementById("postIcon");
  sel.innerHTML = COMMUNITY_ICONS.map(
    (icon) => `<option value="${icon}" ${icon === selected ? "selected" : ""}>${icon}</option>`
  ).join("");
}

function fillCourseSelect(selected = "") {
  const sel = document.getElementById("postCourse");
  const courses = getCourses();
  sel.innerHTML = `<option value="">Global — toda la academia</option>${courses
    .map((c) => `<option value="${c.id}" ${c.id === selected ? "selected" : ""}>${escapeHtml(c.title)}</option>`)
    .join("")}`;
}

function bindToggleVisuals() {
  document.querySelectorAll("#postForm .adm-toggle-input").forEach((input) => {
    const sync = () => input.nextElementSibling?.classList.toggle("is-on", input.checked);
    input.onchange = sync;
    sync();
  });
}

function updatePreview() {
  const title = document.getElementById("postTitle")?.value || "Título del anuncio";
  const text = document.getElementById("postText")?.value || "Contenido del anuncio…";
  const icon = document.getElementById("postIcon")?.value || "📢";
  const courseId = document.getElementById("postCourse")?.value || "";
  document.getElementById("postPreview").innerHTML = `
    <p class="login-kicker">Vista previa campus</p>
    <article class="dash-announce-card adm-community-preview-card">
      <span class="dash-announce-icon">${icon}</span>
      <div>
        <p class="login-kicker">${escapeHtml(courseLabel(courseId || null))}</p>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(text)}</p>
        <time>${new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</time>
      </div>
    </article>`;
}

function openCreate() {
  form.reset();
  document.getElementById("postId").value = "";
  document.getElementById("postModalTitle").textContent = "Nuevo anuncio";
  document.getElementById("postPublished").checked = true;
  document.getElementById("postPinned").checked = false;
  fillIconSelect("📢");
  fillCourseSelect("");
  bindToggleVisuals();
  updatePreview();
  modal.showModal();
}

function openEdit(id) {
  const post = getCommunityPost(id);
  if (!post) return;
  document.getElementById("postId").value = post.id;
  document.getElementById("postTitle").value = post.title;
  document.getElementById("postText").value = post.text;
  document.getElementById("postPinned").checked = post.pinned;
  document.getElementById("postPublished").checked = post.published;
  document.getElementById("postModalTitle").textContent = "Editar anuncio";
  fillIconSelect(post.icon);
  fillCourseSelect(post.courseId || "");
  bindToggleVisuals();
  updatePreview();
  modal.showModal();
}

function removePost(id) {
  const post = getCommunityPost(id);
  if (!post || !confirmAction(`¿Eliminar «${post.title}»?`)) return;
  deleteCommunityPost(id);
  showToast("Anuncio eliminado");
  render();
}

function togglePublish(id) {
  const post = getCommunityPost(id);
  if (!post) return;
  saveCommunityPost({ ...post, published: !post.published });
  showToast(post.published ? "Anuncio oculto" : "Anuncio publicado");
  render();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const id = document.getElementById("postId").value;
  const payload = {
    title: document.getElementById("postTitle").value.trim(),
    text: document.getElementById("postText").value.trim(),
    icon: document.getElementById("postIcon").value,
    courseId: document.getElementById("postCourse").value || null,
    pinned: document.getElementById("postPinned").checked,
    published: document.getElementById("postPublished").checked,
  };
  if (!payload.title || !payload.text) return;

  if (id) {
    saveCommunityPost({ ...getCommunityPost(id), ...payload });
    showToast("Anuncio actualizado");
  } else {
    createCommunityPost(payload);
    showToast("Anuncio publicado en comunidad");
  }
  modal.close();
  render();
});

["postTitle", "postText", "postIcon", "postCourse"].forEach((id) => {
  document.getElementById(id)?.addEventListener("input", updatePreview);
  document.getElementById(id)?.addEventListener("change", updatePreview);
});

document.getElementById("newPostBtn")?.addEventListener("click", openCreate);
document.getElementById("closePostModal")?.addEventListener("click", () => modal.close());
document.getElementById("cancelPostModal")?.addEventListener("click", () => modal.close());

render();
