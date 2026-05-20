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
} from "../js/data.js";
import { renderBlocksPreview, escapeHtml } from "../admin/editor/preview.js";

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
document.getElementById("campusUser").textContent = student?.name || "Alumno";
document.getElementById("logoutBtn").onclick = logoutStudent;

const curriculum = getCourseCurriculum(course);
let activePath = params.get("item") || findFirstUnlockedPath();

function findFirstUnlockedPath() {
  const open = curriculum.find((r) => isCurriculumItemUnlocked(course, r, studentId));
  return open?.path || curriculum[0]?.path;
}

function itemIcon(kind) {
  if (kind === "lesson") return "🎬";
  if (kind === "activity") return "✏️";
  return "📝";
}

function kindLabel(item) {
  if (item.kind === "lesson") return "Lección";
  if (item.kind === "activity") return ACTIVITY_TYPES[item.activityType] || "Actividad";
  return "Examen";
}

function embedVideo(url) {
  if (/youtube\.com|youtu\.be/.test(url)) {
    const id = url.match(/(?:v=|\/)([\w-]{11})/)?.[1];
    if (id) return `<iframe src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>`;
  }
  if (/vimeo\.com/.test(url)) {
    const id = url.split("/").pop();
    return `<iframe src="https://player.vimeo.com/video/${id}" allowfullscreen></iframe>`;
  }
  return `<video src="${url}" controls playsinline></video>`;
}

function scoreExam(item, answers) {
  let earned = 0;
  let max = 0;
  item.questions.forEach((q, qi) => {
    max += q.points || 10;
    const ans = answers[qi];
    if (q.type === "multi") {
      const correct = Array.isArray(q.correct) ? q.correct : [q.correct];
      const picked = Array.isArray(ans) ? ans.map(Number).sort() : [];
      const ok = correct.length === picked.length && correct.map(Number).sort().every((v, i) => v === picked[i]);
      if (ok) earned += q.points || 10;
    } else {
      if (Number(ans) === Number(q.correct)) earned += q.points || 10;
    }
  });
  return { earned, max, percent: max ? Math.round((earned / max) * 100) : 0 };
}

function renderSidebar() {
  const prog = getStudentCourseProgress(studentId, courseId);
  const groups = [];

  const courseRows = curriculum.filter((r) => r.scope === "course");
  if (courseRows.length) groups.push({ title: "General", rows: courseRows });

  course.structure.forEach((mod) => {
    const rows = curriculum.filter(
      (r) => (r.scope === "module" || r.scope === "topic") && r.moduleId === mod.id
    );
    if (rows.length) groups.push({ title: mod.title, rows });
  });

  const itemsHtml = groups
    .map(
      (g) => `
    <div class="campus-curriculum-mod">
      <p class="campus-curriculum-mod-title">${escapeHtml(g.title)}</p>
      ${g.rows
        .map((row) => {
          const unlocked = isCurriculumItemUnlocked(course, row, studentId);
          const done = isItemCompleted(studentId, row.path) || getSubmission(studentId, row.path)?.status === "graded";
          const pending = getSubmission(studentId, row.path)?.status === "pending_review";
          return `
        <button type="button" class="campus-curriculum-item ${row.path === activePath ? "is-active" : ""} ${done ? "is-done" : ""}"
          data-path="${row.path}" ${unlocked ? "" : "disabled"}>
          <span class="campus-curriculum-icon">${itemIcon(row.item.kind)}</span>
          <span class="campus-curriculum-label">${escapeHtml(row.item.title)}</span>
          ${done ? '<span class="campus-curriculum-status">✓</span>' : pending ? '<span class="campus-curriculum-status">⏳</span>' : unlocked ? "" : '<span class="campus-curriculum-status">🔒</span>'}
        </button>`;
        })
        .join("")}
    </div>`
    )
    .join("");

  document.getElementById("sidebar").innerHTML = `
    <div class="campus-sidebar-head">
      <p class="login-kicker">${escapeHtml(course.category)}</p>
      <h1>${escapeHtml(course.title)}</h1>
      <div class="campus-progress" style="margin-top:16px">
        <div class="campus-progress-bar"><div class="campus-progress-fill" style="width:${prog.percent}%"></div></div>
        <div class="campus-progress-label"><span>Progreso</span><span>${prog.percent}%</span></div>
      </div>
    </div>
    <div class="campus-curriculum-mod">${itemsHtml}</div>`;

  document.querySelectorAll("[data-path]").forEach((btn) => {
    btn.onclick = () => {
      if (btn.disabled) return;
      activePath = btn.dataset.path;
      history.replaceState({}, "", `?id=${courseId}&item=${encodeURIComponent(activePath)}`);
      renderAll();
    };
  });
}

