/**
 * Step type definitions. One object per step type; palette, card, form and
 * validator all read from these. Add a step type by adding one entry here.
 *
 * Start steps are green and end steps are red. Everything in between is built
 * from the one general "Step": who does it (a person, an AI agent or the
 * system), what they do, and the outcomes the admin names.
 */

import {
  Ban,
  CircleCheck,
  CircleX,
  Cog,
  FileInput,
  Filter,
  Flag,
  GitBranch,
  GitFork,
  GitMerge,
  Merge,
  Network,
  Package,
  Play,
  Sparkles,
  Split,
  Timer,
  User,
  Users,
} from 'lucide-react'
import { newId } from '@/lib/id'
import { findAgent, findForm, findIntegration, findRole, findTeam, findTemplate, findUser } from '@/lib/library'
import { durationText } from '@/lib/workflow/describe'
import type { DurationUnit, Rule, RuleGroup, Stage, WorkflowNode } from '@/types/workflow'
import {
  agentOptions,
  caseFieldOptions,
  formOptions,
  integrationOptions,
  opt,
  roleOptions,
  teamOptions,
  templateOptions,
  userOptions,
} from './options'
import { asArray, asString, customText, fieldsToOutputs, humanSla, isCustom } from './shared'
import type { CategoryDef, NodeCategory, NodeIssue, NodeTypeDef, NodeView, OptionItem } from './types'

export const CATEGORIES: CategoryDef[] = [
  { key: 'startEnd', label: 'Start & end', icon: Flag, accent: 'bg-slate-100 text-slate-600 border-slate-200', mapColor: '#94a3b8' },
  { key: 'steps', label: 'Actions', icon: Sparkles, accent: 'bg-[#ddf7f9] text-[#36c0c9] border-[#b5ecef]', mapColor: '#36c0c9' },
  { key: 'flow', label: 'Decisions & flow control', icon: GitBranch, accent: 'bg-sky-50 text-sky-600 border-sky-200', mapColor: '#0ea5e9' },
]

export const categoryOf = (key: NodeCategory) => CATEGORIES.find((c) => c.key === key)!

/** Icon-tile classes for a step type (falls back to its category) */
export const nodeAccent = (def: NodeTypeDef) => def.accent ?? categoryOf(def.category).accent
/** Minimap colour for a step type */
export const nodeMapColor = (def: NodeTypeDef) => def.mapColor ?? categoryOf(def.category).mapColor

/** Everything the canvas and form header need to draw one step */
export function nodeView(node: WorkflowNode): NodeView {
  const def = getNodeType(node.type)
  return {
    icon: def.icon,
    accent: nodeAccent(def),
    cardTone: def.cardTone ?? 'bg-white border-[#e2e8f0]',
    mapColor: nodeMapColor(def),
    label: def.label,
    ...def.view?.(node),
  }
}

/** Which SLA block (if any) a step carries */
export const slaKind = (def: NodeTypeDef, node: WorkflowNode) => (def.slaFor ? def.slaFor(node) : def.sla)

/** Steps with no outcomes end the stage's flow */
export const isEnding = (node: WorkflowNode) => node.outcomes.length === 0

const countText = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

type Item = { id: string; label: string }
const items = (v: unknown) => asArray<Item>(v)
const newItem = (label = '') => ({ id: newId('opt'), label })
const itemsOf = (labels: string[]) => labels.map((l) => newItem(l))
const itemOutcomes = (v: unknown, fallback: string) =>
  items(v).map((d, i) => ({ key: d.id, label: d.label.trim() || `${fallback} ${i + 1}` }))

/** Steps that check something and send the request one way or another */
const GATE_TYPES = new Set(['decision', 'ifCondition', 'andCondition', 'orCondition'])

/** Can the request get from one step to another without passing through a decision? */
function reachesWithoutCheck(stage: Stage, fromId: string, toId: string) {
  const seen = new Set<string>()
  const stack = [fromId]
  while (stack.length) {
    const id = stack.pop()!
    if (seen.has(id) || !stage.nodes[id]) continue
    seen.add(id)
    for (const o of stage.nodes[id].outcomes) {
      if (o.targetNodeId === toId) return true
      const next = o.targetNodeId && stage.nodes[o.targetNodeId]
      if (next && !GATE_TYPES.has(next.type)) stack.push(next.id)
    }
  }
  return false
}

const hasStart = (stage: Stage) => Object.values(stage.nodes).some((n) => getNodeType(n.type).isStart)

/** Roles, teams and people in one list, with the vendor first */
const assigneeOptions = (): OptionItem[] => [
  { value: 'vendor', label: 'Vendor', hint: 'The external company', group: 'External' },
  ...roleOptions().map((o) => ({ ...o, group: 'Roles' })),
  ...teamOptions().map((o) => ({ ...o, group: 'Teams' })),
  ...userOptions().map((o) => ({ ...o, group: 'People' })),
]
const assigneeName = (id: unknown) =>
  isCustom(id) ? customText(id) : id === 'vendor' ? 'Vendor' : (findRole(id)?.name ?? findTeam(id)?.name ?? findUser(id)?.name)
/** Name of a library item, or the text the admin typed in themselves */
const nameOf = (id: unknown, find: (id: unknown) => { name: string } | undefined) => (isCustom(id) ? customText(id) : find(id)?.name)

// ── LOOKS ───────────────────────────────────────────────────────────────────

const START_LOOK = {
  accent: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  cardTone: 'bg-emerald-50 border-emerald-300',
  mapColor: '#10b981',
}
const END_LOOK = {
  accent: 'bg-red-50 text-red-600 border-red-200',
  cardTone: 'bg-red-50 border-red-300',
  mapColor: '#ef4444',
}

// ── START & END ─────────────────────────────────────────────────────────────

const formSubmission: NodeTypeDef = {
  key: 'formSubmission',
  category: 'startEnd',
  label: 'Form submission',
  icon: FileInput,
  description: 'The vendor fills in a form, which opens the case.',
  ...START_LOOK,
  isStart: true,
  shape: 'pill',
  defaultName: 'Vendor submits the form',
  defaultConfig: () => ({
    formId: '',
    submitters: 'vendors',
    confirmationMessage: 'Thank you. Your request has been submitted.',
  }),
  configSchema: [
    {
      id: 'form',
      title: 'Form',
      fields: [
        { key: 'formId', label: 'Form', kind: 'select', required: true, allowCustom: true, options: formOptions },
        {
          key: 'submitters',
          label: 'Who can submit',
          kind: 'radio',
          options: opt([
            ['vendors', 'Vendors, through the portal'],
            ['internal', 'Internal users'],
          ]),
        },
        { key: 'confirmationMessage', label: 'Message shown after submitting', kind: 'textarea', maxLength: 300 },
      ],
    },
  ],
  getOutcomes: () => [{ key: 'submitted', label: 'Submitted' }],
  summary: (n) => nameOf(n.config.formId, findForm) ?? 'No form selected',
  outputs: (n) => {
    const form = findForm(n.config.formId)
    return [{ key: 'caseId', label: 'Case ID', type: 'text' }, ...(form ? fieldsToOutputs(form.fields) : [])]
  },
  isAllowed: ({ workflow, stage }) =>
    workflow.stageIds[0] !== stage.id
      ? { allowed: false, reason: 'Only the first stage can start with a form.' }
      : hasStart(stage)
        ? { allowed: false, reason: 'This stage already has a start.' }
        : { allowed: true },
  validate: (_node, ctx) =>
    ctx.workflow.stageIds[0] !== ctx.stage.id
      ? [{ severity: 'error', message: 'Only the first stage can start with a form submission.' }]
      : [],
}

const START_EVENTS = opt([
  ['vendorSubmits', 'The vendor submits a form'],
  ['caseCreated', 'A new case is created'],
  ['other', 'Something else…'],
])

const startEventText = (config: Record<string, unknown>) =>
  config.event === 'other'
    ? asString(config.eventText) || 'Something happens'
    : (START_EVENTS.find((o) => o.value === config.event)?.label ?? 'Something happens')

