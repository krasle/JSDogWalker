# CAP / OData V4 - Deep Reference Index

**When to load:** For validation tasks, debugging silent failures, or when `cap-shared.md` does not contain the answer.  
**Tier 1 file:** `cap-shared.md` covers the rules needed for standard generation. Load this file additionally when a problem cannot be resolved from `cap-shared.md` alone.  
**Source:** Verified across CAP Node.js 9.x, SQLite, bookshop/xflights/incidents projects. All entity names are generic.

---

## A. Advanced $filter operators

```
# OData `in` operator
$filter=type_ID in (10,11)                   integer FK: no quotes (e.g. category_ID in (10,11))
$filter=status in ('active','pending')      <- string: single quotes
# GUARD: empty in () is invalid -> HTTP 400; skip request when set is empty

# $filter inside $expand - to-one vs to-many semantics
$expand=category($filter=name eq 'Drama')
  -> to-one non-match: property is null (root entity still returned)
  -> to-many no match: [] (root entity still returned)
  -> FORBIDDEN: $filter=IsActiveEntity eq true inside $expand -> HTTP 400

# Multi-hop view columns as $filter targets
select from Entity { ..., assoc.nested.field as computed }
  -> $filter=computed eq 'X' fails: "no such column" (SQLite limitation)
  -> Only flat properties and single-hop joins work as filter targets
```

---

## B. $apply - advanced aggregation

```
# Groupby on nav-property path: resolves server-side, no client JOIN needed
$apply=filter(IsActiveEntity eq true)/groupby((category/name),aggregate($count as cnt))
  -> returns { "category": { "name": "Drama" }, "cnt": 4 }

# Multi-alias $orderby after $apply
$apply=groupby(...)/aggregate(...)&$orderby=avgPrice desc,itemCount asc
  -> original entity fields unavailable in $orderby after groupby

# $orderby on $count alias and SUM alias both work
$apply=groupby((status),aggregate($count as cnt,price with sum as total))&$orderby=cnt desc
  -> HTTP 200 v

# NOT supported on CAP SQLite
$apply=topcount(5,price)    -> SQLITE_ERROR
$apply=bottomcount(5,price) -> SQLITE_ERROR
$apply=topsum(...)          -> HTTP 501
# Workaround: groupby()/aggregate() + $orderby + $top
```

> **Decimal SUM returns 0 on CAP SQLite - known limitation:**
> `$apply=aggregate(TotalPrice with sum as sumPrice)` returns `sumPrice=0` for `Edm.Decimal` fields
> on CAP SQLite even when individual records have non-zero values. This is a CAP/SQLite decimal
> aggregation bug. Affected: any SUM/AVG aggregation on a `Decimal` typed field.
>
> Workarounds:
> - Use `$count` queries and display counts instead of sums where possible
> - Label the KPI "Total Spend (unavailable on SQLite)" and show "--" rather than a wrong 0
> - Cast the field to a non-Decimal type in the CDS projection: `totalPrice: Double` instead of `Decimal`
> - On non-SQLite databases (HANA, PostgreSQL) this works correctly
>
> Do NOT display 0 as if it were a valid sum - it is always wrong and misleads users.

---

## C. $compute inline virtual fields

```
$compute=price mul 1.1 as priceWithTax,stock mul 2 as doubleStock
         &$select=ID,name,priceWithTax,doubleStock

# Aliases usable in $select ONLY
# $filter or $orderby on computed aliases -> HTTP 501
```

---

## D. $batch - advanced patterns

```
# JSON $batch (application/json) is the ONLY supported format
# Multipart/mixed -> HTTP 400 on CAP 9.x

# atomicityGroup: all writes rolled back if any member fails
# Failed member -> HTTP 424 Dependency Failed; sibling writes also HTTP 424

# dependsOn: conditional execution (supported in CAP 9.8.5)
# dependsOn failure -> HTTP 424 on the dependent (not executed)
# atomicityGroup = atomicity; dependsOn = conditional ordering

# Cross-service paths in a single $batch -> HTTP 404
# $batch scope is per-service only

# Inner paths are relative - no /odata/v4/<service>/ prefix
# Outer POST always HTTP 200; check individual response status fields
```

