# Freestyle SAPUI5 on CAP - Technology Overlay

**Prerequisite files:** `cap-shared.md`, `ux-standards.md`

**For Fiori Elements:** See `fiori-elements.md` (it references this file for setup rules).

**Scope:** Generating or validating a freestyle SAPUI5 app that connects to a CAP OData V4 backend. Annotation-driven Fiori Elements patterns are in `fiori-elements.md`.

---

## 1. Setup (do this before generating any UI code)

The three most common causes of `cds watch` failures with SAPUI5 apps are:
1. `cds-plugin-ui5` not installed - the app folder is never mounted, all requests return 404
2. `@ui5/linter` missing from the app's `devDependencies` - `cds-plugin-ui5` crashes at mount time
3. `@sapui5/types` version mismatch in the CAP root - the plugin loads but fails to resolve types, causing intermittent 404s on the app URL

All three must be confirmed correct before any generation step runs.

### 1.1 Install required packages

Two separate locations require packages:

**At the CAP project root** (run from `<cap-project-root>/`):
```sh
npm install -D cds-plugin-ui5
npm install -D @sapui5/types@<ui5-framework-version>
```

**At the app directory** (run from `<cap-project-root>/app/<app-namespace>/`):
```sh
npm install -D @ui5/linter
```

> **Why `@ui5/linter` must be in the APP directory, not just the CAP root:**
> `cds-plugin-ui5` calls `@ui5/linter` via a `require()` that resolves from the **app directory**, not the CAP root. If `@ui5/linter` is only installed at the CAP root, `cds-plugin-ui5` throws:
> ```
> Error: Cannot find module '@ui5/linter'
> Require stack: .../cds-plugin-ui5/lib/...
> ```
> This crashes `cds watch` entirely - no apps are mounted. Installing `@ui5/linter` at the CAP root alone is not sufficient.
>
> **In a workspace setup:** Both the CAP root AND the app directory need `@ui5/linter`. npm workspace hoisting cannot guarantee the app-relative resolution path that `cds-plugin-ui5` uses. Run `npm install -D @ui5/linter` from inside each app directory.

> **Why `@sapui5/types` version must match the app's SAPUI5 version:**
> `cds-plugin-ui5` reads the SAPUI5 version from `ui5.yaml` `framework.version` and then resolves types from `@sapui5/types@<that-version>` in the CAP root. If the installed version differs (e.g. app uses 1.136.7 but CAP root has 1.120.0 installed), the mount either silently fails or the app URL returns 404. Check the version: `cat app/<ns>/ui5.yaml | grep "version:"` then `cat package.json | grep "@sapui5/types"` - they must match.

### 1.2 App placement

Always create the UI5 app inside `<cap-project-root>/app/<app-namespace>/`.

```
<cap-project-root>/
  app/
    <app-namespace>/          <-- UI5 app here
      webapp/
      ui5.yaml
      package.json            <-- @ui5/linter installed here
  srv/
  db/
  package.json                <-- cds-plugin-ui5 and @sapui5/types installed here
```

Never place the app outside `app/`. Never run `ui5 serve` or `npm start` inside the app subfolder - always run `cds watch` from the CAP project root.

### 1.3 App URL

The app is accessible at `http://localhost:4004/<app-namespace>/index.html`. The CAP launch page at `http://localhost:4004` lists all registered apps.

### 1.4 Verify the setup works before generating any code

Run `cds watch` and check the output for these **three mandatory indicators**. If any is missing, fix it before proceeding:

```
# Indicator 1: CAP service mounted
[cds] - serving CatalogService { at: '/browse' }

# Indicator 2: cds-plugin-ui5 mounted the app (this line MUST appear)
Mounting /com.myorg.myapp to UI5 app .../app/com.myorg.myapp

# Indicator 3: server started on the expected port
[cds] - server listening on { url: 'http://localhost:4004' }
```

**If Indicator 2 is absent:** Use this decision table:

| What `cds watch` shows | Cause | Fix |
|---|---|---|
| No mount line, no error | `cds-plugin-ui5` not installed at CAP root | `npm install -D cds-plugin-ui5` at CAP root |
| Error: `Cannot find module '@ui5/linter'` | `@ui5/linter` missing from app directory | `cd app/<ns> && npm install -D @ui5/linter` |
| Error: `Cannot find module '@ui5/project/...'` or schema error | Incomplete `npm install` in CAP root | `npm install --force` at CAP root |
| Mount line appears but app URL returns 404 | `@sapui5/types` version mismatch | `npm install -D @sapui5/types@<same-version-as-ui5.yaml>` at CAP root |
| App loads but specific `.js` module inside a library returns 404 | npm package for that library is behind `framework.version` (version gap)  -  see §11 Step 4 version-gap diagnosis | `npm list @openui5/<lib>` at CAP root; pin `framework.version` in `ui5.yaml` to the highest version at which the npm package exists |
| Mount line appears but `cds watch` restarts in loop | `ui5-middleware-livereload` in `ui5.yaml` conflicting with CAP | Remove `ui5-middleware-livereload` from `ui5.yaml` server middleware |
| Mount line absent, app has own `node_modules` | App was created outside CAP project; nested modules block plugin resolution | Delete app's own `node_modules`; see §1.5a |

Then verify the app loads:
```sh
# Both must return 200
curl -s -o /dev/null -w "%{http_code}" "http://localhost:4004"
curl -s -o /dev/null -w "%{http_code}" "http://localhost:4004/<app-namespace>/index.html"
```

### 1.5a Adding a standalone-created SAPUI5 app into a CAP project

When a SAPUI5 app was created outside the CAP project (e.g. with `ui5 init`, `npm create @ui5/app`, or Fiori Tools) and is then moved into `<cap-root>/app/<app-namespace>/`, apply these fixes before running `cds watch`:

1. **Delete the app's own `node_modules`.** All UI5 tooling (including `cds-plugin-ui5`) must resolve from the CAP project root. A nested `node_modules` causes `cds-plugin-ui5` to fail silently - the app folder is not mounted and returns 404. **Exception for TypeScript apps:** see §1.5b - TypeScript apps require `ui5-tooling-transpile` to remain in the app's own `devDependencies`; run `npm install --save-dev ui5-tooling-transpile` in the app directory after deleting and reinstalling.

2. **Remove `ui5-middleware-simpleproxy` from `ui5.yaml` if present.** The CAP server handles backend proxying. This middleware conflicts with `cds-plugin-ui5` initialization and prevents the app from being served.

3. **Ensure all required UI5 libraries are listed in `ui5.yaml` `framework.libraries`.** Missing libraries produce silent 404s (see §11 Step 4).

4. **Re-install `@ui5/linter` in the app directory.** The standalone app likely did not have `@ui5/linter` - `cds-plugin-ui5` requires it. Run `npm install -D @ui5/linter` from the app directory.

If the standalone app also has its own `.git` directory, remove it (or it will be treated as a submodule and may confuse workspace resolution).

### 1.5b ui5-tooling-transpile - app needs its own node_modules for TypeScript

When using TypeScript with `ui5-tooling-transpile`, the app's own `node_modules` MUST contain `ui5-tooling-transpile`. The `@ui5/server` middleware resolver walks up from the **app directory**, not the CAP root. Without a local install, the middleware is not found and TypeScript transpilation fails.

```sh
# From the app directory (app/<app-namespace>/)
npm install --install-strategy=nested ui5-tooling-transpile
```

Keep `ui5-tooling-transpile` in the app's own `devDependencies`. Do NOT delete the app's own `node_modules` for TypeScript apps (the §1.5a instruction to delete `node_modules` applies to pure JavaScript apps served via CDN resources only).

### 1.6 Node.js 24 fix

On Node.js 24, TypeScript class fields fail at runtime. Add to every app's `ui5.yaml`:

```yaml
builder:
  customTasks:
 - name: ui5-tooling-transpile-task
      afterTask: replaceVersion
      configuration:
        transformModulesToUI5:
          autoConvertAllExtendClasses: true
```

> **BaseController must use ES6 class syntax [verified TrialK-2026-06-02]:** Earlier versions of this skill stated that `BaseController` must use `Controller.extend()` because `autoConvertAllExtendClasses: true` only converts leaf classes. **This was incorrect and has been superseded.** `ui5-tooling-transpile@3.x` handles ES6 class syntax for all controllers including base classes. Using `Controller.extend()` for `BaseController` causes 100+ TypeScript errors in all subcontrollers (`Property 'getView/byId/getRouter' does not exist on type`). Always use ES6 class syntax  -  see §11 Step 3 mandatory fixes table.
>
> ```typescript
> // CORRECT  -  BaseController as ES6 class
> /** @namespace com.example.controller */
> export default class BaseController extends Controller {
>   getRouter(): Router { return (this.getOwnerComponent() as UIComponent).getRouter(); }
>   getText(sKey: string, aArgs?: string[]): string { /* ... */ }
>   onNavBack(): void { /* ... */ }
> }
>
> // CORRECT  -  Component.ts still uses extend() (different class, not a controller)
> const UIComponent = UIComponentBase.extend("namespace.Component", {
>   init() { UIComponentBase.prototype.init.apply(this, []); /* ... */ }
> });
> export default UIComponent;
>
> // CORRECT  -  Leaf controllers extend the ES6 base class
> export default class List extends BaseController { /* ... */ }
> ```

---

## 2. index.html

Use `ComponentSupport` for initialization - this is the only correct modern pattern:

```html
<script
  id="sap-ui-bootstrap"
  src="resources/sap-ui-core.js"
  data-sap-ui-resource-roots='{"<app.namespace>": "./"}'
  data-sap-ui-on-init="module:sap/ui/core/ComponentSupport"
  data-sap-ui-compat-version="edge"
  data-sap-ui-async="true"
  data-sap-ui-frame-options="trusted">
</script>
```

Never use `sap.ui.getCore().attachInit(...)` or inline `<script>` to bootstrap. Never set `data-sap-ui-async="false"`.

### 2.1 OS dark mode detection

**SAPUI5 (cds-plugin-ui5 served):** When no `data-sap-ui-theme` is set in `index.html`, SAPUI5 automatically uses `sap_horizon` and responds to OS dark mode preference. Do NOT hardcode `data-sap-ui-theme="sap_horizon"` - this overrides the OS preference and breaks dark mode.

**Fiori Elements / CDN-served apps:** FE apps typically hardcode `data-sap-ui-theme="sap_horizon"` in `index.html`. Replace this with a `window["sap-ui-config"]` inline script that detects the OS preference before bootstrap runs:

```html
<!-- Must appear BEFORE the sap-ui-bootstrap <script> tag -->
<script>
  window["sap-ui-config"] = {
    theme: window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "sap_horizon_dark"
      : "sap_horizon"
  };
</script>
<script
  id="sap-ui-bootstrap"
  src="https://sapui5.hana.ondemand.com/1.136.7/resources/sap-ui-core.js"
  data-sap-ui-resource-roots='{"myapp": "./"}'
  ...
></script>
```

Remove `data-sap-ui-theme` from the bootstrap tag - `window["sap-ui-config"].theme` takes precedence and is set before bootstrap reads configuration.

**Never use `@media (prefers-color-scheme: dark)` in CSS** for SAPUI5/FE apps - all colors come from SAP theme CSS custom properties that are only present when the correct theme is loaded. CSS media queries have no effect on theme-driven component colors.

---

## 3. manifest.json

### 3.1 OData data source

URI must be root-relative with trailing slash - never `http://localhost:...`:

```json
"dataSources": {
  "default": {
    "uri": "/browse/",
    "type": "OData",
    "settings": { "odataVersion": "4.0" }
  }
}
```

### 3.2 OData V4 model settings

```json
"models": {
  "": {
    "dataSource": "default",
    "preload": true,
    "settings": {
      "autoExpandSelect": true,
      "earlyRequests": true,
      "operationMode": "Server",
      "httpHeaders": { "Authorization": "Basic <base64user:pass>" }
    }
  }
}
```

> **`httpHeaders` not `headers` -- critical:** The OData V4 model settings parameter for auth headers is `httpHeaders`, NOT `headers`. Using `"headers"` throws `Unsupported parameter: headers` at startup and authentication silently fails. This affects any app that passes credentials via the manifest model config (e.g. services with `@requires`).

### 3.2b `sap.ui5` manifest structure - `flexEnabled` placement

`flexEnabled` must be a direct property of `sap.ui5`, NOT inside `dependencies.libs`. Placing it inside `libs` causes SAPUI5 to interpret `flexEnabled` as a library name and attempt to load `flexEnabled/library.js` (HTTP 404, app crash).

```json
"sap.ui5": {
  "flexEnabled": false,
  "dependencies": {
    "minUI5Version": "1.120.0",
    "libs": {
      "sap.m": {},
      "sap.ui.core": {}
    }
  }
}
```

> **When to set `flexEnabled: true`:** Only set it for apps that use SAPUI5 Flexibility (variant management, UI adaptation). Analysis/dashboard apps that do not use FE templates or Flexibility should set `flexEnabled: false`. Default is `false` when omitted.

### 3.3 Routing - manifest v2.0 keys

`controlAggregation` must be `"pages"`. Every routing target view must use `sap.m.Page` (or another `sap.m.IPage` implementor) as its root element.

> **manifest v2.0 routing keys (SAPUI5 1.110+):** If `_version` is `"2.0.0"` or higher, routing targets must use `"path"` (not `"viewPath"`) and `"name"`/`"id"` (not `"viewName"`/`"viewId"`). Using the old keys produces `[FUTURE FATAL] sap.ui5/routing/targets/viewPath is deprecated` and routing fails.

