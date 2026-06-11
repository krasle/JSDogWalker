# Validation Protocols

**When to load:** After generating or modifying any UI app. Also load for validate/improve tasks.
**Tier:** 1 (load alongside the technology overlay for any generate task; always load for validate/improve tasks).

This file defines the full set of validation activities available for a UI app.

---

## Offering the validations  -  MANDATORY BEFORE RUNNING ANY CHECK

**This offer MUST be made before running any validation tool or check, regardless of how the user phrased the request.** A request to "validate the app" does not imply consent to any particular activity. The user may not know what options exist. Never assume scope.

**Before presenting the menu, check browser MCP availability:**

Attempt a lightweight probe to determine whether a browser automation server is available. Try in this order:
1. Playwright MCP  -  call `browser_snapshot()`
2. Chrome DevTools MCP  -  call `take_snapshot()` or `list_pages()`
3. Firefox DevTools MCP  -  call `take_snapshot()`

**Playwright is the preferred tool for all DV checks.** Use Chrome DevTools MCP only for
sap.viz VizFrame chart interaction tests (D3 event listeners require real coordinate clicks,
not accessibility-tree clicks). See the browser tool selection rule at the start of the DV
section below.

If any succeeds, a browser is available. If all fail or are not configured, no browser is available.

**Present the menu appropriate to the result.** There are two versions below.

---

### Menu A  -  Browser available

Present the complete menu below in plain language. Do not abbreviate it or pre-select options. Wait for an explicit response before starting anything.

---

> I can run several different types of validation on this app. Here is what is available  -  you can pick one, several, or use one of the named shortcuts at the bottom.
>
> ---
>
> **1  -  Static code checks** (~2 min, no browser needed)
> Scans all source files without running the app. Catches: deprecated API imports, case-sensitive text filters, raw database IDs shown to users instead of names, invalid icon references, missing or incomplete print CSS, expression syntax errors in XML views, TypeScript compilation errors, UI5 linter findings, and manifest validation errors. Good as a baseline check after any code change.
>
> **2  -  Runtime checks** (~3-5 min, browser required)
> Runs the app in the browser and checks: console errors and warnings on every page, network request status codes, data visibility (are rows showing, are dates formatted, are status codes mapped to labels), and navigation correctness including whether cross-page filters are actually applied. Finds problems that code inspection cannot  -  for example a filter that looks correct in source but sends the wrong OData query at runtime.
>
> **3  -  Faceted review** (~8-15 min agent-run, browser required)
> A systematic audit working through the app element by element across 8 facets: every control and its state, every data field and its format, every interaction pattern, every text string, every navigation path, accessibility attributes, and cross-facet consistency. The most thorough single-pass check  -  catches truncated labels, missing tooltips, raw codes in chart labels, missing no-data states, and similar issues that task-based testing misses.
>
> **4  -  Simulated usability testing** (typically 3-8 fix-retest iterations, browser required)
> The agent acts as a simulated end user and attempts a set of tasks using only what is visible on screen. Each task is scored PASS / FAIL. Failures go into a defect log and the cycle repeats (fix → retest) until all tasks pass or defects are accepted. The number of iterations depends on app quality  -  a well-built app converges in 3-4 cycles. Requires a task suite  -  if one does not exist it will be generated first.
>
> **5  -  Artefact consistency check** (~3 min, no browser needed)
> Checks that every requirement in the PRD and every entity in the spec actually made it into the schema, service handlers, and UI. Catches the "dropped downstream" pattern: things stated in one document that silently disappear before reaching the implementation. For example a FR that says "auto-generate confirmation on booking" but no AFTER handler implements it, or a "manage" verb in intent.md for an entity that the UI only shows read-only. Does not require the original prompt.
>
> **6  -  Improvement catalogue** (~5-10 min, no browser needed)
> Scans the app against the skill's proactive enterprise-ready rules (ER-N codes) and write-time checklists. Produces two lists: (B) standard violations — things that work but violate a named ER-N rule the skill would have enforced at generation time (e.g. client-side filters instead of server-side, raw FK text instead of interactive popovers, missing cross-navigation), and (C) enhancement opportunities — features the write-time checklists say should be present but were not generated. Separate from defects.
>
> **7  -  Intent review** (conversational, requires your original prompt)
> If you have the text of your original requirement (what you typed to generate this app), I can parse it into atomic requirements and trace each one through every derived document and into the implementation, identifying anything that was dropped, misinterpreted, or simplified without being documented. Different from 5  -  this catches things that were absent from all derived documents from the beginning, not just things that disappeared part-way through.
>
> **8  -  Human usability testing** (depends on your availability)
> I generate a printable task sheet with plain-language questions. You (or a colleague) try each task in the running app and report back answers and difficulty ratings. I compare the answers against correct values fetched directly from the database, raise defects for wrong or hard-to-find answers, and produce a summary. Finds the gap between what the app technically does and what a real user can actually accomplish. You choose the scope: quick spot-check (5-10 tasks), standard review (20-30), or comprehensive (all tasks). Always the last step so the app is in the best possible state before human time is invested.
>
> ---
>
> **Shortcuts:**
>
> **Full automated validation  -  report only**  -  runs 1 through 7 in sequence. All automated. Records all findings across defects, artefact gaps, and improvements. Makes no code changes. Ends with the app URL and an offer for human testing (8). Good when you want the full picture before deciding what to act on.
>
> **Full automated validation  -  fix after review**  -  runs 1 through 7 in sequence. Presents a consolidated defect report (what is broken) and a separate improvement catalogue (what is missing). You approve which items to fix in one pass. Simulated usability testing iterates until convergence after fixes are applied. Ends with app URL and human testing offer. *(Recommended  -  default if you just say "full validation".)*
>
> **Full automated validation  -  fix as we go**  -  runs 1 through 7 in sequence. Each defect is fixed and verified immediately when found. Improvements presented at the end for a separate approval pass. Good when you want the app in the best possible state at every step.
>
> **Complete validation (1-8)**  -  runs all automated checks (1-7) then generates a human task sheet (8). Use when you want both agent-verified and human-verified results in a single session. You will need to be available to run the task sheet.
>
> **Static only**  -  runs 1, 5, and 6 together. No browser needed. Complete static picture: code correctness + artefact consistency + improvement opportunities. Useful in [JS] environments or when runtime testing is deferred.
>
> ---
>
> **Which would you like?** You can pick a number, a combination (e.g. "1 and 5"), or one of the shortcuts above.
>
> Not sure? Common starting points:
> - "Quick sanity check" → **1**
> - "Does the app work end to end?" → **1 + 2**
> - "Did the generation miss anything?" → **5 + 6**
> - "Does the app do what I asked for?" → **7** (provide your original prompt)
> - "Thorough automated review before handoff" → **Full automated validation**
> - "Everything, including human testing" → **Complete validation (1-8)**
> - "Can users accomplish their goals?" → **4** (agent) or **8** (human)
>
> Once you have chosen, I will ask one more question about how you want any issues that are found to be handled  -  unless you used a shortcut, in which case that is already decided.

---

### Menu B  -  No browser available

Present this version when no browser MCP server was found.

---

> I can run validation on this app. However, I was not able to connect to a browser automation server (Chrome DevTools MCP, Playwright, or Firefox DevTools MCP), so runtime checks are not currently available.
>
> **What I can run now:**
>
> **1  -  Static code checks** (~2 min, no browser needed)
> Scans all source files without running the app. Catches: deprecated API imports, case-sensitive text filters, raw database IDs shown to users instead of names, invalid icon references, missing or incomplete print CSS, expression syntax errors in XML views, TypeScript compilation errors, UI5 linter findings, and manifest validation errors. This is the recommended first step regardless of browser availability.
>
> **5  -  Artefact consistency check** (~3 min, no browser needed)
> Checks that every requirement in the PRD and every entity in the spec made it into the schema, service handlers, and UI. Catches things that were stated in one document but dropped before reaching the implementation. No browser required. Particularly useful in [JS] environments where runtime checks are blocked.
>
> **6  -  Improvement catalogue** (~5-10 min, no browser needed)
> Scans app source against the skill's enterprise-ready rules (ER-N codes). Produces (B) standard violations and (C) enhancement opportunities. Entirely static.
>
> **7  -  Intent review** (conversational, requires your original prompt)
> If you have the text of your original requirement, I trace each item through every derived document into the implementation, identifying what was dropped or misinterpreted.
>
> **8  -  Human usability testing** (depends on your availability)
> I generate a printable task sheet. You try each task in the running app and report back. Does not require browser automation on my side. You choose the scope: quick (5-10 tasks), standard (20-30), or comprehensive (all tasks).
>
> ---
>
> **More thorough validation is available if a browser server is connected.** The following activities require a live browser and cannot be run now:
>
> - **Runtime checks (2)**  -  console errors, network requests, data visibility, navigation correctness
> - **Faceted review (3)**  -  systematic element-by-element audit across 8 facets (~8-15 min)
> - **Simulated usability testing (4)**  -  agent acts as a simulated user completing tasks
> - **Full automated validation**  -  all of the above in sequence (1 → 2 → 3 → 4 → 5 → 6 → 7)
>
> To enable these, start one of the following. Note: enabling a browser server may require restarting the session.
> - Playwright MCP server (recommended for all app types)
> - Chrome DevTools MCP server (required for sap.viz VizFrame chart interaction tests)
> - Firefox DevTools MCP server
>
> **Which would you like to run now?** You can choose any combination of **1**, **5**, **6**, **7**, **8**, or wait until a browser is available for the full menu.
>
> Note: running **1 + 5 + 6** gives you the complete static picture — code correctness + artefact gaps + improvement opportunities — without needing a browser.
>
> Once you have chosen, I will ask one more question about how you want any issues that are found to be handled.