---

## E. Draft lifecycle - complete contract

```
# EDIT (3-step):
POST Entity(ID='<uuid>',IsActiveEntity=true)/ServiceName.draftEdit
  -> 201 Created (success)
  -> 500 DRAFT_ALREADY_EXISTS (draft already open - discard first)

PATCH Entity(ID='<uuid>',IsActiveEntity=false)
  -> 200 OK + DraftMessages[] (soft validation warnings - NOT blocking)
  -> DraftMessages populated by @assert.range and @assert.format
  -> DraftMessages always EMPTY for @assert custom expression

POST Entity(ID='<uuid>',IsActiveEntity=false)/ServiceName.draftActivate
  -> 201 Created (committed)
  -> 400 MULTIPLE_ERRORS (any @assert.* violation - this is the hard gate)

DELETE Entity(ID='<uuid>',IsActiveEntity=false)
  -> 204 No Content (discard OK)
  -> 404 (no draft existed - ignore)

# CREATE (2-step, distinct from edit):
POST /ServiceBase/Entity
  -> 201 (creates draft)
POST Entity(ID='<uuid>',IsActiveEntity=false)/ServiceName.draftActivate
  -> 201 (activates)

# Non-draft bound actions bypass draft lifecycle entirely:
POST Entity(ID='<uuid>',IsActiveEntity=true)/ServiceName.actionName
  -> directly updates DB row - no draftEdit step needed

# POST to nav property on draft-enabled entity:
POST /Entity(ID)/relatedItems -> HTTP 204, NO entity created (CAP blocks)
# Workaround: POST /RelatedItems with parent FK in body -> 201 (creates draft)

# bypass_draft: true overrides HTTP 501 on PATCH active entity
# but disables concurrency control - not recommended for production
```

---

## F. Draft validation - @assert.* placement rules

**ALL @assert.* annotations must be on the SERVICE ENTITY, not the DB entity.**
DB-entity annotation has no effect for draft flows.

```cds
// CORRECT - service entity
annotate MyService.Items with {
  price @assert.range: [0.01, 9999.99];
  code  @assert.format: /^[A-Z]{3}$/  @assert.format.message: 'Three uppercase letters';
}

// WRONG - DB entity annotation has no effect for draft
annotate db.Items with { price @assert.range: [0.01, 9999.99]; }
```

Timing:
- `@assert.range` / `@assert.format`: Draft PATCH -> accepted + DraftMessages (not blocking); draftActivate -> HTTP 400 ASSERT_RANGE / ASSERT_FORMAT
- `@assert.target` (FK integrity): Draft PATCH -> HTTP 200, DraftMessages EMPTY; draftActivate -> HTTP 400 ASSERT_TARGET
- `@assert.notNull` / `@mandatory`: Draft PATCH -> accepted; draftActivate -> HTTP 400 ASSERT_NOTSET
- `@assert.unique` single-field: draftActivate -> HTTP 500 SQLITE_CONSTRAINT_UNIQUE (SQLite) / HTTP 400 UNIQUE_CONSTRAINT_VIOLATION (HANA)
- `@assert.unique` multi-field: `@assert.unique: { constraintName: [field1, field2] }` - same timing
- `@assert.notNull` + `@assert.format` coexistence: null bypasses BOTH - format null-is-OK overrides notNull

Handler-based validation:
- `req.error()` in `before CREATE` for composition child: NOT reliably propagated to draftActivate in CAP 8.x
- `before SAVE` handler fires at draftActivate; `req.reject()` blocks; `req.warn()` advisory (save COMPLETES first)
- `req.error()` collects multiple errors without stopping the handler - all delivered as MULTIPLE_ERRORS array
- `req.error/warn/info`: HTTP 200, handler continues. `req.reject()`: immediate HTTP 400 throw. `throw new Error()`: HTTP 500.
- DraftMessages are NOT appended to unbound action responses (draft entity feature only)

