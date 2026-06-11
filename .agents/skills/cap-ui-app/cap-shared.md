# CAP / OData V4 - Shared Rules (All UI Technologies)

**Scope:** How SAP CAP OData V4 behaves as a backend. All rules are expressed with generic entity and service names. Where behavior differs by UI technology, an inline tag marks the scope: `[SAPUI5/FE]`, `[React]`, or `[All]`.

**Sample project names** (bookshop `Books`/`Authors`, xflights `Flights`/`Airlines`, incidents `Incidents`) appear only in `(e.g. ...)` qualifiers. Derive actual values from the user's own CAP project.

---

## 1. Pre-flight checklist

Before writing any UI code, verify every item:

- [ ] **Port availability:** Before starting `cds watch`, confirm the target port is free. In multi-project environments, a stale `cds watch` process from a previous session may already hold the port - `cds watch` will silently start against the wrong project's data or fail to bind.
  ```powershell
  # Windows - find what holds a port (e.g. 4004)
  netstat -ano | findstr ":4004 "
  Get-WmiObject Win32_Process -Filter "ProcessId=<PID>" | Select-Object CommandLine
  Stop-Process -Id <PID> -Force
  ```
  ```sh
  # macOS / Linux
  lsof -i :4004 -i :4005 -i :4006
  kill -9 <PID>
  ```
- [ ] **Parent folder hygiene:** If the CAP project lives inside a parent folder that has its own `package.json`, confirm that parent does NOT list `@sap/cds`, `@sap/cds-dk`, or `@cap-js/sqlite` as dependencies. A root-level `@sap/cds` install shadows the project-level one and causes `cds watch` to fail with `@sap/cds was loaded from different locations`.
- [ ] **cds-dk / @sap/cds version alignment:** Run `cds version` and compare with the `@sap/cds` semver in the project's `package.json`. A mismatch of major versions (e.g. project on v6, cds-dk on v9) is fatal - update the project's `@sap/cds` (and add `@cap-js/sqlite: ^1` if upgrading to v9) before proceeding.
- [ ] **@cap-js/sqlite native build:** After adding `@cap-js/sqlite` as a dependency, if `npm install` fails on `better-sqlite3` native compilation, use `npm install --ignore-scripts` to skip the build step. If the SQLite binary is still missing at runtime, install a pre-built binary separately or copy from a project that already has it built on the same Node.js version.
- [ ] `cds watch` (or `cds run`) starts without errors from the **CAP project root**
- [ ] Target service appears in the startup output with its URL path
- [ ] `GET <serviceUrl>/$metadata` returns XML with `EntityType` entries
- [ ] `GET <serviceUrl>/<EntitySet>?$top=1` returns HTTP 200 with `{ "value": [...] }`
- [ ] Auth mode identified: no `@requires` -> anonymous; `@requires` present -> mock users configured or SSO available
- [ ] Draft mode identified: `@odata.draft.enabled` present on the target entity -> every fetch pattern changes (see §5)
 - **Before adding `IsActiveEntity` filters:** Verify the entity has `@odata.draft.enabled` in the **service** definition (not the DB entity). Read-only projections (e.g. defined with `projection on`) do NOT inherit draft unless explicitly annotated. If `@odata.draft.enabled` is absent, `IsActiveEntity` is not a valid field - using it in `$filter` returns HTTP 400. Pattern: check `GET $metadata` for `IsActiveEntity` in the entity's key fields; if it's not there, do not use it.
 - **`$filter=IsActiveEntity eq true` on a non-draft entity is silently ignored** -- it does not cause an error, it just has no effect and all records are returned. This is harmless but creates misleading code. Remove `IsActiveEntity` filters from any fetch that targets a non-draft entity.
- [ ] `cds deploy` has been run after the last schema change
- [ ] **Correct database file:** Check `package.json -> cds.db.credentials.url` for the project-specific SQLite filename (e.g. `incidents.db`, `bookshop.db`). The default `cds deploy` output is `db.sqlite`. If the project uses a custom name, always run: `npx cds deploy --to sqlite:<filename>.db`. Running `cds deploy` to the wrong file produces a stale schema that silently serves empty or missing columns.
- [ ] **Server restart after schema changes:** After running `cds deploy`, restart `cds watch` / `cds serve`. If running `cds serve` (not `cds watch`), it does NOT auto-reload on schema changes. Failure to restart causes the server to continue serving the old schema even after deploy succeeds.
- [ ] **[JS only] Session startup sequence:** `node_modules` are wiped on every Joule Studio sandbox restart. Before starting work in a JS session: run `npm install` first. Also ensure `~/.cds-services.json` exists: `mkdir -p /home/vmuser && echo '{}' > /home/vmuser/.cds-services.json`. See `joule-studio.md §4`.

