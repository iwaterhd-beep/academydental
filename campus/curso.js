import { requireStudent, logoutStudent, getStudentSessionId } from "../js/auth.js";
import {
  getStudent,
  getCourse,
  getStudentCourses,
  getCourseCurriculum,
  isItemCompleted,
  isCurriculumItemUnlocked,
  markItemComplete,
  getStudentCourseProgress,
  ACTIVITY_TYPES,
  getSubmission,
  submitAssignment,
  submitExam,
  scoreExamAnswers,
  hasSeenCourseWelcome,
  markCourseWelcomeSeen,
  canDownloadLessonResources,
} from "../js/data.js";
import { renderBlocksPreview, escapeHtml } from "../admin/editor/preview.js";
import { showCampusDialog } from "./modal.js";
import {
  buildAcceptString,
  allowedTypesLabel,
  formatFileSize,
  filesToSubmissionEntries,
  renderSubmissionFilesHtml,
  SUBMISSION_MAX_FILES,
  SUBMISSION_MAX_FILE_MB,
  fileKind,
} from "../js/submission-files.js";
import {
  trackStudySession,
  getCourseAnalytics,
  renderSidebarPremium,
  renderTopbarPremium,
  renderLessonHero,
  renderInteractionBar,
  bindInteractionBar,
  renderVideoPremium,
  renderToolsPanelPremium,
  bindToolsPanel,
  getStudyTips,
  getExamWrongAnswers,
  getExamRecommendations,
  renderExamResultPremium,
  saveLastLesson,
  loadLastLesson,
  renderContinueBar,
  bindLessonNav,
} from "./player-ui.js";
import { bindThemeToggle } from "../js/theme.js";

const studentId = requireStudent();
if (!studentId) throw new Error("unauthorized");

const params = new URLSearchParams(location.search);
const courseId = params.get("id");
const course = getCourse(courseId);
const enrolled = getStudentCourses(studentId).some((c) => c.id === courseId);

if (!course || !enrolled || course.status !== "published") {
  location.href = "/campus/";
  throw new Error("no access");
}

const student = getStudent(studentId);
document.getElementById("logoutBtn").onclick = logoutStudent;
document.getElementById("sidebarToggle")?.addEventListener("click", () => {
  document.body.classList.toggle("player-sidebar-open");
});
document.getElementById("playerOverlay")?.addEventListener("click", () => {
  document.body.classList.remove("player-sidebar-open");
});

const curriculum = getCourseCurriculum(course);
const urlItem = params.get("item");
let activePath = urlItem || resolveInitialPath();
const collapsedMods = new Set();
const examReviewOpen = new Set();

function resolveInitialPath() {
  const last = loadLastLesson(studentId, courseId);
  if (last) {
    const row = curriculum.find((r) => r.path === last);
    if (row && isCurriculumItemUnlocked(course, row, studentId)) return last;
  }
  return findFirstUnlockedPath();
}

function getPrevRow() {
  const idx = curriculum.findIndex((r) => r.path === activePath);
  if (idx <= 0) return null;
  return curriculum[idx - 1];
}

function getNextRow() {
  const idx = curriculum.findIndex((r) => r.path === activePath);
  if (idx < 0 || idx >= curriculum.length - 1) return null;
  return curriculum[idx + 1];
}

function goToPath(path) {
  if (!path || path === activePath) return;
  activePath = path;
  saveLastLesson(studentId, courseId, path);
  history.replaceState({}, "", `?id=${courseId}&item=${encodeURIComponent(path)}`);
  document.body.classList.remove("player-sidebar-open");
  window.scrollTo({ top: 0, behavior: "smooth" });
  renderAll();
}

trackStudySession(studentId, 2);

document.getElementById("toolsToggle")?.addEventListener("click", () => {
  const tools = document.getElementById("playerTools");
  if (tools.hidden) showPlayerToolsPanel();
  else hidePlayerTools();
});

document.addEventListener("keydown", (e) => {
  if (e.target.closest("input, textarea, select, [contenteditable='true']")) return;
  const next = getNextRow();
  const prev = getPrevRow();
  if ((e.key === "ArrowRight" || e.key === "n") && next && isCurriculumItemUnlocked(course, next, studentId)) {
    e.preventDefault();
    goToPath(next.path);
  }
  if ((e.key === "ArrowLeft" || e.key === "p") && prev && isCurriculumItemUnlocked(course, prev, studentId)) {
    e.preventDefault();
    goToPath(prev.path);
  }
});

function getAnalytics(extra = {}) {
  return {
    ...getCourseAnalytics({
      course,
      curriculum,
      studentId,
      isItemCompleted,
      getSubmission,
    }),
    ...extra,
  };
}

function getCurriculumGroups() {
  const groups = [];
  const courseRows = curriculum.filter((r) => r.scope === "course");
  if (courseRows.length) groups.push({ id: "general", title: "General", rows: courseRows });
  course.structure.forEach((mod) => {
    const rows = curriculum.filter(
      (r) => (r.scope === "module" || r.scope === "topic") && r.moduleId === mod.id
    );
    if (rows.length) groups.push({ id: mod.id, title: mod.title, rows });
  });
  return groups;
}

