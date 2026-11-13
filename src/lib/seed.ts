/**
 * Seed data: the Tech Due Diligence workflow (§9), built from the simple step
 * types. This is the ONLY place the business process is described; components
 * never reference it.
 */

import { newId } from '@/lib/id'
import type { BreachAction, Reminder, SlaConfig, Stage, Workflow, WorkflowNode } from '@/types/workflow'
import { createNode, newStage, normalizeStage, syncOutcomes } from '@/lib/workflow/graph'
import { findAgent } from '@/lib/library'

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


const sla = (days: number | null, reminders: Reminder[] = [], breach: BreachAction | null = null): SlaConfig => ({
  enabled: true,
  duration: { value: days, unit: 'businessDays' },
  clockStarts: 'onStepStart',
  reminders,
  breachAction: breach,
})

/** Build a stage from specs, wiring outcomes by label → ref. Optional hand-placed positions (by ref) replace auto-layout. */
function buildStage(name: string, description: string, specs: Spec[], positions?: Record<string, { x: number; y: number }>): Stage {
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
  if (positions) stage.layout = Object.fromEntries(Object.entries(positions).map(([ref, p]) => [ids[ref], p]))
  return normalizeStage(stage)
}

const ADMIN = 'role-partnership-admin'
const DIRECTOR = 'role-partnership-director'

/** Close the request and email the vendor the reason given by whoever closed it */
const rejectAndEmail = (statusLabel: string) => ({
  statusLabel,
  reasonMode: 'required',
  reasonSource: 'step',
  emailVendor: true,
  templateId: 'tpl-intake-rejection',
  emailSubject: 'Your request {caseId}',
  emailBody:
    'Dear {vendorName},\n\nThank you for your submission. After review, we are unable to proceed with request {caseId}.\n\nReason: {reason}\n\nKind regards,\nM42 Partnerships',
})

function stage1(): Stage {
  return buildStage('Initial Assessment Brief', 'Vendor submits the form, the intake agent checks it, then the Partnership Admin and Director review.', [
    {
      ref: 'start',
      type: 'stageStart',
      name: 'Stage start',
      config: { startsWhen: 'newRequest' },
      to: { Start: 'submit' },
    },
    {
      ref: 'submit',
      type: 'formSubmission',
      name: 'Vendor submits the form',
      description: 'Vendor fills in the partnership form.',
      config: { formId: 'vendor-intake-form', submitters: 'vendors' },
      to: { Submitted: 'agent', Cancelled: 'notSubmitted' },
    },
    {
      ref: 'notSubmitted',
      type: 'closeRequest',
      name: 'Form not submitted',
      config: { statusLabel: 'Not submitted', reasonMode: 'optional', reasonSource: 'fixed', reason: 'The vendor cancelled the form', emailVendor: false },
    },
    {
      ref: 'agent',
      type: 'step',
      name: 'Intake agent analysis',
      description: 'Runs the intake checks and writes the Initial Assessment Brief.',
      config: {
        actor: 'agent',
        action: 'check',
        agentId: 'intake-agent',
        prompt: findAgent('intake-agent')?.prompt ?? '',
        tasks: [],
        outcomes: options('All checks passed', 'Any check failed'),
      },
      to: { 'All checks passed': 'admin', 'Any check failed': 'rejectedAgent' },
    },
    {
      ref: 'rejectedAgent',
      type: 'closeRequest',
      name: 'Rejected by agent',
      config: rejectAndEmail('Rejected – by agent'),
    },
    {
      ref: 'admin',
      type: 'step',
      name: 'Partnership Admin review',
      config: {
        actor: 'human',
        action: 'approve',
        assignee: ADMIN,
        assigneeUser: 'u11',
        approvers: 1,
        instructions: 'Review the Initial Assessment Brief and the form. Approve and choose the request type, or reject and give the reason.',
        outcomes: [
          { id: newId('opt'), label: 'Approve', ask: 'Request type: Partnership, Procurement or M&A' },
          { id: newId('opt'), label: 'Reject', ask: 'Reason for rejection' },
        ],
      },
      sla: sla(2, [reminder(1)], { kind: 'escalate', to: [{ kind: 'role', roleId: DIRECTOR }] }),
      to: { Approve: 'type', Reject: 'rejectedAdmin' },
    },
    {
      ref: 'rejectedAdmin',
      type: 'closeRequest',
      name: 'Rejected by Admin',
      config: rejectAndEmail('Rejected – by Admin'),
    },
    {
      ref: 'type',
      type: 'decision',
      name: 'Request type',
      config: { question: 'Request type chosen by the Admin?', options: options('Partnership', 'Procurement', 'M&A') },
      to: { Partnership: 'director', Procurement: 'parked', 'M&A': 'parked' },
    },
    {
      ref: 'parked',
      type: 'onHold',
      name: 'On hold – Procurement / M&A',
      config: { reason: 'On hold – Procurement / M&A', canResume: false },
    },
    {
      ref: 'director',
      type: 'step',
      name: 'Director review',
      config: {
        actor: 'human',
        action: 'review',
        assignee: DIRECTOR,
        assigneeUser: 'u13',
        approvers: 1,
        instructions: 'Review the Initial Assessment Brief and the Admin decision. Proceed, reject, or ask the vendor for more information.',
        outcomes: [
          { id: newId('opt'), label: 'Proceed' },
          { id: newId('opt'), label: 'Reject', ask: 'Reason for rejection' },
          { id: newId('opt'), label: 'Request more info', ask: 'What the vendor needs to provide' },
        ],
      },
      sla: sla(6, [reminder(5)], { kind: 'escalate', to: [{ kind: 'role', roleId: 'role-superadmin' }] }),
      to: { Proceed: 'next', Reject: 'rejectedDirector', 'Request more info': 'waiting' },
    },
    {
      ref: 'rejectedDirector',
      type: 'closeRequest',
      name: 'Rejected by Director',
      config: rejectAndEmail('Rejected – by Director'),
    },
    {
      ref: 'waiting',
      type: 'onHold',
      name: 'Waiting for vendor',
      config: { reason: 'Waiting for vendor information', canResume: true },
      to: { Resumed: 'director' },
    },
    { ref: 'next', type: 'stageComplete', name: 'Stage complete', config: { unlock: 'next', statusLabel: 'Completed' } },
  ])
}

