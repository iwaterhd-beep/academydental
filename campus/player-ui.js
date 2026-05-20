/** Premium player UI — Vallodental Academy */
import { escapeHtml } from "../admin/editor/preview.js";

const STUDY_KEY = (sid) => `vallodental_study_${sid}`;
const FAV_KEY = (sid, cid) => `vallodental_fav_${sid}_${cid}`;
const REACT_KEY = (sid, cid) => `vallodental_react_${sid}_${cid}`;
const LAST_KEY = (sid, cid) => `vallodental_last_${sid}_${cid}`;

export function saveLastLesson(studentId, courseId, path) {
  try {
    localStorage.setItem(LAST_KEY(studentId, courseId), path);
  } catch {
    /* ignore */
  }
}

export function loadLastLesson(studentId, courseId) {
  try {
    return localStorage.getItem(LAST_KEY(studentId, courseId)) || null;
  } catch {
    return null;
  }
}

export function trackStudySession(studentId, minutes = 1) {
  try {
    const key = STUDY_KEY(studentId);
    const today = new Date().toISOString().slice(0, 10);
    const raw = JSON.parse(localStorage.getItem(key) || "{}");
    const last = raw.lastDate;
    let streak = raw.streak || 0;
    if (last !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      streak = last === yesterday ? streak + 1 : 1;
    }
    localStorage.setItem(
      key,
      JSON.stringify({
        lastDate: today,
        streak,
        totalMinutes: (raw.totalMinutes || 0) + minutes,
        visits: (raw.visits || 0) + 1,
      })
    );
  } catch {
    /* ignore */
  }
}

export function getStudyStats(studentId) {
  try {
    return JSON.parse(localStorage.getItem(STUDY_KEY(studentId)) || "{}");
  } catch {
    return {};
  }
}

function loadFavorites(studentId, courseId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAV_KEY(studentId, courseId)) || "[]"));
  } catch {
    return new Set();
  }
}

export function toggleFavorite(studentId, courseId, resourceId) {
  const favs = loadFavorites(studentId, courseId);
  if (favs.has(resourceId)) favs.delete(resourceId);
  else favs.add(resourceId);
  localStorage.setItem(FAV_KEY(studentId, courseId), JSON.stringify([...favs]));
  return favs.has(resourceId);
}

function loadReactions(studentId, courseId) {
  try {
    return JSON.parse(localStorage.getItem(REACT_KEY(studentId, courseId)) || "{}");
  } catch {
    return {};
  }
}

export function setReaction(studentId, courseId, path, emoji) {
  const all = loadReactions(studentId, courseId);
  all[path] = emoji;
  localStorage.setItem(REACT_KEY(studentId, courseId), JSON.stringify(all));
}

export function getCourseAnalytics({
  course,
  curriculum,
  studentId,
  isItemCompleted,
  getSubmission,
}) {
  let totalMin = 0;
  let doneMin = 0;
  let completed = 0;
  let examsDone = 0;
  let examsPassed = 0;

  curriculum.forEach((row) => {
    const dur = row.item.durationMin || row.item.timeLimitMin || 8;
    totalMin += dur;
    const sub = getSubmission(studentId, row.path);
    const done = isItemCompleted(studentId, row.path) || sub?.status === "graded";
    if (done) {
      doneMin += dur;
      completed += 1;
    }
    if (row.item.kind === "exam" && sub) {
      examsDone += 1;
      if (sub.status === "graded") examsPassed += 1;
    }
  });

  const total = curriculum.length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const remainingMin = Math.max(0, totalMin - doneMin);
  const study = getStudyStats(studentId);

  return {
    total,
    completed,
    percent,
    totalMin,
    doneMin,
    remainingMin,
    remainingHours: (remainingMin / 60).toFixed(1),
    streak: study.streak || 0,
    studyHours: ((study.totalMinutes || 0) / 60).toFixed(1),
    examsDone,
    examsPassed,
    level: course.level || "Intermedio",
  };
}

export function progressRing(percent, { size = 88, stroke = 6, color = "#c9a96e", label = "" } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, percent)) / 100) * c;
  return `
    <div class="pp-ring" style="--ring-size:${size}px" aria-label="${percent}%">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="${stroke}"/>
        <circle class="pp-ring-fill" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
          stroke-dasharray="${c}" stroke-dashoffset="${offset}" stroke-linecap="round"
          transform="rotate(-90 ${size / 2} ${size / 2})"/>
      </svg>
      <div class="pp-ring-label">${label || `${percent}%`}</div>
    </div>`;
}

