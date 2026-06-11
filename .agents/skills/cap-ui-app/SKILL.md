---
name: cap-ui-app
description: Creates, validates, and improves UI apps built on SAP CAP OData V4 backends. Covers SAP Fiori Elements, Freestyle SAPUI5, UI5 Web Components for React (WC4R), and FX Components for React. Use when building a UI on a CAP backend, validating an existing app, choosing a UI technology, or debugging blank screens and OData errors.
---

# Skill: Create or Validate a UI App on SAP CAP

## What this skill does

This skill guides you through:
1. **Validating** a CAP backend so it is safe to build on
2. **Choosing** a UI technology if you haven't decided yet
3. **Generating** a new UI app against a CAP OData V4 service
4. **Validating** an existing UI app (AI-generated or hand-written)
5. **Improving** a UI app with proposals and automation

## How to use this skill

Tell the agent:
- Your task (generate / validate CAP backend / validate UI / improve)
- Your UI technology (SAPUI5, Fiori Elements, UI5 Web Components for React, FX Components, or "not sure")
- Your CAP project root path

The agent will load only the modules relevant to your task and technology.

---

## MCP server availability

This skill is designed to work **with or without** the SAP MCP servers. Use this table to know what to substitute when a tool is not available:

| MCP tool | Purpose | If not available |
|---|---|---|
| `ui5_get_guidelines` | Load UI5 coding guidelines before any SAPUI5/FE generation - **must be called first** | The rules in `sapui5.md` and `fiori-elements.md` encode the same constraints; no substitution needed, but don't skip reading them |
| `ui5_create_ui5_app` | Scaffold SAPUI5/FE app with TypeScript | Manually create the folder structure and files per the patterns in `sapui5.md §2`-`§4`; use `npm create vite` for React targets |
| `ui5_run_ui5_linter` | Check for deprecated APIs and UI5-specific issues | Run `npx @ui5/linter` from the app directory |
| `ui5_run_manifest_validation` | Validate `manifest.json` structure | Run `npx @sap/ux-ui5-tooling manifest-validator` or manually check against `sapui5.md S3` |
| `ui5_get_api_reference` | Look up specific UI5 module/symbol API | Consult `https://sdk.openui5.org/api/` or `https://ui5.sap.com/sdk` |
| `cds_search_model` | Get exact service paths and entity names from the CDS model | Run `cds compile '*' --to serviceinfo` from the CAP project root |
| `cds_search_docs` | Search CAP documentation for API behavior | Consult `https://cap.cloud.sap/docs/` |
| `fiori_list_functionality` | **Step 1 of 3** - list what Fiori tools can generate or modify for the current app | Use the annotation patterns in `fiori-elements.md` + `fiori_execute_functionality` fallback below |
| `fiori_get_functionality_details` | **Step 2 of 3** - get parameters for a Fiori tools operation | Same fallback |
| `fiori_execute_functionality` | **Step 3 of 3** - execute a Fiori tools operation (add annotation, add page, etc.) | Edit `manifest.json` and annotation `.cds` files manually following the patterns in `fiori-elements.md` |
| `fiori_search_docs` | Search Fiori/annotations documentation | Consult `https://sapui5.hana.ondemand.com/sdk/#/topic/` |
| Playwright MCP (`browser_navigate`, `browser_take_screenshot`, `browser_console_messages`, `browser_network_requests`, `browser_snapshot`, `browser_evaluate`, `browser_click`) | **Preferred** browser tool for all runtime verification - navigate app, screenshot, check console errors, inspect network requests | Use `curl -s -o /dev/null -w "%{http_code}" http://...` (macOS/Linux) or `Invoke-WebRequest` (Windows) for HTTP 200 checks; open browser manually for visual verification |
| Chrome DevTools MCP (`navigate_page`, `take_screenshot`, `list_console_messages`, `list_network_requests`, `evaluate_script`, `click`) | Fallback browser tool, and primary tool for sap.viz VizFrame chart interaction tests (D3 event listeners require real coordinate clicks not accessibility-tree clicks) | Same CLI fallback as Playwright row above |

**When all MCP tools are available (Fiori Elements / SAPUI5 workflow):**
1. Call `ui5_get_guidelines` first - always, before any generation or edit
2. Call `cds_search_model` to get exact service paths and entity names
3. Call `fiori_list_functionality` -> `fiori_get_functionality_details` -> `fiori_execute_functionality` for Fiori Elements operations
4. Call `ui5_create_ui5_app` for freestyle SAPUI5 scaffolding
5. Call `ui5_run_ui5_linter` and `ui5_run_manifest_validation` as gates after every change
6. Use **Playwright MCP** for runtime verification (preferred); Chrome DevTools MCP as fallback or for sap.viz chart interaction tests

**When MCP tools are not available:**
- All the same rules apply - substitute the CLI equivalents and manual file edits listed above
- The quality gates (`ui5_run_ui5_linter`, `ui5_run_manifest_validation`) become **CLI commands** rather than tool calls; they are not optional

---

## Two-tier file structure

This skill uses a **two-tier loading strategy** to keep context lean for common tasks:

**Tier 1 - always loaded for the relevant task and technology:**

| File | Purpose |
|---|---|
| `SKILL.md` | This file - tech selection, task routing, non-negotiables |
| `enterprise-ready.md` | **MUST be loaded BEFORE any scaffolding step.** Proactive design rules (ER-N) covering server-side data, text quality, layout, a11y, validation, navigation, observability. Per-artifact write-time checklists. Definition-of-done gates. Anti-substitution rules. |
| `cap-shared.md` | Core CAP/OData V4 rules (pre-flight, key predicates, draft, auth) |
| `react-cap-shared.md` | React+Vite+CAP patterns (WC4R and FX only) |
| `ux-standards.md` | UA, UXC, and accessibility text rules (referenced by ER-TEXT-2) |
| `validation.md` | Post-generation validation protocols - SV (static) and DV (dynamic/browser); implements the ER-N gates |
| `sapui5.md` | Freestyle SAPUI5 tech overlay |
| `fiori-elements.md` | Fiori Elements tech overlay |
| `wc4r.md` | WC4R component API overlay |
| `fx.md` | FX Components overlay |
| `joule-studio.md` | **[JS] / [JS-LOCAL] only.** Load when environment is Joule Studio or a local repo cloned from a JS project. Project structure contract, session startup sequence, Vite config requirements, DV constraints, GitHub sync workflow. Do NOT load for standard [LOCAL] development. |

