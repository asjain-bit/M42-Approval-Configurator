/**
 * Shared modules (platform-level libraries). Nodes reference these by ID only.
 * Seed/mock data for now; a real API can replace this file later.
 */

import type { CaseFieldType, ID } from '@/types/workflow'

export type FieldType =
  | 'shortText'
  | 'longText'
  | 'number'
  | 'date'
  | 'dropdown'
  | 'multiSelect'
  | 'yesNo'
  | 'fileUpload'
  | 'email'
  | 'peoplePicker'
  | 'questionnaireSelector'

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  shortText: 'Short text',
  longText: 'Long text',
  number: 'Number',
  date: 'Date',
  dropdown: 'Dropdown',
  multiSelect: 'Multi-select',
  yesNo: 'Yes / No',
  fileUpload: 'File upload',
  email: 'Email',
  peoplePicker: 'People picker',
  questionnaireSelector: 'Questionnaire selector',
}

/** Maps a form field type to the case data type it produces. */
export const FIELD_TYPE_TO_CASE_TYPE: Record<FieldType, CaseFieldType> = {
  shortText: 'text',
  longText: 'text',
  number: 'number',
  date: 'date',
  dropdown: 'choice',
  multiSelect: 'choice',
  yesNo: 'yesNo',
  fileUpload: 'files',
  email: 'text',
  peoplePicker: 'people',
  questionnaireSelector: 'questions',
}

export interface FormFieldDef {
  id: ID
  key: string
  label: string
  type: FieldType
  required: boolean
  options?: { value: string }[]
  /** People picker settings */
  poolTeamId?: ID
  poolFromCaseField?: string
  excludeCaseField?: string
  prefillFrom?: string
  min?: number
  max?: number
  /** Questionnaire selector settings */
  minQuestions?: number
}

export interface FormDefinition {
  id: ID
  name: string
  description: string
  fields: FormFieldDef[]
}

export interface Question {
  id: ID
  text: string
  answerType: 'shortText' | 'longText' | 'yesNo' | 'number' | 'dropdown'
}

export interface Questionnaire {
  id: ID
  name: string
  description: string
  questions: Question[]
}

export interface AgentOutput {
  key: string
  label: string
  type: CaseFieldType
  options?: string[]
}

export interface AgentAction {
  id: ID
  name: string
  results: { key: string; label: string }[]
}

export interface AgentDefinition {
  id: ID
  name: string
  description: string
  actions: AgentAction[]
  outputs: AgentOutput[]
}

export interface Role {
  id: ID
  name: string
}
export interface Team {
  id: ID
  name: string
  memberIds: ID[]
}
export interface User {
  id: ID
  name: string
  email: string
  title: string
}

export interface MessageTemplate {
  id: ID
  name: string
  channel: 'email' | 'inApp'
  subject: string
  body: string
}

export interface WorkingCalendar {
  id: ID
  name: string
  workingDays: string[]
  holidays: string[]
}

export interface Integration {
  id: ID
  name: string
  description: string
  fields: { key: string; label: string; type: 'shortText' | 'dropdown'; options?: string[] }[]
}

export const FORMS: FormDefinition[] = [
  {
    id: 'vendor-intake-form',
    name: 'Vendor intake form',
    description: 'Placeholder fields for the vendor proposal form.',
    fields: [
      { id: 'f1', key: 'companyName', label: 'Company name', type: 'shortText', required: true },
      { id: 'f2', key: 'contactEmail', label: 'Contact email', type: 'email', required: true },
      { id: 'f3', key: 'solutionName', label: 'Solution name', type: 'shortText', required: true },
      { id: 'f4', key: 'problemStatement', label: 'Problem statement', type: 'longText', required: true },
      { id: 'f5', key: 'solutionDescription', label: 'Solution description', type: 'longText', required: true },
      { id: 'f6', key: 'useCase', label: 'Use case', type: 'longText', required: true },
      { id: 'f7', key: 'supportingDocuments', label: 'Supporting documents', type: 'fileUpload', required: false },
    ],
  },
]