**If any step fails: stop. Fix the CAP backend before generating UI code.**

**When the project exposes a separate write (admin) service alongside a read-only browse service:** Before writing any Create or Edit form handler that POSTs or PATCHes to the admin service, run `GET <adminServiceUrl>/<EntitySet>?$top=1` and inspect the response field names and types. The admin service often uses integer FK fields (e.g. `author_ID: 123`) while the browse/catalog service uses flattened string projections (e.g. `author: "Jane Austen"`). Sending the browse service's string fields to the admin service will produce HTTP 400 "Value is required" or "Integrity constraint" errors. Always inspect `$metadata` or a `$top=1` response for the admin service before writing any create/update payload.

---

## 2. Service URL rules

CAP serves all services at `/odata/v4/<service-name>/`. Some services register a short alias (e.g. `CatalogService` at `/browse`). Check `cds compile '*' --to serviceinfo` for the exact path.

```
# Example output - illustrative names only, actual values come from your project:
ProductService { at: '/browse' }            <- alias; use /browse/ as URI
AdminService   { at: '/odata/v4/admin' }    <- no alias; use /odata/v4/admin/
DataService    { at: '/odata/v4/data' }     <- no alias; use /odata/v4/data/
```

**[SAPUI5/FE]** Data source URI in `manifest.json` must be root-relative with a trailing slash:
```json
"uri": "/browse/"
```
Never use `http://localhost:4004/browse` - the app will fail when deployed.

**[React]** Use a Vite proxy so all OData requests are same-origin (see `react-cap-shared.md §1`). In fetch calls, use the short alias path: `fetch('/browse/Items?...')`.

---

## 3. Key predicates and $filter syntax

### 3.1 Quoting rules (all services)

| OData type | Quote style | Example |
|---|---|---|
| `Edm.String` / `Edm.Guid` (UUID) | Single quotes | `Items(ID='abc-123')` |
| `Edm.Int32` / `Edm.Decimal` | No quotes | `Items(ID=42)` |
| `Edm.Date` | No quotes | `Items(date=2024-06-06)` |
| `Edm.DateTimeOffset` | No quotes | `modifiedAt ge 2024-01-01T00:00:00Z` |
| `Edm.Boolean` | No quotes | `IsActiveEntity eq true` |

Composite keys: every key field must be present, in any order:
```
Items(ID='abc-123',IsActiveEntity=true)     <- correct
Items(ID='abc-123')                          <- 400 for draft-enabled entities
```

**CRITICAL - Integer key predicates require named parameter form when combined with `IsActiveEntity`:**

When an entity uses an integer primary key (e.g. `key ID: Integer` - NOT `cuid`), the positional key predicate form fails with HTTP 404. The named parameter form is required:

```
# [X] WRONG - returns HTTP 404 "Invalid resource path"
Books(201,IsActiveEntity=true)

# [OK] CORRECT - named parameter form
Books(ID=201,IsActiveEntity=true)
```

This only affects entities with **non-UUID** (non-`cuid`) keys. Entities with `cuid` UUID keys already use named form (`ID='uuid-string'`) which works correctly. Check `$metadata` or the CDS schema: if the key type is `Edm.Int32` or `Edm.Int64`, always use the `ID=N,IsActiveEntity=true` named form.

The same applies to all draft lifecycle operations:
```
# [X] WRONG
Books(201,IsActiveEntity=false)/ServiceName.draftActivate

# [OK] CORRECT
Books(ID=201,IsActiveEntity=false)/ServiceName.draftActivate
```

### 3.2 The `cuid` UUID-validation trap

When a CDS entity is defined as `: cuid, managed`, CAP validates **all** key expressions for that entity as UUID - regardless of what values are actually stored. This affects direct key predicates AND `$filter` on FK fields.

