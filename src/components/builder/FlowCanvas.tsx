'use client'

import React, { useCallback, useEffect, useImperativeHandle, useMemo, useState, forwardRef } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  ControlButton,
  MarkerType,
  MiniMap,
  ReactFlow,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge as FlowEdge,
  type NodeChange,
} from '@xyflow/react'
import { Copy, LayoutTemplate, MousePointerClick, Trash2 } from 'lucide-react'
import type { Workflow } from '@/types/workflow'
import { getNodeType, nodeView } from '@/lib/registry/nodes'
import { stageEntry, stageLinks } from '@/lib/workflow/graph'
import { stageBlocks } from '@/lib/workflow/canvasLayout'
import type { StageHealth } from '@/lib/workflow/validation'
import { MenuList } from '@/components/ui/Menu'
import { NodeCard, type FlowNode } from './NodeCard'
import { StageBox, type StageBoxNode } from './StageBox'

type CanvasNode = FlowNode | StageBoxNode

export type Selection = { kind: 'node'; id: string } | { kind: 'edge'; nodeId: string; outcomeId: string } | null

export interface CanvasApi {
  centerPosition: () => { x: number; y: number }
  focusNode: (id: string) => void
  /** Frame the stage being edited */
  fit: () => void
  /** Frame every stage */
  fitAll: () => void
}

interface Props {
  workflow: Workflow
  /** The stage being edited; the others are shown around it for context */
  stageId: string
  health: Record<string, StageHealth>
  onOpenStage: (stageId: string) => void
  issueCounts: Record<string, { errors: number; toConfirm: number }>
  selection: Selection
  onSelect: (s: Selection) => void
  onConnect: (sourceId: string, outcomeId: string, targetId: string) => void
  onDisconnect: (sourceId: string, outcomeId: string) => void
  onMoveNodes: (positions: Record<string, { x: number; y: number }>) => void
  onDropNode: (type: string, position: { x: number; y: number }) => void
  onRequestDelete: (nodeId: string) => void
  onDuplicate: (nodeId: string) => void
  onAutoLayout: () => void
  onAddNext: (nodeId: string, outcomeKey: string) => void
}

const nodeTypes = { wfNode: NodeCard, stageBox: StageBox }

/**
 * FlowCanvas — Organism
 * React Flow canvas for the whole workflow: every stage is a box, joined by arrows, and the stage being
 * edited is live. Nodes and edges are rendered from the workflow JSON only.
 * Used in: StageBuilder
 */
