/**
 * Seed data: the Tech Due Diligence workflow (§9), built from the simple step
 * types. This is the ONLY place the business process is described; components
 * never reference it.
 */

import { newId } from '@/lib/id'
import type { BreachAction, Reminder, SlaConfig, Stage, Workflow, WorkflowNode } from '@/types/workflow'
import { createNode, newStage, normalizeStage, syncOutcomes } from '@/lib/workflow/graph'

type Spec = {
  ref: string
  type: string
  name: string
  config?: Record<string, unknown>
  sla?: SlaConfig
  description?: string
  toConfirm?: string[]
  /** Settings that need the ids of the other steps (e.g. which step's responses to count) */
  configFn?: (ids: Record<string, string>, stage: Stage) => Record<string, unknown>
  /** outcome label (or key) -> target ref */
  to?: Record<string, string>
}

const options = (...labels: string[]) => labels.map((label) => ({ id: newId('opt'), label }))

const reminder = (days: number): Reminder => ({
  id: newId('rem'),
  after: { value: days, unit: 'businessDays' },
  sendAt: '',
  channels: ['email'],
  recipients: [{ kind: 'stepAssignees' }],
  templateId: 'tpl-approval-reminder',
})

const slaClose: BreachAction = { kind: 'closeRequest', statusLabel: 'Closed – SLA expired', notifyVendor: false }

const sla = (days: number | null, reminders: Reminder[] = [], breach: BreachAction | null = null): SlaConfig => ({
  enabled: true,
  duration: { value: days, unit: 'businessDays' },
  clockStarts: 'onStepStart',
  reminders,
  breachAction: breach,
})

/** Build a stage from specs, wiring outcomes by label → ref. */
function buildStage(name: string, description: string, specs: Spec[]): Stage {
  // Seeded stages list their own start step, so drop the one a new stage begins with
  const stage: Stage = { ...newStage(name, description), nodes: {} }
  const ids: Record<string, string> = {}
  for (const s of specs) {
    const base = createNode(s.type, stage, s.name)
    const node: WorkflowNode = syncOutcomes({
      ...base,
      name: s.name,
      description: s.description ?? '',
      config: { ...base.config, ...(s.config ?? {}) },
      ...(s.sla ? { sla: s.sla } : {}),
      ...(s.toConfirm ? { toConfirm: s.toConfirm } : {}),
    })
    stage.nodes[node.id] = node
    ids[s.ref] = node.id
  }
  for (const s of specs) {
    const made = stage.nodes[ids[s.ref]]
    const node = s.configFn ? syncOutcomes({ ...made, config: { ...made.config, ...s.configFn(ids, stage) } }) : made
    stage.nodes[node.id] = {
      ...node,
      outcomes: node.outcomes.map((o) => {
        const ref = s.to?.[o.label] ?? s.to?.[o.key]
        return ref ? { ...o, targetNodeId: ids[ref] } : o
      }),
    }
  }
  return normalizeStage(stage)
}

const ADMIN = 'role-partnership-admin'
const DIRECTOR = 'role-partnership-director'