```json
"routing": {
  "config": {
    "routerClass": "sap.m.routing.Router",
    "type": "View",
    "viewType": "XML",
    "path": "<namespace>.view",
    "controlId": "app",
    "controlAggregation": "pages"
  },
  "routes": [
    { "pattern": "", "name": "list", "target": "list" },
    { "pattern": "items/{itemId}", "name": "detail", "target": "detail" }
  ],
  "targets": {
    "list":   { "id": "list",   "name": "List",   "type": "View", "viewType": "XML" },
    "detail": { "id": "detail", "name": "Detail", "type": "View", "viewType": "XML" }
  }
}
```

> **v1 vs v2 key mapping:**
> | v1 (deprecated) | v2 (current) |
> |---|---|
> | `"viewPath"` in config | `"path"` |
> | `"viewName"` in targets | `"name"` |
> | `"viewId"` in targets | `"id"` |
> | `"viewType"` in targets | `"type": "View", "viewType": "XML"` |

Only declare libraries that are actually used in the app.

---

## 4. View structure - critical rules

### 4.1 The most common cause of a blank page

`sap.m.App.pages` only accepts controls implementing `sap.m.IPage`. These controls cause a blank page if used as the root of a routing target view:

- `sap.f.DynamicPage` (no) - wrap it inside `sap.m.Page`
- `sap.m.VBox` (no) -
- `sap.ui.layout.form.Form` (no) -

Valid root elements: `sap.m.Page` (v)", `sap.m.MessagePage` (v)", `sap.uxap.ObjectPageLayout` (v)"

```xml
<!-- CORRECT -->
<mvc:View xmlns="sap.m" xmlns:mvc="sap.ui.core.mvc">
  <Page id="main" title="My App">
    <content><!-- all content here --></content>
  </Page>
</mvc:View>

<!-- WRONG - blank page -->
<mvc:View xmlns:f="sap.f" xmlns:mvc="sap.ui.core.mvc">
  <f:DynamicPage>...</f:DynamicPage>
</mvc:View>
```

### 4.2 App.view.xml

```xml
<mvc:View controllerName="<namespace>.controller.App"
    xmlns="sap.m" xmlns:mvc="sap.ui.core.mvc">
  <App id="app"/>
</mvc:View>
```

### 4.3 XML namespace declarations

Declare only the namespaces you actually use. Always include:
```xml
xmlns="sap.m"
xmlns:mvc="sap.ui.core.mvc"
xmlns:core="sap.ui.core"
```

---

## 5. Data binding with OData V4

### 5.1 Binding paths

- List binding: `rows="{/EntitySet}"` or `items="{/EntitySet}"`
- Property binding inside a template: `text="{propertyName}"` - no leading `/`
- The unnamed model (`""`) is the OData V4 model - no model name prefix needed

**OData V4 model has no imperative .read() API**

All CAP services use an OData V4 model (`sap.ui.model.odata.v4.ODataModel`). This model does **not** support the OData V2 imperative API. The following V2 methods do **not** exist on a V4 model and will throw `TypeError: oModel.read is not a function`:

```ts
// [X] V2 API - does not exist on OData V4 model
oModel.read("/Books", { success: (data) => { ... } })
oModel.create("/Books", oData, { success: ... })
oModel.update("/Books('id')", oData, { success: ... })
```

**Use instead:**

| Need | Correct V4 approach |
|---|---|
| Display a list | XML binding: `items="{/Books}"` - always prefer this |
| Programmatic read (analytics, charts) | `fetch("/odata/v4/service/Entity?$params")` then set results on a `JSONModel` |
| Create a record | OData V4 list binding `.create()` or draft lifecycle (see §9) |
| Update a record | `oContext.setProperty(...)` + `oModel.submitBatch(groupId)` or draft lifecycle |

```ts
// [OK] Programmatic read for computed analytics - fetch + JSONModel
const r = await fetch("/service/Items?$apply=groupby((category/name),aggregate($count as count))")  // substitute your service path and entity
if (!r.ok) throw new Error(`HTTP ${r.status}`)
const { value } = await r.json()
this.getView()?.setModel(new JSONModel({ items: value }), "chart")
```

### 5.2 Date/time fields - do NOT use explicit type

For `Edm.DateTimeOffset` fields, use plain binding. The OData V4 model reads the type from `$metadata` and formats automatically:

```xml
<!-- CORRECT - model auto-formats from $metadata -->
<Text text="{createdAt}"/>

<!-- WRONG - explicit type causes blank output with OData V4 model -->
<Text text="{ path: 'createdAt', type: 'DateTimeOffset' }"/>
```

### 5.3 Data types for explicit formatting

When explicit formatting is needed for non-date types, use `core:require`:

```xml
<mvc:View core:require="{ Decimal: 'sap/ui/model/odata/type/Decimal' }">
  <Text text="{ path: 'price', type: 'Decimal',
               formatOptions: { style: 'standard', maxFractionDigits: 2 } }"/>
</mvc:View>
```

### 5.4 `$top` is NOT a valid binding parameter - use `changeParameters()`

In UI5 OData V4, `$top` is a **system query option** that cannot be declared inside the XML binding `parameters` block. Doing so causes a runtime error:

```
Error: System query option $top is not supported
```

```xml
<!-- [X] WRONG - $top in binding parameters causes runtime error -->
<Table items="{
    path: '/Books',
    parameters: { $expand: 'author', $top: 9999 }
}">

<!-- [OK] CORRECT - no $top in parameters; set it in controller via changeParameters() -->
<Table id="reportTable" items="{
    path: '/Books',
    parameters: { $expand: 'author' }
}">
```

```js
// Controller: set $top after binding is established
// [OK] Works for sap.m.Table (ODataListBinding)
_onRouteMatched: function () {
    var oBinding = this.byId("reportTable").getBinding("items");
    if (oBinding) {
        oBinding.changeParameters({ $top: 9999 });
    }
}
```

> **sap.ui.table.Table (GridTable) exception:** `changeParameters({ $top: N })` throws `parseAndValidateSystemQueryOption` on `sap.ui.table.Table` rows bindings. For GridTable, do NOT call `changeParameters` to set `$top` - instead use `binding.refresh()` and rely on the model's initial `$top` from the binding parameters, or use `setVisibleRowCountMode` with `RowModeType.Auto` for auto-sizing. Use `sap.m.Table` wherever possible for OData V4 (see §6.4.1).

The same restriction applies to `$skip` and other system query options on `sap.m.Table`. Valid `parameters` keys are: `$expand`, `$select`, `$orderby`, `$filter`, `$$groupId`, `$$updateGroupId`, `$$operationMode`.

---

## 6. Tables

### 6.1 sap.ui.table.Table - always define columns explicitly

A `sap.ui.table.Table` with no column definitions renders as an empty box. Always explicitly define every column:

```xml
<table:Table id="mainTable" rows="{/Items}" selectionMode="None">
  <table:rowMode>
    <rowmodes:Fixed rowCount="10"/>
  </table:rowMode>
  <table:columns>
    <table:Column width="15rem">
      <Label text="Name"/>
      <table:template><Text text="{name}"/></table:template>
    </table:Column>
    <table:Column width="8rem">
      <Label text="Status"/>
      <table:template><Text text="{status}"/></table:template>
    </table:Column>
  </table:columns>
</table:Table>
```


> **Always set `selectionMode="None"` on display-only tables.** The default `selectionMode` is `MultiToggle`, which shows a checkbox column. This is confusing on tables that are not interactive selection lists. Only set `selectionMode="Single"` or `selectionMode="MultiToggle"` when row selection is a required feature.

**sap.ui.table.Table post-filter row count requires a separate `$count` fetch:**
After calling `oBinding.changeParameters({ $filter: ... })` on a `sap.ui.table.Table` rows binding, `oBinding.getLength()` returns the number of locally loaded rows, not the server-side total. `oBinding.getCount()` may return `undefined` if the binding was not created with `$count:true`.

To show the post-filter total in a title or counter badge, issue a separate fetch:
```ts
const url = `/service/Items?$count=true&$top=0&$filter=${encodeURIComponent(filterExpr)}`
const resp = await fetch(url)
const data = await resp.json() as { '@odata.count': number }
const total = data['@odata.count']
```
Alternatively, add `$count: true` to the rows binding parameters and call `oBinding.requestContexts(0, Infinity).then(() => oBinding.getCount())` after the filter change settles.

`visibleRowCount` on `sap.ui.table.Table` is deprecated since UI5 1.119. Use the `rowMode` aggregation:

```xml
<!-- WRONG (deprecated since 1.119) -->
<table:Table visibleRowCount="10" .../>

<!-- CORRECT -->
<table:Table ...>
  <table:rowMode><rowmodes:Fixed rowCount="10"/></table:rowMode>
</table:Table>
```

Required namespace: `xmlns:rowmodes="sap.ui.table.rowmodes"`

### 6.2 visibleRowCount is deprecated - use rowMode

`visibleRowCount` on `sap.ui.table.Table` is deprecated since UI5 1.119. Use the `rowMode` aggregation:

```xml
<!-- WRONG (deprecated since 1.119) -->
<table:Table visibleRowCount="10" .../>

<!-- CORRECT -->
<table:Table ...>
  <table:rowMode><rowmodes:Fixed rowCount="10"/></table:rowMode>
</table:Table>
```

Required namespace: `xmlns:rowmodes="sap.ui.table.rowmodes"`

### 6.3 sap.m.Table vs sap.ui.table.Table

- `sap.m.Table` (`xmlns="sap.m"`) - responsive, uses `items` binding + `ColumnListItem` template
- `sap.ui.table.Table` (`xmlns:table="sap.ui.table"`) - grid, uses `rows` binding + `table:Column` with `table:template`

Do not mix their APIs.

### 6.3b sap.ui.table.Table with rowmodes:Auto MUST be a direct child of Page content (ER-LAYOUT-5) `[verified-TrialK-2026-05-28]`

`rowmodes:Auto` calculates available height by measuring its own DOM element's parent's height. When placed inside a `VBox`, the VBox absorbs the height budget (reporting `height: auto`) and the table has no measurable height to fill - it renders only `minRowCount` rows regardless of how much screen space is available.

**CORRECT pattern - table directly in Page content, no VBox wrapper:**

```xml
<!-- Page must NOT create its own internal scroll container competing with the table -->
<Page id="listPage" title="{i18n>pageTitle}" enableScrolling="false">
  <content>
    <!-- Table DIRECTLY in content - no VBox wrapper -->
    <table:Table id="mainTable" ...>
      <table:rowMode>
        <rowmodes:Auto minRowCount="10"/>
      </table:rowMode>
      ...
    </table:Table>
  </content>
</Page>
```

Move any count/status text to the table's `extension` toolbar, not above the table in a VBox:

```xml
<table:extension>
  <Toolbar>
    <Title text="Incidents" level="H5"/>
    <ToolbarSpacer/>
    <Text text="{listState>/countText}"/>
  </Toolbar>
</table:extension>
```

**WRONG pattern - VBox wrapper starves rowMode=Auto:**

```xml
<!-- WRONG: VBox collapses to content height, table never fills viewport -->
<Page enableScrolling="false">
  <content>
    <VBox height="100%">
      <table:Table>
        <table:rowMode><rowmodes:Auto/></table:rowMode>
      </table:Table>
    </VBox>
  </content>
</Page>
```

Key points:
- `enableScrolling="false"` on Page prevents the Page from adding its own `overflow:auto` scroll container which would compete with the table
- The table MUST be the direct child of `<content>` - no VBox, no Panel, no other wrapper
- Filter bars and toolbars go into the table's `extension` aggregation, not above the table

> **Also: never implement a manual pager alongside `sap.ui.table.Table` with `rowMode=Auto` (S-PROP-54).** `rowMode=Auto` uses the OData V4 binding's built-in threshold mechanism for server-side paging - it automatically fetches more rows as the user scrolls. Calling `oBinding.filter([])` on pager button press does NOT change `$skip`/`$top` and therefore does nothing visible. If pagination controls are genuinely needed, switch to `rowMode=Fixed` with explicit `$skip`/`$top` via `oBinding.changeParameters()`. For most use cases, `rowMode=Auto` with virtual scrolling is correct and no pager is needed.

**Runtime gate:** `evaluate_script("const t=document.querySelector('[id*=\"mainTable\"]'); const r=t?.getBoundingClientRect(); return r?Math.round(r.height/window.innerHeight*100):0")` -> result >= 60.

### 6.3c sap.ui.table column width budget: Actions column must fit within viewport `[verified-TrialK-2026-05-28]`

`sap.ui.table.Table` with fixed column widths does NOT auto-shrink to fit the viewport  -  it creates an internal horizontal scroll container. Columns beyond the viewport are invisible to the user even though the table renders without errors.

**Rule:** Before finalising any column layout, verify: `sum(column widths in rem) × 14px + table margins < viewport width`.

Verify at runtime:
```js
// Chrome DevTools MCP or Playwright:
Math.round(document.querySelector('.sapUiTable').getBoundingClientRect().right - window.innerWidth)
// Must be negative (table right edge is within viewport)
```

If the result is positive, reduce or remove columns. Low-value candidates to drop: Modified At, Created By.

**Action button height fix:** `sap.m.Button` default height is 44px; `sap.ui.table.Table` row height is 32-33px. Buttons overflow the row and are clipped by `overflow: hidden`. Fix: add `class="sapUiSizeCompact"` to the `HBox` containing the action buttons so they render at 32px.

