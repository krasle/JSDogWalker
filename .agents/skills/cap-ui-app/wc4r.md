# UI5 Web Components for React (WC4R) on CAP - Technology Overlay

**Prerequisite files:** `cap-shared.md`, `react-cap-shared.md`, `ux-standards.md`

> **`visibleRowCountMode="Auto"` requires a resolved pixel height in the container chain.** In React apps with a scrollable App container (`overflow: auto`), percentage heights break and the table header renders outside its bounding box causing misaligned headers and double scrollbars. Use `visibleRowCountMode="Fixed"` with a calculated `visibleRowCount` prop instead, or give the table an explicit `style={{ height: 'Npx' }}`:
> ```tsx
> // [X] Auto fails when container uses overflow:auto + % height
> <AnalyticalTable visibleRowCountMode="Auto" style={{ flex: 1 }} />
>
> // [OK] Fixed row count
> <AnalyticalTable visibleRowCountMode="Fixed" visibleRowCount={15} />
> ```

**Scope:** `@ui5/webcomponents-react` component API, project bootstrap, and patterns specific to WC4R. CAP fetch patterns, Vite proxy, draft lifecycle, and URL construction rules are in `react-cap-shared.md`.

**Versions verified:** `@ui5/webcomponents-react 2.21.3`, `@ui5/webcomponents 2.21.0`, `react 19.x`, `typescript 6.x`, `vite 8.x`

> **[JS] WC4R in Joule Studio 2.0:**
> WC4R is the primary and default UI technology in Joule Studio 2.0. The following
> constraints are mandatory when the environment is `[JS]` or `[JS-LOCAL]`:
>
> 1. **`optimizeDeps.exclude` is MANDATORY** in `vite.config.js` for all five `@ui5/*` packages.
>    Without it, Vite's dep-optimisation pass at startup triggers the JS preview health-check
>    timeout (`capPreviewErrorCdsWatchTimedOut`). See `joule-studio.md §6.1` for the full list.
>
> 2. **`stubZxing` Vite plugin is REQUIRED** when `@ui5/webcomponents-fiori` is installed.
>    It stubs the optional `@zxing/library` barcode dependency (not installed in the sandbox).
>    Without it, Vite crashes at startup with a missing module error. See `joule-studio.md §6.2`.
>
> 3. **`base: './'` is MANDATORY** in `vite.config.js`. Absolute paths 404 under the
>    `/react-ui/` sub-path that CDS uses to serve the app.
>
> 4. **`hmr: false`** in `vite.config.js`. UI5 Web Components have known HMR issues.
>    CDS middleware mode overrides this with its own HMR port anyway.
>
> 5. **App is viewable only inside the JS preview iframe.** No localhost URL is accessible
>    from outside the VM. DV checks (`navigate_page`, `take_screenshot`, console inspection)
>    cannot be performed by the agent in `[JS]`. Defer all DV to `[JS-LOCAL]` or manual
>    user review. See `joule-studio.md §7`.
>
> Load `joule-studio.md` whenever this file is loaded for a `[JS]` or `[JS-LOCAL]` task.

> **All generated code MUST target v2 (`@ui5/webcomponents-react ^2.x`). The following v1 components do NOT exist in v2 and must never be generated:**
>
> | v1 (forbidden) | v2 replacement |
> |---|---|
> | `TableColumn` (with `columns` prop) | `TableHeaderCell` inside `TableHeaderRow` in `headerRow` slot |
> | `TableRow`, `TableCell` (v1 pattern) | `TableRow` / `TableCell` children of `Table` directly (v2 pattern - see §3.1) |
> | `ObjectPage`, `ObjectPageSection`, `DynamicPageTitle` | Plain `<div>` + `<Card>` layout, or `<ObjectPage>` + `<ObjectPageSection>` (v2 API - see §3.3) |
> | `StandardListItem` | `ListItemStandard` |
> | `CustomListItem` | `ListItemCustom` |
> | `GroupHeaderListItem` | `ListItemGroup` |
> | `FormItem label="string"` prop | `FormItem labelContent={<Label>...</Label>}` slot prop |
> | `FormGroup titleText="string"` prop | `FormGroup headerText="string"` |
> | `ObjectNumber` | Removed in v2 - no direct equivalent | Use `ObjectStatus` with the numeric value as its text child. Note: `ObjectStatus.state` generates accessible ARIA labels that may appear as visible text in some rendering contexts - if the state label leaks visually, replace with a plain `<span>` with CSS colour instead. |
>
> Generating any v1 component causes a runtime `SyntaxError: does not provide an export named 'X'` crash on import.
>
> **v2 also removed named enum exports** (`BarDesign`, `ButtonDesign`, `ValueState`, etc.). Use string literals instead - TypeScript prop types still enforce valid values:
> ```tsx
> // v1 (broken in v2)
> import { BarDesign } from '@ui5/webcomponents-react'
> <Bar design={BarDesign.Footer} />
>
> // v2 (correct)
> <Bar design="Footer" />
> ```

---

## 1. Project bootstrap

### 1.1 Required asset imports (main.tsx - must appear before any component renders)

```tsx
import "@ui5/webcomponents-react/dist/Assets.js"
import "@ui5/webcomponents-fiori/dist/Assets.js"
```

### 1.2 Icon imports - explicit per icon, not included in Assets.js

```ts
import "@ui5/webcomponents-icons/dist/save.js"
import "@ui5/webcomponents-icons/dist/edit.js"
import "@ui5/webcomponents-icons/dist/nav-back.js"
// Add one import per icon actually used
```

Before importing any icon, verify it exists in the installed package:

```sh
# macOS / Linux
test -f node_modules/@ui5/webcomponents-icons/dist/<name>.js && echo exists || echo missing
```

```powershell
# Windows
Test-Path "node_modules\@ui5\webcomponents-icons\dist\<name>.js"
```

Known non-existent icons in 2.21.0: `books`, `passenger-train`, `plane`, `flight-2`. Use `course-book`, `flight`, `travel-itinerary` instead.

