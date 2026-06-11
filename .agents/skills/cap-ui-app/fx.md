# FX Components for React on CAP - Technology Overlay

**Prerequisite files:** `cap-shared.md`, `react-cap-shared.md`, `ux-standards.md`

> **FxLayout nav item icons:** Always import icons from `@sap-ui/fx-components/icons` barrel - do NOT use Lucide React icons for nav item `icon` props. FxLayout renders nav icons through its own icon rendering pipeline which may not handle external JSX React elements from Lucide. If Lucide icons are used, nav items may render icon-only or may not render the icon at all:
> ```ts
> // [BAD] Lucide icons may not render in FxLayout nav
> import { Home } from 'lucide-react'
> { name: 'overview', text: 'Overview', icon: <Home /> }
>
> // [OK] Use @sap-ui/fx-components/icons barrel
> import { HomeIcon } from '@sap-ui/fx-components/icons'
> { name: 'overview', text: 'Overview', icon: <HomeIcon style={{ width: '1rem', height: '1rem' }} aria-hidden /> }
> ```

> **`FxNavItemConfig` uses `text` (not `label`) for the nav item display label.** Using `label: 'Overview'` is silently ignored at runtime - nav items render icon-only with no text. TypeScript may not catch this if excess-property checking is not active. Always verify against the `dist/types/fx.d.ts` type definition and use `text: 'Overview'`.
>
> **`noStartPane: true` must be set on every nav item** when only a center pane is needed for all navigation modes. Setting it only on some items leaves a start-pane placeholder gap in the FxLayout for the items without it:
> ```ts
> const NAV: FxNavItemConfig[] = [
>   { name: 'overview', text: 'Overview', icon: <HomeIcon />, noStartPane: true },
>   { name: 'list',     text: 'Items',    icon: <ListIcon />, noStartPane: true },
> ]
> ```

**Scope:** `@sap-ui/fx-components` component API, project bootstrap, CSS setup, and layout patterns. CAP fetch patterns, Vite proxy, draft lifecycle, and URL construction rules are in `react-cap-shared.md`.

**Version verified:** `@sap-ui/fx-components 1.0.8`, `React 19`, `TypeScript 6`, `Vite 8`, `Tailwind CSS v4`

---

## 1. Project bootstrap - three CSS files required

Using only `styles.css` produces three distinct bugs. All three files are required:

```ts
// main.tsx - import order matters
import "./index.css"                                // Tailwind-processed (see below)
import "@sap-ui/fx-components/components.css"      // non-Tailwind: scrollbars, animations
import { initFxI18n } from "@sap-ui/fx-components"

initFxI18n("en")   // MUST be called before createRoot - or UI shows raw i18n keys

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

> **`ThemeProvider` is NOT present in `dist/index.js` as of `@sap-ui/fx-components 1.0.8`.** Do not import or wrap the app in `ThemeProvider` - it will throw `does not provide an export named 'ThemeProvider'` at runtime. The app functions correctly without a theme wrapper; `initFxI18n("en")` is sufficient for initialization.

### 1.1 src/index.css (processed by Tailwind Vite plugin)

```css
@import "tailwindcss";
@import "@sap-ui/fx-components/theme.css";         /* sapphire-* utility classes */
@import "@sap-ui/fx-components/tokens.css";        /* light + dark token values */

/* Scan FX component bundles for Tailwind classes */
@source "../../node_modules/@sap-ui/fx-components/dist/chunk-*.js";
/* Scan app source */
@source ".";

/* h-screen fix - Tailwind v4 uses 100dvh which != innerHeight in Chrome */
.h-screen { height: 100% !important; }

html, body, #root { height: 100%; margin: 0; padding: 0; overflow: hidden; }
body { background-color: var(--background); color: var(--foreground); }
@custom-variant dark (&:is(.dark *, .theme-dark *));
```

### 1.2 OS dark mode detection - add inline script to `index.html`

Dark mode in FX apps is controlled by the `.dark` class on `<html>` (the `@custom-variant dark` in `index.css` targets `.dark *`). The `.dark` class must be set **before React mounts** to avoid a flash of light theme.

**Always add this inline script to `index.html` in the `<head>`:**

```html
<!-- Apply .dark class for FX Tailwind dark variant before React mounts -->
<script>
  (function() {
    var mq = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
    if (mq && mq.matches) document.documentElement.classList.add("dark");
    if (mq) mq.addEventListener("change", function(e) {
      document.documentElement.classList.toggle("dark", e.matches);
    });
  })();