```xml
<!-- WRONG: buttons 44px tall, clipped by 33px row -->
<HBox>
  <Button icon="sap-icon://edit" type="Transparent" press=".onEdit"/>
  <Button icon="sap-icon://process" type="Transparent" press=".onStatusChange"/>
</HBox>

<!-- CORRECT: compact class reduces button height to 32px -->
<HBox class="sapUiSizeCompact">
  <Button icon="sap-icon://edit" type="Transparent" press=".onEdit"/>
  <Button icon="sap-icon://process" type="Transparent" press=".onStatusChange"/>
</HBox>
```



#### 6.4.1 Use `sap.m.Table`, not `sap.ui.table.Table`

`sap.ui.table.Table` with `rowmodes:Auto` creates a fixed-height container with internal scrolling. This prevents full content printing and produces a scrollbar in the print preview.

For report and print views always use `sap.m.Table` + `ColumnListItem`. It renders all rows without a fixed height or internal scrollbar. Remove the `growing` / `growingThreshold` props on the report page - they add a "Load More" button and cap the visible rows. Set `$top=9999` in the binding parameters to ensure all records are fetched.

Also remove `sticky="ColumnHeaders"` from the report table - it enables an internal scroll container that clips content on print.

```xml
<!-- [OK] Report table: sap.m.Table, no growing, no sticky, $top=9999 -->
<Table id="reportTable"
    items="{
        path: '/<YourEntitySet>',
        parameters: {
            $filter: 'IsActiveEntity eq true',
            $orderby: 'createdAt desc',
            $top: 9999
        }
    }"
    mode="None">
```

#### 6.4.2 Print CSS - add `print.css` linked in `index.html`

The SAPUI5 page shell sets fixed heights and `overflow: hidden` on its containers. Without a print stylesheet, `window.print()` clips the output to the viewport and shows a scrollbar in the print preview.

Create a `print.css` file in `webapp/` and link it in `index.html`:

```html
<link rel="stylesheet" href="print.css" media="print"/>
```

Contents: use the **canonical block from `print.md` verbatim**. Do NOT use a shortened
version  -  the canonical block has been iteratively verified across multiple trials and the
inline block below diverges from it. Always load `print.md` before generating any print CSS.

Key points the canonical block covers that are easy to miss when writing from memory:

- `position: static !important` on `.sapTntToolPage`  -  it renders `position: absolute`
  at runtime, which clips all content to one viewport page without this reset [verified TrialK-2026-06-01]
- `width: 100% !important` on all ToolPage layout ancestors  -  required after the side panel
  is hidden so the main content expands to fill the full page width
- `.sapTntToolPageHeaderWrapper`, `.sapTntToolPageHeader`, `.sapTntToolHeader`,
  `.sapTntToolPageAside`, `.sapTntToolPageAsideContent` in the hide-chrome selector list
  (TNT chrome  -  NOT covered by `.sapMPageHeader` or the `SideNavigation` substring match alone)
- `.no-print` utility class in the hide-chrome list
- Pop-in prevention (`display: table-cell !important` on `th`/`td`) and
  font-size calibration per ER-REPORT-1
- `sapMNav` and all ToolPage main content wrappers in the overflow/height reset block

### 6.5 Never use lowercase aggregation names in XML Views

SAPUI5 XML Views treat lowercase element names as HTML elements and attempt to load a corresponding JavaScript module. Using <columns>, <items>, <footer>, etc. as aggregation names inside a control like <List> causes a failed script load error:

```
failed to load 'sap/m/columns.js'
```

This crashes the routing target and produces a blank page with a console error.

**Rule:** Always use the proper aggregation syntax - either the fully qualified aggregation name (<Table.columns>) or place child controls directly as SAPUI5 expects. For sap.m.Table, always use <columns> inside <Table.columns>:

```xml
<!-- WRONG - <columns> treated as HTML element, sap/m/columns.js load fails -->
<List>
  <columns>
    <Column><Label text="Name"/></Column>
  </columns>
</List>

<!-- CORRECT - use sap.m.Table with proper aggregation syntax -->
<Table>
  <columns>
    <Column><Label text="Name"/></Column>
  </columns>
  <items>
    <ColumnListItem>
      <cells><Text text="{name}"/></cells>
    </ColumnListItem>
  </items>
</Table>
```

If you see ailed to load 'sap/m/xxx.js' where xxx matches an aggregation name you used, this is the cause. The fix is always to use the correct SAPUI5 control and aggregation structure, not try to load a missing module.
---

## 7. Forms

Use `sap.ui.layout.form.Form` with an explicit layout. Never use `SimpleForm`:

```xml
<form:Form editable="false">
  <form:layout>
    <form:ColumnLayout columnsM="2" columnsL="3" columnsXL="4"/>
  </form:layout>
  <form:formContainers>
    <form:FormContainer>
      <form:formElements>
        <form:FormElement label="Name">
          <form:fields><Text text="{name}"/></form:fields>
        </form:FormElement>
      </form:formElements>
    </form:FormContainer>
  </form:formContainers>
</form:Form>
```

Default `ColumnLayout` counts: `columnsM="2"`, `columnsL="3"`, `columnsXL="4"`.

For edit forms with label/field proportions: use `ResponsiveGridLayout` with explicit `labelSpan*`.

### 7.1 View/edit mode toggle: use two separate SimpleForm elements `[verified-TrialK-2026-05-28]`

**DO NOT toggle `visible` on individual controls inside a single `FormElement`.** `ColumnLayout` reserves space for all controls (visible and hidden), so labels and fields misalign when some are hidden.

**CORRECT:** Use two separate `SimpleForm (ResponsiveGridLayout)` elements  -  one for view mode (read-only `Text`/`ObjectStatus` controls), one for edit mode (`Input`/`Select` controls). Toggle `visible` on the whole form, not individual controls.

```xml
<!-- View mode form - visible when viewMode=true -->
<form:SimpleForm id="viewForm" visible="{detail>/viewMode}"
    layout="ResponsiveGridLayout" editable="false"
    labelSpanXL="3" labelSpanL="3" labelSpanM="4" labelSpanS="12"
    adjustLabelSpan="false"
    emptySpanXL="4" emptySpanL="4" emptySpanM="0" emptySpanS="0"
    columnsXL="1" columnsL="1" columnsM="1"
    class="sapUiSmallMarginBeginEnd">
  <!-- <core:Title> as direct child creates section separator (not inside <form:title>) -->
  <core:Title text="Basic Information"/>
  <Label text="Title" required="true"/>
  <Text id="txtTitle" text="{title}"/>
  <Label text="Status"/>
  <ObjectStatus text="{status/descr}" state="{path: 'status_code', formatter: '.statusToState'}"/>
  <core:Title text="Administration"/>
  <Label text="Created At"/>
  <Text text="{createdAt}"/>
</form:SimpleForm>

<!-- Edit mode form - visible when viewMode=false -->
<form:SimpleForm id="editForm" visible="{= !${detail>/viewMode}}"
    layout="ResponsiveGridLayout" editable="true"
    labelSpanXL="3" labelSpanL="3" labelSpanM="4" labelSpanS="12"
    adjustLabelSpan="false"
    emptySpanXL="4" emptySpanL="4" emptySpanM="0" emptySpanS="0"
    columnsXL="1" columnsL="1" columnsM="1"
    class="sapUiSmallMarginBeginEnd">
  <core:Title text="Basic Information"/>
  <Label text="Title" required="true" labelFor="inEditTitle"/>
  <Input id="inEditTitle" value="{path: 'title', mode: 'OneWay'}" required="true"/>
  <Label text="Status" labelFor="selEditStatus"/>
  <Select id="selEditStatus" selectedKey="{path: 'status_code', mode: 'OneWay'}" width="14rem">
    <items><core:Item key="N" text="New"/></items>
  </Select>
</form:SimpleForm>
```

Note: `<core:Title>` placed as **direct children** of `SimpleForm` creates section separators. Two `<form:title>` aggregation elements in one SimpleForm  -  the second overwrites the first.

**Only bind `<Input>` controls to scalar writable properties:**
In edit forms, never bind an `<Input>` to a navigation/association property path (e.g. `{author/name}`, `{genre/descr}`). Binding an `<Input>` to a navigation path causes the OData V4 model to create a pending change against the *associated* entity (author, genre), not the current entity. When `submitBatch` runs, CAP may silently reject the PATCH with `Virtual elements are not allowed in expressions` or `400 Bad Request`, leaving the UI believing the save succeeded.

- Use `<Text text="{path: 'author/name'}"/>` for display-only navigation fields (even in edit mode)
- Use `<Input value="{author_ID}"/>` to edit the FK scalar field directly (with suggestion items populated via `onSuggest` - see UXC-031a)
- Never make navigation-path bindings two-way in an edit form

> **Edit form controls that submit via `fetch()` rather than `submitBatch()` must use `mode: 'OneWay'` binding `[verified-TrialK-2026-05-28]`:** If the controller reads form values via `getValue()`/`getSelectedKey()` and submits via `fetch()`, use `{path: 'fieldName', mode: 'OneWay'}`. Two-way binding causes `"Must not change a property before it has been read"` console errors because the OData V4 model rejects write attempts before the binding's first read completes.
> ```xml
> <!-- WRONG: two-way causes "property before it has been read" error -->
> <Input value="{title}"/>
> <Select selectedKey="{status_code}"/>
>
> <!-- CORRECT: OneWay when controller reads values and submits via fetch() -->
> <Input value="{path: 'title', mode: 'OneWay'}"/>
> <Select selectedKey="{path: 'status_code', mode: 'OneWay'}"/>
> ```

> **Edit form `valueState` must be reset on every entry  -  including re-entry [verified TrialK-2026-06-01]:** SAPUI5 `Input` control `valueState` and `valueStateText` are instance-level properties. They persist across route navigations within the same browser session. If a user opens the edit form, triggers a required-field validation error, then navigates away and returns, the error indicators reappear even though the field contains a valid value. The OData binding re-populates the field *value* correctly but does NOT reset `valueState`.
>
> **Fix:** In every code path that enters edit mode  -  both the Edit button handler (`onEdit`) and any `_onRouteMatchedEdit` handler  -  explicitly reset `valueState` to `"None"` on all editable `Input` controls before setting `viewMode: false`:
> ```typescript
> onEdit(): void {
>     this._populateEditFormData();
>     // Reset stale validation state from any previous edit session
>     (this.byId("inEditTitle") as Input)?.setValueState("None");
>     (this.byId("inEditCustomer") as Input)?.setValueState?.("None");
>     // ... other inputs
>     oDetailModel?.setProperty("/viewMode", false);
> }
> ```
> The same reset must be applied in `_bindAndShow` (or equivalent route-match handler) so that direct-URL navigation to the edit route also starts clean. If only `onEdit()` is reset but not the route handler, the bug reappears whenever the user bookmarks or shares the edit URL.

---

## 8. Navigation and routing

### 8.1 Route pattern

```json
"routes": [
  { "pattern": "",               "name": "list",   "target": "list"   },
  { "pattern": "items/{itemId}", "name": "detail", "target": "detail" }
],
"targets": {
  "list":   { "id": "list",   "name": "List"   },
  "detail": { "id": "detail", "name": "Detail" }
}
```

> **Root route alias for direct URL navigation `[verified-TrialK-2026-05-28]`:** If the app root page uses `pattern: ""`, direct navigation to `#/overview` (or any friendly hash) shows "Page Not Found" because the hash doesn't match `""`. Add an alias route with the friendly pattern pointing to the same target, and attach `_onRouteMatched` to both route names:
> ```json
> { "pattern": "",         "name": "overview",      "target": "overview" },
> { "pattern": "overview", "name": "overviewAlias", "target": "overview" }
> ```
> ```ts
> // In onInit():
> this.getRouter().getRoute("overview")?.attachPatternMatched(this._onRouteMatched, this);
> this.getRouter().getRoute("overviewAlias")?.attachPatternMatched(this._onRouteMatched, this);
> ```

### 8.2 Detail controller

```typescript
export default class Detail extends BaseController {
  onInit(): void {
    this.getRouter()
      .getRoute("detail")
      ?.attachPatternMatched(this._onRouteMatched, this)
  }

  _onRouteMatched(oEvent: Route$PatternMatchedEvent): void {
    const { itemId } = oEvent.getParameter("arguments") as { itemId: string }
    this.getView()?.bindElement({
      path: `/Items(${itemId})`,
      parameters: { $$updateGroupId: "auto" }
    })
  }
}
```

`bindElement` path for integer key: `/Items(42)` - no quotes.
`bindElement` path for UUID/string key: `/Items('abc-123')` - with single quotes.
`bindElement` must be called inside `_onRouteMatched`, never in `onInit` directly.

**OData V4 `bindElement` rules:**
- Always use `$expand` (with dollar sign) in `parameters`, never bare `expand`. The bare `expand` key is silently accepted but logs `[FUTURE FATAL] Custom query option expand not supported` and has no actual effect.
- For **draft-enabled entities**, the key predicate MUST include `IsActiveEntity`: `/Items(ID='${id}',IsActiveEntity=true)`  - omitting it returns HTTP 400 from CAP.
- When binding a formatter to a boolean property (`visible`, `enabled`) where the source is an OData string type, add `targetType: 'any'` to bypass automatic type coercion. Without it, OData V4 attempts to convert the raw string to boolean before calling the formatter, causing `FormatException`.