export function dualScoreRings(scorePct, passPct) {
  return `
    <div class="pp-dual-rings">
      ${progressRing(scorePct, { size: 140, stroke: 8, color: scorePct >= passPct ? "#c9a96e" : "#d4847a", label: `${scorePct}%` })}
      <div class="pp-dual-meta">
        <div class="pp-dual-row"><span>Tu puntuación</span><strong>${scorePct}%</strong></div>
        <div class="pp-dual-row"><span>Mínimo requerido</span><strong>${passPct}%</strong></div>
        <div class="pp-dual-gap">
          <div class="pp-dual-gap-fill" style="width:${Math.min(100, (scorePct / passPct) * 100)}%"></div>
        </div>
      </div>
    </div>`;
}

function itemKindMeta(kind) {
  if (kind === "lesson") return { icon: "▶", label: "Lección", cls: "lesson" };
  if (kind === "activity") return { icon: "✦", label: "Tarea", cls: "task" };
  return { icon: "◈", label: "Examen", cls: "exam" };
}

function rowState(row, studentId, isItemCompleted, getSubmission, isUnlocked) {
  const sub = getSubmission(studentId, row.path);
  if (!isUnlocked) return "locked";
  if (sub?.status === "failed") return "failed";
  if (sub?.status === "pending_review") return "pending";
  if (isItemCompleted(studentId, row.path) || sub?.status === "graded") return "done";
  return "open";
}

export function renderSidebarPremium({
  course,
  groups,
  analytics,
  activePath,
  collapsedMods,
  studentId,
  isItemCompleted,
  getSubmission,
  isCurriculumItemUnlocked,
}) {
  const cover = course.coverImage || course.thumbnail || course.bannerImage || "";
  const modHtml = groups
    .map((g) => {
      const collapsed = collapsedMods.has(g.id);
      const done = g.rows.filter((r) => {
        const sub = getSubmission(studentId, r.path);
        return isItemCompleted(studentId, r.path) || sub?.status === "graded";
      }).length;
      const modPct = g.rows.length ? Math.round((done / g.rows.length) * 100) : 0;
      const modMin = g.rows.reduce((s, r) => s + (r.item.durationMin || r.item.timeLimitMin || 8), 0);
      const hasActive = g.rows.some((r) => r.path === activePath);

      return `
      <div class="pp-mod ${collapsed ? "is-collapsed" : ""} ${hasActive ? "has-active" : ""}" data-mod-id="${g.id}">
        <button type="button" class="pp-mod-head" data-mod-toggle="${g.id}">
          <div class="pp-mod-head-top">
            <span class="pp-mod-num">${g.id === "general" ? "◆" : "◈"}</span>
            <span class="pp-mod-title">${escapeHtml(g.title)}</span>
          </div>
          <div class="pp-mod-meta">
            <span>${g.rows.length} lecciones</span>
            <span>${modMin} min</span>
            <span>${analytics.level}</span>
          </div>
          <div class="pp-mod-progress">
            <div class="pp-mod-progress-fill" style="width:${modPct}%"></div>
          </div>
          <div class="pp-mod-foot"><span>${modPct}% completado</span><span>${done}/${g.rows.length}</span></div>
        </button>
        <div class="pp-mod-items">
        ${g.rows
          .map((row) => {
            const unlocked = isCurriculumItemUnlocked(course, row, studentId);
            const state = rowState(row, studentId, isItemCompleted, getSubmission, unlocked);
            const meta = itemKindMeta(row.item.kind);
            const dur = row.item.durationMin || row.item.timeLimitMin;
            const active = row.path === activePath;
            return `
          <button type="button" class="pp-item pp-item--${state} pp-item--${meta.cls} ${active ? "is-active" : ""}"
            data-path="${row.path}" ${unlocked ? "" : "disabled"}>
            <span class="pp-item-indicator"></span>
            <span class="pp-item-icon">${meta.icon}</span>
            <span class="pp-item-body">
              <span class="pp-item-label">${escapeHtml(row.item.title)}</span>
              <span class="pp-item-sub">${meta.label}${dur ? ` · ${dur} min` : ""}</span>
            </span>
            <span class="pp-item-state">${state === "done" ? "✓" : state === "pending" ? "◷" : state === "failed" ? "✗" : state === "locked" ? "🔒" : ""}</span>
          </button>`;
          })
          .join("")}
        </div>
      </div>`;
    })
    .join("");

  return `
    <div class="pp-sidebar-hero">
      <div class="pp-cover-wrap">
        ${cover ? `<img src="${escapeHtml(cover)}" alt="" class="pp-cover" />` : `<div class="pp-cover pp-cover--placeholder"></div>`}
        <div class="pp-cover-glow"></div>
      </div>
      <p class="pp-sidebar-kicker">${escapeHtml(course.category)} · ${escapeHtml(analytics.level)}</p>
      <h2 class="pp-sidebar-title">${escapeHtml(course.title)}</h2>
      <p class="pp-sidebar-instructor">${escapeHtml(course.instructor)}</p>
    </div>

    <div class="pp-stats-grid">
      ${progressRing(analytics.percent, { size: 72, stroke: 5, label: `${analytics.percent}%` })}
      <div class="pp-stats-cols">
        <div class="pp-stat"><span class="pp-stat-val">${analytics.remainingHours}h</span><span class="pp-stat-lbl">Restante</span></div>
        <div class="pp-stat"><span class="pp-stat-val">${analytics.streak || 0}</span><span class="pp-stat-lbl">Racha</span></div>
        <div class="pp-stat"><span class="pp-stat-val">${analytics.studyHours}h</span><span class="pp-stat-lbl">Estudiado</span></div>
        <div class="pp-stat"><span class="pp-stat-val">${analytics.completed}/${analytics.total}</span><span class="pp-stat-lbl">Lecciones</span></div>
      </div>
    </div>

    <div class="pp-sidebar-nav-label">Temario</div>
    ${modHtml}`;
}

