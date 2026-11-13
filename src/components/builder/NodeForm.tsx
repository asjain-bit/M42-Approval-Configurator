'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, CircleAlert, CircleHelp, Copy, Lock, Plus, Trash2, X } from 'lucide-react'
import { categoryOf, getNodeType, nodeView, slaKind } from '@/lib/registry/nodes'
import { asArray, customActionsSection, customText, eventNotificationsSection, humanSla, isCustom } from '@/lib/registry/shared'
import type { SchemaContext, SectionSchema } from '@/lib/registry/types'
import type { SlaConfig, WorkflowNode } from '@/types/workflow'
import type { Issue } from '@/lib/workflow/validation'
import { btnIcon, inputSmall, labelBase, textareaBase } from '@/components/ui/styles'
import { FieldRenderer } from './fields/FieldRenderer'
import { RoutingContext, type RoutingApi } from './fields/routing'
import { ThenGoTo } from './fields/ThenGoTo'
import { SlaBlock } from './SlaBlock'

export type NodeChange = {
  /** Plain-language name of what changed, for the audit log */
  what: string
  coalesceKey?: string
  before?: string
  after?: string
  renamed?: boolean
}

interface Props {
  node: WorkflowNode
  ctx: SchemaContext
  routing: RoutingApi
  focusField: string | null
  focusTick: number
  /** Errors to fix in this step; each one points at the field where it is fixed */
  issues?: Issue[]
  /** The step is still being set up: hold back red error marks until the admin moves on */
  quiet?: boolean
  onGoToIssue?: (issue: Issue) => void
  onChange: (next: WorkflowNode, change: NodeChange) => void
  onDelete: () => void
  onDuplicate: () => void
  onDismissToConfirm: (index: number) => void
}