---

If the user selects 2, 3, 4, or a full automated validation shortcut and Menu B was shown, remind them that a browser server is needed and ask if they want to proceed with the static options (1, 5, 6) instead, or wait until a browser is available.

If the user says "Full validation" or "do 1-7" or "do 1-8" without specifying a mode, ask:
> Which style would you like?
> - **Report only**  -  find everything, change nothing
> - **Fix after review**  -  full run first, then you approve what to fix in one batch *(default)*
> - **Fix as we go**  -  each issue fixed immediately when found
>
> (If not sure, "fix after review" is recommended  -  you see the full picture before anything changes.)

If the user selects 3 (faceted review), load `faceted-review.md` before starting.

If the user selects 4 (simulated usability testing), load `testing-protocol.md`. If `testing/Clicky.md` does not exist, run task suite generation first (ask the user: "What is this app for and who uses it?" before generating).

If the user selects 5 (artefact consistency check): load `product-requirements-document.md`, `intent.md`, `specification/`, `db/schema.cds`, `srv/*.js`, and the app source. Run SV-10. Present findings as FAIL (requirement stated, implementation absent) and FAIL-PARTIAL (read-only where manage is required).

If the user selects 6 (improvement catalogue): load `enterprise-ready.md`. Run the "Generate improvement catalogue" task from SKILL.md. Present output in two sections: (B) standard violations with ER-N codes, (C) enhancement opportunities. Write findings to `testing/improvements.md`. Ask user which items to implement.

If the user selects 7 (intent review): ask the user to provide or paste their original intent prompt. Follow the "Review implementation against original intent prompt" task steps in SKILL.md.

If the user selects 8 (human usability testing): ask the following sizing questions before generating the task sheet:
> **Human test sheet sizing — please answer three questions:**
>
> **1. Scope** — how many tasks should the sheet include?
> - **Quick** (5-10 tasks): one task per key entity, covering the most critical user paths. Good for a rapid sanity check or when tester time is limited to 15-20 minutes.
> - **Standard** (20-30 tasks): covers all Tier 1 KPI reads, key Tier 2 filters, one detail per entity, and the primary Tier 4 status transitions. Typical session: 45-60 minutes.
> - **Comprehensive** (all Clicky.md tasks): complete coverage including Chains and Negatives. Typical session: 90-120 minutes. Best when a dedicated tester is available.
>
> **2. Tiers to include** — which task types?
> - **KPI + actions only** (Tier 1 + Tier 4): fast check of counts and core write operations
> - **All read tiers** (Tier 1 + 2 + 3): verifies data is visible and navigable, no write operations
> - **All tiers** (default): reads, writes, chains, negatives
>
> **3. Answer visibility** — should the sheet show the expected answers?
> - **Blind** (questions only — default): tester does not see the correct answer. Use for genuine usability testing. Detects what is actually hard to find.
> - **Guided** (questions + directional hints): tester knows the area to look in but not the exact answer. Faster, less realistic.
>
> Default if not specified: Standard scope, all tiers, blind. Generate the task sheet and present it once sizing is confirmed.

If the user says "full validation with corrections" or uses the word "corrections" without specifying timing, treat this as ambiguous and ask [verified TrialK-2026-06-02]:
> "By 'corrections'  -  did you want me to:
> - Fix issues immediately as each one is found (**fix as we go**)
> - Or collect everything and fix in one batch after the full report (**fix after review**)?
>
> Both modes fix everything; the difference is when."

For combined selections (e.g. "1 and 5"), run in numeric order. After each activity completes, present its findings and ask before proceeding to the next.

**Full validation shortcut execution:**
1. Run activity 1 (static checks)  -  present findings
2. Run activity 2 (runtime checks)  -  present findings
3. Run activity 3 (faceted review)  -  present findings
4. Handle defects according to mode:
   - **Report only**: present consolidated report grouped by severity, no changes, proceed to step 5
   - **Fix after review**: present consolidated report grouped by severity; ask "Which of these should I fix?"; apply selected fixes in one pass; rerun affected checks to verify; then proceed to step 5
   - **Fix as we go**: defects have already been fixed individually during steps 1-3; present a summary of what was fixed; proceed to step 5
5. Run activity 4 (simulated usability testing):
   - **Report only** or **Fix after review** (before fixes applied): single pass  -  score each task PASS/FAIL, record defects, do not fix or retest
   - **Fix after review** (after fixes applied) or **Fix as we go**: full iterative loop  -  fix between runs, retest until convergence or 10 iterations
   - If no task suite (`testing/Clicky.md`) exists, generate one first: ask "What is this app for and who uses it?" before proceeding
   - **The same task suite runs every iteration**  -  do not regenerate tasks between runs. When a defect is found, check for two augmentation triggers before the next iteration: (1) does any existing task cover this defect? If not, add one. (2) Does this defect reveal a pattern that could affect other pages, entities, or controls not yet covered by any task? If so, add tasks for those too. See `testing-protocol.md §4` for examples.
6. Run activity 5 (artefact consistency check, SV-10)  -  present FAIL and FAIL-PARTIAL findings
7. Run activity 6 (improvement catalogue)  -  present Section B and Section C findings separately from defects. Write to `testing/improvements.md`. Ask which improvements to implement (separate from the defect fix pass). Reason: improvements are not broken things — they are quality gaps. The user decides whether to invest in them after seeing the defect state is resolved.
8. Provide the app's running URL for manual testing  -  confirm from the CAP server and present clearly
9. Offer human usability testing (activity 8): "Would you like me to generate a human test sheet? I will ask you three questions about scope, tiers, and answer visibility before generating it. This is the last step so the app is in its best possible state before human time is invested."
   If yes: ask the three sizing questions (scope / tiers / answer visibility) defined in the routing rules above, then generate the task sheet.

**If the user said "do 1-8":** This maps to the full automated validation (1 through 7) followed by human testing (8). Run 1-7 autonomously, then pause and ask the sizing questions for step 8 before generating the task sheet.

Once the activity selection is confirmed, ask the defect handling question before starting any work:

> **How would you like defects handled when they are found?**
>
> **Report only**  -  find and record all defects but make no code changes. Good when you want to review and decide yourself what to act on.
>
> **Fix after review**  -  complete the full activity, present a consolidated report, then you choose which defects to fix in one pass. *(Default if not specified.)*
>
> **Fix as we go**  -  each defect is fixed and verified immediately when found, before moving to the next check. Keeps the app clean throughout.

Store the chosen defect mode and apply it consistently throughout all activities in this session. If the user later asks to change mode mid-session, confirm the change before proceeding.

**Applying the defect mode:**
- **Fix as we go:** after each individual finding is confirmed, fix it, rerun the relevant check to verify, then continue to the next check
- **Fix after review:** collect all findings, present the full report grouped by severity, then ask "Which of these should I fix?"  -  apply only the selected fixes in one pass, then rerun all affected checks
- **Report only:** present findings report only; do not modify any file unless the user explicitly requests a fix afterwards

Do NOT start any activity before both questions (activity selection AND defect mode) have been answered.

---

## SV - Static Validation

Run all checks in order. After each group, report findings before proceeding. Stop a group and report if a finding would invalidate later checks (e.g. a package.json missing deps means the app cannot start - report and ask to fix before continuing).

### SV-0: Pre-delivery static grep gate

**Fast-exit for vanilla JS projects:** If the running app is vanilla JS (no `.ts`/`.tsx` source files in the project, or the app is served from a pre-built `index.html` with no React source tree contributing to the live output), skip the TypeScript/React-specific patterns below (all grep patterns targeting `.ts`/`.tsx`) and proceed directly to SV-7 (print views), SV-8 (string quality), and SV-9 (field-level sweep) against the HTML/JS source. DV checks remain mandatory regardless of technology.

To determine which version is running, use the framework identity check in DV-1.

Run these targeted greps before any other check. Each finds a specific class of error that static analysis tools do not catch. All must return zero matches:

