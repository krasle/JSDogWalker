# Joule Studio - Environment Rules

**Load this file when:** the environment is `[JS]` (Joule Studio cloud sandbox) or `[JS-LOCAL]`
(local repo cloned from a Joule Studio GitHub export). Do NOT load for standard `[LOCAL]`
development - the rules here are JS-specific and irrelevant there.

**Tier:** 1 - load alongside the technology overlay (e.g. `wc4r.md`) whenever the environment
is `[JS]` or `[JS-LOCAL]`.

**Grounding basis:** incidents-cap asset in Joule Studio 2.0, session 2026-06-08.
JS is a new and actively developed environment. Rules in this file reflect observed behavior
at that point in time. Treat them as strong ground truth to be re-verified if JS behavior
appears to have changed.

---

## 1. Environment Overview

Joule Studio (JS) is a cloud-hosted development sandbox. Key characteristics:

| Aspect | Detail |
|---|---|
| OS | Linux VM |
| Filesystem | Ephemeral - `node_modules` are wiped on every sandbox restart |
| Server lifecycle | `cds watch` is called internally by the JS preview runner - the agent does NOT start or stop it |
| App URL access | App is viewable only inside the JS preview iframe - no direct localhost URL access from outside the VM |
| Transparent proxy | None confirmed - candidate URLs suggested by Joule return "Invalid Workspace" errors |
| Deployed app access | Blocked - JWT authentication issues in managed SAP account; not resolvable without admin action |
| Primary UI technology | WC4R (UI5 Web Components for React) - all JS UI apps default to WC4R |
| Deployment target | Kyma (not Cloud Foundry) - see §8 |

**What the agent CAN do in [JS]:**
- Edit source files (`app/react-ui/src/`, `db/`, `srv/`)
- Run static verification (SV-0 through SV-N from `validation.md`)
- Run `npm install`, `tsc --noEmit`, linters, `cds compile`
- Inspect and modify configuration files

**What the agent CANNOT do in [JS]:**
- Start or stop `cds watch` - JS preview runner owns this
- Access the running app via `navigate_page()`, `curl`, or `Invoke-WebRequest` - no working URL path
- Run DV (dynamic verification) checks - all DV must be deferred (see §7)
- Verify the deployed app - JWT auth blocks access

---

## 2. Supported Technologies in JS 2.0

| Technology | Status in JS 2.0 |
|---|---|
| WC4R (UI5 Web Components for React) | CONFIRMED - primary and default target; all JS UI app scaffolding defaults to WC4R |
| Fiori Elements | UNCONFIRMED - may work but not formally supported; do not scaffold without explicit user confirmation |
| Freestyle SAPUI5 | UNCONFIRMED |
| FX Components for React | UNCONFIRMED |

**Agent rule:** For any `[JS]` task without a specified technology, default to WC4R.
Do not ask the user to confirm WC4R - it is the JS default.
Do ask before scaffolding FE, SAPUI5, or FX for a JS project.

---

## 3. Project Structure Contract

This layout MUST be preserved exactly. It is the dual-environment contract that makes
the project work in both JS preview and local `cds watch`. Deviating from it breaks JS preview.

### 3.1 Canonical directory structure

```
<project-root>/
├── app/
│   └── react-ui/              <- React source lives here (inside app/)
│       ├── src/               <- application source (JSX/TSX, CSS)
│       │   ├── components/
│       │   ├── pages/
│       │   ├── utils/
│       │   └── App.tsx
│       ├── public/            <- static assets
│       ├── index.html         <- Vite entry point (source, not build output)
│       ├── package.json       <- React/Vite deps; name MUST be "react-ui"
│       └── vite.config.js     <- Vite config; cds watch detects this file
│       ── ── ── (gitignored artefacts) ── ──
│       ├── dist/              <- production build output [gitignored]
│       └── node_modules/      <- Vite dep cache [gitignored]
├── db/
│   ├── data/
│   └── schema.cds
├── srv/
├── test/
├── .gitignore
├── package.json               <- root; workspaces + CDS config
└── package-lock.json          <- single lockfile (npm workspaces; root only)
```

**Why `app/react-ui/` and not `react-ui/` at root:**
`cds watch` scans every subdirectory of `app/` for `vite.config.js`. When found, it
launches a Vite dev server as inline middleware on the same port as CDS (4004), serving
the React app at `/react-ui/`. The JS preview panel navigates to `/react-ui/`.
If the source is outside `app/`, `cds watch` never starts the Vite server and the JS
preview shows a blank page.