const stageStart: NodeTypeDef = {
  key: 'stageStart',
  category: 'startEnd',
  label: 'Stage start',
  icon: Play,
  description: 'Where a stage begins, and what makes it begin.',
  ...START_LOOK,
  isStart: true,
  shape: 'pill',
  defaultName: 'Stage start',
  defaultConfig: () => ({ startsWhen: 'previousStage', stageId: '', event: 'vendorSubmits', eventText: '' }),
  configSchema: [
    {
      id: 'start',
      title: 'When does this stage start?',
      fields: [
        {
          key: 'startsWhen',
          label: 'Starts when',
          kind: 'radio',
          options: opt([
            ['previousStage', 'The previous stage completes'],
            ['specificStage', 'A specific stage completes'],
            ['event', 'Something happens (custom)'],
            ['manual', 'An admin starts it by hand'],
          ]),
        },
        {
          key: 'stageId',
          label: 'Which stage',
          kind: 'select',
          required: true,
          options: (ctx) =>
            ctx.workflow.stageIds
              .filter((id) => id !== ctx.stage.id && ctx.workflow.stages[id])
              .map((id) => ({ value: id, label: ctx.workflow.stages[id].name })),
          showIf: (s) => s.startsWhen === 'specificStage',
        },
        {
          key: 'event',
          label: 'What happens',
          kind: 'select',
          required: true,
          options: START_EVENTS,
          help: 'The stage does not wait for any other stage. It starts as soon as this happens.',
          showIf: (s) => s.startsWhen === 'event',
        },
        {
          key: 'eventText',
          label: 'Describe it',
          kind: 'text',
          required: true,
          maxLength: 80,
          placeholder: 'e.g. The vendor uploads the signed NDA',
          showIf: (s) => s.startsWhen === 'event' && s.event === 'other',
        },
      ],
    },
  ],
  getOutcomes: () => [{ key: 'start', label: 'Start' }],
  summary: (n) => {
    switch (n.config.startsWhen) {
      case 'specificStage':
        return 'When a chosen stage completes'
      case 'event':
        return startEventText(n.config)
      case 'manual':
        return 'Started by hand'
      default:
        return 'When the previous stage completes'
    }
  },
  isAllowed: ({ stage }) => (hasStart(stage) ? { allowed: false, reason: 'This stage already has a start.' } : { allowed: true }),
}

const stageComplete: NodeTypeDef = {
  key: 'stageComplete',
  category: 'startEnd',
  label: 'Stage complete',
  icon: CircleCheck,
  description: 'Ends the stage and unlocks the next one.',
  ...END_LOOK,
  isEnd: true,
  shape: 'pill',
  defaultName: 'Stage complete',
  defaultConfig: () => ({ unlock: 'next', stageId: '', statusLabel: 'Completed', condition: '', waitForAll: true }),
  configSchema: [
    {
      id: 'complete',
      title: 'Completion',
      fields: [
        {
          key: 'unlock',
          label: 'Unlock',
          kind: 'radio',
          options: opt([
            ['next', 'The next stage in order'],
            ['choose', 'A stage I choose'],
          ]),
          help: 'Pick "next stage in order" to join a stage you have not built yet: it connects as soon as you add it.',
        },
        {
          key: '_noNext',
          label: '',
          kind: 'note',
          text: 'This is the last stage for now. Add a stage and this step will connect to its start.',
          showIf: (s, ctx) => s.unlock !== 'choose' && ctx.workflow.stageIds[ctx.workflow.stageIds.length - 1] === ctx.stage.id,
        },
        {
          key: 'stageId',
          label: 'Stage to unlock',
          kind: 'select',
          required: true,
          options: (ctx) =>
            ctx.workflow.stageIds
              .filter((id) => id !== ctx.stage.id && ctx.workflow.stages[id])
              .map((id) => ({ value: id, label: ctx.workflow.stages[id].name })),
          showIf: (s) => s.unlock === 'choose',
        },
        {
          key: 'condition',
          label: 'Completion condition (optional)',
          kind: 'text',
          maxLength: 120,
          placeholder: 'e.g. The director has confirmed the lead sponsor',
          help: 'What has to be true for this stage to count as complete. Shown to whoever reads the flow.',
        },
        {
          key: 'waitForAll',
          label: 'Wait for every parallel path to finish',
          kind: 'toggle',
          help: 'Turn on when the stage has been split into paths: it completes only after all of them reach this step.',
        },
        { key: 'statusLabel', label: 'Status shown for this stage (optional)', kind: 'text', maxLength: 60 },
        {
          key: '_note',
          label: '',
          kind: 'note',
          text: 'When this runs, the stage is marked complete and the next stage is unlocked. It does not unlock anything if the request was closed.',
        },
      ],
    },
  ],
  getOutcomes: () => [],
  summary: (n) => (n.config.unlock === 'choose' ? 'Unlocks a chosen stage' : 'Unlocks the next stage'),
  validate: (n, ctx) => {
    if (n.config.unlock === 'choose')
      return n.config.stageId && !ctx.workflow.stages[String(n.config.stageId)]
        ? [{ severity: 'error', message: 'The stage this unlocks no longer exists. Choose another.', field: 'stageId' }]
        : []
    const ids = ctx.workflow.stageIds
    return ids[ids.length - 1] === ctx.stage.id
      ? [{ severity: 'warning', message: 'There is no next stage to unlock yet. Add a stage after this one, or choose a stage.', field: 'unlock' }]
      : []
  },
}

const closeRequest: NodeTypeDef = {
  key: 'closeRequest',
  category: 'startEnd',
  label: 'Close request',
  icon: CircleX,
  description: 'Ends the whole request with a status.',
  ...END_LOOK,
  isEnd: true,
  shape: 'pill',
  defaultName: 'Close request',
  defaultConfig: () => ({ statusLabel: '', reasonMode: 'optional', reasonSource: 'predefined', reason: '', reasonField: '', notes: '', emailVendor: false, templateId: '' }),
  configSchema: [
    {
      id: 'close',
      title: 'Closing',
      fields: [
        {
          key: 'statusLabel',
          label: 'Status shown (optional)',
          kind: 'text',
          maxLength: 60,
          placeholder: 'e.g. Rejected – Partnership Admin',
          help: 'Leave empty when no status should be shown, for example when the agent rejects and the vendor is only emailed.',
        },
        {
          key: 'reasonMode',
          label: 'Closure reason',
          kind: 'radio',
          options: opt([
            ['required', 'Required'],
            ['optional', 'Optional'],
            ['none', 'Not asked'],
          ]),
          help: 'Whether a reason has to be recorded when the request is closed.',
        },
        {
          key: 'reasonSource',
          label: 'Where the reason comes from',
          kind: 'radio',
          options: opt([
            ['predefined', 'I write it here'],
            ['dynamic', 'It comes from the case'],
          ]),
          showIf: (s) => s.reasonMode !== 'none',
        },
        {
          key: 'reason',
          label: 'Reason',
          kind: 'text',
          maxLength: 200,
          placeholder: 'e.g. No internal interest members responded',
          showIf: (s) => s.reasonMode !== 'none' && s.reasonSource !== 'dynamic',
        },
        {
          key: 'reasonField',
          label: 'Take the reason from',
          kind: 'caseFieldSelect',
          options: caseFieldOptions(['text']),
          placeholder: 'Choose a field',
          showIf: (s) => s.reasonMode !== 'none' && s.reasonSource === 'dynamic',
        },
        { key: 'notes', label: 'Internal notes (optional)', kind: 'textarea', maxLength: 300, help: 'Only admins see these.' },
        { key: 'emailVendor', label: 'Email the vendor', kind: 'toggle' },
        {
          key: 'templateId',
          label: 'Email template',
          kind: 'select',
          required: true,
          allowCustom: true,
          options: templateOptions,
          showIf: (s) => !!s.emailVendor,
        },
        {
          key: '_ends',
          label: '',
          kind: 'note',
          text: 'The request ends here. It does not move on to the next stage.',
        },
      ],
    },
  ],
  getOutcomes: () => [],
  summary: (n) => `${asString(n.config.statusLabel) || 'Closed'} · ends the request`,
  validate: (n) => {
    const c = n.config
    if (c.reasonMode !== 'required') return []
    if (c.reasonSource === 'dynamic')
      return c.reasonField ? [] : [{ severity: 'error', message: 'Choose where the closure reason comes from.', field: 'reasonField' }]
    return asString(c.reason).trim() ? [] : [{ severity: 'error', message: 'Write the closure reason, or make it optional.', field: 'reason' }]
  },
}

