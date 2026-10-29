'use client'

import React from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react'
import { newId } from '@/lib/id'
import { groupText, isRuleGroup, OPERATOR_LABELS } from '@/lib/workflow/describe'
import type { CaseField, CaseFieldType, Rule, RuleGroup, RuleOperator } from '@/types/workflow'
import { btnIcon, btnLink, inputSmall } from '@/components/ui/styles'
import { ThenGoTo } from './ThenGoTo'
import { useRouting } from './routing'
import { Checkbox } from '@/components/ui/Choice'

interface Branch {
  id: string
  label: string
  rules: RuleGroup
}

const OPS_BY_TYPE: Record<string, RuleOperator[]> = {
  text: ['is', 'isNot', 'contains', 'isEmpty', 'isNotEmpty'],
  choice: ['is', 'isNot', 'isAnyOf', 'isNoneOf', 'isEmpty', 'isNotEmpty'],
  yesNo: ['is', 'isNot'],
  number: ['is', 'isNot', 'gt', 'gte', 'lt', 'lte'],
  percent: ['is', 'gt', 'gte', 'lt', 'lte'],
  date: ['gt', 'lt', 'isEmpty', 'isNotEmpty'],
  count: ['is', 'isNot', 'gt', 'gte', 'lt', 'lte'],
  other: ['isEmpty', 'isNotEmpty', 'contains'],
}

const opsFor = (t: CaseFieldType | 'count') => OPS_BY_TYPE[t] ?? OPS_BY_TYPE.other

const leftKey = (r: Rule) =>
  r.left.kind === 'caseField' ? `field:${r.left.key}` : `${r.left.fn}:${r.left.of}`

function ruleType(r: Rule, fields: CaseField[]): CaseFieldType | 'count' {
  if (r.left.kind === 'aggregate') return 'count'
  const key = r.left.key
  return fields.find((f) => f.key === key)?.type ?? 'text'
}

const ValueInput: React.FC<{
  type: CaseFieldType | 'count'
  operator: RuleOperator
  options?: string[]
  value: unknown
  onChange: (v: unknown) => void
}> = ({ type, operator, options, value, onChange }) => {
  if (operator === 'isEmpty' || operator === 'isNotEmpty') return null
  if (type === 'yesNo')
    return (
      <select aria-label="Value" className={inputSmall} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose…</option>
        <option value="Yes">Yes</option>
        <option value="No">No</option>
      </select>
    )
  if (options && (operator === 'isAnyOf' || operator === 'isNoneOf')) {
    const selected = Array.isArray(value) ? (value as string[]) : []
    return (
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <label key={o} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-[#e2e8f0] cursor-pointer">
            <Checkbox
              checked={selected.includes(o)}
              onChange={(e) => onChange(e.target.checked ? [...selected, o] : selected.filter((x) => x !== o))}
            />
            {o}
          </label>
        ))}
      </div>
    )
  }
  if (options)
    return (
      <select aria-label="Value" className={inputSmall} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    )
  if (type === 'number' || type === 'percent' || type === 'count')
    return (
      <input
        aria-label="Value"
        type="number"
        className={`${inputSmall} !w-24`}
        value={value === undefined || value === null ? '' : String(value)}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      />
    )
  return <input aria-label="Value" className={inputSmall} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
}

