# SAP Fiori Elements - Deep Reference Index

**When to load:** When `fiori-elements.md` does not contain the answer; for full validation of annotation choices; for debugging silent failures in FE apps.  
**Tier 1 file:** `fiori-elements.md` covers the most common patterns. Load this file additionally for the complete findings set.  
**Version:** All findings verified against SAPUI5 1.136.7 unless noted.

---

## A. Full annotation pattern reference (verified working)

### A.1 DataPoint and visualisations

```cds
// Rating stars (always 5-star scale in 1.136.7 - MaximumValue ignored)
@UI.DataPoint#Rating: { Value: rating, MaximumValue: 5, Visualization: #Rating }

// Progress bar
@UI.DataPoint#Progress: {
  Value: completedPercent, TargetValue: { $edmJson: 100 }, Visualization: #Progress
}

// Static green DataPoint in OP header (Criticality 3 = Positive)
@UI.DataPoint#AlwaysGreen: {
  Value: anyField, Title: 'Status',
  Criticality: { $edmJson: 3 },
  CriticalityRepresentation: #WithIcon
}
// Note: { $edmJson: integer } works on DataPoint.Criticality
// but is DROPPED from EDMX on DataField.Criticality (use storedField path instead)

// CriticalityCalculation in LineItem via DataFieldForAnnotation -> DataPoint
// (works in LineItem; does NOT color DataPoints in HeaderFacets - G21)
```

### A.2 Rich field annotations

```cds
// Text arrangement: suppress ID display, show text only
category_ID @Common.Text: category_name @title: {
  $value: category_name, @UI.TextArrangement: #TextOnly
}
// Without @Common.Text on same entity, @Common.TextArrangement is dropped from EDMX

// Connected fields (works in FieldGroup forms, NOT reliably in LineItem columns)
@UI.ConnectedFields#Combined: {
  Template: '{FieldA} / {FieldB}',
  Data: {
    $Type: 'Core.Dictionary',
    FieldA: { $Type: 'UI.DataField', Value: fieldA },
    FieldB: { $Type: 'UI.DataField', Value: fieldB }
  }
}

// Masked display (asterisks matching character length - not true masking)
sensitiveField @Common.Masked: true;
// Edit mode: actual value shown. Display mode: asterisks.
// Character count reveals original length - not true security masking

// Calendar year picker on Integer fields
yearField @Common.IsCalendarYear: true;  // e.g. publishedYear, fiscalYear, releaseYear
// Renders year-only picker in edit mode for Integer type

// Tooltip
someField @Common.QuickInfo: 'Additional context for this field';

// Email link
emailField @Common.IsEmailAddress: true;
// @Communication.Contact requires FLP shell - not renderable in standalone mode
```

### A.3 Bound actions - complete patterns

```cds
// Bound action (shows in entity toolbar - requires row selection):
{ $Type: 'UI.DataFieldForAction', Action: 'ServiceName.myAction' }

// Bound action inline (per-row button in LineItem):
{ $Type: 'UI.DataFieldForAction', Action: 'ServiceName.myAction', Inline: true }

// Bound action in OP footer bar:
{ $Type: 'UI.DataFieldForAction', Action: 'ServiceName.myAction',
  ![@UI.Importance]: #High, Determining: true }

// Action parameter default value:
action myAction(percentage: Integer @UI.ParameterDefaultValue: 10);

// Bound action on composition child: renders in sub-table toolbar
// NOTE: @restrict 'WRITE' does NOT cover bound actions - must list explicitly
// NOTE: FE renders button regardless of server permissions

// InvocationGrouping for draft context:
{ $Type: 'UI.DataFieldForAction', Action: 'ServiceName.myAction',
  InvocationGrouping: #ChangeSet }
```

### A.4 Navigation and cross-app

