import type { LucideIcon } from 'lucide-react'
import type {
  CaseField,
  RecipientKind,
  SlaConfig,
  Stage,
  Workflow,
  WorkflowNode,
} from '@/types/workflow'

export type NodeCategory = 'startEnd' | 'steps' | 'flow'

export interface CategoryDef {
  key: NodeCategory
  label: string
  icon: LucideIcon
  /** Tailwind classes for the category accent (icon tile) */
  accent: string
  /** Colour used for this category on the minimap */
  mapColor: string
}

export interface OptionItem {
  value: string
  label: string
  hint?: string
  group?: string
}

export interface SchemaContext {
  workflow: Workflow
  stage: Stage
  node: WorkflowNode
  caseFields: CaseField[]
  /** Other workflows (for the Start workflow node) */
  workflows: { id: string; name: string; status: string }[]
}

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'number'
  | 'time'
  | 'toggle'
  | 'select'
  | 'radio'
  | 'multiselect'
  | 'orderedMultiselect'
  | 'recipients'
  | 'duration'
  | 'note'
  | 'list'
  | 'formFields'
  | 'branches'
  | 'caseFieldSelect'
  | 'caseFieldMulti'
  | 'setRows'
  | 'integrationFields'
  | 'questionnairePreview'

export interface FieldSchema {
  /** Dotted path inside the config object (or list item) */
  key: string
  label: string
  kind: FieldKind
  help?: string
  placeholder?: string
  required?: boolean
  /** For 'select': let the admin type their own value when the list has no match */
  allowCustom?: boolean
  maxLength?: number
  min?: number
  max?: number
  options?: OptionItem[] | ((ctx: SchemaContext, scope: Record<string, unknown>) => OptionItem[])
  showIf?: (scope: Record<string, unknown>, ctx: SchemaContext) => boolean
  recipientKinds?: RecipientKind[]
  /** For 'list': schema of each item */
  itemSchema?: FieldSchema[]
  itemTitle?: (item: Record<string, unknown>, index: number) => string
  addLabel?: string
  newItem?: () => Record<string, unknown>
  minItems?: number
  /** For 'note': text to show (read-only) */
  text?: string | ((scope: Record<string, unknown>, ctx: SchemaContext) => string)
  /** For 'duration': allowed units */
  units?: OptionItem[]
}

export interface SectionSchema {
  id: string
  title: string
  /** Advanced settings start folded away */
  collapsed?: boolean
  fields: FieldSchema[]
  showIf?: (config: Record<string, unknown>, ctx: SchemaContext) => boolean
}

export interface OutcomeSpec {
  key: string
  label: string
}

export interface NodeIssue {
  severity: 'error' | 'warning'
  message: string
  field?: string
}

/** How one step looks on the canvas and in the form header */
export interface NodeView {
  icon: LucideIcon
  accent: string
  cardTone: string
  mapColor: string
  /** Small label above the step name */
  label: string
}

export interface NodeTypeDef {
  key: string
  category: NodeCategory
  label: string
  icon: LucideIcon
  description: string
  /** Icon-tile classes; defaults to the category accent */
  accent?: string
  /** Card background and border classes on the canvas */
  cardTone?: string
  /** Minimap colour; defaults to the category colour */
  mapColor?: string
  /** Short note under "Outcomes and routing" saying where outcome names come from */
  outcomesNote?: string
  /** Rounded pill card for endings */
  shape?: 'card' | 'pill'
  /** Starts a flow: no input handle. Start steps are green on the canvas */
  isStart?: boolean
  /** Ends a flow. End steps are red on the canvas */
  isEnd?: boolean
  /** SLA block: none, human SLA with reminders, or agent run timeout */
  sla?: 'human' | 'agent'
  /** SLA kind that depends on the step's settings (wins over `sla`) */
  slaFor?: (node: WorkflowNode) => 'human' | 'agent' | undefined
  /** Look that depends on the step's settings (icon, colours, eyebrow) */
  view?: (node: WorkflowNode) => Partial<NodeView>
  /** Keep related settings in step when one changes (e.g. outcomes follow the action) */
  onConfigChange?: (prev: WorkflowNode, next: WorkflowNode, path: string) => WorkflowNode
  /** Show the "Notifications on events" block */
  eventNotifications?: boolean
  defaultName: string
  defaultConfig: () => Record<string, unknown>
  defaultSla?: () => SlaConfig
  configSchema: SectionSchema[]
  getOutcomes: (node: WorkflowNode) => OutcomeSpec[]
  summary: (node: WorkflowNode) => string
  /** Case data this node writes */
  outputs?: (node: WorkflowNode) => Omit<CaseField, 'producedBy' | 'stageName'>[]
  validate?: (node: WorkflowNode, ctx: SchemaContext) => NodeIssue[]
  isAllowed?: (ctx: { workflow: Workflow; stage: Stage }) => { allowed: boolean; reason?: string }
}
