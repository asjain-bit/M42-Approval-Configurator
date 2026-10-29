'use client'

import { useCallback, useEffect, useState } from 'react'
import { workflowRepository, type NewAuditEntry } from '@/lib/repository'
import type { AuditEntry, Workflow } from '@/types/workflow'

/** Editing a published workflow starts a new draft version. */
export function markEdited(wf: Workflow): Workflow {
  if (wf.status !== 'published') return wf
  return { ...wf, status: 'draft', version: (wf.publishedVersion ?? wf.version) + 1 }
}

/**
 * Loads one workflow plus the list of all workflows, and saves changes with
 * their audit entries.
 */
export function useWorkflow(workflowId: string) {
  const [workflow, setWorkflow] = useState<Workflow | null | undefined>(undefined)
  const [allWorkflows, setAllWorkflows] = useState<{ id: string; name: string; status: string }[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])

  const refreshAudit = useCallback(
    () => workflowRepository.listAudit(workflowId).then(setAudit),
    [workflowId]
  )

  useEffect(() => {
    workflowRepository.getWorkflow(workflowId).then(setWorkflow)
    workflowRepository
      .listWorkflows()
      .then((list) => setAllWorkflows(list.map((w) => ({ id: w.id, name: w.name, status: w.status }))))
    refreshAudit()
  }, [workflowId, refreshAudit])

  /** Persist a new version of the workflow and write audit entries. */
  const save = useCallback(
    async (next: Workflow, entries: NewAuditEntry[] = [], opts: { keepStatus?: boolean } = {}) => {
      const toSave = opts.keepStatus ? next : markEdited(next)
      setWorkflow(toSave)
      const saved = await workflowRepository.saveWorkflow(toSave)
      await workflowRepository.appendAudit(saved.id, entries)
      setWorkflow((cur) => (cur && cur.id === saved.id ? { ...cur, updatedAt: saved.updatedAt, updatedBy: saved.updatedBy } : cur))
      refreshAudit()
      return saved
    },
    [refreshAudit]
  )

  return { workflow, setWorkflow, save, audit, refreshAudit, allWorkflows }
}
