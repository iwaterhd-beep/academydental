import { requireStudent, logoutStudent } from "../js/auth.js";
import {
  getStudent,
  getStudentCourses,
  getStudentCourseProgress,
  getStudentProgress,
  getCourseCurriculum,
  isItemCompleted,
  isCurriculumItemUnlocked,
  getSubmissions,
  getCourse,
  getStudentCalendarEvents,
  getMessages,
  sendMessage,
  markStudentMessagesRead,
  getUnreadMessageCount,
  getCommunityAnnouncements,
  isCertificateEligible,
  getCourseCompletionDate,
  getPlatformSettings,
  getStudentPreferences,
  saveStudentPreferences,
  getSeenNotificationIds,
  markNotificationsSeen,
  getSeenTaskIds,
  markTasksSeen,
  resetStudentLearningData,
} from "../js/data.js";
import { loadLastLesson } from "./player-ui.js";
import { downloadCertificatePDF } from "./certificate.js";
import { renderInteractiveCalendar, bindInteractiveCalendar } from "./calendar-ui.js";
import { renderMessagesPage, bindMessagesPage, renderCommunityPage } from "./messages-ui.js";
import { buildStudentNotifications, renderNotificationPanel } from "./notifications-ui.js";
import { bindThemeToggle } from "../js/theme.js";

const studentId = requireStudent();
if (!studentId) throw new Error("unauthorized");

const student = getStudent(studentId);
const NAV = [
  { id: "inicio", label: "Inicio", icon: "◆" },
  { id: "cursos", label: "Mis cursos", icon: "▣" },
  { id: "calendario", label: "Calendario", icon: "◷" },
  { id: "tareas", label: "Tareas", icon: "◎" },
  { id: "comunidad", label: "Comunidad", icon: "◉" },
  { id: "mensajes", label: "Mensajes", icon: "✉" },
  { id: "certificados", label: "Certificados", icon: "✦" },
  { id: "ajustes", label: "Ajustes", icon: "⚙" },
];

const QUOTES = [
  "La excelencia en prótesis se construye lección a lección.",
  "Cada caso clínico es una oportunidad de perfeccionar tu arte.",
  "La estética anterior exige precisión, paciencia y práctica.",
];

let route = (location.hash || "#inicio").slice(1) || "inicio";
let searchQuery = "";
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let calSelectedDay = null;

document.getElementById("logoutBtn").onclick = logoutStudent;
document.getElementById("menuBtn")?.addEventListener("click", () => {
  document.body.classList.toggle("dash-nav-open");
});
document.getElementById("dashOverlay")?.addEventListener("click", () => {
  document.body.classList.remove("dash-nav-open");
});
document.getElementById("dashSearch")?.addEventListener("input", (e) => {
  searchQuery = e.target.value.trim().toLowerCase();
  if (route === "cursos" || route === "inicio") render();
});
window.addEventListener("hashchange", () => {
  route = (location.hash || "#inicio").slice(1) || "inicio";
  document.body.classList.remove("dash-nav-open");
  render();
});

window.addEventListener("storage", (e) => {
  if (e.key === "vallodental_academy_data") render();
});

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function firstName(name) {
  return (name || "Alumno").split(" ")[0];
}

function computeStats() {
  const courses = getStudentCourses(studentId);
  const progress = getStudentProgress(studentId);
  const submissions = getSubmissions({ studentId });

  let total = 0;
  let completed = 0;
  let studyMin = 0;
  courses.forEach((c) => {
    const p = getStudentCourseProgress(studentId, c.id);
    total += p.total;
    completed += p.completed;
    getCourseCurriculum(c).forEach((row) => {
      if (isItemCompleted(studentId, row.path) && row.item.kind === "lesson") {
        studyMin += row.item.durationMin || 15;
      }
    });
  });

  const days = new Set(
    progress.filter((p) => p.completedAt).map((p) => new Date(p.completedAt).toDateString())
  );
  const streak = days.size || (completed ? 1 : 0);
  const pendingTasks = submissions.filter((s) => s.status === "pending_review").length;
  const failedTasks = submissions.filter((s) => s.status === "failed").length;
  const overall = total ? Math.round((completed / total) * 100) : 0;
  const weekGoal = Math.min(100, Math.round((completed % 7) * 14 + overall * 0.15));

  return {
    courses,
    progress,
    submissions,
    total,
    completed,
    overall,
    studyMin,
    studyHours: (studyMin / 60).toFixed(1),
    streak,
    pendingTasks,
    failedTasks,
    weekGoal,
    xp: completed * 25 + submissions.filter((s) => s.status === "graded").length * 10,
    level: Math.floor(completed / 3) + 1,
    unreadMessages: getUnreadMessageCount(studentId),
  };
}