```powershell
# Incorrect $apply groupby result reading (flat key instead of nested object)
# Fix: use row.navigation?.property ?? row['navigation/property']
Select-String -Path "**/*.ts","**/*.tsx" -Pattern "row\['.*/.*'\]" -Recurse

# Bare 'expand:' in bindElement parameters (must be '$expand:')
Select-String -Path "**/*.ts","**/*.tsx" -Pattern "parameters:.*\bexpand:" -Recurse

# Invalid ValueState values
Select-String -Path "**/*.ts","**/*.tsx","**/*.xml" -Pattern 'state=.*(Good|Critical)' -Recurse

# @Core.Computed in service CDS files used by FE apps
Select-String -Path "srv/**/*.cds" -Pattern "@Core.Computed" -Recurse

# Navigation paths in @UI.LineItem (dot notation = association path)
Select-String -Path "**/*.cds","**/*.xml" -Pattern "Value:.*\w+\.\w+" -Recurse

# FxNavItemConfig label typo (must be text:)
Select-String -Path "**/*.ts","**/*.tsx" -Pattern "label: '" -Recurse

# Decimal fields in Cell renderers without .toFixed
# (manual check: grep for Decimal accessor fields, verify .toFixed in Cell)

# Draft-enabled entities in bindElement without IsActiveEntity
# Replace 'YourEntity' with each draft-enabled entity name in your project
Select-String -Path "**/*.ts" -Pattern "bindElement.*path:.*[A-Z][a-zA-Z]+\('" -Recurse
# Review matches: any bindElement path using only the entity key (no IsActiveEntity) is a defect

# Deprecated pseudo-module imports (sap/m/ValueColor, sap/ui/core/ValueState) generate [FUTURE FATAL] errors in SAPUI5 1.120+
Select-String -Path "**/*.ts","**/*.tsx" -Pattern "from 'sap/m/ValueColor'|from 'sap/ui/core/ValueState'" -Recurse
# Fix: remove import entirely; use string literals ('Error', 'Success', 'Good', 'Critical') directly

# Fields ending in _ID visible to users in table cells or text bindings
# Review: any match is a candidate SV-9 Q1 failure (raw FK shown to user)
Select-String -Path "**/*.tsx","**/*.ts","**/*.xml" -Pattern "\b\w+_ID\b" -Recurse

# Charts without onClick (recharts: BarChart, PieChart, LineChart, AreaChart)
# Each match in an Overview page: verify onClick is present on the chart or child element
Select-String -Path "**/*.tsx" -Pattern "<(BarChart|PieChart|LineChart|AreaChart)[^>]*>" -Recurse

# Client-side aggregation patterns on $top-limited data
# Each match in a component that also has a fetch: review whether it operates on $top-limited data
Select-String -Path "**/*.tsx","**/*.ts" -Pattern "\.reduce\(|\.filter\(.*\.length" -Recurse

# Hard $top values used for analytics fetches (not paging)
# Each match: confirm whether it is paging (acceptable) or input to aggregation (FAIL)
Select-String -Path "**/*.tsx","**/*.ts" -Pattern "\$top=(200|500|1000|2000)" -Recurse

# Back button implementations that are not proper nav-back buttons
Select-String -Path "**/*.tsx" -Pattern "Back to|<-- Back" -CaseSensitive:$false -Recurse
# Each match: verify it uses a Button component with icon="nav-back", not a styled span or a

# Icon-only buttons without tooltip (WC4R)
Select-String -Path "**/*.tsx" -Pattern 'icon="[^"]*"' -Recurse
# Review: any Button/Action with icon= but no tooltip= or title= is a candidate SV-9 Q5 failure

# ASCII encoding check for skill documentation files
Select-String -Path "**/*.md" -Pattern "[\u2013\u2014\u2018\u2019\u201C\u201D\u2026]" -Recurse
# Any match in a skill or project doc file = encoding issue

# OData system query options encoded as %24 in source files (same bug as URLSearchParams)
# These MUST be zero matches -- %24filter/%24count etc. cause CAP to silently ignore the param
Select-String -Path "**/*.ts","**/*.tsx","**/*.js" -Pattern "%24(filter|count|top|expand|orderby|select|skip|apply)\b" -Recurse
# Fix: replace %24filter with $filter, %24count with $count, etc. - see cap-shared.md §3.4

# SAPUI5: invalid press handler expression-with-argument (e.g. press=".onNav('list')")
# Event handler bindings in SAPUI5 XML cannot contain argument expressions - the method reference
# is resolved but arguments are silently ignored, so the click does nothing.
# ZERO MATCHES REQUIRED - each match is a blocking defect.
Select-String -Path "**/*.xml" -Pattern 'press="\.[a-zA-Z]+\(' -Recurse
# Fix: replace press=".onNav('list')" with press=".onNavList" and add onNavList() to the controller.

# WC4R: bare <Label> without showColon prop
# ui5-label (WC4R) does NOT auto-render a colon -- showColon must be explicit.
# sap.m.Label (SAPUI5) auto-renders a colon; this rule applies to WC4R/FX files only.
# ZERO MATCHES REQUIRED in *.tsx files - each is a missing-colon defect.
Get-ChildItem -Recurse -Include "*.tsx" | ForEach-Object { Select-String -Path $_.FullName -Pattern '<Label>' } | Where-Object { $_ }
# Fix: change <Label> to <Label showColon> on every label adjacent to a form field value.
# Exception: search-box prompt labels that are purely decorative (no colon expected).

# WC4R/FX: null numeric value concatenated with a unit string (e.g. {val ?? '--'}/5 or {val ?? '0'} EUR)
# Produces cryptic output like "--/5" or "--/100". Use a conditional expression instead.
# ZERO MATCHES REQUIRED - each is a SV-9 Q1 human-readability failure.
Select-String -Path "**/*.tsx","**/*.ts" -Pattern "\?\? '--'" -Recurse
# Review each match: if the field has a unit/suffix (e.g. /5, EUR, %, pts), replace with:
#   {val != null && val > 0 ? val.toFixed(N) + '/5' : 'Not rated'}
# If the field stands alone without a unit, '--' as a null placeholder is acceptable.
```

> These checks are mechanical - zero-match is a hard requirement, not a guideline. Run them before running linter or manifest validation.

**Seed data UUID format check (run for any project with `: cuid` entities):**

```powershell
# For each CSV in db/data/, check whether the ID column values look like UUIDs.
# A UUID is 8-4-4-4-12 hex chars (e.g. "550e8400-e29b-41d4-a716-446655440000").
# A non-UUID is anything shorter (e.g. "ap001", "w001", "c001").
$csvFiles = Get-ChildItem "db/data/*.csv" -ErrorAction SilentlyContinue
foreach ($f in $csvFiles) {
    $firstDataLine = Get-Content $f | Select-Object -Skip 1 -First 1
    if (!$firstDataLine) { continue }
    $firstId = $firstDataLine.Split(',')[0].Trim('"')
    $isUuid = $firstId -match '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    if (!$isUuid) {
        Write-Host "WARN: $($f.Name) uses non-UUID ID '$firstId' - check if entity uses : cuid"
    }
}
# Cross-check: each entity in db/schema.cds with ': cuid' requires UUID IDs in its seed CSV
Select-String -Path "db/schema.cds" -Pattern ": cuid" -Recurse
```

Any WARN output here paired with a `: cuid` schema match = BLOCKING pre-flight failure. Fix: run the write-path PATCH check from `cap-shared.md §1` before writing any UI write code. See `cap-shared.md §3.2` for the full explanation and fix options.

---
### SV-1: Package.json and dependency completeness

**For all technologies:**
- [ ] A `package.json` exists at the CAP project root with `cds-plugin-ui5` in `devDependencies` (SAPUI5/FE only)
- [ ] No CAP packages (`@sap/cds`, `@sap/cds-dk`, `@cap-js/sqlite`) in any parent folder's `package.json` above the CAP project root
- [ ] `@sap/cds` version in the project `package.json` is compatible with the installed `cds-dk` major version

**For React apps (WC4R / FX):**
- [ ] The app's own `package.json` (inside `app/<name>/`) explicitly lists ALL runtime dependencies - do not rely on workspace hoisting (see `react-cap-shared.md §1.1` for the full list and hoisting rules)
- [ ] No `ThemeProvider` import from `@sap-ui/fx-components` anywhere in FX app source (see `fx.md §1`)
- [ ] No `path.resolve('./node_modules/react')` aliases in `vite.config.ts` unless installed via `file:` path - see `react-cap-shared.md §1.4` for the correct approach

