# UX, User Assistance, and Accessibility Standards

**Scope:** Rules that apply to all UI technologies built on SAP CAP. Source: SAP UXC Product Standards (UXC-015, UXC-022, UXC-023, UXC-014), SAP Fiori Design Guidelines, UA-060, and ACC-* / WCAG 2.1 AA.

These rules are project-agnostic. "Books", "Flights", "Incidents" appear only as illustrative examples.

---

## 1. Case rules - master rule

> **Title Case for all short UI texts** (labels, headings, buttons, column headers, panel titles, dialog titles, tab names, tooltips, illustrated message titles).
> **Sentence case for all messages, descriptions, explanations, placeholders, and toast text.**

| Text type | Case | Example |
|---|---|---|
| Button labels | **Title Case** | "New Item", "Select Author", "Mark as Featured" |
| Column headers | **Title Case** | "Created At", "Published Year", "Unit Price" |
| Panel / section titles | **Title Case** | "Filter Items", "Status Overview" |
| Dialog titles | **Title Case** | "New Record", "Delete Item", "Select Category" |
| Tooltips | **Title Case** | "Sort Settings", "Personalise Columns" |
| Tab / anchor names | **Title Case** | "Item Details", "Related Records" |
| Object page section headings | **Title Case** | "Basic Information", "Optional Details" |
| Wizard step names (nouns) | **Title Case** | "Customer", "Payment", "Basic Info" |
| Illustrated message title | **Title Case**, NO period | "No Items Found" |
| Toast messages | **Sentence case** | "Item saved", "3 items deleted" |
| Error / warning messages | **Sentence case** | "Title is a required field." |
| Confirmation dialog body | **Sentence case** | `Delete "Wuthering Heights"? This action cannot be undone.` |
| Placeholder / input prompt | **Sentence case**, no period | "Search by name or category" |
| Illustrated message description | **Sentence case** | "No items match the current filters." |
| Active filter indicator label | **Title Case** | "Active Filters:" not "Active filters:" |
| Card subtitle - short qualifier | **Title Case** | "Last 30 Days", "By Region" |
| Card subtitle - explanation | **Sentence case** | "Sorted by status and date", "3 days ago" |

**Exceptions - always Sentence case:**
- Relative times: "4 days ago", "4 items left"
- Values starting with a number: "3 items selected"

---

## 2. Punctuation rules

### Period
| Rule | Correct | Wrong |
|---|---|---|
| Complete grammatical sentence -> add period | "You don't have authorization to view this page." | "You don't have authorization to view this page" |
| Short-form message -> no period | "Item saved" | "Item saved." |
| Placeholder -> never period | "Search by name" | "Search by name." |
| Illustrated message title -> never period | "No Items Found" | "No Items Found." |
| Dialog title -> never period | "Delete Item" | "Delete Item." |
| Wizard step explanatory text -> add period | "Enter the payment details." | "Enter the payment details" |

### Ellipsis
- **Never** in placeholders, standard action buttons, or menu items that execute directly
- Use `Loading...` if a busy text is required; prefer graphical busy indicator

### Quotation marks
- Always double straight quotes (`"`) - never smart/curly, never single
- Use quotes when referencing a UI label: `Set filters and choose "Go".`
- Use quotes for user-entered values in messages: `"December 25, 2020" is not a working day.`
- Do NOT quote system object IDs or absolute dates: `Purchase order 12345678 was deleted.`

### Colon
- `sap.m.Label` renders the colon automatically - do NOT add `:` to label text strings
- Use after field label when visually separate from the value

---

## 3. Standard action verbs (UXC-015)

