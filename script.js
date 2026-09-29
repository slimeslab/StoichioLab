// ---------------------------------------------------------------------
// Atomic weights (IUPAC standard values, g/mol) -- H through U, plus a
// handful of common synthetic/heavy elements occasionally used as dopants.
// ---------------------------------------------------------------------
const ATOMIC_WEIGHTS = {
  H:1.008, He:4.0026, Li:6.94, Be:9.0122, B:10.81, C:12.011, N:14.007, O:15.999,
  F:18.998, Ne:20.180, Na:22.990, Mg:24.305, Al:26.982, Si:28.085, P:30.974,
  S:32.06, Cl:35.45, Ar:39.948, K:39.098, Ca:40.078, Sc:44.956, Ti:47.867,
  V:50.942, Cr:51.996, Mn:54.938, Fe:55.845, Co:58.933, Ni:58.693, Cu:63.546,
  Zn:65.38, Ga:69.723, Ge:72.630, As:74.922, Se:78.971, Br:79.904, Kr:83.798,
  Rb:85.468, Sr:87.62, Y:88.906, Zr:91.224, Nb:92.906, Mo:95.95, Tc:98.0,
  Ru:101.07, Rh:102.91, Pd:106.42, Ag:107.87, Cd:112.41, In:114.82, Sn:118.71,
  Sb:121.76, Te:127.60, I:126.90, Xe:131.29, Cs:132.91, Ba:137.33, La:138.91,
  Ce:140.12, Pr:140.91, Nd:144.24, Pm:145.0, Sm:150.36, Eu:151.96, Gd:157.25,
  Tb:158.93, Dy:162.50, Ho:164.93, Er:167.26, Tm:168.93, Yb:173.05, Lu:174.97,
  Hf:178.49, Ta:180.95, W:183.84, Re:186.21, Os:190.23, Ir:192.22, Pt:195.08,
  Au:196.97, Hg:200.59, Tl:204.38, Pb:207.2, Bi:208.98, Po:209.0, At:210.0,
  Rn:222.0, Fr:223.0, Ra:226.0, Ac:227.0, Th:232.04, Pa:231.04, U:238.03,
  Np:237.0, Pu:244.0
};

// ---------------------------------------------------------------------
// Common precursor library -- reagents that turn up constantly in
// solid-state ABO3/perovskite synthesis. Populates a <datalist> so typing
// a formula offers a pick-list instead of requiring it from memory; molar
// mass is still always computed live from the formula itself, not stored
// here.
// ---------------------------------------------------------------------
const COMMON_PRECURSORS = [
  // A-site carbonates / oxides / nitrates
  { formula: "BaCO3", name: "Barium carbonate" },
  { formula: "SrCO3", name: "Strontium carbonate" },
  { formula: "CaCO3", name: "Calcium carbonate" },
  { formula: "Li2CO3", name: "Lithium carbonate" },
  { formula: "Na2CO3", name: "Sodium carbonate" },
  { formula: "K2CO3", name: "Potassium carbonate" },
  { formula: "PbO", name: "Lead(II) oxide" },
  { formula: "PbCO3", name: "Lead(II) carbonate" },
  { formula: "Bi2O3", name: "Bismuth(III) oxide" },
  { formula: "La2O3", name: "Lanthanum(III) oxide" },
  { formula: "Ba(NO3)2", name: "Barium nitrate" },
  { formula: "Sr(NO3)2", name: "Strontium nitrate" },
  { formula: "Ca(NO3)2", name: "Calcium nitrate" },
  { formula: "NaNO3", name: "Sodium nitrate" },
  { formula: "KNO3", name: "Potassium nitrate" },
  // B-site oxides
  { formula: "TiO2", name: "Titanium(IV) oxide" },
  { formula: "ZrO2", name: "Zirconium(IV) oxide" },
  { formula: "HfO2", name: "Hafnium(IV) oxide" },
  { formula: "Nb2O5", name: "Niobium(V) oxide" },
  { formula: "Ta2O5", name: "Tantalum(V) oxide" },
  { formula: "Sb2O3", name: "Antimony(III) oxide" },
  { formula: "SnO2", name: "Tin(IV) oxide" },
  { formula: "WO3", name: "Tungsten(VI) oxide" },
  { formula: "MoO3", name: "Molybdenum(VI) oxide" },
  // Common dopants / transition metals
  { formula: "Fe2O3", name: "Iron(III) oxide" },
  { formula: "MnO2", name: "Manganese(IV) oxide" },
  { formula: "MnCO3", name: "Manganese(II) carbonate" },
  { formula: "ZnO", name: "Zinc oxide" },
  { formula: "NiO", name: "Nickel(II) oxide" },
  { formula: "CoO", name: "Cobalt(II) oxide" },
  { formula: "Co3O4", name: "Cobalt(II,III) oxide" },
  { formula: "CuO", name: "Copper(II) oxide" },
  { formula: "Y2O3", name: "Yttrium(III) oxide" },
  { formula: "Sm2O3", name: "Samarium(III) oxide" },
  { formula: "Nd2O3", name: "Neodymium(III) oxide" },
];

function populatePrecursorDatalist() {
  const list = document.getElementById("precursorList");
  if (!list) return;
  list.innerHTML = COMMON_PRECURSORS.map(p => `<option value="${p.formula}">${p.formula}: ${p.name}</option>`).join("");
}

// ---------------------------------------------------------------------
// Chemical formula parser: handles nested parentheses, decimal
// subscripts, e.g. "Ba0.8Ca0.2Ti0.9Zr0.1O3", "Ca(NO3)2".
// Returns {elements: {Sym: count}, error: string|null}
// ---------------------------------------------------------------------
function parseFormula(formula) {
  const s = formula.replace(/\s+/g, "").replace(/·/g, ".."); // guard mid-dot hydrate notation
  let i = 0;

  function parseNumber() {
    const start = i;
    while (i < s.length && /[0-9.]/.test(s[i])) i++;
    if (i === start) return 1;
    const n = parseFloat(s.slice(start, i));
    return isNaN(n) ? 1 : n;
  }

  function parseGroup() {
    const counts = {};
    while (i < s.length && s[i] !== ")") {
      if (s[i] === "(") {
        i++; // consume '('
        const inner = parseGroup();
        if (i >= s.length || s[i] !== ")") throw new Error("Unmatched '(' in formula: " + formula);
        i++; // consume ')'
        const mult = parseNumber();
        for (const el in inner) counts[el] = (counts[el] || 0) + inner[el] * mult;
      } else if (/[A-Z]/.test(s[i])) {
        let sym = s[i]; i++;
        if (i < s.length && /[a-z]/.test(s[i])) { sym += s[i]; i++; }
        const mult = parseNumber();
        counts[sym] = (counts[sym] || 0) + mult;
      } else {
        throw new Error("Unexpected character '" + s[i] + "' in formula: " + formula);
      }
    }
    return counts;
  }

  try {
    const elements = parseGroup();
    if (i !== s.length) throw new Error("Unmatched ')' in formula: " + formula);
    return { elements, error: null };
  } catch (e) {
    return { elements: {}, error: e.message };
  }
}

function molarMassOf(elementCounts) {
  let m = 0;
  for (const el in elementCounts) {
    if (!(el in ATOMIC_WEIGHTS)) return null;
    m += elementCounts[el] * ATOMIC_WEIGHTS[el];
  }
  return m;
}

