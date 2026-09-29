# StoichioLab

A plain HTML/CSS/JS 4-page site (no build step, no dependencies to
install) with clean, extension-less URLs (`/calculator`, `/history`,
`/contact`), the same style React Router/Astro/Next give you, achieved
the static-site way: each page is a folder with its own `index.html`
(`calculator/index.html`, etc.), which is exactly what GitHub Pages,
Netlify, and Vercel already resolve a directory URL to, with zero
server config needed. Originally ideated from
[ChemSolve](https://occamy.chemistry.jhu.edu/chemsolve/index.php)'s
core idea, given a target composition, a set of starting materials
(precursors), and a total target quantity, compute how many grams of each
precursor to weigh out, but extended with a Wt% target-composition mode,
DO-NOT-balance decomposition rules, a doping-series batch mode, a
precursor autocomplete library, CSV/print export, saveable/shareable
recipes, literature-reference lookup, and a persistent calculation
history.

**Running it locally**: internal nav links point at clean directory
paths (e.g. `../calculator/`), which only resolve to that folder's
`index.html` when served over HTTP -- plain `file://` double-clicking has
no such directory-index behavior, so links would show a raw file listing
instead of the page. Serve the project root with any static server, e.g.
`npx serve`, `python3 -m http.server`, or the VS Code "Live Server"
extension, then open `http://localhost:<port>/`. (The root `index.html`
itself still opens fine via a plain double-click, it's only the *links
between pages* that need a server to resolve cleanly.)

## Pages

- **`index.html`** -- homepage: hero, feature cards, "how it works" steps.
- **`calculator/index.html`** -- the actual tool (target composition,
  precursors, DO-NOT-balance rules, quantity, solve). This is what the
  rest of this README describes.
- **`history/index.html`** -- every successful solve on the calculator
  page is saved to `localStorage` (see `saveToHistory()` in `script.js`)
  and listed here, most recent first, as expandable cards. Unlike
  `sessionStorage`, this persists across tabs and browser restarts until
  it's cleared here or the browser's site data is wiped. Each card has
  its own delete button, and there's a "Clear history" button (with a
  confirmation prompt, since it now deletes real persisted data rather
  than just a session) for wiping everything at once. Capped at the 100
  most recent entries (`HISTORY_MAX_ENTRIES` in `script.js`). Re-running
  an identical calculation (same inputs and results, only the timestamp
  differs) replaces the existing entry with a fresh timestamp instead of
  adding a duplicate (`sameCalculation()` in `script.js`). Rendered by
  `history.js`.
- **`contact/index.html`** -- static about/contact page (SLIMES Lab /
  Aritra Roy details).

`styles.css`, `nav.js`, `modal.js`, `script.js`, `history.js`, and the
logo images live once at the project root and are referenced from each
subpage via a relative `../` path, rather than being duplicated into
every folder. All four pages share `nav.js` (hamburger menu for narrow
viewports) and the same top nav bar: the full logo+wordmark image
(`stoichiolab-full.png`) on wider screens, swapping to the icon-only mark
(`stoichiolab-icon.png`, also used as the favicon) below the 640px
breakpoint, plus the Home/Calculator/History/Contact links.

Destructive confirmations (overwriting or deleting a saved recipe,
clearing history) use a themed modal dialog (`modal.js`, loaded on
`calculator/index.html`/`history/index.html`) instead of the browser's native
`confirm()`. `confirmModal({title, message, confirmText, cancelText,
danger})` returns a Promise that resolves to `true`/`false`, so call
sites `await` it inside an `async` click handler; `danger: true` styles
the confirm button red for actions that can't be undone.

## Why this exists

ChemSolve expects the target composition as mol% (plain stoichiometric
coefficients, like a normal chemical formula: `Ba0.8Ca0.2TiO3`). Composition
data from this project's own pipeline is often expressed as **wt%** with
long decimal tails (e.g. `58.9312...`), which isn't directly usable as a
mol% coefficient: it needs a molar-mass-weighted conversion first. This
tool adds that conversion as a first-class mode (manual Mol%/Wt% toggle,
defaulting to Mol%). It also adds a doping-series batch mode, a precursor
autocomplete library, CSV/print export, and a saved calculation history,
none of which ChemSolve has.

## How it works

1. **Target composition**: one row per element, either:
   - **Mol%** (default): the value is the element's stoichiometric
     coefficient directly (same convention as writing `Ba0.8Ca0.2TiO3`).
   - **Wt%**: the value is the element's weight fraction/percent; the tool
     converts to relative moles via `moles_i = wt%_i / molarMass_i`.
   - The Mol%/Wt% toggle is manual, pick the mode that matches your data,
     no auto-detection.
   - Include every element physically in the target compound, even ones
     you'll mark DO-NOT-balance (e.g. oxygen): that flag only removes an
     element from the precursor-balance equations, not from the target's
     actual mass, so its concentration still needs a real value.

