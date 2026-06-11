# Enterprise-Ready Design Rules

**Audience:** Agents generating UI apps on SAP CAP backends. Loaded as part of Tier 1 BEFORE any scaffolding step.

**Purpose:** Proactive design constraints. Each rule has a stable ID (ER-AREA-N) so it can be cited at write-time AND at review-time. Reactive recognition of these defects (in faceted-review.md) is necessary but insufficient - by the time review runs, the defect is in production. These rules tell the agent what NOT to write in the first place.

**Source / authority:** Each rule is tagged with one of:
- `[verified-this-trial]` - backed by concrete evidence in TrialIOpus (2026-05-22), with defect ID cited.
- `[OData spec]` - baseline OData V4 specification.
- `[Fiori guideline]` - SAP Fiori Design Guidelines reference (general SAP UX direction; specific quantitative thresholds may need calibration).
- `[my-judgment-needs-review]` -- agent's reasoned default; should be reviewed by an SAP UX SME or against the SAP Hyperspace product standards MCP catalogue (see `evolution/proposals-2026-05-22.md` last section).

**How to use:**
1. Before generating any artifact (page / control / query / annotation), consult the relevant ER-N rule(s) and the per-artifact write-time checklist at the end of this file.
2. After generating, run the enforcement gates derived from each rule (see `validation.md` SV-N entries).
3. When citing a rule violation in a defect report, use the ER-N ID.

---

## ER-DATA-1: Server-side filtering only `[Hyperspace PERF-12, PERF-15; verified-this-trial]`

Any list page filter MUST round-trip to the backend via OData `$filter` (or `$search`).

- **FORBIDDEN:** `items.filter(b => b.genre === selectedGenre)` on a cached array.
- **REQUIRED:** re-fetch with `?$filter=genre eq 'Romance'` on each filter change.

**Justification:** Catalogues grow; client-cached subsets become stale and incomplete; pagination breaks; counts wrong. Even at small data sizes, client-side `Array.filter` after `$top=200` returns a "filtered subset of the first 200" which is silently wrong as soon as the catalogue exceeds 200.

**Evidence:** TrialIOpus apps used server-side `$filter` correctly on List pages (PASS), but related ER-DATA-5 cross-link did not properly transfer filter context in FE (D-INT-FE-02). Pattern is partly enforced; needs a write-time gate.

**Gate:** `rg '\.filter\(.*\$state|filterFn\(' app/**/src/` -> zero matches in list-page sources.

---

## ER-DATA-1b: Text `Contains` filters MUST be case-insensitive `[verified TrialK-2026-06-01]`

Every `FilterOperator.Contains` filter on a string field MUST include `caseSensitive: false`. OData V4 `contains()` is case-sensitive by default on all backends including CAP/SQLite. Omitting `caseSensitive: false` produces silent wrong results  -  the table appears to filter but misses records differing only in case.

- **FORBIDDEN:** `new Filter("title", FilterOperator.Contains, sQuery)`  -  case-sensitive, silently wrong
- **REQUIRED:** `new Filter({ path: "title", operator: FilterOperator.Contains, value1: sQuery, caseSensitive: false })`  -  generates `contains(tolower(title),tolower('query'))`

The same applies to hand-crafted `$filter` strings (e.g. in `fetch()` calls for counts): use `contains(tolower(field),tolower('value'))` not bare `contains(field,'value')`.

This failure mode is particularly dangerous because: (1) it is silent  -  no console error, no 404; (2) exact-match searches still appear to work; (3) the bug only surfaces when a user types in a different case than the stored data.

**Gate:** `rg "FilterOperator\.Contains" app/**/*.ts` → every match must be followed by `caseSensitive: false` on the same or next line.

---

## ER-DATA-2: Server-side aggregation only `[Hyperspace PERF-12, PERF-15, PERF-16; verified-this-trial]`

Any KPI, sum, count, group-by displayed in the UI MUST use OData `$apply`.

- **FORBIDDEN:** `books.reduce((sum, b) => sum + b.stock, 0)` after fetching all books.
- **REQUIRED:** `GET /Books?$apply=aggregate(stock with sum as totalStock)` then read the single value.

**Justification:** Client cannot hold enterprise-scale datasets in memory. Sums on partial data lie. `$apply` is the OData V4 standard for server-side aggregation and is supported by CAP out of the box.

**Evidence:** TrialIOpus Overview pages used `$apply=aggregate(stock with sum as totalStock)` correctly (PASS) for Total Stock KPI and `groupby((genre),aggregate(stock with sum as totalStock))` for the Stock-by-Genre list. Pattern is enforced; the enterprise-ready file documents it as a non-negotiable rule.

**Gate:** `rg '\.reduce\(|sum\b.*=>' app/**/src/` -> zero matches in chart/KPI source files (Overview, Report).

---

## ER-DATA-3: Server-side sort and pagination `[OData spec; Hyperspace PERF-12, PERF-2]`

Any table > 25 rows MUST drive `$orderby` and `$top`/`$skip` from the server, not `Array.prototype.sort` / `slice`.

- **FORBIDDEN:** Loading all rows then sorting in JS for display.
- **REQUIRED:** `$orderby=title asc&$top=50&$skip=0`, with the UI's pagination controls re-issuing the request.

**Justification:** OData V4 spec section 11.2 - pagination is a server responsibility for any non-trivial result set. Client sort breaks once `$top` doesn't cover the full set.

**Evidence:** TrialIOpus WC4R/FX List pages have correct `$top`/`$skip` Prev/Next pagination (PASS). Skill should require this pattern in every freshly-generated list page.

**Gate:** `rg 'items\.sort\(|items\.slice\(' app/**/src/` -> zero matches in list-page sources.

---

## ER-DATA-4: ValueHelp dialog for high-cardinality filter inputs `[Fiori guideline; my-judgment-needs-review]`

If the distinct values of a filter field number > 25 (or are unknown at design time), the input MUST be a ValueHelp dialog (search + paginated table), NOT a Select dropdown.

- **Threshold of 25:** chosen as a conservative default; SAP Fiori guidelines have specific bands ("low / medium / high cardinality") with different control recommendations. The Hyperspace product standards MCP should be consulted to calibrate this number.
- **FORBIDDEN:** `<Select>` populated by `GET /Authors?$top=200` then rendered as a dropdown.
- **REQUIRED:** ValueHelp dialog with a search Input that drives `$filter=contains(name,'<query>')` on the backend, paginated table for results.

**Justification:** Dropdowns scale poorly past ~25 items - users cannot find values past row 50. Loading all values into the client violates ER-DATA-1.

**Evidence:** TrialIOpus apps used plain Select for Authors filter (33 distinct values, ABOVE threshold) - user explicitly flagged this as "the most generic solution was the most primitive solution and not good for the user". Direct violation in 3 of 4 apps. (D-PROP-29.)

**Gate:** Manual - list every filter input, query its value-set cardinality via `$count`, compare to threshold.

---

## ER-DATA-5: Cross-link transfers full filter context `[Hyperspace ACC-273; verified-this-trial]`

When a chart segment, KPI tile, or list item navigates to a filtered destination:

1. The URL MUST contain the filter value (verifiable via `window.location`).
2. The destination FilterBar/control MUST visibly display the value as a token.
3. The destination row count MUST match the source value (within +/-0).
4. The destination MUST auto-fetch (no "Click Go to start"). For FE this means `initialLoad: 'Enabled'` (NOT `'Auto'`).

**Evidence:** TrialIOpus FE Overview->List click set the URL `$filter` correctly but List FilterBar did NOT auto-apply - user had to click Go (D-INT-FE-02). Caused by `initialLoad: 'Auto'` (S-PROP-27).

**Gate:**
- `rg '"initialLoad":\s*"Auto"' app/**/manifest.json` -> warn.
- Manual at facet review: click each cross-link, verify (1)-(4) above. Marking PASS without verifying (2) and (4) is a substituted-success-criterion failure.


---

## ER-TEXT-1: No hardcoded UI text `[Hyperspace GLOB-65, GLOB-64, GLOB-146, GLOB-181, UA-010; verified-this-trial]`

Every user-visible string MUST come from an i18n bundle. This includes:
- Button labels, column headers, panel titles, dialog titles, tab names, tooltips
- Error / validation / toast / placeholder text
- Illustrated message titles and descriptions
- CDS `Label : '...'`, `@title : '...'`, `@Common.Label : '...'` annotations on the service layer

**FORBIDDEN:**
```xml
<Button text="Save"/>
<TableHeaderCell><span>Title</span></TableHeaderCell>
```
```ts
setError("Title is required.");
```
```cds
title @title : 'Title' @Common.Label : 'Title';
{ $Type : 'UI.DataField', Value : title, Label : 'Title' }
```

**REQUIRED:**
```xml
<Button text="{i18n>btnSave}"/>
<TableHeaderCell><span>{t('field.title')}</span></TableHeaderCell>
```
```ts
setError(t('error.titleRequired'));
```
```cds
title @title : '{i18n>fldTitle}' @Common.Label : '{i18n>fldTitle}';
{ $Type : 'UI.DataField', Value : title, Label : '{i18n>fldTitle}' }
```

**Evidence:** TrialIOpus -- 4/4 apps fail i18n. SAPUI5 bundle had 3 leftover scaffold keys (`appTitle=com.bookshop.analyzer`, `btnText=Say Hello`); FE has 16 keys but `annotations.cds` uses 22 hardcoded English `Label : '...'`; WC4R/FX have NO bundle (~700+ hardcoded strings each). Direct violations: D-I18N-FE-01, D-I18N-SAPUI5-01, D-I18N-WC4R-01, D-I18N-FX-01.

**Gates:**
- SAPUI5/FE: `rg '<(Button|Label|TableHeaderCell|Title|Text|Column)[^>]*\b(text|title)="[A-Z][a-z][^{]+"' app/**/*.xml` -> zero matches.
- React: `rg '>[A-Z][a-z]{3,}\s*<' app/**/*.tsx` -> manual review (some matches will be variable names; review for hardcoded English visible to users).
- CDS: `rg "Label\s*:\s*'[^{]" app/**/*.cds" -> zero matches outside `{i18n>...}` references.

---

## ER-TEXT-2: Text quality rules at write time `[Hyperspace UXC-015, UA-060, UA-050]`

When writing or generating any new label / button / message, it MUST satisfy:

1. **Case:**
 - Title Case for short UI texts (labels, headings, buttons, column headers, panel titles, dialog titles, tab names, tooltips). See `ux-standards.md` Section 1 for full rules.
 - Sentence case for messages, descriptions, explanations, placeholders, toast text.
2. **Verbs:** Action verbs imperative ("Save", "Delete", "Cancel"), NOT gerund ("Saving", "Deleting") for triggers; use gerund/progressive only for in-progress busy states.
3. **No apologies, no system jargon:**
 - FORBIDDEN: "Sorry, the backend rejected ...", "An error occurred in module X", "HTTP 500".
 - REQUIRED: "Couldn't save changes. Try again or contact support."
4. **Required-field markup:** Use `aria-required` + visual asterisk only. Do NOT append `(required)` or `*` to the label text itself (S-PROP-19, ER-A11Y-1).
5. **Abbreviations:** Only industry-standard ones (`USD`, `EUR`, `PDF`). NOT `Qty`, `Inv`, `Dt`, `Loc`.
6. **No FK names visible to user:** never show `author_ID`, `genre_ID`, raw GUIDs, or technical identifiers.

**Evidence:** TrialIOpus did not exhibit major violations of (1)/(2)/(3) but the user noted layout problems (S-PROP-30) that suggest text-quality and visual-quality rules are not consistently consulted at write time. Cross-reference `ux-standards.md` Sections 1-13.

**Gates:** `rg '\(required\)' app/**/src/ app/**/*.xml` -> zero matches (S-PROP-19 visual indicator should be the asterisk and aria-required, not literal "(required)" text).

---

## ER-TEXT-3: Numbers, dates, currencies use locale + currency-aware formatters `[Hyperspace GLOB-185, GLOB-186, GLOB-189; verified-this-trial]`

- **Currencies:** ALWAYS currency-aware. JPY, KRW have no minor unit; USD/EUR/GBP have 2; some have 3.
 - SAPUI5/FE: `sap.ui.model.odata.type.Currency` with `parts:[{path:'price'},{path:'currencyCode'}]`, `formatOptions:{showMeasure:true}`. Or `@Measures.ISOCurrency: currencyCode` annotation.
 - React: `Intl.NumberFormat(locale, { style:'currency', currency: book.currencyCode }).format(book.price)`.

- **Dates:** Locale-aware. Never raw ISO `2026-05-22T15:07:24.338Z` in user-visible text.
 - SAPUI5: `sap.ui.model.odata.type.Date`, `DateTime`, `DateTimeOffset` with `formatOptions:{style:'medium'}`.
 - React: `new Intl.DateTimeFormat(locale, {dateStyle:'medium'}).format(d)` or a library equivalent.

- **Numbers:** Group separators per locale.
 - SAPUI5: `sap.ui.model.odata.type.Decimal` / `Int32` with default formatting (gets thousands separators automatically).
 - React: `Intl.NumberFormat(locale).format(n)` for thousand separators.

**Evidence:** TrialIOpus -- 4/4 apps render JPY as `881.03`, `3,343.21`, `2,968.92` (D-DATA-CURRENCY-01). All use `Number(price).toFixed(2)` (React) or simple `{price}` binding (SAPUI5). None are currency-aware.

**Gates:**
- React: `rg 'toFixed\(2\)' app/**/src/` and `rg '\.toLocaleString\(\)' app/**/src/` -> warn (the latter doesn't enforce currency-aware; only locale).
- SAPUI5: `rg '<Text\s+text="\{price\}"' app/**/*.xml` -> warn missing Currency type.
- CDS: any property of type `Decimal` that represents a price/amount must have a sibling Currency property and `@Measures.ISOCurrency` annotation.


---

## ER-LAYOUT-1: No control overlap, no edge clipping `[Hyperspace ACC-271, ACC-282; verified-this-trial]`

- Every interactive control's bounding rect MUST be entirely inside its parent container.
- The main content area MUST NOT overlap the side navigation: `main.getBoundingClientRect().left >= sidenav.getBoundingClientRect().right`.
- No control may have bounding-rect `left < 0` (clipped at the left edge).

**Evidence:** User flagged after this trial -- "Main pane appeared to overlap navigation panel and some controls (search field) were cut off on the left." (S-PROP-30). Particularly observed in WC4R and FX. Likely caused by missing `min-width: 0` on flex children or absent `padding-left` on `<main>`.

**Gate:** Playwright `evaluate`:
```js
() => {
  const nav  = document.querySelector('nav.fx-side-navigation, ui5-side-navigation, [class*="SideNavigation"], aside');
  const main = document.querySelector('main, [role="main"]');
  const h1   = document.querySelector('h1, [role="heading"]');
  if (!nav || !main) return { skipped: true };
  const nr = nav.getBoundingClientRect();
  const mr = main.getBoundingClientRect();
  const hr = h1?.getBoundingClientRect();
  return {
    overlap:   mr.left < nr.right,
    sidenavRight: Math.round(nr.right),
    mainLeft:  Math.round(mr.left),
    titleLeft: hr ? Math.round(hr.left) : null,
    titleGap:  hr ? Math.round(hr.left - nr.right) : null,
    clipped: Array.from(document.querySelectorAll('input, button, ui5-input, ui5-button'))
      .filter(e => e.offsetParent && e.getBoundingClientRect().left < 0)
      .map(e => ({ tag: e.tagName, id: e.id }))
  };
}
```
PASS requires ALL of: `overlap: false`, `clipped: []`, AND `titleGap >= 12`. A `titleGap` of 0-11 means the page title is flush to the nav edge - see §2.1.1 of fx.md for the CSS fix.

---

## ER-LAYOUT-2: Minimum spacing between controls `[Hyperspace UXC-030]`

Spacing (margin, padding, gap) between and around UI elements MUST come from the SAP Horizon spacing token set, NOT from ad-hoc literal pixel values:

- Standard spacing primitives (margin, padding) per UXC-030 [030-2] / [030-4].
- Responsive spacing tokens that adapt by breakpoint per UXC-030 [030-1] / [030-3].
- Adjacent interactive controls MUST have at least the equivalent of `--sapMargin-S` (8 px at default breakpoint) or `--sapMargin-XS` (4 px in compact density). Adjacent labels and their controls MUST be at least `--sapMargin-XS` apart.
- Forbidden: free-form `style={{ marginRight: '13px' }}` or Tailwind-arbitrary `mr-[13px]`. Required: theme-aware tokens or, for non-themed React apps, Tailwind density-equivalent classes (`m-1`, `m-2` = 4 px / 8 px) consistently across the app.

**Evidence:** User flagged after this trial -- "fx and WC layouts were sloppy - insufficient margin/padding between controls." (S-PROP-30). The skill's per-technology files show inline `style={{display:'flex', gap:'1rem'}}` examples but do not enforce a token-based system.

**Gate:**
- `rg "(margin|padding|gap):\s*\d+px" app/**/*.tsx app/**/*.css` -> warn each match (prefer tokens).
- `rg "style=\{\{[^}]*(margin|padding|gap)" app/**/*.tsx` -> warn each match.
- Chrome DevTools MCP `evaluate_script` measuring `gap` of each direct flex/grid container holding interactive children, OR a manual review during faceted Facet 1.

---

## ER-LAYOUT-3: Print-safe by construction `[Hyperspace GLOB-42; verified-this-trial]`

Every page that includes a "Print" button or is intended to be printable (Report pages, exports, audit summaries) MUST include the canonical `@media print` override block at scaffold time, NOT added later.

The canonical block is documented in `print.md`. It must:
1. Override `height: auto !important; overflow: visible !important; position: static !important` on every viewport-height ancestor (`html`, `body`, `#root`, `main`, `.sapMShellPage`, `.sapMNav`, `.sapTntToolPage*`, `.sapMPage*`, `div[style*="100vh"]`, `div[style*="overflow"]`).
2. Force `thead { display: table-header-group }` and `tr { page-break-inside: avoid }` for header repetition and row preservation.
3. Hide nav chrome (`ui5-shellbar`, `ui5-side-navigation`, `.no-print`, `[class*="sapMShellHeader"]`, `[class*="SideNavigation"]`);
   AND for sap.tnt ToolPage apps: `.sapTntToolPageHeaderWrapper`, `.sapTntToolPageHeader`, `.sapTntToolHeader`, `.sapTntToolPageAside`, `.sapTntToolPageAsideContent` [verified TrialK-2026-06-01]  -  the substring match `[class*="SideNavigation"]` catches the nav list but NOT the surrounding panel and header bar.
