'use client'

import React, { useMemo, useState } from 'react'
import { ArrowRight, ArrowUpDown, Clock, History, Link2, Pencil, PenLine, Plus, Rocket, Trash2, Unlink, User, type LucideIcon } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { inputSmall } from '@/components/ui/styles'
import type { AuditEntry, AuditLevel, Workflow } from '@/types/workflow'

const LEVELS: { value: AuditLevel | ''; label: string }[] = [
  { value: '', label: 'All levels' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'stage', label: 'Stage' },
  { value: 'node', label: 'Step' },
  { value: 'connection', label: 'Connection' },
]

const ACTION_LABELS: Record<AuditEntry['action'], string> = {
  created: 'Created',
  renamed: 'Renamed',
  edited: 'Edited',
  reordered: 'Reordered',
  removed: 'Removed',
  connected: 'Connected',
  disconnected: 'Disconnected',
  published: 'Published',
}

/** Kinds of change shown in the legend; each has its own colour */
const KINDS = {
  added: { label: 'Added', dot: 'bg-emerald-500', ring: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  edited: { label: 'Edited', dot: 'bg-[#36c0c9]', ring: 'bg-[#ecfafb] text-[#0f8a93] border-[#bdeaee]' },
  manual: { label: 'Added manually', dot: 'bg-amber-500', ring: 'bg-amber-50 text-amber-600 border-amber-200' },
  removed: { label: 'Removed', dot: 'bg-red-500', ring: 'bg-red-50 text-red-600 border-red-200' },
  published: { label: 'Published', dot: 'bg-indigo-500', ring: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
} as const
type Kind = keyof typeof KINDS

const ACTION_ICONS: Record<AuditEntry['action'], LucideIcon> = {
  created: Plus,
  renamed: PenLine,
  edited: Pencil,
  reordered: ArrowUpDown,
  removed: Trash2,
  connected: Link2,
  disconnected: Unlink,
  published: Rocket,
}

const kindOf = (e: AuditEntry): Kind => {
  if (e.objectPath.includes('(added manually)')) return 'manual'
  if (e.action === 'created' || e.action === 'connected') return 'added'
  if (e.action === 'removed' || e.action === 'disconnected') return 'removed'
  if (e.action === 'published') return 'published'
  return 'edited'
}

const LEVEL_LABELS: Record<AuditLevel, string> = { workflow: 'Workflow', stage: 'Stage', node: 'Step', connection: 'Steps' }

/**
 * AuditDrawer — Organism
 * Read-only change history, filterable by stage, level and date.
 * Used in: WorkflowHeader
 */
export const AuditDrawer: React.FC<{
  open: boolean
  workflow: Workflow
  entries: AuditEntry[]
  onClose: () => void
}> = ({ open, workflow, entries, onClose }) => {
  const [stageId, setStageId] = useState('')
  const [level, setLevel] = useState<AuditLevel | ''>('')
  const [from, setFrom] = useState('')
  const [kind, setKind] = useState<Kind | ''>('')

  const filtered = useMemo(
    () =>
      entries.filter(
        (e) =>
          (!stageId || e.stageId === stageId) &&
          (!level || e.level === level) &&
          (!from || e.at.slice(0, 10) >= from) &&
          (!kind || kindOf(e) === kind)
      ),
    [entries, stageId, level, from, kind]
  )

  return (
    <Drawer open={open} title="Audit log" subtitle={`${entries.length} recorded changes`} onClose={onClose} width="max-w-xl">
      <div className="px-5 py-3 border-b border-[#f1f5f9] grid grid-cols-3 gap-2">
        <select aria-label="Filter by stage" className={inputSmall} value={stageId} onChange={(e) => setStageId(e.target.value)}>
          <option value="">All stages</option>
          {workflow.stageIds.map((id) => (
            <option key={id} value={id}>
              {workflow.stages[id]?.name}
            </option>
          ))}
        </select>
        <select aria-label="Filter by level" className={inputSmall} value={level} onChange={(e) => setLevel(e.target.value as AuditLevel | '')}>
          {LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        <input aria-label="From date" type="date" className={inputSmall} value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      {/* Legend: what each colour means; click one to show only that kind */}
      <div className="px-5 py-2.5 border-b border-[#f1f5f9] flex flex-wrap gap-1.5" role="group" aria-label="Legend">
        {(Object.keys(KINDS) as Kind[]).map((k) => (
          <button
            key={k}
            aria-pressed={kind === k}
            onClick={() => setKind((c) => (c === k ? '' : k))}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium cursor-pointer transition-colors ${
              kind === k ? 'border-[#36c0c9] bg-[#ecfafb] text-[#0d212c]' : 'border-[#e2e8f0] bg-white text-[#475569] hover:bg-slate-50'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${KINDS[k].dot}`} aria-hidden="true" />
            {KINDS[k].label}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="p-10 flex flex-col items-center gap-2 text-center">
          <History className="w-8 h-8 text-[#94a3b8]" aria-hidden="true" />
          <p className="text-xs text-[#64748b]">No changes recorded{entries.length ? ' for these filters' : ' yet'}.</p>
        </div>
      ) : (
        <ol className="px-5 py-4">
          {filtered.map((e, idx) => {
            const k = kindOf(e)
            const Icon = ACTION_ICONS[e.action]
            return (
              <li key={e.id} className="relative flex gap-3 pb-5 last:pb-1">
                {idx < filtered.length - 1 && <span className="absolute left-[17px] top-9 bottom-0 w-px bg-[#e2e8f0]" aria-hidden="true" />}
                <span className={`relative z-[1] w-9 h-9 shrink-0 rounded-full border flex items-center justify-center ${KINDS[k].ring}`} title={KINDS[k].label}>
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </span>
                <div className="flex-1 min-w-0 flex flex-col gap-1 pt-0.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[13px] font-semibold text-[#0d212c]">
                      {ACTION_LABELS[e.action]} {LEVEL_LABELS[e.level].toLowerCase()}
                    </span>
                    <span className="text-[11px] text-[#94a3b8] whitespace-nowrap flex items-center gap-1">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      {new Date(e.at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                  <p className="text-xs text-[#334155]">{e.objectPath}</p>
                  {(e.before || e.after) && (
                    <p className="text-[11px] text-[#64748b] flex items-center gap-1.5 flex-wrap">
                      {e.before && <span className="line-through decoration-slate-300">{e.before}</span>}
                      {e.before && e.after && <ArrowRight className="w-3 h-3" aria-label="changed to" />}
                      {e.after && <span className="text-[#0d212c]">{e.after}</span>}
                    </p>
                  )}
                  <p className="text-[11px] text-[#64748b] flex items-center gap-1">
                    <User className="w-3 h-3" aria-hidden="true" /> By <span className="font-semibold text-[#0d212c]">{e.by}</span>
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </Drawer>
  )
}
