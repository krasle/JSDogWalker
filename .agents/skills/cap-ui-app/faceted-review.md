# Faceted Review Protocol

**Purpose:** A systematic, non-task-based quality review that examines an app from eight orthogonal directions. Run after the Clicky task suite (the app is assumed functional) and before final sign-off.

**Relationship to existing reviews:**
- **SV-0 grep gate**  -  catches source-level code patterns before runtime
- **DV-7b all-pages sweep**  -  catches runtime errors and blank pages
- **Clicky suite**  -  verifies named user tasks pass or fail
- **Faceted review (this document)**  -  verifies correctness of every individual element, data rendering, multi-element mechanism, accessibility, navigation, texts, and control logic regardless of whether any Clicky task exercises it

**Operational requirement:** Every check must specify a concrete tool call AND a specific pass/fail criterion. Checks that say "verify", "review", or "check" without a tool call and an asserted value are not operational and must not be recorded as PASS without execution. The persistent defect pattern in this project was not missing rules  -  it was skipping executable checks because they were phrased as suggestions rather than assertions.

**How to run:** Work through each facet in order. For each item record PASS / FAIL / N-A. Evidence is required for PASS: screenshot, snapshot text, network request URL, or evaluate_script return value. A FAIL generates a defect entry.

---

## Facet 4: Control-Based Review

### 1.1 Purpose

Examines every UI control in every view and verifies that each property relevant to correctness and usability has been explicitly set to an appropriate non-default value.

### 1.2 Enumeration step

For each page/view in the app:
1. Open the view file (XML, JSX, or TSX).
2. List every control instance by type and ID.
3. Apply the checklist for that control type from §1.4 below.

For React apps without view files, enumerate controls from the JSX render output.

### 1.3 Evidence requirement

Each PASS requires one of:
- `take_snapshot()` output showing the correct rendered text or state
- `evaluate_script(...)` return value confirming a computed property
- `list_network_requests()` showing the correct OData URL
- Source code inspection confirming the property is explicitly set

### 1.4 Per-control checklist

#### Charts (VizFrame / Recharts / Victory / Chart.js)

| Property | Operational check | Pass criterion |
|---|---|---|
| Chart title | `take_snapshot()`  ->  search for chart heading text | Heading text is not "Title of Chart", "", or the raw field name |
| Axis labels | `take_snapshot()`  ->  find axis label text nodes | No axis label equals a raw OData property name (e.g. "status_code", "count") |
| Empty state / no data | Remove all filters  ->  if table shows 0 rows: `take_snapshot()` | `noDataText` visible and is not the literal string "No data" |
| Click handler | `click(uid=<first-bar-or-slice>)`  ->  `take_snapshot()` | URL changed OR list page filtered  -  confirm via snapshot or `evaluate_script("window.location.href")` |
| Legend absent on single-series bar/column | `take_snapshot()` on each bar/column chart | No legend node visible; space used by bars not by a color key (ER-CHART-3) |
| Legend present on multi-series chart | `take_snapshot()` on multi-series charts | Legend node count >= number of series |
| Color distinctness | `evaluate_script("[...document.querySelectorAll('[fill]')].map(e=>e.getAttribute('fill'))")` | All non-background fill values are distinct strings |
| Chart height (sap.viz) | `evaluate_script("[...document.querySelectorAll('[id*=chartStockByGenre],.v-m-root')].map(e=>Math.round(e.getBoundingClientRect().height))")` | Result >= (N_categories * 34) where N = actual data count (ER-CHART-5) |
| All bars visible (no virtual scroll) | `take_screenshot()` | Bar count in screenshot equals category count from OData response; no partial-bar scroll indicator visible (ER-CHART-5) |
| No color feed on single-series chart | Grep: `rg 'FeedItem.*uid="color"' app/**/*.xml` | Zero matches on charts with a single dimension + single measure (ER-CHART-3) |
| setVizProperties inside renderComplete | Grep: `rg 'attachRenderComplete' app/**/*.ts` | At least 1 match per Overview/analytics controller (ER-CHART-4) |
| Integer axis for discrete counts | `take_snapshot()` -> scan for axis tick text | No tick values with `.5` suffix (0.5, 1.5, 2.5 ...) on any count-based chart axis (ER-CHART-2, ER-CHART-6) |
| Null groupby keys | `GET <service>/<Entity>?$apply=groupby((<field>),aggregate(...))`  ->  parse JSON | Zero rows where the grouping `<field>` value is `""` or `null`; if any exist, source must filter them with `.filter(row => row.<field>)` |
| Data completeness (no $top cap on analytics) | `list_network_requests()`  ->  find the analytics fetch URL | URL does NOT contain `$top=` with a value less than the total record count |
| Server-side aggregation | `list_network_requests()`  ->  find chart data fetch URL | URL contains `$apply=`  -  no client-side aggregation on `$top`-limited data |
| No mixed-currency monetary charts | `list_network_requests()` -> find chart data URL for any price/cost/revenue chart | URL contains `$filter=currency_code eq '...'` OR the chart uses a currency-agnostic measure (ER-CHART-7) |
| Count labels not clipped (custom FX bar chart) | `take_screenshot()` on each Analytics/Overview page containing a column chart | Every count label above the tallest bar is fully visible; no label is cut off at the container top edge. If clipped: add `paddingTop: 28` to the chart container (see fx.md §11.1) |
| Custom chart container height >= 200 | `evaluate_script("() => { const c = document.querySelector('[role=img],[aria-label*=Volume],[aria-label*=chart]'); return c ? Math.round(c.getBoundingClientRect().height) : null }")` | Returns >= 200 for any vertical bar chart container; < 200 risks label clipping |
| Date-dimension chart click uses date filter | `click(uid=<monthly-bar>)` on a date-grouped bar -> `evaluate_script("window.location.href")` | URL contains `?month=YYYY-MM` or `$filter=createdAt%20ge` NOT `?q=` with a month display name (see react-cap-shared.md §11) |

#### KPI Tiles

| Property | Operational check | Pass criterion |
|---|---|---|
| Click handler | `click(uid=<tile>)`  ->  `evaluate_script("window.location.href")` | URL contains a filter parameter (e.g. `?status=N`) or route changed |
| Semantic colour | `evaluate_script("getComputedStyle(document.querySelector('[class*=GenericTile]')).getPropertyValue('--sapCriticalColor')")` or `take_screenshot()` | Colour visually matches status severity  -  orange/red for critical/negative, green for positive |
| Header label | `take_snapshot()`  ->  read tile header text | Not the raw entity name; includes meaningful qualifier ("New Incidents" not "Incidents") |
| Count source | `list_network_requests()` after page load  ->  find count request | Request URL contains `$count=true&$top=0`  -  not `$top=200` used as a count proxy |