/**
 * Stage 2 – Internal Canvas: the matcher agent suggests five people, the director checks them and sends the
 * questionnaire, and the answers decide what happens: close, director closes, one sponsor, or the director picks
 * a lead sponsor and co-sponsors (and a split case is made for the co-sponsors).
 */
export function internalCanvasStage(): Stage {
  const SPONSOR = 'Ready to sponsor'
  const list = (ids: Record<string, string>) => `responses_${ids.collect}`
  const count = (ids: Record<string, string>) => ({ kind: 'aggregate' as const, of: list(ids), fn: 'count' as const })
  const sponsors = (ids: Record<string, string>) => ({
    kind: 'aggregate' as const,
    of: list(ids),
    fn: 'countWhere' as const,
    where: { left: { kind: 'caseField' as const, key: 'response' }, operator: 'is' as const, value: SPONSOR },
  })
  const escalate = { kind: 'escalate' as const, to: [{ kind: 'role' as const, roleId: 'role-superadmin' }] }

  return buildStage(
    'Internal Canvas',
    'The agent suggests five people, the director sends them the request, and their answers decide the sponsor.',
    [
      {
        ref: 'start',
        type: 'stageStart',
        name: 'Stage start',
        config: { startsWhen: 'previousStage' },
        to: { Start: 'agent' },
      },
      {
        ref: 'agent',
        type: 'step',
        name: 'Find relevant people',
        description: 'The agent finds the five people with the most knowledge of this use case.',
        config: {
          actor: 'agent',
          action: 'analyse',
          agentId: 'internal-interest-matcher',
          prompt: findAgent('internal-interest-matcher')?.prompt ?? '',
          tasks: [],
          outcomes: options('People suggested'),
        },
        to: { 'People suggested': 'send' },
      },
      {
        ref: 'send',
        type: 'step',
        name: 'Director sends the request to the internal team',
        description: 'The director checks the suggested people, adds or removes anyone, and sends the request. It appears in the app for those people.',
        config: {
          actor: 'human',
          action: 'sendRequest',
          assignee: DIRECTOR,
        assigneeUser: 'u13',
          approvers: 1,
          maxPeople: 5,
          instructions: 'Check the five suggested people, add or remove anyone, then send the request to the internal team.',
          outcomes: options('Request sent'),
        },
        configFn: (ids) => ({ peopleFrom: ids.agent }),
        sla: sla(2, [reminder(1)], escalate),
        to: { 'Request sent': 'collect' },
      },
      {
        ref: 'collect',
        type: 'collectResponses',
        name: 'Internal interest team responds',
        description: 'Each person answers the assessment in the app and says whether they are ready to sponsor.',
        config: {
          recipientSource: 'earlier',
          recipientsField: 'recommendedMembers',
          expectedCount: 5,
          responseOptions: options(SPONSOR, 'Interested, not sponsoring', 'Not interested'),
          completion: 'everyone',
          deadline: { value: 5, unit: 'businessDays' },
          onDeadline: 'evaluate',
          reminderOn: true,
          reminderAfter: { value: 3, unit: 'businessDays' },
        },
        to: { 'Responses collected': 'evaluate' },
      },
      {
        ref: 'evaluate',
        type: 'decision',
        name: 'Check the answers',
        description: 'Counts the answers and the people ready to sponsor. Only one result can match.',
        config: { kind: 'rules', hasDefault: false },
        configFn: (ids) => ({
          branches: [
            { id: 'br_none', label: 'No one responds', rules: { match: 'all', rules: [{ left: count(ids), operator: 'is', value: 0 }] } },
            {
              id: 'br_nosponsor',
              label: 'Someone responds, no one is ready to sponsor',
              rules: {
                match: 'all',
                rules: [
                  { left: count(ids), operator: 'gt', value: 0 },
                  { left: sponsors(ids), operator: 'is', value: 0 },
                ],
              },
            },
            { id: 'br_one', label: 'One person is ready to sponsor', rules: { match: 'all', rules: [{ left: sponsors(ids), operator: 'is', value: 1 }] } },
            { id: 'br_many', label: '2 or more people are ready to sponsor', rules: { match: 'all', rules: [{ left: sponsors(ids), operator: 'gt', value: 1 }] } },
          ],
        }),
        to: {
          'No one responds': 'closeNone',
          'Someone responds, no one is ready to sponsor': 'review',
          'One person is ready to sponsor': 'setSponsor',
          '2 or more people are ready to sponsor': 'select',
        },
      },
      {
        ref: 'closeNone',
        type: 'closeRequest',
        name: 'Closed – no one responded',
        config: {
          ...rejectAndEmail('Closed – no internal interest'),
          reasonSource: 'fixed',
          reason: 'Nobody in the internal interest team responded',
        },
      },
      {
        ref: 'review',
        type: 'step',
        name: 'Director closes the request',
        description: 'People answered but nobody will sponsor. The director reviews the answers and closes the request.',
        config: {
          actor: 'human',
          action: 'confirm',
          assignee: DIRECTOR,
        assigneeUser: 'u13',
          approvers: 1,
          instructions: 'Review the answers and close the request, giving the reason.',
          outcomes: [{ id: newId('opt'), label: 'Close the request', ask: 'Reason for closing' }],
        },
        sla: sla(3, [reminder(2)], escalate),
        to: { 'Close the request': 'closeNoSponsor' },
      },
      {
        ref: 'closeNoSponsor',
        type: 'closeRequest',
        name: 'Closed by Director',
        config: rejectAndEmail('Closed – no sponsor'),
      },
      {
        ref: 'setSponsor',
        type: 'step',
        name: 'Make them the sponsor',
        description: 'The one person who is ready to sponsor becomes the sponsor of the case.',
        config: { actor: 'system', action: 'custom', customAction: 'Set the responder as the sponsor', outcomes: options('Sponsor set') },
        to: { 'Sponsor set': 'complete' },
      },
      {
        ref: 'select',
        type: 'step',
        name: 'Director selects the sponsors',
        description: 'The director picks one lead sponsor and any co-sponsors from the people ready to sponsor.',
        config: {
          actor: 'human',
          action: 'custom',
          customAction: 'Select sponsors',
          assignee: DIRECTOR,
        assigneeUser: 'u13',
          approvers: 1,
          instructions: 'Choose one lead sponsor and any co-sponsors, then confirm.',
          choosePeople: true,
          chooseMainLabel: 'Lead sponsor',
          chooseMainCount: 1,
          chooseExtraLabel: 'Co-sponsors',
          chooseExtraMax: 4,
          outcomes: options('Sponsors selected'),
        },
        configFn: (ids, stage) => ({
          chooseFrom: ids.collect,
          chooseOnly: (stage.nodes[ids.collect].config.responseOptions as { id: string; label: string }[]).find((o) => o.label === SPONSOR)?.id,
        }),
        sla: sla(3, [reminder(2)], escalate),
        to: { 'Sponsors selected': 'split' },
      },
      {
        ref: 'split',
        type: 'step',
        name: 'Create split cases',
        description: 'A copy of the case is made for each co-sponsor so they can follow it on their own.',
        config: { actor: 'system', action: 'custom', customAction: 'Create a split case for each co-sponsor', outcomes: options('Split cases created') },
        to: { 'Split cases created': 'complete' },
      },
      {
        ref: 'complete',
        type: 'stageComplete',
        name: 'Stage complete',
        config: { unlock: 'next', statusLabel: 'Completed', condition: 'The sponsor (and any co-sponsors) is confirmed', waitForAll: false },
      },
    ],
    {
      start: { x: 605, y: 0 },
      agent: { x: 590, y: 180 },
      send: { x: 590, y: 400 },
      collect: { x: 590, y: 620 },
      evaluate: { x: 408, y: 840 },
      closeNone: { x: 65, y: 1100 },
      review: { x: 410, y: 1100 },
      setSponsor: { x: 770, y: 1100 },
      select: { x: 1130, y: 1100 },
      closeNoSponsor: { x: 425, y: 1340 },
      split: { x: 1130, y: 1340 },
      complete: { x: 965, y: 1580 },
    }
  )
}

