import { initAdminShell, showToast, confirmAction, escapeHtml } from "./shell.js";
import {
  getPlatformSettings,
  savePlatformSettings,
  resetPlatformSettings,
  exportAllData,
  importAllData,
  restoreDemoSeedData,
  resetDemoStudent,
  LANGUAGES,
} from "../js/data.js";

initAdminShell("config");

const root = document.getElementById("configRoot");

const SECTIONS = [
  { id: "branding", label: "Academia", icon: "◆", desc: "Marca, contacto e idioma" },
  { id: "access", label: "Acceso", icon: "🔒", desc: "Matrículas y mantenimiento" },
  { id: "learning", label: "Aprendizaje", icon: "▤", desc: "Cursos, certificados y progreso" },
  { id: "grading", label: "Correcciones", icon: "◎", desc: "Entregas y evaluación" },
  { id: "communication", label: "Comunicación", icon: "✉", desc: "Mensajes y comunidad" },
  { id: "certificates", label: "Certificados", icon: "✓", desc: "Emisión y verificación" },
  { id: "advanced", label: "Avanzado", icon: "⚙", desc: "Exportar, importar y reset" },
];

let active = "branding";
let settings = getPlatformSettings();

function toggleHtml(id, checked, label) {
  return `
    <label class="adm-setting-row adm-setting-row--toggle">
      <div>
        <span class="adm-setting-label">${escapeHtml(label)}</span>
      </div>
      <input type="checkbox" class="adm-toggle-input" id="${id}" ${checked ? "checked" : ""} />
      <span class="adm-toggle" aria-hidden="true"></span>
    </label>`;
}

function fieldHtml(id, label, value, type = "text", opts = {}) {
  if (type === "select") {
    return `
      <label class="adm-setting-field">
        <span class="adm-setting-label">${escapeHtml(label)}</span>
        <select class="adm-select adm-select--full" id="${id}">
          ${opts.options
            .map((o) => `<option value="${escapeHtml(o.value)}" ${o.value === value ? "selected" : ""}>${escapeHtml(o.label)}</option>`)
            .join("")}
        </select>
      </label>`;
  }
  if (type === "textarea") {
    return `
      <label class="adm-setting-field">
        <span class="adm-setting-label">${escapeHtml(label)}</span>
        <textarea class="adm-textarea" id="${id}" rows="${opts.rows || 4}">${escapeHtml(value)}</textarea>
      </label>`;
  }
  return `
    <label class="adm-setting-field">
      <span class="adm-setting-label">${escapeHtml(label)}</span>
      <input class="adm-input" type="${type}" id="${id}" value="${escapeHtml(String(value))}" ${opts.min != null ? `min="${opts.min}"` : ""} ${opts.max != null ? `max="${opts.max}"` : ""} />
    </label>`;
}