| Action | SAP Standard Term | Do NOT use |
|---|---|---|
| Save a new object | **Create** | Add, New, Insert (for new DB records) |
| Add existing item to list | **Add** | Create (for existing items) |
| Persist changes, no workflow | **Save** | Apply, Submit, OK |
| Save + release to workflow | **Submit** | Save (if triggering workflow) |
| Switch to edit mode | **Edit** | Modify, Change, Update |
| Remove from database | **Delete** | Remove (use Remove for de-reference only) |
| De-reference without deleting | **Remove** | Delete |
| Discard unsaved draft | **Discard** | Cancel (Cancel = stop a system function) |
| Stop a system function | **Cancel** | Close |
| Close a dialog | **Close** | Cancel |
| Replicate data | **Copy** | Duplicate, Clone |
| Login | **Sign In** | Log In, Log On, Login |
| Logout | **Sign Out** | Log Out, Log Off, Logout |
| Last step of multi-step process | **Finish** | Done, Complete |
| Expand a list / area | **Show More** | More |
| Collapse a list / area | **Show Less** | Less |
| Confirm information | **OK** | Yes (avoid Yes/No dialogs) |
| Navigate back | **Back** | Return, Go Back |
| Navigate to next step | **Next** | Continue, Proceed |

### Deletion confirmation pattern
```
Dialog heading: "Delete" or "Delete <ObjectType>"
Body:           Delete "<ObjectName>"? This action cannot be undone.
Primary button: "Delete"    (type: Negative/Reject/Secondary for destructive)
Cancel button:  "Cancel"
```
Never use "Are you sure?" as heading. Never use Yes/No buttons.

---

## 4. Message handling (UXC-023)

| Scenario | Control |
|---|---|
| Transient success confirmation | Toast / auto-dismiss MessageStrip |
| Persistent inline error (server validation) | MessageStrip `type="Negative"` or `valueState="Error"` |
| User must confirm before destructive action | `MessageBox.confirm()` or equivalent |
| Warning - user can continue | `MessageBox.warning()` or `valueState="Warning"` |
| Info - no action needed | `MessageBox.information()` or `type="Information"` |

**Never** invent custom message types. **Never** expose HTTP status codes, port numbers, or stack traces in user-facing messages.

```
// [X] Wrong
"Request failed: 400 - E_VALIDATION_ERROR"
"Backend is not running on port 4020"

// [OK] Correct
"Your request could not be completed. Please try again."
"Could not load data. Check your connection and try again."
```

Success messages must not contain "successfully":
```
// [X] "Item saved successfully"
// [OK] "Item saved"
```

---

## 5. Button rules (UXC-022)

- Maximum **one primary** (`type="Emphasized"` / `design="Primary"`) button per page or dialog
- Primary action must appear **before** secondary actions (reading order: left to right)
- Icon-only buttons **must** have a `tooltip` - never use icon-only without accessible label
- All buttons must work in both cozy and compact density
- Do not override button dimensions in CSS

---

## 6. Action placement (UXC-014)

- Page-level actions: at the **top** (page header) or **bottom** (footer toolbar)
- Dialog-level: confirm action is the `endButton`; Cancel is the `beginButton` or a secondary button
- Never embed primary page actions inside form content

---

## 7. Selection list "no filter" option

| Correct | Wrong |
|---|---|
| "All Authors" | "(None)", "(All)", "-- Any --" |
| "All Genres" | "(Not set)", "(Select...)" |
| "All Items" | bare "All" |

For a genuinely empty/unassigned state (not a filter): use `(Not Selected)` or `(Not Assigned)`.

---

## 8. Singular/plural

Never use `(s)`:
```
// [X] "1 item(s) deleted"
// [OK] Two i18n keys:
//    msgItemDeleted   = 1 item deleted
//    msgItemsDeleted  = {0} items deleted
```

---

## 9. No-data text

Always provide a custom no-data message - never leave the default "No data":

```
Rule: state the object type + offer a hint
"No matching items found. Adjust your search or filter settings."
"No records available. Create the first one."
```

---

## 10. Object administration labels

| Correct | Do NOT use |
|---|---|
| Created By | Author, Owner |
| Created On | Created Date, Date Created |
| Changed By | Updated By, Last Editor, Modified By |
| Changed On | Modified Date, Last Updated |

Be consistent within one app. If the app family historically uses "Modified By / Modified At", continue that convention.

---

## 11. Semantic component conventions

Components carry fixed semantic conventions that users apply before reading labels. Violating them actively misleads.

