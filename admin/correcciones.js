import { showToast, escapeHtml } from "./shell.js";
import {
  getSubmissions,
  getCourse,
  getStudent,
  gradeSubmission,
  findItemByPath,
  resetExamSubmission,
} from "../js/data.js";
import { renderSubmissionFilesHtml } from "../js/submission-files.js";

const state = {
  status: "pending_review",
  kind: "",
  search: "",
  groupBy: "course",
  selectedSubmissionId: null,
};

let els = {};

export function initCorrectionsPage() {
  els = {
    stats: document.getElementById("corrStats"),
    statusFilter: document.getElementById("statusFilter"),
    kindFilter: document.getElementById("kindFilter"),
    searchInput: document.getElementById("corrSearch"),
    groupTabs: document.querySelectorAll("[data-group]"),
    nav: document.getElementById("corrNav"),
    detail: document.getElementById("corrDetail"),
  };

  els.statusFilter.onchange = () => {
    state.status = els.statusFilter.value;
    state.selectedSubmissionId = null;
    render();
  };
  els.kindFilter.onchange = () => {
    state.kind = els.kindFilter.value;
    state.selectedSubmissionId = null;
    render();
  };
  els.searchInput.oninput = () => {
    state.search = els.searchInput.value.trim().toLowerCase();
    renderNav();
  };
  els.groupTabs.forEach((tab) => {
    tab.onclick = () => {
      state.groupBy = tab.dataset.group;
      state.selectedSubmissionId = null;
      els.groupTabs.forEach((t) => t.classList.toggle("is-active", t === tab));
      render();
    };
  });

  render();
}

function getFilteredSubmissions() {
  let subs = getSubmissions(state.status ? { status: state.status } : {});
  if (state.kind === "exam") subs = subs.filter((s) => s.kind === "exam");
  if (state.kind === "assignment") subs = subs.filter((s) => s.kind !== "exam");
  if (state.search) {
    subs = subs.filter((s) => {
      const course = getCourse(s.courseId);
      const haystack = [s.studentName, s.itemTitle, course?.title].join(" ").toLowerCase();
      return haystack.includes(state.search);
    });
  }
  return subs.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
}

function getSubmissionQuestions(course, sub) {
  const item = findItemByPath(course, sub.path);
  if (sub.kind === "exam" || item?.kind === "exam") return item?.questions || [];
  return item?.assignment?.questions || [];
}

function textPointsMax(questions) {
  return (questions || []).filter((q) => q.type === "text").reduce((s, q) => s + (q.points || 10), 0);
}

function manualPointsMax(sub, questions) {
  const textMax = textPointsMax(questions);
  const fromTotal = Math.max(0, (sub.maxScore || 0) - (sub.autoScore || 0));
  return Math.max(textMax, fromTotal, sub.files?.length ? fromTotal || sub.maxScore || 0 : 0);
}

function needsManualGrading(sub, questions) {
  if (sub.status !== "pending_review") return false;
  return textPointsMax(questions) > 0 || sub.files?.length > 0;
}

function manualScoreLabel(sub, textMax) {
  const hasFiles = sub.files?.length > 0;
  if (hasFiles && !textMax) return "Puntos de la entrega (archivos)";
  if (hasFiles && textMax) return "Puntos corrección manual (texto + archivos)";
  if (sub.kind === "exam") return "Puntos respuestas abiertas del examen";
  return "Puntos respuestas abiertas";
}

function statusMeta(sub) {
  if (sub.status === "pending_review") return { label: "Pendiente", badge: "draft", icon: "⏳" };
  if (sub.status === "failed") return { label: "No aprobado", badge: "blocked", icon: "✗" };
  return { label: "Corregida", badge: "published", icon: "✓" };
}

function kindLabel(sub, item) {
  if (sub.kind === "exam" || item?.kind === "exam") return "Examen";
  return "Actividad";
}

function formatDate(iso) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(iso) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function buildCourseGroups(submissions) {
  const groups = new Map();
  submissions.forEach((sub) => {
    const course = getCourse(sub.courseId);
    if (!groups.has(sub.courseId)) {
      groups.set(sub.courseId, { course, students: new Map() });
    }
    const g = groups.get(sub.courseId);
    if (!g.students.has(sub.studentId)) {
      g.students.set(sub.studentId, { studentId: sub.studentId, name: sub.studentName, submissions: [] });
    }
    g.students.get(sub.studentId).submissions.push(sub);
  });
  return [...groups.values()].sort((a, b) => (a.course?.title || "").localeCompare(b.course?.title || ""));
}

