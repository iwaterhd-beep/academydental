/** Generación de certificados PDF — Vallodental Academy */

export async function downloadCertificatePDF({
  studentName,
  courseTitle,
  instructor,
  completedAt,
  courseId,
  issuerName = "Vallodental Academy",
}) {
  const { jsPDF } = await import("https://cdn.jsdelivr.net/npm/jspdf@2.5.2/+esm");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const dateStr = completedAt
    ? new Date(completedAt).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  const certId = `VA-${String(courseId).slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  doc.setFillColor(8, 8, 8);
  doc.rect(0, 0, w, h, "F");

  doc.setDrawColor(201, 169, 110);
  doc.setLineWidth(0.8);
  doc.rect(12, 12, w - 24, h - 24);
  doc.setLineWidth(0.3);
  doc.rect(16, 16, w - 32, h - 32);

  doc.setTextColor(201, 169, 110);
  doc.setFontSize(11);
  doc.text(String(issuerName).toUpperCase().replace(/\s+/g, "  "), w / 2, 32, { align: "center", charSpace: 2 });

  doc.setTextColor(240, 240, 240);
  doc.setFontSize(26);
  doc.text("Certificado de finalización", w / 2, 52, { align: "center" });

  doc.setDrawColor(201, 169, 110);
  doc.setLineWidth(0.2);
  doc.line(w / 2 - 40, 58, w / 2 + 40, 58);

  doc.setTextColor(140, 140, 140);
  doc.setFontSize(12);
  doc.text("Se certifica que", w / 2, 72, { align: "center" });

  doc.setTextColor(232, 213, 176);
  doc.setFontSize(24);
  doc.text(studentName, w / 2, 88, { align: "center" });

  doc.setTextColor(130, 130, 130);
  doc.setFontSize(11);
  doc.text("ha completado satisfactoriamente el programa formativo", w / 2, 102, { align: "center" });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  const titleLines = doc.splitTextToSize(courseTitle, w - 80);
  doc.text(titleLines, w / 2, 118, { align: "center" });

  const yAfter = 118 + (titleLines.length - 1) * 8;
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(`Director del curso: ${instructor}`, w / 2, yAfter + 14, { align: "center" });
  doc.text(`Fecha de emisión: ${dateStr}`, w / 2, yAfter + 22, { align: "center" });
  doc.text(`Referencia: ${certId}`, w / 2, yAfter + 30, { align: "center" });

  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(`Academia premium de prótesis dentales · ${issuerName}`, w / 2, h - 20, { align: "center" });

  doc.save(`certificado-vallodental-${courseId}.pdf`);
}