| Component | High value means | Safe for |
|---|---|---|
| Stars / `RatingIndicator` | Good / recommended | Quality, satisfaction, review scores |
| Progress bar | Complete / full | Completion %, capacity used, quota consumed |
| Status Positive (green) | Healthy / succeeded | Stock level, availability, validation pass |
| Status Negative (red) | Problem / failed | Errors, out-of-stock, invalid |
| Trend Up indicator | Growing | Revenue, bookings, growth metrics |

**Never** use a Rating/Stars component for a metric where high value is negative (cost, risk, age, queue depth). Use an `ObjectStatus` with a text tier label, or a `Tag`, instead.

`ObjectStatus` state values carry **fixed accessible labels** that cannot be overridden:
- `Positive` -> "Entry successfully validated"
- `Negative` -> "Invalid entry"
- `Critical` -> "Warning issued"

Only use these states when the domain concept genuinely aligns with form-validation semantics. For domain-specific colour-coded categories (price tiers, severity levels), use `Tag` - it carries visual colour without implying a validation result.

---

## 12. Threshold consistency

When a domain concept (stock level, occupancy, severity) is displayed in multiple places - a list badge, a detail KPI, an overview chart - all places must use the same threshold values.

**Pattern:** Define thresholds in one place and import everywhere:
```ts
// thresholds.ts
export const STOCK_CRITICAL = 5    // red
export const STOCK_REORDER  = 15   // amber
export const OCC_HIGH       = 90   // near capacity
export const OCC_MEDIUM     = 70   // moderate
```

**Test:** After building a feature, ask: *Is there another place in this app that evaluates the same domain concept? Do both use the same numbers?*

---

## 13. No implementation details in user-facing labels

Card subtitles, list headers, section titles, and filter summaries must express business meaning, not query mechanics:

```
// [X] "$filter=status eq 'active' applied"
// [X] "6 items with stock < 15"
// [X] "orderby=bookCount desc"
// [X] "(Part 127)" in a panel title

// [OK] "Active items only"
// [OK] "6 items need restocking"
// [OK] "Sorted by popularity"
```

---

## 14. Accessibility quick checks (ACC / WCAG 2.1 AA)

- [ ] All `<Input>`, `<Select>`, `<StepInput>` in forms and filter bars have an adjacent label with `labelFor` pointing to the control's ID
- [ ] Tables have descriptive column headers and `ariaLabelledBy` referencing a title element
- [ ] All icon-only buttons have a `tooltip`
- [ ] No `outline: none` or `box-shadow: none` in custom CSS - do not override focus styles
- [ ] No custom CSS that sets `width` or `height` on button controls
- [ ] Destructive actions (delete) require explicit `MessageBox.confirm()` before the DELETE request
- [ ] Confirmation dialogs name the object: `Delete "Item Title"?`
- [ ] Error messages name the field and state what to correct: `"Price must be a number between 1.00 and 111.00."` - not `"Invalid entry"`
- [ ] Required field errors use the formulation: `"<Field Label> is a required field."`

---

## 15. L1 Quick Gate - apply after every generation or modification

UX checks:
- [ ] No blank "No data" text - custom no-data string present in every table
- [ ] All destructive actions have `MessageBox.confirm` with the object name
- [ ] Inline validation on required inputs (`valueState`/`valueStateText` or equivalent)
- [ ] Only ONE primary/emphasized button per page
- [ ] Toast messages use object+action: "Item saved", "3 items deleted" - NOT "Operation successful"
- [ ] Filter "no filter" option uses "All [Objects]" - NOT "(None)" or "(All)"
- [ ] Navigation row action uses the standard chevron/navigation affordance
- [ ] **Active filter indicator label uses Title Case: "Active Filters:" not "Active filters:"**
- [ ] **Status/urgency/classification columns use semantic colour coding via SAP CSS variable tokens (ER-UX-1) - not plain unstyled text**
- [ ] **FK fields with >= 2 user-relevant properties in the referenced entity render as interactive Popover, not plain text (ER-UX-2)**
- [ ] **Active filter chips for FK fields display `Name (ID)` when name is known (ER-FORM-4)**