const RuleRow: React.FC<{ rule: Rule; fields: CaseField[]; onChange: (r: Rule) => void; onRemove: () => void }> = ({
  rule,
  fields,
  onChange,
  onRemove,
}) => {
  const lists = fields.filter((f) => f.type === 'list' && f.itemFields?.length)
  const type = ruleType(rule, fields)
  const field = rule.left.kind === 'caseField' ? fields.find((f) => f.key === (rule.left as { key: string }).key) : undefined
  const listField = rule.left.kind === 'aggregate' ? fields.find((f) => f.key === (rule.left as { of: string }).of) : undefined
  const known = rule.left.kind === 'caseField' ? !!field : !!listField

  const setLeft = (v: string) => {
    const [kind, key] = v.split(':')
    if (kind === 'field') {
      const t = fields.find((f) => f.key === key)?.type ?? 'text'
      onChange({ left: { kind: 'caseField', key }, operator: opsFor(t)[0], value: undefined })
    } else if (kind === 'count') onChange({ left: { kind: 'aggregate', of: key, fn: 'count' }, operator: 'is', value: 0 })
    else {
      const first = fields.find((f) => f.key === key)?.itemFields?.find((f) => f.type !== 'person')
      onChange({
        left: {
          kind: 'aggregate',
          of: key,
          fn: 'countWhere',
          where: { left: { kind: 'caseField', key: first?.key ?? '' }, operator: 'is', value: first?.type === 'yesNo' ? 'Yes' : '' },
        },
        operator: 'is',
        value: 0,
      })
    }
  }

  const groups = new Map<string, CaseField[]>()
  for (const f of fields) groups.set(f.producedBy, [...(groups.get(f.producedBy) ?? []), f])

  return (
    <div className="rounded-lg bg-slate-50 border border-[#eef2f6] p-2.5 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <select aria-label="Field" className={`${inputSmall} ${known ? '' : 'border-red-400'}`} value={leftKey(rule)} onChange={(e) => setLeft(e.target.value)}>
          {!known && <option value={leftKey(rule)}>A removed field</option>}
          {lists.length > 0 && (
            <optgroup label="Counts">
              {lists.flatMap((l) => [
                <option key={`count:${l.key}`} value={`count:${l.key}`}>
                  Number of {l.label.toLowerCase()}
                </option>,
                <option key={`countWhere:${l.key}`} value={`countWhere:${l.key}`}>
                  Number of {l.label.toLowerCase()} where…
                </option>,
              ])}
            </optgroup>
          )}
          {[...groups.entries()].map(([by, list]) => (
            <optgroup key={by} label={by}>
              {list
                .filter((f) => f.type !== 'list')
                .map((f) => (
                  <option key={f.key} value={`field:${f.key}`}>
                    {f.label}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <button className={`${btnIcon} shrink-0`} aria-label="Remove rule" onClick={onRemove}>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {rule.left.kind === 'aggregate' && rule.left.fn === 'countWhere' && rule.left.where && listField && (
        <div className="flex items-center gap-2 pl-3 border-l-2 border-[#e2e8f0]">
          <span className="text-[11px] text-[#64748b]">where</span>
          {(() => {
            const where = rule.left.where!
            const left = rule.left
            const whereKey = where.left.kind === 'caseField' ? where.left.key : ''
            const inner = listField.itemFields?.find((f) => f.key === whereKey)
            const setWhere = (w: Rule) => onChange({ ...rule, left: { ...left, where: w } })
            return (
              <>
                <select
                  aria-label="Answer"
                  className={inputSmall}
                  value={whereKey}
                  onChange={(e) => setWhere({ left: { kind: 'caseField', key: e.target.value }, operator: 'is', value: '' })}
                >
                  {!inner && <option value={whereKey}>A removed field</option>}
                  {listField.itemFields!.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Operator"
                  className={`${inputSmall} !w-28 shrink-0`}
                  value={where.operator}
                  onChange={(e) => setWhere({ ...where, operator: e.target.value as RuleOperator })}
                >
                  {opsFor(inner?.type ?? 'text').map((o) => (
                    <option key={o} value={o}>
                      {OPERATOR_LABELS[o]}
                    </option>
                  ))}
                </select>
                <ValueInput type={inner?.type ?? 'text'} operator={where.operator} options={inner?.options} value={where.value} onChange={(v) => setWhere({ ...where, value: v })} />
              </>
            )
          })()}
        </div>
      )}

      <div className="flex items-center gap-2">
        <select
          aria-label="Operator"
          className={`${inputSmall} !w-36 shrink-0`}
          value={rule.operator}
          onChange={(e) => onChange({ ...rule, operator: e.target.value as RuleOperator })}
        >
          {opsFor(type).map((o) => (
            <option key={o} value={o}>
              {OPERATOR_LABELS[o]}
            </option>
          ))}
        </select>
        <ValueInput type={type} operator={rule.operator} options={field?.options} value={rule.value} onChange={(v) => onChange({ ...rule, value: v })} />
      </div>
    </div>
  )
}

/**
 * BranchesEditor — Organism
 * Condition branches: label, plain-language rule builder, live sentence preview and "Then go to".
 * Used in: FieldRenderer (kind 'branches')
 */
export const BranchesEditor: React.FC<{
  value: Branch[]
  onChange: (next: Branch[]) => void
  caseFields: CaseField[]
}> = ({ value, onChange, caseFields }) => {
  const routing = useRouting()
  const update = (i: number, b: Branch) => onChange(value.map((x, idx) => (idx === i ? b : x)))
  const targetName = (key: string) => {
    const t = routing?.node.outcomes.find((o) => o.key === key)?.targetNodeId
    return routing?.nodeOptions.find((n) => n.id === t)?.name ?? '…'
  }
  const firstField = caseFields.find((f) => f.type === 'choice') ?? caseFields[0]

  return (
    <div className="flex flex-col gap-3">
      {value.map((b, i) => (
        <div key={b.id} id={`branch-${b.id}`} className="rounded-xl border border-[#e2e8f0] p-3 flex flex-col gap-2.5 bg-white">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#94a3b8] w-5 shrink-0">{i + 1}.</span>
            <input
              aria-label="Outcome name"
              className={inputSmall}
              placeholder="Outcome name"
              value={b.label}
              onChange={(e) => update(i, { ...b, label: e.target.value })}
            />
            <button className={btnIcon} aria-label="Move branch up" disabled={i === 0} onClick={() => {
              const next = [...value]
              ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
              onChange(next)
            }}>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button className={btnIcon} aria-label="Move branch down" disabled={i === value.length - 1} onClick={() => {
              const next = [...value]
              ;[next[i + 1], next[i]] = [next[i], next[i + 1]]
              onChange(next)
            }}>
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button className={`${btnIcon} hover:!text-red-600`} aria-label="Remove branch" onClick={() => onChange(value.filter((_, idx) => idx !== i))}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#64748b]">
            Match
            <select
              aria-label="Match"
              className={`${inputSmall} !w-auto`}
              value={b.rules.match}
              onChange={(e) => update(i, { ...b, rules: { ...b.rules, match: e.target.value as 'all' | 'any' | 'none' } })}
            >
              <option value="all">all of these (AND)</option>
              <option value="any">any of these (OR)</option>
              <option value="none">none of these (NOT)</option>
            </select>
          </div>

          {b.rules.rules.map((r, ri) =>
            isRuleGroup(r) ? (
              <p key={ri} className="text-[11px] text-[#64748b]">Nested group: {groupText(r, caseFields)}</p>
            ) : (
              <RuleRow
                key={ri}
                rule={r}
                fields={caseFields}
                onChange={(nr) =>
                  update(i, { ...b, rules: { ...b.rules, rules: b.rules.rules.map((x, idx) => (idx === ri ? nr : x)) } })
                }
                onRemove={() => update(i, { ...b, rules: { ...b.rules, rules: b.rules.rules.filter((_, idx) => idx !== ri) } })}
              />
            )
          )}
          <button
            className={`${btnLink} self-start`}
            onClick={() =>
              update(i, {
                ...b,
                rules: {
                  ...b.rules,
                  rules: [
                    ...b.rules.rules,
                    { left: { kind: 'caseField', key: firstField?.key ?? '' }, operator: 'is', value: undefined },
                  ],
                },
              })
            }
          >
            <Plus className="w-3.5 h-3.5" /> Add rule
          </button>

          <p className="text-[11px] leading-relaxed text-[#0d212c] bg-[#ddf7f9]/60 rounded-lg px-2.5 py-2">
            If {groupText(b.rules, caseFields)}, go to <strong className="font-semibold">{targetName(b.id)}</strong>
          </p>
          <ThenGoTo outcomeKey={b.id} compact />
        </div>
      ))}

      <button
        className={`${btnLink} self-start`}
        onClick={() => onChange([...value, { id: newId('br'), label: `Outcome ${value.length + 1}`, rules: { match: 'all', rules: [] } }])}
      >
        <Plus className="w-3.5 h-3.5" /> Add outcome
      </button>

      {routing?.node.outcomes.some((o) => o.key === 'otherwise') && (
        <div className="rounded-xl border border-dashed border-[#cbd5e1] p-3 flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-[#0d212c]">{routing.node.outcomes.find((o) => o.key === 'otherwise')?.label}</span>
          <span className="text-[11px] text-[#64748b]">Used when none of the outcomes above match.</span>
          <ThenGoTo outcomeKey="otherwise" compact />
        </div>
      )}
    </div>
  )
}
