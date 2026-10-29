'use client'

import React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { newId } from '@/lib/id'
import { TEMPLATES } from '@/lib/library'
import type { CaseField, Reminder, SlaConfig, Stage, WorkflowNode } from '@/types/workflow'
import { btnIcon, btnLink, helpText, inputSmall, labelBase } from '@/components/ui/styles'
import { BreachActionEditor } from './BreachActionEditor'
import { RecipientsEditor } from './RecipientsEditor'
import { Toggle } from './fields/Toggle'
import { Checkbox, Radio } from '@/components/ui/Choice'

interface Props {
  node: WorkflowNode
  stage: Stage
  agent: boolean
  defaultReminderTime: string
  caseFields: CaseField[]
  onChange: (sla: SlaConfig, what: string) => void
}

/**
 * SlaBlock — Organism
 * Time limit, clock start, reminders and the required breach action for one node.
 * Used in: NodeForm
 */
export const SlaBlock: React.FC<Props> = ({ node, stage, agent, defaultReminderTime, caseFields, onChange }) => {
  const sla: SlaConfig = node.sla ?? {
    enabled: false,
    duration: { value: null, unit: agent ? 'minutes' : 'businessDays' },
    clockStarts: 'onStepStart',
    reminders: [],
    breachAction: null,
  }
  const set = (patch: Partial<SlaConfig>, what: string) => onChange({ ...sla, ...patch }, what)
  const setReminder = (i: number, patch: Partial<Reminder>) =>
    set({ reminders: sla.reminders.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) }, 'Reminders')
  const durationMissing = sla.enabled && (sla.duration.value === null || !(sla.duration.value > 0))

  return (
    <div className="flex flex-col gap-4">
      <Toggle
        label={agent ? 'Run timeout' : 'Time limit'}
        checked={sla.enabled}
        onChange={(v) => set({ enabled: v }, agent ? 'Run timeout' : 'Time limit')}
      />
      {!sla.enabled && (
        <p className="text-[11px] text-red-600 -mt-2">
          Every {agent ? 'agent' : 'human'} step needs a {agent ? 'run timeout' : 'time limit'} and a breach action.
        </p>
      )}
      {sla.enabled && (
        <>
          <div>
            <label className={labelBase}>{agent ? 'Stop the agent after' : 'Time limit'}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                aria-label="Time limit amount"
                className={`${inputSmall} !w-24 ${durationMissing ? 'border-red-300' : ''}`}
                value={sla.duration.value ?? ''}
                placeholder={agent ? '[N]' : ''}
                onChange={(e) =>
                  set({ duration: { ...sla.duration, value: e.target.value === '' ? null : Number(e.target.value) } }, 'Time limit')
                }
              />
              <select
                aria-label="Time limit unit"
                className={inputSmall}
                value={sla.duration.unit}
                onChange={(e) => set({ duration: { ...sla.duration, unit: e.target.value as SlaConfig['duration']['unit'] } }, 'Time limit unit')}
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                {!agent && <option value="businessDays">Business days</option>}
                {!agent && <option value="calendarDays">Calendar days</option>}
              </select>
            </div>
            {durationMissing && <p className="text-[11px] text-red-600 mt-1">Set a time limit.</p>}
          </div>

          {!agent && (
            <div>
              <label className={labelBase}>Clock starts</label>
              <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Clock starts">
                {(
                  [
                    ['onStepStart', 'When the step starts'],
                    ['onAssignment', 'When someone is assigned'],
                  ] as const
                ).map(([v, l]) => (
                  <label key={v} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Radio checked={sla.clockStarts === v} onChange={() => set({ clockStarts: v }, 'Clock starts')} />
                    {l}
                  </label>
                ))}
              </div>
            </div>
          )}

          {!agent && (
            <div className="flex flex-col gap-2">
              <span className={labelBase}>Reminders</span>
              {sla.reminders.length === 0 && <p className="text-[11px] text-[#94a3b8] -mt-1">No reminders.</p>}
              {sla.reminders.map((r, i) => (
                <div key={r.id} className="rounded-xl border border-[#e2e8f0] p-3 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Reminder {i + 1}</span>
                    <button
                      className={`${btnIcon} hover:!text-red-600`}
                      aria-label={`Remove reminder ${i + 1}`}
                      onClick={() => set({ reminders: sla.reminders.filter((_, idx) => idx !== i) }, 'Reminders')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelBase}>After</label>
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          min={0}
                          aria-label="After amount"
                          className={`${inputSmall} !w-16`}
                          value={r.after.value ?? ''}
                          onChange={(e) => setReminder(i, { after: { ...r.after, value: e.target.value === '' ? null : Number(e.target.value) } })}
                        />
                        <select
                          aria-label="After unit"
                          className={inputSmall}
                          value={r.after.unit}
                          onChange={(e) => setReminder(i, { after: { ...r.after, unit: e.target.value as Reminder['after']['unit'] } })}
                        >
                          <option value="hours">hours</option>
                          <option value="businessDays">business days</option>
                          <option value="calendarDays">calendar days</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={labelBase}>Send at</label>
                      <input
                        type="time"
                        aria-label="Send at"
                        className={inputSmall}
                        value={r.sendAt ?? ''}
                        onChange={(e) => setReminder(i, { sendAt: e.target.value })}
                      />
                      {!r.sendAt && <p className="text-[10px] text-[#64748b] mt-0.5">Uses {defaultReminderTime}</p>}
                    </div>
                  </div>
                  <div>
                    <span className={labelBase}>Channels</span>
                    <div className="flex items-center gap-4">
                      {(
                        [
                          ['email', 'Email'],
                          ['inApp', 'In-app'],
                        ] as const
                      ).map(([c, l]) => (
                        <label key={c} className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <Checkbox
                            checked={r.channels.includes(c)}
                            onChange={(e) =>
                              setReminder(i, { channels: e.target.checked ? [...r.channels, c] : r.channels.filter((x) => x !== c) })
                            }
                          />
                          {l}
                        </label>
                      ))}
                    </div>
                    {r.channels.length === 0 && <p className="text-[11px] text-red-600 mt-1">Choose at least one channel.</p>}
                  </div>
                  <div>
                    <span className={labelBase}>Recipients</span>
                    <RecipientsEditor value={r.recipients} onChange={(recipients) => setReminder(i, { recipients })} caseFields={caseFields} />
                  </div>
                  <div>
                    <label className={labelBase}>Template</label>
                    <select aria-label="Template" className={inputSmall} value={r.templateId} onChange={(e) => setReminder(i, { templateId: e.target.value })}>
                      <option value="">Choose…</option>
                      {TEMPLATES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
              <button
                className={`${btnLink} self-start`}
                onClick={() =>
                  set(
                    {
                      reminders: [
                        ...sla.reminders,
                        {
                          id: newId('rem'),
                          after: { value: 1, unit: 'businessDays' },
                          sendAt: '',
                          channels: ['email'],
                          recipients: [{ kind: 'stepAssignees' }],
                          templateId: '',
                        },
                      ],
                    },
                    'Reminders'
                  )
                }
              >
                <Plus className="w-3.5 h-3.5" /> Add reminder
              </button>
            </div>
          )}

          <div>
            <span className={labelBase}>
              When the {agent ? 'timeout' : 'time limit'} is missed <span className="text-red-600">*</span>
            </span>
            <BreachActionEditor
              value={sla.breachAction}
              onChange={(b) => set({ breachAction: b }, 'Breach action')}
              node={node}
              stage={stage}
              caseFields={caseFields}
              invalid
            />
            {agent && <p className={helpText}>Agents usually take the Error outcome when they time out.</p>}
          </div>
        </>
      )}
    </div>
  )
}
