export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderBlockPreview(block) {
  const color = block.color ? `color:${block.color}` : "";
  const align = block.align ? `text-align:${block.align}` : "";

  switch (block.type) {
    case "heading":
    case "subheading":
      return `<div class="preview-block" style="${align}"><h2 class="size-${block.size || "lg"}" style="${color}">${escapeHtml(block.text)}</h2></div>`;
    case "paragraph":
      return `<div class="preview-block" style="${align}"><p style="${color}">${escapeHtml(block.text).replace(/\n/g, "<br>")}</p></div>`;
    case "quote":
      return `<div class="preview-block"><p class="preview-quote" style="${color}">${escapeHtml(block.text)}</p></div>`;
    case "callout":
      return `<div class="preview-block"><div class="preview-callout" style="${color};background:${block.bgColor || "rgba(201,169,110,0.12)"}">${escapeHtml(block.text)}</div></div>`;
    case "alert":
      return `<div class="preview-block"><div class="preview-alert preview-alert--${block.variant || "warning"}">${escapeHtml(block.text)}</div></div>`;
    case "divider":
      return block.style === "dots"
        ? `<div class="preview-block"><div class="preview-divider style-dots">• • •</div></div>`
        : `<div class="preview-block"><div class="preview-divider"></div></div>`;
    case "emoji":
      return `<div class="preview-block"><div class="preview-emoji" style="font-size:${block.size || 48}px">${block.emoji || "🦷"}</div></div>`;
    case "list":
      return `<div class="preview-block"><ul style="${color}">${(block.items || []).map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul></div>`;
    case "image":
      return block.url
        ? `<div class="preview-block"><figure><img src="${block.url}" alt="${escapeHtml(block.alt)}" />${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ""}</figure></div>`
        : "";
    case "gallery":
      return `<div class="preview-block preview-gallery">${(block.images || []).map((u) => `<img src="${u}" alt="" />`).join("")}</div>`;
    case "video":
      return block.url
        ? `<div class="preview-block"><div class="preview-trailer">${embedVideo(block.url)}</div>${block.caption ? `<p class="admin-muted">${escapeHtml(block.caption)}</p>` : ""}</div>`
        : "";
    case "pdf":
    case "stl":
    case "file":
    case "audio":
      return block.url
        ? `<div class="preview-block"><a class="preview-download" href="${block.url}" download>📎 ${escapeHtml(block.label || block.name || "Descargar")}</a></div>`
        : "";
    case "button":
      return `<div class="preview-block" style="${align}"><span class="preview-btn preview-btn--${block.style || "gold"}">${escapeHtml(block.text)}</span></div>`;
    case "accordion":
      return `<div class="preview-block">${(block.items || []).map((item) => `<details class="preview-accordion"><summary>${escapeHtml(item.title)}</summary><p>${escapeHtml(item.body)}</p></details>`).join("")}</div>`;
    case "tabs":
      return `<div class="preview-block preview-tabs">${(block.items || []).map((item, i) => `<div class="preview-tab ${i === 0 ? "is-active" : ""}"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.body)}</p></div>`).join("")}</div>`;
    case "table":
      return `<div class="preview-block preview-table-wrap"><table><thead><tr>${(block.headers || []).map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${(block.rows || []).map((row) => `<tr>${row.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    default:
      return "";
  }
}

function embedVideo(url) {
  if (/youtube\.com|youtu\.be/.test(url)) {
    const id = url.match(/(?:v=|\/)([\w-]{11})/)?.[1];
    if (id) return `<iframe src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>`;
  }
  if (/vimeo\.com/.test(url)) {
    const id = url.split("/").pop();
    return `<iframe src="https://player.vimeo.com/video/${id}" allowfullscreen></iframe>`;
  }
  return `<video src="${url}" controls playsinline></video>`;
}

export function renderBlocksPreview(blocks) {
  return (blocks || []).map(renderBlockPreview).join("");
}

