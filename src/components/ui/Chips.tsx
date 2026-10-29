import React from 'react'
import { CircleAlert, CircleCheck, CircleHelp } from 'lucide-react'
import type { WorkflowStatus } from '@/types/workflow'

type ChipStatus = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'finalised'

const STYLES: Record<ChipStatus, string> = {
  success: 'bg-[#e6f4ea] text-[#137333] border-[#ceebd6]',
  warning: 'bg-[#fef7e0] text-[#b06000] border-[#fde8b3]',
  error: 'bg-[#fce8e6] text-[#c5221f] border-[#f8c4c0]',
  info: 'bg-[#e8f0fe] text-[#1a73e8] border-[#c6dafc]',
  finalised: 'bg-[#f3e8ff] text-[#6b21a8] border-[#e9d5ff]',
  neutral: 'bg-[#f1f3f4] text-[#5f6368] border-[#e0e0e0]',
}

/**
 * StatusChip — Atom
 * Compact semantic pill (same palette as the TDD Phase 2 StatusChip).
 * Used in: WorkflowDirectory, StagesScreen, StageBuilder
 */
export const StatusChip: React.FC<{
  label: string
  status?: ChipStatus
  icon?: React.ReactNode
  className?: string
}> = ({ label, status = 'neutral', icon, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border select-none whitespace-nowrap ${STYLES[status]} ${className}`}
  >
    {icon}
    {label}
  </span>
)

export const WorkflowStatusChip: React.FC<{ status: WorkflowStatus; version: number }> = ({ status, version }) => {
  const map = { draft: 'info', published: 'success', archived: 'neutral' } as const
  const label = { draft: 'Draft', published: 'Published', archived: 'Archived' }[status]
  return <StatusChip status={map[status]} label={`${label} · v${version}`} />
}

/** Stage health: errors, to-confirm count or ready. Uses icon + text, not colour alone. */
export const HealthChip: React.FC<{ errors: number; toConfirm: number; compact?: boolean }> = ({
  errors,
  toConfirm,
  compact,
}) => {
  if (errors === 0 && toConfirm === 0)
    return <StatusChip status="success" label="Ready" icon={<CircleCheck className="w-3 h-3" aria-hidden="true" />} />
  return (
    <span className="inline-flex items-center gap-1.5">
      {errors > 0 && (
        <StatusChip
          status="error"
          label={compact ? String(errors) : `${errors} ${errors === 1 ? 'issue' : 'issues'}`}
          icon={<CircleAlert className="w-3 h-3" aria-hidden="true" />}
        />
      )}
      {toConfirm > 0 && (
        <StatusChip
          status="warning"
          label={compact ? String(toConfirm) : `${toConfirm} to confirm`}
          icon={<CircleHelp className="w-3 h-3" aria-hidden="true" />}
        />
      )}
    </span>
  )
}
