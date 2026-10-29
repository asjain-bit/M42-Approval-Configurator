/**
 * Workflow configuration data model.
 * Everything the configurator shows is read from and written to these shapes.
 */

export type ID = string

export type WorkflowStatus = 'draft' | 'published' | 'archived'

export interface Workflow {
  id: ID
  name: string
  description: string
  status: WorkflowStatus
  version: number
  publishedVersion?: number
  stageIds: ID[]
  stages: Record<ID, Stage>
  settings: WorkflowSettings
  updatedAt: string
  updatedBy: string
}

/** One published version of a workflow, kept so it can be looked at or brought back */
export interface WorkflowVersion {
  id: ID
  version: number
  at: string
  by: string
  summary: string
  snapshot: Workflow
}

export interface WorkflowEventRule {
  id: ID
  trigger: 'vendorWithdraws' | 'adminCancels'
  action: BreachAction
}

export interface WorkflowSettings {
  caseIdFormat: string
  workingCalendarId: ID
  defaultReminderTime: string
  timezone: string
  eventRules: WorkflowEventRule[]
  toConfirm?: string[]
}

export interface Stage {
  id: ID
  name: string
  description?: string
  enabled: boolean
  statusLabels: { current: string; locked: string; done: string }
  nodes: Record<ID, WorkflowNode>
  edges: Edge[]
  layout: Record<ID, { x: number; y: number }>
}

export interface WorkflowNode {
  id: ID
  type: string
  name: string
  description?: string
  config: Record<string, unknown>
  outcomes: Outcome[]
  sla?: SlaConfig
  toConfirm?: string[]
}

export interface Outcome {
  id: ID
  key: string
  label: string
  targetNodeId: ID | null
  /** Leaves this stage and starts another one (instead of leading to a step here) */
  targetStageId?: ID
  condition?: RuleGroup
}

export interface Edge {
  id: string
  source: ID
  sourceHandle: ID
  target: ID
  label: string
}

export type DurationUnit = 'minutes' | 'hours' | 'businessDays' | 'calendarDays'

export interface SlaConfig {
  enabled: boolean
  duration: { value: number | null; unit: DurationUnit }
  clockStarts: 'onStepStart' | 'onAssignment'
  reminders: Reminder[]
  breachAction: BreachAction | null
}

export interface Reminder {
  id: ID
  after: { value: number | null; unit: 'hours' | 'businessDays' | 'calendarDays' }
  sendAt?: string
  channels: ('email' | 'inApp')[]
  recipients: Recipient[]
  templateId: ID
}

export type BreachAction =
  | { kind: 'closeRequest'; statusLabel: string; notifyVendor: boolean }
  | { kind: 'escalate'; to: Recipient[] }
  | { kind: 'reassign'; to: Recipient[] }
  | { kind: 'notifyOnly'; to: Recipient[]; templateId: ID }
  | { kind: 'takeOutcome'; outcomeId: ID }
  | { kind: 'routeTo'; nodeId: ID }

export type BreachKind = BreachAction['kind']

export type Recipient =
  | { kind: 'role'; roleId: ID }
  | { kind: 'team'; teamId: ID }
  | { kind: 'user'; userId: ID }
  | { kind: 'vendor' }
  | { kind: 'fromCaseField'; fieldKey: string }
  | { kind: 'stepAssignees' }

export type RecipientKind = Recipient['kind']

export interface RuleGroup {
  /** all = AND, any = OR, none = NOT (none of the rules may be true) */
  match: 'all' | 'any' | 'none'
  rules: (Rule | RuleGroup)[]
}

export type RuleOperator =
  | 'is'
  | 'isNot'
  | 'isAnyOf'
  | 'isNoneOf'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'contains'

export interface Rule {
  left:
    | { kind: 'caseField'; key: string }
    | { kind: 'aggregate'; of: string; fn: 'count' | 'countWhere'; where?: Rule }
  operator: RuleOperator
  value?: unknown
}

export type AuditLevel = 'workflow' | 'stage' | 'node' | 'connection'

export interface AuditEntry {
  id: ID
  at: string
  by: string
  level: AuditLevel
  action:
    | 'created'
    | 'renamed'
    | 'edited'
    | 'reordered'
    | 'removed'
    | 'connected'
    | 'disconnected'
    | 'published'
  objectPath: string
  stageId?: ID
  before?: string
  after?: string
}

/** One entry of the case data dictionary, derived from node outputs. */
export interface CaseField {
  key: string
  label: string
  type: CaseFieldType
  options?: string[]
  /** For list fields (e.g. responses), the fields each item carries */
  itemFields?: CaseField[]
  producedBy: string
  stageName?: string
}

export type CaseFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'choice'
  | 'yesNo'
  | 'people'
  | 'person'
  | 'document'
  | 'list'
  | 'percent'
  | 'questions'
  | 'files'