```cds
// Intent-based navigation - requires FLP shell in ALL placement contexts
// Without FLP: not rendered (Identification strip) or fails with "i.isEmpty" error (LineItem)
{ $Type: 'UI.DataFieldForIntentBasedNavigation',
  Label: 'Open Detail', SemanticObject: 'MyEntity', Action: 'display' }

// @Common.SemanticObject renders semantic link - requires FLP for QuickView popover
// In standalone: navigates away (no QuickView)

// @UI.QuickViewFacets / @Communication.Contact / @Communication.Address
// Only render in FLP context - not testable in standalone mode
```

### A.5 Filtering and selection

```cds
// SelectionVariant: Low must be String even for Boolean properties
@UI.SelectionVariant: { SelectOptions: [{
  PropertyName: isActive,
  Ranges: [{ Sign: #I, Option: #EQ, Low: 'true' }]
}]}

// SelectionVariant NOT valid inside PresentationVariant - use SelectionPresentationVariant:
@UI.SelectionPresentationVariant: {
  Text: 'Active Items',
  SelectionVariant: { $Path: '@UI.SelectionVariant#ActiveOnly' },
  PresentationVariant: { $Path: '@UI.PresentationVariant' }
}

// Silent filter (no token shown) when property not in SelectionFields:
// Data IS filtered, but no filter token appears in filter bar

// RequestAtLeast forces $select for fields used in Criticality, Measures etc:
@UI.PresentationVariant: {
  RequestAtLeast: [severityScore, currency_code],
  Visualizations: ['@UI.LineItem']
}

// HiddenFilter: removes from filter bar but keeps in form, table, header KPIs
computedField @UI.HiddenFilter: true;

// @UI.Importance:#Low on SelectionFields: no effect (does NOT remove from filter bar)
// Use @UI.HiddenFilter: true to remove

// FilterRestrictions.RequiredProperties: Go button NOT blocked in 1.136.7
// Use initialLoad: "Disabled" or server-side enforcement instead
// In Worklist context: table shows "Let's get some results" - user must fill field before Go

// @Capabilities.FilterRestrictions.FilterExpressionRestrictions:
// 'SingleValue' -> exact date picker
// 'SingleRange' -> From/To range input
```

### A.6 Visibility controls (definitive guide)

```cds
// Edit button - correct for draft entities (UpdateRestrictions.Updatable with path is ignored):
@UI.UpdateHidden: { $edmJson: { $Path: 'isApproved' } }   // v
@Capabilities.UpdateRestrictions.Updatable: { $Path: 'isApproved' }  // x silently ignored

// @UI.UpdateHidden at PROPERTY level: silently ignored
// Use @Common.FieldControl for field-level read-only:
someField @Common.FieldControl: { $edmJson: { $If: [{ $Path: 'isLocked' }, 1, 7] } }
// 1=ReadOnly, 7=Mandatory, 3=Optional, 0=Inapplicable

// Delete button dynamic:
@UI.DeleteHidden: { $edmJson: { $Path: 'isLocked' } }
// Multiple @UI.DeleteHidden annotations: last-writer-wins

// @UI.CreateHidden: true - UI only (backend still accepts POST)
// @UI.CreateHidden with cross-association path on composition child:
// FE cannot resolve cross-nav path -> defaults to hidden for ALL records

// @UI.Hidden inline for per-row column visibility:
![@UI.Hidden]: { $edmJson: { $If: [{ $Eq: [{ $Path: 'status' }, 'inactive'] }, true, false] } }

// NavigationRestrictions.InsertRestrictions.Insertable: false on nav property
// -> does NOT just suppress ICR - ALSO blocks loading existing child records
// Use @UI.CreateHidden: true in sub-table control config for ICR-only suppression

// @Capabilities.InsertRestrictions.Insertable: false
// -> hides Create button AND blocks FCL OP navigation (SAPUI5 1.136.7)
// Use @UI.CreateHidden: true for button-only hide
```

### A.7 Composition child patterns

