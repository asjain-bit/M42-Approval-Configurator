'use client'

import React from 'react'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { inputSmall } from '@/components/ui/styles'
import { CREATE_NEW, useRouting } from './routing'

const STAGE = 'stage:'

/**
 * ThenGoTo — Molecule
 * "Then go to" dropdown for one outcome: every node in the stage plus "+ Create new node…".
 * Used in: OutcomesBlock, BranchesEditor
 */
export const ThenGoTo: React.FC<{ outcomeKey: string; label?: string; compact?: boolean }> = ({ outcomeKey, label = 'Then go to', compact }) => {
  const routing = useRouting()
  if (!routing) return null
  const outcome = routing.node.outcomes.find((o) => o.key === outcomeKey)
  if (!outcome) return null
  const connected = !!outcome.targetNodeId || !!outcome.targetStageId

  return (
    <div className={`flex items-center gap-2 ${compact ? '' : 'mt-1'}`}>
      <span className="text-[11px] font-medium text-[#64748b] whitespace-nowrap">{label}</span>
      <select
        aria-label={`${outcome.label}: then go to`}
        className={`${inputSmall} ${connected ? '' : 'border-red-300 bg-red-50/40'}`}
        value={outcome.targetStageId ? `${STAGE}${outcome.targetStageId}` : (outcome.targetNodeId ?? '')}
        onChange={(e) => {
          if (e.target.value === CREATE_NEW) routing.createNodeFor(outcomeKey)
          else if (e.target.value.startsWith(STAGE)) routing.setStageTarget(outcomeKey, e.target.value.slice(STAGE.length))
          else routing.setTarget(outcomeKey, e.target.value || null)
        }}
      >
        <option value="">Not connected</option>
        {routing.nodeOptions.map((n) => (
          <option key={n.id} value={n.id}>
            {n.name}
          </option>
        ))}
        <option value={CREATE_NEW}>+ Create new node…</option>
        {routing.stageOptions.length > 0 && (
          <optgroup label="Go to another stage">
            {routing.stageOptions.map((s) => (
              <option key={s.id} value={`${STAGE}${s.id}`}>
                Stage: {s.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      {connected ? (
        <CircleCheck className="w-4 h-4 text-[#36c0c9] shrink-0" aria-label="Connected" />
      ) : (
        <CircleAlert className="w-4 h-4 text-red-600 shrink-0" aria-label="Not connected" />
      )}
    </div>
  )
}