For pagination: use `slim-arrow-left` / `slim-arrow-right` - not `navigation-left-arrow` (TNT collection, separate registration required).

### 1.3 IllustratedMessage illustrations - also explicit imports

```ts
import "@ui5/webcomponents-fiori/dist/illustrations/NoData.js"
import "@ui5/webcomponents-fiori/dist/illustrations/NoEntries.js"
```

Without the import, `IllustratedMessage` throws an unhandled promise error at render time.

---

## 2. TypeScript casting for WC events

WC event targets have their own DomRef types that don't overlap with native DOM types. Use double cast:

```ts
// Input value
(e.target as unknown as { value?: string })?.value

// Checkbox / Switch checked state
(e.target as unknown as { checked?: boolean })?.checked

// StepInput, ComboBox numeric value
(e.target as unknown as { value?: number })?.value

// BreadcrumbsItem href
(e.detail?.item as unknown as HTMLAnchorElement)?.href

// RatingIndicator / Slider value
(e.target as unknown as { value: number }).value
```

---

## 3. Key component APIs

### 3.1 Table (WC4R version - NOT sap.ui.table.Table)

```tsx
<Table
  features={
    <TableSelectionMulti
      selected={[...selectedKeys].join(" ")}
      onChange={(e) => setSelectedKeys(e.target.getSelectedAsSet())}
    />
  }
>
  {items.map((item) => (
    <TableRow key={item.ID} row-key={item.ID}>
      <TableCell>{item.name}</TableCell>
    </TableRow>
  ))}
</Table>
```

- `TableSelectionMulti.onChange`: use `e.target.getSelectedAsSet()` (returns `Set<string>`) - do NOT parse `e.target.selected` string directly
- `row-key` prop on `TableRow` is required for selection to work
- To prevent row navigation on checkbox click, use `composedPath()` (standard `closest()` does not cross shadow DOM):
  ```ts
  onClick={(e) => {
    const path = e.nativeEvent.composedPath() as Element[]
    if (path.some(el => el.tagName?.toLowerCase() === "ui5-checkbox")) return
    navigate(`/items/${item.ID}`)
  }}
  ```

**CRITICAL - `ui5-table` v2 column width and pop-in control:**

The `ui5-table` v2 component is **responsive by default** and will collapse all columns into a single stacked vertical layout (pop-in mode) unless columns have explicit `width` and `min-width` HTML attributes set directly on `TableHeaderCell`.

Rules:
1. Always set `width` as a **string percentage** (e.g. `"30%"`) directly on `TableHeaderCell`, not via `style={{ width: '30%' }}`  -  inline CSS is not read by the WC pop-in logic.
2. Always set `min-width` as a **string with CSS unit** (e.g. `"200px"`)  -  not a number (`minWidth={200}` is silently ignored).
3. Percentages must sum to 100%.

```tsx
// [X] WRONG - collapses to single column; minWidth (number) and style.width ignored by WC
<TableHeaderCell minWidth={200} style={{ width: '30%' }}>Title</TableHeaderCell>

// [OK] CORRECT - width and min-width as HTML string attributes
<TableHeaderCell width="30%" min-width="200px">Title</TableHeaderCell>
<TableHeaderCell width="20%" min-width="140px">Author</TableHeaderCell>
<TableHeaderCell width="15%" min-width="120px">Genre</TableHeaderCell>
<TableHeaderCell width="10%" min-width="80px">Stock</TableHeaderCell>
<TableHeaderCell width="15%" min-width="100px">Price</TableHeaderCell>
<TableHeaderCell width="10%" min-width="60px">Currency</TableHeaderCell>
```

Verify the attributes are applied in the DOM before shipping:
```ts
// Should return e.g. { widthAttr: "30%", minWidthAttr: "200px" }
const header = document.querySelector('ui5-table-header-cell')
console.log({ widthAttr: header.getAttribute('width'), minWidthAttr: header.getAttribute('min-width') })
```
If `getAttribute('width')` returns `null`, the column will collapse.

### 3.2 Form, FormGroup, FormItem

```tsx
<Form accessibleMode={editing ? "Edit" : "Display"} layout="S1 M1 L1 XL2" labelSpan="S4 M4 L4 XL4">
  <FormGroup headerText="Details">
    <FormItem labelContent={<Label showColon required={editing}>Title</Label>}>
      {editing ? <Input aria-label="Title" value={draft.title} onInput={(e) => setField("title", (e.target as any).value)} />
               : <Text>{item.title}</Text>}
    </FormItem>
  </FormGroup>
</Form>
```

`FormItem.labelContent` is a **slot prop** - pass a `<Label>` element, not a string. Using `label="Title"` is a TypeScript error.

> **REQUIRED: `showColon` on every field label.** The WC4R `ui5-label` web component does NOT render a colon by default. `sap.m.Label` (SAPUI5) auto-renders a colon - this behaviour does NOT carry over to WC4R. Every `<Label>` adjacent to a field value MUST have the `showColon` prop. Omitting it produces labels that look like unrelated text next to values, violating the Fiori form label pattern. The SV-0 grep gate checks for bare `<Label>` without `showColon` - any match is a blocking defect.

> **REQUIRED: `aria-label` on every Input inside a FormItem.** WC4R `FormItem` provides a visual `labelContent` label but does **not** programmatically link it to the child `Input` via the shadow DOM. Without an explicit `aria-label`, screen readers and Lighthouse cannot identify the input's purpose, causing accessibility failures (Lighthouse a11y score drops from 100 to ~89 on forms). Every `Input`, suggestion input, and numeric input inside a `FormItem` MUST have `aria-label` set to the field name.
>
> ```tsx
> // [X] WRONG - FormItem label is visual only, not linked to the Input
> <FormItem labelContent={<Label showColon required>Title</Label>}>
>   <Input required aria-required="true" value={draft.title} onInput={...} />
> </FormItem>
>
> // [OK] CORRECT - explicit aria-label on Input
> <FormItem labelContent={<Label showColon required>Title</Label>}>
>   <Input required aria-required="true" aria-label="Title" value={draft.title} onInput={...} />
> </FormItem>
> ```
>
> This applies to ALL input types inside FormItem: text inputs, suggestion inputs (`showSuggestions`), numeric inputs (`type="Number"`), and currency/code inputs.