**For SAPUI5 / FE apps:**
- [ ] Every library used in `manifest.json -> sap.ui5.dependencies.libs` also appears in `ui5.yaml -> framework.libraries`
- [ ] If sap.viz is used: it is available from @sapui5/sap.viz npm package and works with cds-plugin-ui5 - but has a large bundle. If CDN-served sap.viz was accidentally configured alongside a local server, remove the CDN config (MIME error is a configuration problem, not a library incompatibility). See sapui5.md §11 Step 4.
- [ ] `@sapui5/types` is in the CAP root `devDependencies` and its version matches the `framework.version` in `ui5.yaml`
- [ ] **Fiori Elements apps only:** The generated app `package.json` has `devDependencies` set to `{}` - `fiori_execute_functionality` generates `@sap-ux/eslint-plugin-fiori-tools` and `@ui5/cli` entries that crash `cds-plugin-ui5` when it tries to resolve them. Always clean up `devDependencies` immediately after generation (see `fiori-elements.md §0`).

---

### SV-2: Type and formatting consistency

**Edm type / binding type consistency (SAPUI5/FE):**
- [ ] No explicit `type:` in OData V4 bindings for `Edm.DateTimeOffset` fields - the model reads types from `$metadata` automatically; explicit type causes blank output
- [ ] `Edm.Decimal` fields that need formatting use `core:require` with `sap/ui/model/odata/type/Decimal`, not a raw `type:` string
- [ ] No `sap.ui.model.odata.v2.*` type references anywhere - all types must be `sap.ui.model.odata.v4.*` or `sap.ui.model.type.*`

**Number / currency formatting (all technologies):**
- [ ] No aggregated numeric value displayed without a currency label when rows may have mixed `currency_code` values
- [ ] Chart axis titles include units (e.g. "Price (EUR)", not just "Price") if the data is currency-denominated

**React type hygiene (WC4R/FX):**
- [ ] No `as any` casts where a correct type is available in the tech overlay (see `wc4r.md §2` for correct double-cast patterns)
- [ ] `@odata.count` accessed via bracket notation (`json['@odata.count']`), never dot notation

---

### SV-3: Annotation correctness (Fiori Elements / SAPUI5 only)

- [ ] No `UI.FieldGroup#Qualifier` key placed inside a combined `annotate Entity with @(...)` block - must be a separate `annotate` statement (CDS compiler error, crashes server)
- [ ] No `{= expr }` dynamic expression used as a `Criticality` value in `UI.LineItem` DataField - crashes the CAP server on startup; use a stored integer element mapped via an `after('READ')` handler instead
- [ ] All `@UI.SelectionFields` entries for ALP apps are scalar primitive properties with `@title` or `@Common.Label` - bare FK fields (e.g. `author_ID`, `category_ID`) without complete `@Common.Label`/`@Common.Text`/`@Common.ValueList` annotations crash the ALP FilterBar builder at runtime
- [ ] `@odata.draft.enabled` is on the service entity, not the DB entity
- [ ] Annotation files in `srv/annotations/` are explicitly imported in the service `.cds` file (`using from './annotations/...'`)
- [ ] No action-level `@Common.SideEffects` - fatal crash in SAPUI5 1.136.7
- [ ] No duplicate property keys in `@UI.LineItem`
- [ ] `@Aggregation.ApplySupported` is not placed in ALP-only annotation files if LROP is also present
- [ ] No `@Core.Computed: true` on projected computed scalars (CASE expressions, navigation aliases) used in FE apps - this annotation propagates to `$metadata` and disables FE 1.136.7 PropertyInfo validation, silently dropping all `@title`/`@Common.Label` annotations from FK scalar filter labels. Use `@readonly` instead.
- [ ] No navigation association paths in `@UI.LineItem` (e.g. `Value: category.name`) - use flat computed scalars (e.g. `typeName`, `ownerName`) from the service projection. Navigation paths in LineItem disable PropertyInfo and silently drop all other columns in FE 1.136.7.
- [ ] Every FK scalar field in `@UI.LineItem` has `@Common.Text: association.displayProperty` AND `@Common.Label: 'Human Name'`
- [ ] Every bound/unbound action has `@title` or `@Common.Label` annotation
- [ ] Integer fields representing years or codes have `@Common.IsCalendarYear: true` or `@Common.IsCalendarDate: true` to prevent thousand-separator formatting. **This applies to integer business keys too** (e.g. `TravelID`, `IncidentID`, `OrderID`) - without this annotation, `4143` renders as `4,143`.
- [ ] `@Common.ValueList` on UUID FK scalars uses `ValueListParameterOut` (not `ValueListParameterInOut`) for the key mapping parameter - it crashes LROP when ALP is stashed
- [ ] **Multiple FE apps on same service:** If a second FE app targets the same CAP service as an existing app, the second app's `annotations.cds` does NOT redefine `@UI.LineItem`, `@UI.HeaderInfo`, `@UI.PresentationVariant`, or `@UI.Facets` for any entity already annotated by the first app. Duplicate global annotations crash the CAP server with `[ERROR] Duplicate assignment`. (See `fiori-elements.md §6` for the rule.)

---

### SV-4: Clear text display - IDs vs. labels

**BLOCKING gate: any failing item here MUST be fixed before delivery. Raw FK IDs, UUIDs, or codes shown to users are never acceptable UX under any circumstances. "Known limitation" is NOT a valid disposition for SV-4 failures.**

These patterns silently show raw database IDs or internal codes to the user instead of human-readable text:

- [ ] FK reference fields (e.g. `author_ID`, `category_ID`) are not displayed raw - navigation property text (e.g. `author/name`) or a denormalized `authorName` field is shown instead
- [ ] Status code fields (e.g. `status = 'N'`) have a label mapping - either via `@Common.Text` pointing to a text element, or a `switch`/ternary mapping in controller/component code
- [ ] UUID fields (`ID`, `_ID`) are never shown as column values in a list - only navigational targets
- [ ] No binding expression that resolves to a GUID string visible to the user (check all `<Text text="...">` and `{field}` bindings against the entity schema)
- [ ] Date fields use locale-formatted display (via OData V4 type inference for SAPUI5, or `formatODataDate()` helper for React) - not raw ISO string output

---

### SV-5: Expression syntax in views

**SAPUI5/FE - XML view expressions:**
- [ ] No `??` (nullish coalescing) operator in XML expression bindings (`{= ... }`) - causes `SyntaxError: Unexpected ?` at runtime; use `|| ''` or a formatter function instead
- [ ] No `{= ${field} }` expressions used for simple property display - use plain `{field}` binding instead (the expression wrapper adds overhead and is error-prone)
- [ ] All `core:require` module paths use slash notation (`sap/ui/model/odata/type/Decimal`), not dot notation
- [ ] Conditional visibility expressions use `visible="{= ${field} !== '' }"` pattern - not `visible="false"` hardcoded (a common scaffolding artifact)
- [ ] No `enabled="{= ${/editMode} }"` patterns where `editMode` is a local model property that is never initialised - check all expression-bound properties have a corresponding model initialisation

**SAPUI5/FE - OData V4 binding patterns:**
- [ ] All `bindElement` calls on draft-enabled entities include `IsActiveEntity=true` (or `false`) in the key predicate
- [ ] All `bindElement` `parameters` objects use `$expand` (with dollar sign), not bare `expand`
- [ ] All `visible`/`enabled` bindings that use a formatter against an OData string field include `targetType: 'any'`
- [ ] No hardcoded `state="Good"` or `state="Critical"` where `sap.ui.core.ValueState` is expected (valid values: `None`, `Error`, `Warning`, `Information`, `Success`)
- [ ] No hardcoded `valueColor="Success"` or `valueColor="Warning"` where `sap.m.ValueColor` is expected (valid values: `None`, `Good`, `Error`, `Critical`, `Neutral`)

**SAPUI5/FE - Navigation properties:**
- [ ] No `{navigation/property}` binding paths on navigation associations that CAP does not expose as expandable at the service level - verify each navigation path against `$metadata`

**WC4R-specific:**
- [ ] No `AnalyticalTable visibleRowCountMode="Auto"` inside a container chain with `%`-height or `overflow: auto` - use `"Fixed"` with calculated `visibleRowCount`
- [ ] `FxNavItemConfig` entries use `text` property (not `label`) for the display label - TypeScript excess property checks may not catch this
- [ ] Bare `<div>`/`<span>` text outside WC shadow DOM explicitly sets `fontFamily: 'var(--sapFontFamily)'`
**React (WC4R/FX) - JSX expressions:**
- [ ] No conditional rendering that places hooks inside an `if` branch - all `useState`/`useMemo`/`useEffect` before any early `return`
- [ ] No `key` prop set to array index (`key={i}`) on list items that can be reordered or deleted - use a stable entity ID
- [ ] No `useEffect` without a dependency array (runs on every render - almost always unintentional)

---

### SV-6: Icon references

