# React + CAP / OData V4 - Shared Patterns (WC4R and FX)

**Scope:** Patterns used by both `@ui5/webcomponents-react` and `@sap-ui/fx-components` when connecting to a CAP OData V4 backend. Rules here avoid duplication between `wc4r.md` and `fx.md`.

**For CAP/OData rules that have no React dependency** (key predicates, draft contract, $apply, etc.), see `cap-shared.md`.

---

## 1. Vite project setup

> **[JS] / [JS-LOCAL] - read `joule-studio.md` before this section.** The project structure
> for Joule Studio environments has a specific layout contract (`app/react-ui/` as the React
> source root with npm workspaces). The scaffold command and proxy sections below describe
> the `[LOCAL]` standard pattern. For `[JS]`/`[JS-LOCAL]`, the canonical structure is in
> `joule-studio.md §3`. Key differences: workspace wiring replaces manual installs; `outDir`
> is `dist` not `webapp`; `optimizeDeps.exclude` and `stubZxing` are mandatory in `vite.config.js`;
> the proxy is inactive in `cds watch` middleware mode.

### 1.1 Scaffold command

Always create the target directory first, then scaffold inside it with `.` as the project path:

```sh
# macOS / Linux
mkdir app && cd app
npm create vite@latest . -- --template react-ts
npm install
```

```powershell
# Windows PowerShell
New-Item -ItemType Directory -Path ".\app"
# then run with workdir=".\app":
npm create vite@latest . -- --template react-ts
npm install
```

**Windows-specific trap:** On Windows, `npm create vite@latest "C:\absolute\path"` treats the absolute path as the project name and creates a wrongly-named subdirectory. This does not affect macOS/Linux. Always use `.` from inside the target directory on all platforms.

**CAP workspace hoisting trap:** When the React app lives inside a CAP project that declares `workspaces: [app/*]` in its `package.json`, npm hoists installed packages to the CAP project root. This means:
- All runtime dependencies (`@ui5/webcomponents-react`, `recharts`, `react-router-dom`, `@tailwindcss/vite`, `@sap-ui/fx-components`, etc.) MUST be explicitly declared in the app's own `package.json`. Do not rely on hoisting - Vite's resolver may not walk up to the workspace root.
- **Always use `npm install --install-strategy=nested`** from inside the app directory to force local installation and prevent incorrect hoisting. The `--legacy-peer-deps` flag alone does not prevent hoisting:
  ```sh
  cd app/<app-name>
  npm install --install-strategy=nested
  ```
- If a dependency appears to be installed (found in the workspace root `node_modules`) but Vite reports it missing, install it explicitly with `--install-strategy=nested` in the app directory.
- When adding additional packages after the initial install, always include `--install-strategy=nested`.
- **After every install, verify local presence:** After running `npm install --install-strategy=nested`, confirm the package actually exists inside the app's own `node_modules` (not just the workspace root):
  ```powershell
  # Windows
  Test-Path "node_modules\<package-name>"
  ```
  ```sh
  # macOS/Linux
  test -d node_modules/<package-name> && echo "OK" || echo "MISSING - still hoisted"
  ```
  If the package is still missing locally: open the app's `package.json`, **explicitly add the package** to `dependencies`, then re-run `npm install --install-strategy=nested`. Packages that are not in the app's own `package.json` will always be hoisted to the workspace root regardless of the install strategy.

### 1.2 Port safety - check before starting dev server

**Chrome ERR_UNSAFE_PORT:** Chrome blocks certain port numbers on **all platforms**. Never assign a Vite dev server to these ports:
`2049, 3659, 4045, 4190, 4559, 6000-6063, 6566, 6665-6669, 6697, 10080`

Safe range: >= 5000, avoiding the blocked list. Prefer 5100+.

Check for occupied ports before starting:

```sh
# macOS
lsof -i :5200 -t              # prints PID if port is in use
kill -9 $(lsof -i :5200 -t)   # kill it

# Linux
ss -tulnp | grep :5200
kill -9 <pid>
```

```powershell
# Windows PowerShell
netstat -ano | findstr ":5200 " | findstr "LISTENING"
$proc = netstat -ano | findstr ":5200 " | findstr "LISTENING"
$pid  = ($proc -split "\s+") | Where-Object { $_ -match "^\d+$" } | Select-Object -Last 1
if ($pid) { Stop-Process -Id $pid -Force }
```

### 1.3 Starting the dev server as a background process

> **[JS]:** The agent does NOT start the dev server in Joule Studio. The JS preview runner
> starts `cds watch` internally. Do not use `Start-Process` or `&` background patterns in
> `[JS]`. The patterns below apply to `[LOCAL]` and `[JS-LOCAL]` only.

**macOS / Linux:** Background processes with `&` do not steal window focus.

```sh
npm run dev -- --port 5200 &
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://localhost:5200   # expect 200
```

**Windows:** Always use `-WindowStyle Hidden`. Without it, the new console window steals focus and **disconnects the Chrome DevTools MCP browser tool** - once disconnected it cannot reconnect in the same session.