4. Force light background (`body { background: white !important; color: black !important }`).

Companion rules for printable pages (each with its own enforcement):
- No `sticky="ColumnHeaders"` on Report tables (S-PROP-15).
- Explicit column widths (P-02-6).
- Server-side fetch covering ALL records via paginated loop (P-02-1) - NOT a single hardcoded `$top`.

**Evidence:** TrialIOpus -- 4/4 apps fail print preview (D-PRINT-FE-02, D-PRINT-SAPUI5-03, D-PRINT-WC4R-01, D-PRINT-FX-01). The clipping problem is explained in detail in `print.md`. Single most impactful "print-safe by construction" miss in this trial.

**Gate:** `rg '@media print' app/**/*.css` AND verify the matched block contains the canonical selectors (height:auto / overflow:visible / position:static on the long ancestor list, thead repeat, sticky/100vh removal). A `@media print` rule that only sets `body{background:white}` is NOT compliant.
If `sap.tnt` is declared in `ui5.yaml framework.libraries`, additionally verify the block contains `.sapTntToolPageHeaderWrapper` and `.sapTntToolPageAside` in the hide-chrome list, AND `.sapTntToolPage` with `position: static !important` in the ancestor reset block.


---

## ER-A11Y-1: aria-required on the input element `[Hyperspace ACC-253, ACC-263, ACC-264; verified-this-trial]`