/**
 * Stage 3 – Strategic Alignment: the director sends the request to the strategy team (one to five people), an agent
 * writes the pre-read, and the team proceeds or rejects.
 */
function strategicAlignmentStage(): Stage {
  const escalate = { kind: 'escalate' as const, to: [{ kind: 'role' as const, roleId: 'role-superadmin' }] }
  return buildStage('Strategic Alignment', 'The strategy team reads the AI pre-read and decides whether the request goes ahead.', [
    { ref: 'start', type: 'stageStart', name: 'Stage start', config: { startsWhen: 'previousStage' }, to: { Start: 'send' } },
    {
      ref: 'send',
      type: 'step',
      name: 'Director sends the request to the strategy team',
      description: 'The strategy team list is filled in (usually one or two people, at most five). The director can change it, then sends the request.',
      config: {
        actor: 'human',
        action: 'sendRequest',
        assignee: DIRECTOR,
        assigneeUser: 'u13',
        approvers: 1,
        peopleFrom: 'team-strategic-alignment',
        maxPeople: 5,
        instructions: 'Check the strategy team list and send the request.',
        outcomes: options('Request sent'),
      },
      sla: sla(2, [reminder(1)], escalate),
      to: { 'Request sent': 'preRead' },
    },
    {
      ref: 'preRead',
      type: 'step',
      name: 'Write the pre-read summary',
      description: 'The agent writes a pre-read summary for the strategy team.',
      config: {
        actor: 'agent',
        action: 'generate',
        agentId: 'pre-read-agent',
        prompt: findAgent('pre-read-agent')?.prompt ?? '',
        tasks: [],
        outcomes: options('Pre-read ready'),
      },
      to: { 'Pre-read ready': 'review' },
    },
    {
      ref: 'review',
      type: 'step',
      name: 'Strategy team review',
      description: 'The strategy team reads the pre-read summary and proceeds or rejects.',
      config: {
        actor: 'human',
        action: 'approve',
        assignee: 'team-strategic-alignment',
        approvers: 2,
        approvalRule: 'all',
        instructions: 'Read the pre-read summary, then proceed with the request or reject it with a reason.',
        outcomes: [
          { id: newId('opt'), label: 'Proceed' },
          { id: newId('opt'), label: 'Reject', ask: 'Reason for rejection' },
        ],
      },
      sla: sla(5, [reminder(3)], escalate),
      to: { Proceed: 'complete', Reject: 'rejected' },
    },
    { ref: 'rejected', type: 'closeRequest', name: 'Rejected by strategy team', config: rejectAndEmail('Rejected – by strategy team') },
    { ref: 'complete', type: 'stageComplete', name: 'Stage complete', config: { unlock: 'next', statusLabel: 'Completed' } },
  ])
}