#### Tables

| Property | Operational check | Pass criterion |
|---|---|---|
| Column widths | Grep: `rg "width=" app/**/*.xml app/**/*.tsx` on column definitions | Every column definition has an explicit `width` attribute |
| No virtual scroll on report | Grep: `rg "growing=.true\|TableGrowing\|rowmodes:Auto" app/**/*Report*` | Zero matches on report/print pages |
| No sticky on report | Grep: `rg 'sticky=.ColumnHeaders' app/**/*Report*` | Zero matches on report/print pages |
| Row click navigates | `click(uid=<first-data-row>)`  ->  `take_snapshot()` | Detail page title/header changed; different view is visible |
| Count matches server | `list_network_requests()`  ->  read `@odata.count` from entity list request  ->  `take_snapshot()`  ->  read count text | Count text in header/title matches `@odata.count` value |
| No "undefined"/"null"/"\[object Object\]" | `take_snapshot()`  ->  search snapshot text | Zero occurrences of literal strings `undefined`, `null`, `[object Object]` |
| Column sort present (ER-UX-3) | Grep: `rg 'handleSort\|setSortDir\|onSort' app/**/*.tsx` then `click(uid=<first-column-header>)`  ->  `evaluate_script("window.location.href")` | Grep returns >= 1 match; after click, URL or most-recent OData request contains `$orderby=<col>%20(asc\|desc)` |
| Sort is server-side (ER-UX-3) | `list_network_requests()` after clicking a column header | OData request URL contains `$orderby=` - no `Array.sort` or `.sort(` calls on the data array in list-page source |
| Active sort column visually indicated (ER-UX-3) | `take_screenshot()` after clicking a column header | Sorted column header is visually distinct from unsorted columns (different colour, sort icon, or bold text) |
| Long-text preview accessible (ER-UX-4) | Grep: `rg '\.description\b' app/**/*.tsx` on list-page source  ->  check surrounding context | Every display site for a long-text field in a list cell has an adjacent InformationIcon/popover button (not plain `<span>` alone) |
| Long-text popover opens (ER-UX-4) | `click(uid=<info-button-first-row>)`  ->  `take_snapshot()` | Popover visible containing description text; row navigation did NOT fire |

#### Forms / Input controls

| Property | Operational check | Pass criterion |
|---|---|---|
| Label present | `evaluate_script` with: `[...document.querySelectorAll('ui5-input,input')].filter(i => !i.closest('[aria-label]') && !document.querySelector('label[for="' + i.id + '"]')).length` | Returns 0 |
| Required validation fires | Clear a required field  ->  `click(uid=<save-button>)`  ->  `take_snapshot()` | Error state visible on the field (`valueState=Error` or red border)  -  toast alone is not sufficient |
| FK suggestion active | Type 3 characters in an Agency/Customer/Author/Genre field  ->  `take_snapshot()` | Suggestion dropdown visible with >= 1 item matching the typed text |
| Suggestion sets ID not display name | Select a suggestion  ->  `evaluate_script("document.querySelector('#agencyField').value")` | Value equals the raw ID (e.g. `"070001"`), not the display name |
| Admin service field types | `GET /admin/<EntitySet>?$top=1`  ->  inspect field names | Create-form payload field names match (e.g. `author_ID` not `author`; `genre_ID` not `genre`) |
| Price decimal input locale-safe | Enter `9,99` in price field  ->  click Save  ->  `list_network_requests()`  ->  inspect POST body | `price` value in payload equals `9.99`, not `9` or `NaN` |
| maxLength set | Grep: `rg "maxLength\|maxlength" app/**/*.xml app/**/*.tsx` on text input fields bound to backend string fields | Every field with a backend `@assert.range` or fixed-length CDS type has a `maxLength` attribute |
| Long-text fields are wide enough (ER-LAYOUT-7) | Enter edit mode -> `evaluate_script("() => { const w=[...document.querySelectorAll('textarea,input')].filter(el=>el.offsetParent&&/title|descr|note|remark/i.test(el.id+' '+(el.placeholder\|\|'')+(el.getAttribute('aria-label')\|\|''))); return w.map(el=>({id:el.id.substring(0,50),w:Math.round(el.getBoundingClientRect().width),ok:el.getBoundingClientRect().width>=250})); }")` | All `ok: true`. Any `ok: false` for a field whose CDS type is `String(N>=60)` or name matches `/title\|description\|notes\|remark/i` = defect. See ER-LAYOUT-7 for fix. |

#### Navigation / Buttons

| Property | Operational check | Pass criterion |
|---|---|---|
| Back button present | `take_snapshot()` on Detail page | Snapshot contains a control with text "Back" or icon "nav-back" |
| Back button returns to list | `click(uid=<back-button>)`  ->  `take_snapshot()` | List page is visible (heading or row count visible) |
| Back from direct URL | `navigate_page(url=<detail-URL>)`  ->  `click(uid=<back-button>)`  ->  `take_snapshot()` | List page is visible (not a blank page  -  tests `onNavBack` History fallback) |
| Exactly one Emphasized | `evaluate_script("[...document.querySelectorAll('[design=Emphasized],[type=Emphasized]')].length")` on each page | Returns 1 (exactly one primary action per page) |
| Tooltip on icon-only buttons | `evaluate_script("[...document.querySelectorAll('ui5-button[icon]')].filter(b=>!b.tooltip && !b.title && !b.getAttribute('aria-label')).length")` | Returns 0 |
| Destructive action confirms | `click(uid=<delete-or-reject-button>)`  ->  `take_snapshot()` | A confirmation dialog is visible before any data changes |
| Disabled buttons contextually correct | `take_snapshot()` on a page where actions are not available (e.g. rejected travel) | Accept/Approve button has `disabled` attribute or is absent |

#### Page / Shell

| Property | Operational check | Pass criterion |
|---|---|---|
| Page title | `take_snapshot()`  ->  read page/view heading | Not the component namespace string; not empty |
| Browser `<title>` | `evaluate_script("document.title")` | Not a file path (does not contain `C:\\` or `/home/`) and not "Vite App" |
| Error boundary | Throttle network  ->  `navigate_page(url=<list-page>)`  ->  `take_snapshot()` | A visible error message, MessageStrip, or error text is shown  -  not a spinner or blank page |
| FxLayout height (FX apps) | `evaluate_script("document.querySelector('#root').getBoundingClientRect().height")` | > 400 (app is not zero-height collapsed) |
| UIArea height (SAPUI5/FE apps) | `evaluate_script("[...document.querySelectorAll('[id$=-uiarea]')].map(e=>e.getBoundingClientRect().height)")` | All values > 100 |