Visual required indicators (asterisk, "(required)" suffix) are decorative. The actual `<input>` / `<ui5-input>` MUST have `aria-required="true"` (or the framework's `required` prop that propagates to ARIA).

**FORBIDDEN (visual asterisk only, no ARIA):**
```tsx
<Label required>Title</Label>
<Input value={title} onInput={...} />
```
The Label gets a visual asterisk, but the Input has no `aria-required`. Screen readers see a plain text field.

**REQUIRED (visual + ARIA both):**
```tsx
<Label required>Title</Label>
<Input required value={title} onInput={...} />
```
or for FX where the underlying `<input>` may not propagate:
```tsx
<Input aria-required="true" required value={title} onChange={...} />
```

For SAPUI5 XML views, the framework propagates correctly when `required="true"` is set on the input control:
```xml
<Input required="true" value="{book>/title}" />
```
Always pair with a `<Label required="true" labelFor="inTitle"/>`.

**Evidence:** TrialIOpus - WC4R + FX inputs have no `required` or `aria-required` despite labels showing visual asterisk; Lighthouse a11y dropped to 90 (FX) and 92 (WC4R) on this. SAPUI5/FE pass (Lighthouse 100). D-A11Y-WC4R-01, D-A11Y-FX-01, S-PROP-19.

**Gate:** for each TSX `<Label[^>]*required>` near an `<Input>`, the Input must also have `required` or `aria-required="true"`.

---

## ER-A11Y-2: aria-labelledby for every form input `[Hyperspace ACC-253, ACC-263, ACC-264]`

Every input / select / textarea MUST have `aria-labelledby` pointing to its visible label, OR an `aria-label` attribute if no visible label exists. Empty / null labels fail screen readers and Lighthouse `aria-input-field-name`.

**Evidence:** TrialIOpus WC4R/FX Lighthouse audits flagged `aria-input-field-name` failure - inputs lacked accessible names. D-A11Y-WC4R-01, D-A11Y-FX-01.

**Gate:** Lighthouse a11y score >= 95 on every page; `aria-input-field-name` audit must PASS.

---

## ER-A11Y-3: Color is never the only signal `[Hyperspace ACC-256]`

If state is conveyed by colour (Good / Warning / Critical / Negative / Information), the same state MUST also be conveyed by:
- Visible text label (preferred), OR
- An icon with an accessible name distinct from the colour, OR
- Both.

**FORBIDDEN:** Status pill with only `<div className="bg-warning"></div>` - looks like an empty coloured square.

**REQUIRED:**
```tsx
<ObjectStatus state="Warning" icon="warning"><span>Low Stock</span></ObjectStatus>
```

**Evidence:** TrialIOpus - SAPUI5 KPI tiles include state name in aria-label ("Good"/"Neutral"/"Warning") - PASS. WC4R/FX cards convey low-stock via colour bg only - minor concern (D-A11Y-COLOR-01).

**Gate:** Manual review during Facet 4. For each coloured indicator, verify a non-colour signal is present.

---

## ER-VALIDATE-1: Inline field-level validation, not MessageBox `[Hyperspace ACC-274, ACC-275, UXC-023]`

Empty required field or out-of-range value MUST be communicated via `valueState='Error'` + `valueStateText` on the field, with focus moved to the field. NOT via a MessageBox dialog.

MessageBox is reserved for backend-rejected operations (HTTP 400/500 on Save) where the issue is not field-specific.

**FORBIDDEN (modal dialog for empty-required):**
```ts
onSave: function() {
  if (!title) {
    MessageBox.error("Title is required.");
    return;
  }
}
```

**REQUIRED (inline field-level):**
```ts
onSave: function() {
  const titleInput = this.byId("inTitle");
  if (!this.getView().getModel("book").getProperty("/title")) {
    titleInput.setValueState("Error").setValueStateText("Title is required.").focus();
    return;
  }
  // ... only use MessageBox for backend errors
}
```

```tsx
// React equivalent
const [titleError, setTitleError] = useState("");
const onSave = () => {
  if (!title.trim()) {
    setTitleError("Title is required.");
    titleInputRef.current?.focus();
    return;
  }
  // ...
};
return <Input value={title} valueState={titleError ? "Error" : "None"} valueStateMessage={<span>{titleError}</span>} ref={titleInputRef} />;
```

**Evidence:** TrialIOpus SAPUI5 used MessageBox dialog for empty-required (D-CTRL-SAPUI5-VALID-01). WC4R + FX correctly use MessageStrip/inline messages. S-PROP-24.

**Gate:** `rg 'MessageBox\.(error|warning)\([^)]*required' app/**/src/` -> warn (likely a misuse). Allow MessageBox only after a Save attempt that reaches the backend.


---

## ER-NAV-1: Bypass route handler required `[Hyperspace ACC-275, UXC-023; verified-this-trial]`

Every router config MUST define a "page not found" target for unmatched routes. Unknown URLs (`#/garbage`, `/invalid-route`) MUST NOT silently keep the previous page rendered.

**SAPUI5/FE manifest pattern:**
```json
"routing": {
  "config": {
    "routerClass": "sap.m.routing.Router",
    "viewType": "XML",
    "bypassed": { "target": "notFound" }
  },
  "routes": [ ... ],
  "targets": {
    "notFound": { "viewName": "NotFound", "viewLevel": 99 },
    ...
  }
}
```

**React (react-router) pattern:**
```tsx
<Routes>
  <Route path="/" element={<OverviewPage />} />
  ...
  <Route path="*" element={<NotFoundPage />} />
</Routes>
```

The `NotFound` view should be visually distinct, mention the missing URL, and offer a link back to home (or `Overview`).

**Evidence:** TrialIOpus SAPUI5 `#/garbage` keeps previous page visible with no error (D-NAV-SAPUI5-01). WC4R + FX correctly handle `*` wildcard. FE handles via sap.fe defaults ("Sorry, we can't find this page"). S-PROP-21.

**Gate:**
- SAPUI5/FE: `rg '"bypassed":' app/**/manifest.json` -> at least one match required.
- React: `rg 'path="\*"' app/**/src/App.tsx` -> at least one match required.

---

## ER-NAV-2: Bad-key dataReceived handler `[Hyperspace ACC-275, UXC-023; verified-this-trial]`

Every `bindElement` / data fetch on a parameterized detail route (e.g. `/books/:id`) MUST register a dataReceived/error handler that detects empty/404 results and renders a "not found" state, NOT blanks.

**SAPUI5 pattern:**
```ts
this.getView().bindElement({
  path: "/Books(" + id + ")",
  events: {
    dataReceived: (e) => {
      if (!e.getParameter("data")) {
        // Navigate to notFound or show MessageStrip
        this.getRouter().getTargets().display("notFound");
      }
    }
  }
});
```

**React pattern:**
```tsx
const [book, setBook] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  fetchJson(`/admin/Books(${id})`)
    .then(setBook)
    .catch(setError)
    .finally(() => setLoading(false));
}, [id]);

if (loading) return <BusyIndicator />;
if (error || !book) {
  return <MessageStrip design="Negative">
    Book not found.
    <Button design="Transparent" onClick={() => navigate("/list")}>Back to List</Button>
  </MessageStrip>;
}
// ... render book details
```

**Evidence:** TrialIOpus SAPUI5 `/books/999999` shows blank form with all fields empty (D-NAV-SAPUI5-02). WC4R `/books/999999` shows just "Back to List" with no error (D-NAV-WC4R-01). FX handles correctly ("Could not load this book / Not Found / Back to List"). FE handles via sap.fe defaults. S-PROP-21.

**Gate:** Manual review during Facet 6 - navigate to a known-bad ID for each detail route, verify a not-found state is rendered.

---

## ER-OBSERVE-1: Console must be quiet `[Hyperspace OS-204, FC-1; verified-this-trial]`

After loading any page or completing any action, the browser console MUST contain:
- Zero `error`-level entries.
- Zero entries prefixed `[FUTURE FATAL]`, `Uncaught`, `Unhandled rejection`, `Failed to load`, `Refused`, `MIME type`, `Cannot read property`.

This is a MANDATORY gate to be run:
1. Before SV-0 / "is the app serving" gate after every generation step.
2. After fixing any defect (re-check; new warning = regression).
3. Before declaring any iteration complete.

**Evidence:** TrialIOpus - the FE `[FUTURE FATAL] PropertyInfo validation is disabled for control bookshopfe::FeBooksList--fe::table::FeBooks::LineItem` (msgid 872) was emitting from very first render but went unnoticed until late faceted review Facet 2. It was the smoking gun for D-DATA-FE-02 (Price + CurrencyCode columns silently dropped). Two columns disappeared from production output and the warning sat in console untouched. S-PROP-34.

**Gate:** Chrome DevTools MCP `list_console_messages(types=["error"])` returns `[]` AND `list_console_messages(types=["warn"])` filtered for the patterns above returns `[]`. Run after every page navigation + every SV-N gate.

**Allow-list (only these warnings may be ignored, document the exception):**
- `LrepConnector failed call 'loadFlexData': Error: Not Found` (LREP server-only feature; harmless in dev).
- `Refused to execute script from 'http://.../Component-preload.js' because its MIME type ('text/html')` - happens when Component-preload.js doesn't exist; harmless if the source modules load fine.

Any other warning is a defect.

---

## ER-OBSERVE-2: Network must be quiet `[Hyperspace PERF-2, SEC-236; verified-this-trial]`

After loading any page, the network panel MUST contain:
- Zero 4xx responses (except known-harmless 404s like `/sap/bc/lrep/flex/data/...` in dev mode).
- Zero 5xx responses.

**Evidence:** TrialIOpus apps consistently passed this by design (CAP server returned 200 for all valid OData requests). Adding the rule here so it's enforced for every future app.

**Gate:** Chrome DevTools MCP `list_network_requests(statusMin=400)` returns only known-allowlisted entries, AND `list_network_requests(statusMin=500)` returns `[]`.


---

## ER-A11Y-4: Visible focus indicator `[Hyperspace ACC-271]`

Every interactive UI element MUST display a visible focus indicator when it receives keyboard focus. The full focus indicator AND the focused element MUST be in the visible viewport (not clipped by overflow, sticky panels, or scroll containers).

**Evidence:** New rule added 2026-05-26 from cross-reference with Hyperspace ACC-271. Not directly tested in TrialIOpus; Lighthouse a11y score of 90-92 (WC4R/FX) and 100 (SAPUI5/FE) covers this indirectly.

**Gates:**
- Manual: Tab through every page, verify each focused element is fully visible and the indicator is clearly distinguishable.
- Automated: Lighthouse a11y `focus-visible` audit must PASS on every page; no `outline: none` without a replacement focus style.
- `rg 'outline:\s*none' app/**/src/ app/**/*.css` -> warn each match (must have replacement focus style nearby).

---

## ER-A11Y-5: Minimum contrast `[Hyperspace ACC-261]`

Text contrast MUST be at least 4.5:1 (small text) / 3.0:1 (large text 18pt+ or 14pt bold+) against background in default theme; 7.0:1 / 4.5:1 in high-contrast theme. Icons, graphical objects, and visual state indicators (e.g. focus ring, selected-row background) MUST be at least 3.0:1 in default theme.

**Evidence:** New rule added 2026-05-26 from cross-reference with Hyperspace ACC-261. Lighthouse a11y `color-contrast` audit covers this; was passing in TrialIOpus.

**Gates:**
- Lighthouse a11y `color-contrast` audit must PASS on every page (score >= 95 typically implies pass).
- Manual review against ACC-261 done criteria for charts and custom-coloured elements (Tailwind `text-gray-400` on white background = 2.85:1, FAIL).

---

## ER-A11Y-6: Target size `[Hyperspace ACC-287]`

Every interactive target (button, link, checkbox, icon-button, anchor, role=button) MUST have a dedicated area covering at least a circle of 24 CSS px diameter, centered on the bounding box of the target, including surrounding space.

**Exception:** targets that are inline within a sentence or block of text.

**Evidence:** New rule added 2026-05-26 from cross-reference with Hyperspace ACC-287. Not directly tested in TrialIOpus; WC4R icon-only buttons and FX small chips may have been below 24 px (not measured).

**Gate:** Chrome DevTools MCP `evaluate_script`:
```js
() => Array.from(document.querySelectorAll('button, a, [role="button"], input[type="button"], ui5-button, ui5-icon[interactive]'))
  .filter(el => el.offsetParent && (el.getBoundingClientRect().width < 24 || el.getBoundingClientRect().height < 24))
  .map(el => ({ tag: el.tagName, id: el.id, w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height }))
```
Result must be `[]` (excluding inline-text targets, manually verified).

---

## ER-A11Y-7: Information, structures, relationships `[Hyperspace ACC-263]`

Visual information, structures, and relationships MUST be programmatically determinable so screen readers can convey them:

- Tables MUST use `<th>` elements with explicit `scope="col"` / `scope="row"` for headers.
- Headings MUST follow a strict hierarchy starting at h1, with no level gaps (no h1 -> h3 jumps).
- Form groupings MUST use `<fieldset>` + `<legend>`, or ARIA `role="group"` + `aria-labelledby`.
- Lists MUST use `<ul>` / `<ol>` semantics, not just visual indenting.
- Decorative dividers (background colour bands, decorative borders) MUST NOT carry semantic information that's not also in text.

**Evidence:** New rule added 2026-05-26 from cross-reference with Hyperspace ACC-263.

**Gates:**
- `rg '<h\d' app/**/*.xml app/**/src/` -> manual review for hierarchy gaps.
- Lighthouse a11y `heading-order`, `definition-list`, `list`, `listitem` audits must PASS.
- For SAPUI5: `sap.m.Table` correctly produces `<th>`; for raw `<table>` in HTML/JSX, verify via DOM inspection.

---

## ER-A11Y-8: Robust context `[Hyperspace ACC-273]`

Focusing a UI element or changing its state MUST NOT auto-trigger a context change (route change, dialog open, large content swap) without explicit user action (Enter, Space, click, deliberate Submit). Auto-submit on focus, auto-navigation on hover, or auto-dialog on tab is forbidden.

**Evidence:** New rule added 2026-05-26 from cross-reference with Hyperspace ACC-273.

**Gates:**
- Manual: Tab through every interactive element on a page, verify no context changes (URL change, dialog appear, content swap > 50% of viewport) occur during focus traversal.
- `rg 'onFocus.*navigate\(|onFocus.*setOpen' app/**/src/` -> warn each match (likely violates ACC-273).
- Avoid `onMouseEnter` handlers that route or open dialogs.

---

## ER-VALIDATE-2: Data-loss prevention on navigation `[Hyperspace UXC-023]`

Edit and Create forms MUST detect unsaved changes (dirty state) and present a Confirmation dialog (UXC-023 type) before:

1. Browser navigation away (Back / Forward / Reload / Close)
2. In-app navigation (side-nav click, ShellBar Home, breadcrumb)
3. Cancel / Discard button click (when changes have been made)

Threshold: any input affecting MORE than 10 form fields, OR any input where data loss would cause user frustration, business impact, or risk (designer judgement).

**Evidence:** New rule added 2026-05-26 from cross-reference with Hyperspace UXC-023. TrialIOpus Edit pages do NOT show unsaved-changes warning when the user navigates away with dirty form.

**Pattern (React):**
```ts
useEffect(() => {
  const beforeUnload = (e: BeforeUnloadEvent) => {
    if (isDirty) { e.preventDefault(); e.returnValue = ''; }
  };
  window.addEventListener('beforeunload', beforeUnload);
  return () => window.removeEventListener('beforeunload', beforeUnload);
}, [isDirty]);
```
For in-app navigation: use a router blocker (`useBlocker` for react-router; `routeMatched.preventDefault` + dialog for SAPUI5).

**Gates:**
- Manual: in Edit page, modify a field, click side-nav -> verify Confirmation dialog appears with Stay / Leave choices.
- `rg 'beforeunload' app/**/src/` -> at least one match per Edit/Create page source.

---

## ER-MSG-1: Standard message types `[Hyperspace UXC-023]`

Every status / message displayed to the user MUST use one of the 5 standard message types and the corresponding standard SAP colour + icon:

| Type | Color variable | Icon | Use |
|---|---|---|---|
| Error | `sapNegativeColor` | `sap-icon://error` | Critical issue interrupting/aborting a process |
| Warning | `sapCriticalColor` | `sap-icon://alert` | Potential issue, user advised to exercise caution |
| Success | `sapPositiveColor` | `sap-icon://sys-enter-2` | Completion of user-initiated action |
| Information | `sapInformativeColor` | `sap-icon://information` | Additional context, no immediate action required |
| Confirmation | `sapNeutralColor` | `sap-icon://sys-help-2` | Verify or approve before finalizing an action |

Custom (domain-specific) message types are forbidden unless explicitly approved per UXC-023's exception process.

**Evidence:** New rule added 2026-05-26 from cross-reference with Hyperspace UXC-023. TrialIOpus apps used ad-hoc Tailwind colours (`bg-red-500`, `bg-yellow-200`) instead of SAP semantic colour variables in WC4R/FX cards.

**Gates:**
- SAPUI5/FE: `<MessageStrip type="..." />` MUST be one of `Information|Success|Warning|Error`.
- React (WC4R/FX): `<MessageStrip design="..." />` MUST be one of `Information|Positive|Critical|Negative` (Note: WC4R uses `design` prop, mapping: `Positive->Success, Critical->Warning, Negative->Error`).
- `rg 'bg-(red|yellow|green|blue|gray)-\d' app/**/src/` -> warn (likely uses ad-hoc Tailwind colours instead of SAP semantic variables).

---

## ER-TERM-1: Standard terminology for actions `[Hyperspace UXC-015]`

Button labels, menu items, and action triggers MUST use the standard term from UXC-015 [015-1] for the corresponding meaning. Critical distinctions:

- **Save**: keep changes to existing object. NOT for "submit for approval" (use Submit) or "create new" (use Create).
- **Submit**: save AND release to next step in a workflow. NOT for "save".
- **Discard**: dispense with draft / unsaved changes. NOT for "remove from list" (use Remove).
- **Delete**: erase already-saved data. NOT for "discard draft".
- **Remove**: take out of a list / reference without deleting from database. NOT for "delete".
- **Cancel**: stop an action without saving. NOT for "decline an offer" (use Decline) or "reject a request" (use Reject).
- **OK**: confirm displayed information; a more specific verb (Save, Apply, Filter) is preferred when it fits.
- **Add**: assign existing object to a set. **Create**: add a new object. NOT interchangeable.

Domain-specific substitutions are allowed only via the UXC-015 exception process.

**Evidence:** New rule added 2026-05-26 from cross-reference with Hyperspace UXC-015. TrialIOpus apps were generally compliant but the rule was not explicitly cited.

**Gates:** Manual review of every button label, menu item, dialog title against the UXC-015 [015-1] table. Particularly check that `Submit` is not used for "Save".

---

## ER-DATA-6: Time-zone aware timestamp storage `[Hyperspace GLOB-186]`

Timestamps in the data model MUST use OData `Edm.DateTimeOffset` (UTC with offset) unless the use case is explicitly time-zone-independent (e.g. "deadline at 23:59 local time") in which case `Edm.DateTime` with documented intent is acceptable. Time durations and date arithmetic MUST work correctly across DST transitions.

**Evidence:** New rule added 2026-05-26 from cross-reference with Hyperspace GLOB-186.

**Gates:**
- `rg 'Edm\.DateTime[^O]' app/**/*.cds` -> warn each match for review (may be valid for date-only or local-time fields).
- Manual: test calendar / deadline computations across a DST transition (e.g. last Sun in October).

---

## ER-GLOB-1: Alternative calendar support `[Hyperspace GLOB-189]`

If the product targets Japan (public sector), Saudi Arabia / Islamic markets, or Iran, the date-picker control MUST support the corresponding alternative calendar (Japanese Emperor / Islamic Hijri / Persian). The Islamic Hijri calendar MUST be customizable.

- **SAPUI5/FE:** the built-in `sap.m.DatePicker` supports these via the `secondaryCalendarType` / `displayFormatType` properties.
- **WC4R:** `<ui5-date-picker primary-calendar-type="Japanese|Islamic|Persian">`.
- **FX:** verify the chosen DatePicker component supports alternative calendars; if not, fall back to ui5-webcomponents.

**Evidence:** New rule added 2026-05-26 from cross-reference with Hyperspace GLOB-189. Not applicable to TrialIOpus (English/USD only) but documented for multi-market deployments.

**Gates:** Per-market deployment checklist; not applicable to single-market apps.

---

## ER-GLOB-2: Bidirectional / RTL layout `[Hyperspace GLOB-179]`

If the product targets Arabic, Hebrew, or other RTL languages, the layout MUST be RTL-aware:

- Use CSS logical properties (`margin-inline-start`, `padding-inline-end`, `text-align: start/end`) NOT physical (`margin-left`, `padding-right`).
- Set `<html dir="rtl">` for RTL locales.
- Verify icons / arrows reverse direction (back arrow, breadcrumb separator).
- Verify tables, charts, and timelines reverse reading order.

**Evidence:** New rule added 2026-05-26 from cross-reference with Hyperspace GLOB-179. Not applicable to TrialIOpus (English-only).

**Gates:**
- `rg 'margin-(left|right)' app/**/*.css` -> warn each match (prefer logical properties).
- `rg 'padding-(left|right)' app/**/*.css` -> warn each match.
- Manual: render with `<html dir="rtl">` and verify layout integrity.

---

## ER-OBSERVE-3: No sensitive data in client-side logs `[Hyperspace OS-204, SEC-272]`

Client-side logs (console.log/info/warn/error, network request headers/body, localStorage, sessionStorage) MUST NOT contain:

- Authentication credentials, passwords, API keys, OAuth tokens, session IDs.
- Personal information (user names, addresses, phone numbers, gender, bank accounts).
- Business-confidential data (financial reports, sales, salaries, customer-specific data).

**Evidence:** New rule added 2026-05-26 from cross-reference with Hyperspace OS-204 and SEC-272.

**Gates:**
- `rg 'console\.(log|info|warn|error|debug)\([^)]*(password|token|apiKey|sessionId|userName|email|phone|ssn|creditCard)' app/**/src/` -> zero matches.
- Manual review of console output during user actions; redact-or-mask required for any identifier.
- Network panel inspection: request bodies / response payloads should not log full PII; hash or partial-mask is acceptable for diagnostic purposes.

---

## ER-SEC-1: Use a security-aware UI framework, no `dangerouslySetInnerHTML` `[Hyperspace SEC-281, SEC-100]`

UI MUST be built on a security-aware framework with built-in output encoding:

- **Approved:** SAPUI5 (auto-escapes typed properties and standard controls), Angular (`bypassSecurityTrustX` only when explicitly trusted), React/JSX (auto-escapes by default).
- **Forbidden:** `dangerouslySetInnerHTML` in React/JSX, `innerHTML = userInput` in any DOM manipulation, `bypassSecurityTrustX` without explicit threat-modelled justification.
- **Forbidden:** `sap.ui.core.HTML` control in SAPUI5 with user-supplied content (it bypasses framework escaping).
- **Forbidden:** Domain Relaxation (manipulation of `document.domain`).

**Evidence:** New rule added 2026-05-26 from cross-reference with Hyperspace SEC-281 (Make use of secure UI Frameworks) and SEC-100 (Protect against Injection attacks). TrialIOpus apps comply by default - no `dangerouslySetInnerHTML` matches found in any app source. Documented here so future apps don't regress.

**Gates:**
- `rg 'dangerouslySetInnerHTML' app/**/src/` -> zero matches.
- `rg '\.innerHTML\s*=' app/**/src/` -> zero matches with user-supplied input.
- `rg 'bypassSecurityTrust' app/**/src/` -> zero matches without an inline `// SEC-281 justified: ...` comment.
- `rg 'document\.domain' app/**/src/` -> zero matches.
- `rg 'sap\.ui\.core\.HTML' app/**/*.xml app/**/*.ts` -> manual review for any user-supplied content path.

---

## ER-SEC-2: External assets only from SAP-controlled domains `[Hyperspace SEC-391]`

The application's HTML / CSS / JS MUST NOT load assets (scripts, styles, fonts, images, SVGs) from third-party domains without a contractual SAP relationship. This means:

- **Allowed:** `sapui5.hana.ondemand.com`, `ui5.sap.com`, `*.cfapps.eu10.hana.ondemand.com`, customer-specific domains in customer-deployed apps.
- **Forbidden:** `cdn.jsdelivr.net`, `unpkg.com`, `cdnjs.cloudflare.com`, `code.jquery.com`, `fonts.googleapis.com` (use locally bundled fonts), `*.github.io`, any other public-upload CDN.
- **Required mitigation if integration is unavoidable:** CSP allowlist + Subresource Integrity (SRI) hashes on every `<script>` and `<link rel="stylesheet">` tag.

**Evidence:** New rule added 2026-05-26 from cross-reference with Hyperspace SEC-391 (Securely include external assets at runtime). The `bookshop/app/vue/index.html` (upstream bookstore sample) loads from `cdn.jsdelivr.net` - non-compliant; not part of generated apps but documented for awareness. SAPUI5/FE apps in TrialIOpus correctly load `sap-ui-core.js` only from SAP-controlled domains.

**Gates:**
- `rg 'src="https?://(?!.*sap\.com|.*sap\.corp|.*hana\.ondemand\.com|.*cfapps\.).*"' app/**/*.html` -> zero matches (no third-party domains in script/link tags).
- `rg 'href="https?://(?!.*sap\.com|.*sap\.corp|.*hana\.ondemand\.com|.*cfapps\.|.*googleapis\.com).*\.(css|woff|woff2|ttf)"' app/**/*.html` -> zero matches OR documented exception with SRI.
- `rg '<(script|link)\s+[^>]*\bintegrity=' app/**/*.html` -> at least one match per external resource (SRI required).

---

## ER-SEC-3: Apply baseline security HTTP headers `[Hyperspace SEC-390]`

Every HTML response from the app MUST include the following baseline security headers (priority "High" in SEC-390):

| Header | Required value (or stricter) |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self'; form-action 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'none'` (adjust as needed; NEVER `unsafe-inline`/`unsafe-eval`/`unsafe-hashes`/`wasm-unsafe-eval`) |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` (or `no-referrer`) |
| `X-Content-Type-Options` | `nosniff` |
| `Content-Type` | MIME-type matching the body, with `charset=utf-8` for HTML |
| `Cache-Control` | For authenticated responses: `no-store` or `private, max-age=N`. NEVER `public` on authenticated content. |

Plus medium-priority: `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-site`, `Access-Control-Allow-Origin` only when CORS is needed (specific origin, never `*` for authenticated).

For CAP development servers (`cds watch`) these can be configured via the `cors` middleware or a custom express middleware. Production deployments via cf-router / SAP BTP handle most of these by default.

**Evidence:** New rule added 2026-05-26 from cross-reference with Hyperspace SEC-390 (Apply baseline security HTTP headers). TrialIOpus apps were not tested for these headers; CAP `cds watch` does NOT set CSP / HSTS / Referrer-Policy by default. Direct violation in the dev configuration. Production deployment to SAP BTP would address most of these.

**Gates:**
- `curl -I https://<app-url>/` MUST contain all 6 high-priority headers above with secure values.
- Chrome DevTools Network panel: response headers for the index document show all 6 headers.
- `rg 'unsafe-inline\|unsafe-eval\|unsafe-hashes\|wasm-unsafe-eval' app/**/*` -> zero matches in CSP configuration.

---

## ER-SEC-4: Clickjacking protection on every HTML response `[Hyperspace SEC-264]`

Every HTML response MUST be protected against clickjacking via either:

- **Preferred:** CSP `frame-ancestors` directive (set in ER-SEC-3 above, e.g. `frame-ancestors 'self'` or `'none'`).
- **Legacy fallback for very old browsers:** `X-Frame-Options: DENY` or `SAMEORIGIN`.

For SAPUI5 >= 1.28: built-in clickjacking solution available; configure via `sap-ui-config` `frameOptions` parameter or `sap.ui.core.Configuration.setFrameOptions()`.

**Evidence:** New rule added 2026-05-26 from cross-reference with Hyperspace SEC-264 (No Clickjacking vulnerabilities). Same observation as ER-SEC-3 - dev `cds watch` does not set this; SAPUI5 built-in option not configured.

**Gates:**
- `curl -I https://<app-url>/index.html | grep -i "frame-ancestors\|x-frame-options"` -> at least one match.
- For SAPUI5: `rg 'sap-ui-frameOptions\|frameOptions' app/**/*.html app/**/*.ts` -> at least one configuration found.

---

## ER-SEC-5: Output encoding for any user-supplied string in templates `[Hyperspace SEC-100]`

Any user-supplied or backend-supplied string rendered into HTML / JSX / XML templates MUST be output-encoded by the framework or via an explicit encoding API. Forbidden patterns:

- React: `<div>{rawHtmlString}</div>` is OK (auto-escaped); `dangerouslySetInnerHTML={{__html: x}}` is FORBIDDEN unless `x` is sanitized via DOMPurify or the value is a literal known safe at compile time.
- SAPUI5 XML view: `<Text text="{path/to/userField}"/>` is OK (auto-escaped); inline-formatted strings via `formatter` returning HTML markup are FORBIDDEN.
- Template literals constructing HTML: `el.innerHTML = '<div>' + userInput + '</div>'` is FORBIDDEN; use `document.createElement` + `.textContent`.

**Evidence:** New rule added 2026-05-26 from cross-reference with Hyperspace SEC-100 (Protect against Injection attacks - section on Output Encoding).

**Gates:** Same as ER-SEC-1 (zero matches for `dangerouslySetInnerHTML`, `innerHTML =`, etc.).

---

## ER-UX-1: Semantic colour coding for classification columns `[verified-TrialK-2026-05-29; UXC-030]`

Any column bound to a domain status, urgency, priority, severity, or state field (values form an ordered or categorical set with business meaning) MUST render with a distinct colour per value using SAP Horizon semantic CSS token variables. Plain unstyled text for all values is a UX failure - it forces the user to read every cell rather than scan by colour.

**Write-time trigger:** before generating any `<TableCell>` or display `<span>` for a field whose CDS type is an `enum` or whose name matches `/status|urgency|priority|severity|state/i`.

**FORBIDDEN:**
```tsx
<span>{STATUS_LABELS[row.status_code]}</span>  // plain black text for all values
```

**REQUIRED:**
```tsx
// Defined once at file level - CSS vars resolve at runtime from the active theme
const STATUS_CSS_TOKENS: Record<string, string> = {
  N: 'var(--sapInformativeColor)',     // New        - blue
  A: 'var(--sapChart_OrderedColor_2)', // Assigned   - amber
  I: 'var(--sapCriticalColor)',        // In Process - orange
  H: 'var(--sapChart_OrderedColor_4)', // On Hold    - magenta
  R: 'var(--sapPositiveColor)',        // Resolved   - green
  C: 'var(--sapNeutralColor)',         // Closed     - grey-blue
}
// In table cell:
<span style={{ color: STATUS_CSS_TOKENS[row.status_code] ?? 'var(--sapTextColor)', fontWeight: 600 }}>
  {STATUS_LABELS[row.status_code]}
</span>
```

The same token map MUST be used consistently everywhere the same field is displayed: list table, detail view, popover quick-view, chart legend. Inconsistency across locations violates ux-standards.md §12 (Threshold consistency).

**Gate:** `rg 'STATUS_LABELS\[|status_code\]\|urgency_code\]' app/**/*.tsx` -> every display match must have an adjacent `color:` expression. Any plain `<span>{label}</span>` wrapping a status/urgency value without a colour = blocking defect.

---

## ER-UX-2: FK / association fields must have a rich interactive footprint `[verified-TrialK-2026-05-29; Fiori QuickView pattern]`

Before generating any read-only display of an FK / association field, count the user-relevant properties of the referenced entity (exclude managed fields and system IDs). If the count is >= 2:

- **List / table context:** render the FK value as a clickable `<Button design="Transparent">` that opens a `Popover` on click, showing ALL user-relevant fields with icons and a cross-navigation link to the filtered list view.
- **Detail view mode:** same Popover, OR inline Card section. NOT plain text.
- **NEVER:** `<span>{entity.name}</span>` or `<Text text="{customer/name}"/>` alone.

Data must be **lazy-loaded on first open** - no page-load cost. Event propagation must be **stopped** so the opener click does not also trigger the parent row navigation.

Also: any field already fetched from the API MUST be rendered in the UI. Never fetch a field (`phone`, `address`) and silently discard it.

**Write-time trigger:** any FK field whose referenced entity has email, phone, address, or other user-contact fields (name matches `/customer|author|agent|supplier|owner|assignee|counterparty/i`).

**Gate (strengthened):** `rg 'customer\?\.name|customer\.name|customer_ID' app/**/*.tsx` -> every match in a list `<TableCell>` or display `<span>` must have `Popover`, `Button`, or `popover` within 25 lines. The original `customer/name` OData-path pattern does not match React optional-chaining syntax `row.customer?.name`. A bare `<span>` alone = blocking defect.

---

## ER-UX-3: List tables must support server-side column sort `[verified-TrialK-2026-05-29; Fiori guideline]`

Any table that displays a list of the primary entity (Incidents, Books, Travels) MUST allow the user to sort by clicking column headers. Sort MUST be server-side via OData `$orderby` - client-side `Array.sort` on a `$top`-limited page is silently wrong.

**Write-time requirements:**
- Sortable state: `const [sort, setSort] = useState('createdAt')` and `const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc')`
- Column click handler: toggle `asc`/`desc` on the same column; default `asc` when switching to a new column; always reset `skip` to 0
- The active sort column MUST be visually distinct: different colour, sort icon (ascending/descending), or bold weight
- Unsorted columns show a neutral indicator (e.g. faint `⇅`) so users know columns are sortable

```tsx
const handleSort = (col: string) => {
  setSkip(0)
  if (sort === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
  else { setSort(col); setSortDir('asc') }
}

<TableHeaderCell minWidth="360px">
  <button onClick={() => handleSort('title')}
          aria-label={`Sort by Title${sort === 'title' ? ` (${sortDir})` : ''}`}>
    Title
    {sort === 'title'
      ? sortDir === 'asc' ? <SortAscendingIcon /> : <SortDescendingIcon />
      : <span style={{ opacity: 0.3 }}>⇅</span>}
  </button>
</TableHeaderCell>
```

**FORBIDDEN:** Plain static `<TableHeaderCell>Title</TableHeaderCell>` text with no click handler on a list-page table.

**Gate (prevention grep):** `rg 'TableHeaderCell|<th[^e]' app/**/*.tsx` on list-page files -> every match must have an `onClick` or `handleSort` call within 10 lines.

**Gate (detection - Playwright):**
```js
// Click first column header; verify $orderby appears in the next OData request
await page.locator('th button, [data-col]').first().click()
const url = page.url()
// Then check network: list_network_requests() -> URL must contain $orderby=
```

---

## ER-UX-4: Long-text fields must be accessible from list view `[verified-TrialK-2026-05-29; Fiori QuickView]`

Any entity that has a long-text property (name matches `/description|notes|remark|comment|body/i` OR CDS MaxLength >= 100) MUST provide a preview from the list row. Adding a full description column is not acceptable - it overflows or truncates unhelpfully.

**Required pattern:** An info button (InformationIcon or equivalent) adjacent to the primary cell (title/name). Clicking opens a positioned popover with:
1. The record title as a heading
2. A "Description" or equivalent label
3. The full text with `whiteSpace: pre-wrap`
4. `e.stopPropagation()` to prevent the row-click navigation

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
  <span title={row.title} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
    {row.title}
  </span>
  {row.description && (
    <button
      aria-label={`Preview description: ${row.title}`}
      onClick={e => { e.stopPropagation(); openDescPopover(e, row.title, row.description) }}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
               display: 'inline-flex', color: 'var(--color-neutral-400)' }}
    >
      <InformationIcon style={{ width: '0.85rem', height: '0.85rem' }} aria-hidden />
    </button>
  )}