</script>
```

The `addEventListener("change", ...)` handler ensures theme also switches live if the user changes their OS preference while the app is open.

**Do NOT** rely on CSS `@media (prefers-color-scheme: dark)` directly in `index.css` - FX uses Tailwind's `.dark` class convention, not media queries.

### 1.3 vite.config.ts - must use @tailwindcss/vite plugin

```ts
import tailwindcss from "@tailwindcss/vite"
export default defineConfig({ plugins: [react(), tailwindcss()] })
```

> **`@tailwindcss/vite` version pinning:** Version 4.3.0 from the npm registry is missing its `dist` folder in some environments. If Vite fails with `"Failed to resolve entry for package @tailwindcss/vite"`, pin to the known-good version:
> ```
> npm install @tailwindcss/vite@4.1.8 --legacy-peer-deps
> ```

> **Building `@sap-ui/fx-components` when installed via `file:` local path `[verified-TrialJ-2026-05-28]`:** When `@sap-ui/fx-components` is installed from a local source directory (e.g. `"file:../../../../fx-components-main"`), the `dist/` folder does not exist until the package is built. Vite will fail immediately with `"Failed to resolve entry for package @sap-ui/fx-components"`.
>
> Build the package first (Windows - the `npm run build:theme` script uses bash `cp` which fails on Windows; do those steps manually):
> ```powershell
> cd fx-components-main
> npm install
> npx tsup                           # builds dist/index.js, dist/index.cjs, etc.
> npm run build:css                  # builds dist/styles.css
> npm run build:tokens               # builds dist/tokens.css, dist/tokens.min.css
> # build:theme uses bash 'cp' - do manually on Windows:
> Copy-Item src/theme/sapphire-theme.css dist/theme.css
> Get-Content src/theme/sapphire-theme.css |
>   Where-Object { $_ -notmatch '@source' } |
>   Set-Content dist/theme-tokens.css
> ```
>
> On macOS/Linux: `npm run build` runs all steps including `cp` correctly.

> **React alias path depth verification (critical for `file:` local packages):** When `@sap-ui/fx-components` is installed via a local `file:` path, Vite must alias `react` and `react-dom` to point to the app's own `node_modules`. The alias path is relative to the `vite.config.ts` file and must be exact - off-by-one directory levels cause silent module resolution failures.
>
> Always verify path depth before configuring aliases:
> ```powershell
> # From the app directory, confirm the absolute path to react
> Resolve-Path "./node_modules/react"
> ```
> Use `dirname(fileURLToPath(import.meta.url))` to make the alias relative to the config file, not the process CWD:
> ```ts
> import { dirname, resolve } from 'path'
> import { fileURLToPath } from 'url'
> const __dirname = dirname(fileURLToPath(import.meta.url))
>
> // Point alias to THIS app's node_modules, not a parent directory
> resolve: {
>   alias: {
>     'react':     resolve(__dirname, './node_modules/react'),
>     'react-dom': resolve(__dirname, './node_modules/react-dom'),
>   }
> }
> ```
> If the `fx-components-main` package is in a sibling directory, count directory levels carefully:
> ```powershell
> # Count depth: app is app/<name>/; sibling is at ../../fx-components-main
> Resolve-Path "../../fx-components-main"
> ```
> A wrong path depth fails silently - Vite does not error on unresolved aliases until a component tries to import React.


### 1.4 Required peer dependencies

```bash
npm install "@sap-ui/fx-components" react-i18next i18next
npm install -D @tailwindcss/vite tailwindcss
npm install lucide-react   # for icons not in FX barrel
```

---

## 2. FxLayout - the Sapphire shell

### 2.1 Wrapper requirement

```tsx
<div className="h-screen w-screen overflow-hidden">
  <FxLayout ... />
</div>
```

Any padding, max-width, or constrained height on the wrapper breaks the layout silently.

### 2.1.1 FxPaneHeader left margin `[verified-TrialK-2026-05-29]`

FxPaneHeader renders with `margin-inline: -1.5rem; padding-inline: 1.5rem` via an inline style set by FxLayout. These values cancel each other out at the container level, placing the title `<h1>` exactly at the nav right edge with zero gap. Override in `index.css` at scaffold time:

```css
/* index.css - add alongside the html/body/root rules */
header.fx-pane-header {
  padding-block-start:  1.25rem !important; /* top breathing room */
  padding-inline-start: 2.25rem !important; /* gap from nav right edge */
}
```

The `!important` is required because FxLayout sets these values via an inline style attribute which has higher specificity than class selectors. Without this override the page title is indistinguishable from the collapsed nav icon strip.

**Checklist item:** verify `h1.getBoundingClientRect().left - nav.getBoundingClientRect().right >= 12` after first render.

### 2.2 Key props

| Prop | Type | Notes |
|---|---|---|
| `mode` | `string` | Current nav section - matches a `navItems[].name` |
| `navItems` | `FxNavItemConfig[]` | Side nav configuration |
| `startHeader` / `centerHeader` / `endHeader` | `ReactElement<FxPaneHeaderProps> \| undefined` | Must be `FxPaneHeader`. Use `undefined` not `null` |
| `startContent` / `centerContent` / `endContent` | `ReactNode` | Pane body content |
| `priorityPane` | `'Start' \| 'Center' \| 'End'` | **Capitalised** - lowercase is a TypeScript error |
| `suppressEnd` | `boolean` | Boolean prop, no value needed: `suppressEnd` not `suppressEnd={true}` |
| `onModeChange` | `(detail: FxModeChangeDetail) => void` | Nav item clicked |
| `onLayoutChange` | `(detail: FxLayoutChangeDetail) => void` | Pane toggle clicked |

### 2.3 Nav item config

| Property | Notes |
|---|---|
| `noStartPane: true` | Hides start pane; center pane expands full width |
| `utilityEndPane: true` | End pane is utility content, not AI chat |
| `noCreateAction: true` | Hide the + button |

Reserved mode name: `"settings"` - suppress end pane and prompt input automatically. Never create a nav item named `"settings"`.

### 2.4 End pane behavior

The end pane is never shown automatically even when `hideEnd={false}` and `endContent` is provided - it requires a user toggle. Use `suppressEnd` to remove it entirely when not needed.

### 2.5 Responsive breakpoints

| Viewport | Panes visible |
|---|---|
| = 1965px | 3 (all) |
| = 1020px | 2 |
| < 1020px | 1 - hamburger nav + "Back to list" automatic |

Mobile collapse is fully automatic - no app-level code needed.

---

## 3. FxPaneHeader and actions

Actions are **children** of `FxPaneHeader`, not a prop:

```tsx
<FxPaneHeader title="Items" pane="start">
  <FxPaneHeaderAction text="Add" design="Primary" onClick={handleAdd} />
  <FxPaneHeaderSegmentedAction
    selectedId={viewMode}
    onSelectionChange={(d: { selectedId: string }) => setViewMode(d.selectedId)}
  >
    <FxPaneHeaderSegmentedOption id="table" icon={<TableIcon />} text="Table" />
    <FxPaneHeaderSegmentedOption id="cards" icon={<GridIcon />} text="Cards" />
  </FxPaneHeaderSegmentedAction>
