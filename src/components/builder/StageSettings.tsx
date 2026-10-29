'use client'

import React from 'react'
import { Info } from 'lucide-react'
import type { Stage, Workflow } from '@/types/workflow'
import { inputSmall, labelBase, textareaBase } from '@/components/ui/styles'

/**
 * StageSettings — Organism
 * Right panel when nothing is selected: stage name and description.
 * Used in: StageBuilder
 */
export const StageSettings: React.FC<{
  workflow: Workflow
  stage: Stage
  onChange: (next: Stage, what: string, before?: string, after?: string) => void
}> = ({ workflow, stage, onChange }) => {
  const index = workflow.stageIds.indexOf(stage.id)
  const nameTaken = workflow.stageIds.some(
    (id) => id !== stage.id && workflow.stages[id]?.name.trim().toLowerCase() === stage.name.trim().toLowerCase()
  )
  const nameLen = stage.name.trim().length

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-3.5 border-b border-[#e2e8f0] flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl bg-[#36c0c9] text-white flex items-center justify-center shrink-0 text-xs font-semibold">
          {index + 1}
        </span>
        <div className="min-w-0">
          <div className="text-[10px] font-medium text-[#64748b] uppercase tracking-[0.06em]">Stage settings</div>
          <div className="text-sm font-semibold text-[#0d212c] truncate">{stage.name}</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <p className="text-[11px] text-[#64748b] flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden="true" />
          Select a step or connection on the canvas to edit it.
        </p>
        <div>
          <label className={labelBase} htmlFor="stage-name">
            Stage name <span className="text-red-600">*</span>
          </label>
          <input
            id="stage-name"
            className={`${inputSmall} ${nameLen < 3 || nameLen > 60 || nameTaken ? 'border-red-300 hover:border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
            value={stage.name}
            maxLength={60}
            onChange={(e) => onChange({ ...stage, name: e.target.value }, 'Name', stage.name, e.target.value)}
          />
          {nameLen < 3 && <p className="text-[11px] text-red-600 mt-1">Enter at least 3 characters.</p>}
          {nameTaken && <p className="text-[11px] text-red-600 mt-1">Another stage has this name.</p>}
        </div>
        <div>
          <label className={labelBase} htmlFor="stage-desc">
            Description
          </label>
          <textarea
            id="stage-desc"
            className={`${textareaBase} text-xs`}
            maxLength={300}
            value={stage.description ?? ''}
            onChange={(e) => onChange({ ...stage, description: e.target.value }, 'Description', stage.description, e.target.value)}
          />
          <p className="text-[11px] text-[#94a3b8] text-right">{(stage.description ?? '').length}/300</p>
        </div>
      </div>
    </div>
  )
}
