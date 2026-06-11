# Print-safe pages - canonical template

**Origin:** This file was created in response to S-PROP-14 (TrialIOpus, 2026-05-22) where all 4 generated apps (FE, freestyle SAPUI5, WC4R, FX) failed the P-02-5 print preview test for the same reason: outer layout containers locked to `100vh` / `height:100%` with no `@media print` override, causing print preview to clip to the viewport.

**Authority:** `[verified-this-trial]` - the rules below are necessary based on this trial's evidence. The exact selector list may need expansion once the SAP Hyperspace product standards MCP is consulted (see `evolution/proposals-2026-05-22.md` last section).

**When to apply:** Any page that is intended to be printable - typically Report pages, Inventory snapshots, Audit summaries, list exports. Non-printable interactive pages (edit forms, dashboards, settings) do not need this.

---

## The clipping problem

All four UI technologies (SAPUI5/FE/WC4R/FX) follow the same architectural pattern for full-screen apps:

```
html { height: 100%; overflow: hidden; }
body { height: 100%; overflow: hidden; }
#root { height: 100%; overflow: hidden; }
main { flex: 1; overflow: auto; }    /* internal scroll */
```

This is correct for an interactive app - the side nav stays fixed, the main pane scrolls internally. **But when the user invokes Print, the browser snapshots the document at its rendered viewport size (~900 px tall on a typical screen), not at the full content size.** Result: page 1 = page header + 10-15 rows; pages 2+ = empty. Rows 16-100 are simply lost.

