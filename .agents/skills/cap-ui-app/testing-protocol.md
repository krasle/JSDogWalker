# Testing Protocol - Project Documentation Structure

**When to load:** Load this file when initializing testing for a project, generating a task suite, or running usability tests. Also load when resuming a testing session to understand the file formats.

**Tier:** 2 (load on demand for testing tasks; not loaded for standard generation tasks)

---

## 1. The testing/ folder

Each project that receives formal testing maintains a `testing/` folder at the CAP project root. The agent creates this folder and its files; the human can add to any of them.

```
<project-root>/
  testing/
    intent.md               - User intent, user profiles, use cases, intent artifacts
    test-plan.md            - Scope, approach, task suite summary, coverage decisions
    ST-results.md           - Static testing results (updated after each ST run)
    DT-functional.md        - Functional testing results (updated after each DT-F run)
    DT-usability-agent.md   - Step-by-step agent usability test log
    DT-usability-human.md   - Human task sheet responses and ad hoc observations
    defects.md              - Unified defect register (all sources)
    Clicky.md               - Task suite with verified answers and execution log
  .agent-checkpoint.md      - Session resume state (at project root, not inside testing/)
```

---

## 2. intent.md - the anchor document

Created first. Everything else derives from it. Update it if the user's intent evolves.

```markdown
# App Intent - [App name]

**Created:** [ISO date]
**Last updated:** [ISO date]
**App:** [name] | [technology: Fiori Elements / SAPUI5 / WC4R / FX] | [CAP service name]

## Business context
[1-3 sentences: what business problem does this app solve? What decisions does it support?]

## Target users

### Role: [Role name, e.g. "Travel Manager"]
- Background: [1-2 sentences: expertise, context, what they know coming in]
- Primary goals: [bullet list of what this user needs to accomplish]
- Expected frequency of use: [daily / weekly / occasional]
- Technical proficiency: [low / medium / high]

### Role: [additional role if applicable]
[repeat structure above]

## Primary use cases

### UC-01: [Use case name, e.g. "Review open travels"]
- Actor: [Role name]
- Trigger: [what prompts this use case, e.g. "start of working day review"]
- Goal: [what the user wants to achieve]
- Success: [how the user knows they succeeded]
- Frequency: [how often this occurs]

### UC-02: [...]

## Intent artifacts
[List any artifacts provided: mockup (filename), text description, user journey map, etc.]
[If none: "No artifacts provided - intent inferred from app structure and CAP service model"]

## Known scope exclusions
[Features explicitly out of scope for this version]
```

---

## 3. test-plan.md

```markdown
# Test Plan - [App name]

**Created:** [ISO date]
**Last updated:** [ISO date]
**Version:** [1.0 / 1.1 / ...]
**Scope:** [which services, pages, and use cases are covered by this plan]
**Out of scope:** [what is explicitly not tested in this plan]

## Testing approach
- Static testing: ST-0 through ST-9 (all)
- Functional testing: DT-F1 through DT-F7b (all)
- Agent usability testing: [N] tasks across [M] use cases
- Human usability testing: [planned / not planned / completed on date]

## Task suite summary
| Use Case | Tasks | Tiers covered |
|---|---|---|
| UC-01: [name] | [N] | Tier 1 x[N], Tier 2 x[N], Tier 3 x[N], Tier 4 x[N], Chain x[N] |
| UC-02: [name] | [N] | ... |
| Total | [N] | |

## Coverage decisions
[Why certain areas were included or excluded; known gaps; deferred items]
```

---

## 4. Clicky.md - task suite

The executable task suite. Generated once, reused across all test runs. The format extends the SkillTest1E Clicky.md convention with structured fields per task.

**Same suite runs every iteration  -  do not regenerate between iterations.** Generating new tasks each iteration would change the correct answers, making convergence meaningless. A new PASS must mean "the bug is fixed", not "we stopped testing for it". The suite is stable; what changes is whether the app passes it.

**When to augment the suite:** Two situations call for adding new tasks before the next iteration:

1. **Coverage gap**  -  a defect is found that no existing task would have caught (e.g. discovered via the faceted review or console inspection rather than by a task). Add a task that would have caught it.

2. **Pattern-driven expansion**  -  a defect reveals a class of problem that may exist elsewhere in the app. When a defect is found, ask: "What is the general pattern here? Are there other pages, entities, or controls where the same pattern applies that are not yet covered by any task?" If yes, add tasks for those too  -  do not wait to discover each instance as a separate defect in a later iteration.

   Examples of pattern-driven expansion:
   - Raw FK ID shown in Report Customer column → add tasks checking Customer display on List, Detail, and Assignment pages
   - Edit button opens read-only on the Incidents list → add tasks checking Edit behaviour on any other list pages in the app
   - Status filter not reset on back-navigation to List → add tasks checking filter state after back-navigation from every detail/edit route
   - Required field validation error persists on re-entry to edit form → add tasks checking this for every other edit form in the app

Augmentation adds coverage; it does not replace existing tasks. Record the new task IDs in the relevant defect entries in `defects.md`.

---

### Layer 0 - Document grounding (mandatory first step before generating any tasks)

Before generating any tasks, read these documents in order and extract the listed items.
If any document is absent, raise a defect and ask the user to provide it. Do NOT generate
a Clicky suite without completing this step.