</div>
```

**Write-time trigger:** Before generating any list-page `<TableCell>` for the primary entity, inspect `$metadata` for properties matching the pattern above. If found, the info-button popover MUST be included.

**Gate:** `rg 'description.*TableCell\|TableCell.*description\|\.description\b' app/**/*.tsx` on list pages -> every display site must have an adjacent `InformationIcon` or popover within 15 lines. Plain `<span>{row.description}</span>` in a list cell = blocking defect.

---

## ER-LAYOUT-8: TextArea for long-text CDS fields `[verified-TrialK-2026-05-29]`

Before generating any form input, inspect the CDS property. Use `<TextArea>` (not `<Input>`) when:
- `MaxLength >= 100` in `$metadata`, OR
- Property name matches `/description|notes|remark|comment|message|text|body/i`

Set `rows={4}` and `style={{ resize: 'vertical' }}` so the user can expand as needed. In read-only view mode use `whiteSpace: 'pre-wrap'` on the display `<Text>` element so stored line breaks are preserved.

| Technology | TextArea control |
|---|---|
| WC4R / FX | `<TextArea rows={4} style={{ resize: 'vertical' }}>` |
| SAPUI5 | `<TextArea rows="4" growing="true" growingMaxLines="8"/>` |
| Fiori Elements | `@UI.MultiLineText: true` annotation on the CDS property |

**Gate:** `rg '<Input[^>]*aria-label="(Description|Notes|Comment|Remark|Message)"' app/**/*.tsx app/**/*.xml` -> zero matches (these must be TextArea, not Input).

---

## ER-FORM-5: FK suggestion inputs must search by display name AND unique key `[verified-TrialK-2026-05-29]`

Any suggestion input bound to an FK association MUST fetch matches by at least:
1. `contains(tolower(name), '<term>')` - for users who type a name
2. `ID eq '<term>'` (exact string match) - for users who type or paste the technical key

Combined: `$filter=contains(tolower(name),'<term>') or ID eq '<term>'`

This applies to ALL three contexts where FK suggestion inputs appear: filter bars, Create dialogs, Edit forms. Extract as a shared utility to prevent divergence:

```ts
// api.ts
export function buildFkSuggestionFilter(val: string, nameField = 'name'): string {
  const escaped = escapeOData(val.toLowerCase())
  return `contains(tolower(${nameField}),'${escaped}') or ID eq '${escapeOData(val)}'`
}
```

**Gate:** `rg "contains.*tolower.*name" app/**/*.tsx app/**/*.ts` -> every match must be accompanied by an `or ID eq` clause in the same filter string. A name-only filter = blocking defect.

---

## ER-FORM-4: FK inputs display `Name (ID)` at rest; name-only when focused `[verified-TrialK-2026-05-29]`

When a value is selected in an FK suggestion input, the user needs to see **both the human-readable name and the unique identifier** at rest. Two users named "Daniel Watts" and "Daniel Brown" would be indistinguishable from name alone. The ID disambiguates.

- **Input at rest (blurred) - value selected:** `${name} (${id})`
- **Input when focused:** name only - the `(ID)` suffix corrupts the suggestion query
- **Active filter chip:** always `${name} (${id})` when name is known; `${id}` alone as fallback
- **Fallback (name unavailable):** ID alone - never blank

Apply **identically** across all three contexts: filter bar, Create dialog, Edit form. Inconsistency causes user confusion.

```tsx
// Shared pattern - copy to all FK suggestion inputs
const [focused, setFocused] = useState(false)

<Input
  value={
    !focused && selectedId && displayName && displayName !== selectedId
      ? `${displayName} (${selectedId})`
      : displayName
  }
  onFocus={() => setFocused(true)}
  onBlur={() => setFocused(false)}
  onInput={v => { setDisplayName(v); setSelectedId('') }}  {/* FX Input.onInput: (value: string) not DOM event */}
  onSelectionChange={e => {
    setSelectedId(e.detail.item.dataset.id)
    setDisplayName(e.detail.item.text)
  }}
