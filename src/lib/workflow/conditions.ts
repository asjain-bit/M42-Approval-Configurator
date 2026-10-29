/**
 * Condition evaluation, kept apart from the builder UI and the node registry.
 * It works on plain data: case values by field key, where a list field is an array of items.
 * The configurator uses it to check rules; a runtime can use the same rules to route a request.
 */

import type { Rule, RuleGroup } from '@/types/workflow'

export type CaseData = Record<string, unknown>

const num = (v: unknown) => (v === '' || v === null || v === undefined ? NaN : Number(v))
const empty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)

function compare(operator: Rule['operator'], left: unknown, value: unknown): boolean {
  switch (operator) {
    case 'is':
      return typeof value === 'number' || typeof left === 'number' ? num(left) === num(value) : String(left ?? '') === String(value ?? '')
    case 'isNot':
      return !compare('is', left, value)
    case 'isAnyOf':
      return Array.isArray(value) && value.map(String).includes(String(left))
    case 'isNoneOf':
      return !compare('isAnyOf', left, value)
    case 'gt':
      return num(left) > num(value)
    case 'gte':
      return num(left) >= num(value)
    case 'lt':
      return num(left) < num(value)
    case 'lte':
      return num(left) <= num(value)
    case 'isEmpty':
      return empty(left)
    case 'isNotEmpty':
      return !empty(left)
    case 'contains':
      return Array.isArray(left) ? left.map(String).includes(String(value)) : String(left ?? '').toLowerCase().includes(String(value ?? '').toLowerCase())
  }
}

export function evaluateRule(rule: Rule, data: CaseData): boolean {
  if (rule.left.kind === 'caseField') return compare(rule.operator, data[rule.left.key], rule.value)
  const list = Array.isArray(data[rule.left.of]) ? (data[rule.left.of] as CaseData[]) : []
  const where = rule.left.fn === 'countWhere' ? rule.left.where : undefined
  const count = where ? list.filter((item) => evaluateRule(where, item)).length : list.length
  return compare(rule.operator, count, rule.value)
}

const isGroup = (r: Rule | RuleGroup): r is RuleGroup => (r as RuleGroup).match !== undefined

export function evaluateGroup(group: RuleGroup, data: CaseData): boolean {
  const results = group.rules.map((r) => (isGroup(r) ? evaluateGroup(r, data) : evaluateRule(r, data)))
  if (group.match === 'any') return results.some(Boolean)
  if (group.match === 'none') return !results.some(Boolean)
  return results.every(Boolean)
}

export interface DecisionBranch {
  id: string
  label: string
  rules: RuleGroup
}

/** The outcome a decision takes: the first outcome whose rules hold, else the default one (if there is one) */
export function routeDecision(branches: DecisionBranch[], hasDefault: boolean, data: CaseData): string | null {
  const hit = branches.find((b) => b.rules.rules.length > 0 && evaluateGroup(b.rules, data))
  return hit ? hit.id : hasDefault ? 'otherwise' : null
}