```
# [X] Both cause HTTP 400 "does not contain a valid UUID":
Items(ID='short-code')
$filter=category_ID eq 'short-code'

# [OK] Filter by a non-ID string property on the related entity:
$filter=category/name eq 'Drama'
$filter=contains(tolower(category/name),'dram')

# [OK] Fetch all and filter client-side
# [OK] Plain String key entity (no cuid): works normally
```

Check the CDS schema. If the entity has `: cuid, managed`, single-entity fetch by natural key will fail unless the value is a valid UUID.

> **`Edm.Guid` metadata but string-valued IDs:** Some CAP projections expose a field as `Edm.Guid` in `` but store short string values (e.g. 2-character codes like `EA`, `GA`). The OData V4 client model tries to format filter values as GUID literals, causing HTTP 400 errors. When this mismatch occurs, filter by a navigation path (`airline/name`) instead of the FK scalar (`airline_ID`). Always test: if `=airline_ID eq 'GA'` returns 400, use `=airline/name eq 'Green Albatros'` or equivalent string navigation property.

### 3.3 String filter functions (verified on CAP SQLite)

```
contains(tolower(field),'term')          <- case-insensitive substring
startswith(field,'prefix')
endswith(field,'suffix')
year(dateField) eq 2024                  <- Edm.DateTimeOffset required
length(field) gt 5
```

### 3.4 The OData `$` encoding traps (critical)

These traps cause HTTP 400 with no obvious error, or - worse - CAP silently ignores the parameter and returns unfiltered/uncounted data:

**Trap 1 - `URLSearchParams` encodes `$` as `%24`:**
```ts
// [X] CAP returns 400 or ignores filter - $filter becomes %24filter
const params = new URLSearchParams({ '$filter': "name eq 'X'" })
fetch(`/service/Items?${params}`)

// [OK] Use literal $ in the key name
fetch(`/service/Items?$filter=${encodeURIComponent("name eq 'X'")}`)
```

**Trap 2 - Hard-coded `%24` in template literals (same bug, different cause):**
```ts
// [X] ALSO WRONG - %24filter is still ignored by CAP regardless of how it got there
fetch(`/service/Items?%24count=true&%24filter=IsActiveEntity%20eq%20true`)

// [OK] Always use literal $ -- only the *values* need encoding, never the key names
fetch(`/service/Items?$count=true&$filter=IsActiveEntity%20eq%20true`)
```

CAP treats `%24filter` (encoded `$filter`) as an unknown custom query option and ignores it entirely. The fetch succeeds (HTTP 200) but returns unfiltered data including draft rows, producing incorrect counts and broken filter behaviour. This is one of the most common silent failures.

**Trap 3 - `URLSearchParams` encodes spaces as `+`:**
```ts
// [X] CAP returns 400 - 'name asc' becomes 'name+asc'
const params = new URLSearchParams({ $orderby: 'name asc' })
fetch(`/service/Items?${params.toString()}`)

// [OK] Always add replaceAll after toString()
fetch(`/service/Items?${params.toString().replaceAll('+', '%20')}`)
```

> **Rule:** The `$` character must appear **literally** in OData system query parameter names in the URL string - never as `%24`. This applies whether the encoding comes from `URLSearchParams`, a hard-coded template literal, or any other source. Only the *values* (the right-hand side of `=`) are percent-encoded; key names like `$filter`, `$count`, `$top`, `$expand`, `$orderby`, `$select` are always unencoded.

> **[JS] Environment note (Trap 3):** The `URLSearchParams` space-as-`+` encoding bug
> (Trap 3 above) is silently tolerated in most `[LOCAL]` environments where a lenient
> proxy or browser accepts `+` as a space. In Joule Studio, the CAP OData parser (v9)
> strictly requires `%20` and rejects `+` with HTTP 400 `peg$SyntaxError: Parsing URL
> failed`. This is often the first time this bug surfaces. Always use `encodeURIComponent()`
> for OData clause values - not `URLSearchParams.toString()` alone.

---

## 4. Response handling

### 4.1 Always check `r.ok` before parsing

```ts
// [X] Silently swallows 4xx/5xx - app shows empty list, no error
fetch(url).then(r => r.json()).then(({ value }) => setData(value ?? []))

// [OK] Throws on non-ok - .catch() handles all failures
fetch(url)
  .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
  .then(({ value }) => { setData(value ?? []) })
  .catch(err => setError(parseCapError(err)))
```

