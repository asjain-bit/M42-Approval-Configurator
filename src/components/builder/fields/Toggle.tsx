'use client'

import React from 'react'

/**
 * Toggle — Atom
 * Switch with a visible label; the state is also announced as on/off.
 * Used in: NodeForm, BreachActionEditor, StageSettings
 */
export const Toggle: React.FC<{
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  id?: string
  disabled?: boolean
}> = ({ label, checked, onChange, id, disabled }) => (
  <label className={`flex items-center justify-between gap-3 ${disabled ? 'opacity-50' : 'cursor-pointer'}`} id={id}>
    <span className="text-xs font-medium text-[#0d212c]">{label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e2e8f0] ${
        checked ? 'bg-[#36c0c9]' : 'bg-slate-300'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : ''
        }`}
      />
    </button>
  </label>
)
