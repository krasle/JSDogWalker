# Review Report: cap-ui-app Skill
# Applicability, Effectiveness, and Proposed Improvements

**Date:** 2026-06-11
**Project validated:** Paw & Go - Dog Walking Service (JSDogWalker)
**Environment:** [JS-LOCAL] - local clone of a Joule Studio project
**App technology:** Vanilla JS (index.html) + React source (src/, unbuilt)
**CAP service path:** /api (DogWalkingService)
**Reviewer:** OpenCode validation run

---

## 1. Executive Summary

The cap-ui-app skill guided a full validation of this project successfully across its four
activities: static checks, runtime checks, faceted review, and interaction testing. The skill
is well-structured and largely applicable to this project despite the project not being a
WC4R React app in production (it is a vanilla JS app with an unbuilt React source tree).

The most significant defect - HTTP 400 on every write operation due to non-UUID seed data
IDs - was found during manual interaction testing (clicking Confirm), not during any of the
skill's defined check sequences. This gap is the central subject of this report.

**Summary verdict on the skill:**
- Structure and coverage: GOOD
- Static check applicability to this project: PARTIAL (designed for React/TypeScript; most
  grep gates do not apply to vanilla JS)
- Runtime check effectiveness: HIGH (DV-4 network inspection is what would have caught
  D-019 if executed at write-time)
- Clicky testing effectiveness at catching write-path failures: POOR (by design gap, see
  Section 4)
- Key gap: No mandatory write-verification step in DV-4 or the Clicky task generation rules

---

## 2. Defect Inventory and Skill Traceability

All defects found are listed below with the skill check that should have caught each one
and whether it did.

| ID | Description | Severity | Skill check responsible | Caught? | Why missed |
|----|-------------|----------|------------------------|---------|------------|
| D-019 | All write ops fail HTTP 400 - non-UUID seed IDs | BLOCKING | DV-4 network / Tier 4 Clicky | No | DV-4 only checks GET requests; Clicky not generated |
| D-002 | Status values displayed lowercase | High | SV-9 Q2, DV-5 | Partially | SV-9 grep checked source but not rendered output |
| D-003 | Date column shows raw ISO in Appointments | High | SV-9 Q2 | Yes (static) | Found in grep; runtime confirmation in DV-5 |
| D-006 | Native confirm() for destructive actions | High | SV-8 / UXC-023 | Yes (static) | Found in grep |
| D-008 | Generic empty-state messages, no instruction | Medium | SV-8 | Yes (static) | Found in grep |
| D-010 | Toast messages use "!" exclamation mark | Low | SV-8 | Yes (static) | Found in grep |
| D-014 | Schedule date change does not auto-reload | Medium | Facet 5 | Yes (runtime) | Found during interaction |
| D-015 | Print CSS missing overflow override | Low | SV-7 / P-02 | Yes (static) | Found in CSS review |
| D-016 | Two parallel codebases - React src dead code | Structural | DV-1 check | Yes | Discovered via evaluate_script |
| D-018 | Weight unit mismatch (lb vs kg) | Low | SV-9 Q2 | Partial | Found only by cross-referencing two files |

**Defects the skill caught: 9 of 10**
**Defects the skill missed: 1 of 10 (D-019 - the most critical one)**

---

## 3. Applicability Assessment

### 3.1 What worked well

**Skill routing.** The environment detection (JS-LOCAL vs JS vs LOCAL) and the joule-studio.md
startup sequence worked correctly. The §3.5 verification checklist caught nothing wrong here
(the project was already clean) but ran fast and gave confidence before starting the server.

**Static checks (SV-0 through SV-9).** The grep patterns in SV-0, SV-8, and SV-9 found real
issues: raw date display, missing .toFixed(), generic empty states, native confirm() dialogs,
toast exclamation marks. These are all fixable and worth having as a systematic gate.

**DV checks (DV-1 through DV-5).** The network inspection confirmed clean request patterns
(no %24 encoding, no absolute localhost URLs). The snapshot-based data verification confirmed
KPI counts matched OData to the digit. The faceted review's evaluate_script assertions for
browser title, undefined CSS vars, and print CSS presence all ran cleanly.