export function renderCoursePreview(course) {
  const cover = course.coverImage || course.bannerImage;
  return `
    <div class="preview-device">
      <div class="preview-cover">
        ${cover ? `<img src="${cover}" alt="" />` : ""}
        <div class="preview-cover-overlay"></div>
        <div class="preview-cover-content">
          <p class="preview-tag">${escapeHtml(course.category)} · ${escapeHtml(course.level)}</p>
          <h2 class="preview-title">${escapeHtml(course.title)}</h2>
          <p class="preview-subtitle">${escapeHtml(course.subtitle)}</p>
          <p class="preview-price">${course.price ? `${course.price} €` : "Gratis"}</p>
        </div>
      </div>
      <div class="preview-body">
        ${course.trailerUrl ? `<div class="preview-trailer">${embedVideo(course.trailerUrl)}</div>` : ""}
        ${course.shortDescription ? `<p class="preview-intro">${escapeHtml(course.shortDescription)}</p>` : ""}
        ${renderBlocksPreview(course.blocks)}
      </div>
    </div>`;
}

export function renderLessonPreview(lesson) {
  return `
    <div class="preview-device">
      <div class="preview-body" style="padding-top:32px">
        <p class="preview-tag">Lección</p>
        <h2 class="preview-title" style="font-size:22px;margin-bottom:16px">${escapeHtml(lesson.title)}</h2>
        ${lesson.videoUrl ? `<div class="preview-trailer">${embedVideo(lesson.videoUrl)}</div>` : ""}
        ${renderBlocksPreview(lesson.blocks)}
      </div>
    </div>`;
}

export function renderActivityPreview(activity) {
  const typeLabel = { practice: "Práctica", lab: "Laboratorio", discussion: "Debate", reading: "Lectura", case: "Caso clínico", upload: "Entrega" }[activity.activityType] || "Actividad";
  return `
    <div class="preview-device">
      <div class="preview-body" style="padding-top:32px">
        <p class="preview-tag">✏️ ${typeLabel}</p>
        <h2 class="preview-title" style="font-size:22px;margin-bottom:12px">${escapeHtml(activity.title)}</h2>
        ${activity.instructions ? `<p class="preview-intro">${escapeHtml(activity.instructions)}</p>` : ""}
        ${renderBlocksPreview(activity.blocks)}
        ${activity.assignment ? `<div class="preview-callout" style="margin-top:20px">📎 Tarea: ${escapeHtml(activity.assignment.title)}</div>` : ""}
      </div>
    </div>`;
}

export function renderExamPreview(exam) {
  const qCount = exam.questions?.length || 0;
  return `
    <div class="preview-device">
      <div class="preview-body" style="padding-top:32px">
        <p class="preview-tag">📝 Examen</p>
        <h2 class="preview-title" style="font-size:22px;margin-bottom:12px">${escapeHtml(exam.title)}</h2>
        ${exam.instructions ? `<p class="preview-intro">${escapeHtml(exam.instructions)}</p>` : ""}
        <div class="preview-exam-meta">
          <span>${qCount} preguntas</span>
          <span>${exam.timeLimitMin} min</span>
          <span>Nota mínima: ${exam.passScore}%</span>
          <span>${exam.maxAttempts} intento(s)</span>
        </div>
        ${renderBlocksPreview(exam.blocks)}
        <div class="preview-exam-sample">
          ${(exam.questions || []).slice(0, 2).map((q, i) => `
            <div class="preview-exam-q">
              <strong>${i + 1}. ${escapeHtml(q.text)}</strong>
              <ul>${(q.options || []).map((o) => `<li>${escapeHtml(o)}</li>`).join("")}</ul>
            </div>`).join("")}
          ${qCount > 2 ? `<p class="admin-muted">… y ${qCount - 2} preguntas más</p>` : ""}
        </div>
      </div>
    </div>`;
}
