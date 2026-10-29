'use client'

import React, { useMemo, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
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
