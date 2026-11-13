'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Plus, X } from 'lucide-react'
import type { CaseField, Recipient, RecipientKind } from '@/types/workflow'
import { ROLES, TEAMS, USERS } from '@/lib/library'
import { inputSmall, btnLink } from '@/components/ui/styles'

const KIND_LABELS: Record<RecipientKind, string> = {
  role: 'Role',
  team: 'Team',
  user: 'Specific person',
  vendor: 'Vendor',
  fromCaseField: 'People from the case',
  stepAssignees: "This step's assignees",
}

const ALL_KINDS: RecipientKind[] = ['role', 'team', 'user', 'vendor', 'fromCaseField', 'stepAssignees']

function defaultFor(kind: RecipientKind, caseFields: CaseField[]): Recipient {
  switch (kind) {
    case 'role':
      return { kind, roleId: ROLES[0].id }
    case 'team':
      return { kind, teamId: TEAMS[0].id }
    case 'user':
      return { kind, userId: USERS[0].id }
    case 'fromCaseField':
      return { kind, fieldKey: caseFields.find((f) => f.type === 'people' || f.type === 'person')?.key ?? '' }
    default:
      return { kind } as Recipient
  }
}

/** The vendor's contacts an email can go to */
export const VENDOR_CONTACTS = ['Primary contact', 'Person who submitted the form', 'Commercial contact', 'Technical contact']