/**
 * Stage 4 – NDA: the director confirms the vendor signed the NDA and uploads it, then an agent builds the alignment pack.
 */
function ndaStage(): Stage {
  const escalate = { kind: 'escalate' as const, to: [{ kind: 'role' as const, roleId: 'role-superadmin' }] }
  return buildStage('NDA', 'The director uploads the signed NDA, then the agent builds the alignment pack.', [
    { ref: 'start', type: 'stageStart', name: 'Stage start', config: { startsWhen: 'previousStage' }, to: { Start: 'upload' } },
    {
      ref: 'upload',
      type: 'step',
      name: 'Director uploads the signed NDA',
      description: 'The director confirms the vendor has signed the NDA, then uploads the signed copy.',
      config: {
        actor: 'human',
        action: 'upload',
        assignee: DIRECTOR,
        assigneeUser: 'u13',
        approvers: 1,
        acknowledgement: 'I confirm the vendor has signed the NDA',
        documentName: 'Signed NDA',
        instructions: 'Confirm the vendor has signed the NDA, then upload the signed copy.',
        outcomes: options('NDA uploaded'),
      },
      sla: sla(10, [reminder(7)], escalate),
      to: { 'NDA uploaded': 'pack' },
    },
    {
      ref: 'pack',
      type: 'step',
      name: 'Build the alignment pack',
      description: 'The agent puts together the alignment pack.',
      config: {
        actor: 'agent',
        action: 'generate',
        agentId: 'alignment-pack-agent',
        prompt: findAgent('alignment-pack-agent')?.prompt ?? '',
        tasks: [],
        outcomes: options('Alignment pack ready'),
      },
      to: { 'Alignment pack ready': 'complete' },
    },
    { ref: 'complete', type: 'stageComplete', name: 'Stage complete', config: { unlock: 'next', statusLabel: 'Completed' } },
  ])
}

