'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { btnIcon } from '@/components/ui/styles'
import { CATEGORIES, PALETTE } from '@/lib/registry/nodes'
import type { Stage, Workflow } from '@/types/workflow'
import { PaletteList } from './NodePalette'

/**
 * NodePickerModal — Organism
 * Palette in a dialog, used by "+ Create new node…" to add a node and connect it.
 * Used in: StageBuilder
 */
export const NodePickerModal: React.FC<{
  open: boolean
  workflow: Workflow
  stage: Stage
  outcomeLabel?: string
  onPick: (type: string) => void
  onClose: () => void
}> = ({ open, workflow, stage, outcomeLabel, onPick, onClose }) => {
  const [query, setQuery] = useState('')
  const [closed, setClosed] = useState<Record<string, boolean>>({})
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CATEGORIES.map((cat) => ({
      cat,
      items: PALETTE.filter((d) => d.category === cat.key && (!q || d.label.toLowerCase().includes(q))),
    })).filter((g) => g.items.length)
  }, [query])

  return (
    <Modal
      open={open}
      title="Add the next step"
      description={outcomeLabel ? `It will run after “${outcomeLabel}”.` : undefined}
      onClose={onClose}
    >
      <div className="flex flex-col max-h-[55vh] -mx-2">
        <PaletteList
          groups={groups}
          closed={closed}
          setClosed={setClosed}
          query={query}
          setQuery={setQuery}
          workflow={workflow}
          stage={stage}
          onAdd={onPick}
        />
      </div>
    </Modal>
  )
}

/**
 * NodePickerPopover — Organism
 * Floating step list opened from the canvas "+" button; the step is added where the "+" was.
 * Used in: FlowCanvas
 */
export const NodePickerPopover: React.FC<{
  x: number
  y: number
  workflow: Workflow
  stage: Stage
  onPick: (type: string) => void
  onClose: () => void
}> = ({ x, y, workflow, stage, onPick, onClose }) => {
  const [query, setQuery] = useState('')
  const [closed, setClosed] = useState<Record<string, boolean>>({})
  const ref = useRef<HTMLDivElement>(null)
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CATEGORIES.map((cat) => ({
      cat,
      items: PALETTE.filter((d) => d.category === cat.key && (!q || d.label.toLowerCase().includes(q) || d.description.toLowerCase().includes(q))),
    })).filter((g) => g.items.length)
  }, [query])

  useEffect(() => {
    ref.current?.querySelector('input')?.focus()
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && onClose()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    // Capture phase: the canvas stops pointer events from bubbling up to the document
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Add a step"
      className="absolute z-30 w-[288px] h-[420px] bg-white rounded-xl border border-[#e2e8f0] shadow-lg flex flex-col pt-3 animate-in fade-in zoom-in-95 duration-100"
      style={{ left: x, top: y }}
    >
      <div className="px-3 pb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-[#0d212c]">Add a step</p>
        <button type="button" className={btnIcon} aria-label="Close" title="Close" onClick={onClose}>
          <X className="w-4 h-4" />
        </button>
      </div>
      <PaletteList
        groups={groups}
        closed={closed}
        setClosed={setClosed}
        query={query}
        setQuery={setQuery}
        workflow={workflow}
        stage={stage}
        onAdd={onPick}
      />
    </div>
  )
}