### 8.3 Back navigation

```typescript
onNavBack(): void {
  const sPrev = History.getInstance().getPreviousHash()
  if (sPrev !== undefined) {
    window.history.go(-1)
  } else {
    this.getRouter().navTo("list", {}, true)  // true = replace history entry
  }
}
```

### 8.4 Refresh list on return

The OData V4 model caches list binding results. Refresh on every return to the list view:

```typescript
onInit(): void {
  this.getRouter().getRoute("list")
    ?.attachPatternMatched(this._onRouteMatched, this)
}

_onRouteMatched(): void {
  const oTable = this.byId("mainTable") as Table
  oTable?.getBinding("rows")?.refresh()
}
```

---

## 9. Draft support (when `@odata.draft.enabled` is present)

The composite key changes to `(ID, IsActiveEntity)`. All binding paths and list filters must change.

> **Critical silent failure:** Direct PATCH on the active entity (`IsActiveEntity=true`) is silently accepted by the OData V4 model but **ignored by CAP** - no data is written to the database. The edit/save cycle appears to succeed (no error, UI shows the new value) but the change is lost on the next page load. All writes to draft-enabled entities MUST go through the draft lifecycle: `draftEdit` then PATCH draft then `draftActivate`. Always verify an edit feature by confirming the value persists after a page reload.

### 9.1 List binding - always filter to active entity

```xml
<table:Table
  rows="{path: '/Items',
         filters: [{path: 'IsActiveEntity', operator: 'EQ', value1: true}]}"
  ...>
```

### 9.2 Draft actions - use `.invoke()` not `.execute()` (deprecated since UI5 1.123)

```typescript
private static readonly UPDATE_GROUP = "itemsUpdate"

async onEdit(): Promise<void> {
  const oContext = this.getView()?.getBindingContext() as Context
  const oAction = oContext.getModel().bindContext(
    "ServiceName.draftEdit(...)", oContext,
    { $$inheritExpandSelect: true }
  ) as ODataContextBinding
  await oAction.invoke()
  this.getView()?.bindElement({
    path: `/Items(ID='${this._itemId}',IsActiveEntity=false)`,
    parameters: { $$updateGroupId: Detail.UPDATE_GROUP }
  })
}

async onSave(): Promise<void> {
  const oModel = this.getView()?.getModel() as ODataModel
  await oModel.submitBatch(Detail.UPDATE_GROUP)  // flush pending changes FIRST
  const oContext = this.getView()?.getBindingContext() as Context
  const oActivate = oContext.getModel().bindContext(
    "ServiceName.draftActivate(...)", oContext,
    { $$inheritExpandSelect: true }
  ) as ODataContextBinding
  await oActivate.invoke()
}

async onCancel(): Promise<void> {
  const oModel = this.getView()?.getModel() as ODataModel
  oModel.resetChanges(Detail.UPDATE_GROUP)
  const oContext = this.getView()?.getBindingContext() as Context
  if (oContext) await oContext.delete("$auto")
}
```

---

## 10. i18n

- `appTitle` must be a human-readable name, not the namespace string
- Keep all locale files (`i18n.properties`, `i18n_en.properties`) in sync

---

## 11. Post-generation checklist ("Archer Review Gate")

**Step 0 - call `ui5_get_guidelines` first** (if the MCP tool is available). This must be done before any generation or modification. The rules in this file encode the same constraints, but calling the tool ensures the agent has the latest version.

**Step 1 - service and entity discovery**
- With MCP: call `cds_search_model` to get exact service paths and entity names
- Without MCP: run `cds compile '*' --to serviceinfo` from the CAP project root

**Step 2 - scaffold**
- With MCP (`ui5_create_ui5_app`): use the tool to generate the app scaffold
- Without MCP: create the folder structure and files manually following S2-4 of this file

**Step 3 - apply mandatory fixes immediately after scaffolding**

`ui5_create_ui5_app` has known template defects that appear in **every** generated app. Fix all of these before running `cds watch` or the linter:

| Defect | Generated | Correct | Why it matters |
|---|---|---|---|
| Root element | `sap.f.DynamicPage` | `sap.m.Page` | `sap.f.DynamicPage` is not `sap.m.IPage` - blank screen, no error |
| Table columns | Empty `<table:columns>` | Explicit `<table:Column>` per property | Empty columns renders an empty box |
| Form | `SimpleForm` | `Form` + `ColumnLayout` (M=2, L=3, XL=4) | `SimpleForm` does not support edit/view mode toggling correctly |
| Detail binding | On `detailForm` | On the wrapping `Panel` | Form is never populated with data |
| i18n appTitle | Namespace string | Human-readable title | Raw namespace visible in browser tab and page header |
| Manifest libs | `sap.f` declared | Remove if DynamicPage replaced | Unnecessary library load |
| Date bindings | Not generated | Add `{createdAt}` / `{modifiedAt}` with NO explicit type | Dates stay blank if omitted |
| Form view/edit mode | `editable=false` hides inputs | `editable=false` does NOT switch `<Input>` to `<Text>` visually. In view mode use `<Text>` elements; in edit mode use `<Input>` elements. Do not rely on `editable` alone for read-only appearance. | Users see blank fields in view mode |
| `manifest.json models preload` | `"preload": true` | When using `ui5-tooling-transpile`: set `"preload": false` for all model entries | Harmless warnings but `preload: true` + transpiler = delayed module resolution |
| **`babel-plugin-istanbul` in devDeps** | Present | **Remove immediately** | Causes `@ui5/project` graph resolver crash - `cds watch` will not start |
| **`ui5-middleware-livereload` in devDeps** | Present | **Remove immediately** | Conflicts with `cds-plugin-ui5` initialization |
| **`ui5-coverage.yaml`** | Generated | **Delete immediately** | References `babel-plugin-istanbul`; causes `@ui5/project` schema failure |
| **`ui5-test-runner` in devDeps** | Present | Remove unless test coverage is explicitly needed | Unnecessary dependency; may conflict with linter |
| **`@ui5/linter` missing from app devDeps** | Not generated | **Add: `npm install -D @ui5/linter` in app directory** | `cds-plugin-ui5` crashes at mount time if absent |
| **`BaseController` uses `extend()` pattern** | `Controller.extend("...", { methods })` | `class BaseController extends Controller { methods }` | `extend()` returns `Function` not a typed class  -  all subcontrollers lose type info for `getView`, `byId`, `getRouter`, etc., causing 100+ TS errors. `ui5-tooling-transpile@3.x` handles ES6 class for base controllers. [verified TrialK-2026-06-02] |
| **Test scaffold references non-existent `Main.controller`** | `webapp/test/integration/pages/MainPage.ts` and `webapp/test/unit/controller/Main.qunit.ts` present | Exclude test directories from `tsconfig.json` until real tests are written: add `"./webapp/test/integration/**/*"` and `"./webapp/test/unit/**/*"` to the `exclude` array | Scaffold TS errors cascade and block Gate B, obscuring real errors |
| **Class-level state variables undeclared** | Variables like `_currentPage`, `_totalCount` used without `private` field declarations; constants like `PAGE_SIZE` used without `const` declaration | Add `private _currentPage = 0;` etc. to class body; add `const PAGE_SIZE = 20;` at module level | TS error "Property 'X' does not exist on type 'ControllerName'" on every usage |

The `babel-plugin-istanbul` / `ui5-coverage.yaml` group is the single most common cause of `cds watch` not starting after `ui5_create_ui5_app`. Always remove these before any other step.

Quick fix commands (run from the app directory):
```sh
# Remove the problematic generated files and packages
rm ui5-coverage.yaml
npm uninstall babel-plugin-istanbul ui5-middleware-livereload ui5-test-runner

# Install the required missing package
npm install -D @ui5/linter
```

**Step 4 - `ui5.yaml` library reconciliation (mandatory)**

`ui5_create_ui5_app` generates a `ui5.yaml` with only `sap.ui.core`, `sap.m`, `sap.ui.layout`, and `sap.ui.table`. Every additional library used by the app requires **both**:
- An entry in `manifest.json -> sap.ui5.dependencies.libs`
- An entry in `ui5.yaml -> framework.libraries`

Without the `ui5.yaml` entry, the library returns HTTP 404 from the local CAP dev server - `manifest.json` alone is not sufficient.

Common libraries requiring reconciliation:

| Controls used | Add to `ui5.yaml` | Add to `manifest.json libs` |
|---|---|---|
| `sap.uxap.ObjectPageLayout` | `- name: sap.uxap` | `"sap.uxap": {}` |
| `sap.f.FlexibleColumnLayout`, `sap.f.DynamicPage` | `- name: sap.f` | `"sap.f": {}` |
| `sap.ui.unified.*` (FileUploader, Calendar) | `- name: sap.ui.unified` | `"sap.ui.unified": {}` |
| `sap.suite.ui.microchart.*` | `- name: sap.suite.ui.microchart` | `"sap.suite.ui.microchart": {}` |
| `sap.tnt.*` (SideNavigation, ToolPage) | `- name: sap.tnt` | `"sap.tnt": {}` |