**Tier 2 - load additionally for validation, debugging, or when Tier 1 does not contain the answer:**

| File | Load when |
|---|---|
| `cap-ref.md` | Advanced OData ($apply groupby, $batch atomicity, $compute, $search scope, singleton, @assert placement rules, handler messaging, cds.tx, auth row-level); debugging unexplained HTTP 4xx errors |
| `fe-ref.md` | Full FE annotation pattern reference (160+ findings); debugging silent annotation failures; validating an existing FE app against the complete known-limitations table |
| `sapui5-ref.md` | Sort table patterns, form layout edge cases, p13n, MessageBox/validation patterns, extended blank-page causes |
| `wc4r-ref.md` | Full component API (all controls, casting patterns, i18n, theme switching, recharts); debugging TypeScript errors on specific WC4R controls |
| `fx-ref.md` | Fiori floorplan implementations without native FX components (List Report filter, Object Page anchor bar, OVP, ALP, Wizard, FCL); utility hooks (undo, polling, localStorage); UX principles specific to FX apps |
| `print.md` | **Load when generating any Report / printable page.** Canonical `@media print` template (ER-LAYOUT-3). Required for P-02-5 mandatory print preview to pass. |
| `faceted-review.md` | Running a faceted review (control-based, data-based, pattern-based, accessibility-based); deep quality audit after Clicky suite passes |
| `testing-protocol.md` | Creating or running task-based Clicky test suites; generating human test sheets; processing human test results |

**Agent rule for Tier 2 loading:**
- For **generate** tasks: load Tier 1 only unless the task explicitly mentions a pattern not covered there.
- For **validate** or **improve** tasks: load the appropriate Tier 2 file(s) alongside Tier 1.
- For **debugging a specific error**: load `cap-ref.md` first (covers most silent failures), then the tech-specific Tier 2 file if needed.
- Never load all files at once - load the minimum set that answers the question.

---

## Step 0 - Identify the technology

If the technology is already known, skip to Step 0.5.

### Technology comparison table

| Dimension | SAP Fiori Elements | Freestyle SAPUI5 | UI5 Web Components for React (WC4R) | FX Components for React |
|---|---|---|---|---|
| **Setup effort** | Low - manifest + annotations | Medium - scaffold + XML views | Medium - Vite + package install | Medium - Vite + 3 CSS files |
| **Runtime** | Browser (no Node build step) | Browser (no Node build step) | Browser (Vite build required) | Browser (Vite build required) |
| **CAP integration style** | Annotation-driven; draft lifecycle automatic | OData V4 model binding in XML | Manual `fetch()` + Vite proxy | Manual `fetch()` + Vite proxy |
| **Design fidelity** | SAP Fiori Horizon (automatic) | SAP Fiori Horizon (via theme) | SAP Fiori Horizon (via @ui5/wc) | SAP Sapphire 2026 (newer) |
| **Edit/draft support** | Built-in (zero code) | Manual controller code | Manual fetch code | Manual fetch code |
| **Flexibility** | Low - standard floorplans only | High - any layout | High - any React pattern | High - any React pattern |
| **Team skill prerequisite** | CDS + OData annotations | SAPUI5 XML + TypeScript | React + TypeScript | React + TypeScript |
| **When CAP has auth** | Automatic via session | Automatic via session | Basic auth header in every fetch | Basic auth header in every fetch |
| **FLP / launchpad ready** | Yes (first-class) | Yes | Requires wrapper | Requires wrapper |
| **Recommended for** | Standard enterprise CRUD apps | Complex custom layouts | React teams, modern UI | React teams, cutting-edge design |

> **[JS]:** Joule Studio 2.0 targets WC4R as the primary and default UI technology.
> All JS UI app scaffolding defaults to WC4R. FE may work but is not formally supported.
> SAPUI5 and FX are unconfirmed in JS 2.0. Do not scaffold FE, SAPUI5, or FX for a [JS]
> project without explicit user confirmation that the technology is supported.

### Technology decision tree

Answer these questions in order; stop at the first match:

**Q1. Must the app run inside SAP Launchpad or BTP Workzone without a separate build pipeline?**
-> Yes -> **Fiori Elements** (if CRUD) or **Freestyle SAPUI5** (if custom)

**Q2. Does the team primarily write React / TypeScript and has no SAPUI5 XML experience?**
-> Yes -> Go to Q3

**Q3. Must the app match the SAP Horizon visual design exactly (for use alongside FE or SAPUI5 apps)?**
-> Yes -> **UI5 Web Components for React (WC4R)**
-> No / cutting-edge design acceptable -> **FX Components for React**

**Q4. Does the app need a standard SAP Fiori floorplan (List Report, Object Page, ALP, OVP) with minimal custom code?**
-> Yes -> **Fiori Elements**

**Q5. Default if none of the above apply:**
-> **Freestyle SAPUI5** (broadest enterprise adoption, tooling support, FLP-ready)

> **Agent rule:** Always show this table and tree when no technology is specified. Make a recommendation based on the user's answers, then ask for confirmation before generating anything.
> **[JS] exception:** For Joule Studio environments, default to WC4R without the decision tree. Do not ask the user to confirm - WC4R is the JS default.

---

## Step 0.5 - Identify the environment

Before any scaffolding or project-config change, determine which environment applies.

| Tag | Environment | Detection heuristics |
|---|---|---|
| `[LOCAL]` | Standard local dev (Windows, macOS, Linux) | Default; full filesystem access; agent starts/stops servers; Chrome DevTools MCP available |
| `[JS]` | Joule Studio cloud sandbox | User states "Joule Studio"; `asset.yaml` present at project root (hint only - not guaranteed); Linux VM context |
| `[JS-LOCAL]` | JS-compatible local repo | User says "cloned from Joule Studio" or "GitHub from JS"; project has `app/react-ui/vite.config.js` with `optimizeDeps.exclude` for `@ui5/*`; or `asset.yaml` at root |

**Ask if unclear:** "Is this project running in Joule Studio, a local dev environment, or a local clone of a Joule Studio project?"

Default to `[LOCAL]` if the answer is ambiguous. Note the assumption in the checkpoint.

**If [JS] or [JS-LOCAL]:** load `joule-studio.md` alongside the technology Tier 1 files.
**If [LOCAL]:** proceed as today. Do not load `joule-studio.md`.

