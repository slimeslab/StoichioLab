// Shared confirm-dialog modal, replacing native confirm() with a themed
// dialog matching the rest of the site instead of a bare browser alert.
// Used by script.js (recipe overwrite/delete) and history.js (clear
// history). Injected once on first use, reused for every call.
(function () {
  let overlay, titleEl, messageEl, confirmBtn, cancelBtn, resolvePending, lastFocused;

  function ensureModal() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-box" role="alertdialog" aria-modal="true" aria-labelledby="modalTitle" aria-describedby="modalMessage">
        <h3 class="modal-title" id="modalTitle"></h3>
        <p class="modal-message" id="modalMessage"></p>
        <div class="modal-actions">
          <button type="button" class="modal-btn modal-btn-cancel"></button>
          <button type="button" class="modal-btn modal-btn-confirm"></button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    titleEl = overlay.querySelector(".modal-title");
    messageEl = overlay.querySelector(".modal-message");
    cancelBtn = overlay.querySelector(".modal-btn-cancel");
    confirmBtn = overlay.querySelector(".modal-btn-confirm");

    function close(result) {
      overlay.classList.remove("open");
      document.removeEventListener("keydown", onKeydown);
      if (lastFocused && lastFocused.focus) lastFocused.focus();
      if (resolvePending) { resolvePending(result); resolvePending = null; }
    }
    function onKeydown(e) {
      if (e.key === "Escape") close(false);
      else if (e.key === "Enter") close(true);
    }
    confirmBtn.addEventListener("click", () => close(true));
    cancelBtn.addEventListener("click", () => close(false));
    overlay.addEventListener("mousedown", e => { if (e.target === overlay) close(false); });
    overlay._onKeydown = onKeydown;
  }

  window.confirmModal = function ({ title = "Are you sure?", message = "", confirmText = "Confirm", cancelText = "Cancel", danger = false } = {}) {
    ensureModal();
    titleEl.textContent = title;
    messageEl.textContent = message;
    cancelBtn.textContent = cancelText;
    confirmBtn.textContent = confirmText;
    confirmBtn.classList.toggle("modal-btn-danger", danger);
    lastFocused = document.activeElement;
    overlay.classList.add("open");
    document.addEventListener("keydown", overlay._onKeydown);
    confirmBtn.focus();
    return new Promise(resolve => { resolvePending = resolve; });
  };
})();