</FxPaneHeader>
```

Event signatures:
- `FxPaneHeaderAction.onClick`: `(event, ref) => void`
- `FxPaneHeaderSplitAction.onClick`: `() => void` (no event arg)
- `FxPaneHeaderSegmentedAction.onSelectionChange`: `(detail: { selectedId: string }) => void`

---

## 4. Input event signatures

All FX text inputs deliver values directly - not as `CustomEvent`:

| Component | Prop | Signature |
|---|---|---|
| `Input` | `onInput` | `(value: string) => void` |
| `SearchField` | `onInput` | `(value: string) => void` |
| `SearchField` | `onSearch` | `(detail: SearchFieldSearchDetail) => void` |
| `ComboBox` | `onInput` / `onChange` | `(value: string) => void` |
| `MultiComboBox` | `onInput` | `(value: string) => void` |
| `Textarea` | `onInput` | `(detail: TextareaInputDetail) => void` - exception: detail object `{ value, escapePressed }` |

`Select.onChange` receives `(detail: SelectChangeDetail)` where `detail.selectedOption` is `OptionData | null`.

**Select has no `style` prop** - wrap in a `<div style={{ minWidth: "..." }}>` for width control.

`RadioButton`: use `defaultChecked` not `checked` - `checked` on RadioButton causes a React 19 infinite update loop.

---

## 5. FX Table

FX Table uses a children-based structure - no `columns` or `features` props:

```tsx
<Table
  aria-label="Items"
  alternateRowColors
  loading={loading}
  noDataText="No items found"
  onRowClick={({ rowKey }) => handleSelect(rowKey)}
>
  <TableHeaderRow sticky>
    <TableHeaderCell minWidth="160px">Name</TableHeaderCell>
    <TableHeaderCell minWidth="80px" horizontalAlign="Right">Value</TableHeaderCell>
  </TableHeaderRow>
  {rows.map((row) => (
    <TableRow key={row.id} rowKey={row.id} interactive>
      <TableCell><span>{row.name}</span></TableCell>
      <TableCell horizontalAlign="Right"><span>{row.value}</span></TableCell>
    </TableRow>
  ))}
  {showGrowing && (
    <TableGrowing
      mode="Button"
      text={`Load more (${rows.length} / ${total})`}
      onLoadMore={() => setTop((t) => t + 20)}
    />
  )}
</Table>
```

Key constraints:
- `TableRow.rowKey` is required - `onRowClick` receives `{ rowKey: string }`
- `TableHeaderCell` uses `minWidth` (string), NOT `width`
- `TableCell` and `TableHeaderCell` have **no `style` prop** - wrap content in `<span>`
- `TableGrowing.text` prop (not `growingButtonText`)
- For app-controlled multi-select: use native `<input type="checkbox">` inside `TableCell` (FX Table has no built-in selection column; add a checkbox cell as the first column and manage selected IDs in state)

---

## 6. Overlay components

### 6.1 Dialog

```tsx
<Dialog
  open={isOpen}
  onAfterClose={(detail: DialogAfterCloseDetail) => setIsOpen(false)}
  headerText="Confirm action"
  state="Warning"    // None | Error | Warning | Success | Information
  footer={
    <div style={{ display: "flex", gap: "0.5rem", padding: "0.75rem 1rem" }}>
      <Button design="Secondary" onClick={confirm}>Confirm</Button>
      <Button design="Tertiary" onClick={() => setIsOpen(false)}>Cancel</Button>
    </div>
  }
>
  {/* content */}
