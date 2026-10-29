'use client'

import React, { useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Info, Plus, Trash2, X } from 'lucide-react'
import type { FieldSchema, OptionItem, SchemaContext } from '@/lib/registry/types'
import { findIntegration, QUESTIONNAIRES } from '@/lib/library'
import { CUSTOM_PREFIX, customText, isCustom } from '@/lib/registry/shared'
import type { DurationUnit, Recipient } from '@/types/workflow'
import { btnIcon, btnLink, helpText, inputSmall, labelBase, textareaBase } from '@/components/ui/styles'
import { RecipientsEditor } from '../RecipientsEditor'
import { BranchesEditor } from './BranchesEditor'
import { SetRowsEditor, type SetRow } from './SetRowsEditor'
import { Toggle } from './Toggle'
import { getPath } from './routing'
import { Checkbox, Radio } from '@/components/ui/Choice'

const DEFAULT_UNITS: OptionItem[] = [
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'businessDays', label: 'Business days' },
  { value: 'calendarDays', label: 'Calendar days' },
]

function resolveOptions(field: FieldSchema, ctx: SchemaContext, scope: Record<string, unknown>): OptionItem[] {
  if (!field.options) return []
  return typeof field.options === 'function' ? field.options(ctx, scope) : field.options
}

const asArr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])

function grouped(options: OptionItem[]) {
  const groups = new Map<string, OptionItem[]>()
  for (const o of options) groups.set(o.group ?? '', [...(groups.get(o.group ?? '') ?? []), o])
  return [...groups.entries()]
}

const CUSTOM_CHOICE = '__custom__'

const OptionList: React.FC<{ options: OptionItem[] }> = ({ options }) => (
  <>
    {grouped(options).map(([group, items]) =>
      group ? (
        <optgroup key={group} label={group}>
          {items.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </optgroup>
      ) : (
        items.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))
      )
    )}
  </>
)

interface Props {
  field: FieldSchema
  scope: Record<string, unknown>
  ctx: SchemaContext
  onChange: (path: string, value: unknown) => void
  /** Anchor id prefix; top-level config fields use "config" */
  anchor?: string
  highlighted?: boolean
}

/**
 * FieldRenderer — Organism
 * Renders one schema field by kind. Every node form is built from these.
 * Used in: NodeForm
 */