---

## Facet 2: Data-Based Review

### 2.1 Purpose

Examines every data property used in the UI and verifies it is rendered correctly: human-readable labels for codes, correct number formatting, proper null handling, appropriate fallbacks. Driven by the OData `$metadata`, not the view  -  start from the data model and find every usage.

### 2.2 Enumeration step

1. Fetch `GET /odata/v4/<service>/$metadata` and list every entity property.
2. Classify each property by type:
 - **Code / enum**  -  string FK to a CodeList (status_code, urgency_code, currency_code, etc.)
 - **Numeric**  -  Integer, Decimal, Double
 - **Date / DateTime**  -  DateTimeOffset, Date
 - **Navigation / expand**  -  customer/name, author/name, genre/name
 - **Computed / virtual**  -  `@Core.Computed`, `IsActiveEntity`
3. For each property, find every place it appears in the UI (search view files for the property path).
4. Apply the checklist for that property type.

### 2.3 Per-type checklist

#### Code / Enum properties

| Check | Operational test | Pass criterion |
|---|---|---|
| Human-readable label in list | `take_snapshot()` on list page  ->  scan all cell text | Zero cells whose text is a single character or raw code (e.g. "N", "A", "O", "H") in a status/urgency column |
| Human-readable label in chart axis | `take_snapshot()` on Overview  ->  scan axis label text | Zero axis labels matching known raw codes |
| All codes covered by map | `GET /odata/v4/<service>/<StatusEntity>?$select=code`  ->  extract all code values  ->  grep STATUS_MAP/STATUS_LABELS in source | Every code from the service appears as a key in the source mapping |
| Consistent label cross-page | `take_snapshot()` on List, Detail, and Report in sequence | Same code produces identical label text on all three pages |
| Filter dropdown labels | `click(uid=<status-filter-select>)`  ->  `take_snapshot()` | Dropdown options show labels not codes |

#### Numeric properties

| Check | Operational test | Pass criterion |
|---|---|---|
| Decimal places | `take_snapshot()` on any page showing a `Decimal(N,M)` field | Zero values with more than M digits after the decimal point; grep: `rg "\d+\.\d{3,}" snapshot-text` = zero matches |
| No thousand-separator on ID fields | `take_snapshot()` on list page | No ID cell text contains a comma (e.g. "4,134" fails) |
| Currency label | `take_snapshot()` on any price/amount display | Every price value is adjacent to a currency code |
| Large numbers (budget/spend) | `take_snapshot()` on KPI showing M-scale values | Value is formatted as "27.5 M USD" or "27,500,000 USD"  -  not raw integer "27500000" |

#### Date / DateTime properties

| Check | Operational test | Pass criterion |
|---|---|---|
| Locale formatting | `take_snapshot()` on any date field | No raw ISO string `\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}` visible in rendered text |
| Null date | Navigate to a record with a null date field  ->  `take_snapshot()` | Field shows "-", "N/A", or empty  -  not "Invalid Date", "NaN", or the literal string "null" |
| Date filter format | Open a date filter  ->  select a date  ->  `list_network_requests()` | `$filter` contains a date in `yyyy-MM-dd` format, not `dd/MM/yyyy` or locale format |

#### Navigation property bindings (expanded entities)

| Check | Operational test | Pass criterion |
|---|---|---|
| Expand included | `list_network_requests()` after page load on Detail/List | Request URL contains `$expand=` with every navigation property displayed in the view |
| Null fallback | Navigate to a record with a null `author_ID` / null FK  ->  `take_snapshot()` | Field shows a fallback ("-", "Unknown", or blank)  -  not "undefined", "[object Object]", or empty cell with no indication |
| Agency/Customer name shown (not raw ID) | `take_snapshot()` on list and detail pages | No cell in Agency or Customer column shows a raw 6-char numeric ID  -  shows the entity name instead |

#### System / framework properties

| Check | Operational test | Pass criterion |
|---|---|---|
| `IsActiveEntity` not visible | `take_snapshot()` on all pages | Zero occurrences of the text "IsActiveEntity", "true", "false" as standalone values in data cells |
| `@odata.count` used not `value.length` | `list_network_requests()`  ->  find entity list request  ->  read `@odata.count`  ->  `take_snapshot()`  ->  read displayed count | Displayed count equals `@odata.count` (not page size) |

#### Aggregation / computed values

| Check | Operational test | Pass criterion |
|---|---|---|
| Server-side aggregation only | `list_network_requests()` for all chart/KPI data requests | All analytics requests contain `$apply=` in the URL |
| Navigation paths absent from groupby | Grep: `rg "\$apply=groupby\(\([^)]*/" src/ --type ts --type tsx` | Zero matches (groupby uses scalar fields like `status_code`, never `status/name`) |

---

## Facet 6: Pattern-Based Review

### 3.1 Purpose

Verifies that multi-element UI mechanisms are fully implemented  -  every part of each named pattern is present, consistent, and functional.

### 3.2 Named patterns and their contracts

#### Pattern P-01: Chart / KPI tile  ->  filtered list cross-navigation

All seven parts must be present for each navigable chart or KPI tile:

| Part | Operational test | Pass criterion |
|---|---|---|
| P-01-1: Source click handler | `click(uid=<first-bar-or-slice>)` | URL changed or navigation occurred |
| P-01-2: Correct parameter extraction | `click(uid=<bar-for-status-X>)`  ->  `list_network_requests()` | OData request for the list contains `$filter=status_code eq 'X'` (the correct dimension value) |
| P-01-3: Filter state written | After chart click  ->  `evaluate_script("window.location.href")` | URL contains a filter query param, OR filter model was set (verify via filter control in step P-01-6) |
| P-01-4: List page reads and applies filter | `list_network_requests()` after cross-nav | `$filter=` is present in the list entity request |
| P-01-5: Filter reset before cross-nav | Apply a manual filter X  ->  navigate away  ->  click chart segment Y  ->  `take_snapshot()` | Filter control shows Y, not X |
| P-01-6: Filter visible to user | `take_snapshot()` after chart-click navigation | Filter Select/ComboBox control text equals the dimension value navigated from (not "All Statuses") |
| P-01-7: Filter clearable | Click "Clear Filters"  ->  `list_network_requests()` | List request has no `$filter=` or only the `IsActiveEntity eq true` baseline |

**Verification sequence (execute in order for each chart):**
```
click(<chart segment for status X>)
list_network_requests()  ->  assert $filter=status_code eq 'X'
take_snapshot()  ->  assert filter control shows 'X' not 'All'
click(<clear filters>)
list_network_requests()  ->  assert no business-logic $filter
take_snapshot()  ->  assert filter control shows 'All'
```