function findContinueTarget() {
  const courses = getStudentCourses(studentId);
  let best = null;

  courses.forEach((course) => {
    const prog = getStudentCourseProgress(studentId, course.id);
    if (prog.percent >= 100) return;
    const curriculum = getCourseCurriculum(course);
    const lastPath = loadLastLesson(studentId, course.id);
    const lastRow = lastPath ? curriculum.find((r) => r.path === lastPath) : null;
    const lastOk =
      lastRow &&
      isCurriculumItemUnlocked(course, lastRow, studentId) &&
      !isItemCompleted(studentId, lastPath);
    const next =
      lastOk
        ? lastRow
        : curriculum.find(
            (row) => isCurriculumItemUnlocked(course, row, studentId) && !isItemCompleted(studentId, row.path)
          );
    if (!next) return;
    const score = prog.percent + (prog.completed ? 10 : 0);
    if (!best || score > best.score) {
      best = {
        score,
        course,
        prog,
        item: next.item,
        path: next.path,
        url: `/campus/curso?id=${course.id}&item=${encodeURIComponent(next.path)}`,
      };
    }
  });

  if (best) return best;
  const c = courses[0];
  if (!c) return null;
  const curriculum = getCourseCurriculum(c);
  return {
    course: c,
    prog: getStudentCourseProgress(studentId, c.id),
    item: curriculum[0]?.item,
    path: curriculum[0]?.path,
    url: `/campus/curso?id=${c.id}`,
  };
}

function recentActivity(limit = 6) {
  const items = [];
  getStudentProgress(studentId)
    .filter((p) => p.completedAt)
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    .slice(0, limit)
    .forEach((p) => {
      const course = getCourse(p.courseId);
      const row = getCourseCurriculum(course).find((r) => r.path === p.path);
      items.push({
        title: row?.item?.title || "Elemento completado",
        course: course?.title,
        date: p.completedAt,
        kind: row?.item?.kind,
      });
    });
  getSubmissions({ studentId })
    .slice(0, 3)
    .forEach((s) => {
      items.push({
        title: s.itemTitle,
        course: getCourse(s.courseId)?.title,
        date: s.submittedAt,
        kind: s.kind === "exam" ? "exam" : "activity",
        status: s.status,
      });
    });
  return items.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);
}

function computeSmartGoals(stats) {
  const goals = [];
  const cont = findContinueTarget();
  if (cont?.item) {
    goals.push({
      icon: "▣",
      text: `Continúa: ${cont.item.title}`,
      href: cont.url,
    });
  }

  stats.submissions
    .filter((s) => s.status === "failed")
    .slice(0, 1)
    .forEach((s) => {
      goals.push({
        icon: "⚠",
        text: `Reintenta: ${s.itemTitle}`,
        href: `/campus/curso?id=${s.courseId}&item=${encodeURIComponent(s.path)}`,
      });
    });

  stats.courses.forEach((c) => {
    const p = getStudentCourseProgress(studentId, c.id);
    if (p.percent >= 50 && p.percent < 100 && c.settings?.certificateEnabled !== false) {
      goals.push({
        icon: "✦",
        text: `Certificado al 100% · ${c.title} (${p.percent}%)`,
        href: `/campus/curso?id=${c.id}`,
      });
    }
  });

  if (stats.pendingTasks) {
    goals.push({
      icon: "◎",
      text: `${stats.pendingTasks} entrega${stats.pendingTasks > 1 ? "s" : ""} en revisión`,
      href: "#tareas",
    });
  }

  goals.push({
    icon: "◷",
    text: `Objetivo semanal: ${stats.weekGoal}%`,
    href: "#calendario",
  });

  return goals.slice(0, 4);
}

let notifClickBound = false;

function getTaskAlertSubmissions(stats) {
  return stats.submissions.filter((s) => s.status === "pending_review" || s.status === "failed");
}

function getUnreadTaskCount(stats) {
  const seen = new Set(getSeenTaskIds(studentId));
  return getTaskAlertSubmissions(stats).filter((s) => !seen.has(s.id)).length;
}