function escapeRegExp(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

// Parse the "DO NOT balance" textarea into {excludeElements: Set, groupRules: [{group, replacement}]}
function parseDoNotBalance(text) {
  const excludeElements = new Set();
  const groupRules = [];
  text.split("\n").map(l => l.trim()).filter(Boolean).forEach(line => {
    if (line.includes("=")) {
      const [group, replacement] = line.split("=").map(x => x.trim());
      groupRules.push({ group, replacement });
    } else {
      excludeElements.add(line);
    }
  });
  return { excludeElements, groupRules };
}

// Apply group-substitution rules to a formula STRING (textual, before
// parsing) so the resulting parsed composition reflects decomposition
// for balance purposes -- e.g. "Ca(NO3)2" with rule NO3=O -> "Ca(O)2".
function applyGroupRulesToString(formula, groupRules) {
  let s = formula;
  for (const { group, replacement } of groupRules) {
    const rep = replacement || "";
    const parenRe = new RegExp("\\(" + escapeRegExp(group) + "\\)(\\d*\\.?\\d*)", "g");
    s = s.replace(parenRe, (m, mult) => "(" + rep + ")" + mult);
    const bareRe = new RegExp(escapeRegExp(group) + "(\\d*\\.?\\d*)(?=[A-Z)]|$)", "g");
    s = s.replace(bareRe, (m, mult) => "(" + rep + ")" + mult);
  }
  return s;
}

// ---------------------------------------------------------------------
// Linear algebra: solve A x = b (square, via Gaussian elimination with
// partial pivoting). Used directly for square systems, and via normal
// equations (A^T A) x = A^T b for non-square (least-squares) systems.
// ---------------------------------------------------------------------
function gaussianSolve(A, b) {
  const n = A.length;
  const M = A.map((row, r) => [...row, b[r]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    if (Math.abs(M[pivot][col]) < 1e-12) return null; // singular
    [M[col], M[pivot]] = [M[pivot], M[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
    }
  }
  return M.map((row, r) => row[n] / row[r]);
}

function transpose(A) { return A[0].map((_, c) => A.map(row => row[c])); }
function matMul(A, B) {
  const result = [];
  for (let i = 0; i < A.length; i++) {
    result.push([]);
    for (let j = 0; j < B[0].length; j++) {
      let sum = 0;
      for (let k = 0; k < B.length; k++) sum += A[i][k] * B[k][j];
      result[i].push(sum);
    }
  }
  return result;
}

function solveLeastSquares(A, b) {
  const nEq = A.length, nUnknown = A[0].length;
  if (nEq === nUnknown) return gaussianSolve(A, b);
  const At = transpose(A);
  const AtA = matMul(At, A);
  const Atb = matMul(At, b.map(v => [v])).map(row => row[0]);
  return gaussianSolve(AtA, Atb);
}

// ---------------------------------------------------------------------
// UI: dynamic row management
// ---------------------------------------------------------------------
function addTargetRow(element = "", conc = "", molarMass = "") {
  const tbody = document.querySelector("#targetTable tbody");
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" class="t-element" value="${element}" placeholder="e.g. Ba"></td>
    <td><input type="number" step="any" class="t-conc" value="${conc}" placeholder="0.8"></td>
    <td><input type="number" step="any" class="t-mm" value="${molarMass}" placeholder="auto"></td>
    <td class="row-actions"><button type="button" onclick="this.closest('tr').remove(); refreshModeNote();">&times;</button></td>
  `;
  tbody.appendChild(tr);
  tr.querySelector(".t-element").addEventListener("input", e => {
    const mmInput = tr.querySelector(".t-mm");
    if (!mmInput.dataset.userEdited) {
      const sym = e.target.value.trim();
      mmInput.value = ATOMIC_WEIGHTS[sym] !== undefined ? ATOMIC_WEIGHTS[sym] : "";
    }
  });
  tr.querySelector(".t-mm").addEventListener("input", e => { e.target.dataset.userEdited = "1"; });
  tr.querySelector(".t-conc").addEventListener("input", refreshModeNote);
}

function addPrecursorRow(formula = "") {
  const tbody = document.querySelector("#precursorTable tbody");
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" class="p-formula" value="${formula}" placeholder="e.g. BaCO3" list="precursorList"></td>
    <td class="p-mm" style="color:var(--muted); font-family:var(--mono);">--</td>
    <td class="row-actions"><button type="button" onclick="this.closest('tr').remove();">&times;</button></td>
  `;
  tbody.appendChild(tr);
  const updateMM = () => {
    const f = tr.querySelector(".p-formula").value.trim();
    if (!f) { tr.querySelector(".p-mm").textContent = "--"; return; }
    const { elements, error } = parseFormula(f);
    if (error) { tr.querySelector(".p-mm").textContent = "invalid"; return; }
    const mm = molarMassOf(elements);
    tr.querySelector(".p-mm").textContent = mm === null ? "unknown element" : mm.toFixed(3);
  };
  tr.querySelector(".p-formula").addEventListener("input", updateMM);
  updateMM();
}

// .mode-toggle relies on a CSS :has(input:checked) selector to highlight
// the active label, which doesn't reliably repaint after a JS-driven
// .checked assignment or .click() on the (visually hidden) radio input in
// every browser -- toggling an explicit class here is the robust
// belt-and-suspenders fix, kept in sync alongside the CSS rule.
function syncToggleActive(name) {
  document.querySelectorAll(`input[name="${name}"]`).forEach(input => {
    input.closest("label").classList.toggle("active", input.checked);
  });
}

function getSelectedMode() {
  return document.querySelector('input[name="mode"]:checked').value;
}

function refreshModeNote() {
  const mode = getSelectedMode();
  const note = document.getElementById("modeNote");
  if (mode === "mol") {
    note.className = "mode-note";
    note.textContent = "Mol% mode -- concentrations are used directly as stoichiometric coefficients.";
  } else {
    note.className = "mode-note auto-wt";
    note.textContent = "Wt% mode -- concentrations are treated as weight fractions/percent and converted via molar mass.";
  }
  syncToggleActive("mode");
}

function effectiveMode() {
  return getSelectedMode();
}

document.querySelectorAll('input[name="mode"]').forEach(r => r.addEventListener("change", refreshModeNote));

// ---------------------------------------------------------------------
// Total quantity: basis (target product vs. total precursors) + display
// unit (g/mg). Internally every mass is always computed in grams; this
// only converts for display/export so results come back in whichever
// unit the quantity was entered in.
// ---------------------------------------------------------------------
function getQtyBasis() {
  return document.querySelector('input[name="qtyBasis"]:checked').value;
}
function refreshQtyBasisLabel() {
  document.getElementById("qtyBasisLabel").textContent =
    getQtyBasis() === "precursors" ? "of total starting materials (precursors)" : "of final target compound";
  syncToggleActive("qtyBasis");
}
document.querySelectorAll('input[name="qtyBasis"]').forEach(r => r.addEventListener("change", refreshQtyBasisLabel));
refreshQtyBasisLabel();

function formatMass(grams, unit) {
  const val = unit === "mg" ? grams * 1000 : grams;
  return val.toFixed(unit === "mg" ? 2 : 4);
}
function fillTargetTableFromFormula(formula) {
  const { elements, error } = parseFormula(formula);
  const errorBox = document.getElementById("errorBox");
  if (error) {
    errorBox.innerHTML = `<div class="error-box">Couldn't parse "${formula}": ${error}</div>`;
    return;
  }
  errorBox.innerHTML = "";
  document.querySelector("#targetTable tbody").innerHTML = "";
  for (const el in elements) {
    const mm = ATOMIC_WEIGHTS[el] !== undefined ? ATOMIC_WEIGHTS[el] : "";
    addTargetRow(el, elements[el], mm);
  }
  document.querySelector('input[name="mode"][value="mol"]').checked = true;
  refreshModeNote();
}

document.getElementById("parseFormulaBtn").addEventListener("click", () => {
  fillTargetTableFromFormula(document.getElementById("targetFormulaQuick").value.trim());
});
document.getElementById("targetFormulaQuick").addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); fillTargetTableFromFormula(e.target.value.trim()); }
});

document.getElementById("addTargetRow").addEventListener("click", () => addTargetRow());
document.getElementById("addPrecursorRow").addEventListener("click", () => addPrecursorRow());