> **npm package version gap  -  404 on an individual module file [verified TrialK-2026-06-01]:** If the app loads and the library itself is present in `ui5.yaml`, but a specific `.js` file within that library returns HTTP 404 at runtime, the cause is a version gap between the `ui5.yaml` `framework.version` and the highest published npm package for that library. UI5 Tooling resolves libraries from `@openui5/<lib>` or `@sapui5/<lib>` npm packages; if the framework version used internally is ahead of the last published npm package, any module file added in the newer internal build is missing from the npm package on disk.
>
> **Diagnosis:** When you see a 404 on a specific `.js` file inside a library that IS declared in `ui5.yaml`:
> 1. Note the library name from the 404 path (e.g. `sap/tnt/items.js` → library `sap.tnt`, npm package `@openui5/sap.tnt`)
> 2. Run `npm list @openui5/<libname>` (or `@sapui5/<libname>`) at the CAP root and note the installed version
> 3. Compare to `framework.version` in `ui5.yaml`  -  if the npm version is lower, the gap is confirmed
> 4. Also check `node_modules/@sapui5/distribution-metadata/metadata.json` for the library's `"version"` field  -  this is the internal build version the distribution expects; if it equals the npm package version, the gap is in a different library
>
> **Fix:** Pin `framework.version` in `ui5.yaml` to the highest version at which a matching npm package exists. Alternatively, replace the library's controls with equivalents from a library that has no version gap (e.g. `sap.m`).
>
> **Worked example  -  `sap.tnt` [verified TrialK-2026-06-01]:** `@openui5/sap.tnt` is published up to `1.148.0`. The SAPUI5 1.148.1 distribution references `sap.tnt` version `1.148.0` internally (GAV `com.sap.ui5:tnt:1.148.0:jar`), but during the first `cds watch` run the package was not yet in `node_modules` and was being fetched live, causing a transient HTTP 404 on `sap/tnt/items.js` during the restart loop. Pin `framework.version: "1.148.0"` in `ui5.yaml` to use the fully-installed npm package. At `1.148.0` with the package cleanly installed, no 404 occurs.
>
> **`sap.viz` correction:** `sap.viz` IS available from the `@sapui5/sap.viz` npm package (in the `@sapui5` namespace, not `@openui5`) and CAN be used with `cds-plugin-ui5`. Add it to `ui5.yaml framework.libraries` like any other library. Note: the bundle is large and will increase initial load time. The MIME type error seen when using CDN-served `sap.viz` while serving the app locally is a configuration problem (CDN vs. local mismatch), not a fundamental incompatibility.
>
> **VIZ chart XML namespaces - correct split (critical):** The VIZ library uses two separate namespaces that are frequently confused. Always declare them separately:
> ```xml
> xmlns:viz="sap.viz.ui5.controls"
> xmlns:data="sap.viz.ui5.data"
> xmlns:feeds="sap.viz.ui5.controls.common.feeds"
> ```
> - `data:FlattenedDataset`, `data:DimensionDefinition`, `data:MeasureDefinition` - all from `sap.viz.ui5.data`
> - `feeds:FeedItem` - from `sap.viz.ui5.controls.common.feeds` (NOT from `sap.viz.ui5.data`)
>
> Mixing these (e.g. using `data:FeedItem`) causes silent blank charts or `Object [object Object] is not valid for aggregation feeds` at runtime. The two namespaces must always be declared separately.
>
> **`sap.viz` bar/column chart - minimum height to avoid label suppression:**
> `sap.viz` automatically suppresses Y-axis (or X-axis for horizontal bars) category labels when the chart is too small for all labels to fit without overlap. The suppression is silent - the chart renders with some bars having no label, not with an error. Rule: allocate **at least `N x 25px + 80px`** of height where `N` is the number of categories (e.g. 10 categories -> 330px minimum, 15 categories -> 455px minimum). Set this via `height` on the `VizFrame` or its container.
>
> **`sap.viz` click handler - use `attachSelectData`, NOT `press` (ER-CHART-1):**
> sap.viz `VizFrame` does NOT fire a `press` event. It fires a custom `selectData` event when the user clicks a bar, segment, or data point. A VizFrame with no event subscription is silently non-interactive. After setting the chart model data, wire the handler in the controller:
> ```ts
> private _wireChartClick(chartId: string, filterKey: string): void {
>   const frame = this.byId(chartId) as unknown as {
>     attachSelectData?: (fn: (e: object) => void) => void
>   };
>   frame?.attachSelectData?.((e) => {
>     const val = (e as {getParameter:(k:string)=>Array<{val:string}>})
>       .getParameter("data")?.[0]?.val;
>     if (val) {
>       const pf = this.getOwnerComponent().getModel("preFilter") as JSONModel;
>       pf?.setData({ [filterKey]: val });
>       this.getRouter().navTo("list");
>     }
>   });
> }
> // Call once after _loadCharts() sets the JSONModel data:
> this._wireChartClick("chartStockByGenre", "genre");
> this._wireChartClick("chartBooksByAuthor", "author");
> ```
> Gate: `rg "attachSelectData|attachEvent.*selectData" app/**/*.ts` -> at least one match per interactive VizFrame.
>
> ---
> ## sap.viz DEFINITIVE CLICK HANDLER PATTERN `[verified-TrialK-2026-05-28]`
>
> This section documents the complete verified solution after extensive trial-and-error. **Read this entire section before writing any sap.viz click handler. Every mistake listed below was made and verified as broken.**
>
> ### The crash: `Cannot read properties of undefined (reading 'context')`
>
> This crash fires from `sap-viz-info-charts.js _buildEventData` when a user clicks any chart element. It is the most common sap.viz defect and has multiple independent causes that can compound.
>
> ### What NOT to do (each of these causes the crash or broken behaviour)
>
> **DO NOT call `setVizProperties` immediately after `setModel` or `setProperty`.**
> `setProperty` triggers a sap.viz render. `setVizProperties` called during that render rebuilds the interaction layer and invalidates `item.context` on all data items. Any click during or after this invalidation crashes `_buildEventData`.
>
> **DO NOT call `_configureCharts()` from `onInit()`.**
> Wiring `attachRenderComplete` before data arrives means it fires immediately when `setProperty` later triggers a render. If `setVizProperties` is called inside `renderComplete` and the user clicks during the resulting render, `item.context` is undefined. Must call `_configureCharts()` at the end of `_loadCharts()`, after ALL `setProperty` calls.
>
> **DO NOT use `mode: "EXCLUSIVE"`.**
> `"EXCLUSIVE"` fires a deselect event for the previously-selected item when a new item is clicked. `_buildEventData` iterates ALL items in the selection change  -  including the deselected one. If that item was invalidated by a re-render, `context` is undefined and the crash occurs. Use `mode: "SINGLE"` instead  -  it replaces selection silently without a deselect event.
>
> **DO NOT call `vizSelection([])` synchronously inside `selectData` handler.**
> Modifying selection state while sap.viz is processing the selection event crashes sap.viz internally. Must use `setTimeout(() => vizSelection([]), 0)` to defer to after the event completes.
>
> **DO NOT call `setVizProperties` inside `renderComplete` without an `_applyingProps` guard.**
> `setVizProperties` triggers another render, which fires `renderComplete` again, which calls `setVizProperties` again  -  infinite loop. Each iteration invalidates `item.context`. Every click crashes. The guard `if (f._applyingProps) return` with a 500ms timeout reset breaks the loop.
>
> **DO NOT use a single shared model that is replaced with `setModel(new JSONModel(...))` on each route visit.**
> Replacing the model causes a full VizFrame rebind and re-render. Use one model set in `onInit`, updated with `setProperty()` on each visit. `setProperty` only updates data without rebinding, keeping the render cycle controlled.
>
> **DO NOT read `data[0].val` from the `selectData` payload.**
> `.val` is only populated when a `color` feed dimension is present. For bar/line charts without a color feed, `.val` is always `undefined`. Read `data[0].data["DimensionName"]` where `DimensionName` matches the string in `<data:DimensionDefinition name="..."/>` exactly.
>
> **DO NOT omit `interaction.selectability` entirely.**
> Without it, sap.viz uses its default `"multiple"` mode with `plotLassoSelection: true`. The rubber-band drag-selection box appears on mouse movement and clicks.
>
> **DO NOT omit `behaviorType: "noHoverBehavior"`.**
> Without it, sap.viz dims non-hovered bars/slices on mouseover producing a visible flash as the mouse moves over the chart.
>
> ### The working pattern
>
> ```ts
> // ---- In onInit(): single shared model, never replaced ----
> this._viewModel = new JSONModel({ chartStatus: [], chartUrgency: [], ... });
> this.getView()?.setModel(this._viewModel, "overview");
>
> // ---- In _onRouteMatched(): clear stale selections first ----
> private _onRouteMatched(): void {
>   // Clear before data loads - prevents cross-chart context crash on return visit
>   ["chartByStatus","chartByUrgency","chartByCustomer","chartTrend"].forEach(id => {
>     try { (this.byId(id) as any)?.vizSelection?.([]); } catch { /**/ }
>   });
>   void this._loadKpis();
>   void this._loadCharts();
> }
>
> // ---- In _loadCharts(): setProperty first, _configureCharts LAST ----
> private async _loadCharts(): Promise<void> {
>   // ... all fetch calls in parallel ...
>   // ... all setProperty calls for all charts ...
>   this._viewModel.setProperty("/chartStatus", statusItems);
>   this._viewModel.setProperty("/chartUrgency", urgencyItems);
>   // DO NOT call _configureCharts() from onInit() - must be AFTER setProperty
>   this._configureCharts();
> }
>
> // ---- _configureCharts(): the complete wiring ----
> private _configureCharts(): void {
>   const chartIds = ["chartByStatus","chartByUrgency","chartByCustomer","chartTrend"];
>
>   // applyOnRender: wire renderComplete ONCE per frame (_propsWired guard).
>   // _applyingProps guard REQUIRED: setVizProperties triggers another render ->
>   // renderComplete fires again -> infinite loop invalidates context -> crash.
>   const applyOnRender = (id: string, props: object) => {
>     const f = this.byId(id) as any;
>     if (!f || f._propsWired) return;
>     f._propsWired = true;
>     f.attachRenderComplete?.(() => {
>       if (f._applyingProps) return;   // break infinite loop
>       f._applyingProps = true;
>       f.setVizProperties?.(props);
>       setTimeout(() => { f._applyingProps = false; }, 500);
>     });
>   };
>
>   // wireClick: wire selectData ONCE per frame (_clickWired guard).
>   // setTimeout REQUIRED for vizSelection([]) - synchronous call crashes sap.viz.
>   const wireClick = (id: string, dimName: string, cb: (val: string) => void) => {
>     const f = this.byId(id) as any;
>     if (!f || f._clickWired) return;
>     f._clickWired = true;
>     f.attachSelectData?.((e: any) => {
>       const val = e.getParameter("data")?.[0]?.data?.[dimName];
>       if (!val) return;
>       setTimeout(() => {
>         chartIds.forEach(oid => {
>           try { (this.byId(oid) as any)?.vizSelection?.([]); } catch { /**/ }
>         });
>       }, 0);
>       cb(val);
>     });
>   };
>
>   // barProps: mode:"SINGLE" NOT "EXCLUSIVE", behaviorType:"noHoverBehavior",
>   // plotLassoSelection:false, plotStdSelection:true (false breaks clicks entirely)
>   const barProps = {
>     title: { visible: false }, legend: { visible: false },
>     plotArea: { window: { start: "firstDataPoint", end: "lastDataPoint" }, scrollbar: { enable: false } },
>     interaction: {
>       behaviorType: "noHoverBehavior",  // suppress hover flash/dim
>       selectability: {
>         mode: "SINGLE",            // NOT "EXCLUSIVE" - deselect event crashes context
>         plotLassoSelection: false, // suppress rubber-band drag box
>         plotStdSelection: true,    // MUST be true - false breaks single clicks entirely
>         legendSelection: false,
>         axisLabelSelection: false
>       }
>     }
>   };
>
>   applyOnRender("chartByStatus", barProps);
>   applyOnRender("chartByUrgency", { ...barProps, legend: { visible: true } });
>   applyOnRender("chartByCustomer", barProps);
>   applyOnRender("chartTrend", { ...barProps, interaction: { ...barProps.interaction, enableHover: true } });
>
>   // dimName must match <data:DimensionDefinition name="..."/> exactly
>   // payload is data[0].data["DimensionName"] -- NOT data[0].val
>   wireClick("chartByStatus", "Status", (val) => { /* navTo with val */ });
>   wireClick("chartByUrgency", "Urgency", (val) => { /* navTo with val */ });
>   wireClick("chartByCustomer", "Customer", (val) => { /* navTo with val */ });
>   wireClick("chartTrend", "Month", () => { /* navTo list */ });
> }
> ```
>
> ### Why `data[0].val` vs `data[0].data["DimensionName"]`
> The payload shape depends on the feed configuration:
> - Charts with a `color` feed: `data[0].val` is populated
> - Charts without a `color` feed (plain bar/line): `data[0].val` is `undefined`; value is at `data[0].data["DimensionName"]`
>
> Always verify with: `console.log(JSON.stringify(e.getParameter("data")[0]))` on first click.
>
> ### `_propsWired` must be reset on every route re-match [verified TrialK-2026-06-02]
>
> The `_propsWired` guard prevents infinite render loops (correct), but it persists across in-session navigations. If `_configureCharts()` is called from `_onRouteMatched`, the Overview route may be visited multiple times in a session. Without resetting the guard, re-visiting Overview shows "Title of Chart" default titles because `attachRenderComplete` is never re-wired.
>
> **Fix:** Reset `_propsWired = false` and `_clickWired = false` on all chart controls at the start of `_onRouteMatched`, BEFORE calling `_configureCharts()`:
> ```typescript
> private _onRouteMatched(): void {
>     // Reset guards so _configureCharts() re-wires on every visit
>     ["chartByStatus", "chartByUrgency", "chartByCustomer", "chartTrend"].forEach(id => {
>         const f = this.byId(id) as any;
>         if (f) { f._propsWired = false; f._clickWired = false; }
>         try { f?.vizSelection?.([]); } catch { /**/ }
>     });
>     void this._loadKpis();
>     void this._loadCharts();
> }
> ```
>
> ### Selection side-effect on return
> SAPUI5 caches view instances. Clicked bars remain selected when the user navigates away and returns. The `vizSelection([])` in `_onRouteMatched` clears this on each visit. The `setTimeout` clear in `wireClick` clears immediately after navigation. Between these two, selections are cleared on every return and no stale items survive into the next render cycle.

