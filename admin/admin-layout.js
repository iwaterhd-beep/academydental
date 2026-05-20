/** Premium admin shell — Vallodental Academy */
import { getStats, getSubmissions, getTeacherUnreadCount, getCourses, getPlatformSettings } from "../js/data.js";
import { themeToggleButton, bindThemeToggle } from "../js/theme.js";

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const ADMIN_NAV = [
  {
    section: "General",
    items: [
      { id: "dashboard", label: "Dashboard", href: "/admin/", icon: "◆" },
      { id: "progreso", label: "Analíticas", href: "/admin/progreso", icon: "▣" },
    ],
  },
  {
    section: "Academia",
    items: [
      { id: "cursos", label: "Cursos", href: "/admin/cursos", icon: "▤" },
      { id: "builder", label: "Constructor", href: "/admin/curso-editor?new=1", icon: "✦" },
      { id: "alumnos", label: "Alumnos", href: "/admin/alumnos", icon: "◉" },
      { id: "correcciones", label: "Correcciones", href: "/admin/correcciones", icon: "◎", badge: "pending" },
    ],
  },
  {
    section: "Comunicación",
    items: [
      { id: "mensajes", label: "Mensajes", href: "/admin/mensajes", icon: "✉", badge: "messages" },
      { id: "comunidad", label: "Comunidad", href: "/admin/comunidad", icon: "◈" },
    ],
  },
  {
    section: "Negocio",
    items: [
      { id: "pagos", label: "Pagos", href: "/admin/pagos", icon: "€" },
      { id: "certificados", label: "Certificados", href: "/admin/certificados", icon: "✓" },
      { id: "streaming", label: "Streaming", href: "/admin/streaming", icon: "▶" },
    ],
  },
  {
    section: "Sistema",
    items: [{ id: "config", label: "Configuración", href: "/admin/config", icon: "⚙" }],
  },
];

function getBadges() {
  const pending = getSubmissions({ status: "pending_review" }).length;
  const messages = getTeacherUnreadCount();
  return { pending, messages };
}

function renderSidebarNav(activePage) {
  const badges = getBadges();
  return ADMIN_NAV.map(
    (group) => `
    <div class="adm-nav-group">
      <p class="adm-nav-section">${esc(group.section)}</p>
      ${group.items
        .map((item) => {
          const isActive = item.id === activePage || (item.id === "builder" && activePage === "editor");
          const badge =
            item.badge === "pending" && badges.pending
              ? `<span class="adm-nav-badge">${badges.pending}</span>`
              : item.badge === "messages" && badges.messages
                ? `<span class="adm-nav-badge">${badges.messages}</span>`
                : item.soon
                  ? `<span class="adm-nav-soon">Pronto</span>`
                  : "";
          return `
        <a href="${item.href}" class="adm-nav-link ${isActive ? "is-active" : ""} ${item.soon ? "is-soon" : ""}" data-nav="${item.id}">
          <span class="adm-nav-icon">${item.icon}</span>
          <span>${esc(item.label)}</span>
          ${badge}
        </a>`;
        })
        .join("")}
    </div>`
  ).join("");
}

export function buildSidebarHTML(activePage) {
  const stats = getStats();
  const platform = getPlatformSettings();
  const platformPct = stats.totalCourses
    ? Math.round((stats.publishedCourses / stats.totalCourses) * 100)
    : 0;
  const brandName = platform.branding.academyName || "Vallodental Academy";
  const brandParts = brandName.trim().split(/\s+/);
  const brandTail = brandParts.length > 1 ? brandParts.pop() : "Academy";
  const brandHead = brandParts.join(" ") || "Vallodental";
  return `
    <div class="adm-sidebar-glow"></div>
    <div class="adm-sidebar-inner">
      <a href="/admin/" class="adm-logo">
        <span class="adm-logo-mark">${esc(brandHead.charAt(0))}</span>
        <span class="adm-logo-text">${esc(brandHead)} <em>${esc(brandTail)}</em></span>
      </a>
      <div class="adm-profile">
        <div class="adm-profile-avatar">A</div>
        <div>
          <p class="adm-profile-name">Administrador</p>
          <p class="adm-profile-role">${esc(platform.communication.teacherName)}</p>
        </div>
      </div>
      <div class="adm-platform-progress">
        <div class="adm-platform-head"><span>Plataforma activa</span><span>${platformPct}%</span></div>
        <div class="adm-platform-bar"><div class="adm-platform-fill" style="width:${platformPct}%"></div></div>
        <p class="adm-platform-sub">${stats.publishedCourses} de ${stats.totalCourses} cursos publicados</p>
      </div>
      <nav class="adm-nav">${renderSidebarNav(activePage)}</nav>
    </div>
    <div class="adm-sidebar-foot">
      <p class="adm-sidebar-email">cursos@admin.com</p>
      <button type="button" class="adm-logout" id="logoutBtn">Cerrar sesión</button>
    </div>`;
}

