/** Exportación PDF de cursos — solo administración */
import {
  getCourse,
  getCourseCurriculum,
  ACCESS_TYPES,
  VISIBILITY_OPTIONS,
  STATUS_LABELS,
} from "../js/data.js";
import { isAdminLoggedIn } from "../js/auth.js";

const GOLD = [201, 169, 110];
const INK = [35, 35, 35];
const MUTED = [110, 110, 110];

function blockToLines(block) {
  switch (block.type) {
    case "heading":
    case "subheading":
    case "paragraph":
    case "quote":
    case "callout":
    case "alert":
    case "button":
      return block.text ? [block.text] : [];
    case "list":
      return (block.items || []).map((i) => `• ${i}`);
    case "emoji":
      return block.emoji ? [block.emoji] : [];
    case "divider":
      return ["—"];
    default: {
      const label = block.caption || block.label || block.name;
      if (label) return [`[${block.type}] ${label}`];
      return block.url ? [`[${block.type}] ${block.url}`] : [];
    }
  }
}

function itemKindLabel(kind) {
  if (kind === "lesson") return "Lección";
  if (kind === "activity") return "Actividad";
  return "Examen";
}

function pdfFilename(base) {
  return `${String(base || "curso").replace(/[^\w.-]+/g, "-")}.pdf`;
}

async function loadJsPDF() {
  const { jsPDF } = await import("https://cdn.jsdelivr.net/npm/jspdf@2.5.2/+esm");
  return jsPDF;
}

function createWriter(doc) {
  const margin = 18;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - margin * 2;

  const w = {
    doc,
    y: 20,
    margin,
    pageW,
    pageH,
    maxW,
    ensure(need = 10) {
      if (w.y + need > pageH - 16) {
        doc.addPage();
        w.y = 20;
        w.footer();
      }
    },
    footer() {
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text("Vallodental Academy · Exportación confidencial (admin)", margin, pageH - 10);
    },
    section(title) {
      w.ensure(14);
      doc.setFontSize(13);
      doc.setTextColor(...GOLD);
      doc.text(title, margin, w.y);
      w.y += 7;
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.15);
      doc.line(margin, w.y, pageW - margin, w.y);
      w.y += 6;
    },
    field(label, value) {
      if (value === undefined || value === null || value === "") return;
      w.ensure(7);
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text(label, margin, w.y);
      doc.setTextColor(...INK);
      const lines = doc.splitTextToSize(String(value), maxW - 44);
      doc.text(lines, margin + 42, w.y);
      w.y += Math.max(lines.length * 4.2, 5.5);
    },
    text(content, size = 10, color = INK) {
      if (!content) return;
      doc.setFontSize(size);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(content, maxW);
      for (const line of lines) {
        w.ensure(5);
        doc.text(line, margin, w.y);
        w.y += 4.8;
      }
      w.y += 2;
    },
    bullets(items) {
      for (const item of items || []) {
        const lines = doc.splitTextToSize(`• ${item}`, maxW - 2);
        for (const line of lines) {
          w.ensure(5);
          doc.setFontSize(10);
          doc.setTextColor(...INK);
          doc.text(line, margin + 2, w.y);
          w.y += 4.8;
        }
      }
      w.y += 2;
    },
    line(text, indent = 0, size = 9.5) {
      w.ensure(5);
      doc.setFontSize(size);
      doc.setTextColor(...INK);
      const lines = doc.splitTextToSize(text, maxW - indent);
      for (const ln of lines) {
        w.ensure(5);
        doc.text(ln, margin + indent, w.y);
        w.y += 4.5;
      }
    },
  };

  return w;
}

function renderCourseCover(doc, course, w) {
  doc.setFillColor(8, 8, 8);
  doc.rect(0, 0, w.pageW, 58, "F");
  doc.setTextColor(...GOLD);
  doc.setFontSize(9);
  doc.text("Vallodental Academy".toUpperCase(), w.margin, 16, { charSpace: 1.2 });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  const titleLines = doc.splitTextToSize(course.title, w.maxW);
  doc.text(titleLines, w.margin, 30);
  let y = 30 + (titleLines.length - 1) * 7;
  if (course.subtitle) {
    doc.setFontSize(11);
    doc.setTextColor(220, 210, 195);
    doc.text(course.subtitle, w.margin, y + 8);
  }
  w.y = 68;
}

