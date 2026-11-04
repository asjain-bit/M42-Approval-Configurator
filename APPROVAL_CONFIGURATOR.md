# M42 Approval Configurator

A web application for admins to design approval workflows visually. A workflow is a list of **stages**; each stage is a **flow** of connected steps. Everything is stored as plain, serializable data, and every screen is generated from that data.

- **Product name in the app:** M42 Workspace – Workflow configurator
- **Stack:** Next.js 15 (App Router), React 19, Tailwind CSS v4, `@xyflow/react` (React Flow) for the canvas, `@dagrejs/dagre` for auto-layout, `lucide-react` icons
- **Status:** configuration and visual representation only. There is no running workflow engine (see [Limitations](#14-limitations-and-open-points)).
- **Run it:** `pnpm install`, then `pnpm dev --port 3002`
- **Repository:** github.com/asjain-bit/M42-Approval-Configurator

---

## 1. Purpose

Admins need to describe how a request (for example a vendor's technical due diligence request) moves from intake to completion: who does what, in which order, what the possible results are, what happens when someone is late, and when the request ends.

The configurator lets an admin do this without code:

- Draw the whole process on one canvas, with one column per stage.
- Configure each step through a form written in plain business language.
- Define their own outcomes, conditions and answers wherever the built-in lists are not enough.
- Validate the workflow, publish versions, and see a history of every change.

The sample workflow that ships with the app is **Tech Due Diligence Workflow Management**.

---

## 2. Who uses it and how they get in

There is one role: **Admin**. Sign-in is a mock single sign-on.

| Behaviour | Detail |
| --- | --- |
| Login | "Sign in with SSO" on the first screen lands on the dashboard as the sample admin. |
| Session | Kept **in memory only**. A browser refresh or new tab returns to the login screen. Moving around inside the app keeps the session. |
| Sign out | From the left navigation. |

---

## 3. Screens and navigation

```
Login  →  Dashboard (workflow list)  →  Workflow stages page  →  Stage builder (canvas)
```

| Route | Screen | What it does |
| --- | --- | --- |
| `/` | Login | Mock SSO. |
| `/dashboard` | Workflow directory | Grid of workflows with search, create, duplicate, archive and delete. |
| `/workflows/[workflowId]` | Stages page | Ordered list of the workflow's stages. |
| `/workflows/[workflowId]/stages/[stageId]` | Stage builder | The canvas, the node library, and the configuration form. |

### 3.1 Dashboard

- Workflows are shown as cards (grid only). The search box sits before the **Create workflow** button.
- Each card shows name, description, status (Draft, Published, Archived) and version.
- A workflow's name must be unique.

### 3.2 Stages page

- One row per stage with the number of steps and a health chip (open issues and "to confirm" items).
- **Add stage** at the end or between stages; **edit** name and description; **remove** with confirmation.
- **Reorder by dragging** a row (there are no up/down arrows). The list uses the full page width.

### 3.3 Stage builder

Three areas side by side, under the shared header and a stage bar:

| Area | Content |
| --- | --- |
| **Left: node library** | Searchable, grouped list of every node type. Drag onto the canvas, or click to add below the lowest existing step. Collapses to icons on narrow windows. |
| **Centre: canvas** | The whole workflow: every stage as a column, joined by arrows. The stage being edited is live. |
| **Right: configuration** | Stage settings when nothing is selected; the selected step's form otherwise. Can be hidden. |

**Stage bar.** A numbered row of all stages with health chips. Clicking a stage switches the canvas to it. A "+" adds a stage.

**Header (stages page and canvas).** Breadcrumb, editable workflow name and description, status chip with version, save state, and the buttons:

| Button | Purpose |
| --- | --- |
| Version history | Every published version, with restore. |
| Audit log | Every change, filterable. |
| Validate | All issues, with a "Go to" link for each. |
| Publish | Publishes the current draft as a version (disabled while errors exist). |

> The workflow **Settings** button was removed for now; its code remains in the project.

---

## 4. The canvas

### 4.1 One shared canvas, one column per stage

- Every stage is a column with its number and name at the top. A thin **divider line** separates one stage from the next (there is no outline box).
- The stage being edited is highlighted with a teal number. Steps in other stages are shown dimmed for context; clicking one opens that stage.
- **Teal arrows** join the stages. A finishing step ("Stage complete") is drawn straight into the next stage's start step. Where there is no start step, the arrow goes to the stage's first step or the column.
- A step's outcome can also hand over directly to another stage (see [Connecting steps and stages](#43-connecting-steps-and-stages)); that is drawn as a teal arrow labelled with the outcome.

### 4.2 Navigation

| Action | Result |
| --- | --- |
| Mouse wheel / trackpad scroll | Moves around the canvas (does not zoom). |
| Ctrl or Cmd + wheel, or pinch | Zooms. |
| Drag empty space | Pans. |
| Toolbar: Undo / Redo | Up to 100 steps; consecutive edits to one field count as one step. |
| Toolbar: Auto-layout | Arranges the stage's steps top to bottom. |
| Toolbar: Fit this stage | Frames the stage being edited. |
| Toolbar: Show all stages | Frames the whole workflow. |
| Zoom controls and mini-map | Bottom corners. |
| Right-click a step | Duplicate or delete. |
| Delete / Backspace | Deletes the selected step or connection (with confirmation for steps). |
| Escape | Clears the selection. |

Steps cannot be dragged left of or above their own stage's column, so positions stay stable when other stages change.

### 4.3 Connecting steps and stages

- **Within a stage:** drag from an outcome's handle to another step, or choose a destination under **Connect the outcomes** in the form, or click the **+** under an unconnected outcome to add and connect a new step.
- **To another stage:** in **Then go to**, pick **Stage: …** from the "Go to another stage" group. The request continues at that stage's start. An outcome that hands over to another stage counts as the end of this stage's flow.
- **Not connected** outcomes show in red on the card and are reported by validation.

### 4.4 Colours

| Meaning | Colour |
| --- | --- |
| Start steps | Green |
| End steps (Stage complete, Close request, Stop with label) | Red |
| Human steps | Blue |
| AI agent steps | Violet |
| System steps | Slate |
| Decisions | Sky blue |
| If / And / Or | Indigo |
| Merge / Split | Cyan |
| SLA check | Orange |
| On hold | Amber |

---

## 5. Node library

The library is grouped into three categories. Start steps are green and end steps are red.

### 5.1 Start & end

| Node | Purpose |
| --- | --- |
| **Form submission** | The vendor fills in a form, which opens the case. First stage only; one start per stage. |
| **Stage start** | Where a stage begins. Starts when: the previous stage completes, a specific stage completes, **something happens (custom)**, or an admin starts it by hand. |
| **Stage complete** | Ends the stage and unlocks the next one (next in order, even one not built yet, or a stage you choose). Has a completion condition, "wait for every parallel path", and an optional status. |
| **Close request** | Ends the whole request. See [Close request](#62-close-request). |
| **Stop with label** | Halts the request without rejecting it, with a status, a note and who can resume it. |

### 5.2 Actions

| Node | Purpose |
| --- | --- |
| **AI Agent** | An AI agent checks or analyses the request. |
| **Human Task** | A person does a piece of work or decides. |
| **Approval** | One or more people approve or reject. |
| **Collect Responses** | Several people answer independently; the flow carries on when a chosen condition is met. |
| **Send Notification** | Sends an email or in-app message. |

AI Agent, Human Task, Approval and Send Notification are **starting points for the same general Step** (see [The general Step](#61-the-general-step)); they only differ in the settings they begin with.

### 5.3 Decisions & flow control

| Node | Purpose |
| --- | --- |
| **Decision** | Routes the request: from a question, an input field, or rules on earlier answers. |
| **If** | If conditions are true go one way, otherwise another. Choose AND or OR. |
| **And** | Continue only when all conditions are true. |
| **Or** | Continue when any one condition is true. |
| **Merge** | Brings several paths back together; waits for all, or continues on the first. |
| **Split** | Sends the request down several paths at the same time. |
| **SLA check** | Checks whether a chosen step was done within its time limit and routes on the result. |
| **On hold** | Parks the request or waits for a response; can offer a "Resumed" outcome. |

---

## 6. Node reference

### 6.1 The general Step

One node type covers every "someone does some work" case. The admin answers three questions.

**1. Who does it?**

| Actor | Details |
| --- | --- |
| A person | Pick the vendor, a role, a team, one person, or your own. **How many people** (default 1) and, above 1, **when the step is done**: everyone has responded, any one has, more than half have, or your own rule. |
| An AI agent | Pick the agent and list what it does, in order. |
| The system, automatically | Runs without a person. |

**2. What do they do?**

| Actor | Actions |
| --- | --- |
| Person | Submit a form · Approve or reject · Review and decide · Provide information · Upload documents · Confirm something is done · Something else |
| Agent | Check or validate · Analyse and recommend · Generate a document · Extract information · Something else |
| System | Send an email · Send an in-app notification · Wait for a set time · Call an integration · Update the case status · Something else |

Each action reveals only its own fields (form, instructions, agent tasks, template and recipients, wait time, integration, status).

**3. What can happen next?** The admin names the **outcomes** in their own words. Picking an action fills in sensible defaults (for example approval gives Approved and Rejected); the admin can rename, add and remove them, and edits are kept if the action changes later. Each outcome becomes a path to connect. An outcome can also ask for something when it is chosen (for example a reason).

**More settings for a person (collapsed by default):**

- *What the person sees and fills in:* information and documents to show; inputs they must fill in.
- *Choose people from earlier responses:* the person also picks a main person or people and extras, from a Collect Responses step, optionally limited to people who gave a chosen answer. Names for the choices and the counts are configurable (for example "Lead sponsor" ×1 and "Co-sponsors" up to 4).
- *SLA and reminders:* time limit, when the clock starts, reminders, and what happens on breach. Not used for form submissions, agents or system steps.

### 6.2 Close request

| Setting | Detail |
| --- | --- |
| Status shown | **Optional.** Leave empty when no status should show (for example the agent rejects and only an email is sent). |
| Closure reason | **Required**, **Optional** or **Not asked**. |
| Reason source | Written in the node, or taken from a case field. |
| Internal notes | Optional; only admins see them. |
| Email the vendor | Toggle, with an email template (or your own). |

The card is red and says the request ends. A close step has no outgoing connection, so it never unlocks another stage.

### 6.3 Collect Responses

For "several people answer on their own".

| Section | Settings |
| --- | --- |
| Who responds? | People you choose here (people, roles, teams) **or** people found by an earlier step; how many responses to expect. |
| How can they respond? | The response options, defined by the admin (for example Proceed & Sponsor, Proceed Without Sponsoring, Reject). |
| When is collecting finished? | Everyone has responded · a minimum number · at least N people give a particular answer · all expected responses received · a rule you set (AND / OR) · the deadline passes. |
| Deadline and reminders | A deadline; what happens if it passes first (carry on with the responses so far, or take a separate "Deadline reached" path); optional reminders. |
| Advanced: finishing early | When finishing before everyone has answered: stop collecting and ignore late replies, or keep collecting and record them. |

The collected answers become **one list of responses** that decisions can count and filter ("Number of responses", "Number of responses where Response is …"). A deadline is always required, so a step can never wait for ever.

### 6.4 Decision

Three ways to decide:

| Mode | How it works |
| --- | --- |
| **A question with answers to pick from** | The admin lists the options; each becomes an outcome. |
| **An input field to fill in** | Short text, long text, number, date, yes or no, file upload, or your own type; can be required. One outcome, "Input received". |
| **Worked out from earlier answers, using rules** | A visual rule builder. Each **outcome** has its own name, rules and destination. Rules choose data from earlier steps (case data, form answers, collected responses), a comparison and a value. Rules in an outcome are combined with **AND, OR or NOT**. The request takes the first outcome whose rules are true. An optional **default outcome** catches everything else. |

Comparisons: is, is not, is any of, is none of, more than, at least, less than, at most, is empty, is not empty, contains.

### 6.5 If / And / Or

Small condition nodes with two outcomes, **Yes** and **No**. Each has a list of conditions (field, comparison, value). **If** lets the admin choose AND or OR; **And** and **Or** are fixed. The field list comes from the case data, or the admin types their own.

### 6.6 Split and Merge

- **Split:** names several paths that start together; each is an outcome to connect.
- **Merge:** one outcome, "Continue". Waits for every path or continues when any arrives. Needs at least two paths leading into it.

### 6.7 SLA check

Choose a step that has a time limit. Outcomes: Within time limit, Overdue, and optionally Nearly due.

### 6.8 On hold

A status to show and a toggle for "the request can continue later", which adds a Resumed outcome.

---

## 7. Custom values everywhere

Wherever a dropdown cannot list every option, the last entry is **+ Add your own…**. Choosing it shows a text box; what is typed is used on the card and in summaries. This applies to:

person or group, agent, form, message template, integration, decision input type, "the step is done when", and condition fields. Other places already take free text: outcomes, response options, decision options, the "Something else" action, and the custom start trigger.

A custom value counts as filled in for validation as soon as it has text.

---

## 8. Validation

**Validate** lists every issue with a plain-language message and a **Go to** link. Errors block publishing; warnings and "to confirm" items do not.

**General**

- Every step has a unique name and all required fields filled in.
- Every outcome is connected to a step or to another stage.
- Every step is reachable from the stage's start.
- The stage reaches an ending (Stage complete, Close request, Stop with label, or a hand-over to another stage).
- No loop without a way out.
- Human steps carry a time limit and a breach action.

**By node**

- *Collect Responses:* recipients; a deadline (message: "Configure a response deadline or timeout behaviour so this workflow can continue when members do not respond."); minimum not above the expected number; a valid finishing answer; an expected number when needed; a reminder time.
- *Decision (rules):* every outcome named and with rules; data and answers still exist; no empty comparison value; no two outcomes with identical rules; a warning when outcomes might both be true at once and there is no default; a default or second outcome so every request has a route.
- *Step (person):* at least one person; choosing people only from an existing Collect Responses step and an existing answer; **sponsor selection cannot be reached without a decision that checks there are eligible people**.
- *Close request:* a reason when "Required".
- *Stage complete:* a chosen stage must exist; a warning if there is no next stage yet.
- *Merge:* at least two incoming paths.
- *SLA check:* the checked step must still exist.
- *Form submission:* first stage only.

---

## 9. Versions, audit and saving

| Feature | Behaviour |
| --- | --- |
| **Autosave** | Changes save automatically after a short pause; the header shows Saving… / Saved. |
| **Draft and publish** | Editing a published workflow turns it back into a draft with the next version number. |
| **Version history** | Each publish keeps a snapshot, its summary, date and author. A version can be **restored as a new draft** after confirmation; published versions stay in the history. |
| **Publish summary** | Pre-filled from the changes since the last publish; editable. |
| **Audit log** | Every create, rename, edit, reorder, remove, connect and publish, with before and after values, who and when. Filter by stage, level and date. |

---

## 10. Data model

All configuration is JSON of these types (`src/types/workflow.ts`).

```
Workflow
  id, name, description, status (draft | published | archived)
  version, publishedVersion, updatedAt, updatedBy
  stageIds[]               ← the order of stages
  stages{ id → Stage }
  settings                 ← case ID format, calendar, reminder time, timezone, event rules

Stage
  id, name, description, enabled, statusLabels
  nodes{ id → WorkflowNode }
  edges[]                  ← always derived from outcomes
  layout{ nodeId → x, y }

WorkflowNode
  id, type, name, description
  config{}                 ← everything the form edits
  outcomes[]               ← derived from config by the node type
  sla?, toConfirm?

Outcome
  id, key, label
  targetNodeId | null      ← a step in this stage
  targetStageId?           ← or hand over to another stage

WorkflowVersion
  id, version, at, by, summary, snapshot (a whole Workflow)
```

Key rules:

- **Stable ids.** Every node and outcome has a stable id; editing a node keeps its connections unless the admin changes them.
- **Outcomes follow configuration.** When the admin edits answers, options or paths, the node's outcomes are rebuilt and existing connections are kept by key.
- **Edges are derived** from outcomes, never edited directly.
- **Rules** are data: `RuleGroup { match: all | any | none, rules[] }` where a rule compares a case field or an aggregate (count, count where) to a value.

---

## 11. Architecture

```
src/
  app/                          Next.js routes: login, dashboard, workflow, stage
  components/
    screens/ templates/ organisms/ atoms/   Login, app shell, sidebar, avatar
    workflows/                  Directory, stages page, header, drawers, publish, version history
    builder/                    Canvas, node card, stage box, palette, form, fields, SLA, recipients
    ui/                         Modal, drawer, menu, toast, chips, shared class recipes (styles.ts)
  lib/
    registry/nodes.ts           ★ The node registry: one object per node type
    registry/types.ts           Schema types for node types and form fields
    registry/options.ts, shared.ts   Option lists, SLA defaults, custom-value helpers
    workflow/graph.ts           Outcomes ⇄ edges, case data, stage links
    workflow/validation.ts      All validation rules
    workflow/conditions.ts      Rule evaluation (AND / OR / NOT, counts) on plain data
    workflow/layout.ts, canvasLayout.ts   Auto-layout and the column layout of stages
    workflow/useStageEditor.ts  Editing state, undo/redo, autosave, audit
    library.ts                  Sample forms, agents, people, templates, integrations
    repository.ts               Async storage API with saved-data migration
    seed.ts                     The sample workflow
    session.ts                  Mock sign-in
  types/workflow.ts             The data model
```

### 11.1 Schema-driven design

Each node type is **one object** in `nodes.ts`. The palette, the canvas card, the configuration form and the validator all read from it, so adding a node type means adding one entry. A node type defines:

| Field | Role |
| --- | --- |
| `key`, `category`, `label`, `icon`, `description` | Identity and where it appears in the library. |
| `isStart`, `isEnd`, `shape`, `accent`, `cardTone`, `mapColor` | How it looks. `view()` lets the look change with settings (for example by actor). |
| `defaultConfig()` | Starting settings. |
| `configSchema[]` | Sections and fields of the form: kinds include text, textarea, number, toggle, select, radio, list, duration, recipients, branches (rule builder) and note; `showIf` hides fields; `allowCustom` adds "+ Add your own…"; `collapsed` folds a section. |
| `getOutcomes(node)` | Outcomes the node offers, from its configuration. |
| `summary(node)` | The one-line description on the card. |
| `outputs(node)` | Case data the node produces (used by later decisions). |
| `validate(node, ctx)`, `isAllowed(ctx)` | Extra rules. |
| `slaFor`, `onConfigChange` | A time limit that depends on settings, and keeping related settings in step. |

Separate concerns: rendering (`NodeCard`, `StageBox`), configuration UI (`NodeForm`, `FieldRenderer`), condition evaluation (`conditions.ts`) and storage (`repository.ts`) do not depend on one another's internals.

### 11.2 Storage and compatibility

- Data is kept in the browser (`localStorage`, key `m42-workflow-configurator.v2`) behind an **async repository interface**, so a real API can replace it without UI changes.
- On load, saved data is **migrated**: old step types become the general Step or the start/end steps, new settings get defaults, stray duplicate start steps are removed, and empty stages get a start step. Existing workflows keep working.
- Reset the sample data by clearing that key.

### 11.3 Design language

Tokens, fonts and class recipes are shared with the TDD portal. Inputs, selects and cards use a very light grey for hover and focus (not the primary teal). Dropdowns have their own chevron with space on the right. Confirmation popups have no outline.

---

## 12. Sample workflow: Tech Due Diligence

Six stages, in this order:

1. **Initial Assessment Brief**
2. **Internal Canvas**
3. **Strategic Alignment**
4. **NDA**
5. **Discovery Call**
6. **Value & Due Diligence**

### Stage 1 – Initial Assessment Brief

Vendor submits the form → intake agent analysis (passes or fails) → Partnership Admin review (Proceed / Reject) → request-type decision (Partnership / Procurement / M&A; the last two park the request) → Director review (Proceed / Reject / Request more info) → Stage complete. Rejections close the request.

### Stage 2 – Internal Canvas (built from the general steps)

```
Internal Canvas Start
  → Collect Internal Interest Responses        (5 members, everyone responds, deadline + reminders)
  → Evaluate Internal Interest Responses       (Decision, rules on the collected responses)
       ├─ No Responses                 → Close Request — No Responses
       ├─ Sponsor Candidates Available → Director Selects Sponsor & Co-sponsors → Internal Canvas Complete
       └─ No Sponsor Candidates        → Director Review — No Sponsor Candidates  → Close Request — No Sponsor
```

| Part | Configuration |
| --- | --- |
| Collect | Recipients: the Internal Interest Team; expected 5; answers **Proceed & Sponsor**, **Proceed Without Sponsoring**, **Reject**; finishes when everyone has responded; 5 business-day deadline, evaluate what was received if it passes; reminders after 3 business days. |
| Decision | Outcome A: response count **is 0**. Outcome B: count of "Proceed & Sponsor" **is more than 0**. Outcome C: response count **is more than 0 AND** "Proceed & Sponsor" count **is 0**. No default; the three are provably exclusive. "Reject" stays its own answer and is never counted as a sponsor. |
| Sponsor selection | Director; shows vendor submission, member responses, sponsor candidates and assessment details; exactly one lead sponsor and up to four co-sponsors, only from people who answered "Proceed & Sponsor". |
| Director review | Shows vendor submission, all responses and the response summary; confirms the closure. |
| Close requests | Status "Closed"; reason required (predefined). They end the request and unlock nothing. |
| Stage complete | Condition: the Director has confirmed the lead sponsor and co-sponsors; unlocks the **next stage in the configured order** (Strategic Alignment). |

### Stages 3–6

Each begins with a Stage start step, ready to be built.

**Open items marked "to confirm":** the response deadline and reminder timing for stage 2, the two director time limits in stage 2, and the placeholder case ID format, calendar and reminder time in the workflow settings.

---

## 13. Verification

The Stage 2 decision rules were checked against these cases using the real saved rules and the condition evaluator:

| # | Case | Result |
| --- | --- | --- |
| 1 | All five respond "Proceed & Sponsor" | Sponsor Candidates Available |
| 2 | One sponsor, four without sponsoring | Sponsor Candidates Available |
| 3 | All five without sponsoring | No Sponsor Candidates |
| 4 | Nobody responds before the deadline | No Responses → request closes |
| 5 | Some respond, nobody sponsors | No Sponsor Candidates |
| 6 | A mixture of sponsor, non-sponsor and reject | Sponsor Candidates Available |

Every combination of 0–5 responses matched **exactly one** outcome, and collecting always ended (everyone responded, or the deadline passed), so no request is left waiting.

Typecheck (`pnpm typecheck`) and lint (`pnpm lint`) pass.

---

## 14. Limitations and open points

- **No workflow engine.** Nothing runs requests. Descriptions such as "everyone has responded", "unlock the next stage" and "the request ends" describe what a runtime would do. The rule evaluator in `conditions.ts` is separate so a runtime can reuse it.
- **Storage is in the browser.** Workflows are not shared between people or devices until the repository is pointed at a real API.
- **Sample library.** Forms, agents, people, templates, calendars and integrations are sample data in `library.ts`. Several are marked "(sample)".
- **Recipients.** Stage 2 uses the Internal Interest Team because no earlier step yet produces a list of people. "People found by an earlier step" works once one does.
- **Not built:** a reopening mechanism for closed requests; a separate notification node beyond Send Notification; workflow-level settings screen (hidden for now).
- **Mock sign-in.** There is a single sample admin.
- **Dev note.** The sign-in is not remembered across refreshes by design.

---

## 15. Adding a node type

Add one object to `NODE_TYPES` in `src/lib/registry/nodes.ts` (and, to appear in the library, an entry in `PALETTE`):

```ts
const myNode: NodeTypeDef = {
  key: 'myNode',
  category: 'steps',                 // startEnd | steps | flow
  label: 'My node',
  icon: Plug,
  description: 'One line for the library.',
  defaultName: 'My node',
  defaultConfig: () => ({ target: '' }),
  configSchema: [{ id: 'main', title: 'Settings', fields: [
    { key: 'target', label: 'Target', kind: 'text', required: true },
  ] }],
  getOutcomes: () => [{ key: 'done', label: 'Done' }],
  summary: (n) => String(n.config.target || 'Not set'),
}
```

The library, canvas card, form and validator pick it up automatically. Optional extras: `view` (look from settings), `slaFor` (time limit), `onConfigChange`, `outputs` (case data), `validate`, `isAllowed`, `collapsed` sections, and `allowCustom` fields.