/>
```

Pass the name as a URL parameter alongside the ID on any cross-navigation link so the destination can display `Name (ID)` without an extra fetch:
```
/incidents?customer=1004155&customerName=Daniel%20Watts
```

**Gate:** `rg 'setCustomerDisplayName\|setAuthorDisplayName' app/**/*.tsx` -> each match must also have a corresponding `focused` state and the ternary display value logic above.

---

## Per-artifact write-time checklists `[S-PROP-36]`

Before writing each kind of artifact, consult the relevant checklist. The checklist references ER-N rules above; each item is enforceable.

### When generating an i18n key or UI text:
- [ ] Is this string in an i18n bundle? (ER-TEXT-1)
- [ ] Does the text follow ER-TEXT-2 quality rules (case, no apologies, no jargon, action verbs, no `(required)` suffix)?
- [ ] If a number / date / currency, does it use a locale + currency-aware formatter? (ER-TEXT-3)

### When generating a filter input:
- [ ] What is the cardinality of the filter value-set? Query `$count` of distinct values. If unknown or > 25, ValueHelp dialog (ER-DATA-4); else a bounded Select is acceptable.
- [ ] Does the filter wire to `$filter` (server-side, ER-DATA-1) and NOT `Array.prototype.filter` on cached items?
- [ ] Will URL parameter pre-populate the filter and trigger a fetch? (ER-DATA-5)

### When generating a chart, KPI, or aggregation display:
- [ ] Aggregation done via OData `$apply` server-side? (ER-DATA-2)
- [ ] No client-side `.reduce()` / loop summation on raw rows?
- [ ] Click handler navigates with FULL filter context? (ER-DATA-5)
- [ ] For sap.viz VizFrames: `attachSelectData` registered in controller inside `attachRenderComplete` callback? (ER-CHART-1, ER-CHART-4)
- [ ] `setVizProperties` called inside `attachRenderComplete`, NOT directly after setting model data? (ER-CHART-4)
- [ ] `_propsWired` guard on `attachRenderComplete` to prevent duplicate handlers on route re-visit? (ER-CHART-4)
- [ ] For count-based measures: `setVizScales([{feed:'valueAxis', unit:1, fixedRange:true, max:N+1}])` AND `formatString:"0"` for integer-only Y-axis? (ER-CHART-2, ER-CHART-6)
- [ ] `plotArea.window.start/end` + `scrollbar.enable:false` in vizProperties to show ALL bars (no virtual scroll)? (ER-CHART-5)
- [ ] VizFrame height set dynamically: `Math.max(300, categoryCount * 34) + "px"` after data loads? (ER-CHART-5)
- [ ] Single-series bar/column charts have NO `color` FeedItem? (`legend: { visible: false }` in vizProperties as belt-and-suspenders.) (ER-CHART-3)
- [ ] Chart panel container uses `<FlexItemData growFactor="N" minWidth="Xpx"/>` NOT `width="%"` on the Panel element? (ER-LAYOUT-4)
- [ ] Monetary measure charts filter to a single currency OR use a currency-agnostic measure (stock, count)? (ER-CHART-7)

### When generating a Report or print page:
- [ ] Print CSS override block included per `print.md` (full §5 block, NOT just body{background:white})? (ER-LAYOUT-3, S-PROP-14)
- [ ] If app uses `sap.tnt` ToolPage layout: print CSS hides `.sapTntToolPageHeaderWrapper`, `.sapTntToolPageHeader`, `.sapTntToolHeader`, `.sapTntToolPageAside`, `.sapTntToolPageAsideContent` AND resets `.sapTntToolPage` to `position: static !important` (renders `position:absolute` at runtime  -  without this ALL content clips to one page silently)? [verified TrialK-2026-06-01] (S-PROP-67)
- [ ] No `sticky="ColumnHeaders"` (S-PROP-15)?
- [ ] Server-side fetch covers ALL records via paginated loop until `@odata.count` is reached (P-02-1)?
- [ ] **For every navigation property field displayed in the report (e.g. `customer/name`, `assignee/name`, `author/name`): the fetch URL includes `$expand=<navigationProperty>`** [verified TrialK-2026-06-02]. A `fetch()` call without `$expand` silently returns raw FK scalar IDs (e.g. `"1004183"`) instead of the resolved name. This is a blocking defect: the Customer column shows numeric IDs to users. Fix: add `&$expand=customer` (or the relevant navigation property name) to the fetch URL and bind to `inc.customer?.name ?? inc.customer_ID`.
- [ ] Explicit column widths defined and summing to 100%, sized to content not equal-width? (P-02-6, ER-REPORT-1)
- [ ] `@media print` block includes pop-in prevention (`display:table-cell !important` on `th`/`td`)? (ER-REPORT-1)
- [ ] `@media print` block includes `box-sizing:border-box; padding:2px 4px` on BOTH `th` AND `td`? (ER-REPORT-1)
- [ ] Font-size targets `th, th *` and `td, td *`  -  NOT just `th` and `td`? (ER-REPORT-1)
- [ ] Font-size calibrated: 8px for 7 columns, 9px for 5-6 columns? (ER-REPORT-1)
- [ ] nth-child selectors start at nth-child(2) (SAPUI5 sentinel column at nth-child(1))? (ER-REPORT-1)

### When generating a form input:
- [ ] `aria-required` (or framework `required` prop that propagates) on the input itself, not just the label (ER-A11Y-1, S-PROP-19)?
- [ ] `aria-labelledby` (or `aria-label`) for accessible name (ER-A11Y-2)?
- [ ] Inline `valueState` validation, not MessageBox, for empty/range errors (ER-VALIDATE-1, S-PROP-24)?
- [ ] `width="100%"` on every text Input in a Create/Edit form (ER-LAYOUT-6)?
- [ ] Price/Decimal fields use `sap.m.Input` + `sap.ui.model.odata.type.Decimal` with `groupingEnabled:false`, NOT `sap.m.StepInput` (ER-LOCALE-1)?
- [ ] For FK suggestion inputs: `onSave()` re-validates FK ID against current text before POST/PATCH (ER-FORM-1)?
- [ ] For FK suggestion inputs on Create forms: `onSave()` attempts exact-name lookup if authorId is null but text is non-empty (ER-FORM-1)?
- [ ] Every FK suggestion input has an adjacent "New [Entity]" button/dialog for inline creation (ER-FORM-2)?
- [ ] **CDS `String(N>=100)` or name matching `/description|notes|comment|message/i` uses `TextArea`, not `Input` (ER-LAYOUT-8)?**
- [ ] **Every FK suggestion input searches by BOTH display name AND exact ID: `contains(name) or ID eq '...'` (ER-FORM-5)?**
- [ ] **Every FK suggestion input displays `Name (ID)` at rest (blurred) and name-only when focused (ER-FORM-4)?**
- [ ] **FK active-filter chips display `Name (ID)` when name is known, ID alone as fallback (ER-FORM-4)?**

### When generating any page or route:
- [ ] Does the router have a bypass / wildcard route handler? (ER-NAV-1, S-PROP-21)
- [ ] Does the detail page have a bad-key handler? (ER-NAV-2, S-PROP-21)
- [ ] After scaffolding: does `list_console_messages(types=["error"])` return `[]`? (ER-OBSERVE-1, S-PROP-34)
- [ ] After scaffolding: does the network panel contain only expected status codes? (ER-OBSERVE-2)
- [ ] **No XML view uses `press=".method('arg')"` argument-in-handler syntax** [verified TrialK-2026-06-02]. SAPUI5 XML event handler bindings resolve the method name but silently drop arguments  -  the handler fires but receives no argument, making status-passing tiles and buttons do nothing. Use a dedicated no-argument method per value instead (e.g. `onWorkloadTilePressNew`, `onWorkloadTilePressAssigned`). Gate: `rg 'press="\.[a-zA-Z]+\(' app/**/*.xml` → zero matches.

### When generating a detail/edit page:
- [ ] **"Edit" action in the list navigates to a route that starts in edit mode** (`navTo("detailEdit", ...)` → separate route with `/{id}/edit` pattern mapped to `_onRouteMatchedEdit` which sets `viewMode: false`). Navigating to the plain detail route from an Edit button is a silent defect  -  the page opens read-only with no explanation [verified TrialK-2026-06-01].
- [ ] **Every field editable by the user has an actual input control in the edit form**  -  not a `<Text>`. Audit every `<Label>` row in the edit form: title → `<Input>`, customer/FK → `<Input showSuggestion="true">` with `onSuggest`/`onSuggestionItemSelected`, status → `<Select>`, etc. A `<Text>` bound to a navigation property (e.g. `{customer/name}`) in the edit form is read-only and blocks the user from changing that field [verified TrialK-2026-06-01].
- [ ] FK association fields in the edit form store the FK ID in a controller variable (`_selectedCustomerId`) set in `onSuggestionItemSelected`, and include it in the PATCH payload  -  NOT just the display name (ER-FORM-1)?
- [ ] Unsaved-changes guard: dirty flag set on any input `change` event; `onDiscard` and back-navigation show `MessageBox.confirm` when dirty (ER-VALIDATE-2)?
- [ ] **`valueState` reset on every edit entry**  -  both `onEdit()` and `_onRouteMatchedEdit` (or `_bindAndShow`) must call `setValueState("None")` on every editable `Input` before setting `viewMode: false`. SAPUI5 control `valueState` persists across in-session navigations; without this reset, a validation error from a previous edit session reappears on re-entry even when the field has a valid value [verified TrialK-2026-06-01]. See `sapui5.md §7.1`.
- [ ] **Every `fetch()` call that populates a view displaying navigation property names (e.g. customer name, assignee name) includes `$expand=<nav>` in the URL** [verified TrialK-2026-06-02]. The same rule applies to list tiles and secondary views (e.g. Assignment high-urgency list)  -  not just the main detail view. A fetch without `$expand` returns raw FK IDs silently.

### When generating a list/table page:
- [ ] For `sap.ui.table.Table` with `rowmodes:Auto`: parent `<Page>` has `enableScrolling="false"` and wrapping `<VBox>` has `height="100%"` so the table fills available viewport? (ER-LAYOUT-5)
- [ ] Search input placeholder explicitly names the searchable field ("Search by name"), OR the OData `$filter` includes OR conditions for all visible string columns (ER-SEARCH-1)?
- [ ] **Every status/urgency/priority/classification column uses semantic colour coding via SAP CSS token variables (ER-UX-1)?**
- [ ] **Every FK / association field with >= 2 user-relevant properties in the referenced entity uses a Popover or QuickView, not plain text (ER-UX-2)?**
- [ ] **Entity with a `description`, `notes`, or similar free-text field has a dedicated Description column (not stacked under Title), with `WebkitLineClamp: 2` and `title` tooltip for full text?**
- [ ] **`_onRouteMatched` for the plain (unfiltered) list route explicitly resets ALL filter controls to their default/empty state AND resets `_currentPage = 0` before calling the filter/binding method** [verified TrialK-2026-06-02]. Simply clearing `_preFilter` and calling `_applyFilters()` is not sufficient  -  the Select/Input controls retain their last displayed value. Pattern: `selStatus.setSelectedKey(""); selUrgency.setSelectedKey(""); inCustomer.setValue(""); inSearch.setValue(""); this._currentPage = 0;` See `sapui5.md §13`. Without this, navigating from a filtered route back to the unfiltered route leaves filters showing the previous values.
- [ ] **All class-level state variables and module-level constants used in the controller are declared** [verified TrialK-2026-06-02]: `private _currentPage = 0; private _totalCount = 0;` etc. in the class body; `const PAGE_SIZE = 20;` at module level. Using undeclared variables fails Gate B with `Property 'X' does not exist on type 'ControllerName'`.

### When generating layout (container, side nav, main):
- [ ] Side-nav and main do not overlap (ER-LAYOUT-1)?
- [ ] Inputs are not clipped at the left edge (ER-LAYOUT-1)?
- [ ] Adjacent controls have >= 8 px (Cozy) or >= 4 px (Compact) gap (ER-LAYOUT-2)?

---

## Definition-of-done gates - run before declaring any iteration complete

| Rule | Gate command / check |
|------|----------------------|
| ER-TEXT-1 | `rg '<(Button\|Label\|TableHeaderCell\|Title\|Text\|Column)[^>]*\b(text\|title)="[A-Z][a-z][^{]+"' app/**/*.xml` -> zero matches |
| ER-TEXT-1 (CDS) | `rg "Label\s*:\s*'[^{]" app/**/*.cds` -> zero matches |
| ER-TEXT-3 | `rg 'toFixed\(2\)' app/**/src/` -> warn each match in price/amount column |
| ER-DATA-1 | `rg '\.filter\(.*\$state' app/**/src/` -> zero matches in list-page sources |
| ER-DATA-2 | `rg '\.reduce\(\|sum\b.*=>' app/**/src/` -> zero matches in chart/KPI source files |
| ER-DATA-4 | manual: each filter input's value-set cardinality vs threshold 25 |
| ER-DATA-5 | `rg '"initialLoad":\s*"Auto"' app/**/manifest.json` -> warn |
| ER-LAYOUT-1 | DV evaluate_script per ER-LAYOUT-1 -- overlap=false, clipped=[] |
| ER-LAYOUT-3 | `rg '@media print' app/**/*.css` AND content matches canonical block in `print.md` |
| ER-LAYOUT-4 | `rg 'width="[0-9]+px"' app/**/*.xml` -> zero matches on Panel/Container elements wrapping a chart |
| ER-LAYOUT-5 | `evaluate_script` table height ratio >= 60% of viewport for every sap.ui.table.Table list page |
| ER-LAYOUT-6 | `rg '<Input[^>]+value=.*title\|name\|descr[^>]*/>' app/**/*.xml` -> every match must also contain `width=` |
| ER-LAYOUT-7 | Pre-scaffold: for each entity field, if `String(N)` with N >= 60 or name matches `/title\|description\|notes\|remark/i`, check rendered width >= 250px. Runtime gate: `evaluate_script` in Facet 1 - see ER-LAYOUT-7 gate. |
| ER-CHART-1 | `rg 'attachSelectData\|attachEvent.*selectData' app/**/*.ts` -> >= 1 match per VizFrame in any Overview/analytics view |
| ER-CHART-2 | `rg 'formatString.*"0"' app/**/*.ts` or `setVizProperties.*valueAxis` -> >= 1 match per chart whose measure is a count |
| ER-FORM-1 | `rg 'onSave' app/**/*.ts` -> each onSave() body must contain a FK re-validation / re-lookup before fetch |
| ER-FORM-2 | `rg 'showSuggestions="true"' app/**/*.xml` -> each FK suggestion input must have adjacent add/new button within 20 lines |
| ER-LOCALE-1 | `rg '<StepInput[^>]*value=.*price\|amount\|cost' app/**/*.xml` -> zero matches (use Input + Decimal type) |
| ER-REPORT-1 | `rg 'font-size.*[7-9]px' app/**/*.css` AND `rg 'table-layout.*fixed' app/**/*.css` -> at least one match each on report pages |
| ER-SEARCH-1 | for each search liveChange handler: OData $filter covers all visible string columns OR placeholder names the single searched field |
| ER-A11Y-1 | for each `<Label[^>]*required>` near `<Input>`: Input must have `required` or `aria-required="true"` |
| ER-A11Y-2 | Lighthouse a11y >= 95 on every page; `aria-input-field-name` PASS |
| ER-NAV-1 | `rg '"bypassed":' app/**/manifest.json` OR `rg 'path="\*"' app/**/src/App.tsx` -> at least one match |
| ER-OBSERVE-1 | `list_console_messages(types=["error"])` returns `[]` after loading every page |
| ER-OBSERVE-2 | `list_network_requests(statusMin=500)` returns `[]` after loading every page |
| ER-UX-1 | `rg 'STATUS_LABELS\[' app/**/*.tsx` -> every match has adjacent `color:` expression with a SAP token variable |
| ER-UX-2 | `rg 'customer\.name\|customer/name\|customer_ID' app/**/*.tsx app/**/*.xml` -> every display match has `Popover` or `Button` in surrounding 20 lines; no bare `<span>` or `<Text>` |
| ER-LAYOUT-8 | `rg '<Input[^>]*aria-label="(Description\|Notes\|Comment\|Remark\|Message)"' app/**/*.tsx app/**/*.xml` -> zero matches (must be TextArea) |
| ER-FORM-5 | `rg "contains.*tolower.*name" app/**/*.tsx app/**/*.ts` -> every match has `or ID eq` in same filter string |
| ER-FORM-4 | `rg 'setCustomerDisplayName\|setAuthorDisplayName\|setDisplayName' app/**/*.tsx` -> each match has adjacent `focused` state; active filter chips use `Name (ID)` format |

These gates are enforced at:
1. Scaffold completion (every gate, on first generation).
2. After every defect fix (the gate(s) for the affected rule + ER-OBSERVE-1).
3. Before declaring iter convergence in `testing-protocol.md`.

---

## Anti-substitution rules `[S-PROP-33, user feedback]`

**Do NOT accept these as PASS:**

- HTTP 200/201/204 alone - must re-read the entity OR verify visible UI text.
- URL hash change alone - must verify visible page heading + correct count text.
- `aria-selected="true"` alone - must verify rendered panel content actually changed.
- Console errors absent at one moment - must verify no console errors in the last 5 seconds of activity.
- Single screenshot OK - must verify content not clipped: `rect.bottom <= viewport.bottom` OR scrollHeight check.
- `documentScrollHeight` >= viewport alone - must verify the actual table fits inside (the `100vh` clipping problem in S-PROP-14).
- "I followed the pattern in the skill" -- must verify the rule's gate command returns the expected zero/match.
- **Injected-CSS print test PASS alone** - injecting `position:static; overflow:visible` rules and measuring `scrollHeight` is NOT a substitute for an actual print preview screenshot. P-02-5 requires `window.print()` or Ctrl+Shift+P and a screenshot of the rendered print output showing column alignment and no truncation.
- **Chart onClick "should work because handler is wired"** - a sap.viz VizFrame `attachSelectData` call in the controller is NOT a PASS for P-01-1. Must execute `click(uid=<chart-bar>)` or `evaluate_script` confirming the click fires the handler and the URL or filter changes.
- **Author field has text = Author is set** - a visible author name in the Input does NOT mean `authorId` is set. Must `evaluate_script` the viewModel `authorId` property to verify it is non-null and corresponds to the displayed name.

Each PASS in the facet log MUST cite which non-substituted check it ran.

**Evidence:** User noted (after this trial): "Increasing the task complexity appears to cause the agent to fail to execute the test cases with fidelity, substituting the success criteria e.g. accepting a 200 http response in lieu of checking something specific in the DOM."

---

## ER-CHART-1: Every interactive chart must have a wired click/selection handler `[verified-TrialJ-2026-05-26]`

A chart rendered without a click handler is **decoration, not a feature**. Any bar chart, donut, column, or line chart on an Overview or analytics page that is described as "interactive" in the page's intent MUST fire a navigation or filter action when a segment is clicked.

**FORBIDDEN:** A `sap.viz.VizFrame` (SAPUI5) or recharts `<BarChart>` (React) with no event subscription.

**REQUIRED (SAPUI5 sap.viz):**
```ts
// In controller onInit or after chart model is set:
const chart = this.byId("chartStockByGenre") as unknown as { attachSelectData?: (fn: Function) => void };
chart?.attachSelectData?.((e: object) => {
  const dim = (e as {getParameter:(k:string)=>Array<{val:string}>}).getParameter("data")?.[0]?.val;
  if (dim) {
    const preFilter = this.getOwnerComponent().getModel("preFilter") as JSONModel;
    preFilter?.setData({ genre: dim });
    this.getRouter().navTo("list");
  }
});
```

**Evidence:** TrialJ bookstore - all 4 VizFrame charts had no `attachSelectData` handler. The Facet 3 P-01-1 check was listed but never executed because sap.viz SVG elements do not appear in the a11y snapshot as clickable UIDs.

**Gate (write-time):**
```
# For sap.viz: every VizFrame must have a corresponding attachSelectData or attachEvent("selectData") call in the controller
rg "attachSelectData|attachEvent.*selectData" app/**/*.ts  # must have >= 1 match per VizFrame in the view
# Cross-check: every VizFrame id in the view XML must appear in a controller attachSelectData call
```

**Also add to "When generating a chart" checklist:**
- [ ] For sap.viz VizFrames: `attachSelectData` handler registered in controller after the chart model is set (ER-CHART-1)
- [ ] Handler calls `navTo("list")` with filter dimension value passed via component preFilter model (ER-DATA-5)

---

## ER-CHART-2: Chart Y-axis must use integer ticks for discrete-count measures `[verified-TrialJ-2026-05-26]`

A chart axis showing "0.5 Books", "1.5 Authors", or "2.5 Incidents" is factually wrong. Fractional ticks occur when sap.viz auto-scales a small integer range. For any measure that represents a count of discrete entities (books, incidents, orders, users), the Y-axis MUST use integer steps only.

**FORBIDDEN:** sap.viz bar/column chart with `bookCount` max=3 rendered with axis ticks 0, 0.5, 1, 1.5, 2, 2.5, 3.

**REQUIRED:**
```ts
// In _configureCharts() - set after model data is loaded:
const authorChart = this.byId("chartBooksByAuthor") as unknown as {setVizProperties?: (p:object)=>void};
authorChart?.setVizProperties?.({
  title: { visible: false },
  plotArea: { dataLabel: { visible: false } },
  valueAxis: {
    title: { visible: false },
    scale: { fixedRange: false },
    label: { formatString: "0" }   // integer format - no decimals
  }
});
```

**Evidence:** TrialJ "Books per Author" chart showed 0, 0.5, 1, 1.5, 2, 2.5, 3 on Y-axis. Max value was 3. sap.viz auto-divided the range into 6 steps producing fractional values.

**Gate (write-time):** For every chart whose measure name contains `Count`, `count`, `Qty`, `quantity`, or whose `MeasureDefinition` aggregates with `$count`:
```
rg 'MeasureDefinition.*\$count|aggregate.*\$count' app/**/*.xml app/**/*.ts  -> each match requires a corresponding setVizProperties with valueAxis.label.formatString: "0"
```

**Definition-of-done gate:** `take_snapshot()` on Overview page -> search snapshot for patterns `\b[0-9]+\.[05]\b` adjacent to chart Y-axis labels -> zero matches where the chart measures a discrete count.

---

## ER-CHART-3: Remove the color FeedItem from single-series bar/column charts `[verified-TrialJ-2026-05-26]`

A `color` FeedItem on a bar chart creates a per-bar color series, which forces sap.viz to render a legend panel on the right side. When every bar is already labeled on the category axis, the legend is **redundant information** that wastes ~160px of chart width and makes bars thinner.

**FORBIDDEN:**
```xml
<viz:feeds>
  <feeds:FeedItem uid="categoryAxis" type="Dimension" values="Genre"/>
  <feeds:FeedItem uid="valueAxis"    type="Measure"   values="Stock"/>
  <feeds:FeedItem uid="color"        type="Dimension" values="Genre"/>  <!-- WRONG for a labeled bar chart -->
