import { initAdminShell, showToast, escapeHtml } from "./shell.js";
import {
  getMessageThreads,
  getMessages,
  sendMessage,
  markTeacherMessagesRead,
  getStudent,
  getPlatformSettings,
} from "../js/data.js";

initAdminShell("mensajes");

let selectedStudentId = null;

const threadList = document.getElementById("threadList");
const msgPanel = document.getElementById("msgPanel");

function renderThreads() {
  const threads = getMessageThreads();
  if (!threads.length) {
    threadList.innerHTML = `<p class="admin-muted" style="padding:20px">Sin conversaciones todavía.</p>`;
    return;
  }
  threadList.innerHTML = threads
    .map(
      (t) => `
    <button type="button" class="admin-msg-thread ${selectedStudentId === t.studentId ? "is-active" : ""}" data-student="${escapeHtml(t.studentId)}">
      <span class="corr-student-avatar">${escapeHtml((t.student?.name || "?").charAt(0).toUpperCase())}</span>
      <span class="admin-msg-thread-body">
        <strong>${escapeHtml(t.student?.name || "Alumno")}</strong>
        <span class="admin-muted">${escapeHtml(t.lastText?.slice(0, 60) || "")}${t.lastText?.length > 60 ? "…" : ""}</span>
      </span>
      ${t.unread ? `<span class="admin-msg-unread">${t.unread}</span>` : ""}
    </button>`
    )
    .join("");

  threadList.querySelectorAll("[data-student]").forEach((btn) => {
    btn.onclick = () => {
      selectedStudentId = btn.dataset.student;
      renderThreads();
      renderPanel();
    };
  });
}

function renderPanel() {
  if (!selectedStudentId) return;
  const student = getStudent(selectedStudentId);
  const messages = getMessages({ studentId: selectedStudentId });
  markTeacherMessagesRead(selectedStudentId);

  msgPanel.innerHTML = `
    <header class="admin-msg-head">
      <div>
        <h3>${escapeHtml(student?.name || "Alumno")}</h3>
        <p class="admin-muted">${escapeHtml(student?.email || "")}</p>
      </div>
    </header>
    <div class="admin-msg-chat" id="adminChatThread">
      ${messages
        .map(
          (m) => `
        <div class="admin-msg-bubble admin-msg-bubble--${m.from}">
          <span class="admin-msg-meta">${escapeHtml(m.senderName || (m.from === "teacher" ? "Profesor" : "Alumno"))} · ${new Date(m.createdAt).toLocaleString("es-ES")}</span>
          <p>${escapeHtml(m.text)}</p>
        </div>`
        )
        .join("")}
    </div>
    <form class="admin-msg-compose" id="adminChatForm">
      <textarea id="adminChatInput" rows="3" placeholder="Escribe tu respuesta…" required></textarea>
      <button type="submit" class="admin-btn admin-btn--gold">Enviar respuesta</button>
    </form>`;

  const thread = document.getElementById("adminChatThread");
  thread?.scrollTo(0, thread.scrollHeight);

  document.getElementById("adminChatForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = document.getElementById("adminChatInput")?.value?.trim();
    if (!text) return;
    const lastCourse = messages[messages.length - 1]?.courseId || student?.courseIds?.[0];
    sendMessage({
      studentId: selectedStudentId,
      courseId: lastCourse,
      text,
      from: "teacher",
      senderName: getPlatformSettings().communication.teacherName,
    });
    showToast("Respuesta enviada");
    renderThreads();
    renderPanel();
  });
}

renderThreads();