document.getElementById("exBaTiO3").addEventListener("click", () => {
  document.getElementById("targetFormulaQuick").value = "BaTiO3";
  document.querySelector("#targetTable tbody").innerHTML = "";
  addTargetRow("Ba", "1", "137.33");
  addTargetRow("Ti", "1", "47.867");
  addTargetRow("O", "3", "15.999");
  document.querySelector('input[name="mode"][value="mol"]').checked = true;
  document.querySelector("#precursorTable tbody").innerHTML = "";
  addPrecursorRow("BaCO3");
  addPrecursorRow("TiO2");
  document.getElementById("doNotBalance").value = "CO3=O";
  document.getElementById("qtyValue").value = "5";
  document.getElementById("qtyUnit").value = "g";
  refreshModeNote();
});

document.getElementById("exDoped").addEventListener("click", () => {
  // wt% values below are the real, self-consistent weight percents for
  // Ba0.8Ca0.2Ti0.9Zr0.1O3 -- note O still gets its REAL wt% here even
  // though it's excluded from the precursor balance below: DO-NOT-balance
  // only drops an element from the linear solve, it does NOT mean that
  // element's concentration can be left at 0 -- it's still needed to get
  // the target's total molar mass (and therefore the moles-of-target
  // figure) right.
  document.querySelector("#targetTable tbody").innerHTML = "";
  addTargetRow("Ba", "50.3780", "137.33");
  addTargetRow("Ca", "3.6755", "40.078");
  addTargetRow("Ti", "19.7544", "47.867");
  addTargetRow("Zr", "4.1831", "91.224");
  addTargetRow("O", "22.0090", "15.999");
  document.querySelector('input[name="mode"][value="wt"]').checked = true;
  document.querySelector("#precursorTable tbody").innerHTML = "";
  addPrecursorRow("BaCO3");
  addPrecursorRow("CaCO3");
  addPrecursorRow("TiO2");
  addPrecursorRow("ZrO2");
  document.getElementById("doNotBalance").value = "O\nCO3=O";
  document.getElementById("qtyValue").value = "10";
  document.getElementById("qtyUnit").value = "g";
  refreshModeNote();
});

// ---------------------------------------------------------------------
// Export (CSV download + print) -- buttons are re-rendered into
// resultsBox on every solve, so the click handler is delegated once here
// rather than rebound each time.
// ---------------------------------------------------------------------
let lastResultCsv = "";