---

## G. Handler messaging patterns

```javascript
// req.notify() -> numericSeverity:1 -> auto-dismiss toast
// req.info()   -> numericSeverity:2 -> Information dialog (user must close)
// req.warn()   -> numericSeverity:3 -> Warning alertdialog (user must close; save already committed)
// req.error()  -> numericSeverity:4 -> collected, delivered at handler exit

// After save: req.warn() fires AFTER commit - user cannot cancel via dialog
// Use req.reject() to block save; use req.warn() for advisory-only

// Multiple messages from one action -> single multi-message dialog
// Dialog title = highest severity: Error > Warning > Success > Information

// req.error() does NOT stop handler execution
req.error(400, 'Field A is invalid.');
req.error(400, 'Field B is invalid.');
// Both errors collected -> delivered as MULTIPLE_ERRORS array

// @restrict 'WRITE' does NOT cover bound actions
@restrict: [{ grant: 'WRITE', to: 'authenticated-user' }]
// Bound actions need explicit: grant: ['WRITE', 'myBoundAction']
```

---

## H. Managed fields - exact timing

| Field | Populated at |
|---|---|
| `createdAt` | Draft creation (NOT draftActivate) |
| `modifiedAt` | Every PATCH including draft PATCHes, AND draftActivate |
| `createdBy` | Draft creation |
| `modifiedBy` | Every PATCH + draftActivate |

- `@cds.on.insert` / `@cds.on.update`: only `$now` and `$user` tokens supported. Static strings silently ignored.
- `@cds.on.update: '$user'` fires on every PATCH, not just at draftActivate
- Manual override via POST body is silently ignored

---

## I. CAP annotations - client-visible effects

```cds
// @readonly on entity: HTTP 405 for POST/PATCH/PUT/DELETE
// @readonly on @odata.draft.enabled entity: CONFLICT - draft actions fail
// Use @Capabilities for granular control instead

// @readonly on field: maps to @Core.Immutable in OData
// CAP rejects PATCH on that field; FE locks it in edit mode

// @UI.Hidden on Association: does NOT propagate to generated FK scalar
// Annotate the FK scalar at service layer instead

// @UI.ReadOnly: maps to Core.Immutable in OData (not a separate UI.ReadOnly term)

// @Capabilities.ReadRestrictions.Readable: false on @readonly entity
// -> may be silently dropped from EDMX; do not rely on it
// Use @UI.Hidden or service-level exclusion instead

// cds.requires.impl on a served service name -> service disappears from endpoint list
// (treated as remote service, removed from served list)
```

---

## J. Virtual and computed fields

```cds
// DB-level virtual (all services):
virtual field : String @Core.Computed;
// No DB column; populated by after('READ') handler
// $filter -> HTTP 501; $orderby -> silently ignored or HTTP 501; $select v

// Service-level virtual (declaring service only):
extend projection MyService.Items with { virtual priceCategory : String }
// Only visible in MyService, not other services projecting the same entity
// $select dependency: price must be in $select for derivation to work

// @cds.persistence.skip - no DB table created at all
// Without on('READ') handler -> empty result set (no error, no 404)
// $metadata shows regular EntityType - no persistence signal for clients
// @cds.persistence.skip: 'if-unused' - skip only if no FK association points to it
```

---

## K. $search - scope and semantics

```
# Default scope: all non-key String fields on the entity's own table
# Navigation properties NOT searched ($search does not traverse nav props)
# Exception: flat string projections (e.g., author.name as author in CatalogService)
#   ARE searched because they become String fields on the entity

# Multi-word $search = OR semantics on CAP 9.8.5 SQLite
# $search='A B' finds records matching A OR B (not AND, not phrase)

# $search + $filter: combined as implicit AND
# encodeURIComponent(term) required for URL encoding

# @cds.search annotation restricts scope to annotated fields only:
annotate MyService.Items with @cds.search: { name, description };
# Without annotation: searches ALL non-key Strings
# With annotation: only annotated subset
# Disable entirely: @Capabilities.SearchRestrictions: { Searchable: false }
```