UA checks (scan all strings):
- [ ] No "successfully" in any message
- [ ] Short UI texts (buttons, labels, headers, tooltips, dialog titles) in Title Case
- [ ] Messages, placeholders, error texts in Sentence case
- [ ] No period on dialog titles, headings, illustrated message titles
- [ ] No ellipsis in placeholder texts
- [ ] No `(s)` plural shortcut - separate singular/plural keys
- [ ] Required field messages: `"<Label> is a required field."`
- [ ] Correct action verbs: Delete (not Remove), Edit (not Modify), Save (not Apply), Cancel (not Close), Sign Out (not Log Out)

SAP CSS token traps (scan all inline styles and CSS):
- [ ] **`--sapButton_Active_TextColor` is NEVER used as text colour on a coloured background** - this token resolves to the same blue as `--sapHighlightColor` in SAP Horizon, producing invisible text. Use `--sapButton_Emphasized_TextColor` (white) for text on any filled blue/coloured surface.
  - SV-0 gate: `rg 'sapButton_Active_TextColor' app/**/*.tsx app/**/*.css` -> zero matches adjacent to a `background:` property

Accessibility checks:
- [ ] All form inputs have adjacent labels with `labelFor`
- [ ] Icon-only buttons have `tooltip`
- [ ] No `outline: none` in custom CSS

---

## 16. Multi-currency and data aggregation

When aggregating numeric values (prices, costs, totals) across rows with different `currency_code` values, the result is meaningless - 8000 JPY != 8000 USD.

Options when multi-currency data must be displayed:
1. **Restrict to a single currency** with a `$filter=currency_code eq 'USD'` before aggregating
2. **Show individual values** - do not aggregate across currencies
3. **Display with a disclaimer** if a static exchange rate approximation is used: label it "normalised to USD (approximate rates)"

Never show an aggregated price value without indicating the currency context.

---

## 17. KPI tile and analytics card copy rules

**KPI tile subheaders** must be complete, unambiguous phrases. Fragments that omit the subject are misleading:

| Wrong (fragment) | Correct (complete phrase) |
|---|---|
| "0 seats free" | "Flights with no free seats" |
| "< 15 in stock" | "Items needing restock" |
| "N/A" | Leave blank or use "No data available" |
| "3 items" (ambiguous) | "3 overdue items" or "3 low-stock items" |

Rule: The subheader must answer "what does this number represent?" without requiring the user to already know. Never use bare quantity fragments as subheaders.

**Chart labels and segment names** must be human-readable, not raw codes:

| Wrong | Correct |
|---|---|
| Bar labelled "N" | Bar labelled "New" |
| Segment "(None)" | Exclude from chart, or label "Unclassified" |
| Axis title "stock" | Axis title "Stock (units)" |

---

## 18. UXC-030b: Chart segment colours - every status/category must be visually distinct and use SAP tokens

Every slice, bar, or segment in a chart that represents a named status or category **must have a unique colour**. Using a partial colour map (e.g. only defining colours for 4 of 6 statuses) causes unlisted entries to fall back to a shared `CHART_COLORS` array, silently producing duplicates.

**Rule 1: Define a colour for every possible value in the domain, not just the ones you expect to appear.**

**Rule 2: Use SAP CSS design tokens resolved at runtime via `getComputedStyle`, not hardcoded hex values.** Hardcoded values break theme switching (dark mode, high contrast). The token values below are Morning Horizon defaults - resolving them at runtime makes the chart correct in all themes.

### SAP Horizon token mapping for incident/status colours

> **Note:** The status codes `N/I/A/H/R/C` in the example below are specific to the SAP incidents reference app (New/In Process/Assigned/On Hold/Resolved/Closed). Replace these keys with whatever status codes your specific domain uses - the SAP CSS design token pattern and the `getCssVar` function apply universally.

```tsx
function getCssVar(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

// Semantic status colour mapping - resolves from active SAP theme at runtime
const STATUS_COLORS: Record<string, string> = {
  'N': getCssVar('--sapInformativeColor',     '#0070f2'),  // New - blue
  'I': getCssVar('--sapCriticalColor',        '#e76500'),  // In Process - orange
  'A': getCssVar('--sapChart_OrderedColor_2', '#c87b00'),  // Assigned - amber
  'H': getCssVar('--sapChart_OrderedColor_4', '#df1278'),  // On Hold - magenta
  'R': getCssVar('--sapPositiveColor',        '#256f3a'),  // Resolved - dark green
  'C': getCssVar('--sapNeutralColor',         '#788fa6'),  // Closed - grey-blue
}
```