### 3.2 Load-bearing files - never change without explicit instruction

| File | What must stay intact |
|---|---|
| `package.json` (root) | `"workspaces": ["app/react-ui"]` - workspace resolution depends on this |
| `package.json` (root) | No `"folders": {"app": ...}` inside `cds.[development]` - breaks `/react-ui/` path |
| `package.json` (root) | `cds.[production].folders.app = "app/react-ui/dist"` |
| `package.json` (root) | `"build": "npm run build -w app/react-ui && cds build --production"` |
| `app/react-ui/package.json` | `"name": "react-ui"` - workspace name used for resolution |
| `app/react-ui/package.json` | No `"type": "commonjs"` |
| `app/react-ui/vite.config.js` | `base: './'` - absolute paths 404 under `/react-ui/` sub-path |
| `app/react-ui/vite.config.js` | `outDir: 'dist'` |
| `app/react-ui/vite.config.js` | Complete `optimizeDeps.exclude` list (all five `@ui5/*` packages) |
| `app/react-ui/vite.config.js` | `resolve: { preserveSymlinks: true }` |
| `.gitignore` | `app/react-ui/node_modules/` and `app/react-ui/dist/` must be listed |

### 3.3 Patterns that break the JS preview - never do these

**Structural:**
- Do not move `vite.config.js` out of `app/react-ui/` for any reason
- Do not move React source files out of `app/react-ui/`
- Do not create a top-level `react-ui/` directory alongside `app/` - this was a previous broken layout documented in older JS docs; the `CAPConfigs.md` pattern supersedes it
- Do not create a second `vite.config.js` anywhere other than `app/react-ui/`

**package.json:**
- Do not add `"folders": {"app": ...}` inside `cds.[development]` - this is the single most common mistake and immediately breaks `/react-ui/` in JS
- Do not remove `"workspaces": ["app/react-ui"]`
- Do not add a `"postinstall"` script that runs `npm install` inside `app/react-ui/` - workspaces handle this; a postinstall hook breaks workspace hoisting
- Do not add a second `package-lock.json` inside `app/react-ui/` - there is only one lockfile at the project root

**vite.config.js:**
- Do not change `base` from `'./'` to `'/'` - absolute paths 404 under the `/react-ui/` sub-path
- Do not change `outDir` from `'dist'`
- Do not remove any package from `optimizeDeps.exclude` - each was added because it caused the JS health-check timeout
- Do not use `outDir: 'webapp'` - this is an older pattern from `JS_CAPProjPrecheck.md` (now superseded); `dist` is correct for JS 2.0

### 3.4 Safe changes

- Any file under `app/react-ui/src/` (TSX, JS, CSS) - normal UI development
- `app/react-ui/index.html` - the source entry point
- `app/react-ui/public/` - static assets
- Adding new npm dependencies to `app/react-ui/package.json` (run `npm install` from project root afterwards)
- Any file under `db/`, `srv/`, `test/` - CDS model, service, and test files
- Adding new users to `cds.[development].requires.auth.users`

### 3.5 Verification checklist (run after any config change)

Run these assertions from the project root before committing or pushing:

```bash
# 1. Workspace wiring is correct
node -e "const p=require('./package.json'); console.assert(p.workspaces?.includes('app/react-ui'), 'FAIL: workspaces missing'); console.log('workspaces OK')"

# 2. CDS development profile has no folders.app override
node -e "const p=require('./package.json'); const dev=p.cds?.['[development]']; console.assert(!dev?.folders?.app, 'FAIL: cds.[development].folders.app must not be set'); console.log('dev folders OK')"

# 3. CDS production folders.app points at dist
node -e "const p=require('./package.json'); const v=p.cds?.['[production]']?.folders?.app; console.assert(v==='app/react-ui/dist','FAIL: got '+v); console.log('prod folders OK')"

# 4. vite.config.js is in the right place
node -e "const fs=require('fs'); console.assert(fs.existsSync('app/react-ui/vite.config.js'),'FAIL: vite.config.js missing from app/react-ui/'); console.log('vite.config.js location OK')"

# 5. optimizeDeps.exclude contains all five @ui5 packages
node -e "const s=require('fs').readFileSync('app/react-ui/vite.config.js','utf8'); ['@ui5/webcomponents-react','@ui5/webcomponents-icons','@ui5/webcomponents','@ui5/webcomponents-fiori','@ui5/webcomponents-base'].forEach(p=>{console.assert(s.includes(p),'FAIL: '+p+' missing from optimizeDeps.exclude')}); console.log('optimizeDeps OK')"

# 6. base is relative (./)
node -e "const s=require('fs').readFileSync('app/react-ui/vite.config.js','utf8'); console.assert(s.includes(\"base: './'\"),'FAIL: base must be ./ not /'); console.log('base OK')"
```