</viz:feeds>
```

**REQUIRED:**
```xml
<!-- Category axis already labels every bar; no color feed needed -->
<viz:feeds>
  <feeds:FeedItem uid="categoryAxis" type="Dimension" values="Genre"/>
  <feeds:FeedItem uid="valueAxis"    type="Measure"   values="Stock"/>
</viz:feeds>
<!-- If you want to suppress any residual legend also call: -->
<!-- frame.setVizProperties({ legend: { visible: false } }) -->
```

Keep the `color` FeedItem ONLY for multi-series charts (e.g. grouped bars by region+year) where color is the only distinguisher between series. For single-series charts the axis label is always the primary affordance.

**Evidence:** TrialJ Overview page - all 4 bar/column charts had a `color` FeedItem, generating a legend column on the right. After removal, bars filled the full panel width and became clearly readable.

**Gate:**
```
rg 'FeedItem.*uid="color"' app/**/*.xml
# For each match: check if the chart has exactly ONE dimension AND ONE measure.
# If yes (single-series), the color feed is redundant -> remove it.
```

---

## ER-CHART-4: `setVizProperties` must be called inside `attachRenderComplete` `[verified-TrialJ-2026-05-26]`

Calling `setVizProperties` immediately after setting the bound data model is silently overwritten when sap.viz re-renders on the data-binding update cycle. The chart renders once to apply the data, and that render resets all vizProperties back to defaults. Properties must be re-applied **after** the final render.

**FORBIDDEN:**
```ts
// Data is set, then vizProperties immediately - the render cycle will overwrite these
this._viewModel.setProperty("/genreStock", data);
frame("chartStockByGenre")?.setVizProperties?.({ title: { visible: false } });  // LOST on next render
```

**REQUIRED:**
```ts
// Wire properties on renderComplete so they persist after the data-binding render
const applyOnRender = (id: string, props: object, scales?: object[]) => {
  const f = this.byId(id) as unknown as {
    setVizProperties?: (p: object) => void;
    setVizScales?: (s: object[] | null) => void;
    attachRenderComplete?: (fn: () => void) => void;
    _propsWired?: boolean;
  };
  if (!f || f._propsWired) return;
  f._propsWired = true;
  f.attachRenderComplete?.(() => {
    if (scales) f.setVizScales?.(scales);
    f.setVizProperties?.(props);
  });
};

// Call applyOnRender ONCE after chart data is loaded (not on every render)
applyOnRender("chartStockByGenre", { title: { visible: false }, legend: { visible: false }, plotArea: { ... } });
```

Guard with `_propsWired` to prevent `attachRenderComplete` from being called again on route re-visit (which would accumulate duplicate handlers).

**Exception:** Charts that render BEFORE `_configureCharts()` is called (e.g. a donut that gets data from an earlier fetch) may need `setVizProperties` called directly rather than via `attachRenderComplete`, since `renderComplete` has already fired.

**Evidence:** TrialJ Overview - `setVizProperties({ title: { visible: false } })` had no effect when called synchronously. All 4 charts showed "Title of Chart" even after the call. The fix was `attachRenderComplete`.

**Gate:**
```
rg 'setVizProperties' app/**/*.ts
# Every match must either be inside an attachRenderComplete callback,
# OR be the documented "direct call" exception for charts that render before configureCharts runs.
```

---

## ER-CHART-5: sap.viz bar chart must disable internal scrollbar to show all categories `[verified-TrialJ-2026-05-26]`

By default, sap.viz bar charts enable an internal virtual scroll that shows only a subset of categories (typically the first 5-8 bars) within the declared height, hiding the rest behind a scrollbar. This is correct for large datasets but wrong for analytics dashboards where all categories must be visible at once.

**REQUIRED:**
```ts
// In setVizProperties (inside attachRenderComplete):
{
  plotArea: {
    window: { start: "firstDataPoint", end: "lastDataPoint" },
    scrollbar: { enable: false }
  }
}
```

**Also required:** Set the VizFrame height dynamically based on the actual category count so bars are an appropriate thickness:
```ts
// After data loads, before calling applyOnRender:
const categoryCount = (this._viewModel.getProperty("/genreStock") as unknown[]).length;
(this.byId("chartStockByGenre") as unknown as { setHeight?: (h: string) => void })
  ?.setHeight?.(Math.max(300, categoryCount * 34) + "px");
```

Rule of thumb: **34px per category**, minimum 300px. This produces readable bars with adequate spacing.

**Evidence:** TrialJ Overview - genre chart height was fixed at 360px for 15 categories (24px/bar). sap.viz rendered only 1 bar; all others were in the virtual scroll region below the container. After disabling scrollbar + dynamic height, all 15 bars rendered.

**Gate:**
```
rg 'scrollbar.*enable.*false\|window.*firstDataPoint' app/**/*.ts  -> at least 1 match per bar/column VizFrame
# Runtime gate: take_screenshot() -> count visible bars -> must equal category count in data
```

---

## ER-CHART-6: Use `setVizScales` for integer-only axis on small discrete ranges `[verified-TrialJ-2026-05-26]`

`vizProperties.valueAxis.label.formatString: "0"` formats the display of ticks but does NOT control how many ticks sap.viz generates. For small integer ranges (max ≤ 10), sap.viz auto-generates 6-7 steps (e.g. 0, 0.5, 1, 1.5, 2, 2.5, 3) even with `formatString: "0"` (which then rounds 0.5 to 1, producing duplicate labels: 0 1 1 2 2 3 3).

The fix is `setVizScales` with `unit: 1` which forces one gridline per integer step:

```ts
// Inside attachRenderComplete, alongside setVizProperties:
const maxCount = Math.max(...(authorBooks as {bookCount:number}[]).map(d => d.bookCount));
vizFrame.setVizScales?.([{
  feed: "valueAxis",
  min: 0,
  max: maxCount + 1,
  fixedRange: true,
  unit: 1          // <-- this is the key: one gridline per integer
}]);
vizFrame.setVizProperties?.({
  ...props,
  valueAxis: { visible: true, axisTick: { visible: true }, label: { visible: true, formatString: "0" } }
});
```

Note: `vizScales` must be called BEFORE `setVizProperties` in the `renderComplete` callback.

**Evidence:** TrialJ "Books per Author" chart showed 0 1 1 2 2 3 3 after applying `formatString:"0"` alone. Adding `setVizScales([{ feed:"valueAxis", unit:1, fixedRange:true, max:4 }])` produced clean 0 1 2 3 4.

**Gate:**
```
# Any chart whose measure is a count with expected max <= 10 must use setVizScales
rg 'setVizScales' app/**/*.ts  -> at least 1 match per discrete-count chart (bookCount, incidentCount, etc.)
```

---

## ER-CHART-7: Analytics charts must not mix incomparable units across currencies `[verified-TrialJ-2026-05-26]`

A chart that aggregates or bins a monetary measure (price, cost, revenue) across rows with different currency codes is meaningless. £9.99 and $9.99 and ¥88 are not comparable; a "Price Range: 5-10" bucket that mixes them gives a false picture.

**FORBIDDEN:**
- A price distribution histogram/column chart that bins `price` across all rows regardless of `currency_code`.
- A "Total Revenue by Genre" bar chart that sums `price * quantity` across GBP, USD, EUR rows without currency conversion.

**REQUIRED alternatives:**
1. Use a **currency-agnostic measure** (e.g. `stock` units, `count` of items) for cross-currency comparison.
2. Add a **currency filter** so the chart only operates on one currency at a time.
3. Use a **donut/pie by currency** to show distribution of how many books are in each currency  -  that IS valid (counting items, not summing monetary amounts).

**Evidence:** TrialJ Overview had a "Price Distribution" histogram bucketing `price` across GBP/USD/EUR/JPY books. A JPY book at ¥88 landed in "Under 5" despite being ~$0.59 equivalent. The chart was replaced with "Top 10 Books by Stock" which uses a currency-agnostic measure.

**Gate (review):**
- For any chart whose data contains a monetary measure (`price`, `cost`, `amount`, `revenue`): inspect the OData query  -  if it does NOT include `$filter=currency_code eq 'X'`, the chart mixes currencies and must be redesigned.
- Manual check: `list_network_requests()` -> find chart data URL -> if it contains `price` or `cost` without `currency_code` filter -> flag as ER-CHART-7 violation.

---

## ER-LAYOUT-4: Charts use relative width, not fixed pixels `[verified-TrialJ-2026-05-26]`

Chart containers MUST use percentage or fill-based widths, not fixed pixel widths. A `width="550px"` Panel holding a chart produces poor utilization on wide monitors and causes overflow on narrow ones.

**FORBIDDEN:**
```xml
<Panel width="550px">
  <viz:VizFrame width="100%" height="380px" .../>