**SAPUI5/FE:**
- [ ] All icon URI values use the `sap-icon://` scheme, e.g. `sap-icon://save` - not a path or URL
- [ ] Every icon name used in `sap-icon://` is verifiable in the SAP Icon Explorer; check against the installed SAPUI5 version (run `ui5_get_api_reference` for `sap.ui.core.IconPool` or consult `https://ui5.sap.com/sdk/#/topic/21ea0ea94614480d9a910b2e93431291`)

**WC4R:**
- [ ] Every `@ui5/webcomponents-icons/dist/<name>.js` import file actually exists in the installed package:
  ```powershell
  # Windows
  Test-Path "node_modules\@ui5\webcomponents-icons\dist\<name>.js"
  ```
  ```sh
  # macOS/Linux
  test -f node_modules/@ui5/webcomponents-icons/dist/<name>.js && echo ok || echo MISSING
  ```
- [ ] Known non-existent icons in `@ui5/webcomponents-icons 2.x` are not used: `books`, `passenger-train`, `plane`, `flight-2` - use `course-book`, `travel-itinerary`, `flight` instead

**FX Components:**
- [ ] All icon components imported from `@sap-ui/fx-components/icons` (barrel import only - individual module paths are not in the exports map)
- [ ] Non-obvious icon names verified against the `fx-ref.md §E` index:
 - Company/organisation -> `TntCompany` (not `CompanyIcon`)
 - Category/folder -> `FolderIcon` (not `CategoryIcon`)
- [ ] No `Badge` component imported - use `Tag` instead (see `fx.md §12`)

---

### SV-7: Print views - no scrollbars

Any view or section intended for printing (report pages, print dialogs, export previews):

- [ ] No `overflow: auto` or `overflow: scroll` on any container that wraps printable content
- [ ] No fixed-height containers (`height: 400px`, `max-height: ...`) that would cause content to be clipped in print
- [ ] Print CSS media query or explicit print layout uses `height: auto` and `page-break-inside: avoid` on logical sections
- [ ] SAPUI5: No `sap.m.ScrollContainer` wrapping printable content - use `sap.m.VBox` or a plain `<div>` instead
- [ ] SAPUI5: No `sap.ui.table.Table` with `rowmodes:Auto` in print/report views - creates internal scrollbar; use `sap.m.List` + `ColumnListItem` instead (see `sapui5.md §6.4`)
- [ ] React: No `overflow-hidden` or `overflow-y-scroll` Tailwind classes on the print container wrapper
- [ ] For SAPUI5 report views: `sap.m.Page` `enableScrolling` should be `false` for pages that will be printed - the browser handles page breaks

---

### SV-8: String quality (UA/UX spot-check)

**Scope:** This is a targeted fast-check for the most common generated-code string failures. It is a subset of the full `ux-standards.md §15 L1 Quick Gate` (27 items). Apply SV-8 during generate tasks for speed; apply the full L1 Quick Gate during validate/improve tasks for completeness.

- [ ] No button label or column header in all-lowercase (Title Case required)
- [ ] No "successfully" in any toast, message, or notification text
- [ ] No "Operation completed", "Action performed", "Process finished" - use object+action: "Book saved", "Incident created"
- [ ] No "Remove" where "Delete" is the correct SAP action verb
- [ ] No "Modify" where "Edit" is the correct SAP action verb
- [ ] No "Close" where "Cancel" is the correct verb for abandoning an edit
- [ ] No "Log Out" - correct verb is "Sign Out"
- [ ] No illustrated message title with a period at the end
- [ ] No placeholder text with a period at the end
- [ ] Dialog titles do not end with a period
- [ ] No `(s)` used for singular/plural shortcut - separate keys required
- [ ] No "No data available" as the custom no-data text - use "No [Object Type] Found", e.g. "No Books Found", "No Incidents Found"

---

### SV-9: Field-level data quality sweep

For every entity shown in any table, list, detail section, or chart label, run this sweep on each bound field. Each question is binary: pass or FAIL. Any FAIL is a blocking defect before delivery.

**Q1 - Is this the most human-readable representation of the data?**
- FK scalar (author_ID, genre_ID, customer_ID): FAIL unless @Common.Text or a lookup map resolves it to a name
- UUID displayed as a column value: FAIL (UUIDs are never shown to users)
- Status code ("O", "N", "IP"): FAIL unless mapped to a human-readable label ("Open", "New", "In Process")

**Q2 - Is the data formatted correctly for its type?**
- Integer business keys (IDs, codes): must NOT have thousand separators (4143, not 4,143)
- Prices/amounts: must show 2 decimal places and a currency symbol or code
- Dates: must show locale-formatted string, not raw ISO (2024-06-06T00:00:00Z)
- Percentages: must show % symbol
- Counts: whole numbers, no decimals

**Q3 - Should this field be interactive?**
- In a list row: does clicking the row navigate to a detail view?
- In a chart bar/segment: does clicking filter the list to that value?
- In a KPI tile: does clicking navigate to a filtered list?
- Navigation target fields (author name, agency name): does clicking navigate to that entity's detail? (If the data model supports it)

**Q4 - Are status-transition actions available where needed?**
- If the entity has lifecycle states (Open/In Progress/Closed), are actions offered to transition it?
- Actions placed appropriately: inline in row for single-record, in detail header, or as mass actions in toolbar

**Q5 - Should a tooltip or popover be offered on this element?**
- Truncated text in a narrow column: tooltip with the full value (required)
- Status indicator shown as color or icon only (without text): tooltip with full status label and meaning (required)
- Abbreviated or coded value (2-letter code, short ID): tooltip with expanded name (required)
- KPI value shown without denominator context ("602 open"): tooltip with "N of M total" (required)
- Interactive element where navigation target is not obvious: tooltip describing the action, e.g. "Filter by this status" (required)
- Clickable row or chart segment: tooltip describing click action (recommended)

Tooltip content rules:
- Sentence case
- Never repeat visible text verbatim
- Never add a tooltip to static column headers that are self-explanatory
- Tooltip text does not end with a period (exception: complete sentences required for clarity)
- Tooltip never contains raw IDs, UUIDs, or internal codes

**DV verification for SV-9:**
- [ ] For each table: no column header ends with "_ID" or "ID" as a user-visible suffix
- [ ] For each numeric field: business key and code fields have no thousand separator
- [ ] For each status/code field: human-readable label shown (not the raw code character)
- [ ] Hover over every icon-only button - tooltip appears with an action verb
- [ ] Hover over every truncated text field - tooltip shows the full value
- [ ] Hover over each KPI tile - tooltip provides denominator or trend context where the number is only meaningful relative to a total

---

### SV-10: Artefact-to-artefact consistency

**When to run:** On any project that has a `product-requirements-document.md` (PRD) or `intent.md`. No browser required. No original prompt required. Run after SV-9.

**What this catches:** Requirements that were stated in derived documents (PRD, intent.md, spec) but were dropped or left unimplemented downstream. This is distinct from SV-0 through SV-9 which check code patterns — SV-10 checks semantic completeness.

**Check 1 — Every FR has a corresponding implementation:**

For each FR in `product-requirements-document.md`:
- [ ] The FR maps to at least one entity/field in `db/schema.cds` OR a handler in `srv/*.js` OR a UI element in the app source
- [ ] If the FR uses a verb like "manage", "create", "edit", "configure": a Create form AND an Update form exist in the UI for the referenced entity. Read-only display without edit capability is FAIL-PARTIAL.
- [ ] If the FR says "auto-generate" or "auto-create": verify a corresponding AFTER handler exists in `srv/*.js`. If absent, raise as FAIL.

**Check 2 — Every AFTER handler side effect is visible in the UI:**

For each `srv.after(...)` handler in `srv/*.js`:
- [ ] Identify what entity/field the handler creates or updates
- [ ] Verify that entity is accessible in at least one UI view
- [ ] Verify the value produced by the handler (e.g. a computed fee, an auto-created record) is rendered in the UI — not just returned by the API

**Check 3 — Every API function's return fields are rendered in the UI:**

For each OData function (e.g. `getDailySchedule`, `getValidSlots`) defined in `srv/*.cds`:
- [ ] Enumerate every field in the function's return type
- [ ] Verify each field is rendered in the corresponding UI view
- [ ] Fields present in the return type but absent from the UI rendering are flagged as FAIL

**Check 4 — Every entity with a Composition has a management UI:**

For each `Composition of many` in `db/schema.cds`:
- [ ] The child entity has a UI to create and delete child records
- [ ] If absent: check whether `intent.md` or `specification.md` explicitly marks it as out-of-scope. If no such note exists: FAIL-PARTIAL.

**Check 5 — Every "manage" verb in intent.md has full CRUD in the UI:**

Grep `intent.md` for management verbs (manage, configure, set, define, register):
```powershell
Select-String -Path "intent.md" -Pattern "\b(manage|configure|set|define|register|edit|update)\b"
```
For each match referencing a named entity: verify the UI has both a create form and an edit/update mechanism for that entity.

**Operational procedure:**