function sectionContent(id) {
  const s = settings;
  switch (id) {
    case "branding":
      return `
        <p class="adm-settings-lead">Personaliza la identidad visible de tu academia en el campus y certificados.</p>
        ${fieldHtml("branding_academyName", "Nombre de la academia", s.branding.academyName)}
        ${fieldHtml("branding_tagline", "Descripción corta", s.branding.tagline)}
        ${fieldHtml("branding_supportEmail", "Email de soporte", s.branding.supportEmail, "email")}
        ${fieldHtml("branding_defaultLanguage", "Idioma predeterminado", s.branding.defaultLanguage, "select", {
          options: LANGUAGES.map((l) => ({ value: l, label: l })),
        })}`;
    case "access":
      return `
        <p class="adm-settings-lead">Controla quién puede acceder al campus y el estado inicial de nuevos alumnos.</p>
        ${toggleHtml("access_maintenanceMode", s.access.maintenanceMode, "Modo mantenimiento (bloquea acceso alumnos)")}
        ${toggleHtml("access_allowRegistration", s.access.allowRegistration, "Permitir auto-registro (próximamente)")}
        ${fieldHtml("access_defaultStudentStatus", "Estado por defecto al crear alumno", s.access.defaultStudentStatus, "select", {
          options: [
            { value: "active", label: "Activo" },
            { value: "blocked", label: "Bloqueado" },
          ],
        })}
        <p class="adm-setting-hint">En modo mantenimiento solo el administrador puede iniciar sesión. Los alumnos verán un aviso en la pantalla de acceso.</p>`;
    case "learning":
      return `
        <p class="adm-settings-lead">Define el comportamiento predeterminado de nuevos cursos y certificados.</p>
        ${toggleHtml("learning_defaultSequentialUnlock", s.learning.defaultSequentialUnlock, "Desbloqueo secuencial por defecto")}
        ${toggleHtml("learning_certificatesEnabled", s.learning.certificatesEnabled, "Certificados habilitados globalmente")}
        ${toggleHtml("learning_showProgressPublicly", s.learning.showProgressPublicly, "Mostrar progreso en comunidad (próximamente)")}
        ${fieldHtml("learning_defaultExamPassScore", "Nota mínima exámenes (%)", s.learning.defaultExamPassScore, "number", { min: 50, max: 100 })}`;
    case "grading":
      return `
        <p class="adm-settings-lead">Ajusta cómo se gestionan las entregas y correcciones del profesor.</p>
        ${toggleHtml("grading_notifyOnSubmission", s.grading.notifyOnSubmission, "Alertar al profesor en nuevas entregas")}
        ${toggleHtml("grading_allowSkipCorrection", s.grading.allowSkipCorrection, "Permitir continuar sin corrección")}
        ${fieldHtml("grading_defaultFeedbackDays", "Plazo orientativo de corrección (días)", s.grading.defaultFeedbackDays, "number", { min: 1, max: 30 })}`;
    case "communication":
      return `
        <p class="adm-settings-lead">Configura la comunicación entre alumnos y profesorado.</p>
        ${toggleHtml("communication_messagesEnabled", s.communication.messagesEnabled, "Mensajes alumno ↔ profesor")}
        ${toggleHtml("communication_communityEnabled", s.communication.communityEnabled, "Comunidad y anuncios en campus")}
        ${fieldHtml("communication_teacherName", "Nombre del profesor / director", s.communication.teacherName)}
        ${fieldHtml("communication_welcomeMessage", "Mensaje de bienvenida sugerido", s.communication.welcomeMessage, "textarea", { rows: 4 })}`;
    case "certificates":
      return `
        <p class="adm-settings-lead">Datos que aparecen en los certificados PDF emitidos a los alumnos.</p>
        ${fieldHtml("certificates_issuerName", "Entidad emisora", s.certificates.issuerName)}
        ${fieldHtml("certificates_directorName", "Director / firma académica", s.certificates.directorName)}
        ${toggleHtml("certificates_qrVerification", s.certificates.qrVerification, "Incluir referencia de verificación (próximamente QR)")}`;
    case "advanced":
      return `
        <p class="adm-settings-lead">Copia de seguridad, restauración y opciones sensibles del sistema.</p>
        <div class="adm-settings-actions-grid">
          <button type="button" class="adm-btn adm-btn--ghost" id="exportDataBtn">↓ Exportar datos JSON</button>
          <label class="adm-btn adm-btn--ghost adm-file-btn">
            ↑ Importar backup
            <input type="file" id="importDataInput" accept="application/json,.json" hidden />
          </label>
          <button type="button" class="adm-btn adm-btn--ghost" id="resetSettingsBtn">Restaurar ajustes</button>
          <button type="button" class="adm-btn adm-btn--ghost" id="restoreDemoBtn">↺ Restaurar curso demo</button>
          <button type="button" class="adm-btn adm-btn--ghost" id="resetDemoStudentBtn">↺ Reiniciar alumno demo</button>
        </div>
        <div class="adm-danger-zone">
          <p class="adm-setting-label">Zona de riesgo</p>
          <p class="adm-setting-hint">«Restaurar curso demo» actualiza el curso de muestra. «Reiniciar alumno demo» borra progreso y entregas de cursos@alumno.com.</p>
        </div>`;
    default:
      return "";
  }
}