function notesStorageKey(path) {
  return `vallodental_notes_${studentId}_${courseId}_${path}`;
}

function loadNotes(path) {
  try {
    return localStorage.getItem(notesStorageKey(path)) || "";
  } catch {
    return "";
  }
}

function saveNotes(path, text) {
  try {
    localStorage.setItem(notesStorageKey(path), text);
  } catch {
    /* ignore */
  }
}

function extractResources(blocks = [], item = null) {
  const types = { pdf: "📄", file: "📎", stl: "🦷", audio: "🎧", video: "🎬" };
  const labels = { pdf: "PDF", file: "Documento", stl: "Modelo STL", audio: "Audio", video: "Vídeo" };
  const downloadable = item ? canDownloadLessonResources(course, item) : true;
  const fromBlocks = blocks
    .filter((b) => ["pdf", "file", "stl", "audio", "video"].includes(b.type) && b.url)
    .map((b) => ({
      label: b.label || b.name || b.caption || "Recurso",
      url: b.url,
      icon: types[b.type] || "📎",
      typeLabel: labels[b.type] || "Archivo",
      downloadable,
    }));
  const fromItem = (item?.resources || [])
    .filter((r) => r.url)
    .map((r) => ({
      label: r.name || "Recurso",
      url: r.url,
      icon: "📎",
      typeLabel: "Adjunto",
      downloadable,
    }));
  return [...fromBlocks, ...fromItem];
}

function renderTopbar(row) {
  const analytics = getAnalytics();
  const top = renderTopbarPremium({
    course,
    row,
    analytics,
    studentName: student?.name || "Alumno",
  });
  document.getElementById("playerBreadcrumb").innerHTML = top.breadcrumb;
  document.getElementById("playerProgress").innerHTML = top.progress;
  document.getElementById("playerUser").innerHTML = top.user;
}

function findFirstUnlockedPath() {
  const open = curriculum.find((r) => isCurriculumItemUnlocked(course, r, studentId));
  return open?.path || curriculum[0]?.path;
}

function kindLabel(item) {
  if (item.kind === "lesson") return "Lección";
  if (item.kind === "activity") return ACTIVITY_TYPES[item.activityType] || "Actividad";
  return "Examen";
}

function embedVideo(url, { nativeId } = {}) {
  if (/youtube\.com|youtu\.be/.test(url)) {
    const id = url.match(/(?:v=|\/)([\w-]{11})/)?.[1];
    if (id) return `<iframe src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>`;
  }
  if (/vimeo\.com/.test(url)) {
    const id = url.split("/").pop();
    return `<iframe src="https://player.vimeo.com/video/${id}" allowfullscreen></iframe>`;
  }
  const vid = nativeId || "nativeVideo";
  return `<video id="${vid}" src="${escapeHtml(url)}" controls playsinline></video>`;
}

function hidePlayerTools() {
  const tools = document.getElementById("playerTools");
  tools.hidden = true;
  tools.innerHTML = "";
  document.querySelector(".player-stage")?.classList.add("player-stage--solo");
  document.getElementById("toolsToggle")?.setAttribute("hidden", "");
}

function showPlayerToolsPanel() {
  const tools = document.getElementById("playerTools");
  if (!tools.innerHTML.trim()) return;
  tools.hidden = false;
  document.querySelector(".player-stage")?.classList.remove("player-stage--solo");
}

function renderToolsPanel(row, item) {
  const tools = document.getElementById("playerTools");
  const resources = extractResources(item.blocks || [], item);
  const analytics = getAnalytics();
  tools.innerHTML = renderToolsPanelPremium({
    row,
    item,
    resources,
    studentId,
    courseId,
    loadNotes,
    studyTips: getStudyTips(analytics, item, course),
  });
  bindToolsPanel(tools, {
    row,
    studentId,
    courseId,
    saveNotes,
    onClose: hidePlayerTools,
  });
  if (window.innerWidth > 1200) {
    showPlayerToolsPanel();
    document.getElementById("toolsToggle")?.setAttribute("hidden", "");
  } else {
    tools.hidden = true;
    document.querySelector(".player-stage")?.classList.add("player-stage--solo");
    document.getElementById("toolsToggle")?.removeAttribute("hidden");
  }
}

