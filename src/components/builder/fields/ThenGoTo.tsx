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
export const ThenGoTo: React.FC<{ outcomeKey: string; label?: string; compact?: boolean }> = ({
  outcomeKey,
  label = 'Next step',
  compact,
}) => {
  const routing = useRouting()
  if (!routing) return null
  const outcome = routing.node.outcomes.find((o) => o.key === outcomeKey)
  if (!outcome) return null
  const connected = !!outcome.targetNodeId || !!outcome.targetStageId
  const locked = (routing.missing?.length ?? 0) > 0

  const target = outcome.targetStageId
    ? routing.stageOptions.find((x) => x.id === outcome.targetStageId)
    : routing.nodeOptions.find((x) => x.id === outcome.targetNodeId)

  return (
    <div>
      <div className={`flex items-center gap-2 ${compact ? '' : 'mt-1'}`}>
        <span className="text-[11px] font-medium text-[#64748b] whitespace-nowrap">{label}</span>
        <select
          disabled={locked}
          title={locked ? `Fill in ${routing.missing!.join(', ')} first` : undefined}
          aria-label={`${outcome.label}: then go to`}
          className={`${inputSmall} `}
          value={
            outcome.targetStageId
              ? `${STAGE}${outcome.targetStageId}`
              : (outcome.targetNodeId ?? '')
          }
          onChange={(e) => {
            if (e.target.value === CREATE_NEW) routing.createNodeFor(outcomeKey)
            else if (e.target.value.startsWith(STAGE))
              routing.setStageTarget(outcomeKey, e.target.value.slice(STAGE.length))
            else routing.setTarget(outcomeKey, e.target.value || null)
          }}
        >
          <option value="">Choose the next step…</option>
          {routing.nodeOptions.map((n) => {
            // A close step already used by another result can't be shared: each result closes with its own reason
            const taken =
              outcome.targetNodeId !== n.id &&
              (!!n.usedBy ||
                (!!routing.closeIds?.has(n.id) && routing.node.outcomes.some((o) => o.key !== outcomeKey && o.targetNodeId === n.id)))
            return (
              <option key={n.id} value={n.id} disabled={taken}>
                {n.name}
                {taken ? ' (already used – add a new step)' : ''}
              </option>
            )
          })}
          <option value={CREATE_NEW}>+ Add a new step…</option>
          {routing.stageOptions.length > 0 && (
            <optgroup label="Move to another stage">
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
      <p className={`text-[11px] mt-1 ${connected ? 'text-[#0f8a93]' : 'text-red-600'}`}>
        {connected
          ? `→ The request moves on to ${outcome.targetStageId ? 'the stage ' : ''}“${target?.name ?? '…'}”.`
          : 'Choose where the request goes for this result.'}
      </p>
    </div>
  )
}
