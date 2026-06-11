# UI5 Web Components for React (WC4R) - Deep Reference Index

**When to load:** When `wc4r.md` does not contain the answer; for complete component API reference; for debugging TypeScript casting errors or shadow DOM issues.  
**Tier 1 file:** `wc4r.md`. Load this file additionally for the full findings set.

---

## A. Controls availability and import names (v2.21)

**Critical naming traps:**
- `ListItemStandard` - NOT `StandardListItem`; wrong import name causes runtime error
- `onSelectionChange` on `Input` with suggestions - NOT `onSuggestionItemSelect` (does not exist)
- `ProgressIndicator`: prop is `value` (not `percentValue`); semantic prop is `valueState` (not `state`)

```tsx
// Complete controls reference
import {
  // Layout
  FlexBox, Grid,
  // Data display
  Table, TableRow, TableCell, TableHeaderRow, TableHeaderCell,
  TableSelectionMulti, TableGrowing,
  AnalyticalTable,           // React component (not WC) - takes data/columns props
  List, ListItemStandard,    // NOT StandardListItem
  Tree, TreeItem,
  // Forms
  Form, FormGroup, FormItem,
  Input, TextArea, Select, Option, MultiInput, Token,
  ComboBox, ComboBoxItem, MultiComboBox, MultiComboBoxItem,
  DatePicker, TimePicker, DateTimePicker,  // cast target: DatePickerDomRef
  CheckBox, Switch, RadioButton,
  StepInput, Slider, RangeSlider, RatingIndicator, ColorPicker,
  // Navigation
  TabContainer, Tab, TabSeparator,
  SegmentedButton, SegmentedButtonItem,
  SideNavigation, SideNavigationItem, SideNavigationSubItem, NavigationLayout,
  Breadcrumbs, BreadcrumbsItem,
  // Overlays
  Dialog, Popover, ResponsivePopover,
  Toast, MessageStrip, MessageBox,
  ActionSheet, Menu, MenuItem, MenuSeparator,
  Wizard, WizardStep,
  // Data viz
  ProgressIndicator,   // value (not percentValue); valueState (not state)
  Avatar, AvatarGroup,
  Tag, ObjectStatus, Card, CardHeader, CardContent,
  IllustratedMessage,
  // Shell
  ShellBar, NotificationListItem,
  ProductSwitch, ProductSwitchItem, UserMenu, UserMenuItem,
  // Filters
  FilterBar, FilterGroupItem,     // React components
  ViewSettingsDialog, SortItem,
  UploadCollection, UploadCollectionItem,
  // Charts (WC4R exports recharts wrappers)
  // Use recharts directly: BarChart, LineChart, PieChart, ScatterChart etc.
} from "@ui5/webcomponents-react"
```

---

## B. TypeScript casting - complete reference

```tsx
// Standard pattern: as unknown as TargetType
// because WC DomRef types don't overlap with native DOM types

// Input, SearchField, TextArea -> string value
(e.target as unknown as { value?: string })?.value ?? ""

// StepInput -> number value
(e.target as unknown as { value?: number })?.value ?? 0

// Slider, RangeSlider -> number / { startValue, endValue }
(e.target as unknown as { value: number }).value
(e.target as unknown as { startValue: number; endValue: number })

// Checkbox, Switch -> checked
(e.target as unknown as { checked?: boolean })?.checked ?? false

// RatingIndicator -> value
(e.target as unknown as { value: number }).value

// DatePicker, TimePicker, DateTimePicker
import type { DatePickerDomRef } from "@ui5/webcomponents-react"
(e.target as DatePickerDomRef).value        // display string (locale-dependent - do NOT use for OData)
(e.target as DatePickerDomRef).dateValue    // JS Date | null (use for OData ISO string)
(e.target as DatePickerDomRef).valid        // false if invalid date

// Select - selectedOption
const sel = e.detail?.selectedOption as unknown as HTMLElement | undefined
const val = sel?.dataset.id ?? ""

// ComboBox - onSelectionChange detail
import type { ComboBoxSelectionChangeDetail } from "@ui5/webcomponents-react"
// detail.value ?? detail.item?.text

// MultiComboBox - onSelectionChange detail
import type { MultiComboBoxSelectionChangeDetail } from "@ui5/webcomponents-react"
// detail.items = ALL currently selected (not just toggled); detail.changedItem = toggled one

// BreadcrumbsItem href
(e.detail?.item as unknown as HTMLAnchorElement)?.href
// Use new URL(href).pathname to extract path from absolute URL

// AnalyticalTable Cell instance - deep import required
import type { CellInstance } from "@ui5/webcomponents-react/dist/components/AnalyticalTable/types/index.js"
// row original data: (instance as unknown as { row: { original: MyType } }).row.original

// onItemClick - data-* on shadow DOM items not always accessible
// NotificationListItem: data-book-id not reflected; fallback to titleText match:
const id = (item as HTMLElement)?.dataset.itemId
  ?? notifications.find(n => n.title === (item as { titleText?: string })?.titleText)?.ID
```