export const FieldRenderer: React.FC<Props> = ({ field, scope, ctx, onChange, anchor, highlighted }) => {
  if (field.showIf && !field.showIf(scope, ctx)) return null
  const value = getPath(scope, field.key)
  const id = anchor ? `field-${anchor}:${field.key}` : undefined
  const options = resolveOptions(field, ctx, scope)
  const set = (v: unknown) => onChange(field.key, v)
  const missing =
    field.required &&
    (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0))

  const label = field.label ? (
    <label className={labelBase} htmlFor={id ? `${id}-input` : undefined}>
      {field.label}
      {field.required && <span className="text-red-600"> *</span>}
    </label>
  ) : null

  const inputId = id ? `${id}-input` : undefined
  const errorRing = missing ? 'border-red-300 hover:border-red-300 focus:border-red-400 focus:ring-red-100' : ''

  let control: React.ReactNode = null
  switch (field.kind) {
    case 'text':
      control = (
        <>
          <input
            id={inputId}
            className={`${inputSmall} ${errorRing}`}
            value={String(value ?? '')}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            onChange={(e) => set(e.target.value)}
          />
        </>
      )
      break
    case 'textarea':
      control = (
        <>
          <textarea
            id={inputId}
            className={`${textareaBase} text-xs ${errorRing}`}
            value={String(value ?? '')}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            onChange={(e) => set(e.target.value)}
          />
          {field.maxLength && (
            <p className="text-[11px] text-[#94a3b8] text-right mt-0.5">
              {String(value ?? '').length}/{field.maxLength.toLocaleString()}
            </p>
          )}
        </>
      )
      break
    case 'number':
      control = (
        <input
          id={inputId}
          type="number"
          className={`${inputSmall} !w-32 ${errorRing}`}
          min={field.min}
          max={field.max}
          placeholder={field.placeholder}
          value={value === undefined || value === null ? '' : String(value)}
          onChange={(e) => set(e.target.value === '' ? null : Number(e.target.value))}
        />
      )
      break
    case 'time':
      control = <input id={inputId} type="time" className={`${inputSmall} !w-32`} value={String(value ?? '')} onChange={(e) => set(e.target.value)} />
      break
    case 'toggle':
      return (
        <div id={id} className={`py-0.5 ${highlighted ? 'field-flash' : ''}`}>
          <Toggle label={field.label} checked={!!value} onChange={set} />
          {field.help && <p className={helpText}>{field.help}</p>}
        </div>
      )
    case 'select': {
      const custom = isCustom(value)
      const known = !value || custom || options.some((o) => o.value === value)
      control = (
        <div className="flex flex-col gap-2">
          <select
            id={inputId}
            className={`${inputSmall} ${errorRing}`}
            value={custom ? CUSTOM_CHOICE : String(value ?? '')}
            onChange={(e) => set(e.target.value === CUSTOM_CHOICE ? CUSTOM_PREFIX : e.target.value)}
          >
            <option value="">{field.placeholder ?? 'Choose…'}</option>
            {!known && <option value={String(value)}>No longer available</option>}
            <OptionList options={options} />
            {field.allowCustom && <option value={CUSTOM_CHOICE}>+ Add your own…</option>}
          </select>
          {custom && (
            <input
              aria-label={`${field.label}: your own`}
              className={`${inputSmall} ${errorRing}`}
              value={customText(value)}
              maxLength={80}
              placeholder="Type your own"
              autoFocus={customText(value) === ''}
              onChange={(e) => set(CUSTOM_PREFIX + e.target.value)}
            />
          )}
        </div>
      )
      break
    }
    case 'caseFieldSelect': {
      const known = !value || options.some((o) => o.value === value)
      control = (
        <select id={inputId} className={`${inputSmall} ${errorRing} ${known ? '' : 'border-red-400'}`} value={String(value ?? '')} onChange={(e) => set(e.target.value)}>
          <option value="">{field.placeholder ?? 'Choose…'}</option>
          {!known && <option value={String(value)}>A removed field</option>}
          <OptionList options={options} />
        </select>
      )
      break
    }
    case 'radio':
      control = (
        <div role="radiogroup" aria-label={field.label} className="flex flex-col gap-1.5">
          {options.map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-xs text-[#0d212c] cursor-pointer">
              <Radio name={`${id}-${field.key}`} checked={value === o.value} onChange={() => set(o.value)} />
              {o.label}
            </label>
          ))}
        </div>
      )
      break
    case 'multiselect':
    case 'caseFieldMulti': {
      const selected = asArr<string>(value)
      const missingKeys = selected.filter((s) => !options.some((o) => o.value === s))
      control = (
        <div className={`flex flex-col gap-1 max-h-56 overflow-y-auto rounded-lg border p-2 ${missing ? 'border-red-300' : 'border-[#e2e8f0]'}`}>
          {missingKeys.map((k) => (
            <span key={k} className="flex items-center justify-between text-xs text-red-600 px-1">
              A removed field
              <button className={btnIcon} aria-label="Remove" onClick={() => set(selected.filter((s) => s !== k))}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {grouped(options).map(([group, items]) => (
            <div key={group || 'all'} className="flex flex-col gap-1">
              {group && <span className="text-[10px] font-medium text-[#94a3b8] uppercase tracking-[0.06em] px-1 pt-1">{group}</span>}
              {items.map((o) => (
                <label key={o.value} className="flex items-center gap-2 text-xs text-[#0d212c] px-1 py-0.5 rounded hover:bg-slate-50 cursor-pointer">
                  <Checkbox
                    checked={selected.includes(o.value)}
                    onChange={(e) => set(e.target.checked ? [...selected, o.value] : selected.filter((s) => s !== o.value))}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          ))}
        </div>
      )
      break
    }
    case 'orderedMultiselect': {
      const selected = asArr<string>(value)
      const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? 'A removed field'
      const move = (i: number, d: number) => {
        const next = [...selected]
        ;[next[i], next[i + d]] = [next[i + d], next[i]]
        set(next)
      }
      control = (
        <div className="flex flex-col gap-1.5">
          <ol className="flex flex-col gap-1">
            {selected.map((v, i) => (
              <li
                key={v}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/order', String(i))}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const from = Number(e.dataTransfer.getData('text/order'))
                  if (Number.isNaN(from) || from === i) return
                  const next = [...selected]
                  const [m] = next.splice(from, 1)
                  next.splice(i, 0, m)
                  set(next)
                }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-[#e2e8f0] bg-white text-xs cursor-grab"
              >
                <span className="text-[11px] text-[#94a3b8] w-4">{i + 1}.</span>
                <span className={`flex-1 ${options.some((o) => o.value === v) ? '' : 'text-red-600'}`}>{labelOf(v)}</span>
                <button className={btnIcon} aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button className={btnIcon} aria-label="Move down" disabled={i === selected.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown className="w-3 h-3" />
                </button>
                <button className={btnIcon} aria-label="Remove" onClick={() => set(selected.filter((s) => s !== v))}>
                  <X className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ol>
          <select
            aria-label={`Add to ${field.label}`}
            className={inputSmall}
            value=""
            onChange={(e) => e.target.value && set([...selected, e.target.value])}
          >
            <option value="">+ Add…</option>
            <OptionList options={options.filter((o) => !selected.includes(o.value))} />
          </select>
        </div>
      )
      break
    }
    case 'recipients':
      control = (
        <RecipientsEditor
          value={asArr<Recipient>(value)}
          onChange={set}
          kinds={field.recipientKinds}
          caseFields={ctx.caseFields}
          invalid={!!missing}
        />
      )
      break
    case 'duration': {
      const d = (value as { value: number | null; unit: DurationUnit }) ?? { value: null, unit: 'businessDays' }
      control = (
        <div className="flex items-center gap-2">
          <input
            type="number"
            aria-label={`${field.label} amount`}
            min={0}
            className={`${inputSmall} !w-24`}
            value={d.value ?? ''}
            onChange={(e) => set({ ...d, value: e.target.value === '' ? null : Number(e.target.value) })}
          />
          <select aria-label={`${field.label} unit`} className={inputSmall} value={d.unit} onChange={(e) => set({ ...d, unit: e.target.value })}>
            {(field.units ?? DEFAULT_UNITS).map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      )
      break
    }
    case 'note': {
      const text = typeof field.text === 'function' ? field.text(scope, ctx) : field.text
      control = (
        <p className="flex items-start gap-2 text-[11px] text-[#475569] bg-slate-50 rounded-lg px-2.5 py-2 leading-relaxed">
          <Info className="w-3.5 h-3.5 shrink-0 mt-px text-[#94a3b8]" aria-hidden="true" />
          {text}
        </p>
      )
      break
    }
    case 'list':
      control = <ListEditor field={field} items={asArr<Record<string, unknown>>(value)} ctx={ctx} onChange={set} />
      break
    case 'branches':
      control = <BranchesEditor value={asArr(value)} onChange={set} caseFields={ctx.caseFields} />
      break
    case 'setRows':
      control = <SetRowsEditor value={asArr<SetRow>(value)} onChange={set} caseFields={ctx.caseFields} />
      break
    case 'integrationFields': {
      const integration = findIntegration(scope.integrationId)
      const values = (value as Record<string, string>) ?? {}
      control = integration ? (
        <div className="flex flex-col gap-2.5">
          {integration.fields.map((f) => (
            <div key={f.key}>
              <label className={labelBase}>{f.label}</label>
              {f.type === 'dropdown' ? (
                <select className={inputSmall} value={values[f.key] ?? ''} onChange={(e) => set({ ...values, [f.key]: e.target.value })}>
                  <option value="">Choose…</option>
                  {f.options?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input className={inputSmall} value={values[f.key] ?? ''} onChange={(e) => set({ ...values, [f.key]: e.target.value })} />
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-[#94a3b8]">Choose an integration to see its settings.</p>
      )
      break
    }
    case 'questionnairePreview':
      control = <QuestionnairePreview minQuestions={Number(scope.minQuestions ?? 1)} />
      break
  }

  return (
    <div id={id} className={`scroll-mt-4 rounded-lg ${highlighted ? 'field-flash' : ''}`}>
      {label}
      {control}
      {missing && field.kind !== 'list' && <p className="text-[11px] text-red-600 mt-1">{field.label || 'This field'} is required.</p>}
      {field.help && <p className={helpText}>{field.help}</p>}
    </div>
  )
}

/** Repeatable items; each item is rendered with the same FieldRenderer. */
const ListEditor: React.FC<{
  field: FieldSchema
  items: Record<string, unknown>[]
  ctx: SchemaContext
  onChange: (items: Record<string, unknown>[]) => void
}> = ({ field, items, ctx, onChange }) => {
  const [open, setOpen] = useState<Record<number, boolean>>({})
  const schema = field.itemSchema ?? []
  const simple = schema.length === 1 && schema[0].kind === 'text'
  const update = (i: number, path: string, v: unknown) =>
    onChange(items.map((item, idx) => (idx === i ? setDeep(item, path, v) : item)))
  const tooFew = field.minItems !== undefined && items.length < field.minItems

  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 && <p className="text-[11px] text-[#94a3b8]">None yet.</p>}
      {items.map((item, i) =>
        simple ? (
          <div key={i} className="flex items-center gap-2">
            <input
              aria-label={`${schema[0].label} ${i + 1}`}
              className={inputSmall}
              value={String(item[schema[0].key] ?? '')}
              onChange={(e) => update(i, schema[0].key, e.target.value)}
            />
            <button className={`${btnIcon} hover:!text-red-600`} aria-label="Remove" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div key={String(item.id ?? i)} className="rounded-xl border border-[#e2e8f0] bg-white">
            <div className="flex items-center gap-1 px-2 py-1.5">
              <button
                className="flex-1 flex items-center gap-1.5 text-left text-xs font-semibold text-[#0d212c] py-1 px-1 cursor-pointer min-w-0"
                aria-expanded={!!open[i]}
                onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}
              >
                {open[i] ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                <span className="truncate">{field.itemTitle?.(item, i) ?? `${field.label} ${i + 1}`}</span>
              </button>
              <button
                className={btnIcon}
                aria-label="Move up"
                disabled={i === 0}
                onClick={() => {
                  const next = [...items]
                  ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
                  onChange(next)
                }}
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                className={btnIcon}
                aria-label="Move down"
                disabled={i === items.length - 1}
                onClick={() => {
                  const next = [...items]
                  ;[next[i + 1], next[i]] = [next[i], next[i + 1]]
                  onChange(next)
                }}
              >
                <ArrowDown className="w-3 h-3" />
              </button>
              <button
                className={`${btnIcon} hover:!text-red-600`}
                aria-label="Remove"
                disabled={field.minItems !== undefined && items.length <= field.minItems}
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {open[i] && (
              <div className="px-3 pb-3 pt-1 flex flex-col gap-3 border-t border-[#f1f5f9]">
                {schema.map((f) => (
                  <FieldRenderer key={f.key} field={f} scope={item} ctx={ctx} onChange={(p, v) => update(i, p, v)} />
                ))}
              </div>
            )}
          </div>
        )
      )}
      {tooFew && <p className="text-[11px] text-red-600">Add at least {field.minItems}.</p>}
      {field.newItem && (
        <button
          className={`${btnLink} self-start`}
          onClick={() => {
            onChange([...items, field.newItem!()])
            setOpen((o) => ({ ...o, [items.length]: true }))
          }}
        >
          <Plus className="w-3.5 h-3.5" /> {field.addLabel ?? 'Add'}
        </button>
      )}
    </div>
  )
}

function setDeep(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const [head, ...rest] = path.split('.')
  if (rest.length === 0) return { ...obj, [head]: value }
  return { ...obj, [head]: setDeep((obj[head] as Record<string, unknown>) ?? {}, rest.join('.'), value) }
}

/** Shows how the questionnaire selector looks to the assignee: pick one, tick questions. */
const QuestionnairePreview: React.FC<{ minQuestions: number }> = ({ minQuestions }) => {
  const [qid, setQid] = useState(QUESTIONNAIRES[0]?.id ?? '')
  const [ticked, setTicked] = useState<string[]>([])
  const q = QUESTIONNAIRES.find((x) => x.id === qid)
  return (
    <div className="rounded-lg border border-dashed border-[#cbd5e1] bg-slate-50 p-2.5 flex flex-col gap-2">
      <select aria-label="Preview questionnaire" className={inputSmall} value={qid} onChange={(e) => { setQid(e.target.value); setTicked([]) }}>
        {QUESTIONNAIRES.map((x) => (
          <option key={x.id} value={x.id}>
            {x.name}
          </option>
        ))}
      </select>
      <ul className="flex flex-col gap-1">
        {q?.questions.map((qq) => (
          <li key={qq.id}>
            <label className="flex items-start gap-2 text-[11px] text-[#0d212c] cursor-pointer">
              <Checkbox className="mt-0.5"
                checked={ticked.includes(qq.id)}
                onChange={(e) => setTicked((t) => (e.target.checked ? [...t, qq.id] : t.filter((x) => x !== qq.id)))}
              />
              {qq.text}
            </label>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-[#64748b]">
        {ticked.length} selected · at least {minQuestions} required · {q?.description}
      </p>
    </div>
  )
}