function navBadgeHtml(navId, stats) {
  if (navId === "tareas") {
    const count = getUnreadTaskCount(stats);
    if (!count) return "";
    return `<span class="dash-nav-badge">${count > 9 ? "9+" : count}</span>`;
  }
  if (navId === "mensajes") {
    const count = stats.unreadMessages;
    if (!count) return "";
    return `<span class="dash-nav-badge">${count > 9 ? "9+" : count}</span>`;
  }
  return "";
}

function syncNavBadges(stats) {
  NAV.forEach((n) => {
    const item = document.querySelector(`.dash-nav-item[data-route="${n.id}"]`);
    if (!item) return;
    const badge = item.querySelector(".dash-nav-badge");
    const html = navBadgeHtml(n.id, stats);
    if (!html) {
      badge?.remove();
      return;
    }
    if (badge) badge.outerHTML = html;
    else item.insertAdjacentHTML("beforeend", html);
  });
}

function syncAlertBadges(stats = computeStats()) {
  updateNotifBadge(getUnreadNotifications(stats).length);
  syncNavBadges(stats);
}

function renderNav(stats) {
  const nav = document.getElementById("dashNav");
  if (!nav) return;
  nav.innerHTML = NAV.map(
    (n) => `
    <a href="#${n.id}" class="dash-nav-item ${route === n.id ? "is-active" : ""}" data-route="${n.id}">
      <span class="dash-nav-icon">${n.icon}</span>
      <span>${n.label}</span>
      ${navBadgeHtml(n.id, stats)}
    </a>`
  ).join("");
}

function dismissPageAlerts(routeId, stats) {
  if (routeId === "tareas") {
    markTasksSeen(
      studentId,
      getTaskAlertSubmissions(stats).map((s) => s.id)
    );
    syncAlertBadges(computeStats());
  }
  if (routeId === "mensajes") {
    markStudentMessagesRead(studentId);
    syncAlertBadges(computeStats());
  }
}

function getAllNotifications(stats) {
  return buildStudentNotifications({
    studentId,
    stats,
    getMessages,
    getCommunityAnnouncements,
    isCertificateEligible,
    getStudentCourseProgress,
  });
}

function getUnreadNotifications(stats) {
  const seen = new Set(getSeenNotificationIds(studentId));
  return getAllNotifications(stats).filter((n) => !seen.has(n.id));
}

function updateNotifBadge(unreadCount) {
  const badge = document.getElementById("notifBadge");
  if (!badge) return;
  if (unreadCount > 0) {
    badge.hidden = false;
    badge.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
  } else {
    badge.textContent = "";
    badge.hidden = true;
  }
}

function dismissNotifications(notifications) {
  if (!notifications.length) return;
  markNotificationsSeen(
    studentId,
    notifications.map((n) => n.id)
  );
  if (notifications.some((n) => n.type === "message")) {
    markStudentMessagesRead(studentId);
  }
  if (notifications.some((n) => n.type === "task" || n.type === "warn")) {
    const subIds = notifications
      .filter((n) => n.type === "task" || n.type === "warn")
      .map((n) => n.id.replace(/^sub-/, ""))
      .filter(Boolean);
    if (subIds.length) markTasksSeen(studentId, subIds);
  }
  syncAlertBadges(computeStats());
  document.querySelectorAll("[data-notif-id]").forEach((link) => {
    link.classList.add("is-seen");
  });
}

function bindNotificationPanel(stats) {
  const wrap = document.getElementById("notifWrap");
  if (!wrap) return;

  const all = getAllNotifications(stats);
  const seen = new Set(getSeenNotificationIds(studentId));

  wrap.innerHTML = renderNotificationPanel(all, escapeHtml, seen);
  syncAlertBadges(stats);

  const panel = document.getElementById("dashNotifPanel");
  const btn = document.getElementById("notifBtn");

  document.getElementById("closeNotifPanel")?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (panel) panel.hidden = true;
  });

  wrap.querySelectorAll("[data-notif-id]").forEach((link) => {
    link.addEventListener("click", () => {
      const id = link.dataset.notifId;
      const type = link.dataset.notifType;
      if (id) markNotificationsSeen(studentId, [id]);
      if (type === "message") {
        markStudentMessagesRead(studentId);
      }
      if (type === "task" || type === "warn") {
        const subId = id?.replace(/^sub-/, "");
        if (subId) markTasksSeen(studentId, [subId]);
      }
      link.classList.add("is-seen");
      syncAlertBadges(computeStats());
      if (panel) panel.hidden = true;
    });
  });

  btn.onclick = (e) => {
    e.stopPropagation();
    if (!panel) return;
    const opening = panel.hidden;
    panel.hidden = !panel.hidden;
    if (opening) {
      const freshUnread = getUnreadNotifications(computeStats());
      if (freshUnread.length) dismissNotifications(freshUnread);
    }
  };

  if (!notifClickBound) {
    notifClickBound = true;
    document.addEventListener("click", () => {
      const p = document.getElementById("dashNotifPanel");
      if (p) p.hidden = true;
    });
    wrap.addEventListener("click", (e) => e.stopPropagation());
    btn.addEventListener("click", (e) => e.stopPropagation());
  }
}