> **`sap.viz` selectability MUST be explicitly enabled for click events to fire (S-PROP-51) `[verified-TrialK-2026-05-28]`:**
> `sap.viz.ui5.controls.VizFrame` silently ignores ALL mouse interactions unless `interaction.selectability.mode` is set in `vizProperties`. Wiring `attachSelectData` is not sufficient alone - clicks are silently dropped without this property. Add it inside `attachRenderComplete`:
> ```ts
> frame?.setVizProperties?.({
>   title: { visible: false },
>   valueAxis: { label: { formatString: "0" } },
>   interaction: {
>     selectability: { mode: "EXCLUSIVE" }   // REQUIRED for click events to fire
>   }
> });
> ```
> This is NOT documented in the standard SAPUI5 API reference and must be added explicitly to every interactive chart.
>
> **`plotStdSelection` MUST remain `true` -- setting it `false` completely disables single-click selection and `selectData` never fires `[verified-TrialK-2026-05-28]`:**
> Only `plotLassoSelection: false` is needed to suppress the rubber-band drag box. Never set `plotStdSelection: false`.
> ```ts
> // CORRECT -- only lasso disabled; standard click still works
> interaction: {
>   selectability: {
>     mode: "EXCLUSIVE",
>     plotLassoSelection: false,  // suppresses rubber-band drag box
>     plotStdSelection: true,     // MUST be true - false breaks single clicks entirely
>     legendSelection: false,
>     axisLabelSelection: false
>   }
> }
> ```
>
> **`selectData` payload structure -- value is at `data[0].data[DimensionName]`, not `data[0].val` `[verified-TrialK-2026-05-28]`:**
> The `getParameter("data")` return value has this shape:
> ```
> [ { data: { "Status": "In Process", "Count": 237, ... }, target: { __data__: {...} }, ... } ]
> ```
> Read the dimension value as `data[0].data["DimensionName"]` where `DimensionName` matches the string set in `<data:DimensionDefinition name="..."/>`. The `.val` property does NOT exist.
> ```ts
> // CORRECT
> const val = e.getParameter("data")?.[0]?.data?.["Status"];
> // WRONG -- val will always be undefined
> const val = e.getParameter("data")?.[0]?.val;
> ```
> Note: `data[0].val` works in the bookstore example because that app uses a `color` feed dimension which produces a different payload shape. Without a `color` feed, `.val` is always undefined.
>
> **Selection must be cleared asynchronously after navigation to prevent accumulated highlights on return `[verified-TrialK-2026-05-28]`:**
> SAPUI5 caches view instances -- the Overview view stays alive when the user navigates away. Any bar clicked before navigation remains visually selected when the user returns. Clearing inside the `selectData` handler synchronously crashes sap.viz (modifying selection state during event processing). Use `setTimeout(() => ..., 0)` to defer the clear to after the event completes:
> ```ts
> f.attachSelectData?.((e: any) => {
>   const val = e.getParameter("data")?.[0]?.data?.[dimName];
>   if (!val) return;
>   // Defer selection clear - synchronous call inside selectData crashes sap.viz
>   setTimeout(() => {
>     chartIds.forEach(id => {
>       try { (this.byId(id) as any)?.vizSelection?.([]); } catch { /* ignore */ }
>     });
>   }, 0);
>   cb(val);
> });
> ```
> Also clear selections at the start of `_onRouteMatched` (before data loads) as a safety net for the cross-chart crash scenario.
>
> **`attachSelectData` accumulates handlers on every route visit unless detached.** Use a module-level registry to replace the previous handler instead of adding a new one:
> ```ts
> const _selectHandlers = new Map<string, (e: any) => void>();
>
> function wireSelectData(oFrame: any, handler: (e: any) => void): void {
>   const id: string = oFrame.getId?.() ?? "";
>   const prev = _selectHandlers.get(id);
>   if (prev) {
>     try { oFrame.detachSelectData(prev); } catch { /* ignore */ }
>   }
>   _selectHandlers.set(id, handler);
>   oFrame.attachSelectData(handler);
> }
> ```
> **Similarly `attachRenderComplete` accumulates on every route visit.** Wire it once per frame instance using a flag:
> ```ts
> if (!oFrame._vizPropsWired) {
>   oFrame._vizPropsWired = true;
>   oFrame.attachRenderComplete(() => {
>     oFrame.setVizProperties({ interaction: { selectability: { mode: "EXCLUSIVE" } } });
>   });
> }
> ```
>
> **`sap.viz` integer-only Y-axis for count measures (ER-CHART-2):**
> When the measure is a count of discrete entities (books, incidents, orders), the Y-axis must use integer ticks only. With small data ranges (e.g. max=3), sap.viz auto-generates fractional ticks (0, 0.5, 1, 1.5, ...) which are factually wrong. Force integer ticks via `setVizProperties`:
> ```ts
> frame?.setVizProperties?.({
>   title: { visible: false },
>   valueAxis: { label: { formatString: "0" } }  // "0" = integer, no decimals
> });
> ```
> Gate: for every `MeasureDefinition` aggregating with `$count`, a corresponding `setVizProperties` with `valueAxis.label.formatString: "0"` must exist.
>
> **`sap.viz` chart container must use relative width, not fixed pixels (ER-LAYOUT-4):**
> Chart panel containers must use percentage widths (`width="48%"`, `width="100%"`) not fixed pixel values like `width="550px"`. Fixed pixel widths cause poor layout at non-standard viewport sizes.
>
> **`sap.viz` bar/column chart -- per-bar distinct colors require a color feed dimension:**
> By default, `sap.viz` renders all bars in a single series using one color from the theme palette. To get a distinct color per bar (e.g. per-status colors in a status distribution chart), add a `color` feed that maps to the dimension:
> ```xml
> <feeds:FeedItem uid="color" type="Dimension" values="{i18n>dimensionName}"/>
> ```
> Without the color feed, setting `plotArea.colorPalette` produces a single-color chart. The color feed is required alongside the standard `categoryAxis` and `valueAxis` feeds.
>
> **`sap/fe/core/AppComponent` vs `sap.ui.core.UIComponent` - use the right base class:**
> - Use `sap.ui.core.UIComponent` (default generated by `ui5_create_ui5_app`) for **all apps with custom XML views** -- analysis apps, dashboards, any app that uses charts or custom layouts.
> - Use `sap/fe/core/AppComponent` ONLY for **pure Fiori Elements apps** that use exclusively FE template pages (ListReport, ObjectPage). Mixing `sap/fe/core/AppComponent` with custom views requires the Flexible Programming Model and `sap.fe.routing.Router`, and causes `Invalid relative path w/o context` blank-page errors with standard routing.
> - When in doubt: if the app has any custom XML view, use `UIComponent`.
>
> **For analytics in locally-served SAPUI5 apps, consider instead:**
> - `sap.suite.ui.microchart` - `MicroBarChart`, `MicroAreaChart`, `RadialMicroChart` for inline sparklines
> - `sap.m.ProgressIndicator` - proportional bar display
> - `sap.m.ObjectNumber` / `sap.m.ObjectStatus` - highlighted KPI values in tables
> - React-based app (WC4R or FX with recharts) - when rich SVG charts are the primary requirement

Or run `npx ui5 add <library-name>` - updates both `ui5.yaml` and `package.json` automatically.

**Step 5 - quality gates and runtime verification**

Run all three gates in this order. A failure in any gate must be fixed before proceeding to the next.

**Gate A: UI5 Linter**

```sh
# Run from the app directory (app/<app-namespace>/)
npx @ui5/linter
# OR with MCP:
ui5_run_ui5_linter projectDir="<absolute-path-to-app-directory>"
```

Must return **0 findings**. If it crashes instead of reporting findings, the problem is setup, not code:

| Linter crash message | Cause | Fix |
|---|---|---|
| `Cannot find module '@ui5/linter'` | `@ui5/linter` not installed in app directory | `cd app/<ns> && npm install -D @ui5/linter` |
| `Error: No UI5 project found` | Running from wrong directory (CAP root instead of app dir) | Run from `app/<app-namespace>/`, not CAP root |
| `ENOENT: ui5.yaml not found` | Missing `ui5.yaml` in app directory | Create `ui5.yaml` with correct `specVersion` and `framework` block |
| `Unsupported specVersion` | `ui5.yaml specVersion` is too old for the installed `@ui5/linter` | Update `specVersion: "4.0"` in `ui5.yaml` |
| Hangs indefinitely | `node_modules/@ui5/project` schema files corrupted | `npm install --force` in app directory |

If linter returns findings (not a crash): fix each finding before proceeding. Common findings from generated apps:

| Finding | Cause | Fix |
|---|---|---|
| `Deprecated module import sap/m/ValueColor` | Import of removed enum module | Remove import; use string literals (`'Error'`, `'Good'`) directly |
| `Deprecated module import sap/ui/core/ValueState` | Same | Same fix |
| `Use of deprecated property binding type: 'sap/m/...'` | Old-style type in XML binding | Replace with type string literal or `core:require` |
| `Missing @ui5/sap.viz library` | `sap.viz` not in `ui5.yaml framework.libraries` | Add `- name: sap.viz` (or use microchart alternative) |
| `babel-plugin-istanbul reference in ui5.yaml` | Generated by `ui5_create_ui5_app`; breaks `@ui5/project` graph resolver | Delete `ui5-coverage.yaml`; remove `babel-plugin-istanbul` from `package.json devDependencies` |

**Gate B: TypeScript compilation**

```sh
# Run from the app directory
npx tsc --noEmit
```

Must return **0 errors**. Common errors from generated apps:

| Error | Cause | Fix |
|---|---|---|
| `Duplicate identifier 'default'` | Controller rewrite left stale `export default class` at end of file | Delete the second `export default` block |
| `Property '...' does not exist on type 'Event'` | Using `getParameter` on a typed event without casting | Cast: `(oEvent as Event).getParameter("...")` |
| `Cannot find module '@sapui5/types'` | `@sapui5/types` not installed at CAP root | `npm install -D @sapui5/types@<version>` at CAP root |
| 100+ errors `Property 'getView/byId/getRouter' does not exist on type 'ControllerName'` | `BaseController` uses `Controller.extend()` (returns `Function`) instead of ES6 class  -  all subcontrollers lose type info | Convert `BaseController` to `class BaseController extends Controller { }`  -  see S-PROP-68 in Step 3 table [verified TrialK-2026-06-02] |
| `Property '_currentPage/_totalCount' does not exist on type 'List'` | Class-level state variables used without `private` field declarations | Add `private _currentPage = 0; private _totalCount = 0;` to the class body [verified TrialK-2026-06-02] |
| `Cannot find name 'PAGE_SIZE'` | Module-level constant used without declaration | Add `const PAGE_SIZE = 20;` (or appropriate value) before the class declaration [verified TrialK-2026-06-02] |
| Errors in `webapp/test/integration/` or `webapp/test/unit/` referencing `Main.controller` | Scaffolded test artefacts reference a placeholder controller that was never generated | Exclude test directories from `tsconfig.json`  -  add `"./webapp/test/integration/**/*"` and `"./webapp/test/unit/**/*"` to `exclude` [verified TrialK-2026-06-02] |

**Gate C: Manifest validation**

```sh
# Run from the app directory
npx @sap/ux-ui5-tooling manifest-validator
# OR with MCP:
ui5_run_manifest_validation manifestPath="<absolute-path>/webapp/manifest.json"
```

Must return **0 errors**. Warnings are acceptable; errors are not.

**Gate D: Case-insensitive text filter check [verified TrialK-2026-06-01]**

If the app has any text `Contains` filter (SearchField, customer input, title search):

```sh
# Every FilterOperator.Contains usage must have caseSensitive: false
rg "FilterOperator\.Contains" webapp/
# Every match must be part of new Filter({ ... caseSensitive: false })
# Any bare: new Filter("field", FilterOperator.Contains, value)  <-- FORBIDDEN
```

Also verify any hand-crafted `$filter` strings in `fetch()` calls use `tolower()`:
```sh
rg "contains\(" webapp/controller/ --include="*.ts"
# Every match must use contains(tolower(...),tolower(...)) form
```

A bare `contains(field,'value')` in a fetch URL is case-sensitive and silently wrong.

Then follow the **Runtime Verification Protocol** in `SKILL.md`. It covers both Path A (Chrome DevTools MCP: navigate, screenshot, console, network, snapshot) and Path B (user checks in browser with a structured checklist and interpretation guide).

Minimum HTTP reachability check before the full protocol:
```sh
# macOS/Linux
curl -s -o /dev/null -w "%{http_code}" http://localhost:4004
curl -s -o /dev/null -w "%{http_code}" "http://localhost:4004/<app-namespace>/index.html"

# Windows PowerShell
(Invoke-WebRequest -Uri "http://localhost:4004" -UseBasicParsing).StatusCode
(Invoke-WebRequest -Uri "http://localhost:4004/<app-namespace>/index.html" -UseBasicParsing).StatusCode
```

HTTP 200 on both is necessary but not sufficient - always proceed to visual and console checks.

**Additional runtime spot-checks after generation (run these before declaring the iteration complete):**

- Navigate away from any Overview/analytics page then navigate back to it  -  chart titles must NOT revert to "Title of Chart" on re-entry. If they do, the `_propsWired` guard is not being reset in `_onRouteMatched`  -  see `sapui5.md §6.3` [verified TrialK-2026-06-02].
- Navigate from a filtered list URL (e.g. `#/list/status/open`) to the plain list URL (`#/list`)  -  Status filter control must show "All Statuses" and total record count must return. If the filter persists, `_onRouteMatched` is not resetting filter controls  -  see `sapui5.md §13` [verified TrialK-2026-06-02].

---

## 12. First-attempt blank screen - step-by-step diagnostic

When a newly generated SAPUI5 or Fiori Elements app shows a blank screen on first run, work through these stages in order. Each stage has a specific check and a clear pass/fail outcome. Stop at the first failure and fix it before moving on - multiple causes can compound.

---

### Stage 1 - Is `cds watch` actually serving the app?

Check the `cds watch` startup output. A correctly started server prints lines like:
```
[cds] - serving CatalogService { at: '/browse' }
[cds] - launched app as http://localhost:4004/
```

**And** - critically for UI5 apps - it should also print mount lines from `cds-plugin-ui5`:
```
Mounting /com.myorg.myapp to UI5 app ...app/com.myorg.myapp
```

If the mount line is **absent** despite the app folder existing:

| Symptom | Cause | Fix |
|---|---|---|
| No mount line, no error | `cds-plugin-ui5` not installed in CAP root | `npm install -D cds-plugin-ui5` in CAP root, restart `cds watch` |
| **Error: `Cannot find module '@ui5/linter'`** | **`@ui5/linter` not installed in app directory** | **`cd app/<ns> && npm install -D @ui5/linter`** - this is the most common crash after `ui5_create_ui5_app` |
| Mount line absent, error about `@ui5/project` schema | Incomplete `npm install` or `babel-plugin-istanbul` still present | Run `npm install` again (or `npm install --force`) in CAP root; also check that `ui5-coverage.yaml` and `babel-plugin-istanbul` are removed from the app |
| Server process starts but never opens port | `@ui5/project` schema files missing | Check: `test -f node_modules/@ui5/project/lib/validation/schema/ui5.json`; if absent, `npm install --force` |
| Mount line present but app URL returns 404 | `@sapui5/types` version mismatch in CAP root | `npm install -D @sapui5/types@<same-version-as-app>` in CAP root |
| Mount line present, app serves, but cds watch restarts in a loop | `ui5-middleware-livereload` in `ui5.yaml` conflicting with CAP | Remove `ui5-middleware-livereload` from `ui5.yaml` server middleware |
| No mount line for app moved from standalone project | App has its own `node_modules` or `ui5-middleware-simpleproxy` in `ui5.yaml` | Delete app's own `node_modules`; remove `simpleproxy` middleware - see §1.5a |

**Quick check:**
```sh
# Open the CAP launch page - it lists all mounted apps
curl -s http://localhost:4004 | grep -i "com\."   # macOS/Linux
# or open http://localhost:4004 in a browser and look for the app link
```

If the app namespace is not in the list, the problem is in Stage 1. Do not proceed to Stage 2 until the mount line appears in `cds watch` output.

---

### Stage 2 - Is the app loading in the browser at all?

Open `http://localhost:4004/<app-namespace>/index.html` directly.

**With Chrome DevTools MCP:**
```
navigate_page(type="url", url="http://localhost:4004/<app-namespace>/index.html")
take_screenshot()
list_console_messages(types=["error"])
list_network_requests(resourceTypes=["document","script","stylesheet"])
```

**Without Chrome DevTools MCP:** Open the URL in a browser, press F12, go to the Network tab, reload (Ctrl+R / Cmd+R), and look at the first few requests.

