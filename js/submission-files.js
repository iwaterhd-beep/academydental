export const SUBMISSION_MAX_FILE_MB = 25;
export const SUBMISSION_MAX_FILES = 5;

export function formatFileSize(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileExtension(name = "") {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

export function buildAcceptString(fileTypes) {
  if (!fileTypes?.length || fileTypes.includes("*")) return "";
  const map = {
    pdf: ".pdf,application/pdf",
    jpg: ".jpg,.jpeg,image/jpeg",
    jpeg: ".jpg,.jpeg,image/jpeg",
    png: ".png,image/png",
    webp: ".webp,image/webp",
    gif: ".gif,image/gif",
    mp4: ".mp4,video/mp4",
    webm: ".webm,video/webm",
    mov: ".mov,video/quicktime",
    avi: ".avi,video/x-msvideo",
    stl: ".stl,model/stl",
    zip: ".zip,application/zip",
    doc: ".doc,application/msword",
    docx: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  const parts = new Set();
  fileTypes.forEach((t) => {
    const key = t.toLowerCase().replace(/^\./, "");
    if (map[key]) map[key].split(",").forEach((p) => parts.add(p));
    else parts.add(`.${key}`);
  });
  return [...parts].join(",");
}

export function isFileTypeAllowed(file, fileTypes) {
  if (!fileTypes?.length || fileTypes.includes("*")) return true;
  const ext = fileExtension(file.name);
  const allowed = fileTypes.map((t) => t.toLowerCase().replace(/^\./, ""));
  if (allowed.includes(ext)) return true;
  if (allowed.includes("jpg") && (ext === "jpeg" || ext === "jpg")) return true;
  return allowed.some((t) => file.type && file.type.toLowerCase().includes(t));
}

export function fileKind(entry) {
  const type = entry.type || "";
  const name = entry.name || "";
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type === "application/pdf" || name.toLowerCase().endsWith(".pdf")) return "pdf";
  return "file";
}

function readOneFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export async function filesToSubmissionEntries(fileList, { fileTypes, maxMb = SUBMISSION_MAX_FILE_MB, maxFiles = SUBMISSION_MAX_FILES } = {}) {
  const picked = [...fileList].slice(0, maxFiles);
  if (fileList.length > maxFiles) {
    throw new Error(`Puedes subir un máximo de ${maxFiles} archivos.`);
  }
  const entries = [];
  for (const file of picked) {
    if (!isFileTypeAllowed(file, fileTypes)) {
      throw new Error(`Tipo de archivo no permitido: ${file.name}`);
    }
    if (file.size > maxMb * 1024 * 1024) {
      throw new Error(`${file.name} supera el límite de ${maxMb} MB.`);
    }
    const dataUrl = await readOneFile(file);
    entries.push({
      id: `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name: file.name,
      type: file.type || "",
      size: file.size,
      dataUrl,
    });
  }
  return entries;
}

export function allowedTypesLabel(fileTypes) {
  if (!fileTypes?.length || fileTypes.includes("*")) return "Imágenes, vídeos, PDF y otros archivos";
  return fileTypes.map((t) => t.toUpperCase()).join(", ");
}

export function renderSubmissionFilesHtml(files, escapeHtml, { preview = true } = {}) {
  if (!files?.length) return "";
  return `<div class="campus-submitted-files">${files
    .map((f) => {
      const kind = fileKind(f);
      const name = escapeHtml(f.name);
      const size = formatFileSize(f.size);
      const url = f.dataUrl || f.url || "#";
      if (preview && kind === "image") {
        return `<div class="campus-file-item campus-file-item--image">
          <a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="${name}" /></a>
          <span class="campus-file-meta">${name} · ${size}</span>
        </div>`;
      }
      if (preview && kind === "video") {
        return `<div class="campus-file-item campus-file-item--video">
          <video src="${url}" controls preload="metadata"></video>
          <span class="campus-file-meta">${name} · ${size}</span>
        </div>`;
      }
      if (preview && kind === "pdf") {
        return `<div class="campus-file-item campus-file-item--pdf">
          <iframe src="${url}" title="${name}"></iframe>
          <a class="campus-file-link" href="${url}" target="_blank" rel="noopener" download="${name}">Descargar ${name} (${size})</a>
        </div>`;
      }
      return `<div class="campus-file-item campus-file-item--doc">
        <a class="campus-file-link" href="${url}" target="_blank" rel="noopener" download="${name}">📄 ${name} · ${size}</a>
      </div>`;
    })
    .join("")}</div>`;
}