If any assertion fails, fix it before pushing. A broken assertion means one of the two
environments will stop working.

---

## 4. Session Startup Sequence

**[JS] At the start of every new Joule Studio session** (JS wipes `node_modules` on restart):

```bash
# Step 1: Re-install all dependencies (single command covers root + workspace)
npm install

# Step 2: Ensure ~/.cds-services.json exists (sandbox may not have created it)
mkdir -p /home/vmuser && echo '{}' > /home/vmuser/.cds-services.json

# Step 3: JS preview runner starts cds watch internally - no manual start needed
# (For [JS-LOCAL], use: npm run dev)
```

**Non-fatal message to ignore:**
```
Error exposing live reload port 35729: fetch failed
```
This appears in every JS sandbox startup. The AppStudio port-exposure API is unavailable
in the sandbox. The CDS server starts and works correctly regardless. Do not treat this
as a blocker.

**If JS preview shows `capPreviewErrorCdsWatchTimedOut`:**
This means the Vite dep-optimisation pass for UI5 Web Components exceeded the JS
health-check timeout. Fix: ensure `optimizeDeps.exclude` in `vite.config.js` lists
all five `@ui5/*` packages (see §6.1). After adding the exclude list, push to GitHub,
pull the updated code back into JS, and restart the preview.

---

## 5. OData / URL Rules

### 5.1 URLSearchParams space encoding - critical in JS

`URLSearchParams` encodes spaces as `+`. In local environments, tolerant proxies silently
accept `+` as a space. In Joule Studio, the CAP OData parser (v9) strictly requires `%20`
and rejects `+` with HTTP 400 `peg$SyntaxError: Parsing URL failed`.

This is the same rule as `cap-shared.md §3.4` (Trap 3) but the production failure context
is specifically JS. The bug is hidden locally and first surfaces in JS.

```ts
// [X] Breaks silently locally, hard fails in JS
const params = new URLSearchParams({ $orderby: 'createdAt desc' })
fetch(`/odata/v4/processor/Incidents?${params}`)  // 'createdAt+desc' -> HTTP 400

// [OK] Always use encodeURIComponent for OData clause values
const parts = [`$orderby=${encodeURIComponent('createdAt desc')}`]
fetch(`/odata/v4/processor/Incidents?${parts.join('&')}`)
```

**Rule:** Never use `URLSearchParams` to construct OData query strings. Always use
`encodeURIComponent()` for values and literal `$` for system query option names.
See `cap-shared.md §3.4` for the complete trap list.

### 5.2 Base path - `/react-ui/` sub-path serving

CDS serves the React app at `/react-ui/` (the directory name under `app/`). With
`base: '/'` in `vite.config.js`, the built `index.html` references `/assets/...` which
resolves from the server root - CDS has no files there, producing HTTP 404 for every
asset. With `base: './'`, asset paths become `./assets/...` and resolve relative to
wherever `index.html` is served from.

**Rule:** `base: './'` is mandatory in `vite.config.js`. Never change it to `'/'`.

---

## 6. Vite Configuration Requirements

The following vite.config.js settings are mandatory for JS compatibility. The annotated
canonical config for JS 2.0:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Stub for optional @zxing/library (barcode scanner in @ui5/webcomponents-fiori).
// Not installed; prevents Vite crashing on the missing import.
const stubZxing = {
  name: 'stub-zxing',
  resolveId(id) { if (id.startsWith('@zxing/')) return '\0virtual:zxing' },
  load(id)      { if (id === '\0virtual:zxing') return 'export default {}' },
}