### 4.2 CAP error JSON shape (all service types)

```json
{
  "error": {
    "message": "Human-readable message",
    "code": "400",
    "@Common.numericSeverity": 4
  }
}
```

`code` is always a string, never an integer. Multiple errors use `MULTIPLE_ERRORS` with a `details[]` array.

### 4.3 `@odata.count` access

```ts
// @odata.count requires bracket notation - @ prevents dot notation
const { value, '@odata.count': total } = await r.json()
// or:
const json = await r.json()
const total = json['@odata.count'] ?? 0
```

---

## 5. Draft-enabled entities

### 5.1 What `@odata.draft.enabled` changes

When an entity has `@odata.draft.enabled`, the OData key becomes composite: `(ID, IsActiveEntity)`. CAP maintains two rows per in-flight edit: one active (`IsActiveEntity=true`) and one draft (`IsActiveEntity=false`).

**Rules that always apply for draft entities:**
- Every list query must filter `IsActiveEntity eq true` - omitting it returns both rows per in-flight record
- Single-entity read of the active record: `Items(ID='<uuid>',IsActiveEntity=true)`
- Direct PATCH on the active entity returns HTTP 501 - must use the draft lifecycle
- `IsActiveEntity eq true` is forbidden inside `$expand` - CAP returns 400

**[SAPUI5/FE]** The OData V4 model handles draft lifecycle automatically when `@odata.draft.enabled` is set. See `sapui5.md §5` for the controller pattern.

**[React]** Must implement the full draft lifecycle manually. See `react-cap-shared.md §3`.

### 5.2 Draft lifecycle contract

```
1. draftEdit:    POST Items(ID='<uuid>',IsActiveEntity=true)/ServiceName.draftEdit
                 -> 201 Created (success) | 500 (draft already exists - discard first)

2. PATCH draft:  PATCH Items(ID='<uuid>',IsActiveEntity=false)
                 Body: { changed fields only }
                 -> 200 OK | 400 with DraftMessages array (validation hints, not blocking)

3. draftActivate: POST Items(ID='<uuid>',IsActiveEntity=false)/ServiceName.draftActivate
                  -> 201 Created (active entity updated) | 400 MULTIPLE_ERRORS (assert.* failed)

4. Discard:       DELETE Items(ID='<uuid>',IsActiveEntity=false)
                  -> 204 No Content | 404 (no draft existed - ignore)
```

Always discard on error or cancel to release the edit lock.

### 5.3 Draft validation timing

| Annotation | When enforced |
|---|---|
| `@assert.range` | draftActivate (HTTP 400 ASSERT_RANGE) |
| `@assert.format` | draftActivate (HTTP 400 ASSERT_FORMAT) |
| `@assert.target` (FK check) | draftActivate (HTTP 400 ASSERT_TARGET) |
| `@assert.unique` | draftActivate (HTTP 500 SQLITE_CONSTRAINT_UNIQUE on SQLite) |
| `@mandatory` / `@assert.notNull` | draftActivate (HTTP 400 ASSERT_NOTSET) |
| `@assert: (case when not exists assoc)` | draftActivate (HTTP 400) - see note below |
| `req.error()` in before CREATE/UPDATE | Not reliably propagated to draftActivate in CAP 8.x - use schema annotations instead |

> **`@assert (case when not exists association)` and null FK `[verified-TrialJ-2026-05-28]`:** CAP supports explicit existence assertions via CDS expressions:
> ```cds
> genre @assert: (case
>   when not exists genre then 'Specified Genre does not exist'
> end);
> ```
> Unlike `@assert.target` (which only rejects non-null IDs that point to non-existent rows), this pattern also fires when the FK is **null** - because `not exists genre` is true when `genre_ID IS NULL`. The UI must validate that the FK field is non-null BEFORE calling `draftActivate`. If the form allows the field to be blank and the UI does not validate it, `draftActivate` will fail with HTTP 400 and an error message like "Specified Genre does not exist" -- which is confusing because the field was intentionally left empty, not pointing to a wrong ID.
>
> **Diagnostic:** If `draftActivate` returns 400 with "X does not exist" for a field the user left empty, check `srv/constraints.cds` or the service CDS file for `@assert: (case when not exists` patterns on that field's association.

