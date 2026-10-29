/**
 * Pure helpers that keep a stage consistent: outcomes follow node config,
 * edges are always derived from outcomes, names stay unique.
 */

import { newId } from '@/lib/id'
import { getNodeType, slaKind } from '@/lib/registry/nodes'
import type {
  ID,
  CaseField,
  Edge,
  Outcome,
  Stage,
  Workflow,
  WorkflowNode,
} from '@/types/workflow'

/** Rebuild a node's outcomes from its type, keeping ids and connections by key. */
export function syncOutcomes(node: WorkflowNode): WorkflowNode {
  const def = getNodeType(node.type)
  const specs = def.getOutcomes(node)
  const byKey = new Map(node.outcomes.map((o) => [o.key, o]))
  const outcomes: Outcome[] = specs.map((spec) => {
    const existing = byKey.get(spec.key)
    return {
      id: existing?.id ?? newId('out'),
      key: spec.key,
      label: spec.label,
      targetNodeId: existing?.targetNodeId ?? null,
      ...(existing?.targetStageId ? { targetStageId: existing.targetStageId } : {}),
    }
  })
  // The time limit follows the step's settings: added when it needs one, dropped when it doesn't
  let sla = slaKind(def, node) ? (node.sla ?? def.defaultSla?.()) : undefined
  // A take-outcome breach action must point at an outcome that still exists
  if (sla?.breachAction?.kind === 'takeOutcome') {
    const target = sla.breachAction.outcomeId
    if (!outcomes.some((o) => o.id === target)) sla = { ...sla, breachAction: null }
  }
  return { ...node, outcomes, sla }
}

export function deriveEdges(nodes: Record<string, WorkflowNode>): Edge[] {
  const edges: Edge[] = []
  for (const node of Object.values(nodes)) {
    for (const o of node.outcomes) {
      if (o.targetNodeId && nodes[o.targetNodeId]) {
        edges.push({
          id: `${node.id}:${o.id}`,
          source: node.id,
          sourceHandle: o.id,
          target: o.targetNodeId,
          label: o.label,
        })
      }
    }
  }
  return edges
}

/** Clear dangling targets and re-derive edges. */
export function normalizeStage(stage: Stage): Stage {
  const nodes: Record<string, WorkflowNode> = {}
  for (const [id, n] of Object.entries(stage.nodes)) {
    const synced = syncOutcomes(n)
    nodes[id] = {
      ...synced,
      outcomes: synced.outcomes.map((o) =>
        o.targetNodeId && !stage.nodes[o.targetNodeId] ? { ...o, targetNodeId: null } : o
      ),
    }
  }
  const layout = Object.fromEntries(Object.entries(stage.layout).filter(([id]) => nodes[id]))
  return { ...stage, nodes, layout, edges: deriveEdges(nodes) }
}

export function uniqueNodeName(stage: Stage, base: string, exceptId?: string): string {
  const names = new Set(
    Object.values(stage.nodes)
      .filter((n) => n.id !== exceptId)
      .map((n) => n.name.trim().toLowerCase())
  )
  if (!names.has(base.toLowerCase())) return base
  let i = 2
  while (names.has(`${base} ${i}`.toLowerCase())) i++
  return `${base} ${i}`
}

export function createNode(type: string, stage: Stage, name?: string): WorkflowNode {
  const def = getNodeType(type)
  const node: WorkflowNode = {
    id: newId('node'),
    type,
    name: name ?? uniqueNodeName(stage, def.defaultName),
    description: '',
    config: def.defaultConfig(),
    outcomes: [],
  }
  return syncOutcomes(node)
}

/** A new stage begins with its start node; the admin adds every step after it. */
export function newStage(name: string, description = ''): Stage {
  const empty: Stage = {
    id: newId('stage'),
    name,
    description,
    enabled: true,
    statusLabels: { current: 'To review', locked: 'Upcoming', done: 'Completed' },
    nodes: {},
    edges: [],
    layout: {},
  }
  const start = createNode('stageStart', empty)
  return { ...empty, nodes: { [start.id]: start } }
}

export interface StageLink {
  from: ID
  to: ID
}

/**
 * How the stages hand over to each other, for the connected view: each stage
 * leads to the next one, unless a Stage complete step unlocks a chosen stage
 * or a Stage start waits for a specific one.
 */
export function stageLinks(workflow: Workflow): StageLink[] {
  const ids = workflow.stageIds.filter((id) => workflow.stages[id])
  const links = new Map<string, StageLink>()
  const add = (from: ID, to: ID) => {
    if (from !== to && ids.includes(from) && ids.includes(to)) links.set(`${from}>${to}`, { from, to })
  }
  const endsOf = (id: ID) => Object.values(workflow.stages[id].nodes).filter((n) => n.type === 'stageComplete')
  /** A stage hands over to the one after it unless every Stage complete step picks another stage */
  const leadsToNext = (id: ID) => {
    const ends = endsOf(id)
    return ends.length === 0 || ends.some((n) => n.config.unlock !== 'choose')
  }

  ids.forEach((id, i) => {
    const start = Object.values(workflow.stages[id].nodes).find((n) => n.type === 'stageStart')
    const waitsFor = start?.config.startsWhen === 'specificStage' ? String(start.config.stageId ?? '') : ''
    if (waitsFor) add(waitsFor, id)
    else if (i > 0 && leadsToNext(ids[i - 1])) add(ids[i - 1], id)

    for (const end of endsOf(id)) if (end.config.unlock === 'choose') add(id, String(end.config.stageId ?? ''))
  })
  return [...links.values()]
}

/** The step a stage starts from: a start step (Form), else the first step nothing leads into. */
export function stageEntry(stage: Stage): WorkflowNode | undefined {
  const nodes = Object.values(stage.nodes)
  const targeted = new Set(nodes.flatMap((n) => n.outcomes.map((o) => o.targetNodeId)))
  return (
    nodes.find((n) => getNodeType(n.type).isStart) ??
    nodes.find((n) => !targeted.has(n.id)) ??
    nodes[0]
  )
}

export function reachableFrom(stage: Stage, startId: string): Set<string> {
  const seen = new Set<string>()
  const stack = [startId]
  while (stack.length) {
    const id = stack.pop()!
    if (seen.has(id) || !stage.nodes[id]) continue
    seen.add(id)
    for (const o of stage.nodes[id].outcomes) if (o.targetNodeId) stack.push(o.targetNodeId)
  }
  return seen
}

/** Case data dictionary: every field any node declares, in stage order. */
export function caseDataDictionary(workflow: Workflow): CaseField[] {
  const fields: CaseField[] = []
  const seen = new Set<string>()
  for (const stageId of workflow.stageIds) {
    const stage = workflow.stages[stageId]
    if (!stage) continue
    for (const node of Object.values(stage.nodes)) {
      const def = getNodeType(node.type)
      for (const out of def.outputs?.(node) ?? []) {
        if (seen.has(out.key)) continue
        seen.add(out.key)
        fields.push({ ...out, producedBy: node.name, stageName: stage.name })
      }
    }
  }
  return fields
}

export function nodeNameIn(workflow: Workflow, stageId: string) {
  return (id: string) => workflow.stages[stageId]?.nodes[id]?.name ?? 'a removed node'
}

/** Deep clone that keeps everything JSON-safe */
export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T