#### Pattern P-02: Report page  -  all records, print-safe

| Part | Operational test | Pass criterion |
|---|---|---|
| P-02-1: All records fetched | `list_network_requests()` on report page | `$top=` is absent OR equals a value >= total `@odata.count`; no default 100/200/1000 cap |
| P-02-2: No virtual scroll | `evaluate_script("document.querySelectorAll('tr,[role=row]').length")` on report page | Count >= total record count (all rows in DOM) |
| P-02-3: No sticky headers on report | Grep: `rg 'sticky=.ColumnHeaders\|sticky={true}' app/**/*Report*` | Zero matches on report pages |
| P-02-3b: Native table used (not FX Table) | Grep: `rg '<Table\b\|TableHeaderRow\|TableRow\b' app/**/*Report*` | Zero FX Table component matches in report page source (must use native `<table>`) |
| P-02-4: Print CSS present and loaded | `evaluate_script("[...document.styleSheets].some(s=>s.media?.mediaText==='print')")` | Returns `true` |
| P-02-4b: Print CSS hides FxLayout chrome | Grep: `rg 'fx-side-navigation\|fx-pane-header' app/**/*.css` inside `@media print` block | Both `nav.fx-side-navigation` and `header.fx-pane-header` are in the hide rule |
| P-02-4c: Print CSS has compact font rule | Grep: `rg '0\.75rem' app/**/*.css` inside `@media print` block | At least 1 match targeting the report table |
| P-02-4d: Print font targets th * and td * | Grep: `rg 'th \*\|th,.*th \*' app/**/*.css` | At least 1 match in the print block (SAPUI5 header inner spans must also shrink) |
| P-02-5: **MANDATORY  -  Print preview at narrowest print width** | Follow the 5-step procedure in `print.md §How to verify`: (1) `resize_page(740,1050)`, (2) inject print CSS via `evaluate_script`, (3) `take_screenshot(fullPage=true)`, (4) verify `th[n].w === td[n].w` for each column numerically, (5) clean up and restore viewport | All column headers readable (not truncated); `th` and `td` widths match at each nth-child position (within 1px); no date value wraps across two lines |
| P-02-5b: h-screen not clipping print | Grep: `rg "h-screen\|overflow-hidden\|overflow-y.*auto" app/*/src/ --type css --type tsx`  ->  for each match check `@media print` override exists | Every overflow constraint has a corresponding `@media print { overflow:visible!important; height:auto!important }` |
| P-02-6: Column widths explicit | Grep: `rg "<Column\|TableHeaderCell\|<th" app/**/*Report*` | Every column element has explicit `width` attribute |
| P-02-6b: Date columns no-wrap | Grep: `rg 'data-col-type="date"\|whiteSpace.*nowrap' app/**/*Report*` | At least 1 match; every date-valued `<th>` and `<td>` has `whiteSpace: nowrap` or `data-col-type="date"` |
| P-02-7: Status labels not codes | `take_snapshot()` on report page | No cell text matches single-char status code pattern (same check as Facet 2) |

**P-02-5 is non-negotiable and cannot be marked PASS by code inspection alone. Resize to 740px and force print CSS, then take a screenshot. Check that header and data rows are aligned, and that no date cell wraps.**

#### Pattern P-03: Create / Edit form  -  full lifecycle

| Part | Operational test | Pass criterion |
|---|---|---|
| P-03-1: FK dropdowns populated | `click(uid=<agency-or-author-field>)`  ->  type 3 chars  ->  `take_snapshot()` | Suggestion items visible, sourced from OData (verify via `list_network_requests()`: a `TravelAgencies?$filter=contains(...)` request fired) |
| P-03-2: Validation before submit | Clear required field  ->  `click(uid=<save>)`  ->  `take_snapshot()` | Error state on the specific field (not just a toast); no OData POST fired (`list_network_requests()` shows no POST) |
| P-03-3: Backend error surfaced | Submit with data that fails a backend constraint  ->  `take_snapshot()` | Error message text (from CAP `error.message`) visible in the UI |
| P-03-4: Draft lifecycle (if applicable) | `list_network_requests()` during create  ->  look for `draftActivate` POST | `draftActivate` POST appears after Save on draft-enabled entities |
| P-03-5: Cancel discards draft | `click(uid=<cancel>)`  ->  `list_network_requests()` | `draftDiscard` POST appears in network log for draft entities |
| P-03-6: Success feedback | Complete a valid save  ->  `take_snapshot()` | Success toast or message visible; navigation to record or list occurred |
| P-03-7: Edit pre-populates | Enter edit mode on a record  ->  `take_snapshot()` | Every editable field shows current value, not blank |

#### Pattern P-04: Dark mode theme

| Part | Operational test | Pass criterion |
|---|---|---|
| P-04-1: Theme detected at startup | `evaluate_script("document.documentElement.getAttribute('data-sap-theme') || document.documentElement.classList.contains('dark')")` when OS is dark | Returns `"sap_horizon_dark"` (SAPUI5/WC4R) or `"dark"` class present (FX/Tailwind) |
| P-04-2: Theme switches live | `evaluate_script("window.matchMedia('(prefers-color-scheme:dark)').matches")`  ->  toggle OS dark mode  ->  `evaluate_script(...)` again | Theme attribute/class changes without page reload |
| P-04-3: No hardcoded colours | Grep: `rg "color:\s*(white\|black)\|background:\s*(white\|#f[0-9a-f]{5}\|#fff)\|#[0-9a-fA-F]{3,6}" app/*/src/ --type tsx --type ts` | Zero matches in JSX inline styles (CSS variable references are acceptable) |
| P-04-3b: No undefined CSS variables `[verified-TrialJ-2026-05-28]` | `evaluate_script(...)` - see script below | `undefinedVars === []` on every page - any entry means that token is invisible on screen |
| P-04-4: No native inputs | Grep: `rg '<input type="(date\|color\|time\|datetime)"' app/*/src/ --type tsx` | Zero matches |
| P-04-5: Chart colours from tokens | `evaluate_script("getComputedStyle(document.querySelector('.v-datapoint,[fill]')).fill")`  ->  `evaluate_script("getComputedStyle(document.documentElement).getPropertyValue('--sapChart_OrderedColor_1')")` | Computed fill value equals or maps to the CSS variable value |
| P-04-6: Report forced light | `evaluate_script("const s=document.createElement('style');s.media='print';s.textContent='body{background:green}';document.head.appendChild(s);window.print()")`  ->  screenshot | Print preview shows white background (print CSS `background:white!important` overrides test green) |
| P-04-7: FE apps use sap-ui-config | Grep: `rg 'data-sap-ui-theme' app/**/index.html` | Zero matches (hardcoded theme must not be present in index.html) |
| P-04-8: All icons use sap-icon:// URIs | Grep: `rg 'icon="(?!sap-icon://)' app/**/*.xml app/**/*.tsx` | Zero matches (no emoji or raw icon names without sap-icon:// prefix) |
| P-04-9: Spacing uses CSS variables not hardcoded px | Grep: `rg 'margin:\s*[0-9]+px\|padding:\s*[0-9]+px' app/*/src/ --type tsx --type ts` (JSX inline styles only) | Zero matches where the value is not derived from a CSS variable or Tailwind spacing token |

