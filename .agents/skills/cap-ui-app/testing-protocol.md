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

**Task mix requirement:** A well-formed Clicky suite for a 4-page app must include:
- At least 8 Tier 1 tasks (KPI reads - fast sanity checks, re-run every iteration)
- At least 8 Tier 2 tasks (filtered list navigation)
- At least 8 Tier 3 tasks (detail drill-down from list)
- At least 8 Tier 4 tasks (single CRUD or status-transition action)
- At least 8 Chain tasks (multi-page action sequences - see Tier 5 below)
- At least 16 negative tasks (things that should NOT be possible or visible)

Chains (Tier 5) are required because they exercise the inter-page state that individual point-tasks cannot catch. A typical 4-page app needs a minimum of 20--25 tasks total; a 4-page multi-app benchmarking run needs 24 positive + 24 negative per use case.

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
  5. Verify success toast -> click Back -> verify list shows the updated description in that row
- **Correct answer at step 2:** [record ID, e.g. 4133] (verified: GET /odata/v4/travel/Travels?$filter=Status_code eq 'A' and IsActiveEntity eq true&$orderby=TotalPrice desc&$top=1)
- **Correct answer at step 5:** Description in list row equals "Updated by test [timestamp]"
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