A naive `@media print { body { background: white } }` rule (which is what most of the trial's apps had) does NOT fix this. It addresses theme-print only.

---

## Required rule - always apply this block to printable pages

Place the following `@media print` block in the top-level CSS file of the app (`index.css` for React apps; `style.css` or per-view block for SAPUI5):

```css
@media print {
  /* (1) Force every viewport-height ancestor to grow to its content height.
         The selector list covers SAPUI5 / sap.fe / sap.tnt / WC4R / FX / generic React.
         NOTE  -  sap.tnt ToolPage specifics [verified TrialK-2026-06-01]:
           .sapTntToolPage is position:absolute + overflow:hidden at runtime  -  must be
           position:static to allow content to flow across print pages.
           .sapTntToolPageMain and inner wrappers are overflow:hidden with fixed px heights  - 
           all must be reset. width:100% is required so content fills the page after the
           side panel (.sapTntToolPageAside) is hidden by rule (3) below. */
  html, body, #root, main,
  .sapMShellPage, .sapMNav, .sapMNavItem,
  .sapTntToolPage, .sapTntToolPageContent, .sapTntSideContent,
  .sapTntToolPageContentWrapper, .sapTntToolPageMain,
  .sapTntToolPageMainContent, .sapTntToolPageMainContentWrapper,
  .sapMPage, .sapMPageEnableScrolling, .sapMPageWithHeader,
  div[style*="100vh"], div[style*="overflow"] {
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    position: static !important;
    width: 100% !important;
  }

  /* (1b) FE 1.136.7 List Report specific clipping containers [verified-TrialJ-2026-05-27].
          These two ancestors use overflow:hidden with fixed pixel heights and are NOT
          covered by the class selectors above. Target by ID suffix (stable across apps). */
  [id$="ListReport-contentWrapper"],
  [id$="appRootView--appContent"] {
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    width: 100% !important;
  }
  /* Also force all FE List Report ancestor containers to full width for print */
  [id$="--fe::ListReport"],
  [id$="--fe::ListReport-content"],
  [id$="--fe::ListReport-contentFitContainer"] {
    width: 100% !important;
    max-width: 100% !important;
    overflow: visible !important;
    height: auto !important;
  }

  /* (2) Make the table header repeat on every printed page.
         display:table-header-group is the well-supported native browser mechanism;
         CSS sticky does NOT translate to print. */
  thead { display: table-header-group; }
  tr, [role="row"] { page-break-inside: avoid; }

  /* (2b) FE 1.136.7 sticky header double-rendering fix [verified-TrialJ-2026-05-27].
          sap.m.Table sets position:sticky on tr.sapMListTblHeader via the SAPUI5 CDN
          library stylesheet (cross-origin; cannot inspect via cssRules). Chromium print
          renders the sticky row TWICE: once pinned at top and once in normal flow.
          Must override with higher-specificity selectors than the library rule
          (.sapMSticky .sapMListTblHeader = specificity 0,2,0). */
  .sapMSticky .sapMListTblHeader,
  .sapMSticky5 .sapMListTblHeader,
  .sapMList .sapMListTblHeader,
  .sapMListTblCnt .sapMListTblHeader,
  tr.sapMListTblHeader {
    position: static !important;
    top: auto !important;
  }
  .sapMListTbl thead { display: table-header-group !important; position: static !important; }

  /* (3) Hide non-content chrome on print. */
  ui5-shellbar, ui5-side-navigation, .no-print,
  [class*="sapMShellHeader"], [class*="SideNavigation"],
  /* sap.tnt ToolPage chrome: header bar + side panel (verified TrialK-2026-06-01) */
  .sapTntToolPageHeaderWrapper, .sapTntToolPageHeader, .sapTntToolHeader,
  .sapTntToolPageAside, .sapTntToolPageAsideContent {
    display: none !important;
  }

  /* (4) Force light background for ink savings and dark-mode safety. */
  body { background: white !important; color: black !important; }

  /* (5) REQUIRED for multi-column reports (>= 5 columns): fixed table layout + small font.
         Without table-layout:fixed, sap.m.Table column widths may not honour the % values
         set on <Column>, causing header/cell misalignment in print.
         Without font-size reduction, 7 columns on A4 or Letter portrait (~170-190mm content width) is
         only ~24mm per column - too narrow for content like book titles or author names.
         Calibrate font-size to column count: 5-6 cols -> 9px; 7+ cols -> 8px.

         CRITICAL - sap.m.Table pop-in at narrow print widths (verified TrialJ 2026-05-26):
         At ~740-794px CSS width (A4/Letter portrait with typical margins), sap.m.Table activates
         its responsive pop-in breakpoint and changes th/td from display:table-cell to stacked
         flex blocks. This destroys all column alignment. table-layout:fixed alone does NOT prevent
         it. Must explicitly force display:table-cell on every th and td. */
  .sapMListTbl {
    table-layout: fixed !important;
    width: 100% !important;
    display: table !important;
    border-collapse: collapse !important;
  }
  .sapMListTbl thead { display: table-header-group !important; }
  .sapMListTbl tbody { display: table-row-group !important; }
  .sapMListTbl tr   { display: table-row !important; }
  .sapMListTbl th,
  .sapMListTbl td   { display: table-cell !important; }

  /* Suppress SAPUI5's pop-in label column that appears at narrow widths */
  .sapMListTblSubRow,
  .sapMListTblSubRowCell { display: none !important; }

  /* Uniform padding with border-box so declared widths (%) are consistent between th and td.
     SAPUI5 sets different padding on th (8px left) vs td (16px left) by default. With
     box-sizing:content-box that causes header and data cells to differ in total width even
     when the same % is declared. border-box + uniform padding eliminates the drift.

     ALSO override text-align: the browser UA stylesheet sets `text-align: -internal-center`
     on all <th> elements. SAPUI5's library.css does NOT override this, so column headers
     appear centred while data cells are left-aligned unless you force left on both.
     [verified-TrialK-2026-05-28] */
  .sapMListTbl th,
  .sapMListTbl td,
  .sapMListTblHeaderCell,
  .sapMListTblCell {
    box-sizing: border-box !important;
    padding: 2px 4px !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
    vertical-align: middle !important;
    text-align: left !important;
    height: auto !important;
    line-height: 1.3 !important;
  }

  /* SAPUI5 row-level padding: .sapMLIB carries `padding: 0 1rem` and
     .sapMLIBContent carries `line-height: var(--sapElement_LineHeight)` (~44px at default
     font size). These survive after table-layout:fixed is applied and cause ~20px of wasted
     vertical space above and below content in every row.
     Override BOTH to get compact rows in print output.
     [verified-TrialK-2026-05-28] */
  .sapMListTbl .sapMLIB {
    padding: 0 !important;
    height: auto !important;
    min-height: 0 !important;
  }
  .sapMListTbl .sapMLIBContent {
    padding: 0 !important;
    height: auto !important;
    min-height: 0 !important;
    line-height: 1.3 !important;
  }

  /* Font-size: target BOTH the th/td AND all their descendants.
     SAPUI5 wraps header text in nested div.sapMColumnHeader > span > bdi elements which
     may carry their own font declarations. Setting font-size only on th does NOT cascade
     into those inner elements. Use `th, th *` and `td, td *`. */
  .sapMListTbl td, .sapMListTbl td *,
  .sapMListTblCell, .sapMListTblCell *,
  .sapMText, .sapMLnk,
  .sapMObjStatus, .sapMObjectNumber {
    font-size: 8px !important;   /* use 8px for 7 columns; 9px for 5-6 columns; 11px for 4 columns */
    line-height: 1.3 !important;
  }
  .sapMListTblHeader th,
  .sapMListTblHeader th * {
    font-size: 8px !important;
    font-weight: bold !important;
    line-height: 1.3 !important;
  }
  .sapMListTblCell {
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  /* Hide icons and navigation glyphs that render as broken boxes in print
     [verified-TrialJ-2026-05-27]. sapMObjStatusText is preserved (text only).  */
  .sapMListTbl td .sapUiIcon,
  .sapMListTbl td .sapMObjStatusIcon,
  .sapMListTbl td .sapMLIBImgNav,
  .sapMListTbl td img {
    display: none !important;
  }
  .sapMListTbl td .sapMObjStatusText { display: inline !important; color: black !important; }
```

---

## SAPUI5 nth-child column width selectors - offset by 1

`sap.m.Table` inserts an invisible first `<th>`/`<td>` (the row-highlight/selection column) before the first data column. Therefore `nth-child(1)` is the invisible column and data columns start at `nth-child(2)`. The trailing sentinel column is at `nth-child(N+2)` where N is your column count.

**Additional: `sapMListTblDummyCell` spacer** [verified-TrialJ-2026-05-27]:
SAPUI5 always appends a dummy spacer column (`sapMListTblDummyCell`) as the last column to absorb flex space. In fixed-layout print it takes ~120px unless explicitly zeroed. Use `:nth-child(n+X)` to suppress all trailing columns in one rule, where X = first trailing column index:

```css
/* Zero out the invisible flanking columns */
.sapMListTbl th:nth-child(1), .sapMListTbl td:nth-child(1) { width: 0 !important; padding: 0 !important; }

/* Data columns (4 data columns => nth-child(2) through nth-child(5)) */
.sapMListTbl th:nth-child(2), .sapMListTbl td:nth-child(2) { width: 40% !important; }  /* Title */
.sapMListTbl th:nth-child(3), .sapMListTbl td:nth-child(3) { width: 28% !important; }  /* Author */
.sapMListTbl th:nth-child(4), .sapMListTbl td:nth-child(4) { width: 20% !important; }  /* Genre */
.sapMListTbl th:nth-child(5), .sapMListTbl td:nth-child(5) { width: 12% !important; }  /* Stock */

/* All trailing columns (nav chevron, navigated indicator, dummy spacer) -> 0 */
.sapMListTbl th:nth-child(n+6), .sapMListTbl td:nth-child(n+6) {
  width: 0 !important; padding: 0 !important; overflow: hidden !important; max-width: 0 !important;
}
```

Verify column positions before applying. Inspect with:
```js
[...document.querySelectorAll('.sapMListTblHeader th')]
  .map((th,i) => ({ n: i+1, text: th.textContent?.trim(), cls: th.className.split(' ').slice(0,2).join(' ') }))
// nth-child(1) = sapMTableTH sapMListTblHighlightCol (sentinel, empty text)
// last entry = sapMListTblDummyCell (empty text, takes extra space)
```

---

## Companion rules (must accompany the CSS block)

### 1. No sticky headers on Report tables (S-PROP-15)

`sticky="ColumnHeaders"` (SAPUI5) or `sticky` prop (WC4R) uses CSS `position:sticky` which does NOT translate to per-page print header repetition. Use it on List pages, NOT on Report pages.

```xml
<!-- LIST page - sticky OK -->
<Table sticky="ColumnHeaders" growing="true" ...>

<!-- REPORT page - sticky FORBIDDEN -->
<Table growing="false" items="{report>/books}">
```

```tsx
// LIST page (WC4R)
<Table headerRow={<TableHeaderRow sticky>...</TableHeaderRow>}>

// REPORT page (WC4R) - no sticky
<Table headerRow={<TableHeaderRow>...</TableHeaderRow>}>
```

### 2. Explicit column widths (P-02-6)

Browser auto-distribution of column widths during print can collapse narrow columns or wrap text. Define widths explicitly:

```xml
<Table>
  <columns>
    <Column id="cTitle" width="40%"><Text text="Title"/></Column>
    <Column id="cAuthor" width="20%"><Text text="Author"/></Column>
    <Column id="cGenre" width="15%"><Text text="Genre"/></Column>
    <Column id="cStock" width="8%" hAlign="End"><Text text="Stock"/></Column>
    <Column id="cPrice" width="12%" hAlign="End"><Text text="Price"/></Column>
    <Column id="cCurrency" width="5%"><Text text="Currency"/></Column>
  </columns>
</Table>
```

```tsx
<TableHeaderCell minWidth="240px" width="40%"><span>Title</span></TableHeaderCell>
<TableHeaderCell minWidth="160px" width="20%"><span>Author</span></TableHeaderCell>
<TableHeaderCell minWidth="140px" width="15%"><span>Genre</span></TableHeaderCell>
<TableHeaderCell minWidth="80px" width="8%"  horizontalAlign="Right"><span>Stock</span></TableHeaderCell>
<TableHeaderCell minWidth="100px" width="12%" horizontalAlign="Right"><span>Price</span></TableHeaderCell>
<TableHeaderCell minWidth="80px" width="5%"><span>Currency</span></TableHeaderCell>
```

### 3. All records fetched (P-02-1)

A Report page must fetch ALL records, not the default `$top=200` cap. Use a paginated loop until `@odata.count` is satisfied:

```ts
const fetchAll = async () => {
  const out = [];
  const pageSize = 200;
  let skip = 0;
  while (true) {
    const j = await fetchJson(buildOdataUrl(base, {
      '$orderby': 'genre,title',
      '$top': String(pageSize),
      '$skip': String(skip),
      '$count': 'true'
    }));
    const page = j.value || [];
    out.push(...page);
    const total = j['@odata.count'] || out.length;
    if (out.length >= total || page.length === 0) break;
    skip += pageSize;
  }
  return out;
};
```

A single `$top=200` call is brittle - works only while catalog stays under 200 rows. The skill must default to the loop pattern.

**Fiori Elements specific: load all rows before calling `window.print()`** [verified-TrialJ-2026-05-27]

For FE apps, the paginated loop above does not apply. FE's `sap.m.Table` uses `growingScrollToLoad: true` which loads rows on scroll. Only the first 30 rows are in the DOM by default. The growing trigger button has `display: none` at all times in this mode  -  polling for it does NOT work.

The correct FE approach is to call the Print action from a custom extension controller button that:
1. Sets a large growing threshold on the table control
2. Forces an OData request for all items
3. Waits for the data to arrive before printing

```js
// In extension controller (e.g. Navigation.js):
printReport: function () {
  var sTableId = 'bookshopfe::BooksReport--fe::table::BooksReport::LineItem-innerTable';
  var oTable = sap.ui.getCore().byId(sTableId);
  if (oTable && oTable.getGrowing && oTable.getGrowing()) {
    oTable.setGrowingThreshold(500);   // larger than total record count
    if (typeof oTable.requestItems === 'function') {
      oTable.requestItems();           // fires OData $top=500 request
    }
    setTimeout(function() { window.print(); }, 2000);  // wait for data
  } else {
    window.print();
  }
}
```

The table ID pattern is: `<appNamespace>::<entitySet>--fe::table::<entitySet>::LineItem-innerTable`. Verify the exact ID in the browser before hardcoding.

---

## How to verify (P-02-5 -- mandatory)

**Do NOT rely on code inspection alone and do NOT use `window.print()`  -  the Chrome print dialog cannot be screenshotted by the MCP. Use the following in-browser emulation procedure instead.**

### Step 1  -  Resize viewport to the narrowest common print content width

```js
// Chrome DevTools MCP: resize_page(width=740, height=1050)
// 740px is a conservative lower bound for print content width:
//   A4 portrait, 1.5cm/1cm margins  -> ~718px content
//   US Letter portrait, 1in margins -> ~816px content
//   A4 portrait, 2cm margins        -> ~694px content
// Testing at 740px catches pop-in on the narrowest realistic layout.
// If columns align at 740px they align on any wider paper/margin combination.
```

### Step 2  -  Force @media print rules to apply as screen styles

```js
() => {
  const printSheet = [...document.styleSheets].find(s => s.href?.includes('print'));
  if (!printSheet) return 'ERROR: print.css not loaded';
  const mediaRule = printSheet.cssRules[0];
  if (!mediaRule || mediaRule.type !== CSSRule.MEDIA_RULE) return 'ERROR: no @media rule';
  const style = document.createElement('style');
  style.id = 'print-emulation';
  style.textContent = [...mediaRule.cssRules].map(r => r.cssText).join('\n');
  document.head.appendChild(style);
  return 'Print styles active  -  take screenshot now';
}
```

### Step 3  -  Take a full-page screenshot

```js
take_screenshot(filePath="print-verify.png", fullPage=true)
```

### Step 4  -  Verify column alignment numerically

```js
() => {
  const ths = [...document.querySelectorAll('.sapMListTblHeader th')];
  const tds = [...(document.querySelector('.sapMListTbl tbody tr')?.querySelectorAll('td') ?? [])];
  return {
    tableW: Math.round(document.querySelector('.sapMListTbl')?.getBoundingClientRect().width ?? 0),
    ths: ths.map((th,i) => ({ n:i+1, text:th.textContent?.trim().slice(0,10), w:Math.round(th.getBoundingClientRect().width) })),
    tds: tds.map((td,i) => ({ n:i+1, w:Math.round(td.getBoundingClientRect().width) }))
  };
}
// PASS: every th[n].w === td[n].w (or within 1px rounding)
// FAIL: tds all equal the same value (pop-in activated, table-layout:fixed not working)
// FAIL: any header text truncated (font-size too large or column too narrow)
```

### Step 5  -  Clean up

```js
() => { document.getElementById('print-emulation')?.remove(); return 'cleaned'; }
// Then resize_page(width=1280, height=900) to restore normal viewport
```

### What to look for in the screenshot

| Check | PASS | FAIL |
|---|---|---|
| Column headers visible | All 7 column names readable | Any header shows "Cur..." or "Sta..." (truncated) |
| Header/data alignment | Each header sits directly above its data column | Header row is a single strip; data rows have different column widths |
| No wasted left margin | Table starts near left edge of page | Large blank area to the left of the Title column |
| All rows present | 25+ rows visible per page | Only ~10 rows then blank space (content clipping) |
| Font readable | Text is small but legible | Text overflows cells or is invisible |

### Failure diagnosis

**Symptom: all `td` widths equal (e.g. all 83px)**
→ pop-in activated. `display:table-cell !important` on `th`/`td` missing from print CSS.

**Symptom: `th` and `td` widths differ by a fixed offset (e.g. th=210px, td=185px)**
→ padding mismatch. `box-sizing:border-box; padding:2px 4px` on both `th` and `td` missing.

**Symptom: header labels truncated but cell widths are correct**
→ font-size applies to `th` but not `th *`. Use `th, th *` selector.

**Symptom: column 1 (Title) has width 0**
→ nth-child selectors start at `nth-child(1)` instead of `nth-child(2)`. SAPUI5 inserts an invisible sentinel at position 1.

---

## Common cause of P-02-5 still failing after applying this block

If the print preview still clips after applying the canonical block, the most likely cause is a **missing selector** in the override list. Walk the DOM ancestor chain from the table to `<html>`:

```js
() => {
  let el = document.querySelector('table, [role="grid"]');
  const chain = [];
  while (el && el !== document.documentElement) {
    const cs = getComputedStyle(el);
    if (cs.height !== 'auto' || cs.overflow !== 'visible') {
      chain.push({ tag: el.tagName, id: el.id, cls: el.className?.slice(0,60), height: cs.height, overflow: cs.overflow });
    }
    el = el.parentElement;
  }
  return chain;
};
```

Add any non-`auto`/`visible` ancestor to the `@media print` selector list. The canonical block above covers the common SAPUI5/sap.fe/sap.tnt/WC4R/FX cases but may need to be extended for custom layouts.

---

## Why `%` column widths work  -  the ancestor-reset requirement

`sap.m.Table` column `width="22%"` resolves against the table's containing block. At print time, if any ancestor has `position: absolute/fixed`, `overflow: hidden`, or a fixed `height`, the browser's print layout engine uses that ancestor as the containing block for percentage resolution  -  not the page width. This causes `22%` to resolve against ~104px (the collapsed scroll container height) instead of ~750px (the A4 content width), producing ~23px columns instead of ~165px.

**The fix is mandatory ancestor reset** (already in the block above):

```css
.sapMPage, .sapMPageEnableScrolling, .sapMPageScrollContainer, .sapUiScrollDelegate,
.sapUiView, .sapMNav, .sapMNavItem, [class*="sapUiView"] {
  position: static !important;
  overflow: visible !important;
  height: auto !important;
  max-height: none !important;
}
```

With all ancestors forced to `position: static; height: auto`, `width: 100%` on the table resolves against the full printed page width, and `22%` on a column resolves proportionally against that. **No `mm` unit widths are needed.** `%` widths are correct and preferred  -  they adapt automatically to any paper size.

**Do NOT use `mm` units for column widths.** `mm` are absolute and ignore paper size/margin settings. `%` widths auto-adapt to any paper size.

**`media="all"` vs `media="print"` on the `<link>` tag:**

Use `media="all"` with `@media print { }` inside. Chrome's print pipeline has a known caching issue where `<link media="print">` stylesheets may not be re-fetched when the print dialog opens after a hot-reload  -  resulting in the user seeing stale (pre-fix) print CSS. With `media="all"` the stylesheet is always current. The `@media print` block inside correctly scopes all rules to print only, so there is no screen-mode impact.

```html
<!-- CORRECT: stylesheet always fetched fresh; @media print scopes to print -->
<link rel="stylesheet" href="print.css" media="all"/>

<!-- AVOID: Chrome may serve stale cached version in print dialog after hot-reload -->
<link rel="stylesheet" href="print.css" media="print"/>
```

[verified-TrialK-2026-05-28]

---

## Failure diagnosis  -  header cells right-justified, data cells left-justified

**Symptom:** Column headers appear centred or right-aligned; data cells are correctly left-aligned.

**Root cause:** The browser UA stylesheet sets `text-align: -internal-center` on all `<th>` elements. This is not a CSS class  -  it comes from the browser's built-in default stylesheet. SAPUI5's `library.css` does **not** override it for `sap.m.Table` header cells. The `text-align: left` set by SAPUI5 via inline style on `<td>` elements does not affect `<th>`.

**Fix:** Add `text-align: left !important` to the cell reset rule targeting both `th` and `td`:

```css
.sapMListTbl th, .sapMListTbl td, .sapMListTblHeaderCell, .sapMListTblCell {
  text-align: left !important;
  /* ... other properties ... */
}
```

[verified-TrialK-2026-05-28]

---

## Failure diagnosis  -  excess vertical padding in every row

**Symptom:** Rows are ~44px tall even after `padding: 2px 4px !important` is set on `th`/`td`. Data text is only ~16px tall, leaving ~28px of wasted vertical space.

**Root cause:** Two SAPUI5 row-level elements add their own vertical spacing independently of the `<td>` padding:

1. **`.sapMLIB`**  -  the `<tr>` row container class  -  has `padding: 0 1rem` set by `library.css`. This sets horizontal padding on the row itself, which combines with TD padding.
2. **`.sapMLIBContent`**  -  the inner content wrapper inside each row  -  has `line-height: var(--sapElement_LineHeight)` which resolves to ~44px at the default 14px base font size.

These survive `table-layout:fixed` and the `padding: 2px 4px` override on cells because they are on different DOM elements. You must also override the row-level elements:

```css
.sapMListTbl .sapMLIB {
  padding: 0 !important;
  height: auto !important;
  min-height: 0 !important;
}
.sapMListTbl .sapMLIBContent {
  padding: 0 !important;
  height: auto !important;
  min-height: 0 !important;
  line-height: 1.3 !important;
}
```

**Diagnostic:** Measure row heights in the browser to distinguish cell padding from row-level spacing:

```js
() => {
  const td = document.querySelector('.sapMListTbl tbody tr td:nth-child(2)');
  const lib = td?.closest('.sapMLIB');
  const libContent = lib?.querySelector('.sapMLIBContent');
  const cs = el => window.getComputedStyle(el);
  return {
    td_paddingTop: cs(td).paddingTop,
    td_height: Math.round(td.getBoundingClientRect().height),
    lib_padding: cs(lib).padding,
    libContent_lineHeight: cs(libContent).lineHeight,
  };
}
// PASS: td_paddingTop=2px, td_height≈15px (font-size 8px * 1.3 line-height + 4px padding)
// FAIL: td_paddingTop=2px but td_height=44px -> .sapMLIBContent line-height not overridden
```

[verified-TrialK-2026-05-28]

---

## Cross-reference

- `faceted-review.md` Pattern P-02 - the test that exercises this rule
- `validation.md` - to be updated to grep for the canonical block presence
- `enterprise-ready.md` ER-LAYOUT-3 - the design rule referencing this file
- `evolution/proposals-2026-05-22.md` S-PROP-14 - the proposal that motivated this file