**P-04-3b script (run on every page after generation):**
```js
// Chrome DevTools MCP evaluate_script - finds CSS custom properties used in inline styles
// that do not resolve to a value in the active theme.
// A CSS variable with no definition silently produces empty output:
//   var(--undefined-token) -> "" -> border/colour invisible, no console error, no TSC error.
() => {
  const cs = getComputedStyle(document.documentElement);
  const usedVars = [...document.querySelectorAll('[style]')]
    .flatMap(el => (el.getAttribute('style').match(/var\(--[\w-]+\)/g) || []))
    .filter((v, i, arr) => arr.indexOf(v) === i);
  const empty = usedVars.filter(v => {
    const name = v.match(/var\((--[\w-]+)/)[1];
    return !cs.getPropertyValue(name).trim();
  });
  return { checked: usedVars.length, undefinedVars: empty };
}
// PASS: undefinedVars === []
// FAIL example: undefinedVars: ["var(--fx-color-neutral-4)"]
//   -> every border using that token is invisible (width 0, no color)
```

This check is cheap (< 1s) and catches the exact class of defect where a component library's token namespace changes between versions or the active theme does not define a token that the skill's example code references. Run it on every page as part of Facet 4 (Control review).

#### Pattern P-05: URL parameter  ->  filter pre-population

| Part | Operational test | Pass criterion |
|---|---|---|
| P-05-1: URL param parsed on mount | `navigate_page(url="<list-page>?status=N")`  ->  `list_network_requests()` | List OData request contains `$filter=...status_code eq 'N'` |
| P-05-2: Filter controls reflect URL value | After P-05-1  ->  `take_snapshot()` | Status filter control shows "New" (or equivalent label), not "All Statuses" |
| P-05-3: OData $filter applied | Verify in P-05-1 network request | `$filter=` present and value matches URL param  -  not client-side array filter |
| P-05-4: Invalid param handled | `navigate_page(url="<list-page>?status=INVALID")`  ->  `take_snapshot()` | Empty list with `noDataText` visible  -  no error thrown, no unfiltered full list returned |

#### Pattern P-06: Pagination / infinite scroll integrity

| Part | Operational test | Pass criterion |
|---|---|---|
| P-06-1: Count from @odata.count | `list_network_requests()`  ->  read `@odata.count`  ->  `take_snapshot()`  ->  read count label | Displayed count equals `@odata.count` |
| P-06-2: Next/Previous at boundaries | Navigate to last page  ->  `evaluate_script("document.querySelector('[icon=slim-arrow-right],[slot=next]')?.getAttribute('disabled')")` | Returns `""` or `"true"` (disabled) |
| P-06-3: Filter resets to page 0 | Navigate to page 3  ->  apply a filter  ->  `list_network_requests()` | Request contains `$skip=0` (or no `$skip`)  -  not `$skip=60` |

#### Pattern P-07: Status / action lifecycle (workflow entities)

| Part | Operational test | Pass criterion |
|---|---|---|
| P-07-1: Actions shown contextually | `take_snapshot()` on a record in status "Open" | Approve AND Reject buttons visible |
| P-07-1b: Actions hidden when invalid | `take_snapshot()` on a record in status "Rejected" | Approve AND Reject buttons absent or disabled |
| P-07-2: CAP bound action via POST | Click Approve  ->  `list_network_requests()` | A POST to `.../TravelService.acceptTravel` (or equivalent bound action URL) appears  -  no PATCH on `Status_code` directly |
| P-07-3: UI reflects updated status | Click Approve  ->  `take_snapshot()` (after toast dismissal) | Status cell/badge text changed to "Approved"/"Accepted" without page reload |
| P-07-4: No optimistic update on error | Intercept the action POST to return error  ->  `take_snapshot()` | Status NOT changed in UI; error message visible |
| P-07-5: Error from action shown | Submit an invalid action (re-approve already-approved)  ->  `take_snapshot()` | An error message or toast is visible explaining the failure |

---

## Facet 7: Accessibility-Based Review

### 4.1 Purpose

Verifies that every interactive and informational element is usable by keyboard, screen reader, and users with colour vision deficiencies.

### 4.2 Per-element checklist

#### Interactive elements

| Check | Operational test | Pass criterion |
|---|---|---|
| Icon-only button tooltips | `evaluate_script("[...document.querySelectorAll('ui5-button[icon]:not([text]),[data-icon]:not([aria-label])')].filter(b=>!b.tooltip&&!b.title&&!b.getAttribute('aria-label')).length")` | Returns 0 |
| Nav item text labels | `take_snapshot()` on shell with navigation open | Every nav item has a visible text label alongside its icon |
| Chart aria-label | `evaluate_script("document.querySelector('.v-m-root,[data-viz-chart]')?.getAttribute('aria-label')")` | Non-empty string describing the chart and that it is interactive |
| Disabled button explains why | `evaluate_script("[...document.querySelectorAll('[disabled]')].map(b=>b.tooltip||b.title||'MISSING').filter(t=>t==='MISSING').length")` | Returns 0 |

#### Form fields

| Check | Operational test | Pass criterion |
|---|---|---|
| Input has label | `evaluate_script("[...document.querySelectorAll('input,ui5-input,ui5-select,ui5-textarea')].filter(i=>!i.accessibleName&&!i.placeholder&&!document.querySelector(`[for='${i.id}']`)).length")` | Returns 0 |
| Error on invalid input | Submit form with empty required field  ->  `take_snapshot()` | `valueState="Error"` or `aria-invalid="true"` visible on the specific field (not only toast) |
| Required field marker | `evaluate_script("[...document.querySelectorAll('[required]')].length")` vs grep of required fields in CDS/service | Count matches expected number of required fields |

#### Colour and contrast