const stopWithLabel: NodeTypeDef = {
  key: 'stopWithLabel',
  category: 'startEnd',
  label: 'Stop with label',
  icon: Ban,
  description: 'Halts the request without rejecting it.',
  ...END_LOOK,
  isEnd: true,
  shape: 'pill',
  defaultName: 'Stop with label',
  defaultConfig: () => ({ statusLabel: '', note: '', resumers: [] }),
  configSchema: [
    {
      id: 'stop',
      title: 'Stop',
      fields: [
        { key: 'statusLabel', label: 'Status shown', kind: 'text', required: true, maxLength: 60, placeholder: 'e.g. Paused by the sponsor' },
        { key: 'note', label: 'Note', kind: 'textarea', maxLength: 300 },
        { key: 'resumers', label: 'Who can resume it', kind: 'recipients', recipientKinds: ['role', 'team', 'user'] },
      ],
    },
  ],
  getOutcomes: () => [],
  summary: (n) => asString(n.config.statusLabel) || 'No status set',
}

// ── STEP: who does it, what they do, what can happen ────────────────────────

type Actor = 'human' | 'agent' | 'system'

interface ActionDef {
  value: string
  label: string
  /** Outcomes a new step of this kind starts with; the admin can rename, add or remove them */
  outcomes: string[]
}

const ACTORS: Record<Actor, { label: string; short: string; first: string }> = {
  human: { label: 'A person', short: 'Human', first: 'review' },
  agent: { label: 'An AI agent', short: 'Agent', first: 'check' },
  system: { label: 'The system, automatically', short: 'System', first: 'email' },
}

const ACTIONS: Record<Actor, ActionDef[]> = {
  human: [
    { value: 'submit', label: 'Submit a form', outcomes: ['Submitted'] },
    { value: 'approve', label: 'Approve or reject', outcomes: ['Approved', 'Rejected'] },
    { value: 'review', label: 'Review and decide', outcomes: ['Proceed', 'Reject'] },
    { value: 'provide', label: 'Provide information', outcomes: ['Information provided'] },
    { value: 'upload', label: 'Upload documents', outcomes: ['Uploaded'] },
    { value: 'confirm', label: 'Confirm something is done', outcomes: ['Confirmed'] },
    { value: 'custom', label: 'Something else', outcomes: ['Done'] },
  ],
  agent: [
    { value: 'check', label: 'Check or validate', outcomes: ['Passed', 'Failed'] },
    { value: 'analyse', label: 'Analyse and recommend', outcomes: ['Completed'] },
    { value: 'generate', label: 'Generate a document', outcomes: ['Generated'] },
    { value: 'extract', label: 'Extract information', outcomes: ['Extracted'] },
    { value: 'custom', label: 'Something else', outcomes: ['Done'] },
  ],
  system: [
    { value: 'email', label: 'Send an email', outcomes: ['Sent'] },
    { value: 'notify', label: 'Send an in-app notification', outcomes: ['Sent'] },
    { value: 'wait', label: 'Wait for a set time', outcomes: ['Time is up'] },
    { value: 'integration', label: 'Call an integration', outcomes: ['Succeeded', 'Failed'] },
    { value: 'update', label: 'Update the case status', outcomes: ['Updated'] },
    { value: 'custom', label: 'Something else', outcomes: ['Done'] },
  ],
}

const actorOf = (config: Record<string, unknown>): Actor => (config.actor === 'agent' || config.actor === 'system' ? config.actor : 'human')
const actionOf = (config: Record<string, unknown>) => ACTIONS[actorOf(config)].find((a) => a.value === config.action)
const defaultOutcomes = (config: Record<string, unknown>) => actionOf(config)?.outcomes ?? ['Done']

const STEP_LOOKS: Record<Actor, Pick<NodeView, 'icon' | 'accent' | 'cardTone' | 'mapColor'>> = {
  human: { icon: User, accent: 'bg-blue-50 text-blue-600 border-blue-200', cardTone: 'bg-blue-50 border-blue-200', mapColor: '#3b82f6' },
  agent: { icon: Sparkles, accent: 'bg-violet-50 text-violet-600 border-violet-200', cardTone: 'bg-violet-50 border-violet-200', mapColor: '#8b5cf6' },
  system: { icon: Cog, accent: 'bg-slate-100 text-slate-600 border-slate-200', cardTone: 'bg-slate-50 border-slate-200', mapColor: '#64748b' },
}

const is = (actor: Actor, ...actions: string[]) => (s: Record<string, unknown>) =>
  actorOf(s) === actor && (actions.length === 0 || actions.includes(asString(s.action)))

/** Give the step the outcomes of its current action, but only if the admin hasn't made their own */
function resetOutcomes(prev: WorkflowNode, next: WorkflowNode): WorkflowNode {
  const before = items(prev.config.outcomes)
  const untouched = defaultOutcomes(prev.config).length === before.length && before.every((o, i) => o.label === defaultOutcomes(prev.config)[i])
  if (!untouched) return next
  // Keep ids by position so existing connections survive a change of action
  const outcomes = defaultOutcomes(next.config).map((label, i) => ({ id: before[i]?.id ?? newId('opt'), label }))
  return { ...next, config: { ...next.config, outcomes } }
}