| Document | Location | Extract |
|----------|----------|---------|
| `intent.md` | project root | User roles, use cases, business context |
| `product-requirements-document.md` | project root | FR-NN list, acceptance criteria |
| `specification/<asset>/specification.md` | project root | Entity schema, status values, service handlers, side effects |
| `solution.yaml` | project root | Asset names, service path |
| `assets/<name>/asset.yaml` | asset root | Service port, endpoint paths |

**[JS] / [JS-LOCAL] projects:** All five documents above MUST be present. The `solution.yaml`
and `asset.yaml` confirm the asset type and service path. A JS project without specification
documents cannot have a valid Clicky suite - the spec is the ground truth for what the app
is supposed to do, not just what it visually appears to do.

From the specification, extract:
- All entities and their writable fields
- All status fields and their complete set of valid values
- All auto-create side effects (e.g. "AFTER CREATE X -> creates Y")
- All validation rules (slot validation, double-booking, required fields)
- All computed values (fee formulas, derived fields)
- Seed data counts per entity (used to verify KPI totals in Tier 1)

Record the FR-to-task mapping in `testing/test-plan.md` as part of generation. Every
testable FR must have at least one task. FRs not testable in the UI (covered by unit tests)
must be noted as "covered by unit test: <file>".

---

### Layer 1 - Entity lifecycle matrix (mandatory, derive from specification)

Before writing individual tasks, build an entity lifecycle matrix. For every writable
entity in the service, mark which operations exist and require coverage:

```
Entity          | Create | Read | Update | Delete | Status transitions
----------------|--------|------|--------|--------|-------------------
[EntityName]    | T4     | T1/2 | T4     | T4     | [list transitions]
```

Rules:
- Every non-empty cell requires at least one task.
- "Auto-create" entities (created by backend handler, not user) require a Chain task
  verifying the auto-create fires and produces correct values.
- Every valid status transition listed in the spec requires a Tier 4 task.
- Every invalid transition (e.g. confirming a cancelled record) requires a Negative task.
- Status transitions that trigger side effects (e.g. confirm -> creates Confirmation record)
  require a Chain task verifying the side effect.

---

### Layer 2 - Network assertion in Tier 4 and Chain tasks (mandatory)

Every Tier 4 task and every Chain task MUST include a network verification step.
The network assertion takes precedence over the UI outcome.

**Add these fields to every Tier 4 and Chain task:**

```
- **Network assertion:** METHOD /api/<EntitySet> -> HTTP <expected-code>
  (e.g. PATCH /api/Appointments -> HTTP 200)
- **Network verification step:**
  Tool: browser_network_requests (Playwright preferred) or list_network_requests (Chrome DevTools MCP)
  After clicking the action: assert the most recent PATCH/POST/DELETE returned <expected-code>.
  PASS only if both UI outcome AND network assertion are correct.
  FAIL-WRONG if network shows unexpected code, even if UI appears correct.
```

