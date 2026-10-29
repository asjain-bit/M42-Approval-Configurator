'use client'

import React from 'react'
import type { BreachAction, BreachKind, CaseField, Stage, WorkflowNode } from '@/types/workflow'
import { STATUS_LABELS, TEMPLATES } from '@/lib/library'
import { inputSmall, labelBase } from '@/components/ui/styles'
import { RecipientsEditor } from './RecipientsEditor'
import { Toggle } from './fields/Toggle'

const KIND_LABELS: Record<BreachKind, string> = {
  closeRequest: 'Close the request',
  escalate: 'Escalate to',
  reassign: 'Reassign to',
  notifyOnly: 'Notify only',
  takeOutcome: 'Take an outcome',
  routeTo: 'Go to a step',
}

interface Props {
  value: BreachAction | null
  onChange: (next: BreachAction | null) => void
  kinds?: BreachKind[]
  node?: WorkflowNode
  stage?: Stage
  caseFields: CaseField[]
  invalid?: boolean
}

/**
 * BreachActionEditor — Molecule
 * Chooses what happens automatically when a time limit is missed.
 * Used in: SlaBlock, WorkflowSettingsModal
 */
export const BreachActionEditor: React.FC<Props> = ({
  value,
  onChange,
  kinds = ['closeRequest', 'escalate', 'reassign', 'notifyOnly', 'takeOutcome', 'routeTo'],
  node,
  stage,
  caseFields,
  invalid,
}) => {
  const setKind = (kind: string) => {
    switch (kind as BreachKind | '') {
      case 'closeRequest':
        return onChange({ kind: 'closeRequest', statusLabel: 'Closed – SLA expired', notifyVendor: false })
      case 'escalate':
        return onChange({ kind: 'escalate', to: [] })
      case 'reassign':
        return onChange({ kind: 'reassign', to: [] })
      case 'notifyOnly':
        return onChange({ kind: 'notifyOnly', to: [], templateId: '' })
      case 'takeOutcome':
        return onChange({ kind: 'takeOutcome', outcomeId: node?.outcomes[0]?.id ?? '' })
      case 'routeTo':
        return onChange({ kind: 'routeTo', nodeId: '' })
      default:
        return onChange(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <select
        aria-label="When the time limit is missed"
        className={`${inputSmall} ${invalid && !value ? 'border-red-400' : ''}`}
        value={value?.kind ?? ''}
        onChange={(e) => setKind(e.target.value)}
      >
        <option value="">Choose what happens…</option>
        {kinds.map((k) => (
          <option key={k} value={k}>
            {KIND_LABELS[k]}
          </option>
        ))}
      </select>
      {invalid && !value && <p className="text-[11px] text-red-600 -mt-2">Choose what happens when the time limit is missed.</p>}

      {value?.kind === 'closeRequest' && (
        <>
          <div>
            <label className={labelBase}>Status label</label>
            <input
              className={inputSmall}
              list="status-labels"
              value={value.statusLabel}
              onChange={(e) => onChange({ ...value, statusLabel: e.target.value })}
            />
            <datalist id="status-labels">
              {STATUS_LABELS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <Toggle label="Email the vendor" checked={value.notifyVendor} onChange={(v) => onChange({ ...value, notifyVendor: v })} />
        </>
      )}
      {(value?.kind === 'escalate' || value?.kind === 'reassign' || value?.kind === 'notifyOnly') && (
        <RecipientsEditor value={value.to} onChange={(to) => onChange({ ...value, to })} caseFields={caseFields} />
      )}
      {value?.kind === 'notifyOnly' && (
        <div>
          <label className={labelBase}>Template</label>
          <select className={inputSmall} value={value.templateId} onChange={(e) => onChange({ ...value, templateId: e.target.value })}>
            <option value="">Choose…</option>
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {value?.kind === 'takeOutcome' && (
        <select
          aria-label="Outcome to take"
          className={inputSmall}
          value={value.outcomeId}
          onChange={(e) => onChange({ kind: 'takeOutcome', outcomeId: e.target.value })}
        >
          {(node?.outcomes ?? []).map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      {value?.kind === 'routeTo' && (
        <select
          aria-label="Step to go to"
          className={inputSmall}
          value={value.nodeId}
          onChange={(e) => onChange({ kind: 'routeTo', nodeId: e.target.value })}
        >
          <option value="">Choose…</option>
          {Object.values(stage?.nodes ?? {})
            .filter((n) => n.id !== node?.id)
            .map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
        </select>
      )}
    </div>
  )
}