---

## C. Control-specific patterns

### C.1 SegmentedButton - v2.21 event

```tsx
<SegmentedButton
  onSelectionChange={(e) => {
    // selectedItem (singular) does not exist - use selectedItems (array)
    const items = e.detail?.selectedItems
    const first = Array.isArray(items) ? items[0] : items
    setMode((first as HTMLElement | undefined)?.dataset.mode ?? "list")
  }}
>
  <SegmentedButtonItem data-mode="grid" selected={mode === "grid"}>Grid</SegmentedButtonItem>
  <SegmentedButtonItem data-mode="list" selected={mode === "list"}>List</SegmentedButtonItem>
</SegmentedButton>
```

### C.2 Input with suggestions - correct event

```tsx
<Input
  showSuggestions
  onInput={(e) => setQuery((e.target as unknown as { value?: string })?.value ?? "")}
  onSelectionChange={((e) => {
    const item = (e as CustomEvent).detail?.item as HTMLElement | undefined
    if (item?.dataset.id) setSelectedId(item.dataset.id)
  }) as InputPropTypes["onSelectionChange"]}
>
  {suggestions.map(s => (
    <SuggestionItem key={s.ID} data-id={s.ID} text={s.name} additionalText={s.city} />
  ))}
</Input>
// SuggestionItem only has: text, additionalText - no description prop
```

### C.3 DynamicSideContent props

```tsx
<DynamicSideContent
  hideSideContent={!showPanel}
  sideContentVisibility="AlwaysShow"   // ShowAboveS|M|L|XL | AlwaysShow | NeverShow
  sideContentPosition="End"            // "Begin" = left
  sideContentFallDown="OnMinimumWidth" // OnMinimumWidth|BelowXL|BelowL|BelowM
  equalSplit={false}                   // 50/50 split
  sideContent={<div>side content</div>}
>
  {/* main content */}
</DynamicSideContent>
// Falls below main at ~720px (NarrowWidth threshold)
```

### C.4 ShellBar - full pattern with notifications and user menu

```tsx
<ShellBar
  id="app-shellbar"
  primaryTitle="My App"
  showNotifications
  notificationsCount={count > 0 ? String(count) : undefined}  // must be string
  showProductSwitch
  onNotificationsClick={() => setNotifOpen(o => !o)}
  onProductSwitchClick={() => setProductOpen(o => !o)}
  profile={<Avatar initials="AL" size="XS" />}
  onProfileClick={() => setUserOpen(o => !o)}
>
  <Popover open={notifOpen} opener="app-shellbar" onClose={() => setNotifOpen(false)}>
    {/* NotificationList */}
  </Popover>
  <Popover open={productOpen} opener="app-shellbar" onClose={() => setProductOpen(false)}>
    <ProductSwitch>
      <ProductSwitchItem titleText="App 1" icon="course-book" onClick={...} />
    </ProductSwitch>
  </Popover>
  <UserMenu open={userOpen} opener="app-shellbar" onClose={() => setUserOpen(false)} showManageAccount>
    <UserMenuItem icon="settings" text="Settings" />
    <UserMenuItem icon="log" text="Sign Out" />
  </UserMenu>
</ShellBar>
// opener must match the ShellBar element id - tag name "ui5-shellbar" does NOT work
// notificationsCount is string, not number
```

### C.5 SideNavigation + NavigationLayout

