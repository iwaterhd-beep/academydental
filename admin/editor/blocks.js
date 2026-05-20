import { BLOCK_TYPES, COLOR_PRESETS, EMOJI_PICKS } from "../../js/data.js";
import { escapeHtml } from "./preview.js";

export function buildBlockEditor(block, index, blocks, onUpdate, onRemove, onMove) {
  const wrap = document.createElement("div");
  wrap.className = "editor-block";
  wrap.draggable = true;
  wrap.dataset.index = index;

  wrap.innerHTML = `
    <div class="editor-block-bar">
      <span class="editor-block-type">${BLOCK_TYPES[block.type] || block.type}</span>
      <div class="editor-block-controls">
        <button type="button" class="editor-block-btn editor-block-drag" title="Arrastrar">⠿</button>
        <button type="button" class="editor-block-btn" data-move="-1" title="Subir">↑</button>
        <button type="button" class="editor-block-btn" data-move="1" title="Bajar">↓</button>
        <button type="button" class="editor-block-btn editor-block-btn--danger" data-remove title="Eliminar">×</button>
      </div>
    </div>
    <div class="editor-block-body">${getBlockFieldsHtml(block)}</div>`;

  bindBlockEvents(wrap, block, index, blocks, onUpdate, onRemove, onMove);
  return wrap;
}

function getBlockFieldsHtml(block) {
  const colors = COLOR_PRESETS.map(
    (c) => `<button type="button" class="editor-block-color ${block.color === c.value ? "is-active" : ""}" data-color="${c.value}" style="background:${c.value}" title="${c.name}"></button>`
  ).join("");

  const textTypes = ["heading", "subheading", "paragraph", "quote", "callout", "alert", "button"];
  let html = "";

  if (textTypes.includes(block.type)) {
    html += `<textarea class="editor-block-textarea" data-field="text" style="color:${block.color || "#f0ece4"}" placeholder="Escribe aquí...">${escapeHtml(block.text || "")}</textarea>`;
    if (["heading", "subheading"].includes(block.type)) {
      html += `<div class="editor-block-meta"><label>Tamaño<select data-field="size"><option value="xl" ${block.size === "xl" ? "selected" : ""}>XL</option><option value="lg" ${block.size === "lg" ? "selected" : ""}>L</option><option value="md" ${block.size === "md" ? "selected" : ""}>M</option></select></label></div>`;
    }
    if (block.type === "button") {
      html += `<div class="editor-block-meta"><input class="editor-input" data-field="url" placeholder="URL del botón" value="${escapeHtml(block.url || "")}" /></div>`;
    }
    html += `<div class="editor-block-colors">${colors}</div>`;
  }

  if (block.type === "emoji") {
    html += `<div class="editor-block-emoji-display" data-emoji-display>${block.emoji || "🦷"}</div>
      <div class="editor-emoji-grid" style="display:grid;margin-top:12px">${EMOJI_PICKS.slice(0, 24).map((e) => `<button type="button" class="editor-emoji-item" data-pick-emoji="${e}">${e}</button>`).join("")}</div>`;
  }

  if (["image", "video", "pdf", "audio", "stl", "file"].includes(block.type)) {
    html += `
      <input class="editor-input" data-field="url" placeholder="URL o sube archivo abajo" value="${escapeHtml(block.url || "")}" />
      <input type="file" data-file-upload style="margin-top:10px" />
      ${block.type === "image" && block.url ? `<img class="editor-block-image-preview" src="${block.url}" alt="" />` : ""}
      <div class="editor-block-meta">
        <input class="editor-input" data-field="caption" placeholder="Pie / descripción" value="${escapeHtml(block.caption || block.label || block.name || "")}" />
      </div>`;
  }

  if (block.type === "gallery") {
    html += `<input type="file" data-gallery-upload accept="image/*" multiple />
      <div class="editor-gallery-row">${(block.images || []).map((u, i) => `<div class="editor-gallery-thumb"><img src="${u}" /><button type="button" data-rm-gallery="${i}">×</button></div>`).join("")}</div>`;
  }

  if (block.type === "list") {
    html += `<div class="editor-block-list-items" data-list-items>${(block.items || []).map((item, i) => `<div class="editor-block-list-item"><input class="editor-input" data-list-i="${i}" value="${escapeHtml(item)}" /><button type="button" data-rm-list="${i}">×</button></div>`).join("")}</div>
      <button type="button" class="admin-btn admin-btn--ghost" data-add-list style="margin-top:8px">+ Ítem</button>`;
  }

  if (block.type === "divider") {
    html += `<select data-field="style"><option value="gold" ${block.style === "gold" ? "selected" : ""}>Línea dorada</option><option value="dots" ${block.style === "dots" ? "selected" : ""}>Puntos</option></select>`;
  }

  return html || `<p class="admin-muted">Bloque ${block.type}</p>`;
}