Check the **network waterfall**:

| First request result | Meaning | Fix |
|---|---|---|
| `index.html` -> 200, then `sap-ui-core.js` -> 200 | Bootstrap loading - wait for it | Normal; give it 5-10 seconds |
| `index.html` -> 200, then `sap-ui-core.js` -> **404** | `resources/` path not resolving | Wrong `src` in bootstrap - must be `resources/sap-ui-core.js` (relative); `cds-plugin-ui5` provides this automatically |
| `index.html` -> 200, but no further requests at all | `data-sap-ui-on-init` missing or wrong | Check `index.html` has `data-sap-ui-on-init="module:sap/ui/core/ComponentSupport"` and `data-sap-ui-async="true"` |
| `index.html` -> **404** | App not mounted or wrong namespace in URL | Return to Stage 1 |
| `index.html` -> **401** or **403** | Service-level `@requires` blocking `$metadata` | App stays blank; configure mock auth or temporarily remove `@requires` |

---

### Stage 3 - Does the Component load?

After `sap-ui-core.js` loads, SAPUI5 will fetch `Component.js` (or `Component-preload.js`). Check the console for errors at this point.

**Console errors to look for:**

| Error message | Cause | Fix |
|---|---|---|
| `Namespace ... not found` | `data-sap-ui-resource-roots` in `index.html` wrong or namespace mismatch | Check `index.html` resource root matches the app namespace exactly (case-sensitive) |
| `Component-preload.js 404` | Preload file doesn't exist yet (normal in dev) | Not an error - SAPUI5 falls back to loading modules individually |
| `manifest.json 404` | Wrong path or missing file | Confirm `webapp/manifest.json` exists and `sap.app.id` matches the namespace |
| `Unexpected token` in manifest.json | BOM (byte-order mark) at start of file | Re-write the file without BOM; use editor "Save without BOM" option |
| `Failed to load resource: sap.f` (or any library) | Library in `manifest.json` but not in `ui5.yaml` | Add to `ui5.yaml framework.libraries` - see `sapui5.md S11 Step 4` |
| `Class constructor X cannot be invoked without 'new'` | Node.js 24 + `ui5-tooling-transpile` class field issue | Add `autoConvertAllExtendClasses: true` to `ui5.yaml` - see `sapui5.md S1.4` |

---

### Stage 4 - Does the routing target view render?

If the Component loaded but the page is still blank (no UI, no spinner), the problem is almost always in the **routing target view's root element**.

**This is the single most common first-attempt cause for generated apps.**

The `ui5_create_ui5_app` tool generates `sap.f.DynamicPage` as the root element. `sap.m.App.pages` only accepts controls that implement `sap.m.IPage`. `sap.f.DynamicPage` does not implement `sap.m.IPage` -> blank page, no console error.

**Check:** Open the routing target view XML (e.g. `webapp/view/Main.view.xml`). What is the **first element** inside `<mvc:View ...>`?

| Root element | Result | Fix |
|---|---|---|
| `<Page>` (from `xmlns="sap.m"`) | Correct | No fix needed |
| `<f:DynamicPage>` | **Blank page** | Wrap content: `<Page><content><f:DynamicPage>...</f:DynamicPage></content></Page>` |
| `<VBox>`, `<HBox>`, `<Form>`, any layout | **Blank page** | Replace with `<Page>` as root, move layout inside `<content>` |
| `<uxap:ObjectPageLayout>` | Correct (if `sap.uxap` in `ui5.yaml`) | Check library is in `ui5.yaml` |

**Console evidence:** A blank page from this cause produces **no console errors** - it fails silently. The only diagnostic is visual inspection of the view XML.

---

### Stage 5 - Does OData data load? (Empty table instead of blank page)

If the app shell renders but the table is empty:

**With Chrome DevTools MCP:**
```
list_network_requests(resourceTypes=["fetch","xhr"])
```

**Without Chrome DevTools MCP:** Browser DevTools -> Network tab -> filter by `XHR` or `Fetch`.

Find the OData entity collection request (URL contains the entity set name). Check its status:

| Status | What it means | Fix |
|---|---|---|
| **200** but table empty | Data loaded but binding path wrong - property names are case-sensitive | Compare binding `{propertyName}` against `$metadata` exactly |
| **200** but table empty (FE app) | `cds deploy` not run - entity has no table | `npx cds deploy --to sqlite` from CAP root |
| **200** but table empty (draft entity) | Missing `IsActiveEntity eq true` filter | Add filter - `cap-shared.md S5.1` |
| **401** | Service requires auth | Configure mock users in `package.json` - `cap-shared.md S10` |
| **403** | Wrong role or no mock user | Check `cds.requires.auth.users` config |
| **404** | Wrong service path in manifest data source URI | Check `cap-shared.md S2` and run `cds compile '*' --to serviceinfo` |
| **400** | Malformed OData URL - likely `URLSearchParams` encoding | Check `cap-shared.md S3.4` |
| **500** | CAP server error | Check `cds watch` terminal output for the error |
| **No request at all** | Binding not reached - routing or Component issue | Return to Stage 3 or Stage 4 |

---

### Blank page causes quick-reference table

| Cause | Stage | Console error? | Fix |
|---|---|---|---|
| `cds-plugin-ui5` not installed | 1 | No | `npm i -D cds-plugin-ui5` in CAP root |
| **`@ui5/linter` not in app devDeps** | **1** | **`Cannot find module '@ui5/linter'`** | **`cd app/<ns> && npm i -D @ui5/linter`** |
| **`babel-plugin-istanbul` or `ui5-coverage.yaml` present** | **1** | **`@ui5/project` schema error** | **`rm ui5-coverage.yaml && npm uninstall babel-plugin-istanbul`** |
| `@ui5/project` schema files missing | 1 | Crash in cds watch output | `npm install --force` in CAP root |
| `@sapui5/types` version mismatch | 1 | No (404 on app URL) | `npm i -D @sapui5/types@<version>` in CAP root |
| `sap-ui-core.js` 404 | 2 | Network 404 | Wrong bootstrap `src`; check `index.html` |
| `data-sap-ui-on-init` missing | 2 | No further requests | Add `module:sap/ui/core/ComponentSupport` |
| Service-level `@requires` blocking `$metadata` | 2 | Network 401/403 | Configure mock auth (see §3.2 `httpHeaders`) |
| `manifest.json` BOM / parse error | 3 | `Unexpected token` | Re-write without BOM |
| Library in `manifest.json` but not `ui5.yaml` | 3 | `404` on library | `npx ui5 add <library>` |
| `sap.viz` used with `cds-plugin-ui5` | 3 | MIME type error / 404 on viz JS | Remove `sap.viz`; use `sap.suite.ui.microchart` or React charts instead - see §11 Step 4 |
| Node.js 24 class field issue | 3 | `cannot be invoked without 'new'` | `autoConvertAllExtendClasses: true` - see §1.6 |
| Routing target root is not `sap.m.IPage` | **4** | **No error** | Wrap in `<Page>` |
| Empty `<table:columns>` in `sap.ui.table.Table` | 4 | No error | Add explicit `<table:Column>` elements |
| OData URI absolute (`http://localhost:...`) | 5 | Network request fails CORS | Use root-relative URI with trailing slash |
| `cds deploy` not run | 5 | Network 500 | `npx cds deploy --to sqlite` |
| `IsActiveEntity` filter missing (draft) | 5 | Network 200 but wrong data | Add `IsActiveEntity eq true` filter |
| `bindElement` on Form not Panel | 5 | No error, detail always empty | Move `setBindingContext` to wrapping Panel |
| **Duplicate code block after class `}` in controller** | **3** | **`Duplicate identifier` TypeScript errors -> HTTP 500 on controller JS** | **Delete everything after the class closing `}`. Run `npx tsc --noEmit` and check for `Duplicate identifier` errors.** |
| Transient `page stack is empty` console warning (3x at startup) | -- | No | Harmless SAPUI5 timing race during initial route resolution. No user-visible effect. Do not investigate unless the app shows a genuine blank page. |

---



## 13. Search / filter pattern

> **MANDATORY: ALL `FilterOperator.Contains` filters MUST use `caseSensitive: false` [verified TrialK-2026-06-01]**
> `FilterOperator.Contains` is case-sensitive by default on OData V4 backends (including CAP/SQLite).
> Omitting `caseSensitive: false` produces silent wrong results  -  the table appears filtered but misses
> results that differ only in case. This is a non-negotiable rule: every `Contains` filter, on every
> field, must include `caseSensitive: false`. There are no exceptions.

```typescript
onSearch(oEvent: SearchField$SearchEvent | SearchField$LiveChangeEvent): void {
  const sQuery = (oEvent.getParameter("query") ?? oEvent.getParameter("newValue")) as string
  const oTable = this.byId("mainTable") as Table
  const oBinding = oTable.getBinding("rows")
  if (oBinding) {
    const aFilters = sQuery
      ? [new Filter({ path: "name", operator: FilterOperator.Contains,
                      value1: sQuery, caseSensitive: false })]
      : []
    oBinding.filter(aFilters)
  }
}
```

- Use both `search` and `liveChange` events on the `SearchField` for real-time filtering
- `caseSensitive: false` generates `contains(tolower(name),tolower('query'))`  -  required for all backends including CAP/SQLite
- Use `"rows"` aggregation for `sap.ui.table.Table`; use `"items"` for `sap.m.Table`

### changeParameters vs. ListBinding.filter for OData V4 programmatic filtering

Both `oBinding.filter(aFilters)` and `oBinding.changeParameters({ $filter: '...' })` apply server-side OData V4 filters. `changeParameters` is more reliable when called immediately after navigation (e.g. in `_onRouteMatched`) because it forces a full rebind without depending on the binding being fully initialized.

```typescript
// Preferred for cross-navigation filter application (called from _onRouteMatched):
const oBinding = oTable.getBinding("rows") as ODataListBinding
oBinding.changeParameters({ $filter: status_code eq '' })

// Also correct for interactive search  -  caseSensitive: false is MANDATORY:
oBinding.filter([new Filter({ path: "name", operator: FilterOperator.Contains, value1: sQuery, caseSensitive: false })])
```

**Rule:** Always test ALL filter branches, not just the empty-result ones. A filter navigating to an empty list looks "filtered" but may not be filtering at all. Test with a branch that has known non-zero results (e.g. "Medium Stock" with 3 books) to confirm the filter applies.

### Cross-navigation `_onRouteMatched` - reset ALL filters before applying state (CRITICAL)

When navigating from an Overview chart/tile click to a list page, `_onRouteMatched` MUST reset **all** filter controls and instance variables to their empty/default state **before** applying anything from the `filterState` model. If it only sets the fields present in `oState` and leaves the rest untouched, filters accumulate across visits:

- User clicks "High" urgency bar -> IncidentsList shows 288 High incidents [v]
- User presses Back -> Overview
- User clicks "Closed" status donut -> IncidentsList shows "Closed AND High" (wrong - should show ~180 Closed)

**Correct pattern for every `_onRouteMatched` that consumes a cross-nav filter state:**

```js
_onRouteMatched: function () {
    // Step 1: reset ALL filter controls and instance variables unconditionally
    var oSF = this.byId("statusFilter");   if (oSF)   oSF.setSelectedKey("");
    var oUF = this.byId("urgencyFilter");  if (oUF)   oUF.setSelectedKey("");
    var oCF = this.byId("customerFilter"); if (oCF)   oCF.setSelectedKey("");
    var oSrch = this.byId("searchField"); if (oSrch)  oSrch.setValue("");
    this._customerKey = "";
    this._pendingCustomer = "";
    // ... reset every other filter instance variable ...

    // Step 2: apply ONLY what filterState carries (single attribute from chart click)
    var oFS = this.getOwnerComponent().getModel("filterState");
    if (oFS) {
        var oState = oFS.getData();
        if (oState.status)  { if (oSF) oSF.setSelectedKey(oState.status); }
        if (oState.urgency) { if (oUF) oUF.setSelectedKey(oState.urgency); }
        // ... apply other attributes from oState ...
        oFS.setData({});   // clear after consuming
    }
    this._applyFilters();
},
```

The reset must happen even when `oState` is empty - clicking an unfiltered KPI tile (e.g. "Total") must also clear stale filters from a previous visit.

**Verification:** After fixing, test this sequence: click "High" urgency bar -> Back -> click "Closed" status segment. The list must show only Closed incidents (~180), not Closed+High.

### Plain list route `_onRouteMatched` must also reset all filter controls [verified TrialK-2026-06-02]

The above rule applies to `_onRouteMatchedFiltered` (when arriving with a filter). The plain `_onRouteMatched` (unfiltered route) must ALSO reset all controls. Simply calling `_applyFilters()` without resetting the controls causes the Select to show the previous filter value visually even though the binding updates correctly:

- User navigates to `#/list/status/open` → Status shows "Open (New, Assigned, In Process)"
- User navigates to `#/list` → binding resets but Status control still shows "Open (New, Assigned, In Process)"

**Correct pattern:**
```typescript
private _onRouteMatched(): void {
    this._preFilter = {};
    // Reset ALL filter controls to default/empty state
    (this.byId("selStatus") as Select)?.setSelectedKey("");
    (this.byId("selUrgency") as Select)?.setSelectedKey("");
    (this.byId("inCustomer") as Input)?.setValue("");
    (this.byId("inSearch") as SearchField)?.setValue?.("");
    this._currentPage = 0;
    this._applyFilters();
}
```