---

## 6. OData query capabilities

### 6.1 $expand

```
# Basic expand
Items?$expand=category,supplier

# Selective fields within expand
Items?$expand=category($select=name),supplier($select=name,country)

# Nested expand - works on CAP SQLite up to depth 3+
Items?$expand=category($expand=parent($select=ID,name))

# $count inside $expand
Items?$expand=lines($count=true;$top=0)
-> response: { "lines@odata.count": 12 }  <- bracket notation required

# FORBIDDEN inside $expand on draft-enabled entities:
Items?$expand=lines($filter=IsActiveEntity eq true)
-> HTTP 400 "Virtual elements are not allowed in expressions"
```

Always add `$top` to nested `$expand` - without it, each parent loads ALL nested records.

> **`$expand` on mock-only or empty-seeded entities:** If a service entity is backed by an external OData service mocked with `--with-mocks` (e.g. xtravels `TravelService.Customers`), or if its backing SQLite table was not seeded (`cds deploy` created the schema but no CSV was loaded), then `$expand=<ThatEntity>` will fail at runtime with `SQLITE_ERROR: no such table: ServiceName_EntityName`. Before adding any `$expand` to a fetch, verify the target entity has data: `GET <serviceUrl>/<EntitySet>?$top=1`. If the response is HTTP 500 or returns an empty `value` array with a `SQLITE_ERROR`, remove the `$expand` and display the raw FK column instead (e.g. `Customer_ID` instead of `Customer/Name`). Never assume a navigation property can be expanded just because it appears in `$metadata`.

### 6.2 $apply (server-side aggregation)

```
Items?$apply=groupby((category),aggregate($count as itemCount,price with average as avgPrice))
      &$orderby=itemCount desc
```

Works on plain entities, projection entities, and denormalized view entities.

> **CRITICAL TRAP - draft entities: `IsActiveEntity` filter MUST be inside `$apply`, not a URL `&` parameter.**
>
> This is the same category of silent failure as the URLSearchParams `%24` encoding trap in §3.4. CAP returns HTTP 200 with `value: []` and no error  -  the fetch succeeds but all analytics show 0 or wrong counts. There is no console warning.
>
> For draft-enabled entities, combining `$filter=IsActiveEntity eq true` with `$apply` using the `&` URL separator does NOT work. The filter must be embedded inside the `$apply` transformation chain:
>
> ```
> # [X] External & filter + $apply returns empty results silently - HTTP 200, value: []:
> Items?$filter=IsActiveEntity eq true&$apply=groupby(...)
>
> # [OK] Filter inside pipeline - operates on the full active entity dataset:
> Items?$apply=filter(IsActiveEntity eq true)/groupby(...)
> Items?$apply=filter(IsActiveEntity eq true)/aggregate(stock with sum as totalStock)
> ```
>
> Always use the embedded filter pattern for ALL `$apply` queries on draft-enabled entities. Check `$metadata` for `IsActiveEntity` in the entity's key fields to identify draft entities.

**Navigation path groupby result shape (CAP SQLite):**
When `groupby((navigation/property))` is used (e.g. `groupby((genre/name))`), CAP SQLite returns the property nested as an object - **not** as a flat slash-separated key:
```ts
// [X] Wrong - 'genre/name' key is never populated on SQLite:
const label = row['genre/name']   // -> undefined -> shows "(None)"

// [OK] Correct - navigate the nested object, fall back to flat key for other backends:
const label = row.genre?.name ?? row['genre/name'] ?? '(None)'
```
Always use both patterns: `row.navigation?.property ?? row['navigation/property']`.

**Null/empty groupby key rows - filter before binding to charts:**
`$apply=groupby((fieldName),...)` returns a row where `fieldName === ""` (empty string) for any records where the field is `null` in the database. When this data is bound to a chart dimension axis, a bar/segment with a blank label is rendered. Always filter these rows out before setting chart model data:
```ts
// [X] Wrong - may produce bars with blank axis labels
model.setData(data.value);

// [OK] Correct - filter out null/empty grouping keys first
model.setData(data.value.filter(row => row.fieldName));
// or for navigation paths:
model.setData(data.value.filter(row => row.genre?.name || row['genre/name']));
```
This applies to all chart types (bar, donut, column) in all four technologies.