export function renderTopbarPremium({ course, row, analytics, studentName }) {
  const item = row?.item;
  const moduleTitle = row?.moduleTitle || row?.topicTitle || "Curso";
  return {
    breadcrumb: `
      <nav class="pp-crumb" aria-label="Ruta">
        <a href="/campus/" class="pp-crumb-link">Campus</a>
        <span class="pp-crumb-sep">/</span>
        <span class="pp-crumb-link">${escapeHtml(course.category)}</span>
        <span class="pp-crumb-sep">/</span>
        <span class="pp-crumb-mod">${escapeHtml(moduleTitle)}</span>
        <span class="pp-crumb-lesson">${escapeHtml(item?.title || "Selecciona una lección")}</span>
      </nav>`,
    progress: `
      <div class="pp-top-progress">
        ${progressRing(analytics.percent, { size: 36, stroke: 3, label: "" })}
        <span class="pp-top-pct">${analytics.percent}%</span>
      </div>`,
    user: `<span class="pp-top-user">${escapeHtml(studentName)}</span>`,
  };
}

export function renderLessonHero({ course, row, item, analytics, kindLabel, prevRow, nextRow }) {
  const moduleTitle = row.moduleTitle || row.topicTitle || course.title;
  const dur = item.durationMin || item.timeLimitMin;
  const idx = analytics.curriculumIndex ?? 0;
  const total = analytics.total;
  return `
    <header class="pp-lesson-hero">
      <div class="pp-lesson-hero-glow"></div>
      <div class="pp-lesson-hero-inner">
        <nav class="pp-lesson-crumb">
          <span>${escapeHtml(course.category)}</span>
          <span>·</span>
          <span>${escapeHtml(moduleTitle)}</span>
        </nav>
        <h1 class="pp-lesson-title">${escapeHtml(item.title)}</h1>
        <div class="pp-lesson-chips">
          <span class="pp-chip">${escapeHtml(kindLabel(item))}</span>
          ${dur ? `<span class="pp-chip">⏱ ${dur} min</span>` : ""}
          <span class="pp-chip">${escapeHtml(course.instructor)}</span>
          <span class="pp-chip pp-chip--gold">Lección ${idx + 1} de ${total}</span>
        </div>
        <div class="pp-lesson-progress-line">
          <div class="pp-lesson-progress-fill" style="width:${analytics.percent}%"></div>
        </div>
        ${renderLessonNav(prevRow, nextRow)}
      </div>
    </header>`;
}