```powershell
Start-Process "cmd.exe" `
  -ArgumentList "/c npm run dev -- --port 5200" `
  -WorkingDirectory (Resolve-Path ".\app").Path `
  -WindowStyle Hidden

Start-Sleep -Seconds 10
Invoke-WebRequest -Uri "http://localhost:5200" -UseBasicParsing | Select-Object StatusCode
```

### 1.4 Proxy is mandatory - never use absolute CAP URLs in fetch calls

> **[JS] / [JS-LOCAL] note:** In `cds watch` middleware mode (both JS preview and local
> `cds watch`), Vite and CDS share a single HTTP server on port 4004. OData requests to
> `/odata/v4/...` are handled directly by CDS - the `server.proxy` configuration in
> `vite.config.js` is **not active**. Proxy is only active in standalone Vite mode
> (`cd app/react-ui && npx vite`). In `[JS]`/`[JS-LOCAL]` apps, fetch calls using
> root-relative paths (e.g. `/odata/v4/processor/Incidents`) work without a proxy
> because Vite and CDS are on the same server.
>
> The rule below applies to `[LOCAL]` standalone Vite setups where the React app
> and CDS server run on different ports.

CAP does not reliably set `Access-Control-Allow-Credentials`. A Vite proxy makes all OData requests same-origin, eliminating CORS issues.

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Services with a registered URL alias - no rewrite needed
      '/browse': { target: 'http://localhost:<PORT>', changeOrigin: true },

      // Services without an alias - rewrite short path to full OData path
      '/admin': {
        target: 'http://localhost:<PORT>',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/admin/, '/odata/v4/admin'),
      },
    },
  },
})
```

In app code: always `fetch('/admin/Items?...')` - never `fetch('http://localhost:4004/odata/v4/admin/Items?...')`.

Check `cds compile '*' --to serviceinfo` (or `cds_search_model` MCP tool) to determine whether a service has a URL alias (no rewrite needed) or uses its full OData path (rewrite required).

> **React alias rules for CAP workspaces:**
>
> **Standard case (package installed from npm registry):** Use `dedupe` only - no alias needed. The npm registry install correctly declares React as a `peerDependency` and deduplication is sufficient:
> ```ts
> resolve: { dedupe: ['react', 'react-dom'] }
> ```
>
> **Special case (package installed via `file:` local path, e.g. `"@sap-ui/fx-components": "file:///..."`): ** Vite may resolve React from inside the package's own `node_modules` instead of the app's, causing two React instances and `Invalid hook call` / `Cannot read properties of null (reading 'useContext')` errors. Fix with explicit aliases pointing to the workspace root:
> ```ts
> import { dirname, resolve } from 'path'
> import { fileURLToPath } from 'url'
> const __dirname = dirname(fileURLToPath(import.meta.url))
>
> // CORRECT - alias to workspace root node_modules (adjust depth as needed)
> resolve: {
>   dedupe: ['react', 'react-dom'],
>   alias: {
>     'react':     resolve(__dirname, '../../node_modules/react'),
>     'react-dom': resolve(__dirname, '../../node_modules/react-dom'),
>   }
> }
> ```
>
> **Never use `path.resolve('./node_modules/react')`** (relative to CWD) - the CWD is the process working directory, not the app folder, and will not resolve correctly when hoisted.

### 1.5 Authenticated CAP service proxy (with credential injection)

When the CAP service requires authentication (mocked user) and is proxied via Vite, credentials must be injected into the proxy request. The browser `fetch` call uses same-origin (no credentials), but the proxy must forward `Authorization` to the CAP backend:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/browse': {
        target: 'http://localhost:<PORT>',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            const creds = Buffer.from('alice:alice').toString('base64')
            proxyReq.setHeader('Authorization', `Basic ${creds}`)
          })
        },
      },
    },
  },
})
```

In React fetch code, do NOT add Authorization headers - the proxy handles credentials. Using `Authorization` in browser fetch AND Vite proxy simultaneously produces doubled auth headers and may fail.

### 1.6 OData Decimal fields - raw numbers in JSON responses

OData `Decimal(N,M)` fields arrive in JSON fetch responses as plain JS `number` values with no decimal places (e.g. `3781` not `3781.0000`). The OData V4 model in SAPUI5 applies type formatting automatically, but in React `fetch` responses the raw value is what you receive.

**Two distinct cases - use the right formatter for each:**

**Case 1: Non-monetary decimal fields** (dimensions, weights, quantities) - use `.toFixed(M)`:
```ts
// [X] Shows "3781" not "3781.00"
<span>{item.price}</span>

// [OK] Shows "3781.00"
<span>{item.price.toFixed(2)}</span>
```

**Case 2: Price / monetary fields** - use `Intl.NumberFormat` with `style:'currency'` and DO NOT set `minimumFractionDigits` or `maximumFractionDigits` - let the currency determine its own decimal places (ER-TEXT-3):
```ts
// [X] WRONG - forces 2 decimals even for JPY which has no minor unit
new Intl.NumberFormat(locale, { style: 'currency', currency: 'JPY', minimumFractionDigits: 2 }).format(88)
// -> "¥88.00"  (WRONG - JPY should be ¥88)