function applyBranding() {
  const brand = getPlatformSettings().branding.academyName || "Vallodental Academy";
  const parts = brand.trim().split(/\s+/);
  const tail = parts.length > 1 ? parts.pop() : "Academy";
  const head = parts.join(" ") || "Vallodental";
  const logo = document.querySelector(".dash-logo");
  if (logo) logo.innerHTML = `${escapeHtml(head)} <em>${escapeHtml(tail)}</em>`;
}

function renderShell(stats) {
  applyBranding();
  document.getElementById("dashProfile").innerHTML = `
    <div class="dash-avatar">${escapeHtml(firstName(student.name).charAt(0))}</div>
    <div>
      <p class="dash-profile-name">${escapeHtml(student.name)}</p>
      <p class="dash-profile-meta">Nivel ${stats.level} · ${stats.xp} XP</p>
    </div>`;

  document.getElementById("dashOverall").innerHTML = `
    <div class="dash-ring" style="--pct:${stats.overall}">
      <svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" /><circle cx="18" cy="18" r="15.5" class="dash-ring-fill" /></svg>
      <span>${stats.overall}%</span>
    </div>
    <div>
      <p class="dash-overall-label">Progreso global</p>
      <p class="dash-overall-meta">${stats.completed} de ${stats.total} lecciones</p>
    </div>`;

  renderNav(stats);

  document.getElementById("dashWeekPill").innerHTML = `<span>Objetivo semanal</span><strong>${stats.weekGoal}%</strong>`;
  document.getElementById("topbarUser").innerHTML = `
    <span class="dash-topbar-avatar">${escapeHtml(firstName(student.name).charAt(0))}</span>
    <span class="dash-topbar-name">${escapeHtml(firstName(student.name))}</span>`;

  bindNotificationPanel(stats);
}

function renderCourseCard(c, featured = false) {
  const prog = getStudentCourseProgress(studentId, c.id);
  const cont = findContinueTarget();
  const lastLesson =
    cont?.course?.id === c.id ? cont.item?.title : prog.completed ? "Curso casi completado" : "Comienza el temario";
  const filtered =
    !searchQuery ||
    [c.title, c.subtitle, c.category, c.instructor].join(" ").toLowerCase().includes(searchQuery);
  if (!filtered) return "";

  return `
    <article class="dash-course-card ${featured ? "dash-course-card--featured" : ""}">
      <a href="/campus/curso?id=${c.id}" class="dash-course-media" style="background-image:url('${escapeHtml(c.coverImage || "")}')">
        <div class="dash-course-media-overlay"></div>
        <div class="dash-course-progress-ring" style="--pct:${prog.percent}"><span>${prog.percent}%</span></div>
      </a>
      <div class="dash-course-body">
        <div class="dash-course-tags">
          <span>${escapeHtml(c.category)}</span>
          <span>${escapeHtml(c.level)}</span>
          <span>${c.durationHours}h</span>
        </div>
        <h3 class="dash-course-title">${escapeHtml(c.title)}</h3>
        <p class="dash-course-sub">${escapeHtml(c.subtitle)}</p>
        <p class="dash-course-meta">Prof. ${escapeHtml(c.instructor)} · ${prog.completed}/${prog.total} completados</p>
        <p class="dash-course-last">↳ ${escapeHtml(lastLesson)}</p>
        <div class="dash-progress dash-progress--lg">
          <div class="campus-progress-bar"><div class="campus-progress-fill" style="width:${prog.percent}%"></div></div>
        </div>
        <a href="/campus/curso?id=${c.id}${cont?.course?.id === c.id && cont.path ? `&item=${encodeURIComponent(cont.path)}` : ""}" class="campus-btn campus-btn--gold dash-course-btn">
          ${prog.percent >= 100 ? "Repasar curso" : prog.percent ? "Continuar" : "Empezar curso"}
        </a>
      </div>
    </article>`;
}