2. **Starting materials**: precursor formulas (e.g. `BaCO3`, `TiO2`,
   `Ca(NO3)2`), with autocomplete suggestions from a built-in library of
   common ABO3-relevant reagents (carbonates/oxides/nitrates for A-site,
   oxides for B-site, common dopants) as you type. Molar mass is computed
   automatically from a built-in atomic-weight table (H–U, IUPAC standard
   values).

3. **DO NOT balance**: one rule per line:
   - A bare element (`O`) drops it from every balance equation entirely
     (assumed freely available, e.g. atmospheric oxygen equilibration
     during firing).
   - `GROUP=REPLACEMENT` treats that group as decomposing to the
     replacement **for balance purposes only**: the precursor's real
     formula (and therefore its real molar mass, for the gram conversion)
     is untouched. E.g. `CO3=O` models `MCO3 -> MO + CO2`: a carbonate
     group is treated as leaving 1 O behind. `NO3=O` models the nitrate
     analogue. `H2O=` (empty replacement) drops a hydrate's water of
     crystallization from the balance entirely while still counting its
     mass in the precursor's molar mass. Write hydrates in parenthesized
     form, e.g. `CaCl2(H2O)2`, so the substitution can target the group
     cleanly.
   - **Order rules from most to least specific** (same caveat as
     ChemSolve): a short bare-letter rule can otherwise coincidentally
     match inside an unrelated element symbol (e.g. a rule targeting `N`
     could in principle catch part of `Na`); the tool guards against the
     most common case of this (a bare token must be followed by the start
     of a new element, `)`, or end-of-string to match) but specific,
     multi-character group tokens (`NO3`, `CO3`) remain the reliable way
     to write these rules.

4. **Total target quantity**: a mass (mg by default, or g) and a
   **basis**, either the *final target compound* you want to end up
   with, or the *total combined precursor mass* you have on hand or want
   to use. Both directions solve from the same linear system: internally
   everything is solved once at unit scale (as if making exactly 1 mole
   of the target formula unit), then scaled by `desired mass /
   formula-unit mass` (target-product basis) or `desired mass /
   unit-scale precursor mass` (total-precursors basis) -- since every
   mass in the system is linear in that scale factor, no second solve is
   needed. Results always report *both* numbers (target product mass and
   total precursor mass), so switching basis shows you the other side
   for free. Whichever unit (mg/g) the quantity was entered in is the
   unit every mass in the results, CSV export, and saved history uses.

5. **Solve**: builds one balance equation per non-excluded target
   element, one unknown per precursor, and solves for precursor moles
   (exact solve if elements == precursors; least-squares fit otherwise,
   e.g. if you intentionally provide more precursors than constraints).
   Converts precursor moles to grams via each precursor's *real* molar
   mass, and reports a per-element balance-residual check so you can see
   whether the fit is exact. Each precursor's row also shows its own
   **wt%/mol% share of the total precursor mix**: this is the same
   number a synthesis paper reports as e.g. "doped with 0.6 wt% Fe2O3":
   if you add a minor dopant compound as one more precursor in section 2
   (rather than as its own element inside the target formula), its
   wt%/mol% column here *is* that doping percentage, derived straight
   from the same solve, no separate calculation needed.

Results can be exported as CSV or sent to the browser's print dialog via
the buttons above the results table (`#exportCsvBtn`/`#printBtn` in
`script.js`, one delegated click handler shared by both the single-solve
and batch-solve result views).

## Doping-series batch mode

For solving several full compositions in one pass, e.g. different doping
levels of the same system like `Ba0.88Ca0.12Ti0.90Zr0.10O3` and
`Ba0.8Ca0.2Ti0.90Zr0.10O3`, instead of re-entering the target table and
hitting Solve once per composition.

Enable it via the "Doping-series batch mode" checkbox above the
precursor table, then list each composition as a mol% formula (same
convention as the quick-entry field, e.g. `Ba0.8Ca0.2TiO3`), one per
line. Every composition must use exactly the same set of elements, and
therefore the same precursor set below, since that's what lets one
balance matrix be built once and reused: only each composition's required
moles change, not the equations themselves.

Results are one collapsed row per composition (formula and total mass),
each expandable into the same full breakdown a single solve shows
(precursor masses, wt%/mol% of mix, balance check). Only one composition
is expanded at a time: opening another one closes whichever was open, so
comparing several compositions doesn't mean scrolling through every
number for every one of them at once.

