'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { workflowRepository, type NewAuditEntry } from '@/lib/repository'
import type { AuditEntry, Stage, Workflow } from '@/types/workflow'
import { normalizeStage } from './graph'
import { markEdited } from './useWorkflow'

const HISTORY_LIMIT = 100
const AUTOSAVE_MS = 800

export interface ApplyOptions {
  /** Save right away instead of debounced (header actions) */
  immediate?: boolean
  /** Don't turn a published workflow back into a draft (publishing itself) */
  keepStatus?: boolean
  /** Don't record an undo step */
  skipHistory?: boolean
  /** Merge audit entries that share this key until the next save (typing in a field) */
  coalesceKey?: string
}

/**
 * Editing state for the stage builder: one workflow object, undo/redo,
 * debounced autosave and coalesced audit entries.
 */
export function useStageEditor(workflowId: string) {
  const [workflow, setWorkflow] = useState<Workflow | null | undefined>(undefined)
  const [allWorkflows, setAllWorkflows] = useState<{ id: string; name: string; status: string }[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [saveState, setSaveState] = useState<'saved' | 'saving' | null>(null)
  // Undo history lives in refs (updaters must stay pure); `historySize` re-renders the buttons
  const past = useRef<Workflow[]>([])
  const future = useRef<Workflow[]>([])
  const [historySize, setHistorySize] = useState({ past: 0, future: 0 })
  const syncHistory = () => setHistorySize({ past: past.current.length, future: future.current.length })

  const current = useRef<Workflow | null>(null)
  const pendingAudit = useRef<Map<string, NewAuditEntry>>(new Map())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Consecutive edits to the same field share one undo step
  const lastCoalesceKey = useRef<string | undefined>(undefined)

  useEffect(() => {
    workflowRepository.getWorkflow(workflowId).then((wf) => {
      current.current = wf
      setWorkflow(wf)
    })
    workflowRepository
      .listWorkflows()
      .then((list) => setAllWorkflows(list.map((w) => ({ id: w.id, name: w.name, status: w.status }))))
    workflowRepository.listAudit(workflowId).then(setAudit)
  }, [workflowId])

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const wf = current.current
    if (!wf) return
    setSaveState('saving')
    await workflowRepository.saveWorkflow(wf)
    const entries = [...pendingAudit.current.values()]
    pendingAudit.current.clear()
    await workflowRepository.appendAudit(wf.id, entries)
    setAudit(await workflowRepository.listAudit(wf.id))
    setSaveState('saved')
  }, [])

  // Save anything pending when leaving the page
  useEffect(() => () => void (timer.current && flush()), [flush])

  const schedule = useCallback(
    (immediate?: boolean) => {
      setSaveState('saving')
      if (timer.current) clearTimeout(timer.current)
      if (immediate) return flush()
      timer.current = setTimeout(flush, AUTOSAVE_MS)
    },
    [flush]
  )

  const queueAudit = (entries: NewAuditEntry[], coalesceKey?: string) => {
    entries.forEach((e, i) => {
      const key = coalesceKey ? `${coalesceKey}#${i}` : `${Date.now()}-${Math.random()}`
      const existing = pendingAudit.current.get(key)
      pendingAudit.current.set(key, existing ? { ...e, before: existing.before } : e)
    })
  }

  const apply = useCallback(
    (mutate: (wf: Workflow) => Workflow, entries: NewAuditEntry[] = [], opts: ApplyOptions = {}) => {
      const prev = current.current
      if (!prev) return
      let next = mutate(prev)
      if (next === prev) return
      if (!opts.keepStatus) next = markEdited(next)
      current.current = next
      setWorkflow(next)
      const sameField = !!opts.coalesceKey && opts.coalesceKey === lastCoalesceKey.current
      if (!opts.skipHistory) lastCoalesceKey.current = opts.coalesceKey
      if (!opts.skipHistory && !sameField) {
        past.current = [...past.current.slice(-HISTORY_LIMIT + 1), prev]
        future.current = []
        syncHistory()
      }
      queueAudit(entries, opts.coalesceKey)
      return schedule(opts.immediate)
    },
    [schedule]
  )

  /** Replace one stage (normalised) */
  const applyStage = useCallback(
    (stageId: string, mutate: (stage: Stage) => Stage, entries: NewAuditEntry[] = [], opts: ApplyOptions = {}) =>
      apply(
        (wf) => {
          const stage = wf.stages[stageId]
          if (!stage) return wf
          const next = mutate(stage)
          if (next === stage) return wf
          return { ...wf, stages: { ...wf.stages, [stageId]: normalizeStage(next) } }
        },
        entries,
        opts
      ),
    [apply]
  )

  const undo = useCallback(() => {
    const cur = current.current
    const prev = past.current[past.current.length - 1]
    if (!cur || !prev) return
    lastCoalesceKey.current = undefined
    past.current = past.current.slice(0, -1)
    future.current = [cur, ...future.current]
    syncHistory()
    current.current = prev
    setWorkflow(prev)
    queueAudit([{ level: 'workflow', action: 'edited', objectPath: prev.name, after: 'Undo' }])
    schedule()
  }, [schedule])

  const redo = useCallback(() => {
    const cur = current.current
    const next = future.current[0]
    if (!cur || !next) return
    lastCoalesceKey.current = undefined
    future.current = future.current.slice(1)
    past.current = [...past.current, cur]
    syncHistory()
    current.current = next
    setWorkflow(next)
    queueAudit([{ level: 'workflow', action: 'edited', objectPath: next.name, after: 'Redo' }])
    schedule()
  }, [schedule])

  /** Save signature compatible with WorkflowHeader */
  const save = useCallback(
    async (next: Workflow, entries: NewAuditEntry[] = [], opts: { keepStatus?: boolean } = {}) =>
      apply(() => next, entries, { immediate: true, keepStatus: opts.keepStatus }),
    [apply]
  )

  return {
    workflow,
    allWorkflows,
    audit,
    saveState,
    apply,
    applyStage,
    save,
    undo,
    redo,
    canUndo: historySize.past > 0,
    canRedo: historySize.future > 0,
  }
}