function bindVideoControls(row, item) {
  const shell = document.getElementById("videoShell");
  const backdrop = document.getElementById("cinemaBackdrop");
  const cinemaBtn = document.getElementById("cinemaBtn");
  const video = document.getElementById("lessonVideo");
  const speedSelect = document.getElementById("speedSelect");
  const overlay = document.getElementById("videoOverlay");
  const playBtn = document.getElementById("videoPlayBtn");
  let autoplayNext = false;

  const exitCinema = () => {
    shell?.classList.remove("is-cinema");
    cinemaBtn?.classList.remove("is-active");
    if (backdrop) backdrop.hidden = true;
    document.body.style.overflow = "";
  };

  cinemaBtn?.addEventListener("click", () => {
    const on = shell?.classList.toggle("is-cinema");
    cinemaBtn?.classList.toggle("is-active", on);
    if (backdrop) backdrop.hidden = !on;
    document.body.style.overflow = on ? "hidden" : "";
  });

  backdrop?.addEventListener("click", exitCinema);

  playBtn?.addEventListener("click", () => {
    if (!video) return;
    if (video.paused) {
      video.play();
      overlay?.classList.remove("is-visible");
    } else {
      video.pause();
      overlay?.classList.add("is-visible");
    }
  });

  video?.addEventListener("play", () => overlay?.classList.remove("is-visible"));
  video?.addEventListener("pause", () => overlay?.classList.add("is-visible"));

  speedSelect?.addEventListener("change", () => {
    if (video) video.playbackRate = Number(speedSelect.value);
  });

  document.getElementById("autoplayNextBtn")?.addEventListener("click", (e) => {
    autoplayNext = !autoplayNext;
    e.currentTarget.classList.toggle("is-active", autoplayNext);
  });

  document.getElementById("quickNoteBtn")?.addEventListener("click", () => {
    showPlayerToolsPanel();
    const tools = document.getElementById("playerTools");
    tools.querySelector('[data-tab="notes"]')?.click();
    document.getElementById("lessonNotes")?.focus();
  });

  document.getElementById("markVideoBtn")?.addEventListener("click", () => {
    if (!video) return;
    const t = Math.floor(video.currentTime);
    const m = Math.floor(t / 60);
    const s = t % 60;
    showPlayerToolsPanel();
    const editor = document.getElementById("lessonNotes");
    if (editor) {
      editor.focus();
      document.execCommand("insertText", false, `⏱ ${m}:${String(s).padStart(2, "0")} — `);
      saveNotes(row.path, editor.innerHTML);
    }
  });

  video?.addEventListener("ended", () => {
    if (item.kind === "lesson" && !isItemCompleted(studentId, row.path)) {
      markItemComplete(studentId, courseId, row.path);
      renderSidebar();
    }
    if (!autoplayNext) return;
    const next = getNextRow();
    if (next) goToPath(next.path);
  });
}

const examQuestionsCache = new Map();
const examRetryPaths = new Set();

function getExamQuestions(item, path) {
  if (!examQuestionsCache.has(path)) {
    const qs = item.shuffleQuestions ? shuffle([...item.questions]) : [...item.questions];
    examQuestionsCache.set(path, qs);
  }
  return examQuestionsCache.get(path);
}

function resetExamAttempt(item, row) {
  examRetryPaths.add(row.path);
  if (item.shuffleQuestions) examQuestionsCache.delete(row.path);
  renderContent();
}

function modProgress(rows) {
  const done = rows.filter((r) => isItemCompleted(studentId, r.path)).length;
  return `${done}/${rows.length}`;
}

function renderSidebar() {
  const groups = getCurriculumGroups();
  groups.forEach((g) => {
    if (g.rows.some((r) => r.path === activePath)) collapsedMods.delete(g.id);
  });
  const analytics = getAnalytics();
  document.getElementById("sidebar").innerHTML = renderSidebarPremium({
    course,
    groups,
    analytics,
    activePath,
    collapsedMods,
    studentId,
    isItemCompleted,
    getSubmission,
    isCurriculumItemUnlocked,
  });

  document.querySelectorAll("[data-mod-toggle]").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.modToggle;
      if (collapsedMods.has(id)) collapsedMods.delete(id);
      else collapsedMods.add(id);
      btn.closest(".pp-mod")?.classList.toggle("is-collapsed");
    };
  });

  document.querySelectorAll("[data-path]").forEach((btn) => {
    btn.onclick = () => {
      if (btn.disabled) return;
      goToPath(btn.dataset.path);
    };
  });
}