function renderCourseBody(w, course, { compact = false } = {}) {
  const curriculum = getCourseCurriculum(course);
  const totalMin = curriculum.reduce((acc, row) => acc + (row.item.durationMin || 0), 0);

  w.section("Información general");
  w.field("Estado", STATUS_LABELS[course.status] || course.status);
  w.field("Categoría", course.category);
  w.field("Nivel", course.level);
  w.field("Idioma", course.language);
  w.field("Instructor", course.instructor);
  w.field("Precio", course.price ? `${course.price} €` : "Gratuito");
  if (course.comparePrice) w.field("Precio anterior", `${course.comparePrice} €`);
  w.field("Acceso", ACCESS_TYPES[course.accessType] || course.accessType);
  w.field("Visibilidad", VISIBILITY_OPTIONS[course.visibility] || course.visibility);
  w.field("Duración", `${course.durationHours || Math.max(1, Math.round(totalMin / 60))} h`);
  w.field("Código", course.courseCode || "—");
  w.field("Referencia", course.slug || course.id);

  if (course.shortDescription) {
    w.section("Descripción");
    w.text(course.shortDescription);
  }

  if (course.objectives?.length) {
    w.section("Objetivos");
    w.bullets(course.objectives);
  }

  if (course.requirements) {
    w.section("Requisitos");
    w.text(course.requirements);
  }

  if (course.audience) {
    w.section("Público objetivo");
    w.text(course.audience);
  }

  if (!compact && course.blocks?.length) {
    w.section("Contenido descriptivo");
    for (const block of course.blocks) {
      const lines = blockToLines(block);
      for (const line of lines) {
        if (block.type === "heading" || block.type === "subheading") {
          w.ensure(8);
          w.doc.setFontSize(block.type === "heading" ? 12 : 11);
          w.doc.setTextColor(...GOLD);
          w.doc.text(line, w.margin, w.y);
          w.y += 6.5;
        } else {
          w.text(line, 10);
        }
      }
    }
  }

  w.section(compact ? "Resumen" : "Estructura del curso");
  w.text(
    `${curriculum.length} elementos · ${course.structure?.length || 0} módulos · ${curriculum.filter((r) => r.item.kind === "lesson").length} lecciones`,
    9,
    MUTED
  );

  (course.items || []).forEach((item) => {
    w.line(`[Curso] ${itemKindLabel(item.kind)}: ${item.title}`, 0, 9.5);
  });

  (course.structure || []).forEach((mod) => {
    w.ensure(8);
    w.doc.setFontSize(10.5);
    w.doc.setTextColor(...GOLD);
    w.doc.text(`${mod.emoji || "📁"} Módulo: ${mod.title}`, w.margin, w.y);
    w.y += 5.5;
    if (mod.description && !compact) w.text(mod.description, 9, MUTED);

    (mod.items || []).forEach((item) => {
      w.line(`  ${itemKindLabel(item.kind)}: ${item.title}`, 2, 9);
    });

    (mod.topics || []).forEach((topic) => {
      w.line(`  Tema: ${topic.title}`, 2, 9.5);
      if (compact) {
        w.line(`    ${topic.items?.length || 0} elementos`, 4, 8.5);
        return;
      }
      (topic.items || []).forEach((item) => {
        const preview = item.isPreviewFree ? " · vista previa" : "";
        w.line(
          `    ${itemKindLabel(item.kind)}: ${item.title} (${item.durationMin || "—"} min)${preview}`,
          4,
          8.5
        );
        if (item.summary) w.text(item.summary, 8.5, MUTED);
      });
    });
    w.y += 2;
  });

  w.footer();
}

export async function downloadCoursePDF(courseOrId) {
  if (!isAdminLoggedIn()) return false;
  const course = typeof courseOrId === "string" ? getCourse(courseOrId) : courseOrId;
  if (!course) return false;

  const jsPDF = await loadJsPDF();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = createWriter(doc);

  renderCourseCover(doc, course, w);
  renderCourseBody(w, course);

  doc.save(pdfFilename(course.slug || course.id));
  return true;
}

export async function downloadAllCoursesPDF(courses) {
  if (!isAdminLoggedIn() || !courses?.length) return false;

  const jsPDF = await loadJsPDF();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 18;
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(8, 8, 8);
  doc.rect(0, 0, pageW, 90, "F");
  doc.setTextColor(...GOLD);
  doc.setFontSize(10);
  doc.text("Vallodental Academy".toUpperCase(), margin, 28, { charSpace: 1 });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text("Catálogo de cursos", margin, 48);
  doc.setFontSize(10);
  doc.setTextColor(190, 190, 190);
  doc.text(`${courses.length} cursos · ${new Date().toLocaleDateString("es-ES")}`, margin, 58);
  doc.text("Documento confidencial — uso administrativo", margin, 66);

  let y = 100;
  doc.setTextColor(...INK);
  doc.setFontSize(11);
  doc.text("Índice", margin, y);
  y += 8;
  courses.forEach((c, i) => {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(10);
    doc.text(`${i + 1}. ${c.title}`, margin, y);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`${c.category} · ${STATUS_LABELS[c.status] || c.status} · ${c.price ? `${c.price} €` : "Gratis"}`, margin + 4, y + 4);
    doc.setTextColor(...INK);
    y += 12;
  });

  for (const course of courses) {
    doc.addPage();
    const w = createWriter(doc);
    renderCourseCover(doc, course, w);
    renderCourseBody(w, course, { compact: true });
  }

  doc.save(`vallodental-cursos-${new Date().toISOString().slice(0, 10)}.pdf`);
  return true;
}