function stage1(): Stage {
  return buildStage('Initial Assessment Brief', 'Vendor submission, intake agent check, Partnership Admin and Director review.', [
    {
      ref: 'submit',
      type: 'formSubmission',
      name: 'Vendor submits the form',
      description: 'Vendor fills in the partnership request form in the portal.',
      config: { formId: 'vendor-intake-form', submitters: 'vendors' },
      to: { Submitted: 'agent' },
    },
    {
      ref: 'agent',
      type: 'step',
      name: 'Intake agent analysis',
      description: 'Checks duplication, existing solutions, strategic alignment and completeness.',
      config: {
        actor: 'agent',
        action: 'check',
        agentId: 'intake-agent',
        tasks: options(
          'Check for duplicate requests',
          'Identify existing solution in portfolio',
          'Analyse strategic alignment',
          'Validate completeness of information'
        ),
        outcomes: options('Pass all checks', 'Fail any check'),
      },
      to: { 'Pass all checks': 'admin', 'Fail any check': 'rejectedAgent' },
    },
    {
      ref: 'rejectedAgent',
      type: 'closeRequest',
      name: 'Rejected (by agent)',
      config: { statusLabel: 'Rejected – by agent', emailVendor: true, templateId: 'tpl-intake-rejection' },
    },
    {
      ref: 'admin',
      type: 'step',
      name: 'Partnership Admin review',
      config: {
        actor: 'human',
        action: 'approve',
        assignee: ADMIN,
        instructions: 'Review the assessment brief, agent analysis and form response. Decide to proceed or reject and select the request type.',
        outcomes: options('Proceed', 'Reject'),
      },
      sla: sla(2, [reminder(1)], slaClose),
      to: { Proceed: 'type', Reject: 'rejectedAdmin' },
    },
    {
      ref: 'rejectedAdmin',
      type: 'closeRequest',
      name: 'Rejected (by Admin)',
      config: { statusLabel: 'Rejected – by Admin' },
      toConfirm: ['Should the vendor be emailed when the Partnership Admin rejects? Default: off.'],
    },
    {
      ref: 'type',
      type: 'decision',
      name: 'Request type',
      config: { question: 'Selected request type?', options: options('Partnership', 'Procurement', 'M&A') },
      to: { Partnership: 'director', Procurement: 'parked', 'M&A': 'parked' },
    },
    {
      ref: 'parked',
      type: 'onHold',
      name: 'Parked',
      config: { reason: 'Parked for future review', canResume: false },
    },
    {
      ref: 'director',
      type: 'step',
      name: 'Director review',
      config: {
        actor: 'human',
        action: 'approve',
        assignee: DIRECTOR,
        instructions: 'Review the assessment brief and any updated information.',
        outcomes: options('Proceed', 'Reject', 'Request more info'),
      },
      sla: sla(6, [reminder(5)], slaClose),
      to: { Proceed: 'next', Reject: 'rejectedDirector', 'Request more info': 'waiting' },
    },
    {
      ref: 'rejectedDirector',
      type: 'closeRequest',
      name: 'Rejected (by Director)',
      config: { statusLabel: 'Rejected – by Director' },
      toConfirm: ['Should the vendor be emailed when the Director rejects? Default: off.'],
    },
    {
      ref: 'waiting',
      type: 'onHold',
      name: 'On hold',
      config: { reason: 'Waiting for vendor response', canResume: true },
      to: { Resumed: 'director' },
    },
    { ref: 'next', type: 'stageComplete', name: 'Stage complete', config: { unlock: 'next', statusLabel: 'Completed' } },
  ])
}

/**
 * Stage 2 – Internal Canvas, built only from the general steps: the five internal interest members answer on
 * their own, a decision counts the answers, and the director either picks sponsors, reviews, or the request closes.
 */