</Dialog>
```

`footer` is a **prop** (JSX), not a child slot. Dialog renders in the browser top layer.

### 6.2 Toast - controlled via open prop

```tsx
const [toastOpen, setToastOpen] = useState(false)
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

const showToast = (msg: string) => {
  if (timerRef.current) clearTimeout(timerRef.current)
  setToastText(msg)
  setToastOpen(true)
  timerRef.current = setTimeout(() => setToastOpen(false), 3500)
}

<Toast open={toastOpen} onClose={() => setToastOpen(false)} placement="BottomCenter" duration={3500}>
  {toastText}
</Toast>
```

### 6.3 Menu - global onItemClick handler

```tsx
<Menu
  open={menuOpen}
  opener={`item-${id}`}     // string CSS-selector ID
  onClose={() => setMenuOpen(false)}
  onItemClick={(detail: MenuItemClickDetail) => {
    if (detail.text === "Delete") handleDelete()
    setMenuOpen(false)
  }}
>
  <MenuItem text="View Details" />
  <MenuSeparator />
  <MenuItem text="Delete" />
</Menu>
```

`Menu.opener` accepts `HTMLElement | string | null` (string = element ID). Differs from `Popover` which uses a React ref.

### 6.4 Popover - opener is a React ref

```tsx
const btnRef = useRef<HTMLButtonElement>(null)
<button ref={btnRef} onClick={() => setOpen((o) => !o)}>Open</button>
<Popover open={open} opener={btnRef} placement="Bottom" onClose={() => setOpen(false)} />
```

---

## 7. Navigation components

### 7.1 TabContainer

```tsx
<TabContainer
  selectedTabId={activeTab}
  onTabSelect={(detail: TabSelectionChangeDetail) => setActiveTab(detail.selectedTabId)}
>
  <Tab id="overview" text="Overview">{overviewContent}</Tab>
  <Tab id="edit" text="Edit" icon={<EditIcon />} additionalText="(2)">
    {editContent}
  </Tab>
</TabContainer>
```

`Tab.id` is **required**. Use `detail.selectedTabId` directly. All tab panels are always in the DOM - gate expensive fetches with a `loaded` flag.

### 7.2 SegmentedButton

```tsx
<SegmentedButton
  selectedId={view}
  onSelectionChange={(d: SegmentedButtonSelectionChangeDetail) => setView(d.selectedId)}
>
  <SegmentedButtonItem id="table" text="Table" />
  <SegmentedButtonItem id="cards" text="Cards" />
</SegmentedButton>
```

`SegmentedButtonItem` has no `children` prop - always use `text`. No `pressed` prop - selection managed by parent.

### 7.3 Breadcrumbs

```tsx
<Breadcrumbs onItemClick={(detail: BreadcrumbsItemClickEventDetail) => {
  if (detail.index === 0) navigateHome()
}}>
  <BreadcrumbsItem>Home</BreadcrumbsItem>
  <BreadcrumbsItem>{currentItem.name}</BreadcrumbsItem>
</Breadcrumbs>
```

`detail.item` is a props object (not HTMLElement) - use `detail.index`. The last item is plain text; `onItemClick` does not fire for it.

---

## 8. Icons

```tsx
// SAP icons - barrel import only
import { DeleteIcon, AcceptIcon, EmployeeIcon } from "@sap-ui/fx-components/icons"

// Convenience nav icons from main barrel
import { ConversationsIcon, DiscoverIcon } from "@sap-ui/fx-components"

// App-specific icons not in SAP set
import { Trash2 } from "lucide-react"
```

Render: `<DeleteIcon style={{ width: "1rem", height: "1rem" }} aria-hidden="true" />`

Individual module paths (e.g. `@sap-ui/fx-components/icons/Delete`) are not in the exports map - always use the barrel import.

---

## 9. Theming

```tsx
import { useTheme } from "@sap-ui/fx-components"
const { theme, setTheme } = useTheme()
// setTheme("dark") | setTheme("light") | setTheme("system")
```

### 9.1 CSS token reference for inline styles `[verified-TrialJ-2026-05-28]`

> **CRITICAL:** The `--fx-color-*` token family does NOT exist in the `@sap-ui/fx-components 1.0.8` Sapphire theme. All such references resolve silently to empty string, making borders and colours invisible with no console error, no TypeScript error, and no visual indication that anything is wrong.

**DO NOT USE these tokens - they are undefined:**
```
--fx-color-neutral-1   --fx-color-neutral-2   --fx-color-neutral-3
--fx-color-neutral-4   --fx-color-neutral-5   --fx-color-neutral-7
--fx-color-primary     --fx-color-positive     --fx-color-negative
--fx-color-critical    --fx-color-information
```

**USE these tokens instead (all verified against Sapphire theme):**

```css
/* Structural / layout */
var(--border)              /* default border colour: #E6E7EA - use for card/input borders */
var(--color-neutral-50)    /* near-white background: #FDFEFF */
var(--color-neutral-100)   /* hover / subtle bg: #F0F2F4 */
var(--color-neutral-200)   /* zebra row / subtle border: #E6E7EA */
var(--color-neutral-300)   /* medium border: #B5BCCA */
var(--color-neutral-400)   /* muted text: #7C879C */
var(--background)          /* page background */
var(--foreground)          /* default text colour */