function renderHome(stats) {
  const cont = findContinueTarget();
  const quote = QUOTES[new Date().getDate() % QUOTES.length];
  const activity = recentActivity();
  const goals = computeSmartGoals(stats);
  const platform = getPlatformSettings();
  const announcements = getCommunityAnnouncements(studentId).slice(0, 3);
  const prefs = getStudentPreferences(studentId);
  const showCommunity = prefs.showCommunityActivity && platform.communication.communityEnabled;

  return `
    <section class="dash-hero">
      <div class="dash-hero-glow"></div>
      <div class="dash-hero-content">
        <p class="login-kicker">Bienvenido de nuevo</p>
        <h1>Hola, <em>${escapeHtml(firstName(student.name))}</em></h1>
        <p class="dash-hero-quote">${quote}</p>
        <div class="dash-hero-stats">
          <div class="dash-stat-card"><span class="dash-stat-value">${stats.overall}%</span><span class="dash-stat-label">Progreso total</span></div>
          <div class="dash-stat-card"><span class="dash-stat-value">${stats.studyHours}h</span><span class="dash-stat-label">Horas estudiadas</span></div>
          <div class="dash-stat-card"><span class="dash-stat-value">${stats.streak}</span><span class="dash-stat-label">Días activo</span></div>
          <div class="dash-stat-card"><span class="dash-stat-value">${stats.pendingTasks}</span><span class="dash-stat-label">Tareas pendientes</span></div>
        </div>
      </div>
      ${
        cont
          ? `<a href="${cont.url}" class="dash-continue-card">
              <div class="dash-continue-bg" style="background-image:url('${escapeHtml(cont.course.coverImage || "")}')"></div>
              <div class="dash-continue-inner">
                <p class="login-kicker">Continuar aprendiendo</p>
                <h2>${escapeHtml(cont.item?.title || cont.course.title)}</h2>
                <p>${escapeHtml(cont.course.title)} · ${cont.prog.percent}% completado</p>
                <span class="campus-btn campus-btn--gold">Reanudar →</span>
              </div>
            </a>`
          : ""
      }
    </section>

    ${
      showCommunity && announcements.length
        ? `<section class="dash-community-strip">
            <div class="dash-section-head">
              <h2>Comunidad</h2>
              <a href="#comunidad" class="dash-link">Ver todos</a>
            </div>
            <div class="dash-community-strip-grid">
              ${announcements
                .map(
                  (a) => `
                <a href="#comunidad" class="dash-strip-card ${a.pinned ? "is-pinned" : ""}">
                  <span>${a.icon}</span>
                  <div>
                    <strong>${escapeHtml(a.title)}</strong>
                    <p>${escapeHtml(a.text.slice(0, 70))}${a.text.length > 70 ? "…" : ""}</p>
                  </div>
                </a>`
                )
                .join("")}
            </div>
          </section>`
        : ""
    }

    <section class="dash-section">
      <div class="dash-section-head">
        <h2>Tus cursos</h2>
        <a href="#cursos" class="dash-link">Ver todos</a>
      </div>
      <div class="dash-course-grid">${stats.courses.map((c) => renderCourseCard(c)).join("") || `<p class="admin-muted">No tienes cursos asignados.</p>`}</div>
    </section>

    <div class="dash-widgets">
      <section class="dash-widget dash-widget--wide">
        <h3 class="dash-widget-title">Actividad reciente</h3>
        <ul class="dash-timeline">
          ${activity.length ? activity.map((a) => `
            <li>
              <span class="dash-timeline-dot"></span>
              <div>
                <strong>${escapeHtml(a.title)}</strong>
                <span>${escapeHtml(a.course || "")} · ${new Date(a.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</span>
              </div>
            </li>`).join("") : `<li class="dash-empty">Aún no hay actividad registrada.</li>`}
        </ul>
      </section>
      <section class="dash-widget">
        <h3 class="dash-widget-title">Logros</h3>
        <div class="dash-badges">
          <div class="dash-badge-item ${stats.completed >= 1 ? "is-unlocked" : ""}"><span>🎯</span><p>Primer paso</p></div>
          <div class="dash-badge-item ${stats.streak >= 3 ? "is-unlocked" : ""}"><span>🔥</span><p>Racha 3 días</p></div>
          <div class="dash-badge-item ${stats.overall >= 50 ? "is-unlocked" : ""}"><span>⭐</span><p>50% curso</p></div>
          <div class="dash-badge-item ${stats.overall >= 100 ? "is-unlocked" : ""}"><span>🏆</span><p>Curso completado</p></div>
        </div>
      </section>
      <section class="dash-widget">
        <h3 class="dash-widget-title">Próximos objetivos</h3>
        <ul class="dash-goals">
          ${goals.map((g) => `<li><a href="${escapeHtml(g.href)}"><span>${g.icon}</span> ${escapeHtml(g.text)}</a></li>`).join("")}
        </ul>
      </section>
    </div>`;
}

function renderCourses(stats) {
  return `
    <header class="dash-page-head">
      <p class="login-kicker">Formación</p>
      <h1>Mis <em>cursos</em></h1>
      <p class="admin-muted">${stats.courses.length} curso${stats.courses.length !== 1 ? "s" : ""} · ${stats.overall}% progreso global</p>
    </header>
    <div class="dash-course-grid dash-course-grid--page">${stats.courses.map((c) => renderCourseCard(c, true)).join("") || `<p class="admin-muted">No tienes cursos.</p>`}</div>`;
}

function taskStatusLabel(s) {
  if (s.status === "pending_review") return { label: "En revisión", cls: "pending" };
  if (s.status === "failed") return { label: "No aprobado", cls: "fail" };
  if (s.status === "graded") return { label: "Corregida", cls: "done" };
  return { label: s.status, cls: "" };
}

function renderTasks(stats) {
  const subs = stats.submissions;
  return `
    <header class="dash-page-head">
      <p class="login-kicker">Evaluación</p>
      <h1>Tareas y <em>entregas</em></h1>
    </header>
    <div class="dash-task-grid">
      ${subs.length ? subs.map((s) => {
        const st = taskStatusLabel(s);
        const course = getCourse(s.courseId);
        return `<article class="dash-task-card dash-task-card--${st.cls}" data-submission-id="${escapeHtml(s.id)}">
          <div class="dash-task-head">
            <span class="dash-task-type">${s.kind === "exam" ? "Examen" : "Actividad"}</span>
            <span class="dash-task-status">${st.label}</span>
          </div>
          <h3>${escapeHtml(s.itemTitle)}</h3>
          <p class="admin-muted">${escapeHtml(course?.title || "")} · ${new Date(s.submittedAt).toLocaleDateString("es-ES")}</p>
          ${s.status === "graded" && s.feedback ? `<p class="dash-task-feedback">${escapeHtml(s.feedback)}</p>` : ""}
          ${s.status === "graded" ? `<p class="dash-task-score">Nota: ${s.totalScore}/${s.maxScore}</p>` : ""}
          <a href="/campus/curso?id=${s.courseId}&item=${encodeURIComponent(s.path)}" class="dash-link dash-task-link" data-submission-id="${escapeHtml(s.id)}">Ver en el curso →</a>
        </article>`;
      }).join("") : `<div class="dash-empty-state"><p>No tienes entregas todavía.</p></div>`}
    </div>`;
}

function bindTasks() {
  document.querySelectorAll("[data-submission-id]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.dataset.submissionId;
      if (id) {
        markTasksSeen(studentId, [id]);
        syncAlertBadges(computeStats());
      }
    });
  });
}

