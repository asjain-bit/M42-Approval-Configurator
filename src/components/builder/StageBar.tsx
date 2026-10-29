'use client'

import React, { useEffect, useRef } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { HealthChip } from '@/components/ui/Chips'
import type { StageHealth } from '@/lib/workflow/validation'
import type { Workflow } from '@/types/workflow'

/**
 * StageBar — Organism
 * Horizontal stepper of every stage with health badges; switches the canvas.
 * Used in: StageBuilder
 */
export const StageBar: React.FC<{
  workflow: Workflow
  currentStageId: string
  health: Record<string, StageHealth>
  onSelect: (stageId: string) => void
  onAdd: () => void
}> = ({ workflow, currentStageId, health, onSelect, onAdd }) => {
  const activeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [currentStageId])

  return (
    <nav aria-label="Stages" className="bg-white border-b border-[#e2e8f0] px-4 py-2.5 flex items-center gap-1 overflow-x-auto shrink-0">
      {workflow.stageIds.map((id, i) => {
        const stage = workflow.stages[id]
        const active = id === currentStageId
        const h = health[id] ?? { errors: 0, toConfirm: 0 }
        return (
          <React.Fragment key={id}>
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#cbd5e1] shrink-0" aria-hidden="true" />}
            <button
              ref={active ? activeRef : undefined}
              onClick={() => onSelect(id)}
              aria-current={active ? 'step' : undefined}
              className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer shrink-0 ${
                active ? 'bg-[#ddf7f9] text-[#0d212c] ring-1 ring-[#36c0c9]' : 'text-[#0d212c] hover:bg-slate-50'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full text-[11px] font-semibold flex items-center justify-center ${
                  active ? 'bg-[#36c0c9] text-white' : 'bg-slate-100 text-[#0d212c] border border-[#e2e8f0]'
                }`}
              >
                {i + 1}
              </span>
              <span className={`text-xs ${active ? 'font-semibold' : 'font-medium'}`}>{stage?.name}</span>
              {(h.errors > 0 || h.toConfirm > 0) && <HealthChip errors={h.errors} toConfirm={h.toConfirm} compact />}
            </button>
          </React.Fragment>
        )
      })}
      <button
        onClick={onAdd}
        aria-label="Add stage"
        title="Add stage"
        className="ml-2 w-8 h-8 rounded-full border border-dashed border-[#cbd5e1] text-[#36c0c9] hover:border-[#36c0c9] flex items-center justify-center shrink-0 cursor-pointer"
      >
        <Plus className="w-4 h-4" />
      </button>
    </nav>
  )
}