function renderContent() {
  const row = curriculum.find((r) => r.path === activePath);
  const el = document.getElementById("content");

  if (!row) {
    el.innerHTML = `<div class="campus-locked"><p>Selecciona un elemento del temario.</p></div>`;
    return;
  }

  if (!isCurriculumItemUnlocked(course, row, studentId)) {
    el.innerHTML = `<div class="campus-locked"><div class="campus-locked-icon">🔒</div><h3>Contenido bloqueado</h3><p>Completa el elemento anterior para desbloquearlo.</p></div>`;
    return;
  }

  const item = row.item;
  const done = isItemCompleted(studentId, row.path);
  let body = "";

  if (item.kind === "lesson") {
    body = `
      ${item.videoUrl ? `<div class="preview-trailer">${embedVideo(item.videoUrl)}</div>` : ""}
      ${renderBlocksPreview(item.blocks)}`;
  } else if (item.kind === "activity") {
    body = `
      ${item.instructions ? `<p class="campus-content-intro">${escapeHtml(item.instructions)}</p>` : ""}
      ${renderBlocksPreview(item.blocks)}`;
  } else {
    body = renderExamPlayer(item, row, done);
  }

  const assignmentBlock =
    item.assignment && item.kind !== "exam"
      ? renderAssignmentBlock(item, row)
      : "";

  const hasAssignment = item.assignment && (item.assignment.questions?.length || item.kind !== "exam");
  const submission = hasAssignment ? getSubmission(studentId, row.path) : null;
  const isDone = done || submission?.status === "graded";

  const actions =
    item.kind !== "exam" && !hasAssignment
      ? `<div class="campus-content-actions">
          <button type="button" class="campus-btn campus-btn--gold" id="completeBtn" ${isDone ? "disabled" : ""}>
            ${isDone ? "✓ Completado" : "Marcar como completado"}
          </button>
          ${getNextPath() ? `<button type="button" class="campus-btn campus-btn--ghost" id="nextBtn">Siguiente →</button>` : ""}
        </div>`
      : hasAssignment && submission?.status === "graded"
        ? `<div class="campus-content-actions">
            ${getNextPath() ? `<button type="button" class="campus-btn campus-btn--gold" id="nextBtn">Siguiente →</button>` : ""}
          </div>`
        : "";

  el.innerHTML = `
    <div class="campus-content-inner">
      <p class="campus-content-tag">${kindLabel(item)}</p>
      <h2 class="campus-content-title">${escapeHtml(item.title)}</h2>
      ${body}
      ${assignmentBlock}
      ${actions}
    </div>`;

  if (item.kind !== "exam" && !hasAssignment) {
    document.getElementById("completeBtn")?.addEventListener("click", () => {
      markItemComplete(studentId, courseId, row.path);
      renderAll();
    });
  }
  document.getElementById("nextBtn")?.addEventListener("click", () => {
    const next = getNextPath();
    if (next) {
      activePath = next;
      history.replaceState({}, "", `?id=${courseId}&item=${encodeURIComponent(activePath)}`);
      renderAll();
    }
  });
  bindAssignmentForm(item, row);
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
      <p class="admin-muted">Tu respuesta está pendiente de corrección por el profesor.</p>
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
  return `<div class="campus-submitted-answers">${(assignment.questions || [])
    .map((q) => {
      const ans = sub.answers[q.id];
      if (q.type === "text") {
        return `<div class="campus-answer-review"><strong>${escapeHtml(q.text)}</strong><p>${escapeHtml(ans?.text || "—")}</p></div>`;
      }
      const opt = q.options?.[ans?.selected];
      return `<div class="campus-answer-review"><strong>${escapeHtml(q.text)}</strong><p>${escapeHtml(opt || "—")}</p></div>`;
    })
    .join("")}</div>`;
}