function renderContent() {
  const row = curriculum.find((r) => r.path === activePath);
  const el = document.getElementById("content");

  if (!row) {
    renderTopbar(null);
    hidePlayerTools();
    el.innerHTML = `<div class="campus-locked"><p>Selecciona un elemento del temario.</p></div>`;
    return;
  }

  if (!isCurriculumItemUnlocked(course, row, studentId)) {
    renderTopbar(row);
    hidePlayerTools();
    el.innerHTML = `<div class="campus-locked"><div class="campus-locked-icon">🔒</div><h3>Contenido bloqueado</h3><p>Completa el elemento anterior para desbloquearlo.</p></div>`;
    return;
  }

  const item = row.item;
  const isExam = item.kind === "exam";
  renderTopbar(row);
  const done = isItemCompleted(studentId, row.path);
  const idx = curriculum.findIndex((r) => r.path === activePath);
  const analytics = getAnalytics({ curriculumIndex: idx });
  const prevRow = getPrevRow();
  const nextRow = getNextRow();
  const hasAssignment = item.assignment && (item.assignment.questions?.length || item.kind !== "exam");
  const submission = hasAssignment ? getSubmission(studentId, row.path) : null;
  const isDone = done || submission?.status === "graded";
  let body = "";

  if (item.kind === "lesson") {
    body = `
      ${renderLessonHero({ course, row, item, analytics, kindLabel, prevRow, nextRow })}
      ${renderInteractionBar({ path: row.path, studentId, courseId })}
      <div class="pp-stream-body">
        ${item.videoUrl ? renderVideoPremium(item.videoUrl) : ""}
        ${renderBlocksPreview(item.blocks)}
      </div>
      ${renderContinueBar(nextRow, isDone)}`;
  } else if (item.kind === "activity") {
    body = `
      ${renderLessonHero({ course, row, item, analytics, kindLabel, prevRow, nextRow })}
      ${renderInteractionBar({ path: row.path, studentId, courseId })}
      <div class="pp-stream-body">
        ${item.instructions ? `<p class="campus-content-intro">${escapeHtml(item.instructions)}</p>` : ""}
        ${renderBlocksPreview(item.blocks)}
      </div>
      ${renderContinueBar(nextRow, isDone)}`;
  } else {
    body = renderExamPlayer(item, row);
  }

  const assignmentBlock =
    item.assignment && item.kind !== "exam"
      ? renderAssignmentBlock(item, row)
      : "";

  const examSub = isExam ? getSubmission(studentId, row.path) : null;
  const examIsResult =
    isExam &&
    examSub &&
    (examSub.status === "graded" ||
      examSub.status === "pending_review" ||
      (examSub.status === "failed" && !examRetryPaths.has(row.path)));

  const actions =
    item.kind !== "exam" && !hasAssignment
      ? `<div class="campus-content-actions">
          <button type="button" class="campus-btn campus-btn--gold" id="completeBtn" ${isDone ? "disabled" : ""}>
            ${isDone ? "✓ Completado" : "Marcar como completado"}
          </button>
          ${getNextPath() ? `<button type="button" class="campus-btn campus-btn--ghost" id="nextBtn">Siguiente →</button>` : ""}
        </div>`
      : hasAssignment && (submission?.status === "graded" || submission?.status === "pending_review")
        ? `<div class="campus-content-actions">
            ${getNextPath() ? `<button type="button" class="campus-btn campus-btn--gold" id="nextBtn">Siguiente →</button>` : ""}
          </div>`
        : "";

  el.innerHTML = `
    <div class="campus-content-inner ${isExam ? `campus-content-inner--exam${examIsResult ? " campus-content-inner--exam-result" : ""}` : "campus-content-inner--wide"}">
      ${isExam ? `<div class="player-exam-shell">${body}</div>` : body}
      ${!isExam ? `${assignmentBlock}${actions}` : ""}
    </div>`;

  if (item.kind === "lesson" || item.kind === "activity") {
    renderToolsPanel(row, item);
    bindInteractionBar(el.querySelector(".pp-interact"), {
      path: row.path,
      studentId,
      courseId,
      analytics,
      showDialog: showCampusDialog,
    });
    bindLessonNav(el, { onNavigate: goToPath });
  }
  if (item.kind === "lesson") bindVideoControls(row, item);
  if (item.kind === "exam") hidePlayerTools();

  if (item.kind !== "exam" && !hasAssignment) {
    document.getElementById("completeBtn")?.addEventListener("click", () => {
      markItemComplete(studentId, courseId, row.path);
      renderAll();
    });
  }
  document.getElementById("nextBtn")?.addEventListener("click", () => {
    const next = getNextRow();
    if (next) goToPath(next.path);
  });
  bindAssignmentForm(item, row);
  if (item.kind === "exam") bindExamForm(item, row);
}

function renderAssignmentBlock(item, row) {
  const a = item.assignment;
  const sub = getSubmission(studentId, row.path);

  if (sub?.status === "graded") {
    return `<div class="campus-assignment-box campus-assignment-box--done">
      <h4>✓ ${escapeHtml(a.title)} — Corregido</h4>
      <p class="campus-score-display">Puntuación: <strong>${sub.totalScore} / ${sub.maxScore}</strong></p>
      ${sub.autoMax ? `<p class="admin-muted">Auto-corregido: ${sub.autoScore}/${sub.autoMax} pts</p>` : ""}
      ${sub.feedback ? `<p class="campus-feedback"><strong>Feedback del profesor:</strong> ${escapeHtml(sub.feedback)}</p>` : ""}
    </div>`;
  }

  if (sub?.status === "pending_review") {
    return `<div class="campus-assignment-box campus-assignment-box--pending">
      <h4>📤 ${escapeHtml(a.title)} — Enviado</h4>
      <p class="admin-muted">Enviado. Puedes seguir avanzando; el profesor corregirá tus respuestas cuando pueda.</p>
      ${sub.autoMax ? `<p class="admin-muted">Preguntas test: ${sub.autoScore}/${sub.autoMax} pts (automático)</p>` : ""}
      ${renderSubmittedAnswers(a, sub)}
    </div>`;
  }

  if (sub?.status === "failed") {
    return `<div class="campus-assignment-box campus-assignment-box--fail">
      <h4>${escapeHtml(a.title)} — No aprobado</h4>
      <p>Puntuación automática: ${sub.totalScore}/${sub.maxScore}. Inténtalo de nuevo.</p>
      ${renderAssignmentForm(a, row, null)}
    </div>`;
  }

  return renderAssignmentForm(a, row, null);
}

