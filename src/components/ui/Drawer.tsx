'use client'

import React, { useEffect } from 'react'
import { X } from 'lucide-react'

interface DrawerProps {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
  width?: string
}

/**
 * Drawer — Molecule
 * Right-hand side panel for the audit log and validation results.
 * Used in: AuditDrawer, ValidationDrawer
 */
export const Drawer: React.FC<DrawerProps> = ({ open, title, subtitle, onClose, children, width = 'max-w-md' }) => {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[55]" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-[#0d212c]/30" onClick={onClose} />
      <aside
        className={`absolute right-0 top-0 bottom-0 w-full ${width} bg-white border-l border-[#e2e8f0] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200`}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#e2e8f0]">
          <div>
            <h2 className="text-base font-semibold text-[#0d212c]">{title}</h2>
            {subtitle && <p className="text-xs text-[#64748b] mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close panel" className="text-[#94a3b8] hover:text-[#0d212c] cursor-pointer p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>
  )
}