In React, resolve once after mount using `useMemo`:
```tsx
const STATUS_COLORS = useMemo(() => ({
  'N': getCssVar('--sapInformativeColor',     '#0070f2'),
  'I': getCssVar('--sapCriticalColor',        '#e76500'),
  'A': getCssVar('--sapChart_OrderedColor_2', '#c87b00'),
  'H': getCssVar('--sapChart_OrderedColor_4', '#df1278'),
  'R': getCssVar('--sapPositiveColor',        '#256f3a'),
  'C': getCssVar('--sapNeutralColor',         '#788fa6'),
}), [])
```

### SAP Horizon chart colour tokens (Morning Horizon defaults)

| Token | Default hex | Intended use |
|---|---|---|
| `--sapChart_OrderedColor_1` | `#168eff` | First categorical series |
| `--sapChart_OrderedColor_2` | `#c87b00` | Second categorical series |
| `--sapChart_OrderedColor_3` | `#75980b` | Third categorical series |
| `--sapChart_OrderedColor_4` | `#df1278` | Fourth categorical series |
| `--sapChart_OrderedColor_5` | `#8b47d7` | Fifth categorical series |
| `--sapChart_OrderedColor_6` | `#049f9a` | Sixth categorical series |
| `--sapPositiveColor`        | `#256f3a` | Success / resolved / good |
| `--sapNegativeColor`        | `#aa0808` | Error / high severity / failure |
| `--sapCriticalColor`        | `#e76500` | Warning / in-progress / medium severity |
| `--sapInformativeColor`     | `#0070f2` | Information / new / neutral-positive |
| `--sapNeutralColor`         | `#788fa6` | Neutral / archived / inactive |

**DV check:** After rendering a status/category chart with real data, visually inspect the legend. Every entry must have a unique swatch colour. If any two entries share a colour, add the missing codes to the colour map.

---

## 19. UXC-031: CRUD Create/Edit form - FK field requirements

### 19.1 Live suggestion is mandatory on every FK/lookup field

Every input field in a Create or Edit form that corresponds to a foreign-key association (e.g. `customer_ID -> Customers`, `author_ID -> Authors`, `Agency_ID -> TravelAgencies`, `genre_ID -> Genres`) **must** provide a live-suggestion dropdown populated from the referenced entity set. A plain text input where the user must know and type a raw ID is not acceptable.

**Implementation pattern by technology:**

- **WC4R:** `<Input showSuggestions onSuggest={handler}>` with `<SuggestionItem key={entity.ID} text={entity.name} additionalText={entity.ID}>` children. The `onSuggest` handler fetches `?$filter=contains(tolower(name),tolower('${val}'))&$top=10` and replaces suggestion items.
- **FX:** Native `<input>` with an absolutely-positioned `<ul>` dropdown. Use `onBlur` + `setTimeout(200ms)` to allow `onMouseDown` selection before blur fires. On selection, store the entity ID (not the display name) in state.
- **SAPUI5:** `<Input showSuggestions="true" suggest=".onSuggest">` with controller handler that calls `oInput.removeAllSuggestionItems()`, fetches from the referenced entity, and calls `oInput.addSuggestionItem(new SuggestionItem({ key: entity.ID, text: entity.name }))` then `oInput.suggest()`.

**On selection:** always store the **ID** (key) in the form state, not the display name. The payload POSTed or PATCHed to the service must contain the FK field (e.g. `Agency_ID: '070001'`), not the display name.

**Exception:** Fixed code lists (currency, country, status code, urgency) where the user cannot add new values may use a `<Select>` with pre-loaded options instead of a suggestion input.

### 19.2 Related entity creation path

For every Create or Edit form, apply this check to each FK field:

**Q: Can the user create a new instance of the referenced entity from this form if it does not yet exist?**

