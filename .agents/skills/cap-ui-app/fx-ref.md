# FX Components for React - Deep Reference Index

**When to load:** When `fx.md` does not contain the answer; for Fiori floorplan implementation patterns; for utility hooks and advanced chart patterns; for UX principles specific to FX apps.  
**Tier 1 file:** `fx.md`. Load this file additionally for the full findings set.

---

## A. Fiori floorplan implementations

FX does not provide `FilterBar`, `DynamicPage`, `ObjectPageHeader`, `Wizard`, or `FlexibleColumnLayout`. These must be built manually. The following are verified working patterns.

### A.1 List Report - filter section

```tsx
const [filtersVisible, setFiltersVisible] = useState(true)
const hasActiveFilters = search.trim() !== "" || selectedId !== null

return (
  <>
    {/* Filter section */}
    {filtersVisible && (
      <div role="search" aria-label="Filter items"
        style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border)",
                 display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <SearchField value={search} onInput={(v: string) => { setSearch(v); setPage(0) }} showClearIcon />
        <div style={{ minWidth: "10rem" }}>
          <Select value={catId ?? ""} onChange={(d) => { setCatId(d.selectedOption?.value || null); setPage(0) }}>
            <Option value="">All Categories</Option>
            {categories.map(c => <Option key={c.id} value={String(c.id)}>{c.name}</Option>)}
          </Select>
        </div>
        {hasActiveFilters && (
          <Button design="Tertiary" onClick={clearFilters}>Clear</Button>
        )}
        <span style={{ marginLeft: "auto", opacity: 0.6, fontSize: "0.8125rem" }}>
          {filtered.length} of {total} items
        </span>
      </div>
    )}
    {/* Collapsed summary */}
    {!filtersVisible && hasActiveFilters && (
      <div style={{ padding: "0.25rem 0.75rem", fontSize: "0.8125rem", opacity: 0.6,
                    borderBottom: "1px solid var(--border)" }}>
        {activeFilterSummary}
      </div>
    )}
  </>
)
// Filter summary format: "N filter(s) active: Category: Drama, Search: foo" - no trailing period
```

### A.2 List Report toolbar canonical layout

```tsx
<Toolbar design="Transparent">
  <span style={{ fontWeight: 600, fontSize: "0.875rem", padding: "0 0.25rem", whiteSpace: "nowrap" }}>
    Items ({displayedItems.length})
  </span>
  <ToolbarSeparator />
  <SegmentedButton selectedId={statusFilter} onSelectionChange={(d) => setStatusFilter(d.selectedId)}>
    <SegmentedButtonItem id="all"    text="All" />
    <SegmentedButtonItem id="active" text="Active" />
  </SegmentedButton>
  <ToolbarSpacer />
  <ToolbarButton text={filtersVisible ? "Hide Filters" : "Show Filters"}
    icon={<FilterIcon />} onClick={() => setFiltersVisible(v => !v)} />
  <ToolbarButton icon={<SortIcon />} tooltip="Sort" onClick={() => setSortOpen(true)} />
  <ToolbarButton icon={<RefreshIcon />} tooltip="Refresh" onClick={reload} />
</Toolbar>
```

### A.3 Object Page - header facets (no DynamicPage)

```tsx
<div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)" }}>
  <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.125rem", fontWeight: 700 }}>{item.name}</h2>
  <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "center",
                fontSize: "0.875rem" }}>
    <div>
      <div style={{ fontSize: "0.6875rem", opacity: 0.5, textTransform: "uppercase",
                    letterSpacing: "0.05em" }}>Status</div>
      <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{item.status}</div>
    </div>
    <Tag design="Information" hideIcon>{item.category}</Tag>
  </div>
</div>
```

### A.4 Object Page - anchor bar with IntersectionObserver

FX has no `AnchorBar`. Use native `<button>` elements with `IntersectionObserver` for scroll tracking:

```tsx
const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "details",  label: "Details"  },
  { id: "history",  label: "History"  },
]
const scrollRef   = useRef<HTMLDivElement>(null)
const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
const observingRef = useRef(true)
const [activeAnchor, setActiveAnchor] = useState("overview")

useEffect(() => {
  const container = scrollRef.current
  if (!container) return
  const observer = new IntersectionObserver(
    (entries) => {
      if (!observingRef.current) return
      const visible = entries.filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visible.length > 0) {
        const id = visible[0].target.getAttribute("data-section-id")
        if (id) setActiveAnchor(id)
      }
    },
    { root: container, threshold: 0.15 }
  )
  SECTIONS.forEach(s => { const el = sectionRefs.current[s.id]; if (el) observer.observe(el) })
  return () => observer.disconnect()
}, [])

const scrollToSection = (id: string) => {
  const el = sectionRefs.current[id]
  if (!el || !scrollRef.current) return
  observingRef.current = false          // suppress observer during programmatic scroll
  setActiveAnchor(id)
  el.scrollIntoView({ behavior: "smooth", block: "start" })
  setTimeout(() => { observingRef.current = true }, 600)
}

// Anchor bar JSX:
<div role="navigation" aria-label="Object page sections"
  style={{ borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
  <Toolbar design="Transparent">
    {SECTIONS.map(s => (
      <button key={s.id} onClick={() => scrollToSection(s.id)}
        aria-current={activeAnchor === s.id ? "true" : undefined}
        style={{
          background: "none", border: "none", cursor: "pointer",
          padding: "0.5rem 0.875rem", fontSize: "0.875rem",
          borderBottom: activeAnchor === s.id
            ? "2px solid var(--primary)"
            : "2px solid transparent",
          color: activeAnchor === s.id ? "var(--primary)" : "inherit",
          fontWeight: activeAnchor === s.id ? 600 : 400,
        }}
      >{s.label}</button>
    ))}
  </Toolbar>
</div>
<div ref={scrollRef} style={{ flex: 1, overflowY: "auto" }}>
  {SECTIONS.map(s => (
    <section key={s.id} ref={el => { sectionRefs.current[s.id] = el }} data-section-id={s.id}>
      {/* section content */}
    </section>
  ))}
</div>
```

### A.5 Overview Page - KPI card pattern

```tsx
function KpiCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "0.5rem",
                  padding: "0.625rem 1rem", minWidth: "8rem", flex: "0 0 auto" }}>
      <div style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.07em", opacity: 0.5, marginBottom: "0.25rem" }}>{label}</div>
      <div style={{ fontSize: "1.75rem", fontWeight: 700,
                    color: color ?? "var(--primary)", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: "0.75rem", opacity: 0.6, marginTop: "0.125rem" }}>{sub}</div>}
    </div>
  )
}
// Use Intl.NumberFormat with notation: "compact" for large numbers
// KPI labels: <= 3 words, uppercase, Title Case
```

### A.6 OVP - mixed card grid

```tsx
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "1rem" }}>
  <Card header={<CardHeader titleText="Low Stock" status="Critical" />}>
    <CardContent>
      {items.map(item => (
        <div key={item.id} onClick={() => { setSelected(item.id); setMode("detail") }}
          style={{ cursor: "pointer", padding: "0.5rem 0" }}>
          {item.name}
        </div>
      ))}
    </CardContent>
  </Card>
</div>
// Card click: set BOTH selectedId AND mode - mode alone leaves detail pane empty
```

### A.7 Analytical List Page - visual filter bars

```tsx
function VisualFilter({ title, data, selectedId, onSelect }: {
  title: string
  data: { id: string; label: string; count: number }[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "0.375rem",
                  padding: "0.625rem 0.75rem", flex: "1 1 220px" }}>
      <div style={{ fontSize: "0.75rem", fontWeight: 700, opacity: 0.55, marginBottom: "0.5rem",
                    textTransform: "uppercase" }}>{title}</div>
      {data.map(item => (
        <div key={item.id}
          onClick={() => onSelect(selectedId === item.id ? null : item.id)}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.125rem 0",
                   cursor: "pointer", opacity: selectedId && selectedId !== item.id ? 0.35 : 1 }}>
          <span style={{ width: "5rem", fontSize: "0.75rem", textAlign: "right" }}>{item.label}</span>
          <div style={{ flex: 1, background: "#eee", borderRadius: "0.2rem", height: "0.875rem" }}>
            <div style={{ background: selectedId === item.id ? "var(--primary)" : "#aaa",
                          height: "100%", width: `${(item.count / max) * 100}%` }} />
          </div>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, width: "1.75rem", textAlign: "right" }}>
            {item.count}
          </span>
        </div>
      ))}
    </div>
  )
}
// Click bar to set filter; click again to clear
// Non-selected bars dim to 35% opacity
```