const describeValue = (v: unknown): string | undefined => {
  if (v === undefined || v === null || v === '') return undefined
  if (typeof v === 'string' || typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return v ? 'On' : 'Off'
  return undefined
}

const Section: React.FC<{ id: string; title: string; open: boolean; onToggle: () => void; onRemove?: () => void; children: React.ReactNode }> = ({
  id,
  title,
  open,
  onToggle,
  onRemove,
  children,
}) => (
  <section className="border-b border-[#f1f5f9] group/sec" aria-labelledby={`sec-${id}`}>
    <div className="flex items-center hover:bg-slate-50">
      <button
        id={`sec-${id}`}
        className="flex-1 flex items-center gap-1.5 px-4 py-3 text-xs font-semibold text-[#0d212c] cursor-pointer"
        aria-expanded={open}
        onClick={onToggle}
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        {title}
      </button>
      {onRemove && (
        <button
          className="mr-3 p-1 rounded-md text-[#94a3b8] opacity-0 group-hover/sec:opacity-100 focus:opacity-100 hover:text-red-600 hover:bg-red-50 cursor-pointer"
          aria-label={`Remove ${title} from this step`}
          title={`Remove “${title}” from this step`}
          onClick={onRemove}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
    {open && <div className="px-4 pb-4 flex flex-col gap-3.5">{children}</div>}
  </section>
)

/**
 * NodeForm — Organism
 * Right-hand configuration form for a node, generated from its registry definition.
 * Used in: StageBuilder
 */
export const NodeForm: React.FC<Props> = ({
  node,
  ctx,
  routing,
  focusField,
  focusTick,
  issues = [],
  quiet,
  onGoToIssue,
  onChange,
  onDelete,
  onDuplicate,
  onDismissToConfirm,
}) => {
  const def = getNodeType(node.type)
  const cat = categoryOf(def.category)
  const view = nodeView(node)
  const Icon = view.icon
  const sla = slaKind(def, node)
  const sections: SectionSchema[] = def.configSchema
  const [closed, setClosed] = useState<Record<string, boolean>>(() => Object.fromEntries(sections.filter((s) => s.collapsed).map((s) => [s.id, true])))
  const scrollRef = useRef<HTMLDivElement>(null)

  // Bring the requested field into view (validation "Go to", edge selection)
  useEffect(() => {
    if (!focusField) return
    setClosed({})
    const t = setTimeout(() => {
      const el = document.getElementById(`field-${focusField}`)
      if (!el) return
      el.querySelector<HTMLElement>('input, select, textarea')?.focus({ preventScroll: true })
      el.scrollIntoView({ block: 'center' })
      el.classList.remove('field-flash')
      void el.offsetWidth
      el.classList.add('field-flash')
    }, 120)
    return () => clearTimeout(t)
  }, [focusField, focusTick, node.id])

  // Mark every field that has an error so it is clear where each issue is
  const issueFields = issues.map((i) => i.field).filter(Boolean).join('|')
  useEffect(() => {
    const marked = issueFields
      ? issueFields
          .split('|')
          .map((f) => document.getElementById(`field-${f}`))
          .filter((el): el is HTMLElement => !!el)
      : []
    marked.forEach((el) => el.classList.add('field-error'))
    return () => marked.forEach((el) => el.classList.remove('field-error'))
  })

  const nameTaken = Object.values(ctx.stage.nodes).some(
    (n) => n.id !== node.id && n.name.trim().toLowerCase() === node.name.trim().toLowerCase()
  )

  const setConfig = (path: string, value: unknown, fieldLabel: string) => {
    const before = path.split('.').reduce<unknown>((a, k) => (a as Record<string, unknown>)?.[k], node.config)
    const config = setDeep(node.config, path, value)
    const next = def.onConfigChange?.(node, { ...node, config }, path) ?? { ...node, config }
    // A value the admin typed in themselves is logged as added manually
    const manual = isCustom(value)
    onChange(next, {
      what: manual ? `${fieldLabel} (added manually)` : fieldLabel,
      coalesceKey: `${node.id}:${path}`,
      before: isCustom(before) ? customText(before) : describeValue(before),
      after: manual ? customText(value) : describeValue(value),
    })
  }

  const toggle = (id: string) => setClosed((c) => ({ ...c, [id]: !c[id] }))

  // Sections the admin removed from this step, and extras they added to it
  const hidden = asArray<string>(node.config.hiddenSections)
  const added = asArray<string>(node.config.addedFeatures)
  const shows = (id: string, builtIn: boolean) => (builtIn && !hidden.includes(id)) || added.includes(id)
  const titleOf = (id: string) =>
    ({ sla: 'Deadline and reminders', notifications: 'Email notifications', customActions: 'Custom actions' })[id] ??
    sections.find((x) => x.id === id)?.title ??
    id
  const removeSection = (id: string) =>
    onChange(
      {
        ...node,
        config: {
          ...node.config,
          hiddenSections: hidden.includes(id) ? hidden : [...hidden, id],
          addedFeatures: added.filter((a) => a !== id),
        },
        ...(id === 'sla' && node.sla ? { sla: { ...node.sla, enabled: false } } : {}),
      },
      { what: `Removed “${titleOf(id)}”` }
    )
  const addSection = (id: string) => {
    const next: WorkflowNode = {
      ...node,
      config: { ...node.config, hiddenSections: hidden.filter((h) => h !== id), addedFeatures: added.includes(id) ? added : [...added, id] },
    }
    if (id === 'sla' && !node.sla) next.sla = def.defaultSla?.() ?? humanSla()
    if (id === 'sla' && next.sla && !next.sla.enabled) next.sla = { ...next.sla, enabled: true }
    onChange(next, { what: `Added “${titleOf(id)}”` })
    setClosed((c) => ({ ...c, [id]: false }))
    setAddOpen(false)
  }
  const [addOpen, setAddOpen] = useState(false)
  const builtInSla = !!sla
  const addable = [
    ...sections.filter((x) => hidden.includes(x.id) && (!x.showIf || x.showIf(node.config, ctx))).map((x) => x.id),
    ...(!shows('sla', builtInSla) ? ['sla'] : []),
    ...(!shows('notifications', !!def.eventNotifications) ? ['notifications'] : []),
    ...(!shows('customActions', false) ? ['customActions'] : []),
  ]

  return (
    <RoutingContext.Provider value={routing}>
      <div className={`flex flex-col h-full min-h-0 ${quiet ? 'quiet-issues' : ''}`}>
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-[#e2e8f0] flex items-start gap-3">
          <span className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${view.accent}`}>
            <Icon className="w-4.5 h-4.5" aria-hidden="true" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-medium text-[#64748b] uppercase tracking-[0.06em]">
              {cat.label} · {view.label}
            </div>
            <div className="text-sm font-semibold text-[#0d212c] truncate">{node.name || 'Untitled node'}</div>
          </div>
          <button className={btnIcon} aria-label="Duplicate node" title="Duplicate node" onClick={onDuplicate}>
            <Copy className="w-4 h-4" />
          </button>
          <button className={`${btnIcon} hover:!text-red-600 hover:!bg-red-50`} aria-label="Delete node" title="Delete node" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {/* Issues in this step, each linking to the field where it is fixed */}
          {issues.length > 0 && (
            <div className="m-4 mb-1 rounded-xl border border-red-200 bg-red-50 p-3 flex flex-col gap-2" role="alert">
              <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
                <CircleAlert className="w-4 h-4" aria-hidden="true" /> {issues.length === 1 ? '1 issue' : `${issues.length} issues`} to fix in this step
              </p>
              {issues.map((i) => (
                <button
                  key={i.id}
                  className="text-left text-[11px] leading-relaxed text-red-800 hover:underline cursor-pointer"
                  onClick={() => onGoToIssue?.(i)}
                >
                  {i.message.replace(/^Step "[^"]*": /, '').replace(/^"[^"]*": /, '')}
                  {i.field && <span className="font-semibold"> · Show me</span>}
                </button>
              ))}
            </div>
          )}

          {/* To confirm notice */}
          {(node.toConfirm ?? []).length > 0 && (
            <div id="field-toConfirm" className="m-4 mb-1 rounded-xl border border-[#fde8b3] bg-[#fef7e0] p-3 flex flex-col gap-2">
              <p className="text-xs font-semibold text-[#b06000] flex items-center gap-1.5">
                <CircleHelp className="w-4 h-4" aria-hidden="true" /> To confirm
              </p>
              {node.toConfirm!.map((t, i) => (
                <div key={i} className="flex items-start justify-between gap-2 text-[11px] leading-relaxed text-[#7a4300]">
                  <span>{t}</span>
                  <button className="font-semibold underline cursor-pointer shrink-0" onClick={() => onDismissToConfirm(i)}>
                    Mark as decided
                  </button>
                </div>
              ))}
            </div>
          )}

          <Section id="general" title="Basics" open={!closed.general} onToggle={() => toggle('general')}>
            <div id="field-name" className="rounded-lg">
              <label className={labelBase} htmlFor="node-name">
                Name <span className="text-red-600">*</span>
              </label>
              <input
                id="node-name"
                className={`${inputSmall} ${!node.name.trim() || nameTaken ? 'border-red-300' : ''}`}
                value={node.name}
                maxLength={80}
                onChange={(e) =>
                  onChange(
                    { ...node, name: e.target.value },
                    { what: 'Name', coalesceKey: `${node.id}:name`, before: node.name, after: e.target.value, renamed: true }
                  )
                }
              />
              {!node.name.trim() && <p className="text-[11px] text-red-600 mt-1">Give this step a name.</p>}
              {nameTaken && <p className="text-[11px] text-red-600 mt-1">Another step in this stage has this name.</p>}
            </div>
            <div>
              <label className={labelBase} htmlFor="node-desc">
                Description
              </label>
              <textarea
                id="node-desc"
                className={`${textareaBase} text-xs min-h-[64px]`}
                value={node.description ?? ''}
                onChange={(e) =>
                  onChange(
                    { ...node, description: e.target.value },
                    { what: 'Description', coalesceKey: `${node.id}:description`, before: node.description, after: e.target.value }
                  )
                }
              />
            </div>
          </Section>

          {sections.map((section) =>
            (section.showIf && !section.showIf(node.config, ctx)) || hidden.includes(section.id) ? null : (
              <Section key={section.id} id={section.id} title={section.title} open={!closed[section.id]} onToggle={() => toggle(section.id)} onRemove={() => removeSection(section.id)}>
                {section.fields.map((f) => (
                  <FieldRenderer
                    key={f.key}
                    field={f}
                    scope={node.config}
                    ctx={ctx}
                    anchor="config"
                    highlighted={focusField === `config:${f.key}`}
                    onChange={(path, v) => setConfig(path, v, f.label || section.title)}
                  />
                ))}
              </Section>
            )
          )}

          {node.outcomes.length > 0 && (
            <Section id="outcomes" title={def.key === 'step' ? 'Step 2 · Where each result leads' : 'Where each result leads'} open={!closed.outcomes} onToggle={() => toggle('outcomes')}>
              {(routing.missing?.length ?? 0) > 0 && (
                <div className="rounded-xl border border-[#fde8b3] bg-[#fef7e0] p-2.5 flex items-start gap-2 text-[11px] leading-relaxed text-[#7a4300]">
                  <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    Fill in the mandatory fields to choose the next step: <strong>{routing.missing!.join(', ')}</strong>.
                  </span>
                </div>
              )}
              <ul className="flex flex-col gap-2">
                {node.outcomes.map((o) => (
                  <li
                    key={o.id}
                    id={`field-outcome:${o.id}`}
                    className={`rounded-xl border p-2.5 ${
                      focusField === `outcome:${o.id}` ? 'border-[#dde3ea] bg-slate-50' : 'border-[#e2e8f0]'
                    }`}
                  >
                    <div className="text-xs text-[#64748b] mb-1.5">
                      If the result is <span className="font-semibold text-[#0d212c]">“{o.label}”</span>
                    </div>
                    <ThenGoTo outcomeKey={o.key} compact />
                  </li>
                ))}
              </ul>
              {def.outcomesNote && <p className="text-[11px] text-[#64748b]">{def.outcomesNote}</p>}
            </Section>
          )}

          {shows('sla', builtInSla) ? (
            <Section id="sla" title={sla === 'agent' ? 'Time limit for the agent' : 'Deadline and reminders'} open={!closed.sla} onToggle={() => toggle('sla')} onRemove={() => removeSection('sla')}>
              <div id="field-sla" className="rounded-lg">
                <SlaBlock
                  node={node}
                  stage={ctx.stage}
                  agent={sla === 'agent'}
                  defaultReminderTime={ctx.workflow.settings.defaultReminderTime}
                  caseFields={ctx.caseFields}
                  onChange={(sla: SlaConfig, what) =>
                    onChange({ ...node, sla }, { what, coalesceKey: `${node.id}:sla:${what}` })
                  }
                />
              </div>
            </Section>
          ) : null}
          {shows('notifications', !!def.eventNotifications) && (
            <Section id="notifications" title={eventNotificationsSection.title} open={!closed.notifications} onToggle={() => toggle('notifications')} onRemove={() => removeSection('notifications')}>
              {eventNotificationsSection.fields.map((f) => (
                <FieldRenderer
                  key={f.key}
                  field={f}
                  scope={node.config}
                  ctx={ctx}
                  anchor="config"
                  highlighted={focusField === `config:${f.key}`}
                  onChange={(path, v) => setConfig(path, v, f.label)}
                />
              ))}
            </Section>
          )}
          {shows('customActions', false) && (
            <Section id="customActions" title={customActionsSection.title} open={!closed.customActions} onToggle={() => toggle('customActions')} onRemove={() => removeSection('customActions')}>
              {customActionsSection.fields.map((f) => (
                <FieldRenderer
                  key={f.key}
                  field={f}
                  scope={node.config}
                  ctx={ctx}
                  anchor="config"
                  highlighted={focusField === `config:${f.key}`}
                  onChange={(path, v) => setConfig(path, v, f.label)}
                />
              ))}
            </Section>
          )}

          {/* Add more to this step */}
          {addable.length > 0 && (
            <div className="p-4">
              <button
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#cbd5e1] py-2.5 text-xs font-semibold text-[#0f8a93] hover:bg-[#f0fbfc] hover:border-[#36c0c9] cursor-pointer"
                aria-expanded={addOpen}
                onClick={() => setAddOpen((o) => !o)}
              >
                <Plus className="w-3.5 h-3.5" /> Add to this step
              </button>
              {addOpen && (
                <ul className="mt-2 rounded-xl border border-[#e2e8f0] bg-white shadow-sm overflow-hidden">
                  {addable.map((id) => (
                    <li key={id}>
                      <button
                        className="w-full text-left px-3 py-2.5 text-xs text-[#0d212c] hover:bg-slate-50 cursor-pointer flex flex-col"
                        onClick={() => addSection(id)}
                      >
                        <span className="font-medium">{titleOf(id)}</span>
                        <span className="text-[11px] text-[#64748b]">
                          {
                            ({
                              sla: 'Set a deadline, reminders and what happens if it is missed.',
                              notifications: 'Email people when the step starts, a decision is made or it is overdue.',
                              customActions: 'Add your own action, like sending an email or updating a field.',
                            } as Record<string, string>)[id] ?? 'Put this back on the step.'
                          }
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </RoutingContext.Provider>
  )
}

function setDeep(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const [head, ...rest] = path.split('.')
  if (rest.length === 0) return { ...obj, [head]: value }
  return { ...obj, [head]: setDeep((obj[head] as Record<string, unknown>) ?? {}, rest.join('.'), value) }
}
