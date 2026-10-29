/**
 * Plain-language descriptions of configuration values, for cards, previews and the audit log.
 */

import type {
  BreachAction,
  CaseField,
  DurationUnit,
  Recipient,
  Rule,
  RuleGroup,
  RuleOperator,
  SlaConfig,
  WorkflowNode,
} from '@/types/workflow'
import { findRole, findTeam, findUser } from '@/lib/library'

export const UNIT_LABELS: Record<DurationUnit, [string, string]> = {
  minutes: ['minute', 'minutes'],
  hours: ['hour', 'hours'],
  businessDays: ['business day', 'business days'],
  calendarDays: ['calendar day', 'calendar days'],
}

export const SHORT_UNIT: Record<DurationUnit, [string, string]> = {
  minutes: ['min', 'min'],
  hours: ['hour', 'hours'],
  businessDays: ['day', 'days'],
  calendarDays: ['cal. day', 'cal. days'],
}

export function durationText(
  d: { value: number | null; unit: DurationUnit },
  short = false
): string {
  if (d.value === null || d.value === undefined || Number.isNaN(d.value)) return 'no time set'
  const [one, many] = (short ? SHORT_UNIT : UNIT_LABELS)[d.unit]
  return `${d.value} ${d.value === 1 ? one : many}`
}

export function recipientText(r: Recipient, caseFields: CaseField[] = []): string {
  switch (r.kind) {
    case 'role':
      return findRole(r.roleId)?.name ?? 'Unknown role'
    case 'team':
      return findTeam(r.teamId)?.name ?? 'Unknown team'
    case 'user':
      return findUser(r.userId)?.name ?? 'Unknown person'
    case 'vendor':
      return 'Vendor'
    case 'stepAssignees':
      return 'Step assignees'
    case 'fromCaseField':
      return caseFields.find((f) => f.key === r.fieldKey)?.label ?? 'People from case'
  }
}

export function recipientsText(list: Recipient[] | undefined, caseFields: CaseField[] = []) {
  if (!list || list.length === 0) return 'nobody'
  return list.map((r) => recipientText(r, caseFields)).join(', ')
}

export function slaChip(sla: SlaConfig | undefined, agent = false): string | null {
  if (!sla || !sla.enabled) return null
  if (sla.duration.value === null) return 'Time limit not set'
  const base = durationText(sla.duration, true)
  if (agent) return `Timeout ${base}`
  const r = sla.reminders[0]
  if (!r) return base
  const unit = r.after.unit === 'hours' ? 'hour' : 'day'
  return `${base} · reminder ${unit} ${r.after.value ?? '?'}`
}

export function breachText(
  b: BreachAction | null,
  node?: WorkflowNode,
  nodeName?: (id: string) => string
): string {
  if (!b) return 'Not set'
  switch (b.kind) {
    case 'closeRequest':
      return `Close request (${b.statusLabel || 'no label'})`
    case 'escalate':
      return `Escalate to ${recipientsText(b.to)}`
    case 'reassign':
      return `Reassign to ${recipientsText(b.to)}`
    case 'notifyOnly':
      return `Notify ${recipientsText(b.to)}`
    case 'takeOutcome':
      return `Take outcome: ${node?.outcomes.find((o) => o.id === b.outcomeId)?.label ?? '?'}`
    case 'routeTo':
      return `Go to ${nodeName?.(b.nodeId) ?? 'node'}`
  }
}

export const OPERATOR_LABELS: Record<RuleOperator, string> = {
  is: 'is',
  isNot: 'is not',
  isAnyOf: 'is any of',
  isNoneOf: 'is none of',
  gt: 'is more than',
  gte: 'is at least',
  lt: 'is less than',
  lte: 'is at most',
  isEmpty: 'is empty',
  isNotEmpty: 'is not empty',
  contains: 'contains',
}

function valueText(v: unknown): string {
  if (Array.isArray(v)) return v.join(', ')
  if (v === undefined || v === null || v === '') return '…'
  return String(v)
}

export function ruleText(rule: Rule, caseFields: CaseField[]): string {
  const op = OPERATOR_LABELS[rule.operator]
  const needsValue = rule.operator !== 'isEmpty' && rule.operator !== 'isNotEmpty'
  if (rule.left.kind === 'caseField') {
    const key = rule.left.key
    const f = caseFields.find((c) => c.key === key)
    return `${f?.label ?? 'a removed field'} ${op}${needsValue ? ` ${valueText(rule.value)}` : ''}`
  }
  const of = rule.left.of
  const list = caseFields.find((c) => c.key === of)
  let subject = `Number of ${list?.label.toLowerCase() ?? 'items'}`
  if (rule.left.fn === 'countWhere' && rule.left.where && rule.left.where.left.kind === 'caseField') {
    const whereKey = rule.left.where.left.key
    const inner = list?.itemFields?.find((f) => f.key === whereKey)
    subject += ` where ${inner?.label ?? 'a removed field'} ${OPERATOR_LABELS[rule.left.where.operator]} ${valueText(rule.left.where.value)}`
  }
  return `${subject} ${op}${needsValue ? ` ${valueText(rule.value)}` : ''}`
}

export function isRuleGroup(r: Rule | RuleGroup): r is RuleGroup {
  return (r as RuleGroup).match !== undefined
}

export function groupText(group: RuleGroup, caseFields: CaseField[]): string {
  if (group.rules.length === 0) return 'no rules yet'
  const joiner = group.match === 'all' ? ' and ' : ' or '
  const text = group.rules
    .map((r) => (isRuleGroup(r) ? `(${groupText(r, caseFields)})` : ruleText(r, caseFields)))
    .join(joiner)
  return group.match === 'none' ? `none of: ${text}` : text
}