**Multi-currency warning:** `price with average as avgPrice` across rows with different `currency_code` values produces a number that is not in any currency. Restrict to a single currency first, or avoid the aggregation.

### 6.3 $search

CAP `$search` is case-insensitive and searches non-key `String` fields on the entity's own table - it does not traverse navigation properties. Multi-word search on CAP 9.8.5 SQLite uses OR semantics (finds records matching any word).

```ts
const url = `/service/Items?$search=${encodeURIComponent(term)}`
```

### 6.4 Pagination ($top / $skip / $count)

```
Items?$count=true&$top=20&$skip=40&$orderby=name asc
-> { "@odata.count": 150, "value": [...20 items...] }
```

CAP uses client-driven offset pagination. Server-side `$skiptoken` / `$delta` is not supported on CAP 9.8.5.

---

## 7. Actions and functions

### 7.1 Bound actions (entity-level)

```
POST /service/Items(ID='<uuid>',IsActiveEntity=true)/ServiceName.actionName
Content-Type: application/json
Body: { "param1": value1 }
```

Namespace prefix (`ServiceName.`) is required. Missing it returns HTTP 404.

### 7.2 Unbound actions (service-level)

```
POST /service/actionName
Content-Type: application/json
Body: { "param1": value1 }
```

No entity key, no `$` prefix. Result is the raw response body (not wrapped in `{ value: ... }`). Re-fetch affected entities afterwards - the action result does not refresh bindings automatically.

### 7.3 Functions vs. actions

Functions = GET (no side effects). Actions = POST (may have side effects). Wrong HTTP method returns HTTP 404.

---

## 8. CAP annotations that affect the client

### 8.1 Schema annotations that block at draftActivate

Use schema-level annotations for validation - they fire reliably at `draftActivate`. Handler-based `req.error()` in `before CREATE/UPDATE` is not reliably propagated to the draftActivate response in CAP 8.x.

### 8.2 `@readonly` vs `@Capabilities`

| Annotation | HTTP effect |
|---|---|
| `@readonly` on entity | POST/PATCH/PUT/DELETE -> HTTP 405 |
| `@Capabilities.InsertRestrictions.Insertable: false` | UI hides Create; but in SAPUI5 1.136.7 FCL this **also blocks OP navigation** - use `@UI.CreateHidden: true` instead |
| `@Capabilities.DeleteRestrictions.Deletable: false` | Hides Delete button only |
| `@Core.Immutable` on field | Field is locked in edit; CAP rejects PATCH on that field |

**[SAPUI5/FE]** `@Capabilities.UpdateRestrictions.Updatable` with a dynamic path expression is silently ignored for `@odata.draft.enabled` entities. Use `@UI.UpdateHidden` with a path expression instead.

**Critical - never offer Edit against a `@readonly` service:**
If a CAP service is annotated `@readonly`, offering Edit/Delete UI controls against it causes `ENTITY_IS_READ_ONLY` (HTTP 405) errors. If the app needs read-only display from one service and writable edit from another (e.g. `CatalogService` is `@readonly`, `AdminService` is writable):
- In view mode: bind to the read-only service
- On Edit click: switch the view binding to the writable service before activating edit mode (draft lifecycle via the admin service)
- Never show Edit/Delete buttons unless the bound service supports writes

**SAPUI5: `submitBatch` on a `@readonly` service silently succeeds but no data is written:**
In SAPUI5 OData V4, `oModel.submitBatch("updateGroup")` returns a resolved promise even when the service rejects the underlying PATCH with HTTP 405. The batch response body contains the 405 error but the JS promise does not re-throw. The UI appears to save successfully while nothing is persisted.
- Always use `submitBatch` only on a model bound to a **writable** service
- If using a dual-model approach (read model + write model), call `submitBatch` on the **write model** (e.g. the admin model), never on the read model
- After `submitBatch`, check the response for `message` entries with `numericSeverity >= 4` (error) and surface them to the user

### 8.3 Managed aspect fields

When an entity extends `managed`, these fields are auto-populated:

| Field | Type | Populated at |
|---|---|---|
| `createdAt` | `Edm.DateTimeOffset` | First insert |
| `modifiedAt` | `Edm.DateTimeOffset` | Insert + every PATCH |
| `createdBy` | `Edm.String` | First insert (user ID) |
| `modifiedBy` | `Edm.String` | Insert + every PATCH |