function renderCalendar() {
  const events = getStudentCalendarEvents(studentId);
  return `
    <header class="dash-page-head">
      <p class="login-kicker">Planificación</p>
      <h1>Calendario</h1>
    </header>
    <div id="calRoot">${renderInteractiveCalendar(events, { year: calYear, month: calMonth, selectedDay: calSelectedDay })}</div>`;
}

function bindCalendar() {
  const root = document.getElementById("calRoot");
  if (!root) return;
  bindInteractiveCalendar(root, {
    year: calYear,
    month: calMonth,
    onMonthChange: (y, m) => {
      calYear = y;
      calMonth = m;
      calSelectedDay = null;
      refreshCalendarView();
    },
    onDaySelect: (day) => {
      calSelectedDay = calSelectedDay === day ? null : day;
      refreshCalendarView();
    },
  });
}

function refreshCalendarView() {
  const root = document.getElementById("calRoot");
  if (!root) return;
  const events = getStudentCalendarEvents(studentId);
  root.innerHTML = renderInteractiveCalendar(events, { year: calYear, month: calMonth, selectedDay: calSelectedDay });
  bindInteractiveCalendar(root, {
    year: calYear,
    month: calMonth,
    onMonthChange: (y, m) => {
      calYear = y;
      calMonth = m;
      calSelectedDay = null;
      refreshCalendarView();
    },
    onDaySelect: (day) => {
      calSelectedDay = calSelectedDay === day ? null : day;
      refreshCalendarView();
    },
  });
}

