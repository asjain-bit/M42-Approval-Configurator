/**
 * Workflow repository. In-memory state persisted to localStorage, behind an
 * async interface so a real API can replace it without UI changes.
 */

import { newId } from '@/lib/id'
import { internalCanvasStage, seedWorkflow } from '@/lib/seed'
import { ADMIN_PROFILE } from '@/lib/session'
import { getNodeType } from '@/lib/registry/nodes'
import { clone, createNode, normalizeStage } from '@/lib/workflow/graph'
import type { AuditEntry, Workflow, WorkflowNode, WorkflowVersion } from '@/types/workflow'

export type NewAuditEntry = Omit<AuditEntry, 'id' | 'at' | 'by'>

export interface WorkflowRepository {
  listWorkflows(): Promise<Workflow[]>
  getWorkflow(id: string): Promise<Workflow | null>
  saveWorkflow(workflow: Workflow): Promise<Workflow>
  createWorkflow(name: string, description: string): Promise<Workflow>
  duplicateWorkflow(id: string): Promise<Workflow>
  deleteWorkflow(id: string): Promise<void>
  listAudit(workflowId: string): Promise<AuditEntry[]>
  appendAudit(workflowId: string, entries: NewAuditEntry[]): Promise<void>
  listVersions(workflowId: string): Promise<WorkflowVersion[]>
  addVersion(workflow: Workflow, summary: string): Promise<void>
}

interface Store {
  workflows: Record<string, Workflow>
  audit: Record<string, AuditEntry[]>
  versions?: Record<string, WorkflowVersion[]>
}

const STORAGE_KEY = 'm42-workflow-configurator.v2'

let memory: Store | null = null

const CLOSED_AS: Record<string, string> = { rejected: 'Rejected', withdrawn: 'Withdrawn', completed: 'Completed' }

/** Bring steps saved with the old step types over to the general Step and the start/end steps */
function migrateNode(node: WorkflowNode, firstStage: boolean) {
  const c = node.config
  const step = (over: Record<string, unknown>) => {
    node.type = 'step'
    node.config = { ...getNodeType('step').defaultConfig(), ...over }
  }
  switch (node.type) {
    case 'form':
      if (firstStage) {
        node.type = 'formSubmission'
        node.config = {
          ...getNodeType('formSubmission').defaultConfig(),
          formId: c.formId ?? '',
          submitters: c.submittedBy === 'internal' ? 'internal' : 'vendors',
        }
      } else
        step({ actor: 'human', action: 'submit', assignee: c.submittedBy === 'internal' ? '' : 'vendor', formId: c.formId ?? '', outcomes: [{ id: 'submitted', label: 'Submitted' }] })
      break
    case 'agentTask':
      step({
        actor: 'agent',
        action: 'check',
        agentId: c.agentId ?? '',
        tasks: c.tasks ?? [],
        outcomes: [
          { id: 'passed', label: 'Pass all checks' },
          { id: 'failed', label: 'Fail any check' },
        ],
      })
      break
    case 'userTask':
      step({ actor: 'human', action: 'approve', assignee: c.assignee ?? '', instructions: c.instructions ?? '', outcomes: c.decisions ?? [] })
      break
    case 'step':
      c.approvers ??= 1
      c.approvalRule ??= 'all'
      break
    case 'decision':
      c.kind ??= 'question'
      c.inputType ??= 'text'
      c.inputRequired ??= true
      break
    case 'closeRequest':
      c.reasonMode ??= 'optional'
      if (c.statusLabel === undefined)
        node.config = {
          statusLabel: CLOSED_AS[String(c.closeAs)] ?? 'Closed',
          reasonMode: 'optional',
          emailVendor: false,
          templateId: '',
        }
      break
    case 'nextStage': {
      const next = !c.stageId || c.stageId === 'next'
      node.type = 'stageComplete'
      node.config = { unlock: next ? 'next' : 'choose', stageId: next ? '' : c.stageId, statusLabel: 'Completed' }
      break
    }
  }
}

