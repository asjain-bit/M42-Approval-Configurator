'use client'

import React from 'react'
import { findTemplate } from '@/lib/library'
import { isCustom } from '@/lib/registry/shared'
import { labelBase, textareaBase } from '@/components/ui/styles'

/** The admin's wording for one template; kept only while that template stays chosen */
export type EmailOverride = { for: string; text: string }

/** Text shown for a template: the admin's own wording, else the template's */
export const emailText = (templateId: unknown, override: unknown) => {
  const o = override as EmailOverride | undefined
  return o && o.for === templateId ? o.text : (findTemplate(templateId)?.body ?? '')
}

/**
 * EmailPreview — Molecule
 * Shows the full email of the chosen template in an editable box.
 * Used in: SlaBlock, BreachActionEditor, FieldRenderer
 */
export const EmailPreview: React.FC<{
  templateId: unknown
  override: unknown
  onChange: (override: EmailOverride) => void
}> = ({ templateId, override, onChange }) => {
  if (!templateId) return null
  const id = String(templateId)
  return (
    <div>
      <label className={labelBase}>Email</label>
      <textarea
        aria-label="Email"
        className={`${textareaBase} text-xs [field-sizing:content] !max-h-none`}
        rows={4}
        value={emailText(id, override)}
        placeholder={isCustom(id) ? 'Write the email for your own template' : undefined}
        onChange={(e) => onChange({ for: id, text: e.target.value })}
      />
      <p className="text-[11px] text-[#94a3b8] mt-0.5">You can change the wording. {'{caseId}'} and similar are filled in when it is sent.</p>
    </div>
  )
}
