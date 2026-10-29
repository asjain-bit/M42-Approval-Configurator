import { AppShell } from '@/components/templates/AppShell'
import { WorkflowDirectory } from '@/components/workflows/WorkflowDirectory'

export default function DashboardPage() {
  return (
    <AppShell title="Dashboard" activeTab="dashboard">
      <WorkflowDirectory />
    </AppShell>
  )
}