> **Confidence note:** Joule Studio 2.0 is a new and actively developed environment.
> Rules tagged `[JS]` are grounded against the incidents-cap asset in JS 2.0 as of 2026-06-08.
> Behavior may change with JS updates. If JS behavior does not match what is documented here,
> treat the discrepancy as a grounding gap and note it for the evolution log.

---

## Step 1 - Validate the CAP backend (always do this first)

**Load: `cap-shared.md` -> section "Pre-flight checklist"**

Before writing any UI code:
1. Confirm `cds watch` starts without errors from the CAP project root
2. Confirm the target service appears in the CAP service list
3. Retrieve exact service URL paths and entity names: `cds compile '*' --to serviceinfo`
   - Never guess these values
4. Confirm auth mode: no `@requires` annotation -> anonymous; `@requires` present -> check mock users
5. Confirm whether the service uses `@odata.draft.enabled` - this changes every fetch pattern
6. Fetch `GET <serviceUrl>/<EntitySet>?$top=1` and confirm HTTP 200 with a `value` array
7. Confirm `cds deploy` has been run after the last schema change (column addition, view entity, new entity)

If any step fails, stop and fix the backend before writing UI code.

---

## Step 2 - Route to the correct modules

After technology is confirmed, load by task type:

**Generate task (Tier 1 only):**

> **Always include `enterprise-ready.md` in the load set, regardless of technology.** It is the proactive-rules layer; per-technology files (`fiori-elements.md`, `sapui5.md`, `wc4r.md`, `fx.md`) implement HOW; `enterprise-ready.md` mandates WHAT.

| Technology | Environment | Load these files |
|---|---|---|
| SAP Fiori Elements | `[LOCAL]` | `enterprise-ready.md` + `cap-shared.md` + `ux-standards.md` + `sapui5.md` + `fiori-elements.md` |
| Freestyle SAPUI5 | `[LOCAL]` | `enterprise-ready.md` + `cap-shared.md` + `ux-standards.md` + `sapui5.md` |
| WC4R | `[LOCAL]` | `enterprise-ready.md` + `cap-shared.md` + `react-cap-shared.md` + `ux-standards.md` + `wc4r.md` |
| FX Components | `[LOCAL]` | `enterprise-ready.md` + `cap-shared.md` + `react-cap-shared.md` + `ux-standards.md` + `fx.md` |
| WC4R | `[JS]` / `[JS-LOCAL]` | `enterprise-ready.md` + `cap-shared.md` + `react-cap-shared.md` + `ux-standards.md` + `wc4r.md` + `joule-studio.md` |
| FE / SAPUI5 / FX | `[JS]` | **Unconfirmed in JS 2.0.** Confirm with user before proceeding. If proceeding: add `joule-studio.md` to the relevant `[LOCAL]` load set above. |

**Validate or Improve task (Tier 1 + Tier 2):**

Always add `validation.md` to the load set for validate/improve tasks. Always include `enterprise-ready.md` - review checks the same rules that creation should have followed.

| Technology | Add to Tier 1 load |
|---|---|
| SAP Fiori Elements | `enterprise-ready.md` + `validation.md` + `cap-ref.md` + `fe-ref.md` |
| Freestyle SAPUI5 | `enterprise-ready.md` + `validation.md` + `cap-ref.md` + `sapui5-ref.md` |
| WC4R | `enterprise-ready.md` + `validation.md` + `cap-ref.md` + `wc4r-ref.md` |
| FX Components | `enterprise-ready.md` + `validation.md` + `cap-ref.md` + `fx-ref.md` |

Additionally load `print.md` if the app has a Report page or any "Print" button.

**Validate CAP backend only:** `cap-shared.md` + `cap-ref.md`

---

## Step 3 - Execute the task

### Task: Generate a new UI app

1. Complete Step 1 (CAP validation)
2. Load modules per Step 2
 - **MANDATORY:** load `enterprise-ready.md` first. Review the ER-N rules and per-artifact write-time checklists BEFORE scaffolding. Do not write a single line of code without consulting the relevant checklist.
3. Scaffold the app using the appropriate tool:
 - FE / SAPUI5: `ui5_create_ui5_app` -> immediately apply the tech overlay's "post-generation fixes"
 - WC4R / FX: `npm create vite@latest . -- --template react-ts` -> apply bootstrap rules from `react-cap-shared.md`
3a. **MANDATORY console-error gate (ER-OBSERVE-1, S-PROP-34):** after the scaffold serves at HTTP 200, navigate to it in Chrome DevTools MCP, run `list_console_messages(types=["error","warn"])`. Zero `error` AND zero `[FUTURE FATAL]`-prefixed warns. Do NOT proceed if either is non-zero -- root-cause and fix first. Document any allow-listed warnings (LREP, Component-preload) in the checkpoint.
3b. For every Overview, analytics, stats, or report page planned:
 - Fetch `GET <entitySet>?$count=true&$top=0` to get the total record count
 - If count > 500: server-side `$apply` is MANDATORY for all KPI/chart values; client-side aggregation is PROHIBITED (ER-DATA-2)
 - Design the OData `$apply` queries for each KPI and chart BEFORE writing any component code
 - For list pages: always use server-side `$filter` + `$top`/`$skip` paging regardless of dataset size (ER-DATA-1, ER-DATA-3)
 - For high-cardinality filter inputs (>25 distinct values): use ValueHelp dialog, not Select (ER-DATA-4)
 - For Report / Print pages: include the print CSS block from `print.md` AT SCAFFOLD TIME (ER-LAYOUT-3, S-PROP-14). Do NOT add it later.
4. Set the OData data source URI to the root-relative service path (e.g., `/browse/` not `http://localhost:4004/browse`)
5. Run **SV-0 pre-delivery static grep gate** from `validation.md` - zero matches required before any browser opens. This includes the new ER-N gates (see `enterprise-ready.md` "Definition-of-done gates" table).
6. Run linter / `tsc --noEmit` / manifest validation - must pass before proceeding
7. **Re-run console-error gate after every non-trivial change** (ER-OBSERVE-1). The console gate is not a one-time check; treat any new warning as a regression.
8. Present the validation menu from `validation.md §Offering the validations` and wait for the user's selection before running any check
9. Apply L1 Quick Gate from `ux-standards.md`