```
1. Read product-requirements-document.md. List all FR items.
2. For each FR: search schema.cds and srv/*.js and app source for the corresponding
   implementation element. Record: present/absent/partial.
3. Read intent.md. Extract all management verbs + referenced entities.
4. For each management verb: verify UI has create + edit forms.
5. Read srv/*.js. List all srv.after() handlers and their side effects.
6. For each side effect: verify it is visible in the UI.
7. Read srv/*.cds. List all function return type fields.
8. For each function: verify all returned fields are rendered in the UI.
9. Report: FAIL items (requirement stated, implementation absent),
           FAIL-PARTIAL items (read-only where write is required),
           PASS items (fully implemented).
```

**Note on JS/JS-LOCAL projects:** In Joule Studio, all project artefacts (intent.md, PRD, spec, schema, handlers, UI) are generated from a single user prompt. SV-10 is especially important for these projects because the entire pipeline from requirements to code is automated — gaps can be introduced at any translation step without the user's knowledge. SV-10 is fully executable in [JS] and [JS-LOCAL] environments (no browser required).

---

## DV - Dynamic Validation

**Browser tool selection for all DV checks:**
- **Use Playwright MCP by default** for: `browser_navigate`, `browser_snapshot`,
  `browser_take_screenshot`, `browser_click`, `browser_network_requests`,
  `browser_network_request`, `browser_console_messages`, `browser_evaluate`,
  `browser_type`, `browser_fill_form`
- **Use Chrome DevTools MCP** only for: sap.viz VizFrame chart click interactions
  (D3 event listeners are not triggered by accessibility-tree clicks; require
  `page.mouse.click(x,y)` at real viewport coordinates)
- **Fallback:** If Playwright MCP is unavailable, use Chrome DevTools MCP equivalents
  (`navigate_page`, `take_snapshot`, `list_console_messages`, `list_network_requests`,
  `evaluate_script`, `click`)