function renderSubmittedAnswers(assignment, sub) {
  const answersHtml = (assignment.questions || []).length
    ? `<div class="campus-submitted-answers">${(assignment.questions || [])
        .map((q) => {
          const ans = sub.answers[q.id];
          if (q.type === "text") {
            return `<div class="campus-answer-review"><strong>${escapeHtml(q.text)}</strong><p>${escapeHtml(ans?.text || "—")}</p></div>`;
          }
          const opt = q.options?.[ans?.selected];
          return `<div class="campus-answer-review"><strong>${escapeHtml(q.text)}</strong><p>${escapeHtml(opt || "—")}</p></div>`;
        })
        .join("")}</div>`
    : "";
  const filesHtml = sub.files?.length
    ? `<div class="campus-submitted-files-wrap"><p class="campus-form-label">Archivos entregados</p>${renderSubmissionFilesHtml(sub.files, escapeHtml)}</div>`
    : "";
  return answersHtml + filesHtml;
}

function renderFileUploadBlock(assignment) {
  if (!assignment.allowFiles) return "";
  const accept = buildAcceptString(assignment.fileTypes);
  const typesLabel = allowedTypesLabel(assignment.fileTypes);
  return `
    <div class="campus-upload-zone" id="assignmentDropZone">
      <input type="file" id="assignmentFiles" multiple hidden ${accept ? `accept="${accept}"` : ""} />
      <div class="campus-upload-icon">↑</div>
      <p class="campus-upload-title">Arrastra tus archivos aquí</p>
      <p class="campus-upload-hint">${typesLabel}<br>Máx. ${SUBMISSION_MAX_FILE_MB} MB por archivo · hasta ${SUBMISSION_MAX_FILES} archivos</p>
      <button type="button" class="campus-btn campus-btn--ghost campus-upload-btn" id="assignmentPickBtn">Seleccionar archivos</button>
      <ul class="campus-upload-list" id="assignmentFileList" hidden></ul>
    </div>`;
}

function renderPendingFilePreview(files) {
  return files
    .map((file, i) => {
      const icon = fileKind({ type: file.type, name: file.name }) === "image" ? "🖼" : fileKind({ type: file.type, name: file.name }) === "video" ? "🎬" : fileKind({ type: file.type, name: file.name }) === "pdf" ? "📄" : "📎";
      return `<li class="campus-upload-item" data-file-index="${i}">
        <span class="campus-upload-item-icon">${icon}</span>
        <span class="campus-upload-item-name">${escapeHtml(file.name)}</span>
        <span class="campus-upload-item-size">${formatFileSize(file.size)}</span>
        <button type="button" class="campus-upload-remove" data-remove-file="${i}" aria-label="Quitar">×</button>
      </li>`;
    })
    .join("");
}

function renderAssignmentForm(assignment, row, existing) {
  const questions = assignment.questions || [];
  const hasUpload = assignment.allowFiles;
  if (!questions.length && !hasUpload) {
    return `<div class="campus-assignment-box">
      <h4>📎 ${escapeHtml(assignment.title)}</h4>
      <p class="admin-muted">${escapeHtml(assignment.instructions)}</p>
    </div>`;
  }

  return `<div class="campus-assignment-box">
    <h4>📎 ${escapeHtml(assignment.title)}</h4>
    <p class="admin-muted">${escapeHtml(assignment.instructions)}</p>
    ${assignment.dueDate ? `<p class="admin-muted">Fecha límite: ${assignment.dueDate}</p>` : ""}
    <form class="campus-response-form" id="assignmentForm" data-path="${row.path}">
      ${questions
        .map((q, qi) => {
          if (q.type === "single") {
            const opts = (q.options || []).map(
              (opt, oi) =>
                `<label class="campus-option"><input type="radio" name="q_${q.id}" value="${oi}" ${existing?.answers?.[q.id]?.selected === oi ? "checked" : ""} required /> ${escapeHtml(opt)}</label>`
            ).join("");
            return `<fieldset class="campus-form-q"><legend>${qi + 1}. ${escapeHtml(q.text)}</legend>${opts}</fieldset>`;
          }
          return `<label class="campus-form-q campus-form-q--text">
            <span class="campus-form-label">${qi + 1}. ${escapeHtml(q.text)}</span>
            <textarea class="campus-textarea" name="q_${q.id}" rows="5" ${q.required && !hasUpload ? "required" : ""} placeholder="Escribe tu respuesta aquí…">${escapeHtml(existing?.answers?.[q.id]?.text || "")}</textarea>
          </label>`;
        })
        .join("")}
      ${renderFileUploadBlock(assignment)}
      <button type="submit" class="campus-btn campus-btn--gold" style="margin-top:20px">${hasUpload && !questions.length ? "Enviar archivos" : "Enviar respuestas"}</button>
    </form>
    <div id="assignmentResult" hidden></div>
  </div>`;
}