**[SAPUI5/FE]** `Edm.DateTimeOffset` fields display correctly with plain `{propertyName}` binding - do NOT add an explicit `type:` in OData V4 model bindings (causes blank output).

---

## 9. Database operations

### 9.1 `cds deploy` triggers

Run `cds deploy` (or `npx cds deploy --to sqlite:...`) after any of:
- Adding a column to a CDS entity
- Adding a new entity to the service
- Adding a view entity with `GROUP BY` or aggregate functions
- Installing a reuse package with new entities

`cds compile` succeeds without `cds deploy`, but runtime queries will fail with "no such table/column."

### 9.2 Seed data and CSV

CAP seeds SQLite from CSV files in `db/data/`. Managed fields (`createdAt`, `modifiedAt`) can be pre-populated in CSV using ISO 8601 UTC timestamps. If omitted, those fields are `null` in seeded data - not an error, but the fields appear blank in the UI.

### 9.3 CodeList entities - `name` vs `descr`

CAP `CodeList` entities (used for status codes, categories, etc.) have two text fields:
- `name` - a **localized** string (backed by a `_texts` table). Requires localized data to be populated. If no locale-specific row exists, `name` returns `null` in API responses.
- `descr` - a plain description string. Always returns the value from the main table row.

**If sample data only populates `descr` and not `name`, then `status/name` (or `category/name`) will be `null` in all API responses.** The UI will show blank labels for status and category columns.

Fix options:
1. Populate both `name` and `descr` in CSV seed data (add a `_texts` CSV file for the localized `name`).
2. Use `descr` instead of `name` in UI bindings if only `descr` is populated.
3. Build a code-to-label map in the UI layer using a static mapping, rather than relying on the `name` expansion from the API.

```ts
// Safe fallback pattern for CodeList text fields:
const statusLabel = item.status?.name ?? item.status?.descr ?? item.status_code ?? ' -- '
```

---

## 10. Authentication

### 10.1 Service-level auth with mocked users

```json
"cds": {
  "requires": {
    "auth": {
      "kind": "mocked",
      "users": {
        "alice": { "password": "alice", "roles": ["admin", "support"] }
      }
    }
  }
}
```

**[React]** Add a Basic auth header to every request to authenticated services:
```ts
const AUTH = 'Basic ' + btoa('alice:alice')
fetch(url, { headers: { Authorization: AUTH } })
```

**[SAPUI5/FE]** The browser session handles auth automatically via the CAP login redirect - **but only when running `ui5 serve` directly**. When the app is served by `cds-plugin-ui5` (co-served with `cds watch`), no credentials are injected automatically. A service with `@requires` will return 401/403 to the app before `$metadata` loads, producing a blank page. See `fiori-elements.md §8.6` for development options.

### 10.2 Auth behavior

- `@requires` with no matching role: HTTP 401 (anonymous) or HTTP 403 (wrong role, mocked auth)
- `@restrict` with `where` clause: adds a SQL WHERE filter per-row - only rows matching the clause are returned
- Service-level `@requires` with no mock user configured: blank page, no error message for FE/SAPUI5 apps

---

## 11. i18n / localization

CAP supports `localized String` fields with a companion `_texts` table. The `Accept-Language` request header or `?sap-locale=<code>` query parameter controls which locale is active. `sap-locale` takes precedence over `Accept-Language`.

`$filter` on a localized field resolves the locale-specific value before evaluating the predicate. Without a locale header, the base (default) column value is used.

---

## 12. Computed and virtual fields

Virtual fields (CDS `@Core.Computed` or `virtual`) have no DB column. They must be populated by a CAP `after('READ')` handler.

- `$filter` on virtual fields -> HTTP 501
- `$orderby` on virtual fields -> silently ignored or HTTP 501
- `$select` works - the field appears in the response with the handler-computed value
- Virtual fields are **not** updated during draft reads (draft PATCH bypasses `after READ`)

---

## 13. Error codes reference