---

## L. Localization

```
# localized String fields -> companion _texts table; CAP JOINs transparently on read
# sap-locale query param takes precedence over Accept-Language header
# BCP-47 fallback: fr-CH -> fr -> base column value

# $filter on localized field: resolves locale-specific value BEFORE predicate evaluation
# sap-locale=de + $filter=name eq 'German Name' -> matches if translation exists
# Without locale header: base column value used for filtering

# _texts entity visible in $metadata as EntityName_texts
# $expand=texts returns translations (empty if no i18n seed data)
```

---

## M. Pagination and server limits

```
# Client-driven offset pagination only: $top + $skip
# Server-side $skiptoken NOT supported
# $delta / change tracking NOT supported:
#   /Entity/$delta -> HTTP 400
#   $deltatoken param -> HTTP 200 (silently ignored, no deltaLink returned)
# Workaround for change tracking: $filter=modifiedAt gt <cursor>&$orderby=modifiedAt asc
#   Limitation: no deleted-entity tracking; polling only; client manages cursor

# CAP default row limit: 1000
# $top > 1000 silently capped to 1000
# @odata.nextLink emitted only when internal limit (1000) is exceeded
# nextLink uses $skip=N (not $skiptoken)

# Count-only fetch (most efficient):
GET /Entity?$count=true&$top=0
  -> { "@odata.count": 42, "value": [] }
```

---

## N. Advanced OData features and gaps

```
# $crossjoin: NOT supported -> HTTP 404 (not 501; route simply absent)
# Workaround: $expand with navigation property

# ETag: entity GETs have NO ETag
# Service document + $metadata DO have ETag (If-None-Match -> 304 works)
# If-Match on entity PATCH: IGNORED (CAP has no optimistic concurrency on entities)

# $format=json on entity GETs: ignored (CAP always returns JSON)
# $metadata?$format=json: returns CSDL JSON (useful for programmatic inspection)
# $format=json on OData V4 -> standard JSON response

# @odata.singleton entity:
# GET/PATCH without key predicate; POST/DELETE -> HTTP 405
# <Singleton> in $metadata (not <EntitySet>)
# No auto-seed data

# @changelog audit trail (@cap-js/change-tracking plugin):
# Annotate: entity.field @changelog;
# Access: GET /Entity(key,IsActiveEntity=true)/changes
# Direct GET on ChangeView: blocked (ENTITY_IS_AUTOEXPOSED)
# Fires at draftActivate only - intermediate PATCHes not logged
```

---

## O. CDS model and annotation loading

```
# @assert.* placement - must be service entity (not DB entity):
# See §F above

# CDS using import chain:
using from 'pkg'             # all from package
using A as x from '...'     # aliased, file-local
using { A } from '...'      # destructured
# CAP auto-discovers .cds files in npm packages via index.cds
# Circular using: no error (CSN cached per path)

# srv/annotations/ NOT auto-loaded - must explicitly import:
using from './annotations/items-annotations';

# @Capabilities.SearchRestrictions.Searchable: false
# Must be set in service definition file - not in external annotation files

# @Common.SemanticKey in both service file and external annotations file:
# BOTH appear in EDMX; first in document order wins at FE runtime

# CDS compiler drops qualified @Common.ValueList #Qualifier from EDMX on UUID FK properties
# Use unqualified or workaround

# @Common.TextArrangement without @Common.Text on same entity: silently dropped from EDMX
# @Measures.ISOCurrency on select-from projection property: dropped from EDMX
# Annotate the base entity instead

# @Common.SemanticObjectUnavailableActions: compiles without error but dropped from EDMX

# back-associations on projected entities must be explicitly excluded:
entity View as select from db.Items { ..., assoc.* } excluding { backNav }

# multi-hop CDS path expressions (assoc.nested.field as flatField):
# generates correct SQL JOINs for reads
# but flatField cannot be used as $filter target (no such column in SQLite)

# @hierarchy:parent entity as ValueList CollectionPath -> HTTP 500 in SQLite
# (virtual hierarchy columns cannot be used in subqueries)
```