function bindAssignmentForm(item, row) {
  const form = document.getElementById("assignmentForm");
  if (!form || !item.assignment) return;

  const assignment = item.assignment;
  const pendingFiles = [];
  const dropZone = form.querySelector("#assignmentDropZone");
  const fileInput = form.querySelector("#assignmentFiles");
  const fileList = form.querySelector("#assignmentFileList");
  const pickBtn = form.querySelector("#assignmentPickBtn");

  const refreshFileList = () => {
    if (!fileList) return;
    if (!pendingFiles.length) {
      fileList.hidden = true;
      fileList.innerHTML = "";
      dropZone?.classList.remove("has-files");
      return;
    }
    fileList.hidden = false;
    fileList.innerHTML = renderPendingFilePreview(pendingFiles);
    dropZone?.classList.add("has-files");
    fileList.querySelectorAll("[data-remove-file]").forEach((btn) => {
      btn.onclick = () => {
        pendingFiles.splice(Number(btn.dataset.removeFile), 1);
        refreshFileList();
      };
    });
  };

  const addFiles = (fileListLike) => {
    const remaining = SUBMISSION_MAX_FILES - pendingFiles.length;
    if (remaining <= 0) {
      showCampusDialog({ type: "error", title: "Límite alcanzado", message: `Solo puedes subir hasta ${SUBMISSION_MAX_FILES} archivos.` });
      return;
    }
    [...fileListLike].slice(0, remaining).forEach((file) => {
      if (pendingFiles.some((f) => f.name === file.name && f.size === file.size)) return;
      pendingFiles.push(file);
    });
    refreshFileList();
  };

  pickBtn?.addEventListener("click", () => fileInput?.click());
  fileInput?.addEventListener("change", (e) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = "";
  });

  dropZone?.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("is-dragover");
  });
  dropZone?.addEventListener("dragleave", () => dropZone.classList.remove("is-dragover"));
  dropZone?.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("is-dragover");
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const answers = {};
    (assignment.questions || []).forEach((q) => {
      if (q.type === "text") {
        const el = form.querySelector(`[name="q_${q.id}"]`);
        answers[q.id] = { text: el?.value?.trim() || "" };
      } else {
        const picked = form.querySelector(`input[name="q_${q.id}"]:checked`);
        answers[q.id] = { selected: picked ? Number(picked.value) : null };
      }
    });

    const hasTextAnswer = Object.values(answers).some((a) => a.text?.trim());
    const hasChoiceAnswer = Object.values(answers).some((a) => a.selected !== null && a.selected !== undefined);
    if (assignment.allowFiles && !pendingFiles.length && !hasTextAnswer && !hasChoiceAnswer) {
      showCampusDialog({
        type: "error",
        title: "Falta la entrega",
        message: "Sube al menos un archivo o completa las respuestas antes de enviar.",
        buttonLabel: "Entendido",
      });
      return;
    }

    let files = [];
    try {
      if (pendingFiles.length) {
        files = await filesToSubmissionEntries(pendingFiles, { fileTypes: assignment.fileTypes });
      }
    } catch (err) {
      showCampusDialog({ type: "error", title: "Error al subir", message: err.message || "No se pudieron procesar los archivos." });
      return;
    }

    const sub = submitAssignment({
      studentId,
      courseId,
      path: row.path,
      assignment,
      itemTitle: item.title,
      studentName: student?.name || "Alumno",
      answers,
      files,
    });

    renderAll();

    if (sub.status === "graded") {
      showCampusDialog({
        type: "success",
        title: "¡Respuestas enviadas!",
        message: `Has obtenido <strong>${sub.totalScore}</strong> de <strong>${sub.maxScore}</strong> puntos.`,
      });
    } else if (sub.status === "pending_review") {
      showCampusDialog({
        type: "pending",
        title: "Enviado correctamente",
        message: files.length
          ? `Se han enviado <strong>${files.length}</strong> archivo(s) al profesor. Ya puedes continuar con el siguiente contenido.`
          : "El profesor revisará tus respuestas más adelante. Ya puedes continuar con el siguiente contenido.",
      });
    } else if (sub.status === "failed") {
      showCampusDialog({
        type: "error",
        title: "No aprobado",
        message: `No alcanzaste la nota mínima (${assignment.passScore}%). Revisa el contenido e inténtalo de nuevo.`,
        buttonLabel: "Reintentar",
      });
    }
  });
}