| Code | Meaning |
|---|---|
| `ASSERT_RANGE` | Value out of `@assert.range` bounds |
| `ASSERT_FORMAT` | Value fails `@assert.format` regex |
| `ASSERT_TARGET` | FK reference does not exist |
| `ASSERT_NOTSET` | `@mandatory` / `@assert.notNull` field is null |
| `MULTIPLE_ERRORS` | Multiple validation failures - see `details[]` array |
| `DRAFT_ALREADY_EXISTS` | `draftEdit` called when draft already exists (HTTP 500 on CAP 9.x) |
| `ENTITY_IS_READ_ONLY` | PATCH/POST on `@readonly` entity |
| `ENTITY_IS_NOT_CRUD` | POST on entity with `@Capabilities.Insertable: false` |

---

## 14. Server lifecycle management

The agent manages all CAP server processes autonomously. The user is never asked to restart cds watch.

### Starting cds watch silently

**Windows (PowerShell):**
```powershell
$logFile = "cds-watch.log"
Start-Process "cmd.exe" `
  -ArgumentList "/c cds watch > $logFile 2>&1" `
  -WorkingDirectory (Resolve-Path ".").Path `
  -WindowStyle Hidden
Start-Sleep -Seconds 8
# Verify startup (default CAP port is 4004; adjust if your project uses a different port):
Invoke-WebRequest -Uri "http://localhost:<PORT>/$metadata" -UseBasicParsing | Select-Object StatusCode
```

**macOS/Linux:**
```sh
cds watch > cds-watch.log 2>&1 &
sleep 8
# Default CAP port is 4004; replace <PORT> with your project's actual port:
curl -s -o /dev/null -w "%{http_code}" "http://localhost:<PORT>/$metadata"
```

### Detecting crashes

If a CAP OData request returns "connection refused" or network error:
1. Check the log file for crash details: `Get-Content cds-watch.log -Tail 20`
2. Restart using the same silent pattern
3. Wait for startup and re-verify with `GET /$metadata`
4. Note the restart in the checkpoint file

### Stale compilation after hot-reload `[verified-TrialK-2026-05-29]`

If `cds compile '*' --to json` shows a changed annotation but `GET $metadata` still returns the old EDMX after a hot-reload cycle, force a full restart of `cds watch`. Do not assume hot-reload is sufficient for structural annotation changes (`@UI.Facets`, `@UI.FieldGroup`). Cosmetic annotation changes (`@Common.Label`) typically reload correctly; structural ones do not always.

**Symptom:** You add or rearrange `@UI.Facets` or `@UI.FieldGroup` entries in `annotations.cds`, save the file, `cds watch` reports a re-compile, but the Object Page still shows the old section structure. The `$metadata` response still contains the pre-change annotation. A full `cds watch` restart (stop and restart the process) forces re-compilation from scratch and resolves the discrepancy.

### Restart triggers

Always restart cds watch after:
- `npx cds deploy` (schema change applied)
- Adding a new app to the `app/` folder
- Changes to `package.json` `cds` configuration
- Any CDS compilation error that was then fixed
- Structural annotation changes (`@UI.Facets`, `@UI.FieldGroup`) when hot-reload has not reflected them in `$metadata` (see Stale compilation above)

### Port conflicts

If cds watch reports `EADDRINUSE`:
1. Find the occupying process: `netstat -ano | findstr ":4004 "` (Windows) or `lsof -i :4004` (macOS)
2. Kill it: `Stop-Process -Id <PID> -Force` (Windows) or `kill -9 <PID>` (macOS)
3. Restart cds watch

### Log file naming and cleanup

Log files accumulate across sessions. Follow these conventions to prevent workspace clutter:

- Name log files inside the CAP project folder, not at the workspace root: `<project-root>/cds-watch.log`
- Use a single log file per project per session - overwrite rather than append a numbered suffix
- Before starting a new session: check for and delete stale batch files (`.bat`, `.vbs`, `.sh`) and log files from previous sessions at the project root or workspace root
- Never create start scripts at the workspace root level when multiple CAP projects share a parent folder - scripts accumulate and become confusing; use per-project scripts inside each project folder

**Pre-flight cleanup check (add to §1):**
Before starting any long multi-project operation, check for and clean up:
```powershell
# Find stale server scripts and logs at workspace root
Get-ChildItem -Filter "*.bat","*.vbs","*.sh","*.log" -Depth 1 | Where-Object { $_.DirectoryName -eq (Get-Location).Path }
# Remove if from previous sessions
```