export const QUESTIONNAIRES: Questionnaire[] = [
  {
    id: 'q-general-assessment',
    name: 'General solution assessment',
    description: 'Sample questionnaire. Replace with your real questions.',
    questions: [
      { id: 'qa1', text: 'How relevant is this solution to your area?', answerType: 'dropdown' },
      { id: 'qa2', text: 'What problem would it solve for your team?', answerType: 'longText' },
      { id: 'qa3', text: 'Are you aware of a similar solution already in use?', answerType: 'yesNo' },
      { id: 'qa4', text: 'What risks do you see in adopting it?', answerType: 'longText' },
      { id: 'qa5', text: 'How many people in your area would use it?', answerType: 'number' },
      { id: 'qa6', text: 'Any other comments?', answerType: 'longText' },
    ],
  },
  {
    id: 'q-technical-fit',
    name: 'Technical fit review',
    description: 'Sample questionnaire. Replace with your real questions.',
    questions: [
      { id: 'qt1', text: 'Does it integrate with our existing systems?', answerType: 'yesNo' },
      { id: 'qt2', text: 'What data would it need access to?', answerType: 'longText' },
      { id: 'qt3', text: 'Are there security or privacy concerns?', answerType: 'longText' },
      { id: 'qt4', text: 'How mature does the solution look?', answerType: 'dropdown' },
      { id: 'qt5', text: 'Estimated effort to pilot (weeks)', answerType: 'number' },
    ],
  },
]

export const AGENTS: AgentDefinition[] = [
  {
    id: 'intake-agent',
    name: 'Intake agent',
    description:
      'Checks the vendor form for completeness, validity, duplicates, existing M42 solutions and similar funded use cases, then writes the Initial Assessment Brief.',
    actions: [
      {
        id: 'assess-vendor-request',
        name: 'Assess vendor request',
        results: [
          { key: 'passed', label: 'Passed' },
          { key: 'failed', label: 'Failed' },
        ],
      },
    ],
    outputs: [
      { key: 'initialAssessmentBrief', label: 'Initial Assessment Brief', type: 'document' },
      { key: 'agentActions', label: 'Agent actions', type: 'list' },
      {
        key: 'suggestedRequestType',
        label: 'Suggested request type',
        type: 'choice',
        options: ['Partnership', 'M&A', 'Procurement'],
      },
      { key: 'suggestedRequestTypeConfidence', label: 'Suggested request type confidence', type: 'percent' },
    ],
  },
  {
    id: 'internal-interest-matcher',
    name: 'Internal interest matcher',
    description: 'Recommends the internal interest team members best suited to assess a request.',
    actions: [
      {
        id: 'recommend-members',
        name: 'Recommend internal interest members',
        results: [{ key: 'done', label: 'Done' }],
      },
    ],
    outputs: [{ key: 'recommendedMembers', label: 'Recommended members', type: 'people' }],
  },
  {
    id: 'vendor-form-checker',
    name: 'Vendor form checker',
    description: 'Gives the vendor general suggestions before they submit. Never blocks submission.',
    actions: [
      {
        id: 'suggest-improvements',
        name: 'Suggest improvements',
        results: [{ key: 'done', label: 'Done' }],
      },
    ],
    outputs: [],
  },
]

export const ROLES: Role[] = [
  { id: 'role-partnership-admin', name: 'Partnership Admin' },
  { id: 'role-partnership-director', name: 'Partnership Director' },
  { id: 'role-superadmin', name: 'Superadmin' },
]

export const USERS: User[] = [
  { id: 'u1', name: 'Mariam Al-Zaabi', email: 'mariam.alzaabi@m42.ae', title: 'Clinical Innovation (sample)' },
  { id: 'u2', name: 'Omar Haddad', email: 'omar.haddad@m42.ae', title: 'Digital Health (sample)' },
  { id: 'u3', name: 'Layla Mansour', email: 'layla.mansour@m42.ae', title: 'Genomics (sample)' },
  { id: 'u4', name: 'Yousef Karim', email: 'yousef.karim@m42.ae', title: 'Data Platforms (sample)' },
  { id: 'u5', name: 'Sara Al-Hashimi', email: 'sara.alhashimi@m42.ae', title: 'Research Ops (sample)' },
  { id: 'u6', name: 'Khalid Nasser', email: 'khalid.nasser@m42.ae', title: 'Cyber Security (sample)' },
  { id: 'u7', name: 'Hind Rahman', email: 'hind.rahman@m42.ae', title: 'Procurement (sample)' },
  { id: 'u8', name: 'Ahmed Saleh', email: 'ahmed.saleh@m42.ae', title: 'AI Lab (sample)' },
  { id: 'u9', name: 'Noura Al-Mazrouei', email: 'noura.almazrouei@m42.ae', title: 'Patient Experience (sample)' },
  { id: 'u10', name: 'Tariq Fadel', email: 'tariq.fadel@m42.ae', title: 'Finance (sample)' },
]