/* Semantic status */
var(--primary)             /* brand / accent blue: #0070F2 */
var(--positive)            /* success green: #007B3E */
var(--negative)            /* error / validation red: #C72F2B */
var(--warning)             /* warning / critical orange: #A95A00 */
```

**Quick mapping from old (broken) to new (correct):**
```
var(--fx-color-neutral-4) -> var(--border)
var(--color-neutral-200) -> var(--color-neutral-200)
var(--fx-color-neutral-2) -> var(--color-neutral-100)
var(--fx-color-neutral-1) -> var(--color-neutral-50)
var(--fx-color-neutral-5) -> var(--color-neutral-300)
var(--fx-color-primary)   -> var(--primary)
var(--positive)  -> var(--positive)
var(--negative)  -> var(--negative)
var(--fx-color-critical)  -> var(--warning)
```

**Runtime verification (add to P-04-3 in faceted review):**
```js
// Chrome DevTools MCP evaluate_script - run on every page
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
```

Button `design` values: `Primary | PrimaryJoule | Secondary | SecondaryJoule | Tertiary | TertiaryJoule | Neutral | SecondaryNeutral | TertiaryNeutral`

Removed - do not use: `Positive`, `Negative`, `Attention` (from earlier versions).

---

## 10. aria-live region placement

FxLayout intercepts `aria-live` regions placed inside it. Place the announcement region as a sibling **before** the FxLayout wrapper:

```tsx
return (
  <>
    <div
      role="status" aria-live="polite" aria-atomic="true"
      style={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden",
               clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }}
    >

      {announcement}
    </div>
    <div className="h-screen w-screen overflow-hidden">
      <FxLayout ... />
    </div>
  </>
)
```

---

## 11. FX component gaps (vs full Fiori)

| Fiori component | FX status | Workaround |
|---|---|---|
| `FilterBar` | Not available | Conditional show/hide filter section + `SearchField` + `Select` |
| `DynamicPage` / `ObjectPageHeader` | Not available | Styled div row for header facets |
| `FlexibleColumnLayout` | Not available | CSS flex split-pane replacing `FxLayout` |
| `InteractiveBarChart` / `VisualFilterBar` | Not available | CSS bar chart acting as filter |
| `Wizard` component | Not available | Step state machine + `ProgressIndicator` |
| `KpiTag` / `NumericContent` | Not available | Custom KpiCard `div` |
| `IconTabBar` with count | Use `Tab.additionalText` | `<Tab id="open" text="Open" additionalText="(12)">` |

### 11.1 Custom vertical bar chart sizing `[verified-TrialK-2026-05-29]`

When building a column chart from flex divs (the FX workaround for the missing `InteractiveBarChart`), the container height MUST account for count labels that appear **above** bars. Without top padding the label for the tallest bar is clipped by the container edge.

**Formula:** container height = bar-area + label-height + axis-label-height = 140 + 28 + ~40 = **220px minimum**

```tsx
{/* Correct - 220px container, 28px top padding reserves space for count labels */}
<div style={{
  display: 'flex', gap: '4px', alignItems: 'flex-end',
  height: 220,
  paddingTop: 28,  // REQUIRED: space for count label above tallest bar
}}>
  {data.map(row => (
    <div key={row.key} style={{ flex: 1, display: 'flex', flexDirection: 'column',
                                 alignItems: 'center', gap: 4, cursor: 'pointer' }}>
      <span style={{ fontSize: '0.7rem' }}>{row.count}</span>   {/* count label */}
      <div style={{
        width: '100%',
        height: Math.max((row.count / maxCount) * 140, 4),      {/* bar max = 140px */}
        background: 'var(--primary)', borderRadius: '2px 2px 0 0',
      }} />
      <span style={{ fontSize: '0.65rem', writingMode: 'vertical-rl',
                     transform: 'rotate(180deg)', height: 36, whiteSpace: 'nowrap' }}>
        {row.label}
      </span>
    </div>
  ))}
</div>
```

Bars scale to `(count / maxCount) * 140` - NOT to the full container height. Mixing the bar-height scale with the container height is the common mistake that causes clipping.

---

## 12. Known compatibility issues

- **`RadioButton.checked` controlled prop** - causes infinite update loop in React 19. Use `defaultChecked` instead.
- **`React.Children.toArray()`** - does not recursively flatten Fragments. Use a recursive `flattenChildren()` helper if composing Fragment-wrapped children.
- **Hooks before early returns** - React error #310 occurs when `useState`/`useMemo`/`useEffect` appears after a conditional `return`. Always place all hooks before any early returns. Symptoms: blank white page in production build, `Minified React error #310` in console.
- **`Select.onChange` signature differs from WC4R:** In FX, `Select.onChange` receives `(detail: SelectChangeDetail)` where `detail.selectedOption` is an `OptionData` object, not an HTML element. Do NOT use `e.detail.selectedOption.dataset.value` (that is the WC4R `dataset` pattern). Use `detail.selectedOption?.value`:
  ```tsx
  <Select onChange={(d: SelectChangeDetail) => setFilter(d.selectedOption?.value ?? '')}>
  ```
