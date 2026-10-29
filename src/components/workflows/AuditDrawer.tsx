'use client'

import React, { useMemo, useState } from 'react'
import { ArrowRight, History } from 'lucide-react'
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

  const filtered = useMemo(
    () =>
      entries.filter(
        (e) =>
          (!stageId || e.stageId === stageId) &&
          (!level || e.level === level) &&
          (!from || e.at.slice(0, 10) >= from)
      ),
    [entries, stageId, level, from]
  )

  return (
    <Drawer open={open} title="Audit log" subtitle={`${entries.length} recorded changes`} onClose={onClose} width="max-w-lg">
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
      {filtered.length === 0 ? (
        <div className="p-10 flex flex-col items-center gap-2 text-center">
          <History className="w-8 h-8 text-[#94a3b8]" aria-hidden="true" />
          <p className="text-xs text-[#64748b]">No changes recorded{entries.length ? ' for these filters' : ' yet'}.</p>
        </div>
      ) : (
        <ul className="divide-y divide-[#f1f5f9]">
          {filtered.map((e) => (
            <li key={e.id} className="px-5 py-3.5 flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[#0d212c]">
                  {ACTION_LABELS[e.action]} <span className="font-normal text-[#64748b]">· {e.level}</span>
                </span>
                <span className="text-[11px] text-[#94a3b8] whitespace-nowrap">
                  {new Date(e.at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
              <p className="text-xs text-[#0d212c]">{e.objectPath}</p>
              {(e.before || e.after) && (
                <p className="text-[11px] text-[#64748b] flex items-center gap-1.5 flex-wrap">
                  {e.before && <span className="line-through decoration-slate-300">{e.before}</span>}
                  {e.before && e.after && <ArrowRight className="w-3 h-3" aria-label="changed to" />}
                  {e.after && <span className="text-[#0d212c]">{e.after}</span>}
                </p>
              )}
              <p className="text-[11px] text-[#94a3b8]">by {e.by}</p>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  )
}