### 3.2a Input with showSuggestions - correct event pattern

**CRITICAL - `onSuggest` does not exist in WC4R v2.** The Input web component fires `input` and `selectionChange` events  -  not a custom `suggest` event. Using `onSuggest` silently does nothing.

The correct pattern for server-side live suggestion:

```tsx
const [suggestions, setSuggestions] = useState<Author[]>([])
const [displayText, setDisplayText] = useState('')
const [selectedId, setSelectedId] = useState<number | null>(null)

// Step 1: onInput fires on every keystroke - use it to fetch server suggestions
const handleInput = async (e: Event) => {
  const val = (e.target as unknown as { value?: string })?.value ?? ''
  setDisplayText(val)
  setSelectedId(null)  // clear previous selection when typing
  if (val.length < 2) { setSuggestions([]); return }
  const res = await fetchJson<ODataCollection<Author>>(
    `${BASE}/Authors?$filter=contains(tolower(name),'${val.toLowerCase()}')&$top=10&$select=ID,name`
  )
  setSuggestions(res.value ?? [])
}

// Step 2: onSelectionChange fires when user picks an item from the dropdown
// The selected item's text and data attributes are in e.detail.item
const handleSelect = (e: CustomEvent) => {
  const item = e.detail?.item as unknown as { text?: string; dataset?: { id?: string } } | undefined
  const id = parseInt(item?.dataset?.id ?? '0')
  const name = item?.text ?? ''
  if (id) {
    setSelectedId(id)
    setDisplayText(name)
  }
}

// Step 3: render with filter="None" so WC doesn't filter our server results
<Input
  showSuggestions
  filter="None"
  aria-label="Author name"
  value={displayText}
  onInput={handleInput}
  onSelectionChange={handleSelect}
  placeholder="Search for an author"
>
  {suggestions.map(a => (
    // Pass ID in data-id for retrieval in onSelectionChange
    <SuggestionItem key={a.ID} text={a.name} data-id={a.ID} />
  ))}
</Input>
```

**Why `filter="None"`:** WC4R's built-in client-side filter (`"StartsWith"`, `"Contains"`, etc.) runs on `SuggestionItem` text. Since we do server-side filtering, this would double-filter and hide results. Always set `filter="None"` when populating suggestions from OData.

**Why NOT `onSuggest`:** The `onSuggest` prop appears in some WC4R v1 examples but was removed in v2. It maps to a non-existent DOM event and silently does nothing.

**Why NOT `onSuggestionItemSelect`:** Also a v1 API. In v2 use `onSelectionChange`.

### 3.2b TextArea for long-text fields

Any form input bound to a CDS field where `MaxLength >= 100` or whose name matches `/description|notes|remark|comment|message|text|body/i` MUST use `<TextArea>` - never `<Input>`.

```tsx
// [X] WRONG - single-line Input for a String(1000) description field
<Input value={draft.description} onInput={...} />

// [OK] TextArea with resize and 4 visible rows
<TextArea
  aria-label="Description"
  value={draft.description ?? ''}
  rows={4}
  style={{ width: '100%', resize: 'vertical' }}
  onInput={(e) => setDraft(d => ({ ...d, description: (e.target as any).value }))}
/>
```

In read-only view mode, display with `whiteSpace: 'pre-wrap'` so stored line breaks are preserved:
```tsx
<Text style={{ fontFamily: 'var(--sapFontFamily)', whiteSpace: 'pre-wrap' }}>
  {incident.description ?? '--'}
</Text>
```

**Gate:** `rg '<Input[^>]*aria-label="(Description|Notes|Comment|Remark|Message)"' app/**/*.tsx` -> zero matches.

### 3.3 ObjectPage with sections

```tsx
<ObjectPage>
  <ObjectPageSection id="details" titleText="Details">
    <ObjectPageSubSection id="general" titleText="General">
      {/* content */}
    </ObjectPageSubSection>
  </ObjectPageSection>
  <ObjectPageSection id="notes" titleText="Notes">...</ObjectPageSection>
</ObjectPage>
```

Multiple sections automatically generate an anchor tab bar. No additional configuration needed.

### 3.4 SegmentedButton - event and selection

```tsx
<SegmentedButton
  onSelectionChange={(e) => {
    const items = e.detail?.selectedItems
    const first = Array.isArray(items) ? items[0] : items
    setMode((first as HTMLElement | undefined)?.dataset.mode ?? "list")
  }}
>
  <SegmentedButtonItem data-mode="grid" selected={mode === "grid"}>Grid</SegmentedButtonItem>
  <SegmentedButtonItem data-mode="list" selected={mode === "list"}>List</SegmentedButtonItem>
</SegmentedButton>
```

- Use `selected` prop (not `pressed`) to mark the active item
- `e.detail.selectedItem` does not exist - use `selectedItems` (array)

### 3.5 Popover - imperative open pattern `[verified-TrialK-2026-05-29]`

WC4R v2 `<Popover>` has three traps that silently prevent it from opening. Use the imperative DOM API.

| Trap | Symptom | Root cause |
|---|---|---|
| `open={state}` prop via `setState` | Popover mounts but never opens (`pop.open` stays false) | React state changes do not reliably drive the WC `open` attribute in v2 |
| `pop.openPopup(element)` | Argument silently ignored; popover still closed | WC v2 `openPopup()` signature takes NO arguments; `element` is discarded |
| No `setTimeout` wrapper | Popover opens then immediately closes | The WC "click-outside" handler fires in the same event loop tick as the opener click |

**Correct imperative pattern:**