### A.8 Wizard (step state machine - no native Wizard component)

```tsx
const STEPS = ["Basic Info", "Classification", "Details", "Review"]
const [step, setStep] = useState(1)
const [errors, setErrors] = useState<Record<string, string>>({})

const stepPct = ((step - 1) / (STEPS.length - 1)) * 100

const next = () => {
  const errs = validateStep(step, form)
  if (Object.keys(errs).length) { setErrors(errs); return }
  setErrors({})
  setStep(s => Math.min(s + 1, STEPS.length))
}

// Step names: nouns, Title Case ("Customer", "Payment", "Basic Info")
// Explanatory text per step: sentence case, period ("Enter the payment details.")
// Final button: "Create <EntityType>" - not "Finish", "Done", "Submit"
```

### A.9 Flexible Column Layout (CSS split-pane)

```tsx
{splitPane && mode === "items" ? (
  <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden" }}>
    <div style={{ flex: "0 0 40%", maxWidth: "40%",
                  borderRight: "1px solid var(--border)",
                  display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "0.5rem 1rem", borderBottom: "1px solid var(--border)",
                    flexShrink: 0, display: "flex", alignItems: "center" }}>
        <span style={{ fontWeight: 600, flex: 1 }}>Items ({items.length})</span>
        <Button design="Tertiary" onClick={() => setSplitPane(false)}>Single View</Button>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>{startContent}</div>
    </div>
    <div style={{ flex: "0 0 60%", maxWidth: "60%",
                  display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, overflow: "hidden" }}>{centerContent}</div>
    </div>
  </div>
) : (
  <FxLayout ... />
)}
// Split-pane replaces FxLayout - FxLayout nav and user menu unavailable in split mode
// Existing startContent and centerContent variables work unchanged inside split pane
```

---

## B. Utility patterns

### B.1 useLocalStorage - persistent state

```tsx
function useLocalStorage<T>(key: string, initialValue: T): [T, (v: T | ((p: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch { return initialValue }
  })
  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      const v = value instanceof Function ? value(storedValue) : value
      setStoredValue(v)
      window.localStorage.setItem(key, JSON.stringify(v))
    } catch { console.error("localStorage write failed") }
  }
  return [storedValue, setValue]
}
// Define at module level (outside component) - drop-in replacement for useState
// Usage: const [watchList, setWatchList] = useLocalStorage<Item[]>("app-watchlist", [])
```

### B.2 useUndoStack - generic client-side undo/redo

```tsx
function useUndoStack<T>(initial: T) {
  const [past,    setPast]    = useState<T[]>([])
  const [present, setPresent] = useState<T>(initial)
  const [future,  setFuture]  = useState<T[]>([])
  const push  = useCallback((next: T) => {
    setPast(p => [...p, present]); setPresent(next); setFuture([])
  }, [present])
  const undo  = useCallback(() => {
    if (!past.length) return
    setFuture(f => [present, ...f]); setPresent(past[past.length-1]); setPast(p => p.slice(0,-1))
  }, [past, present])
  const redo  = useCallback(() => {
    if (!future.length) return
    setPast(p => [...p, present]); setPresent(future[0]); setFuture(f => f.slice(1))
  }, [future, present])
  const reset = useCallback((value: T) => { setPast([]); setPresent(value); setFuture([]) }, [])
  return { present, push, undo, redo, reset, canUndo: past.length > 0, canRedo: future.length > 0 }
}
// reset(value): wipes all history - call after server confirm or rollback
```

### B.3 Polling with change detection

```tsx
const prevRef    = useRef<Map<string, unknown>>(new Map())
const [changedIds, setChangedIds] = useState<Set<string>>(new Set())

useEffect(() => {
  const poll = async () => {
    const { value } = await fetch(url).then(r => r.json())
    const changed = new Set<string>()
    for (const item of value) {
      const prev = prevRef.current.get(item.id)
      if (prev && hasChanged(prev, item)) changed.add(item.id)
    }
    if (changed.size) {
      setChangedIds(changed)
      setTimeout(() => setChangedIds(new Set()), 2500)  // highlight for 2.5s then clear
    }
    prevRef.current = new Map(value.map((i: any) => [i.id, i]))
    setData(value)
  }
  const id = setInterval(poll, POLL_INTERVAL_MS)
  return () => clearInterval(id)
}, [])
```