// [OK] CORRECT - let the currency determine decimal places
new Intl.NumberFormat(locale, { style: 'currency', currency: 'JPY' }).format(88)
// -> "¥88"  (CORRECT)

new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(9.99)
// -> "$9.99"  (CORRECT - USD uses 2 decimals automatically)
```

**Rule:** Never pass `minimumFractionDigits` or `maximumFractionDigits` to `Intl.NumberFormat` when using `style:'currency'`. The CLDR data embedded in the browser already knows the correct decimal count for each currency. Overriding it produces wrong output for currencies like JPY (0 decimals), KWD (3 decimals), etc.

The `.toFixed(M)` rule in the post-gen checklist applies ONLY to non-monetary numeric fields shown without a currency symbol. Never apply `.toFixed(2)` to a price field that will be formatted with `style:'currency'`.

This is distinct from the SAPUI5 OData V4 formatter issue where `parseFloat` receives a locale-formatted string like `"3,781.0000"` - in React fetch, the value is always a raw number.

### 1.7 Locale-safe decimal input for price/quantity fields

Never use `<input type="number">` + `parseFloat(e.target.value)` for price, quantity, or any decimal field in a React form. On locales that use `,` as the decimal separator (German, French, etc.), the browser's native number input either refuses to accept `12.99` (expects `12,99`) or `parseFloat("12,99")` returns `12` (silently truncating the decimal). Either way the user's value is corrupted with no error shown.

**Pattern:**
```tsx
// [X] Locale-unsafe -- parseFloat("12,99") === 12 on comma-decimal locales
<input type="number" onChange={e => setPrice(parseFloat(e.target.value))} />

// [OK] Locale-safe - accept both . and , as decimal separators
const [priceText, setPriceText] = useState('')
<input
  type="text"
  inputMode="decimal"
  placeholder="e.g. 12.99"
  value={priceText}
  onChange={e => setPriceText(e.target.value)}
/>
// On save: normalise and parse
const price = parseFloat(priceText.replace(',', '.'))
if (isNaN(price) || price <= 0) { setError('Valid price required'); return }
```

Note: `isNaN(NaN) === true` and `NaN <= 0 === false` - always use `isNaN()` to validate, never just `value <= 0`.

### 1.8 Environment variable base URLs

```
# .env
VITE_ADMIN_BASE=/admin
VITE_DATA_BASE=/data
```

Access in code: `const BASE = import.meta.env.VITE_ADMIN_BASE`

### 1.9 Runtime verification

Follow the **Runtime Verification Protocol** in `SKILL.md`. It covers:
- Path A (Chrome DevTools MCP): `navigate_page` -> `take_screenshot` -> `list_console_messages` -> `list_network_requests` -> `take_snapshot`, with a triage table for every common console error pattern
- Path B (no Chrome DevTools MCP): a ready-made message to send to the user asking them to check the browser, with an interpretation guide for their answers

Minimum checks without the full protocol:

```sh
# macOS / Linux - confirm HTTP reachability
curl -s -o /dev/null -w "%{http_code}" http://localhost:<VITE-PORT>
curl -s -o /dev/null -w "%{http_code}" "http://localhost:<CAP-PORT>/<servicePath>/<EntitySet>?\$top=1"
```

```powershell
# Windows - confirm HTTP reachability
Invoke-WebRequest -Uri "http://localhost:<VITE-PORT>" -UseBasicParsing | Select-Object StatusCode
Invoke-WebRequest -Uri "http://localhost:<CAP-PORT>/<servicePath>/<EntitySet>?`$top=1" -UseBasicParsing | Select-Object StatusCode
```

Both must return `200`. An HTTP 200 on the app URL confirms the server is running - it does not confirm the app renders correctly or that OData data loads. Always proceed to the full protocol for visual and data confirmation.

---

## 2. Fetch patterns

### 2.1 The standard fetch hook skeleton

Every data-fetching `useEffect` must use this skeleton. None of the four guard elements may be omitted:

```ts
useEffect(() => {
  let cancelled = false                    // (1) cancel guard - React 19 StrictMode mounts twice

  fetch(url)
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)  // (2) r.ok guard - parse errors silently swallow 4xx/5xx
      return r.json()
    })
    .then(({ value }) => {
      if (!cancelled) {                    // (3) check cancel before state update
        setData(value ?? [])
        setLoading(false)
      }
    })
    .catch(err => {
      if (!cancelled) {                    // (4) check cancel before error state update
        setError(parseCapError(err))
        setLoading(false)
      }
    })

  return () => { cancelled = true }        // cleanup - marks effect as cancelled
}, [deps])
```

### 2.2 Parallel fetches

When a view needs data from two independent endpoints:

```ts
let cancelled = false
Promise.all([
  fetch('/service/EntityA').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
  fetch('/service/EntityB').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
])
  .then(([a, b]) => {
    if (cancelled) return
    setEntityA(a.value ?? [])
    setEntityB(b.value ?? [])
    setLoading(false)
  })
  .catch(err => { if (!cancelled) { setError(String(err)); setLoading(false) } })