> **CAP hierarchy entity - always use `$select` to avoid virtual columns:**
> Entities annotated with `@hierarchy.parentChild` (or the CAP recursive hierarchy aspect) have virtual
> computed columns injected into their OData schema: `LimitedDescendantCount`, `DistanceFromRoot`,
> `DrillState`, `LimitedRank`. These columns do NOT exist in the SQLite database.
>
> Querying such an entity without explicit `$select` causes:
> `Error: no such column: $G.LimitedDescendantCount` (HTTP 500 on CAP SQLite)
>
> Fix: always add `$select=ID,name` (or whichever scalar fields you need) when querying
> hierarchy-annotated entities. This prevents CAP from including the virtual columns in the SQL query.
>
> ```
> # WRONG - causes SQLite error with hierarchy entity
> GET /admin/Categories
>
> # CORRECT -- $select excludes the virtual hierarchy columns
> GET /admin/Categories?$select=ID,name&$orderby=name
> ```
>
> This applies to all hierarchy-annotated entities regardless of whether the app uses
> the hierarchy features. The virtual columns are always injected into the OData schema.

---

## P. Auth - detailed patterns

```
# @requires - HTTP 401 for anonymous; HTTP 401 (not 403) for wrong role with mocked auth
# @restrict - HTTP 403 for unauthorized; WHERE clause adds per-row SQL filter
# @restrict with WHERE clause: $filter AND'd with the restriction
# Service-level @requires with no mock user: FE app stays blank, no error message

# Row-level security pattern:
@restrict: [{ grant: 'READ', to: 'viewer', where: 'createdBy = $user' }]
# $user resolves to req.user.id (login ID)
# Anonymous -> HTTP 403 (not 401) for @restrict

# @restrict multi-grant: logical OR across entries
# grant: 'WRITE' = CREATE + UPDATE + DELETE (NOT bound actions)
# Bound actions need explicit listing: grant: ['WRITE', 'actionName']
```

---

## Q. CAP server-side event hooks

```javascript
// on('NEW') - fires at draft creation for ApplicationService
// WARNING [verified-TrialJ-2026-05-27]: In CAP v9 ApplicationService, only the
// PRIMARY KEY field set in req.data during before/on NEW is actually persisted to
// the draft table. Non-key fields like `description` set here are SILENTLY DISCARDED
// by the framework's draft composer. This pattern works for raw CDS services but
// NOT for ApplicationService.
//
// WRONG - will NOT persist non-key fields in ApplicationService:
// this.on('NEW', 'Entity', async (req, next) => {
//   req.data.description = 'Default description';  // silently dropped
//   return next();
// });
//
// The `after NEW` and `on NEW` events are also not dispatched by ApplicationService
// in CAP v9 - they are handled internally by the draft service layer.
//
// CORRECT approach for ApplicationService: use before(['NEW','CREATE']) to set keys only.
// For non-key defaults, use @Common.DefaultValuesFunction (complex, requires separate action)
// or accept that create forms start empty and populate via user input.
this.before(['NEW', 'CREATE'], 'Entity', genid);  // key assignment works fine
// Distinct from before CREATE (fires at draft PATCH) and after READ (enriches existing)

// before('CREATE') fires at draftActivate, NOT at initial draft POST
// after('UPDATE') receives committed data

// after('DELETE') fires after DB delete commits; toast may not display
// (FE navigates before response processed - toast timing unreliable)

// before SAVE fires at draftActivate
// req.reject() blocks save; req.warn() advisory (save completes first)

// cds.tx() transaction pattern (CAP >= v6):
await cds.tx(async () => { /* operations */ })  // rollback on throw
// this.tx(req, callback) does NOT work (property conflict)

// srv.emit() fires asynchronously after request cycle
// await srv.emit() resolves on emission, not subscriber completion
// cds.spawn({ req }, fn) runs AFTER HTTP response sent (fire-and-forget)
```

---

## S. Status-Transition Flows (@flow.status) `[verified-TrialK-2026-05-28]`

