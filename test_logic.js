// Standalone logic test (Node) for the pure computational functions,
// extracted verbatim from index.html, run against known worked examples.

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

function parseFormula(formula) {
  const s = formula.replace(/\s+/g, "").replace(/·/g, "..");
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
        i++;
        const inner = parseGroup();
        if (i >= s.length || s[i] !== ")") throw new Error("Unmatched '(' in formula: " + formula);
        i++;
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

function gaussianSolve(A, b) {
  const n = A.length;
  const M = A.map((row, r) => [...row, b[r]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    if (Math.abs(M[pivot][col]) < 1e-12) return null;
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

// -----------------------------------------------------------------
// Test 1: BaTiO3 from BaCO3 + TiO2, CO3=O substitution, 5 g target.
// -----------------------------------------------------------------
function test1() {
  const targetMoles = { Ba: 1, Ti: 1, O: 3 };
  let targetFormulaMass = 0;
  for (const el in targetMoles) targetFormulaMass += targetMoles[el] * ATOMIC_WEIGHTS[el];
  console.log("BaTiO3 formula mass:", targetFormulaMass.toFixed(3), "(expected ~233.19)");

  const targetMassGrams = 5;
  const molesFormulaUnit = targetMassGrams / targetFormulaMass;

  const { groupRules, excludeElements } = parseDoNotBalance("CO3=O");
  const precursorFormulas = ["BaCO3", "TiO2"];
  const precursors = precursorFormulas.map(f => {
    const real = parseFormula(f);
    const realMM = molarMassOf(real.elements);
    const balStr = applyGroupRulesToString(f, groupRules);
    const bal = parseFormula(balStr);
    return { formula: f, realMM, balanceElements: bal.elements };
  });

  const balanceElements = Object.keys(targetMoles).filter(el => !excludeElements.has(el));
  const requiredMoles = balanceElements.map(el => molesFormulaUnit * targetMoles[el]);
  const A = balanceElements.map(el => precursors.map(p => p.balanceElements[el] || 0));
  const x = solveLeastSquares(A, requiredMoles);

  precursors.forEach((p, i) => {
    console.log(`  ${p.formula}: ${x[i].toFixed(6)} mol -> ${(x[i]*p.realMM).toFixed(4)} g`);
  });

  // Expected: moles BaCO3 = moles TiO2 = molesFormulaUnit (1:1:1 stoichiometry)
  const expectedMoles = molesFormulaUnit;
  console.assert(Math.abs(x[0]-expectedMoles) < 1e-9, "BaCO3 moles mismatch");
  console.assert(Math.abs(x[1]-expectedMoles) < 1e-9, "TiO2 moles mismatch");
  console.log("TEST 1 PASSED\n");
}

// -----------------------------------------------------------------
// Test 2: Ca(NO3)2 group substitution with NO3=O -> should give Ca1 O2
// for balance purposes, while real molar mass uses full Ca(NO3)2.
// -----------------------------------------------------------------
function test2() {
  const { groupRules } = parseDoNotBalance("NO3=O");
  const balStr = applyGroupRulesToString("Ca(NO3)2", groupRules);
  console.log("Ca(NO3)2 with NO3=O ->", balStr);
  const bal = parseFormula(balStr);
  console.log("  parsed balance elements:", bal.elements, "(expected Ca:1, O:2)");
  console.assert(bal.elements.Ca === 1 && bal.elements.O === 2 && !bal.elements.N,
    "NO3=O substitution failed");

  const real = parseFormula("Ca(NO3)2");
  console.log("  real elements:", real.elements, "(expected Ca:1, N:2, O:6)");
  console.assert(real.elements.Ca === 1 && real.elements.N === 2 && real.elements.O === 6,
    "real formula parse failed");
  console.log("TEST 2 PASSED\n");
}

// -----------------------------------------------------------------
// Test 3: 4-precursor doped perovskite (Ba,Ca)(Ti,Zr)O3, O excluded
// entirely (standalone rule) plus CO3=O, exact 4x4 solve.
// -----------------------------------------------------------------
function test3() {
  const targetMoles = { Ba: 0.8, Ca: 0.2, Ti: 0.9, Zr: 0.1, O: 3 };
  let targetFormulaMass = 0;
  for (const el in targetMoles) targetFormulaMass += targetMoles[el] * ATOMIC_WEIGHTS[el];

  const targetMassGrams = 10;
  const molesFormulaUnit = targetMassGrams / targetFormulaMass;

  const { groupRules, excludeElements } = parseDoNotBalance("O\nCO3=O");
  const precursorFormulas = ["BaCO3", "CaCO3", "TiO2", "ZrO2"];
  const precursors = precursorFormulas.map(f => {
    const real = parseFormula(f);
    const realMM = molarMassOf(real.elements);
    const balStr = applyGroupRulesToString(f, groupRules);
    const bal = parseFormula(balStr);
    return { formula: f, realMM, balanceElements: bal.elements };
  });

  const balanceElements = Object.keys(targetMoles).filter(el => !excludeElements.has(el));
  console.log("Balance elements (O excluded):", balanceElements);
  const requiredMoles = balanceElements.map(el => molesFormulaUnit * targetMoles[el]);
  const A = balanceElements.map(el => precursors.map(p => p.balanceElements[el] || 0));
  const x = solveLeastSquares(A, requiredMoles);

  let total = 0;
  precursors.forEach((p, i) => {
    const mass = x[i] * p.realMM;
    total += mass;
    console.log(`  ${p.formula}: ${x[i].toFixed(6)} mol -> ${mass.toFixed(4)} g`);
  });
  console.log("  total precursor mass:", total.toFixed(4), "g");

  // Expected mole ratios Ba:Ca:Ti:Zr = 0.8:0.2:0.9:0.1 * molesFormulaUnit
  console.assert(Math.abs(x[0] - 0.8*molesFormulaUnit) < 1e-9, "Ba moles mismatch");
  console.assert(Math.abs(x[1] - 0.2*molesFormulaUnit) < 1e-9, "Ca moles mismatch");
  console.assert(Math.abs(x[2] - 0.9*molesFormulaUnit) < 1e-9, "Ti moles mismatch");
  console.assert(Math.abs(x[3] - 0.1*molesFormulaUnit) < 1e-9, "Zr moles mismatch");
  console.log("TEST 3 PASSED\n");
}

// -----------------------------------------------------------------
// Test 4: wt% mode conversion sanity check for BaTiO3 (should recover
// nearly the same precursor masses as the mol% version, since Ba:Ti:O
// mol ratio 1:1:3 corresponds to a fixed wt% split).
// -----------------------------------------------------------------
function test4() {
  const molarMasses = { Ba: ATOMIC_WEIGHTS.Ba, Ti: ATOMIC_WEIGHTS.Ti, O: ATOMIC_WEIGHTS.O };
  const molCoeffs = { Ba: 1, Ti: 1, O: 3 };
  let totalMass = 0;
  for (const el in molCoeffs) totalMass += molCoeffs[el] * molarMasses[el];
  const wtPercent = {};
  for (const el in molCoeffs) wtPercent[el] = (molCoeffs[el] * molarMasses[el] / totalMass) * 100;
  console.log("BaTiO3 wt%:", wtPercent);

  // Now convert back via the tool's wt% formula: n_i = wt%_i / molarMass_i
  const recoveredMoles = {};
  for (const el in wtPercent) recoveredMoles[el] = wtPercent[el] / molarMasses[el];
  console.log("Recovered relative moles:", recoveredMoles, "(expect ratio 1:1:3)");
  const ratioTiOverBa = recoveredMoles.Ti / recoveredMoles.Ba;
  const ratioOOverBa = recoveredMoles.O / recoveredMoles.Ba;
  console.assert(Math.abs(ratioTiOverBa - 1) < 1e-9, "Ti/Ba ratio mismatch");
  console.assert(Math.abs(ratioOOverBa - 3) < 1e-9, "O/Ba ratio mismatch");
  console.log("TEST 4 PASSED\n");
}

// -----------------------------------------------------------------
// Test 5: bare single-letter group rule must not collide with element
// symbols that start with the same letter (e.g. "N=" must not match
// the "N" inside "Na2O" -- classic ambiguous-token pitfall).
// -----------------------------------------------------------------
function test5() {
  const { groupRules } = parseDoNotBalance("N=X");
  const result = applyGroupRulesToString("Na2O", groupRules);
  console.log('"Na2O" with bare rule "N=X" ->', result, "(expected unchanged: Na2O)");
  console.assert(result === "Na2O", "bare-group rule incorrectly matched inside Na2O");
  console.log("TEST 5 PASSED\n");
}

// -----------------------------------------------------------------
// Test 6: doping-series batch mode -- same balance matrix A (same
// elements, same precursors) reused across a series of Ba mole
// coefficients, only the required-moles vector (RHS) changes per point.
// Mirrors runBatchSolve()'s loop in script.js using the same pure
// functions verified above.
// -----------------------------------------------------------------
function test6() {
  // Doping-series batch mode: several full mol% compositions (different
  // doping levels of the same system, e.g. Ba0.88Ca0.12Ti0.90Zr0.10O3 vs.
  // Ba0.8Ca0.2Ti0.90Zr0.10O3), all sharing the same element set so one
  // balance matrix A applies to every one of them. O is DO-NOT-balance
  // (same as the real "doped example" preset): with 4 precursors each
  // supplying exactly one balanced cation, the system is exact regardless
  // of how the doping is split within a site.
  const compositions = [
    "Ba0.88Ca0.12Ti0.90Zr0.10O3",
    "Ba0.8Ca0.2Ti0.90Zr0.10O3",
    "Ba0.7Ca0.3Ti0.80Zr0.20O3",
  ];
  const targetMassGrams = 10;

  const { groupRules, excludeElements } = parseDoNotBalance("O\nCO3=O");
  const precursorFormulas = ["BaCO3", "CaCO3", "TiO2", "ZrO2"];
  const precursors = precursorFormulas.map(f => {
    const real = parseFormula(f);
    const realMM = molarMassOf(real.elements);
    const bal = parseFormula(applyGroupRulesToString(f, groupRules));
    return { formula: f, realMM, balanceElements: bal.elements };
  });

  const parsedRows = compositions.map(formula => ({ formula, moles: parseFormula(formula).elements }));
  const balanceElements = Object.keys(parsedRows[0].moles).filter(el => !excludeElements.has(el)); // -> ["Ba","Ca","Ti","Zr"]
  const A = balanceElements.map(el => precursors.map(p => p.balanceElements[el] || 0));

  parsedRows.forEach(row => {
    let formulaMass = 0;
    for (const el in row.moles) formulaMass += row.moles[el] * ATOMIC_WEIGHTS[el];
    const molesFormulaUnit = targetMassGrams / formulaMass;
    const requiredMoles = balanceElements.map(el => molesFormulaUnit * row.moles[el]);
    const x = gaussianSolve(A, requiredMoles); // 4 eq, 4 unknowns -> exact

    balanceElements.forEach((el, i) => {
      const precursorIdx = precursorFormulas.findIndex(f => f.startsWith(el));
      const expected = molesFormulaUnit * row.moles[el];
      console.log(`  ${row.formula}: ${precursorFormulas[precursorIdx]}=${x[precursorIdx].toFixed(6)} (expect ${expected.toFixed(6)})`);
      console.assert(Math.abs(x[precursorIdx] - expected) < 1e-9, `${row.formula}: ${precursorFormulas[precursorIdx]} moles mismatch`);
    });
  });
  console.log("TEST 6 PASSED\n");
}

test1();
test2();
test3();
test4();
test5();
test6();
console.log("ALL TESTS PASSED");