document.getElementById("resultsBox").addEventListener("click", e => {
  if (e.target.id === "exportCsvBtn") {
    const blob = new Blob([lastResultCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stoichiolab_results.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } else if (e.target.id === "printBtn") {
    window.print();
  } else {
    // Batch-mode accordion: clicking a composition's header opens its
    // breakdown and closes whichever other one was open, so only one
    // composition's full detail is shown at a time.
    const header = e.target.closest(".batch-item-header");
    if (!header) return;
    const item = header.closest(".batch-item");
    const body = item.querySelector(".batch-item-body");
    const wasOpen = !body.hidden;
    document.querySelectorAll("#resultsBox .batch-item-body").forEach(b => { b.hidden = true; });
    document.querySelectorAll("#resultsBox .batch-item-header").forEach(h => { h.setAttribute("aria-expanded", "false"); h.classList.remove("open"); });
    if (!wasOpen) {
      body.hidden = false;
      header.setAttribute("aria-expanded", "true");
      header.classList.add("open");
    }
  }
});

// ---------------------------------------------------------------------
// Doping-series batch mode -- solves several full compositions (each its
// own mol% formula, e.g. different doping levels of the same system) in
// one pass. Only valid when every composition uses exactly the same
// element set (and therefore the same precursors), so one balance matrix
// A can be built once and reused; only each composition's required moles
// (the right-hand side) changes.
// ---------------------------------------------------------------------
document.getElementById("batchEnabled").addEventListener("change", e => {
  document.getElementById("batchControls").style.display = e.target.checked ? "block" : "none";
});

function runBatchSolve() {
  const errorBox = document.getElementById("errorBox");
  const resultsBox = document.getElementById("resultsBox");
  errorBox.innerHTML = "";
  resultsBox.innerHTML = "";
  const errors = [];

  const formulaLines = document.getElementById("batchFormulas").value
    .split("\n").map(s => s.trim()).filter(Boolean);
  if (formulaLines.length < 2) errors.push("Enter at least two compositions (one mol% formula per line) to compare.");

  const { excludeElements, groupRules } = parseDoNotBalance(document.getElementById("doNotBalance").value);

  const precursorRows = [...document.querySelectorAll("#precursorTable tbody tr")]
    .map(tr => tr.querySelector(".p-formula").value.trim())
    .filter(Boolean);
  if (precursorRows.length === 0) errors.push("Add at least one starting material (precursor).");

  const precursors = [];
  precursorRows.forEach(formula => {
    const real = parseFormula(formula);
    if (real.error) { errors.push(`Precursor "${formula}": ${real.error}`); return; }
    const realMM = molarMassOf(real.elements);
    if (realMM === null) { errors.push(`Precursor "${formula}" contains an unknown element.`); return; }
    const balanceFormulaStr = applyGroupRulesToString(formula, groupRules);
    const balanceParsed = parseFormula(balanceFormulaStr);
    if (balanceParsed.error) { errors.push(`Precursor "${formula}" (after DO-NOT-balance substitution): ${balanceParsed.error}`); return; }
    precursors.push({ formula, realMolarMass: realMM, balanceElements: balanceParsed.elements });
  });

  const qtyValue = parseFloat(document.getElementById("qtyValue").value);
  const qtyUnit = document.getElementById("qtyUnit").value;
  if (isNaN(qtyValue) || qtyValue <= 0) errors.push("Enter a positive total target quantity.");

  // Each line is a mol%-style formula (same convention as the "quick
  // entry" field above), parsed straight to element -> coefficient.
  const parsedRows = [];
  formulaLines.forEach(formula => {
    const { elements, error } = parseFormula(formula);
    if (error) { errors.push(`"${formula}": ${error}`); return; }
    for (const el in elements) {
      if (!(el in ATOMIC_WEIGHTS)) { errors.push(`"${formula}": unknown element "${el}".`); return; }
    }
    parsedRows.push({ formula, moles: elements });
  });

  // Every composition must use exactly the same elements -- that's what
  // lets one balance matrix apply to the whole batch instead of solving
  // each one from scratch.
  if (parsedRows.length > 1) {
    const referenceElements = Object.keys(parsedRows[0].moles).sort().join(",");
    parsedRows.slice(1).forEach(r => {
      if (Object.keys(r.moles).sort().join(",") !== referenceElements) {
        errors.push(`"${r.formula}" uses a different element set than "${parsedRows[0].formula}" -- every composition must use the same elements.`);
      }
    });
  }

  if (errors.length) {
    errorBox.innerHTML = `<div class="error-box">${errors.map(e => "&bull; " + e).join("<br>")}</div>`;
    return;
  }

  const desiredGrams = qtyUnit === "mg" ? qtyValue / 1000 : qtyValue;
  const qtyBasis = getQtyBasis();

  const allElements = Object.keys(parsedRows[0].moles);
  const balanceElements = allElements.filter(el => !excludeElements.has(el));
  if (balanceElements.length === 0) {
    errorBox.innerHTML = `<div class="error-box">All target elements are excluded via DO-NOT-balance -- nothing left to solve for.</div>`;
    return;
  }
  // The balance matrix A is identical for every composition (same
  // elements, same precursors) -- built once, reused for each RHS below.
  const A = balanceElements.map(el => precursors.map(p => p.balanceElements[el] || 0));
  const nEq = balanceElements.length, nUnknown = precursors.length;

  const batchResults = [];
  parsedRows.forEach(row => {
    let formulaMass = 0;
    for (const el in row.moles) formulaMass += row.moles[el] * ATOMIC_WEIGHTS[el];
    // Solve at unit scale (1 mole of formula unit) once, then apply
    // whichever basis (target product mass, or total precursor mass) as
    // a plain scale factor -- see the single-solve handler above for why
    // this is valid (everything here is linear in molesFormulaUnit).
    const unitRequiredMoles = balanceElements.map(el => row.moles[el]);
    const x1 = nEq === nUnknown ? gaussianSolve(A, unitRequiredMoles) : solveLeastSquares(A, unitRequiredMoles);
    if (x1 === null) {
      errors.push(`"${row.formula}": balance system is singular for this composition -- skipped.`);
      return;
    }
    const unitTotalMass = x1.reduce((sum, moles, idx) => sum + moles * precursors[idx].realMolarMass, 0);
    const scale = qtyBasis === "precursors" ? desiredGrams / unitTotalMass : desiredGrams / formulaMass;
    const molesFormulaUnit = scale;
    const x = x1.map(v => v * scale);
    const requiredMoles = balanceElements.map(el => molesFormulaUnit * row.moles[el]);
    const masses = precursors.map((p, idx) => x[idx] * p.realMolarMass);
    const totalMass = masses.reduce((a, b) => a + b, 0);
    const totalMoles = x.reduce((a, b) => a + b, 0);
    const producedTargetMass = molesFormulaUnit * formulaMass;

    // Sanity check: with nEq > nUnknown (more balance elements than
    // precursors -- typically because an anion like O wasn't excluded via
    // DO-NOT-balance), the least-squares solve above returns an
    // APPROXIMATE fit with no error, silently. Flag it here so a
    // forgotten "O" exclusion doesn't produce quietly-wrong masses.
    const achieved = balanceElements.map((el, i) => {
      let a = 0;
      precursors.forEach((p, j) => a += (p.balanceElements[el] || 0) * x[j]);
      return a;
    });
    const residuals = achieved.map((a, i) => a - requiredMoles[i]);
    const maxResidual = Math.max(...residuals.map(r => Math.abs(r)));
    const inexact = maxResidual > 1e-6 * Math.max(1, molesFormulaUnit);
    if (inexact) errors.push(`"${row.formula}": balance isn't exact (max residual ${maxResidual.toExponential(2)} mol) -- likely needs another element excluded via DO-NOT-balance for every composition to stay consistent.`);

    batchResults.push({
      formula: row.formula, moles: x, masses, totalMass, totalMoles, producedTargetMass,
      formulaMass, molesFormulaUnit, requiredMoles, achieved, residuals, inexact,
    });
  });

  if (batchResults.length === 0) {
    errorBox.innerHTML = `<div class="error-box">${errors.map(e => "&bull; " + e).join("<br>")}</div>`;
    return;
  }

  // ---- Render one collapsible item per composition, each showing the
  // same breakdown as a single solve (precursor masses/shares, balance
  // check). Only one item is open at a time (see the delegated click
  // handler below), so many compositions stay scannable instead of
  // dumping every number for every composition on screen at once.
  const itemsHtml = batchResults.map((r, idx) => {
    const precursorRowsHtml = precursors.map((p, i) => {
      const moles = r.moles[i];
      const mass = r.masses[i];
      const wtPct = (mass / r.totalMass) * 100;
      const molPct = (moles / r.totalMoles) * 100;
      return `<tr><td>${p.formula}</td><td class="num">${p.realMolarMass.toFixed(3)}</td><td class="num">${moles.toFixed(6)}</td><td class="num">${formatMass(mass, qtyUnit)}</td><td class="num">${wtPct.toFixed(3)}%</td><td class="num">${molPct.toFixed(3)}%</td></tr>`;
    }).join("");
    const balanceRowsHtml = balanceElements.map((el, i) => {
      const cls = Math.abs(r.residuals[i]) < 1e-6 * Math.max(1, Math.abs(r.requiredMoles[i])) ? "residual-ok" : "residual-bad";
      return `<tr><td>${el}</td><td class="num">${r.requiredMoles[i].toFixed(6)}</td><td class="num">${r.achieved[i].toFixed(6)}</td><td class="num ${cls}">${r.residuals[i].toExponential(2)}</td></tr>`;
    }).join("");
    const flagIcon = r.inexact ? ` <span style="color:var(--warn);" title="Balance isn't exact for this composition -- see the balance check below.">&#9888;</span>` : "";

    return `
      <div class="batch-item">
        <button type="button" class="batch-item-header" data-batch-idx="${idx}" aria-expanded="false">
          <span class="batch-item-formula">${r.formula}${flagIcon}</span>
          <span class="batch-item-total">${formatMass(r.totalMass, qtyUnit)} ${qtyUnit}</span>
          <span class="batch-item-chevron">&#9662;</span>
        </button>
        <div class="batch-item-body" hidden>
          <div class="stat-row">
            <div class="stat-tile"><div class="label">Target product mass</div><div class="value">${formatMass(r.producedTargetMass, qtyUnit)} <small>${qtyUnit}</small></div></div>
            <div class="stat-tile"><div class="label">Total precursor mass</div><div class="value">${formatMass(r.totalMass, qtyUnit)} <small>${qtyUnit}</small></div></div>
            <div class="stat-tile"><div class="label">Target formula-unit mass</div><div class="value">${r.formulaMass.toFixed(3)} <small>g/mol</small></div></div>
            <div class="stat-tile"><div class="label">Moles of target</div><div class="value">${r.molesFormulaUnit.toFixed(6)} <small>mol</small></div></div>
          </div>
          <table class="results-table"><thead><tr><th>Precursor</th><th class="num">Molar mass (g/mol)</th><th class="num">Moles needed</th><th class="num">Mass needed (${qtyUnit})</th><th class="num">Wt% of mix</th><th class="num">Mol% of mix</th></tr></thead><tbody>${precursorRowsHtml}</tbody></table>
          <div class="section-label">Balance check</div>
          <table class="results-table"><thead><tr><th>Element</th><th class="num">Required (mol)</th><th class="num">Achieved (mol)</th><th class="num">Residual</th></tr></thead><tbody>${balanceRowsHtml}</tbody></table>
        </div>
      </div>`;
  }).join("");

  const html = `
    <div class="results-actions">
      <button type="button" id="exportCsvBtn">Export CSV</button>
      <button type="button" id="printBtn">Print</button>
    </div>
    <p style="font-size:12px; color:var(--muted); margin-bottom:10px;">
      ${batchResults.length} compositions, same ${precursors.length} precursor(s) and balance system reused for every one, only each composition's required moles change. Click a composition to see its full breakdown.
    </p>
    <div class="batch-accordion">${itemsHtml}</div>
    ${errors.length ? `<div class="error-box" style="margin-top:10px;">${errors.map(e => "&bull; " + e).join("<br>")}</div>` : ""}`;

  resultsBox.innerHTML = html;

  // ---- CSV export: same per-composition breakdown as the UI, one block
  // per composition separated by a blank line, matching the single-solve
  // CSV's structure. ----
  const csvBlocks = batchResults.map(r => [
    `Composition,${r.formula}`,
    `Precursor,Molar mass (g/mol),Moles needed,Mass needed (${qtyUnit}),Wt% of mix,Mol% of mix`,
    ...precursors.map((p, i) => [p.formula, p.realMolarMass.toFixed(3), r.moles[i].toFixed(6), formatMass(r.masses[i], qtyUnit),
      ((r.masses[i] / r.totalMass) * 100).toFixed(3), ((r.moles[i] / r.totalMoles) * 100).toFixed(3)].join(",")),
    "",
    "Element,Required (mol),Achieved (mol),Residual",
    ...balanceElements.map((el, i) => [el, r.requiredMoles[i].toFixed(6), r.achieved[i].toFixed(6), r.residuals[i].toExponential(2)].join(",")),
  ].join("\n"));
  lastResultCsv = csvBlocks.join("\n\n");
}

// ---------------------------------------------------------------------
// Solve
// ---------------------------------------------------------------------
document.getElementById("solveBtn").addEventListener("click", () => {
  if (document.getElementById("batchEnabled").checked) { runBatchSolve(); return; }

  const errorBox = document.getElementById("errorBox");
  const resultsBox = document.getElementById("resultsBox");
  errorBox.innerHTML = "";
  resultsBox.innerHTML = "";
  const errors = [];

  // ---- Read target composition ----
  const targetRows = [...document.querySelectorAll("#targetTable tbody tr")].map(tr => ({
    element: tr.querySelector(".t-element").value.trim(),
    conc: parseFloat(tr.querySelector(".t-conc").value),
    molarMass: parseFloat(tr.querySelector(".t-mm").value),
  })).filter(r => r.element);

  if (targetRows.length === 0) errors.push("Add at least one element to the target composition.");
  targetRows.forEach(r => {
    if (!(r.element in ATOMIC_WEIGHTS)) errors.push(`Unknown element symbol "${r.element}" in target composition.`);
    if (isNaN(r.conc)) errors.push(`Missing concentration for element "${r.element}".`);
  });

  const mode = effectiveMode();
  if (mode === "wt") {
    targetRows.forEach(r => {
      if (isNaN(r.molarMass) || r.molarMass <= 0) errors.push(`Wt% mode needs a positive molar mass for "${r.element}".`);
    });
  }

  // ---- Read "do not balance" rules ----
  const { excludeElements, groupRules } = parseDoNotBalance(document.getElementById("doNotBalance").value);

  // ---- Read precursors ----
  const precursorRows = [...document.querySelectorAll("#precursorTable tbody tr")]
    .map(tr => tr.querySelector(".p-formula").value.trim())
    .filter(Boolean);
  if (precursorRows.length === 0) errors.push("Add at least one starting material (precursor).");

  const precursors = [];
  precursorRows.forEach(formula => {
    const real = parseFormula(formula);
    if (real.error) { errors.push(`Precursor "${formula}": ${real.error}`); return; }
    const realMM = molarMassOf(real.elements);
    if (realMM === null) { errors.push(`Precursor "${formula}" contains an unknown element.`); return; }

    const balanceFormulaStr = applyGroupRulesToString(formula, groupRules);
    const balanceParsed = parseFormula(balanceFormulaStr);
    if (balanceParsed.error) { errors.push(`Precursor "${formula}" (after DO-NOT-balance substitution): ${balanceParsed.error}`); return; }

    precursors.push({ formula, realElements: real.elements, realMolarMass: realMM, balanceElements: balanceParsed.elements });
  });

  if (errors.length) {
    errorBox.innerHTML = `<div class="error-box">${errors.map(e => "&bull; " + e).join("<br>")}</div>`;
    return;
  }

  // ---- Compute relative element moles for the target ----
  // n_i = coefficient directly (mol% mode) or wt%/molarMass (wt% mode)
  const targetMoles = {}; // element -> relative moles (per 1 "formula unit")
  targetRows.forEach(r => {
    targetMoles[r.element] = mode === "wt" ? r.conc / r.molarMass : r.conc;
  });

  // Target "formula unit" molar mass = sum(n_i * atomicWeight_i), using ALL
  // elements (including any marked DO-NOT-balance -- they're still part of
  // the product's actual mass, just not constrained by the precursor solve).
  let targetFormulaMass = 0;
  for (const el in targetMoles) targetFormulaMass += targetMoles[el] * ATOMIC_WEIGHTS[el];

  const qtyValue = parseFloat(document.getElementById("qtyValue").value);
  const qtyUnit = document.getElementById("qtyUnit").value;
  const qtyBasis = getQtyBasis();
  if (isNaN(qtyValue) || qtyValue <= 0) {
    errorBox.innerHTML = `<div class="error-box">Enter a positive total target quantity.</div>`;
    return;
  }
  const desiredGrams = qtyUnit === "mg" ? qtyValue / 1000 : qtyValue;

  // ---- Build the balance element list (target elements minus excluded) ----
  const balanceElements = Object.keys(targetMoles).filter(el => !excludeElements.has(el));
  if (balanceElements.length === 0) {
    errorBox.innerHTML = `<div class="error-box">All target elements are excluded via DO-NOT-balance -- nothing left to solve for.</div>`;
    return;
  }

  // ---- Build the precursor x element matrix, solve at unit scale (1
  // mole of the target formula unit) once -- both "target product" and
  // "total precursors" bases are then just a scale factor away, since
  // every mass here is linear in molesFormulaUnit. ----
  const A = balanceElements.map(el => precursors.map(p => p.balanceElements[el] || 0));
  const nEq = balanceElements.length, nUnknown = precursors.length;
  const unitRequiredMoles = balanceElements.map(el => targetMoles[el]);

  let x1;
  if (nEq === nUnknown) {
    x1 = gaussianSolve(A, unitRequiredMoles);
  } else {
    x1 = solveLeastSquares(A, unitRequiredMoles);
  }

  if (x1 === null) {
    errorBox.innerHTML = `<div class="error-box">Could not solve the balance system -- it may be singular (e.g. two precursors supplying exactly redundant elements, or too few precursors for the elements involved). Check your precursor list and DO-NOT-balance rules.</div>`;
    return;
  }

  const unitTotalPrecursorMass = x1.reduce((sum, moles, idx) => sum + moles * precursors[idx].realMolarMass, 0);
  const scale = qtyBasis === "precursors" ? desiredGrams / unitTotalPrecursorMass : desiredGrams / targetFormulaMass;
  const molesFormulaUnit = scale;
  const x = x1.map(v => v * scale);
  const requiredMoles = balanceElements.map(el => molesFormulaUnit * targetMoles[el]);

  if (x.some(v => v < -1e-6)) {
    errorBox.innerHTML += `<div class="error-box">Warning: the solution requires a <b>negative</b> amount of at least one precursor -- this composition may not be reachable with this precursor set. Results are shown anyway for reference.</div>`;
  }

  // ---- Render results ----
  // Precursor masses/moles come straight out of the solve above -- the
  // wt%/mol% "doping" figure a synthesis paper would quote (e.g. Table 1's
  // "Fe2O3 doped (wt.%)" column) is just each precursor's own mass/moles as
  // a share of the total, reported alongside the gram value, not a separate
  // calculation: the target composition already fully determines it.
  const precursorMoles = x;
  const precursorMasses = precursors.map((p, idx) => precursorMoles[idx] * p.realMolarMass);
  const totalPrecursorMass = precursorMasses.reduce((a, b) => a + b, 0);
  const totalPrecursorMoles = precursorMoles.reduce((a, b) => a + b, 0);
  const producedTargetMass = molesFormulaUnit * targetFormulaMass;

  const rowsHtml = precursors.map((p, idx) => {
    const moles = precursorMoles[idx];
    const mass = precursorMasses[idx];
    const wtPct = (mass / totalPrecursorMass) * 100;
    const molPct = (moles / totalPrecursorMoles) * 100;
    return `<tr><td>${p.formula}</td><td class="num">${p.realMolarMass.toFixed(3)}</td><td class="num">${moles.toFixed(6)}</td><td class="num">${formatMass(mass, qtyUnit)}</td><td class="num">${wtPct.toFixed(3)}%</td><td class="num">${molPct.toFixed(3)}%</td></tr>`;
  }).join("");

  let html = `
    <div class="results-actions">
      <button type="button" id="exportCsvBtn">Export CSV</button>
      <button type="button" id="printBtn">Print</button>
    </div>
    <div class="stat-row">
      <div class="stat-tile"><div class="label">Target product mass</div><div class="value">${formatMass(producedTargetMass, qtyUnit)} <small>${qtyUnit}</small></div></div>
      <div class="stat-tile"><div class="label">Total precursor mass</div><div class="value">${formatMass(totalPrecursorMass, qtyUnit)} <small>${qtyUnit}</small></div></div>
      <div class="stat-tile"><div class="label">Target formula-unit mass</div><div class="value">${targetFormulaMass.toFixed(3)} <small>g/mol</small></div></div>
      <div class="stat-tile"><div class="label">Moles of target</div><div class="value">${molesFormulaUnit.toFixed(6)} <small>mol</small></div></div>
      <div class="stat-tile"><div class="label">Mode / system</div><div class="value" style="font-size:14px;">${mode === "wt" ? "Wt%" : "Mol%"} <small>&middot; ${nEq}&times;${nUnknown} ${nEq === nUnknown ? "exact" : "least-sq."}</small></div></div>
    </div>

    <table class="results-table"><thead><tr><th>Precursor</th><th class="num">Molar mass (g/mol)</th><th class="num">Moles needed</th><th class="num">Mass needed (${qtyUnit})</th><th class="num">Wt% of mix</th><th class="num">Mol% of mix</th></tr></thead><tbody>${rowsHtml}</tbody></table>
    <p style="font-size:12px; color:var(--muted); margin-top:6px;">Wt%/Mol% of mix is each precursor's own share of the total precursor mass/moles, e.g. a minor precursor added as a dopant will show up here the same way a paper reports "doped at X wt%."</p>

    <div class="section-label">Balance check</div>
    <table class="results-table"><thead><tr><th>Element</th><th class="num">Required (mol)</th><th class="num">Achieved (mol)</th><th class="num">Residual</th></tr></thead><tbody>`;

  balanceElements.forEach((el, i) => {
    let achieved = 0;
    precursors.forEach((p, j) => achieved += (p.balanceElements[el] || 0) * x[j]);
    const residual = achieved - requiredMoles[i];
    const cls = Math.abs(residual) < 1e-6 * Math.max(1, Math.abs(requiredMoles[i])) ? "residual-ok" : "residual-bad";
    html += `<tr><td>${el}</td><td class="num">${requiredMoles[i].toFixed(6)}</td><td class="num">${achieved.toFixed(6)}</td><td class="num ${cls}">${residual.toExponential(2)}</td></tr>`;
  });
  html += `</tbody></table>`;

  resultsBox.innerHTML = html;

  // ---- CSV export (built now, downloaded on demand by the delegated
  // click handler below -- one row per precursor, then a blank line, then
  // the balance-check table, matching what's on screen) ----
  const csvLines = [
    `Precursor,Molar mass (g/mol),Moles needed,Mass needed (${qtyUnit}),Wt% of mix,Mol% of mix`,
    ...precursors.map((p, idx) => {
      const moles = precursorMoles[idx];
      const mass = precursorMasses[idx];
      return [p.formula, p.realMolarMass.toFixed(3), moles.toFixed(6), formatMass(mass, qtyUnit),
              ((mass / totalPrecursorMass) * 100).toFixed(3), ((moles / totalPrecursorMoles) * 100).toFixed(3)].join(",");
    }),
    "",
    "Element,Required (mol),Achieved (mol),Residual",
    ...balanceElements.map((el, i) => {
      let achieved = 0;
      precursors.forEach((p, j) => achieved += (p.balanceElements[el] || 0) * x[j]);
      return [el, requiredMoles[i].toFixed(6), achieved.toFixed(6), (achieved - requiredMoles[i]).toExponential(2)].join(",");
    }),
  ];
  lastResultCsv = csvLines.join("\n");

  saveToHistory({
    timestamp: new Date().toISOString(),
    mode,
    targetRows: targetRows.map(r => ({ element: r.element, conc: r.conc, molarMass: r.molarMass })),
    quantity: { value: qtyValue, unit: qtyUnit, basis: qtyBasis },
    doNotBalance: document.getElementById("doNotBalance").value,
    targetFormulaMass,
    molesFormulaUnit,
    totalPrecursorMass,
    producedTargetMass,
    system: { nEq, nUnknown, exact: nEq === nUnknown },
    precursors: precursors.map((p, idx) => ({
      formula: p.formula,
      molarMass: p.realMolarMass,
      moles: precursorMoles[idx],
      mass: precursorMasses[idx],
      wtPctOfMix: (precursorMasses[idx] / totalPrecursorMass) * 100,
      molPctOfMix: (precursorMoles[idx] / totalPrecursorMoles) * 100,
    })),
  });
});

// ---------------------------------------------------------------------
// History (localStorage -- persists across tabs/restarts until cleared or
// the browser's site data is wiped; see history.html/history.js for the
// reader)
// ---------------------------------------------------------------------
const HISTORY_KEY = "stoichiolab_history";
const HISTORY_MAX_ENTRIES = 100;

// Two records are the "same calculation" if everything matches except the
// timestamp -- comparing JSON with timestamp set to undefined excludes it
// from the string (JSON.stringify drops undefined-valued keys) without a
// manual field-by-field diff.
function sameCalculation(a, b) {
  return JSON.stringify({ ...a, timestamp: undefined }) === JSON.stringify({ ...b, timestamp: undefined });
}

function saveToHistory(record) {
  let list = [];
  try {
    list = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch (e) {
    list = [];
  }
  // Re-running the exact same calculation shouldn't pile up duplicates --
  // drop any existing identical entry and let the new one (with its fresh
  // timestamp) take its place at the top.
  list = list.filter(r => !sameCalculation(r, record));
  list.unshift(record); // most recent first
  if (list.length > HISTORY_MAX_ENTRIES) list = list.slice(0, HISTORY_MAX_ENTRIES);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch (e) {
    // localStorage full or unavailable (e.g. private browsing) -- fail silently,
    // the calculation result itself is unaffected.
  }
}

// ---------------------------------------------------------------------
// Recipes -- save/load the full current input state (target composition,
// precursors, DO-NOT-balance rules, quantity, batch-mode settings) either
// as a named preset in this browser's localStorage, or as a URL-encoded
// share link that reconstructs the same state on another device/tab.
// ---------------------------------------------------------------------
const RECIPE_KEY = "stoichiolab_recipes";

function collectRecipeState() {
  return {
    v: 1,
    formulaQuick: document.getElementById("targetFormulaQuick").value,
    mode: getSelectedMode(),
    targetRows: [...document.querySelectorAll("#targetTable tbody tr")].map(tr => ({
      element: tr.querySelector(".t-element").value,
      conc: tr.querySelector(".t-conc").value,
      molarMass: tr.querySelector(".t-mm").value,
    })),
    precursors: [...document.querySelectorAll("#precursorTable tbody tr")].map(tr => tr.querySelector(".p-formula").value),
    doNotBalance: document.getElementById("doNotBalance").value,
    qty: { value: document.getElementById("qtyValue").value, unit: document.getElementById("qtyUnit").value, basis: getQtyBasis() },
    batch: {
      enabled: document.getElementById("batchEnabled").checked,
      formulas: document.getElementById("batchFormulas").value,
    },
    // Only present if "Find related papers" has actually been run since
    // the page loaded -- carries the fetched literature results along
    // with the recipe rather than silently dropping them.
    literature: lastLiteratureResult,
  };
}

function applyRecipeState(state) {
  if (!state) return;
  document.getElementById("targetFormulaQuick").value = state.formulaQuick || "";
  document.querySelector(`input[name="mode"][value="${state.mode === "wt" ? "wt" : "mol"}"]`).checked = true;

  document.querySelector("#targetTable tbody").innerHTML = "";
  (state.targetRows || []).forEach(r => addTargetRow(r.element, r.conc, r.molarMass));

  document.querySelector("#precursorTable tbody").innerHTML = "";
  (state.precursors || []).forEach(f => addPrecursorRow(f));

  document.getElementById("doNotBalance").value = state.doNotBalance || "";
  if (state.qty) {
    document.getElementById("qtyValue").value = state.qty.value || "";
    document.getElementById("qtyUnit").value = state.qty.unit || "mg";
    document.querySelector(`input[name="qtyBasis"][value="${state.qty.basis === "precursors" ? "precursors" : "product"}"]`).checked = true;
    refreshQtyBasisLabel();
  }

  const batchEnabled = !!(state.batch && state.batch.enabled);
  document.getElementById("batchEnabled").checked = batchEnabled;
  document.getElementById("batchControls").style.display = batchEnabled ? "block" : "none";
  document.getElementById("batchFormulas").value = (state.batch && state.batch.formulas) || "";

  refreshModeNote();

  // A recipe only ever stores inputs, not solved output -- the solve is
  // fully deterministic from those inputs, so re-running it here (rather
  // than persisting a separate results snapshot that could drift out of
  // sync with the inputs) is what actually shows "the solved information"
  // for a loaded recipe instead of just the blank form.
  document.getElementById("solveBtn").click();

  // Literature results, unlike the solve, are NOT reproducible on demand
  // (Crossref's index/ranking can drift), so a saved search is restored
  // as-is instead of re-fetched. If this recipe never had one, clear
  // whatever's currently shown rather than leaving a stale search visible.
  lastLiteratureResult = state.literature || null;
  if (lastLiteratureResult) {
    renderLiteratureResults(lastLiteratureResult.sig, lastLiteratureResult.strong, lastLiteratureResult.partial, lastLiteratureResult.fetchedAt);
  } else {
    document.getElementById("litResults").innerHTML = "";
  }
}

function loadRecipeStore() {
  try { return JSON.parse(localStorage.getItem(RECIPE_KEY)) || {}; } catch (e) { return {}; }
}
function saveRecipeStore(store) {
  try { localStorage.setItem(RECIPE_KEY, JSON.stringify(store)); } catch (e) {
    // localStorage full or unavailable (e.g. private browsing) -- the save
    // button will simply appear to do nothing beyond the status message.
  }
}
function refreshRecipeSelect() {
  const select = document.getElementById("recipeSelect");
  const prev = select.value;
  const names = Object.keys(loadRecipeStore()).sort((a, b) => a.localeCompare(b));
  select.innerHTML = `<option value="">-- saved recipes --</option>` + names.map(n => `<option value="${n}">${n}</option>`).join("");
  if (names.includes(prev)) select.value = prev;
}
function recipeMsg(text) {
  document.getElementById("recipeMsg").textContent = text;
}

document.getElementById("saveRecipeBtn").addEventListener("click", async () => {
  const name = document.getElementById("recipeName").value.trim();
  if (!name) { recipeMsg("Enter a name for this recipe first."); return; }
  const store = loadRecipeStore();
  if (store[name]) {
    const ok = await confirmModal({
      title: "Overwrite recipe?",
      message: `A recipe named "${name}" already exists. Overwriting it replaces its saved composition, precursors, and results with the current ones.`,
      confirmText: "Overwrite",
    });
    if (!ok) return;
  }
  store[name] = collectRecipeState();
  saveRecipeStore(store);
  refreshRecipeSelect();
  document.getElementById("recipeSelect").value = name;
  recipeMsg(`Saved "${name}".`);
});

document.getElementById("loadRecipeBtn").addEventListener("click", () => {
  const name = document.getElementById("recipeSelect").value;
  if (!name) { recipeMsg("Pick a saved recipe to load first."); return; }
  const store = loadRecipeStore();
  if (!store[name]) { recipeMsg(`Recipe "${name}" not found.`); return; }
  applyRecipeState(store[name]);
  recipeMsg(`Loaded "${name}".`);
});

document.getElementById("deleteRecipeBtn").addEventListener("click", async () => {
  const name = document.getElementById("recipeSelect").value;
  if (!name) { recipeMsg("Pick a saved recipe to delete first."); return; }
  const ok = await confirmModal({
    title: "Delete recipe?",
    message: `Delete the saved recipe "${name}"? This can't be undone.`,
    confirmText: "Delete",
    danger: true,
  });
  if (!ok) return;
  const store = loadRecipeStore();
  delete store[name];
  saveRecipeStore(store);
  refreshRecipeSelect();
  recipeMsg(`Deleted "${name}".`);
});

document.getElementById("shareRecipeBtn").addEventListener("click", () => {
  const encoded = encodeURIComponent(btoa(JSON.stringify(collectRecipeState())));
  const url = `${location.origin}${location.pathname}?recipe=${encoded}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url)
      .then(() => recipeMsg("Share link copied to clipboard."))
      .catch(() => recipeMsg(`Couldn't copy automatically -- link: ${url}`));
  } else {
    recipeMsg(`Couldn't copy automatically -- link: ${url}`);
  }
});

refreshRecipeSelect();

// ---------------------------------------------------------------------
// Literature references -- opportunistic lookup of published work on the
// same substitution family as the target composition (same elements
// occupying the same sites, any doping concentration), via Crossref's
// free, keyless REST API. Not tied to perovskites/ceramics specifically:
// the site-grouping logic below is generic solid-state substitution
// chemistry (elements whose relative moles sum to ~1 occupy one site),
// so it applies to any composition, oxide or otherwise. It needs an
// internet connection, unlike the rest of this tool.
// ---------------------------------------------------------------------
function* combinations(arr, k) {
  if (k === 0) { yield []; return; }
  for (let i = 0; i <= arr.length - k; i++) {
    for (const rest of combinations(arr.slice(i + 1), k - 1)) yield [arr[i], ...rest];
  }
}

// Groups elements whose relative moles sum to ~1 into "sites" -- e.g. for
// Ba0.88Ca0.12Ti0.90Zr0.10O3 this finds {Ba,Ca} and {Ti,Zr} as two
// separate sites, each fully occupied regardless of how the doping is
// split within it. Elements that don't fit any such group (rare; happens
// for formulas that aren't written on a per-site-sums-to-1 convention)
// are left ungrouped rather than forced into a wrong grouping.
function partitionIntoSites(items, tol = 0.03) {
  const remaining = items.slice();
  const groups = [];
  while (remaining.length) {
    let matched = null;
    outer:
    for (let size = 1; size <= remaining.length; size++) {
      for (const combo of combinations(remaining, size)) {
        const sum = combo.reduce((s, it) => s + it.value, 0);
        if (Math.abs(sum - 1) <= tol) { matched = combo; break outer; }
      }
    }
    if (!matched) break;
    matched.forEach(m => remaining.splice(remaining.indexOf(m), 1));
    groups.push(matched);
  }
  return { groups, leftover: remaining };
}

// Builds a "same family, any concentration" formula signature, e.g.
// Ba0.88Ca0.12Ti0.90Zr0.10O3 -> "Ba1-xCaxTi1-yZryO3", plus the list of
// substitutable cation elements to check for in candidate paper titles.
function buildCompositionSignature() {
  const rows = [...document.querySelectorAll("#targetTable tbody tr")].map(tr => ({
    element: tr.querySelector(".t-element").value.trim(),
    conc: parseFloat(tr.querySelector(".t-conc").value),
    molarMass: parseFloat(tr.querySelector(".t-mm").value),
  })).filter(r => r.element && !isNaN(r.conc));
  if (rows.length === 0) return null;

  const mode = getSelectedMode();
  let items = rows.map(r => ({
    element: r.element,
    value: mode === "wt" && r.molarMass > 0 ? r.conc / r.molarMass : r.conc,
  }));

  // Mol% entries are already formula-unit coefficients (site fractions
  // that sum to 1, an anion count that's a clean integer), by the same
  // convention as writing Ba0.8Ca0.2TiO3 directly. Wt%'s conc/molarMass
  // values are only PROPORTIONAL to that -- e.g. the built-in "doped"
  // example resolves to Ba=0.367, Ca=0.092, Ti=0.413, Zr=0.046, O=1.376,
  // none of which sum to 1 or look like a clean oxygen count, even
  // though the real formula is Ba0.8Ca0.2Ti0.9Zr0.1O3 once divided
  // through by ~0.459. Search for that missing scale: try treating the
  // largest-value element (almost always the anion, e.g. O) as each
  // plausible small integer count in turn, and keep the first one whose
  // remaining elements partition cleanly into sites summing to 1.
  if (mode === "wt") {
    const ref = items.reduce((a, b) => (b.value > a.value ? b : a), items[0]);
    for (let n = 2; n <= 16; n++) {
      const k = ref.value / n;
      if (!(k > 0)) continue;
      const scaled = items.map(it => ({ element: it.element, value: it.value / k }));
      const candidates = scaled.filter(it => it.element !== ref.element);
      const { leftover } = partitionIntoSites(candidates);
      if (leftover.length === 0) { items = scaled; break; }
    }
  }

  // Framework elements: already an integer count of 2+ (e.g. O3) -- these
  // frame the structure rather than being a substitution site themselves.
  const framework = items.filter(it => Math.abs(it.value - Math.round(it.value)) < 0.02 && Math.round(it.value) >= 2);
  const siteCandidates = items.filter(it => !framework.includes(it));
  const { groups, leftover } = partitionIntoSites(siteCandidates);

  const VARS = ["x", "y", "z", "u", "v", "w"];
  let varIdx = 0;
  const tokens = {};
  groups.forEach(group => {
    group.sort((a, b) => b.value - a.value);
    if (group.length === 1) {
      tokens[group[0].element] = group[0].element;
    } else {
      const [host, ...dopants] = group;
      const letters = dopants.map(() => VARS[varIdx++] || "x");
      tokens[host.element] = `${host.element}1-${letters.join("-")}`;
      dopants.forEach((d, i) => { tokens[d.element] = `${d.element}${letters[i]}`; });
    }
  });
  leftover.forEach(it => { tokens[it.element] = `${it.element}${Math.round(it.value * 1000) / 1000}`; });
  framework.forEach(it => { tokens[it.element] = `${it.element}${Math.round(it.value)}`; });

  return {
    backbone: rows.map(r => tokens[r.element]).join(""),
    cationElements: [...groups.flat(), ...leftover].map(it => it.element),
  };
}

// Element-symbol match with a boundary guard (no lowercase letter
// immediately before/after) so "Ti" doesn't match inside an unrelated
// word, same convention as the DO-NOT-balance bare-token guard.
function elementAppearsInText(el, text) {
  return new RegExp(`(?<![a-z])${el}(?![a-z])`).test(text);
}

// Cache of the last literature search actually run, so a saved recipe can
// carry its fetched results along (see collectRecipeState/applyRecipeState
// below) instead of silently dropping them -- Crossref's index and
// ranking can drift over time, so re-searching later isn't guaranteed to
// reproduce the same list.
let lastLiteratureResult = null;

function renderLiteratureResults(sig, strong, partial, cachedAt) {
  const box = document.getElementById("litResults");
  if (strong.length === 0 && partial.length === 0) {
    box.innerHTML = `<p class="hint">No papers found whose title mentions all of this composition's elements (${sig.cationElements.join(", ")}). Try a more common composition, or check the element symbols.</p>`;
    return;
  }
  const renderList = list => `<ul class="lit-list">${list.map(it => {
    const title = (it.title && it.title[0]) || "(untitled)";
    const authorList = it.author || [];
    const authors = authorList.slice(0, 3).map(a => [a.given, a.family].filter(Boolean).join(" ")).join(", ")
      + (authorList.length > 3 ? " et al." : "");
    const journal = (it["container-title"] && it["container-title"][0]) || (it["short-container-title"] && it["short-container-title"][0]) || "";
    const dateParts = it.issued && it.issued["date-parts"] && it.issued["date-parts"][0];
    const year = dateParts && dateParts[0];
    const link = it.DOI ? `https://doi.org/${it.DOI}` : "#";
    const metaBits = [authors || "Unknown authors", year].filter(Boolean).join(" &middot; ");
    return `<li><a class="lit-item-link" href="${link}" target="_blank" rel="noopener">
      <span class="lit-item-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></span>
      <span class="lit-item-body">
        <span class="lit-item-title">${title}</span>
        <span class="lit-meta">${metaBits}${journal ? `<span class="lit-journal">${journal}</span>` : ""}</span>
      </span>
      <svg class="lit-item-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
    </a></li>`;
  }).join("")}</ul>`;

  const cacheNote = cachedAt ? `<p class="hint">Showing results saved with this recipe (searched ${new Date(cachedAt).toLocaleString()}). Click "Find related papers" above to search again with current results.</p>` : "";
  let html = cacheNote + `<p class="hint">Searched for the same substitution family as your target. Titles below mention all of ${sig.cationElements.join(", ")}; check the actual concentrations and synthesis route against your own target, these are starting points, not confirmed matches.</p>
    <div class="lit-signature">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      Element signature searched: <code>${sig.backbone}</code>
    </div>`;
  if (strong.length) html += renderList(strong.slice(0, 8));
  if (partial.length) {
    html += `<p class="lit-tier-label">These mention most, but not all, of the same elements, worth a second look but less likely to be the same system:</p>` + renderList(partial.slice(0, 5));
  }
  box.innerHTML = html;
}

async function searchLiterature() {
  const box = document.getElementById("litResults");
  const sig = buildCompositionSignature();
  if (!sig) {
    box.innerHTML = `<div class="error-box">Add at least one element to the target composition first.</div>`;
    return;
  }
  box.innerHTML = `<p class="hint">Searching Crossref for related papers&hellip;</p>`;
  const query = [sig.backbone, ...sig.cationElements, "doping", "solid solution", "synthesis"].join(" ");
  try {
    const url = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(query)}&rows=20&select=title,author,container-title,short-container-title,issued,DOI`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Crossref returned HTTP ${res.status}`);
    const data = await res.json();
    const items = (data.message && data.message.items) || [];

    // Client-side filter: only keep results whose TITLE actually mentions
    // this composition's elements -- Crossref's own ranking is a plain
    // relevance search and will happily surface unrelated compounds that
    // just share a generic term like "synthesis", so this is what
    // actually enforces "same composition family."
    const withTitles = items.filter(it => it.title && it.title[0]);
    const strong = withTitles.filter(it => sig.cationElements.every(el => elementAppearsInText(el, it.title[0])));
    const strongDois = new Set(strong.map(it => it.DOI));
    const minPartial = Math.max(1, sig.cationElements.length - 1);
    const partial = withTitles
      .filter(it => !strongDois.has(it.DOI))
      .filter(it => sig.cationElements.filter(el => elementAppearsInText(el, it.title[0])).length >= minPartial);

    lastLiteratureResult = { sig, strong: strong.slice(0, 8), partial: partial.slice(0, 5), fetchedAt: new Date().toISOString() };
    renderLiteratureResults(sig, lastLiteratureResult.strong, lastLiteratureResult.partial);
  } catch (err) {
    lastLiteratureResult = null;
    box.innerHTML = `<div class="error-box">Couldn't reach Crossref (${err.message}). This feature needs an internet connection, if you're offline or on a restricted network, try again later.</div>`;
  }
}

document.getElementById("searchLitBtn").addEventListener("click", searchLiterature);

// ---- initial default rows ----
populatePrecursorDatalist();
addTargetRow("Ba", "1", "137.33");
addTargetRow("Ti", "1", "47.867");
addTargetRow("O", "3", "15.999");
addPrecursorRow("BaCO3");
addPrecursorRow("TiO2");

// ---- if the page was opened via a recipe share link, load it now,
// overriding the defaults above ----
(function loadRecipeFromUrl() {
  const encoded = new URLSearchParams(location.search).get("recipe");
  if (!encoded) return;
  try {
    applyRecipeState(JSON.parse(atob(decodeURIComponent(encoded))));
    recipeMsg("Loaded recipe from share link.");
  } catch (e) {
    recipeMsg("Couldn't read the recipe from this link -- it may be corrupted or truncated.");
  }
})();
refreshModeNote();
