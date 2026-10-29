/**
 * Whole-workflow validation (§8.3.5). Every issue carries a plain-language
 * message and enough location info for a "Go to" link.
 */

import { getNodeType, isEnding, slaKind } from '@/lib/registry/nodes'
import { asArray } from '@/lib/registry/shared'
import type { FieldSchema, SchemaContext } from '@/lib/registry/types'
import type { Stage, Workflow, WorkflowNode } from '@/types/workflow'
import { caseDataDictionary, reachableFrom, stageEntry } from './graph'

export interface Issue {
  id: string
  severity: 'error' | 'warning'
  stageId: string
  nodeId?: string
  /** form field anchor to focus, e.g. 'name', 'sla', 'outcome:<id>', 'config:approvers' */
  field?: string
  message: string
  toConfirmIndex?: number
}

function getPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, k) => (acc as Record<string, unknown> | undefined)?.[k], obj)
}

function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null) return true
  if (typeof v === 'string') return v.trim() === '' || v.trim() === 'custom:'
  if (Array.isArray(v)) return v.length === 0
  return false
}

function requiredFieldIssues(
  fields: FieldSchema[],
  scope: Record<string, unknown>,
  ctx: SchemaContext,
  prefix: string
): { field: string; message: string }[] {
  const out: { field: string; message: string }[] = []
  for (const f of fields) {
    if (f.showIf && !f.showIf(scope, ctx)) continue
    const value = getPath(scope, f.key)
    if (f.required && f.kind !== 'list' && isEmpty(value))
      out.push({ field: `config:${f.key}`, message: `${prefix}${f.label || 'A required field'} is missing.` })
    if (f.kind === 'list' || f.kind === 'setRows') {
      const items = asArray<Record<string, unknown>>(value)
      if (f.minItems && items.length < f.minItems)
        out.push({
          field: `config:${f.key}`,
          message: `${prefix}${f.label} needs at least ${f.minItems}.`,
        })
      if (f.itemSchema)
        items.forEach((item, i) => {
          const title = f.itemTitle?.(item, i) ?? `${f.label} ${i + 1}`
          out.push(...requiredFieldIssues(f.itemSchema!, item, ctx, `${title}: `).map((x) => ({ ...x, field: `config:${f.key}` })))
        })
    }
  }
  return out
}

function nodeIssues(node: WorkflowNode, stage: Stage, workflow: Workflow, ctx: SchemaContext): Omit<Issue, 'id'>[] {
  const def = getNodeType(node.type)
  const base = { stageId: stage.id, nodeId: node.id }
  const issues: Omit<Issue, 'id'>[] = []
  const name = node.name.trim()

  if (!name) issues.push({ ...base, severity: 'error', field: 'name', message: 'A step has no name.' })
  else if (Object.values(stage.nodes).some((n) => n.id !== node.id && n.name.trim().toLowerCase() === name.toLowerCase()))
    issues.push({ ...base, severity: 'error', field: 'name', message: `The name "${name}" is used by more than one step.` })

  for (const o of node.outcomes) {
    if (!o.targetNodeId && !(o.targetStageId && workflow.stages[o.targetStageId])) {
      issues.push({ ...base, severity: 'error', field: `outcome:${o.id}`, message: `"${name}": the "${o.label}" outcome is not connected.` })
    }
  }

  for (const section of def.configSchema) {
    if (section.showIf && !section.showIf(node.config, ctx)) continue
    for (const r of requiredFieldIssues(section.fields, node.config, ctx, ''))
      issues.push({ ...base, severity: 'error', field: r.field, message: `"${name}": ${r.message}` })
  }

  const kind = slaKind(def, node)
  if (kind) {
    const sla = node.sla
    const what = kind === 'agent' ? 'run timeout' : 'time limit'
    if (!sla || !sla.enabled)
      issues.push({ ...base, severity: 'error', field: 'sla', message: `"${name}" needs a ${what} and a breach action.` })
    else {
      if (sla.duration.value === null || !(sla.duration.value > 0))
        issues.push({ ...base, severity: 'error', field: 'sla', message: `"${name}": the ${what} is not set.` })
      if (!sla.breachAction)
        issues.push({ ...base, severity: 'error', field: 'sla', message: `"${name}": choose what happens when the ${what} is missed.` })
      sla.reminders.forEach((r, i) => {
        if (r.channels.length === 0)
          issues.push({ ...base, severity: 'error', field: 'sla', message: `"${name}": reminder ${i + 1} has no channel.` })
      })
    }
  }

  for (const v of def.validate?.(node, ctx) ?? [])
    issues.push({ ...base, severity: v.severity, field: v.field ? `config:${v.field}` : undefined, message: `"${name}": ${v.message}` })

  ;(node.toConfirm ?? []).forEach((text, i) =>
    issues.push({ ...base, severity: 'warning', field: 'toConfirm', message: `To confirm – ${name}: ${text}`, toConfirmIndex: i })
  )
  return issues
}