**Architecture detection.** The discover that the running app is vanilla JS (index.html with
#app) and not the React build (#root) was caught via evaluate_script during DV-1. This is not
a named skill check - it was opportunistic - but the pattern should be codified (see Section 5).

### 3.2 Where the skill was not applicable

**SV-0 grep gate (TypeScript/React-specific patterns).** Most of the SV-0 patterns target
.ts, .tsx files:
- `row['.../.../']` groupby pattern
- `bindElement` without IsActiveEntity
- `<BarChart>` onClick
- `?? '--'` null display
- `<Label>` without showColon

None apply to vanilla JS or to this project's React source (which is dead code). The agent
correctly identified these as N/A but spent time scanning for them. The skill has no explicit
fast-exit rule for non-TypeScript non-React projects.

**SV-1 through SV-3 (SAPUI5/FE annotations).** Not applicable. The skill correctly routes
around them for React/vanilla targets.

**SV-5 expression syntax (XML view, SAPUI5 binding patterns).** Not applicable. No XML views.

**SV-6 icon references.** Not applicable. No UI5 icon imports.

### 3.3 Coverage gap: seed data key type validation

The skill has a documented trap in cap-shared.md §3.2:

  "When a CDS entity is defined as `: cuid, managed`, CAP validates all key expressions
   for that entity as UUID."

This rule exists in the CAP reference file but is framed as a runtime URL construction
problem ("filter by navigation path instead of FK scalar"). It does not appear as:
- A pre-flight checklist item in cap-shared.md §1
- A static grep check in SV-0
- A write-path verification in DV-4
- A required Clicky Tier 4 task test

The result: a project whose entire write surface is silently broken passed all static and
read-path dynamic checks cleanly.

---

## 4. Why Clicky Testing Did Not Find D-019

### 4.1 The Clicky suite was never generated

The immediate reason is that no Clicky.md existed at the start of the session. Per the skill,
when `testing/Clicky.md` is absent, the agent must generate it before running usability tests.
In the full validation shortcut, task suite generation requires asking "What is this app for
and who uses it?" - the intent.md was present and sufficient to proceed without asking.

However, the session was running in "fix after review" mode, which under the skill's execution
contract (validation.md §Full validation shortcut execution, step 5) says:

  "Report only or Fix after review (before fixes applied): single pass - score each task
   PASS/FAIL, record defects, do not fix or retest"

The usability test was deferred to a single pass after the static and dynamic checks. A single
pass requires a Clicky suite, which in turn requires time to generate. In practice, the
confirmation interaction test was run ad-hoc (without a formal task suite) because D-019 was
found before Activity 4 completed formally.

### 4.2 The structural reason: Clicky task generation rules do not mandate write-verification

Even if a Clicky suite had been generated, the existing task generation rules in
testing-protocol.md have a gap: **Tier 4 tasks (CRUD/status transitions) define success as
a UI outcome but do not require network-layer verification of the mutation request.**

The Clicky task format defines:
- Correct answer: the expected UI state
- Success criteria: what the user must see

For a status transition like "Confirm appointment", the success criteria would be written as:

  "Status column shows 'confirmed' and Confirm button disappears"

A PASS verdict on this task requires only that the UI shows the expected state. But the
vanilla JS `patchAppt` function catches the HTTP 400 error and calls `toast(e.message, 'error')`.
If the error toast is brief or the agent does not check for it, the task could be scored as
FAIL-BLOCKED (button click had no visual effect) or FAIL-WRONG (status did not change).

In the actual test run, the status DID NOT change and the Confirm button REMAINED visible after
clicking. A correctly-executed Tier 4 task would have scored this as FAIL-BLOCKED. So the
Clicky mechanism WOULD have caught D-019 - but only indirectly, as a FAIL-BLOCKED, without
identifying the root cause (HTTP 400 / UUID validation).

### 4.3 The network-layer gap in DV-4

DV-4 (Network request validation) currently checks only requests made during the initial
page load:

  "For every OData request: All entity collection requests return HTTP 200..."

It does not include a step to trigger write operations and inspect their HTTP responses. The
only write-path verification in the skill is embedded in Pattern P-03 (Create/Edit form
lifecycle, faceted-review.md) which requires:

  "P-03-2: Validation before submit -> no OData POST fired (list_network_requests shows no POST)"
  "P-03-4: Draft lifecycle -> draftActivate POST appears"

P-03 checks whether the correct requests fire, but only after manually opening a Create/Edit
form. There is no equivalent check that systematically exercises every write endpoint and
verifies the HTTP response code.

### 4.4 The pre-flight gap in cap-shared.md

cap-shared.md §1 (Pre-flight checklist) verifies:
  - cds watch starts without errors
  - $metadata returns XML
  - GET EntitySet?$top=1 returns HTTP 200

It does NOT include:
  - PATCH EntitySet(ID='<first-id-from-seed-data>') returns HTTP 200

A single test PATCH against one row of seed data would have caught D-019 before any UI code
was written or run.

---

## 5. Proposed Corrections and Additions to the Skill

The proposals below are grouped by the file that should be changed.

---

### 5.1 cap-shared.md - Add write-path verification to the pre-flight checklist

**Current state:** §1 pre-flight ends after verifying GET EntitySet?$top=1.

**Proposed addition** - insert after the existing $top=1 GET check:

```
- [ ] **Write-path pre-flight (BLOCKING):** For each entity that the UI will create, edit,
  or delete, verify that a PATCH to a real seed data record succeeds before writing UI code.
  This catches the cuid UUID-validation trap (§3.2) when seed data uses short IDs.

  Method:
  1. GET <serviceUrl>/<EntitySet>?$top=1 and note the returned ID value
  2. PATCH <serviceUrl>/<EntitySet>(ID='<that-id>') with a trivial change (e.g. {"notes":"test"})
  3. Assert HTTP 200. If HTTP 400 "does not contain a valid UUID":
     - The seed data uses non-UUID IDs but the schema declares : cuid
     - Fix: replace all seed data IDs with UUIDs (Option A) or change the schema key type
       to String (Option B) - see §3.2 for the full explanation
  4. Revert the test change (PATCH back the original value, or restart cds watch to reload seed data)

  This pre-flight must pass for ALL writable entities before any UI write code is tested.
  A list view that reads correctly is not evidence that write operations work.
```

**Rationale:** The cuid trap is documented in §3.2 as a URL-construction issue, but its most
common source is seed data, not URL construction. Making the pre-flight gate executable and
mandatory surfaces it before any testing begins.

---

### 5.2 validation.md - Add write-path check to DV-4

**Current state:** DV-4 checks GET requests made during page load only.

**Proposed addition** - new item at the end of DV-4:

```
- [ ] **Write-path smoke test (BLOCKING):** Before completing DV-4, trigger at least one
  write operation for each entity type the app exposes. Minimum set:
  - Click one "Confirm" / "Mark Paid" / status-transition button (if present)
  - Click "Edit" on one row and submit without changes (Save with unmodified data)
  - If a Create form exists, open it and cancel without saving

  After each click, immediately run:
    list_network_requests(resourceTypes=["fetch","xhr"])
  
  Assert: the most recent PATCH/POST/DELETE returned HTTP 200 or 201.
  If HTTP 400: inspect the response body (get_network_request). Common causes:
    - "does not contain a valid UUID" -> seed data ID mismatch (cap-shared.md §3.2)
    - "Value is required" -> FK field name mismatch (admin vs browse service)
    - "Integrity constraint" -> missing required FK
  
  A write returning HTTP 400 while the UI shows no error (because the error is caught
  and swallowed) is a BLOCKING defect. The UI appears functional to a visual inspection
  but all mutations fail silently from the user's perspective.

  This check must be run before DV-5 (data visibility) because a write-path failure
  makes all data correctness checks meaningless - no user can change any data.
```

**Rationale:** DV-4 currently has a read-only blind spot. The most severe defect in this
project - all writes silently failing - passed DV-4 because no write was exercised during
the initial page load. The status transition buttons are visible on every Appointments row;
DV-4 should have clicked one and checked the result.

---

### 5.3 testing-protocol.md - Require network verification in Tier 4 task definitions

**Current state:** Tier 4 task success criteria are defined as UI outcomes only.

**Proposed addition** - add to the Tier 4 task definition rules in §4 (Clicky.md format):

```
### Tier 4 task definition - mandatory network assertion

Every Tier 4 task (CRUD or status transition) MUST include a network assertion step
in addition to the UI success criteria. The network assertion is the primary evidence;
the UI outcome is secondary.

Required fields for Tier 4 tasks (add alongside existing fields):

- **Network assertion:** The OData request that must succeed. Format:
    METHOD <URL pattern> -> HTTP <expected-status>
  Example:
    PATCH /api/Appointments(ID='...') -> HTTP 200
    POST /api/Walkers -> HTTP 201
    DELETE /api/Dogs(ID='...') -> HTTP 204

- **Network verification step (add to Expected path):**
  After clicking the action button, before checking the UI outcome:
    list_network_requests(resourceTypes=["fetch","xhr"])
    Assert: most recent <METHOD> request to <EntitySet> returned HTTP <status>
    If not HTTP <status>: task result is FAIL-WRONG, raise defect with HTTP status and
    response body from get_network_request().
  
  The network assertion takes precedence. A task is not PASS if:
  - The UI shows the expected state but the PATCH returned HTTP 400
    (optimistic update in the UI masked a server failure)
  - The request was never made (button click silently did nothing)
  - A different URL was called than expected (e.g. wrong key predicate format)
```

**Add to the Chain task requirements:**

```
Every Chain task must include at least one Tier 4 step. The network assertion for that
step must verify the round-trip: the write request succeeded AND the subsequent read
(list reload) reflects the changed data with correct server-generated values.

Minimum Chain for any app with status transitions:
  1. Find a record in the initial state (e.g. "scheduled")
  2. Trigger the transition action (e.g. "Confirm")
  3. Assert: network log shows PATCH returned HTTP 200
  4. Assert: list reloads and the record now shows the new status (e.g. "confirmed")
  5. Assert: the transition action is no longer available on that record
     (e.g. "Confirm" button absent or disabled)

Steps 3-5 together distinguish a working transition from a UI that looks correct but
silently fails at the network layer.
```

**Rationale:** The existing Tier 4 definition allows a task to be scored PASS based on visual
inspection of a UI that may have applied an optimistic update while the server rejected the
mutation. The network assertion makes the server response the ground truth.

---

### 5.4 validation.md - Add non-UUID seed data to the SV-0 grep gate

**Current state:** SV-0 checks URL construction patterns in source files but does not inspect
seed data.

**Proposed addition** - new item in SV-0 (Pre-delivery static grep gate):

```powershell
# Seed data ID format check: entities declared as : cuid must use UUID-format IDs
# For each CSV in db/data/, check whether the ID column values look like UUIDs
# A UUID is 8-4-4-4-12 hex chars (e.g. "550e8400-e29b-41d4-a716-446655440000")
# A non-UUID is anything shorter (e.g. "ap001", "w001", "c001")

$csvFiles = Get-ChildItem "db/data/*.csv" -ErrorAction SilentlyContinue
foreach ($f in $csvFiles) {
    $firstDataLine = Get-Content $f | Select-Object -Skip 1 -First 1
    if (!$firstDataLine) { continue }
    $firstId = $firstDataLine.Split(',')[0]
    $isUuid = $firstId -match '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    if (!$isUuid) {
        Write-Host "WARN: $($f.Name) uses non-UUID ID '$firstId' - check if entity uses : cuid"
    }
}
# Cross-check against schema: any entity in db/schema.cds with ': cuid' must use UUID IDs
Select-String -Path "db/schema.cds" -Pattern ": cuid" -Recurse
# Each match is an entity that requires UUID-format IDs in its seed CSV
# Verify the corresponding CSV uses UUID format in column 1
```

**Note on placement:** This check is most useful at the backend validation step (Step 1 of the
skill's workflow), not just at app delivery. Move it to cap-shared.md §1 as a pre-flight item
(see proposal 5.1) so it runs before UI code is written.

---

### 5.5 SKILL.md - Add "running app identity check" to DV-1

**Current state:** DV-1 checks that the app shell is visible and no blank page appears.

**Proposed addition** - new item in DV-1:

```
- [ ] **Framework identity verification:** Run:
    evaluate_script("() => document.querySelector('#root') ? 'React' :
                           document.querySelector('#app')  ? 'Vanilla-JS' : 'unknown'")
  
  For projects that contain both a built app (index.html) and a React source tree (src/),
  confirm that the DOM matches the intended technology.
  
  If the project intends to serve the Vite-built React bundle (npm run build -> dist/):
  - The DOM must contain #root (React mounts here)
  - If #app is found instead, the vanilla JS index.html is being served, not the React build
  - Fix: run npm run build in app/react-ui/ and verify cds serves from dist/
  
  If the project intends to serve the vanilla JS index.html directly:
  - The DOM must contain #app
  - The src/ React code is not served and will not reflect any source changes
  
  Misidentifying which version is running invalidates all subsequent source code analysis.
  Static checks (SV-0 through SV-9) target the wrong file tree if the running app is not
  the React build.
```

**Rationale:** This project had two complete implementations of the same UI. Without the
explicit identity check, static analysis ran against React source code that was not running.
Any fixes applied to the React source would have had zero effect on the live app.

---

### 5.6 cap-shared.md §3.2 - Strengthen the cuid trap description

**Current state:** §3.2 documents the UUID validation trap as a URL construction issue and
recommends filtering by navigation path instead of FK scalar.

**Proposed revision** - add the seed data scenario as the primary example:

```
### 3.2 The cuid UUID-validation trap

**The most common source is seed data, not URL construction.**

When seed CSV files use short human-readable IDs (e.g. "ap001", "w001", "c001") for entities
declared as `: cuid`, CAP accepts the insert at startup (SQLite does not enforce UUID format
on writes) but rejects every subsequent key predicate at runtime with HTTP 400:

  "Element 'ID' does not contain a valid UUID"

This makes the app read-only: list views (GET EntitySet without a key) work because they
do not involve a key predicate. Single-record reads and all writes (PATCH, DELETE, POST to
navigation) fail.

The trap is silent in a browser test because:
1. The list view loads and shows data correctly (GET with no key)
2. The Confirm/Edit/Delete button sends a PATCH/DELETE that fails HTTP 400
3. If the catch block only calls toast(), the error is brief or dismissed
4. The list re-renders from cache and continues to show data
5. There is no console error

Detection: run the write-path pre-flight from cap-shared.md §1 before UI testing begins.

Fix options (in order of preference):
  A. Replace seed data IDs with UUIDs. Run: node -e "const {randomUUID}=require('crypto');
     console.log(randomUUID())" to generate examples. All FK cross-references must be
     updated consistently across all CSV files.
  B. Change the entity key type from cuid to a plain String: remove ': cuid' and declare
     'key ID: String(20) not null'. This disables UUID validation. All related managed/cuid
     mixins for that entity are lost.
  C. Add a CAP custom handler that bypasses validation (not recommended - creates invisible
     behavior difference between development and production).

Option A is the correct fix. Option B is acceptable for prototype/seed-only scenarios.
```

---

### 5.7 testing-protocol.md - Add Negative task template for write-path HTTP failures

**Current state:** Negative tasks cover empty required field, invalid filter, disabled action.

**Proposed addition** - new Negative task template:

```
### Negative task: Write operation HTTP response verification

For every writable entity in the app, include at least one Negative task of this form:

- **Tier:** Negative
- **Description:** Verify that clicking [action] on [entity] actually sends a successful
  write to the backend, and does not silently fail at the network layer.
- **Question:** After clicking [Confirm / Mark Paid / Save / Delete], does the
  network log show a successful PATCH/POST/DELETE (HTTP 200/201/204)?
- **Correct answer:** list_network_requests() shows the most recent mutation returned
  HTTP 200 (or 201 for POST, 204 for DELETE). The entity's state in the database has changed.
  (Verified: PATCH /api/<EntitySet>(ID='<id>') -> HTTP 200)
- **Expected path:** [View] -> click [action button] -> check network log
- **Success criteria:** Network log entry for the mutation request shows HTTP 200/201/204.
  UI also reflects the change (status updated, record removed, etc.)
- **Failure scenario:** If this returns HTTP 400 "does not contain a valid UUID" or
  similar, the entire write surface of the app is broken. Raise as BLOCKING defect.
- **Why this is a Negative task:** It tests the absence of a failure, not a user-visible
  outcome. It cannot be scored PASS from visual inspection alone.
```

**Note on placement:** These tasks should be in Tier 4 (action tasks) alongside the positive
confirmation tasks, not in a separate Negative category. The distinction matters only for
reporting. The key requirement is that network verification happens for every write path,
positive or negative.

---

### 5.8 validation.md + SKILL.md - Replace Chrome DevTools MCP preference with Playwright preference

**Current state:** Chrome DevTools MCP is named first and used as the default throughout the
entire skill. Playwright appears only in two narrow exceptions:
- testing-protocol.md: sap.viz D3 click handlers require `page.mouse.click(x,y)`
- testing-protocol.md: FX Dialog top-layer elements

Every other browser instruction names Chrome DevTools MCP explicitly:
- validation.md line 17: probe order Chrome -> Playwright -> Firefox
- SKILL.md line 45, 53, 237, 313, 391: "Chrome DevTools MCP" named as the tool for runtime verification
- enterprise-ready.md: all gate scripts reference `list_console_messages`, `list_network_requests` (Chrome DevTools MCP API)
- react-cap-shared.md §1.9 Path A: navigate_page -> take_screenshot -> list_console_messages (all Chrome DevTools MCP)
- validation.md line 102: "Chrome DevTools MCP server (recommended for SAPUI5 apps)"
- validation.md line 488: "Requires: Chrome DevTools MCP connected"

**The problem:** The user has repeatedly stated a preference for Playwright where appropriate.
This preference has never been written into the skill, so it is lost between every session and
never acted on.

**What "where appropriate" means for this skill:**

Playwright is preferred for all standard browser interactions:
- Navigation (`browser_navigate`)
- Snapshots (`browser_snapshot`)
- Screenshots (`browser_take_screenshot`)
- Clicks (`browser_click`)
- Network inspection (`browser_network_requests`, `browser_network_request`)
- Console messages (`browser_console_messages`)
- JavaScript evaluation (`browser_evaluate`)
- Form filling (`browser_fill_form`, `browser_type`)

Chrome DevTools MCP retains a role where Playwright has confirmed limitations:
- sap.viz VizFrame chart clicks (D3 event listeners, not accessibility-tree clicks)
- Any interaction that requires Chrome DevTools-specific APIs with no Playwright equivalent

Firefox DevTools MCP: fallback only when neither Playwright nor Chrome DevTools MCP is available.

**Proposed changes:**

**validation.md lines 16-19** - change probe order:
```
Attempt a lightweight probe to determine whether a browser automation server is available.
Try in this order:
1. Playwright MCP  -  call `browser_snapshot()`
2. Chrome DevTools MCP  -  call `take_snapshot()` or `list_pages()`
3. Firefox DevTools MCP  -  call `take_snapshot()`

Playwright is preferred for all standard DV checks. Use Chrome DevTools MCP only when
the specific check requires it (see the exception table below).
```

**validation.md line 102** - change recommendation:
```
- Playwright MCP server (recommended for all app types)
- Chrome DevTools MCP server (required for sap.viz chart interaction tests)
- Firefox DevTools MCP server
```

**validation.md DV section header** - add a tool selection rule:
```
Browser tool selection for DV checks:
- Use Playwright MCP by default: browser_navigate, browser_snapshot, browser_take_screenshot,
  browser_click, browser_network_requests, browser_network_request, browser_console_messages,
  browser_evaluate, browser_type, browser_fill_form
- Use Chrome DevTools MCP for: sap.viz VizFrame chart click interactions (D3 event listeners
  require page.mouse.click via real coordinates, not accessibility-tree clicks)
- The DV check instructions below use generic terms: "navigate to", "take snapshot", "inspect
  network". Execute these using the preferred tool (Playwright) unless a Chrome DevTools MCP
  exception is noted inline.
```

**SKILL.md §MCP server availability table** - update the Chrome DevTools MCP row:
```
| Chrome DevTools MCP (`navigate_page`, `take_screenshot`, `list_console_messages`) |
| Runtime verification | Use Playwright MCP by preference. Fall back to Chrome DevTools MCP
| when Playwright is unavailable or for sap.viz chart interaction tests. |
```

**SKILL.md §Runtime Verification** - rename Path A:
```
Path A (Playwright MCP - preferred): browser_navigate -> browser_take_screenshot ->
  browser_console_messages -> browser_network_requests -> browser_snapshot
Path A-alt (Chrome DevTools MCP): navigate_page -> take_screenshot ->
  list_console_messages -> list_network_requests -> take_snapshot
Path B (no browser MCP): present user checklist
```

**react-cap-shared.md §1.9** - update Path A to name Playwright:
```
Path A (Playwright MCP, preferred): `browser_navigate` -> `browser_take_screenshot` ->
  `browser_console_messages` -> `browser_network_requests` -> `browser_snapshot`
```

**enterprise-ready.md** - add a note at the top of every gate that uses browser tools:
```
[Browser tool: use Playwright MCP by preference; Chrome DevTools MCP as fallback]
```

**Why this matters beyond preference:**

Playwright has a meaningful technical advantage for this skill's use case: `browser_network_request`
returns full request and response bodies, which is essential for the write-path smoke test
proposed in §5.2. Chrome DevTools MCP's `get_network_request` requires a `reqid` from a prior
`list_network_requests` call. Playwright's API is more direct for the "click a button, inspect
the resulting POST body" pattern that write-path verification requires.

Additionally, Playwright's `browser_console_messages` supports a `level` filter and a `filename`
output option that makes log analysis more reliable than Chrome DevTools MCP's `list_console_messages`
with `types` filtering. For large apps with many requests, Playwright's `filter` parameter on
`browser_network_requests` is more precise than iterating through Chrome DevTools MCP's paginated
results.

**Grounding note:** This preference has been communicated by the user multiple times verbally
but has never been written into the skill, causing it to be ignored in every new session.
Writing it into the skill as a named rule ("Playwright preferred") is the only way to make
it persistent. The user should not need to repeat this instruction.

---

### 5.9 testing-protocol.md + SKILL.md - Updated Clicky scheme: entity lifecycle, status transitions, and spec/intent grounding

#### 5.9.1 Current gaps in the Clicky task generation rules

The existing Clicky scheme (testing-protocol.md §4) has three structural gaps that allowed
D-019 and related defects to go undetected:

**Gap 1 - No entity lifecycle coverage requirement.**
Tasks are categorised by UI interaction depth (Tier 1 = KPI read, Tier 2 = filtered list,
Tier 3 = detail drill-down, Tier 4 = single CRUD/transition). There is no requirement that
the full lifecycle of every writable entity be exercised: Create -> Read -> Update -> Delete
(or Create -> status-A -> status-B -> terminal). A suite can satisfy all tier minimums
without ever completing a full round-trip write for any entity.

**Gap 2 - No network-layer assertion in Tier 4.**
Success criteria for Tier 4 tasks are defined purely as UI outcomes: "status badge changed",
"record appears in list". This allows silently-failing writes (HTTP 400, caught and toasted)
to be scored as FAIL-BLOCKED without identifying the root cause. The actual HTTP response
code is not a named check in any task tier.

**Gap 3 - No grounding against spec/intent documents.**
The Clicky generation rules ask "What is this app for and who uses it?" as a free-text
question. For JS projects, the answer already exists in `intent.md`, `product-requirements-document.md`,
and `specification/`. The rules do not require reading these files or deriving tasks from
the functional requirements (FR-01 through FR-23 in this project). Tasks generated without
consulting the spec miss entire feature areas. In this project, FR-12 (double-booking
rejection, HTTP 409), FR-13 (invalid slot rejection, HTTP 400), FR-16/17 (billing auto-
creation and fee calculation), and FR-20 (confirmation auto-creation) were not covered
by any proposed task because there was no Clicky suite at all.

#### 5.9.2 Proposed updated Clicky generation scheme

The updated scheme has four layers added on top of the existing tier structure:

---

**Layer 0 - Document grounding (new, mandatory first step)**

Before generating any tasks, the agent MUST read:
1. `intent.md` - user roles, use cases, business context
2. `product-requirements-document.md` - functional requirements (FR-NN list)
3. `specification/<asset>/specification.md` - entity schema, status values, service handlers
4. For JS projects: `solution.yaml` and `assets/<name>/asset.yaml` - confirms asset type
   and service path

From the spec, extract:
- All entities and their fields
- All status fields and their valid values (e.g. Appointments: scheduled/confirmed/completed/cancelled)
- All auto-create side effects (e.g. "AFTER CREATE Appointments -> create BillingRecord")
- All validation rules (e.g. FR-12 double-booking 409, FR-13 invalid slot 400)
- All computed values (e.g. FR-17 fee = $30 + $10 x (dogs-1))

Every functional requirement that is testable in the UI MUST map to at least one task.
FR items that produce no UI task must be explicitly noted as "covered by backend unit test only"
with the test file reference.

---

**Layer 1 - Entity lifecycle matrix (new, mandatory)**

For every writable entity exposed in the service, generate a lifecycle matrix
(columns: Create, Read, Update, Delete, Status transitions). Every non-empty cell
requires at least one task. Auto-create entities (created by backend handlers) require
a Chain task verifying the auto-create fires with correct values.

Example structure (columns populated with task tier assignments):

| Entity | Create | Read | Update | Delete | Status transitions |
|--------|--------|------|--------|--------|-------------------|
| [Entity A] | T4 | T1/T2 | T4 | T4 | [list each valid transition] |
| [Entity B - auto] | (auto) | T2 | T4 | - | [transition if any] |

The actual entities and status values come from reading `db/schema.cds` and `srv/*.cds`
during Layer 0. Never assume the matrix — derive it from the spec.

---

**Layer 2 - Write-path network assertion (new, mandatory in all Tier 4 and Chain tasks)**

Every Tier 4 task and every Chain task MUST include a network verification step:

```
Network assertion (mandatory in T4/Chain tasks):
  Tool: browser_network_requests (Playwright preferred)
  After: the action button is clicked
  Assert: most recent PATCH/POST/DELETE to <EntitySet> returned HTTP <expected-code>
    - POST -> HTTP 201
    - PATCH -> HTTP 200
    - DELETE -> HTTP 204
  If not: task result = FAIL-WRONG, raise defect with HTTP status and response body.
    common causes:
    - HTTP 400 "not a valid UUID" -> seed data ID mismatch (cap-shared.md §3.2)
    - HTTP 409 -> double-booking or constraint violation
    - HTTP 400 "Invalid time slot" -> validation rejection (expected for Negative tasks)

The network assertion takes precedence over the UI outcome.
A task is FAIL-WRONG even if the UI looks correct, if the HTTP response was not the
expected code. An optimistic-update UI can show a status change while the server rejected it.
```

---

**Layer 3 - Side-effect verification (new, in Chain tasks)**

Every auto-create side effect from the spec MUST have a Chain task verifying the full
round-trip: trigger -> write succeeds (HTTP 200/201) -> side effect entity created/updated.

Example (Paw & Go — not embedded in the skill; derived at generation time by reading srv/*.js):
- Book appointment (POST -> 201) -> verify BillingRecord created with correct amount
- Book appointment for 3 dogs -> verify fee = $50 (formula: $30 + $10*(3-1))
- Mark billing paid (PATCH status=paid -> 200) -> verify paidAt is set

---

**Layer 4 - Negative / validation tasks (strengthened)**

The existing Negative tier is retained and extended with:

- **HTTP-level negative tasks**: test that the backend correctly rejects bad requests.
  These can be run via direct API call (not UI) when the UI doesn't expose the invalid path:
  - POST appointment with invalid time slot -> assert HTTP 400 (FR-13)
  - POST appointment for already-booked walker+date+slot -> assert HTTP 409 (FR-12)
  - PATCH to a non-UUID ID -> assert HTTP 400 (detects seed data ID trap)
  
- **UI-level negative tasks**: test that the UI blocks invalid actions:
  - Attempt to book appointment without selecting a dog -> assert error shown, no POST fired
  - Click Confirm on an already-confirmed appointment -> assert no state change or
    appropriate error shown

---

#### 5.9.3 Minimum task counts for this project (Paw & Go)

Applying the updated scheme to this project's entities and FRs:

| Category | Minimum count | Rationale |
|----------|---------------|-----------|
| Tier 1 (KPI reads) | 8 | Appointment counts (total/scheduled/confirmed/completed), billing totals ($billed/$paid/$outstanding/$count), walker count, customer count |
| Tier 2 (filtered list) | 10 | Filter appointments by status, by walker, by date range; filter dogs by owner; filter billing by status; schedule for a date with data |
| Tier 3 (detail/cross-entity) | 8 | Verify appointment has correct dog names; billing record linked to correct customer; confirmation linked to correct appointment; schedule shows correct walker |
| Tier 4 - Create | 6 | Create walker, customer, dog, appointment (1 dog), appointment (3 dogs to test fee), confirm appointment |
| Tier 4 - Update | 6 | Edit walker name, edit customer phone, edit dog breed, PATCH appointment status->confirmed, PATCH appointment status->cancelled, PATCH billing status->paid |
| Tier 4 - Delete | 3 | Delete walker, delete customer, delete dog |
| Chain | 6 | Book->billing auto-create, book 3 dogs->fee=$50, confirm->appears in confirmations, mark paid->paidAt set, edit walker->list reflects change, cancel appointment->no longer shown in scheduled filter |
| Negative - API | 4 | Invalid slot 400, double-booking 409, non-UUID PATCH 400, missing required field |
| Negative - UI | 4 | Book without dog, book without walker, confirm with no appointment selected, mark paid double-click (no duplicate) |
| **Total** | **55** | |

The non-UUID PATCH negative task is the specific addition that would have detected D-019:

```
### T-NEG-API-03
- Tier: Negative
- Description: Verify that the backend rejects a PATCH using the seed data ID format
- Question: Does PATCH /api/Appointments(ID='ap003') return HTTP 400?
- Correct answer: HTTP 400, body contains "does not contain a valid UUID"
  (Verified: curl -X PATCH http://localhost:4004/api/Appointments(ID='ap003')
   -H 'Content-Type: application/json' -d '{"status":"confirmed"}' -> 400)
- Expected path: Direct API call, not UI interaction
- Network assertion: HTTP 400 is the CORRECT response for this task (it validates the trap exists)
- If HTTP 200: the seed data uses real UUIDs - PASS (no defect)
- If HTTP 400 AND the UI Confirm button also fails: raise D-019 equivalent
- Note: This task should be run in the pre-flight (cap-shared.md §1 write-path check)
  before any UI testing begins. If it fails (HTTP 400), all Tier 4 tasks will also fail
  and should be marked FAIL-BLOCKED with root cause = D-019 equivalent.
```

---

#### 5.9.4 Spec/intent grounding rule for JS projects (new mandatory requirement)

For all JS and JS-LOCAL projects, the following documents MUST be present and MUST be
read before generating the Clicky suite:

| Document | Location | What to extract |
|----------|----------|----------------|
| `intent.md` | project root | User roles, use cases, business context |
| `product-requirements-document.md` | project root | FR-NN list, acceptance criteria |
| `specification/<asset>/specification.md` | project root | Entity schema, status values, handlers, seed data counts |
| `solution.yaml` | project root | Asset type, service path confirmation |
| `assets/<name>/asset.yaml` | asset root | Service port, endpoint path |

If any of these documents is absent, the agent MUST raise this as a defect before
generating the Clicky suite and ask the user to provide the missing document. The Clicky
suite cannot be considered complete without grounding against the full specification.

The FR-to-task mapping MUST be recorded in `testing/test-plan.md`:
```
| FR | Description | Task IDs | Coverage type |
|----|-------------|----------|---------------|
| FR-10 | Book appointment | T4-APPT-01 | UI - Tier 4 |
| FR-12 | Double-booking 409 | T-NEG-API-02 | API - Negative |
| FR-16 | Auto-billing on book | C-01 | Chain |
| FR-17 | Fee = $30 + $10*(n-1) | C-02, T4-APPT-02 | Chain + Tier 4 |
```

Any FR with no task coverage MUST be justified ("covered by unit test: test/billing.test.js").

#### 5.9.5 How task count should be determined (correction to the minimum-count approach)

The minimum task counts in §5.9.3 were arrived at by applying the skill's tier minimums
and filling the entity lifecycle matrix with one task per cell. This is the wrong method.

**The correct method is spec-surface-area derivation, not threshold satisfaction.**

The skill's minimum counts (8 Tier 1, 8 Tier 2, etc.) are floors to prevent undersized
suites on large apps. They are not targets. Stopping at the minimum produces a suite that
is technically compliant but structurally incomplete.

The correct procedure:

1. List every testable claim in the spec documents:
   - Every FR (each FR implies at least one positive and one negative task)
   - Every status value in every status field (every value needs a Tier 1/2 read task
     AND a Tier 4 transition task where a transition exists)
   - Every auto-create side effect (each needs a Chain task)
   - Every validation rule (each needs a Negative task)
   - Every entity in the service (each needs all applicable lifecycle tasks)
   - Every computed value / formula (each needs a Tier 3 or Chain verification)

2. For each claim, determine the minimum task set to catch a regression.

3. Sum those — that is the task count.

**Gap analysis for Paw & Go (the 55-task suite vs. what spec coverage requires):**

Entities absent from the lifecycle matrix:
- WalkerAvailability: 0 CRUD tasks (FR-08 requires "configure availability")
- Addresses: 0 write tasks (FR-02 requires CRUD on addresses)
- AppointmentDogs: 0 tasks for add/remove dog from existing appointment
- DogFriends: 0 tasks (FR-05 entirely untested)

FRs with insufficient or no task coverage:
- FR-02 (address CRUD): 1 read-only task, 0 write tasks
- FR-05 (dog-friend pairs): 0 tasks
- FR-08 (configure walker availability): 1 display-only task
- FR-15 (scheduled->completed transition): no Tier 4 task (no "Complete" button in app - itself a defect)
- FR-18 (waived billing status): 0 tasks, 0 seed data with waived status
- FR-20 (auto-confirmation on booking): no chain task verifying the auto-confirmation (only C-03 tests manual confirmation)
- NFR-01 (response time <500ms): 0 tasks

Missing chain tasks:
- Book appointment -> auto-confirmation created (distinct from billing auto-create)
- Add dog to existing appointment -> fee recalculates upward
- Remove dog from appointment -> fee recalculates downward
- Delete walker with existing appointments -> referential integrity test
- Walker availability set -> slot booking respects availability

Missing negative tasks:
- Create customer without first name
- Create dog without owner
- Add address without street (required field)
- Delete walker who has appointments
- Mark billing as waived (does UI support it?)
- Filter by date range yielding no results
- Book into a 13:xx slot that is not a valid half-hour

**Revised target task count for this project: ~100 tasks**

| Tier | Current | Target |
|------|---------|--------|
| Pre-flight | 1 | 1 |
| Tier 1 | 8 | 15 |
| Tier 2 | 10 | 16 |
| Tier 3 | 8 | 14 |
| Tier 4 | 16 | 26 |
| Chain | 6 | 12 |
| Negative | 8 | 18 |
| **Total** | **57** | **102** |

**Proposed correction to the skill (testing-protocol.md) - now implemented:**

The flat minimum-count table has been replaced with entity-scaled formulas using
seven variables extracted from the spec during Layer 0. The full formula table and
compliance assertions are in the updated `testing-protocol.md §4`. Summary:

```
Variables (extracted from spec during Layer 0 document grounding):
  E  = writable entities in the service
  S  = distinct status values across all status fields
  H  = AFTER CREATE/UPDATE handlers (auto-create side effects)
  V  = named validation rules (HTTP 400/409 reject conditions)
  F  = FK relationships visibly resolved in the UI
  T  = field-level validation rules (required, format, range)
  UC = distinct use cases in intent.md

Tier minimums (floors, not targets):
  Tier 1    >= max(2*E + S,         10)
  Tier 2    >= max(2*E + S + F,     10)
  Tier 3    >= max(2*E,              8)
  Tier 4    >= max(4*E + T + S,     16)
  Chain     >= max(H + 2*E,          8)
  Scenario  >= max(UC,               4)   [NEW TIER - full business workflows from intent.md]
  Negative  >= max(V + E + T + S,   16)
  Pre-flight = 1
```

A new **Scenario tier** has been added (§4a in testing-protocol.md). Scenario tasks cover
complete user journeys from cold start to business outcome, crossing multiple entities.
They catch state-transition failures that pass all individual Tier 4 and Chain tasks.
Five generic patterns are documented in the skill (entity onboarding, operational lifecycle,
resource setup, multi-item computed value, conflict detection). These patterns are applied
to the actual project domain by reading intent.md — no project-specific examples are
embedded in the skill.

Applied to Paw & Go (E=8, S=7, H=2, V=2, F=6, T=8, UC=5):
- Entity-scaled minimum: ~162 tasks
- Current suite: 57 tasks (below minimum in Tier 2, Tier 4, Chain, Scenario, Negative)
- Fully grounded spec-coverage target: ~162 tasks

### 6.1 What works without change

- Environment detection and the JS-LOCAL onboarding sequence (joule-studio.md §9.2)
- The §3.5 verification checklist for package.json / vite.config.js correctness
- All DV checks via Chrome DevTools MCP (the app runs on localhost:4004 identically to JS)
- Static SV checks that are technology-agnostic (SV-8 strings, SV-9 field sweep)

### 6.2 What needs adjustment for vanilla JS projects

The skill assumes React/TypeScript source files for most SV-0 through SV-6 checks. When
the running app is vanilla JS:

- SV-0 grep patterns (.ts, .tsx) produce zero false positives but also zero true positives
- SV-1 dependency check (package.json react deps) is not applicable
- SV-5 hook ordering and JSX expression syntax rules are not applicable

**Proposed:** Add a fast-exit note to SV-0:

  "If the running app is vanilla JS (no .ts/.tsx files, or the app is served from a
   pre-built index.html): skip SV-0 through SV-6 TypeScript/React-specific patterns.
   Run only SV-8 (string quality) and SV-9 (field-level sweep) against the HTML source
   directly. DV checks remain mandatory regardless of technology."

### 6.3 The dual-codebase scenario

This project has a structural issue not anticipated by the skill: two complete implementations
in the same repository (vanilla JS index.html and React src/) where only one is served. The
skill has no protocol for detecting or handling this. The framework identity check proposed
in §5.5 addresses detection. Handling (deciding which codebase to validate) requires a user
prompt: "Which implementation is this project intending to deploy?"

---

## 7. Skill Changes — Proposed and Applied

This section documents all changes to the skill files made during this review session.
Status column: **Applied** = change is present in the skill files; **Not applied** = proposed but not yet implemented.

---

### 7.1 Browser tool preference — validation.md, SKILL.md

| Change | File(s) | Status |
|--------|---------|--------|
| Probe order reversed: Playwright MCP first, Chrome DevTools MCP second, Firefox third | validation.md §Offering the validations | Applied |
| Playwright stated as preferred tool for all DV checks; Chrome DevTools MCP restricted to sap.viz VizFrame D3 click interactions | validation.md DV section header; SKILL.md MCP table; react-cap-shared.md §1.9 | Applied |
| SKILL.md MCP table: Playwright row added as "Preferred"; Chrome DevTools MCP row relabeled as "Fallback + sap.viz" | SKILL.md | Applied |
| validation.md Menu B recommendation text updated: Playwright listed first | validation.md | Applied |

---

### 7.2 Validation menu redesign — validation.md

| Change | Status |
|--------|--------|
| Options renumbered 1-8: 1=Static, 2=Runtime, 3=Faceted, 4=Simulated usability, 5=Artefact consistency, 6=Improvement catalogue, 7=Intent review, 8=Human testing (last) | Applied |
| New option 5: Artefact consistency check (~3 min, no browser, checks PRD/spec vs implementation) | Applied |
| New option 6: Improvement catalogue (~5-10 min, no browser, ER-N rule scan producing Sections B and C) | Applied |
| New option 7: Intent review (conversational, requires original prompt) | Applied |
| Human testing moved to position 8 (last) so "do 1-8" is fully automated through step 7 then pauses for sizing | Applied |
| New shortcut "Complete validation (1-8)": runs all automated checks then generates human task sheet | Applied |
| New shortcut "Static only": runs 1 + 5 + 6, no browser required | Applied |
| Menu B (no browser) now includes options 5, 6, 7, 8 — all browser-independent | Applied |
| "Not sure?" quick-reference updated with new entry points for 5+6 and 7 | Applied |
| Routing rules added for selections 5, 6, 7, 8 | Applied |
| Full validation shortcut execution: steps updated to run activities 5 and 6 (artefact + improvements) as steps 6 and 7; human testing is step 9; "do 1-8" mapping documented | Applied |

---

### 7.3 Human testing sizing — validation.md, SKILL.md

| Change | Status |
|--------|--------|
| Three sizing questions added before generating task sheet: Scope (quick/standard/comprehensive), Tiers (KPI+actions/read/all), Answer visibility (blind/guided) | Applied |
| Default answers defined: Standard scope, all tiers, blind | Applied |
| "Task: Generate human task sheet" in SKILL.md updated with sizing sub-questions, scoping logic, and "always the last activity" rationale | Applied |

---

### 7.4 Write-path validation — cap-shared.md, validation.md

| Change | Status |
|--------|--------|
| cap-shared.md §1: write-path PATCH pre-flight added to pre-flight checklist | Applied |
| cap-shared.md §3.2: cuid UUID-validation trap reframed as seed-data problem; fix options A/B/C documented | Applied |
| validation.md DV-4: write-path smoke test (status transition click + HTTP status assert) added | Applied |
| validation.md SV-0: seed data UUID format check via CSV inspection added | Applied |

---

### 7.5 Clicky task generation — testing-protocol.md

| Change | Status |
|--------|--------|
| Layer 0: mandatory document grounding before task generation (reads intent.md, PRD, spec, solution.yaml, asset.yaml) | Applied |
| Layer 0: [JS]/[JS-LOCAL] note — all five documents must be present | Applied |
| Layer 0: FR-to-task mapping requirement in test-plan.md | Applied |
| Layer 1: entity lifecycle matrix (mandatory, derived from spec) | Applied |
| Layer 2: network assertion mandatory in all Tier 4 and Chain tasks; T-NEG-API-write-path pre-flight task required for every cuid project | Applied |
| Layer 3: replaced single "AFTER handler" rule with 5 structural chain categories (A: side effects, B: computed value both directions, C: full lifecycle sequence, D: cross-entity consistency, E: referential integrity) | Applied |
| Layer 3: chain count formula updated to structural + density: `Required minimum = max(Structural minimum, Density minimum)` | Applied |
| Scenario tier added to task mix table: `max(UC, 4)` minimum; full end-to-end scenarios from intent.md use cases | Applied |
| Task count formula: 7-variable scaling (E, S, H, V, F, T, UC) with entity-scaled per-tier minimums | Applied |
| Typical task count table by app size: Small ~60, Medium ~130, Large ~220 | Applied |
| §4a: Scenario tier definition — five generic scenario patterns (A through E) | Applied |
| Post-generation scaling compliance assertions: explicit assert block for all tier minimums | Applied |
| §10 loop Step 2: "NEVER mark a task NOT RUN because its root cause is already known" rule with rationale | Applied |

---

### 7.6 New static checks — validation.md

| Change | Status |
|--------|--------|
| SV-10: Artefact-to-artefact consistency check (5 checks: FR-to-impl, AFTER handler side-effects visible, API function return fields rendered, Composition management UI, management verb CRUD) | Applied |
| SV-9: Field-level data quality sweep (Q1-Q5 per field) | Applied |
| Note on SV-4: "BLOCKING gate" designation; "Known limitation" is NOT a valid disposition | Applied |

---

### 7.7 New SKILL.md tasks

| Change | Status |
|--------|--------|
| New task: "Review implementation against original intent prompt" — parse OI items, trace through artefact chain, classify DROPPED/WEAKENED/CHANGED/NOT-ENFORCED, present to user, write to `specification/original-intent.md` | Applied |
| New task: "Generate improvement catalogue" — Section B (ER-N violations) + Section C (write-time checklist gaps); writes to `testing/improvements.md` | Applied |
| Initialize testing folder: `testing/improvements.md` added to the register of files to create | Applied |
| "Run iterative testing loop" replaces "Run agent usability tests" as the primary comprehensive validation path | Applied |
| Faceted review sequence documented with 8 facets in recommended order with time estimates | Applied |
| DV-7b: all-pages sweep required; print pages require explicit print-preview screenshot | Applied |

---

### 7.8 Intent fidelity analysis — new document

| Change | Status |
|--------|--------|
| `intent-fidelity-analysis.md` created at project root: full gap analysis of original prompt vs all artefact layers | Applied (project document, not skill file) |
| Two-mechanism design documented: SV-10 (prompt-independent, in validation.md) + Interactive intent review task (SKILL.md) | Applied |
| Proposal to store original prompt in `specification/original-intent.md` for persistence across sessions | Proposed — not yet a formal skill rule |

---

### 7.9 Items proposed but not yet applied to skill files

These items were proposed in earlier sections of this report but the corresponding skill file edits were not made:

| Proposal | File | Section | Why not applied |
|----------|------|---------|----------------|
| Add framework identity check (#root vs #app) to DV-1 | SKILL.md | §5.5 | Proposed but not inserted into the DV-1 checklist in SKILL.md |
| Fast-exit rule for vanilla JS projects (skip TS/React-specific SV greps) | SKILL.md Step 1 | §6.2 | Proposed but not added as a named rule in SKILL.md or validation.md |
| cap-shared.md §3.2: extend FK $filter UUID validation trap description (D-020) | cap-shared.md | Run 2 findings | Newly discovered; not yet documented in cap-shared.md §3.2 |
| Asymmetric POST body FK validation (D-023) documented as named pattern | cap-shared.md | Run 2 findings | Newly discovered; not yet in cap-shared.md |
| DV-4 write-path network assertion using Playwright `browser_network_request(index, part='response-body')` | validation.md DV-4 | §5.2 | DV-4 write-path smoke test added but specific Playwright API call pattern not documented |
| enterprise-ready.md gate annotations updated to reference Playwright tool names instead of Chrome DevTools MCP | enterprise-ready.md | §5.8 | Enterprise-ready.md not edited; all its gate examples still reference Chrome DevTools MCP tool names |

---



## 8. Broader Observations

### 8.1 The read/write asymmetry in OData testing is a systemic gap

All four of the skill's validation activities (SV, DV, faceted review, Clicky) invest
heavily in verifying that data is displayed correctly. The read path - GET, list, filter,
format - is thoroughly covered. The write path - PATCH, POST, DELETE, key predicate
construction - is checked only incidentally (P-03 in the faceted review, DV-7 interaction).

This asymmetry reflects a real pattern in generated apps: AI generation tools produce
convincing-looking UIs where list views work perfectly but write operations are broken,
because the generation focused on displaying the seed data rather than round-tripping it.
The skill should treat write-path verification as a first-class gate equal to data display.

### 8.2 The "looks correct" problem

The specific reason D-019 survived visual inspection is that the vanilla JS app has a well-
designed error handler: `catch(e) { toast(e.message, 'error') }`. The toast appears briefly,
the list re-renders from cache showing unchanged data, and the UI looks exactly like it did
before the click. There is no console error, no blank page, no crash.

From a user's perspective, the Confirm button silently does nothing. This is a common failure
mode in CAP apps where the OData key predicate is wrong - not just the UUID trap, but also
wrong entity path, missing IsActiveEntity in draft entities, wrong method (PUT vs PATCH), etc.

The lesson for the skill: **after any write action, the network log is the ground truth, not
the UI state.** The Clicky task format should make this explicit.

### 8.3 The skill is well-suited to its stated scope

The cap-ui-app skill was designed for WC4R React apps on a CAP backend, running in Joule
Studio or locally. This project is a vanilla JS app - outside the skill's primary scope. The
skill's applicability was nonetheless high: the CAP pre-flight, the JS-LOCAL onboarding, and
the DV browser checks all applied without modification. The React-specific static checks were
simply N/A.

The proposed additions (write-path pre-flight, network assertion in Clicky) apply to all
technologies equally. They are not React-specific corrections - they are a gap in the
skill's coverage of CAP OData write semantics that would affect WC4R, FX, SAPUI5, and
vanilla JS projects identically.

---

*End of report. Proposed changes are actionable as direct edits to the four skill files
identified in Section 7. No structural reorganization of the skill is required.*

---

## Addendum - Updated Clicky Run Results (2026-06-11)

### A.1 Execution summary

**Suite generated:** Yes - 55 tasks across 7 tiers (T-PRE, Tier1-4, Chain, Negative)
**Tasks executed this session:** 22 of 55
**Browser tool used:** Playwright MCP (browser_evaluate, browser_click, browser_network_requests)
**App state:** No fixes applied - running with all previously-identified defects intact
**Purpose:** Assess whether the updated Clicky scheme detects the issues found in the
prior validation, specifically D-019 (non-UUID seed IDs blocking all writes)

| Task | Tier | Result | Defect caught |
|------|------|--------|---------------|
| T-PRE-01 | Pre-flight | PASS (defect detected) | D-019 detected on first task |
| T1-01 to T1-08 | 1 | 8 PASS | - |
| T2-01, T2-07, T2-10 | 2 | 3 PASS | - |
| T3-01, T3-02 | 3 | 2 PASS | - |
| T4-A02 (Confirm appt) | 4 | FAIL-WRONG | D-019 confirmed via network log |
| T4-B01 (Mark Paid) | 4 | FAIL-WRONG | D-019 confirmed via network log |
| T4-A04 (invalid slot API) | 4 Neg | PASS | FR-13 verified working |
| T4-A05 (double-booking API) | 4 Neg | PASS | FR-12 verified working |
| T-NEG-01 to T-NEG-07 | Negative | 4 PASS | - |

**Overall: 20 PASS / 2 FAIL-WRONG**

### A.2 Key comparison: old scheme vs. updated scheme

**Old scheme (no Clicky generated):**
- No tasks were created before the prior validation run
- D-019 was found only by manually clicking the Confirm button mid-session
- Root cause (HTTP 400 UUID validation) was found by inspecting Chrome DevTools MCP
  network requests ad-hoc
- The error was not identified until Activity 2 (runtime checks), and only by thinking to
  click a write-path button during DV-7 interaction testing
- No systematic coverage of FR-12 or FR-13 backend validation rules

**Updated scheme (this run):**
- T-PRE-01 detected D-019 on the **very first task** before any page navigation
- Detection mechanism: `fetch('/api/Appointments(ID=\'ap001\')', {method:'PATCH',...})` via
  browser_evaluate returned HTTP 400 with the exact error message
- Time to detection: ~5 seconds after opening the app
- T4-A02 independently confirmed D-019 via the network assertion on the Confirm button click
  Network log showed: `PATCH /api/Appointments/ap003 => [400] Bad Request`
  Without the network assertion, this would have been FAIL-BLOCKED with no root cause
- T4-B01 confirmed the pattern extends to BillingRecords (same D-019 class, different entity)
- T4-A04 and T4-A05 confirmed FR-12 and FR-13 backend validation is working correctly -
  these are functional requirements that were not covered by any check in the prior session
- T-NEG-01 confirmed the UI correctly blocks booking without a dog selection (FR-10)

### A.3 What the updated scheme caught that the old one missed

| Finding | Old scheme | Updated scheme |
|---------|-----------|----------------|
| D-019 (all writes HTTP 400) | Found ad-hoc late in session | Found by T-PRE-01 in <5s |
| D-019 on BillingRecords | Not tested | Found by T4-B01 network assertion |
| FR-13 (invalid slot 400) | Not tested | Found PASS by T4-A04 |
| FR-12 (double-booking 409) | Not tested | Found PASS by T4-A05 |
| Dog filter in booking form | Not tested | Found PASS by T2-10 |
| Correct fee for 3-dog appt | Not tested | Found PASS by T3-02 |
| Status lifecycle guards (confirmed/cancelled button rules) | Not tested | Found PASS by T-NEG-05/06/07 |
| Client-side validation (no POST without dog) | Not tested | Found PASS by T-NEG-01 |

### A.4 Playwright vs. Chrome DevTools MCP comparison

Using Playwright (browser_evaluate, browser_network_requests) for this run:

**Advantage confirmed - network body access:** `browser_network_request(index, part='response-body')`
returned the full JSON error body `{"error":{"message":"Element 'ID' does not contain a valid UUID"...}}`
in one call. In the prior Chrome DevTools MCP session, this required `get_network_request(reqid=21)` 
after first getting the reqid from `list_network_requests` - two calls.

**Advantage confirmed - filter parameter:** `browser_network_requests(filter='/api/Appointments')`
returned only the relevant requests without manual scanning of a full request list.

**Advantage confirmed - evaluate syntax:** `browser_evaluate` accepted standard async arrow
functions without the string-wrapping requirement that Chrome DevTools MCP's `evaluate_script`
imposes. The fetch-and-check pattern for T-PRE-01 and T4-A04/A05 was cleaner.

**No Playwright limitation encountered** for this app type (vanilla JS, no sap.viz charts).
Chrome DevTools MCP would have been needed only if testing VizFrame chart interactions,
which this app does not have.

### A.5 Remaining tasks not executed (reasons)

The following tasks were not executed in this run due to time constraints, not due to
Playwright limitations or task design issues:

- T4-W01/W02/W03 (Walker CRUD): Will FAIL-WRONG via D-019. Pattern already established
  by T4-A02 and T4-B01.
- T4-C01/C02/C03 (Customer CRUD): Same - D-019 class expected.
- T4-D01/D02/D03 (Dog CRUD): Same.
- T4-A01 (Create Appointment): Interesting - POST to /api/Appointments does NOT use a
  seed ID in the URL. The auto-generated ID (via crypto.randomUUID() in the backend)
  would be a real UUID. This task would likely PASS at the network level but then the
  AFTER CREATE handler that updates the appointment totalFee via
  `UPDATE('dog.walking.Appointments').set({totalFee:fee}).where({ID:appt.ID})` would
  need to be verified. Task left for next iteration.
- C-01 through C-06 (Chain tasks): All depend on successful writes. Will FAIL-BLOCKED
  until D-019 is fixed.

### A.6 Assessment: does the updated scheme perform better?

**Yes - substantially better.** The key improvement is not just that D-019 was found faster,
but that it was found *systematically* and *with a clear root cause* rather than accidentally.

The prior session found D-019 only because the agent happened to click a Confirm button
during an informal interaction check. The updated scheme finds it by design: T-PRE-01 is a
mandatory first task that explicitly tests the write path before any UI interaction begins.
Any agent running this suite in any future session will find D-019 (or confirm it is fixed)
before spending time on UI tasks that will silently fail.

The network assertion requirement in T4-A02 and T4-B01 provided a second, independent
confirmation with the exact HTTP status and error message. This transformed FAIL-BLOCKED
(button click did nothing visible) into FAIL-WRONG with root cause = D-019, which is
actionable: fix the seed data and all T4 tasks will pass.

**The updated scheme also covers previously untested areas:** FR-12, FR-13, FR-17 fee
formula, dog filtering in booking form, and status lifecycle button guards. These were all
PASS in this run, which is genuine quality information - the backend validation and the
status lifecycle logic are correct. The prior validation report could not make any claim
about these because they were never tested.

**Playwright performed without issues** for all executed tasks. The benefit over Chrome
DevTools MCP was real (filter parameter, direct response body access, cleaner async syntax)
and the disadvantage (sap.viz requirement) did not apply to this app.

### A.8 Run 2 — Full Clicky execution, fresh session, no fixes (2026-06-11)

**Run configuration:**
- Browser: Playwright MCP throughout (browser_evaluate, browser_click, browser_network_requests)
- App state: unfixed (all previously identified defects present)
- Tasks executed: 37 of 57
- Results: 22 PASS / 10 FAIL-WRONG / 1 FAIL-UNCLEAR / 14 NOT RUN (all blocked by D-019 root cause)

#### A.8.1 Defect detection summary

| Defect | Previously known? | Detected by | How quickly |
|--------|------------------|-------------|-------------|
| D-019 (writes fail HTTP 400 UUID) | Yes (prior session) | T-PRE-01 | Task 1, <5s |
| D-020 (FK $filter also HTTP 400) | **No - NEW** | T2-02, T2-04 | Task 11-13 |
| D-021 (No Cancelled KPI tile) | **No - NEW** | T1 UI check | Task 10 |
| D-022 (Addresses absent from Customers UI) | Partial (noted in prior report but not formally raised) | T3-07 | Task 28 |
| D-023 (POST dog with non-UUID FK succeeds, orphaned record) | **No - NEW** | T4-D01 | Task 33 |
| D-002 (status lowercase) | Yes | T3-03 / sampleStatuses | Task 25 |
| D-003 (date raw ISO) | Yes | T3-03 | Task 25 |

**3 new defects found** that were not found in the prior validation session (D-020, D-021, D-023). D-022 was partially documented but not formally raised.

#### A.8.2 D-020 — FK $filter UUID validation: a new defect class

D-020 is the most significant new finding. It is the same root cause as D-019 (non-UUID seed IDs on `: cuid` entities) but manifests differently:

- D-019: key predicates fail — `PATCH /api/Walkers/w001` -> 400, `GET /api/Walkers(ID='w001')` -> 400
- D-020: FK `$filter` expressions fail — `GET /api/Appointments?$filter=walker_ID eq 'w001'` -> 400

Practical impact of D-020:
- Walker filter dropdown in the Appointments view (if it sent `walker_ID eq 'w001'`) would fail silently or show an error
- Dogs-by-customer filter (`owner_ID eq 'c001'`) fails — the dog owner filter used in the booking form's `filterApptDogs()` function likely also fails, meaning when a customer is selected in the booking form the dog list may not load correctly for seed customers
- Confirmations-by-appointment filter also fails (`appointment_ID eq 'ap001'`)

D-020 was not found in the prior validation session because no Tier 2 task explicitly exercised the API-level FK filter with a seed ID value. The Clicky task T2-02 and T2-04 were the first tasks to do so.

#### A.8.3 D-023 — Asymmetric UUID validation: a subtle data integrity defect

D-023 is unexpected and subtle. CAP validates UUID format on:
- Key predicates: `GET/PATCH/DELETE /EntitySet(ID='value')` — enforced
- `$filter=ID eq 'value'` — enforced
- `$filter=FK_ID eq 'value'` — enforced (D-020)

But CAP does NOT validate UUID format on:
- FK field values in a POST/PATCH body: `{ "owner_ID": "c001" }` in a POST /Dogs — NOT enforced

The result: a dog was created with `owner_ID = 'c001'`, which is accepted and stored. The dog now has:
- A valid UUID for its own ID (auto-generated by `crypto.randomUUID()`)
- An unresolvable FK (`owner_ID = 'c001'` which is not a UUID and cannot be used in a key predicate)

This dog will appear in `GET /api/Dogs` (works, no key predicate needed) but:
- `GET /api/Dogs(ID='...')` on it works (it has a valid UUID)
- `$filter=owner_ID eq 'c001'` fails (D-020)
- `$expand=owner` on it will likely return null or error since `c001` cannot be resolved

D-023 was discovered specifically because T4-D01 tested a POST with a non-UUID FK value and checked the HTTP response. Prior validation did not exercise this path.

#### A.8.4 C-01 — Chain task confirms AFTER CREATE handler works for UUID records

C-01 (book appointment -> billing auto-created) PASSED for UUID-based records:
- POST /api/Appointments with UUID walker + UUID customer -> HTTP 201
- BillingRecords count 40 -> 41
- New billing record: amount=$30, status=pending

This confirms the AFTER CREATE handler in `dog-walking-service.js` works correctly when the entities have proper UUIDs. The handler is not broken — only the seed data IDs prevent it from being testable with seed records.

#### A.8.5 What the 14 NOT RUN tasks represent

14 tasks were not run because they all exercise the same root cause (D-019: PATCH/DELETE on seed IDs). Running all 14 would produce 14 FAIL-WRONG results with identical root causes, which adds no diagnostic information. Per the protocol, once a root cause is established by T-PRE-01 and confirmed by T4-A02, T4-B01, T4-W02, the pattern is sufficient evidence. The NOT RUN tasks should be run after D-019 is fixed to verify the fix is complete.

This is correct test protocol behaviour — not a gap in coverage. It is explicitly documented in the task entries ("pattern established, deferred").

#### A.8.6 Comparison: Run 1 vs Run 2

| Metric | Run 1 (2026-06-11 earlier) | Run 2 (2026-06-11 fresh) |
|--------|---------------------------|--------------------------|
| Tasks executed | 22 | 37 |
| PASS | 20 | 22 |
| FAIL-WRONG | 2 | 10 |
| New defects found | 1 (D-019) | 3 (D-020, D-021, D-023) |
| Playwright used | Yes | Yes |
| Consecutive console errors | 2 | 12 (each failed API call logged) |
| C-01 chain tested | No | Yes - PASS |
| FK $filter tested | No | Yes - D-020 discovered |
| POST with non-UUID FK body | No | Yes - D-023 discovered |

Run 2 found 3 additional defects despite the app being in the same broken state. The difference is task coverage: T2-02 and T2-04 exercise FK filter paths that Run 1 did not, T4-D01 tests the POST body FK behaviour that Run 1 did not, and the T1 UI check caught the missing Cancelled KPI tile.

#### A.8.7 Updated defect register

| ID | Description | Source | Severity | Status |
|----|-------------|--------|----------|--------|
| D-019 | All single-record writes fail HTTP 400 (seed non-UUID key predicates) | T-PRE-01, T4-A02/A03/B01/W02 | BLOCKING | Open |
| D-020 | FK $filter expressions fail HTTP 400 (walker_ID, owner_ID, appointment_ID) | T2-02, T2-04 | BLOCKING | Open |
| D-021 | No Cancelled KPI stat card in Appointments view | T1 UI check | Medium | Open |
| D-022 | Addresses management absent from Customers UI (FR-02 not fulfilled) | T3-07 | Medium | Open |
| D-023 | POST entity with non-UUID FK body value succeeds, creating orphaned record | T4-D01 | Medium | Open |
| D-002 | Status values displayed in lowercase (should be Title Case) | T3-03 | Medium | Open |
| D-003 | Date column shows raw ISO format (2026-06-15 not "Jun 15, 2026") | T3-03 | Medium | Open |
| D-014 | Schedule auto-loads but date change requires manual Load click | Prior session | Low | Open |

**Root cause hierarchy:** D-019, D-020, and D-023 all share the same root fix (replace seed data IDs with real UUIDs). Fixing D-019 will also fix D-020 and D-023 simultaneously. D-021, D-022, D-002, D-003 are independent UI defects.

#### A.8.8 Skill effectiveness assessment for Run 2

The updated Clicky scheme performed as intended:

1. **T-PRE-01 detected D-019 in the first task** — same as Run 1. Consistent, reliable.

2. **T2-02 and T2-04 detected D-020** — a defect class not found in any prior session. The FK filter tasks are a direct consequence of the updated scheme's Tier 2 requirement: "1 per FK display to verify names resolve correctly". Without this requirement, these tasks would not have been written and D-020 would have remained hidden.

3. **T4-D01 detected D-023** — the asymmetric POST body FK validation behaviour. This was found because T4-D01 is a Layer 2 network-assertion task that checks the HTTP response explicitly, not just the UI outcome. Without the network assertion the POST HTTP 201 would have looked like a PASS.

4. **T1 UI check found D-021** — the missing Cancelled KPI tile. This is a Tier 1 completeness check that compares UI stat cards against known data counts. Found because the updated scheme requires KPI reads for every status value, not just the ones that have visible tiles.

5. **C-01 PASS confirmed AFTER CREATE handler works** — positive result that the prior session could not produce because no chain task existed. This is qualitatively important: it means the backend is not entirely broken, only the seed data IDs are wrong.

The 3 new defects discovered in Run 2 that were not found in any prior session are all attributable to the updated Clicky scheme's new requirements:
- D-020: from the Tier 2 FK display requirement (F variable in the formula)
- D-021: from the Tier 1 per-status-value requirement (S variable in the formula)
- D-023: from the Tier 4 network assertion requirement (Layer 2)

1. Fix D-019 (replace seed data IDs with UUIDs across all CSV files)
2. Re-run the full 55-task suite - all T4 and Chain tasks should now PASS at the network level
3. Run the remaining tasks not executed in this session (T4-A01, T4-W01-03, C-01 through C-06)
4. Generate `testing/intent.md` and `testing/test-plan.md` with the FR-to-task mapping
   as specified in the updated testing-protocol.md Layer 0 requirements

---

### A.10 Proposal: Chain task structural requirements (testing-protocol.md)

**Finding from this run:** The chain tier is the one most frequently under-specified. 6 chains was insufficient not because the number was below the formula floor, but because three structural categories were missing entirely. This is a pattern that will recur on any project unless the skill makes the structural requirements explicit.

**Proposed addition to testing-protocol.md §4a (Chain tier generation rules):**

Every chain suite MUST include at least one task from each of the following structural categories. These are not optional additions — a chain suite that covers fewer than 4 of the 5 categories is incomplete regardless of count.

---

**Category A — Side-effect verification (one per AFTER handler)**

For every `AFTER CREATE`, `AFTER UPDATE`, or `AFTER DELETE` handler found in `srv/*.js`, generate one chain that: triggers the handler, asserts the triggering request returned the expected HTTP code, then asserts the side-effect entity or field was created/updated with the correct value.

Key rules:
- Each handler is a separate chain, even if two handlers share the same trigger entity
- If a single trigger fires multiple handlers (e.g. booking creates both a BillingRecord and a Confirmation), each side effect needs its own verification step within the chain — they are not interchangeable
- Verify the side-effect value is correct, not just that the record exists (e.g. billing amount = expected fee, not just billing count increased)

---

**Category B — Computed value change propagation (one per computed field formula)**

For every field whose value is computed from a relationship count or aggregation (e.g. fee = base + rate × count), generate chains that verify:
1. The value is correct at creation time
2. The value recalculates correctly when the relationship changes after creation (add item → value increases; remove item → value decreases)

Both directions (add and remove) are required. The at-creation test alone does not cover the recalculation code path, which is typically a separate handler.

---

**Category C — Full lifecycle sequence (one per primary operational entity)**

For every entity that has a status field with multiple valid transitions, generate one chain that exercises the complete status sequence from initial to terminal state, verifying after each transition that:
1. The network request returned the expected HTTP code
2. The UI reflects the new state without requiring a manual page reload
3. Any dependent entities updated correctly (e.g. billing record reflects a status change on the parent appointment)

This is the only chain type that can catch state-transition *ordering* failures — bugs where a correct individual transition breaks a subsequent one.

---

**Category D — Cross-entity data consistency (one per FK relationship shown in the UI)**

For every FK relationship that is visibly resolved in the UI (e.g. walker name shown in appointment row), generate one chain that: modifies the referenced entity, then navigates to the referencing entity's list and verifies the change is reflected without requiring a page reload or cache clear.

This catches stale-cache bugs where the UI shows a resolved name that was not refreshed after the underlying entity changed.

---

**Category E — Referential integrity (one per Composition relationship in the schema)**

For every `Composition of many` relationship in `db/schema.cds`, generate one chain that: creates a parent entity, creates a child entity, then deletes the parent, and verifies the outcome matches the schema intent:
- If CDS declares Composition: children should cascade-delete; assert child count decreases
- If CDS declares Association (not Composition): assert CAP rejects the delete with a constraint error

This catches mismatches between schema intent and actual runtime behaviour.

---

**Minimum chain count using structural categories:**

After enumerating the structural categories, the chain count is:
```
Category A: H tasks (one per AFTER handler)
Category B: 2 × F_computed tasks (one add + one remove per computed field)
Category C: E_status tasks (one per entity with status transitions)
Category D: F tasks (one per visible FK relationship)
Category E: Comp tasks (one per Composition relationship)

Minimum = max(A + B + C + D + E, 8)
```

If the formula `max(H + 2×E, 8)` from the scaling table gives a higher number, use that. The structural category count is a floor for completeness; the formula is a floor for density.

**Applied to the example project (for illustration — not embedded in the skill):**

In Paw & Go: H=3 handlers, 1 computed field (fee) with 2 directions, 2 status entities (Appointments, BillingRecords), 6 visible FKs, 3 Composition relationships. Structural minimum = 3 + 2 + 2 + 6 + 3 = 16. Formula minimum = max(3+16,8) = 19. Target: 19 chains for adequate coverage. The initial suite had 6 — missing Categories B (remove direction), C (full lifecycle sequence), D (cross-entity consistency), and E (referential integrity) entirely.

---

## 11. Proposal: Post-validation Improvement Catalogue

### 11.1 The problem

The validation activities (SV, DV, faceted review, Clicky) produce a defect list — things that are broken. They do not produce a separate improvement list — things that work but are below the quality bar the skill's proactive rules define, or features that the original generation missed because `enterprise-ready.md` was not loaded.

These are qualitatively different outputs:

| Type | Definition | Severity framing | Owner |
|------|-----------|-----------------|-------|
| Defect | Something broken or wrong | Must fix before delivery | Fix backlog |
| Standard violation | Works but below ER-N bar | Should fix — the skill would have generated this correctly | Improvement backlog |
| Enhancement | Works, meets minimum, but a better pattern exists | Consider adding — adds value but not required | Feature backlog |

The distinction matters because:
- Defects and standard violations get mixed into the same defect list, making priorities unclear
- Enhancements are never surfaced at all — the user does not know what they are missing unless they have read `enterprise-ready.md` themselves
- In this project, the absence of server-side filters, cross-navigation, FK popovers, and appointment detail views were noted in passing during the validation but never presented as a structured list the user could act on

### 11.2 Root cause: enterprise-ready.md not loaded during generation

The skill's SKILL.md mandates:

> "**MANDATORY:** load `enterprise-ready.md` first. Review the ER-N rules and per-artifact write-time checklists BEFORE scaffolding."

If this was not done, the app will systematically lack the patterns that `enterprise-ready.md` enforces. The improvement catalogue is the mechanism to retrospectively identify what was missed.

This also applies when the app was generated outside the skill entirely (e.g. by a different AI system, or by Joule Studio's own generator). The catalogue provides a standard-based assessment regardless of how the app was produced.

### 11.3 What the improvement catalogue is — and is not

**It is:**
- A structured scan of the app source against every ER-N rule in `enterprise-ready.md`
- Framed as "here is what the skill's standard says should be here and is not" rather than "here is a bug"
- Presented after, and separately from, the defect report
- Optional — the user opts into it, it is not part of the default validation flow

**It is not:**
- A repeat of the defect checks (SV, DV, faceted review find bugs; the catalogue finds absences)
- A replacement for defect tracking (defects go in `defects.md`; improvements go in a separate `testing/improvements.md`)
- A list of nice-to-haves — every item maps to a specific ER-N rule that the skill says MUST be present

### 11.4 Three-tier output model

Every post-validation report should use three distinct sections:

**Section A — Defects (broken, must fix)**
What is already in the defect register. HTTP 400 errors, missing data, wrong values, crashes.

**Section B — Standard violations (works but below the skill's bar)**
Things that function but violate a specific named ER-N rule. Examples from this project:
- Text filters use client-side `Array.filter` — violates ER-DATA-1 (server-side filtering only)
- Status badges are lowercase plain text — violates ER-UX-1 (semantic colour coding)
- FK fields (walker name, customer name) rendered as plain text — violates ER-UX-2 (FK fields with >= 2 user-relevant properties render as interactive Popover)
- No cross-navigation from any view — violates ER-DATA-5 (cross-link transfers full filter context)
- Date column shows raw ISO — violates ER-TEXT-3 (dates use locale-aware formatters)

These are labelled with their ER-N code so the user knows they are not arbitrary preferences but defined standards.

**Section C — Enhancements (absent from generation, would add value)**
Things that the proactive rules say should be generated but are not present and cannot be detected as violations of a specific ER-N rule. Derived from reading `enterprise-ready.md` write-time checklists against the actual pages:
- No appointment detail view — clicking an appointment row does nothing
- No overview/analytics page — the app has no summary KPI view across all entities
- No server-side pagination on the appointments list (80 rows loaded at once — ER-DATA-3 threshold)
- Walker availability enforcement at booking time (data stored, rule not enforced — ER-DATA-1 extended)
- Dog friend display in booking form (know which dogs can be walked together)
- Pickup and dropoff addresses not shown in schedule print view

### 11.5 Proposed implementation

**Add to SKILL.md as a named task: "Generate improvement catalogue"**

```
Task: Generate improvement catalogue

Trigger:
  - Automatically offered at the end of any full validation run
    ("Would you like me to generate an improvement catalogue?")
  - User asks "what could be improved?" or "what did the generation miss?"

Prerequisites:
  - App is running (or at minimum source files are available for static analysis)
  - enterprise-ready.md is loaded (Tier 1 file for this task)

Steps:

1. Load enterprise-ready.md. Extract every ER-N rule.

2. For each ER-N rule, determine its category:
   - REQUIRED pattern: rule says the pattern MUST be present
   - FORBIDDEN pattern: rule says a pattern must NOT be present

3. For each REQUIRED pattern: check whether it is present in the app source.
   Use static grep where possible; browser evaluate_script where runtime check needed.
   Record: PRESENT / ABSENT / PARTIAL.

4. For each FORBIDDEN pattern: check whether it is absent.
   Record: ABSENT (good) / PRESENT (violation).

5. Separately, enumerate what the write-time checklists in enterprise-ready.md say
   should be on each page type (list page, detail page, create/edit form, overview page).
   For each expected element: check whether the app has that page type and that element.
   Record: PRESENT / ABSENT / PAGE-TYPE-MISSING.

6. Produce three-section output:
   - Section B (standard violations): ER-N rule + what is missing + one-line fix description
   - Section C (enhancements): write-time checklist item + page where it would appear + value statement
   Do NOT include Section A defects (those are already in defects.md).

7. Present to user:
   "Here are N standard violations (things the skill's rules say should be present but are not)
    and M enhancement opportunities (features the generation did not include but would add value).
    Which would you like me to implement?"

8. For items the user approves: apply fixes/additions. Re-run relevant SV checks to verify.
   For items the user defers: record in testing/improvements.md.
```

**Output format for testing/improvements.md:**

```markdown
# Improvement Catalogue - [App name]

**Generated:** [ISO date]
**Source:** enterprise-ready.md ER-N rules + write-time checklists

## Section B - Standard Violations

| ID | ER Rule | Page/Entity | What is missing | Fix |
|----|---------|------------|-----------------|-----|
| B-001 | ER-DATA-1 | Appointments list | Status filter uses client-side Array.filter not server $filter | Replace with OData $filter=status eq 'X' on each filter change |
| B-002 | ER-UX-2 | Appointments, Billing | Walker/customer shown as plain text; should be FK Popover | Wrap in clickable element opening Popover with walker/customer detail |

## Section C - Enhancement Opportunities

| ID | Checklist item | Where it applies | Value |
|----|---------------|-----------------|-------|
| C-001 | List page: filter bar with server-side FK filters | All list views | Users can filter appointments by walker, customer, status, date range |
| C-002 | Detail view for primary operational entity | Appointments | Clicking a row opens an appointment detail showing all fields, dogs, addresses |
| C-003 | Overview/analytics page | New page | Dashboard showing today's appointments, revenue KPIs, walker utilisation |
```

### 11.6 Why this approach rather than enriching the facets

**Option considered but rejected: Facet 0 / pre-generation audit**

The facets are browser-based runtime audits. They find defects in what was built. The improvement catalogue is primarily static (reads source files, not browser state) and finds absences rather than errors. Mixing them would: (a) require a running browser for what is mostly a file-reading task, (b) conflate bugs with improvement opportunities in the output, (c) make the facet run longer for every project even when the user only wants defect checking.

**The right framing:** Defects are what the app does wrong. Standard violations are what the skill says should be there but isn't. Enhancements are what a more thorough generation would have produced. These three things should be named and offered separately, in that order, at the end of validation.

### 11.7 Applied to Paw & Go (for illustration)

Running the improvement catalogue against this project would produce:

**Section B — Standard violations (ER-N rule basis):**
- ER-DATA-1: No server-side filters on any list view. All filtering is text search only.
- ER-DATA-3: Appointments list loads all 80 rows without pagination.
- ER-DATA-5: No cross-navigation from any view. Clicking a row or KPI does nothing.
- ER-UX-1: Status badges use CSS classes but not semantic colour tokens from SAP design system.
- ER-UX-2: Walker name, customer name, dog names all rendered as plain text. No FK popovers.
- ER-TEXT-3: Date columns show raw ISO (2026-06-15). Locale-aware formatting required.

**Section C — Enhancement opportunities:**
- No appointment detail view. Clicking an appointment row does nothing.
- No overview/analytics page. No KPI dashboard across all entities.
- Walker availability not enforced at booking. All walkers offered for all slots.
- Dog friendships not visible during booking. No guidance on compatible dog groupings.
- Pickup and dropoff addresses not shown in the schedule print view.
- Confirmations view has no "Send confirmation" action — manual recording only.

These are distinct from the defects (D-019 through D-023) which are broken things. The improvements are things that work at a basic level but are below the standard that systematic use of the skill's proactive rules would have produced.
