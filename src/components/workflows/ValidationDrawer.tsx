'use client'

import React from 'react'
import { ArrowRight, CircleAlert, CircleCheck, CircleHelp } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { btnLink } from '@/components/ui/styles'
import type { Issue } from '@/lib/workflow/validation'
import type { Workflow } from '@/types/workflow'

interface Props {
  open: boolean
  workflow: Workflow
  issues: Issue[]
  onClose: () => void
  onGoTo: (issue: Issue) => void
}

/**
 * ValidationDrawer — Organism
 * Whole-workflow issues grouped by stage, each with a "Go to" link.
 * Used in: WorkflowHeader
 */
export const ValidationDrawer: React.FC<Props> = ({ open, workflow, issues, onClose, onGoTo }) => {
  const errors = issues.filter((i) => i.severity === 'error').length
  const warnings = issues.length - errors

  return (
    <Drawer
      open={open}
      title="Validation"
      subtitle={
        errors === 0
          ? warnings
            ? `No blocking issues · ${warnings} to confirm`
            : 'Everything looks good'
          : `${errors} ${errors === 1 ? 'issue blocks' : 'issues block'} publishing · ${warnings} to confirm`
      }
      onClose={onClose}
      width="max-w-lg"
    >
      {issues.length === 0 ? (
        <div className="p-10 flex flex-col items-center gap-2 text-center">
          <CircleCheck className="w-8 h-8 text-[#36c0c9]" aria-hidden="true" />
          <p className="text-sm font-medium">No issues found</p>
          <p className="text-xs text-[#64748b]">This workflow is ready to publish.</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {workflow.stageIds.map((stageId, index) => {
            const stageIssues = issues.filter((i) => i.stageId === stageId)
            if (stageIssues.length === 0) return null
            const stage = workflow.stages[stageId]
            return (
              <section key={stageId} className="border-b border-[#f1f5f9]">
                <h3 className="px-5 pt-4 pb-2 text-[11px] font-medium text-[#94a3b8] uppercase tracking-[0.06em]">
                  {index + 1}. {stage?.name}
                </h3>
                <ul className="px-3 pb-3 flex flex-col gap-1">
                  {stageIssues
                    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1))
                    .map((issue) => (
                      <li key={issue.id} className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50">
                        {issue.severity === 'error' ? (
                          <CircleAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-label="Error" />
                        ) : (
                          <CircleHelp className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-label="To confirm" />
                        )}
                        <p className="flex-1 text-xs text-[#0d212c] leading-relaxed">{issue.message}</p>
                        <button className={`${btnLink} shrink-0 mt-0.5`} onClick={() => onGoTo(issue)}>
                          Go to <ArrowRight className="w-3 h-3" />
                        </button>
                      </li>
                    ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </Drawer>
  )
}
