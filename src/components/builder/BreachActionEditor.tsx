'use client'

import React from 'react'
import type { BreachAction, BreachKind, CaseField, Stage, WorkflowNode } from '@/types/workflow'
import { findTemplate, STATUS_LABELS, TEMPLATES } from '@/lib/library'
import { inputSmall, labelBase, textareaBase } from '@/components/ui/styles'
import { RecipientsEditor } from './RecipientsEditor'
import { Toggle } from './fields/Toggle'
import { EmailPreview } from './EmailPreview'

const KIND_LABELS: Record<BreachKind, string> = {
  closeRequest: 'Close the request',
  escalate: 'Escalate to someone',
  reassign: 'Hand it to someone else',
  notifyOnly: 'Only send a reminder email',
  takeOutcome: 'Choose a result automatically',
  routeTo: 'Move to another step',
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
        return onChange({ kind: 'closeRequest', statusLabel: 'Closed – deadline missed', notifyVendor: false })
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
      {value && value.kind !== 'closeRequest' && (
        <Toggle
          label="Update the request status to “At risk”"
          checked={!!value.markAtRisk}
          onChange={(v) => onChange({ ...value, markAtRisk: v })}
        />
      )}

      {value?.kind === 'closeRequest' && (
        <>
          <div>
            <label className={labelBase}>Status shown on the request</label>
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
          {value.notifyVendor && (
            <>
              <div>
                <label className={labelBase}>
                  Email template <span className="text-red-600">*</span>
                </label>
                <select
                  className={`${inputSmall} ${value.templateId ? '' : 'border-red-300'}`}
                  value={value.templateId ?? ''}
                  onChange={(e) => onChange({ ...value, templateId: e.target.value, emailBody: findTemplate(e.target.value)?.body ?? '' })}
                >
                  <option value="">Choose…</option>
                  {TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              {value.templateId && (
                <div>
                  <label className={labelBase}>Email</label>
                  <textarea
                    className={`${textareaBase} text-xs [field-sizing:content] !max-h-none`}
                    rows={5}
                    value={value.emailBody ?? ''}
                    onChange={(e) => onChange({ ...value, emailBody: e.target.value })}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}
      {(value?.kind === 'escalate' || value?.kind === 'reassign' || value?.kind === 'notifyOnly') && (
        <>
          <RecipientsEditor value={value.to} onChange={(to) => onChange({ ...value, to })} caseFields={caseFields} />
          {value.kind === 'escalate' && <p className="text-[11px] text-[#64748b] -mt-1">They are emailed and the request waits for them. The vendor is not emailed.</p>}
        </>
      )}
      {value?.kind === 'notifyOnly' && (
        <>
          <div>
            <label className={labelBase}>Email template</label>
            <select className={inputSmall} value={value.templateId} onChange={(e) => onChange({ ...value, templateId: e.target.value })}>
              <option value="">Choose…</option>
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <EmailPreview templateId={value.templateId} override={value.email} onChange={(email) => onChange({ ...value, email })} />
        </>
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
