'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, GripVertical, Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import type { NewAuditEntry } from '@/lib/repository'
import { newStage } from '@/lib/workflow/graph'
import { stageHealth } from '@/lib/workflow/validation'
import type { Workflow } from '@/types/workflow'
import { HealthChip } from '@/components/ui/Chips'
import { ConfirmModal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { btnIcon, btnPrimary, btnSecondary, cardBase } from '@/components/ui/styles'
import { NameDescriptionModal } from './WorkflowFormModal'

interface Props {
  workflow: Workflow
  save: (next: Workflow, entries?: NewAuditEntry[]) => Promise<unknown>
}

/**
 * StagesScreen — Screen
 * Ordered stage list with add (end or between), edit, reorder (drag) and remove.
 * Used in: WorkflowPage
 */
export const StagesScreen: React.FC<Props> = ({ workflow, save }) => {
  const router = useRouter()
  const toast = useToast()
  const [adding, setAdding] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)

  const stages = workflow.stageIds.map((id) => workflow.stages[id]).filter(Boolean)
  const health = useMemo(
    () => Object.fromEntries(stages.map((s) => [s.id, stageHealth(workflow, s)])),
    [workflow, stages]
  )
  const editing = editingId ? workflow.stages[editingId] : null
  const removing = removingId ? workflow.stages[removingId] : null

  const move = async (from: number, to: number) => {
    if (to < 0 || to >= stages.length || from === to) return
    const ids = [...workflow.stageIds]
    const [moved] = ids.splice(from, 1)
    ids.splice(to, 0, moved)
    const name = workflow.stages[moved].name
    await save({ ...workflow, stageIds: ids }, [
      {
        level: 'stage',
        action: 'reordered',
        stageId: moved,
        objectPath: `${workflow.name} › ${name}`,
        before: `Position ${from + 1}`,
        after: `Position ${to + 1}`,
      },
    ])
    toast(`Moved “${name}” to position ${to + 1}`)
  }

  const takenNames = (exceptId?: string) => stages.filter((s) => s.id !== exceptId).map((s) => s.name)

  const InsertHere = ({ at }: { at: number }) => (
    <div className="relative h-3 group/insert -my-1.5 z-10">
      <button
        onClick={() => setAdding(at)}
        aria-label={`Add a stage at position ${at + 1}`}
        className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-[#e2e8f0] text-[#36c0c9] shadow-xs flex items-center justify-center opacity-0 group-hover/insert:opacity-100 focus-visible:opacity-100 hover:border-[#36c0c9] transition cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  )

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#0d212c]">Stages</h2>
          <p className="text-xs text-[#64748b] leading-relaxed mt-1">
            {workflow.description || 'Stages run in this order. Open a stage to build its flow.'}
          </p>
        </div>
      </div>

      {stages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-white px-6 py-16 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#36c0c9]/10 text-[#36c0c9] flex items-center justify-center mb-1">
            <Layers className="w-7 h-7" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold">No stages yet</h3>
          <p className="text-xs text-[#64748b] max-w-xs">Add the first stage of your workflow.</p>
          <button className={`${btnPrimary} mt-2`} onClick={() => setAdding(0)}>
            <Plus className="w-4 h-4" aria-hidden="true" /> Add stage
          </button>
        </div>
      ) : (
        <div className="flex flex-col">
          <ol className="flex flex-col" aria-label="Stages in order">
            {stages.map((stage, i) => {
              const nodeCount = Object.keys(stage.nodes).length
              const h = health[stage.id]
              return (
                <li key={stage.id} className="flex flex-col">
                  {i > 0 && <InsertHere at={i} />}
                  <div
                    draggable
                    onDragStart={(e) => {
                      setDragIndex(i)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDropIndex(i)
                    }}
                    onDragEnd={() => {
                      setDragIndex(null)
                      setDropIndex(null)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (dragIndex !== null) move(dragIndex, i)
                      setDragIndex(null)
                      setDropIndex(null)
                    }}
                    onClick={() => router.push(`/workflows/${workflow.id}/stages/${stage.id}`)}
                    className={`${cardBase} my-1.5 px-4 py-4 flex items-center gap-4 cursor-pointer group shadow-2xs hover:shadow-md hover:border-[#36c0c9]/40 transition-all ${
                      dragIndex === i ? 'opacity-50' : ''
                    } ${dropIndex === i && dragIndex !== i ? 'ring-2 ring-[#36c0c9]/50' : ''} ${
                      stage.enabled ? '' : 'bg-slate-50'
                    }`}
                  >
                    <span className="text-[#94a3b8] cursor-grab active:cursor-grabbing" aria-hidden="true" title="Drag to reorder">
                      <GripVertical className="w-4 h-4" />
                    </span>
                    <span className="w-8 h-8 rounded-full bg-[#36c0c9] text-white text-xs font-semibold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-[#0d212c] group-hover:text-[#36c0c9] transition-colors truncate">
                          {stage.name}
                        </h3>
                        {!stage.enabled && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">Disabled</span>
                        )}
                      </div>
                      <p className="text-xs text-[#64748b] truncate mt-0.5">{stage.description || 'No description'}</p>
                    </div>
                    <span className="hidden md:inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs whitespace-nowrap">
                      {nodeCount} {nodeCount === 1 ? 'step' : 'steps'}
                    </span>
                    <span className="hidden sm:inline-flex">
                      <HealthChip errors={h.errors} toConfirm={h.toConfirm} />
                    </span>
                    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                      <button className={btnIcon} aria-label={`Edit ${stage.name}`} onClick={() => setEditingId(stage.id)}>
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className={`${btnIcon} hover:!text-red-600 hover:!bg-red-50`}
                        aria-label={`Remove ${stage.name}`}
                        onClick={() => setRemovingId(stage.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        className={btnIcon}
                        aria-label={`Open ${stage.name}`}
                        onClick={() => router.push(`/workflows/${workflow.id}/stages/${stage.id}`)}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
          <button className={`${btnSecondary} mt-3 self-start border-dashed`} onClick={() => setAdding(stages.length)}>
            <Plus className="w-4 h-4" aria-hidden="true" /> Add stage
          </button>
        </div>
      )}

      <NameDescriptionModal
        open={adding !== null}
        title={adding !== null && adding < stages.length ? `Add stage at position ${adding + 1}` : 'Add stage'}
        submitLabel="Add stage"
        nameLabel="Stage name"
        descriptionLabel="Stage description"
        nameMax={60}
        descriptionMax={300}
        takenNames={takenNames()}
        onClose={() => setAdding(null)}
        onSubmit={async (name, description) => {
          const at = adding ?? stages.length
          const stage = newStage(name, description)
          const ids = [...workflow.stageIds]
          ids.splice(at, 0, stage.id)
          await save({ ...workflow, stageIds: ids, stages: { ...workflow.stages, [stage.id]: stage } }, [
            { level: 'stage', action: 'created', stageId: stage.id, objectPath: `${workflow.name} › ${name}`, after: `Position ${at + 1}` },
          ])
          setAdding(null)
          toast(`Stage “${name}” added`)
        }}
      />

      <NameDescriptionModal
        open={!!editing}
        title="Edit stage"
        submitLabel="Save"
        nameLabel="Stage name"
        descriptionLabel="Stage description"
        initialName={editing?.name}
        initialDescription={editing?.description}
        nameMax={60}
        descriptionMax={300}
        takenNames={takenNames(editing?.id)}
        onClose={() => setEditingId(null)}
        onSubmit={async (name, description) => {
          if (!editing) return
          const entries: NewAuditEntry[] = []
          if (name !== editing.name)
            entries.push({ level: 'stage', action: 'renamed', stageId: editing.id, objectPath: `${workflow.name} › ${editing.name}`, before: editing.name, after: name })
          if (description !== (editing.description ?? ''))
            entries.push({
              level: 'stage',
              action: 'edited',
              stageId: editing.id,
              objectPath: `${workflow.name} › ${name} › Description`,
              before: editing.description,
              after: description,
            })
          await save({ ...workflow, stages: { ...workflow.stages, [editing.id]: { ...editing, name, description } } }, entries)
          setEditingId(null)
          toast('Stage updated')
        }}
      />

      <ConfirmModal
        open={!!removing}
        title={`Remove “${removing?.name}”?`}
        message={
          <>
            The stage and its whole flow ({removing ? Object.keys(removing.nodes).length : 0} nodes) will be deleted. This
            can&apos;t be undone.
          </>
        }
        confirmLabel="Remove stage"
        danger
        onCancel={() => setRemovingId(null)}
        onConfirm={async () => {
          if (!removing) return
          const stagesCopy = { ...workflow.stages }
          delete stagesCopy[removing.id]
          await save({ ...workflow, stageIds: workflow.stageIds.filter((id) => id !== removing.id), stages: stagesCopy }, [
            {
              level: 'stage',
              action: 'removed',
              stageId: removing.id,
              objectPath: `${workflow.name} › ${removing.name}`,
              before: `${removing.name} (${Object.keys(removing.nodes).length} nodes)`,
            },
          ])
          setRemovingId(null)
          toast(`Stage “${removing.name}” removed`)
        }}
      />
    </div>
  )
}