### Task: Validate an existing UI app

**MANDATORY FIRST STEP: present the validation menu from `validation.md §Offering the validations` and wait for the user's selection before running any check.** A request to "validate the app" does not grant permission to run all checks. The user may not know what the options are. Do not proceed past the menu until an explicit choice (A, B, C, or D) is received.

Once the user has selected:

1. Load Tier 1 + Tier 2 modules per Step 2 (also load `validation.md` and `enterprise-ready.md`)
2. If user selected A or C: run all SV checks from `validation.md`, present SV report, then (if C) ask before starting DV
3. If user selected B or C (DV): **MANDATORY console-error gate (ER-OBSERVE-1):** navigate to each page of the app, run `list_console_messages(types=["error","warn"])`. Record any non-zero result as a HIGH-severity defect, regardless of whether the visible UI looks correct. Many silent data-loss bugs emit a `[FUTURE FATAL]` warning while the visible UI looks fine.
4. Run static analysis gates (linter + `tsc --noEmit` + manifest validation) as part of the SV phase
5. Check OData binding paths against `$metadata` (names are case-sensitive)
6. Apply the tech overlay's validation checklist
7. Apply the full limitations table from the Tier 2 ref file (all known silent failures)
8. Apply L1 Quick Gate from `ux-standards.md`
9. If Chrome DevTools MCP is available and user selected B or C: run DV checks from `validation.md`
10. Report findings grouped by: crash risk -> silent data failure -> UX violation -> UA/accessibility -> minor

**Note on ER codes:** The ER-N rules in `enterprise-ready.md` are the quality standard that the checks above are measuring against  -  they are not a separate validation activity. When a finding is labelled `ER-DATA-1` or `ER-LAYOUT-3`, that is the name of the rule being violated, not a reference to an additional check to run. The ER gates (grep commands, runtime assertions) are already embedded inside SV-0, the linter, the faceted review checklists, and the DV checks. Do not present "ER audit" as a distinct step to the user.

### Task: Validate a CAP backend only

Load `cap-shared.md` + `cap-ref.md`. Follow Step 1 in detail. Report whether each check passed or failed.

### Task: Improve an existing app

1. Run the validation task first to collect all findings
2. Group findings by severity (above)
3. For each finding: state the rule, the evidence in the code, and the exact fix
4. Ask the user which improvements to automate
5. Apply fixes in priority order
6. Re-run static analysis to confirm zero regressions

### Task: Review implementation against original intent prompt

**Trigger:** User provides their original intent prompt (the text they typed into Joule Studio or described verbally), or says "check what was missed from my requirements", or voices a specific concern about a missing feature.

**When to use this task vs SV-10:**
- SV-10 (in `validation.md`) checks artefact-to-artefact consistency without needing the original prompt. Run it first.
- This task adds the layer that SV-10 cannot cover: requirements that were dropped at the very first translation step (original prompt → intent.md) and therefore do not appear in any project document.
- In JS projects, Joule generates all artefacts autonomously from the user's prompt. This task is the primary mechanism to verify that Joule's interpretation matched the user's intent.

**Steps:**

1. Ask the user to provide (or paste) their original intent prompt if not already given.

2. Parse the prompt into atomic requirements. For each sentence or clause, extract:
   - Every entity and its named properties
   - Every operation or behaviour (verbs: manage, create, send, enforce, calculate, print)
   - Every constraint (a number limit, a business rule, a formula)
   - Number each: OI-01, OI-02, ...

3. For each OI item, trace through the artefact chain in order:
   `intent.md -> PRD -> specification -> schema.cds -> srv/*.js -> UI source`
   Record the **first layer** at which the item is absent or changed:
   - **DROPPED**: present in prompt, absent from the first document
   - **WEAKENED**: scope reduced (e.g. "manage" → "display only")
   - **CHANGED**: interpretation altered — flag for user to confirm whether correct
   - **NOT-ENFORCED**: data model exists but business rule not applied at runtime
   - **PASS**: preserved correctly at all layers

4. Present findings to the user grouped by classification. For each non-PASS item:
   - DROPPED/WEAKENED: "This was in your original request but was not implemented. Should it be added?"
   - CHANGED: "This was interpreted as [X]. Did you mean [Y] or is [X] correct?"
   - NOT-ENFORCED: "The data is stored but the rule is not checked. Should it be enforced?"

5. For items the user confirms as gaps: raise defects, add to the backlog or Clicky suite.
   For items the user confirms as intentional simplifications: add a note to `specification.md` so the decision is documented for future sessions.

6. Write the original intent prompt verbatim to `specification/original-intent.md` if not already present. This preserves it across sessions and enables future runs of this task without re-pasting.

**Note:** This task requires a user conversation — it cannot be run fully autonomously. If the user does not have the original prompt, run SV-10 instead, which covers all prompt-independent gaps.



Creates the `testing/` folder and foundational documents in the project root.

1. Ask the user: "What is this app for? Who are the intended users? What are the primary use cases?"
2. Create `testing/intent.md` using the format in `testing-protocol.md`
3. Create `testing/test-plan.md` (initially empty sections, to be filled before first test run)
4. Create `testing/defects.md` (empty register)
5. Create `testing/improvements.md` (empty register — populated by "Generate improvement catalogue" task)
6. Confirm: "Testing folder initialized. Run 'Generate task suite' next to create Clicky.md."

### Task: Generate improvement catalogue

Produces a structured list of what the skill's proactive rules say should be present but is not. Presented separately from defects after validation completes. No browser required.

**Distinction from defect reporting:**
- **Defects** (`testing/defects.md`): something is broken — wrong HTTP response, wrong data, crash
- **Standard violations — Section B** (`testing/improvements.md`): something works but violates a specific ER-N rule in `enterprise-ready.md`. The skill would have generated this correctly if enterprise-ready.md had been loaded before scaffolding.
- **Enhancements — Section C** (`testing/improvements.md`): something is absent that the write-time checklists say should be present. Not a bug — a gap between what was generated and what the proactive rules define as the target.

**Trigger:** Automatically offered at the end of full validation (step 8). Also available as a standalone task when the user asks "what could be improved?" or "what did the generation miss?"

**Steps:**

1. Load `enterprise-ready.md`. Extract every ER-N rule with its REQUIRED / FORBIDDEN designation.

