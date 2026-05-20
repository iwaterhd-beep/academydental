import { requireAdmin, logoutAdmin } from "../js/auth.js";
import {
  getCourse,
  saveCourse,
  createEmptyCourse,
  duplicateCourse,
  uid,
  createBlock,
  createAssignment,
  createQuiz,
  COLOR_PRESETS,
  STOCK_COVERS,
  LEVELS,
  LANGUAGES,
  STATUS_LABELS,
  emptyMod,
  emptyTopic,
  emptyLessonItem,
  emptyActivity,
  emptyExam,
  ACTIVITY_TYPES,
} from "../js/data.js";
import { BLOCK_TOOLBAR, buildBlockEditor } from "./editor/blocks.js";
import { renderCoursePreview, renderLessonPreview, renderActivityPreview, renderExamPreview, escapeHtml } from "./editor/preview.js";
import { bindThemeToggle } from "../js/theme.js";

if (!requireAdmin()) throw new Error("unauthorized");

const params = new URLSearchParams(location.search);
let courseId = params.get("id");
let course = courseId ? getCourse(courseId) : null;
if (!course && params.get("new")) {
  course = createEmptyCourse();
  courseId = course.id;
  history.replaceState({}, "", `/admin/curso-editor?id=${courseId}`);
}
if (!course) {
  location.href = "/admin/cursos";
  throw new Error("no course");
}

let selection = { type: "course" };
let saveTimer = null;
let dirty = false;

const els = {
  autosave: document.getElementById("autosaveStatus"),
  statusPill: document.getElementById("statusPill"),
  topbarTitle: document.getElementById("topbarTitle"),
  treeList: document.getElementById("treeList"),
  livePreview: document.getElementById("livePreview"),
  tabs: document.querySelectorAll(".builder-tab"),
  panels: {
    info: document.getElementById("panelInfo"),
    desc: document.getElementById("panelDesc"),
    content: document.getElementById("panelContent"),
    task: document.getElementById("panelTask"),
    quiz: document.getElementById("panelQuiz"),
    unlock: document.getElementById("panelUnlock"),
    settings: document.getElementById("panelSettings"),
  },
};

function markDirty() {
  dirty = true;
  els.autosave.textContent = "Cambios sin guardar…";
  els.autosave.classList.add("is-dirty");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 1800);
}