export default defineConfig({
  plugins: [react(), stubZxing],

  // MANDATORY: relative base - assets resolve correctly under /react-ui/ sub-path
  base: './',

  build: {
    outDir: 'dist',    // [JS 2.0] use 'dist', not 'webapp' (older pattern, superseded)
    emptyOutDir: true,
  },

  // MANDATORY: prevents Vite dep-optimisation timeout in JS preview health-check
  optimizeDeps: {
    exclude: [
      '@ui5/webcomponents-react',
      '@ui5/webcomponents-icons',
      '@ui5/webcomponents',
      '@ui5/webcomponents-fiori',
      '@ui5/webcomponents-base',
    ],
  },

  resolve: { preserveSymlinks: true },  // required for npm workspace symlink resolution

  server: {
    // HMR disabled - UI5 Web Components have known HMR issues
    // In cds-watch middleware mode, CDS overrides this with its own HMR port anyway
    hmr: false,

    // Proxy - only active in standalone Vite mode (npx vite from inside app/react-ui/)
    // In cds-watch middleware mode, Vite and CDS share port 4004 - no proxy is used
    proxy: {
      '/odata': 'http://localhost:4004',
    },
  },
})
```

### 6.1 optimizeDeps.exclude - all five packages required

All five must be listed. Each was added because it caused the JS health-check timeout:

```
@ui5/webcomponents-react
@ui5/webcomponents-icons
@ui5/webcomponents
@ui5/webcomponents-fiori
@ui5/webcomponents-base
```

With `exclude`, packages load lazily on first use (no functional difference for the app).
Without it, Vite pre-bundles all UI5 packages at startup - this dep-optimisation pass
is too slow for the JS preview health-check timeout.

### 6.2 stubZxing plugin

Required when `@ui5/webcomponents-fiori` is installed. That package has an optional
dependency on `@zxing/library` (barcode scanner). `@zxing/library` is not installed.
Without the stub, Vite crashes at startup with a missing module error. The stub
intercepts the import and returns an empty object.

### 6.3 Proxy is inactive in cds-watch middleware mode

In both JS preview and local `cds watch`, Vite runs as CDS inline middleware. Vite and
CDS share a single HTTP server on port 4004. OData requests to `/odata/v4/...` are
handled directly by CDS - the `server.proxy` configuration is ignored.

The proxy is only active when running the standalone Vite dev server:
```bash
cd app/react-ui && npx vite   # standalone mode - proxy is active
```

---

## 7. Validation Constraints in JS

### 7.1 SV checks (static verification) - fully available

All SV checks from `validation.md` (SV-0 through SV-N) are fully executable by the
agent in `[JS]` and `[JS-LOCAL]` environments. Static checks require no running app:
- `rg` / grep gate scans
- `tsc --noEmit`
- `npx @ui5/linter`
- `cds compile` checks
- `npm test`

### 7.2 DV checks (dynamic/browser verification) - BLOCKED in [JS]

Dynamic verification is not possible inside the Joule Studio sandbox.

**The problem:** The app runs inside the JS preview iframe. There is no confirmed URL
path that allows agent access to the running app from outside the VM. The Joule agent
may suggest candidate URLs, but they return "Invalid Workspace" errors. There is no
transparent proxy.

**Consequence:** The agent cannot execute:
- `navigate_page()` / `browser_navigate()`
- `take_screenshot()` / `take_snapshot()`
- `list_console_messages()` / `list_network_requests()`
- `curl` or `Invoke-WebRequest` against app URLs

**Options when DV is needed:**

**Option 1 (preferred) - Use [JS-LOCAL]:**
Pull the project to a local environment, run `cds watch` locally, and execute the full
DV protocol at `http://localhost:4004/react-ui/`. The app behaves identically locally.

**Option 2 - Manual user verification:**
Provide the user with a checklist of DV checks to perform manually in the JS preview
iframe and ask them to report findings back. Use the "Without Chrome DevTools MCP"
checklist from `SKILL.md` Runtime Verification section as the basis.

**Never do:** Do not claim DV checks were performed in `[JS]` without evidence. Do not
attempt `navigate_page()` or similar calls - they will fail and may confuse the user.

---

## 8. Deployment: Kyma

Joule Studio projects deploy to **Kyma**, not Cloud Foundry.

| Aspect | Status |
|---|---|
| Kyma deployment | NOT GROUNDED - no empirical verification |
| `cds add` sequence for Kyma | Unknown - may differ from CF (`cds add hana`, `cds add xsuaa`) |
| Kyma auth service | Unknown |
| Kyma DB service | Unknown |

**Agent rule:** Do not generate Kyma deployment configuration. If a user asks about
deploying a JS project, state that Kyma deployment is not yet grounded in this skill
and refer them to the official SAP documentation for CAP on Kyma:
https://cap.cloud.sap/docs/guides/deployment/to-kyma