function buildStudentGroups(submissions) {
  const groups = new Map();
  submissions.forEach((sub) => {
    if (!groups.has(sub.studentId)) {
      groups.set(sub.studentId, { studentId: sub.studentId, name: sub.studentName, courses: new Map() });
    }
    const g = groups.get(sub.studentId);
    if (!g.courses.has(sub.courseId)) {
      g.courses.set(sub.courseId, { course: getCourse(sub.courseId), submissions: [] });
    }
    g.courses.get(sub.courseId).submissions.push(sub);
  });
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function renderStats(submissions) {
  const all = getSubmissions();
  const pending = all.filter((s) => s.status === "pending_review").length;
  const failed = all.filter((s) => s.status === "failed").length;
  const courses = new Set(submissions.map((s) => s.courseId)).size;
  const students = new Set(submissions.map((s) => s.studentId)).size;

  els.stats.innerHTML = `
    <div class="corr-stat"><span class="corr-stat-value">${pending}</span><span class="corr-stat-label">Pendientes</span></div>
    <div class="corr-stat"><span class="corr-stat-value">${failed}</span><span class="corr-stat-label">No aprobados</span></div>
    <div class="corr-stat"><span class="corr-stat-value">${courses}</span><span class="corr-stat-label">Cursos</span></div>
    <div class="corr-stat"><span class="corr-stat-value">${students}</span><span class="corr-stat-label">Alumnos</span></div>`;
}

function submissionNavItem(sub) {
  const meta = statusMeta(sub);
  const course = getCourse(sub.courseId);
  const item = findItemByPath(course, sub.path);
  const active = state.selectedSubmissionId === sub.id;
  return `<button type="button" class="corr-sub-item ${active ? "is-active" : ""}" data-sub-id="${sub.id}">
    <span class="corr-sub-icon">${meta.icon}</span>
    <span class="corr-sub-body">
      <span class="corr-sub-title">${escapeHtml(sub.itemTitle)}</span>
      <span class="corr-sub-meta">${kindLabel(sub, item)} · ${formatDateShort(sub.submittedAt)}</span>
    </span>
    <span class="admin-badge admin-badge--${meta.badge} corr-sub-badge">${meta.label}</span>
  </button>`;
}

function renderNav() {
  const submissions = getFilteredSubmissions();
  if (state.selectedSubmissionId && !submissions.some((s) => s.id === state.selectedSubmissionId)) {
    state.selectedSubmissionId = submissions[0]?.id || null;
  }
  if (!submissions.length) {
    els.nav.innerHTML = `<div class="corr-nav-empty"><p>No hay entregas con estos filtros.</p></div>`;
    return;
  }

  if (state.groupBy === "course") {
    const groups = buildCourseGroups(submissions);
    els.nav.innerHTML = groups
      .map(({ course, students }) => {
        const count = [...students.values()].reduce((n, s) => n + s.submissions.length, 0);
        const studentsHtml = [...students.values()]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((student) => {
            const pending = student.submissions.filter((s) => s.status === "pending_review").length;
            return `<div class="corr-student-block">
              <div class="corr-student-head">
                <span class="corr-student-avatar">${escapeHtml(student.name.charAt(0).toUpperCase())}</span>
                <div>
                  <p class="corr-student-name">${escapeHtml(student.name)}</p>
                  <p class="corr-student-meta">${student.submissions.length} entrega${student.submissions.length > 1 ? "s" : ""}${pending ? ` · ${pending} pendiente${pending > 1 ? "s" : ""}` : ""}</p>
                </div>
              </div>
              <div class="corr-sub-list">${student.submissions.map(submissionNavItem).join("")}</div>
            </div>`;
          })
          .join("");

        return `<section class="corr-course-block">
          <header class="corr-course-head">
            <div>
              <p class="login-kicker">${escapeHtml(course?.category || "Curso")}</p>
              <h3 class="corr-course-title">${escapeHtml(course?.title || "Sin título")}</h3>
            </div>
            <span class="corr-count">${count}</span>
          </header>
          ${studentsHtml}
        </section>`;
      })
      .join("");
  } else {
    const groups = buildStudentGroups(submissions);
    els.nav.innerHTML = groups
      .map((student) => {
        const count = [...student.courses.values()].reduce((n, c) => n + c.submissions.length, 0);
        const coursesHtml = [...student.courses.values()]
          .sort((a, b) => (a.course?.title || "").localeCompare(b.course?.title || ""))
          .map(({ course, submissions: subs }) => `
            <div class="corr-student-course">
              <p class="corr-student-course-title">${escapeHtml(course?.title || "Curso")}</p>
              <div class="corr-sub-list">${subs.map(submissionNavItem).join("")}</div>
            </div>`)
          .join("");

        return `<section class="corr-course-block corr-course-block--student">
          <header class="corr-course-head">
            <div class="corr-student-head">
              <span class="corr-student-avatar">${escapeHtml(student.name.charAt(0).toUpperCase())}</span>
              <div>
                <h3 class="corr-course-title">${escapeHtml(student.name)}</h3>
                <p class="corr-student-meta">${getStudent(student.studentId)?.email || "Alumno"}</p>
              </div>
            </div>
            <span class="corr-count">${count}</span>
          </header>
          ${coursesHtml}
        </section>`;
      })
      .join("");
  }

  els.nav.querySelectorAll("[data-sub-id]").forEach((btn) => {
    btn.onclick = () => {
      state.selectedSubmissionId = btn.dataset.subId;
      renderNav();
      renderDetail();
    };
  });

  if (!state.selectedSubmissionId && submissions[0]) {
    state.selectedSubmissionId = submissions[0].id;
    renderNav();
    renderDetail();
  }
}

function renderAnswers(sub, questions) {
  return (questions || [])
    .map((q) => {
      const ans = sub.answers[q.id];
      if (q.type === "text") {
        return `<div class="correction-answer">
          <p class="corr-q-label">Texto libre · ${q.points || 10} pts</p>
          <strong>${escapeHtml(q.text)}</strong>
          <p class="correction-text">${escapeHtml(ans?.text || "—")}</p>
        </div>`;
      }
      if (q.type === "multi") {
        const labels = (ans?.selected || []).map((i) => q.options?.[i]).filter(Boolean);
        const correct = (Array.isArray(q.correct) ? q.correct : [q.correct]).map(Number).sort();
        const picked = (ans?.selected || []).map(Number).sort();
        const ok = correct.length === picked.length && correct.every((v, i) => v === picked[i]);
        return `<div class="correction-answer ${ok ? "is-ok" : "is-bad"}">
          <p class="corr-q-label">Test múltiple · ${q.points || 10} pts · Auto</p>
          <strong>${escapeHtml(q.text)}</strong>
          <p>${escapeHtml(labels.join(", ") || "—")} <span class="corr-mark">${ok ? "✓ Correcta" : "✗ Incorrecta"}</span></p>
        </div>`;
      }
      const opt = q.options?.[ans?.selected];
      const ok = Number(ans?.selected) === Number(q.correct);
      return `<div class="correction-answer ${ok ? "is-ok" : "is-bad"}">
        <p class="corr-q-label">Test · ${q.points || 10} pts · Auto</p>
        <strong>${escapeHtml(q.text)}</strong>
        <p>${escapeHtml(opt || "—")} <span class="corr-mark">${ok ? "✓ Correcta" : "✗ Incorrecta"}</span></p>
      </div>`;
    })
    .join("");
}

function renderDetail() {
  const sub = getSubmissions().find((s) => s.id === state.selectedSubmissionId);
  if (!sub) {
    els.detail.innerHTML = `<div class="corr-detail-empty">
      <p class="login-kicker">Bandeja de corrección</p>
      <h3>Selecciona una entrega</h3>
      <p class="admin-muted">Elige curso, alumno y entrega en el panel izquierdo para revisar respuestas y puntuar.</p>
    </div>`;
    return;
  }

  const course = getCourse(sub.courseId);
  const student = getStudent(sub.studentId);
  const item = findItemByPath(course, sub.path);
  const questions = getSubmissionQuestions(course, sub);
  const textMax = textPointsMax(questions);
  const manualMax = manualPointsMax(sub, questions);
  const meta = statusMeta(sub);
  const isExam = sub.kind === "exam" || item?.kind === "exam";
  const autoPct = sub.autoMax ? Math.round((sub.autoScore / sub.autoMax) * 100) : null;

  const gradeBlock =
    needsManualGrading(sub, questions)
      ? `<form class="corr-grade-panel" data-id="${sub.id}" data-auto="${sub.autoScore || 0}" data-max="${manualMax}" data-total-max="${sub.maxScore || manualMax}">
          <div class="corr-grade-head">
            <div>
              <p class="login-kicker">Evaluación del profesor</p>
              <h4 class="corr-grade-title">Corrección manual</h4>
            </div>
            <div class="corr-grade-preview">
              <span class="corr-grade-preview-label">Nota final estimada</span>
              <span class="corr-grade-preview-value"><span data-grade-preview>${(sub.autoScore || 0) + manualMax}</span><em> / ${sub.maxScore || manualMax}</em></span>
            </div>
          </div>
          ${sub.files?.length ? `<p class="corr-grade-intro">${sub.files.length} archivo${sub.files.length > 1 ? "s" : ""} entregado${sub.files.length > 1 ? "s" : ""}. Revisa el material arriba, asigna la puntuación y escribe feedback claro para el alumno.</p>` : `<p class="corr-grade-intro">Revisa las respuestas del alumno, asigna la puntuación correspondiente y añade feedback constructivo.</p>`}
          <div class="corr-grade-body">
            <div class="corr-score-block">
              <label class="corr-field-label">${manualScoreLabel(sub, textMax)}</label>
              <div class="corr-score-row">
                <input class="corr-score-input" type="number" min="0" max="${manualMax}" value="${manualMax}" required data-manual-score aria-label="Puntos" />
                <span class="corr-score-suffix">/ ${manualMax} pts</span>
              </div>
              <div class="corr-score-presets" role="group" aria-label="Puntuación rápida">
                ${[25, 50, 70, 85, 100].map((pct) => {
                  const pts = Math.round((manualMax * pct) / 100);
                  return `<button type="button" class="corr-preset-btn" data-preset="${pts}">${pct}%</button>`;
                }).join("")}
              </div>
              ${sub.autoMax ? `<p class="corr-field-hint">Test auto-corregido: ${sub.autoScore}/${sub.autoMax} pts · Tu nota se sumará a la puntuación final.</p>` : ""}
            </div>
            <div class="corr-feedback-block">
              <label class="corr-field-label" for="gradeFeedback">Feedback para el alumno</label>
              <textarea class="corr-feedback-input" id="gradeFeedback" rows="6" placeholder="Describe qué ha hecho bien, qué mejorar y recomendaciones concretas…"></textarea>
              <p class="corr-field-hint">El alumno verá este comentario en su campus tras guardar.</p>
            </div>
          </div>
          <footer class="corr-grade-footer">
            <button type="submit" class="admin-btn admin-btn--gold corr-grade-submit">Guardar corrección</button>
          </footer>
        </form>`
      : sub.status === "pending_review"
        ? `<div class="corr-info-panel"><p>Revisión pendiente. Las preguntas test ya están auto-corregidas.</p></div>`
        : sub.status === "failed"
          ? `<div class="corr-info-panel corr-info-panel--fail">
              <p><strong>No aprobado automáticamente</strong>${autoPct != null ? ` — ${autoPct}% obtenido` : ""}.</p>
              <p class="admin-muted">Intentos usados: ${sub.attemptCount || 0}${item?.maxAttempts ? ` / ${item.maxAttempts}` : ""}. El alumno puede reintentar si le quedan intentos.</p>
              ${isExam ? `<button type="button" class="admin-btn admin-btn--ghost" id="resetExamBtn" style="margin-top:16px">↺ Resetear intentos del examen</button>` : ""}
            </div>`
          : `<div class="corr-info-panel corr-info-panel--done">
              <p><strong>Nota final:</strong> ${sub.totalScore} / ${sub.maxScore} pts</p>
              ${sub.feedback ? `<p class="corr-feedback">${escapeHtml(sub.feedback)}</p>` : `<p class="admin-muted">Sin feedback registrado.</p>`}
            </div>`;

  const filesHtml = sub.files?.length
    ? `<section class="corr-detail-section">
        <h4 class="corr-panel-title">Archivos entregados</h4>
        <div class="correction-files">${renderSubmissionFilesHtml(sub.files, escapeHtml)}</div>
      </section>`
    : "";

  els.detail.innerHTML = `
    <header class="corr-detail-head">
      <div class="corr-detail-head-main">
        <p class="login-kicker">${escapeHtml(course?.title || "Curso")}</p>
        <h2 class="corr-detail-title">${escapeHtml(sub.itemTitle)}</h2>
        <div class="corr-detail-tags">
          <span class="admin-badge admin-badge--${meta.badge}">${meta.label}</span>
          <span class="corr-tag">${isExam ? "Examen" : "Actividad"}</span>
          <span class="corr-tag">${formatDate(sub.submittedAt)}</span>
        </div>
      </div>
      <div class="corr-student-card">
        <span class="corr-student-avatar corr-student-avatar--lg">${escapeHtml(sub.studentName.charAt(0).toUpperCase())}</span>
        <div>
          <p class="corr-student-name">${escapeHtml(sub.studentName)}</p>
          <p class="corr-student-meta">${escapeHtml(student?.email || "—")}</p>
        </div>
      </div>
    </header>

    <div class="corr-detail-grid">
      ${sub.autoMax ? `<div class="corr-score-card">
        <span class="corr-score-label">Auto-corrección (test)</span>
        <span class="corr-score-value">${sub.autoScore}<span>/${sub.autoMax}</span></span>
        ${autoPct != null ? `<span class="corr-score-pct">${autoPct}%</span>` : ""}
      </div>` : ""}
      ${sub.status === "graded" ? `<div class="corr-score-card corr-score-card--gold">
        <span class="corr-score-label">Nota final</span>
        <span class="corr-score-value">${sub.totalScore}<span>/${sub.maxScore}</span></span>
      </div>` : `<div class="corr-score-card">
        <span class="corr-score-label">Puntuación máxima</span>
        <span class="corr-score-value">${sub.maxScore}<span> pts</span></span>
      </div>`}
      ${sub.attemptCount ? `<div class="corr-score-card">
        <span class="corr-score-label">Intento</span>
        <span class="corr-score-value">${sub.attemptCount}</span>
      </div>` : ""}
    </div>

    <section class="corr-detail-section">
      <h4 class="corr-panel-title">Respuestas del alumno</h4>
      <div class="correction-answers">${
        renderAnswers(sub, questions) ||
        (sub.files?.length
          ? `<p class="admin-muted">Entrega solo con archivos adjuntos. Revisa los materiales abajo y puntúa en el formulario de corrección.</p>`
          : `<p class="admin-muted">Sin respuestas de texto registradas.</p>`)
      }</div>
    </section>

    ${filesHtml}
    ${gradeBlock}`;

  els.detail.querySelector(".corr-grade-panel")?.addEventListener("submit", handleGradeSubmit);
  bindGradePanel();

  els.detail.querySelector("#resetExamBtn")?.addEventListener("click", () => {
    if (!confirm("¿Resetear los intentos de este examen? El alumno podrá volver a presentarlo desde cero.")) return;
    if (resetExamSubmission(sub.studentId, sub.path)) {
      showToast("Intentos reseteados. El alumno puede reintentar el examen.");
      renderDetail();
      render();
    } else {
      showToast("No se pudo resetear el examen.", "error");
    }
  });
}

function bindGradePanel() {
  const panel = els.detail.querySelector(".corr-grade-panel");
  if (!panel) return;

  const auto = Number(panel.dataset.auto) || 0;
  const manualInput = panel.querySelector("[data-manual-score]");
  const previewEl = panel.querySelector("[data-grade-preview]");
  const maxManual = Number(panel.dataset.max) || 100;

  const updatePreview = () => {
    const manual = Number(manualInput?.value) || 0;
    if (previewEl) previewEl.textContent = auto + manual;
  };

  manualInput?.addEventListener("input", updatePreview);

  panel.querySelectorAll("[data-preset]").forEach((btn) => {
    btn.onclick = () => {
      if (manualInput) {
        manualInput.value = btn.dataset.preset;
        updatePreview();
        manualInput.focus();
      }
    };
  });
}

function handleGradeSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const score = Number(form.querySelector("[data-manual-score]")?.value);
  const feedback = form.querySelector("#gradeFeedback")?.value.trim() || form.querySelector("textarea")?.value.trim();
  gradeSubmission(form.dataset.id, score, feedback);
  showToast("Corrección guardada");
  render();
}

function render() {
  const submissions = getFilteredSubmissions();
  renderStats(submissions);
  renderNav();
  renderDetail();
}
