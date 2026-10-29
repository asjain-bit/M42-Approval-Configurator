/**
 * Option builders shared by node schemas. All lists come from the shared modules
 * or the current workflow, never from hardcoded business values.
 */

import type { CaseFieldType } from '@/types/workflow'
import {
  AGENTS,
  CALENDARS,
  FORMS,
  INTEGRATIONS,
  QUESTIONNAIRES,
  ROLES,
  STATUS_LABELS,
  TEAMS,
  TEMPLATES,
  USERS,
} from '@/lib/library'
import type { OptionItem, SchemaContext } from './types'

export const agentOptions = (): OptionItem[] =>
  AGENTS.map((a) => ({ value: a.id, label: a.name, hint: a.description }))
export const formOptions = (): OptionItem[] => FORMS.map((f) => ({ value: f.id, label: f.name }))
export const templateOptions = (): OptionItem[] =>
  TEMPLATES.map((t) => ({ value: t.id, label: t.name, hint: t.channel === 'email' ? 'Email' : 'In-app' }))
export const roleOptions = (): OptionItem[] => ROLES.map((r) => ({ value: r.id, label: r.name }))
export const teamOptions = (): OptionItem[] => TEAMS.map((t) => ({ value: t.id, label: t.name }))
export const userOptions = (): OptionItem[] =>
  USERS.map((u) => ({ value: u.id, label: u.name, hint: u.title }))
export const questionnaireOptions = (): OptionItem[] =>
  QUESTIONNAIRES.map((q) => ({ value: q.id, label: q.name }))
export const integrationOptions = (): OptionItem[] =>
  INTEGRATIONS.map((i) => ({ value: i.id, label: i.name }))
export const calendarOptions = (): OptionItem[] => CALENDARS.map((c) => ({ value: c.id, label: c.name }))
export const statusLabelOptions = (): OptionItem[] =>
  STATUS_LABELS.map((s) => ({ value: s, label: s }))

export function caseFieldOptions(types?: CaseFieldType[]) {
  return (ctx: SchemaContext): OptionItem[] =>
    ctx.caseFields
      .filter((f) => !types || types.includes(f.type))
      .map((f) => ({ value: f.key, label: f.label, group: f.producedBy }))
}

export const stageOptions = (ctx: SchemaContext): OptionItem[] =>
  ctx.workflow.stageIds
    .map((id) => ctx.workflow.stages[id])
    .filter(Boolean)
    .map((s) => ({ value: s.id, label: s.name }))

export const otherNodeOptions = (ctx: SchemaContext): OptionItem[] =>
  Object.values(ctx.stage.nodes)
    .filter((n) => n.id !== ctx.node.id)
    .map((n) => ({ value: n.id, label: n.name }))

export const opt = (values: [string, string][]): OptionItem[] =>
  values.map(([value, label]) => ({ value, label }))