### B.4 Optimistic UI convention

```ts
interface Item { id: string; /* ... */; _optimistic?: boolean }
// _optimistic is client-only - never sent to server

// Apply: add optimistic item immediately with _optimistic: true
// On success: replace with server response (remove _optimistic)
// On failure: remove or revert the optimistic item
// Styling: opacity: 0.65, fontStyle: "italic" for optimistic items
```

### B.5 Hash-based routing (no router library required)

```tsx
function useHashRouter<T extends string>(parser: (hash: string) => T | null) {
  const [selected, setSelected] = useState<T | null>(() => parser(window.location.hash))
  useEffect(() => {
    const onPop = () => setSelected(parser(window.location.hash))
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [parser])
  const navigate = useCallback((id: string, path: string) => {
    window.history.pushState(null, "", path)
    setSelected(parser(path))
  }, [parser])
  return { selected, navigate }
}
```

### B.6 Multi-criteria sort pattern

```tsx
const [primarySort, setPrimarySort] = useState<"name" | "price" | "date">("date")
const [primaryDir, setPrimaryDir]   = useState<"asc" | "desc">("asc")
const [secondarySort, setSecondarySort] = useState<"name" | "price" | "date" | "none">("none")

const sorted = useMemo(() => {
  const getVal = (item: Item, key: string): number =>
    key === "price" ? toUSD(item.price, item.currency) :
    key === "date"  ? new Date(item.date).getTime() : 0  // extend for other keys
  return [...items].sort((a, b) => {
    const diff = (getVal(a, primarySort) - getVal(b, primarySort))
               * (primaryDir === "asc" ? 1 : -1)
    if (diff !== 0 || secondarySort === "none") return diff
    return getVal(a, secondarySort) - getVal(b, secondarySort)  // secondary: always asc
  })
}, [items, primarySort, primaryDir, secondarySort])
```

### B.7 Currency formatting

```ts
function fmt(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(price)
  } catch {
    return `${price} ${currency}`  // fallback for unknown currency codes
  }
}
// undefined locale uses browser locale
// Works for USD, EUR, GBP, JPY, SGD, CAD, ZAR
```

---

## C. Recharts patterns (FX apps)

### C.1 Forecast line (solid actual + dashed forecast)

```tsx
// Data shape: actual points have forecast=undefined; forecast points have actual=undefined
const combined = [
  ...actualPoints.map(p => ({ ...p, forecast: undefined as number | undefined })),
  ...forecastPoints,
]

<LineChart data={combined}>
  <Line type="monotone" dataKey="actual"   stroke="#0070f3" strokeWidth={2}
        connectNulls={false} dot={false} name="Actual" />
  <Line type="monotone" dataKey="forecast" stroke="#a855f7" strokeWidth={2}
        strokeDasharray="6 3" connectNulls={false} dot={false} name="Forecast" />
</LineChart>

// Linear slope helper for extrapolation:
function linearSlope(points: { x: number; y: number }[]): number {
  const n = points.length
  if (n < 2) return 0
  const sumX  = points.reduce((s, p) => s + p.x, 0)
  const sumY  = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0)
  const denom = n * sumX2 - sumX * sumX
  return denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom
}

// CRITICAL: useMemo for forecast data MUST appear before any early return in the component
// Placing it after if (loading) return ... -> React error #310 (hooks called conditionally)
```

### C.2 Alert state machine

```tsx
interface DataAlert {
  id: string
  entityId: string
  type: "threshold_below" | "threshold_above"
  threshold: number
  status: "active" | "triggered" | "cleared"
  lastChecked?: string
}
// Tag design: active -> "Positive" | triggered -> "Negative" | cleared -> "None"
// Check: fetch entity, compare field vs threshold, return updated status
// Clear: setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "cleared" } : a))
// Remove: setAlerts(prev => prev.filter(a => a.id !== id))
```

---

## D. UX principles specific to FX apps