- **Progress bars from raw `<div>` elements need explicit track colour:** Use `background: 'var(--color-neutral-200, #e0e0e0)'` for the track container - `sapphire-background-*` classes may blend with the content area background making the bar invisible. Always add `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`.
- **Windows build scripts:** The `@sap-ui/fx-components` local build uses bash shebang scripts that fail on Windows. On Windows, run build steps individually with `npx tsup` rather than `npm run build`.
- **`Decimal(N,M)` fields:** OData JSON delivers `Decimal` values as plain JS numbers with no decimal places (e.g. `3781` not `3781.00`). Always call `.toFixed(M)` before display in table cells and detail views.
- **`Badge` does not exist** - `@sap-ui/fx-components` has no `Badge` component. Use `Tag` instead:
  ```tsx
  import { Tag } from '@sap-ui/fx-components'
  <Tag design="Positive">Active</Tag>
  ```
  Valid `design` values: `'Positive'` | `'Negative'` | `'Critical'` | `'Information'` | `'None'` | `'Draft'` | `'Active'` | `'Waiting'` | `'Paused'`. Note: `'Warning'` is **not** valid - use `'Critical'` instead.

---

- **`Tag` in `TableCell` creates ARIA noise:** Using `Tag` or `ObjectStatus` inside a `TableCell` causes the component name to appear as ARIA text alongside the value (e.g. "Tag 29" instead of just "29"). Always use `<span style={{ color: 'var(--positive)' }}>` inside table cells for coloured values:
  ```tsx
  // CORRECT - no ARIA noise
  <TableCell><span style={{ color: 'var(--positive)' }}>{row.value}</span></TableCell>
  // WRONG - renders as "Tag 29" in accessibility tree
  <TableCell><Tag design="Positive">{row.value}</Tag></TableCell>
  ```
- **Tag ARIA applies equally to all status indicators inside table cells** - same rule applies to `ObjectStatus`, `Tag`, and any component with an implicit ARIA role when placed inside `TableCell`.

---

## 13. Report / print pages

### 13.1 `sticky` on FX `TableHeaderRow` causes print clipping

`<TableHeaderRow sticky>` in FX components enables an internal scroll container inside the web component. On print, this clips the content to the viewport height, producing a scrollbar in the print preview instead of paginated output. **Always omit `sticky` on report pages.**

### 13.2 Print CSS - tech-agnostic `@media print` block in `index.css`

The FX app shell sets `overflow: hidden` on `html`, `body`, and `#root` so the in-page scroll container works on screen. For print, every constraint must be removed.

**Inline `<style>` blocks in the component will not work** - `div[style*="overflow: hidden"]` only matches inline `style` attributes, not the CSS class-driven `overflow: hidden` set in `index.css`. All print rules must live in `index.css`.

Add this block to every FX app's `index.css` (below the existing screen-mode rules):

```css
@media print {
  /* (1) Unlock full document height - undo ALL overflow:hidden ancestors.
     FxLayout uses h-screen + overflow-hidden. List Tailwind classes explicitly
     because universal * rule may not win against high-specificity utilities. */
  html, body, #root,
  .h-screen, .h-full, .w-screen,
  .overflow-hidden, .overflow-auto, .overflow-scroll,
  [class*="pane"], [class*="Pane"],
  [class*="layout"], [class*="Layout"],
  [class*="content"] {
    overflow: visible !important;
    height: auto !important;
    max-height: none !important;
    min-height: 0 !important;
    position: static !important;
  }

  /* Catch remaining constraints via universal rule */
  * { overflow: visible !important; height: auto !important; max-height: none !important; }

  /* (2) Hide navigation chrome - MUST target FxLayout-specific class names explicitly.
     Generic selectors alone are not sufficient; FxLayout uses `nav.fx-side-navigation`
     and `header.fx-pane-header` which are stable class names across FX versions. */
  nav.fx-side-navigation,
  .flex.flex-col.h-full.shrink-0.relative,  /* nav panel wrapper */
  header.fx-pane-header,                     /* FxPaneHeader action bar */
  .no-print { display: none !important; }

  /* (2a) Remove nav/content left border that appears as an orphan line */
  .flex.flex-col.relative.bg-background.border-l { border-left: none !important; }

  /* (3) Show print-only header (report title, date, record count) */
  .print-only { display: block !important; }

  /* (4) Repeat table header on every printed page.
     NOTE: [role="rowgroup"] only works for NATIVE <thead>. FX <Table> renders
     <div role="rowgroup"> which browser engines do NOT repeat on print.
     Report pages MUST use native <table>/<thead>/<tbody> - see §13.2a below. */
  thead { display: table-header-group !important; }
  [role="rowgroup"]:first-of-type { display: table-header-group !important; }

  /* (5) Prevent a single row splitting across a page break */
  tr, [role="row"] { page-break-inside: avoid; }

  /* (6) A4 portrait, comfortable margins */
  @page { size: A4 portrait; margin: 1.5cm 1cm; }

  /* (7) Black text on white for print legibility */
  body { background: white !important; color: black !important; }

  /* (8) Report table: compact font + no-wrap date columns.
     Apply to any <table> used for report output.
     Date strings like "Dec 29, 2024" are borderline at narrow column widths;
     white-space: nowrap prevents wrapping regardless of column pressure. */
  table[aria-label*="report"], table[aria-label*="Report"] {
    font-size: 0.75rem !important;
  }
  table[aria-label*="report"] th,
  table[aria-label*="report"] td,
  table[aria-label*="Report"] th,
  table[aria-label*="Report"] td { padding: 0.2rem 0.45rem !important; }

  [data-col-type="date"] { white-space: nowrap !important; }
}
```