```tsx
const btnRef = useRef<HTMLElement>(null)
const popRef = useRef<HTMLElement>(null)

const handleOpen = (e: React.MouseEvent) => {
  e.stopPropagation()
  // Guard: nativeEvent may be undefined for WC custom events
  if (e.nativeEvent?.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation()
  // setTimeout(0): lets the click-outside handler fire against CLOSED state first
  setTimeout(() => {
    const btn = btnRef.current as any
    const pop = popRef.current as any
    if (btn && pop?.openPopup) {
      pop.opener = btn   // REQUIRED: set opener property BEFORE calling openPopup
      pop.openPopup()    // NO arguments in WC v2
    }
  }, 0)
}

<Button ref={btnRef} onClick={handleOpen}>...</Button>
<Popover
  ref={popRef}
  preventInitialFocus       // prevents auto-focus of first child on open (causes text selection on links)
  headerText="Details"
  style={{ minWidth: '220px', maxWidth: '400px' }}
>
  {/* content - add tabIndex={-1} to any <Link> at bottom to also prevent selection */}
  <Link href="/..." tabIndex={-1}>View All</Link>
</Popover>
```

**Popover `headerText` rule:** use the specific entity name/title (e.g. `headerText={incident.title}`), NOT a generic type label ("Incident Details"). The header is the primary space for identification - don't waste it on a label that just repeats the context. See ux-standards.md §20.

### 3.6 FK / association fields - rich Popover pattern `[verified-TrialK-2026-05-29; ER-UX-2]`

Any FK field whose referenced entity has >= 2 user-relevant properties MUST render as a clickable button opening a Popover, not plain text. See ER-UX-2 in `enterprise-ready.md` for the rule.

**Implementation pattern (reusable component):**

```tsx
// CustomerPopover.tsx - adapt for any FK entity
export default function CustomerPopover({ customerId, customerName }: Props) {
  const btnRef = useRef<HTMLElement>(null)
  const popRef = useRef<HTMLElement>(null)
  const [customer, setCustomer] = useState<CustomerFull | null>(null)
  const [loading, setLoading] = useState(false)

  const handleOpen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (e.nativeEvent?.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation()
    setTimeout(() => {
      const btn = btnRef.current as any
      const pop = popRef.current as any
      if (btn && pop?.openPopup) { pop.opener = btn; pop.openPopup() }
    }, 0)
    if (!customer && !loading && customerId) {
      setLoading(true)
      fetchJson(`/service/Customers('${customerId}')?$expand=addresses($top=1)&$select=...`)
        .then(setCustomer).finally(() => setLoading(false))
    }
  }, [customer, loading, customerId])

  if (!customerId) return <span style={{ color: 'var(--sapContent_LabelColor)' }}>--</span>

  return (
    <>
      <Button ref={btnRef} design="Transparent" tooltip="View details" onClick={handleOpen}
        style={{ color: 'var(--sapLinkColor)', textDecoration: 'underline', ... }}>
        {customerName ?? customerId}
      </Button>
      <Popover ref={popRef} preventInitialFocus headerText="Customer Details" ...>
        {loading && <div>Loading...</div>}
        {customer && (
          <>
            <Icon name="customer" /> <span>{customer.name}</span>
            <Icon name="email" /> <a href={`mailto:${customer.email}`}>{customer.email}</a>
            <Icon name="phone" /> <a href={`tel:${customer.phone}`}>{customer.phone}</a>
            {/* cross-link - tabIndex={-1} to prevent auto-selection */}
            <Link href={`/incidents?customer=${customerId}&customerName=${encodeURIComponent(customer.name)}`}
              tabIndex={-1}>View All Incidents</Link>
          </>
        )}
      </Popover>
    </>
  )
}
```

Key rules:
- Lazy-load data on first open only - no page-load cost
- Stop both React synthetic event AND native event propagation (see §3.5 trap 3)
- Pass the entity name in cross-navigation URLs (`?customer=ID&customerName=Name`) so the destination can display `Name (ID)` in chips and inputs without an extra fetch

### 3.6 AnalyticalTable

```tsx
import { AnalyticalTable } from "@ui5/webcomponents-react"
import type { AnalyticalTableColumnDefinition } from "@ui5/webcomponents-react"
import type { CellInstance } from "@ui5/webcomponents-react/dist/components/AnalyticalTable/types/index.js"

const columns: AnalyticalTableColumnDefinition[] = [
  { Header: "Name",  accessor: "name",  minWidth: 160 },
  { Header: "Stock", accessor: "stock", minWidth: 80,
    Cell: (instance: CellInstance) => <ObjectStatus state={instance.value > 10 ? "Positive" : "Negative"}>{instance.value}</ObjectStatus> },
]

// MUST wrap data and columns in useMemo - non-memoized props cause full re-renders
const memoColumns = useMemo(() => columns, [])
const memoData    = useMemo(() => items, [items])

<AnalyticalTable
  data={memoData}
  columns={memoColumns}
  loading={loading}
  sortable groupable filterable
  selectionMode="Multiple"
  visibleRowCountMode="Auto"
  onRowClick={(e) => {
    const id = (e.detail?.row as any)?.original?.ID
    if (id) navigate(`/items/${id}`)
  }}
/>
```

`CellInstance` is NOT exported from the main `@ui5/webcomponents-react` index - use the deep import path.

Two columns sharing the same `accessor` must have distinct `id` fields - otherwise only the first renders.

### 3.7 FilterBar (React component - not a WC)

```tsx
<FilterBar
  showGoOnFB showClearOnFB
  activeFiltersCount={activeCount}
  onGo={applyFilters}
  onClear={resetFilters}
  search={<Input placeholder="Search..." value={search} onInput={(e) => setSearch((e.target as any).value)} />}
>
  <FilterGroupItem filterKey="status" label="Status" active={status !== null}>
    <Select onChange={(e) => {
      const sel = e.detail?.selectedOption as unknown as HTMLElement | undefined
      setStatus(sel?.dataset.id ?? null)
    }}>
      <Option data-id="">All</Option>
      <Option data-id="active">Active</Option>
    </Select>
  </FilterGroupItem>
</FilterBar>
```

