/** Calendario interactivo — campus alumno */

export function escapeCal(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const TYPE_COLORS = {
  live: "var(--gold)",
  deadline: "#d4847a",
  examen: "#7eb8da",
  entrega: "#8ec5a3",
  progreso: "#888",
};

export function renderInteractiveCalendar(events, { year, month, selectedDay = null }) {
  const first = new Date(year, month, 1);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = first.toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  const byDay = new Map();
  events.forEach((ev) => {
    const d = new Date(ev.date);
    if (d.getFullYear() !== year || d.getMonth() !== month) return;
    const key = d.getDate();
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(ev);
  });

  const weekDays = ["L", "M", "X", "J", "V", "S", "D"];
  let cells = "";
  for (let i = 0; i < startPad; i++) cells += `<div class="dash-cal-cell dash-cal-cell--empty"></div>`;

  const today = new Date();
  for (let d = 1; d <= daysInMonth; d++) {
    const dayEvents = byDay.get(d) || [];
    const isToday =
      today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
    const isSelected = selectedDay === d;
    cells += `
      <button type="button" class="dash-cal-cell ${isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""} ${dayEvents.length ? "has-events" : ""}"
        data-cal-day="${d}" aria-label="${d} de ${monthLabel}">
        <span class="dash-cal-day-num">${d}</span>
        ${dayEvents.length ? `<span class="dash-cal-dots">${dayEvents.slice(0, 3).map((e) => `<i style="background:${TYPE_COLORS[e.type] || "var(--gold)"}"></i>`).join("")}</span>` : ""}
      </button>`;
  }

  const dayEvents =
    selectedDay != null ? (byDay.get(selectedDay) || []) : events.filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === year && d.getMonth() === month;
    }).slice(0, 8);

  const upcoming = [...events]
    .filter((e) => new Date(e.date) >= new Date(new Date().setHours(0, 0, 0, 0)))
    .slice(0, 6);

  return `
    <div class="dash-cal-interactive">
      <div class="dash-cal-grid-wrap">
        <div class="dash-cal-grid-head">
          <button type="button" class="dash-cal-nav" id="calPrev" aria-label="Mes anterior">←</button>
          <h2 class="dash-cal-month">${escapeCal(monthLabel)}</h2>
          <button type="button" class="dash-cal-nav" id="calNext" aria-label="Mes siguiente">→</button>
        </div>
        <div class="dash-cal-weekdays">${weekDays.map((w) => `<span>${w}</span>`).join("")}</div>
        <div class="dash-cal-grid">${cells}</div>
        <div class="dash-cal-legend">
          <span><i style="background:var(--gold)"></i> En directo</span>
          <span><i style="background:#d4847a"></i> Fecha límite</span>
          <span><i style="background:#7eb8da"></i> Examen</span>
          <span><i style="background:#8ec5a3"></i> Entrega</span>
        </div>
      </div>
      <div class="dash-cal-detail">
        <h3>${selectedDay != null ? `Eventos — ${selectedDay} ${monthLabel.split(" ")[0]}` : "Próximos eventos"}</h3>
        <ul class="dash-cal-event-list">
          ${(selectedDay != null ? dayEvents : upcoming).length
            ? (selectedDay != null ? dayEvents : upcoming)
                .map(
                  (e) => `
            <li class="dash-cal-event dash-cal-event--${e.type}">
              <span class="dash-cal-type">${escapeCal(e.type)}</span>
              <strong>${escapeCal(e.title)}</strong>
              <p class="admin-muted">${escapeCal(e.courseTitle)}${e.meta ? ` · ${escapeCal(e.meta)}` : ""}</p>
              <time>${new Date(e.date).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time>
            </li>`
                )
                .join("")
            : `<li class="dash-empty">Sin eventos ${selectedDay != null ? "este día" : "próximos"}.</li>`}
        </ul>
      </div>
    </div>`;
}

export function bindInteractiveCalendar(container, { year, month, onMonthChange, onDaySelect }) {
  container.querySelector("#calPrev")?.addEventListener("click", () => {
    const d = new Date(year, month - 1, 1);
    onMonthChange(d.getFullYear(), d.getMonth(), null);
  });
  container.querySelector("#calNext")?.addEventListener("click", () => {
    const d = new Date(year, month + 1, 1);
    onMonthChange(d.getFullYear(), d.getMonth(), null);
  });
  container.querySelectorAll("[data-cal-day]").forEach((btn) => {
    btn.addEventListener("click", () => {
      onDaySelect(Number(btn.dataset.calDay));
    });
  });
}