| Check | Operational test | Pass criterion |
|---|---|---|
| Status conveyed by text AND colour | `take_snapshot()`  ->  inspect status column | Each status value has a text label (not just a coloured dot/circle) |
| No red/green-only chart distinction | `take_snapshot()` of any pie/donut chart | Either: labels are present on every segment, OR chart uses distinct shapes/patterns in addition to colour |
| Semantic colour correctness | `evaluate_script("getComputedStyle(document.querySelector('[state=Positive],[design=Positive]')).color")` | Computed colour is green-family (`rgb(16,126,62)` or similar) |

#### Semantic structure

| Check | Operational test | Pass criterion |
|---|---|---|
| Meaningful page heading | `evaluate_script("document.querySelector('h1,h2,[level=H1],[level=H2]')?.textContent?.trim()")` | Non-empty; not a namespace string; not "undefined" |
| Table column headers | `evaluate_script("document.querySelector('thead,ui5-table-header-row,[role=rowgroup]')?.children.length")` | > 0 (at least one header cell present) |
| Loading state announced | `evaluate_script("document.querySelector('[aria-live],[aria-busy],[role=status]')?.getAttribute('aria-live')")` | Returns "polite" or "assertive"  -  loading region is live |
| Empty state text | Verify with no-data condition active  ->  `take_snapshot()` | `noDataText` visible and is a helpful sentence (not just "No data") |

---

## Facet 8: Integration Checklist

Run after Facets 1 - 4 to confirm no cross-facet interactions were missed:

| Check | Covers | Operational test |
|---|---|---|
| Every chart that navigates also resets target list filters | P-01-5 + Facet 4 chart | Apply filter X  ->  click chart segment Y  ->  assert filter shows Y not X |
| Every status code shown as text in list is also shown as text in report | Facet 2 + P-02-7 | `take_snapshot()` on Report  ->  search for raw code chars  -  assert zero |
| Every KPI tile that navigates also pre-populates the filter control | P-01-6 + Facet 6 | Click tile  ->  assert filter control text equals tile dimension value |
| Every form field that accepts input also validates and shows errors accessibly | Facet 4 form + Facet 7 form | Submit empty required field  ->  assert field-level error (not only toast) |
| Dark mode tested on report page specifically | P-04-6 + P-02 | Toggle dark mode  ->  navigate to report  ->  `take_screenshot()`  ->  assert background is not black |
| URL parameter navigation works and resets to page 0 | P-05 + P-06-3 | `navigate_page(?status=X)`  ->  `list_network_requests()`  ->  assert `$skip=0` and `$filter=status_code eq 'X'` |
| Suggestion inputs store the ID not the display name in the payload | UXC-031a + P-03-1 | Select a suggestion  ->  Save  ->  `list_network_requests()`  ->  assert POST body contains `agency_ID` (raw ID), not `agency` (display name) |

---

## Facet 1: Navigation Review

### 6.1 Purpose

Verifies the completeness and correctness of the entire navigation graph  -  every route, every entry point, every back/forward path, and every way a page can be reached. Start from the **router manifest**, not the view files.

### 6.2 Enumeration step

1. Open the router configuration (manifest.json `routing.routes`, or the React Router `<Routes>` block in `App.tsx`/`App.jsx`).
2. List every defined route by name and pattern.
3. For each route, find every `navTo(name)` / `navigate(path)` call that targets it.
4. Check both the router-button path (clicking a UI button) and the direct-URL path (typing the URL in the address bar).

### 6.3 Route completeness

| Check | Operational test | Pass criterion |
|---|---|---|
| Every route has a target view/component | Grep: `rg '"target":' manifest.json` vs `rg '"id":' manifest.json` for targets | Every target referenced in a route has a matching `targets` definition |
| Every `navTo`/`navigate` references an existing route | Grep: `rg 'navTo\|navigate\(' app/**/*.ts app/**/*.tsx`  ->  extract route names  ->  cross-check against manifest | Zero `navTo("routeName")` calls where "routeName" is not defined in the manifest |
| Every page reachable via direct URL | `navigate_page(url=<direct-hash-or-path>)` for each route | Page renders correctly (not blank, not error); `take_snapshot()` shows expected heading |
| Router-button and direct-URL produce identical result | `click(uid=<nav-button>)`  ->  note URL  ->  `navigate_page(url=<same-URL>)`  ->  compare snapshots | Both paths show the same page content |
| No route renders blank page | `take_snapshot()` on each route after navigation | `evaluate_script("document.body.innerText.trim().length")` > 100 (page has content) |
| **No console errors on any route** | After navigating to each route: `list_console_messages(types=["error"])` | Zero errors on every route. Run this after every `navigate_page()` call in §6.3-6.5  -  a route that loads visually but emits errors is a silent defect that only this facet catches systematically. Any error found here must be recorded as a Facet 1 defect regardless of whether it appears to affect visible output. |

### 6.4 Back navigation

| Check | Operational test | Pass criterion |
|---|---|---|
| Back from detail via button returns to list | Navigate to detail via row click  ->  `click(uid=<back-button>)`  ->  `take_snapshot()` | List page visible |
| Back from detail via direct URL returns to list | `navigate_page(url=<detail-URL>)`  ->  `click(uid=<back-button>)`  ->  `take_snapshot()` | List page visible (tests `onNavBack` History fallback  -  does NOT go to blank or error page) |
| Browser Back button matches app Back button | `click(uid=<back-button>)`  ->  note URL  ->  `navigate_page(url=<detail-URL>)`  ->  `navigate_page(type="back")`  ->  `take_snapshot()` | Same page as app Back result |
| Back from report returns to list | Navigate to Report  ->  `click(uid=<back-button>)`  ->  `take_snapshot()` | List or Overview page visible (not blank) |
| Back button present on every non-root page | `take_snapshot()` on Detail, Report, NewRecord pages | Snapshot contains a control with `nav-back` icon or text "Back" |

### 6.5 Cross-navigation consistency

| Check | Operational test | Pass criterion |
|---|---|---|
| Cross-nav from chart sets URL parameter | `click(uid=<chart-segment>)`  ->  `evaluate_script("window.location.href")` | URL contains filter parameter (e.g. `?status=N`) |
| Cross-nav from KPI tile sets URL parameter | `click(uid=<kpi-tile>)`  ->  `evaluate_script("window.location.href")` | URL contains filter parameter |
| Direct URL with filter param pre-populates control | `navigate_page(url="<list>?status=N")`  ->  `take_snapshot()` | Filter Select/ComboBox shows "New" not "All Statuses" |
| Direct URL with invalid param graceful | `navigate_page(url="<list>?status=INVALID")`  ->  `take_snapshot()` + `list_console_messages(types=["error"])` | No console error; empty list with noDataText (not full unfiltered list) |

### 6.6 Route guards and auth state