const step: NodeTypeDef = {
  key: 'step',
  category: 'steps',
  label: 'Step',
  icon: User,
  description: 'Someone or something does a piece of work. Choose who, what they do and what can happen next.',
  accent: 'bg-blue-50 text-blue-600 border-blue-200',
  cardTone: 'bg-blue-50 border-blue-200',
  mapColor: '#3b82f6',
  defaultName: 'New step',
  defaultConfig: () => ({
    actor: 'human',
    assignee: '',
    approvers: 1,
    approvalRule: 'all',
    agentId: '',
    action: 'review',
    customAction: '',
    formId: '',
    instructions: '',
    displayInfo: [],
    requiredInputs: [],
    choosePeople: false,
    chooseFrom: '',
    chooseOnly: '',
    chooseMainCount: 1,
    chooseMainLabel: 'Lead',
    chooseExtraMax: 0,
    chooseExtraLabel: 'Others',
    tasks: [newItem()],
    templateId: '',
    recipients: [],
    wait: { value: 1, unit: 'businessDays' },
    integrationId: '',
    statusLabel: '',
    outcomes: itemsOf(['Proceed', 'Reject']),
  }),
  defaultSla: humanSla,
  slaFor: (n) => (actorOf(n.config) === 'human' && n.config.action !== 'submit' ? 'human' : undefined),
  view: (n) => {
    const actor = actorOf(n.config)
    const action = actionOf(n.config)
    const what = action?.value === 'custom' ? asString(n.config.customAction) || 'Custom' : (action?.label ?? '')
    return { ...STEP_LOOKS[actor], label: `${ACTORS[actor].short} · ${what}` }
  },
  onConfigChange: (prev, next, path) => {
    if (path === 'actor') {
      const actor = actorOf(next.config)
      return resetOutcomes(prev, { ...next, config: { ...next.config, action: ACTORS[actor].first } })
    }
    if (path === 'action') return resetOutcomes(prev, next)
    return next
  },
  configSchema: [
    {
      id: 'who',
      title: 'Who does this step?',
      fields: [
        {
          key: 'actor',
          label: 'Done by',
          kind: 'radio',
          options: (Object.keys(ACTORS) as Actor[]).map((value) => ({ value, label: ACTORS[value].label })),
        },
        {
          key: 'assignee',
          label: 'Which person or group',
          kind: 'select',
          required: true,
          allowCustom: true,
          options: assigneeOptions,
          help: 'The vendor, a role, a team or one person.',
          showIf: is('human'),
        },
        {
          key: 'approvers',
          label: 'How many people',
          kind: 'number',
          min: 1,
          max: 50,
          help: 'How many people this request goes to. Use more than one for several approvers.',
          showIf: is('human'),
        },
        {
          key: 'approvalRule',
          label: 'The step is done when',
          kind: 'select',
          allowCustom: true,
          options: opt([
            ['all', 'Everyone has responded'],
            ['any', 'Any one person has responded'],
            ['majority', 'More than half have responded'],
          ]),
          showIf: (s) => actorOf(s) === 'human' && Number(s.approvers) > 1,
        },
        { key: 'agentId', label: 'Which agent', kind: 'select', required: true, allowCustom: true, options: agentOptions, showIf: is('agent') },
      ],
    },
    {
      id: 'what',
      title: 'What do they do?',
      fields: [
        {
          key: 'action',
          label: 'Action',
          kind: 'select',
          required: true,
          options: (_ctx, scope) => ACTIONS[actorOf(scope)].map((a) => ({ value: a.value, label: a.label })),
        },
        {
          key: 'customAction',
          label: 'Describe the action',
          kind: 'text',
          required: true,
          maxLength: 60,
          placeholder: 'e.g. Sign the agreement',
          showIf: (s) => s.action === 'custom',
        },
        { key: 'formId', label: 'Form to fill in', kind: 'select', required: true, allowCustom: true, options: formOptions, showIf: is('human', 'submit') },
        {
          key: 'instructions',
          label: 'What they need to do',
          kind: 'textarea',
          maxLength: 300,
          placeholder: 'e.g. Review the assessment brief and the agent analysis',
          showIf: (s) => actorOf(s) === 'human' && s.action !== 'submit',
        },
        {
          key: 'tasks',
          label: 'What the agent does',
          kind: 'list',
          help: 'One line for each thing the agent does, in order.',
          minItems: 1,
          addLabel: 'Add agent task',
          newItem: () => newItem(),
          itemSchema: [{ key: 'label', label: 'Agent task', kind: 'text', required: true, placeholder: 'e.g. Check for duplicate requests' }],
          showIf: is('agent'),
        },
        { key: 'templateId', label: 'Message template', kind: 'select', required: true, allowCustom: true, options: templateOptions, showIf: is('system', 'email', 'notify') },
        {
          key: 'recipients',
          label: 'Send to',
          kind: 'recipients',
          recipientKinds: ['vendor', 'role', 'team', 'user'],
          showIf: is('system', 'email', 'notify'),
        },
        { key: 'wait', label: 'Wait for', kind: 'duration', showIf: is('system', 'wait') },
        { key: 'integrationId', label: 'Integration', kind: 'select', required: true, allowCustom: true, options: integrationOptions, showIf: is('system', 'integration') },
        { key: 'statusLabel', label: 'Status shown', kind: 'text', required: true, maxLength: 60, showIf: is('system', 'update') },
      ],
    },
    {
      id: 'info',
      title: 'What the person sees and fills in',
      collapsed: true,
      showIf: (c) => actorOf(c) === 'human',
      fields: [
        {
          key: 'displayInfo',
          label: 'Information and documents to show',
          kind: 'list',
          help: 'Everything the person should be able to look at, for example the vendor submission or earlier responses.',
          addLabel: 'Add information',
          newItem: () => newItem(),
          itemSchema: [{ key: 'label', label: 'Shown', kind: 'text', required: true, placeholder: 'e.g. Vendor submission' }],
        },
        {
          key: 'requiredInputs',
          label: 'Inputs they must fill in',
          kind: 'list',
          addLabel: 'Add input',
          newItem: () => newItem(),
          itemSchema: [{ key: 'label', label: 'Input', kind: 'text', required: true, placeholder: 'e.g. Comments' }],
        },
      ],
    },
    {
      id: 'pick',
      title: 'Choose people from earlier responses',
      collapsed: true,
      showIf: (c) => actorOf(c) === 'human',
      fields: [
        {
          key: 'choosePeople',
          label: 'This person also chooses people',
          kind: 'toggle',
          help: 'For example a director who picks a lead and others from the people who offered to take part.',
        },
        {
          key: 'chooseFrom',
          label: 'Choose from the responses of',
          kind: 'select',
          required: true,
          options: (ctx) =>
            Object.values(ctx.stage.nodes)
              .filter((n) => n.type === 'collectResponses')
              .map((n) => ({ value: n.id, label: n.name })),
          showIf: (s) => !!s.choosePeople,
        },
        {
          key: 'chooseOnly',
          label: 'Only people who answered',
          kind: 'select',
          placeholder: 'Anyone who responded',
          help: 'Leave empty to allow everyone who responded. People who gave any other answer cannot be chosen.',
          options: (ctx, s) => items(ctx.stage.nodes[String(s.chooseFrom)]?.config.responseOptions).map((o) => ({ value: o.id, label: o.label })),
          showIf: (s) => !!s.choosePeople && !!s.chooseFrom,
        },
        { key: 'chooseMainLabel', label: 'Name for the main choice', kind: 'text', maxLength: 40, placeholder: 'e.g. Lead sponsor', showIf: (s) => !!s.choosePeople },
        { key: 'chooseMainCount', label: 'How many main people (exactly)', kind: 'number', min: 1, max: 20, showIf: (s) => !!s.choosePeople },
        { key: 'chooseExtraLabel', label: 'Name for the extra choices', kind: 'text', maxLength: 40, placeholder: 'e.g. Co-sponsors', showIf: (s) => !!s.choosePeople },
        { key: 'chooseExtraMax', label: 'How many extra people at most', kind: 'number', min: 0, max: 50, showIf: (s) => !!s.choosePeople },
      ],
    },
    {
      id: 'outcomes',
      title: 'What can happen next?',
      fields: [
        {
          key: 'outcomes',
          label: 'Outcomes',
          kind: 'list',
          help: 'Name every result this step can have, in your own words. Each one becomes a path you connect to the next step.',
          minItems: 1,
          addLabel: 'Add outcome',
          newItem: () => newItem(),
          itemSchema: [
            { key: 'label', label: 'Outcome', kind: 'text', required: true, placeholder: 'e.g. Needs more information' },
            { key: 'ask', label: 'Ask for this when it is chosen (optional)', kind: 'text', maxLength: 80, placeholder: 'e.g. A reason' },
          ],
        },
      ],
    },
  ],
  getOutcomes: (n) => itemOutcomes(n.config.outcomes, 'Outcome'),
  summary: (n) => {
    const c = n.config
    switch (actorOf(c)) {
      case 'human': {
        const who = (assigneeName(c.assignee) ?? 'Nobody chosen') + (Number(c.approvers) > 1 ? ` · ${c.approvers} people` : '')
        return c.action === 'submit' ? `${who} · ${nameOf(c.formId, findForm) ?? 'No form selected'}` : who
      }
      case 'agent': {
        const agent = nameOf(c.agentId, findAgent)
        return agent ? `${agent} · ${countText(items(c.tasks).filter((t) => t.label.trim()).length, 'task')}` : 'No agent selected'
      }
      default:
        switch (c.action) {
          case 'email':
          case 'notify':
            return nameOf(c.templateId, findTemplate) ?? 'No template chosen'
          case 'wait': {
            const w = c.wait as { value: number | null; unit: DurationUnit } | undefined
            return w ? `Wait ${durationText(w)}` : 'No time set'
          }
          case 'integration':
            return nameOf(c.integrationId, findIntegration) ?? 'No integration chosen'
          case 'update':
            return asString(c.statusLabel) || 'No status set'
          default:
            return asString(c.customAction) || 'Automatic step'
        }
    }
  },
  validate: (n, ctx) => {
    const c = n.config
    const out: NodeIssue[] = []
    if (actorOf(c) !== 'human') return out
    if (!(Number(c.approvers) >= 1)) out.push({ severity: 'error', message: 'Say how many people this step goes to (at least 1).', field: 'approvers' })
    if (c.choosePeople) {
      const from = ctx.stage.nodes[String(c.chooseFrom)]
      if (c.chooseFrom && !from) out.push({ severity: 'error', message: 'The step whose responses are used for choosing people no longer exists.', field: 'chooseFrom' })
      if (from && c.chooseOnly && !items(from.config.responseOptions).some((o) => o.id === c.chooseOnly))
        out.push({ severity: 'error', message: 'The answer people must have given no longer exists.', field: 'chooseOnly' })
      if (!(Number(c.chooseMainCount) >= 1)) out.push({ severity: 'error', message: 'Say how many main people must be chosen (at least 1).', field: 'chooseMainCount' })
      // Choosing people is only safe once something has checked that there is somebody to choose
      if (from && c.chooseOnly && reachesWithoutCheck(ctx.stage, from.id, n.id))
        out.push({
          severity: 'error',
          message: 'This step can be reached when nobody is eligible to be chosen. Add a decision before it that counts the people with that answer.',
          field: 'chooseFrom',
        })
    }
    return out
  },
  outputs: (n) => {
    const form = actorOf(n.config) === 'human' && n.config.action === 'submit' ? findForm(n.config.formId) : undefined
    return form ? fieldsToOutputs(form.fields) : []
  },
}