```cds
// Composition children inherit draft - do NOT add @odata.draft.enabled to children
// Bound action on composition child:
@UI.DataFieldForAction on the child entity: renders in sub-table toolbar
// Requires explicit grant - 'WRITE' alone is insufficient

// Navigation-level restrictions (override entity-level):
@Capabilities.NavigationRestrictions: {
  RestrictedProperties: [{
    NavigationProperty: { $NavigationPropertyPath: 'lines' },
    InsertRestrictions: { Insertable: false }  // <- suppresses ICR AND data loading
    // Use @UI.CreateHidden on the sub-table view config instead
  }]
}

// InsertRestrictions.RequiredProperties on composition child:
@Capabilities.InsertRestrictions: { Insertable: true, RequiredProperties: [reviewer, rating] }
// FE marks those fields as required in inline creation rows

// InsertRestrictions.AllowedProperties: whitelist removes non-listed fields from ICR display
@Capabilities.InsertRestrictions: { Insertable: true, AllowedProperties: [reviewer, rating] }
// NOT server-side enforcement - FE display hint only

// InlineCreationRows require at least one existing record to appear
// An empty collection shows no ICR regardless of InsertRestrictions

// @UI.UpdateHidden: true on composition entity also suppresses InlineCreationRows
```

---

## B. Complete FE limitations table (SAPUI5 1.136.7)

| Finding | Impact | Correct approach |
|---|---|---|
| `Action-level @Common.SideEffects` | FATAL crash | Never add SideEffects on bound actions |
| `Entity-level SideEffects with virtual TargetProperties` | Crashes SideEffectsServiceFactory | Only use DB-stored properties in TargetProperties |
| `Duplicate property keys in @UI.LineItem` | PropertyHelper crash | One entry per property key |
| `ValueListWithFixedValues: true` on property with qualified `@Common.ValueList#Q` | FilterField crash | Remove ValueListWithFixedValues from properties with qualified VLs |
| `@Aggregation.ApplySupported` in ALP-only file | LROP crashes when ALP stashed | Move to shared annotation file |
| `variantManagement:"Page"` on ALP | Silent infinite loading | Use "None" or "Control" |
| `CriticalityCalculation` in HeaderFacets DataPoint | Not rendered | Not available in 1.136.7 |
| `@UI.DataPoint.CriticalityLabels` | Ignored universally | Not available |
| `@UI.DataPoint.TrendCalculation` | Not rendered | Not available |
| `@UI.Chart` in `@UI.HeaderFacets` | Not rendered | DataPoints only in headers |
| `DataPoint.MaximumValue` for Rating | Ignored - always 5-star | Hard limitation |
| `@Validation.Minimum/Maximum` on Integer | Not enforced | Use `@assert.range` |
| `@Common.IsUpperCase` | Not enforced | No enforcement |
| `CountRestrictions.Countable: false` | Does not suppress count | FE derives from loaded data |
| `DataField.Criticality: { $edmJson: integer }` | Dropped from EDMX | Use stored field: `Criticality: storedField` |
| `DataField.Criticality` in row-popin | No coloring | Use `@UI.Importance: #High` |
| `@UI.DataFieldAbstract.IconUrl` | Universally ignored | Not available |
| `@Capabilities.ChangeTracking` | No $delta queries | Metadata-only |
| FCL 3-column composition child sub-OP | Shows "New Object" | Known bug; no workaround |
| `@Capabilities.UpdateRestrictions.Updatable` with path on draft entity | Silently ignored | Use `@UI.UpdateHidden` |
| `@UI.UpdateHidden` at property level | Silently ignored | Use `@Common.FieldControl` |
| `@UI.CreateHidden` cross-association path on composition child | Hides for ALL records | Use server-side enforcement |
| `ALP visual filter bar` with `@Common.ValueList#VFxxx + @UI.Chart` | Empty filter bar | Runtime limitation; annotations are correct |
| `@Common.SemanticObject` / IBN links | No QuickView without FLP | FLP required |
| `@PersonalData.IsPotentiallyPersonal` | Metadata only; no UI behavior | GDPR metadata annotation only |
| `GridTable ignores MaxItems` | Ignored (virtual scroll) | Responsive tables respect it |
| `variantManagement:"None" + PV.SortOrder` | User sorts overwritten immediately | Use "Page" for persistence (not on ALP) |
| `@Capabilities.ReadRestrictions.Readable: false on @readonly entity` | Dropped from EDMX | Use @UI.Hidden or service exclusion |
| Virtual field in `@UI.SelectionFields` | Renders as filter, but $filter on virtual -> 501 | Use `@UI.HiddenFilter: true` |
| `@assert.range` on Integer: no FE client-side enforcement | Only enforced at draftActivate | Document expected range in label |
| **`@Measures.ISOCurrency` currency picker is cosmetic - does not write back on Save** [verified-TrialJ-2026-05-27] | Changes to currency via the embedded widget are lost on Save | Remove `@Measures.ISOCurrency`; add explicit `currency_code` field to FieldGroup |
| **Every List Report requires a paired Object Page target** [verified-TrialJ-2026-05-27] | Without one: `creationMode NewPage navigation configuration missing` on load, toolbar broken | Always add an OP target+route even for read-only reports |
| **`showDraftToggle: false` in LR settings not recognised** [verified-TrialJ-2026-05-27] | Editing Status combobox still injected | Use `@Capabilities.NavigationRestrictions: { RestrictedProperties: [{ NavigationProperty: DraftAdministrativeData, FilterRestrictions: { Filterable: false } }] }` |
| **`@Common.SemanticKey` required for named toasts** [verified-TrialJ-2026-05-27] | Without it: "Object created" regardless of TypeName | `annotate service.Entity with @Common.SemanticKey: [fieldName]` |
| **`sap.fe.core.ResourceModel.getProperty()` returns raw strings; no `{0}` substitution** [verified-TrialJ-2026-05-27] | `T_NEW_OBJECT=New {0}` renders as "New {0}" literally | Use static strings; separate i18n file per OP target via `enhanceI18n` |
| **`controlConfiguration` actions silently ignored on qualifier mismatch** [verified-TrialJ-2026-05-27] | Toolbar buttons absent, no error | Key must match `@UI.PresentationVariant.Visualizations` qualifier exactly |
| **`@Core.Computed: true` AND `@Core.ComputedDefaultValue: true` both required to suppress integer key dialog** [verified-TrialJ-2026-05-27] | Either alone leaves the dialog | Both must be present on the key field |
| **`showSendEmail: false` collapses entire Share button in non-Launchpad environments** [verified-TrialJ-2026-05-27] | Share button disappears entirely | Expected behavior - only active option was removed |