function renderExamQuestionFields(questions) {
  return questions
    .map((q, qi) => {
      if (q.type === "text") {
        return `<label class="campus-form-q campus-form-q--text">
          <span class="campus-form-label">${qi + 1}. ${escapeHtml(q.text)}</span>
          <textarea class="campus-textarea" name="q_${q.id}" rows="5" required placeholder="Escribe tu respuesta aquí…"></textarea>
        </label>`;
      }
      const opts = (q.options || []).map((opt, oi) => {
        const type = q.type === "multi" ? "checkbox" : "radio";
        return `<label><input type="${type}" name="q_${q.id}" value="${oi}" /> ${escapeHtml(opt)}</label>`;
      }).join("");
      return `<fieldset class="campus-exam-q"><legend>${qi + 1}. ${escapeHtml(q.text)}</legend>${opts}</fieldset>`;
    })
    .join("");
}

function collectExamAnswers(form, questions) {
  const answers = {};
  questions.forEach((q) => {
    if (q.type === "text") {
      answers[q.id] = { text: form.querySelector(`[name="q_${q.id}"]`)?.value?.trim() || "" };
    } else if (q.type === "multi") {
      answers[q.id] = {
        selected: [...form.querySelectorAll(`input[name="q_${q.id}"]:checked`)].map((el) => Number(el.value)),
      };
    } else {
      const picked = form.querySelector(`input[name="q_${q.id}"]:checked`);
      answers[q.id] = { selected: picked ? Number(picked.value) : null };
    }
  });
  return answers;
}

function countUnansweredExam(questions, answers) {
  return questions.filter((q) => {
    if (q.type === "text") return !answers[q.id]?.text?.trim();
    if (q.type === "multi") return !answers[q.id]?.selected?.length;
    return answers[q.id]?.selected === null || answers[q.id]?.selected === undefined;
  }).length;
}

function renderExamPlayer(item, row) {
  const sub = getSubmission(studentId, row.path);
  const maxAttempts = item.maxAttempts || 3;
  const attemptsLeft = Math.max(0, maxAttempts - (sub?.attemptCount || 0));
  const passScore = item.passScore ?? 70;

  if (sub?.status === "graded") {
    return renderExamResultPremium({
      item,
      sub,
      type: "pass",
      passScore,
      maxAttempts,
      attemptsLeft,
      wrongAnswers: getExamWrongAnswers(item, sub.answers || {}),
      recommendations: [],
      showReview: false,
      hasNext: !!getNextPath(),
      feedback: sub.feedback || "",
    });
  }

  if (sub?.status === "pending_review") {
    return renderExamResultPremium({
      item,
      sub,
      type: "pending",
      passScore,
      maxAttempts,
      attemptsLeft,
      wrongAnswers: [],
      recommendations: [],
      showReview: false,
      hasNext: !!getNextPath(),
    });
  }

  if (sub?.status === "failed" && !examRetryPaths.has(row.path)) {
    const pct = sub.autoMax ? Math.round((sub.autoScore / sub.autoMax) * 100) : 0;
    const wrong = getExamWrongAnswers(item, sub.answers || {});
    return renderExamResultPremium({
      item,
      sub,
      type: "fail",
      passScore,
      maxAttempts,
      attemptsLeft,
      wrongAnswers: wrong,
      recommendations: getExamRecommendations(item, wrong.length, passScore, pct),
      showReview: examReviewOpen.has(row.path),
      hasNext: false,
    });
  }

  const questions = getExamQuestions(item, row.path);

  return `
    <header class="pp-lesson-hero" style="padding-bottom:16px">
      <div class="pp-lesson-hero-glow"></div>
      <div class="pp-lesson-hero-inner">
        <p class="pp-lesson-crumb"><span>Examen</span><span>·</span><span>${questions.length} preguntas</span></p>
        <h1 class="pp-lesson-title">${escapeHtml(item.title)}</h1>
        <div class="pp-lesson-chips">
          <span class="pp-chip">⏱ ${item.timeLimitMin || "—"} min</span>
          <span class="pp-chip pp-chip--gold">Mínimo ${passScore}%</span>
          ${sub?.status === "failed" ? `<span class="pp-chip">${attemptsLeft} intentos restantes</span>` : ""}
        </div>
      </div>
    </header>
    <div class="pp-stream-body">
      ${item.instructions ? `<p class="campus-content-intro">${escapeHtml(item.instructions)}</p>` : ""}
      ${renderBlocksPreview(item.blocks)}
      <form class="campus-exam-form" id="examForm">
        ${renderExamQuestionFields(questions)}
        <button type="submit" class="campus-btn campus-btn--gold">Enviar examen</button>
      </form>
      <div id="examResult" class="campus-exam-result-wrap" hidden></div>
    </div>`;
}

