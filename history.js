// Reads the same localStorage key script.js writes to after every
// successful solve (see saveToHistory() in script.js) and renders it as a
// list of expandable cards, most recent first. localStorage (rather than
// sessionStorage) means this persists across tabs and browser restarts
// until cleared here or the browser's site data is wiped.

const HISTORY_KEY = "stoichiolab_history";

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch (e) {
    return [];
  }
}

// Masses are always stored internally in grams; format back into whichever
// unit that record was originally solved in (falls back to "g" for
// entries saved before the mg default / unit-aware display existed).
function formatMass(grams, unit) {
  const val = unit === "mg" ? grams * 1000 : grams;
  return val.toFixed(unit === "mg" ? 2 : 4);
}

function formatTimestamp(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function targetSummary(record) {
  const parts = record.targetRows.map(r => {
    // Mol% mode follows normal chemical-formula convention: an implicit
    // coefficient of 1 isn't written (BaTiO3, not Ba1Ti1O3).
    if (record.mode !== "wt" && Number(r.conc) === 1) return r.element;
    const val = record.mode === "wt" ? `${r.conc}wt%` : r.conc;
    return `${r.element}${val}`;
  });
  return parts.join(record.mode === "wt" ? " " : "");
}

function renderRecord(record, index) {
  const unit = record.quantity.unit === "mg" ? "mg" : "g";
  const basis = record.quantity.basis === "precursors" ? "precursors" : "product";
  // Records saved before the "total precursors" basis existed always
  // used the target-product basis, and their produced mass was exactly
  // the entered quantity -- fall back to that when the field is absent.
  const producedTargetMass = record.producedTargetMass != null
    ? record.producedTargetMass
    : (unit === "mg" ? record.quantity.value / 1000 : record.quantity.value);

  const precursorRows = record.precursors.map(p => `
    <tr>
      <td>${p.formula}</td>
      <td class="num">${p.molarMass.toFixed(3)}</td>
      <td class="num">${p.moles.toFixed(6)}</td>
      <td class="num">${formatMass(p.mass, unit)}</td>
      <td class="num">${p.wtPctOfMix.toFixed(3)}%</td>
      <td class="num">${p.molPctOfMix.toFixed(3)}%</td>
    </tr>`).join("");

  const doNotBalanceLines = record.doNotBalance.split("\n").filter(Boolean);

  return `
    <details class="history-card" ${index === 0 ? "open" : ""}>
      <summary>
        <div>
          <div class="hc-title">${targetSummary(record)}</div>
          <div class="hc-meta">${formatTimestamp(record.timestamp)} &middot; ${record.quantity.value} ${unit} ${basis === "precursors" ? "total precursors" : "target"} &middot; ${record.mode === "wt" ? "Wt%" : "Mol%"} mode &middot; ${formatMass(record.totalPrecursorMass, unit)} ${unit} total precursor mass</div>
        </div>
        <div class="hc-actions">
          <button type="button" class="hc-delete" data-idx="${index}" title="Delete this entry" aria-label="Delete this history entry">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
          <span class="hc-chevron">&#9656;</span>
        </div>
      </summary>
      <div class="hc-body">
        <div class="stat-row">
          <div class="stat-tile"><div class="label">Target product mass</div><div class="value">${formatMass(producedTargetMass, unit)} <small>${unit}</small></div></div>
          <div class="stat-tile"><div class="label">Total precursor mass</div><div class="value">${formatMass(record.totalPrecursorMass, unit)} <small>${unit}</small></div></div>
          <div class="stat-tile"><div class="label">Target formula-unit mass</div><div class="value">${record.targetFormulaMass.toFixed(3)} <small>g/mol</small></div></div>
          <div class="stat-tile"><div class="label">Moles of target</div><div class="value">${record.molesFormulaUnit.toFixed(6)} <small>mol</small></div></div>
          <div class="stat-tile"><div class="label">System</div><div class="value" style="font-size:14px;">${record.system.nEq}&times;${record.system.nUnknown} <small>${record.system.exact ? "exact" : "least-sq."}</small></div></div>
        </div>
        <table class="results-table">
          <thead><tr><th>Precursor</th><th class="num">Molar mass (g/mol)</th><th class="num">Moles</th><th class="num">Mass (${unit})</th><th class="num">Wt% of mix</th><th class="num">Mol% of mix</th></tr></thead>
          <tbody>${precursorRows}</tbody>
        </table>
        ${doNotBalanceLines.length ? `<p style="font-size:12px; color:var(--muted); margin-top:10px;"><b>DO-NOT-balance rules used:</b> ${doNotBalanceLines.join(", ")}</p>` : ""}
      </div>
    </details>`;
}

function render() {
  const history = loadHistory();
  const countEl = document.getElementById("historyCount");
  const listEl = document.getElementById("historyList");

  countEl.textContent = history.length === 0
    ? "No calculations saved yet."
    : `${history.length} calculation${history.length === 1 ? "" : "s"} saved.`;

  if (history.length === 0) {
    listEl.innerHTML = `<div class="history-empty">Nothing here yet, run a calculation on the <a href="../calculator/">Calculator</a> page and it'll show up here.</div>`;
    return;
  }

  listEl.innerHTML = history.map(renderRecord).join("");
}

document.getElementById("clearHistoryBtn").addEventListener("click", async () => {
  const ok = await confirmModal({
    title: "Clear all history?",
    message: "Clear all saved calculation history? This can't be undone.",
    confirmText: "Clear history",
    danger: true,
  });
  if (!ok) return;
  localStorage.removeItem(HISTORY_KEY);
  render();
});

// Delegated once (not inside render()) so re-rendering the list on every
// delete doesn't stack up duplicate listeners. preventDefault + stopPropagation
// keep the click from also toggling the <details> element it's nested inside.
document.getElementById("historyList").addEventListener("click", e => {
  const delBtn = e.target.closest(".hc-delete");
  if (!delBtn) return;
  e.preventDefault();
  e.stopPropagation();
  const history = loadHistory();
  history.splice(Number(delBtn.dataset.idx), 1);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (err) {
    // localStorage unavailable -- render() below still reflects the
    // in-memory removal for this page view.
  }
  render();
});

render();
