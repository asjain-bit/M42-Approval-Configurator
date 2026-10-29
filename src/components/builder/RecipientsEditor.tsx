'use client'

import React from 'react'
import { Plus, X } from 'lucide-react'
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

interface Props {
  value: Recipient[]
  onChange: (next: Recipient[]) => void
  kinds?: RecipientKind[]
  caseFields: CaseField[]
  id?: string
  invalid?: boolean
}

/**
 * RecipientsEditor — Molecule
 * People picker for roles, teams, people, vendor or people stored on the case.
 * Used in: NodeForm, SlaBlock, WorkflowSettingsModal
 */
export const RecipientsEditor: React.FC<Props> = ({ value, onChange, kinds = ALL_KINDS, caseFields, id, invalid }) => {
  const peopleFields = caseFields.filter((f) => ['people', 'person', 'list'].includes(f.type))
  const update = (i: number, r: Recipient) => onChange(value.map((v, idx) => (idx === i ? r : v)))

  return (
    <div id={id} className={`flex flex-col gap-2 ${invalid ? 'rounded-lg ring-2 ring-red-200 p-1.5' : ''}`}>
      {value.length === 0 && <p className="text-[11px] text-[#94a3b8]">Nobody added yet.</p>}
      {value.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
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
            <select aria-label="Role" className={`${inputSmall} min-w-0 flex-1`} value={r.roleId} onChange={(e) => update(i, { kind: 'role', roleId: e.target.value })}>
              {ROLES.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          )}
          {r.kind === 'team' && (
            <select aria-label="Team" className={`${inputSmall} min-w-0 flex-1`} value={r.teamId} onChange={(e) => update(i, { kind: 'team', teamId: e.target.value })}>
              {TEAMS.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
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
          {(r.kind === 'vendor' || r.kind === 'stepAssignees') && <div className="flex-1" />}
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
