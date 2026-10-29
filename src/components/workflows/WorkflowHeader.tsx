'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, CircleCheck, Clock, History, Loader2, Pencil, Rocket, ShieldCheck } from 'lucide-react'
import { workflowRepository, type NewAuditEntry } from '@/lib/repository'
import type { Issue } from '@/lib/workflow/validation'
import { validateWorkflow } from '@/lib/workflow/validation'
import type { AuditEntry, Workflow } from '@/types/workflow'
import { WorkflowStatusChip } from '@/components/ui/Chips'
import { useToast } from '@/components/ui/Toast'
import { btnIcon, btnPrimary, btnSmall } from '@/components/ui/styles'
import { AuditDrawer } from './AuditDrawer'
import { PublishModal } from './PublishModal'
import { ValidationDrawer } from './ValidationDrawer'
import { NameDescriptionModal } from './WorkflowFormModal'
import { VersionHistoryDrawer } from './VersionHistoryDrawer'

interface Props {
  workflow: Workflow
  audit: AuditEntry[]
  allWorkflows: { id: string; name: string; status: string }[]
  save: (next: Workflow, entries?: NewAuditEntry[], opts?: { keepStatus?: boolean }) => Promise<unknown>
  stageName?: string
  saveState?: 'saved' | 'saving' | null
  onGoToIssue?: (issue: Issue) => void
}

/**
 * WorkflowHeader — Organism
 * Breadcrumb, editable name, status, and the Validate / Publish / Version history / Audit log actions.
 * Used in: StagesScreen, StageBuilder
 */
export const WorkflowHeader: React.FC<Props> = ({
  workflow,
  audit,
  allWorkflows,
  save,
  stageName,
  saveState,
  onGoToIssue,
}) => {
  const router = useRouter()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [panel, setPanel] = useState<'validate' | 'audit' | 'publish' | 'versions' | null>(null)
  const [versionsKey, setVersionsKey] = useState('')

  const issues = useMemo(() => validateWorkflow(workflow, allWorkflows), [workflow, allWorkflows])
  const errorCount = issues.filter((i) => i.severity === 'error').length

  const goTo =
    onGoToIssue ??
    ((issue: Issue) => {
      const params = new URLSearchParams()
      if (issue.nodeId) params.set('node', issue.nodeId)
      if (issue.field) params.set('field', issue.field)
      router.push(`/workflows/${workflow.id}/stages/${issue.stageId}?${params.toString()}`)
    })

  return (
    <>
      <div className="flex flex-col min-w-0 gap-0.5">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[11px] text-[#64748b] min-w-0">
          <Link href="/dashboard" className="hover:text-[#0d212c] hover:underline">
            Workflows
          </Link>
          <ChevronRight className="w-3 h-3 shrink-0" aria-hidden="true" />
          {stageName ? (
            <>
              <Link href={`/workflows/${workflow.id}`} className="hover:text-[#0d212c] hover:underline truncate max-w-[220px]">
                {workflow.name}
              </Link>
              <ChevronRight className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span className="text-[#0d212c] font-medium truncate" aria-current="page">
                {stageName}
              </span>
            </>
          ) : (
            <span className="text-[#0d212c] font-medium truncate" aria-current="page">
              {workflow.name}
            </span>
          )}
        </nav>
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="font-semibold text-base lg:text-lg tracking-tight text-[#0d212c] truncate">{workflow.name}</h1>
          <button className={`${btnIcon} w-7 h-7 shrink-0`} aria-label="Edit workflow name and description" onClick={() => setEditing(true)}>
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <WorkflowStatusChip status={workflow.status} version={workflow.version} />
          {saveState && (
            <span className="inline-flex items-center gap-1 text-[11px] text-[#64748b] whitespace-nowrap" aria-live="polite">
              {saveState === 'saving' ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> Saving…
                </>
              ) : (
                <>
                  <CircleCheck className="w-3 h-3 text-[#36c0c9]" aria-hidden="true" /> Saved
                </>
              )}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button className={btnSmall} onClick={() => setPanel('versions')}>
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden xl:inline">Version history</span>
        </button>
        <button className={btnSmall} onClick={() => setPanel('audit')}>
          <History className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden xl:inline">Audit log</span>
        </button>
        <button className={btnSmall} onClick={() => setPanel('validate')}>
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
          Validate
          {errorCount > 0 && (
            <span className="ml-0.5 text-[10px] font-semibold px-1.5 rounded-full bg-red-600 text-white">{errorCount}</span>
          )}
        </button>
        <button
          className={`${btnPrimary} h-8 px-3 text-xs`}
          disabled={errorCount > 0}
          title={errorCount > 0 ? 'Fix the issues listed under Validate before publishing.' : undefined}
          onClick={() => setPanel('publish')}
        >
          <Rocket className="w-3.5 h-3.5" aria-hidden="true" />
          Publish
        </button>
      </div>

      <NameDescriptionModal
        open={editing}
        title="Edit workflow"
        submitLabel="Save"
        nameLabel="Workflow name"
        descriptionLabel="Workflow description"
        initialName={workflow.name}
        initialDescription={workflow.description}
        nameMax={80}
        descriptionMax={500}
        takenNames={allWorkflows.filter((w) => w.id !== workflow.id && w.status !== 'archived').map((w) => w.name)}
        onClose={() => setEditing(false)}
        onSubmit={async (name, description) => {
          const entries: NewAuditEntry[] = []
          if (name !== workflow.name)
            entries.push({ level: 'workflow', action: 'renamed', objectPath: workflow.name, before: workflow.name, after: name })
          if (description !== workflow.description)
            entries.push({ level: 'workflow', action: 'edited', objectPath: `${name} › Description`, before: workflow.description, after: description })
          await save({ ...workflow, name, description }, entries)
          setEditing(false)
          toast('Workflow updated')
        }}
      />

      <ValidationDrawer
        open={panel === 'validate'}
        workflow={workflow}
        issues={issues}
        onClose={() => setPanel(null)}
        onGoTo={(issue) => {
          setPanel(null)
          goTo(issue)
        }}
      />
      <AuditDrawer open={panel === 'audit'} workflow={workflow} entries={audit} onClose={() => setPanel(null)} />
      <PublishModal
        open={panel === 'publish'}
        workflow={workflow}
        audit={audit}
        onClose={() => setPanel(null)}
        onPublish={async (summary) => {
          const published: Workflow = { ...workflow, status: 'published', publishedVersion: workflow.version }
          await save(
            published,
            [{ level: 'workflow', action: 'published', objectPath: workflow.name, after: `Version ${workflow.version}: ${summary}` }],
            { keepStatus: true }
          )
          await workflowRepository.addVersion(published, summary)
          setVersionsKey(`${workflow.version}-${Date.now()}`)
          setPanel(null)
          toast(`Version ${workflow.version} published`)
        }}
      />
      <VersionHistoryDrawer
        open={panel === 'versions'}
        workflow={workflow}
        refreshKey={versionsKey}
        onClose={() => setPanel(null)}
        onRestore={async (v) => {
          await save(
            { ...v.snapshot, id: workflow.id, name: workflow.name, status: 'draft', version: (workflow.publishedVersion ?? workflow.version) + 1, publishedVersion: workflow.publishedVersion },
            [{ level: 'workflow', action: 'edited', objectPath: workflow.name, after: `Restored version ${v.version}` }],
            { keepStatus: true }
          )
          setPanel(null)
          toast(`Version ${v.version} restored as a draft`)
        }}
      />
    </>
  )
}
