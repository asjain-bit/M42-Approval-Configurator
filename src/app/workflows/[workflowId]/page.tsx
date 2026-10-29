'use client'

import { use } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/templates/AppShell'
import { StagesScreen } from '@/components/workflows/StagesScreen'
import { WorkflowHeader } from '@/components/workflows/WorkflowHeader'
import { useWorkflow } from '@/lib/workflow/useWorkflow'

export default function WorkflowPage({ params }: { params: Promise<{ workflowId: string }> }) {
  const { workflowId } = use(params)
  const { workflow, save, audit, allWorkflows } = useWorkflow(workflowId)

  if (workflow === null)
    return (
      <AppShell title="Workflow not found" activeTab="dashboard">
        <p className="text-sm text-[#64748b]">
          This workflow doesn&apos;t exist.{' '}
          <Link href="/dashboard" className="text-[#36c0c9] font-medium hover:underline">
            Back to workflows
          </Link>
        </p>
      </AppShell>
    )

  return (
    <AppShell
      activeTab="dashboard"
      header={
        workflow ? <WorkflowHeader workflow={workflow} audit={audit} allWorkflows={allWorkflows} save={save} /> : <div />
      }
    >
      {workflow && <StagesScreen workflow={workflow} save={save} />}
    </AppShell>
  )
}