// ── DECISIONS & HOLDS ───────────────────────────────────────────────────────

const INPUT_TYPES = opt([
  ['text', 'Short text'],
  ['longText', 'Long text'],
  ['number', 'Number'],
  ['date', 'Date'],
  ['yesNo', 'Yes or no'],
  ['file', 'File upload'],
])

const isInput = (s: Record<string, unknown>) => s.kind === 'input'
const isRules = (s: Record<string, unknown>) => s.kind === 'rules'

type Branch = { id: string; label: string; rules: RuleGroup }
const branchesOf = (v: unknown) => asArray<Branch>(v)

const ruleKey = (r: Rule) => JSON.stringify([r.left, r.operator, r.value])
/** The numbers a simple rule allows, e.g. "is more than 0" allows 1 and up */
const rangeOf = (r: Rule): [number, number] | null => {
  const v = Number(r.value)
  if (Number.isNaN(v)) return null
  switch (r.operator) {
    case 'is':
      return [v, v]
    case 'gt':
      return [v + 1, Infinity]
    case 'gte':
      return [v, Infinity]
    case 'lt':
      return [-Infinity, v - 1]
    case 'lte':
      return [-Infinity, v]
    default:
      return null
  }
}

/** Two outcomes that can never both be true, judged from rules on the same value (e.g. count is 0 / count is more than 0) */
function exclusive(a: RuleGroup, b: RuleGroup): boolean {
  if (a.match !== 'all' || b.match !== 'all') return false
  const flat = (g: RuleGroup) => g.rules.filter((r): r is Rule => (r as RuleGroup).match === undefined)
  return flat(a).some((ra) =>
    flat(b).some((rb) => {
      if (JSON.stringify(ra.left) === JSON.stringify(rb.left)) {
        if (ra.operator === 'is' && rb.operator === 'is') return String(ra.value) !== String(rb.value)
        const ia = rangeOf(ra)
        const ib = rangeOf(rb)
        return !!ia && !!ib && (ia[1] < ib[0] || ib[1] < ia[0])
      }
      // A count of matching items can never be more than the count of all items on the same list
      if (ra.left.kind === 'aggregate' && rb.left.kind === 'aggregate' && ra.left.of === rb.left.of && ra.left.fn !== rb.left.fn) {
        const all = ra.left.fn === 'count' ? ra : rb
        const some = ra.left.fn === 'count' ? rb : ra
        const ia = rangeOf(all)
        const ib = rangeOf(some)
        return !!ia && !!ib && ib[0] > ia[1]
      }
      return false
    })
  )
}

const decision: NodeTypeDef = {
  key: 'decision',
  category: 'flow',
  label: 'Decision',
  icon: Split,
  description: 'Send the request one way or another: from a question, an input, or rules on earlier answers.',
  accent: 'bg-sky-50 text-sky-600 border-sky-200',
  cardTone: 'bg-sky-50 border-sky-200',
  mapColor: '#0ea5e9',
  defaultName: 'Decision',
  defaultConfig: () => ({
    kind: 'question',
    question: '',
    options: [newItem('Yes'), newItem('No')],
    inputType: 'text',
    inputRequired: true,
    branches: [{ id: newId('br'), label: 'Outcome 1', rules: { match: 'all', rules: [] } }],
    hasDefault: true,
    defaultLabel: 'Otherwise',
  }),
  outcomesNote: 'Outcomes come from the options above.',
  configSchema: [
    {
      id: 'decision',
      title: 'Decision',
      fields: [
        {
          key: 'kind',
          label: 'This decision is',
          kind: 'radio',
          options: opt([
            ['question', 'A question with answers to pick from'],
            ['input', 'An input field to fill in'],
            ['rules', 'Worked out from earlier answers, using rules'],
          ]),
        },
        { key: 'question', label: 'Question', kind: 'text', required: true, maxLength: 80, placeholder: 'e.g. Selected request type?', showIf: (s) => !isRules(s) },
        {
          key: 'options',
          label: 'Options',
          kind: 'list',
          help: 'Each option becomes an outcome. Add your own for anything that is missing.',
          minItems: 2,
          addLabel: 'Add option',
          newItem: () => newItem(),
          itemSchema: [{ key: 'label', label: 'Option', kind: 'text', required: true, placeholder: 'e.g. Partnership' }],
          showIf: (s) => !isInput(s) && !isRules(s),
        },
        { key: 'inputType', label: 'Type of input', kind: 'select', required: true, allowCustom: true, options: INPUT_TYPES, showIf: isInput },
        { key: 'inputRequired', label: 'The answer is required', kind: 'toggle', showIf: isInput },
        {
          key: 'branches',
          label: 'Outcomes',
          kind: 'branches',
          help: 'Name each outcome and say when it applies. The request takes the first outcome whose rules are true. Pick the data from earlier steps, such as collected responses or form answers.',
          showIf: isRules,
        },
        {
          key: 'hasDefault',
          label: 'Add a default outcome',
          kind: 'toggle',
          help: 'Used when none of the outcomes above apply, so the request is never left without a route.',
          showIf: isRules,
        },
        { key: 'defaultLabel', label: 'Name of the default outcome', kind: 'text', maxLength: 40, showIf: (s) => isRules(s) && !!s.hasDefault },
      ],
    },
  ],
  getOutcomes: (n) =>
    isRules(n.config)
      ? [
          ...branchesOf(n.config.branches).map((b, i) => ({ key: b.id, label: b.label.trim() || `Outcome ${i + 1}` })),
          ...(n.config.hasDefault ? [{ key: 'otherwise', label: asString(n.config.defaultLabel).trim() || 'Otherwise' }] : []),
        ]
      : isInput(n.config)
        ? [{ key: 'provided', label: 'Input received' }]
        : itemOutcomes(n.config.options, 'Option'),
  summary: (n) => {
    if (isRules(n.config)) return `${countText(branchesOf(n.config.branches).length, 'outcome')} · first match wins`
    const q = asString(n.config.question) || 'No question yet'
    if (!isInput(n.config)) return q
    const t = n.config.inputType
    return `${q} · ${isCustom(t) ? customText(t) : (INPUT_TYPES.find((o) => o.value === t)?.label ?? 'Input')}`
  },
  validate: (n, ctx) => {
    if (!isRules(n.config)) return []
    const out: NodeIssue[] = []
    const branches = branchesOf(n.config.branches)
    const fields = new Map(ctx.caseFields.map((f) => [f.key, f]))
    const walk = (g: RuleGroup, label: string) => {
      for (const r of g.rules) {
        if ((r as RuleGroup).match !== undefined) {
          walk(r as RuleGroup, label)
          continue
        }
        const rule = r as Rule
        const key = rule.left.kind === 'caseField' ? rule.left.key : rule.left.of
        const field = fields.get(key)
        if (!key || !field)
          out.push({ severity: 'error', message: `"${label}" uses data that no longer exists. Pick it again.`, field: 'branches' })
        else if (rule.left.kind === 'aggregate' && rule.left.where?.left.kind === 'caseField') {
          const whereKey = rule.left.where.left.kind === 'caseField' ? rule.left.where.left.key : ''
          const inner = field.itemFields?.find((f) => f.key === whereKey)
          const wanted = rule.left.where.value
          if (inner?.options && wanted && !inner.options.includes(String(wanted)))
            out.push({ severity: 'error', message: `"${label}" counts the answer "${String(wanted)}", which is no longer one of the options.`, field: 'branches' })
        }
        if (rule.operator !== 'isEmpty' && rule.operator !== 'isNotEmpty' && (rule.value === undefined || rule.value === null || rule.value === ''))
          out.push({ severity: 'error', message: `"${label}" has a rule with no value to compare with.`, field: 'branches' })
      }
    }
    if (branches.length === 0) out.push({ severity: 'error', message: 'Add at least one outcome with a rule.', field: 'branches' })
    branches.forEach((b, i) => {
      const label = b.label.trim() || `Outcome ${i + 1}`
      if (!b.label.trim()) out.push({ severity: 'error', message: `Outcome ${i + 1} needs a name.`, field: 'branches' })
      if (b.rules.rules.length === 0)
        out.push({ severity: 'error', message: `"${label}" has no rules, so it would always apply and hide the outcomes after it.`, field: 'branches' })
      else walk(b.rules, label)
    })
    for (let i = 0; i < branches.length; i++)
      for (let j = i + 1; j < branches.length; j++) {
        const a = branches[i].rules.rules.filter((r) => (r as RuleGroup).match === undefined) as Rule[]
        const b = branches[j].rules.rules.filter((r) => (r as RuleGroup).match === undefined) as Rule[]
        if (a.length && a.length === b.length && a.every((r, k) => ruleKey(r) === ruleKey(b[k])))
          out.push({ severity: 'error', message: `"${branches[i].label}" and "${branches[j].label}" have the same rules, so the second can never be reached.`, field: 'branches' })
      }
    if (!n.config.hasDefault && branches.length < 2)
      out.push({ severity: 'error', message: 'Add a default outcome or a second outcome so every request has a route.', field: 'hasDefault' })
    // Without a default outcome the outcomes must cover everything: say so when two of them are not clearly separate
    if (!n.config.hasDefault && branches.length > 1) {
      const unclear = branches.some((a, i) => branches.some((b, j) => j > i && !exclusive(a.rules, b.rules)))
      if (unclear)
        out.push({
          severity: 'warning',
          message: 'Some outcomes could both be true at once. The first one in the list is used. Check the order, or add a default outcome.',
          field: 'branches',
        })
    }
    return out
  },
}

