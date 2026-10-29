'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Archive,
  Copy,
  ExternalLink,
  Layers,
  Plus,
  Search,
  Trash2,
  Workflow as WorkflowIcon,
} from 'lucide-react'
import { workflowRepository } from '@/lib/repository'
import type { Workflow } from '@/types/workflow'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/Modal'
import { OverflowMenu, type MenuItem } from '@/components/ui/Menu'
import { WorkflowStatusChip } from '@/components/ui/Chips'
import { btnPrimary, cardBase, inputBase } from '@/components/ui/styles'
import { NameDescriptionModal } from './WorkflowFormModal'

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

const canDelete = (wf: Workflow) => wf.status === 'draft' && wf.publishedVersion === undefined

/**
 * WorkflowDirectory — Screen
 * Lists every workflow as cards with search and create/duplicate/archive/delete.
 * Used in: DashboardPage
 */
export const WorkflowDirectory: React.FC = () => {
  const router = useRouter()
  const toast = useToast()
  const [workflows, setWorkflows] = useState<Workflow[] | null>(null)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Workflow | null>(null)

  const refresh = () => workflowRepository.listWorkflows().then(setWorkflows)

  useEffect(() => {
    refresh()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!workflows) return []
    if (!q) return workflows
    return workflows.filter((w) => w.name.toLowerCase().includes(q) || w.description.toLowerCase().includes(q))
  }, [workflows, query])

  const takenNames = (workflows ?? []).filter((w) => w.status !== 'archived').map((w) => w.name)

  const menuFor = (wf: Workflow): MenuItem[] => [
    { label: 'Open', icon: <ExternalLink className="w-3.5 h-3.5" />, onClick: () => router.push(`/workflows/${wf.id}`) },
    {
      label: 'Duplicate',
      icon: <Copy className="w-3.5 h-3.5" />,
      onClick: async () => {
        await workflowRepository.duplicateWorkflow(wf.id)
        await refresh()
        toast('Workflow duplicated')
      },
    },
    {
      label: 'Archive',
      icon: <Archive className="w-3.5 h-3.5" />,
      disabled: wf.status === 'archived',
      onClick: async () => {
        await workflowRepository.saveWorkflow({ ...wf, status: 'archived' })
        await workflowRepository.appendAudit(wf.id, [
          { level: 'workflow', action: 'edited', objectPath: wf.name, before: wf.status, after: 'archived' },
        ])
        await refresh()
        toast('Workflow archived')
      },
    },
    {
      label: 'Delete',
      icon: <Trash2 className="w-3.5 h-3.5" />,
      danger: true,
      disabled: !canDelete(wf),
      hint: canDelete(wf) ? undefined : 'Only drafts that were never published can be deleted.',
      onClick: () => setDeleting(wf),
    },
  ]

  return (
    <div className="flex flex-col gap-6 w-full text-[#0d212c]">
      {/* Page heading */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#0d212c]">Workflows</h2>
          <p className="text-xs text-[#64748b] leading-relaxed mt-1">Create and manage your approval workflows.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {workflows && workflows.length > 0 && (
            <div className="relative flex-1 sm:flex-none sm:w-72">
              <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="search"
                aria-label="Search workflows"
                placeholder="Search by name or description"
                className={`${inputBase} pl-9`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          )}
          <button className={`${btnPrimary} shrink-0`} onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            Create workflow
          </button>
        </div>
      </div>

      {/* Content */}
      {workflows === null ? null : workflows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-white px-6 py-16 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#36c0c9]/10 text-[#36c0c9] flex items-center justify-center mb-1">
            <WorkflowIcon className="w-7 h-7" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold">No workflows yet</h3>
          <p className="text-xs text-[#64748b] max-w-xs">Create your first approval workflow to get started.</p>
          <button className={`${btnPrimary} mt-2`} onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            Create workflow
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-xs text-[#64748b]">No workflows match “{query}”.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((wf) => (
            <div
              key={wf.id}
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/workflows/${wf.id}`)}
              onKeyDown={(e) => e.key === 'Enter' && router.push(`/workflows/${wf.id}`)}
              className={`${cardBase} p-5 flex flex-col gap-4 cursor-pointer group shadow-2xs hover:shadow-md hover:border-[#dde3ea] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e2e8f0]`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#36c0c9]/10 text-[#36c0c9] flex items-center justify-center shrink-0">
                  <WorkflowIcon className="w-5 h-5" aria-hidden="true" />
                </div>
                <OverflowMenu items={menuFor(wf)} label={`Actions for ${wf.name}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-[#0d212c] group-hover:text-[#36c0c9] transition-colors">
                  {wf.name}
                </h3>
                <p className="text-xs text-[#64748b] leading-relaxed mt-1 line-clamp-2">
                  {wf.description || 'No description'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <WorkflowStatusChip status={wf.status} version={wf.version} />
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs">
                  <Layers className="w-3 h-3" aria-hidden="true" />
                  {wf.stageIds.length} {wf.stageIds.length === 1 ? 'stage' : 'stages'}
                </span>
              </div>
              <div className="h-[1px] bg-slate-100 w-full" />
              <p className="text-[11px] text-[#64748b]">
                Updated {formatDate(wf.updatedAt)} by {wf.updatedBy}
              </p>
            </div>
          ))}
        </div>
      )}

      <NameDescriptionModal
        open={creating}
        title="Create workflow"
        submitLabel="Create"
        nameLabel="Workflow name"
        descriptionLabel="Workflow description"
        nameMax={80}
        descriptionMax={500}
        takenNames={takenNames}
        onClose={() => setCreating(false)}
        onSubmit={async (name, description) => {
          const wf = await workflowRepository.createWorkflow(name, description)
          setCreating(false)
          toast('Workflow created')
          router.push(`/workflows/${wf.id}`)
        }}
      />

      <ConfirmModal
        open={!!deleting}
        title="Delete workflow?"
        message={
          <>
            <strong className="text-[#0d212c]">{deleting?.name}</strong> and all its stages will be permanently deleted.
          </>
        }
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          await workflowRepository.deleteWorkflow(deleting.id)
          setDeleting(null)
          await refresh()
          toast('Workflow deleted')
        }}
      />
    </div>
  )
}
