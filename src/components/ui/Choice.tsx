'use client'

import React from 'react'
import { Check } from 'lucide-react'

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>

/**
 * Checkbox — Atom
 * Native checkbox (kept for keyboard and screen readers) drawn as a primary-filled box with a white tick.
 * Used in: FieldRenderer, SlaBlock, BranchesEditor
 */
export const Checkbox: React.FC<Props> = ({ className = '', checked, ...props }) => (
  <span className={`relative inline-flex w-4 h-4 shrink-0 ${className}`}>
    <input type="checkbox" checked={checked} {...props} className="peer absolute inset-0 m-0 opacity-0 cursor-pointer" />
    <span
      aria-hidden="true"
      className={`w-4 h-4 rounded border flex items-center justify-center transition peer-focus-visible:ring-2 peer-focus-visible:ring-[#e2e8f0] ${
        checked ? 'bg-[#36c0c9] border-[#36c0c9]' : 'bg-white border-[#cbd5e1]'
      }`}
    >
      {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
    </span>
  </span>
)

/**
 * Radio — Atom
 * Native radio drawn as a primary-filled circle with a white dot when selected.
 * Used in: FieldRenderer, SlaBlock
 */
export const Radio: React.FC<Props> = ({ className = '', checked, ...props }) => (
  <span className={`relative inline-flex w-4 h-4 shrink-0 ${className}`}>
    <input type="radio" checked={checked} {...props} className="peer absolute inset-0 m-0 opacity-0 cursor-pointer" />
    <span
      aria-hidden="true"
      className={`w-4 h-4 rounded-full border flex items-center justify-center transition peer-focus-visible:ring-2 peer-focus-visible:ring-[#e2e8f0] ${
        checked ? 'bg-[#36c0c9] border-[#36c0c9]' : 'bg-white border-[#cbd5e1]'
      }`}
    >
      {checked && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
    </span>
  </span>
)
