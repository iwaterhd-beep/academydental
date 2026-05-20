/** Chat alumno / UI mensajes */

export function escapeMsg(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderMessagesPage({ messages, courses, studentName, teacherName = "Profesor" }) {
  const teacherInitials = teacherName
    .split(" ")
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const courseOptions = courses
    .map((c) => `<option value="${escapeMsg(c.id)}">${escapeMsg(c.title)}</option>`)
    .join("");

  return `
    <header class="dash-page-head">
      <p class="login-kicker">Comunicación</p>
      <h1>Mensajes con tu profesor</h1>
    </header>
    <div class="dash-chat-layout">
      <aside class="dash-chat-side">
        <div class="dash-chat-prof">
          <div class="dash-chat-avatar">${teacherInitials}</div>
          <div>
            <strong>${escapeMsg(teacherName)}</strong>
            <p class="admin-muted">Director · Respuesta en 24-48h</p>
          </div>
        </div>
        <label class="dash-chat-course-label">Curso relacionado
          <select class="dash-chat-course" id="msgCourseSelect">${courseOptions}</select>
        </label>
        <p class="admin-muted dash-chat-tip">Consultas sobre contenido, entregas o exámenes.</p>
      </aside>
      <div class="dash-chat-main">
        <div class="dash-chat-thread" id="chatThread">${renderMessageBubbles(messages)}</div>
        <form class="dash-chat-compose" id="chatForm">
          <textarea id="chatInput" rows="2" placeholder="Escribe tu mensaje al profesor…" required></textarea>
          <button type="submit" class="campus-btn campus-btn--gold">Enviar</button>
        </form>
      </div>
    </div>`;
}

function renderMessageBubbles(messages) {
  if (!messages.length) {
    return `<div class="dash-chat-empty"><p>Aún no hay mensajes. ¡Saluda a tu profesor!</p></div>`;
  }
  return messages
    .map(
      (m) => `
    <div class="dash-chat-bubble dash-chat-bubble--${m.from === "teacher" ? "teacher" : "student"}">
      <span class="dash-chat-bubble-meta">${escapeMsg(m.senderName || (m.from === "teacher" ? "Profesor" : "Tú"))} · ${new Date(m.createdAt).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
      <p>${escapeMsg(m.text)}</p>
    </div>`
    )
    .join("");
}

export function bindMessagesPage(container, { studentId, studentName, onSend, onMarkRead }) {
  onMarkRead?.();
  const thread = container.querySelector("#chatThread");
  thread?.scrollTo(0, thread.scrollHeight);

  container.querySelector("#chatForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = container.querySelector("#chatInput");
    const courseId = container.querySelector("#msgCourseSelect")?.value || null;
    const text = input?.value?.trim();
    if (!text) return;
    onSend({ studentId, courseId, text, senderName: studentName });
    input.value = "";
  });
}

export function renderCommunityPage({ announcements, courses, academyName = "Vallodental Academy" }) {
  return `
    <header class="dash-page-head">
      <p class="login-kicker">Comunidad</p>
      <h1>Anuncios y actividad</h1>
    </header>
    <div class="dash-community-grid">
      <section class="dash-community-feed">
        <h2 class="dash-section-title">Anuncios del curso</h2>
        ${announcements.length
          ? announcements
              .map(
                (a) => `
          <article class="dash-announce-card ${a.pinned ? "is-pinned" : ""}">
            <span class="dash-announce-icon">${a.icon}</span>
            <div>
              <p class="login-kicker">${escapeMsg(a.courseTitle || academyName)}${a.pinned ? " · Fijado" : ""}</p>
              <h3>${escapeMsg(a.title)}</h3>
              <p>${escapeMsg(a.text)}</p>
              <time>${new Date(a.date).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</time>
            </div>
          </article>`
              )
              .join("")
          : `<div class="dash-empty-state"><p>No hay anuncios todavía.</p></div>`}
      </section>
      <aside class="dash-community-side">
        <h2 class="dash-section-title">Tus cursos</h2>
        <ul class="dash-community-courses">
          ${courses.map((c) => `<li><a href="#cursos">${escapeMsg(c.title)}</a></li>`).join("")}
        </ul>
        <a href="#mensajes" class="campus-btn campus-btn--gold" style="margin-top:20px;width:100%">💬 Mensaje al profesor</a>
      </aside>
    </div>`;
}
