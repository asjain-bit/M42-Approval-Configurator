import dagre from '@dagrejs/dagre'
import { getNodeType } from '@/lib/registry/nodes'
import type { Stage, WorkflowNode } from '@/types/workflow'
import { stageEntry } from './graph'

export const OUTCOME_SLOT = 104

export function nodeSize(node: WorkflowNode): { width: number; height: number } {
  const def = getNodeType(node.type)
  if (def.shape === 'pill') return { width: 230, height: node.outcomes.length ? 92 : 64 }
  return { width: Math.max(260, node.outcomes.length * OUTCOME_SLOT + 24), height: 132 }
}

/** Top-to-bottom layout. Loop-back connections are ignored so they don't pull nodes upward. */
export function autoLayout(stage: Stage): Record<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'TB', nodesep: 48, ranksep: 72, marginx: 20, marginy: 20 })
  g.setDefaultEdgeLabel(() => ({}))
  const nodes = Object.values(stage.nodes)
  for (const n of nodes) g.setNode(n.id, nodeSize(n))

  // Depth-first from the entry so back-edges (loops) can be skipped
  const entry = stageEntry(stage)
  const onPath = new Set<string>()
  const done = new Set<string>()
  const visit = (id: string) => {
    onPath.add(id)
    for (const o of stage.nodes[id].outcomes) {
      const t = o.targetNodeId
      if (!t || !stage.nodes[t]) continue
      if (onPath.has(t)) continue // loop back
      g.setEdge(id, t)
      if (!done.has(t)) visit(t)
    }
    onPath.delete(id)
    done.add(id)
  }
  if (entry) visit(entry.id)
  for (const n of nodes) if (!done.has(n.id)) visit(n.id)

  dagre.layout(g)
  const out: Record<string, { x: number; y: number }> = {}
  for (const n of nodes) {
    const p = g.node(n.id)
    const { width, height } = nodeSize(n)
    out[n.id] = { x: Math.round(p.x - width / 2), y: Math.round(p.y - height / 2) }
  }
  return out
}
