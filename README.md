# M42 Workspace – Workflow configurator

Admin configurator for approval workflows (spec: `WORKFLOW_CONFIGURATOR_SPEC.md`).
Next.js 15 · React 19 · Tailwind v4 · React Flow (`@xyflow/react`) · dagre. Branding, fonts and tokens are copied from TDD Phase 2.

```bash
pnpm install
pnpm dev --port 3002
```

Sign in with SSO (mock, role: Admin) → **Dashboard** lists workflows → open one for its **stages** → open a stage for the **builder** (palette · canvas · form).

## Where things live

| Path | What |
| --- | --- |
| `src/types/workflow.ts` | Data model (§5). Everything is JSON of these types. |
| `src/lib/seed.ts` | The Tech Due Diligence workflow (§9). The only place the business process is described. |
| `src/lib/library.ts` | Shared modules: forms, questionnaires, agents, people, templates, calendars, integrations. |
| `src/lib/repository.ts` | `workflowRepository` – async API over localStorage. Swap for a real API without UI changes. |
| `src/lib/registry/nodes.ts` | **Step registry** – start steps (Form submission, Stage start, green), end steps (Stage complete, Close request, Stop with label, red) the general **Step** (who does it · what they do · outcomes you name, how many people, choosing people from earlier responses), **Collect Responses**, a rules-based **Decision**, If / And / Or, Merge, Split, SLA check and On hold. |
| `src/lib/workflow/conditions.ts` | Evaluates rules (AND / OR / NOT, counts of collected responses) on plain data. Separate from the UI; a runtime can reuse it. |
| `src/lib/workflow/graph.ts` | Outcomes ⇄ edges sync, case data dictionary, helpers. |
| `src/lib/workflow/validation.ts` | Validation rules (§8.3.5). |
| `src/components/builder/*` | Stage builder: canvas, node card, palette, schema-driven form. |
| `src/components/workflows/*` | Directory, stages list, header, validation/audit drawers, publish. |

## Adding a node type

Add one object to `NODE_TYPES` in `src/lib/registry/nodes.ts`:

```ts
const myNode: NodeTypeDef = {
  key: 'myNode',
  category: 'steps',               // palette group: startEnd | steps | flow
  label: 'My node',
  icon: Plug,                      // any lucide icon
  description: 'One line for the palette.',
  defaultName: 'My node',
  defaultConfig: () => ({ target: '' }),
  configSchema: [{ id: 'main', title: 'Settings', fields: [
    { key: 'target', label: 'Target', kind: 'text', required: true },
  ] }],
  getOutcomes: () => [{ key: 'done', label: 'Done' }],
  summary: (n) => String(n.config.target || 'Not set'),
}
```

The palette, canvas card, form and validator pick it up automatically. Set `accent` / `cardTone` for its colours (or `view` to change them with the step's settings), `sla: 'human'` (or `slaFor` when it depends on the settings), `onConfigChange` to keep related settings in step to get the SLA block, `eventNotifications: true` for the notifications block, `outputs` to add fields to the case data dictionary, and `isAllowed` / `validate` for extra rules.

To reset the demo data, clear the `m42-workflow-configurator.v2` key in localStorage.