2. **Section B scan (standard violations):**
   For each REQUIRED pattern: grep app source or run browser_evaluate. Record PRESENT / ABSENT / PARTIAL.
   For each FORBIDDEN pattern: check it is absent. Record ABSENT (correct) / PRESENT (violation).
   Every ABSENT-on-REQUIRED is a Section B violation. Cite the ER-N code.
   Common high-value checks:
   - ER-DATA-1: every list filter round-trips to OData `$filter` (not client-side Array.filter)
   - ER-DATA-3: lists with > 25 rows use `$top`/`$skip` pagination
   - ER-DATA-5: chart/KPI clicks navigate to filtered list with filter visible in control
   - ER-UX-1: status/urgency columns use SAP CSS variable tokens for colour, not unstyled text
   - ER-UX-2: FK fields with >= 2 user-relevant properties render as interactive Popover
   - ER-TEXT-3: dates shown with locale-aware formatter, not raw ISO string

3. **Section C scan (enhancements from write-time checklists):**
   Read the per-artifact write-time checklists at the end of `enterprise-ready.md`.
   For each expected page element (overview/analytics page, detail view for primary entity,
   cross-navigation onClick on every chart/KPI, FK suggestion input in Create forms,
   server-side pagination, print-safe report view): check whether the app has it.
   Every absent element that the checklist says MUST be present is a Section C item.

4. Produce output in two sections. Do NOT include defects (those are already in defects.md).

5. Present: "N standard violations and M enhancement opportunities found. Which to implement?"

6. For approved items: apply fixes, re-run relevant SV checks to verify.
   For deferred items: write to `testing/improvements.md`.

**Note on JS/JS-LOCAL:** Fully static — no browser required. Can be run when DV is blocked.


### Task: Generate task suite (Clicky.md)

Generates the usability test suite. Requires `testing/intent.md` to exist.

1. For each use case in intent.md: extract the user role and goals
2. For each use case, generate tasks covering ALL required tiers (see `testing-protocol.md §4`):
 - Tier 1: at least 6 tasks (KPI/overview reads - run every iteration as fast sanity checks)
 - Tier 2: at least 6 tasks (filtered list navigation)
 - Tier 3: at least 4 tasks (detail drill-down from list)
 - Tier 4: at least 4 tasks (single CRUD or status transition)
 - Chain (Tier 5): at least 4 tasks - **non-optional** -- see below
 - Negative: at least 4 tasks (error/blocked paths)
3. For each **Chain task**: design a multi-page sequence that exercises inter-page state management. Every app must have at minimum: Overview chart-click -> filtered list -> detail -> edit/action -> list (verify updated). Chain tasks catch defects that individual point-tasks cannot: stale list after edit, lost filter state on Back, failed cross-navigation pre-population.
4. For each task: verify the correct answer by fetching the OData endpoint directly
5. Save to `testing/Clicky.md` using the format in `testing-protocol.md §4`
6. Confirm: "Task suite generated: N tasks (Tier1:N Tier2:N Tier3:N Tier4:N Chain:N Negative:N). Run 'Run iterative testing loop' to execute."

### Task: Run iterative testing loop

Executes the full iterative test-fix-retest cycle until convergence or timeout. Requires a running app and Chrome DevTools MCP. **This replaces the previous "Run agent usability tests" task for comprehensive validation.**

Load `testing-protocol.md` and `validation.md`. Then follow the loop defined in `testing-protocol.md §10`:

**Before the first iteration:**
1. Run `testing-protocol.md §9` authentication pre-flight
 - Identify auth mode from `package.json` `cds.requires.auth`
 - For mocked auth: Base64-encode the admin user credentials (e.g. `alice:alice` -> `YWxpY2U6YWxpY2U=`)
 - Configure the Vite proxy (`configure: proxyReq.setHeader('Authorization', ...)`) OR add `httpHeaders` to the SAPUI5 OData model manifest entry
 - `navigate_page(url=<app>)` -> `take_snapshot()` -> assert NO login form is visible
 - `list_network_requests()` -> assert Authorization header present in OData requests
 - **Do not proceed to any task until this check passes**

**Each iteration:**
1. Run ALL tasks in Clicky.md - full suite every time, including Chains
2. Record PASS / FAIL per task; raise defects to `testing/defects.md`
3. Check stopping criterion: if zero newly-introduced defects and all PASS -> convergence
4. If not converged: group defects by root cause (not symptom), fix all, run SV-0 grep gate, checkpoint
5. Write iteration report to `testing/DT-usability-agent.md`

**After convergence or timeout:**
1. Run the Faceted Review (`faceted-review.md`, Facets 1-8 in the recommended sequence)
2. Update `testing/defects.md` with any new findings from the faceted review
3. Write final summary: "N iterations to convergence. N total defects found, N fixed, N accepted. Faceted review: N items, N defects."

### Task: Run agent usability tests (single pass - for quick checks only)

For a quick single-pass check (not a convergence run). Use the full iterative loop for comprehensive validation.

1. Run `testing-protocol.md §9` authentication pre-flight -- mandatory; do not skip
2. Load `testing-protocol.md` and `validation.md` (DT-U-A sections)
3. For each task: reset to start page, execute as simulated user, record PASS/FAIL/FAIL-type
4. After all tasks: present defect list, ask user which to fix
5. Fix selected defects, rerun only linked tasks
6. Update `testing/Clicky.md` execution log and `testing/defects.md`
7. Report: "N/N tasks pass (NN%). N defects raised, N fixed."

### Task: Run faceted review

A systematic non-task-based quality review examining every control, data element, multi-element pattern, accessibility attribute, navigation path, text string, and control-logic state. Run **after convergence of the iterative testing loop** (app is assumed functionally correct) and **before final sign-off**.

Load `faceted-review.md`. Run authentication pre-flight first (`testing-protocol.md §9`). Work through each facet in the recommended sequence (see `faceted-review.md §Running the Faceted Review`):

1. **Facet 6 - Navigation (15 min):** Router completeness; direct-URL vs button-click equivalence; back/history fallback
2. **Facet 2 - Data (20-30 min):** Fetch `$metadata`; verify labels, formats, nulls, aggregation methods
3. **Facet 7 - Texts (15 min):** i18n cross-check; UA guidelines; consistency across pages
4. **Facet 1 - Control (20 min):** Enumerate every control; apply per-type checklist with concrete evaluate_script asserts
5. **Facet 8 - Control Logic (20 min):** Drive app into each UI state; assert every button/input state is correct
6. **Facet 3 - Pattern (20-30 min):** Full pattern contracts including MANDATORY print preview screenshot for P-02
7. **Facet 4 - Accessibility (15 min):** Labels, ARIA, colour-only distinctions
8. **Facet 5 - Integration (10 min):** Cross-facet composition checks