/**
 * Stage 5 – Discovery Call: the director confirms the call happened, can upload its transcript or recording,
 * the agent summarises it, and the director proceeds or rejects.
 */
function discoveryCallStage(): Stage {
  const escalate = { kind: 'escalate' as const, to: [{ kind: 'role' as const, roleId: 'role-superadmin' }] }
  return buildStage('Discovery Call', 'The director confirms the discovery call, the agent summarises it, and the director decides.', [
    { ref: 'start', type: 'stageStart', name: 'Stage start', config: { startsWhen: 'previousStage' }, to: { Start: 'confirm' } },
    {
      ref: 'confirm',
      type: 'step',
      name: 'Director confirms the call',
      description: 'The director confirms the discovery call took place and can upload its transcript or recording.',
      config: {
        actor: 'human',
        action: 'upload',
        assignee: DIRECTOR,
        assigneeUser: 'u13',
        approvers: 1,
        acknowledgement: 'The discovery call has been completed',
        documentName: 'Call transcript or recording',
        uploadOptional: true,
        instructions: 'Confirm the discovery call is done. Upload the transcript or recording if you have it.',
        outcomes: options('Continue'),
      },
      sla: sla(10, [reminder(7)], escalate),
      to: { Continue: 'summary' },
    },
    {
      ref: 'summary',
      type: 'step',
      name: 'Summarise the call',
      config: {
        actor: 'agent',
        action: 'generate',
        agentId: 'call-summary-agent',
        prompt: findAgent('call-summary-agent')?.prompt ?? '',
        tasks: [],
        outcomes: options('Summary ready'),
      },
      to: { 'Summary ready': 'decide' },
    },
    {
      ref: 'decide',
      type: 'step',
      name: 'Director decides',
      config: {
        actor: 'human',
        action: 'review',
        assignee: DIRECTOR,
        assigneeUser: 'u13',
        approvers: 1,
        instructions: 'Read the call summary, then proceed or reject with a reason.',
        outcomes: [
          { id: newId('opt'), label: 'Proceed' },
          { id: newId('opt'), label: 'Reject', ask: 'Reason for rejection' },
        ],
      },
      sla: sla(3, [reminder(2)], escalate),
      to: { Proceed: 'complete', Reject: 'rejected' },
    },
    { ref: 'rejected', type: 'closeRequest', name: 'Rejected by Director', config: rejectAndEmail('Rejected – after discovery call') },
    { ref: 'complete', type: 'stageComplete', name: 'Stage complete', config: { unlock: 'next', statusLabel: 'Completed' } },
  ])
}

/**
 * Stage 6 – Value & Due Diligence: the sponsor confirms the value call and uploads the business case, an agent
 * summarises it, the sponsor decides; then the TDD admin completes the assessments, the TDD report is written and the
 * sponsor makes the final call.
 */