function bindBlockEvents(wrap, block, index, blocks, onUpdate, onRemove, onMove) {
  wrap.querySelector("[data-remove]")?.addEventListener("click", () => onRemove(index));
  wrap.querySelector('[data-move="-1"]')?.addEventListener("click", () => onMove(index, -1));
  wrap.querySelector('[data-move="1"]')?.addEventListener("click", () => onMove(index, 1));

  wrap.querySelectorAll("[data-color]").forEach((btn) => {
    btn.addEventListener("click", () => {
      block.color = btn.dataset.color;
      onUpdate();
    });
  });

  wrap.querySelector("[data-field='text']")?.addEventListener("input", (e) => {
    block.text = e.target.value;
    onUpdate(false);
  });

  wrap.querySelectorAll("[data-field]").forEach((el) => {
    if (el.dataset.field === "text") return;
    el.addEventListener("input", () => {
      block[el.dataset.field] = el.value;
      onUpdate(false);
    });
    el.addEventListener("change", () => {
      block[el.dataset.field] = el.value;
      onUpdate(false);
    });
  });

  wrap.querySelectorAll("[data-pick-emoji]").forEach((btn) => {
    btn.addEventListener("click", () => {
      block.emoji = btn.dataset.pickEmoji;
      onUpdate();
    });
  });

  wrap.querySelector("[data-file-upload]")?.addEventListener("change", (e) => readFile(e, block, onUpdate));
  wrap.querySelector("[data-gallery-upload]")?.addEventListener("change", (e) => {
    [...e.target.files].forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        block.images = block.images || [];
        block.images.push(reader.result);
        onUpdate();
      };
      reader.readAsDataURL(file);
    });
  });

  wrap.querySelectorAll("[data-rm-gallery]").forEach((btn) => {
    btn.addEventListener("click", () => {
      block.images.splice(Number(btn.dataset.rmGallery), 1);
      onUpdate();
    });
  });

  wrap.querySelector("[data-add-list]")?.addEventListener("click", () => {
    block.items = block.items || [];
    block.items.push("Nuevo ítem");
    onUpdate();
  });

  wrap.querySelectorAll("[data-list-i]").forEach((input) => {
    input.addEventListener("input", () => {
      block.items[Number(input.dataset.listI)] = input.value;
      onUpdate(false);
    });
  });

  wrap.querySelectorAll("[data-rm-list]").forEach((btn) => {
    btn.addEventListener("click", () => {
      block.items.splice(Number(btn.dataset.rmList), 1);
      onUpdate();
    });
  });

  wrap.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", index);
    wrap.classList.add("is-dragging");
  });
  wrap.addEventListener("dragend", () => wrap.classList.remove("is-dragging"));
  wrap.addEventListener("dragover", (e) => e.preventDefault());
  wrap.addEventListener("drop", (e) => {
    e.preventDefault();
    const from = Number(e.dataTransfer.getData("text/plain"));
    const to = index;
    if (from !== to) onMove(from, to - from);
  });
}

function readFile(e, block, onUpdate) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) {
    alert("Archivo muy grande (máx. 3 MB en modo local).");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    block.url = reader.result;
    block.name = file.name;
    onUpdate();
  };
  reader.readAsDataURL(file);
}

export const BLOCK_TOOLBAR = [
  { type: "heading", label: "H Título", icon: "H" },
  { type: "subheading", label: "H2 Sub", icon: "H2" },
  { type: "paragraph", label: "¶ Texto", icon: "¶" },
  { type: "quote", label: "❝ Cita", icon: "❝" },
  { type: "callout", label: "💡 Destacado", icon: "💡" },
  { type: "alert", label: "⚠ Alerta", icon: "⚠" },
  { type: "image", label: "📷 Imagen", icon: "📷" },
  { type: "gallery", label: "🖼 Galería", icon: "🖼" },
  { type: "video", label: "🎬 Vídeo", icon: "🎬" },
  { type: "pdf", label: "📄 PDF", icon: "📄" },
  { type: "stl", label: "🔷 STL", icon: "🔷" },
  { type: "audio", label: "🎵 Audio", icon: "🎵" },
  { type: "list", label: "≡ Lista", icon: "≡" },
  { type: "table", label: "▦ Tabla", icon: "▦" },
  { type: "accordion", label: "▼ Acordeón", icon: "▼" },
  { type: "tabs", label: "▤ Tabs", icon: "▤" },
  { type: "button", label: "▢ Botón", icon: "▢" },
  { type: "divider", label: "─ Sep.", icon: "─" },
  { type: "emoji", label: "😊 Emoji", icon: "😊" },
];