`FilterGroupItem.filterKey` must be unique within the FilterBar (no whitespace). `activeFiltersCount` is manually calculated by the app - FilterBar does not auto-count.

### 3.8 ShellBar notifications

```tsx
<ShellBar
  id="app-shellbar"
  showNotifications
  notificationsCount={count > 0 ? String(count) : undefined}
  onNotificationsClick={() => setOpen((o) => !o)}
>
  <Popover open={open} opener="app-shellbar" ...>
    {/* NotificationList */}
  </Popover>
</ShellBar>
```

`notificationsCount` is a **string** prop. `opener` must match the ShellBar element `id` - the tag name does not work.

**`ShellBar.logo` slot - only `<img>` or an SAP logo element:**
The `logo` prop accepts `ReactNode` but the ShellBar's internal slot only allocates space for a standard image-sized element. Passing a WC4R `<Avatar>` component in the `logo` slot renders the avatar partially outside the slot boundary (clipped). Use a plain `<img>` tag or omit the `logo` prop entirely (the ShellBar title/icon is sufficient for most apps):
```tsx
// [X] Avatar overflows its slot and is visually clipped
<ShellBar logo={<Avatar icon="course-book" />} />

// [OK] Use an img or omit logo
<ShellBar logo={<img src="/logo.png" alt="App logo" />} />
// or simply:
<ShellBar primaryTitle="My App" />
```

### 3.9 ObjectStatus and Tag ARIA noise - use span for KPI values

`ObjectStatus.state` generates accessible ARIA labels that are injected as visible text nodes in some rendering contexts (e.g. "Invalid entry" for state=Negative). When ObjectStatus is used to display a KPI number, this ARIA label renders alongside the value, creating confusing output like "Object Status" 42 "Invalid entry".

Rule:
- **Use `<span style={{ color: 'var(--sapNegativeColor)' }}>` for KPI numbers and summary values** where the ARIA state label would add noise, not meaning.
- Reserve `ObjectStatus` for interactive table cells where the semantic state label (e.g. "Warning issued", "Entry successfully validated") genuinely describes the cell's status to screen reader users.

```tsx
// KPI tile (ARIA noise risk): use span
<span style={{ color: 'var(--sapPositiveColor)', fontFamily: 'var(--sapFontFamily)' }}>
  {count}
</span>

// Table cell (semantic state adds value): use ObjectStatus
<ObjectStatus state={item.stock > 10 ? 'Positive' : 'Negative'}>
  {item.stock}
</ObjectStatus>
```

### 3.11 Wizard - requires a fixed-height container

`Wizard` manages its own scroll. It must be inside a container with a definite height:

```tsx
<Dialog open={open} style={{ width: "42rem", height: "32rem" }}>
  <div style={{ height: "100%", overflow: "hidden" }}>
    <Wizard style={{ height: "100%" }}>
      <WizardStep selected={step === 1} disabled={step < 1} titleText="Step 1" data-step="1">
        {/* content */}
      </WizardStep>
    </Wizard>
  </div>
</Dialog>
```

### 3.10 Token deletion - use MultiInput.onTokenDelete (not Token.onDelete)

```tsx
<MultiInput
  onTokenDelete={(e) => {
    const token = e.detail?.tokens?.[0] as { text?: string } | undefined
    if (token?.text) removeToken(token.text)
  }}
>
  {tokens.map((t) => <Token key={t} text={t} />)}
</MultiInput>
```

`Token` has no `onDelete` prop.

---

## 4. Theme switching

```ts
import { setTheme } from "@ui5/webcomponents-base/dist/config/Theme.js"

setTheme("sap_horizon")        // default
setTheme("sap_horizon_dark")
setTheme("sap_fiori_3")
setTheme("sap_fiori_3_dark")
setTheme("sap_fiori_3_hcb")    // high contrast black
```

All WC components update immediately - no page reload.

### 4.1 OS dark mode detection - apply in `main.jsx` before `createRoot`

Dark mode in SAP Fiori apps is handled by **theme switching** (`sap_horizon` -> `sap_horizon_dark`), NOT by CSS `@media (prefers-color-scheme: dark)`. The WC4R component library does not respond to OS dark mode automatically - you must call `setTheme()` with the correct theme based on the OS preference.

**Always add this to `main.jsx` immediately after the Assets imports, before `createRoot`:**

```tsx
// Apply SAP theme matching OS dark/light mode preference
import { setTheme } from "@ui5/webcomponents-base/dist/config/Theme.js"
setTheme(
  window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "sap_horizon_dark"
    : "sap_horizon"
)
```

Place this AFTER the asset imports (they set up theme infrastructure) but BEFORE `createRoot` (so components render with the correct theme from the first paint).

**Do NOT** add a `@media (prefers-color-scheme: dark)` block in CSS - this has no effect on SAP Web Components which use CSS custom properties injected by the active theme, not media queries.

---

## 5. ViewSettingsDialog for sort/filter

```tsx
<ViewSettingsDialog
  open={open}
  onClose={() => setOpen(false)}
  onConfirm={(e) => {
    const { sortBy, sortOrder } = e.detail as { sortBy: string; sortOrder: string }
    applySort(sortBy, sortOrder === "Descending")
    setOpen(false)
  }}
  sortItems={
    <>
      <SortItem text="Name" selected />
      <SortItem text="Price" />
    </>
  }
/>
```

`sortItems` is a slot prop - pass a JSX fragment. `onConfirm` detail: `{ sortBy: string, sortOrder: "Ascending"|"Descending" }`.

---

## 6. $batch from WC4R apps

See `react-cap-shared.md §6` for the shared `sendBatch` utility. WC4R-specific note: bulk delete via `$batch` is a common pattern for the "select all + delete" flow from `AnalyticalTable`.

---

## 7. Toolbar for responsive filter bars

`Toolbar` clips content in narrow containers and shows a horizontal scrollbar. For responsive filter bars, use `FlexBox` with `wrap="Wrap"`:

```tsx
<FlexBox wrap="Wrap" gap="0.5rem" alignItems="Center">
  {/* filter controls wrap to next line at narrow widths */}
</FlexBox>
```

---

## 8. Pagination - no built-in Paginator

WC4R has no `Paginator` component. Build from `Button`, `Select`, `Text`:

```tsx
<FlexBox alignItems="Center" justifyContent="End" gap="1rem">
  <Select onChange={...}>
    {[5, 10, 25, 50].map((s) => <Option key={s} data-value={s} selected={s === pageSize}>{s}</Option>)}
  </Select>
  <Text>{from}-{to} of {total}</Text>
  <Button icon="slim-arrow-left"  tooltip="Previous page" disabled={page === 0} onClick={prevPage} />
  <Button icon="slim-arrow-right" tooltip="Next page"     disabled={page >= lastPage} onClick={nextPage} />
</FlexBox>
```

Reset `page` to `0` on every filter change to avoid landing on a page beyond the new result count.

---

## 9. Report / print pages

### 9.1 Never use `ui5-table` (WC4R `Table`) for print views

`ui5-table` in v2 is a responsive component. When `minWidth` values are set on `TableHeaderCell` but no explicit `width` is given, the table may collapse all columns into a **single stacked column** - all 5 fields of each row appear one per line rather than side by side. This makes the report unreadable on screen and even worse on print.

**Root cause:** `TableHeaderCell` uses `minWidth` to decide when a column pops into the single-column responsive view. Without explicit `width` on each header cell, the table cannot distribute horizontal space and falls back to a stacked layout.

**Rule: always use a plain HTML `<table>` for report pages.** It is the only element that is 100% reliable for both on-screen multi-column layout and print output across all browsers.

```tsx
// [X] WRONG - collapses to single column when widths not set explicitly
<Table headerRow={
  <TableHeaderRow sticky>
    <TableHeaderCell minWidth={220}>Title</TableHeaderCell>
    <TableHeaderCell minWidth={120}>Status</TableHeaderCell>
  </TableHeaderRow>
}>

// [OK] CORRECT - plain HTML table, always multi-column, print-safe
<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
  <thead>
    <tr style={{ background: 'var(--sapList_HeaderBackground)', borderBottom: '2px solid var(--sapList_BorderColor)' }}>
      <th style={{ width: '40%', padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600 }}>Title</th>
      <th style={{ width: '15%', padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600 }}>Status</th>
    </tr>
  </thead>
  <tbody>
    {rows.map((row, i) => (
      <tr key={row.ID} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--sapList_AlternatingBackgroundColor)', borderBottom: '1px solid var(--sapList_BorderColor)' }}>
        <td style={{ padding: '0.5rem 0.75rem' }}>{row.title}</td>
        <td style={{ padding: '0.5rem 0.75rem' }}>{row.status}</td>
      </tr>
    ))}
  </tbody>
</table>
```

CSS variables `--sapList_HeaderBackground`, `--sapList_BorderColor`, `--sapList_AlternatingBackgroundColor` are always defined by the SAP Horizon theme and integrate the plain HTML table visually with the rest of the WC4R app.

### 9.2 `sticky` on `TableHeaderRow` causes print clipping

`<TableHeaderRow sticky>` enables an internal scroll container inside the WC component. On print, this clips content to the visible area and produces a scrollbar in the print preview. Always omit `sticky` on report pages.

### 9.3 Print CSS - tech-agnostic `@media print` block in `index.css`

The app shell sets `overflow: hidden` on `html`, `body`, and `#root` so the in-page scroll container works on screen. For print, every one of these constraints must be removed or the browser clips the output to the viewport height.

**Never rely on inline `<style>` blocks in the component** - they are harder to maintain and the `div[style*="overflow: hidden"]` attribute selector does NOT match CSS-class-driven overflow (the common case). Put all print rules in `index.css`.

Add this block to every WC4R app's `index.css`:

```css
@media print {
  /* (1) Unlock full document height - undo all overflow:hidden ancestors */
  html, body, #root, * {
    overflow: visible !important;
    height: auto !important;
    max-height: none !important;
  }

  /* (2) Hide navigation chrome */
  .no-print { display: none !important; }

  /* (3) Show print-only header (report title, date, record count) */
  .print-only { display: block !important; }

  /* (4) Repeat <thead> on every printed page - browser-native, zero JS */
  thead { display: table-header-group !important; }

  /* (5) Prevent a single row splitting across a page break */
  tr { page-break-inside: avoid; }

  /* (6) A4 portrait, 1.5cm top/bottom, 1cm sides */
  @page { size: A4 portrait; margin: 1.5cm 1cm; }
}
```

### 9.4 Fetch limit for reports

Reports must always fetch **all** records. Use `$top=9999` (or remove `$top` entirely if the dataset is guaranteed small). Never use a `PAGE_SIZE` constant below the total record count on a report page - it silently truncates data.

```ts
// [X] WRONG - silently shows only 200 of N records
const MAX_REPORT = 200
fetch(`${BASE}/Incidents?$top=${MAX_REPORT}...`)

// [OK] CORRECT - fetches all
const MAX_REPORT = 9999
fetch(`${BASE}/Incidents?$top=${MAX_REPORT}...`)
```

### 9.5 Post-generation checklist - report pages

- [ ] Report uses a plain HTML `<table>`, **not** `ui5-table` / WC4R `Table`
- [ ] `<th>` elements have explicit `width` percentages summing to 100%
- [ ] `$top=9999` (or no `$top`) on the report fetch
- [ ] Toolbar / print button wrapped in `className="no-print"`
- [ ] Print-only header (title + generated date + count) in a `className="print-only"` div with `style={{ display: 'none' }}`
- [ ] `@media print` block in `index.css` (not inline `<style>`)
- [ ] No `sticky` on any header row on the report page

### 9.6 Never use native `<input type="date">` - use `DatePicker` instead

Native HTML `<input type="date">` does not participate in the SAP theme. In dark mode it renders with a white OS-level background regardless of the active SAP theme (`sap_horizon_dark`), because browser-native inputs receive their styling from the OS, not from SAP CSS custom properties.