```tsx
<NavigationLayout style={{ height: "100vh" }}
  header={<ShellBar primaryTitle="App" />}
  sideContent={
    <SideNavigation onSelectionChange={(e: Event) => {
      const item = (e as CustomEvent).detail?.item as HTMLElement | undefined
      if (item?.dataset.path) navigate(item.dataset.path)
    }}>
      <SideNavigationItem data-path="/"        text="Items"   icon="course-book" expanded>
        <SideNavigationSubItem data-path="/"     text="All Items" />
        <SideNavigationSubItem data-path="/active" text="Active" />
      </SideNavigationItem>
      {/* SideNavigationSubItem does NOT support icon - text only */}
    </SideNavigation>
  }
>
  {/* main content */}
</NavigationLayout>
```

### C.6 ActionSheet + AvatarGroup

```tsx
// ActionSheet extends ResponsivePopover - same open/opener/onClose API
<ActionSheet open={open} opener="action-btn" headerText="Actions" onClose={() => setOpen(false)}>
  <Button icon="edit" onClick={() => { doEdit(); setOpen(false) }}>Edit</Button>
  <Button icon="delete" design="Negative" onClick={...}>Delete</Button>
  {/* Children must be Button components only */}
</ActionSheet>

// AvatarGroup
<AvatarGroup accessibleName="Team members" onOverflowButtonClick={() => setShowAll(true)}>
  {users.map((u, i) => (
    <Avatar key={u.id} initials={u.initials}
      colorScheme={`Accent${(i % 10) + 1}` as "Accent1"} />
  ))}
</AvatarGroup>
// onOverflowButtonClick fires when +N overflow badge clicked
```

### C.7 UploadCollection

```tsx
<input type="file" multiple id="upload-input" style={{ display: "none" }}
  onChange={(e) => {
    setFiles(f => [...f, ...Array.from(e.target.files ?? [])])
    e.target.value = ""   // reset so same file can be re-added
  }}
/>
<Button onClick={() => document.getElementById("upload-input")?.click()}>Attach</Button>
<UploadCollection
  selectionMode="None"   // "None" | "Single" | "Multiple" - NOT the mode prop
  noDataText="No files attached"
  onItemDelete={(e) => {
    const idx = parseInt((e.detail?.item as HTMLElement)?.dataset.idx ?? "-1", 10)
    if (idx >= 0) setFiles(f => f.filter((_, i) => i !== idx))
  }}
>
  {files.map((file, i) => (
    <UploadCollectionItem key={`${file.name}-${i}`} data-idx={i}
      fileName={file.name} uploadState="Complete" file={file}>
      {(file.size / 1024).toFixed(1)} KB
    </UploadCollectionItem>
  ))}
</UploadCollection>
// uploadState values: "Ready" | "Uploading" | "Complete" | "Error"
// Built-in retry button on Error state - fires onRetry; do NOT add custom button
// Built-in terminate button on Uploading state - fires onTerminate
// Do NOT use mode prop - use selectionMode
```

### C.8 ViewSettingsDialog sort

```tsx
<ViewSettingsDialog
  open={open}
  onClose={() => setOpen(false)}
  onConfirm={(e) => {
    const { sortBy, sortOrder } = e.detail as { sortBy: string; sortOrder: string }
    // sortOrder: "Ascending" | "Descending"
    applySort(sortBy, sortOrder === "Descending")
    setOpen(false)
  }}
  onCancel={() => setOpen(false)}
  sortItems={
    <>
      <SortItem text="Name" selected />  {/* selected = default */}
      <SortItem text="Price" />
      <SortItem text="Stock" />
    </>
  }
/>
// sortItems is a slot prop - pass JSX fragment directly
```

---

## D. i18n with react-i18next

```ts
// src/i18n/index.ts
import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import en from "./en.json"
import de from "./de.json"

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, de: { translation: de } },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
})
export default i18n

// main.tsx - MUST import i18n BEFORE any component import:
import "./i18n/index.ts"
import "@ui5/webcomponents-react/dist/Assets.js"
// ...

// In component:
const { t } = useTranslation()
<Title>{t("pageTitle")}</Title>

// Language switching:
import i18n from "./i18n/index.ts"
i18n.changeLanguage("de")   // reactive - all components update
// No I18nextProvider wrapper needed with react-i18next v17
```

