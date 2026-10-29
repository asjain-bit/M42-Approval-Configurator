'use client'

import React, { useEffect, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { btnIcon } from './styles'

export interface MenuItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  danger?: boolean
  disabled?: boolean
  hint?: string
}

/**
 * OverflowMenu — Molecule
 * Three-dot button with a small popover list of actions.
 * Used in: WorkflowDirectory, StageBuilder
 */
export const OverflowMenu: React.FC<{ items: MenuItem[]; label?: string }> = ({ items, label = 'More actions' }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        className={btnIcon}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && <MenuList items={items} onDone={() => setOpen(false)} className="absolute right-0 top-9" />}
    </div>
  )
}

export const MenuList: React.FC<{ items: MenuItem[]; onDone: () => void; className?: string; style?: React.CSSProperties }> = ({
  items,
  onDone,
  className = '',
  style,
}) => (
  <div
    role="menu"
    style={style}
    className={`z-50 min-w-44 bg-white rounded-xl border border-[#e2e8f0] shadow-xl p-1.5 animate-in fade-in duration-100 ${className}`}
  >
    {items.map((item) => (
      <button
        key={item.label}
        role="menuitem"
        disabled={item.disabled}
        title={item.hint}
        onClick={() => {
          onDone()
          item.onClick()
        }}
        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
          item.danger ? 'text-red-600 hover:bg-red-50' : 'text-[#0d212c] hover:bg-slate-50'
        }`}
      >
        {item.icon}
        {item.label}
      </button>
    ))}
  </div>
)