---

## C. UX failure patterns (empirically observed)

These are silent UX failures an AI-generated app will reproduce if not explicitly avoided:

| Pattern | Observed behavior | Correct approach |
|---|---|---|
| Bound action result invisible until reload | OP shows stale data; user doesn't know if action worked | `req.notify()` for toast; document reload requirement |
| Unbound function toolbar button | Renders; clicking does nothing | Avoid in 1.136.7 toolbar - no invocation logic present |
| `req.warn()` in `before SAVE` | Save commits; dialog appears after; user cannot cancel | Advisory only; use `req.reject()` to block |
| `@assert.format` raw regex in error | Error message shows `/^[A-Za-z]+$/` verbatim | Always provide `@assert.format.message` |
| `before DELETE` + FE confirm dialog | Two dialogs: FE confirms, server rejects - confusing | Use `@UI.DeleteHidden` path expression instead |
| Multiple validation errors on same property | Appears on every instance (e.g., every row) | One mechanism per field |
| Validation errors do not prevent draft save | Draft saves with errors; user surprised | Use `@assert.*` schema annotations (fire at draftActivate) |
| ALP variantManagement:"Page" hang | Silent infinite loading | Use "None" or "Control" |
| `@WithFixedValues: true` on CAP view entity | "No data" dropdown | Don't use with view entities |
| Filter bar Go fires without required field | `RequiredProperties` not enforced | Server-side enforcement or `initialLoad: "Disabled"` |
| `@assert.range` Decimal: FE shows inline error; Integer: no inline error | Different behavior per type | Document; use label to communicate range |
| `after DELETE` toast timing | Toast may not display (FE navigates first) | Don't rely on delete notifications for UX feedback |
| `before SAVE` + `req.warn()` boundary | Boundary `<= 3` chars triggers; advisory only | Use `req.reject()` for enforcement |
| Criticality color lost in row popin | Compact table "Show More" loses semantic color | Keep critical fields in always-visible columns |
| FCL IBN Title column click | Fails without FLP; row arrow is reliable trigger | Use row arrow; avoid IBN column in standalone |
| **`domElement.click()` does not fire SAPUI5 press handler** [verified-TrialJ-2026-05-27] | Extension controller action that polls DOM and calls `.click()` on toolbar button appears to succeed but navigation/FE action does not fire | Get the SAPUI5 control: `sap.ui.getCore().byId(domBtn.id).firePress()` - this is the only reliable approach |
| **`window.print()` before all rows loaded prints only first 30 rows** [verified-TrialJ-2026-05-27] | FE ResponsiveTable uses `growingScrollToLoad:true` - only 30 rows in DOM; print captures only those | Call `oTable.setGrowingThreshold(500); oTable.requestItems()` then `setTimeout(window.print, 2000)` from the Print button handler |

