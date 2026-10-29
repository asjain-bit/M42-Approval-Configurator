'use client'

import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { btnDanger, btnPrimary, btnSecondary } from './styles'

interface ModalProps {
  open: boolean
  title: string
  description?: React.ReactNode
  onClose: () => void
  children?: React.ReactNode
  footer?: React.ReactNode
  icon?: React.ReactNode
  width?: string
}

/**
 * Modal — Molecule
 * Centred dialog with backdrop, Escape to close and focus moved inside.
 * Used in: WorkflowDirectory, StagesScreen, StageBuilder
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  icon,
  width = 'max-w-lg',
}) => {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const first = panelRef.current?.querySelector<HTMLElement>('input, textarea, select, button[data-autofocus]')
    first?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-[#0d212c]/40 backdrop-blur-xs" onClick={onClose} />
      <div
        ref={panelRef}
        className={`relative w-full ${width} bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] p-6 sm:p-7 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto`}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#94a3b8] hover:text-[#0d212c] transition cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-start gap-3 pr-8">
          {icon}
          <div>
            <h2 className="text-lg font-semibold text-[#0d212c]">{title}</h2>
            {description && <div className="text-xs text-[#64748b] leading-relaxed mt-1">{description}</div>}
          </div>
        </div>
        {children}
        {footer && <div className="flex items-center justify-end gap-3 pt-1">{footer}</div>}
      </div>
    </div>
  )
}

interface ConfirmProps {
  open: boolean
  title: string
  message: React.ReactNode
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmModal: React.FC<ConfirmProps> = ({ open, title, message, confirmLabel, danger, onConfirm, onCancel }) => (
  <Modal
    open={open}
    title={title}
    description={message}
    onClose={onCancel}
    footer={
      <>
        <button className={btnSecondary} onClick={onCancel}>
          Cancel
        </button>
        <button data-autofocus className={`${danger ? btnDanger : btnPrimary} outline-none focus-visible:outline-none`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </>
    }
  />
)