Note: `evolution/JouleStudio/deployment.md` contains grounding for Cloud Foundry
deployment (not Kyma). That content applies to `[LOCAL]` CF targets, not to JS.

---

## 9. GitHub Sync Workflow (JS <-> Local)

The standard operating pattern for JS projects is:
1. Develop in JS
2. **First push:** push from JS to a new GitHub repo (see §9.1)
3. **Clone locally:** pull to a `[JS-LOCAL]` environment and set up the local workspace (see §9.2)
4. **Work locally:** make changes following the compatibility lane rules (see §9.3)
5. **Push back:** verify and push to GitHub so JS can pull the changes (see §9.4)
6. Pull the updated repo back into JS

---

### 9.1 Task: First push from JS to GitHub

**When:** the user has a working project in Joule Studio and wants to move it to GitHub
for the first time so they can work locally.

> **[UNCONFIRMED-JS2] JS may automate some or all of the git steps below.**
> Joule Studio has a Git integration panel and may handle repository creation,
> initial commit, remote configuration, and push through its own UI. The exact
> steps it exposes, which it automates silently, and whether a terminal fallback
> is available have not been verified for JS 2.0.
>
> **Before executing any step below, ask the user:**
> "Does your Joule Studio workspace have a Git panel or a 'Push to GitHub' action?
> If yes, use that - it is the supported path. Come back here if it fails or if you
> need to verify the project config before pushing."
>
> If the user confirms JS handled the push via its own UI, skip to §9.1-A
> (post-push config verification) and do not run Steps 2-5 below.
> If no JS Git UI is available or it failed, continue with the manual steps.

**Before starting (manual path):** confirm the user has a GitHub account and an empty
(or new) repository created at GitHub. The agent does not create GitHub repos.

**Step 1 - Verify the JS project is in a clean state**

Run the §3.5 verification checklist before touching git. This is always required
regardless of whether JS automates the push, because a broken config pushed to GitHub
will break the local workspace and the return push.

```bash
node -e "const p=require('./package.json'); console.assert(p.workspaces?.includes('app/react-ui'),'FAIL workspaces'); console.log('workspaces OK')"
node -e "const p=require('./package.json'); console.assert(!p.cds?.['[development]']?.folders?.app,'FAIL dev folders'); console.log('dev folders OK')"
node -e "const s=require('fs').readFileSync('app/react-ui/vite.config.js','utf8'); console.assert(s.includes(\"base: './'\"),'FAIL base'); console.log('base OK')"
node -e "const s=require('fs').readFileSync('app/react-ui/vite.config.js','utf8'); ['@ui5/webcomponents-react','@ui5/webcomponents','@ui5/webcomponents-fiori','@ui5/webcomponents-icons','@ui5/webcomponents-base'].forEach(p=>console.assert(s.includes(p),'FAIL exclude '+p)); console.log('optimizeDeps OK')"
```

If any assertion fails, fix it before proceeding. A broken config pushed to GitHub will
break the local workspace and the return push to JS.

**Step 2 - Verify .gitignore covers build artefacts**

Check that `.gitignore` exists and contains all of:

```
node_modules/
app/react-ui/node_modules/
app/react-ui/dist/
*.sqlite
.cdsrc-private.json
gen/
```

If `.gitignore` is missing or incomplete, create or update it now. These files must
never be committed - they are either ephemeral (node_modules), environment-specific
(*.sqlite), or sensitive (.cdsrc-private.json).

**Step 3 - Check for accidental artefacts already staged**

```bash
git status
```

If `node_modules/`, `dist/`, or `*.sqlite` appear in the output, they are not yet
gitignored. Add them to `.gitignore` and run:

```bash
git rm -r --cached node_modules/ app/react-ui/node_modules/ app/react-ui/dist/ 2>/dev/null || true
git rm --cached *.sqlite 2>/dev/null || true
```

**Step 4 - Stage and commit source files**

```bash
git add .
git status   # review: confirm only source files are staged
```

Confirm the staged list contains only:
- `app/react-ui/src/` files (TSX, CSS)
- `app/react-ui/index.html`, `package.json`, `vite.config.js`
- Root `package.json`, `package-lock.json`
- `db/`, `srv/`, `test/` files
- `.gitignore`

Do NOT proceed if `node_modules/`, `dist/`, or `*.sqlite` appear in the staged list.