**Always use the WC4R `DatePicker` component** which is shadow-DOM-scoped and fully theme-aware:

```tsx
// [X] WRONG - white background in dark mode; not theme-aware
<input
  type="date"
  value={dateFrom}
  onChange={e => setDateFrom(e.target.value)}
  style={{ border: '1px solid var(--sapField_BorderColor)' }}
/>

// [OK] CORRECT - renders with correct dark/light theme colours
import { DatePicker } from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/appointment-2.js'  // icon required by DatePicker

<DatePicker
  value={dateFrom}
  formatPattern="yyyy-MM-dd"
  placeholder="YYYY-MM-DD"
  onChange={e => setDateFrom(e.detail?.value ?? '')}
/>
```

Note: `DatePicker` fires `onChange` with `e.detail.value` (not `e.target.value`). The `appointment-2` icon must be imported in `main.tsx` or the calendar icon will not render.

### 9.7 Recharts charts - accessible wrapper without blocking clicks

Recharts does not add ARIA attributes to its SVG elements. To provide an accessible description for screen readers, add `aria-label` directly on `ResponsiveContainer`  -  recharts passes this through to the outer `<div>`:

```tsx
// [OK] CORRECT - aria-label on ResponsiveContainer, clicks pass through
<ResponsiveContainer width="100%" height={300}
  aria-label="Bar chart: total stock by genre. Click a bar to filter books by genre.">
  <BarChart data={data}>
    <Bar dataKey="value" onClick={(data) => navigate(`/items?genre=${data.genre}`)} cursor="pointer" />
  </BarChart>
</ResponsiveContainer>
```

**CRITICAL - Do NOT wrap recharts in `<div role="img">`:**

```tsx
// [X] WRONG - role="img" absorbs mouse events, blocking bar clicks entirely
<div role="img" aria-label="...">
  <ResponsiveContainer>
    <BarChart>
      <Bar onClick={...} />  {/* onClick never fires! */}
```

`role="img"` makes the container act as a non-interactive image region. Mouse events are intercepted by the div before reaching the recharts SVG bars. Always use `aria-label` on `ResponsiveContainer` directly.

**CRITICAL - Put `onClick` on `<Bar>`, NOT on `<BarChart>`:**

`BarChart.onClick` fires only when `activePayload` is populated, which requires the cursor to be precisely over a bar. It silently does nothing when clicking empty chart areas, axis labels, or between bars.

`Bar.onClick` fires directly when any part of that specific bar rectangle is clicked  -  this is reliable and consistent:

```tsx
// [X] FRAGILE - only fires when hovering exactly over a bar; silent elsewhere
<BarChart onClick={(data) => {
  if (data?.activePayload?.[0]) {
    navigate(`/books?genre=${data.activePayload[0].payload.genreName}`)
  }
}}>
  <Bar dataKey="totalStock" />
</BarChart>

// [OK] RELIABLE - fires on any click of the bar rectangle
<BarChart>
  <Bar
    dataKey="totalStock"
    cursor="pointer"
    onClick={(data: { genreName: string }) => {
      navigate(`/books?genre=${encodeURIComponent(data.genreName)}`)
    }}
  />
</BarChart>
```

The `data` argument to `Bar.onClick` is the full data object for that bar (the same object from your `data` array). For `Cell`-coloured bars, add `onClick` to the `Bar` element, not to individual `Cell` components.

**Small / zero-height bars are hard to click  -  add `background` prop as a full-height hit area:**

When a bar's value is 0 (or very small), the SVG rect is too small to click reliably. Recharts' built-in `background` prop renders a full-height transparent rect behind each bar that shares the same `onClick`. This gives every column a large, easy click target regardless of data value:

```tsx
<Bar
  dataKey="count"
  cursor="pointer"
  // Full-height transparent background = clickable hit area for zero/small bars
  background={{ fill: 'transparent', cursor: 'pointer' }}
  onClick={(data: { stockKey: string }) => {
    navigate(data.stockKey ? `/books?stock=${data.stockKey}` : '/books')
  }}
>
  {colors.map((color, i) => <Cell key={i} fill={color} />)}
</Bar>
```

The `background` rect covers the full chart height for each category, so "Critical (0-5)" with 0 books is just as clickable as "Adequate (16+)" with 103 books.

### 9.8 Never use native HTML buttons or inputs in WC4R apps

Native HTML interactive elements (`<button>`, `<a>`, `<input>`, `<select>`) do not participate in the SAP Horizon theme. They render with OS-native or browser-default styling that:
- Ignores SAP CSS custom property tokens (colours, spacing, typography)
- Shows a white background in dark mode (`sap_horizon_dark`)
- Produces inconsistent visual weight alongside ui5 components

**Always use the WC4R equivalent:**

| Forbidden (native) | Required (WC4R) |
|---|---|
| `<button onClick={...}>` | `<Button onClick={...}>` |
| `<a href="...">` | `<Button design="Transparent">` or `<Link href="...">` |
| `<input type="date">` | `<DatePicker>` (see §9.6) |
| `<select>` | `<Select>` |
| `<input type="text">` outside Form | `<Input>` |

```tsx
// [X] WRONG - native button ignores theme, breaks dark mode
<button onClick={() => navigate('/new')} style={{ background: 'var(--sapButton_Emphasized_Background)' }}>
  Add Item
</button>

// [OK] CORRECT - ui5-button fully theme-aware
<Button design="Emphasized" icon="add" onClick={() => navigate('/new')} tooltip="Add a new item">
  Add Item
</Button>
```

---

## 10. Post-generation checklist (WC4R)