| Check | Operational test | Pass criterion |
|---|---|---|
| Authenticated-only routes redirect when unauthenticated | If app uses auth: clear session cookies  ->  `navigate_page(url=<protected-route>)`  ->  `take_snapshot()` | Login page shown OR redirect occurred (not data silently empty) |
| Stale binding on re-entry | Navigate away from list  ->  apply filter  ->  navigate back to list  ->  `take_snapshot()` | List is refreshed with current data (binding.refresh() was called); does not show stale pre-filter result |

---

## Facet 3: Texts Review

### 7.1 Purpose

Verifies that every user-visible string follows User Assistance (UA) guidelines, SAP Fiori terminology standards, and is consistent across all pages. Start from every displayed string, not from control properties or data types.

### 7.2 Enumeration step

1. `take_snapshot()` on every page in the app.
2. Collect all visible text strings (headings, button labels, column headers, field labels, messages, tooltips, placeholder text, noDataText, error messages).
3. Apply the checklist below to each string category.

Also run the i18n cross-check for SAPUI5 apps:
```powershell
# Find every {i18n>key} reference in view XML
$keys = Select-String -Path "**/*.xml" -Pattern "\{i18n>([a-zA-Z]+)\}" -AllMatches |
  ForEach-Object { $_.Matches | ForEach-Object { $_.Groups[1].Value } } | Sort-Object -Unique
# Assert each key exists in i18n.properties
foreach ($key in $keys) {
  $match = Select-String -Path "webapp/i18n/i18n.properties" -Pattern "^$key="
  if (-not $match) { Write-Host "MISSING i18n key: $key" }  # FAIL
}
```

### 7.3 String quality checklist

#### Button labels and action labels

| Check | Operational test | Pass criterion |
|---|---|---|
| Imperative verb form | `take_snapshot()`  ->  collect all button/action label text | Every action label is a verb phrase ("Save", "Create Travel", "Approve")  -  not a noun ("Saving", "Creation") or gerund |
| No trailing ellipsis on immediate actions | `take_snapshot()`  ->  filter button labels | Buttons that execute immediately (Save, Delete, Approve) have no trailing "..." |
| Trailing ellipsis on dialog-opening actions | `take_snapshot()`  ->  filter action labels | Buttons that open a dialog before executing do have "..." (e.g. "Delete..." opens a confirmation) |
| Primary action is Emphasized | `evaluate_script("[...document.querySelectorAll('[type=Emphasized],[design=Emphasized],[design=Primary]')].map(b=>b.textContent?.trim())")` | Result array contains exactly the expected primary action label for each page |

#### Column headers and field labels

| Check | Operational test | Pass criterion |
|---|---|---|
| Title Case | `take_snapshot()`  ->  collect all column header and form label text | Every label starts with a capital letter; no ALL-CAPS labels (except acronyms like "ID", "USD") |
| No technical property names | `take_snapshot()`  ->  scan headers/labels | Zero occurrences of `_ID`, `_code`, `createdAt`, `modifiedAt`, `IsActiveEntity` as visible labels |
| Consistent entity naming | `take_snapshot()` on List, Detail, Report | The same entity is called by the same name on all pages (e.g. not "Customer" on one page and "Passenger" on another for the same field) |
| Units in column headers for numeric data | `take_snapshot()`  ->  find numeric column headers | Price columns include currency in parentheses ("Price (USD)") or as a unit column; stock columns include "Units" or similar |

#### Status and code labels

| Check | Operational test | Pass criterion |
|---|---|---|
| Status labels are past participle or noun, not raw code | `take_snapshot()` on any list/detail | Status column shows "Approved" not "Accept" not "A" |
| Action labels match status transitions correctly | `take_snapshot()` on a record in "Open" status | Action button says "Approve" (not "Accept") and "Reject" (not "Decline") if those are the configured terms |
| Consistent label across apps | For multi-app projects: `take_snapshot()` on each app's list page | The same status code produces the same label text in all apps ("Approved" in wc4r = "Approved" in fx = "Approved" in ui5) |

#### Error messages and validation text

| Check | Operational test | Pass criterion |
|---|---|---|
| No raw HTTP status codes visible | Trigger any error condition  ->  `take_snapshot()` | Zero occurrences of "HTTP 400", "HTTP 500", "HTTP 404" as visible text |
| No OData technical terms visible | Trigger any error condition  ->  `take_snapshot()` | Zero occurrences of "ENTITY_IS_READ_ONLY", "draftActivate", "IsActiveEntity", "MERGE_FAILED" as visible text |
| Required field message is specific | Submit form with empty required field  ->  `take_snapshot()` | Error message names the specific field ("Title is required")  -  not generic "Validation error" |
| Positive feedback present | Complete any CRUD operation  ->  `take_snapshot()` | A success message is visible with the record name/identifier (e.g., `Book "Wuthering Heights" saved.`) |

#### Empty states and noDataText

| Check | Operational test | Pass criterion |
|---|---|---|
| noDataText is instructional | Trigger empty state (search for non-existent value)  ->  `take_snapshot()` | Visible text explains WHY empty and/or WHAT to do ("No travels matching the current filters. Clear filters to see all records.") |
| noDataText not default | `take_snapshot()` on empty state | Text is NOT exactly "No data" (framework default) |
| Placeholder text matches input format | `take_snapshot()` on New/Edit forms | Placeholder text for date fields shows format ("YYYY-MM-DD"), for ID fields shows example ("e.g. 070001") |

#### i18n completeness (SAPUI5 apps)

| Check | Operational test | Pass criterion |
|---|---|---|
| No unresolved i18n keys in rendered text | `take_snapshot()` on all pages | Zero occurrences of pattern `{i18n>[a-zA-Z]+}` as visible text |
| All referenced keys defined | Run the PowerShell cross-check in §7.2 | Zero "MISSING i18n key" output lines |
| No duplicate i18n key definitions | Grep: `rg "^([a-zA-Z]+)=" webapp/i18n/i18n.properties`  ->  check for duplicates | Zero duplicate key names |

---

## Facet 5: Control Logic Review

### 8.1 Purpose

Verifies that every interactive element's enabled/visible/interactive state correctly reflects the current app state  -  authentication, record status, selection, form completion, and in-flight requests. This is distinct from Pattern P-07 (which covers business workflow transitions)  -  this facet covers the broader UI state machine.

### 8.2 Enumeration step

For each interactive element (button, input, action item) in every view:
1. Identify every condition under which its state should differ from its default.
2. Drive the app into each state.
3. Assert the element's state is correct.

States to test for each element: unselected, selected (1 row), selected (N rows), editing, saving, error, authenticated, unauthenticated (if applicable), record-in-terminal-status.