The `* { overflow: visible !important; height: auto !important; }` rule is the critical line - it catches every wrapper div that the FX app shell or Tailwind utilities set to `h-full overflow-hidden` without requiring knowledge of specific class names.

### 13.2a Report pages MUST use native `<table>` not FX `<Table>` `[verified-TrialK-2026-05-29]`

FX `<Table>` renders its header as `<div role="rowgroup">`, not `<thead>`. Browser print engines only repeat **native** `<thead>` on each page. CSS `display: table-header-group` cannot force a `<div>` to repeat across page breaks regardless of what role it has.

**Rule:** Report pages (any page with a Print button or `className="no-print"` controls) MUST use a native HTML `<table>/<thead>/<tbody>/<tr>/<th>/<td>` structure, not FX `<Table>/<TableHeaderRow>/<TableRow>/<TableCell>`.

**Template:**
```tsx
<table aria-label="[Entity] report table"
       style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
  <thead>
    <tr>
      <th scope="col" style={{ width: '38%', padding: '0.5rem 0.75rem', textAlign: 'left',
                               borderBottom: '2px solid var(--border)' }}>Title</th>
      {/* Date column: always set width >= 14% AND whiteSpace: nowrap */}
      <th scope="col" data-col-type="date"
          style={{ width: '14%', padding: '0.5rem 0.75rem', whiteSpace: 'nowrap',
                   borderBottom: '2px solid var(--border)' }}>Created</th>
    </tr>
  </thead>
  <tbody>
    {items.map(row => (
      <tr key={row.ID}>
        <td style={{ padding: '0.4rem 0.75rem' }}>{row.title}</td>
        <td data-col-type="date" style={{ padding: '0.4rem 0.75rem', whiteSpace: 'nowrap' }}>
          {formatDate(row.createdAt)}
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

**Date column rules:**
- Width >= 14% of table (not 10-12% - borderline at 0.75rem print size on A4)
- `whiteSpace: nowrap` on BOTH the `<th>` and every `<td>` in that column
- `data-col-type="date"` attribute for targeted CSS (matched by `[data-col-type="date"]` in the print block)

### 13.3 Fetch limit for reports

Always use `$top=9999` (or no `$top`) on report fetches. Never cap at 200 or 500 - this silently truncates data.

### 13.4 Post-generation checklist - report pages

- [ ] Report uses native `<table>/<thead>/<tbody>` NOT FX `<Table>` component (see §13.2a)
- [ ] `$top=9999` (or no `$top`) on the report fetch - paginate in a loop if needed
- [ ] No `sticky` prop on `TableHeaderRow` (only applies if FX Table is used on non-print pages)
- [ ] Toolbar / print button in a `className="no-print"` container
- [ ] Print-only header in a `className="print-only"` div with `style={{ display: 'none' }}`
- [ ] `@media print` block in `index.css` explicitly hides `nav.fx-side-navigation` AND `header.fx-pane-header` (not just `.no-print`)
- [ ] `@media print` block includes `body { background: white !important; color: black !important }`
- [ ] Report table has `font-size: 0.75rem` in `@media print` (default 0.875rem is too large for A4)
- [ ] Date/time columns have `width >= 14%`, `whiteSpace: nowrap` on `<th>` AND all `<td>`, and `data-col-type="date"` attribute

---

## 14. Post-generation checklist (FX)

- [ ] Three CSS imports in `main.tsx` in correct order
- [ ] `initFxI18n("en")` called before `createRoot`
- [ ] `@tailwindcss/vite` plugin in `vite.config.ts` (not `tailwind.config.js`)
- [ ] FxLayout wrapped in `<div className="h-screen w-screen overflow-hidden">`
- [ ] Every `useEffect` fetch has the `cancelled` flag
- [ ] Every fetch checks `r.ok` before parsing
- [ ] No `URLSearchParams` for OData `$` key names
- [ ] Draft entity list queries include `$filter=IsActiveEntity eq true`
- [ ] `Select` wrapped in `<div>` for width control (no `style` prop on Select)
- [ ] `RadioButton` uses `defaultChecked` not `checked`
- [ ] `Textarea.onInput` handler destructures `detail.value` (not `e.target.value`)
- [ ] All `useMemo`/`useState`/`useEffect` calls appear before any early `return` statements
- [ ] All icon-only buttons/actions have `tooltip`
- [ ] No `Badge` component used - replaced with `Tag` (see -12)
- [ ] `aria-live` region placed before `FxLayout` wrapper, not inside it
- [ ] Every `FxNavItemConfig` uses `text: '...'` not `label: '...'` for the nav item display label
- [ ] Nav item icons imported from `@sap-ui/fx-components/icons` barrel, not from `lucide-react` (Lucide icons may not render in FxLayout nav pane)
- [ ] `noStartPane: true` is set on ALL nav items when only a center pane is used (not just some)
- [ ] `FxPaneHeaderAction` primary creation actions have both `text` and `icon` props
- [ ] `Select.onChange` handlers use `(d: SelectChangeDetail) => d.selectedOption?.value` - not `e.detail.selectedOption.dataset.value` (WC4R pattern)
- [ ] `Decimal(N,M)` fields in table rows call `.toFixed(M)` before display
- [ ] Progress bars use `var(--color-neutral-200)` for the track background, not `sapphire-background-*` classes, and include `role="progressbar"` with ARIA value attributes
- [ ] After first render: expand the shell navigation and confirm every nav item shows text label alongside its icon
- [ ] No `Tag` component used inside `TableCell` - use `<span style={{ color: 'var(--positive)' }}>` instead (see -12)
- [ ] Every chart and KPI tile on Overview pages has an onClick handler (no chart left non-clickable)
- [ ] Chart onClick + list page $filter + Select key-remount + active filter indicator are all implemented together (four-part contract, see react-cap-shared.md -11)
- [ ] Every icon-only button has a `tooltip` prop (UXC-032); for **disabled** buttons `tooltip` is blocked by `pointer-events:none` - wrap in `<span title="Reason button is disabled">` instead
- [ ] Truncated text in table cells has a `title` attribute on the `<span>` with the full value (UXC-032)
- [ ] KPI tiles have a `title` attribute providing denominator context (UXC-032)
- [ ] For each Create/Edit form: FK select fields either allow creating a new referenced entity or have a "Manage [Entities]" link (UXC-031)
- [ ] State-machine navigation: filter state is saved before entering detail and restored on Back (see -15)
- [ ] Detail page handles three cases: `id === 'new'` renders a Create form; loading renders a spinner; loaded data renders the Detail view
- [ ] All routes used in `navigate()` calls exist in the router config (no unmatched routes that produce blank pages)
- [ ] `index.html` `<title>` tag is set to the human-readable app name - Vite scaffolding sets it to the project folder path by default; replace with a real title like `My Analysis App`
- [ ] `header.fx-pane-header` CSS override added to `index.css`: `padding-block-start: 1.25rem !important` AND `padding-inline-start: 2.25rem !important` - verify title gap from nav >= 12px (see §2.1.1)
- [ ] List tables have sortable column headers with server-side `$orderby` (see ER-UX-3 in enterprise-ready.md)
- [ ] Any entity with a long-text field (description, notes, remarks) has an info-button popover in list rows (see ER-UX-4 in enterprise-ready.md)

---

## 15. State-machine navigation - Back and filter restoration requirements

FX apps commonly use a state machine (`mode` + `selectedId`) instead of React Router. This pattern is valid but has strict requirements for correct behavior:

### 15.1 Back navigation must restore prior state

When a user navigates from a list (with an active filter) to a detail view and presses Back, the list must restore with the same filter that was active before the navigation. Simply clearing `selectedId` is not sufficient if filter state was set from Overview cross-navigation.

```tsx
// [BAD] WRONG - clears selectedId but loses filter context
onBack={() => setSelectedId(null)}