```bash
git commit -m "initial: JS project export"
```

**Step 5 - Push to GitHub**

```bash
git remote add origin https://github.com/<user>/<repo>.git
git branch -M main
git push -u origin main
```

If the repository already has commits (e.g. a README was added on GitHub), use:

```bash
git pull origin main --allow-unrelated-histories
git push -u origin main
```

**§9.1-A - Post-push config verification (always run, regardless of how push was done)**

After any push to GitHub - whether via JS Git UI or manual terminal - verify the
pushed content is safe to clone locally. Ask the user to open the GitHub repo and
confirm these files are present:

- `app/react-ui/vite.config.js` (must exist; contains `optimizeDeps.exclude`)
- `app/react-ui/package.json` (must have `"name": "react-ui"`)
- Root `package.json` (must have `"workspaces": ["app/react-ui"]`)

And that these are absent (not committed):

- `node_modules/` at any level
- `app/react-ui/dist/`
- `*.sqlite`

If absent files are present on GitHub, the `.gitignore` was not applied before the
push. The user must remove them with `git rm -r --cached` and push again. Cloning a
repo that contains committed `node_modules/` or `dist/` will produce a corrupted
local workspace that is difficult to untangle.

**Step 6 - Confirm**

Report: "Project is on GitHub and ready to clone locally.
Use the [JS-LOCAL] onboarding task (joule-studio.md §9.2) to set up your local workspace."

**Grounding note:** The JS Git automation steps above need verification against JS 2.0.
When this is grounded, update this section to reflect exactly which steps JS handles
via UI and which require terminal commands. Record findings in `evolution/JouleStudio/`.

---

### 9.2 Task: [JS-LOCAL] onboarding - first clone and local setup

**When:** the user has pushed the JS project to GitHub and wants to clone it locally
for the first time to do development or run DV checks.

**Prerequisites:**
- Node.js >= 18 installed locally
- Git installed
- `@sap/cds-dk` installed globally: `npm install -g @sap/cds-dk`
- The GitHub repo URL

**Step 1 - Clone the repo**

```bash
git clone https://github.com/<user>/<repo>.git
cd <repo>
```

**Step 2 - Install dependencies**

```bash
npm install
```

This single command installs both root CAP dependencies and `app/react-ui` dependencies,
because the root `package.json` declares `"workspaces": ["app/react-ui"]`. Do NOT
run `npm install` inside `app/react-ui/` separately - the workspace handles it.

Verify the workspace wired correctly:

```bash
node -e "const p=require('./package.json'); console.assert(p.workspaces?.includes('app/react-ui'),'FAIL'); console.log('workspace OK')"
```

**Step 3 - Run the §3.5 verification checklist**

Before starting any development, confirm the project is in a JS-compatible state:

```bash
node -e "const p=require('./package.json'); const dev=p.cds?.['[development]']; console.assert(!dev?.folders?.app,'FAIL: cds.[development].folders.app must not be set'); console.log('dev folders OK')"
node -e "const p=require('./package.json'); const v=p.cds?.['[production]']?.folders?.app; console.assert(v==='app/react-ui/dist','FAIL: got '+v); console.log('prod folders OK')"
node -e "const fs=require('fs'); console.assert(fs.existsSync('app/react-ui/vite.config.js'),'FAIL: vite.config.js missing'); console.log('vite.config.js OK')"
node -e "const s=require('fs').readFileSync('app/react-ui/vite.config.js','utf8'); console.assert(s.includes(\"base: './'\"),'FAIL: base'); console.log('base OK')"
node -e "const s=require('fs').readFileSync('app/react-ui/vite.config.js','utf8'); ['@ui5/webcomponents-react','@ui5/webcomponents','@ui5/webcomponents-fiori','@ui5/webcomponents-icons','@ui5/webcomponents-base'].forEach(p=>{console.assert(s.includes(p),'FAIL exclude '+p)}); console.log('optimizeDeps OK')"
```

If any check fails, fix the config before doing any development. A broken check means
the project will not work when pushed back to JS.

**Step 4 - Start the local server**

```powershell
# Windows (PowerShell) - hidden window so MCP tools stay connected
$log = "cds-watch.log"
Start-Process "cmd.exe" -ArgumentList "/c npm run dev > $log 2>&1" -WorkingDirectory (Resolve-Path ".").Path -WindowStyle Hidden
Start-Sleep -Seconds 10
Invoke-WebRequest -Uri "http://localhost:4004/react-ui/" -UseBasicParsing | Select-Object StatusCode
```