const slaCheck: NodeTypeDef = {
  key: 'slaCheck',
  category: 'flow',
  label: 'SLA check',
  icon: Timer,
  description: 'Check whether a step was done within its time limit, and send the request on accordingly.',
  accent: 'bg-orange-50 text-orange-600 border-orange-200',
  cardTone: 'bg-orange-50 border-orange-200',
  mapColor: '#f97316',
  defaultName: 'SLA check',
  defaultConfig: () => ({ stepId: '', dueSoon: false }),
  configSchema: [
    {
      id: 'sla',
      title: 'SLA check',
      fields: [
        {
          key: 'stepId',
          label: 'Step to check',
          kind: 'select',
          required: true,
          help: 'Only steps that have a time limit are listed.',
          options: (ctx) =>
            Object.values(ctx.stage.nodes)
              .filter((n) => n.id !== ctx.node.id && slaKind(getNodeType(n.type), n))
              .map((n) => ({ value: n.id, label: n.name })),
        },
        { key: 'dueSoon', label: 'Also tell me when it is nearly due', kind: 'toggle', help: 'Adds a "Nearly due" outcome between on time and overdue.' },
      ],
    },
  ],
  getOutcomes: (n) => [
    { key: 'withinTime', label: 'Within time limit' },
    ...(n.config.dueSoon ? [{ key: 'dueSoon', label: 'Nearly due' }] : []),
    { key: 'overdue', label: 'Overdue' },
  ],
  summary: (n) => (n.config.stepId ? 'Checks a step’s time limit' : 'No step chosen'),
  validate: (n, ctx) =>
    n.config.stepId && !ctx.stage.nodes[String(n.config.stepId)]
      ? [{ severity: 'error', message: 'The step to check no longer exists.', field: 'stepId' }]
      : [],
}

const RULE_OPERATORS = opt([
  ['is', 'is'],
  ['isNot', 'is not'],
  ['gt', 'is more than'],
  ['lt', 'is less than'],
  ['contains', 'contains'],
  ['isEmpty', 'is empty'],
  ['isNotEmpty', 'is not empty'],
])
const needsNoValue = (s: Record<string, unknown>) => s.operator === 'isEmpty' || s.operator === 'isNotEmpty'
const newRule = () => ({ id: newId('rule'), field: '', operator: 'is', value: '' })

/** If / And / Or: send the request one way when the conditions hold and another way when they don't */
function condition(
  key: string,
  label: string,
  description: string,
  icon: NodeTypeDef['icon'],
  match: 'all' | 'any' | null
): NodeTypeDef {
  const rules = (n: WorkflowNode) => asArray<Record<string, unknown>>(n.config.rules)
  return {
    key,
    category: 'flow',
    label,
    icon,
    description,
    accent: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    cardTone: 'bg-indigo-50 border-indigo-200',
    mapColor: '#6366f1',
    defaultName: label,
    defaultConfig: () => ({ match: match ?? 'all', rules: [newRule()] }),
    configSchema: [
      {
        id: 'conditions',
        title: 'Conditions',
        fields: [
          ...(match
            ? []
            : [
                {
                  key: 'match',
                  label: 'The request continues as "Yes" when',
                  kind: 'radio' as const,
                  options: opt([
                    ['all', 'All of the conditions are true (AND)'],
                    ['any', 'Any one of the conditions is true (OR)'],
                  ]),
                },
              ]),
          {
            key: 'rules',
            label: match === 'all' ? 'All of these must be true' : match === 'any' ? 'Any one of these can be true' : 'Conditions',
            kind: 'list' as const,
            help: 'Pick a field from the case, or add your own.',
            minItems: 1,
            addLabel: 'Add condition',
            newItem: newRule,
            itemTitle: (item, i) => `${asString(item.field) ? (isCustom(item.field) ? customText(item.field) : asString(item.field)) : `Condition ${i + 1}`}`,
            itemSchema: [
              { key: 'field', label: 'Field', kind: 'select' as const, required: true, allowCustom: true, placeholder: 'Choose a field', options: caseFieldOptions() },
              { key: 'operator', label: 'Is', kind: 'select' as const, required: true, options: RULE_OPERATORS },
              { key: 'value', label: 'Value', kind: 'text' as const, required: true, showIf: (s: Record<string, unknown>) => !needsNoValue(s) },
            ],
          },
        ],
      },
    ],
    getOutcomes: () => [
      { key: 'yes', label: 'Yes' },
      { key: 'no', label: 'No' },
    ],
    summary: (n) => {
      const count = rules(n).length
      return `${countText(count, 'condition')} · ${n.config.match === 'any' ? 'any (OR)' : 'all (AND)'}`
    },
  }
}