function renderCertificates(stats) {
  const certs = stats.courses.filter((c) => isCertificateEligible(studentId, c.id));
  const near = stats.courses.filter((c) => {
    const p = getStudentCourseProgress(studentId, c.id);
    return p.percent >= 50 && p.percent < 100 && c.settings?.certificateEnabled !== false;
  });
  return `
    <header class="dash-page-head">
      <p class="login-kicker">Logros</p>
      <h1>Certificados</h1>
    </header>
    ${
      certs.length
        ? `<div class="dash-cert-grid">${certs
            .map((c) => {
              const completedAt = getCourseCompletionDate(studentId, c.id);
              return `
          <article class="dash-cert-card">
            <div class="dash-cert-preview">
              <p class="login-kicker">${escapeHtml(getPlatformSettings().certificates.issuerName)}</p>
              <h3>${escapeHtml(c.title)}</h3>
              <p>${escapeHtml(student.name)}</p>
              ${completedAt ? `<p class="admin-muted">${new Date(completedAt).toLocaleDateString("es-ES")}</p>` : ""}
            </div>
            <button type="button" class="campus-btn campus-btn--gold dash-cert-dl" data-cert-id="${escapeHtml(c.id)}">Descargar PDF</button>
          </article>`;
            })
            .join("")}</div>`
        : `<div class="dash-empty-state">
            <p>Completa un curso al <strong>100%</strong> para desbloquear tu certificado oficial.</p>
            ${near.length ? `<p class="admin-muted" style="margin-top:12px">Cerca del certificado: ${near.map((c) => escapeHtml(c.title)).join(", ")}</p>` : ""}
          </div>`
    }`;
}

function bindCertificates() {
  document.querySelectorAll(".dash-cert-dl").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const course = getCourse(btn.dataset.certId);
      if (!course) return;
      btn.disabled = true;
      const label = btn.textContent;
      btn.textContent = "Generando PDF…";
      try {
        await downloadCertificatePDF({
          studentName: student.name,
          courseTitle: course.title,
          instructor: course.instructor || getPlatformSettings().certificates.directorName,
          completedAt: getCourseCompletionDate(studentId, course.id),
          courseId: course.id,
          issuerName: getPlatformSettings().certificates.issuerName,
        });
      } catch {
        alert("No se pudo generar el PDF. Comprueba tu conexión e inténtalo de nuevo.");
      }
      btn.disabled = false;
      btn.textContent = label;
    });
  });
}

function bindMessages() {
  const layout = document.querySelector(".dash-chat-layout");
  if (!layout) return;
  bindMessagesPage(layout.parentElement, {
    studentId,
    studentName: student.name,
    onMarkRead: () => {
      markStudentMessagesRead(studentId);
      syncAlertBadges(computeStats());
    },
    onSend: ({ courseId, text }) => {
      sendMessage({ studentId, courseId, text, from: "student", senderName: student.name });
      document.getElementById("dashMain").innerHTML = renderMessages();
      bindMessages();
      syncAlertBadges(computeStats());
    },
  });
}

function renderCommunity(stats) {
  return renderCommunityPage({
    announcements: getCommunityAnnouncements(studentId),
    courses: stats.courses,
    academyName: getPlatformSettings().branding.academyName,
  });
}