```bash
# macOS/Linux
npm run dev > cds-watch.log 2>&1 &
sleep 10
curl -s -o /dev/null -w "%{http_code}" http://localhost:4004/react-ui/
```

Expected: HTTP 200. The app is now accessible at `http://localhost:4004/react-ui/`
and the full DV protocol from `validation.md` can be run.

**Step 5 - Confirm environment**

Report: "Local workspace ready. App running at http://localhost:4004/react-ui/.
This is a [JS-LOCAL] environment - see joule-studio.md §9.3 for the compatibility
lane rules before making any changes."

---

### 9.3 Compatibility Lane Rules for [JS-LOCAL] Development

**Read these before making any change to the project.**

These rules exist because the project must continue to work in the JS preview after
local changes are pushed back. Violating any of them breaks the JS preview without
producing an obvious error.

#### What the agent MAY freely do

| Area | Safe actions |
|---|---|
| UI source | Any file under `app/react-ui/src/` - add, edit, delete TSX/JS/CSS |
| HTML entry | `app/react-ui/index.html` |
| Static assets | `app/react-ui/public/` |
| New dependencies | Add to `app/react-ui/package.json` then run `npm install` from project root |
| CDS backend | Any file under `db/`, `srv/`, `test/` |
| Root auth config | Add/edit users in `cds.[development].requires.auth.users` |
| Root new deps | Add to root `package.json` `dependencies` or `devDependencies` |

#### What the agent MUST NOT do

| Prohibited action | Why |
|---|---|
| Move `vite.config.js` out of `app/react-ui/` | `cds watch` only detects Vite apps inside `app/` - JS preview breaks |
| Move React source outside `app/react-ui/` | Same - cds watch stops serving the app |
| Change `base` from `'./'` to `'/'` in `vite.config.js` | Assets 404 under `/react-ui/` sub-path in JS |
| Change `outDir` from `'dist'` | Build output path assumed by `cds.[production].folders.app` |
| Remove any package from `optimizeDeps.exclude` | Causes JS preview health-check timeout |
| Add `cds.[development].folders.app` to root `package.json` | Breaks JS Vite auto-detection - single most common breakage |
| Remove `"workspaces": ["app/react-ui"]` from root `package.json` | Breaks dependency resolution |
| Change `"name"` in `app/react-ui/package.json` away from `"react-ui"` | Breaks workspace name resolution |
| Run `npm install` inside `app/react-ui/` directly | Creates a conflicting `package-lock.json`; always run from project root |
| Commit `node_modules/`, `dist/`, or `*.sqlite` | Pollutes the repo; JS will try to use committed artefacts |
| Add a second `package-lock.json` inside `app/react-ui/` | Conflicts with workspace lockfile at root |
| Change `cds.[production].folders.app` away from `"app/react-ui/dist"` | Production serve path breaks |

#### Compatibility check after any config change

Whenever the agent modifies `package.json` (root or `app/react-ui/`), `vite.config.js`,
or `.gitignore`, immediately re-run the §3.5 verification checklist. Do not proceed
with further changes if any assertion fails - fix it first.

---

### 9.4 Task: Push local changes back to JS (pre-push verification)

**When:** local development work is complete and the changes need to go back to GitHub
so they can be pulled into Joule Studio.

**Step 1 - Run the §3.5 verification checklist**

```bash
node -e "const p=require('./package.json'); console.assert(p.workspaces?.includes('app/react-ui'),'FAIL workspaces'); console.log('workspaces OK')"
node -e "const p=require('./package.json'); const dev=p.cds?.['[development]']; console.assert(!dev?.folders?.app,'FAIL dev folders set'); console.log('dev folders OK')"
node -e "const p=require('./package.json'); const v=p.cds?.['[production]']?.folders?.app; console.assert(v==='app/react-ui/dist','FAIL prod folders: '+v); console.log('prod folders OK')"
node -e "const fs=require('fs'); console.assert(fs.existsSync('app/react-ui/vite.config.js'),'FAIL vite.config.js location'); console.log('vite.config.js OK')"
node -e "const s=require('fs').readFileSync('app/react-ui/vite.config.js','utf8'); console.assert(s.includes(\"base: './'\"),'FAIL base'); console.log('base OK')"
node -e "const s=require('fs').readFileSync('app/react-ui/vite.config.js','utf8'); ['@ui5/webcomponents-react','@ui5/webcomponents','@ui5/webcomponents-fiori','@ui5/webcomponents-icons','@ui5/webcomponents-base'].forEach(p=>{console.assert(s.includes(p),'FAIL exclude '+p)}); console.log('optimizeDeps OK')"
```

