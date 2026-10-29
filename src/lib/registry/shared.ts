/**
 * Building blocks shared by several node types: SLA defaults, form-field editors,
 * recipient helpers and the "Notifications on events" block.
 */

import { newId } from '@/lib/id'
import { FIELD_TYPE_LABELS, FIELD_TYPE_TO_CASE_TYPE, type FormFieldDef } from '@/lib/library'
import type { CaseField, Recipient, SlaConfig } from '@/types/workflow'
import {
  caseFieldOptions,
  opt,
  teamOptions,
  templateOptions,
} from './options'
import type { FieldSchema, OptionItem, SectionSchema } from './types'

export const humanSla = (): SlaConfig => ({
  enabled: true,
  duration: { value: 2, unit: 'businessDays' },
  clockStarts: 'onStepStart',
  reminders: [],
  breachAction: null,
})

export const agentSla = (): SlaConfig => ({
  enabled: true,
  duration: { value: 30, unit: 'minutes' },
  clockStarts: 'onStepStart',
  reminders: [],
  breachAction: null,
})

/** A value the admin typed in themselves because the list had no match */
export const CUSTOM_PREFIX = 'custom:'
export const isCustom = (v: unknown): v is string => typeof v === 'string' && v.startsWith(CUSTOM_PREFIX)
export const customText = (v: string) => v.slice(CUSTOM_PREFIX.length).trim()

export const asArray = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])
export const asString = (v: unknown): string => (typeof v === 'string' ? v : '')

export const CHANNEL_OPTIONS: OptionItem[] = opt([
  ['email', 'Email'],
  ['inApp', 'In-app'],
])

export const FIELD_TYPE_OPTIONS: OptionItem[] = Object.entries(FIELD_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
)

/** Schema for one form field definition (used by Human task, Approval follow-ups, etc.) */
export const formFieldItemSchema: FieldSchema[] = [
  { key: 'label', label: 'Field label', kind: 'text', required: true, maxLength: 80 },
  { key: 'type', label: 'Field type', kind: 'select', required: true, options: FIELD_TYPE_OPTIONS },
  { key: 'required', label: 'Required', kind: 'toggle' },
  {
    key: 'options',
    label: 'Choices',
    kind: 'list',
    help: 'One choice per row.',
    addLabel: 'Add choice',
    showIf: (s) => s.type === 'dropdown' || s.type === 'multiSelect',
    itemSchema: [{ key: 'value', label: 'Choice', kind: 'text' }],
    newItem: () => ({ value: '' }),
  },
  {
    key: 'poolTeamId',
    label: 'Choose people from team',
    kind: 'select',
    options: teamOptions,
    placeholder: 'Anyone',
    showIf: (s) => s.type === 'peoplePicker' && !s.poolFromCaseField,
  },
  {
    key: 'poolFromCaseField',
    label: 'Or choose from people in the case',
    kind: 'caseFieldSelect',
    options: caseFieldOptions(['people', 'list']),
    placeholder: 'Not used',
    showIf: (s) => s.type === 'peoplePicker',
  },
  {
    key: 'excludeCaseField',
    label: 'Leave out people already chosen in',
    kind: 'caseFieldSelect',
    options: caseFieldOptions(['people', 'person']),
    placeholder: 'Nobody left out',
    showIf: (s) => s.type === 'peoplePicker' && !!s.poolFromCaseField,
  },
  {
    key: 'prefillFrom',
    label: 'Pre-fill from',
    kind: 'caseFieldSelect',
    options: caseFieldOptions(['people', 'choice', 'text', 'number']),
    placeholder: 'No pre-fill',
    help: 'Shows the earlier value (for example an agent suggestion and its confidence). The person can accept or change it.',
    showIf: (s) => s.type !== 'questionnaireSelector' && s.type !== 'fileUpload',
  },
  { key: 'min', label: 'Minimum people', kind: 'number', min: 0, showIf: (s) => s.type === 'peoplePicker' },
  { key: 'max', label: 'Maximum people', kind: 'number', min: 1, showIf: (s) => s.type === 'peoplePicker' },
  {
    key: 'minQuestions',
    label: 'Minimum questions to tick',
    kind: 'number',
    min: 1,
    showIf: (s) => s.type === 'questionnaireSelector',
  },
  {
    key: '_preview',
    label: 'Preview: what the assignee sees',
    kind: 'questionnairePreview',
    showIf: (s) => s.type === 'questionnaireSelector',
  },
]

export const newFormField = (): Record<string, unknown> => {
  const id = newId('fld')
  return { id, key: id, label: '', type: 'shortText', required: false }
}

export function formFieldsSchema(key: string, label: string, help?: string): FieldSchema {
  return {
    key,
    label,
    kind: 'list',
    help,
    addLabel: 'Add field',
    itemSchema: formFieldItemSchema,
    itemTitle: (item, i) =>
      `${asString(item.label) || `Field ${i + 1}`} · ${FIELD_TYPE_LABELS[item.type as keyof typeof FIELD_TYPE_LABELS] ?? ''}`,
    newItem: newFormField,
  }
}

/** Case fields produced by a list of form field definitions */
export function fieldsToOutputs(fields: FormFieldDef[]): Omit<CaseField, 'producedBy' | 'stageName'>[] {
  return fields
    .filter((f) => f.label)
    .map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type === 'peoplePicker' && f.max === 1 ? 'person' : FIELD_TYPE_TO_CASE_TYPE[f.type],
      options: f.options?.map((o) => o.value),
    }))
}

export const recipientsEmpty = (v: unknown) => asArray<Recipient>(v).length === 0

export const eventNotificationsSection: SectionSchema = {
  id: 'eventNotifications',
  title: 'Notifications',
  fields: [
    {
      key: 'eventNotifications',
      label: 'Notify people when something happens',
      kind: 'list',
      addLabel: 'Add notification',
      itemTitle: (item) => {
        const when = { stepStarts: 'Step starts', decisionMade: 'Decision made', overdue: 'Overdue' }[
          asString(item.when) as 'stepStarts'
        ]
        return `When ${when?.toLowerCase() ?? '…'}`
      },
      newItem: () => ({
        id: newId('evt'),
        when: 'stepStarts',
        recipients: [{ kind: 'stepAssignees' }],
        channels: ['email'],
        templateId: '',
      }),
      itemSchema: [
        {
          key: 'when',
          label: 'When',
          kind: 'select',
          options: opt([
            ['stepStarts', 'The step starts'],
            ['decisionMade', 'A decision is made'],
            ['overdue', 'The step is overdue'],
          ]),
        },
        { key: 'recipients', label: 'Notify', kind: 'recipients' },
        { key: 'channels', label: 'Via', kind: 'multiselect', options: CHANNEL_OPTIONS },
        { key: 'templateId', label: 'Using template', kind: 'select', options: templateOptions },
      ],
    },
  ],
}