### 8.3 Selection-driven state

| Check | Operational test | Pass criterion |
|---|---|---|
| Bulk actions disabled with no selection | `take_snapshot()` on list page with no rows selected | Delete/bulk-action buttons have `disabled` attribute |
| Bulk actions enabled with >=1 selection | Select one row  ->  `take_snapshot()` | Delete/bulk-action buttons do NOT have `disabled` attribute |
| Single-selection actions disabled on multi-select | Select 2+ rows  ->  `take_snapshot()` | Actions that are only valid for exactly one record are disabled |
| Selection count in button label | Select N rows  ->  `take_snapshot()` | Bulk action button shows count ("Delete (3)") or selection indicator is visible |

### 8.4 Form state

| Check | Operational test | Pass criterion |
|---|---|---|
| Save disabled while required fields empty | Open New/Edit form  ->  `evaluate_script("document.querySelector('[design=Emphasized],[type=Emphasized]')?.getAttribute('disabled')")` | Not disabled initially (user must be able to attempt save to see validation); OR disabled only if form is provably empty |
| Save disabled during in-flight request | Click Save  ->  immediately `evaluate_script("document.querySelector('[design=Emphasized]')?.getAttribute('disabled')")` | Returns `""` or `"true"` (button disabled during save  -  prevents double-submit) |
| Cancel restores original values | Enter edit mode  ->  change a field  ->  click Cancel  ->  `take_snapshot()` | Original field value restored; changed value not persisted |
| Error state cleared on correction | Trigger validation error on a field  ->  correct the value  ->  `take_snapshot()` | `valueState="Error"` or red border is gone after correction |

### 8.5 Record-status-driven state

| Check | Operational test | Pass criterion |
|---|---|---|
| Edit button only on editable status | `take_snapshot()` on a record in "Open" status | Edit button visible |
| Edit button absent on terminal status | `take_snapshot()` on a record in "Rejected" or "Closed" status | Edit button absent or disabled |
| Approve/Reject only on actionable status | `take_snapshot()` on "Open" record | Both Approve and Reject visible |
| Approve/Reject absent on terminal status | `take_snapshot()` on "Approved" record | Approve button absent or disabled; Reject button absent or disabled |
| Re-approve already-approved triggers error | Click Approve on an already-approved travel  ->  `take_snapshot()` | Error message visible; status not changed |

### 8.6 Loading and async state

| Check | Operational test | Pass criterion |
|---|---|---|
| Busy indicator during fetch | `navigate_page(url=<list>)` with network throttling  ->  `take_snapshot()` immediately | BusyIndicator or skeleton visible  -  not a blank page or stale data |
| KPI tiles show 0 transiently, not permanently | `navigate_page(url=<overview>)`  ->  `take_snapshot()` after 2s | Tiles show actual counts, not 0 (data loaded within 2s of mount) |
| Chart shows loading state | `navigate_page(url=<overview>)` with throttling  ->  `take_snapshot()` immediately | Chart area shows a loading indicator, not a blank area |
| No double-submit possible | Click Save  ->  immediately click Save again  ->  `list_network_requests()` | Exactly one POST/PATCH appears in network log (button was disabled after first click) |

### 8.7 Authentication and permission state

| Check | Operational test | Pass criterion |
|---|---|---|
| Create button requires write permission | If the service uses `@requires: 'admin'` or role-based access: `navigate_page()` as a read-only user  ->  `take_snapshot()` | Create/Delete buttons absent or disabled |
| Auth error surfaces helpfully | Navigate to an `@requires` protected route without credentials  ->  `take_snapshot()` | A "401 Unauthorized" or login prompt shown  -  not a blank page or silent empty list |
| Mock user auth header present | `list_network_requests()` on any OData fetch | `Authorization: Basic ...` header present in all requests to auth-required services |

---

## Running the Faceted Review  -  Recommended Sequence

```
1. Facet 1 first (Navigation)  -  15 min
    -  Check router completeness before testing any individual page.
    -  Catches blank pages from missing routes immediately.

2. Facet 2 (Data)  -  20 - 30 min
    -  Most fundamental. Data rendering bugs surface in all other facets.
    -  Start from $metadata; verify code/decimal/date/expand for each property type.

3. Facet 3 (Texts)  -  15 min
    -  Run i18n cross-check first (static, fast).
    -  Then take_snapshot() on all pages and scan for raw codes, technical terms, missing labels.

4. Facet 4 (Control)  -  20 min
    -  Enumerate views; apply per-control checklist.
    -  Run evaluate_script() asserts for button counts, tooltip presence, height checks.

5. Facet 5 (Control Logic)  -  20 min
    -  Drive app into each state (no-selection, editing, approved, error).
    -  Assert every interactive element's state is correct.

6. Facet 6 (Pattern)  -  20 - 30 min
    -  Requires live browser. Run P-01 for every chart (use the verification sequence).
    -  Run P-02 including MANDATORY print preview screenshot.
    -  Run P-03 for every create/edit form.

7. Facet 7 (Accessibility)  -  15 min
    -  Keyboard tab order test; evaluate_script for label/aria checks.
    -  take_screenshot() for colour-only distinction check.

8. Facet 8 (Integration)  -  10 min
    -  Final cross-check; confirm cross-facet compositions are correct.
```

**Time estimate per app:** 8-15 minutes (agent-run, programmatic checks) or 90-150 minutes (human reviewer working manually) for a 4-page app (Overview, List, Detail, Report). The facet-level estimates above reflect the human-reviewer baseline; agent execution of the same checks via grep, evaluate_script, and network inspection is typically 10-20x faster. [Verified TrialK-2026-06-01: 9 min actual for 5-page app.]

**Defect severity mapping:**

| Facet | Critical | Warning |
|---|---|---|
| Control | Missing click handler on interactive element; missing required field validation; FK field shows raw ID | Suboptimal default not corrected; wrong placeholder text |
| Data | Code shown instead of label; wrong decimal places; null shows "Invalid Date" | Missing currency unit; missing relative date format |
| Pattern | Pattern partially implemented (P-01 fires but list ignores filter state); report clipped in print preview | Cross-nav filter not cleared on Back |
| Accessibility | No label on required input; colour-only status distinction; no aria-live on loading state | Missing tooltip on icon button |
| Navigation | Route undefined; back from direct URL crashes; filter param ignored on direct navigation | Stale binding on re-entry |
| Texts | Raw code visible ("N", "A"); i18n key unresolved; HTTP error shown to user; "accepted" !=  "approved" cross-app | Title case violation; missing unit in column header |
| Control Logic | Save allows double-submit; action button absent when it should be present; error not surfaced from action | Button disabled when it should be enabled |