**If any check fails: stop. Fix the config before pushing.** A broken check will cause
the JS preview to fail when the repo is pulled back in. The fix is nearly always cheaper
now than debugging after the push.

**Step 2 - Check for artefacts that must not be committed**

```bash
git status
```

If any of the following appear, do NOT stage them:

```
node_modules/
app/react-ui/node_modules/
app/react-ui/dist/
*.sqlite
.cdsrc-private.json
gen/
```

If they appear despite being in `.gitignore`, they may have been accidentally untracked.
Remove them from the index without deleting the files:

```bash
git rm -r --cached node_modules/ app/react-ui/node_modules/ app/react-ui/dist/ 2>/dev/null || true
git rm --cached *.sqlite .cdsrc-private.json 2>/dev/null || true
```

**Step 3 - Review the diff before staging**

```bash
git diff --stat
```

Confirm the changed files match what was intentionally modified. Files outside `app/react-ui/src/`,
`db/`, `srv/`, and `test/` warrant extra scrutiny - confirm any config file change
passes the §3.5 checks.

**Step 4 - Stage and commit**

```bash
git add .
git status   # final review of staged files
git commit -m "<describe what changed>"
```

Commit message convention: use present-tense imperative describing the change, e.g.
"add incident detail page", "fix status filter on list view", "update schema for urgency field".

**Step 5 - Push**

```bash
git push origin main
```

If there are upstream changes (another collaborator or the JS agent pushed since the
last pull), rebase first:

```bash
git pull --rebase origin main
git push origin main
```

Do not use merge commits (`git pull` without `--rebase`) - merge commits add noise and
can introduce conflicts in config files that break the JS preview.

**Step 6 - Verify the push is clean**

```bash
git log --oneline -5
git status   # should report "nothing to commit, working tree clean"
```

**Step 7 - Report to user**

Report: "Changes pushed to GitHub. The repo is ready to pull into Joule Studio.
In JS: use the Git panel or the Joule pull action to sync the repo. The JS preview
should start automatically after the pull completes. If the preview shows
`capPreviewErrorCdsWatchTimedOut`, verify `optimizeDeps.exclude` is intact in
`app/react-ui/vite.config.js` - it may have been removed during a local edit."

---

### 9.5 Preserving the structure - summary

The three-way contract (JS <-> GitHub <-> local) only holds if the project structure
is never broken by any party. The verification checklist in §3.5 is the single gate
that enforces this. Run it:

- Before the first push from JS (§9.1 Step 1)
- Immediately after cloning locally (§9.2 Step 3)
- After any config file change locally (§9.3 compatibility check)
- Before every push back to GitHub (§9.4 Step 1)

If the checklist passes, the project is safe to push. If it fails, the source of the
breakage is always one of the five prohibited config changes listed in §9.3.

---

## 10. Known Issues - JS 2.0

These issues have been observed and have confirmed fixes:

| Issue | Symptom | Fix |
|---|---|---|
| UI5 WC dep-optimisation timeout | JS preview shows `capPreviewErrorCdsWatchTimedOut` | Add `optimizeDeps.exclude` for all five `@ui5/*` packages in `vite.config.js` |
| Home directory missing | `ENOENT: no such file or directory, open '/home/vmuser/.cds-services.json'` on CDS shutdown | `mkdir -p /home/vmuser && echo '{}' > /home/vmuser/.cds-services.json` |
| node_modules wiped on restart | `Cannot find module '@sap/cds'` after sandbox restart | Run `npm install` at start of every session before any other command |
| Blank page on app load | App loads but shows blank white screen | Check `base: './'` in `vite.config.js` - must not be `'/'` |
| OData requests fail with HTTP 400 | `peg$SyntaxError: Parsing URL failed` | Replace `URLSearchParams` with `encodeURIComponent` (see §5.1) |
| livereload error on startup | `Error exposing live reload port 35729: fetch failed` | Non-fatal - ignore; server works correctly regardless |
| Deployed app inaccessible | HTTP 401 / JWT errors after Kyma deploy | Known blocker - JWT auth in managed SAP account; requires admin action to resolve |