**Every check must produce a concrete tool-call result.** A check recorded as PASS without a tool-call result or code-inspection evidence is invalid. The most common error is marking print-preview checks as PASS from code inspection alone -- a print preview screenshot is required evidence for P-02-5.

Record PASS / FAIL / N-A for each item. Raise defects to `testing/defects.md`. Report: "Faceted review: N items checked, N defects found."

### Task: Generate human task sheet / Process human test results

**This is activity 8 — always the last activity.** Human time is the most expensive resource in the validation cycle. The task sheet should only be generated after all automated checks (1-7) are complete and the app is in the best possible state.

**Generate task sheet — sizing questions (ask before generating):**

Ask the user three questions before generating. If running as part of "do 1-8" or the "Complete validation" shortcut, ask them at the point of reaching activity 8. Default answers are shown.

**1. Scope:**
- **Quick** (5-10 tasks): one task per key entity, most critical user paths. ~15-20 minutes.
- **Standard** (20-30 tasks, default): all Tier 1 KPI reads, key Tier 2 filters, one Tier 3 detail per entity, primary Tier 4 status transitions. ~45-60 minutes.
- **Comprehensive** (all Clicky.md tasks): all tiers including Chains and Negatives. ~90-120 minutes.

**2. Tiers to include:**
- **KPI + actions only** (Tier 1 + Tier 4): fast check of counts and write operations
- **All read tiers** (Tier 1 + 2 + 3): verifies data is navigable, no write operations required
- **All tiers** (default): reads, writes, chains, negatives

**3. Answer visibility:**
- **Blind** (questions only, default): tester does not see the correct answer. Most realistic — detects what is genuinely hard to find.
- **Guided** (questions + directional hints): tester knows the area to look in but not the exact value. Faster, less realistic.

Default if the user does not answer: Standard / all tiers / blind.

**Generate steps:**
1. Apply sizing choices: filter `testing/Clicky.md` tasks by scope and tiers.
2. For each selected task: output the question in plain language. If blind, omit correct answer. If guided, include the view/section but not the exact value.
3. Format as a printable sheet with answer/ease fields per task.
4. Present: "Here is the task sheet. Please try each task in the running app and report back your answers and ease ratings."

**Process results:**
1. User reports answers and ease ratings
2. Compare each answer against the correct answer in Clicky.md
3. Record in `testing/DT-usability-human.md`
4. Raise defects to `testing/defects.md` for wrong or hard-to-find answers
5. Report: "Human testing: N/N correct. N difficulty issues found."



## Runtime Verification

**Authentication pre-flight is mandatory before any browser-based check.** Before the first `navigate_page()` call in any session, run `testing-protocol.md §9`. The most common cause of FAIL-BLOCKED across all tasks is a login dialog appearing mid-test because this step was skipped. The pre-flight takes 2 minutes and prevents hours of wasted test runs.

The full browser-based verification protocol is in `validation.md` DV-1 through DV-7. Load that file and offer the DV checks after every generation or significant change.

**With Playwright MCP (preferred):** run DV-1 (load), DV-2 (console errors), DV-4 (network), DV-5 (data visibility), DV-7 (interaction) as a minimum. Add DV-6 (task queries) when verifying data correctness. **Also run DV-7b** (all-pages sweep) - navigate every page of the app, not just overview/list. Report pages require an explicit print-preview check (open `Ctrl+Shift+P` and verify all rows visible - not just scroll-to-bottom).

**With Chrome DevTools MCP (fallback):** same checks using `navigate_page`, `take_screenshot`, `list_console_messages`, `list_network_requests`. Required (not optional) for sap.viz VizFrame chart interaction tests.

**Without Chrome DevTools MCP:** present the user with this checklist and ask them to report back:

> 1. Open the app - SAPUI5/FE: `http://localhost:4004/<app-namespace>/index.html` | React: `http://localhost:<VITE-PORT>`
> 2. Is the page blank (white) or does it show content?
> 3. Does the main table/list show rows, or is it empty?
> 4. DevTools (F12) -> Network tab: what HTTP status does the OData request return?
> 5. DevTools -> Console tab: any red errors or `[FUTURE FATAL]` warnings?
> 6. Click a table row - does the detail view open and show data?
>
> Share: (a) blank or content, (b) any red errors, (c) OData HTTP status, (d) detail view opens.

**Interpreting user-reported findings:**

| User reports | Likely cause | Fix |
|---|---|---|
| Blank white page, no console errors | Routing target root is not `sap.m.IPage` (SAPUI5), or React error #310 (FX/WC4R) | `sapui5.md §12`, `fx-ref.md §C.` |
| Blank white page, red console error | JavaScript crash - ask for exact error text | See console error triage table below |
| Table empty, OData returns 200 | Binding path case mismatch, `IsActiveEntity` filter missing | `cap-shared.md §5.1`, `sapui5.md §5.1` |
| Table empty, OData returns 401 | Service requires auth not configured | `cap-shared.md §10`, `fiori-elements.md §8.6` |
| Table empty, OData returns 400 | URL encoding trap or wrong service path | `cap-shared.md §3.4`, `cap-shared.md §2` |
| Table empty, OData returns 404 | Wrong service path in manifest or proxy | `cap-shared.md §2`, `react-cap-shared.md §1.4` |
| Table empty, OData returns 500 | CAP server error | `cap-shared.md §4.2` |
| `[FUTURE FATAL]` warnings | Deprecated API | Run `ui5_run_ui5_linter` / `npx @ui5/linter` |
| Detail view blank or wrong data | Binding context on Form not Panel (SAPUI5), or stale cache | `sapui5.md §8.2` |
| Detail view dates blank | Explicit `type:` in OData V4 date binding | `sapui5.md §5.2` |

**Console error quick triage:**