If the answer is No, and creating a new referenced entity is a foreseeable user need:
- FAIL - the form must provide one of:
  a) An inline "New [Entity]" button that opens a secondary dialog
  b) A navigation link to the entity's own Create view with a return path
  c) A free-text input if the referenced entity is simple (e.g. a tag or label that is auto-created on use)

The minimum acceptable fallback is a clearly visible "Manage [Entities]" link.

**Exception:** Fixed code lists where users cannot add to them require no creation path.

**Examples:**
- Book Create form with Author field: user must be able to type a new author name (auto-create) or pick an existing one via suggestion - plain ID input is FAIL
- Travel form with Agency field: user must be able to search for an agency by name - raw `070001` input is FAIL
- Incident form with Status select (New/In Progress/Resolved): fixed code list - Select with pre-loaded options is sufficient

**DV check (add to DV-7b):**
For each Create/Edit form: (1) verify every FK field shows a suggestion dropdown when the user types; (2) verify selecting a suggestion populates the correct ID in the form, not the display name; (3) ask "Can a user add a new [referenced entity] if needed?" If not, flag as UX defect.

### 19.3 Inline creation dialog field completeness (ER-FORM-2b) `[verified-TrialJ-2026-05-28]`

When an inline "New [Entity]" dialog is provided (per §19.2), the dialog must expose **all fields that a user would reasonably need to set at creation time**. A dialog with only a "Name" field when the entity has 4-5 meaningful properties is a partial implementation that forces the user to open the entity's full edit view immediately after creation to finish entering the data.

**Rule:** Compare the inline creation dialog fields against:
1. The referenced entity's schema (all non-computed, non-system properties)
2. The entity's own standalone Create/Edit page (if one exists)

Any field present on the standalone page but absent from the inline dialog is a deficiency unless:
- It is auto-populated by the system (managed fields: `createdAt`, `createdBy`, `ID`)
- It is a terminal-state field not relevant at creation time (e.g. `dateOfDeath` for an Author - acceptable to omit at creation)
- It is a FK reference that itself requires a sub-dialog (nested inline creation depth > 1 is not required)

**Minimum field set for an Author inline dialog:**
```
REQUIRED:  name
RECOMMENDED: dateOfBirth, placeOfBirth
ACCEPTABLE TO OMIT: dateOfDeath, placeOfDeath (terminal fields, entered later)
```

**Gate:** For every inline "New [Entity]" dialog: list the entity's schema properties, classify each as required/recommended/omittable, verify the dialog exposes at minimum all required and recommended fields.

**DV check:** Open the inline creation dialog. Count the visible input fields. If the count is 1 (name only) for an entity with 4+ schema properties, flag as incomplete. Verify the created record on the entity's detail page  -  every field set in the dialog should be populated.

---

## 20. UXC-032: Tooltip and popover standards

### When tooltips are REQUIRED

| Situation | What to show |
|---|---|
| Icon-only interactive element (button, link, action) | Action verb: "Create Book", "Delete Selected", "Filter by Status" |
| Text column that truncates due to narrow width | Full untruncated value |
| Status indicator shown as color or icon only (no text label) | Full status label and meaning: "Open - awaiting approval" |
| Abbreviated or coded value (2-letter code, short ID, agency code) | Expanded name: "EA - Easy Air" |
| KPI value shown without denominator context | "N of M total": "602 of 4,133 travels" |
| Interactive chart element where click destination is not obvious | Action description: "Click to view open travels" |

### When tooltips are RECOMMENDED

- Clickable chart segment where the drill-down destination is clear but the exact filter is not
- Clickable list row that navigates to a detail view (tooltip: "Open [entity name] detail")
- Long text fields shown as single-line previews (description, notes): popover with full text

### When tooltips are PROHIBITED

- Tooltip that repeats the visible text verbatim (adds no information)
- Tooltip on static non-interactive column headers that are self-explanatory ("Name", "Status", "Date")
- Tooltip text ending with a period (exception: a complete sentence is required for accessibility clarity)
- Tooltip containing raw IDs, UUIDs, or internal codes
- Tooltip on a control that already has an adjacent visible label showing the same information

### Tooltip content format