function renderAssignmentForm(assignment, row, existing) {
  const questions = assignment.questions || [];
  if (!questions.length) {
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
            <textarea class="campus-textarea" name="q_${q.id}" rows="5" ${q.required ? "required" : ""} placeholder="Escribe tu respuesta aquí…">${escapeHtml(existing?.answers?.[q.id]?.text || "")}</textarea>
          </label>`;
        })
        .join("")}
      <button type="submit" class="campus-btn campus-btn--gold" style="margin-top:20px">Enviar respuestas</button>
    </form>
    <div id="assignmentResult" hidden></div>
  </div>`;
}

function bindAssignmentForm(item, row) {
  const form = document.getElementById("assignmentForm");
  if (!form || !item.assignment) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const assignment = item.assignment;
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

    const sub = submitAssignment({
      studentId,
      courseId,
      path: row.path,
      assignment,
      itemTitle: item.title,
      studentName: student?.name || "Alumno",
      answers,
    });

    renderAll();

    if (sub.status === "graded") {
      alert(`¡Respuestas enviadas! Puntuación: ${sub.totalScore}/${sub.maxScore}`);
    } else if (sub.status === "pending_review") {
      alert("Respuestas enviadas. El profesor las corregirá pronto.");
    } else if (sub.status === "failed") {
      alert(`No alcanzaste la nota mínima (${assignment.passScore}%). Revisa e inténtalo de nuevo.`);
    }
  });
}

function renderExamPlayer(item, row, done) {
  if (done) {
    return `<div class="campus-exam-result"><h3>✓ Examen completado</h3><p class="admin-muted">Ya has realizado este examen.</p></div>`;
  }

  const questions = item.shuffleQuestions ? shuffle([...item.questions]) : item.questions;

  setTimeout(() => {
    document.getElementById("examForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const form = e.target;
      const answers = questions.map((q, qi) => {
        if (q.type === "multi") {
          return [...form.querySelectorAll(`input[name="q${qi}"]:checked`)].map((el) => Number(el.value));
        }
        const picked = form.querySelector(`input[name="q${qi}"]:checked`);
        return picked ? Number(picked.value) : null;
      });
      const result = scoreExam({ ...item, questions }, answers);
      const passed = result.percent >= item.passScore;
      if (passed) markItemComplete(studentId, courseId, row.path, { examScore: result.percent });
      const resultEl = document.getElementById("examResult");
      resultEl.hidden = false;
      resultEl.className = `campus-exam-result ${passed ? "" : "is-fail"}`;
      resultEl.innerHTML = `
        <h3>${passed ? "✓ Aprobado" : "No aprobado"}</h3>
        <p>Puntuación: <strong>${result.percent}%</strong> (mínimo ${item.passScore}%)</p>
        ${passed ? `<button type="button" class="campus-btn campus-btn--gold" id="examNextBtn" style="margin-top:16px">Continuar</button>` : `<p class="admin-muted">Revisa el temario e inténtalo de nuevo.</p>`}`;
      if (passed) {
        document.getElementById("examNextBtn").onclick = () => {
          const next = getNextPath();
          if (next) {
            activePath = next;
            history.replaceState({}, "", `?id=${courseId}&item=${encodeURIComponent(activePath)}`);
          }
          renderAll();
        };
      } else {
        renderAll();
      }
    });
  }, 0);

  return `
    ${item.instructions ? `<p class="campus-content-intro">${escapeHtml(item.instructions)}</p>` : ""}
    <div class="preview-exam-meta">
      <span>${questions.length} preguntas</span>
      <span>${item.timeLimitMin} min</span>
      <span>Nota mínima: ${item.passScore}%</span>
    </div>
    ${renderBlocksPreview(item.blocks)}
    <form class="campus-exam-form" id="examForm">
      ${questions
        .map((q, qi) => {
          const opts = (q.options || []).map((opt, oi) => {
            const type = q.type === "multi" ? "checkbox" : "radio";
            return `<label><input type="${type}" name="q${qi}" value="${oi}" /> ${escapeHtml(opt)}</label>`;
          }).join("");
          return `<fieldset class="campus-exam-q"><legend>${qi + 1}. ${escapeHtml(q.text)}</legend>${opts}</fieldset>`;
        })
        .join("")}
      <button type="submit" class="campus-btn campus-btn--gold">Enviar examen</button>
    </form>
    <div id="examResult" hidden></div>`;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getNextPath() {
  const idx = curriculum.findIndex((r) => r.path === activePath);
  if (idx < 0 || idx >= curriculum.length - 1) return null;
  return curriculum[idx + 1].path;
}

function renderAll() {
  renderSidebar();
  renderContent();
}

renderAll();