return () => { cancelled = true }
```

Both `r.ok` guards are required - one failing fetch rejects the whole `Promise.all`.

### 2.3 CAP error parser

```ts
function parseCapError(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
// For errors thrown from non-ok responses, the message is "HTTP 400" / "HTTP 500"
// Parse the response body separately if you need the CAP error message text
```

### 2.4 Detail page fetch - always $expand navigation properties displayed in the view

When fetching a single entity for a detail page, always include `$expand` for every navigation property whose fields are displayed in the view. Omitting `$expand` causes those fields to be `undefined` in the response, showing blank values or raw IDs (e.g. `070001` instead of `"Sunshine Travel"`) with no error.

```ts
// [X] Misses navigation data - Agency and Status will be undefined
fetch(`/odata/v4/service/Items(ID=${id},IsActiveEntity=true)`)

// [OK] Expand all navigations used in the view
fetch(`/odata/v4/service/Items(ID=${id},IsActiveEntity=true)?$expand=Agency($select=ID,Name),Status($select=code,descr)`)
```

Before writing a detail page, list every field displayed and identify which come from navigation properties vs. the entity itself. Add an `$expand` entry for each navigation. This applies to both the initial load fetch and to any re-fetch after save/approve/reject actions.

### 2.5 URL construction - never use URLSearchParams for OData `$` parameters

See `cap-shared.md §3.4` for the full explanation. Practical rule:

```ts
// (v)... Safe pattern for all OData query options:
const filter  = encodeURIComponent(`contains(tolower(name),'${term.replace(/'/g, "''")}')`)
const orderby = encodeURIComponent('name asc')
const url = `/service/Items?$filter=${filter}&$orderby=${orderby}&$top=20`

// (v)... If you use URLSearchParams for non-$ params, always replaceAll:
const params = new URLSearchParams({ 'sap-locale': 'de', '$top': '20' })
const url = `/service/Items?${params.toString().replaceAll('+', '%20')}`

// [X] Never:
const params = new URLSearchParams({ '$filter': `name eq '${term}'` })
// produces %24filter - CAP returns 400
```

---

## 3. Draft lifecycle from React

When the target entity has `@odata.draft.enabled`, all writes follow this sequence. See `cap-shared.md §5.2` for the full contract. This section provides the React fetch implementation.

```ts
const AUTH = 'Basic ' + btoa('username:password')  // only for @requires services
const h = (extra: Record<string, string> = {}) => ({
  Authorization: AUTH,
  'Content-Type': 'application/json',
  ...extra,
})

// 1. Silent discard - clears any stale draft (404 = no draft, that's fine)
async function discardDraft(serviceBase: string, key: string) {
  await fetch(`${serviceBase}/Items(${key},IsActiveEntity=false)`,
    { method: 'DELETE', headers: h() }).catch(() => {})
}

// 2. Enter edit mode
async function draftEdit(serviceBase: string, key: string, serviceName: string) {
  const r = await fetch(
    `${serviceBase}/Items(${key},IsActiveEntity=true)/${serviceName}.draftEdit`,
    { method: 'POST', headers: h(), body: '{}' }
  )
  if (!r.ok) throw new Error(`draftEdit failed: HTTP ${r.status}`)
}

// 3. Patch the draft
async function patchDraft(serviceBase: string, key: string, changes: Record<string, unknown>) {
  const r = await fetch(
    `${serviceBase}/Items(${key},IsActiveEntity=false)`,
    { method: 'PATCH', headers: h(), body: JSON.stringify(changes) }
  )
  if (!r.ok) throw new Error(`PATCH failed: HTTP ${r.status}`)
  // Note: HTTP 200 with DraftMessages[] means soft validation warnings - not blocking
}

// 4. Activate (save)
async function draftActivate(serviceBase: string, key: string, serviceName: string) {
  const r = await fetch(
    `${serviceBase}/Items(${key},IsActiveEntity=false)/${serviceName}.draftActivate`,
    { method: 'POST', headers: h(), body: '{}' }
  )
  if (!r.ok) {
    const body = await r.json().catch(() => ({}))
    throw new Error(body?.error?.message ?? `draftActivate failed: HTTP ${r.status}`)
  }
}

// Full edit workflow:
async function saveItem(serviceBase: string, key: string, changes: Record<string, unknown>) {
  // serviceBase = your service proxy path, e.g. '/admin' or '/items'
  try {
    await discardDraft(serviceBase, key)       // clear any stale draft first
    await draftEdit(serviceBase, key, 'MyService')
    await patchDraft(serviceBase, key, changes)
    await draftActivate(serviceBase, key, 'MyService')
  } catch (err) {
    await discardDraft(serviceBase, key)    // always clean up on failure
    throw err
  }
}
```

**Key rules (derived from verified CAP behavior):**
- `draftEdit` on an entity that already has a draft returns HTTP 500 - always discard first
- Direct PATCH on `IsActiveEntity=true` returns HTTP 501 - always go through draftEdit
- Draft PATCH (step 3) returns HTTP 200 with `DraftMessages[]` for `@assert.range`/`@assert.format` violations - these are warnings, not blocking
- `draftActivate` returns HTTP 400 for all `@assert.*` violations - this is the blocking gate

### 3.1 Draft CREATE workflow (new entity on draft-enabled entity) `[verified-TrialJ-2026-05-28]`

A simple `POST /service/Entity` on a `@odata.draft.enabled` entity creates a **draft** (`IsActiveEntity=false`), not an active entity. The POST returns `201 Created` so it appears to succeed, but the entity is **invisible** to all list queries that filter `IsActiveEntity eq true`. The created record is permanently orphaned until `draftActivate` is called.

```ts
// [X] WRONG - POST alone: entity created as draft, never appears in list
const result = await fetchMutation('/admin/Books', 'POST', { title, author_ID, ... })
navigate('/books')  // list shows nothing new - the book is a draft

// [OK] CORRECT - POST then draftActivate:
const draft = await fetchMutation('/admin/Books', 'POST', {
  title, author_ID, genre_ID, stock, price, currency_code,
}) as { ID?: number }

if (draft?.ID != null) {
  await fetchMutation(
    `/admin/Books(ID=${draft.ID},IsActiveEntity=false)/AdminService.draftActivate`,
    'POST', {}
  )
}
navigate('/books')  // book is now IsActiveEntity=true and appears in the list
```

**Always use the 2-step pattern for draft-enabled entity creation:**
1. `POST /service/Entity` -> response contains `{ ID: N, IsActiveEntity: false }`
2. `POST /service/Entity(ID=N,IsActiveEntity=false)/ServiceName.draftActivate`

**Post-creation cleanup:** If `draftActivate` fails (validation error), the draft is orphaned. The next Create attempt must first `DELETE /service/Entity(ID=N,IsActiveEntity=false)` (discard) before `POST`ing a new draft.

**CAP `@assert` on FK associations fires during `draftActivate`** (not during the initial POST). If a CDS field has `@assert: (case when not exists assoc then 'X does not exist' end)`, passing `null` for that FK ID causes `draftActivate` to fail with HTTP 400. The UI must validate that all such FK fields are non-null before calling the 2-step create pattern. See `cap-shared.md §5.3`.

---

## 4. OData date handling

CAP returns `Edm.Date` values as ISO strings (`"2024-06-06"`). `new Date('2024-06-06')` parses as UTC midnight, which shows as the **previous calendar day** in UTC- time zones.

```ts
// (v)... Parse as local midnight - always the correct calendar date
function formatODataDate(dateStr: string): string {
  if (!dateStr) return ' -- '
  const [year, month, day] = dateStr.split('-').map(Number)
  if (!year || !month || !day) return dateStr
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}
```

For filter inputs: native `<input type="date">` always returns `YYYY-MM-DD` (correct for OData `$filter` against `Edm.Date` - no conversion needed).

---

## 5. Key predicate construction helpers

```ts
// UUID / string key
const singleKey = (id: string) => `Items(ID='${encodeURIComponent(id)}',IsActiveEntity=true)`

// Composite key (e.g., ID: String + date: Edm.Date)
// Note: Edm.Date is NOT quoted in key predicates
const compositeKey = (id: string, date: string) =>
  `Items(ID='${encodeURIComponent(id)}',date=${date})`

// FK filter for cuid entity (avoid UUID validation trap - filter by name instead)
const byName = (name: string) =>
  `$filter=category/name eq '${name.replace(/'/g, "''")}'`
```

---

## 6. $batch from React

CAP supports JSON `$batch`. Always use JSON format (multipart/mixed returns HTTP 400 on CAP 9.x).

```ts
async function sendBatch(
  serviceBase: string,
  requests: { id: string; method: string; url: string; body?: unknown }[],
  auth?: string
) {
  const r = await fetch(`${serviceBase}/$batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: auth } : {}),
    },
    body: JSON.stringify({ requests }),
  })
  if (!r.ok) throw new Error(`$batch failed: HTTP ${r.status}`)
  const { responses } = await r.json()
  return responses as { id: string; status: number; body: unknown }[]
}

// Usage - inner paths must be relative (no service prefix):
const results = await sendBatch('/service', [  // replace '/service' with your proxy path
  { id: '1', method: 'GET', url: "Items?$filter=IsActiveEntity eq true&$top=5" },
  { id: '2', method: 'DELETE', url: "Items(ID='abc',IsActiveEntity=true)" },
])
```

Rules:
- Outer POST always returns HTTP 200 - check individual response `status` fields
- Write operations inside `$batch` must include `atomicityGroup` for rollback semantics
- Inner paths are **relative** - omit the `/odata/v4/<service>/` prefix
- Cross-service paths inside a single `$batch` return HTTP 404

---

## 7. React state patterns for CAP data

### 7.1 IsActiveEntity filter in list bindings

```ts
// Always add IsActiveEntity filter for draft-enabled entities
const url = `/admin/Items?$filter=IsActiveEntity eq true&$orderby=name asc&$top=50`
```

### 7.2 Refresh after mutation

After any create/update/delete, re-fetch the affected entity or list to get updated state. Do not rely on local state mutations - the server may have changed computed fields (e.g. `free_seats`, `modifiedAt`).

### 7.3 Filter state isolation for dialogs/popovers

Copy current filter state into a local draft on open. Apply pushes draft to live; Cancel discards:

```ts
const [draft, setDraft] = useState({ ...query })
const openFilter  = () => { setDraft({ ...query }); setOpen(true) }
const applyFilter = () => { onChange({ ...draft, page: 0 }); setOpen(false) }
const resetFilter = () => { const r = emptyQuery(); setDraft(r); onChange(r); setOpen(false) }
```

---

## 8. TypeScript patterns

### 8.1 Typed OData response

```ts
interface ODataCollection<T> {
  value: T[]
  '@odata.count'?: number
}

const { value: items, '@odata.count': total } = await r.json() as ODataCollection<Item>
```

### 8.2 Accessing WC shadow DOM in event handlers

Some UI5 Web Components render controls in shadow DOM. Standard `event.target.closest('tag')` does not cross the shadow boundary. Use `composedPath()` instead:

```ts
onClick={(e) => {
  const path = e.nativeEvent.composedPath() as Element[]
  if (path.some(el => el.tagName?.toLowerCase() === 'ui5-checkbox')) return
  navigate(`/items/${item.ID}`)
}}
```

---

## 9. Common silent failures checklist

Before declaring a React+CAP app working, verify each item:

- [ ] Every `useEffect` fetch has the `cancelled` flag pattern
- [ ] Every fetch checks `r.ok` before `.json()`
- [ ] No `URLSearchParams` used for OData `$` key names
- [ ] Every `URLSearchParams.toString()` is followed by `.replaceAll('+', '%20')`
- [ ] Draft entity list queries include `$filter=IsActiveEntity eq true`
- [ ] No `$filter=IsActiveEntity eq true` inside `$expand`
- [ ] After any mutation, affected data is re-fetched from the server
- [ ] Date-only strings formatted with local midnight parsing, not `new Date(str)`
- [ ] Vite proxy configured - no absolute `http://localhost:PORT` in fetch calls
- [ ] `cds watch` running from CAP project root before testing

---

## 10. Cross-navigation filter sync - Select key remount pattern (F-01)

When an Overview page navigates to a list page with a URL query parameter representing a filter (e.g. /flights?airline=Sunset%20Wings), TWO things must happen:

1. **The data is filtered** - only rows matching the parameter are shown
2. **The filter Select control reflects the active filter** - the dropdown shows the selected value, not "All ..."

@ui5/webcomponents-react Select and @sap-ui/fx-components Select are **uncontrolled components** - they do not respond to a value prop change after initial mount. Re-rendering does not update the selected option.

**Required pattern:** Force a remount by using a key derived from the filter state:

```tsx
// 1. Derive a key from the filter state - changes force remount
const airlineSelectKey = `airline-select-${airlineFilter}`

// 2. Pass key to Select; mark each Option with selected={...}
<Select key={airlineSelectKey}
  onChange={(d) => setAirlineFilter(d.selectedOption?.value ?? '')}>
  <Option value="" selected={!airlineFilter}>All Airlines</Option>
  {airlines.map(a => (
    <Option key={a.ID} value={a.name} selected={airlineFilter === a.name}>
      {a.name}
    </Option>
  ))}
</Select>
```

**Critical requirements:**
- key must include the current filter value so React unmounts and remounts the Select whenever the filter state changes from URL params
- Every <Option> must have selected={filterState === optionValue} so the remounted Select renders with the correct pre-selected option
- The "All / Any" option must have selected={!filterState} so it shows when no filter is active
- Use the **same value** string in the Option value prop, URL parameter, and filter state - never use IDs when the URL carries display names

> **Async option loading `[verified-TrialJ-2026-05-28]`:** When the `<Option>` list is populated via an async fetch (e.g. genres loaded via `useEffect`), the `key` must also encode the option-load state. Without it, the Select mounts with the correct key but an empty option list; when options arrive the key is unchanged so React does NOT remount, and the pre-selected option is never applied.
>
> ```tsx
> // [X] WRONG - key only encodes the selected value; if options arrive late,
> // the Select shows "All ..." even when genreFilter === 'Drama'
> const genreSelectKey = `genre-${genreFilter}`
>
> // [OK] CORRECT - include the options-loaded flag so the Select remounts
> // when options become available (genresLoaded flips false -> true once)
> const genreSelectKey = `genre-${genreFilter}-${genresLoaded ? 'loaded' : 'loading'}`
> ```
>
> Apply this pattern to any filter Select whose option list is populated asynchronously. The load flag only adds one remount per page lifetime (when the fetch resolves) and does not affect interactive use.

**Verification checklist (required for every cross-navigation target page):**
1. Navigate to the list page directly (no params) - Select shows "All ..."
2. Navigate from Overview via a chart/tile click - Select shows the filtered value
3. Click Clear - Select reverts to "All ..."
4. Navigate from Overview to a different filter value - Select updates immediately

Failure of any of these four steps = blocking defect.

---

## 11. Cross-navigation - Overview charts and KPI tiles must navigate to filtered lists

**Every** chart segment, KPI tile, and breakdown row in Overview pages MUST have an onClick handler that navigates to the corresponding filtered list view. Cross-navigation is a core UX requirement - non-clickable charts produce an incomplete app.

Pattern:
```tsx
// In a chart row / KPI tile onClick:
onClick={() => navigate(/items?status=)}

// In the list page, read the URL param on mount:
const [searchParams] = useSearchParams()
useEffect(() => {
  const s = searchParams.get('status')
  if (s) setStatusFilter(s)
}, [searchParams])
```

**Generation checklist - before marking any Overview page complete:**
- [ ] Every KPI tile has an onClick handler that navigates with a relevant URL filter param
- [ ] Every chart row/segment has an onClick handler
- [ ] The corresponding list page reads the URL param and applies it as a server-side OData $filter (not client-side array filtering)
- [ ] The filter Select control on the list page uses the key-remount pattern (see §10) to reflect the active filter value
- [ ] There is a visible indication on the list page that a filter is active (filter chip, badge, count in title, or always-visible filter control)
- [ ] Row click in the list page passes `{ state: { from: currentURL } }` to the detail navigate call (PART 6 - back navigation preserves filter)

**Cross-navigation five-part contract (all five parts must be implemented together):**

PART 1 - Click handler on the Overview page
  onClick passes the filter value as a URL parameter: navigate('/items?status=O')
  This is the only part that is consistently implemented. The others are frequently missing.

PART 2 - Server-side filter application on the List page (on mount)
  useEffect reads the URL param and applies a server-side OData $filter:
  const status = searchParams.get('status')
  if (status) setStatusFilter(status)  // triggers re-fetch with $filter=status_code eq 'O'
  NEVER filter client-side (array.filter()) on data already loaded with $top.

PART 3 - Filter control reflection (visible UI)
  The filter Select shows the active value, not "All ...".
  Requires the key-remount pattern: key={`status-${statusFilter}`} on the Select.
  Result: user sees "Status: Open" in the filter bar and knows the view is filtered.

PART 4 - Active filter indication (visible UI)
  If the filter control is not visible by default (collapsed panel or absent), the user must still know:
  (a) the view is filtered, (b) what the filter is, (c) how to clear it.
  Acceptable: filter chip above the table [Status: Open x], badge on filter toggle, count in title.
  Unacceptable: filtered list with no visual indication a filter is active.

**PART 5 - Reset all filters before applying cross-nav state (CRITICAL - frequently missing)**

  When the user navigates from Overview to the list via a chart/tile click, the list page MUST
  reset ALL filter state to empty FIRST, then apply only the single attribute carried by the
  cross-nav. If it only sets the new filter without clearing the old ones, previous filters
  from an earlier visit accumulate: clicking "High" then Back then "Closed" shows only
  "Closed + High" instead of all 180 Closed incidents.

  ```tsx
  // [X] WRONG - only sets the new filter, leaves stale filters from previous visit
  useEffect(() => {
    const s = searchParams.get('status')
    if (s) setStatusFilter(s)   // urgencyFilter, customerFilter still set from last visit
  }, [searchParams])

  // [OK] CORRECT - reset everything, then apply only the cross-nav attribute
  useEffect(() => {
    // Step 1: reset all
    setStatusFilter('')
    setUrgencyFilter('')
    setCustomerFilter('')
    setSearchQuery('')
    // Step 2: apply only what the URL carries
    const s = searchParams.get('status')
    if (s) setStatusFilter(s)
    const u = searchParams.get('urgency')
    if (u) setUrgencyFilter(u)
  }, [searchParams])
  ```

  The reset must happen even if `searchParams` has no relevant param - navigating from
  Overview with no filter (e.g. clicking "Total" KPI tile) must also clear stale state.

**PART 6 - Back navigation preserves list filter state (CRITICAL - frequently missing)**

  When the user navigates from a filtered list to a detail page and presses Back, the list
  page MUST restore the same URL (with all query params) that was active when the detail was
  opened. React Router's `navigate('/items')` discards all query params, returning the user
  to the unfiltered list.

  Pattern: pass `state.from` on row click; read it in the detail page's back handler.

  **In the list page - pass current URL as navigation state:**
  ```tsx
  // In BooksListPage row click handler:
  onClick={() => navigate(
    `/books/${book.ID}`,
    { state: { from: window.location.pathname + window.location.search } }
  )}
  ```

  **In the detail page - use state.from as the back URL:**
  ```tsx
  import { useLocation } from 'react-router-dom'

  const location = useLocation()
  // Falls back to '/books' if no state (e.g. direct URL access)
  const backUrl = (location.state as { from?: string } | null)?.from ?? '/books'

  // In back button:
  <Button icon="nav-back" onClick={() => navigate(backUrl)}>Books</Button>
  ```

  Result: after Overview -> /books?genre=Fiction (17 books) -> click row -> Back, the user
  returns to /books?genre=Fiction (17 books filtered) instead of /books (105 unfiltered).

  This is PART 6 of the cross-navigation contract. All six parts must be implemented together:
  - PART 1: Click handler sets URL parameter
  - PART 2: List reads URL param and applies server-side $filter
  - PART 3: Filter Select reflects active value (key-remount pattern)
  - PART 4: Visible active-filter indication
  - PART 5: Reset all filters before applying cross-nav state
  - **PART 6: Back from detail restores list filter URL state**

### PART 1 amendment: Date-dimension charts `[verified-TrialK-2026-05-29]`

When a chart is grouped by a **date or time field** (month, quarter, year) the PART 1 URL parameter MUST encode the ISO period key, not the formatted display label. Passing the display label as a text search (`?q=Jul 2021`) silently returns zero results because the search targets incident titles and descriptions, not the `createdAt` field.

```ts
// [X] WRONG - text search on "Jul 2021" matches nothing in title/description
navigate(`/items?q=${encodeURIComponent(row.month)}`)   // row.month = "Jul 2021"

// [OK] CORRECT - ISO year-month key triggers an OData date-range filter on the list page
navigate(`/items?month=${row.monthKey}`)                 // row.monthKey = "2021-07"
```

The destination list page MUST convert the ISO key to an OData `Edm.DateTimeOffset` range:

```ts
// In buildListUrl (or equivalent):
if (month) {
  const [y, m] = month.split('-').map(Number)
  const start = new Date(y, m - 1, 1).toISOString()  // "2021-07-01T00:00:00.000Z"
  const end   = new Date(y, m,     1).toISOString()  // "2021-08-01T00:00:00.000Z"
  filters.push(`createdAt ge ${start} and createdAt lt ${end}`)
}
```

**Gate:** After clicking a date-dimension chart bar, `evaluate_script("window.location.href")` must return a URL containing `?month=YYYY-MM`. A URL containing `?q=` from a date chart click is always wrong.

**Additional checklist item for Overview/Analytics pages:**
- [ ] Every date-grouped chart bar navigates with `?month=YYYY-MM` (ISO key), NOT `?q=<display-label>`

---

## 12. Problem/severity views - sort by severity ascending, not alphabetically

When a filter produces a "problem" view (low stock, critical urgency, overdue, fully booked), the default sort must be by the severity indicator **ascending** (most critical first), not by the display name.

```tsx
// [X] Default alphabetical sort hides the worst case in the middle
// [OK] Sort by severity field when a problem filter is active
const sorted = stockFilterActive
  ? [...items].sort((a, b) => a.stock - b.stock)   // 0 stock first
  : items  // default sort for unfiltered view
```

Also ensure all active filter controls (toggle buttons, Select) visually reflect the applied filter after cross-navigation (see §10).

---

## 13. Server-side aggregation - never use client-side aggregation on OData data

**CRITICAL rule: never derive counts, totals, or summaries from a `$top`-limited array.**

Any page that displays KPIs, counts, charts, or summaries MUST use server-side OData `$apply` or `$count`. Client-side `Array.filter()`, `Map`, and `reduce()` on a `$top`-limited fetch only operate on a subset of the full dataset and produce incorrect analytics values.

```ts
// [X] WRONG - counts only the first N records loaded; wrong when dataset > $top
const total = items.length
const openCount = items.filter(i => i.status === 'O').length

// [OK] CORRECT - server computes count across the full dataset
const res = await fetch('/service/Items?$apply=aggregate($count as total,' +
  '$filter(status_code eq \'O\')/$count as openCount)')
const [{ total, openCount }] = (await res.json()).value
```

**This rule applies to ALL page types:** Overview, Stats, Report, and any summary section - not just the main list page.

**Correct OData `$apply` patterns for analytics:**

```ts
// Count by status (full dataset)
GET /service/Items?$apply=groupby((status_code),aggregate($count as count))

// KPI totals in one request
GET /service/Items?$apply=aggregate($count as total)
// Then separate requests per status, or use $filter inside $apply:
GET /service/Items?$apply=filter(status_code eq 'O')/aggregate($count as count)

// Top N by count
GET /service/Items?$apply=groupby((category/name),aggregate($count as count))
  &$orderby=count desc&$top=8
```

**Server-side paging for list/report views (not bulk load):**
```ts
// [OK] Correct - server-side paging with accurate total
const url = `/service/Items?$count=true&$top=${PAGE_SIZE}&$skip=${skip}`
const { value: items, '@odata.count': total } = await fetch(url).then(r => r.json())
// Show total from @odata.count, NOT from items.length
```

**Verification gate:** After building any analytics page, verify at least one KPI value by fetching the equivalent `$count` or `$apply` URL directly and confirming the UI displays the same number.

**Filter rule:** Never filter data in JavaScript on data loaded with `$top`. Always apply filters via OData `$filter` URL parameter. The count shown to users must come from `@odata.count`, never from `array.length`.

```ts
// [X] WRONG - filters the already-truncated in-memory array
const filtered = items.filter(i => i.status === selectedStatus)
setCount(filtered.length)  // wrong: count of truncated subset

// [OK] CORRECT - filter on the server, get accurate count
const url = `/service/Items?$count=true&$top=${PAGE_SIZE}` +
  (selectedStatus ? `&$filter=status_code eq '${selectedStatus}'` : '')
const { value, '@odata.count': count } = await fetch(url).then(r => r.json())
setCount(count)  // correct: server count across full dataset
```