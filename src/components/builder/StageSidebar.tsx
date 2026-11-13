'use client'

import React, { useEffect, useRef } from 'react'
import { PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react'
import { HealthChip } from '@/components/ui/Chips'
import { btnIcon } from '@/components/ui/styles'
import type { StageHealth } from '@/lib/workflow/validation'
import type { Workflow } from '@/types/workflow'

/**
 * StageSidebar — Organism
 * Left drawer listing every stage in order with health badges; switches the canvas.
 * Used in: StageBuilder
 */
export const StageSidebar: React.FC<{
  workflow: Workflow
  currentStageId: string
  health: Record<string, StageHealth>
  collapsed: boolean
  onToggle: () => void
  onSelect: (stageId: string) => void
  onAdd: () => void
}> = ({ workflow, currentStageId, health, collapsed, onToggle, onSelect, onAdd }) => {
  const activeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [currentStageId])

  if (collapsed)
    return (
      <aside className="w-12 shrink-0 border-r border-[#e2e8f0] bg-white flex flex-col items-center py-3 gap-1.5" aria-label="Stages">
        <button className={btnIcon} onClick={onToggle} aria-label="Show stages" title="Show stages">
          <PanelLeftOpen className="w-4 h-4" />
        </button>
        {workflow.stageIds.map((id, i) => {
          const active = id === currentStageId
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              title={workflow.stages[id]?.name}
              aria-current={active ? 'step' : undefined}
              className={`w-7 h-7 rounded-full text-[11px] font-semibold cursor-pointer ${
                active ? 'bg-[#36c0c9] text-white' : 'bg-slate-100 text-[#0d212c] border border-[#e2e8f0] hover:border-[#36c0c9]'
              }`}
            >
              {i + 1}
            </button>
          )
        })}
      </aside>
    )

  return (
    <aside className="w-64 shrink-0 border-r border-[#e2e8f0] bg-white flex flex-col min-h-0" aria-label="Stages">
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-[#0d212c]">Stages</h2>
        <button className={btnIcon} onClick={onToggle} aria-label="Hide stages" title="Hide stages">
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pt-1 pb-4">
        <ol className="relative flex flex-col gap-2 py-1">
          {workflow.stageIds.map((id, i) => {
            const stage = workflow.stages[id]
            const active = id === currentStageId
            const h = health[id] ?? { errors: 0, toConfirm: 0 }
            const steps = Object.keys(stage?.nodes ?? {}).length
            return (
              <li key={id} className="relative">
                {i < workflow.stageIds.length - 1 && (
                  <span className="absolute left-[21px] top-9 bottom-[-10px] w-px bg-[#e2e8f0]" aria-hidden="true" />
                )}
                <button
                  ref={active ? activeRef : undefined}
                  onClick={() => onSelect(id)}
                  aria-current={active ? 'step' : undefined}
                  className={`relative w-full flex items-start gap-2.5 px-2 py-2.5 rounded-xl text-left transition cursor-pointer ${
                    active ? 'bg-[#ddf7f9] ring-1 ring-[#36c0c9]' : 'hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`w-6 h-6 mt-0.5 rounded-full text-[11px] font-semibold flex items-center justify-center shrink-0 ${
                      active ? 'bg-[#36c0c9] text-white' : 'bg-white text-[#0d212c] border border-[#e2e8f0]'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-xs text-[#0d212c] truncate ${active ? 'font-semibold' : 'font-medium'}`}>{stage?.name}</span>
                    <span className="block text-[11px] text-[#64748b]">
                      {steps} {steps === 1 ? 'step' : 'steps'}
                      {stage && !stage.enabled ? ' · off' : ''}
                    </span>
                  </span>
                  {(h.errors > 0 || h.toConfirm > 0) && <HealthChip errors={h.errors} toConfirm={h.toConfirm} compact />}
                </button>
              </li>
            )
          })}
        </ol>
        <button
          onClick={onAdd}
          className="mt-2 w-full flex items-center justify-center gap-2 px-2 py-2 rounded-xl border border-dashed border-[#cbd5e1] text-xs font-medium text-[#0f8a93] hover:border-[#36c0c9] hover:bg-[#f0fbfc] cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add stage
        </button>
      </nav>
    </aside>
  )
}