Each composition is independently checked for balance-residual
consistency (mirroring the single-solve mode's residual check): a row is
flagged with a ⚠ and a warning message if the solve for that specific
composition isn't exact. This catches the case where the batch is only
mathematically consistent for compositions that don't actually need an
excluded anion (e.g. O was left un-excluded via DO-NOT-balance, which
happens to still solve exactly for some compositions but not others), a
real correctness trap, since the underlying least-squares solver returns
an approximate fit with no error in that situation rather than failing
loudly.

## Literature references

The "Literature references" panel (below the precursor/DO-NOT-balance
panels) looks up published work on the same *substitution family* as the
target composition, i.e. the same elements occupying the same sites, at
any doping level, not just this exact one. For
`Ba0.88Ca0.12Ti0.90Zr0.10O3` it searches for `Ba1-xCaxTi1-yZryO3`-style
papers, which correctly surfaces e.g. a `Ba0.8Ca0.2Ti0.9Zr0.1O3` synthesis
paper even though none of the numbers match exactly.

How the signature is built (`buildCompositionSignature()` in
`script.js`), generically, not tied to perovskites or oxides:

1. Convert each target row to relative moles (same conversion the solver
   uses: mol% coefficient directly, or wt%/molarMass in Wt% mode). Mol%
   entries are already formula-unit coefficients by convention (writing
   `Ba0.8Ca0.2TiO3` means exactly that), but Wt%'s `conc/molarMass` values
   are only *proportional* to those coefficients, e.g. the built-in
   "doped" example resolves to `Ba:0.367, Ca:0.092, Ti:0.413, Zr:0.046,
   O:1.376` rather than the real `0.8/0.2/0.9/0.1/3`. Before grouping,
   Wt% mode searches for the missing scale by treating the largest-value
   element (almost always the anion) as each plausible small oxygen
   count in turn, and keeping the first one whose remaining elements
   partition cleanly -- without this, Wt% signatures rendered as
   unreadable raw decimals instead of a proper `A1-xBx` formula.
2. Elements whose relative moles are already an integer of 2 or more
   (e.g. `O: 3`) are treated as **framework** elements, part of the
   compound's backbone rather than a substitution site.
3. The remaining elements are partitioned into **sites**: any subset
   whose relative moles sum to ~1 is grouped together (e.g. `{Ba: 0.88,
   Ca: 0.12}` and, separately, `{Ti: 0.90, Zr: 0.10}`). This is the same
   convention solid-state chemists use to write `A1-xBx`-style formulas,
   and it doesn't assume any particular crystal structure. Elements that
   don't fit any such group are left as their own literal token instead
   of being forced into a wrong grouping.
4. Each site becomes `Host1-x-y...DopantxDopanty...` (majority element
   is the host, minority elements get sequential `x`/`y`/`z`
   placeholders), single-element sites and framework elements are written
   as-is, and the tokens are joined in the target table's row order.

The signature string, the underlying cation element symbols, and generic
domain-neutral terms (`doping`, `solid solution`, `synthesis`, none of
which assume ceramics or perovskites) are sent to
[Crossref](https://www.crossref.org/)'s free, keyless
`query.bibliographic` search. Crossref's own ranking is a plain relevance
search and will happily return something that just shares a generic term,
so results are filtered client-side: a result only counts as a **strong
match** if its title mentions *every* one of the target's cation elements
(with a boundary guard so e.g. `Ti` doesn't match inside an unrelated
word, same convention as the DO-NOT-balance bare-token guard); results
mentioning most but not all of them are shown separately, clearly labeled
as a weaker match.

This is still a best-effort keyword/title match, not a chemistry-aware
structural search: it surfaces candidates worth skimming, not confirmed
hits. Unlike the rest of this tool it needs an internet connection
(`fetch()` to `api.crossref.org`) and fails gracefully with an inline
message if that request doesn't succeed.

## Recipes (save / share)

The "Recipes" panel at the top of the calculator page captures the full
current input state -- target composition, mode, precursors,
DO-NOT-balance rules, quantity, and batch-mode settings -- and lets you:

- **Save** it as a named preset in this browser's `localStorage`
  (`stoichiolab_recipes`), then **Load** or **Delete** it later from the
  dropdown. Presets are per-browser/per-device, not synced anywhere.
- **Copy share link**, which base64-encodes the same state into a
  `?recipe=...` URL query parameter. Opening that link (on any device,
  since the state travels in the URL itself rather than local storage)
  reconstructs the exact input state on load, overriding the page's
  usual BaTiO3 defaults.

A recipe stores inputs, not solved output for the main solve (results
would drift out of sync with the inputs if the solve logic ever changed).
Instead, loading a recipe, from the dropdown or from a share link,
immediately re-runs the solve on the restored inputs, so the results
table appears right away rather than a blank form waiting for another
click.

Literature results are the one exception: if "Find related papers" was
run before saving, its fetched results (not just the search terms) are
saved into the recipe and restored on load, labeled with when the search
was originally run. Unlike the solve, a literature search isn't
reproducible on demand (Crossref's index and ranking can drift over
time), so re-fetching on every load would risk silently showing a
different list than what was actually saved; the panel's "Find related
papers" button is still there to search again with current results
whenever you want to.

## Verifying the math

`test_logic.js` is a standalone Node script (no DOM) that re-implements
the pure computational functions from `script.js` and checks them against
hand-worked examples:

```bash
node test_logic.js
```

Covers: formula parsing (including nested parentheses and decimal
subscripts), the `CO3=O`/`NO3=O` group-substitution logic, an exact 4x4
precursor solve for a doped perovskite, the wt%<->mol% round trip, the
bare-token boundary guard (`N=` must not match inside `Na`), and a
doping-series batch of several full compositions confirming exact
agreement once the right elements are excluded via DO-NOT-balance (the
same case the batch-mode residual check above guards against in the UI).