export function renderLessonNav(prevRow, nextRow) {
  if (!prevRow && !nextRow) return "";
  return `
    <nav class="pp-lesson-nav" aria-label="Navegación de lecciones">
      <button type="button" class="pp-lesson-nav-btn" id="prevLessonBtn" ${prevRow ? `data-path="${prevRow.path}"` : "disabled"}>
        <span class="pp-lesson-nav-dir">← Anterior</span>
        <span class="pp-lesson-nav-title">${prevRow ? escapeHtml(prevRow.item.title) : "—"}</span>
      </button>
      <button type="button" class="pp-lesson-nav-btn pp-lesson-nav-btn--next" id="nextLessonBtn" ${nextRow ? `data-path="${nextRow.path}"` : "disabled"}>
        <span class="pp-lesson-nav-dir">Siguiente →</span>
        <span class="pp-lesson-nav-title">${nextRow ? escapeHtml(nextRow.item.title) : "—"}</span>
      </button>
    </nav>`;
}

export function renderContinueBar(nextRow, isDone) {
  if (!nextRow) return "";
  return `
    <div class="pp-continue-bar" id="continueBar">
      <div class="pp-continue-inner">
        <div class="pp-continue-text">
          <span class="pp-continue-label">${isDone ? "✓ Completado · Siguiente" : "Continúa aprendiendo"}</span>
          <span class="pp-continue-title">${escapeHtml(nextRow.item.title)}</span>
        </div>
        <button type="button" class="campus-btn campus-btn--gold" id="continueBarBtn" data-path="${nextRow.path}">Continuar →</button>
      </div>
    </div>`;
}

export function bindLessonNav(container, { onNavigate }) {
  container?.querySelector("#prevLessonBtn")?.addEventListener("click", (e) => {
    const path = e.currentTarget.dataset.path;
    if (path) onNavigate(path);
  });
  container?.querySelector("#nextLessonBtn")?.addEventListener("click", (e) => {
    const path = e.currentTarget.dataset.path;
    if (path) onNavigate(path);
  });
  container?.querySelector("#continueBarBtn")?.addEventListener("click", (e) => {
    const path = e.currentTarget.dataset.path;
    if (path) onNavigate(path);
  });
}

export function renderInteractionBar({ path, studentId, courseId }) {
  const reactions = loadReactions(studentId, courseId);
  const current = reactions[path] || "";
  const emojis = ["👍", "🔥", "💡", "❤️", "🎯"];
  return `
    <div class="pp-interact" data-path="${escapeHtml(path)}">
      <div class="pp-interact-reactions">
        ${emojis
          .map(
            (e) =>
              `<button type="button" class="pp-react-btn ${current === e ? "is-active" : ""}" data-emoji="${e}" title="Reaccionar">${e}</button>`
          )
          .join("")}
      </div>
      <div class="pp-interact-actions">
        <button type="button" class="pp-interact-btn" id="bookmarkBtn" title="Marcar lección">☆ Favorito</button>
        <button type="button" class="pp-interact-btn" id="shareProgressBtn" title="Compartir progreso">↗ Progreso</button>
        <button type="button" class="pp-interact-btn" id="askTeacherBtn" title="Pregunta al profesor">💬 Profesor</button>
      </div>
    </div>`;
}

