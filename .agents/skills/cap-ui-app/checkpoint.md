# Checkpoint Protocol

**When to load:** Load this file when starting a long operation, when an MCP resource fails, or when resuming a session from a checkpoint.

---

## 1. When to write a checkpoint

Write or update `.agent-checkpoint.md` in the CAP project root:
- Before any operation estimated to take longer than 2 minutes
- Before starting each new app in a multi-app generation run
- Before any server start or stop
- When any MCP resource becomes unavailable
- After completing each major phase (generation, SV, DV, usability testing)

---

## 2. Checkpoint file format

File location: `<CAP-project-root>/.agent-checkpoint.md`

```markdown
# Agent Checkpoint - [ISO date/time]

## Task
[One sentence describing the overall task]

## Progress
- [x] Step 1: [completed step description]
- [x] Step 2: [completed step description]
- [ ] Step 3: [next step - RESUME HERE]
- [ ] Step 4: [future step]

## Resource state
- CAP server: [running on port NNNN / stopped]
- Vite server(s): [running on port(s) NNNN / stopped]
- Chrome MCP: [available / unavailable]
- Firefox MCP: [available / unavailable]
- UI5 MCP: [available / unavailable]
- Fiori tools MCP: [available / unavailable]

## App state
- Apps generated: [list, or "none"]
- Apps validated (SV): [list, or "none"]
- Apps validated (DV): [list, or "none"]
- Known issues: [list, or "none"]

## Testing state
- testing/ folder: [exists / not created]
- intent.md: [complete / draft / not created]
- test-plan.md: [complete / draft / not created]
- Clicky.md: [N tasks / not created]
- Last ST run: [date - N/N pass / not run]
- Last DT-F run: [date - N/N pass / not run]
- Last DT-U-A run: [date - N/N tasks pass / not run]
- Last DT-U-H session: [date / not run]
- Open defects: [N total: D-001, D-002, ...]

## Resume instruction
[Exact action the agent should perform to resume. Be specific enough that a new session
can continue without asking the user for context. Example:
"Resume DV validation for incidents/wc4r. App is running on port 5102. Navigate to
http://localhost:5102 and begin from DV-1."]
```

---

## 3. MCP resource failure decision tree

When any MCP server that was working becomes unavailable (tool returns an error, times out, or the connection is lost):

```
Step 1: Write a checkpoint immediately (before any other action)

Step 2: Identify the failed resource
  Examples: Chrome MCP, Firefox MCP, UI5 MCP, Fiori tools MCP

Step 3: Select a response strategy

  a) Is there an equivalent alternative resource available?
 - Chrome MCP unavailable -> Firefox MCP available: offer to switch
 - fiori_execute_functionality unavailable -> manual annotation editing
 - cds_search_model unavailable -> run "cds compile '*' --to serviceinfo" from CLI
 - ui5_run_ui5_linter unavailable -> run "npx @ui5/linter" from CLI
     Action: "The [resource] MCP server became unavailable. I can continue using
     [alternative]. Shall I switch?"

  b) Can this step be skipped or worked around without quality loss?
 - DV checks cannot run without browser MCP -> SV checks can still run
 - Browser snapshot unavailable -> proceed but note check is unverified
     Action: "The [resource] is unavailable. I will [workaround] instead.
     The [check] will be noted as unverified in the report."

  c) Is autonomous mode active?
     Yes: apply best available workaround silently, record in checkpoint and report
     No: present options to user and wait for a decision before proceeding

  d) No alternative, no workaround, not autonomous:
     "The [resource] MCP server is unavailable and no alternative exists for this step.
     I have saved a checkpoint to .agent-checkpoint.md. Please restart the agent session
     and tell me to resume from the checkpoint."
```

---

## 4. Session resume procedure

When a new session starts and `.agent-checkpoint.md` exists in the project root:

1. Read the checkpoint file
2. Offer to resume: "I found a checkpoint from [date]. The last completed step was [step N].
   The next step is: [resume instruction]. Shall I resume from there?"
3. Before resuming DV or usability testing steps: re-verify that required MCP servers are available
4. Re-verify that CAP and Vite servers are running (use health checks from cap-shared.md §14)
5. If servers are down: restart them silently before resuming (do not ask the user to restart)

---

## 5. Autonomous mode

If the user has asked the agent to operate autonomously (e.g. "do this without interrupting me"):
- Apply the best available workaround for any failure without asking
- Record every workaround and skipped check in the checkpoint file
- Include a "Autonomous mode deviations" section in the final report listing all workarounds applied
- Still write checkpoints regularly so the user can review progress at any time