const ifCondition = condition('ifCondition', 'If', 'If something is true, go one way; otherwise go another. Choose AND or OR.', Filter, null)
const andCondition = condition('andCondition', 'And', 'Go on only when all of several conditions are true.', GitMerge, 'all')
const orCondition = condition('orCondition', 'Or', 'Go on when any one of several conditions is true.', GitFork, 'any')

const ruleItemSchema = [
  { key: 'field', label: 'Field', kind: 'select' as const, required: true, allowCustom: true, placeholder: 'Choose a field', options: caseFieldOptions() },
  { key: 'operator', label: 'Is', kind: 'select' as const, required: true, options: RULE_OPERATORS },
  { key: 'value', label: 'Value', kind: 'text' as const, required: true, showIf: (s: Record<string, unknown>) => !needsNoValue(s) },
]

// ── COLLECT RESPONSES ───────────────────────────────────────────────────────

const COMPLETION = opt([
  ['everyone', 'Everyone has responded'],
  ['minimum', 'A minimum number of people have responded'],
  ['specific', 'At least one person gives a particular answer'],
  ['required', 'All of the expected responses have been received'],
  ['rule', 'A rule I set is met'],
  ['deadline', 'The response deadline passes'],
])
const EARLY_COMPLETION = ['minimum', 'specific', 'rule']
const optionsOf = (s: Record<string, unknown>) => items(s.responseOptions)

const collectResponses: NodeTypeDef = {
  key: 'collectResponses',
  category: 'steps',
  label: 'Collect Responses',
  icon: Users,
  description: 'Ask several people to answer on their own, then carry on once enough of them have.',
  accent: 'bg-blue-50 text-blue-600 border-blue-200',
  cardTone: 'bg-blue-50 border-blue-200',
  mapColor: '#2563eb',
  defaultName: 'Collect responses',
  defaultConfig: () => ({
    recipientSource: 'manual',
    recipients: [],
    recipientsField: '',
    expectedCount: null,
    responseOptions: itemsOf(['Proceed', 'Reject']),
    completion: 'everyone',
    minResponses: 1,
    specificOption: '',
    specificCount: 1,
    completionMatch: 'all',
    completionRules: [newRule()],
    afterEarly: 'stop',
    deadline: { value: 5, unit: 'businessDays' },
    onDeadline: 'evaluate',
    reminderOn: true,
    reminderAfter: { value: 3, unit: 'businessDays' },
  }),
  configSchema: [
    {
      id: 'who',
      title: 'Who responds?',
      fields: [
        {
          key: 'recipientSource',
          label: 'Who are the people',
          kind: 'radio',
          options: opt([
            ['manual', 'People I choose here'],
            ['earlier', 'People found by an earlier step'],
          ]),
        },
        {
          key: 'recipients',
          label: 'People, roles or teams',
          kind: 'recipients',
          recipientKinds: ['role', 'team', 'user'],
          showIf: (s) => s.recipientSource !== 'earlier',
        },
        {
          key: 'recipientsField',
          label: 'People from',
          kind: 'caseFieldSelect',
          required: true,
          options: caseFieldOptions(['people', 'list']),
          placeholder: 'Choose a field',
          showIf: (s) => s.recipientSource === 'earlier',
        },
        {
          key: 'expectedCount',
          label: 'How many responses to expect',
          kind: 'number',
          min: 1,
          max: 500,
          help: 'The number of people you expect to answer. Useful when the people are only known once the request runs.',
        },
      ],
    },
    {
      id: 'options',
      title: 'How can they respond?',
      fields: [
        {
          key: 'responseOptions',
          label: 'Response options',
          kind: 'list',
          help: 'The answers each person can give. Add your own for anything that is missing.',
          minItems: 1,
          addLabel: 'Add response option',
          newItem: () => newItem(),
          itemSchema: [{ key: 'label', label: 'Response', kind: 'text', required: true, placeholder: 'e.g. Proceed' }],
        },
      ],
    },
    {
      id: 'done',
      title: 'When is collecting finished?',
      fields: [
        { key: 'completion', label: 'Finished when', kind: 'select', required: true, options: COMPLETION },
        { key: 'minResponses', label: 'At least how many people', kind: 'number', min: 1, max: 500, showIf: (s) => s.completion === 'minimum' },
        {
          key: 'specificOption',
          label: 'The answer',
          kind: 'select',
          required: true,
          options: (_ctx, s) => optionsOf(s).map((o) => ({ value: o.id, label: o.label })),
          showIf: (s) => s.completion === 'specific',
        },
        { key: 'specificCount', label: 'At least how many people gave it', kind: 'number', min: 1, max: 500, showIf: (s) => s.completion === 'specific' },
        {
          key: 'completionMatch',
          label: 'The rules are met when',
          kind: 'radio',
          options: opt([
            ['all', 'All of them are true (AND)'],
            ['any', 'Any one is true (OR)'],
          ]),
          showIf: (s) => s.completion === 'rule',
        },
        {
          key: 'completionRules',
          label: 'Rules',
          kind: 'list',
          minItems: 1,
          addLabel: 'Add rule',
          newItem: newRule,
          itemTitle: (item, i) => (asString(item.field) ? (isCustom(item.field) ? customText(item.field) : asString(item.field)) : `Rule ${i + 1}`),
          itemSchema: ruleItemSchema,
          showIf: (s) => s.completion === 'rule',
        },
      ],
    },
    {
      id: 'deadline',
      title: 'Deadline and reminders',
      fields: [
        {
          key: 'deadline',
          label: 'Response deadline',
          kind: 'duration',
          help: 'Collecting always ends at the deadline, so nobody can leave the request waiting for ever.',
        },
        {
          key: 'onDeadline',
          label: 'If the deadline passes first',
          kind: 'select',
          required: true,
          options: opt([
            ['evaluate', 'Carry on with the responses received so far'],
            ['separate', 'Take a separate "Deadline reached" path'],
          ]),
        },
        { key: 'reminderOn', label: 'Remind people who have not responded', kind: 'toggle' },
        { key: 'reminderAfter', label: 'Remind them after', kind: 'duration', showIf: (s) => !!s.reminderOn },
      ],
    },
    {
      id: 'advanced',
      title: 'Advanced: finishing early',
      collapsed: true,
      showIf: (c) => EARLY_COMPLETION.includes(String(c.completion)),
      fields: [
        {
          key: 'afterEarly',
          label: 'People who have not responded yet',
          kind: 'select',
          options: opt([
            ['stop', 'Stop collecting: they are told it is closed and late replies are ignored'],
            ['keep', 'Keep collecting: late replies are recorded but do not change the route'],
          ]),
          help: 'What happens to the others when the step finishes before everyone has answered.',
        },
      ],
    },
  ],
  getOutcomes: (n) => [
    { key: 'completed', label: 'Responses collected' },
    ...(n.config.onDeadline === 'separate' ? [{ key: 'deadline', label: 'Deadline reached' }] : []),
  ],
  summary: (n) => {
    const c = n.config
    const who =
      c.recipientSource === 'earlier'
        ? 'People from an earlier step'
        : countText(asArray(c.recipients).length, 'recipient') + (Number(c.expectedCount) > 0 ? ` (expect ${c.expectedCount})` : '')
    return `${who} · ${countText(optionsOf(c).length, 'answer')}`
  },
  // The collected answers become one list of responses that decisions and later steps can count and filter
  outputs: (n) => [
    {
      key: `responses_${n.id}`,
      label: `Responses (${n.name})`,
      type: 'list',
      itemFields: [
        { key: 'response', label: 'Response', type: 'choice', options: optionsOf(n.config).map((o) => o.label), producedBy: n.name },
        { key: 'respondent', label: 'Person', type: 'person', producedBy: n.name },
      ],
    },
  ],
  validate: (n) => {
    const c = n.config
    const out: NodeIssue[] = []
    const answers = optionsOf(c)
    const duration = (v: unknown) => Number((v as { value?: number | null } | undefined)?.value) > 0
    if (c.recipientSource !== 'earlier' && asArray(c.recipients).length === 0)
      out.push({ severity: 'error', message: 'Choose who should respond: at least one person, role or team.', field: 'recipients' })
    if (!duration(c.deadline))
      out.push({
        severity: 'error',
        message: 'Configure a response deadline or timeout behaviour so this workflow can continue when members do not respond.',
        field: 'deadline',
      })
    if (new Set(answers.map((o) => o.label.trim().toLowerCase())).size < answers.length)
      out.push({ severity: 'error', message: 'Two response options have the same name.', field: 'responseOptions' })
    const min = Number(c.minResponses)
    const expected = Number(c.expectedCount)
    if (c.completion === 'minimum') {
      if (!(min >= 1)) out.push({ severity: 'error', message: 'Say how many responses are needed (at least 1).', field: 'minResponses' })
      else if (expected > 0 && min > expected)
        out.push({ severity: 'error', message: 'More responses are needed than are expected, so collecting could never finish this way.', field: 'minResponses' })
    }
    if (c.completion === 'specific' && c.specificOption && !answers.some((o) => o.id === c.specificOption))
      out.push({ severity: 'error', message: 'The answer that finishes collecting is no longer one of the response options.', field: 'specificOption' })
    if (c.completion === 'required' && !(expected >= 1))
      out.push({ severity: 'error', message: 'Say how many responses to expect, so there is a number to wait for.', field: 'expectedCount' })
    if (c.reminderOn && !duration(c.reminderAfter))
      out.push({ severity: 'error', message: 'Say how long to wait before reminding people.', field: 'reminderAfter' })
    return out
  },
}

