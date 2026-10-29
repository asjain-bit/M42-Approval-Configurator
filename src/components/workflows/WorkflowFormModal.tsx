'use client'

import React, { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { btnPrimary, btnSecondary, helpText, inputBase, labelBase, textareaBase } from '@/components/ui/styles'

interface Props {
  open: boolean
  title: string
  submitLabel: string
  initialName?: string
  initialDescription?: string
  nameLabel?: string
  descriptionLabel?: string
  nameMin?: number
  nameMax: number
  descriptionMax: number
  /** Names already taken (case-insensitive) */
  takenNames: string[]
  onSubmit: (name: string, description: string) => void
  onClose: () => void
}

/**
 * NameDescriptionModal — Molecule
 * Name + description dialog with inline validation, used for workflows and stages.
 * Used in: WorkflowDirectory, StagesScreen, StageBuilder
 */
export const NameDescriptionModal: React.FC<Props> = ({
  open,
  title,
  submitLabel,
  initialName = '',
  initialDescription = '',
  nameLabel = 'Name',
  descriptionLabel = 'Description',
  nameMin = 3,
  nameMax,
  descriptionMax,
  takenNames,
  onSubmit,
  onClose,
}) => {
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (open) {
      setName(initialName)
      setDescription(initialDescription)
      setTouched(false)
    }
  }, [open, initialName, initialDescription])

  const trimmed = name.trim()
  const nameError =
    trimmed.length < nameMin
      ? `Enter at least ${nameMin} characters.`
      : trimmed.length > nameMax
        ? `Keep it to ${nameMax} characters or fewer.`
        : takenNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())
          ? 'That name is already in use.'
          : null
  const descError = description.length > descriptionMax ? `Keep it to ${descriptionMax} characters or fewer.` : null

  const submit = () => {
    setTouched(true)
    if (nameError || descError) return
    onSubmit(trimmed, description.trim())
  }

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button className={btnPrimary} onClick={submit}>
            {submitLabel}
          </button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div>
          <label className={labelBase} htmlFor="nd-name">
            {nameLabel} <span className="text-red-600">*</span>
          </label>
          <input
            id="nd-name"
            className={`${inputBase} ${touched && nameError ? 'border-red-400 hover:border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`}
            value={name}
            maxLength={nameMax + 20}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={!!(touched && nameError)}
          />
          {touched && nameError ? (
            <p className="text-[11px] text-red-600 mt-1">{nameError}</p>
          ) : (
            <p className={helpText}>
              {nameMin}–{nameMax} characters.
            </p>
          )}
        </div>
        <div>
          <label className={labelBase} htmlFor="nd-desc">
            {descriptionLabel} <span className="text-[#94a3b8] font-normal">(optional)</span>
          </label>
          <textarea
            id="nd-desc"
            className={textareaBase}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <p className={`text-[11px] mt-1 ${descError ? 'text-red-600' : 'text-[#64748b]'}`}>
            {descError ?? `${description.length}/${descriptionMax}`}
          </p>
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