export function bindInteractionBar(container, { path, studentId, courseId, analytics, showDialog }) {
  container?.querySelectorAll(".pp-react-btn").forEach((btn) => {
    btn.onclick = () => {
      container.querySelectorAll(".pp-react-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      setReaction(studentId, courseId, path, btn.dataset.emoji);
    };
  });
  container?.querySelector("#bookmarkBtn")?.addEventListener("click", () => {
    toggleFavorite(studentId, courseId, `lesson:${path}`);
    showDialog?.({ type: "success", title: "Guardado", message: "Lección añadida a tus favoritos.", buttonLabel: "Ok" });
  });
  container?.querySelector("#shareProgressBtn")?.addEventListener("click", () => {
    const text = `Llevo ${analytics.percent}% del curso en Vallodental Academy · ${analytics.streak} días de racha 🔥`;
    navigator.clipboard?.writeText(text).catch(() => {});
    showDialog?.({ type: "success", title: "Progreso copiado", message: "Texto listo para compartir en el portapapeles.", buttonLabel: "Ok" });
  });
  container?.querySelector("#askTeacherBtn")?.addEventListener("click", () => {
    showDialog?.({
      type: "pending",
      title: "Consulta al profesor",
      message: "Próximamente podrás enviar dudas directas. Mientras tanto, usa las notas laterales para registrar tus preguntas.",
      buttonLabel: "Entendido",
    });
  });
}

export function renderVideoPremium(url, { escapeAttr = escapeHtml } = {}) {
  const isNative = url && !/youtube|youtu\.be|vimeo/.test(url);
  const isYt = /youtube|youtu\.be/.test(url);
  let embed = "";
  if (isYt) {
    const id = url.match(/(?:v=|\/)([\w-]{11})/)?.[1];
    embed = id ? `<iframe src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>` : "";
  } else if (/vimeo/.test(url)) {
    const id = url.split("/").pop();
    embed = `<iframe src="https://player.vimeo.com/video/${id}" allowfullscreen></iframe>`;
  } else {
    embed = `<video id="lessonVideo" src="${escapeAttr(url)}" playsinline></video>`;
  }

  return `
    <div class="pp-video" id="videoShell">
      <div class="pp-video-frame">
        ${embed}
        <div class="pp-video-overlay" id="videoOverlay">
          <button type="button" class="pp-video-play" id="videoPlayBtn" aria-label="Reproducir">▶</button>
        </div>
      </div>
      <div class="pp-video-bar">
        <button type="button" class="pp-vbtn" id="cinemaBtn"><span>⛶</span> Cine</button>
        ${
          isNative
            ? `<label class="pp-vbtn pp-vbtn--select">Velocidad
            <select id="speedSelect"><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label>`
            : `<span class="pp-vbtn pp-vbtn--muted">Streaming externo</span>`
        }
        <button type="button" class="pp-vbtn" id="autoplayNextBtn">Autoplay</button>
        <button type="button" class="pp-vbtn" id="quickNoteBtn">+ Nota rápida</button>
        ${isNative ? `<button type="button" class="pp-vbtn" id="markVideoBtn">Marcador</button>` : ""}
      </div>
    </div>`;
}

export function renderToolsPanelPremium({
  row,
  item,
  resources,
  studentId,
  courseId,
  loadNotes,
  studyTips,
}) {
  const favs = loadFavorites(studentId, courseId);
  const resourceCards =
    resources.length === 0
      ? `<p class="pp-empty">No hay recursos descargables en esta lección.</p>`
      : `<div class="pp-resource-grid">${resources
          .map((r, i) => {
            const rid = `${row.path}:${i}`;
            const isFav = favs.has(rid);
            return `
            <article class="pp-resource-card">
              <div class="pp-resource-thumb">${r.icon}</div>
              <div class="pp-resource-body">
                <h4>${escapeHtml(r.label)}</h4>
                <p>${escapeHtml(r.typeLabel || "Archivo")}${r.size ? ` · ${r.size}` : ""}</p>
              </div>
              <div class="pp-resource-actions">
                <button type="button" class="pp-resource-fav ${isFav ? "is-active" : ""}" data-fav="${rid}" title="Favorito">★</button>
                <a href="${escapeHtml(r.url)}" class="pp-resource-dl" target="_blank" rel="noopener" download>↓</a>
              </div>
            </article>`;
          })
          .join("")}</div>`;

  return `
    <div class="pp-tools-head">
      <span class="pp-tools-title">Estudio</span>
      <button type="button" class="pp-tools-close" id="toolsCloseBtn" aria-label="Cerrar panel">×</button>
    </div>
    <div class="pp-tools-tabs">
      <button type="button" class="pp-tools-tab is-active" data-tab="notes">Notas</button>
      <button type="button" class="pp-tools-tab" data-tab="resources">Recursos</button>
      <button type="button" class="pp-tools-tab" data-tab="insights">IA</button>
    </div>
    <div class="pp-tools-body">
      <div class="pp-tools-pane is-active" data-pane="notes">
        <div class="pp-notes-toolbar" id="notesToolbar">
          <button type="button" data-cmd="bold" title="Negrita"><b>B</b></button>
          <button type="button" data-cmd="heading" title="Título">H</button>
          <button type="button" data-cmd="list" title="Lista">≡</button>
          <button type="button" data-cmd="quote" title="Cita">"</button>
          <span class="pp-notes-sep"></span>
          <button type="button" data-emoji="💡" title="Idea">💡</button>
          <button type="button" data-emoji="⚠️" title="Importante">⚠️</button>
          <button type="button" data-emoji="✓" title="Hecho">✓</button>
        </div>
        <div class="pp-notes-editor" id="lessonNotes" contenteditable="true" data-placeholder="Escribe como en Notion — títulos, listas, ideas clínicas…">${loadNotes(row.path)}</div>
        <p class="pp-notes-footer"><span id="notesStatus">Guardado</span> · Solo en tu dispositivo</p>
      </div>
      <div class="pp-tools-pane" data-pane="resources">${resourceCards}</div>
      <div class="pp-tools-pane" data-pane="insights">
        <div class="pp-insights">
          ${studyTips.map((t) => `<div class="pp-insight-card"><span class="pp-insight-icon">${t.icon}</span><div><strong>${escapeHtml(t.title)}</strong><p>${escapeHtml(t.text)}</p></div></div>`).join("")}
        </div>
      </div>
    </div>`;
}

export function bindToolsPanel(toolsEl, { row, studentId, courseId, saveNotes, onClose }) {
  toolsEl.querySelectorAll(".pp-tools-tab").forEach((tab) => {
    tab.onclick = () => {
      toolsEl.querySelectorAll(".pp-tools-tab").forEach((t) => t.classList.remove("is-active"));
      toolsEl.querySelectorAll(".pp-tools-pane").forEach((p) => p.classList.remove("is-active"));
      tab.classList.add("is-active");
      toolsEl.querySelector(`[data-pane="${tab.dataset.tab}"]`)?.classList.add("is-active");
    };
  });

  toolsEl.querySelector("#toolsCloseBtn")?.addEventListener("click", onClose);
  toolsEl.querySelectorAll(".pp-resource-fav").forEach((btn) => {
    btn.onclick = () => {
      const on = toggleFavorite(studentId, courseId, btn.dataset.fav);
      btn.classList.toggle("is-active", on);
    };
  });

  const editor = toolsEl.querySelector("#lessonNotes");
  const status = toolsEl.querySelector("#notesStatus");
  let saveTimer;

  const persist = () => {
    saveNotes(row.path, editor.innerHTML);
    if (status) {
      status.textContent = "Guardando…";
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        status.textContent = "Guardado";
      }, 600);
    }
  };

  editor?.addEventListener("input", persist);

  toolsEl.querySelector("#notesToolbar")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn || !editor) return;
    editor.focus();
    if (btn.dataset.emoji) {
      document.execCommand("insertText", false, btn.dataset.emoji + " ");
      persist();
      return;
    }
    const cmd = btn.dataset.cmd;
    if (cmd === "bold") document.execCommand("bold");
    if (cmd === "heading") document.execCommand("formatBlock", false, "h3");
    if (cmd === "list") document.execCommand("insertUnorderedList");
    if (cmd === "quote") document.execCommand("formatBlock", false, "blockquote");
    persist();
  });
}