export const TEAMS: Team[] = [
  {
    id: 'team-internal-interest',
    name: 'Internal Interest Team',
    memberIds: USERS.map((u) => u.id),
  },
]

export const TEMPLATES: MessageTemplate[] = [
  {
    id: 'tpl-intake-rejection',
    name: 'Intake rejection',
    channel: 'email',
    subject: 'Your request {caseId}',
    body: 'Dear {vendorName}, thank you for your submission. After review, we are unable to proceed with request {caseId}.',
  },
  {
    id: 'tpl-approval-reminder',
    name: 'Approval reminder',
    channel: 'email',
    subject: 'Reminder: {caseId} is waiting for you',
    body: 'Request {caseId} in {stageName} is due on {dueDate}. Open it here: {link}',
  },
  {
    id: 'tpl-rfi-vendor',
    name: 'RFI to vendor',
    channel: 'email',
    subject: 'More information needed for {caseId}',
    body: 'Dear {vendorName}, we need more information to continue reviewing {caseId}. {link}',
  },
  {
    id: 'tpl-internal-invite',
    name: 'Internal interest invitation',
    channel: 'email',
    subject: 'Your input is requested on {caseId}',
    body: 'You have been invited to assess {caseId}. Please respond by {dueDate}: {link}',
  },
  {
    id: 'tpl-internal-reminder',
    name: 'Internal interest reminder',
    channel: 'email',
    subject: 'Reminder: your input on {caseId}',
    body: 'We are still waiting for your response on {caseId}. Due {dueDate}: {link}',
  },
  {
    id: 'tpl-sla-breach-closure',
    name: 'SLA breach closure',
    channel: 'email',
    subject: '{caseId} has been closed',
    body: 'Request {caseId} was closed because the time limit in {stageName} passed.',
  },
]

export const CALENDARS: WorkingCalendar[] = [
  {
    id: 'cal-default',
    name: '[YOUR CALENDAR]',
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    holidays: [],
  },
]

export const STATUS_LABELS = ['To review', 'Upcoming', 'Completed', 'Rejected', 'On hold', 'Stopped']

/** People roles a case can hold (set by the Update case node) */
export const CASE_ROLES = ['Sponsor', 'Lead sponsor', 'Co-sponsors', 'Owner']

export const INTEGRATIONS: Integration[] = [
  {
    id: 'int-crm',
    name: 'Create CRM record (sample)',
    description: 'Sample integration entry.',
    fields: [
      { key: 'recordType', label: 'Record type', type: 'dropdown', options: ['Account', 'Opportunity'] },
      { key: 'owner', label: 'Record owner', type: 'shortText' },
    ],
  },
  {
    id: 'int-docgen',
    name: 'Generate document (sample)',
    description: 'Sample integration entry.',
    fields: [{ key: 'documentTemplate', label: 'Document template', type: 'shortText' }],
  },
  {
    id: 'int-esign',
    name: 'Send for e-signature (sample)',
    description: 'Sample integration entry.',
    fields: [
      { key: 'document', label: 'Document', type: 'shortText' },
      { key: 'signer', label: 'Signer', type: 'dropdown', options: ['Vendor', 'Partnership Director'] },
    ],
  },
]

export const TIMEZONES = ['Asia/Dubai', 'Europe/London', 'UTC', 'America/New_York', 'Asia/Kolkata']

export const findAgent = (id: unknown) => AGENTS.find((a) => a.id === id)
export const findForm = (id: unknown) => FORMS.find((f) => f.id === id)
export const findQuestionnaire = (id: unknown) => QUESTIONNAIRES.find((q) => q.id === id)
export const findRole = (id: unknown) => ROLES.find((r) => r.id === id)
export const findTeam = (id: unknown) => TEAMS.find((t) => t.id === id)
export const findUser = (id: unknown) => USERS.find((u) => u.id === id)
export const findTemplate = (id: unknown) => TEMPLATES.find((t) => t.id === id)
export const findIntegration = (id: unknown) => INTEGRATIONS.find((i) => i.id === id)