function render() {
  const section = SECTIONS.find((x) => x.id === active);
  root.innerHTML = `
    <nav class="adm-settings-nav" aria-label="Secciones de configuración">
      ${SECTIONS.map(
        (s) => `
        <button type="button" class="adm-settings-nav-btn ${s.id === active ? "is-active" : ""}" data-section="${s.id}">
          <span class="adm-settings-nav-icon">${s.icon}</span>
          <span>
            <strong>${escapeHtml(s.label)}</strong>
            <em>${escapeHtml(s.desc)}</em>
          </span>
        </button>`
      ).join("")}
    </nav>
    <section class="adm-settings-panel">
      <header class="adm-settings-panel-head">
        <div>
          <p class="login-kicker">${escapeHtml(section?.label || "")}</p>
          <h2 class="adm-panel-title">${escapeHtml(section?.label || "Configuración")}</h2>
        </div>
        ${active !== "advanced" ? `<button type="button" class="adm-btn adm-btn--gold" id="saveSectionBtn">Guardar cambios</button>` : ""}
      </header>
      <form class="adm-settings-form" id="settingsForm" autocomplete="off">
        ${sectionContent(active)}
      </form>
    </section>`;

  root.querySelectorAll("[data-section]").forEach((btn) => {
    btn.onclick = () => {
      active = btn.dataset.section;
      render();
    };
  });

  document.getElementById("saveSectionBtn")?.addEventListener("click", saveCurrentSection);
  document.getElementById("exportDataBtn")?.addEventListener("click", exportData);
  document.getElementById("importDataInput")?.addEventListener("change", importData);
  document.getElementById("resetSettingsBtn")?.addEventListener("click", resetSettings);
  document.getElementById("restoreDemoBtn")?.addEventListener("click", () => {
    if (!confirmAction("¿Restaurar el curso demo y contenido base?")) return;
    restoreDemoSeedData();
    showToast("Curso demo restaurado.");
  });
  document.getElementById("resetDemoStudentBtn")?.addEventListener("click", () => {
    if (!confirmAction("¿Reiniciar progreso del alumno demo (cursos@alumno.com)?")) return;
    if (resetDemoStudent()) showToast("Alumno demo reiniciado.");
    else showToast("No se pudo reiniciar.", "error");
  });

  document.querySelectorAll(".adm-toggle-input").forEach((input) => {
    input.addEventListener("change", () => input.nextElementSibling?.classList.toggle("is-on", input.checked));
    input.nextElementSibling?.classList.toggle("is-on", input.checked);
  });
}

function readToggle(id) {
  return document.getElementById(id)?.checked ?? false;
}

function readVal(id) {
  const el = document.getElementById(id);
  if (!el) return "";
  if (el.type === "number") return Number(el.value);
  return el.value.trim();
}

function saveCurrentSection() {
  let patch = {};
  switch (active) {
    case "branding":
      patch = {
        branding: {
          academyName: readVal("branding_academyName"),
          tagline: readVal("branding_tagline"),
          supportEmail: readVal("branding_supportEmail"),
          defaultLanguage: readVal("branding_defaultLanguage"),
        },
      };
      break;
    case "access":
      patch = {
        access: {
          maintenanceMode: readToggle("access_maintenanceMode"),
          allowRegistration: readToggle("access_allowRegistration"),
          defaultStudentStatus: readVal("access_defaultStudentStatus"),
        },
      };
      break;
    case "learning":
      patch = {
        learning: {
          defaultSequentialUnlock: readToggle("learning_defaultSequentialUnlock"),
          certificatesEnabled: readToggle("learning_certificatesEnabled"),
          showProgressPublicly: readToggle("learning_showProgressPublicly"),
          defaultExamPassScore: readVal("learning_defaultExamPassScore"),
        },
      };
      break;
    case "grading":
      patch = {
        grading: {
          notifyOnSubmission: readToggle("grading_notifyOnSubmission"),
          allowSkipCorrection: readToggle("grading_allowSkipCorrection"),
          defaultFeedbackDays: readVal("grading_defaultFeedbackDays"),
        },
      };
      break;
    case "communication":
      patch = {
        communication: {
          messagesEnabled: readToggle("communication_messagesEnabled"),
          communityEnabled: readToggle("communication_communityEnabled"),
          teacherName: readVal("communication_teacherName"),
          welcomeMessage: readVal("communication_welcomeMessage"),
        },
      };
      break;
    case "certificates":
      patch = {
        certificates: {
          issuerName: readVal("certificates_issuerName"),
          directorName: readVal("certificates_directorName"),
          qrVerification: readToggle("certificates_qrVerification"),
        },
      };
      break;
    default:
      return;
  }

  settings = savePlatformSettings(patch);
  showToast("Configuración guardada");
}

function exportData() {
  const blob = new Blob([exportAllData()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vallodental-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Backup exportado");
}

function importData(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    if (!confirmAction("¿Importar backup? Se reemplazarán cursos, alumnos y ajustes actuales.")) {
      e.target.value = "";
      return;
    }
    const result = importAllData(reader.result);
    if (result.ok) {
      settings = getPlatformSettings();
      showToast("Datos importados correctamente");
      render();
    } else {
      showToast(result.error || "Error al importar", "error");
    }
    e.target.value = "";
  };
  reader.readAsText(file);
}

function resetSettings() {
  if (!confirmAction("¿Restaurar todos los ajustes a los valores predeterminados?")) return;
  settings = resetPlatformSettings();
  showToast("Ajustes restaurados");
  render();
}

render();