// ── SPLIT AND MERGE ─────────────────────────────────────────────────────────

const split: NodeTypeDef = {
  key: 'split',
  category: 'flow',
  label: 'Split',
  icon: Network,
  description: 'Send the request down several paths at the same time.',
  accent: 'bg-cyan-50 text-cyan-600 border-cyan-200',
  cardTone: 'bg-cyan-50 border-cyan-200',
  mapColor: '#06b6d4',
  defaultName: 'Split',
  defaultConfig: () => ({ branches: [newItem('Path A'), newItem('Path B')] }),
  outcomesNote: 'Every path starts at the same time.',
  configSchema: [
    {
      id: 'split',
      title: 'Paths',
      fields: [
        {
          key: 'branches',
          label: 'Paths that run together',
          kind: 'list',
          help: 'Each path becomes an outcome you connect on the canvas. Bring them back together with a Merge.',
          minItems: 2,
          addLabel: 'Add path',
          newItem: () => newItem(),
          itemSchema: [{ key: 'label', label: 'Path', kind: 'text', required: true, placeholder: 'e.g. Legal review' }],
        },
      ],
    },
  ],
  getOutcomes: (n) => itemOutcomes(n.config.branches, 'Path'),
  summary: (n) => `${items(n.config.branches).length} paths at the same time`,
}

const merge: NodeTypeDef = {
  key: 'merge',
  category: 'flow',
  label: 'Merge',
  icon: Merge,
  description: 'Bring several paths back together before carrying on.',
  accent: 'bg-cyan-50 text-cyan-600 border-cyan-200',
  cardTone: 'bg-cyan-50 border-cyan-200',
  mapColor: '#06b6d4',
  defaultName: 'Merge',
  defaultConfig: () => ({ waitFor: 'all' }),
  configSchema: [
    {
      id: 'merge',
      title: 'Merge',
      fields: [
        {
          key: 'waitFor',
          label: 'Carry on when',
          kind: 'radio',
          options: opt([
            ['all', 'Every path has arrived'],
            ['any', 'Any one path has arrived'],
          ]),
        },
      ],
    },
  ],
  getOutcomes: () => [{ key: 'continue', label: 'Continue' }],
  summary: (n) => (n.config.waitFor === 'any' ? 'Carries on when any path arrives' : 'Waits for every path'),
  validate: (n, ctx) => {
    const incoming = Object.values(ctx.stage.nodes).reduce((sum, x) => sum + x.outcomes.filter((o) => o.targetNodeId === n.id).length, 0)
    return incoming < 2 ? [{ severity: 'error', message: 'A merge needs at least two paths leading into it.' }] : []
  },
}

const onHold: NodeTypeDef = {
  key: 'onHold',
  category: 'flow',
  label: 'On hold',
  icon: Package,
  description: 'Park the request or wait for a response.',
  accent: 'bg-amber-50 text-amber-600 border-amber-200',
  cardTone: 'bg-amber-50 border-amber-200',
  mapColor: '#f59e0b',
  defaultName: 'Parked',
  defaultConfig: () => ({ reason: 'Parked for future review', canResume: false }),
  configSchema: [
    {
      id: 'hold',
      title: 'Hold',
      fields: [
        { key: 'reason', label: 'Status shown', kind: 'text', required: true, maxLength: 60, placeholder: 'e.g. Waiting for vendor response' },
        {
          key: 'canResume',
          label: 'The request can continue later',
          kind: 'toggle',
          help: 'Turn on to add a "Resumed" outcome, for example to return to an earlier review.',
        },
      ],
    },
  ],
  getOutcomes: (n) => (n.config.canResume ? [{ key: 'resumed', label: 'Resumed' }] : []),
  summary: (n) => asString(n.config.reason) || 'No status',
}

export const NODE_TYPES: NodeTypeDef[] = [
  formSubmission,
  stageStart,
  stageComplete,
  closeRequest,
  stopWithLabel,
  step,
  collectResponses,
  decision,
  ifCondition,
  andCondition,
  orCondition,
  merge,
  split,
  slaCheck,
  onHold,
]

/** One entry of the node library. Several entries can create the same type with different starting settings. */
export interface PaletteItem {
  key: string
  type: string
  label: string
  description: string
  icon: NodeTypeDef['icon']
  accent: string
  category: NodeCategory
  /** Name for a new node, when it differs from the type's default */
  name?: string
  /** Settings to start from, on top of the type's defaults */
  config?: () => Record<string, unknown>
}

const stepConfig = (actor: Actor, action: string): Record<string, unknown> => ({
  ...step.defaultConfig(),
  actor,
  action,
  outcomes: itemsOf(ACTIONS[actor].find((a) => a.value === action)?.outcomes ?? ['Done']),
})

const ofType = (def: NodeTypeDef): PaletteItem => ({
  key: def.key,
  type: def.key,
  label: def.label,
  description: def.description,
  icon: def.icon,
  accent: nodeAccent(def),
  category: def.category,
})

const actionItem = (key: string, label: string, description: string, actor: Actor, action: string, name: string): PaletteItem => ({
  key,
  type: 'step',
  label,
  description,
  icon: STEP_LOOKS[actor].icon,
  accent: STEP_LOOKS[actor].accent,
  category: 'steps',
  name,
  config: () => stepConfig(actor, action),
})

/** The node library, in the order it is shown */
export const PALETTE: PaletteItem[] = [
  ...[formSubmission, stageStart, stageComplete, closeRequest, stopWithLabel].map(ofType),
  actionItem('aiAgent', 'AI Agent', 'An AI agent checks or analyses the request.', 'agent', 'check', 'AI agent task'),
  actionItem('humanTask', 'Human Task', 'A person does a piece of work or makes a decision.', 'human', 'review', 'Human task'),
  actionItem('approval', 'Approval', 'One or more people approve or reject.', 'human', 'approve', 'Approval'),
  ofType(collectResponses),
  actionItem('notification', 'Send Notification', 'Send an email or an in-app message.', 'system', 'notify', 'Send notification'),
  ...[decision, ifCondition, andCondition, orCondition, merge, split, slaCheck, onHold].map(ofType),
]

export const paletteItem = (key: string) => PALETTE.find((p) => p.key === key) ?? ofType(getNodeType(key))

const BY_KEY = new Map(NODE_TYPES.map((d) => [d.key, d]))

export function getNodeType(key: string): NodeTypeDef {
  const def = BY_KEY.get(key)
  if (!def) throw new Error(`Unknown step type: ${key}`)
  return def
}