function persist() {
  course.updatedAt = new Date().toISOString();
  course = saveCourse(course);
  dirty = false;
  els.autosave.textContent = `Guardado ${new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
  els.autosave.classList.remove("is-dirty");
  updateChrome();
}

function updateChrome() {
  els.topbarTitle.innerHTML = `${escapeHtml(course.title)} <em>editor</em>`;
  els.statusPill.textContent = STATUS_LABELS[course.status] || course.status;
  els.statusPill.classList.toggle("is-published", course.status === "published");
}

function getItemsList(sel) {
  if (sel.scope === "course") return course.items || [];
  if (sel.scope === "module") {
    return course.structure.find((m) => m.id === sel.moduleId)?.items || [];
  }
  if (sel.scope === "topic") {
    const mod = course.structure.find((m) => m.id === sel.moduleId);
    return mod?.topics.find((t) => t.id === sel.topicId)?.items || [];
  }
  return [];
}

function getItemRef() {
  if (selection.type !== "item") return null;
  return getItemsList(selection).find((i) => i.id === selection.itemId) || null;
}

function itemIcon(kind) {
  if (kind === "lesson") return "🎬";
  if (kind === "activity") return "✏️";
  return "📝";
}

function parseItemKey(key) {
  const parts = key.split(":");
  if (parts[0] === "course") return { scope: "course", itemId: parts[1] };
  if (parts[0] === "module") return { scope: "module", moduleId: parts[1], itemId: parts[2] };
  return { scope: "topic", moduleId: parts[1], topicId: parts[2], itemId: parts[3] };
}

function itemKey(scope, itemId, moduleId = null, topicId = null) {
  if (scope === "course") return `course:${itemId}`;
  if (scope === "module") return `module:${moduleId}:${itemId}`;
  return `topic:${moduleId}:${topicId}:${itemId}`;
}

function selectItem(scope, itemId, moduleId = null, topicId = null) {
  selection = { type: "item", scope, moduleId, topicId, itemId };
  document.getElementById("selectCourseBtn").classList.remove("is-active");
  renderAll();
}

function addItemToScope(scope, kind, moduleId = null, topicId = null) {
  const list = scope === "course"
    ? (course.items ||= [])
    : scope === "module"
      ? (course.structure.find((m) => m.id === moduleId).items ||= [])
      : (course.structure.find((m) => m.id === moduleId).topics.find((t) => t.id === topicId).items ||= []);

  const item = kind === "lesson" ? emptyLessonItem() : kind === "activity" ? emptyActivity() : emptyExam();
  list.push(item);
  markDirty();
  selectItem(scope, item.id, moduleId, topicId);
}

function setTab(tab) {
  els.tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.tab === tab));
  Object.entries(els.panels).forEach(([k, el]) => el.classList.toggle("is-hidden", k !== tab));
}

function updateTabsVisibility() {
  const tabQuiz = document.querySelector('.builder-tab[data-tab="quiz"]');
  if (selection.type === "course") {
    const courseTabs = ["info", "desc", "settings"];
    els.tabs.forEach((t) => {
      t.style.display = courseTabs.includes(t.dataset.tab) ? "" : "none";
    });
    if (tabQuiz) tabQuiz.textContent = "Test";
    setTab("info");
    return;
  }
  const item = getItemRef();
  if (!item) return;
  let tabs = [];
  if (item.kind === "lesson") tabs = ["content", "task", "quiz", "unlock"];
  else if (item.kind === "activity") tabs = ["content", "task", "unlock"];
  else if (item.kind === "exam") tabs = ["content", "quiz", "unlock"];
  els.tabs.forEach((t) => {
    t.style.display = tabs.includes(t.dataset.tab) ? "" : "none";
  });
  if (tabQuiz) tabQuiz.textContent = item.kind === "exam" ? "Examen" : "Test";
  setTab(tabs[0]);
}

function renderTreeItemRow(item, scope, modId, topicId = null) {
  const active = selection.type === "item" && selection.itemId === item.id && selection.scope === scope;
  const key = itemKey(scope, item.id, modId, topicId);
  const depth = scope === "topic" ? 2 : scope === "module" ? 1 : 0;
  const spacers = '<span class="tree-spacer"></span>'.repeat(depth);
  return `
    <div class="tree-row tree-row--item tree-row--${item.kind} ${active ? "is-active" : ""}" data-select-item="${key}">
      ${spacers}
      <span>${itemIcon(item.kind)} ${escapeHtml(item.title)}</span>
      <div class="tree-row-actions">
        <button type="button" data-dup-item="${key}" title="Duplicar">⧉</button>
        <button type="button" data-rm-item="${key}" title="Eliminar">×</button>
      </div>
    </div>`;
}

function renderCourseItems() {
  const list = document.getElementById("courseItemsList");
  if (!list) return;
  list.innerHTML = (course.items || []).map((item) => renderTreeItemRow(item, "course")).join("");
}

function renderTree() {
  renderCourseItems();
  els.treeList.innerHTML = course.structure
    .map(
      (mod) => `
    <div class="tree-module" data-mod="${mod.id}">
      <div class="tree-row tree-row--mod ${selection.moduleId === mod.id && selection.type === "module" ? "is-active" : ""}" draggable="true">
        <button type="button" class="tree-toggle" data-toggle-mod="${mod.id}">${mod.published ? "▾" : "▸"}</button>
        <span class="tree-label" data-select-mod="${mod.id}">📁 ${escapeHtml(mod.title)}</span>
        <div class="tree-row-actions">
          <button type="button" data-add-topic="${mod.id}" title="Añadir tema">+</button>
          <button type="button" data-dup-mod="${mod.id}" title="Duplicar">⧉</button>
          <button type="button" data-rm-mod="${mod.id}" title="Eliminar">×</button>
        </div>
      </div>
      <div class="tree-children">
        ${(mod.items || []).map((item) => renderTreeItemRow(item, "module", mod.id)).join("")}
        <div class="tree-inline-add tree-inline-add--mod">
          <button type="button" class="tree-mini-btn" data-add-mod-item="activity:${mod.id}">+ ✏️</button>
          <button type="button" class="tree-mini-btn" data-add-mod-item="exam:${mod.id}">+ 📝</button>
        </div>
        ${mod.topics
          .map(
            (topic) => `
          <div class="tree-topic" data-topic="${topic.id}">
            <div class="tree-row tree-row--topic">
              <span class="tree-spacer"></span>
              <span class="tree-label" data-select-topic="${mod.id}:${topic.id}">📂 ${escapeHtml(topic.title)}</span>
              <div class="tree-row-actions">
                <button type="button" data-add-item="lesson:${mod.id}:${topic.id}" title="Lección">🎬</button>
                <button type="button" data-add-item="activity:${mod.id}:${topic.id}" title="Actividad">✏️</button>
                <button type="button" data-add-item="exam:${mod.id}:${topic.id}" title="Examen">📝</button>
                <button type="button" data-rm-topic="${mod.id}:${topic.id}">×</button>
              </div>
            </div>
            <div class="tree-lessons">
              ${topic.items.map((item) => renderTreeItemRow(item, "topic", mod.id, topic.id)).join("")}
            </div>
          </div>`
          )
          .join("")}
      </div>
    </div>`
    )
    .join("");

  bindTreeEvents();
}

function bindTreeEvents() {
  document.getElementById("selectCourseBtn").onclick = () => {
    selection = { type: "course" };
    document.getElementById("selectCourseBtn").classList.add("is-active");
    renderAll();
  };

  document.getElementById("addCourseActivity")?.addEventListener("click", () => addItemToScope("course", "activity"));
  document.getElementById("addCourseExam")?.addEventListener("click", () => addItemToScope("course", "exam"));

  document.querySelectorAll("[data-select-item]").forEach((row) => {
    row.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      const parsed = parseItemKey(row.dataset.selectItem);
      selectItem(parsed.scope, parsed.itemId, parsed.moduleId, parsed.topicId);
    });
  });

  document.querySelectorAll("[data-add-item]").forEach((btn) => {
    btn.onclick = () => {
      const [kind, mid, tid] = btn.dataset.addItem.split(":");
      addItemToScope("topic", kind, mid, tid);
    };
  });

  document.querySelectorAll("[data-add-mod-item]").forEach((btn) => {
    btn.onclick = () => {
      const [kind, mid] = btn.dataset.addModItem.split(":");
      addItemToScope("module", kind, mid);
    };
  });

  document.querySelectorAll("[data-dup-item]").forEach((btn) => {
    btn.onclick = () => {
      const parsed = parseItemKey(btn.dataset.dupItem);
      const list = getItemsList(parsed);
      const src = list.find((i) => i.id === parsed.itemId);
      if (!src) return;
      const copy = structuredClone(src);
      copy.id = uid(copy.kind === "lesson" ? "l" : copy.kind === "activity" ? "act" : "ex");
      copy.title += " (copia)";
      list.push(copy);
      markDirty();
      selectItem(parsed.scope, copy.id, parsed.moduleId, parsed.topicId);
    };
  });

  document.querySelectorAll("[data-rm-item]").forEach((btn) => {
    btn.onclick = () => {
      const parsed = parseItemKey(btn.dataset.rmItem);
      const list = getItemsList(parsed);
      const idx = list.findIndex((i) => i.id === parsed.itemId);
      if (idx < 0) return;
      if (list.length === 1 && parsed.scope === "topic" && list[0].kind === "lesson") {
        alert("Cada tema debe tener al menos una lección.");
        return;
      }
      if (!confirm("¿Eliminar este elemento?")) return;
      list.splice(idx, 1);
      if (selection.itemId === parsed.itemId) selection = { type: "course" };
      markDirty();
      renderAll();
    };
  });

  els.treeList.querySelectorAll("[data-add-topic]").forEach((btn) => {
    btn.onclick = () => {
      const mod = course.structure.find((m) => m.id === btn.dataset.addTopic);
      mod.topics.push(emptyTopic());
      markDirty();
      renderAll();
    };
  });

  els.treeList.querySelectorAll("[data-rm-mod]").forEach((btn) => {
    btn.onclick = () => {
      if (!confirm("¿Eliminar módulo?")) return;
      course.structure = course.structure.filter((m) => m.id !== btn.dataset.rmMod);
      selection = { type: "course" };
      markDirty();
      renderAll();
    };
  });

  els.treeList.querySelectorAll("[data-rm-topic]").forEach((btn) => {
    btn.onclick = () => {
      const [mid, tid] = btn.dataset.rmTopic.split(":");
      const mod = course.structure.find((m) => m.id === mid);
      mod.topics = mod.topics.filter((t) => t.id !== tid);
      markDirty();
      renderAll();
    };
  });
}

function renderBlocksPanel(container, blocks) {
  container.innerHTML = `
    <div class="editor-blocks-toolbar" id="toolbar"></div>
    <div class="editor-blocks" id="blocksList"></div>`;
  const toolbar = container.querySelector("#toolbar");
  const list = container.querySelector("#blocksList");

  const syncPreview = () => {
    markDirty();
    renderPreview();
  };

  const onBlockUpdate = (fullRefresh = true) => {
    if (fullRefresh) refreshList();
    syncPreview();
  };

  const refreshList = () => {
    list.innerHTML = "";
    blocks.forEach((block, i) => {
      list.appendChild(
        buildBlockEditor(
          block,
          i,
          blocks,
          onBlockUpdate,
          (idx) => {
            blocks.splice(idx, 1);
            onBlockUpdate(true);
          },
          (idx, dir) => {
            const to = idx + dir;
            if (to < 0 || to >= blocks.length) return;
            [blocks[idx], blocks[to]] = [blocks[to], blocks[idx]];
            onBlockUpdate(true);
          }
        )
      );
    });
  };

  BLOCK_TOOLBAR.forEach(({ type, label }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "editor-tool-btn";
    btn.textContent = label;
    btn.onclick = () => {
      blocks.push(createBlock(type));
      onBlockUpdate(true);
    };
    toolbar.appendChild(btn);
  });

  refreshList();
}

function renderInfoPanel() {
  const p = els.panels.info;
  p.innerHTML = `
    <div class="editor-fields">
      <label class="editor-field editor-field--full"><span class="editor-label">Título</span>
        <input class="editor-input editor-input--title" id="fTitle" value="${escapeHtml(course.title)}" /></label>
      <label class="editor-field editor-field--full"><span class="editor-label">Subtítulo</span>
        <input class="editor-input" id="fSubtitle" value="${escapeHtml(course.subtitle)}" /></label>
      <label class="editor-field editor-field--full"><span class="editor-label">Descripción corta</span>
        <textarea class="editor-input" id="fShort" rows="2">${escapeHtml(course.shortDescription)}</textarea></label>
      <label class="editor-field"><span class="editor-label">Categoría</span>
        <input class="editor-input" id="fCategory" value="${escapeHtml(course.category)}" /></label>
      <label class="editor-field"><span class="editor-label">Nivel</span>
        <select class="editor-input" id="fLevel">${LEVELS.map((l) => `<option ${course.level === l ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <label class="editor-field"><span class="editor-label">Idioma</span>
        <select class="editor-input" id="fLang">${LANGUAGES.map((l) => `<option ${course.language === l ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <label class="editor-field"><span class="editor-label">Instructor</span>
        <input class="editor-input" id="fInstructor" value="${escapeHtml(course.instructor)}" /></label>
      <label class="editor-field"><span class="editor-label">Precio (€)</span>
        <input class="editor-input" id="fPrice" type="number" value="${course.price}" /></label>
      <label class="editor-field"><span class="editor-label">Duración (horas)</span>
        <input class="editor-input" id="fDuration" type="number" value="${course.durationHours}" /></label>
      <label class="editor-field editor-field--full"><span class="editor-label">Etiquetas (separadas por coma)</span>
        <input class="editor-input" id="fTags" value="${escapeHtml(course.tags.join(", "))}" /></label>
      <div class="editor-field editor-field--full">
        <span class="editor-label">Portada / banner / miniatura</span>
        <div class="editor-cover-zone" id="coverZone">${course.coverImage ? `<img src="${course.coverImage}" alt="" />` : `<div class="editor-cover-placeholder"><strong>Subir portada premium</strong></div>`}</div>
        <input type="file" id="coverFile" accept="image/*" hidden />
        <div class="editor-cover-actions">
          <button type="button" class="admin-btn admin-btn--ghost" id="coverPick">Subir imagen</button>
          <button type="button" class="admin-btn admin-btn--ghost" id="coverStock">Usar imagen demo</button>
        </div>
        <div class="editor-gallery-row">${STOCK_COVERS.map((u) => `<div class="editor-gallery-thumb"><img src="${u}" data-stock="${u}" /></div>`).join("")}</div>
      </div>
      <div class="editor-field editor-field--full">
        <span class="editor-label">Vídeo trailer</span>
        <div class="editor-cover-zone" id="trailerZone">${
          course.trailerUrl && !/youtube|youtu\.be|vimeo/.test(course.trailerUrl)
            ? `<video src="${course.trailerUrl}" controls playsinline></video>`
            : `<div class="editor-cover-placeholder"><strong>Subir vídeo trailer</strong><span>MP4, WebM · máx. 50 MB</span></div>`
        }</div>
        <input type="file" id="trailerFile" accept="video/mp4,video/webm,video/quicktime,video/*" hidden />
        <div class="editor-cover-actions">
          <button type="button" class="admin-btn admin-btn--ghost" id="trailerPick">Subir vídeo</button>
          ${course.trailerUrl ? `<button type="button" class="admin-btn admin-btn--ghost" id="trailerClear">Quitar</button>` : ""}
        </div>
        <label class="editor-field editor-field--full" style="margin-top:14px">
          <span class="editor-label">O enlace externo (YouTube / Vimeo)</span>
          <input class="editor-input" id="fTrailer" value="${/youtube|youtu\.be|vimeo/.test(course.trailerUrl || "") ? escapeHtml(course.trailerUrl) : ""}" placeholder="https://youtube.com/..." />
        </label>
      </div>
      <div class="editor-field editor-field--full"><span class="editor-label">Color acento</span>
        <div class="editor-colors" id="accentColors">${COLOR_PRESETS.map((c) => `<button type="button" class="editor-color-btn ${course.accentColor === c.value ? "is-active" : ""}" data-accent="${c.value}" style="background:${c.value}"></button>`).join("")}</div>
      </div>
    </div>`;

  const bind = (id, key, transform = (v) => v) => {
    p.querySelector(id)?.addEventListener("input", (e) => {
      course[key] = transform(e.target.value);
      markDirty();
      renderPreview();
    });
  };
  bind("#fTitle", "title");
  bind("#fSubtitle", "subtitle");
  bind("#fShort", "shortDescription");
  bind("#fCategory", "category");
  bind("#fInstructor", "instructor");
  bind("#fPrice", "price", (v) => Number(v));
  bind("#fDuration", "durationHours", (v) => Number(v));
  p.querySelector("#fTrailer")?.addEventListener("input", (e) => {
    course.trailerUrl = e.target.value.trim();
    markDirty();
    renderPreview();
  });
  p.querySelector("#trailerPick")?.addEventListener("click", () => p.querySelector("#trailerFile").click());
  p.querySelector("#trailerFile")?.addEventListener("change", (e) => {
    uploadFile(e, (url) => {
      course.trailerUrl = url;
      markDirty();
      renderInfoPanel();
      renderPreview();
    }, { maxMb: 50, kind: "video" });
  });
  p.querySelector("#trailerClear")?.addEventListener("click", () => {
    course.trailerUrl = "";
    markDirty();
    renderInfoPanel();
    renderPreview();
  });
  p.querySelector("#fLevel")?.addEventListener("change", (e) => { course.level = e.target.value; markDirty(); });
  p.querySelector("#fLang")?.addEventListener("change", (e) => { course.language = e.target.value; markDirty(); });
  p.querySelector("#fTags")?.addEventListener("input", (e) => {
    course.tags = e.target.value.split(",").map((t) => t.trim()).filter(Boolean);
    markDirty();
  });

  p.querySelector("#coverPick")?.addEventListener("click", () => p.querySelector("#coverFile").click());
  p.querySelector("#coverFile")?.addEventListener("change", (e) => uploadFile(e, (url) => {
    course.coverImage = course.bannerImage = course.thumbnail = url;
    markDirty();
    renderInfoPanel();
    renderPreview();
  }));
  p.querySelector("#coverStock")?.addEventListener("click", () => {
    course.coverImage = course.bannerImage = course.thumbnail = STOCK_COVERS[0];
    markDirty();
    renderInfoPanel();
    renderPreview();
  });
  p.querySelectorAll("[data-stock]").forEach((img) => {
    img.parentElement.onclick = () => {
      course.coverImage = course.bannerImage = course.thumbnail = img.dataset.stock;
      markDirty();
      renderInfoPanel();
      renderPreview();
    };
  });
  p.querySelectorAll("[data-accent]").forEach((btn) => {
    btn.onclick = () => {
      course.accentColor = btn.dataset.accent;
      markDirty();
      renderInfoPanel();
    };
  });
}

function renderDescPanel() {
  renderBlocksPanel(els.panels.desc, course.blocks);
}

function renderContentPanel() {
  const item = getItemRef();
  if (!item) return;

  if (item.kind === "lesson") {
    els.panels.content.innerHTML = `
      <label class="editor-field editor-field--full"><span class="editor-label">Título lección</span>
        <input class="editor-input editor-input--title" id="iTitle" value="${escapeHtml(item.title)}" /></label>
      <div class="editor-fields">
        <label class="editor-field"><span class="editor-label">Duración (min)</span>
          <input class="editor-input" id="iDuration" type="number" value="${item.durationMin || 10}" /></label>
        <label class="editor-field"><span class="editor-label">Publicada</span>
          <select class="editor-input" id="iPublished"><option value="1" ${item.published ? "selected" : ""}>Sí</option><option value="0" ${!item.published ? "selected" : ""}>Oculta</option></select></label>
      </div>
      <label class="editor-field editor-field--full"><span class="editor-label">Vídeo de la lección</span>
        <input class="editor-input" id="iVideo" value="${escapeHtml(item.videoUrl)}" placeholder="YouTube, Vimeo o MP4" />
        <input type="file" id="iVideoFile" accept="video/*" style="margin-top:10px" /></label>
      <p class="login-kicker" style="margin:28px 0 12px">Bloques de contenido</p>
      <div id="itemBlocks"></div>`;

    els.panels.content.querySelector("#iTitle").oninput = (e) => { item.title = e.target.value; markDirty(); renderTree(); renderPreview(); };
    els.panels.content.querySelector("#iDuration").oninput = (e) => { item.durationMin = Number(e.target.value); markDirty(); };
    els.panels.content.querySelector("#iPublished").onchange = (e) => { item.published = e.target.value === "1"; markDirty(); };
    els.panels.content.querySelector("#iVideo").oninput = (e) => { item.videoUrl = e.target.value; markDirty(); renderPreview(); };
    els.panels.content.querySelector("#iVideoFile").onchange = (e) => uploadFile(e, (url) => { item.videoUrl = url; markDirty(); renderContentPanel(); renderPreview(); }, { maxMb: 50, kind: "video" });
    renderBlocksPanel(els.panels.content.querySelector("#itemBlocks"), item.blocks);
    return;
  }

  if (item.kind === "activity") {
    els.panels.content.innerHTML = `
      <label class="editor-field editor-field--full"><span class="editor-label">Título actividad</span>
        <input class="editor-input editor-input--title" id="iTitle" value="${escapeHtml(item.title)}" /></label>
      <div class="editor-fields">
        <label class="editor-field"><span class="editor-label">Tipo</span>
          <select class="editor-input" id="iActType">${Object.entries(ACTIVITY_TYPES).map(([k, v]) => `<option value="${k}" ${item.activityType === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label class="editor-field"><span class="editor-label">Duración (min)</span>
          <input class="editor-input" id="iDuration" type="number" value="${item.durationMin || 15}" /></label>
        <label class="editor-field"><span class="editor-label">Publicada</span>
          <select class="editor-input" id="iPublished"><option value="1" ${item.published ? "selected" : ""}>Sí</option><option value="0" ${!item.published ? "selected" : ""}>Oculta</option></select></label>
      </div>
      <label class="editor-field editor-field--full"><span class="editor-label">Instrucciones para el alumno</span>
        <textarea class="editor-input" id="iInstr" rows="3">${escapeHtml(item.instructions)}</textarea></label>
      <p class="login-kicker" style="margin:28px 0 12px">Material de la actividad</p>
      <div id="itemBlocks"></div>`;

    els.panels.content.querySelector("#iTitle").oninput = (e) => { item.title = e.target.value; markDirty(); renderTree(); renderPreview(); };
    els.panels.content.querySelector("#iActType").onchange = (e) => { item.activityType = e.target.value; markDirty(); renderPreview(); };
    els.panels.content.querySelector("#iDuration").oninput = (e) => { item.durationMin = Number(e.target.value); markDirty(); };
    els.panels.content.querySelector("#iPublished").onchange = (e) => { item.published = e.target.value === "1"; markDirty(); };
    els.panels.content.querySelector("#iInstr").oninput = (e) => { item.instructions = e.target.value; markDirty(); renderPreview(); };
    renderBlocksPanel(els.panels.content.querySelector("#itemBlocks"), item.blocks);
    return;
  }

  if (item.kind === "exam") {
    els.panels.content.innerHTML = `
      <label class="editor-field editor-field--full"><span class="editor-label">Título del examen</span>
        <input class="editor-input editor-input--title" id="iTitle" value="${escapeHtml(item.title)}" /></label>
      <div class="editor-fields">
        <label class="editor-field"><span class="editor-label">Publicado</span>
          <select class="editor-input" id="iPublished"><option value="1" ${item.published ? "selected" : ""}>Sí</option><option value="0" ${!item.published ? "selected" : ""}>Oculto</option></select></label>
        <label class="editor-field"><span class="editor-label">Mezclar preguntas</span>
          <select class="editor-input" id="iShuffle"><option value="0" ${!item.shuffleQuestions ? "selected" : ""}>No</option><option value="1" ${item.shuffleQuestions ? "selected" : ""}>Sí</option></select></label>
      </div>
      <label class="editor-field editor-field--full"><span class="editor-label">Instrucciones del examen</span>
        <textarea class="editor-input" id="iInstr" rows="3">${escapeHtml(item.instructions || "")}</textarea></label>
      <p class="login-kicker" style="margin:20px 0 12px">Introducción opcional (bloques)</p>
      <div id="itemBlocks"></div>`;

    els.panels.content.querySelector("#iTitle").oninput = (e) => { item.title = e.target.value; markDirty(); renderTree(); renderPreview(); };
    els.panels.content.querySelector("#iPublished").onchange = (e) => { item.published = e.target.value === "1"; markDirty(); };
    els.panels.content.querySelector("#iShuffle").onchange = (e) => { item.shuffleQuestions = e.target.value === "1"; markDirty(); };
    els.panels.content.querySelector("#iInstr").oninput = (e) => { item.instructions = e.target.value; markDirty(); renderPreview(); };
    renderBlocksPanel(els.panels.content.querySelector("#itemBlocks"), item.blocks || (item.blocks = []));
  }
}

function renderTaskPanel() {
  const item = getItemRef();
  if (!item || (item.kind !== "lesson" && item.kind !== "activity")) return;
  if (!item.assignment) item.assignment = null;

  els.panels.task.innerHTML = `
    <div class="builder-toggle-row">
      <label><input type="checkbox" id="hasAssignment" ${item.assignment ? "checked" : ""} /> Activar tarea / entrega</label>
    </div>
    <div id="assignmentForm" style="${item.assignment ? "" : "display:none"}"></div>`;

  const toggle = els.panels.task.querySelector("#hasAssignment");
  const form = els.panels.task.querySelector("#assignmentForm");

  const renderForm = () => {
    const a = item.assignment;
    if (!a) { form.style.display = "none"; return; }
    form.style.display = "block";
    form.innerHTML = `
      <label class="editor-field editor-field--full"><span class="editor-label">Título tarea</span>
        <input class="editor-input" id="aTitle" value="${escapeHtml(a.title)}" /></label>
      <label class="editor-field editor-field--full"><span class="editor-label">Instrucciones</span>
        <textarea class="editor-input" id="aInstr" rows="3">${escapeHtml(a.instructions)}</textarea></label>
      <div class="editor-fields">
        <label class="editor-field"><span class="editor-label">Fecha límite</span>
          <input class="editor-input" id="aDue" type="date" value="${a.dueDate || ""}" /></label>
        <label class="editor-field"><span class="editor-label">Puntuación máxima</span>
          <input class="editor-input" id="aScore" type="number" value="${a.maxScore}" /></label>
        <label class="editor-field"><span class="editor-label">Nota mínima test (%)</span>
          <input class="editor-input" id="aPass" type="number" value="${a.passScore ?? 60}" /></label>
      </div>
      <div class="builder-toggle-row" style="margin-top:16px">
        <label><input type="checkbox" id="aAllowFiles" ${a.allowFiles !== false ? "checked" : ""} /> Permitir subida de archivos (imagen, vídeo, PDF…)</label>
      </div>
      <label class="editor-field editor-field--full" id="aFileTypesWrap" style="${a.allowFiles !== false ? "" : "display:none"}">
        <span class="editor-label">Tipos permitidos (separados por coma, vacío = todos)</span>
        <input class="editor-input" id="aFileTypes" value="${escapeHtml((a.fileTypes || []).join(", "))}" placeholder="pdf, jpg, png, mp4, stl" />
      </label>
      <p class="login-kicker" style="margin:20px 0 10px">Preguntas para el alumno</p>
      <div id="aQuestions"></div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button type="button" class="admin-btn admin-btn--ghost" id="addTextQ">+ Texto (corrección manual)</button>
        <button type="button" class="admin-btn admin-btn--ghost" id="addSingleQ">+ Opción múltiple (auto)</button>
      </div>`;
    form.querySelector("#aTitle").oninput = (e) => { a.title = e.target.value; markDirty(); };
    form.querySelector("#aInstr").oninput = (e) => { a.instructions = e.target.value; markDirty(); };
    form.querySelector("#aDue").onchange = (e) => { a.dueDate = e.target.value; markDirty(); };
    form.querySelector("#aScore").oninput = (e) => { a.maxScore = Number(e.target.value); markDirty(); };
    form.querySelector("#aPass").oninput = (e) => { a.passScore = Number(e.target.value); markDirty(); };
    form.querySelector("#aAllowFiles").onchange = (e) => {
      a.allowFiles = e.target.checked;
      form.querySelector("#aFileTypesWrap").style.display = a.allowFiles ? "" : "none";
      markDirty();
    };
    form.querySelector("#aFileTypes").oninput = (e) => {
      a.fileTypes = e.target.value.split(",").map((t) => t.trim()).filter(Boolean);
      markDirty();
    };

    if (!a.questions) a.questions = [];

    const renderQuestions = () => {
      const list = form.querySelector("#aQuestions");
      list.innerHTML = a.questions.map((q, qi) => `
        <div class="quiz-question-card">
          <select data-aq-type="${qi}">
            <option value="text" ${q.type === "text" ? "selected" : ""}>Texto libre</option>
            <option value="single" ${q.type === "single" ? "selected" : ""}>Opción múltiple</option>
          </select>
          <input class="editor-input" data-aq-text="${qi}" value="${escapeHtml(q.text)}" placeholder="Enunciado de la pregunta" />
          <input class="editor-input" data-aq-pts="${qi}" type="number" value="${q.points || 10}" placeholder="Puntos" style="max-width:100px" />
          ${q.type === "single" ? `
            <p class="admin-muted" style="margin:8px 0 4px">Opciones (marca la correcta con el select):</p>
            ${(q.options || ["A", "B", "C"]).map((opt, oi) => `
              <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
                <input type="radio" name="aq_correct_${qi}" ${Number(q.correct) === oi ? "checked" : ""} data-aq-correct="${qi}" value="${oi}" />
                <input class="editor-input" data-aq-opt="${qi}:${oi}" value="${escapeHtml(opt)}" style="flex:1" />
              </div>`).join("")}
            <button type="button" class="admin-link-btn" data-aq-addopt="${qi}">+ Opción</button>
          ` : ""}
          <button type="button" class="admin-link-btn admin-link-btn--danger" data-aq-rm="${qi}">Eliminar pregunta</button>
        </div>`).join("");

      list.querySelectorAll("[data-aq-text]").forEach((el) => {
        el.oninput = () => { a.questions[el.dataset.aqText].text = el.value; markDirty(); };
      });
      list.querySelectorAll("[data-aq-pts]").forEach((el) => {
        el.oninput = () => { a.questions[el.dataset.aqPts].points = Number(el.value); markDirty(); };
      });
      list.querySelectorAll("[data-aq-type]").forEach((el) => {
        el.onchange = () => {
          const q = a.questions[el.dataset.aqType];
          q.type = el.value;
          if (q.type === "single" && !q.options?.length) q.options = ["Opción A", "Opción B", "Opción C"];
          markDirty();
          renderQuestions();
        };
      });
      list.querySelectorAll("[data-aq-opt]").forEach((el) => {
        el.oninput = () => {
          const [qi, oi] = el.dataset.aqOpt.split(":");
          a.questions[qi].options[oi] = el.value;
          markDirty();
        };
      });
      list.querySelectorAll("[data-aq-correct]").forEach((el) => {
        el.onchange = () => { a.questions[el.dataset.aqCorrect].correct = Number(el.value); markDirty(); };
      });
      list.querySelectorAll("[data-aq-addopt]").forEach((btn) => {
        btn.onclick = () => {
          a.questions[btn.dataset.aqAddopt].options.push("Nueva opción");
          markDirty();
          renderQuestions();
        };
      });
      list.querySelectorAll("[data-aq-rm]").forEach((btn) => {
        btn.onclick = () => { a.questions.splice(Number(btn.dataset.aqRm), 1); markDirty(); renderQuestions(); };
      });
    };

    form.querySelector("#addTextQ").onclick = () => {
      a.questions.push({ id: uid("aq"), type: "text", text: "Nueva pregunta abierta", points: 10, required: true, options: [], correct: 0 });
      markDirty();
      renderQuestions();
    };
    form.querySelector("#addSingleQ").onclick = () => {
      a.questions.push({ id: uid("aq"), type: "single", text: "Nueva pregunta test", points: 10, options: ["Opción A", "Opción B", "Opción C"], correct: 0 });
      markDirty();
      renderQuestions();
    };
    renderQuestions();
  };

  toggle.onchange = () => {
    item.assignment = toggle.checked ? createAssignment() : null;
    markDirty();
    renderForm();
    renderPreview();
  };
  renderForm();
}

function renderQuizQuestionsForm(form, q, onUpdate) {
  form.innerHTML = `
    <label class="editor-field editor-field--full"><span class="editor-label">Título</span>
      <input class="editor-input" id="qTitle" value="${escapeHtml(q.title || "")}" /></label>
    <div class="editor-fields">
      <label class="editor-field"><span class="editor-label">Tiempo límite (min)</span>
        <input class="editor-input" id="qTime" type="number" value="${q.timeLimitMin}" /></label>
      <label class="editor-field"><span class="editor-label">Intentos máx.</span>
        <input class="editor-input" id="qAttempts" type="number" value="${q.maxAttempts}" /></label>
      <label class="editor-field"><span class="editor-label">Nota mínima (%)</span>
        <input class="editor-input" id="qPass" type="number" value="${q.passScore}" /></label>
    </div>
    <div id="questionsList"></div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button type="button" class="admin-btn admin-btn--ghost" id="addQuestion">+ Pregunta test</button>
      <button type="button" class="admin-btn admin-btn--ghost" id="addTextQuestion">+ Texto libre</button>
    </div>`;

  form.querySelector("#qTitle").oninput = (e) => { q.title = e.target.value; onUpdate(); };
  form.querySelector("#qTime").oninput = (e) => { q.timeLimitMin = Number(e.target.value); onUpdate(); };
  form.querySelector("#qAttempts").oninput = (e) => { q.maxAttempts = Number(e.target.value); onUpdate(); };
  form.querySelector("#qPass").oninput = (e) => { q.passScore = Number(e.target.value); onUpdate(); };

  const qList = form.querySelector("#questionsList");
  const renderQuestionCards = () => {
    qList.innerHTML = q.questions.map((question, qi) => `
    <div class="quiz-question-card">
      <input class="editor-input" data-q-text="${qi}" value="${escapeHtml(question.text)}" placeholder="Pregunta" />
      <select data-q-type="${qi}">
        <option value="single" ${question.type === "single" ? "selected" : ""}>Opción única</option>
        <option value="multi" ${question.type === "multi" ? "selected" : ""}>Múltiple</option>
        <option value="bool" ${question.type === "bool" ? "selected" : ""}>V/F</option>
        <option value="text" ${question.type === "text" ? "selected" : ""}>Texto libre (corrección manual)</option>
      </select>
      <input class="editor-input" data-q-pts="${qi}" type="number" value="${question.points || 10}" placeholder="Puntos" style="max-width:100px;margin-top:8px" />
      ${question.type !== "text" ? `<div class="quiz-options">${(question.options || []).map((opt, oi) => `<input class="editor-input" data-q-opt="${qi}:${oi}" value="${escapeHtml(opt)}" />`).join("")}</div>` : `<p class="admin-muted" style="margin:8px 0">Corrección manual por el profesor.</p>`}
      <button type="button" class="admin-link-btn admin-link-btn--danger" data-rm-q="${qi}">Eliminar</button>
    </div>`).join("");

    qList.querySelectorAll("[data-q-text]").forEach((el) => {
      el.oninput = () => { q.questions[el.dataset.qText].text = el.value; onUpdate(); };
    });
    qList.querySelectorAll("[data-q-pts]").forEach((el) => {
      el.oninput = () => { q.questions[el.dataset.qPts].points = Number(el.value); onUpdate(); };
    });
    qList.querySelectorAll("[data-q-type]").forEach((el) => {
      el.onchange = () => {
        const question = q.questions[el.dataset.qType];
        question.type = el.value;
        if (question.type === "text") {
          question.options = [];
        } else if (!question.options?.length) {
          question.options = question.type === "bool" ? ["Verdadero", "Falso"] : ["A", "B", "C"];
        }
        onUpdate();
        renderQuestionCards();
      };
    });
    qList.querySelectorAll("[data-q-opt]").forEach((el) => {
      el.oninput = () => {
        const [qi, oi] = el.dataset.qOpt.split(":");
        q.questions[qi].options[oi] = el.value;
        onUpdate();
      };
    });
    qList.querySelectorAll("[data-rm-q]").forEach((btn) => {
      btn.onclick = () => { q.questions.splice(Number(btn.dataset.rmQ), 1); onUpdate(); renderQuestionCards(); };
    });
  };
  renderQuestionCards();

  form.querySelector("#addQuestion").onclick = () => {
    q.questions.push({ id: uid("q"), type: "single", text: "Nueva pregunta", options: ["A", "B", "C"], correct: 0, points: 10 });
    onUpdate();
    renderQuestionCards();
  };
  form.querySelector("#addTextQuestion")?.addEventListener("click", () => {
    q.questions.push({ id: uid("q"), type: "text", text: "Nueva pregunta abierta", points: 10, options: [], correct: 0 });
    onUpdate();
    renderQuestionCards();
  });
}

function renderQuizPanel() {
  const item = getItemRef();
  if (!item) return;

  if (item.kind === "exam") {
    els.panels.quiz.innerHTML = `<div id="quizForm"></div>`;
    if (!item.questions) item.questions = createQuiz().questions;
    renderQuizQuestionsForm(els.panels.quiz.querySelector("#quizForm"), item, () => { markDirty(); renderPreview(); });
    return;
  }

  if (item.kind !== "lesson") return;

  els.panels.quiz.innerHTML = `
    <div class="builder-toggle-row">
      <label><input type="checkbox" id="hasQuiz" ${item.quiz ? "checked" : ""} /> Activar cuestionario / test</label>
    </div>
    <div id="quizForm" style="${item.quiz ? "" : "display:none"}"></div>`;

  const toggle = els.panels.quiz.querySelector("#hasQuiz");
  const form = els.panels.quiz.querySelector("#quizForm");

  const renderForm = () => {
    const q = item.quiz;
    if (!q) { form.style.display = "none"; return; }
    form.style.display = "block";
    renderQuizQuestionsForm(form, q, () => { markDirty(); renderPreview(); });
  };

  toggle.onchange = () => {
    item.quiz = toggle.checked ? createQuiz() : null;
    markDirty();
    renderForm();
  };
  renderForm();
}

function renderUnlockPanel() {
  const item = getItemRef();
  if (!item) return;
  item.unlock = item.unlock || { mode: "sequential", date: null };

  els.panels.unlock.innerHTML = `
    <label class="editor-field editor-field--full"><span class="editor-label">Modo desbloqueo</span>
      <select class="editor-input" id="uMode">
        <option value="sequential" ${item.unlock.mode === "sequential" ? "selected" : ""}>Progresivo (anterior completada)</option>
        <option value="date" ${item.unlock.mode === "date" ? "selected" : ""}>Programado por fecha</option>
        <option value="manual" ${item.unlock.mode === "manual" ? "selected" : ""}>Manual (solo admin)</option>
        <option value="open" ${item.unlock.mode === "open" ? "selected" : ""}>Siempre abierto</option>
      </select></label>
    <label class="editor-field" id="uDateWrap" style="${item.unlock.mode === "date" ? "" : "display:none"}"><span class="editor-label">Fecha desbloqueo</span>
      <input class="editor-input" id="uDate" type="datetime-local" value="${item.unlock.date || ""}" /></label>`;

  els.panels.unlock.querySelector("#uMode").onchange = (e) => {
    item.unlock.mode = e.target.value;
    markDirty();
    renderUnlockPanel();
  };
  els.panels.unlock.querySelector("#uDate")?.addEventListener("change", (e) => {
    item.unlock.date = e.target.value;
    markDirty();
  });
}

function renderSettingsPanel() {
  const s = course.settings;
  els.panels.settings.innerHTML = `
    <div class="builder-settings">
      <label class="builder-check"><input type="checkbox" id="sSeq" ${s.sequentialUnlock ? "checked" : ""} /> Desbloqueo progresivo por módulos</label>
      <label class="builder-check"><input type="checkbox" id="sDrip" ${s.dripContent ? "checked" : ""} /> Contenido programado (drip)</label>
      <label class="builder-check"><input type="checkbox" id="sCert" ${s.certificateEnabled ? "checked" : ""} /> Certificado automático al completar</label>
      <label class="builder-check"><input type="checkbox" id="sComments" ${s.commentsEnabled ? "checked" : ""} /> Comentarios en lecciones</label>
    </div>`;
  [["sSeq", "sequentialUnlock"], ["sDrip", "dripContent"], ["sCert", "certificateEnabled"], ["sComments", "commentsEnabled"]].forEach(([id, key]) => {
    els.panels.settings.querySelector(`#${id}`).onchange = (e) => {
      course.settings[key] = e.target.checked;
      markDirty();
    };
  });
}

function uploadFile(e, cb, { maxMb = 3, kind = "image" } = {}) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (kind === "video" && !file.type.startsWith("video/")) {
    alert("Selecciona un archivo de vídeo válido (MP4, WebM…).");
    return;
  }
  if (kind === "image" && !file.type.startsWith("image/")) {
    alert("Selecciona una imagen válida.");
    return;
  }
  if (file.size > maxMb * 1024 * 1024) {
    alert(`Archivo demasiado grande (máx. ${maxMb} MB en almacenamiento local).`);
    return;
  }
  const reader = new FileReader();
  reader.onload = () => cb(reader.result);
  reader.readAsDataURL(file);
  e.target.value = "";
}

function renderPreview() {
  if (selection.type === "item") {
    const item = getItemRef();
    if (!item) { els.livePreview.innerHTML = ""; return; }
    if (item.kind === "lesson") els.livePreview.innerHTML = renderLessonPreview(item);
    else if (item.kind === "activity") els.livePreview.innerHTML = renderActivityPreview(item);
    else els.livePreview.innerHTML = renderExamPreview(item);
  } else {
    els.livePreview.innerHTML = renderCoursePreview(course);
  }
}

function renderPanels() {
  updateTabsVisibility();
  if (selection.type === "course") {
    renderInfoPanel();
    renderDescPanel();
    renderSettingsPanel();
  } else if (selection.type === "item") {
    renderContentPanel();
    renderTaskPanel();
    renderQuizPanel();
    renderUnlockPanel();
  }
}

function renderAll() {
  renderTree();
  renderPanels();
  renderPreview();
  updateChrome();
}

els.tabs.forEach((tab) => {
  tab.onclick = () => setTab(tab.dataset.tab);
});

document.getElementById("addModuleBtn").onclick = () => {
  course.structure.push(emptyMod(`Módulo ${course.structure.length + 1}`));
  markDirty();
  renderAll();
};

document.getElementById("saveBtn").onclick = persist;
document.getElementById("publishBtn").onclick = () => {
  course.status = course.status === "published" ? "draft" : "published";
  persist();
  renderAll();
};
document.getElementById("dupCourseBtn").onclick = () => {
  const copy = duplicateCourse(course.id);
  if (copy) location.href = `/admin/curso-editor?id=${copy.id}`;
};
document.getElementById("previewModeBtn").onclick = () => {
  document.getElementById("previewAside").scrollIntoView({ behavior: "smooth" });
};

window.addEventListener("beforeunload", (e) => {
  if (dirty) e.preventDefault();
});

renderAll();
bindThemeToggle();