---

## E. Theme switching

```ts
import { setTheme } from "@ui5/webcomponents-base/dist/config/Theme.js"

setTheme("sap_horizon")        // default
setTheme("sap_horizon_dark")
setTheme("sap_horizon_hcb")    // high contrast black
setTheme("sap_fiori_3")
setTheme("sap_fiori_3_dark")
setTheme("sap_fiori_3_hcb")

// Wire to UserMenu via additionalText as data carrier:
<UserMenuItem text="Horizon Dark" additionalText="sap_horizon_dark" />
// onItemClick: setTheme((e.detail?.item as { additionalText?: string })?.additionalText)
```

---

## F. AnalyticalTable - complete reference

```tsx
import { AnalyticalTable } from "@ui5/webcomponents-react"
import type {
  AnalyticalTableColumnDefinition,
} from "@ui5/webcomponents-react"
import type { CellInstance } from "@ui5/webcomponents-react/dist/components/AnalyticalTable/types/index.js"
// CellInstance is NOT exported from main index - use deep import

// MUST wrap data and columns in useMemo:
const columns = useMemo<AnalyticalTableColumnDefinition[]>(() => [
  { Header: "Name",   accessor: "name",  minWidth: 160 },
  { Header: "Status", accessor: "stock", minWidth: 80,
    Cell: (instance: CellInstance) => (
      <ObjectStatus state={instance.value > 10 ? "Positive" : "Negative"}>
        {instance.value}
      </ObjectStatus>
    )
  },
  // Two columns sharing same accessor MUST have distinct id:
  { Header: "Rating", accessor: "stock", id: "rating", minWidth: 80,
    Cell: (instance: CellInstance) => <span>{instance.value}</span>
  },
], [])
const data = useMemo(() => items, [items])

// selectionMode values: "None" | "Single" | "Multiple"  (NOT "MultiSelect" or "SingleSelect")
<AnalyticalTable
  data={data} columns={columns} loading={loading}
  sortable groupable filterable
  selectionMode="Multiple"
  visibleRowCountMode="Auto"
  alternateRowColor withRowHighlight
  onRowClick={(e) => {
    const id = (e.detail?.row as any)?.original?.ID
    if (id) navigate(`/items/${id}`)
  }}
/>
```

---

## G. Carousel

```tsx
<Carousel cyclic arrowsPlacement="Navigation" accessibleName="Featured items">
  {items.map(item => (
    <Card key={item.id} onClick={() => navigate(`/items/${item.id}`)}>
      {/* slide content */}
    </Card>
  ))}
</Carousel>
// cyclic: wraps last->first and first->last
// arrowsPlacement "Navigation": arrows below content; "Content": arrows on sides of slide
// One child = one slide; dots and arrows generated automatically
// If items.length === 0: return null to avoid layout shift
```

---

## H. Recharts integration patterns

### H.1 Tooltip formatter type signature (TypeScript)

```tsx
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent"

// MUST use optional params - not plain number | string:
<Tooltip formatter={(v?: ValueType, name?: NameType) => [`${v ?? 0}%`, "Occupancy"]} />
// TS error if you write: (v: number) => [...]
```

### H.2 ResponsiveContainer requires a sized parent

```tsx
<div style={{ border: "1px solid #ddd", borderRadius: "0.5rem", padding: "0.75rem" }}>
  <ResponsiveContainer width="100%" height={200}>
    <BarChart data={data}>...</BarChart>
  </ResponsiveContainer>
</div>
// Without explicit height on parent: ResponsiveContainer collapses to 0
```

### H.3 ScatterChart as categorical axis (e.g., airline x date)

```ts
// Pre-compute index arrays:
const allDates = [...new Set(items.map(f => f.date))].sort()
const categoryNames = categories.map(c => c.name)

// Map each data point to indices:
const scatterData = items.map(f => ({
  dateIndex:     allDates.indexOf(f.date),
  categoryIndex: categoryNames.indexOf(f.category?.name ?? ""),
  ...f,
}))
// YAxis tickFormatter: (i) => categoryNames[i]
// XAxis domain/tickCount: match the index arrays
```