</Panel>
```

**ALSO FORBIDDEN - percentage on sap.m.Panel inside FlexBox:**
```xml
<!-- width="49%" on a Panel resolves against the Panel's internal block wrapper (~156px),
     NOT the FlexBox row. Result: all panels collapse to ~76px wide (slivers). -->
<FlexBox wrap="Wrap">
  <Panel width="49%">...</Panel>
  <Panel width="49%">...</Panel>
</FlexBox>
```

**REQUIRED - use FlexItemData with growFactor:**
```xml
<!-- FlexItemData participates in the FlexBox layout directly; growFactor distributes space correctly -->
<FlexBox wrap="Wrap" alignItems="Stretch">
  <Panel width="auto">
    <layoutData><FlexItemData growFactor="1" shrinkFactor="1" minWidth="380px"/></layoutData>
    <viz:VizFrame width="100%" height="380px" .../>
  </Panel>
  <Panel width="auto">
    <layoutData><FlexItemData growFactor="1" shrinkFactor="1" minWidth="380px"/></layoutData>
    <viz:VizFrame width="100%" height="380px" .../>
  </Panel>
</FlexBox>
```

Use `growFactor="2"` on a panel that should be twice as wide as its sibling. Set `minWidth` so panels wrap onto the next row on small viewports rather than compressing below readability.

**Evidence:** TrialJ Overview page had all chart Panels at fixed `width="550px"`, then at `width="49%"`. Both failed. 49% on Panel resolved to 76px because `sap.m.Panel` renders inside a block div that is ~156px wide, not the FlexBox row. Only `FlexItemData.growFactor` correctly distributes space.

**Gate:**
```
rg 'width="[0-9]+px"' app/**/*.xml -> review each match; any Panel/Container holding a VizFrame with a hardcoded pixel width is a defect
rg 'width="[0-9]+%"' app/**/*.xml -> review each match on Panel elements inside FlexBox; these must be converted to FlexItemData
# Runtime check at narrowest print content width (740px covers A4 and Letter with typical margins):
evaluate_script("document.querySelectorAll('[id*=panelStockByGenre],[id*=panelBooksByAuthor]').forEach(p=>console.log(p.id,Math.round(p.getBoundingClientRect().width)))")
# Each panel width must be > 300px (slivers < 200px indicate the % bug)
```

---

## ER-LAYOUT-5: List tables must fill available viewport height `[verified-TrialJ-2026-05-26]`

A data table on a List page MUST expand to fill the available viewport height. A table occupying < 60% of the viewport with empty space below is an artificial height constraint. This is almost always caused by a `VBox` ancestor without `height="100%"` when using `sap.ui.table.Table` with `rowmodes:Auto`.

**FORBIDDEN:**
```xml
<!-- VBox without height="100%" constrains the Auto row mode to ~10 rows -->
<Page>
  <content>
    <VBox class="sapUiSmallMarginBeginEnd">
      <table:Table>
        <table:rowMode><rowmodes:Auto minRowCount="10"/></table:rowMode>
      </table:Table>
    </VBox>
  </content>
</Page>
```

**REQUIRED:**
```xml
<Page enableScrolling="false">
  <content>
    <VBox height="100%" displayInline="true" class="sapUiSmallMarginBeginEnd">
      <filter-bar-etc/>
      <table:Table id="mainTable" class="sapUiSizeCompact" ...>
        <table:rowMode><rowmodes:Auto minRowCount="10"/></table:rowMode>
      </table:Table>
    </VBox>
  </content>
</Page>
```

Note: `enableScrolling="false"` on the Page is required so the Page itself does not create an internal scroll container that competes with the table's auto-height calculation.

**Evidence:** TrialJ Books and Authors tables both rendered at exactly 380px (~51% of 747px viewport) because the VBox wrapping each table had no `height="100%"`. The `rowmodes:Auto` mode defaults to rendering only `minRowCount` visible rows when the ancestor height is unconstrained.

**Gates:**
```
# Every sap.ui.table.Table with rowmodes:Auto must have an ancestor VBox with height="100%"
rg -A5 '<rowmodes:Auto' app/**/*.xml  # for each match, verify ancestor VBox has height="100%"
# Runtime gate:
evaluate_script("const t=document.querySelector('[id*=\"mainTable\"],[id*=\"booksTable\"],[id*=\"authorsTable\"]'); const r=t?.getBoundingClientRect(); return r ? Math.round(r.height/window.innerHeight*100) : 0")
# Returns >= 60 = PASS
```

**Add to "When generating any page or route" checklist:**
- [ ] Every `sap.ui.table.Table` with `rowmodes:Auto` has `enableScrolling="false"` on the parent `<Page>` and `height="100%"` on the wrapping `<VBox>` (ER-LAYOUT-5)

---

## ER-LAYOUT-6: Input field width sized to expected content `[verified-TrialJ-2026-05-26]`

Text `<Input>` fields in Create/Edit forms MUST be wide enough to display their expected maximum content without requiring horizontal scroll within the field. The maximum value length can be inferred from the CDS type (e.g. `String(100)`) or from the sample data.

**FORBIDDEN:**
```xml
<!-- Default ColumnLayout width for a title field that may hold 60+ characters -->
<Input id="inTitle" value="{bookDetail>/title}" required="true"/>
```

**REQUIRED:**
```xml
<!-- Title fields: minimum 30rem to accommodate ~60 chars -->
<Input id="inTitle" value="{bookDetail>/title}" required="true" width="100%"/>
<!-- For React: className="w-full" or style={{ width: '100%' }} -->
```

For `sap.ui.layout.form.Form` with `ColumnLayout`, set `width="100%"` on every Input to let the form column determine the width responsively rather than truncating to a minimum default.

**CRITICAL  -  `width="100%"` is necessary but NOT sufficient. The ColumnLayout column count controls the actual resolved width.**

`width="100%"` resolves to 100% of the FormElement's content cell. With `columnsL="3"` or `columnsL="4"`, each form column is ~390px or ~290px wide, and after the label occupies its share, the content cell may be only ~185px  -  giving the input just 22 visible characters even with `width="100%"` set.

**FORBIDDEN (silently too narrow):**
```xml
<!-- columnsL=3 at 1184px viewport -> each column ~395px -> content cell ~185px -> 22 chars visible -->
<form:ColumnLayout columnsM="2" columnsL="3" columnsXL="4"/>
```

**REQUIRED for forms with long text fields (title, description, address, name):**
```xml
<!-- columnsL=2 at 1184px viewport -> each column ~590px -> content cell ~276px -> 39+ chars visible -->
<form:ColumnLayout columnsM="1" columnsL="2" columnsXL="2"/>
```

Rule: for any form where the primary text fields (title, name, description) can hold more than 30 characters, use `columnsL="2" columnsXL="2"` as the maximum column count. Only use `columnsL="3"` or higher for forms with exclusively short fields (codes, numbers, dates, selects).

After generating any edit form, verify the actual pixel width of the title/name input:
```js
evaluate_script("const i=document.querySelector('[id*=inTitle]'); return i ? Math.round(i.getBoundingClientRect().width) : null")
// Must be >= 250px. If < 200px, reduce columnsL.
```

**Evidence:** TrialJ Book Detail form  -  `width="100%"` was set on Title and Author inputs and confirmed in DOM inspection, yet user could only enter ~22 characters. Root cause: `columnsL="3"` left only 185px for the content cell. Reducing to `columnsL="2"` increased the rendered width from 177px to 276px (56% wider), fitting all 105 sample book titles including the longest (36 chars: "Do Androids Dream of Electric Sheep?"). Average book title in sample data is 17 chars; 21% exceed 22 chars.

**Gate:**
```
rg '<form:ColumnLayout.*columnsL="[34]"' app/**/*.xml
# For each match: check if the form contains any Input bound to a title, name, description, or address field.
# If yes, columnsL must be <= 2.
# Runtime gate: after loading edit form on a record with a long title:
evaluate_script("const i=document.querySelector('[id*=inTitle]');return i?{w:Math.round(i.getBoundingClientRect().width),ok:i.getBoundingClientRect().width>=250}:null")
# ok: true = PASS
```

**Add to "When generating a form input" checklist:**
- [ ] `width="100%"` set on every text `<Input>` in a Create/Edit form (ER-LAYOUT-6)
- [ ] `ColumnLayout columnsL` is `<= 2` for any form with text fields longer than 30 chars expected; verify rendered input width >= 250px (ER-LAYOUT-6)
- [ ] For each field: is the CDS type `String(N)` with N >= 60, or does the field name match `/title|description|notes|remark|subject|message|address|comment|summary/i`? If yes, treat as WIDE and apply ER-LAYOUT-7 full-width placement. (ER-LAYOUT-7)

---

## ER-LAYOUT-7: Long-text fields must be placed in a full-width form context `[verified-TrialK-2026-05-29]`

Any String field whose CDS type is `String(N)` with N >= 60, or an unbounded `String` used for titles, descriptions, or notes, MUST be rendered in a form context that allocates it the full available width of its section.

**Detection - at scaffold time, before writing any annotation or JSX:**
1. Read each entity field's CDS type.
2. Mark as WIDE if: `String(N)` with N >= 60, OR field name matches `/title|description|descr|notes?|remark|subject|message|address|comment|summary|body/i`.
3. Cross-check with sample data: `GET <entitySet>?$top=20&$select=<field>` - compute p90 character length. If p90 >= 40 chars: also mark as WIDE.

**Required treatment per technology:**

| Technology | Required treatment |
|---|---|
| SAPUI5 XML | Use `columnsM="1" columnsL="2" columnsXL="2"` on the `ColumnLayout` wrapping a WIDE field. Do NOT share the section with short fields if doing so forces `columnsL >= 3`. See ER-LAYOUT-6. |
| FE (OData V4) | Place WIDE fields in their own top-level `ReferenceFacet` (NOT inside a `CollectionFacet` beside short-field groups). Override the ColumnLayout CSS in `app.css`: `[id*="<FacetID>"] .sapUiFormCLContainerCont { column-count: 1 !important; }`. See fiori-elements.md for ColumnLayout override patterns. |
| WC4R | Add `colspan="2"` (or `"3"` for XL) on the `<ui5-form-item>` wrapping the WIDE field. |
| FX / Tailwind | Add `col-span-full` to the wrapper div of the WIDE field so it escapes the grid column. |

**FORBIDDEN (silently too narrow):**
- Placing `String(1000)` description in the same FieldGroup column slot as a `String(10)` code field.
- Using `sap.m.Input` for a multi-sentence description (use `sap.m.TextArea` with `@UI.MultiLineText`).
- Declaring PASS on `width="100%"` without verifying the resolved pixel width is >= 250px.

**Evidence:** TrialK Incidents FE (2026-05-29). `description : String(1000)` placed inside a `CollectionFacet` FieldGroup. The ColumnLayout chose `column-count: 3` on its inner `<dl>`, giving each field only 249px - indistinguishable in width from a `String(10)` code field. Fix required extracting `title` + `description` into a standalone `ReferenceFacet` and adding a scoped `column-count: 1` CSS rule.

**Gate:**
```js
// Chrome DevTools MCP evaluate_script - run during Facet 1 review on every edit form page
() => {
  const candidates = [...document.querySelectorAll('textarea, input')]
    .filter(el => el.offsetParent && /title|descr|note|remark|subject|message|address|comment/i.test(el.id + ' ' + (el.placeholder || '') + ' ' + (el.getAttribute('aria-label') || '')));
  return candidates.map(el => ({
    id: el.id.substring(0, 50),
    w: Math.round(el.getBoundingClientRect().width),
    ok: el.getBoundingClientRect().width >= 250
  }));
}
// All ok: true required. Any ok: false = defect, raise immediately.
```

---

## ER-FORM-1: FK suggestion input must set the FK ID, and manual text without selection must be blocked or re-validated `[verified-TrialJ-2026-05-26]`

Any input field bound to a foreign-key association (author, agency, customer, genre) has two failure modes that MUST both be prevented:

**Failure A - Silent old-value save:** User types new text in the author field, suggestion popup appears but user presses Tab instead of clicking a suggestion. The display text updates but the underlying `authorId` remains the old value. Save silently writes the old author. **This is invisible data loss.**

**Failure B - Null save blocked by wrong message:** On a New record, `authorId` is null. User types "Agatha Christie" but no suggestion appears (timing issue, network latency, or popup closes before click). Save blocks with "Author is a required field" even though text is visually present. User cannot proceed.

**REQUIRED pattern for both failures:**

```ts
// In onSave(), BEFORE calling fetch/POST, re-validate the FK field:
const authorName = this._viewModel.getProperty("/authorName") as string;
const authorId = this._viewModel.getProperty("/authorId") as number | null;
const storedAuthorName = this._bookModel.getProperty("/author") as string;

// Failure A: text changed but ID didn't update -> re-lookup
if (authorName !== storedAuthorName && authorId === /* old id */) {
  // Force re-lookup from the text the user typed
  const r = await fetch(`/admin/Authors?$filter=name eq '${authorName.replace(/'/g,"''")}'&$select=ID&$top=1`);
  if (r.ok) {
    const d = await r.json();
    if (d.value?.[0]?.ID) {
      this._viewModel.setProperty("/authorId", d.value[0].ID);
    } else {
      // Author not found by exact name - show field error
      this._viewModel.setProperty("/authorState", "Error");
      (this.byId("inAuthor") as Input)?.focus();
      return; // block save
    }
  }
}

// Failure B: new record, authorId still null, but text entered -> try exact lookup
if (!authorId && authorName?.trim()) {
  const r = await fetch(`/admin/Authors?$filter=name eq '${authorName.trim().replace(/'/g,"''")}'&$select=ID&$top=1`);
  if (r.ok) {
    const d = await r.json();
    if (d.value?.[0]?.ID) {
      this._viewModel.setProperty("/authorId", d.value[0].ID);
    } else {
      // Show specific error: author text doesn't match any known author
      this._viewModel.setProperty("/authorState", "Error");
      (this.byId("inAuthor") as Input)?.setValueStateText("No matching author found. Select from suggestions or create a new author first.");
      (this.byId("inAuthor") as Input)?.focus();
      return;
    }
  }
}
```

**Evidence:** TrialJ - (A) typing in author field during edit kept old authorId; (B) new book form blocked with "Author is a required field" even with text present.

**Gate:**
```
# Every onSave() that writes a FK field must have a re-lookup or re-validation guard
rg 'onSave.*async|async.*onSave' app/**/*.ts  -> for each match, inspect the method body for a re-lookup of FK fields before fetch/POST
```

**Add to "When generating a form input" checklist:**
- [ ] For every FK suggestion input: `onSave()` re-validates that the FK ID matches the currently displayed text BEFORE sending the POST/PATCH (ER-FORM-1, Failure A)
- [ ] For every FK suggestion input on a Create form: `onSave()` attempts an exact-match lookup if `authorId` is null but text is non-empty, with a specific error message if no match found (ER-FORM-1, Failure B)

---

## ER-FORM-2: FK Create/Edit forms must provide a path to create a new referenced entity `[verified-TrialJ-2026-05-26]`

When a Create or Edit form contains an FK suggestion field (e.g. Author on Book, Agency on Travel, Category on Incident), the user MUST have a way to add a new referenced entity **without closing the current form**. If they cannot, they are blocked: they cannot save the new record because the author doesn't exist, but they cannot create the author without abandoning their partially-filled form.

**FORBIDDEN:** Author suggestion input with no adjacent "New Author" button or inline creation path.

**REQUIRED (minimum acceptable):**
```xml
<!-- Adjacent "New Author" button that opens a dialog -->
<HBox alignItems="Center">
  <Input id="inAuthor" showSuggestions="true" suggest=".onAuthorSuggest"
         suggestionItemSelected=".onAuthorSuggestionSelect"
         value="{viewModel>/authorName}" required="true"
         aria-required="true" valueState="{viewModel>/authorState}"
         class="sapUiSmallMarginEnd" width="20rem"/>
  <Button icon="sap-icon://add-contact"
          tooltip="{i18n>btnNewAuthor}"
          press=".onNewAuthorFromBook"/>
