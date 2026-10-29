'use client'

import React, { useEffect, useState } from 'react'
import { History, RotateCcw } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { ConfirmModal } from '@/components/ui/Modal'
import { WorkflowStatusChip } from '@/components/ui/Chips'
import { btnSmall } from '@/components/ui/styles'
import { workflowRepository } from '@/lib/repository'
import type { Workflow, WorkflowVersion } from '@/types/workflow'

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
const stepCount = (wf: Workflow) => Object.values(wf.stages).reduce((n, s) => n + Object.keys(s.nodes).length, 0)

/**
 * VersionHistoryDrawer — Organism
 * Every published version of the workflow, newest first, with the current draft on top.
 * A version can be brought back as the new draft.
 * Used in: WorkflowHeader
 */
export const VersionHistoryDrawer: React.FC<{
  open: boolean
  workflow: Workflow
  /** Changes whenever a version is published, so the list reloads */
  refreshKey: string
  onClose: () => void
  onRestore: (version: WorkflowVersion) => void
}> = ({ open, workflow, refreshKey, onClose, onRestore }) => {
  const [versions, setVersions] = useState<WorkflowVersion[]>([])
  const [restoring, setRestoring] = useState<WorkflowVersion | null>(null)

  useEffect(() => {
    if (open) workflowRepository.listVersions(workflow.id).then(setVersions)
  }, [open, workflow.id, refreshKey])

  return (
    <Drawer open={open} title="Version history" subtitle={`${versions.length} published ${versions.length === 1 ? 'version' : 'versions'}`} onClose={onClose} width="max-w-lg">
      <div className="px-5 py-4 border-b border-[#f1f5f9] flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-[#0d212c]">Current</span>
          <WorkflowStatusChip status={workflow.status} version={workflow.version} />
        </div>
        <p className="text-[11px] text-[#64748b]">
          {workflow.stageIds.length} stages · {stepCount(workflow)} steps · last changed {when(workflow.updatedAt)} by {workflow.updatedBy}
        </p>
      </div>
      {versions.length === 0 ? (
        <div className="p-10 flex flex-col items-center gap-2 text-center">
          <History className="w-8 h-8 text-[#94a3b8]" aria-hidden="true" />
          <p className="text-xs text-[#64748b]">No published versions yet. Each time you publish, that version is kept here.</p>
        </div>
      ) : (
        <ul className="divide-y divide-[#f1f5f9]">
          {versions.map((v) => (
            <li key={v.id} className="px-5 py-3.5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[#0d212c]">Version {v.version}</span>
                <span className="text-[11px] text-[#94a3b8] whitespace-nowrap">{when(v.at)}</span>
              </div>
              <p className="text-[11px] text-[#64748b]">
                {v.snapshot.stageIds.length} stages · {stepCount(v.snapshot)} steps · published by {v.by}
              </p>
              {v.summary && <p className="text-[11px] text-[#0d212c] whitespace-pre-line leading-relaxed line-clamp-6">{v.summary}</p>}
              <div>
                <button className={btnSmall} onClick={() => setRestoring(v)}>
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  Restore as draft
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmModal
        open={!!restoring}
        title={`Restore version ${restoring?.version}?`}
        message="Your current stages and steps will be replaced by this version, as a new draft. Published versions stay in the history."
        confirmLabel="Restore"
        onCancel={() => setRestoring(null)}
        onConfirm={() => {
          if (restoring) onRestore(restoring)
          setRestoring(null)
        }}
      />
    </Drawer>
  )
}