export const FlowCanvas = forwardRef<CanvasApi, Props>(function FlowCanvas(
  {
    workflow,
    stageId,
    health,
    onOpenStage,
    issueCounts,
    selection,
    onSelect,
    onConnect,
    onDisconnect,
    onMoveNodes,
    onDropNode,
    onRequestDelete,
    onDuplicate,
    onAutoLayout,
    onAddNext,
  },
  ref
) {
  const flow = useReactFlow()
  const [menu, setMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null)

  const stage = workflow.stages[stageId]
  const blocks = useMemo(() => stageBlocks(workflow), [workflow])
  const active = blocks.find((b) => b.stageId === stageId)
  const stageOf = useCallback(
    (nodeId: string) => workflow.stageIds.find((id) => workflow.stages[id]?.nodes[nodeId]),
    [workflow]
  )

  const derivedNodes: CanvasNode[] = useMemo(() => {
    const out: CanvasNode[] = []
    blocks.forEach((block, index) => {
      const st = workflow.stages[block.stageId]
      const isActive = block.stageId === stageId
      out.push({
        id: `box:${block.stageId}`,
        type: 'stageBox',
        position: { x: block.x, y: block.y },
        width: block.width,
        height: block.height,
        style: { width: block.width, height: block.height, pointerEvents: 'none' },
        zIndex: -1,
        draggable: false,
        selectable: false,
        focusable: false,
        connectable: false,
        data: {
          stageId: block.stageId,
          index,
          name: st.name,
          active: isActive,
          enabled: st.enabled,
          errors: health[block.stageId]?.errors ?? 0,
          toConfirm: health[block.stageId]?.toConfirm ?? 0,
          dividerHeight: index < blocks.length - 1 ? Math.max(...blocks.map((b) => b.height)) : null,
          onOpen: onOpenStage,
        },
      })
      for (const node of Object.values(st.nodes)) {
        const p = block.layout[node.id] ?? { x: 0, y: 0 }
        out.push({
          id: node.id,
          type: 'wfNode',
          position: { x: block.originX + p.x, y: block.originY + p.y },
          selected: isActive && selection?.kind === 'node' ? selection.id === node.id : false,
          draggable: isActive,
          connectable: isActive,
          // Steps can't leave their own stage box on the left or the top
          extent: isActive ? [[block.originX, block.originY], [Infinity, Infinity]] : undefined,
          data: {
            node,
            stageId: block.stageId,
            errors: isActive ? (issueCounts[node.id]?.errors ?? 0) : 0,
            toConfirm: isActive ? (issueCounts[node.id]?.toConfirm ?? 0) : 0,
            disabled: !st.enabled,
            inactive: !isActive,
            onAddNext: isActive ? onAddNext : undefined,
            highlightOutcomeId: isActive && selection?.kind === 'edge' && selection.nodeId === node.id ? selection.outcomeId : null,
          },
        })
      }
    })
    return out
  }, [blocks, workflow, stageId, health, issueCounts, selection, onAddNext, onOpenStage])

  const [nodes, setNodes, onNodesChangeBase] = useNodesState<CanvasNode>(derivedNodes)
  useEffect(() => {
    setNodes(derivedNodes)
  }, [derivedNodes, setNodes])

  const edges: FlowEdge[] = useMemo(() => {
    const inside: FlowEdge[] = blocks.flatMap((block) => {
      const st = workflow.stages[block.stageId]
      const isActive = block.stageId === stageId
      return st.edges.map((e) => {
        const sy = block.layout[e.source]?.y ?? 0
        const ty = block.layout[e.target]?.y ?? 0
        const loop = ty <= sy
        const selected = isActive && selection?.kind === 'edge' && selection.nodeId === e.source && selection.outcomeId === e.sourceHandle
        return {
          id: e.id,
          source: e.source,
          sourceHandle: e.sourceHandle,
          target: e.target,
          targetHandle: 'in',
          label: e.label,
          type: 'smoothstep',
          selected,
          selectable: isActive,
          focusable: isActive,
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: selected ? '#36c0c9' : '#94a3b8' },
          style: {
            stroke: selected ? '#36c0c9' : '#94a3b8',
            strokeWidth: selected ? 2.5 : 1.5,
            strokeDasharray: loop ? '6 4' : undefined,
          },
          labelStyle: { fontSize: 10, fontWeight: 600, fill: '#0d212c' },
          labelBgStyle: { fill: '#ffffff' },
          labelBgPadding: [6, 3] as [number, number],
          labelBgBorderRadius: 6,
          pathOptions: { borderRadius: 12 },
        }
      })
    })
    const order = blocks.map((b) => b.stageId)
    const nodesOf = (id: string) => Object.values(workflow.stages[id].nodes)
    /** Where a hand-over arrives in a stage: its start step, else its first step, else the stage column itself */
    const arrival = (id: string): { node: string; handle: string } | null => {
      const start = nodesOf(id).find((n) => n.type === 'stageStart')
      if (start) return { node: start.id, handle: 'stageIn' }
      const entry = stageEntry(workflow.stages[id])
      return entry && !getNodeType(entry.type).isStart ? { node: entry.id, handle: 'in' } : null
    }
    const arrow = { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#36c0c9' }

    // A step's outcome that hands over to another stage: drawn from that outcome to the other stage
    const covered = new Set<string>()
    const jumps: FlowEdge[] = []
    for (const block of blocks)
      for (const node of nodesOf(block.stageId))
        for (const o of node.outcomes) {
          const to = o.targetStageId
          if (!to || !workflow.stages[to]) continue
          covered.add(`${block.stageId}>${to}`)
          const target = arrival(to)
          jumps.push({
            id: `jump:${node.id}:${o.id}`,
            source: node.id,
            sourceHandle: o.id,
            target: target?.node ?? `box:${to}`,
            targetHandle: target?.handle ?? 'in',
            label: o.label,
            type: 'smoothstep',
            selectable: false,
            focusable: false,
            markerEnd: arrow,
            style: { stroke: '#36c0c9', strokeWidth: 2.5 },
            labelStyle: { fontSize: 10, fontWeight: 600, fill: '#0d212c' },
            labelBgStyle: { fill: '#ffffff' },
            labelBgPadding: [6, 3] as [number, number],
            labelBgBorderRadius: 6,
          })
        }

    const between: FlowEdge[] = stageLinks(workflow)
      .filter(({ from, to }) => !covered.has(`${from}>${to}`))
      .map(({ from, to }) => {
        const adjacent = order.indexOf(to) - order.indexOf(from) === 1
        // Prefer joining the finishing step of one stage straight to the start of the next
        const end = nodesOf(from).find((n) => n.type === 'stageComplete' && (n.config.unlock === 'choose' ? n.config.stageId === to : adjacent))
        const target = arrival(to)
        const direct = adjacent && end && target
        return {
          id: `stage:${from}>${to}`,
          source: direct ? end.id : `box:${from}`,
          sourceHandle: direct ? 'stageOut' : adjacent ? 'out' : 'bout',
          target: direct ? target.node : `box:${to}`,
          targetHandle: direct ? target.handle : adjacent ? 'in' : 'bin',
          type: 'smoothstep',
          selectable: false,
          focusable: false,
          markerEnd: arrow,
          style: { stroke: '#36c0c9', strokeWidth: 2.5 },
        }
      })
    return [...inside, ...jumps, ...between]
  }, [blocks, workflow, stageId, selection])

  const onNodesChange = useCallback(
    (changes: NodeChange<CanvasNode>[]) => {
      // Selection and removal are driven by the stage JSON, not by React Flow
      onNodesChangeBase(changes.filter((c) => c.type === 'position' || c.type === 'dimensions'))
    },
    [onNodesChangeBase]
  )

  /** Canvas position -> position inside the stage being edited */
  const toStage = useCallback(
    (p: { x: number; y: number }) => ({ x: p.x - (active?.originX ?? 0), y: p.y - (active?.originY ?? 0) }),
    [active]
  )

  useImperativeHandle(ref, () => ({
    centerPosition: () => {
      const el = document.querySelector('.react-flow') as HTMLElement | null
      const rect = el?.getBoundingClientRect()
      if (!rect) return { x: 0, y: 0 }
      const p = toStage(flow.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }))
      return { x: Math.max(0, p.x - 130), y: Math.max(0, p.y - 60) }
    },
    focusNode: (id: string) => {
      const pos = active?.layout[id]
      if (pos && active)
        flow.setCenter(active.originX + pos.x + 130, active.originY + pos.y + 66, { zoom: Math.max(flow.getZoom(), 0.9), duration: 400 })
    },
    fit: () => flow.fitView({ nodes: [{ id: `box:${stageId}` }], padding: 0.12, duration: 300 }),
    fitAll: () => flow.fitView({ padding: 0.08, duration: 300 }),
  }))

  return (
    <div
      className="relative flex-1 min-w-0 h-full bg-[#f8fafc]"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('application/wf-node')) {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'copy'
        }
      }}
      onDrop={(e) => {
        const type = e.dataTransfer.getData('application/wf-node')
        if (!type) return
        e.preventDefault()
        const p = toStage(flow.screenToFlowPosition({ x: e.clientX, y: e.clientY }))
        onDropNode(type, { x: Math.max(0, p.x - 130), y: Math.max(0, p.y - 30) })
      }}
    >
      <ReactFlow<CanvasNode>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={(_, __, dragged) => {
          const positions: Record<string, { x: number; y: number }> = {}
          for (const n of dragged) {
            if (n.type !== 'wfNode') continue
            const p = toStage(n.position)
            positions[n.id] = { x: Math.round(p.x), y: Math.round(p.y) }
          }
          if (Object.keys(positions).length) onMoveNodes(positions)
        }}
        onConnect={(c: Connection) => {
          if (c.source && c.sourceHandle && c.target && c.source !== c.target) onConnect(c.source, c.sourceHandle, c.target)
        }}
        isValidConnection={(c) => c.source !== c.target}
        onNodeClick={(_, n) => {
          setMenu(null)
          if (n.type !== 'wfNode') return
          // A step in another stage opens that stage
          const owner = stageOf(n.id)
          if (owner && owner !== stageId) onOpenStage(owner)
          else onSelect({ kind: 'node', id: n.id })
        }}
        onEdgeClick={(_, e) => {
          setMenu(null)
          onSelect({ kind: 'edge', nodeId: e.source, outcomeId: e.sourceHandle! })
        }}
        onPaneClick={() => {
          setMenu(null)
          onSelect(null)
        }}
        onNodeContextMenu={(e, n) => {
          e.preventDefault()
          if (n.type !== 'wfNode' || stageOf(n.id) !== stageId) return
          const bounds = (e.currentTarget as HTMLElement).closest('.react-flow')!.getBoundingClientRect()
          onSelect({ kind: 'node', id: n.id })
          setMenu({ nodeId: n.id, x: e.clientX - bounds.left, y: e.clientY - bounds.top })
        }}
        onEdgesDelete={(deleted) => deleted.forEach((e) => onDisconnect(e.source, e.sourceHandle!))}
        deleteKeyCode={null}
        connectionLineStyle={{ stroke: '#36c0c9', strokeWidth: 2 }}
        fitView
        fitViewOptions={{ nodes: [{ id: `box:${stageId}` }], padding: 0.12 }}
        // Scrolling moves around the canvas; hold Ctrl or Cmd (or pinch) to zoom
        panOnScroll
        minZoom={0.1}
        maxZoom={1.75}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="#cbd5e1" />
        <Controls position="bottom-left" showInteractive={false} className="!shadow-xs !rounded-lg overflow-hidden !border !border-[#e2e8f0]">
          <ControlButton onClick={onAutoLayout} title="Auto-layout" aria-label="Auto-layout">
            <LayoutTemplate className="w-3.5 h-3.5" />
          </ControlButton>
        </Controls>
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          ariaLabel="Mini map"
          className="!rounded-lg !border !border-[#e2e8f0] !shadow-xs"
          nodeColor={(n) => {
            const node = (n as FlowNode).data?.node
            return node ? nodeView(node).mapColor : '#e2e8f0'
          }}
        />
      </ReactFlow>

      {Object.keys(stage?.nodes ?? {}).length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-center text-[#64748b]">
            <MousePointerClick className="w-8 h-8 text-[#94a3b8]" aria-hidden="true" />
            <p className="text-sm font-medium text-[#0d212c]">Drag steps from the left to build this stage.</p>
            <p className="text-xs">Or click a step in the list to add it here.</p>
          </div>
        </div>
      )}

      {menu && (
        <MenuList
          className="absolute"
          style={{ left: menu.x, top: menu.y }}
          onDone={() => setMenu(null)}
          items={[
            { label: 'Duplicate', icon: <Copy className="w-3.5 h-3.5" />, onClick: () => onDuplicate(menu.nodeId) },
            { label: 'Delete', icon: <Trash2 className="w-3.5 h-3.5" />, danger: true, onClick: () => onRequestDelete(menu.nodeId) },
          ]}
        />
      )}
    </div>
  )
})
