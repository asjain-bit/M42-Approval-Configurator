'use client'

import React, { useEffect, useState } from 'react'
import { Info, Rocket } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { btnPrimary, btnSecondary, labelBase, textareaBase } from '@/components/ui/styles'
import type { AuditEntry, Workflow } from '@/types/workflow'

/**
 * PublishModal — Organism
 * Change summary pre-filled from audit entries since the last publish.
 * Used in: WorkflowHeader
 */
export const PublishModal: React.FC<{
  open: boolean
  workflow: Workflow
  audit: AuditEntry[]
  onClose: () => void
  onPublish: (summary: string) => void
}> = ({ open, workflow, audit, onClose, onPublish }) => {
  const [summary, setSummary] = useState('')

  useEffect(() => {
    if (!open) return
    const lastPublish = audit.find((e) => e.action === 'published')
    const since = audit.filter((e) => e.action !== 'published' && (!lastPublish || e.at > lastPublish.at))
    const lines = since
      .slice(0, 20)
      .reverse()
      .map((e) => `• ${e.action[0].toUpperCase()}${e.action.slice(1)}: ${e.objectPath}${e.after ? ` → ${e.after}` : ''}`)
    setSummary(lines.length ? lines.join('\n') : 'First published version.')
  }, [open, audit])

  return (
    <Modal
      open={open}
      title={`Publish version ${workflow.version}`}
      description={workflow.name}
      icon={
        <div className="w-10 h-10 rounded-xl bg-[#36c0c9]/10 text-[#36c0c9] flex items-center justify-center shrink-0">
          <Rocket className="w-5 h-5" aria-hidden="true" />
        </div>
      }
      onClose={onClose}
      footer={
        <>
          <button className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button className={btnPrimary} onClick={() => onPublish(summary)}>
            Publish
          </button>
        </>
      }
    >
      <div>
        <label className={labelBase} htmlFor="publish-summary">
          Change summary
        </label>
        <textarea id="publish-summary" className={`${textareaBase} min-h-[140px] text-xs`} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </div>
      <p className="flex items-start gap-2 text-xs text-[#64748b] bg-slate-50 rounded-lg p-3">
        <Info className="w-4 h-4 shrink-0 text-[#94a3b8]" aria-hidden="true" />
        Requests already in progress stay on the version they started on.
      </p>
    </Modal>
  )
}