| Console message | Likely cause | Fix |
|---|---|---|
| `Minified React error #310` | Hook after early `return` | `fx-ref.md §C.` |
| `No loader registered for SAP-icons` | Icon import missing | `wc4r.md §1.2` |
| `404` on `.js` or `.css` resource | Library in `manifest.json` not in `ui5.yaml` | `sapui5.md §11 Step 4` |
| `404` on a specific `.js` file inside a library that IS in `ui5.yaml` | npm package for that library is behind `framework.version` (version gap); run `npm list @openui5/<lib>` and compare to `framework.version`; pin version or replace library | `sapui5.md §11 Step 4` |
| `sap.viz` MIME type error | CDN-served `sap.viz` mixed with locally-served app - configuration mismatch, not a library incompatibility | `sapui5.md §11 Step 4` |
| `Class constructor X cannot be invoked without 'new'` | Node.js 24 + ui5-tooling-transpile | `sapui5.md §1.4` |
| `SideEffectsServiceFactory` error | Action-level `@Common.SideEffects` | Remove immediately - fatal crash |
| `PropertyHelper` error | Duplicate key in `@UI.LineItem` | `fe-ref.md §B` |
| `[FUTURE FATAL]` | Deprecated API | Run `ui5_run_ui5_linter` |
| `i18next: useTranslation` error | `initFxI18n()` not called before `createRoot` | `fx.md §1` |
| OData `401`/`403` | Auth not configured | `cap-shared.md §10` |
| OData `400` | URLSearchParams encoding trap | `cap-shared.md §3.4` |
| OData `501` | `$filter`/`$orderby` on virtual field | `cap-ref.md §J` |
| `Failed to process navigation context` | Intent-based navigation without FLP | `fe-ref.md §A.4` |
| `[FUTURE FATAL] Custom query option expand not supported` | Bare `expand:` used instead of `$expand:` in `bindElement` parameters | `sapui5.md §8.2` |
| `Key "IsActiveEntity" is missing` | `bindElement` on draft entity without `IsActiveEntity` in key predicate | `sapui5.md §8.2` |
| `FormatException: X is not a valid boolean` | OData V4 type coercion before formatter; add `targetType: 'any'` | `sapui5.md §8.2` |
| `storeInnerAppStateAsync is not a function` | FE 1.136.7 regression bug - harmless, variant state not saved | `fiori-elements.md §4` |
| `PropertyInfo validation is disabled` | `@Core.Computed` scalar or navigation path in `@UI.LineItem` | `fiori-elements.md §4` |
| `Type 'sap.ui.model.odata.type.Raw' does not support formatting` | `@Core.Computed` / virtual field bound to typed control; add explicit `type: 'sap.ui.model.odata.type.Int32'` | `sapui5.md §5` |
| `No loader registered for SAP-icons-v5` | WC4R icon used in JSX `icon=` without matching `import` in `main.tsx` | `wc4r.md §1.2` |
| `Unexpected token '?'` in XML binding | `??` operator in expression binding | `sapui5-ref.md §F` |

---

## Server Management

The agent manages all server processes autonomously. The user is never asked to start, stop, or restart a server.

> **[JS]:** The agent does NOT start or stop servers in Joule Studio. The JS preview runner
> manages `cds watch` internally. Do not issue `cds watch` commands or background-process
> start patterns in `[JS]` environments. All server lifecycle is outside agent control in JS.
> There is also no confirmed working URL path to access the running app from the agent side -
> candidate URLs return "Invalid Workspace" errors. See `joule-studio.md §7`.

### Starting servers

Always use the silent/hidden window pattern documented in `react-cap-shared.md §1.3`:
- Windows: `Start-Process cmd.exe -ArgumentList "/c npm run ..." -WindowStyle Hidden`
- macOS/Linux: `npm run ... &`

Never open a visible console window for a server. It steals focus and may disconnect browser MCP tools.

> **[JS] exception:** Do not use these patterns in `[JS]`. The JS preview runner starts
> `cds watch`. These patterns apply to `[LOCAL]` and `[JS-LOCAL]` only.

### Health verification

After starting any server, verify it is responding:

```
# CAP server
Invoke-WebRequest -Uri "http://localhost:<PORT>/$metadata" -UseBasicParsing | Select-Object StatusCode  # Windows
curl -s -o /dev/null -w "%{http_code}" "http://localhost:<PORT>/$metadata"                             # macOS/Linux

# Vite dev server
Invoke-WebRequest -Uri "http://localhost:<VITE-PORT>" -UseBasicParsing | Select-Object StatusCode  # Windows
curl -s -o /dev/null -w "%{http_code}" http://localhost:<VITE-PORT>                               # macOS/Linux
```

HTTP 200 = server is up. Retry after 10 seconds if the first check fails.

### Crash recovery

If a previously working OData request returns a connection error:
1. Re-run the health check
2. If the server is down: restart it with the same silent pattern
3. If the restarted server binds to a different port: update proxy config and fetch URLs; note in checkpoint

### Port assignment

Always specify the Vite port explicitly: `npm run dev -- --port 5100`
Never allow auto-assignment - the port may change on restart and break proxy configuration.

---

## Non-negotiables (apply to all technologies, all tasks)

These rules are so frequently violated that they are listed here, not just in the tech files:

- **Read the relevant skill file IN FULL before attempting any fix for a known problem (S-PROP-46).** Multiple wasted iterations result from ignoring skill files that already contain the verified solution. Specifically:
  - Print/CSS issues -> read `print.md` IN FULL before touching any CSS
  - CAP service patterns -> read `cap-ref.md` before touching any `.cds` files
  - SAPUI5 table/chart/navigation issues -> read `sapui5.md` before touching any view or controller
  DO NOT attempt to diagnose a problem by trial-and-error if a skill file exists that covers it. The skill files contain verified solutions. Using them is not optional.

