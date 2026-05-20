const META = {
  success: { icon: "✓", kicker: "Completado" },
  pending: { icon: "⏳", kicker: "En revisión" },
  error: { icon: "!", kicker: "Atención" },
  info: { icon: "✦", kicker: "Información" },
};

export function showCampusDialog({
  title,
  message,
  type = "success",
  buttonLabel = "Entendido",
  onClose,
} = {}) {
  const { icon, kicker } = META[type] || META.info;

  const overlay = document.createElement("div");
  overlay.className = "campus-modal-overlay";
  overlay.innerHTML = `
    <div class="campus-modal campus-modal--${type}" role="dialog" aria-modal="true" aria-labelledby="campusModalTitle">
      <div class="campus-modal-glow"></div>
      <div class="campus-modal-icon">${icon}</div>
      <p class="login-kicker">${kicker}</p>
      <h3 class="campus-modal-title" id="campusModalTitle">${title}</h3>
      <p class="campus-modal-message">${message}</p>
      <button type="button" class="campus-btn campus-btn--gold campus-modal-btn">${buttonLabel}</button>
    </div>`;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("is-visible"));

  const close = () => {
    overlay.classList.remove("is-visible");
    setTimeout(() => {
      overlay.remove();
      onClose?.();
    }, 280);
  };

  overlay.querySelector(".campus-modal-btn").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  const onKey = (e) => {
    if (e.key === "Escape") {
      close();
      document.removeEventListener("keydown", onKey);
    }
  };
  document.addEventListener("keydown", onKey);

  return close;
}