CAP Node.js v9.x+ supports `@flow.status` status-transition flows. The framework:
- Validates `@from` entry state on every action call (returns **409 Conflict** if the current status is not in the `@from` list)
- Automatically writes `@to` state to the status element after success
- Generates `Core.OperationAvailable` and `Common.SideEffects` annotations in OData metadata
- Requires **no custom handler code** for state machine logic

### Step 1 - Declare bound actions on the service entity

Bound actions MUST be explicitly declared in the service definition. `@flow.status` only annotates existing actions, it does not generate them:

```cds
// srv/processor-service.cds
service ProcessorService {
  entity Incidents as projection on my.Incidents
    actions {
      action assign();
      action process();
      action hold();
      action resolve();
      action close();
      action reopen();
    };
}
```

### Step 2 - Annotate with @flow.status and @from/@to

```cds
// srv/flow.cds  (separate file keeps service definition clean)
using { ProcessorService } from './processor-service';

annotate ProcessorService.Incidents with @flow.status: status actions {
  assign   @from: [#new, #on_hold]                    @to: #assigned;
  process  @from: [#new, #assigned, #on_hold]         @to: #in_process;
  hold     @from: [#new, #assigned, #in_process]      @to: #on_hold;
  resolve  @from: [#assigned, #in_process, #on_hold]  @to: #resolved;
  close    @from: [#resolved, #in_process]            @to: #closed;
  reopen   @from: [#resolved, #closed]                @to: #new;
};
```

**Requirement:** The designated status element must be either an inline `enum` type, OR an `Association to CodeList` with a single `key code: EnumType` element. The enum symbols (`#new`, `#assigned` etc.) must match the enum values defined on the Status entity's `code` field.

### Step 3 - Call from UI - single POST, no draft lifecycle needed

```typescript
// WRONG: manual 3-step draftEdit -> PATCH -> draftActivate
// CORRECT: single POST to the flow action
const resp = await fetch(
  `/odata/v4/processor/Incidents(ID='${id}',IsActiveEntity=true)/ProcessorService.assign`,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }
);
// Framework enforces @from validation, writes @to, returns 409 on invalid transition
```

**Error response on invalid transition (409 Conflict):**
```json
{ "error": { "message": "Action 'assign' requires 'status_code' to be one of: ['new','on_hold']" } }
```

**Caveats:**
- Actions operate on **active entities only** (`IsActiveEntity=true`). When in draft state, all flow actions are disabled.
- CRUD and DRAFT operations cannot be restricted by `@flow.status` - only bound actions.
- Status element should be `@readonly` to prevent clients bypassing the flow via direct PATCH.
- The `@flow.status` feature is **Gamma status** in CAP 9.x - stable enough for production use but subject to change.

**Verification:**
```bash
# Check actions appear in metadata
curl http://localhost:4004/odata/v4/processor/$metadata | grep -A3 'Action Name="assign"'
# Should show: <Action Name="assign" IsBound="true">

# Test 409 enforcement (call close on a New incident - should fail)
curl -X POST ".../Incidents(ID='...',IsActiveEntity=true)/ProcessorService.close" -d "{}"
# Returns 409 if incident is not in Resolved or InProcess state
```

---

## R. CAP integration patterns

```javascript
// In-process cross-service delegation:
const ds = await cds.connect.to('namespace.ServiceName')
// cds.connect.to() is LAZY - no connectivity test at connect time
// Error surfaces at ds.run() time (ECONNREFUSED)

// server.js bootstrap for reuse-package handlers:
cds.on('served', async () => {
  const svc = cds.services['namespace.ServiceName']
  if (!svc) return
  svc.before('READ', ...)
})
// Must use cds.once('served') to avoid memory leaks (auto-removed after fire)
// cds.context NOT available inside 'served' (no request context at startup)

// file: linked npm package handlers -> MODULE_NOT_FOUND due to symlink
// Fix: delete handler file from package; attach from server.js instead

// cds.requires.impl on a served service name -> service removed from endpoints
// (treated as remote; disappears from /index.html and $metadata)
```