</HBox>
```

The "New Author" button opens the same New Author dialog used on the Authors page, and on successful save calls `onAuthorSuggestionSelect` programmatically with the new author's ID.

**Evidence:** TrialJ New Book form had no "New Author" inline path. User had to navigate to the Authors page, create the author, then return to the Books page to create the book.

**Gate:**
```
# Every FK suggestion input in a Create/Edit form must have a co-located creation affordance
# Check in view XML: every <Input id="in[FkField]"> must be within 20 lines of a Button with icon="add" or "add-contact" or text containing "New"
rg -A20 'showSuggestions="true"' app/**/*.xml | rg 'add|New|create' --count  -> >= 1 match per suggestion input
```

**Add to "When generating a form input" checklist:**
- [ ] Every FK suggestion input in a Create/Edit form has an adjacent "New [Entity]" button or inline creation dialog (ER-FORM-2)

---

## ER-FORM-3: `sap.m.Input` suggestion attribute is `showSuggestion` not `showSuggestions` `[verified-TrialJ-2026-05-26]`

The SAPUI5 `sap.m.Input` property for enabling the suggestion popup is `showSuggestion` (no trailing 's'). Using `showSuggestions="true"` silently fails  -  no error is logged, the attribute is accepted by the XML parser but is not mapped to any Input property, and the suggestion popup never fires.

**FORBIDDEN:**
```xml
<Input id="inAuthor"
    showSuggestions="true"       <!-- WRONG: silent no-op -->
    suggest=".onAuthorSuggest"
    suggestionItemSelected=".onAuthorSuggestionSelect"/>
```

**REQUIRED:**
```xml
<Input id="inAuthor"
    showSuggestion="true"        <!-- CORRECT: singular, no trailing s -->
    suggest=".onAuthorSuggest"
    suggestionItemSelected=".onAuthorSuggestionSelect"/>
```

This applies everywhere: Books list filter bar, author/customer/agency suggestion inputs, any field using the `suggest` event.

**Evidence:** TrialJ  -  `showSuggestions="true"` was set in both `BookDetail.view.xml` and `Books.view.xml`. No error appeared in the console. Typing in the Author field produced no suggestion dropdown despite the `suggest` handler being correctly wired. The fix was a one-character deletion (`showSuggestions` → `showSuggestion`).

**Gate:**
```
rg 'showSuggestions=' app/**/*.xml  -> zero matches (the correct attribute is showSuggestion without trailing s)
```

**Add to "When generating a form input" checklist:**
- [ ] FK suggestion inputs use `showSuggestion="true"` (not `showSuggestions`) on `sap.m.Input` (ER-FORM-3)

---

## ER-SEARCH-1: Search inputs must search all visible string columns, or declare their scope explicitly `[verified-TrialJ-2026-05-26]`

A search input labeled "Search Authors" (or "Search [Entities]") with no scope qualifier MUST search **all visible text columns** in the table it controls. If the search only covers a subset of columns (e.g. only `name`, not `placeOfBirth`), the placeholder MUST name the searchable field: "Search by name".

**FORBIDDEN:**
```xml
<!-- Placeholder says "Search Authors" but $filter only covers name -->
<Input placeholder="{i18n>searchAuthors}" liveChange=".onAuthorSearch"/>
```
```ts
// Filter only on name - user searching "Devon" or "Boston" gets no results
params.$filter = `contains(tolower(name),tolower('${val}'))`;
```

**REQUIRED (comprehensive search):**
```ts
// Search all visible string columns
const escapedVal = val.replace(/'/g, "''");
params.$filter = `contains(tolower(name),tolower('${escapedVal}')) or contains(tolower(placeOfBirth),tolower('${escapedVal}')) or contains(tolower(placeOfDeath),tolower('${escapedVal}'))`;
```

OR if comprehensive search is not desired:
```xml
<!-- Declare scope explicitly in placeholder -->
<Input placeholder="{i18n>searchByName}" liveChange=".onAuthorSearch"/>
<!-- i18n: searchByName=Search by name -->
```

**Evidence:** TrialJ Authors page - search "Devon" (Agatha Christie's place of birth) returns "No data". The search only filters `contains(tolower(name),...)`. Users examining the table with visible Place of Birth column reasonably expect that column to be searchable.

**Gate:**
```
# Every search Input placeholder must either (a) name the field it searches, or (b) the handler must cover all visible string columns
rg 'liveChange=".on.*Search"' app/**/*.xml -> for each match, read the associated controller handler -> check $filter covers all string columns shown in the table
# Static proxy: if placeholder contains generic text ("Search Authors", "Search Records") AND the handler $filter covers only one field -> WARN
```

**Add to "When generating a filter input" checklist:**
- [ ] If the search placeholder is generic ("Search [Entities]"), the OData `$filter` must include `OR` conditions for all visible string columns, OR the placeholder must be scoped ("Search by name") (ER-SEARCH-1)

---

## ER-REPORT-1: Report/print tables must use small font and fixed column layout `[verified-TrialJ-2026-05-26]`

A print-oriented report table with more than 4 columns MUST override the default font size to fit content without truncation on A4 or US Letter paper. The default SAP Horizon font (14px) on a 7-column portrait report allows only ~22-24mm per column  -  insufficient for content like book titles or full author names.

**REQUIRED - use the full block from `print.md` §5 which now includes:**

1. `display: table !important` on `.sapMListTbl` and `display: table-cell !important` on all `th`/`td`  -  prevents sap.m.Table's responsive pop-in from collapsing columns at narrow print widths (~740-794px on A4/Letter portrait with typical margins).
2. `box-sizing: border-box !important; padding: 2px 4px !important` on `th` AND `td`  -  equalises the different default paddings (SAPUI5 uses 8px on `th` and 16px on `td`) so both columns are the same declared %.
3. Font targeting `th, th *` and `td, td *`  -  SAPUI5 wraps header text in `div.sapMColumnHeader > span > bdi`; setting font-size only on `th` does NOT cascade into those nested elements.
4. Font size calibration: **8px for 7 columns**, 9px for 5-6 columns.
5. nth-child column selectors offset by 1 (SAPUI5's invisible first column is nth-child(1); data starts at nth-child(2)).

```css
@media print {
  /* Prevent pop-in at narrow print widths (A4/Letter portrait with margins) */
  .sapMListTbl { table-layout: fixed !important; width: 100% !important; display: table !important; border-collapse: collapse !important; }
  .sapMListTbl thead { display: table-header-group !important; }
  .sapMListTbl tbody { display: table-row-group !important; }
  .sapMListTbl tr   { display: table-row !important; }
  .sapMListTbl th, .sapMListTbl td { display: table-cell !important; }
  .sapMListTblSubRow, .sapMListTblSubRowCell { display: none !important; }

  /* Equalise padding */
  .sapMListTbl th, .sapMListTbl td {
    box-sizing: border-box !important; padding: 2px 4px !important;
    overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important;
  }

  /* Column widths (offset by 1 for SAPUI5 sentinel column): */
  .sapMListTbl th:nth-child(1), .sapMListTbl td:nth-child(1) { width: 0 !important; padding: 0 !important; }
  .sapMListTbl th:nth-child(2), .sapMListTbl td:nth-child(2) { width: 28% !important; }  /* Title */
  .sapMListTbl th:nth-child(3), .sapMListTbl td:nth-child(3) { width: 20% !important; }  /* Author */
  /* ... etc summing to 100% */

  /* Font: target th/td AND all descendants (inner spans/bdi in SAPUI5 column headers) */
  .sapMListTbl td, .sapMListTbl td * { font-size: 8px !important; line-height: 1.3 !important; }
  .sapMListTblHeader th, .sapMListTblHeader th * { font-size: 8px !important; font-weight: bold !important; }
}
```

**Evidence:** TrialJ Report page  -  even after adding `table-layout:fixed` and nth-child selectors, headers misaligned at print preview because sap.m.Table activated pop-in at narrow print widths (~794px A4 / ~740px with wider margins), changing `th`/`td` display from `table-cell` to flex. Currency and Status header labels were truncated because the font-size rule targeted only `th` and not `th *` (the nested bdi/span).

**Gate:**
```
rg 'display.*table-cell.*important' app/**/*.css  -> must exist in @media print block  (pop-in prevention)
rg 'th \*.*font-size\|th,.*th \*' app/**/*.css    -> must exist  (cascade into header inner elements)
rg 'table-layout.*fixed' app/**/*.css             -> at least 1 match on report/print pages
rg 'font-size.*[7-9]px' app/**/*.css              -> at least 1 match on report/print pages
# Runtime verification at narrowest print width (740px = conservative lower bound for A4/Letter portrait with margins):
# Force print CSS, then:
evaluate_script("const ths=[...document.querySelectorAll('.sapMListTblHeader th')]; return ths.map((th,i)=>({n:i+1,text:th.textContent?.trim().slice(0,12),w:Math.round(th.getBoundingClientRect().width)}))")
# th and td at the same nth-child position must have matching widths
```

**Add to "When generating a Report or print page" checklist:**
- [ ] `@media print` block includes pop-in prevention: `display:table-cell !important` on `th` and `td` (ER-REPORT-1)
- [ ] `@media print` block includes `box-sizing:border-box; padding:2px 4px` on BOTH `th` AND `td` to equalise default SAPUI5 padding differences (ER-REPORT-1)
- [ ] Font-size targets `th, th *` and `td, td *` (not just `th` and `td`) to reach nested SAPUI5 inner spans (ER-REPORT-1)
- [ ] Font-size: 8px for 7 columns; 9px for 5-6 columns (ER-REPORT-1)
- [ ] nth-child column selectors start at nth-child(2) because SAPUI5 inserts an invisible sentinel at nth-child(1) (ER-REPORT-1)
- [ ] Column widths sum to 100% and are sized proportionally to expected content length, NOT equal-width (ER-REPORT-1)

---

## ER-LOCALE-1: Numeric inputs must be locale-safe for decimal entry `[verified-TrialJ-2026-05-26]`

In browsers with a non-English locale (German, French, etc.), `sap.m.StepInput` renders the value `9.99` as `9,99` using the comma as decimal separator. When the user sees `9,99` and edits to `10,99`, `parseFloat("10,99")` returns `10` (stops at comma), silently corrupting the price.

**FORBIDDEN:**
```xml
<!-- sap.m.StepInput with a Decimal field - displays locale-formatted value -->
<StepInput id="inPrice" value="{bookDetail>/price}" required="true" .../>
```

**REQUIRED:**
```xml
<!-- Use sap.m.Input with type="Number" for direct decimal entry -->
<Input id="inPrice"
       value="{
           path: 'bookDetail>/price',
           type: 'sap.ui.model.odata.type.Decimal',
           formatOptions: { groupingEnabled: false, maxFractionDigits: 2, minFractionDigits: 2 },
           constraints: { minimum: '1', maximum: '111' }
       }"
       type="Number"
       required="true"
       placeholder="e.g. 9.99"
       aria-required="true"
       valueState="{viewModel>/priceState}"
       valueStateText="{i18n>msgPriceInvalid}"/>
```

By using `sap.ui.model.odata.type.Decimal` with `groupingEnabled: false`, SAPUI5 serialises using period as decimal separator regardless of browser locale, and the OData V4 model sends the correct numeric value in the PATCH/POST body.

**Evidence:** TrialJ Book Detail edit form showed `9,99` for price 9.99 on a German-locale browser.

**Gate:**
```
# StepInput on a Decimal/price field -> warn; should be Input with odata type
rg '<StepInput[^>]*value=.*price\|cost\|amount\|budget' app/**/*.xml -> warn each match (prefer Input + Decimal type)
# Verify payload in runtime:
list_network_requests() -> find PATCH/POST -> inspect body -> price value must be "9.99" not "9" or "9,99"
```

**Add to "When generating a form input" checklist:**
- [ ] Price/amount `Decimal` fields use `sap.m.Input` with `type: 'sap.ui.model.odata.type.Decimal'` binding (not `sap.m.StepInput`) to be locale-safe (ER-LOCALE-1)
- [ ] `formatOptions: { groupingEnabled: false }` prevents thousand separators from appearing in numeric inputs (ER-LOCALE-1)

---

## Cross-reference

- `print.md` - the canonical print CSS template (referenced by ER-LAYOUT-3)
- `ux-standards.md` - text quality rules referenced by ER-TEXT-2
- `validation.md` - SV-N static gates and DV-N dynamic gates that implement the gates listed above
- `faceted-review.md` - the review-time companion to this proactive document
- `testing-protocol.md` - iteration loop and anti-substitution rules for tests
- `evolution/proposals-2026-05-22.md` - the trial that produced this document (S-PROP-14..38)

**Browser tool note for gate scripts that require a live browser:**
All gate examples in this file that reference browser tools use generic verbs ("list network requests", "inspect body"). When executing these gates:
- Use **Playwright MCP** by default: `browser_network_requests`, `browser_network_request`, `browser_evaluate`, `browser_snapshot`
- Use **Chrome DevTools MCP** only when Playwright is unavailable or for sap.viz VizFrame chart interaction tests
See `validation.md §DV browser tool selection` for the full rule.

---

## Authority calibration - DONE 2026-05-26

Each rule has been cross-referenced against the SAP Hyperspace product-standards catalogue (`sap.tools.hyperspace.portal.s4c.mcp/mcp`). Authority tags above have been updated to cite the relevant Hyperspace requirement IDs (e.g. `[Hyperspace ACC-261, ACC-271; verified-this-trial]`).

The cross-reference itself, the alignment matrix, and the new ER-N rules added below (S-PROP-39 to S-PROP-50) are documented in `../../ReportAddendum3.md` (project root).

Limitations of the calibration:
- For PERF-* and several GLOB-* requirements, the MCP returned only wiki-link summaries; mappings to those are by title and SAP product-standard category, not full text.
- ER-DATA-4's "> 25 distinct values" threshold is NOT in the catalogue; it remains agent default and is tagged `[Fiori guideline; my-judgment-needs-review]`.
- Security (SEC-*) requirements were inventoried but not yet cross-referenced in detail; recommended for a follow-up session.
