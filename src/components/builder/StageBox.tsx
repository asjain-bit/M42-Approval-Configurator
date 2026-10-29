'use client'

import React, { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { HealthChip } from '@/components/ui/Chips'
import { BOX_GAP } from '@/lib/workflow/canvasLayout'

export type StageBoxData = {
  stageId: string
  index: number
  name: string
  active: boolean
  enabled: boolean
  errors: number
  toConfirm: number
  /** Draw a divider line after this stage, as tall as the tallest stage */
  dividerHeight: number | null
  onOpen: (stageId: string) => void
}

export type StageBoxNode = Node<StageBoxData, 'stageBox'>

const hidden = '!w-px !h-px !min-w-0 !min-h-0 !border-0 !bg-transparent !opacity-0 !pointer-events-none'

/**
 * StageBox — Molecule
 * One stage's column on the workflow canvas: its name at the top, with a divider line between stages and
 * arrows joining them, so the stages read as one flow.
 * Used in: FlowCanvas
 */
export const StageBox = memo(function StageBox({ data }: NodeProps<StageBoxNode>) {
  const { active, enabled, index, name, errors, toConfirm, dividerHeight } = data
  return (
    <div className={`relative w-full h-full ${enabled ? '' : 'opacity-60'}`}>
      {dividerHeight !== null && (
        <span
          aria-hidden="true"
          className="absolute top-0 w-px bg-[#cbd5e1]"
          style={{ left: `calc(100% + ${BOX_GAP / 2}px)`, height: dividerHeight }}
        />
      )}
      <div className="absolute top-4 left-5 right-5 flex items-center gap-2.5">
        <span
          className={`w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center shrink-0 ${
            active ? 'bg-[#36c0c9] text-white' : 'bg-white text-[#475569] border border-[#cbd5e1]'
          }`}
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex flex-col leading-tight">
          <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#64748b]">
            Stage {index + 1}
            {active ? ' · editing' : ''}
          </span>
          {active ? (
            <span className="text-sm font-semibold text-[#0d212c] truncate" title={name}>
              {name}
            </span>
          ) : (
            <button
              type="button"
              className="nodrag nopan pointer-events-auto text-left text-sm font-semibold text-[#0d212c] truncate hover:text-[#36c0c9] cursor-pointer"
              title={`Open “${name}”`}
              onClick={() => data.onOpen(data.stageId)}
            >
              {name}
            </button>
          )}
        </div>
        {(errors > 0 || toConfirm > 0) && <HealthChip errors={errors} toConfirm={toConfirm} compact />}
      </div>

      {/* Hand-over arrows between stages attach here and stay invisible */}
      <Handle type="target" position={Position.Left} id="in" isConnectable={false} className={hidden} style={{ top: 32 }} />
      <Handle type="source" position={Position.Right} id="out" isConnectable={false} className={hidden} style={{ top: 32 }} />
      <Handle type="target" position={Position.Bottom} id="bin" isConnectable={false} className={hidden} style={{ left: '60%' }} />
      <Handle type="source" position={Position.Bottom} id="bout" isConnectable={false} className={hidden} style={{ left: '40%' }} />
    </div>
  )
})