**Verification:** Navigate from `#/list/status/open` to `#/list`  -  Status filter must show "All Statuses" and count must return to total.

> **Also reset pagination state in `_onRouteMatched` [verified TrialK-2026-06-02]:** Add `this._currentPage = 0;` in `_onRouteMatched` alongside the filter control reset. Pagination state (current page index, total count) persists across navigations if not explicitly reset, causing the list to open on a non-first page after back-navigation.

### Binding readiness in `_onRouteMatched` (critical for filter correctness)

`_onRouteMatched` fires immediately when the router matches the pattern - which may be before the view's OData binding has completed its first request cycle. Calling `oTable.getBinding("rows")` at this point may return `null` (view not yet rendered) or return a binding that ignores `.filter()` calls because it has not issued its first request yet.

**Symptom:** Filter is set in `_onRouteMatched`, filter Select control shows the correct value, but the table shows unfiltered data. The OData network request has no `$filter=` parameter.

**Root cause:** The routing system fires `_onRouteMatched` before the page factory fully initialises the view DOM. `oBinding.filter()` is called on a not-yet-ready binding and silently does nothing.

**Fix:** Wrap the filter application in a `setTimeout(fn, 100)`:

```js
_onRouteMatched: function (oEvent) {
    var sFilter = oEvent.getParameter("arguments").filter || "";
    // Reset controls synchronously - controls exist even before binding is ready
    var oSF = this.byId("statusFilter");
    if (oSF) oSF.setSelectedKey(sFilter);
    this._sStatusFilter = sFilter;
    // Defer binding.filter() call until after the OData binding initialises
    var that = this;
    setTimeout(function () { that._applyFilters(); }, 100);
},
```

**Preferred alternative:** Use URL-based routing parameters instead of EventBus for cross-navigation filter state. Embed the filter value directly in the route pattern (e.g. `"list/{filter}"`) so `_onRouteMatched` receives it as a route argument. Route-parameter cross-navigation avoids the timing problem entirely and is the preferred pattern for new apps.

---

## 14. Fiori UX compliance spot-check

After each iteration, verify:
- Destructive actions (delete) have `MessageBox.confirm` with the object name
- Validation errors shown inline (`valueState="Error"`) not only as `MessageToast`
- Toast messages use object+action pattern ("Item saved"), not vague words
- Navigation row action uses `type="Navigation"` (chevron), not a custom icon
- Table binding refreshed (`oBinding.refresh()`) in `_onRouteMatched`
- New records start with no validation errors; existing records validate on edit entry
- Never offer Edit or Delete buttons against a service annotated `@readonly` - check the service definition before wiring edit actions. If the app uses a read-only service (e.g. CatalogService) for display and a writable service (AdminService) for edits, switch the view binding to the writable service before entering edit mode (see `cap-shared.md §8.2`)
- **Edit action buttons MUST immediately enter edit mode [verified TrialK-2026-06-01]:** Any "Edit" button in a list row or detail header must either (a) navigate to a dedicated `{id}/edit` route that `_onRouteMatchedEdit` maps to `viewMode:false`, or (b) call `onEdit()` directly which sets `viewMode:false`. An Edit button that navigates to the detail route without triggering edit mode is a silent defect  -  the user sees a read-only page with no explanation. Verify by clicking Edit from the list and confirming that Save/Discard buttons appear, NOT the Edit button.
- **Every field in the edit form that is conceptually editable MUST be an actual input control [verified TrialK-2026-06-01]:** After generating the edit form, audit every `<Label>` row: if the field can be changed by the user (title, customer, assignee, date, etc.), its paired control in the edit form MUST be an `<Input>`, `<Select>`, `<DatePicker>`, or equivalent  -  NOT a `<Text>`. A `<Text>` in the edit form is invisible to the user as an editable field. Pay particular attention to FK/association fields (e.g. `customer/name`, `author/name`)  -  these are commonly left as `<Text>` because they display a navigation property. The edit form must use an `<Input showSuggestion="true">` wired to `onSuggest` + `onSuggestionItemSelected`, with `_selectedFKId` stored in the controller and included in the PATCH payload.

---

## 15. sap.ui.core.ValueState vs sap.m.ValueColor - do not confuse

These two enums have different valid values. Mixing them causes runtime exceptions:

| Use case | Type | Valid values | Invalid values |
|---|---|---|---|
| `ObjectNumber.state`, `Input.valueState`, `ObjectStatus.state` | `sap.ui.core.ValueState` | `None`, `Error`, `Warning`, `Information`, `Success` | `"Good"`, `"Critical"` |
| `NumericContent.valueColor`, `ObjectNumber.valueColor` | `sap.m.ValueColor` | `None`, `Good`, `Error`, `Critical`, `Neutral` | `"Success"`, `"Warning"` |

Common mistakes:
- `"Good"` is **not** a valid `ValueState` - use `"None"` or `"Success"` instead
- `"Critical"` is **not** a valid `ValueState` - use `"Warning"` or `"Error"` instead  
- `"Critical"` IS valid as `sap.m.ValueColor` - do not change it there

Always grep for `state="Good"`, `state="Critical"`, `valueState="Critical"` before delivery.

---

## 16. OData Decimal fields - pre-formatted string in composite bindings

When an OData V4 model binds a `Decimal(N,M)` field, the model applies the `sap.ui.model.odata.type.Decimal` type formatter **before** passing the value to any expression binding or formatter function. The formatter receives a locale-formatted string (e.g. `"3,781.0000"`) not a raw number (`3781`).

```ts
// [X] Wrong - parseFloat("3,781.0000") stops at the comma -> returns 3
const val = parseFloat(rawValue)

// [OK] Correct - strip locale thousand separators first
const val = parseFloat(rawValue.replace(/,/g, ''))
```

This only applies to composite bindings and formatter functions. For plain `{price}` property bindings, the OData V4 model handles formatting automatically.

---

## 17. Deprecated pseudo-module imports (sap/m/ValueColor, sap/ui/core/ValueState)

Importing ValueColor or ValueState via their pseudo-module paths generates [FUTURE FATAL] errors in SAPUI5 1.120+:

```ts
// WRONG - Deprecated pseudo-module imports - cause [FUTURE FATAL] console errors
import ValueColor from 'sap/m/ValueColor'
import ValueState from 'sap/ui/core/ValueState'
```

**Fix:** Remove the imports entirely. Use string literals wherever these were used - the SAPUI5 type system accepts string literals for all enum props:

```ts
// CORRECT - Use string literals directly
state: 'Error'       // instead of ValueState.Error
state: 'Success'     // instead of ValueState.Success
valueColor: 'Good'   // instead of ValueColor.Good
valueColor: 'Critical' // instead of ValueColor.Critical
```

The linter (`ui5_run_ui5_linter`) flags these as `no-deprecated-api` findings. Run it as part of the post-generation checklist.

---

## 18. Filter pattern for closed-value sets - Select dropdown, not SearchField

When filtering by a field that has a small, fixed set of valid values (fewer than ~20), always use a **Select dropdown** populated from the entity list, not a free-text SearchField.

A SearchField requires users to know exact valid values before typing. A Select dropdown makes all valid values discoverable.

```xml
<!-- CORRECT: Select dropdown for a closed set of airlines -->
<Select id="airlineFilter" change=".onAirlineFilter">
  <items>
    <core:Item key="" text="All Airlines"/>
  </items>
</Select>
<!-- populate items from AdminService.Airlines via JSONModel in onInit() -->

<!-- WRONG: SearchField for a closed set -->
<SearchField id="airlineSearch" search=".onAirlineSearch"/>
```

Rule: Use a SearchField only when the set of valid values is unbounded (arbitrary user-entered text). Examples where Select is always correct: airline, genre, status code, category, country code, urgency level.

---

## 19. Icon name verification - always validate before use (S-PROP-52) `[verified-TrialK-2026-05-28]`

Not all `sap-icon://` names resolve to a valid icon. An invalid icon name resolves to `null` at runtime and renders as an empty button element with no visual indicator and no console error. The button appears to exist but shows nothing.

**Known invalid icon names (commonly attempted):**
- `sap-icon://status-change` - does NOT exist; use `sap-icon://workflow-tasks` instead

**Valid alternatives for status/workflow concepts:**
- `sap-icon://workflow-tasks` (exists, renders correctly - use for status-change actions)
- `sap-icon://activities`
- `sap-icon://process`
- `sap-icon://switch-views`

**Verification before use (run in browser DevTools or Chrome DevTools MCP):**
```js
// Returns an object if valid, undefined if the icon does not exist
sap.ui.core.IconPool.getIconInfo('sap-icon://workflow-tasks')
```

**Pre-delivery grep gate:** `rg 'sap-icon://status-change' app/**/*.xml app/**/*.ts` -> zero matches.

---

## 20. Shell navigation - use sap.m.Toolbar, not sap.m.Bar contentMiddle (S-PROP-53) `[verified-TrialK-2026-05-28]`

`sap.m.Bar` allocates `contentLeft` and `contentRight` regions first, then gives the remainder to `contentMiddle`. If `contentLeft` holds a wide app title, `contentMiddle` is compressed and a `SegmentedButton` placed there cannot expand to show all items - items are truncated or collapsed.

**WRONG pattern:**
```xml
<!-- Bar compresses contentMiddle when contentLeft is wide -->
<Page showHeader="false">
  <subHeader>
    <Bar>
      <contentLeft><Title text="Incident Analyzer"/></contentLeft>
      <contentMiddle>
        <SegmentedButton width="auto">...</SegmentedButton>
      </contentMiddle>
    </Bar>
  </subHeader>
</Page>
```

**CORRECT pattern - use sap.m.Toolbar with ToolbarSpacer:**
```xml
<!-- Toolbar gives SegmentedButton its natural width via spacers -->
<Page showHeader="false">
  <subHeader>
    <Toolbar>
      <Title text="Incident Analyzer"/>
      <ToolbarSpacer/>
      <SegmentedButton>
        <items>
          <SegmentedButtonItem key="overview" text="Overview"/>
          <SegmentedButtonItem key="list" text="Incidents"/>
          <SegmentedButtonItem key="detail" text="Detail"/>
          <SegmentedButtonItem key="report" text="Report"/>
        </items>
      </SegmentedButton>
      <ToolbarSpacer/>
    </Toolbar>
  </subHeader>
</Page>
```

> See also `sap.tnt` version skew warning in §11 Step 4: if `sap.tnt` ToolPage/SideNavigation has issues with version 1.147.2+, replace with `sap.m.Toolbar` button-based navigation using this pattern.

---

## 21. targetType: 'any' for custom formatters on typed OData V4 fields

When a custom formatter function is bound to an OData V4 property that carries a type annotation in $metadata (e.g., Edm.Int32 with @Common.IsCalendarYear), the OData V4 model's type formatter runs **first** and passes a locale-formatted string to your formatter, not the raw value.

```xml
<!-- WRONG: publishedYear arrives as "1,847" not 1847 -->
<Text text="{path: 'publishedYear', formatter: '.formatYear'}"/>

<!-- CORRECT: targetType 'any' bypasses OData type formatting -->
<Text text="{path: 'publishedYear', targetType: 'any', formatter: '.formatYear'}"/>
```

For multi-part (composite) bindings, add `targetType: 'any'` to each affected part:
```xml
<StandardListItem description="{parts: [
    {path: 'title'},
    {path: 'publishedYear', targetType: 'any'}
  ],
  formatter: '.formatDescription'}"/>
```

This applies to all OData V4 typed fields used with formatters: Edm.Int32, Edm.Decimal, Edm.Date, etc.

**Note:** This is distinct from the visible/enabled formatter pattern (§8.2 OData V4 binding patterns) - for boolean expression bindings, `targetType: 'any'` prevents string-to-boolean coercion. Both cases require `targetType: 'any'` but for different reasons.

---

## 22. Suggestion inputs for FK fields: query the entity, not a groupby on the parent `[verified-TrialK-2026-05-28]`

When a create dialog has an FK input field with suggestions (e.g. customer, author, genre), query the **referenced entity directly** by its display field  -  never aggregate the parent entity to get distinct FK values.

```ts
// WRONG: groups parent entity to get distinct FK values; returns raw IDs
fetch("/Incidents?$apply=groupby((customer_ID))")
// -> suggestion shows "1004183" -- user must know the raw ID

// CORRECT: query the Customers entity by name
const filter = encodeURIComponent(`contains(tolower(name),tolower('${val}'))`);
fetch(`/Customers?$filter=${filter}&$select=ID,name&$top=15&$orderby=name`)
// -> suggestion shows "Nathan Moore" -- user types a name
```

When a suggestion is selected, store the raw FK value in a separate property because the input displays the friendly name:

```ts
oCustInput.attachSuggest(async (ev) => {
  const input = ev.getSource();
  const r = await fetch(`/Customers?$filter=contains(tolower(name),tolower('${input.getValue()}'))&$select=ID,name`);
  const { value } = await r.json();
  value.forEach(c => input.addSuggestionItem(new SuggestionItem({ key: c.ID, text: c.name })));
});

oCustInput.attachSuggestionItemSelected((ev) => {
  const item = ev.getParameter("selectedItem");
  // Store raw ID; display name is shown in the input
  (oCustInput as any)._selectedId = item.getKey();
  oCustInput.setValue(item.getText());
});

// On submit: read the stored ID, not getValue() which returns the display name
const custId = (oCustInput as any)._selectedId;
```

Also reset `_selectedId = ""` on dialog open so a previous selection does not carry over.
