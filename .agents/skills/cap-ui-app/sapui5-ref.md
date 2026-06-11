# Freestyle SAPUI5 - Deep Reference Index

**When to load:** When `sapui5.md` does not contain the answer; for debugging control-specific issues; for advanced table sort and form patterns.  
**Tier 1 file:** `sapui5.md`. Load this file additionally for the full findings set.

---

## A. Sortable table columns - sap.ui.table.Table

### A.1 Critical incompatibility

`sap.m.table.columnmenu.QuickSort` is designed for `sap.m.Table` ONLY. When used with `sap.ui.table.Table`, it renders a duplicate second row of non-functional sort buttons (from the control's internal `_quickActions` hidden aggregation). This cannot be worked around - never use `sap.m.table.columnmenu` APIs with `sap.ui.table.Table`.

### A.2 associations vs aggregations in XML views

`headerMenu` on `sap.ui.table.Column` is an **association**, not an aggregation. Nesting controls inline inside an association causes a view parse failure -> blank page.

```xml
<!-- WRONG - blank page (headerMenu is an association) -->
<table:Column>
  <table:headerMenu><cm:Menu>...</cm:Menu></table:headerMenu>
</table:Column>

<!-- CORRECT - reference by ID -->
<mvc:dependents>
  <cm:Menu id="myMenu">...</cm:Menu>
</mvc:dependents>
<table:Column headerMenu="myMenu" ...>
```

### A.3 Verified sort pattern for sap.ui.table.Table

The correct approach: `sortProperty` on each sortable column + native `sort` event + `Select` dropdown:

```xml
<Toolbar design="Transparent">
  <SearchField id="searchField" .../>
  <ToolbarSpacer width="1rem"/>
  <Label text="Sort by:" labelFor="sortSelect"/>
  <Select id="sortSelect" change=".onSortSelectChange">
    <items>
      <core:Item key="" text="(none)"/>
      <core:Item key="name_asc" text="Name (A-Z)"/>
      <core:Item key="name_desc" text="Name (Z-A)"/>
      <core:Item key="price_asc" text="Price (low to high)"/>
    </items>
  </Select>
</Toolbar>

<table:Table id="mainTable" rows="..." sort=".onColumnSort" ...>
  <table:columns>
    <table:Column id="colName" sortProperty="name" width="15rem">
      <Label text="Name"/>
      <table:template><Text text="{name}"/></table:template>
    </table:Column>
    <table:Column id="colPrice" sortProperty="price" width="8rem">
      <Label text="Price"/>
      <table:template><Text text="{price}"/></table:template>
    </table:Column>
  </table:columns>
</table:Table>
```

```typescript
import { Table$SortEvent } from "sap/ui/table/Table";
import Column from "sap/ui/table/Column";
import { SortOrder } from "sap/ui/core/library";  // NOT from deprecated sap/ui/core/SortOrder
import Sorter from "sap/ui/model/Sorter";

onColumnSort(oEvent: Table$SortEvent): void {
  oEvent.preventDefault();                        // prevent table's own client-side sort
  const oColumn = oEvent.getParameter("column") as Column;
  const sSortOrder = oEvent.getParameter("sortOrder") as SortOrder;
  const sSortProperty = oColumn?.getSortProperty();
  if (!sSortProperty) return;

  this._applySort(sSortProperty, sSortOrder === SortOrder.Descending);

  // Update column sort indicators - use setSortOrder() NOT deprecated setSorted()
  (this.byId("mainTable") as Table).getColumns()
    .forEach((col: Column) => col.setSortOrder(SortOrder.None));
  oColumn.setSortOrder(sSortOrder);

  // Sync the Select dropdown
  const sKey = `${sSortProperty}_${sSortOrder === SortOrder.Descending ? "desc" : "asc"}`;
  (this.byId("sortSelect") as Select).setSelectedKey(sKey);
}

_applySort(property: string | null, descending: boolean): void {
  const oTable = this.byId("mainTable") as Table;
  const oBinding = oTable.getBinding("rows");
  if (!oBinding) return;
  const aSorters = property ? [new Sorter(property, descending)] : [];
  oBinding.sort(aSorters);
}
```

---

## B. Form layouts - detailed rules

### B.1 ColumnLayout vs ResponsiveGridLayout

| Layout | Use for | Key constraint |
|---|---|---|
| `ColumnLayout` | Read-only detail views, multi-column | Incompatible with `HBox`/`VBox` in `FormElement.fields` |
| `ResponsiveGridLayout` | Edit forms, explicit label/field proportions | Requires explicit `labelSpan*` and `columnsXL/L/M` |

**`ColumnLayout` + `HBox`/`VBox` in fields causes layout failure.** Use `ResponsiveGridLayout` for any form that puts multiple controls side-by-side inside a `FormElement`.

### B.2 Detail form binding context - must go on the wrapper

Setting `bindingContext` directly on a `Form` produces empty fields. Set it on a parent `Panel` or `VBox` that wraps the form:

```typescript
// In row selection handler:
const selectedContext = oEvent.getParameter("rowContext");  // sap.ui.table.Table
const oPanel = this.byId("detailPanel") as Panel;
if (selectedContext) {
  oPanel.setBindingContext(selectedContext);
  oPanel.setVisible(true);
} else {
  oPanel.setVisible(false);
}
```

Start the detail panel hidden (`visible="false"`) so it does not show empty fields on first load.

---

## C. Additional verified patterns

### C.1 p13n.Engine - column personalisation

```typescript
import Engine from "sap/m/p13n/Engine";
import SelectionController from "sap/m/p13n/SelectionController";
import SortController from "sap/m/p13n/SortController";

Engine.getInstance().register(this.byId("mainTable") as Table, {
  helper: new MetadataHelper([
    { key: "name",  label: "Name",  path: "name"  },
    { key: "price", label: "Price", path: "price" },
  ]),
  controller: {
    Columns: new SelectionController({ targetAggregation: "columns", control: this.byId("mainTable") }),
    Sort:    new SortController({ control: this.byId("mainTable") }),
  }
});
```

### C.2 NavContainer vs Router - when to use each

- `sap.m.NavContainer`: direct push/pop navigation; no URL update; back via `navBack()`
- `sap.m.routing.Router`: URL-bound navigation; browser back works; required for deep links

For a multi-view app exposed via URL, always use Router. NavContainer is for in-page panel-switching.

### C.3 FlexibleColumnLayout - event types

```typescript
import { FlexibleColumnLayout$StateChangeEvent } from "sap/f/FlexibleColumnLayout";

onStateChanged(oEvent: FlexibleColumnLayout$StateChangeEvent): void {
  const sLayout = oEvent.getParameter("layout");
  // layout values: "OneColumn", "TwoColumnsMidExpanded", "ThreeColumnsMidExpanded", etc.
}
```

### C.4 MessageBox confirm for destructive actions

```typescript
import MessageBox from "sap/m/MessageBox";

onDelete(): void {
  const sName = (this.getView()?.getBindingContext()?.getProperty("name") ?? "this item") as string;
  MessageBox.confirm(`Delete "${sName}"? This action cannot be undone.`, {
    title: "Delete",
    actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
    emphasizedAction: MessageBox.Action.DELETE,
    onClose: (sAction: string) => {
      if (sAction === MessageBox.Action.DELETE) this._executeDelete();
    }
  });
}
```

### C.5 ValueState pattern for inline validation

```typescript
// Validate on liveChange, set valueState immediately:
onTitleLiveChange(oEvent: Input$LiveChangeEvent): void {
  const sValue = oEvent.getParameter("value") as string;
  const oInput = oEvent.getSource() as Input;
  if (!sValue.trim()) {
    oInput.setValueState(ValueState.Error);
    oInput.setValueStateText("Title is a required field.");
  } else {
    oInput.setValueState(ValueState.None);
  }
}

// Before save - validate all fields, block if any errors:
_validateAll(): boolean {
  const aControls = [
    this.byId("titleInput"),
    this.byId("priceInput"),
  ] as Input[];
  const bValid = aControls.every(c => c.getValueState() !== ValueState.Error);
  if (!bValid) {
    MessageBox.error("Please fix the validation errors before saving.");
  }
  return bValid;
}
```

### C.6 Table empty state with IllustratedMessage

```xml
<table:Table id="mainTable" rows="{/Items}">
  <table:extension>
    <IllustratedMessage id="emptyState"
      illustrationType="sapIllus-NoData"
      title="No Items Found"
      description="No items match the current filters. Adjust your search and filter settings."
      visible="{= ${/Items}.length === 0 }">
      <additionalContent>
        <Button text="Clear Filters" type="Emphasized" press=".onClearFilters"/>
      </additionalContent>
    </IllustratedMessage>
  </table:extension>
  <!-- columns -->
</table:Table>
```

---

## D. sap.m.Table patterns

### D.1 sap.m.Table grouping

```xml
<Table id="groupedTable" items="{
  path: '/Items',
  sorter: { path: 'category', descending: false, group: true }
}">
  <columns>
    <Column><Text text="Name"/></Column>
    <Column><Text text="Price"/></Column>
  </columns>
  <items>
    <ColumnListItem>
      <cells>
        <Text text="{name}"/>
        <Text text="{price}"/>
      </cells>
    </ColumnListItem>
  </items>
</Table>
```

Grouping with `sap.ui.table.Table` deprecated APIs (`enableGrouping`, `grouped`, `summed`): deprecated since SAPUI5 1.147+. Pre-sort data by group key in the controller instead.

---

## E. TypeScript event types reference

Always use specific typed event classes (available since UI5 1.115):

```typescript
// Imports - specific types
import { Input$LiveChangeEvent, Input$SubmitEvent } from "sap/m/Input";
import { SearchField$SearchEvent, SearchField$LiveChangeEvent } from "sap/m/SearchField";
import { Table$RowSelectionChangeEvent, Table$SortEvent } from "sap/ui/table/Table";
import { Select$ChangeEvent } from "sap/m/Select";
import { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import { List$ItemPressEvent } from "sap/m/List";

// Never reference global names like sap.m.Button - always use import
import Button from "sap/m/Button";
```

---

## F. Common blank page causes - extended

| Cause | Symptom | Fix |
|---|---|---|
| `ColumnLayout` + `HBox`/`VBox` in `FormElement.fields` | Form renders blank or malformed | Use `ResponsiveGridLayout` |
| `headerMenu` association set inline (not by ref ID) | Blank page, view parse failure | Reference by ID via `dependents` |
| `sap.m.table.columnmenu.QuickSort` on `sap.ui.table.Table` | Duplicate non-functional sort row | Remove; use native `sort` event |
| Binding context set on `Form` directly | Detail form always empty | Set on wrapping `Panel` |
| `required`: no `label` `labelFor` on inputs | No visual asterisk, no a11y | Add `<Label labelFor="fieldId">` |
| Library in `manifest.json` but not `ui5.yaml` | HTTP 404 for that library at runtime | Add to both - see §G below |
| `??` operator in XML expression binding `{= ... }` | Runtime `SyntaxError: Unexpected ?` (linter reports false positive) | Use ternary: `${x} ? ${x} : ''` |
| `sap.m.MessagePage` as routing target root | Linter error (deprecated since 1.112) | Use `sap.m.IllustratedMessage` instead |

---

## G. `ui5.yaml` library reconciliation (mandatory after `ui5_create_ui5_app`)

`ui5_create_ui5_app` generates only `sap.ui.core`, `sap.m`, `sap.ui.layout`, and `sap.ui.table` in `ui5.yaml`. Every additional control library requires an entry in **both** `manifest.json -> sap.ui5.dependencies.libs` AND `ui5.yaml -> framework.libraries`.

**Without the `ui5.yaml` entry the library returns HTTP 404 from the local CAP dev server.** `manifest.json` alone is not sufficient.

Full library reference for controls not in the default scaffold:

| Controls | `ui5.yaml` entry | `manifest.json` entry | Notes |
|---|---|---|---|
| `sap.uxap.ObjectPageLayout`, `sap.uxap.ObjectPageSection` | `- name: sap.uxap` | `"sap.uxap": {}` | Independent of `sap.f` |
| `sap.f.FlexibleColumnLayout`, `sap.f.DynamicPage` | `- name: sap.f` | `"sap.f": {}` | Also needs xmlns:f="sap.f" |
| `sap.viz.VizFrame`, `sap.viz.ui5.*` | `- name: sap.viz` | `"sap.viz": {}` | Use dynamic import in TypeScript |
| `sap.ui.unified.FileUploader`, `sap.ui.unified.Calendar` | `- name: sap.ui.unified` | `"sap.ui.unified": {}` | |
| `sap.suite.ui.microchart.*` | `- name: sap.suite.ui.microchart` | `"sap.suite.ui.microchart": {}` | |
| `sap.tnt.SideNavigation`, `sap.tnt.ToolPage` | `- name: sap.tnt` | `"sap.tnt": {}` | SideNavigation outside ToolPage: unsupported |
| `sap.m.upload.UploadSetwithTable` | (part of `sap.m`) | (part of `sap.m`) | Plugin, no extra lib |

**Quickest method:** `npx ui5 add <library-name>` - updates both files automatically.

**Detection:** If a control works in TypeScript but shows a blank pane at runtime with no console error, check `ui5.yaml` first - the library is loading as 404 silently.