// [OK] CORRECT - save filter state on entry, restore on back
const [savedFilter, setSavedFilter] = useState<string | null>(null)

// On entering detail:
const navToDetail = (id: string) => {
  setSavedFilter(currentFilter)  // save current filter before leaving list
  setSelectedId(id)
}

// On back:
const handleBack = () => {
  setSelectedId(null)
  if (savedFilter) setFilter(savedFilter)  // restore filter
  setSavedFilter(null)
}
```

### 15.2 Never rely on browser history for state-machine apps

State-machine navigation does NOT change the URL. The browser Back button will navigate away from the app entirely, not to the previous in-app view. Do not document or rely on browser Back for in-app navigation.

### 15.3 Back button must use SAP Fiori nav-back pattern

Per SAP Fiori design guidelines, the back action in a drill-down detail view must use a back-navigation button, not a text link:

```tsx
// [OK] SAP Fiori standard back button
<Button
  icon="nav-back"
  design="Transparent"
  tooltip="Back"
  onClick={handleBack}
/>

// ? Non-standard - text link styled as navigation
<span onClick={handleBack}><- Back to Incidents</span>
```

### 15.4 Recommended alternative: React Router

For apps with complex navigation (detail views, cross-navigation from Overview), React Router is strongly preferred over a state machine because:
- Browser history and Back button work correctly
- Deep-linking to specific records works
- Filter state can be encoded in URL params

If a state machine is retained, it must satisfy -15.1-15.3 above.