export function getStudyTips(analytics, item, course) {
  const tips = [];
  if (analytics.percent < 30) {
    tips.push({ icon: "🎯", title: "Enfoque inicial", text: "Completa las lecciones abiertas antes de saltar módulos avanzados." });
  } else if (analytics.percent > 70) {
    tips.push({ icon: "🏆", title: "Recta final", text: "Estás cerca del certificado. Repasa los casos clínicos antes del examen." });
  } else {
    tips.push({ icon: "📈", title: "Ritmo ideal", text: `Mantén ${Math.ceil(analytics.remainingMin / 7)} min/día para terminar en una semana.` });
  }
  if (item?.kind === "lesson" && item.durationMin > 15) {
    tips.push({ icon: "⏸", title: "Pausa activa", text: "Divide esta lección en dos sesiones y anota protocolos clave." });
  }
  tips.push({ icon: "🦷", title: "Vallodental", text: `Prioriza la práctica en ${course.category?.toLowerCase() || "laboratorio"} con casos reales.` });
  return tips.slice(0, 3);
}

export function getExamWrongAnswers(exam, answers) {
  return (exam.questions || [])
    .filter((q) => q.type !== "text")
    .map((q) => {
      const ans = answers[q.id];
      let ok = false;
      if (q.type === "multi") {
        const correct = (Array.isArray(q.correct) ? q.correct : [q.correct]).map(Number).sort();
        const picked = (Array.isArray(ans?.selected) ? ans.selected : []).map(Number).sort();
        ok = correct.length === picked.length && correct.every((v, i) => v === picked[i]);
      } else {
        ok = Number(ans?.selected) === Number(q.correct);
      }
      if (ok) return null;
      const userAns =
        q.type === "multi"
          ? (ans?.selected || []).map((i) => q.options?.[i]).filter(Boolean).join(", ")
          : q.options?.[ans?.selected] || "—";
      const correctAns =
        q.type === "multi"
          ? (Array.isArray(q.correct) ? q.correct : [q.correct]).map((i) => q.options?.[i]).filter(Boolean).join(", ")
          : q.options?.[q.correct];
      return { question: q.text, userAns, correctAns };
    })
    .filter(Boolean);
}

