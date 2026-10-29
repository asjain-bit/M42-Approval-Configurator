'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ReactFlowProvider } from '@xyflow/react'
import { LayoutTemplate, Maximize, Minimize, PanelRightClose, PanelRightOpen, Redo2, Undo2 } from 'lucide-react'
import type { NewAuditEntry } from '@/lib/repository'
import { getNodeType, paletteItem } from '@/lib/registry/nodes'
import { caseDataDictionary, createNode, newStage, syncOutcomes, uniqueNodeName } from '@/lib/workflow/graph'
import { autoLayout, nodeSize } from '@/lib/workflow/layout'
import { useStageEditor } from '@/lib/workflow/useStageEditor'
import { stageHealth, validateStage, type Issue } from '@/lib/workflow/validation'
import { newId } from '@/lib/id'
import type { Stage, WorkflowNode } from '@/types/workflow'
import { AppShell } from '@/components/templates/AppShell'
import { WorkflowHeader } from '@/components/workflows/WorkflowHeader'
import { NameDescriptionModal } from '@/components/workflows/WorkflowFormModal'
import { ConfirmModal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { btnIcon } from '@/components/ui/styles'
import { FlowCanvas, type CanvasApi, type Selection } from './FlowCanvas'
import { NodeForm, type NodeChange } from './NodeForm'
import { NodePalette } from './NodePalette'
import { NodePickerModal } from './NodePickerModal'
import { StageBar } from './StageBar'
import { StageSettings } from './StageSettings'
import type { RoutingApi } from './fields/routing'

/** A free spot below the lowest step, so a step added from the palette never lands on top of another */
function spotBelow(stage: Stage) {
  let lowest: { x: number; bottom: number } | null = null
  for (const n of Object.values(stage.nodes)) {
    const p = stage.layout[n.id]
    if (!p) continue
    const bottom = p.y + nodeSize(n).height
    if (!lowest || bottom > lowest.bottom) lowest = { x: p.x, bottom }
  }
  return lowest ? { x: lowest.x, y: lowest.bottom + 72 } : { x: 20, y: 20 }
}

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

/**
 * StageBuilder — Screen
 * Stage bar, node palette, canvas and configuration form for one stage.
 * Used in: StagePage
 */
export const StageBuilder: React.FC<{ workflowId: string; stageId: string }> = ({ workflowId, stageId }) => {
  const router = useRouter()
  const params = useSearchParams()
  const toast = useToast()
  const editor = useStageEditor(workflowId)
  const { workflow, apply, applyStage } = editor
  const canvas = useRef<CanvasApi>(null)

  const [selection, setSelection] = useState<Selection>(null)
  const [focus, setFocus] = useState<{ field: string | null; tick: number }>({ field: null, tick: 0 })
  const [paletteCollapsed, setPaletteCollapsed] = useState(false)
  const [formCollapsed, setFormCollapsed] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [picker, setPicker] = useState<{ nodeId: string; outcomeKey: string } | null>(null)
  const [addingStage, setAddingStage] = useState(false)

  const stage = workflow?.stages[stageId]

  useEffect(() => {
    if (window.innerWidth < 1280) {
      setPaletteCollapsed(true)
      setFormCollapsed(false)
    }
  }, [])

  // First load of a stage with no saved layout: auto-layout (not an undo step)
  useEffect(() => {
    if (!stage) return
    const missing = Object.keys(stage.nodes).filter((id) => !stage.layout[id])
    if (missing.length === 0) return
    const full = autoLayout(stage)
    const layout = Object.keys(stage.layout).length === 0 ? full : { ...stage.layout, ...Object.fromEntries(missing.map((id) => [id, full[id]])) }
    applyStage(stageId, (s) => ({ ...s, layout }), [], { skipHistory: true, keepStatus: true })
    setTimeout(() => canvas.current?.fit(), 50)
  }, [stage, stageId, applyStage])

  // Deep link from validation: ?node=…&field=…
  useEffect(() => {
    if (!workflow) return
    const node = params.get('node')
    const field = params.get('field')
    if (node && workflow.stages[stageId]?.nodes[node]) {
      setSelection({ kind: 'node', id: node })
      setFocus((f) => ({ field, tick: f.tick + 1 }))
      setTimeout(() => canvas.current?.focusNode(node), 600)
    } else setSelection(null)
    // only when the stage or deep link changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageId, params, !!workflow])

  const caseFields = useMemo(() => (workflow ? caseDataDictionary(workflow) : []), [workflow])
  const issues = useMemo(() => (workflow && stage ? validateStage(workflow, stage, editor.allWorkflows) : []), [workflow, stage, editor.allWorkflows])
  const issueCounts = useMemo(() => {
    const out: Record<string, { errors: number; toConfirm: number }> = {}
    for (const i of issues) {
      if (!i.nodeId) continue
      out[i.nodeId] ??= { errors: 0, toConfirm: 0 }
      if (i.severity === 'error') out[i.nodeId].errors++
      else out[i.nodeId].toConfirm++
    }
    return out
  }, [issues])
  const health = useMemo(
    () => (workflow ? Object.fromEntries(workflow.stageIds.map((id) => [id, stageHealth(workflow, workflow.stages[id])])) : {}),
    [workflow]
  )

  const path = useCallback((...parts: string[]) => [stage?.name, ...parts].filter(Boolean).join(' › '), [stage?.name])
  const nodeName = (id: string | null | undefined) => (id && stage?.nodes[id]?.name) || 'nothing'

  // ── Mutations ────────────────────────────────────────────────────────────
  const setTarget = (nodeId: string, outcomeId: string, targetId: string | null) => {
    const node = stage?.nodes[nodeId]
    const outcome = node?.outcomes.find((o) => o.id === outcomeId)
    if (!node || !outcome || (outcome.targetNodeId === targetId && !outcome.targetStageId)) return
    applyStage(
      stageId,
      (s) => ({
        ...s,
        nodes: {
          ...s.nodes,
          [nodeId]: { ...node, outcomes: node.outcomes.map((o) => (o.id === outcomeId ? { ...o, targetNodeId: targetId, targetStageId: undefined } : o)) },
        },
      }),
      [
        {
          level: 'connection',
          action: targetId ? 'connected' : 'disconnected',
          stageId,
          objectPath: path(node.name, outcome.label),
          before: outcome.targetNodeId ? nodeName(outcome.targetNodeId) : undefined,
          after: targetId ? nodeName(targetId) : 'Not connected',
        },
      ]
    )
  }

  /** Hand an outcome over to another stage: the request moves on to that stage when this outcome happens */
  const setStageTarget = (nodeId: string, outcomeId: string, targetStageId: string) => {
    const node = stage?.nodes[nodeId]
    const outcome = node?.outcomes.find((o) => o.id === outcomeId)
    const target = workflow?.stages[targetStageId]
    if (!node || !outcome || !target) return
    applyStage(
      stageId,
      (s) => ({
        ...s,
        nodes: {
          ...s.nodes,
          [nodeId]: { ...node, outcomes: node.outcomes.map((o) => (o.id === outcomeId ? { ...o, targetNodeId: null, targetStageId } : o)) },
        },
      }),
      [
        {
          level: 'connection',
          action: 'connected',
          stageId,
          objectPath: path(node.name, outcome.label),
          before: outcome.targetNodeId ? nodeName(outcome.targetNodeId) : undefined,
          after: `Stage: ${target.name}`,
        },
      ]
    )
  }

  const addNode = (type: string, position?: { x: number; y: number }, connectFrom?: { nodeId: string; outcomeKey: string }) => {
    if (!stage || !workflow) return
    const item = paletteItem(type)
    const def = getNodeType(item.type)
    const allowed = def.isAllowed?.({ workflow, stage }) ?? { allowed: true }
    if (!allowed.allowed) return toast(allowed.reason ?? 'This step is not allowed here', 'error')
    const made = createNode(item.type, stage, item.name ? uniqueNodeName(stage, item.name) : undefined)
    const node = item.config ? syncOutcomes({ ...made, config: item.config() }) : made
    let pos = position ?? spotBelow(stage)
    if (connectFrom) {
      const from = stage.layout[connectFrom.nodeId]
      if (from) pos = { x: from.x + 40, y: from.y + 200 }
    }
    const source = connectFrom ? stage.nodes[connectFrom.nodeId] : undefined
    const entries: NewAuditEntry[] = [{ level: 'node', action: 'created', stageId, objectPath: path(node.name), after: item.label }]
    if (source) {
      const outcome = source.outcomes.find((o) => o.key === connectFrom!.outcomeKey)
      entries.push({ level: 'connection', action: 'connected', stageId, objectPath: path(source.name, outcome?.label ?? ''), after: node.name })
    }
    applyStage(
      stageId,
      (s) => {
        const nodes = { ...s.nodes, [node.id]: node }
        if (source)
          nodes[source.id] = {
            ...source,
            outcomes: source.outcomes.map((o) => (o.key === connectFrom!.outcomeKey ? { ...o, targetNodeId: node.id, targetStageId: undefined } : o)),
          }
        return { ...s, nodes, layout: { ...s.layout, [node.id]: { x: Math.round(pos.x), y: Math.round(pos.y) } } }
      },
      entries
    )
    setSelection({ kind: 'node', id: node.id })
    setFocus((f) => ({ field: 'name', tick: f.tick + 1 }))
  }

  const duplicateNode = (id: string) => {
    if (!stage) return
    const src = stage.nodes[id]
    if (!src) return
    const copy: WorkflowNode = syncOutcomes({
      ...JSON.parse(JSON.stringify(src)),
      id: newId('node'),
      name: uniqueNodeName(stage, `${src.name} copy`),
      // Never auto-wire: the copy starts unconnected
      outcomes: src.outcomes.map((o) => ({ ...o, id: newId('out'), targetNodeId: null, targetStageId: undefined })),
    })
    if (copy.sla?.breachAction?.kind === 'takeOutcome') {
      const key = src.outcomes.find((o) => o.id === (src.sla!.breachAction as { outcomeId: string }).outcomeId)?.key
      const outcomeId = copy.outcomes.find((o) => o.key === key)?.id
      copy.sla = { ...copy.sla, breachAction: outcomeId ? { kind: 'takeOutcome', outcomeId } : null }
    }
    const p = stage.layout[id] ?? { x: 0, y: 0 }
    applyStage(
      stageId,
      (s) => ({ ...s, nodes: { ...s.nodes, [copy.id]: copy }, layout: { ...s.layout, [copy.id]: { x: p.x + 40, y: p.y + 40 } } }),
      [{ level: 'node', action: 'created', stageId, objectPath: path(copy.name), after: `Copy of ${src.name}` }]
    )
    setSelection({ kind: 'node', id: copy.id })
    toast('Step duplicated')
  }

  const deleteNode = (id: string) => {
    if (!stage) return
    const node = stage.nodes[id]
    if (!node) return
    const incoming = Object.values(stage.nodes).filter((n) => n.outcomes.some((o) => o.targetNodeId === id))
    applyStage(
      stageId,
      (s) => {
        const nodes = { ...s.nodes }
        delete nodes[id]
        for (const n of Object.values(nodes)) {
          let changed = false
          const outcomes = n.outcomes.map((o) => (o.targetNodeId === id ? ((changed = true), { ...o, targetNodeId: null }) : o))
          const breach = n.sla?.breachAction
          const sla = breach?.kind === 'routeTo' && breach.nodeId === id ? { ...n.sla!, breachAction: null } : n.sla
          if (changed || sla !== n.sla) nodes[n.id] = { ...n, outcomes, sla }
        }
        return { ...s, nodes }
      },
      [
        { level: 'node', action: 'removed', stageId, objectPath: path(node.name), before: getNodeType(node.type).label },
        ...incoming.map((n) => ({
          level: 'connection' as const,
          action: 'disconnected' as const,
          stageId,
          objectPath: path(n.name),
          before: node.name,
          after: 'Not connected',
        })),
      ]
    )
    setSelection(null)
    setDeletingId(null)
    toast(`“${node.name}” deleted`)
  }

  const updateNode = (next: WorkflowNode, change: NodeChange) => {
    const prev = stage?.nodes[next.id]
    if (!prev) return
    const entry: NewAuditEntry = change.renamed
      ? { level: 'node', action: 'renamed', stageId, objectPath: path(change.before ?? prev.name), before: change.before, after: change.after }
      : { level: 'node', action: 'edited', stageId, objectPath: path(prev.name, change.what), before: change.before, after: change.after }
    applyStage(stageId, (s) => ({ ...s, nodes: { ...s.nodes, [next.id]: syncOutcomes(next) } }), [entry], {
      coalesceKey: change.coalesceKey,
    })
  }

  const updateStage = (next: Stage, what: string, before?: string, after?: string) =>
    applyStage(
      stageId,
      () => next,
      [
        what === 'Name'
          ? { level: 'stage', action: 'renamed', stageId, objectPath: workflow?.name + ' › ' + (before ?? ''), before, after }
          : { level: 'stage', action: 'edited', stageId, objectPath: path(what), before, after },
      ],
      { coalesceKey: `stage:${stageId}:${what}` }
    )

  const runAutoLayout = () => {
    if (!stage) return
    applyStage(stageId, (s) => ({ ...s, layout: autoLayout(s) }))
    setTimeout(() => canvas.current?.fit(), 50)
  }

  // ── Keyboard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z' && !isTyping(e.target)) {
        e.preventDefault()
        if (e.shiftKey) editor.redo()
        else editor.undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y' && !isTyping(e.target)) {
        e.preventDefault()
        editor.redo()
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isTyping(e.target) && !document.querySelector('[role=dialog]')) {
        if (selection?.kind === 'node') setDeletingId(selection.id)
        if (selection?.kind === 'edge') setTarget(selection.nodeId, selection.outcomeId, null)
      }
      if (e.key === 'Escape' && !document.querySelector('[role=dialog]')) setSelection(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ── Render ───────────────────────────────────────────────────────────────
  if (workflow === null || (workflow && !stage))
    return (
      <AppShell title="Not found" activeTab="dashboard">
        <p className="text-sm text-[#64748b]">This stage doesn&apos;t exist any more.</p>
      </AppShell>
    )
  if (!workflow || !stage) return null

  const selectedNodeId = selection?.kind === 'node' ? selection.id : selection?.kind === 'edge' ? selection.nodeId : null
  const selectedNode = selectedNodeId ? stage.nodes[selectedNodeId] : undefined
  const focusField = selection?.kind === 'edge' ? `outcome:${selection.outcomeId}` : focus.field

  const routing: RoutingApi | null = selectedNode
    ? {
        node: selectedNode,
        nodeOptions: Object.values(stage.nodes)
          .filter((n) => n.id !== selectedNode.id)
          .map((n) => ({ id: n.id, name: n.name })),
        stageOptions: workflow.stageIds
          .filter((id) => id !== stageId && workflow.stages[id])
          .map((id) => ({ id, name: workflow.stages[id].name })),
        setStageTarget: (key, target) => {
          const o = selectedNode.outcomes.find((x) => x.key === key)
          if (o) setStageTarget(selectedNode.id, o.id, target)
        },
        setTarget: (key, target) => {
          const o = selectedNode.outcomes.find((x) => x.key === key)
          if (o) setTarget(selectedNode.id, o.id, target)
        },
        createNodeFor: (key) => setPicker({ nodeId: selectedNode.id, outcomeKey: key }),
      }
    : null

  const goToIssue = (issue: Issue) => {
    if (issue.stageId !== stageId) {
      const p = new URLSearchParams()
      if (issue.nodeId) p.set('node', issue.nodeId)
      if (issue.field) p.set('field', issue.field)
      router.push(`/workflows/${workflowId}/stages/${issue.stageId}?${p}`)
      return
    }
    if (issue.nodeId) {
      setSelection({ kind: 'node', id: issue.nodeId })
      setFormCollapsed(false)
      setFocus((f) => ({ field: issue.field ?? null, tick: f.tick + 1 }))
      setTimeout(() => canvas.current?.focusNode(issue.nodeId!), 100)
    } else setSelection(null)
  }

  const pickerSource = picker ? stage.nodes[picker.nodeId] : undefined

  return (
    <AppShell
      activeTab="dashboard"
      fullBleed
      header={
        <WorkflowHeader
          workflow={workflow}
          audit={editor.audit}
          allWorkflows={editor.allWorkflows}
          save={editor.save}
          stageName={stage.name}
          saveState={editor.saveState}
          onGoToIssue={goToIssue}
        />
      }
    >
      <StageBar
        workflow={workflow}
        currentStageId={stageId}
        health={health}
        onSelect={(id) => router.push(`/workflows/${workflowId}/stages/${id}`)}
        onAdd={() => setAddingStage(true)}
      />
      <div className="flex-1 min-h-0 flex">
        <NodePalette
          workflow={workflow}
          stage={stage}
          collapsed={paletteCollapsed}
          onToggle={() => setPaletteCollapsed((v) => !v)}
          onAdd={(type) => addNode(type)}
        />

        <div className="relative flex-1 min-w-0 flex">
          <ReactFlowProvider>
            <FlowCanvas
              key={stageId}
              ref={canvas}
              workflow={workflow}
              stageId={stageId}
              health={health}
              onOpenStage={(id) => router.push(`/workflows/${workflowId}/stages/${id}`)}
              issueCounts={issueCounts}
              selection={selection}
              onSelect={(s) => {
                setSelection(s)
                if (s) setFormCollapsed(false)
                setFocus((f) => ({ field: null, tick: f.tick }))
              }}
              onConnect={(src, outcomeId, target) => setTarget(src, outcomeId, target)}
              onDisconnect={(src, outcomeId) => setTarget(src, outcomeId, null)}
              onMoveNodes={(positions) => applyStage(stageId, (s) => ({ ...s, layout: { ...s.layout, ...positions } }), [], { keepStatus: true })}
              onDropNode={(type, pos) => addNode(type, pos)}
              onRequestDelete={(id) => setDeletingId(id)}
              onDuplicate={duplicateNode}
              onAutoLayout={runAutoLayout}
              onAddNext={(nodeId, outcomeKey) => setPicker({ nodeId, outcomeKey })}
            />
          </ReactFlowProvider>

          {/* Canvas toolbar */}
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-white rounded-lg border border-[#e2e8f0] shadow-xs p-1">
            <button className={btnIcon} aria-label="Undo" title="Undo (Ctrl/Cmd+Z)" disabled={!editor.canUndo} onClick={editor.undo}>
              <Undo2 className="w-4 h-4" />
            </button>
            <button className={btnIcon} aria-label="Redo" title="Redo (Shift+Ctrl/Cmd+Z)" disabled={!editor.canRedo} onClick={editor.redo}>
              <Redo2 className="w-4 h-4" />
            </button>
            <span className="w-px h-5 bg-[#e2e8f0] mx-0.5" />
            <button className={`${btnIcon} w-auto px-2 gap-1.5 text-xs font-medium`} onClick={runAutoLayout} title="Arrange nodes top to bottom">
              <LayoutTemplate className="w-4 h-4" /> Auto-layout
            </button>
            <button className={btnIcon} aria-label="Fit this stage to screen" title="Fit this stage to screen" onClick={() => canvas.current?.fit()}>
              <Maximize className="w-4 h-4" />
            </button>
            <button className={btnIcon} aria-label="Show all stages" title="Show all stages" onClick={() => canvas.current?.fitAll()}>
              <Minimize className="w-4 h-4" />
            </button>
          </div>
          <button
            className={`${btnIcon} absolute top-3 right-3 bg-white border border-[#e2e8f0] shadow-xs`}
            aria-label={formCollapsed ? 'Show configuration form' : 'Hide configuration form'}
            title={formCollapsed ? 'Show configuration form' : 'Hide configuration form'}
            onClick={() => setFormCollapsed((v) => !v)}
          >
            {formCollapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
          </button>
        </div>

        {!formCollapsed && (
          <aside className="w-[360px] shrink-0 border-l border-[#e2e8f0] bg-white min-h-0 flex flex-col" aria-label="Configuration">
            {selectedNode && routing ? (
              <NodeForm
                key={selectedNode.id}
                node={selectedNode}
                ctx={{ workflow, stage, node: selectedNode, caseFields, workflows: editor.allWorkflows }}
                routing={routing}
                focusField={focusField}
                focusTick={focus.tick + (selection?.kind === 'edge' ? 1 : 0)}
                onChange={updateNode}
                onDelete={() => setDeletingId(selectedNode.id)}
                onDuplicate={() => duplicateNode(selectedNode.id)}
                onDismissToConfirm={(i) => {
                  const text = selectedNode.toConfirm?.[i]
                  applyStage(
                    stageId,
                    (s) => ({
                      ...s,
                      nodes: { ...s.nodes, [selectedNode.id]: { ...selectedNode, toConfirm: selectedNode.toConfirm!.filter((_, idx) => idx !== i) } },
                    }),
                    [{ level: 'node', action: 'edited', stageId, objectPath: path(selectedNode.name, 'To confirm'), before: text, after: 'Marked as decided' }]
                  )
                  toast('Marked as decided')
                }}
              />
            ) : (
              <StageSettings workflow={workflow} stage={stage} onChange={updateStage} />
            )}
          </aside>
        )}
      </div>

      <ConfirmModal
        open={!!deletingId}
        title={`Delete “${deletingId ? stage.nodes[deletingId]?.name : ''}”?`}
        message="Its connections will be removed. You can undo this."
        confirmLabel="Delete node"
        danger
        onCancel={() => setDeletingId(null)}
        onConfirm={() => deletingId && deleteNode(deletingId)}
      />

      <NodePickerModal
        open={!!picker}
        workflow={workflow}
        stage={stage}
        outcomeLabel={pickerSource?.outcomes.find((o) => o.key === picker?.outcomeKey)?.label}
        onClose={() => setPicker(null)}
        onPick={(type) => {
          const p = picker
          setPicker(null)
          if (p) addNode(type, undefined, p)
        }}
      />

      <NameDescriptionModal
        open={addingStage}
        title="Add stage"
        submitLabel="Add stage"
        nameLabel="Stage name"
        descriptionLabel="Stage description"
        nameMax={60}
        descriptionMax={300}
        takenNames={workflow.stageIds.map((id) => workflow.stages[id]?.name ?? '')}
        onClose={() => setAddingStage(false)}
        onSubmit={async (name, description) => {
          const s = newStage(name, description)
          await apply(
            (wf) => ({ ...wf, stageIds: [...wf.stageIds, s.id], stages: { ...wf.stages, [s.id]: s } }),
            [{ level: 'stage', action: 'created', stageId: s.id, objectPath: `${workflow.name} › ${name}`, after: `Position ${workflow.stageIds.length + 1}` }],
            { immediate: true }
          )
          setAddingStage(false)
          toast(`Stage “${name}” added`)
          router.push(`/workflows/${workflowId}/stages/${s.id}`)
        }}
      />
    </AppShell>
  )
}