### D.1 noStartPane navigation - may need second click on first activate

When switching from a mode with a start pane to a `noStartPane: true` mode, the first click may not immediately render center-pane content. The second click always works. Mitigate: ensure `mode` state is correctly set on first render for the intended nav item.

### D.2 Status-gated action buttons

Mirror `@flow.status` transitions from CAP service in the UI:

```tsx
const VALID_ACTIONS: Record<string, string[]> = {
  "New":        ["start", "reject", "assign"],
  "InProgress": ["resolve", "reject", "assign"],
  "Resolved":   ["reopen", "close",  "assign"],
  "Closed":     ["assign"],
}

{Object.keys(ACTION_LABELS).map(action => {
  const valid = (VALID_ACTIONS[currentStatus] ?? []).includes(action)
  return (
    <Button key={action} design="Secondary" disabled={!valid}
      style={!valid ? { opacity: 0.4 } : undefined}>
      {ACTION_LABELS[action]}
    </Button>
  )
})}
// FX Button has no title prop - wrap in <span title="..."> for tooltip on disabled buttons
// Actions not flow-gated (e.g. "assign") should appear in all VALID_ACTIONS entries
```

### D.3 KPI labels must be specific - not vague

```
// [X] Vague - two metrics can produce different winners
"Busiest Route"
"Most Popular Item"
"Top Performer"

// [OK] Specific - names the metric used
"Most Frequent Route"           (count-based)
"Highest Occupancy Route"       (rate-based)
"Best Seller by Revenue"        (revenue sum)
"Best Seller by Units Sold"     (count)
```

### D.4 Cross-domain KPI consistency

When a metric appears in multiple places (list badge, detail KPI, overview chart), define thresholds in one file and import everywhere. See `ux-standards.md §12`.

### D.5 Dataset schema verification before derived column design

Before designing a column that derives a score from a cross-entity relationship:
```bash
GET /service/RelatedEntity?$top=1
# Inspect whether the join key (e.g., parentEntity_ID) actually exists in the dataset
# If absent: feature renders " -- " for all rows - document the data gap, do not remove the column
```

### D.6 Charts comparing values across different currencies

Always label the axis or chart title with currency context. If values are not normalised, add a visible disclaimer. See `ux-standards.md §16`.

### D.7 Composite score display - use CSS bar, not ProgressIndicator

`ProgressIndicator` implies "completion" / "fullness". For a composite score (ranking), use a plain CSS bar:

```tsx
<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
  <div style={{ flex: 1, height: "6px", background: "#e5e7eb", borderRadius: "3px" }}>
    <div style={{ width: `${score}%`, height: "100%", background: "#0070f3", borderRadius: "3px" }} />
  </div>
  <span style={{ fontSize: "0.75rem", fontWeight: 600, minWidth: "2rem" }}>{score}</span>
</div>
```

---

## E. Verified icon name index

FX icon names do not always match the semantic concept. Before using an icon, verify it is in the barrel export. Below are confirmed non-obvious mappings (verified against `@sap-ui/fx-components 1.0.8`):

| Semantic intent | Correct export name | Wrong names (do not use) |
|---|---|---|
| Company / organisation | `TntCompany` | `CompanyIcon`, `OrganisationIcon` |
| Category / folder | `FolderIcon` | `CategoryIcon`, `TagIcon` |
| Delete / remove | `DeleteIcon` | `TrashIcon` |
| Accept / confirm | `AcceptIcon` | `CheckIcon`, `OkIcon` |
| Employee / person | `EmployeeIcon` | `PersonIcon`, `UserIcon` |
| Conversations | `ConversationsIcon` | `ChatIcon`, `MessageIcon` |
| Discover / explore | `DiscoverIcon` | `SearchIcon`, `ExploreIcon` |

> **Verification command** - run before using any icon not listed above:
> ```sh
> node -e "const m = require('@sap-ui/fx-components/dist/index.cjs'); console.log(Object.keys(m).filter(k => k.includes('Icon')).sort().join('\n'))"
> ```
> On Windows PowerShell:
> ```powershell
> node -e "const m = require('@sap-ui/fx-components/dist/index.cjs'); console.log(Object.keys(m).filter(k => k.includes('Icon')).sort().join('\n'))"
> ```

