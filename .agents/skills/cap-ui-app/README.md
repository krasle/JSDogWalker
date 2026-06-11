# cap-ui-app Skill

A skill for creating, validating, and improving UI applications built on an SAP CAP (Cloud Application Programming Model) OData V4 backend.

Covers four UI technologies: **SAP Fiori Elements**, **Freestyle SAPUI5**, **UI5 Web Components for React (WC4R)**, and **FX Components for React**. If you have not chosen a technology, the skill helps you decide.

---

## What this skill does

| Task | Description |
|---|---|
| **Validate a CAP backend** | Confirm the backend is reachable, correctly structured, and safe to build on |
| **Generate a new UI app** | Scaffold and configure a UI app against a specific CAP service |
| **Validate an existing UI app** | Check a generated or hand-written app for correctness, UX quality, and accessibility |
| **Improve an existing app** | Propose and automate fixes ranked by severity |

---

## How to install

A skill is a folder containing a `SKILL.md` file. This folder (`cap-ui-app/`) is that folder. The additional `.md` files alongside `SKILL.md` are the skill's reference files, which the agent loads progressively on demand.

This skill follows the [Agent Skills open standard](https://agentskills.io/), supported by OpenCode, Claude Code, Cursor, GitHub Copilot, VS Code, Cline, and many other agents. Installation means copying the `cap-ui-app/` folder to the location your agent scans for skills.

### Quick install (cross-agent, project-local)

```sh
# From your CAP project root
mkdir -p .agents/skills
cp -r /path/to/cap-ui-app .agents/skills/cap-ui-app
```

### Per-agent installation paths

| Agent | Project path | Global path |
|---|---|---|
| OpenCode | `.opencode/skills/` `.claude/skills/` `.agents/skills/` | `~/.config/opencode/skills/` `~/.claude/skills/` |
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| Cursor | `.cursor/skills/` `.agents/skills/` `.claude/skills/` | `~/.cursor/skills/` `~/.agents/skills/` |
| VS Code Copilot | `.github/skills/` `.claude/skills/` `.agents/skills/` | `~/.copilot/skills/` `~/.agents/skills/` |
| GitHub Copilot CLI | `.github/skills/` `.agents/skills/` | `~/.copilot/skills/` `~/.agents/skills/` |
| Cline | `.cline/skills/` | `~/.cline/skills/` |
| Claude.ai / API | upload `cap-ui-app/` folder as a project file or knowledge base | - |

**`.agents/skills/` is the most portable single path** - scanned by OpenCode, Cursor, VS Code Copilot, and GitHub Copilot CLI.

### After installation

- Restart your agent session (or reload the window) to pick up the skill.
- Verify it loaded: ask the agent "What skills do you have available?" - it should list `cap-ui-app`.
- If it does not appear, check:
  1. The file is named `SKILL.md` (all caps)
  2. The folder is named `cap-ui-app` - must match the `name` field in the YAML frontmatter
  3. The path is `...skills/cap-ui-app/SKILL.md`, not `...skills/SKILL.md`
  4. For Cline: use `.cline/skills/`, not `.agents/skills/`

### Without a skills-aware agent

Paste the content of `SKILL.md` into your system prompt or at the start of your conversation, then ask the agent to read the other `.md` files as needed.

---

## How to invoke

Once installed, describe your task - the agent discovers and loads the skill automatically:

```
I want to create a UI for my CAP service. I haven't chosen a technology yet.
```

```
Validate the CAP backend at C:\Projects\myapp before I start building.
```

```
Generate a Fiori Elements List Report for the Orders entity in my CAP service.
```

```
Validate the existing SAPUI5 app in app/com.myorg.myapp and suggest improvements.
```

---

## Validation menu

When asked to validate an app, the agent **must present a menu** before running any check. The user chooses between:

- **Menu A** - Browser available (full SV + DV with live browser checks)
- **Menu B** - No browser available (SV static checks only)

The agent waits for an explicit selection before proceeding. A request to "validate the app" does not grant permission to run all checks automatically.

---

## File structure

This skill uses a **two-tier loading strategy** to keep agent context lean for common tasks.

### Tier 1 - loaded for generation tasks

| File | Purpose |
|---|---|
| `SKILL.md` | Entry point - tech selection, task routing, non-negotiables |
| `enterprise-ready.md` | Proactive design rules (ER-N) - must be loaded before any scaffolding |
| `cap-shared.md` | Core CAP/OData V4 rules shared by all UI technologies |
| `react-cap-shared.md` | React+Vite+CAP patterns (WC4R and FX only) |
| `ux-standards.md` | SAP UX, UA, and accessibility standards |
| `validation.md` | Post-generation validation protocols (SV static + DV browser); includes mandatory validation menu |
| `sapui5.md` | Freestyle SAPUI5 tech overlay |
| `fiori-elements.md` | Fiori Elements tech overlay |
| `wc4r.md` | UI5 Web Components for React tech overlay |
| `fx.md` | FX Components for React tech overlay |

### Tier 2 - loaded additionally for validation and debugging

| File | Load when |
|---|---|
| `cap-ref.md` | Advanced OData, debugging unexplained HTTP 4xx errors |
| `fe-ref.md` | Full FE annotation reference; complete limitations table; UX failure patterns |
| `sapui5-ref.md` | Sort table patterns, form layout edge cases, extended blank-page causes |
| `wc4r-ref.md` | Full component API; TypeScript casting; i18n; recharts |
| `fx-ref.md` | Fiori floorplan implementations; utility hooks; UX principles |
| `print.md` | Any Report or printable page - canonical `@media print` template |
| `faceted-review.md` | Deep quality audit after Clicky suite passes |
| `testing-protocol.md` | Creating or running task-based Clicky test suites |
| `checkpoint.md` | Session resume state and MCP failure recovery |

### Loading matrix

| Task | Technology | Files loaded |
|---|---|---|
| Generate | Fiori Elements | `enterprise-ready` + `cap-shared` + `ux-standards` + `sapui5` + `fiori-elements` |
| Generate | Freestyle SAPUI5 | `enterprise-ready` + `cap-shared` + `ux-standards` + `sapui5` |
| Generate | WC4R | `enterprise-ready` + `cap-shared` + `react-cap-shared` + `ux-standards` + `wc4r` |
| Generate | FX | `enterprise-ready` + `cap-shared` + `react-cap-shared` + `ux-standards` + `fx` |
| Validate/Improve | Fiori Elements | Above + `validation` + `cap-ref` + `fe-ref` |
| Validate/Improve | Freestyle SAPUI5 | Above + `validation` + `cap-ref` + `sapui5-ref` |
| Validate/Improve | WC4R | Above + `validation` + `cap-ref` + `wc4r-ref` |
| Validate/Improve | FX | Above + `validation` + `cap-ref` + `fx-ref` |
| Validate CAP only | Any | `SKILL.md` + `cap-shared` + `cap-ref` |

---

## What is not covered

- **Deployment**: BTP Cloud Foundry, SAP Launchpad intent registration, Approuter
- **SAP HANA Cloud**: all findings are from SQLite; HANA behavior may differ
- **CAP Java**: all CAP findings are for CAP Node.js
- **OData V2**: all patterns assume OData V4
- **SAPUI5 versions before 1.119**

---

## Version

v1.9 - see the repository `evolution/README.md` for full version history.
