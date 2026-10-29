'use client'

import React, { createContext, useCallback, useContext, useState } from 'react'
import { CircleAlert, CircleCheck } from 'lucide-react'

interface ToastItem {
  id: number
  message: string
  kind: 'success' | 'error'
}

const ToastContext = createContext<(message: string, kind?: ToastItem['kind']) => void>(() => {})

/**
 * ToastProvider — Organism
 * Top-right confirmation toasts, styled like the TDD Phase 2 dashboard toast.
 * Used in: RootLayout
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const push = useCallback((message: string, kind: ToastItem['kind'] = 'success') => {
    const id = Date.now() + Math.random()
    setItems((prev) => [...prev, { id, message, kind }])
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3000)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed top-5 right-5 z-[70] flex flex-col gap-2" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className="px-4 py-3 rounded-xl shadow-xl bg-white border border-[#e2e8f0] text-xs sm:text-sm font-medium text-[#0d212c] flex items-center gap-2.5 animate-in slide-in-from-top-4 duration-200"
          >
            {t.kind === 'success' ? (
              <CircleCheck className="w-4 h-4 text-[#36c0c9]" aria-hidden="true" />
            ) : (
              <CircleAlert className="w-4 h-4 text-red-600" aria-hidden="true" />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