**The non-UUID write-path check (add to every new project's Negative suite):**

This task MUST be included in the negative suite of every project using `: cuid` entities.
It is a pre-flight API check, not a UI task:

```
### T-NEG-API-write-path
- Tier: Negative (API pre-flight)
- Description: Verify write operations succeed against seed data IDs. If this fails,
  ALL Tier 4 tasks will be FAIL-BLOCKED and there is a single root cause to fix.
- Question: Does PATCH /api/<PrimaryEntity>(ID='<first-seed-id>') return HTTP 200?
- Method: Execute via browser_evaluate or direct fetch before any UI interaction:
    fetch('/api/<PrimaryEntity>(ID=\'<first-seed-id>\')', {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({<any-non-required-field>: <current-value>})
    }).then(r => r.status)
- Correct answer: HTTP 200 (seed IDs are valid UUIDs and writes succeed)
- Failure answer: HTTP 400 "does not contain a valid UUID" (seed IDs are not UUIDs)
- If FAIL: raise as BLOCKING defect. Root cause: seed data uses non-UUID IDs but
  entity declares ': cuid'. Fix: replace all seed IDs with UUIDs across all CSV files.
  Do NOT proceed with Tier 4 UI testing until this is resolved - all writes will fail.
- Note: Run this as the FIRST task in every iteration. A FAIL here explains all
  subsequent Tier 4 FAIL-BLOCKED results without needing to test them individually.
```

---

### Layer 3 - Chain task structural categories (mandatory)

A chain suite that is numerically above the minimum but missing structural categories is incomplete. Every chain suite MUST include at least one task from each of the five categories below. Enumerate the categories from the spec before writing any individual chain tasks.

**Category A — Side-effect verification (one per AFTER handler)**

For every `AFTER CREATE`, `AFTER UPDATE`, or `AFTER DELETE` handler in `srv/*.js`, generate one chain that:
1. Triggers the handler (with network assertion: expected HTTP code)
2. Fetches the side-effect entity and asserts correct field values (not just existence)

If a single trigger fires multiple independent side effects (e.g. creates both a BillingRecord and a Confirmation), each side effect needs its own verification step within the chain — they are not interchangeable and may fail independently.

**Category B — Computed value change propagation (both directions)**

For every field whose value is computed from a relationship count or aggregation (identified from the spec formula section), generate chains verifying:
- B1: Value is correct at creation time with N items
- B2: Value recalculates correctly when an item is **added** after creation (N → N+1, value increases)
- B3: Value recalculates correctly when an item is **removed** after creation (N+1 → N, value decreases)

B2 and B3 are separate chains because they exercise different handler code paths (AFTER CREATE vs AFTER DELETE on the junction entity). Omitting either direction leaves a recalculation handler untested.

**Category C — Full lifecycle sequence (one per entity with status transitions)**

For every entity that has a status field with multiple valid transitions, generate one chain that exercises the **complete status sequence** from initial to terminal state:
- Assert the correct HTTP code after each transition
- Assert the UI reflects the new state without requiring manual page reload
- Assert any dependent entities updated correctly after each transition

This is the only chain type that catches state-transition **ordering** failures — where a correct individual transition breaks a subsequent one (e.g. a billing record created correctly at booking but failing to update when the appointment is later confirmed).

**Category D — Cross-entity data consistency (one per FK shown in the UI)**

For every FK relationship that is visibly resolved in the UI (walker name on appointment row, customer name on billing row, etc.), generate one chain that:
1. Modifies the referenced entity (PATCH the name/title/label field)
2. Navigates to the referencing entity's list view
3. Asserts the change is visible without a manual cache clear or page reload

This catches stale-cache bugs and reveal whether the app re-fetches or relies on in-memory maps.

**Category E — Referential integrity (one per Composition in the schema)**

For every `Composition of many` relationship in `db/schema.cds`, generate one chain that:
1. Creates a parent entity (UUID-based)
2. Creates a child entity linked to that parent
3. Deletes the parent
4. Asserts the outcome matches schema intent:
   - CDS Composition: child cascades; assert child count decreases
   - CDS Association (non-Composition): assert CAP rejects with a constraint error

This catches mismatches between the declared schema semantics and actual runtime behaviour.

---

**Chain count formula (structural + density):**

After enumerating the 5 categories, the minimum chain count is:

```
A = H (one per AFTER handler)
B = 2 × F_computed (add + remove per computed field)
C = E_status (one per entity with status transitions)
D = F (one per visible FK relationship)
E = Comp (one per Composition relationship in schema)

Structural minimum = A + B + C + D + E
Density minimum    = max(H + 2*E_entities, 8)   [from the scaling table]
Required minimum   = max(Structural minimum, Density minimum)
```

If the structural enumeration gives a lower number than the density formula, the formula wins — it means some categories have more instances than enumerated. If the structural enumeration gives a higher number, use that — it reflects the actual spec surface.

---

**Task count is derived from spec coverage, not from meeting tier minimums.**

The tier minimums below are floors — they prevent undersized suites on large apps.
A complete suite will exceed them. The correct method:

1. Extract the following variables from the Layer 0 documents:
   - **E** = number of writable entities exposed in the service (Layer 1 matrix rows)
   - **S** = total distinct status values across ALL status fields in ALL entities
   - **H** = number of AFTER CREATE/UPDATE handlers (auto-create side effects from srv/*.js)
   - **V** = number of named validation rules (HTTP 400/409 reject conditions)
   - **F** = number of FK relationships that are visibly resolved in the UI (e.g. walker name shown on appointment row, customer name on billing row)
   - **T** = number of field-level validation rules across all entities (required fields, format checks, range/enum constraints from CDS schema)
   - **UC** = number of distinct user roles × use cases in intent.md (each role×use-case pair is one scenario)

2. Apply the entity-scaled minimums per tier:

| Tier | Formula | What it covers |
|------|---------|---------------|
| Tier 1 - KPI/count reads | max(2×E + S, 10) | 2 count/display reads per entity (total count + at least one content read), 1 per status value |
| Tier 2 - Filtered list | max(2×E + S + F, 10) | 2 filtered views per entity, 1 per status value, 1 per FK display to verify names resolve correctly |
| Tier 3 - Cross-entity detail | max(2×E, 8) | 2 cross-entity navigations per entity (FK relationship + computed/derived field) |
| Tier 4 - CRUD + field validation + transitions | max(4×E + T + S, 16) | Create+Read+Update+Delete per writable entity (4 per E), 1 per field-level validation rule, 1 per valid status transition |
| Chain - technical side effects | max(H + 2×E, 8) | 1 per auto-create handler, 2 cross-entity write propagation chains per entity |
| Scenario - business workflows | max(UC, 4) | **NEW TIER** - 1 full end-to-end scenario per use case in intent.md. These cannot be decomposed into individual point tasks — they test whether a user can complete a complete business operation from start to finish across multiple entities and views. See §4a below. |
| Negative - blocked paths + field validation | max(V + E + T + S, 16) | 1 per named validation rule, 1 per entity missing-required-field, 1 per field-level constraint, 1 per invalid status transition |
| Pre-flight | 1 | Always exactly 1 write-path UUID pre-flight |

3. After generating the suite, verify all assertions:

```
Assert all of:
  Tier1    >= max(2*E + S,         10)
  Tier2    >= max(2*E + S + F,     10)
  Tier3    >= max(2*E,              8)
  Tier4    >= max(4*E + T + S,     16)
  Chain    >= max(H + 2*E,          8)
  Scenario >= max(UC,               4)
  Negative >= max(V + E + T + S,   16)
  Preflight = 1

If any assertion fails: identify the missing entity/status/handler/use-case
and add the corresponding tasks before declaring the suite complete.
```

**Typical task count by app size:**

| App size | E | S | H | V | F | T | UC | Approx total |
|----------|---|---|---|---|---|---|----|--------------|
| Small (3-4 views, 4 entities) | 4 | 4 | 1 | 2 | 3 | 5 | 2 | ~60 |
| Medium (5-7 views, 8 entities) | 8 | 7 | 2 | 4 | 6 | 8 | 4 | ~130 |
| Large (8+ views, 12+ entities) | 12 | 12 | 4 | 6 | 10 | 15 | 6 | ~220 |

---

### §4a - Scenario tier: full business workflows from intent.md

**What a Scenario task is:**

A Scenario task covers a complete user journey from a cold start (no pre-existing session
state) to a successful business outcome. It crosses multiple entities, multiple views, and
multiple operation types in a single task. It cannot be replaced by a collection of Tier 4
and Chain tasks — it tests the transitions between operations, the state carried forward
from one step to the next, and the coherence of the end result.

**How to derive Scenario tasks from the intent document:**

For each use case in intent.md, ask:
  "What does a user of this role need to do, from nothing, to complete this goal?"

The answer is one Scenario task. Write it as a numbered sequence of steps, each with its
own success criterion and network assertion where a write occurs.

**Common scenario patterns — apply these to the actual domain:**

These patterns recur across most CAP apps. For each pattern, substitute the domain entities
from the project's spec. Do not use these as templates with domain-specific names filled in
— derive the steps from the intent document and service handlers.

Pattern A - Entity onboarding chain (new master data setup)
  Intent: Register a new [primary entity] with its [dependent entities] so the system
          can use it in operations.
  Structure: Create [primary entity] -> add [dependent entity 1] -> add [dependent entity 2] ->
             verify [primary entity] appears in list with [dependent entities] shown ->
             verify [primary entity] is available in [related entity] dropdown

Pattern B - Full operational lifecycle (create -> status transitions -> settlement)
  Intent: Execute a complete business operation from initial booking/creation through
          all status transitions to final settlement (payment, closure, archival).
  Structure: Create [operational entity] -> verify [auto-created side effect] ->
             transition to [intermediate status] -> verify [status-driven side effect] ->
             transition to [terminal status] -> verify [settlement record] updated ->
             verify [summary view] reflects final state

Pattern C - New operator onboarding (resource setup + constraint verification)
  Intent: Set up a new [resource entity, e.g. walker, agent, employee] and verify
          they can be used in operations and that their constraints are respected.
  Structure: Create [resource entity] -> configure [availability/capacity/settings] ->
             verify [resource entity] appears in [operational entity] creation dropdowns ->
             create [operational entity] using the new [resource entity] ->
             attempt to violate [resource constraint] -> verify rejection

Pattern D - Multi-item operation with computed value verification
  Intent: Create an [operational entity] with multiple [line items / associated entities]
          and verify that computed values (totals, fees, aggregates) are correct at each step.
  Structure: Create [operational entity] with N [line items] ->
             verify computed value at N -> add another [line item] ->
             verify computed value updates to N+1 count ->
             verify [auto-created record] reflects final computed value

Pattern E - Conflict detection and graceful recovery
  Intent: Demonstrate that the system correctly rejects invalid operations and allows
          the user to recover and complete a valid operation.
  Structure: Identify an existing [constraint context] (e.g. existing booking for resource X at time Y) ->
             attempt to create a conflicting [operational entity] -> verify HTTP 409/400 + error message ->
             modify the request to remove the conflict -> verify successful creation (HTTP 201) ->
             verify both [original entity] and [new entity] coexist correctly

**Scenario tasks for the current project are generated by applying these patterns to the
use cases in intent.md.** Record them in testing/Clicky.md under the SC-N prefix.

The value of Pattern B specifically: it is the only task type that covers the full entity
lifecycle in sequence. Individual Tier 4 tasks cover each transition in isolation, but
Pattern B catches state-transition dependencies — e.g. a side-effect record created correctly
at the initial step but failing to update when a later transition fires, or a computed value
that is correct at creation but stale after a modification.

---

Chains (Tier 5) are required because they exercise the inter-entity write propagation that
individual point-tasks cannot catch. Scenario tasks (§4a) are required because they exercise
the full user-visible business workflow that isolated chains cannot catch. A suite without
Scenarios can have all individual tasks passing while a complete business workflow fails
at a state-transition boundary.

```markdown
# Task Suite - [App name]

**Generated:** [ISO date]
**Last executed:** [ISO date / never]
**Tasks total:** [N]  (Tier1:[N] Tier2:[N] Tier3:[N] Tier4:[N] Chain:[N] Negative:[N])
**Pass rate:** [N/N (NN%) / not run]

## Tasks

### T-001
- **Use case:** UC-01
- **Role:** [Role name from intent.md]
- **Tier:** 1
- **Description:** [What the user is trying to do in plain language]
- **Question:** [The specific question the user needs to answer]
- **Correct answer:** [Exact answer] (verified: [OData query used to verify, e.g. GET /odata/v4/travel/Travels?$count=true&$top=0 -> <N>])
- **Expected path:** [Step-by-step navigation: Overview -> KPI tile "Total Travels"]
- **Success criteria:** [What the user must see to know they found the answer]
- **Last result:** [PASS / FAIL-BLOCKED / FAIL-WRONG / FAIL-EXCESSIVE / FAIL-UNCLEAR / not run]
- **Notes:** [optional: context, edge cases, known issues]

### T-NNN (Tier 4 example - CRUD/status transition)
- **Use case:** UC-02
- **Role:** [Role name]
- **Tier:** 4
- **Description:** Confirm a scheduled appointment and verify the status changes.
- **Question:** After clicking Confirm on a scheduled appointment, does the status change to
  "confirmed" in the list AND does the network log show HTTP 200?
- **Correct answer:** Appointment status = "confirmed" in list. Network: PATCH -> HTTP 200.
  (verified: PATCH /api/Appointments(ID='<uuid>') {"status":"confirmed"} -> HTTP 200)
- **Expected path:** Appointments view -> find scheduled appointment -> click Confirm
- **Network assertion:** PATCH /api/Appointments -> HTTP 200
- **Network verification step:** After click, run browser_network_requests (Playwright) or
  list_network_requests (Chrome DevTools MCP). Assert most recent PATCH returned HTTP 200.
  If HTTP 400: FAIL-WRONG, raise defect. Check response body for "not a valid UUID" (D-019
  class) or other error message.
- **Success criteria:** Status badge shows "confirmed". Confirm button gone. PATCH = HTTP 200.
- **Last result:** [not run]

### T-NNN (Chain example)
- **Use case:** UC-03
- **Role:** Travel Manager
- **Tier:** Chain
- **Description:** Find the highest-budget approved travel, navigate to its detail, change the description, save, then verify the change is reflected back in the list view.
- **Chain steps:**
  1. Overview -> click "Approved" KPI tile -> verify Travels list filtered to Approved
  2. Sort by TotalPrice descending -> note the top record ID and description
  3. Click that record -> verify detail page opens with correct ID
  4. Click Edit -> change Description to "Updated by test [timestamp]" -> click Save
  5. Network assertion: PATCH /api/Travels -> HTTP 200
  6. Verify success toast -> click Back -> verify list shows the updated description in that row
- **Correct answer at step 2:** [record ID, e.g. 4133] (verified: GET /odata/v4/travel/Travels?$filter=Status_code eq 'A' and IsActiveEntity eq true&$orderby=TotalPrice desc&$top=1)
- **Correct answer at step 5:** HTTP 200 from PATCH (network log)
- **Correct answer at step 6:** Description in list row equals "Updated by test [timestamp]"
- **Expected pages visited:** Overview, Travels list (filtered), Travel detail, Travels list (return)
- **Last result:** [not run]

### T-NNN (Negative example)
- **Use case:** UC-02
- **Role:** Read-only user
- **Tier:** Negative
- **Description:** Verify that attempting to create a new book without a title is blocked with a visible error.
- **Question:** What error message appears when Save is clicked with an empty Title field?
- **Correct answer:** A field-level error message (not a toast) is visible on the Title input; no POST request is fired.
- **Expected path:** Add Book form -> leave Title empty -> click Save
- **Success criteria:** Error indicator on Title field; list of books unchanged (no new record created)
- **Last result:** [not run]

## Execution log

### Run 1 - [ISO date/time]
| Task | Result | Notes |
|---|---|---|
| T-001 | PASS | |
| T-002 | FAIL-BLOCKED | Agency filter missing; D-007 raised |
[...]
**Summary:** [N]/[N] PASS ([NN]%)
**New defects:** D-NNN, D-NNN
**Defects fixed before next run:** D-NNN (description of fix)

### Run 2 - [ISO date/time] (after D-007 fixed)
[...]
```

### Task difficulty tiers

| Tier | Interaction limit | Description |
|---|---|---|
| 1 | <=2 clicks | KPI counts, totals visible on Overview without navigation |
| 2 | <=4 clicks | Find an entity matching a filter or sort criterion |
| 3 | <=7 clicks | Navigate from one entity to a related entity's detail |
| 4 | <=5 clicks + confirmation | Create, edit, or trigger a single status transition |
| Chain | Multiple pages + actions | Multi-step sequence crossing page boundaries: e.g. filter -> detail -> edit -> save -> verify in list. Tests inter-page state management that individual tiers cannot catch. |
| Negative | Varies | Verify a BLOCKED or WRONG path: empty required field, invalid filter, action that should be disabled. Correct answer is an error/empty state or a missing UI element. |

**Why Chains are required:**
Simple point-tasks can all pass while a complete user workflow fails. Chains specifically test:
- That filter state survives navigation to detail and return to list
- That edited data appears immediately in the list without a manual reload
- That back navigation from a direct-URL detail restores the list (not a blank page)
- That cross-navigation from a chart correctly pre-populates the filter AND applies a server-side `$filter`
- That a create form successfully creates a record AND that record appears in the correct list filter

A minimum chain for any app is: **Overview chart segment -> filtered list -> detail -> edit/action -> list (verify updated)**.

### FAIL categories

| Code | Meaning |
|---|---|
| FAIL-BLOCKED | Could not complete: navigation missing, filter absent, crash, action unavailable, login dialog appeared |
| FAIL-WRONG | App produced an incorrect answer (data defect, binding error, truncation) |
| FAIL-EXCESSIVE | Correct answer eventually found but required unreasonable effort |
| FAIL-UNCLEAR | Could not determine whether the correct answer had been found |

---

## 5. DT-usability-agent.md - agent test log

Step-by-step audit trail of each agent-simulated test run.

```markdown
# Agent Usability Test Log - [App name]

## Run 1 - [ISO date/time]
**App URL:** [http://localhost:PORT/...]
**Auth pre-flight:** [PASS - mocked as alice / PASS - anonymous / BLOCKED - login dialog]
**Tasks run:** T-001 to T-[N]
**Pass rate:** N/N (NN%)

### T-001 - [Task description]
- Action 1: Navigate to [URL]
- Action 2: [describe what was done]
- Observed: [what the agent saw on screen]
- Expected answer: [from Clicky.md]
- Actual answer found: [what the agent read from the UI]
- RESULT: PASS
- Notes: --

### T-002 - [Task description]
- Action 1: Navigate to Overview
- Action 2: Click "Sunshine Travel" bar in Agency chart
- Observed: navigated to /travels but no filter in URL; agency filter not present in filter bar
- Expected answer: 47 open travels for Sunshine Travel
- Actual answer: could not determine (no agency filter)
- RESULT: FAIL-BLOCKED
- Defect raised: D-007 (Agency filter missing from Travels list)
```

---

## 6. DT-usability-human.md - human test log

```markdown
# Human Usability Test Log - [App name]

## Session 1 - [ISO date]
**Mode:** Structured (agent task sheet) / Ad hoc
**Tester:** [role/identifier, e.g. "product owner", "end user", "user"]
**App URL used:** [http://localhost:PORT/...]

### Structured task results
| Task | Question (summary) | Human answer | Correct answer | Match | Ease | Notes |
|---|---|---|---|---|---|---|
| T-001 | Total travels? | <N> | <N> | Yes | Easy | Found on Overview KPI |
| T-002 | Open travels for Sunshine Travel? | couldn't find | 47 | No | Could not find | No agency filter |

### Ad hoc observations
- [observation 1: describe what the user noticed or struggled with]
- [observation 2]

### Defects raised from this session
| ID | Description |
|---|---|
| D-008 | [description of defect found during human testing] |
```

---

## 7. defects.md - unified defect register

All defects from all testing types (ST, DT-F, DT-U-A, DT-U-H) recorded in one file.

```markdown
# Defect Register - [App name]

**Last updated:** [ISO date]

| ID | Source | Type | Description | Priority | Status | Fix applied | Retest tasks |
|---|---|---|---|---|---|---|---|
| D-001 | ST-4 | Data | author_ID shown in Admin table instead of author name | High | Fixed | authorMap lookup | -- |
| D-007 | DT-U-A T-002 | FAIL-BLOCKED | No agency filter in Travels list; Overview chart click not wired | High | Open | Add agency Select + cross-nav onClick | T-002, T-009 |
| D-008 | DT-U-H | FAIL-EXCESSIVE | Finding all travels for an agency requires 7+ steps | Medium | Open | Add agency filter + chart onClick | T-002 |

## Field reference

- **Source:** which test type and task ID raised the defect
 - ST-N: static testing section N
 - DT-F-N: functional testing check N
 - DT-U-A T-NNN: agent usability test, specific task
 - DT-U-H: human usability test (session date if multiple)
- **Type:** ST-N category (e.g. ST-4 for ID/label issues) or FAIL-xxx code
- **Priority:** High (BLOCKED/WRONG data) / Medium (EXCESSIVE/UNCLEAR UX) / Low (cosmetic)
- **Status:** Open / Fixed / Accepted (known limitation) / Deferred
- **Retest tasks:** which Clicky.md task IDs to rerun after the fix is applied
```

---

## 8. ST-results.md and DT-functional.md

These files use the same format as the existing validation report template in `validation.md`. The agent writes or updates them after each test run, replacing the ad hoc console output with a persistent record.

```markdown
# Static Testing Results - [App name]

**Run date:** [ISO date]
**Technology:** [FE / SAPUI5 / WC4R / FX]

| Check | Status | Finding |
|---|---|---|
| ST-0: Grep gate | (v) Pass / (x) Fail | [detail if fail] |
| ST-1: Dependencies | (v) / (v) | |
| ST-2: Type consistency | (v) / (v) | |
| ST-3: Annotations | (v) / N/A | |
| ST-4: Clear text display | (v) / (v) BLOCKING | |
| ST-5: Expression syntax | (v) / (v) | |
| ST-6: Icon references | (v) / (v) | |
| ST-7: Print scrollbars | (v) / N/A | |
| ST-8: String quality | (v) / (v) | |
| ST-9: Field-level sweep | (v) / (v) | |

### Findings
[list any ST failures with description and fix applied]
```

```markdown
# Functional Testing Results - [App name]

**Run date:** [ISO date]
**Technology:** [FE / SAPUI5 / WC4R / FX]
**App URL:** [http://localhost:PORT/...]

| Check | Status | Finding |
|---|---|---|
| DT-F1: App loads | (v) / (v) | |
| DT-F2: Console errors | (v) 0 errors / (x) N errors | [list] |
| DT-F3: Console warnings | (v) 0 / (!) N warnings | [classified list] |
| DT-F4: Network requests | (v) / (v) | |
| DT-F5: Data visibility | (v) / (v) | |
| DT-F6: Task queries | (v) / (v) | [KPI values verified] |
| DT-F7: Interaction | (v) / (v) | |
| DT-F7b: All-pages | (v) / (v) | |

### Findings
[list any DT-F failures with description and fix applied]
```

---

## 9. Authentication pre-flight - mandatory before any browser test

**This step must run before the first `navigate_page()` call in every test session.** Skipping it causes login dialogs to appear mid-test, blocking all subsequent tasks with FAIL-BLOCKED.

> **Playwright MCP + FX Dialog (HTML `showModal` top-layer) `[verified-TrialJ-2026-05-28]`:** The FX `Dialog` component uses the native HTML `<dialog>` element with `showModal()`. Elements inside it are rendered in the browser "top layer" and have the following testing implications:
>
> - `locator.boundingBox()` returns `null` for top-layer elements (Playwright cannot compute layout via normal means)
> - `element.click()` and `dispatchEvent()` via `page.evaluate()` do NOT trigger React's synthetic `onClick` handlers
> - Only `page.mouse.click(x, y)` with coordinates from `getBoundingClientRect()` evaluated inside the page context works reliably
>
> **Pattern for interacting with FX Dialog buttons/inputs via Playwright:**
> ```js
> // Get coordinates of a button inside the dialog
> const coords = await page.evaluate(() => {
>   const dialog = document.querySelector('dialog');
>   const btn = [...(dialog?.querySelectorAll('button') || [])]
>     .find(b => b.textContent?.trim() === 'Create');
>   const rect = btn?.getBoundingClientRect();
>   return rect ? { x: Math.round(rect.x + rect.width/2), y: Math.round(rect.y + rect.height/2) } : null;
> });
> if (coords) await page.mouse.click(coords.x, coords.y);
> ```
>
> **Alternative:** Chrome DevTools MCP `click(uid=...)` uses the accessibility tree, which picks up top-layer dialog elements correctly. Use Chrome DevTools MCP for FX Dialog interactions where Playwright coordinate-based clicking is too fragile.
>
> This is a testing infrastructure limitation - the FX Dialog works correctly for human users.

> **`sap.viz` interactivity MUST be tested with Playwright `page.mouse.click(x, y)` at bar coordinates -- NOT accessibility-tree clicks `[verified-TrialK-2026-05-28]`:**
> Chrome DevTools MCP `click(uid=...)` and Playwright `page.click(selector)` use the accessibility tree. sap.viz registers its interaction handlers via D3 event listeners on SVG elements -- these are NOT triggered by accessibility-tree clicks. A test using `click(uid=...)` on a VizFrame will always appear to pass even when the click handler is completely broken.
>
> Use `page.mouse.click(x, y)` at real viewport coordinates obtained from `getBoundingClientRect()`:
> ```ts
> // WRONG: accessibility click - does not trigger sap.viz D3 handlers
> await page.click('[id*="chartByStatus"]');
>
> // CORRECT: real coordinate click
> const coords = await page.evaluate(() => {
>   const f = sap.ui.getCore().byId("__component0---overview--chartByStatus");
>   const bars = Array.from(f.getDomRef().querySelectorAll("g[class]"))
>     .filter(g => g.getAttribute("class").includes("v-datapoint") &&
>                  g.getAttribute("class").includes("v-morphable") &&
>                  !g.getAttribute("class").includes("group"));
>   const r = bars[0].getBoundingClientRect();
>   return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
> });
> await page.mouse.click(coords.x, coords.y);
> await page.waitForTimeout(1000);
> // Verify URL changed AND verify no pageerror fired
> ```
> Also attach a `pageerror` listener to catch sap.viz crashes that happen before the `selectData` handler runs.

### Pre-flight procedure

```
Step 1: Identify auth mode from CAP server startup output or package.json:
 - "mocked" auth     -> mock credentials are in package.json cds.requires.auth.users
 - anonymous access  -> no Authorization header needed
 - Basic auth        -> username:password encoded as Base64
 - Fiori sandbox     -> no auth needed for local dev
 - OAuth/XSUAA       -> out of scope for local development; use mock auth instead

Step 2: For mocked auth (the standard local development pattern):
  Read package.json -> cds.requires.auth.users -> extract first admin user (e.g. alice:alice)
  Base64 encode: "alice:alice" -> "YWxpY2U6YWxpY2U="
  Standard header: Authorization: Basic YWxpY2U6YWxpY2U=

Step 3: Verify auth works BEFORE opening the browser:
  GET <serviceUrl>/<EntitySet>?$top=1 with the Authorization header
  Assert HTTP 200 returned
  If HTTP 401: re-read package.json for correct credentials; do NOT proceed to browser tests

Step 4: Configure browser auth (one of two methods):

  Method A - Vite proxy injects the header (PREFERRED for React apps):
    In vite.config.ts proxy block:
      configure: (proxy) => {
        proxy.on('proxyReq', (proxyReq) => {
          proxyReq.setHeader('Authorization', 'Basic YWxpY2U6YWxpY2U=')
        })
      }
    Verify: navigate_page(url=<app-url>) -> list_network_requests() ->
            find OData request -> assert Authorization header present

  Method B - Browser cookie/session injection (for SAPUI5/FE apps served by CAP):
    navigate_page(url="http://localhost:<PORT>/")
    evaluate_script("fetch('/_test_/auth', {method:'POST',headers:{'Authorization':'Basic YWxpY2U6YWxpY2U='},credentials:'include'})")
    - OR --
    In SAPUI5 app manifest.json, add httpHeaders to the model:
      "settings": { "httpHeaders": { "Authorization": "Basic YWxpY2U6YWxpY2U=" } }
    Verify: list_network_requests() -> find OData request -> assert Authorization header present

  Method C - Direct URL with credentials (fallback, not for production):
    All OData fetches include the header explicitly in the fetch() call:
      fetch(url, { headers: { Authorization: 'Basic YWxpY2U6YWxpY2U=' } })

Step 5: Confirm no login dialog before proceeding:
  navigate_page(url=<app-url>)
  take_snapshot()
  Assert: snapshot does NOT contain "Username", "Password", "Log On", "Sign In" form elements
  If login dialog appears: the auth pre-flight was insufficient -> fix before continuing
```

### Auth failure recovery

If a login dialog appears during testing:
1. **Stop all tasks immediately** -- do not record FAIL-BLOCKED; fix auth first
2. Identify which auth method is needed (see Step 1 above)
3. Apply the appropriate fix (proxy header, manifest httpHeaders, or fetch header)
4. Restart from the beginning of the current test iteration
5. Record in the test log: "Auth pre-flight was insufficient; corrected before run N"

**Never record tasks as FAIL-BLOCKED due to a login dialog** -- this is a test infrastructure failure, not an app defect.

---

## 10. The iterative test-fix-retest loop

The most effective validation pattern from production experience is iterative: run the full Clicky suite, batch-fix all defects found, then re-run from scratch until a complete pass is achieved. The loop has a formal structure and a concrete stopping criterion.

### Loop structure

```
ITERATION := 1

LOOP:
  1. Authentication pre-flight (§9)
     - Verify auth before any navigate_page() call
     - If auth blocked: fix and restart iteration; do NOT count as a defect

  2. Run complete Clicky task suite
     - Execute ALL tasks (both positive and negative tiers)
     - Execute ALL Chain tasks (§4 Tier 5) - these are non-optional
     - Record each task result: PASS / FAIL-xxx
     - For each FAIL: raise defect to defects.md with ID, description, root cause
     - **NEVER mark a task NOT RUN because its root cause is already known.** A task
       that fails for a known root cause is still scored FAIL-WRONG with the root cause
       noted. Rationale: tasks sharing a stated root cause often reveal additional defect
       dimensions not visible from the first failure (e.g. a POST body FK validation gap
       discovered while testing what appeared to be a simple key-predicate failure). The
       complete FAIL count is the honest measure of app quality. NOT RUN is reserved
       exclusively for tasks that cannot be mechanically executed: server unreachable,
       login dialog blocking all navigation, test environment unavailable.

  3. After all tasks complete:
     - Count newly-introduced defects (defects found in THIS iteration that were not in the previous)
     - Count total open defects

  4. Stopping criterion check:
     - If: ALL tasks PASS and zero newly-introduced defects -> LOOP ENDS (convergence)
     - If: ITERATION >= max_iterations (configurable, default 10) -> LOOP ENDS (timeout)
     - Otherwise: continue to step 5

  5. Triage and fix:
     - Group defects by root cause (not by symptom - D-047/D-056/D-058/D-060 are one root cause)
     - Fix all defects before the next iteration (do not carry open defects forward)
     - For each fix: update defects.md (Status=Fixed, Fix applied=description)
     - Re-run ONLY the static SV-0 grep gate after fixes (to catch regressions before browser)
     - Do NOT re-run full browser tests yet - wait for the next complete iteration

  6. Checkpoint:
     - Write .agent-checkpoint.md (current iteration, defects fixed, open defects)
     - Record in DT-usability-agent.md execution log

  ITERATION := ITERATION + 1
  GOTO LOOP
```

### Stopping criterion

The loop stops when one of two conditions is met:

**Convergence (success):** A complete iteration finds zero newly-introduced defects. All tasks PASS. The iteration count (typically 3--8 for a well-built app) is reported. The zero-defect iteration must be a **full run** -- not a partial run or a run of only "retest" tasks.

**Timeout (partial success):** The configured maximum iterations is reached without convergence. Report: "Maximum iterations reached. N open defects remain. Human review recommended for: [list open defects]."

### Why the full suite must run each iteration (not just "retest tasks")

Fixes for defect D-X often introduce a regression in unrelated area D-Y. Running only the tasks linked to D-X will not catch the regression. Every iteration runs the complete suite including all Chain tasks. Retest-only runs are permitted between iterations for quick sanity checks, but do not count toward convergence.

### Iteration report format

After each iteration, write to DT-usability-agent.md:

```markdown
### Iteration N - [ISO date/time]
**Auth pre-flight:** PASS (alice:alice / anonymous)
**Tasks run:** [N] total (Tier1:[N] Tier2:[N] Tier3:[N] Tier4:[N] Chain:[N] Negative:[N])
**Results:** [N] PASS / [N] FAIL
**Newly-introduced defects:** [list D-IDs] / none
**Total open defects after fixes:** [N]
**Convergence:** YES / NO

#### New defects this iteration
| ID | Task | Description | Root cause | Fix applied |
|---|---|---|---|---|
| D-NNN | T-NNN | [description] | [root cause] | [fix] |

#### Defects fixed from previous iteration
| ID | Fix | Verified by |
|---|---|---|
| D-NNN | [fix description] | T-NNN (PASS) |

#### Summary
[1-2 sentences: what changed, what remains, convergence status]
```

### Convergence interpretation

| Iteration at convergence | Interpretation |
|---|---|
| 1--2 | Excellent. App was generated correctly on first attempt. |
| 3--4 | Good. Normal number of fix cycles for a complex app. |
| 5--6 | Acceptable. Indicates some systemic issues (e.g. multiple apps with same root cause). |
| 7--9 | Concerning. Suggests fundamental patterns were wrong; consider reviewing the generation approach. |
| Timeout (>=10) | Failed to converge. Human review required. Write an addendum to the test report documenting root causes. |

### Root cause batching (avoiding symptom-chasing)

Before fixing defects between iterations, group them by root cause:

```
WRONG: Fix D-047 (bookstore-wc4r print) -> fix D-056 (xtravels-fx print) -> fix D-058 (incidents-ui5 print)
       [3 separate fixes, all missing the underlying cause]

RIGHT: Root cause: "@media print does not override h-screen/overflow-hidden in FxLayout and sapMPage scroll container"
       Fix: Update print.css template for all 6 affected apps simultaneously
       [1 root cause, 1 fix applied everywhere, all 3+ defects close together]
```

For each defect group: state the root cause first, then apply the fix to all affected locations simultaneously. If the same root cause is found in 3+ places, treat it as a skill gap and note it for the ReportAddendum.

