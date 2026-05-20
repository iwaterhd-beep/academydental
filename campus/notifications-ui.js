/** Centro de notificaciones — campus alumno */

export function buildStudentNotifications({
  studentId,
  stats,
  getMessages,
  getCommunityAnnouncements,
  isCertificateEligible,
  getStudentCourseProgress,
}) {
  const items = [];

  getMessages({ studentId })
    .filter((m) => m.from === "teacher" && !m.read)
    .slice(-5)
    .forEach((m) => {
      items.push({
        id: `msg-${m.id}`,
        icon: "✉",
        title: "Mensaje del profesor",
        text: m.text.slice(0, 90) + (m.text.length > 90 ? "…" : ""),
        date: m.createdAt,
        href: "#mensajes",
        type: "message",
      });
    });

  stats.submissions
    .filter((s) => s.status === "pending_review" || s.status === "failed")
    .forEach((s) => {
      items.push({
        id: `sub-${s.id}`,
        icon: s.status === "failed" ? "⚠" : "◎",
        title: s.status === "failed" ? "Entrega no aprobada" : "Entrega en revisión",
        text: s.itemTitle,
        date: s.submittedAt,
        href: `/campus/curso?id=${s.courseId}&item=${encodeURIComponent(s.path)}`,
        type: s.status === "failed" ? "warn" : "task",
      });
    });

  getCommunityAnnouncements(studentId)
    .filter((a) => a.pinned || a.isAdmin)
    .slice(0, 3)
    .forEach((a) => {
      items.push({
        id: `ann-${a.id}`,
        icon: a.icon || "📢",
        title: a.title,
        text: a.text.slice(0, 80) + (a.text.length > 80 ? "…" : ""),
        date: a.date,
        href: "#comunidad",
        type: "community",
      });
    });

  stats.courses.forEach((c) => {
    if (isCertificateEligible(studentId, c.id)) {
      items.push({
        id: `cert-${c.id}`,
        icon: "✦",
        title: "Certificado disponible",
        text: `Has completado «${c.title}». Descarga tu PDF.`,
        date: new Date().toISOString(),
        href: "#certificados",
        type: "cert",
      });
    } else {
      const p = getStudentCourseProgress(studentId, c.id);
      if (p.percent >= 75 && p.percent < 100) {
        items.push({
          id: `near-${c.id}`,
          icon: "🎯",
          title: "Cerca del certificado",
          text: `${c.title} · ${p.percent}% completado`,
          date: new Date().toISOString(),
          href: `/campus/curso?id=${c.id}`,
          type: "goal",
        });
      }
    }
  });

  return items.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 12);
}

export function renderNotificationPanel(notifications, escapeHtml, seenIds = new Set()) {
  return `
    <div class="dash-notif-panel" id="dashNotifPanel" hidden>
      <header class="dash-notif-head">
        <div>
          <p class="login-kicker">Centro</p>
          <h3>Notificaciones</h3>
        </div>
        <button type="button" class="dash-notif-close" id="closeNotifPanel" aria-label="Cerrar">×</button>
      </header>
      <div class="dash-notif-list">
        ${
          notifications.length
            ? notifications
                .map(
                  (n) => `
          <a href="${escapeHtml(n.href)}" class="dash-notif-item dash-notif-item--${n.type} ${seenIds.has(n.id) ? "is-seen" : ""}" data-notif-id="${escapeHtml(n.id)}" data-notif-type="${escapeHtml(n.type)}">
            <span class="dash-notif-icon">${n.icon}</span>
            <div>
              <strong>${escapeHtml(n.title)}</strong>
              <p>${escapeHtml(n.text)}</p>
              <time>${new Date(n.date).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time>
            </div>
          </a>`
                )
                .join("")
            : `<p class="dash-notif-empty">Estás al día. ¡Sigue aprendiendo!</p>`
        }
      </div>
    </div>`;
}