- **Load `enterprise-ready.md` BEFORE scaffolding.** It contains the proactive design rules (ER-N) and per-artifact write-time checklists. Reading the rules before writing code is cheaper than retrofitting after review. (S-PROP-35, S-PROP-36)
- **Console-error gate after every generation step and every change** (ER-OBSERVE-1, S-PROP-34). `list_console_messages(types=["error","warn"])` MUST return zero `error` AND zero `[FUTURE FATAL]`-prefixed warns before declaring any iteration complete. The single most impactful gate - catches silent data-loss regressions like the FE 1.136 PropertyInfo trap that emit a console warning while the visible UI looks fine.
- **Print pages use the canonical CSS template** (ER-LAYOUT-3, S-PROP-14). Every Report or printable page MUST include the `@media print` block from `print.md` at scaffold time, AND avoid `sticky="ColumnHeaders"`, AND define explicit column widths, AND fetch ALL records via paginated loop. Single biggest miss in TrialIOpus -- 4/4 apps failed P-02-5 the same way.
- **Server-side data operations are non-negotiable** (ER-DATA-1, ER-DATA-2, ER-DATA-3, ER-DATA-5). Client-side `Array.filter` / `reduce` / `sort` for primary list/aggregate/sort operations is FORBIDDEN. Use `$filter`, `$apply`, `$orderby`, `$top`/`$skip`. Cross-links must transfer full filter context (URL + visible token + auto-fetch).
- **Anti-substitution rules** (S-PROP-33). HTTP 200 alone is NOT a PASS; URL change alone is NOT a PASS; `aria-selected="true"` alone is NOT a PASS; one-moment console snapshot is NOT a PASS. See `enterprise-ready.md` "Anti-substitution rules" for full list. Each PASS in the facet/test log must cite which non-substituted check it ran.
- **Never guess service paths or entity names** - always use `cds compile` or `$metadata` inspection
- **`cds watch` is always run from the CAP project root** - never from inside an app subfolder
- **UI apps go inside the CAP project's `app/` directory** (SAPUI5/FE) or as a sibling Vite project with a proxy
- **`IsActiveEntity eq true` must be in every list query** for draft-enabled entities - omitting it returns both active records and in-flight drafts
- **`$filter=IsActiveEntity eq true` is forbidden inside `$expand`** - CAP returns "Virtual elements are not allowed in expressions"
- **`URLSearchParams` must never be used for OData `$` parameter key names** (`$filter`, `$orderby`, etc.) - it encodes `$` as `%24`, causing HTTP 400. **Equally, never hard-code `%24` in URL template literals** -- writing `` `?%24count=true&%24filter=...` `` produces the same broken result. CAP silently ignores `%24filter` and returns unfiltered data. See `cap-shared.md §3.4`.
- **`URLSearchParams.toString()` must always be followed by `.replaceAll('+', '%20')`** - CAP requires RFC 3986 percent-encoding, not `application/x-www-form-urlencoded`
- **Always check `r.ok` before parsing the response** - CAP error bodies parse silently as data without this check, producing empty lists with no visible error
- **`cds deploy` must be re-run after any schema change** - compile success does not create DB tables or columns
- **Checkpoint before any long operation.** Write `.agent-checkpoint.md` to the CAP project root before any operation taking longer than 2 minutes, before each new app in a multi-app run, and before/after any server start or stop. See `checkpoint.md` for the format.
- **On any MCP resource failure:** write a checkpoint first, then evaluate alternatives (switch to Firefox MCP, use CLI fallback, skip with note in report). Ask user before skipping if not in autonomous mode. See `checkpoint.md` for the full decision tree.
- **In autonomous mode:** apply the best available workaround without asking; record it in the checkpoint and final report.
- **Server management:** always start background servers using the silent/hidden pattern in `react-cap-shared.md §1.3`. Never ask the user to restart a server - handle crashes automatically. Always verify server health after start (`GET /$metadata` for CAP, `GET /` for Vite).
- **[JS] Server management:** the agent does NOT start or stop servers in Joule Studio. The JS preview runner owns `cds watch`. Do not attempt `navigate_page()` or URL-based health checks in `[JS]` - there is no confirmed working URL path to the app from outside the sandbox. Candidate URLs return "Invalid Workspace" errors. All DV deferred to `[JS-LOCAL]` or manual user review.
- **ASCII only in all generated documentation:** no em dashes, no curly quotes, no Unicode arrows. Use ` - ` for em dash, `->` for arrows, straight `"` for quotes.
- **Fiori Design Guidelines conformance:** when validating an app, optionally load the SAP Fiori guidelines skill (if available) and check each page type for guideline deviations. Report as: GUIDELINE DEVIATION: [page] - [description] - [reference]. Automated checking is limited to structural/labeling aspects; visual spacing, animation, and responsive behavior require human review at fiori.design.
- **FE Object Page i18n overrides (`enhanceI18n`)** [verified-TrialJ-2026-05-27]: When overriding FE framework strings via `enhanceI18n`, use **static text only** - never `{0}` placeholders. `sap.fe.core.ResourceModel.getProperty()` returns raw strings without substitution; `{0}` is rendered literally. Since `T_NEW_OBJECT` is a single key per file but must differ per entity, create separate i18n files and reference them individually: `"BooksObjectPage": { "settings": { "enhanceI18n": "i18n/i18n-books.properties" } }`. The framework keys are `T_NEW_OBJECT` and `T_ANNOTATION_HELPER_DEFAULT_HEADER_TITLE_NO_HEADER_INFO`.
- **FX apps: verify CSS custom property names before use `[verified-TrialJ-2026-05-28]`:** The `--fx-color-*` token family (including `--fx-color-neutral-4`, `--fx-color-primary`, `--fx-color-positive`, `--fx-color-negative`, `--fx-color-critical`) does NOT exist in `@sap-ui/fx-components 1.0.8`. References to these tokens produce silent invisible output (empty border, no colour) with no console error. Use `var(--border)` for borders, `var(--primary)` for brand blue, `var(--positive)` / `var(--negative)` / `var(--warning)` for status colours. See `fx.md §9.1` for the complete correct token table.
- **Draft CREATE on draft-enabled entities requires POST + draftActivate `[verified-TrialJ-2026-05-28]`:** A `POST /service/Entity` on a `@odata.draft.enabled` entity creates `IsActiveEntity=false`. The entity is invisible to all list queries filtering `IsActiveEntity eq true`. Always follow POST with `draftActivate`. See `react-cap-shared.md §3.1`.

---

## Deployment

Two deployment targets are in scope:

- **[LOCAL] Cloud Foundry:** early grounding in progress. See `evolution/JouleStudio/deployment.md`
  for verified findings. Significant known blockers exist (HANA Cloud mapping to CF space,
  entitlement assignment requiring admin rights). Do not present CF deployment as straightforward.

- **[JS] Kyma:** NOT YET GROUNDED. Kyma is the deployment target for Joule Studio projects.
  Do not generate Kyma deployment configuration without explicit grounding.
  Refer users to: https://cap.cloud.sap/docs/guides/deployment/to-kyma
