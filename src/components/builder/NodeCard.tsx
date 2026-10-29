'use client'

import React, { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { CircleAlert, CircleHelp, Clock, Plus } from 'lucide-react'
import { getNodeType, nodeView, slaKind } from '@/lib/registry/nodes'
import { slaChip } from '@/lib/workflow/describe'
import { nodeSize } from '@/lib/workflow/layout'
import type { WorkflowNode } from '@/types/workflow'

export type NodeCardData = {
  node: WorkflowNode
  /** The stage this step belongs to */
  stageId?: string
  errors: number
  toConfirm: number
  disabled: boolean
  /** Belongs to another stage: shown for context, opens that stage when clicked */
  inactive?: boolean
  highlightOutcomeId?: string | null
  /** Add a new step after this outcome */
  onAddNext?: (nodeId: string, outcomeKey: string) => void
}

export type FlowNode = Node<NodeCardData, 'wfNode'>

/**
 * NodeCard — Molecule
 * Canvas card for one workflow node: category icon, type, name, summary, SLA chip and outcome ports.
 * Used in: FlowCanvas
 */
export const NodeCard = memo(function NodeCard({ data, selected }: NodeProps<FlowNode>) {
  const { node, errors, toConfirm, disabled, inactive } = data
  const def = getNodeType(node.type)
  const view = nodeView(node)
  const accent = view.accent
  const tone = view.cardTone
  const Icon = view.icon
  const pill = def.shape === 'pill'
  const { width } = nodeSize(node)
  const chip = slaChip(node.sla, slaKind(def, node) === 'agent')

  return (
    <div
      style={{ width }}
      className={`relative border shadow-xs transition-shadow ${pill ? 'rounded-full' : 'rounded-2xl'} ${tone} ${
        selected ? '!border-[#36c0c9] ring-4 ring-[#36c0c9]/20 shadow-md' : errors ? '!border-red-300' : 'hover:shadow-md'
      } ${disabled ? 'opacity-60' : ''} ${inactive ? 'opacity-70 hover:opacity-100 cursor-pointer' : ''}`}
    >
      {!def.isStart && (
        <Handle
          type="target"
          position={Position.Top}
          id="in"
          className="!w-3 !h-3 !bg-white !border-2 !border-[#94a3b8]"
          aria-label={`Connect into ${node.name}`}
        />
      )}

      {/* Hand-over to the next stage: a finished stage leaves from here and the next stage's start receives it */}
      {node.type === 'stageComplete' && (
        <Handle type="source" position={Position.Right} id="stageOut" isConnectable={false} className="!w-2.5 !h-2.5 !bg-[#36c0c9] !border-2 !border-white" />
      )}
      {node.type === 'stageStart' && (
        <Handle type="target" position={Position.Left} id="stageIn" isConnectable={false} className="!w-2.5 !h-2.5 !bg-[#36c0c9] !border-2 !border-white" />
      )}

      {/* Badges */}
      <div className="absolute -top-2.5 right-3 flex items-center gap-1">
        {errors > 0 && (
          <span
            className="inline-flex items-center gap-0.5 px-1.5 h-5 rounded-full bg-red-600 text-white text-[10px] font-semibold shadow-xs"
            title={`${errors} ${errors === 1 ? 'issue' : 'issues'}`}
          >
            <CircleAlert className="w-3 h-3" aria-hidden="true" />
            {errors}
          </span>
        )}
        {toConfirm > 0 && (
          <span
            className="inline-flex items-center gap-0.5 px-1.5 h-5 rounded-full bg-amber-400 text-[#4a2c00] text-[10px] font-semibold shadow-xs"
            title={`${toConfirm} to confirm`}
          >
            <CircleHelp className="w-3 h-3" aria-hidden="true" />
            {toConfirm}
          </span>
        )}
      </div>

      <div className={pill ? 'px-5 py-3 flex items-center gap-3' : 'px-4 pt-3.5 pb-2 flex flex-col gap-2'}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${accent}`}>
            <Icon className="w-4 h-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-medium uppercase tracking-[0.06em] leading-none mb-1 text-[#64748b]">
              {view.label}
            </div>
            <div className="text-[13px] font-semibold text-[#0d212c] leading-tight truncate" title={node.name}>
              {node.name}
            </div>
            {pill && def.summary(node) && (
              <div className="text-[11px] text-[#64748b] leading-snug truncate mt-0.5" title={def.summary(node)}>
                {def.summary(node)}
              </div>
            )}
          </div>
        </div>
        {!pill && (
          <>
            <p className="text-[11px] text-[#64748b] leading-snug truncate" title={def.summary(node)}>
              {def.summary(node)}
            </p>
            <div className="h-5">
              {chip && (
                <span
                  className={`inline-flex items-center gap-1 px-2 h-5 rounded-md text-[10px] font-medium ${
                    node.sla?.duration.value === null ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  {chip}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Outcome ports */}
      {node.outcomes.length > 0 && (
        <div
          className={`flex border-t border-black/5 ${pill ? 'mx-6' : ''}`}
          style={{ height: 26 }}
        >
          {node.outcomes.map((o) => (
            <div key={o.id} className="flex-1 relative flex items-start justify-center min-w-0 px-1">
              <span
                className={`text-[10px] font-medium truncate pt-1 ${
                  o.targetNodeId || o.targetStageId ? 'text-[#475569]' : 'text-red-600'
                } ${data.highlightOutcomeId === o.id ? 'underline decoration-2 decoration-[#36c0c9]' : ''}`}
                title={o.targetNodeId || o.targetStageId ? o.label : `${o.label} – not connected`}
              >
                {o.label}
              </span>
              {!o.targetNodeId && !o.targetStageId && data.onAddNext && !inactive && (
                <button
                  type="button"
                  className="nodrag nopan absolute left-1/2 -translate-x-1/2 top-full mt-3 w-5 h-5 rounded-full bg-white border border-[#cbd5e1] text-[#475569] hover:bg-slate-100 hover:border-[#94a3b8] flex items-center justify-center cursor-pointer shadow-xs z-10"
                  aria-label={`Add a step after “${o.label}”`}
                  title={`Add a step after “${o.label}”`}
                  onClick={(e) => {
                    e.stopPropagation()
                    data.onAddNext?.(node.id, o.key)
                  }}
                >
                  <Plus className="w-3 h-3" aria-hidden="true" />
                </button>
              )}
              <Handle
                type="source"
                position={Position.Bottom}
                id={o.id}
                className={`!w-3 !h-3 !border-2 ${o.targetNodeId || o.targetStageId ? '!bg-[#36c0c9] !border-white' : '!bg-white !border-red-500'}`}
                style={{ left: '50%' }}
                aria-label={`${o.label} outcome of ${node.name}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
})