function renderExamSubmittedReview(item, sub) {
  return `<div class="campus-submitted-answers">${(item.questions || [])
    .map((q) => {
      const ans = sub.answers[q.id];
      if (q.type === "text") {
        return `<div class="campus-answer-review"><strong>${escapeHtml(q.text)}</strong><p>${escapeHtml(ans?.text || "—")}</p></div>`;
      }
      if (q.type === "multi") {
        const labels = (ans?.selected || []).map((i) => q.options?.[i]).filter(Boolean);
        return `<div class="campus-answer-review"><strong>${escapeHtml(q.text)}</strong><p>${escapeHtml(labels.join(", ") || "—")}</p></div>`;
      }
      const opt = q.options?.[ans?.selected];
      return `<div class="campus-answer-review"><strong>${escapeHtml(q.text)}</strong><p>${escapeHtml(opt || "—")}</p></div>`;
    })
    .join("")}</div>`;
}

function bindExamForm(item, row) {
  document.getElementById("examRetryBtn")?.addEventListener("click", () => resetExamAttempt(item, row));
  document.getElementById("examReviewBtn")?.addEventListener("click", () => {
    if (examReviewOpen.has(row.path)) examReviewOpen.delete(row.path);
    else examReviewOpen.add(row.path);
    renderContent();
  });
  document.getElementById("examNextBtn")?.addEventListener("click", () => {
    const next = getNextRow();
    if (next) goToPath(next.path);
  });

  const form = document.getElementById("examForm");
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const questions = getExamQuestions(item, row.path);
    const answers = collectExamAnswers(form, questions);
    const unanswered = countUnansweredExam(questions, answers);

    if (unanswered > 0) {
      showCampusDialog({
        type: "error",
        title: "Examen incompleto",
        message: `Responde todas las preguntas antes de enviar (${unanswered} pendiente${unanswered > 1 ? "s" : ""}).`,
        buttonLabel: "Entendido",
      });
      return;
    }

    const sub = submitExam({
      studentId,
      courseId,
      path: row.path,
      exam: item,
      itemTitle: item.title,
      studentName: student?.name || "Alumno",
      answers,
    });

    examRetryPaths.delete(row.path);

    const scored = scoreExamAnswers(item, answers);
    const autoPct = scored.autoMax ? Math.round((scored.autoEarned / scored.autoMax) * 100) : 0;

    if (sub.status === "pending_review") {
      renderAll();
      showCampusDialog({
        type: "pending",
        title: "Examen enviado",
        message: "El profesor corregirá las respuestas abiertas. Las de test se han puntuado automáticamente. Ya puedes continuar.",
      });
      return;
    }

    if (sub.status === "failed") {
      renderAll();
      const attemptsLeft = Math.max(0, (item.maxAttempts || 3) - sub.attemptCount);
      showCampusDialog({
        type: "error",
        title: "Examen no aprobado",
        message: `Has obtenido <strong>${autoPct}%</strong> (mínimo ${item.passScore}%). ${attemptsLeft > 0 ? `Te quedan ${attemptsLeft} intento${attemptsLeft > 1 ? "s" : ""}.` : "No quedan más intentos."}`,
        buttonLabel: attemptsLeft > 0 ? "Reintentar" : "Entendido",
        onClose: () => {
          if (attemptsLeft > 0) resetExamAttempt(item, row);
        },
      });
      return;
    }

    form.hidden = true;

    const resultEl = document.getElementById("examResult");
    resultEl.hidden = false;
    resultEl.innerHTML = renderExamResultPremium({
      item,
      sub,
      type: "pass",
      passScore: item.passScore ?? 70,
      maxAttempts: item.maxAttempts || 3,
      attemptsLeft: Math.max(0, (item.maxAttempts || 3) - sub.attemptCount),
      wrongAnswers: getExamWrongAnswers(item, answers),
      recommendations: [],
      showReview: false,
    });
    document.querySelector(".campus-content-inner--exam")?.classList.add("campus-content-inner--exam-result");
    document.getElementById("examNextBtn")?.addEventListener("click", () => {
      const next = getNextRow();
      if (next) goToPath(next.path);
    });

    resultEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    renderSidebar();
    showCampusDialog({
      type: "success",
      title: "¡Examen aprobado!",
      message: `Has obtenido <strong>${autoPct}%</strong>. Puedes continuar con el siguiente contenido.`,
    });
  };
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getNextPath() {
  return getNextRow()?.path || null;
}

function showCourseWelcome() {
  const msg = course.welcomeMessage?.trim();
  if (!msg || hasSeenCourseWelcome(studentId, courseId)) return;
  showCampusDialog({
    title: course.title,
    message: msg,
    type: "info",
    buttonLabel: "Empezar curso",
    onClose: () => markCourseWelcomeSeen(studentId, courseId),
  });
}

function renderAll() {
  saveLastLesson(studentId, courseId, activePath);
  renderSidebar();
  renderContent();
}

renderAll();
bindThemeToggle();
showCourseWelcome();