The DV check instructions below use generic verbs ("navigate", "snapshot", "inspect
network"). Execute using Playwright unless a Chrome DevTools MCP exception is noted inline.

Requires: Playwright MCP (preferred) or Chrome DevTools MCP connected, app server running, CAP backend running with data.

Run only after all SV checks pass (or all critical SV findings are fixed).

> **[JS] Dynamic verification is not possible inside the Joule Studio sandbox.**
> The app runs inside the JS preview iframe. There is no confirmed URL path that allows
> agent access to the running app from outside the VM. Candidate URLs suggested by the
> Joule agent return "Invalid Workspace" errors. There is no transparent proxy.
>
> **Do NOT attempt `navigate_page()`, `take_screenshot()`, `list_console_messages()`,
> `curl`, or `Invoke-WebRequest` against app URLs in a `[JS]` session.** These will fail.
>
> Options when DV is required on a `[JS]` project:
> 1. **(Preferred)** Pull the project to a `[JS-LOCAL]` environment, run `cds watch`
>    locally, and execute the full DV protocol at `http://localhost:4004/react-ui/`.
>    The app behaves identically locally - `[JS-LOCAL]` DV findings are valid for the JS app.
> 2. **Manual user verification:** Use the "Without Chrome DevTools MCP" checklist from
>    `SKILL.md §Runtime Verification` as the basis. Ask the user to perform each check
>    in the JS preview iframe and report findings back.
>
> SV checks (SV-0 through all SV-N entries in this file) are fully executable by the
> agent in `[JS]` and `[JS-LOCAL]` environments. Only DV is blocked in `[JS]`.

### DV-1: App loads and renders

```
navigate_page(type="url", url="<app-url>")
take_screenshot()
```

- [ ] Page loads without browser-level error (ERR_UNSAFE_PORT, ERR_CONNECTION_REFUSED)
- [ ] App shell is visible - not a blank white page
- [ ] No loading spinner still running after 10 seconds (indicates a hung OData request)
- [ ] For FE List Report: table is visible (not showing "To start, set the relevant filters and choose Go" indefinitely) - if so, verify `initialLoad: "Auto"` is set in manifest for analytical apps
- [ ] **Framework identity verification (mandatory for projects with both a built app and a React source tree):**
  ```
  browser_evaluate("() => document.querySelector('#root') ? 'React' :
                          document.querySelector('#app')  ? 'Vanilla-JS' : 'unknown'")
  ```
  For projects with `src/` React source AND a pre-built `index.html`:
  - If `#root` found → the Vite-built React bundle is being served. Static checks (SV-0 through SV-9) apply to `src/` files.
  - If `#app` found → the vanilla JS `index.html` is being served, NOT the React build. Static checks targeting `.ts`/`.tsx` files (SV-0 through SV-6) are NOT applicable to this running version. SV-8 and SV-9 apply to the HTML source.
  - If result is `'unknown'` for a project that has a defined mount point: raise as a defect — the app may not be initialising.
  Misidentifying which version is running invalidates all source code analysis that follows. Fix: run `npm run build` in the React app folder and verify the CDS serves from `dist/`.

---

### DV-2: Console error check

```
list_console_messages(types=["error"])
```

For each error found, cross-reference the triage table in `SKILL.md §Runtime Verification Protocol Path A §3`.

- [ ] Zero console errors
- [ ] If errors exist: classify each as **crash risk** / **data failure** / **degraded UX** / **informational**
- [ ] Fix all crash risk and data failure errors before proceeding
- [ ] Document degraded UX errors as findings for the user

---

### DV-3: Console warning review

```
list_console_messages(types=["warn"])
```

Warnings do not always require fixes, but must be classified:

| Warning pattern | Action |
|---|---|
| `[FUTURE FATAL]` | **Fix immediately** - will become a hard error in the next SAPUI5 version; run `ui5_run_ui5_linter` to identify the deprecated API |
| `deprecated` | Fix if in generated code; log for user if in a dependency |
| `404` on a resource | Fix - missing library or asset |
| `[WC4R] Unknown attribute` | Fix - prop name typo or removed API |
| `React key` warning | Fix - missing or unstable `key` prop |
| `Each child in a list should have a unique key` | Fix - `key={index}` used instead of stable ID |
| CORS warning | Fix - Vite proxy not configured correctly for this endpoint |
| `i18next` namespace or key warning | Fix if affects visible UI; log for user otherwise |
| Slow network / performance hint | Log for user as an optimisation opportunity |
| Deprecation from a third-party library | Log for user - not actionable in generated code |

After classification, present a summary to the user:
- Warnings fixed automatically: list them
- Warnings logged for user: list them with one-line explanations

---

### DV-4: Network request validation

```
list_network_requests(resourceTypes=["fetch","xhr"])
```

For every OData request:

- [ ] All entity collection requests return HTTP 200
- [ ] All `$metadata` requests return HTTP 200
- [ ] No request returns 401 or 403 - indicates an unconfigured `@requires` restriction
- [ ] No request returns 400 - indicates a URL encoding problem or malformed OData query
- [ ] No request returns 404 - indicates a wrong service path in manifest or proxy config
- [ ] No request returns 500 - indicates a CAP server error (check `cds watch` terminal)
- [ ] Draft entity list requests include `IsActiveEntity%20eq%20true` or `IsActiveEntity eq true` in the URL
- [ ] No absolute `http://localhost:PORT` in any OData request URL - all must be root-relative (proxy)
- [ ] No `%24filter` in any URL (URLSearchParams encoding trap - `$` must not be percent-encoded)

**Write-path smoke test (BLOCKING — run before DV-5):**

Before completing DV-4, trigger at least one write operation for each entity type the app exposes. Minimum set: click one status-transition button (Confirm / Mark Paid / etc.) if present; click Edit on one row and submit without changes; if a Create form exists, open it and cancel.

After each action, inspect the network log using Playwright:
```
browser_network_requests(filter='/api/<EntitySet>', static=false)
# Get the index of the most recent PATCH/POST/DELETE
browser_network_request(index=<N>, part='response-body')
```

Assert: the most recent PATCH/POST/DELETE returned HTTP 200 (PATCH/PUT), 201 (POST), or 204 (DELETE).

Common HTTP 400 causes:
- `"does not contain a valid UUID"` → seed data ID mismatch (cap-shared.md §3.2) — **BLOCKING, fix before any further testing**
- `"Value is required"` → FK field name mismatch (admin vs browse service)
- `"Integrity constraint"` → missing required FK

A write returning HTTP 400 while the UI shows no error (error caught and swallowed by `toast()`) is a BLOCKING defect. The UI appears functional but all mutations fail from the user's perspective. This check MUST pass before DV-5 — a write-path failure makes all data correctness checks meaningless.

---

### DV-5: Data visibility check

```
take_snapshot()
```

For each table or list in the app:

- [ ] At least one row of data is visible (not "No data", not empty)
- [ ] If a table shows "No data": check the OData request in DV-4 - did the request return records in the `value` array?
 - Yes, but table empty -> binding path mismatch (property names are case-sensitive - compare against `$metadata`)
 - No records in `value` -> check the `$filter` applied; draft entities need `IsActiveEntity eq true`
 - Request not made -> list binding not reached; routing or component issue
- [ ] **noDataText mutual exclusion (WC4R/FX):** If `@odata.count > 0` (records exist), the snapshot MUST NOT contain the `noDataText` string. In WC4R, `Table` and `AnalyticalTable` can render `noDataText` simultaneously with data rows - data appearing on screen does not guarantee noDataText is absent. After confirming data is visible, explicitly search the snapshot for the noDataText string. If found alongside data rows, it is a defect. Fix: add a conditional `noDataText={loading ? 'Loading...' : 'No matching records. Adjust filters.'}` and ensure the instructional message is not a substring likely to appear in real data.
- [ ] FK / navigation text fields show human-readable text, not raw UUIDs or `[object Object]`
- [ ] Date fields show a formatted date string, not a raw ISO timestamp (`2024-06-06T00:00:00Z`)
- [ ] Status / code fields show labels, not raw codes (e.g. "New" not "N", "In Process" not "IP")
- [ ] Numeric fields have appropriate decimal places and no "NaN" or "undefined" visible
- [ ] No field shows the literal string "undefined", "null", or "[object Object]"
- [ ] Integer fields that represent years or codes show without thousand separators (e.g. `1847` not `1,847`)
- [ ] `Decimal(N,M)` numeric fields show the correct number of decimal places (e.g. `3781.00` not `3781`)
- [ ] Every filter control reduces the table row count when a value is selected - if count does not change, check Network tab for HTTP 400 (likely UUID filter on Edm.Guid field or OData encoding issue)
- [ ] For FE apps: count the visible table columns against `@UI.LineItem` - if fewer than expected, check console for `PropertyInfo validation is disabled` (see fiori-elements.md §4)
- [ ] For FE apps: open every `SelectionFields` value help dialog and verify only human-readable display columns are visible (no raw UUID values)
- [ ] For FX apps: expand the shell navigation sidebar and confirm every nav item shows a text label alongside its icon
- [ ] For WC4R/FX apps: each page has exactly one scrollbar (no nested scroll containers creating double scrollbars)
- [ ] **SV-9 field sweep (DV confirmation):** For every visible table and form: run Q1-Q5 from SV-9 above against the live rendered output. Static review of source code is not sufficient - verify the actual rendered values in the browser snapshot.

---

### DV-6: Task queries - data correctness verification

This check confirms that the data displayed in the UI matches the actual data in the CAP backend. It catches binding path mismatches, wrong `$filter` expressions, aggregation errors, and data truncation that would not appear in console errors.

**Protocol:**

1. Fetch a known set of records directly from the CAP OData endpoint:
   ```
   # Using the network request tool - make a direct OData request:
   navigate_page(type="url", url="http://localhost:<PORT>/<servicePath>/<EntitySet>?$top=5&$orderby=<keyField> asc")
   ```
   Or use `get_network_request` to inspect a request already made by the app.

2. Note 2-3 specific values from the response (e.g. a title, a count, a status).

3. Check those values appear correctly in the rendered UI:
   ```
   take_snapshot()
   # Look for the expected values in the snapshot text
   ```

Specific checks per view type:

**List / table views:**
- [ ] The total record count shown in the table header matches `@odata.count` from the OData response (or the actual row count if `$count` is not requested)
- [ ] The first visible row's key field value matches the first record in the OData response (same sort order)
- [ ] If the app shows a "filtered" count (e.g. "3 of 150 items"), verify the OData request has the correct `$filter` and the count is accurate

**Overview / analytics views (charts, KPI cards, progress bars):**
- [ ] Each chart or KPI value is traceable to an OData aggregation query - fetch the same `$apply` URL directly and confirm the values match what is displayed
- [ ] **CRITICAL - KPI values must be verified against direct OData `$count`/`$apply` requests.** A KPI tile showing "602 Open" must be verified by fetching `$filter=IsActiveEntity eq true and status_code eq 'O'&$count=true` (or the equivalent `$apply`) and confirming the displayed number matches. A mismatch indicates client-side aggregation on truncated data (see `react-cap-shared.md §13`).
- [ ] No chart segment is labelled with a raw code value (e.g. bar chart shows "N" instead of "New")
- [ ] Progress indicator percentage matches the underlying ratio (e.g. 3 of 10 = 30%, not 3%)
- [ ] **No `$top`-limited client-side aggregation:** Confirm that Overview/Stats/Report KPIs use server-side `$apply` or `$count`, not `array.length` or `array.filter().length` on a `$top`-limited fetch. A `$top` value lower than the total record count produces permanently wrong analytics.

**Detail / object page views:**
- [ ] Navigate to a detail record and verify its displayed fields match the OData single-entity response
- [ ] Navigation property fields (e.g. author name on a book detail) are populated, not blank
- [ ] Draft-aware detail views: edit mode shows draft values, display mode shows active entity values

**Report / print views:**
- [ ] All data visible in the report matches data retrievable via the same OData query
- [ ] No truncation - all rows are displayed (check if `$top` has been applied that limits report output)

---

### DV-7: Interaction smoke test

Navigate to a detail record:
```
take_snapshot()
# Find a row element UID
click(uid="<row-uid>")
take_screenshot()
list_console_messages(types=["error"])
```

- [ ] **Row click is required - not just verifying the route exists.** Execute `click(uid='<first-data-row>')` and confirm the detail view title/header changes to reflect the selected record. A route defined in `manifest.json` is not sufficient evidence - the navigation must be exercised and the detail view must render the correct record.
- [ ] Detail view opens (no blank page, no navigation error)
- [ ] Detail view shows the correct record (not blank, not showing a different record's data)
- [ ] No new console errors after navigation
- [ ] If the app has an edit flow: open edit mode and verify form fields are pre-populated with current values
- [ ] All navigation buttons (Edit, Create, Delete) have matching routes defined in the router config - any button that navigates to an undefined route produces a blank page with no console error

**DV-7b: All-pages verification (must check every page, not just overview/list):**

After DV-7, navigate to EVERY page in the app (Overview, List, Detail, Report, and any 4th page). For each page:

```
navigate to the page
take_screenshot()
list_console_messages(types=["error","warn"])
```

- [ ] **Report/print pages:** Scroll to the bottom - verify no double scrollbars (FX/WC4R report pages inside scrollable containers often have nested scroll contexts)
- [ ] **Report/print pages:** All data is visible without truncation; `$top` limit is not silently applied
- [ ] **Report/print pages - MANDATORY print-preview check:** Open the browser print preview (`Ctrl+Shift+P` / `Cmd+Shift+P` or `evaluate_script("window.print()")`). Take a screenshot of the print preview. Verify: **(a)** all table rows visible across pages - not clipped to one viewport height, **(b)** column headers on page 1, **(c)** no horizontal scrollbar, **(d)** no side navigation / shell bar visible in the print output (navigation must be `display:none` under `@media print`), **(e)** content fits A4 width. **This check cannot be marked PASS from code inspection alone -- a print preview screenshot is required evidence.** A report that passes scroll-to-bottom but clips or shows navigation in print preview is a FAIL.
- [ ] **Overview/analytics pages:** Charts and KPI values have human-readable labels (no raw codes, no `(None)` labels from `$apply` groupby navigation paths)
- [ ] **All pages:** Column headers in tables are fully visible and horizontally aligned (misalignment indicates broken `%`-height chain in AnalyticalTable)
- [ ] After checking all pages, run a final `list_console_messages(types=["error"])` - confirm no new errors from page navigation
- [ ] **Cross-navigation - BLOCKING:** Click every KPI tile and every chart segment on the Overview page. Each must navigate to a filtered list view - not an unfiltered list, and not back to the Overview. An onClick that navigates to the current page is not acceptable.
- [ ] **Overview chart completeness:** Every chart and KPI tile on the Overview page must have an onClick handler. If some are clickable and others are not, that is a consistency violation.
- [ ] **Four-part cross-navigation contract (all four parts required - PART 2 is the most commonly skipped):**
 - PART 1: Click a chart segment or KPI tile. Confirm the browser URL contains a filter parameter (`evaluate_script("window.location.href")` before AND after the click - the URL must change).
 - PART 2 - BLOCKING: Immediately after navigation, call `list_network_requests(resourceTypes=["fetch","xhr"])`. Confirm `$filter=` is present in the OData request URL with the correct filter value (e.g. `status_code%20eq%20'N'`). **A list that shows data but issued an unfiltered OData request = FAIL.** Data appearing on screen after a chart click is NOT sufficient evidence - the OData request must be inspected. An EventBus-based filter that fires after `_onRouteMatched` clears all filters will show data but issue an unfiltered request.
 - PART 3: Take a snapshot (`take_snapshot`). The filter Select control for the active dimension must show the filtered value, not "All ...". A Select showing "All ..." when a filter is active = FAIL.
 - PART 4: Identify how the user knows the view is filtered. If the filter control is not visible by default, there must be a filter chip, badge, or count in the title. No visible indicator = FAIL.
 - Clear the filter. Confirm the OData request is re-issued without `$filter=` and the full unfiltered count is restored.
- [ ] **Terminal-status edit guard (BLOCKING for apps with status workflow):** Navigate to a record in a terminal/closed status (Closed, Resolved, Rejected, Cancelled - whichever applies to this domain). Take a snapshot. Assert that the Edit button is either absent from the snapshot OR has a `disabled` attribute. If Edit is present and enabled on a terminal-status record, it is a blocking defect - clicking it will either open an edit form that cannot be saved (because the backend rejects edits on closed entities) or silently fail. Fix: add a status check in the edit handler and show a `MessageToast` explaining why editing is blocked.
- [ ] **Filter option completeness:** For each Overview chart filter dimension, verify the corresponding list page filter dropdown includes matching options. If the Overview has 4 stock bands, the list page filter must have 4 stock options.
- [ ] **CRUD form completeness (see UXC-031):** For each Create/Edit form, identify all FK select fields. Ask: "Can a user who needs a new [referenced entity] accomplish that from this form?" If not, flag as a UX defect.

---

## DT-U: Usability Testing

Usability testing evaluates whether a user can actually accomplish their goals using the app, not just whether the app renders correctly. It requires a running app, sample data, and either the agent acting as a simulated user (DT-U-A) or a human user (DT-U-H).

Load `testing-protocol.md` for the full file format specifications for the testing/ project folder.

---

### DT-U-A: Agent-simulated usability testing

The agent plays the role of a simulated end user: it navigates using only what is visible on screen, follows the expected paths from Clicky.md, and records whether each task is achievable.

#### Prerequisites

1. `testing/intent.md` exists with at least one use case defined
2. `testing/Clicky.md` exists with at least 5 tasks, each with a verified correct answer
3. The app is running and sample data is loaded
4. Chrome DevTools MCP is connected

If Clicky.md does not exist, generate it first (see DT-U-A-0 below).

#### DT-U-A-0: Task suite generation (run once, reuse across rounds)

```
For each use case in intent.md:

Step 1 - Generate tasks
  For each task, define ALL of:
 - Role: who is performing the task (from intent.md user profiles)
 - Description: what the user is trying to do
 - Question: the specific question the user needs to answer
 - Correct answer: fetch directly from OData to verify
    GET <entitySet>?$apply=... or $count=true or $top=1&$orderby=...
 - Expected path: which pages and interactions lead to the answer
 - Success criteria: what the user must see to know they succeeded

Step 2 - Validate each answer against live data
  For each task: execute the OData query and record the exact answer.
  Discard tasks whose answer cannot be confirmed from the current sample data.

Step 3 - Assign difficulty tier
  Tier 1 (basic, 1-2 clicks): KPI values, counts visible on Overview
  Tier 2 (filtered, 3-4 clicks): find an entity matching a filter criterion
  Tier 3 (cross-entity, 5+ clicks): navigate from one entity to a related entity
  Tier 4 (action, state change): create, edit, or trigger a status transition

Minimum: 5 tasks per use case. Target: 10+. A large suite is cheap to run once generated.
Save to testing/Clicky.md using the format in testing-protocol.md.
```

#### DT-U-A-1: Task execution protocol

For each task T in Clicky.md:

```
1. Reset state
 - Navigate to the app start page (Overview or List home)
 - Clear any filters left from the previous task

2. Execute the task
 - Use ONLY what is visible on screen - no developer knowledge of the data model
 - Follow the expected path from Clicky.md
 - Record every navigation and interaction step

3. Evaluate and record result
   PASS:           Correct answer found via expected path within tier interaction limit
   FAIL-BLOCKED:   Could not complete (navigation missing, filter absent, crash, action unavailable)
   FAIL-WRONG:     App produced an incorrect answer (data defect, binding error, truncation)
   FAIL-EXCESSIVE: Correct answer eventually found but required unreasonable effort
   FAIL-UNCLEAR:   Could not determine whether the correct answer was found

   Tier interaction limits: Tier 1 <=2, Tier 2 <=4, Tier 3 <=7, Tier 4 <=5+confirm

4. On FAIL: create a defect record in testing/defects.md
   | D-NNN | DT-U-A T-NNN | FAIL-type | description | priority | Open | fix needed | T-NNN |
```

#### DT-U-A-2: Defect-fix-retest loop

```
After each test run:
1. Collect all FAIL results
2. Group by type: FAIL-BLOCKED and FAIL-WRONG first (data integrity), then FAIL-EXCESSIVE and FAIL-UNCLEAR (UX)
3. Apply the defect mode chosen at session start:
   - F (fix as found): fixes already applied during the run; list what was fixed, confirm with user, continue
   - B (batch): present defect list  -  "Which of these should I fix? Which are accepted as known limitations?"  -  apply selected fixes
   - R (report only): present defect list; do not fix anything; ask user whether to proceed with another iteration or stop
4. Rerun ONLY the tasks in the Retest field of each fixed defect (not the full suite)
5. Report: "D-NNN fixed - T-NNN now PASS"
6. Repeat until all defects are Fixed or Accepted

Final report format:
  Tasks: [N] total, [N] PASS, [N] FAIL, [N] Accepted
  Pass rate: NN%
  Defects: [N] Fixed, [N] Accepted, [N] Deferred
```

---

### DT-U-H: Human usability testing

The human performs tasks in the running app and reports results. Two modes:

#### Mode A - Agent-provided task sheet (structured)

The agent generates a printable task sheet from testing/Clicky.md:

```
USABILITY TEST TASKS - [App name]
[date]

Please try each task using only the app. Do not look up answers in the data or code.

Task 1 ([Role]): [Question from Clicky.md T-001]
  Your answer: _______________
  Ease: [ ] Easy  [ ] With difficulty  [ ] Could not find it
  Notes: _______________

Task 2 ([Role]): [Question from Clicky.md T-002]
  Your answer: _______________
  Ease: [ ] Easy  [ ] With difficulty  [ ] Could not find it
  Notes: _______________
```

After the human completes the sheet, the agent:
1. Compares each answer against the correct answer in Clicky.md
2. Records results in testing/DT-usability-human.md
3. Raises defects to testing/defects.md for any wrong or hard-to-find answers
4. Reports: "Human testing complete: N/N correct, N difficulty issues"

#### Mode B - Ad hoc (unstructured)

The human explores freely and reports observations. The agent:
1. Records each observation in testing/DT-usability-human.md
2. Classifies using the same FAIL categories as DT-U-A
3. Adds actionable observations to testing/defects.md

---

## Reporting validation results

After all checks complete, present findings in this format:

```
## Validation Report - [App Name] - [Technology]

### Static Validation (SV)
| Check | Status | Finding |
|---|---|---|
| SV-1: Package dependencies | [OK] Pass / [X] Fail | [detail if fail] |
| SV-2: Type consistency | [OK] / [!] / [X] | |
| SV-3: Annotation correctness | [OK] / [X] | |
| SV-4: Clear text display | [OK] / [!] | |
| SV-5: Expression syntax | [OK] / [X] | |
| SV-6: Icon references | [OK] / [X] | |
| SV-7: Print view scrollbars | [OK] / N/A | |
| SV-8: String quality | [OK] / [!] | |

### Dynamic Validation (DV) [if run]
| Check | Status | Finding |
|---|---|---|
| DV-1: App loads | [OK] / [X] | |
| DV-2: Console errors | [OK] 0 errors / [X] N errors | [list errors] |
| DV-3: Console warnings | [OK] 0 warnings / [!] N warnings | [classified list] |
| DV-4: Network requests | [OK] / [X] | |
| DV-5: Data visibility | [OK] / [!] / [X] | |
| DV-6: Task queries | [OK] / [X] | [values checked] |
| DV-7: Interaction | [OK] / [X] | |
| DT-U-A: Agent usability | (v) / x | [N/N tasks pass] |
| DT-U-H: Human usability | (v) / x | [N tasks, difficulty ratings] |

### Findings by severity
[CRITICAL] Crash risk: [list]
[HIGH] Silent data failure: [list]
[MED] UX violation: [list]
[LOW] Minor / informational: [list]

### Recommended fixes
[Ordered list - fix crash risks first]
```

After presenting the report, apply the defect mode chosen at the start of the session:
- **F (fix as found):** fixes will already have been applied during the run; confirm which were fixed and ask if any remaining findings should also be fixed
- **B (batch):** ask "Which of these findings should I fix?" then apply only the selected items in one pass and rerun affected checks
- **R (report only):** present the report as-is; make no changes unless the user explicitly requests one