export function getExamRecommendations(exam, wrongCount, passScore, scorePct) {
  const tips = [];
  if (scorePct < passScore * 0.6) {
    tips.push("Repasa el Módulo 1 antes de reintentar — los fundamentos son clave.");
  }
  if (wrongCount > 0) {
    tips.push(`Revisa ${wrongCount} pregunta${wrongCount > 1 ? "s" : ""} incorrecta${wrongCount > 1 ? "s" : ""} abajo.`);
  }
  tips.push("Usa las notas del curso para registrar protocolos antes del siguiente intento.");
  if (exam.shuffleQuestions) tips.push("Cada intento presenta preguntas en orden diferente.");
  return tips;
}

export function renderExamResultPremium({
  item,
  sub,
  type,
  passScore,
  maxAttempts,
  attemptsLeft,
  wrongAnswers,
  recommendations,
  showReview,
  hasNext = true,
  feedback = "",
}) {
  const pct = sub.autoMax ? Math.round((sub.autoScore / sub.autoMax) * 100) : 0;
  const wrongCount = wrongAnswers.length;
  const canRetry = attemptsLeft > 0 && type === "fail";

  const reviewHtml =
    wrongCount && showReview
      ? `<div class="pp-exam-review" id="examReviewPanel">
          <h4>Revisión de errores</h4>
          ${wrongAnswers
            .map(
              (w) =>
                `<div class="pp-exam-review-item">
                  <p class="pp-exam-review-q">${escapeHtml(w.question)}</p>
                  <p class="pp-exam-review-wrong">Tu respuesta: ${escapeHtml(w.userAns)}</p>
                  <p class="pp-exam-review-ok">Correcta: ${escapeHtml(w.correctAns)}</p>
                </div>`
            )
            .join("")}
        </div>`
      : "";

  const tipsHtml = recommendations
    .map((t) => `<li>${escapeHtml(t)}</li>`)
    .join("");

  return `
    <div class="pp-exam-result pp-exam-result--${type}">
      <div class="pp-exam-result-card">
        ${dualScoreRings(pct, passScore)}
        <div class="pp-exam-result-body">
          <p class="pp-exam-result-kicker">${type === "pass" ? "Examen aprobado" : type === "pending" ? "Enviado a corrección" : "Examen no aprobado"}</p>
          <h2>${escapeHtml(item.title)}</h2>
          <div class="pp-exam-stats-row">
            <div class="pp-exam-stat"><span>${wrongCount}</span><label>Errores</label></div>
            <div class="pp-exam-stat"><span>${sub.attemptCount || 1}</span><label>Intento</label></div>
            <div class="pp-exam-stat"><span>${attemptsLeft}</span><label>Restantes</label></div>
            <div class="pp-exam-stat"><span>${item.timeLimitMin || "—"}m</span><label>Límite</label></div>
          </div>
          ${
            type === "fail"
              ? `<div class="pp-exam-ai">
                  <span class="pp-exam-ai-label">✦ Recomendaciones inteligentes</span>
                  <ul>${tipsHtml}</ul>
                </div>`
              : ""
          }
          <div class="pp-exam-actions">
            ${canRetry ? `<button type="button" class="campus-btn campus-btn--gold" id="examRetryBtn">Repetir examen</button>` : ""}
            ${wrongCount && type === "fail" ? `<button type="button" class="campus-btn campus-btn--ghost" id="examReviewBtn">${showReview ? "Ocultar errores" : "Revisar errores"}</button>` : ""}
            ${(type === "pass" || type === "pending") && hasNext ? `<button type="button" class="campus-btn campus-btn--gold" id="examNextBtn">Continuar curso →</button>` : ""}
            ${!canRetry && type === "fail" ? `<a href="/campus/" class="campus-btn campus-btn--ghost">Volver al campus</a>` : ""}
          </div>
          ${feedback ? `<p class="campus-feedback" style="margin-top:20px;text-align:left">${escapeHtml(feedback)}</p>` : ""}
        </div>
      </div>
      ${reviewHtml}
    </div>`;
}