export function buildTopbarHTML(page, mainEl) {
  const badges = getBadges();
  const legacyHeader = mainEl?.querySelector(".admin-header");
  const kicker = legacyHeader?.querySelector(".login-kicker")?.textContent || "Panel";
  const title = legacyHeader?.querySelector(".admin-page-title, .login-title")?.textContent || "Administración";
  const legacyBtn = legacyHeader?.querySelector(".admin-btn:not(.admin-link-btn):not(.admin-btn--ghost)");
  const legacyAction =
    legacyBtn && !legacyBtn.href?.includes("curso-editor") ? legacyBtn.outerHTML : "";

  if (legacyHeader) legacyHeader.classList.add("adm-legacy-header");

  return `
    <button type="button" class="adm-menu-btn" id="admMenuBtn" aria-label="Menú">☰</button>
    <div class="adm-topbar-titles">
      <p class="adm-topbar-kicker">${esc(kicker)}</p>
      <h1 class="adm-topbar-title">${esc(title)}</h1>
    </div>
    <div class="adm-topbar-search">
      <span class="adm-search-icon">⌕</span>
      <input type="search" id="admGlobalSearch" placeholder="Buscar cursos, alumnos, entregas…" autocomplete="off" />
      <kbd class="adm-search-kbd">⌘K</kbd>
    </div>
    <div class="adm-topbar-actions">
      ${themeToggleButton()}
      <button type="button" class="adm-icon-btn" id="admNotifBtn" title="Notificaciones">
        🔔
        ${badges.pending + badges.messages ? `<span class="adm-icon-badge">${badges.pending + badges.messages}</span>` : ""}
      </button>
      <a href="/admin/mensajes" class="adm-icon-btn" title="Mensajes">
        ✉
        ${badges.messages ? `<span class="adm-icon-badge">${badges.messages}</span>` : ""}
      </a>
      <a href="/admin/curso-editor?new=1" class="adm-btn adm-btn--gold adm-btn--compact">+ Crear curso</a>
      ${legacyAction ? `<span class="adm-topbar-legacy-action">${legacyAction}</span>` : ""}
    </div>`;
}

export function mountAdminLayout(activePage, mainEl) {
  document.body.classList.add("admin-premium");

  const sidebar = document.querySelector(".admin-sidebar, .adm-sidebar");
  if (sidebar) {
    sidebar.className = "adm-sidebar";
    sidebar.id = "admSidebar";
    sidebar.innerHTML = buildSidebarHTML(activePage);
  }

  const main = mainEl || document.querySelector(".admin-main");
  if (!main) return;

  let shell = document.querySelector(".adm-shell");
  if (!shell) {
    shell = document.createElement("div");
    shell.className = "adm-shell";
    main.parentNode.insertBefore(shell, main);
    shell.appendChild(main);
  }

  let topbar = document.querySelector(".adm-topbar");
  if (!topbar) {
    topbar = document.createElement("header");
    topbar.className = "adm-topbar";
    topbar.id = "admTopbar";
    shell.insertBefore(topbar, main);
  }
  topbar.innerHTML = buildTopbarHTML(activePage, main);
  main.classList.add("adm-main");
  bindThemeToggle(topbar);

  let overlay = document.getElementById("admOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "adm-overlay";
    overlay.id = "admOverlay";
    document.body.appendChild(overlay);
  }

  document.getElementById("admMenuBtn")?.addEventListener("click", () => {
    document.body.classList.toggle("adm-nav-open");
  });
  overlay.onclick = () => document.body.classList.remove("adm-nav-open");

  document.getElementById("admNotifBtn")?.addEventListener("click", () => {
    location.href = "/admin/correcciones";
  });

  document.getElementById("admGlobalSearch")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const q = e.target.value.trim().toLowerCase();
      if (!q) return;
      const course = getCourses().find((c) => c.title.toLowerCase().includes(q));
      if (course) location.href = `/admin/curso-editor?id=${course.id}`;
      else location.href = `/admin/alumnos`;
    }
  });

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      document.getElementById("admGlobalSearch")?.focus();
    }
  });
}

export function animateCounter(el, target, { suffix = "", duration = 900 } = {}) {
  if (!el) return;
  const start = performance.now();
  const from = 0;
  const tick = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - p) ** 3;
    const val = Math.round(from + (target - from) * eased);
    el.textContent = `${val}${suffix}`;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function miniBars(seed, count = 7) {
  let s = seed;
  return Array.from({ length: count }, (_, i) => {
    s = (s * 9301 + 49297) % 233280;
    const h = 30 + (s % 70);
    return `<span style="height:${h}%" class="adm-spark-bar ${i === count - 1 ? "is-last" : ""}"></span>`;
  }).join("");
}