---

## D. Manifest patterns - complete reference

```json
// OVP cards: MUST use .v4 suffix for OData V4 templates
"template": "sap.ovp.cards.v4.list"
// Without .v4 -> cards silently fail

// ALP variantManagement: "None" | "Control" ONLY (not "Page" - causes hang)
// LROP variantManagement: "Page" | "None" | "Control"

// initialLoad: "Enabled" fires OData query immediately on page load
// initialLoad: "Disabled" forces user to interact with filter bar first

// Table settings reference:
"tableSettings": {
  "type": "ResponsiveTable",      // or "GridTable" (no MaxItems respect)
  "selectionMode": "Multi",
  "enableExport": true,           // Excel export button
  "enablePaste": true,            // Ctrl+V paste (draft only)
  "condensedTableLayout": true,   // reduced row padding
  "rowAction": "Navigation"       // chevron column
}

// ALP chart settings:
"chartSettings": { "showDataLabel": true }

// editableHeaderContent: true -> Header section tab in edit mode
"options": { "settings": { "editableHeaderContent": true } }

// Remove Send Email from Share menu (collapses button entirely in non-Launchpad env):
// [verified-TrialJ-2026-05-27]
"sap.fe": { "app": { "share": { "showSendEmail": false } } }

// Override Object Page "New Object" / "Object created" heading and toast:
// [verified-TrialJ-2026-05-27] Use separate i18n files per OP target; do NOT use {0} placeholders.
// sap.fe.core.ResourceModel.getProperty() returns raw strings - {0} is NOT substituted.
"BooksObjectPage":   { "settings": { "enhanceI18n": "i18n/i18n-books.properties" } }
"AuthorsObjectPage": { "settings": { "enhanceI18n": "i18n/i18n-authors.properties" } }
// i18n-authors.properties:
// T_NEW_OBJECT=New Author
// T_ANNOTATION_HELPER_DEFAULT_HEADER_TITLE_NO_HEADER_INFO=Unnamed Author
```

---

## E. Draft-specific FE patterns

```cds
// WARNING [verified-TrialJ-2026-05-27]: In CAP v9 ApplicationService, only the
// PRIMARY KEY field set in req.data during before/on NEW is actually persisted.
// Non-key fields set here are SILENTLY DISCARDED by the draft composer.
// `after NEW` and `on NEW` are not dispatched by ApplicationService - they are
// handled internally by the draft service layer. This pattern does NOT work for
// pre-filling non-key draft fields in ApplicationService.
// Use before(['NEW','CREATE']) for key assignment (genid) only.
// See cap-ref.md §Q for the correct ApplicationService draft hook patterns.

// Denormalized scalar fields fix filter bar token display for FK fields:
// Use authorName: String @Core.Computed (populated via after READ)
// rather than author/name in SelectionFields

// Read-only projection entity isolates Worklist from draft root:
entity WorklistItems as select from db.Items @readonly { ... }
// Prevents interference with draft state in the main service

// @readonly entity projection as separate service entity:
// cannot share the same draft-enabled entity in a Worklist app
```