export function internalCanvasStage(): Stage {
  const SPONSOR = 'Proceed & Sponsor'
  const responsesKey = (ids: Record<string, string>) => `responses_${ids.collect}`
  const list = (ids: Record<string, string>) => responsesKey(ids)
  const count = (ids: Record<string, string>) => ({ kind: 'aggregate' as const, of: list(ids), fn: 'count' as const })
  const countSponsors = (ids: Record<string, string>) => ({
    kind: 'aggregate' as const,
    of: list(ids),
    fn: 'countWhere' as const,
    where: { left: { kind: 'caseField' as const, key: 'response' }, operator: 'is' as const, value: SPONSOR },
  })
  const info = (...labels: string[]) => options(...labels)

  return buildStage(
    'Internal Canvas',
    'Internal interest members respond; the director picks sponsors, reviews, or the request closes.',
    [
      {
        ref: 'start',
        type: 'stageStart',
        name: 'Internal Canvas Start',
        config: { startsWhen: 'previousStage' },
        to: { Start: 'collect' },
      },
      {
        ref: 'collect',
        type: 'collectResponses',
        name: 'Collect Internal Interest Responses',
        description: 'The five internal interest members answer on their own. Nobody is counted until everyone has answered or the deadline passes.',
        config: {
          recipientSource: 'manual',
          recipients: [{ kind: 'team', teamId: 'team-internal-interest' }],
          expectedCount: 5,
          responseOptions: options(SPONSOR, 'Proceed Without Sponsoring', 'Reject'),
          completion: 'everyone',
          deadline: { value: 5, unit: 'businessDays' },
          onDeadline: 'evaluate',
          reminderOn: true,
          reminderAfter: { value: 3, unit: 'businessDays' },
        },
        toConfirm: ['What is the deadline for internal interest responses, and when should reminders go out?'],
        to: { 'Responses collected': 'evaluate' },
      },
      {
        ref: 'evaluate',
        type: 'decision',
        name: 'Evaluate Internal Interest Responses',
        description: 'Counts all the responses and the "Proceed & Sponsor" ones. The three outcomes cannot overlap.',
        config: { kind: 'rules', hasDefault: false },
        configFn: (ids) => ({
          branches: [
            { id: 'br_none', label: 'No Responses', rules: { match: 'all', rules: [{ left: count(ids), operator: 'is', value: 0 }] } },
            {
              id: 'br_sponsor',
              label: 'Sponsor Candidates Available',
              rules: { match: 'all', rules: [{ left: countSponsors(ids), operator: 'gt', value: 0 }] },
            },
            {
              id: 'br_nosponsor',
              label: 'No Sponsor Candidates',
              rules: {
                match: 'all',
                rules: [
                  { left: count(ids), operator: 'gt', value: 0 },
                  { left: countSponsors(ids), operator: 'is', value: 0 },
                ],
              },
            },
          ],
        }),
        to: { 'No Responses': 'closeNone', 'Sponsor Candidates Available': 'select', 'No Sponsor Candidates': 'review' },
      },
      {
        ref: 'closeNone',
        type: 'closeRequest',
        name: 'Close Request — No Responses',
        config: { statusLabel: 'Closed', reasonMode: 'required', reasonSource: 'predefined', reason: 'No internal interest members responded' },
      },
      {
        ref: 'select',
        type: 'step',
        name: 'Director Selects Sponsor & Co-sponsors',
        description: 'The director picks one lead sponsor and any co-sponsors from the members who chose "Proceed & Sponsor".',
        config: {
          actor: 'human',
          action: 'custom',
          customAction: 'Select sponsors',
          assignee: DIRECTOR,
          instructions: 'Choose one lead sponsor and any co-sponsors, then confirm.',
          displayInfo: info('Vendor submission', 'Internal interest member responses', 'Sponsor candidates', 'Relevant assessment details'),
          choosePeople: true,
          chooseMainLabel: 'Lead sponsor',
          chooseMainCount: 1,
          chooseExtraLabel: 'Co-sponsors',
          chooseExtraMax: 4,
          outcomes: options('Selection confirmed'),
        },
        configFn: (ids, stage) => ({
          chooseFrom: ids.collect,
          chooseOnly: (stage.nodes[ids.collect].config.responseOptions as { id: string; label: string }[]).find((o) => o.label === SPONSOR)?.id,
        }),
        sla: sla(null),
        toConfirm: ['What is the time limit for the Director to select the lead sponsor and co-sponsors?'],
        to: { 'Selection confirmed': 'complete' },
      },
      {
        ref: 'review',
        type: 'step',
        name: 'Director Review — No Sponsor Candidates',
        description: 'Members responded but nobody will sponsor. The director reviews the responses and confirms the request is closed.',
        config: {
          actor: 'human',
          action: 'confirm',
          assignee: DIRECTOR,
          instructions: 'Review the responses and confirm closing the request.',
          displayInfo: info('Vendor submission', 'All received responses', 'Response summary'),
          outcomes: options('Closure confirmed'),
        },
        sla: sla(null),
        toConfirm: ['What is the time limit for the Director to review and close the request?'],
        to: { 'Closure confirmed': 'closeNoSponsor' },
      },
      {
        ref: 'closeNoSponsor',
        type: 'closeRequest',
        name: 'Close Request — No Sponsor',
        config: { statusLabel: 'Closed', reasonMode: 'required', reasonSource: 'predefined', reason: 'No internal sponsor was found' },
      },
      {
        ref: 'complete',
        type: 'stageComplete',
        name: 'Internal Canvas Complete',
        config: {
          unlock: 'next',
          statusLabel: 'Completed',
          condition: 'The Director has confirmed the lead sponsor and co-sponsors',
          waitForAll: false,
        },
      },
    ]
  )
}

export function seedWorkflow(): Workflow {
  const rest = ['Strategic Alignment', 'NDA', 'Discovery Call', 'Value & Due Diligence'].map((name) => newStage(name, ''))
  const stages = [stage1(), internalCanvasStage(), ...rest]
  return {
    id: newId('wf'),
    name: 'Tech Due Diligence Workflow Management',
    description: 'Approval workflow for vendor solution proposals, from intake to due diligence.',
    status: 'draft',
    version: 1,
    stageIds: stages.map((s) => s.id),
    stages: Object.fromEntries(stages.map((s) => [s.id, s])),
    settings: {
      caseIdFormat: 'CASE-{YYYY}-{00000}',
      workingCalendarId: 'cal-default',
      defaultReminderTime: '09:00',
      timezone: 'Asia/Dubai',
      eventRules: [],
      toConfirm: [
        'Case ID format is a placeholder.',
        'Working calendar is a placeholder ([YOUR CALENDAR]).',
        'Default reminder send time is a placeholder.',
      ],
    },
    updatedAt: new Date().toISOString(),
    updatedBy: 'System seed',
  }
}