function migrate(store: Store): Store {
  for (const wf of Object.values(store.workflows)) {
    wf.stageIds.forEach((id, index) => {
      const stage = wf.stages[id]
      if (!stage) return
      for (const node of Object.values(stage.nodes)) {
        migrateNode(node, index === 0)
        // Settings added since the step was saved start from their defaults
        node.config = { ...getNodeType(node.type).defaultConfig(), ...node.config }
      }
      // Stage 2 is now built from the general steps (collect responses, decision, director tasks)
      if (stage.name === 'Internal Canvas' && !Object.values(stage.nodes).some((n) => n.type === 'collectResponses'))
        wf.stages[id] = { ...internalCanvasStage(), id, enabled: stage.enabled, description: stage.description }
      // A stage has one start: drop an empty, unconnected Stage start that sits next to the real one
      const cur = wf.stages[id]
      const starts = Object.values(cur.nodes).filter((n) => getNodeType(n.type).isStart)
      if (starts.length > 1)
        for (const n of starts)
          if (n.type === 'stageStart' && n.outcomes.every((o) => !o.targetNodeId) && starts.length > 1) {
            delete cur.nodes[n.id]
            delete cur.layout[n.id]
            starts.splice(starts.indexOf(n), 1)
          }
      // Every stage begins with its start step
      if (Object.keys(stage.nodes).length === 0) {
        const start = createNode('stageStart', stage)
        stage.nodes[start.id] = start
      }
      wf.stages[id] = normalizeStage(wf.stages[id])
    })
  }
  return store
}

function load(): Store {
  if (memory) return memory
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      memory = migrate(JSON.parse(raw) as Store)
      return memory
    }
  } catch {
    // Fall through to seed
  }
  const seeded = seedWorkflow()
  memory = { workflows: { [seeded.id]: seeded }, audit: { [seeded.id]: [] } }
  persist()
  return memory
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory))
  } catch {
    // Storage full or blocked: keep working in memory
  }
}

const currentUser = () => ADMIN_PROFILE.name

export const workflowRepository: WorkflowRepository = {
  async listWorkflows() {
    return Object.values(load().workflows)
      .map(clone)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },

  async getWorkflow(id) {
    const wf = load().workflows[id]
    return wf ? clone(wf) : null
  },

  async saveWorkflow(workflow) {
    const store = load()
    const saved = { ...clone(workflow), updatedAt: new Date().toISOString(), updatedBy: currentUser() }
    store.workflows[saved.id] = saved
    persist()
    return clone(saved)
  },

  async createWorkflow(name, description) {
    const store = load()
    const wf: Workflow = {
      id: newId('wf'),
      name,
      description,
      status: 'draft',
      version: 1,
      stageIds: [],
      stages: {},
      settings: {
        caseIdFormat: 'CASE-{YYYY}-{00000}',
        workingCalendarId: 'cal-default',
        defaultReminderTime: '09:00',
        timezone: 'Asia/Dubai',
        eventRules: [],
      },
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser(),
    }
    store.workflows[wf.id] = wf
    store.audit[wf.id] = []
    persist()
    await this.appendAudit(wf.id, [{ level: 'workflow', action: 'created', objectPath: name, after: name }])
    return clone(wf)
  },

  async duplicateWorkflow(id) {
    const store = load()
    const source = store.workflows[id]
    if (!source) throw new Error('Workflow not found')
    const names = new Set(Object.values(store.workflows).map((w) => w.name.toLowerCase()))
    let name = `${source.name} (copy)`
    let i = 2
    while (names.has(name.toLowerCase())) name = `${source.name} (copy ${i++})`
    const copy: Workflow = {
      ...clone(source),
      id: newId('wf'),
      name: name.slice(0, 80),
      status: 'draft',
      version: 1,
      publishedVersion: undefined,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser(),
    }
    store.workflows[copy.id] = copy
    store.audit[copy.id] = []
    persist()
    await this.appendAudit(copy.id, [
      { level: 'workflow', action: 'created', objectPath: copy.name, after: `Copied from ${source.name}` },
    ])
    return clone(copy)
  },

  async deleteWorkflow(id) {
    const store = load()
    delete store.workflows[id]
    delete store.audit[id]
    delete store.versions?.[id]
    persist()
  },

  async listAudit(workflowId) {
    return clone(load().audit[workflowId] ?? []).sort((a, b) => b.at.localeCompare(a.at))
  },

  async appendAudit(workflowId, entries) {
    if (entries.length === 0) return
    const store = load()
    const list = store.audit[workflowId] ?? []
    const at = new Date().toISOString()
    for (const e of entries) list.push({ ...e, id: newId('aud'), at, by: currentUser() })
    store.audit[workflowId] = list
    persist()
  },
  async listVersions(workflowId) {
    return clone(load().versions?.[workflowId] ?? []).sort((a, b) => b.version - a.version || b.at.localeCompare(a.at))
  },

  async addVersion(workflow, summary) {
    const store = load()
    store.versions ??= {}
    const list = store.versions[workflow.id] ?? []
    list.push({ id: newId('ver'), version: workflow.version, at: new Date().toISOString(), by: currentUser(), summary, snapshot: clone(workflow) })
    store.versions[workflow.id] = list
    persist()
  },
}