- [ ] `Assets.js` imported before any component in `main.tsx`
- [ ] Every icon used has an explicit import; icons verified to exist in the installed version
- [ ] Every `useEffect` fetch has the `cancelled` flag (see `react-cap-shared.md §2.1`)
- [ ] Every fetch checks `r.ok` before parsing
- [ ] No `URLSearchParams` for OData `$` key names
- [ ] Draft entity list queries include `$filter=IsActiveEntity eq true`
- [ ] `AnalyticalTable` `data` and `columns` wrapped in `useMemo`
- [ ] `FormItem.labelContent` uses `<Label showColon>` element (not string prop, not bare `<Label>` without showColon)
- [ ] Every `<Label>` adjacent to a field value or form input has `showColon` prop - bare `<Label>` renders without colon (unlike sap.m.Label which auto-colons)
- [ ] **Every `Input` inside a `FormItem` has an explicit `aria-label` attribute** - WC4R FormItem does NOT auto-link label to input via shadow DOM (see §3.2)
- [ ] **`ui5-table` `TableHeaderCell` uses `width="30%"` and `min-width="200px"` as HTML string attributes** - NOT `minWidth={200}` (number, silently ignored) and NOT `style={{ width: '30%' }}` (CSS, not read by WC pop-in logic). Verify with `getAttribute('width')` returning non-null (see §3.1)
- [ ] **No native HTML `<button>`, `<select>`, or `<a>` elements** - use `Button`, `Select`, `Link` from `@ui5/webcomponents-react` (see §9.8)
- [ ] **Recharts charts use `aria-label` on `ResponsiveContainer`, NOT `<div role="img">` wrapper** - `role="img"` blocks click events (see §9.7)
- [ ] **Recharts `<Bar onClick>` used instead of `<BarChart onClick>`** - `BarChart.onClick` only fires when cursor is exactly over a bar; `Bar.onClick` fires on any click of the bar rectangle (see §9.7)
- [ ] **Recharts `<Bar background={{ fill: 'transparent', cursor: 'pointer' }}>` added** on any chart that may have zero-height or very short bars, so every category column is clickable regardless of data value (see §9.7)
- [ ] **`Input` with `showSuggestions` uses `onInput` + `onSelectionChange` + `filter="None"`** - NOT `onSuggest` (does not exist in v2) or `onSuggestionItemSelect` (v1 API, removed) (see §3.2a)
- [ ] `TableSelectionMulti` uses `getSelectedAsSet()` (not string parsing)
- [ ] **`Popover` opened via imperative pattern: `pop.opener = btn; pop.openPopup()` inside `setTimeout(0)`, with `preventInitialFocus` prop on the Popover** - do NOT use `open={state}` prop or `pop.openPopup(element)` (see §3.5)
- [ ] **`Popover headerText` uses the specific entity name/title, not a generic type label like "Details"** (ux-standards.md §20)
- [ ] **Links inside Popover content have `tabIndex={-1}`** to prevent auto-focus and text selection on open (see §3.5)
- [ ] `MultiInput.onTokenDelete` used (not `Token.onDelete`)
- [ ] All icon-only buttons have `tooltip`
- [ ] `AnalyticalTable` does NOT use `visibleRowCountMode="Auto"` inside a `%`-height container - use `"Fixed"` with a calculated `visibleRowCount` instead
- [ ] Every icon used in a JSX `icon="..."` prop has a matching `import '@ui5/webcomponents-icons/dist/<name>.js'` in `main.tsx` - maintain an icon import comment block at the top of `main.tsx` listing all registered icons
- [ ] Bare `<div>` or `<span>` elements containing text outside WC shadow DOM use `style={{ fontFamily: 'var(--sapFontFamily)' }}` or a WC4R `<Text>` component - bare HTML elements do not inherit the SAP theme font automatically
- [ ] `Decimal(N,M)` fields shown WITHOUT a currency symbol call `.toFixed(M)` before display. `Decimal` fields shown AS prices use `Intl.NumberFormat({ style:'currency', currency: code })` WITHOUT `minimumFractionDigits` override (see `react-cap-shared.md §1.6` - JPY must show ¥88 not ¥88.00)
- [ ] `ObjectStatus` is NOT used to display raw enum codes - the `state` prop generates accessible ARIA labels that may leak as visible text; map codes to human-readable labels before display
- [ ] Every chart and KPI tile on Overview pages has an onClick handler (no chart left non-clickable)
- [ ] Chart onClick + list page $filter + Select key-remount + active filter indicator are all implemented together (four-part contract, see react-cap-shared.md §11)
- [ ] Every icon-only button has a `tooltip` prop (UXC-032)
- [ ] Truncated text in table cells has a `title` attribute on the `<span>` with the full value (UXC-032)
- [ ] KPI tiles have a `title` attribute providing denominator context (UXC-032)
- [ ] For each Create/Edit form: FK select fields either allow creating a new referenced entity or have a "Manage [Entities]" link (UXC-031)
- [ ] **Inline "New [Entity]" creation dialog captures all meaningful fields** (not just name) - compare dialog fields against entity schema; at minimum: required fields + fields a user would need to set at creation time (ER-FORM-2b, ux-standards.md §19.3)
- [ ] **Status/urgency/classification columns use `STATUS_CSS_TOKENS` / `URGENCY_CSS_TOKENS` maps with SAP semantic CSS variable tokens - NOT plain unstyled text (ER-UX-1)**
- [ ] **FK fields with >= 2 user-relevant properties in the referenced entity render as a Popover component, not plain `<span>` or `<Text>` (ER-UX-2, §3.6)**
- [ ] **Every FK suggestion input searches by BOTH name AND exact ID: `contains(tolower(name),'...') or ID eq '...'` (ER-FORM-5)**
- [ ] **Every FK suggestion input displays `Name (ID)` at rest (blurred) and name-only when focused; filter chips show `Name (ID)` (ER-FORM-4)**
- [ ] **`Button design="Transparent"` text alignment: use `::part(button) { justify-content: flex-start }` in CSS when left-aligned label is needed - `style` prop does NOT reach shadow-DOM inner button**
- [ ] `index.html` `<title>` tag is set to the human-readable app name - Vite scaffolding sets it to the project folder path by default (e.g. `c:\projects\my-app-name`); replace with a real title like `My App Name`