function renderSettings() {
  const stats = computeStats();
  const platform = getPlatformSettings();
  const prefs = getStudentPreferences(studentId);

  return `
    <header class="dash-page-head">
      <p class="login-kicker">Cuenta</p>
      <h1>Ajustes</h1>
    </header>
    <div class="dash-settings dash-settings--premium">
      <section class="dash-settings-card dash-settings-profile">
        <div class="dash-avatar dash-avatar--lg">${escapeHtml(firstName(student.name).charAt(0))}</div>
        <div>
          <h3>${escapeHtml(student.name)}</h3>
          <p class="admin-muted">${escapeHtml(student.email)}</p>
          <p class="dash-settings-meta">Nivel ${stats.level} · ${stats.xp} XP · ${stats.overall}% progreso</p>
        </div>
        <div class="dash-ring dash-ring--settings" style="--pct:${stats.overall}">
          <svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" /><circle cx="18" cy="18" r="15.5" class="dash-ring-fill" /></svg>
          <span>${stats.overall}%</span>
        </div>
      </section>

      <section class="dash-settings-card">
        <h4>Preferencias</h4>
        <div class="dash-pref-list">
          ${[
            { key: "emailReminders", label: "Recordatorios por email", sub: "Avisos de entregas y mensajes" },
            { key: "studyReminders", label: "Recordatorios de estudio", sub: "Objetivo semanal y racha" },
            { key: "showCommunityActivity", label: "Actividad en comunidad", sub: "Anuncios en inicio del campus" },
            { key: "compactDashboard", label: "Vista compacta", sub: "Menos espaciado en el dashboard" },
          ]
            .map(
              (p) => `
            <label class="dash-pref-row">
              <div><strong>${p.label}</strong><span>${p.sub}</span></div>
              <input type="checkbox" class="dash-pref-toggle" data-pref="${p.key}" ${prefs[p.key] ? "checked" : ""} />
              <span class="dash-pref-slider"></span>
            </label>`
            )
            .join("")}
        </div>
      </section>

      <section class="dash-settings-card">
        <h4>Academia</h4>
        <p class="admin-muted">${escapeHtml(platform.branding.tagline)}</p>
        <p class="dash-settings-welcome">${escapeHtml(platform.communication.welcomeMessage)}</p>
        <a href="mailto:${escapeHtml(platform.branding.supportEmail)}" class="dash-link">${escapeHtml(platform.branding.supportEmail)}</a>
      </section>

      <section class="dash-settings-card dash-settings-card--danger">
        <h4>Reiniciar formación</h4>
        <p class="admin-muted">Borra tu progreso, entregas, XP y estadísticas. Esta acción no se puede deshacer.</p>
        <button type="button" class="campus-btn campus-btn--ghost dash-reset-btn" id="resetProgressBtn">Reiniciar mi progreso</button>
      </section>

      <button type="button" class="campus-btn campus-btn--ghost" id="logoutBtn2">Cerrar sesión</button>
    </div>`;
}

function bindSettings() {
  document.getElementById("resetProgressBtn")?.addEventListener("click", () => {
    if (!window.confirm("¿Reiniciar todo tu progreso, tareas y entregas? Volverás a empezar el curso desde cero.")) {
      return;
    }
    resetStudentLearningData(studentId);
    location.href = "/campus/#inicio";
    location.reload();
  });
  document.querySelectorAll(".dash-pref-toggle").forEach((input) => {
    input.addEventListener("change", () => {
      saveStudentPreferences(studentId, { [input.dataset.pref]: input.checked });
      if (input.dataset.pref === "compactDashboard") {
        document.body.classList.toggle("dash-compact", input.checked);
      }
      if (input.dataset.pref === "showCommunityActivity" && route === "inicio") render();
    });
  });
  document.body.classList.toggle("dash-compact", getStudentPreferences(studentId).compactDashboard);
}

function renderMessages() {
  const courses = getStudentCourses(studentId);
  const messages = getMessages({ studentId });
  const platform = getPlatformSettings();
  return renderMessagesPage({
    messages,
    courses,
    studentName: student.name,
    teacherName: platform.communication.teacherName,
  });
}

function render() {
  document.body.classList.toggle("dash-compact", getStudentPreferences(studentId).compactDashboard);
  dismissPageAlerts(route, computeStats());
  const stats = computeStats();
  renderShell(stats);
  const main = document.getElementById("dashMain");

  let html = "";
  switch (route) {
    case "cursos":
      html = renderCourses(stats);
      break;
    case "tareas":
      html = renderTasks(stats);
      break;
    case "calendario":
      html = renderCalendar();
      break;
    case "certificados":
      html = renderCertificates(stats);
      break;
    case "comunidad":
      html = renderCommunity(stats);
      break;
    case "mensajes":
      html = renderMessages();
      break;
    case "ajustes":
      html = renderSettings();
      break;
    default:
      html = renderHome(stats);
  }

  main.innerHTML = html;
  document.getElementById("logoutBtn2")?.addEventListener("click", logoutStudent);
  document.querySelectorAll("[data-route]").forEach((el) => {
    if (el.tagName === "BUTTON") el.onclick = () => { location.hash = el.dataset.route; };
  });
  bindCalendar();
  bindCertificates();
  bindMessages();
  bindTasks();
  bindSettings();
}

render();
bindThemeToggle();