- Sentence case (not Title Case)
- Prefer concise noun phrases for data tooltips: "George Orwell, 1903-1950"
- Use action verb phrases for interactive elements: "Filter by this status", "Open travel detail"
- For KPI context: "[N] [entity type] out of [M] total" or "[N]% of total [entity type]"
- Maximum length: one sentence or short phrase; do not use tooltips for long explanations (use a popover instead)

### Popover `headerText` rule `[verified-TrialK-2026-05-29]`

The Popover header is the primary identification space. Use it to identify the specific entity, not to describe the control type.

| Wrong | Correct |
|---|---|
| `headerText="Incident Details"` | `headerText={incident.title}` |
| `headerText="Book Information"` | `headerText={book.title}` |
| `headerText="Travel Record"` | `headerText={travel.description}` |
| `headerText="Customer Details"` | `headerText="Customer Details"` (acceptable when type name IS the only identifier) |

**Rule:** if the Popover shows details about a specific named instance (a particular incident, book, or record), use the instance's own name/title as the header. A generic type label ("Incident Details") wastes the header space and is implied by the context in which the Popover opens.

**Write-time trigger:** any `Popover` or `QuickView` that opens from a row click, entity button, or FK link. Default: `headerText={entity.title ?? entity.name ?? entity.ID}`.

### Technology-specific implementation

**React apps (WC4R/FX):**
| Situation | Implementation |
|---|---|
| Truncated text in table cell | `title` HTML attribute on the `<span>` wrapper |
| Status badge/icon | WC4R: `title` attr on badge; FX: `tooltip` prop on Tag |
| KPI tile | `title` on the card container div |
| Clickable chart bar | recharts `<Tooltip>` component: label + count + "Click to filter" |
| Abbreviated code value | `title` HTML attribute on the cell span |
| Icon-only button | WC4R: `tooltip` prop on Button; FX: `title` attr |

**SAPUI5/FE apps:**
| Situation | Implementation |
|---|---|
| Truncated text in table cell | `sap.m.Text` with `wrapping="false"` and `tooltip="{fieldName}"` binding |
| Status ObjectStatus | `tooltip` prop: full status description |
| KPI tile / NumericContent | `tooltip` on the tile: denominator or comparison value |
| Icon-only toolbar button | `tooltip` prop: action verb |

---

## 21. Search input scope: comprehensive or declared (ER-SEARCH-1)

A search input labeled generically ("Search Authors", "Search Books") MUST search all visible text columns in its table, OR its placeholder MUST explicitly name the field being searched.

**Rule: if placeholder is generic -> filter must be comprehensive.**

| Situation | Correct | Wrong |
|---|---|---|
| Placeholder: "Search Authors" (generic) | `$filter=contains(tolower(name),'x') or contains(tolower(placeOfBirth),'x')` | `$filter=contains(tolower(name),'x')` only |
| Placeholder: "Search by name" (scoped) | `$filter=contains(tolower(name),'x')` alone is fine | N/A - scope is declared |

A user looking at a table with Name, Place of Birth, and Date of Birth columns who sees a "Search Authors" box will try "Devon", "Boston", "1890" and expect to find matching authors. Silently returning zero results when the data exists in a visible column is a broken affordance.

**Checklist item (add to "When generating a filter input"):**
- [ ] If search placeholder is generic, OData `$filter` includes `or contains(...)` for every visible string column; if search is scoped, placeholder names the field(s) (ER-SEARCH-1)

---

## 22. FK fields on Create/Edit: inline creation path required (ER-FORM-2)

When a Create form contains a suggestion input for an FK entity (author, agency, category), the user MUST be able to create that entity **without abandoning the current form**. Provide an adjacent icon button (e.g. `sap-icon://add-contact`) that opens a dialog to create the referenced entity.

Failure to provide this path blocks users: they cannot save the new record because the referenced entity doesn't exist yet, but creating the entity requires navigating away and losing their form data.

| Pattern | Verdict |
|---|---|
| Author suggestion input + adjacent "New Author" dialog button | PASS |
| Author suggestion input alone, no creation path | FAIL |
| Author suggestion input + tooltip "Author must exist - create on Authors page first" | ACCEPTED (absolute minimum; preference is inline) |