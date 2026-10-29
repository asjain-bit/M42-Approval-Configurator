'use client'

import React, { useEffect, useState } from 'react'
import { CircleHelp, Plus, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { btnLink, btnPrimary, btnSecondary, helpText, inputBase, labelBase } from '@/components/ui/styles'
import { CALENDARS, TIMEZONES } from '@/lib/library'
import { newId } from '@/lib/id'
import { caseDataDictionary } from '@/lib/workflow/graph'
import { BreachActionEditor } from '@/components/builder/BreachActionEditor'
import type { Workflow, WorkflowSettings } from '@/types/workflow'

const TRIGGERS = [
  { value: 'vendorWithdraws', label: 'The vendor withdraws' },
  { value: 'adminCancels', label: 'An admin cancels' },
] as const

/**
 * WorkflowSettingsModal — Organism
 * Case ID format, calendar, reminder time, time zone and workflow-level event rules.
 * Used in: WorkflowHeader
 */
export const WorkflowSettingsModal: React.FC<{
  open: boolean
  workflow: Workflow
  onClose: () => void
  onSave: (settings: WorkflowSettings, dismissed: string[]) => void
}> = ({ open, workflow, onClose, onSave }) => {
  const [s, setS] = useState<WorkflowSettings>(workflow.settings)
  const [dismissed, setDismissed] = useState<string[]>([])
  const caseFields = caseDataDictionary(workflow)

  useEffect(() => {
    if (open) {
      setS(workflow.settings)
      setDismissed([])
    }
  }, [open, workflow.settings])

  const calendar = CALENDARS.find((c) => c.id === s.workingCalendarId)

  return (
    <Modal
      open={open}
      title="Workflow settings"
      description="Apply to every stage in this workflow."
      width="max-w-2xl"
      onClose={onClose}
      footer={
        <>
          <button className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button className={btnPrimary} onClick={() => onSave(s, dismissed)}>
            Save settings
          </button>
        </>
      }
    >
      {(s.toConfirm ?? []).length > 0 && (
        <div className="rounded-xl border border-[#fde8b3] bg-[#fef7e0] p-3.5 flex flex-col gap-2">
          <p className="text-xs font-semibold text-[#b06000] flex items-center gap-1.5">
            <CircleHelp className="w-4 h-4" aria-hidden="true" /> To confirm
          </p>
          {(s.toConfirm ?? []).map((t) => (
            <div key={t} className="flex items-start justify-between gap-2 text-xs text-[#7a4300]">
              <span>{t}</span>
              <button
                className="text-[11px] font-semibold underline cursor-pointer shrink-0"
                onClick={() => {
                  setDismissed((d) => [...d, t])
                  setS((cur) => ({ ...cur, toConfirm: (cur.toConfirm ?? []).filter((x) => x !== t) }))
                }}
              >
                Mark as decided
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelBase} htmlFor="ws-caseid">
            Case ID format
          </label>
          <input id="ws-caseid" className={inputBase} value={s.caseIdFormat} onChange={(e) => setS({ ...s, caseIdFormat: e.target.value })} />
          <p className={helpText}>{'{YYYY}'} is the year, {'{00000}'} a running number.</p>
        </div>
        <div>
          <label className={labelBase} htmlFor="ws-time">
            Default reminder time
          </label>
          <input
            id="ws-time"
            type="time"
            className={inputBase}
            value={s.defaultReminderTime}
            onChange={(e) => setS({ ...s, defaultReminderTime: e.target.value })}
          />
          <p className={helpText}>Used when a reminder has no time of its own.</p>
        </div>
        <div>
          <label className={labelBase} htmlFor="ws-cal">
            Working calendar
          </label>
          <select id="ws-cal" className={inputBase} value={s.workingCalendarId} onChange={(e) => setS({ ...s, workingCalendarId: e.target.value })}>
            {CALENDARS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className={helpText}>Working days: {calendar?.workingDays.join(', ')}. Business-day time limits count these days only.</p>
        </div>
        <div>
          <label className={labelBase} htmlFor="ws-tz">
            Time zone
          </label>
          <select id="ws-tz" className={inputBase} value={s.timezone} onChange={(e) => setS({ ...s, timezone: e.target.value })}>
            {TIMEZONES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-semibold">If this happens at any point</h3>
          <p className={helpText}>Rules that apply to a request in any stage.</p>
        </div>
        {s.eventRules.length === 0 && <p className="text-xs text-[#94a3b8]">No rules yet.</p>}
        {s.eventRules.map((rule, i) => (
          <div key={rule.id} className="rounded-xl border border-[#e2e8f0] p-3.5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium shrink-0">When</span>
              <select
                aria-label="Trigger"
                className={`${inputBase} h-9 text-xs`}
                value={rule.trigger}
                onChange={(e) =>
                  setS({
                    ...s,
                    eventRules: s.eventRules.map((r, idx) => (idx === i ? { ...r, trigger: e.target.value as typeof r.trigger } : r)),
                  })
                }
              >
                {TRIGGERS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button
                aria-label="Remove rule"
                className="p-2 text-[#94a3b8] hover:text-red-600 cursor-pointer"
                onClick={() => setS({ ...s, eventRules: s.eventRules.filter((_, idx) => idx !== i) })}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div>
              <span className="text-xs font-medium block mb-1.5">Then</span>
              <BreachActionEditor
                value={rule.action}
                kinds={['closeRequest', 'escalate', 'reassign', 'notifyOnly']}
                caseFields={caseFields}
                onChange={(action) =>
                  action &&
                  setS({ ...s, eventRules: s.eventRules.map((r, idx) => (idx === i ? { ...r, action } : r)) })
                }
              />
            </div>
          </div>
        ))}
        <button
          className={`${btnLink} self-start`}
          onClick={() =>
            setS({
              ...s,
              eventRules: [
                ...s.eventRules,
                {
                  id: newId('evr'),
                  trigger: 'vendorWithdraws',
                  action: { kind: 'closeRequest', statusLabel: 'Withdrawn', notifyVendor: false },
                },
              ],
            })
          }
        >
          <Plus className="w-3.5 h-3.5" /> Add rule
        </button>
      </div>
    </Modal>
  )
}