function valueStage(): Stage {
  const SPONSOR_ROLE = 'role-sponsor'
  const escalate = { kind: 'escalate' as const, to: [{ kind: 'role' as const, roleId: DIRECTOR }] }
  return buildStage('Value & Due Diligence', 'The sponsor builds the business case, the TDD admin completes the assessments, and the sponsor makes the final call.', [
    { ref: 'start', type: 'stageStart', name: 'Stage start', config: { startsWhen: 'previousStage' }, to: { Start: 'business' } },
    {
      ref: 'business',
      type: 'step',
      name: 'Sponsor uploads the business case',
      description: 'The sponsor confirms the value assessment call is done and uploads the business case.',
      config: {
        actor: 'human',
        action: 'upload',
        assignee: SPONSOR_ROLE,
        approvers: 1,
        acknowledgement: 'The value assessment call has been completed',
        documentName: 'Business case',
        uploadOptional: false,
        instructions: 'Confirm the value assessment call is done and upload the business case.',
        outcomes: options('Business case uploaded'),
      },
      sla: sla(10, [reminder(7)], escalate),
      to: { 'Business case uploaded': 'valueSummary' },
    },
    {
      ref: 'valueSummary',
      type: 'step',
      name: 'Write the value assessment summary',
      config: {
        actor: 'agent',
        action: 'generate',
        agentId: 'value-summary-agent',
        prompt: findAgent('value-summary-agent')?.prompt ?? '',
        tasks: [],
        outcomes: options('Summary ready'),
      },
      to: { 'Summary ready': 'sponsorDecision' },
    },
    {
      ref: 'sponsorDecision',
      type: 'step',
      name: 'Sponsor decision',
      config: {
        actor: 'human',
        action: 'approve',
        assignee: SPONSOR_ROLE,
        approvers: 1,
        instructions: 'Read the value assessment summary, then proceed to sponsor or reject with a reason.',
        outcomes: [
          { id: newId('opt'), label: 'Proceed to sponsor' },
          { id: newId('opt'), label: 'Reject', ask: 'Reason for rejection' },
        ],
      },
      sla: sla(5, [reminder(3)], escalate),
      to: { 'Proceed to sponsor': 'tdd', Reject: 'rejectedValue' },
    },
    { ref: 'rejectedValue', type: 'closeRequest', name: 'Rejected by sponsor', config: rejectAndEmail('Rejected – by sponsor') },
    {
      ref: 'tdd',
      type: 'step',
      name: 'TDD admin completes the assessments',
      description: 'The TDD admin marks every technical assessment as complete.',
      config: {
        actor: 'human',
        action: 'confirm',
        assignee: 'role-tdd-admin',
        assigneeUser: 'u15',
        approvers: 1,
        instructions: 'Mark every technical due diligence assessment as complete.',
        outcomes: options('All assessments completed'),
      },
      sla: sla(15, [reminder(10)], escalate),
      to: { 'All assessments completed': 'report' },
    },
    {
      ref: 'report',
      type: 'step',
      name: 'Write the TDD report',
      config: {
        actor: 'agent',
        action: 'generate',
        agentId: 'tdd-report-agent',
        prompt: findAgent('tdd-report-agent')?.prompt ?? '',
        tasks: [],
        outcomes: options('Report ready'),
      },
      to: { 'Report ready': 'final' },
    },
    {
      ref: 'final',
      type: 'step',
      name: 'Sponsor final decision',
      config: {
        actor: 'human',
        action: 'approve',
        assignee: SPONSOR_ROLE,
        approvers: 1,
        instructions: 'Read the TDD report, then sponsor the request or decline with a reason.',
        outcomes: [
          { id: newId('opt'), label: 'Sponsor' },
          { id: newId('opt'), label: 'Do not sponsor', ask: 'Reason for not sponsoring' },
        ],
      },
      sla: sla(5, [reminder(3)], escalate),
      to: { Sponsor: 'complete', 'Do not sponsor': 'rejectedFinal' },
    },
    { ref: 'rejectedFinal', type: 'closeRequest', name: 'Not sponsored', config: rejectAndEmail('Closed – not sponsored') },
    { ref: 'complete', type: 'stageComplete', name: 'Request complete', config: { unlock: 'next', statusLabel: 'Completed' } },
  ])
}

export function seedWorkflow(): Workflow {
  const stages = [stage1(), internalCanvasStage(), strategicAlignmentStage(), ndaStage(), discoveryCallStage(), valueStage()]
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
