'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, CircleHelp, Copy, Trash2 } from 'lucide-react'
import { categoryOf, getNodeType, nodeView, slaKind } from '@/lib/registry/nodes'
import { eventNotificationsSection } from '@/lib/registry/shared'
import type { SchemaContext, SectionSchema } from '@/lib/registry/types'
import type { SlaConfig, WorkflowNode } from '@/types/workflow'
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

const Section: React.FC<{ id: string; title: string; open: boolean; onToggle: () => void; children: React.ReactNode }> = ({
  id,
  title,
  open,
  onToggle,
  children,
}) => (
  <section className="border-b border-[#f1f5f9]" aria-labelledby={`sec-${id}`}>
    <button
      id={`sec-${id}`}
      className="w-full flex items-center gap-1.5 px-4 py-3 text-xs font-semibold text-[#0d212c] cursor-pointer hover:bg-slate-50"
      aria-expanded={open}
      onClick={onToggle}
    >
      {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      {title}
    </button>
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

  const nameTaken = Object.values(ctx.stage.nodes).some(
    (n) => n.id !== node.id && n.name.trim().toLowerCase() === node.name.trim().toLowerCase()
  )

  const setConfig = (path: string, value: unknown, fieldLabel: string) => {
    const before = path.split('.').reduce<unknown>((a, k) => (a as Record<string, unknown>)?.[k], node.config)
    const config = setDeep(node.config, path, value)
    const next = def.onConfigChange?.(node, { ...node, config }, path) ?? { ...node, config }
    onChange(
      next,
      { what: fieldLabel, coalesceKey: `${node.id}:${path}`, before: describeValue(before), after: describeValue(value) }
    )
  }

  const toggle = (id: string) => setClosed((c) => ({ ...c, [id]: !c[id] }))

  return (
    <RoutingContext.Provider value={routing}>
      <div className="flex flex-col h-full min-h-0">
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

          <Section id="general" title="General" open={!closed.general} onToggle={() => toggle('general')}>
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
            section.showIf && !section.showIf(node.config, ctx) ? null : (
              <Section key={section.id} id={section.id} title={section.title} open={!closed[section.id]} onToggle={() => toggle(section.id)}>
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
            <Section id="outcomes" title="Connect the outcomes" open={!closed.outcomes} onToggle={() => toggle('outcomes')}>
              <ul className="flex flex-col gap-2">
                {node.outcomes.map((o) => (
                  <li
                    key={o.id}
                    id={`field-outcome:${o.id}`}
                    className={`rounded-xl border p-2.5 ${
                      focusField === `outcome:${o.id}` ? 'border-[#dde3ea] bg-slate-50' : 'border-[#e2e8f0]'
                    }`}
                  >
                    <div className="text-xs font-semibold text-[#0d212c] mb-1.5">{o.label}</div>
                    <ThenGoTo outcomeKey={o.key} compact />
                  </li>
                ))}
              </ul>
              {def.outcomesNote && <p className="text-[11px] text-[#64748b]">{def.outcomesNote}</p>}
            </Section>
          )}

          {sla && (
            <Section id="sla" title={sla === 'agent' ? 'Run timeout' : 'SLA and reminders'} open={!closed.sla} onToggle={() => toggle('sla')}>
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
          )}
          {def.eventNotifications && (
            <Section id="notifications" title={eventNotificationsSection.title} open={!closed.notifications} onToggle={() => toggle('notifications')}>
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