/** Dropdown with a checkbox per option; shows the chosen ones as a short summary */
const MultiSelect: React.FC<{ label: string; options: { id: string; name: string }[]; value: string[]; allText: string; onChange: (v: string[]) => void }> = ({
  label,
  options,
  value,
  allText,
  onChange,
}) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [open])
  const chosen = options.filter((o) => value.includes(o.id))
  const summary = chosen.length === 0 ? allText : chosen.length <= 2 ? chosen.map((o) => o.name).join(', ') : `${chosen.length} selected`
  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <button type="button" aria-label={label} aria-expanded={open} className={`${inputSmall} flex items-center justify-between gap-1 text-left cursor-pointer`} onClick={() => setOpen((o) => !o)}>
        <span className={`truncate ${chosen.length ? '' : 'text-[#64748b]'}`}>{summary}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0 text-[#64748b]" />
      </button>
      {open && (
        <ul className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto rounded-lg border border-[#e2e8f0] bg-white shadow-lg py-1" role="listbox" aria-multiselectable="true">
          {options.length === 0 && <li className="px-3 py-2 text-[11px] text-[#94a3b8]">Nobody to choose.</li>}
          {options.map((o) => {
            const on = value.includes(o.id)
            return (
              <li key={o.id} role="option" aria-selected={on}>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50 cursor-pointer"
                  onClick={() => onChange(on ? value.filter((v) => v !== o.id) : [...value, o.id])}
                >
                  <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${on ? 'bg-[#36c0c9] border-[#36c0c9]' : 'border-[#cbd5e1]'}`}>
                    {on && <Check className="w-2.5 h-2.5 text-white" />}
                  </span>
                  {o.name}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

const peopleOf = (ids: string[] = []) => USERS.filter((u) => ids.includes(u.id)).map((u) => ({ id: u.id, name: u.name }))

interface Props {
  value: Recipient[]
  onChange: (next: Recipient[]) => void
  kinds?: RecipientKind[]
  caseFields: CaseField[]
  id?: string
  invalid?: boolean
  /** Reminders: no step assignees or case people, roles grouped by level, vendor needs no extra choice */
  reminder?: boolean
}

/**
 * RecipientsEditor — Molecule
 * People picker for roles, teams, people, vendor or people stored on the case.
 * Used in: NodeForm, SlaBlock, WorkflowSettingsModal
 */
export const RecipientsEditor: React.FC<Props> = ({ value, onChange, kinds: kindsIn = ALL_KINDS, caseFields, id, invalid, reminder }) => {
  const kinds = reminder ? kindsIn.filter((k) => k !== 'stepAssignees' && k !== 'fromCaseField') : kindsIn
  const pickPeople = reminder || kinds.includes('vendor')
  const peopleFields = caseFields.filter((f) => ['people', 'person', 'list'].includes(f.type))
  const update = (i: number, r: Recipient) => onChange(value.map((v, idx) => (idx === i ? r : v)))

  return (
    <div id={id} className={`flex flex-col gap-2 `}>
      {value.length === 0 && <p className={`text-[11px] ${invalid ? 'text-red-600' : 'text-[#94a3b8]'}`}>{invalid ? 'Add at least one person.' : 'Nobody added yet.'}</p>}
      {value.map((r, i) => (
        <div key={i} className="flex items-start gap-2">
          <select
            aria-label="Who"
            className={`${inputSmall} !w-[42%] shrink-0`}
            value={r.kind}
            onChange={(e) => update(i, defaultFor(e.target.value as RecipientKind, caseFields))}
          >
            {kinds.map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
          {r.kind === 'role' && (
            <div className="min-w-0 flex-1 flex flex-col gap-1.5">
              <select aria-label="Role" className={inputSmall} value={r.roleId} onChange={(e) => update(i, { kind: 'role', roleId: e.target.value })}>
                {reminder ? (
                  <>
                    <optgroup label="Application level role">
                      {ROLES.filter((x) => !x.perCase).map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Case level role">
                      {ROLES.filter((x) => x.perCase).map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </optgroup>
                  </>
                ) : (
                  ROLES.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))
                )}
              </select>
              {pickPeople && !ROLES.find((x) => x.id === r.roleId)?.perCase && (
                <MultiSelect
                  label="People in this role"
                  allText="Everyone in this role"
                  options={peopleOf(ROLES.find((x) => x.id === r.roleId)?.memberIds)}
                  value={r.userIds ?? []}
                  onChange={(userIds) => update(i, { ...r, userIds })}
                />
              )}
            </div>
          )}
          {r.kind === 'team' && (
            <div className="min-w-0 flex-1 flex flex-col gap-1.5">
              <select aria-label="Team" className={inputSmall} value={r.teamId} onChange={(e) => update(i, { kind: 'team', teamId: e.target.value })}>
                {TEAMS.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
              {pickPeople && (
                <MultiSelect
                  label="People in this team"
                  allText="Everyone in this team"
                  options={peopleOf(TEAMS.find((x) => x.id === r.teamId)?.memberIds)}
                  value={r.userIds ?? []}
                  onChange={(userIds) => update(i, { ...r, userIds })}
                />
              )}
            </div>
          )}
          {r.kind === 'vendor' && !reminder && (
            <MultiSelect
              label="Vendor contacts"
              allText="All vendor contacts"
              options={VENDOR_CONTACTS.map((c) => ({ id: c, name: c }))}
              value={r.contacts ?? []}
              onChange={(contacts) => update(i, { kind: 'vendor', contacts })}
            />
          )}
          {r.kind === 'user' && (
            <select aria-label="Person" className={`${inputSmall} min-w-0 flex-1`} value={r.userId} onChange={(e) => update(i, { kind: 'user', userId: e.target.value })}>
              {USERS.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          )}
          {r.kind === 'fromCaseField' && (
            <select
              aria-label="Case field"
              className={`${inputSmall} min-w-0 flex-1`}
              value={r.fieldKey}
              onChange={(e) => update(i, { kind: 'fromCaseField', fieldKey: e.target.value })}
            >
              <option value="">Choose…</option>
              {!peopleFields.some((f) => f.key === r.fieldKey) && r.fieldKey && (
                <option value={r.fieldKey}>A removed field</option>
              )}
              {peopleFields.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          )}
          {(r.kind === 'stepAssignees' || (r.kind === 'vendor' && reminder)) && <div className="flex-1" />}
          <button
            type="button"
            aria-label="Remove"
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            className="p-1.5 rounded-md text-[#94a3b8] hover:text-red-600 hover:bg-red-50 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button type="button" className={`${btnLink} self-start`} onClick={() => onChange([...value, defaultFor(kinds[0], caseFields)])}>
        <Plus className="w-3.5 h-3.5" /> Add
      </button>
    </div>
  )
}
