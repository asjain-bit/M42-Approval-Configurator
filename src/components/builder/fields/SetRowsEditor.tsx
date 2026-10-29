'use client'

import React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { newId } from '@/lib/id'
import { CASE_ROLES, STATUS_LABELS } from '@/lib/library'
import type { CaseField } from '@/types/workflow'
import { btnIcon, btnLink, inputSmall } from '@/components/ui/styles'

export interface SetRow {
  id: string
  target: 'field' | 'role' | 'status'
  field?: string
  role?: string
  status?: string
  valueSource?: 'fixed' | 'fromField' | 'responderWhere'
  value?: string
  fromField?: string
  listField?: string
  whereField?: string
  whereValue?: string
}

/**
 * SetRowsEditor — Molecule
 * "Set [case field / case role / status] to [value]" rows for the Update case node.
 * Used in: FieldRenderer (kind 'setRows')
 */
export const SetRowsEditor: React.FC<{ value: SetRow[]; onChange: (rows: SetRow[]) => void; caseFields: CaseField[] }> = ({
  value,
  onChange,
  caseFields,
}) => {
  const update = (i: number, patch: Partial<SetRow>) => onChange(value.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const lists = caseFields.filter((f) => f.type === 'list' && f.itemFields?.length)

  return (
    <div className="flex flex-col gap-2.5">
      {value.length === 0 && <p className="text-[11px] text-[#94a3b8]">Nothing set yet.</p>}
      {value.map((row, i) => {
        const list = lists.find((l) => l.key === row.listField)
        return (
          <div key={row.id} className="rounded-xl border border-[#e2e8f0] p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-[#64748b] w-8">Set</span>
              <select
                aria-label="What to set"
                className={`${inputSmall} !w-32 shrink-0`}
                value={row.target}
                onChange={(e) => update(i, { target: e.target.value as SetRow['target'] })}
              >
                <option value="role">Case role</option>
                <option value="field">Case field</option>
                <option value="status">Status label</option>
              </select>
              {row.target === 'role' && (
                <select aria-label="Role" className={inputSmall} value={row.role ?? ''} onChange={(e) => update(i, { role: e.target.value })}>
                  <option value="">Choose…</option>
                  {CASE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              )}
              {row.target === 'field' && (
                <select aria-label="Field" className={inputSmall} value={row.field ?? ''} onChange={(e) => update(i, { field: e.target.value })}>
                  <option value="">Choose…</option>
                  {caseFields.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
              )}
              {row.target === 'status' && <div className="flex-1" />}
              <button className={`${btnIcon} hover:!text-red-600`} aria-label="Remove row" onClick={() => onChange(value.filter((_, idx) => idx !== i))}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {row.target === 'status' ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-[#64748b] w-8">to</span>
                <input className={inputSmall} list="status-labels-set" value={row.status ?? ''} onChange={(e) => update(i, { status: e.target.value })} />
                <datalist id="status-labels-set">
                  {STATUS_LABELS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-[#64748b] w-8">to</span>
                  <select
                    aria-label="Value source"
                    className={inputSmall}
                    value={row.valueSource ?? 'fixed'}
                    onChange={(e) => update(i, { valueSource: e.target.value as SetRow['valueSource'] })}
                  >
                    <option value="fixed">A fixed value</option>
                    <option value="fromField">The value of another case field</option>
                    <option value="responderWhere">The responder whose answer is…</option>
                  </select>
                </div>
                {(row.valueSource ?? 'fixed') === 'fixed' && (
                  <input aria-label="Value" className={`${inputSmall} ml-10 w-[calc(100%-2.5rem)]`} value={row.value ?? ''} onChange={(e) => update(i, { value: e.target.value })} />
                )}
                {row.valueSource === 'fromField' && (
                  <select aria-label="From field" className={`${inputSmall} ml-10 w-[calc(100%-2.5rem)]`} value={row.fromField ?? ''} onChange={(e) => update(i, { fromField: e.target.value })}>
                    <option value="">Choose…</option>
                    {!caseFields.some((f) => f.key === row.fromField) && row.fromField && <option value={row.fromField}>A removed field</option>}
                    {caseFields.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                )}
                {row.valueSource === 'responderWhere' && (
                  <div className="ml-10 flex flex-col gap-2">
                    <select aria-label="Responses" className={inputSmall} value={row.listField ?? ''} onChange={(e) => update(i, { listField: e.target.value })}>
                      <option value="">Choose responses…</option>
                      {lists.map((l) => (
                        <option key={l.key} value={l.key}>
                          {l.label} ({l.producedBy})
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <select aria-label="Answer" className={inputSmall} value={row.whereField ?? ''} onChange={(e) => update(i, { whereField: e.target.value })}>
                        <option value="">Choose answer…</option>
                        {(list?.itemFields ?? [])
                          .filter((f) => f.type !== 'person')
                          .map((f) => (
                            <option key={f.key} value={f.key}>
                              {f.label}
                            </option>
                          ))}
                      </select>
                      <span className="text-[11px] text-[#64748b]">is</span>
                      <input aria-label="Answer value" className={`${inputSmall} !w-20`} value={row.whereValue ?? ''} onChange={(e) => update(i, { whereValue: e.target.value })} />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )
      })}
      <button
        className={`${btnLink} self-start`}
        onClick={() => onChange([...value, { id: newId('row'), target: 'role', role: '', valueSource: 'fromField' }])}
      >
        <Plus className="w-3.5 h-3.5" /> Add change
      </button>
    </div>
  )
}