/** A step that ends the stage's flow, or hands the request over to another stage */
const leavesStage = (n: WorkflowNode) => isEnding(n) || n.outcomes.some((o) => o.targetStageId)

export function validateStage(workflow: Workflow, stage: Stage, workflows: SchemaContext['workflows'] = []): Issue[] {
  const caseFields = caseDataDictionary(workflow)
  const issues: Omit<Issue, 'id'>[] = []
  const nodes = Object.values(stage.nodes)
  const entry = stageEntry(stage)

  if (!entry) issues.push({ stageId: stage.id, severity: 'error', message: `"${stage.name}" has no steps yet.` })

  for (const node of nodes) {
    const ctx: SchemaContext = { workflow, stage, node, caseFields, workflows }
    issues.push(...nodeIssues(node, stage, workflow, ctx))
  }

  if (entry) {
    const reachable = reachableFrom(stage, entry.id)
    for (const node of nodes)
      if (!reachable.has(node.id))
        issues.push({
          stageId: stage.id,
          nodeId: node.id,
          severity: 'error',
          message: `"${node.name}" can't be reached from the start of the stage.`,
        })
    if (![...reachable].some((id) => leavesStage(stage.nodes[id])))
      issues.push({ stageId: stage.id, severity: 'error', message: `"${stage.name}" never reaches an ending (Stage complete, Close request, Stop with label or a hand-over to another stage).` })

    // Loops with no exit: nodes from which no ending can be reached
    const canFinish = new Set<string>()
    let changed = true
    for (const n of nodes) if (leavesStage(n)) canFinish.add(n.id)
    while (changed) {
      changed = false
      for (const n of nodes)
        if (!canFinish.has(n.id) && n.outcomes.some((o) => o.targetNodeId && canFinish.has(o.targetNodeId))) {
          canFinish.add(n.id)
          changed = true
        }
    }
    for (const id of reachable) {
      const n = stage.nodes[id]
      if (!canFinish.has(id) && n.outcomes.length > 0 && n.outcomes.every((o) => o.targetNodeId || o.targetStageId))
        issues.push({
          stageId: stage.id,
          nodeId: id,
          severity: 'error',
          message: `"${n.name}" is in a loop with no way out.`,
        })
    }
  }

  return issues.map((i, idx) => ({ ...i, id: `${stage.id}-${idx}` }))
}

export function validateWorkflow(workflow: Workflow, workflows: SchemaContext['workflows'] = []): Issue[] {
  const issues: Issue[] = []
  for (const id of workflow.stageIds) {
    const stage = workflow.stages[id]
    if (stage) issues.push(...validateStage(workflow, stage, workflows))
  }
  return issues
}

export interface StageHealth {
  errors: number
  toConfirm: number
}

export function stageHealth(workflow: Workflow, stage: Stage): StageHealth {
  const issues = validateStage(workflow, stage)
  return {
    errors: issues.filter((i) => i.severity === 'error').length,
    toConfirm: issues.filter((i) => i.severity === 'warning').length,
  }
}
