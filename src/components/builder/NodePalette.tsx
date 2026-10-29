'use client'

import React, { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react'
import { CATEGORIES, PALETTE, getNodeType, type PaletteItem } from '@/lib/registry/nodes'
import type { Stage, Workflow } from '@/types/workflow'
import { btnIcon, inputSmall } from '@/components/ui/styles'

interface Props {
  workflow: Workflow
  stage: Stage
  collapsed: boolean
  onToggle: () => void
  onAdd: (type: string) => void
  /** When set, the palette is used to pick a node (e.g. "+ Create new node…") */
  title?: string
}

export function allowedState(item: PaletteItem, workflow: Workflow, stage: Stage) {
  return getNodeType(item.type).isAllowed?.({ workflow, stage }) ?? { allowed: true }
}

/**
 * NodePalette — Organism
 * Searchable, grouped list of node types; drag onto the canvas or click to add.
 * Used in: StageBuilder, NodePickerModal
 */
export const NodePalette: React.FC<Props> = ({ workflow, stage, collapsed, onToggle, onAdd, title = 'Steps' }) => {
  const [query, setQuery] = useState('')
  const [closed, setClosed] = useState<Record<string, boolean>>({})

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CATEGORIES.map((cat) => ({
      cat,
      items: PALETTE.filter(
        (d) => d.category === cat.key && (!q || d.label.toLowerCase().includes(q) || d.description.toLowerCase().includes(q))
      ),
    })).filter((g) => g.items.length > 0)
  }, [query])

  if (collapsed)
    return (
      <aside className="w-12 shrink-0 border-r border-[#e2e8f0] bg-white flex flex-col items-center py-3 gap-2">
        <button className={btnIcon} onClick={onToggle} aria-label="Show steps" title="Show steps">
          <PanelLeftOpen className="w-4 h-4" />
        </button>
        {CATEGORIES.map((c) => (
          <span key={c.key} title={c.label} className={`w-7 h-7 rounded-lg border flex items-center justify-center ${c.accent}`}>
            <c.icon className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
        ))}
      </aside>
    )

  return (
    <aside className="w-64 shrink-0 border-r border-[#e2e8f0] bg-white flex flex-col min-h-0" aria-label="Step palette">
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-[#0d212c]">{title}</h2>
        <button className={btnIcon} onClick={onToggle} aria-label="Hide steps" title="Hide steps">
          <PanelLeftClose className="w-4 h-4" />
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
        onAdd={onAdd}
        draggable
      />
    </aside>
  )
}

export const PaletteList: React.FC<{
  groups: { cat: (typeof CATEGORIES)[number]; items: PaletteItem[] }[]
  closed: Record<string, boolean>
  setClosed: (fn: (c: Record<string, boolean>) => Record<string, boolean>) => void
  query: string
  setQuery: (q: string) => void
  workflow: Workflow
  stage: Stage
  onAdd: (type: string) => void
  draggable?: boolean
}> = ({ groups, closed, setClosed, query, setQuery, workflow, stage, onAdd, draggable }) => (
  <>
    <div className="px-3 pb-2">
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
        <input
          type="search"
          aria-label="Search steps"
          placeholder="Search steps"
          className={`${inputSmall} pl-8`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
    </div>
    <div className="flex-1 overflow-y-auto px-2 pb-4">
      {groups.length === 0 && <p className="text-xs text-[#94a3b8] px-2 py-4">No steps match “{query}”.</p>}
      {groups.map(({ cat, items }) => {
        const isClosed = closed[cat.key] && !query
        return (
          <section key={cat.key} className="mb-1">
            <button
              className="w-full flex items-center gap-1.5 px-2 py-2 text-[11px] font-medium text-[#94a3b8] uppercase tracking-[0.06em] hover:text-[#0d212c] cursor-pointer"
              aria-expanded={!isClosed}
              onClick={() => setClosed((c) => ({ ...c, [cat.key]: !c[cat.key] }))}
            >
              {isClosed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <cat.icon className="w-3 h-3" aria-hidden="true" />
              {cat.label}
            </button>
            {!isClosed && (
              <ul className="flex flex-col gap-1">
                {items.map((def) => {
                  const { allowed, reason } = allowedState(def, workflow, stage)
                  return (
                    <li key={def.key}>
                      <button
                        draggable={draggable && allowed}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/wf-node', def.key)
                          e.dataTransfer.effectAllowed = 'copy'
                        }}
                        disabled={!allowed}
                        title={allowed ? `${def.description} Drag onto the canvas or click to add it.` : reason}
                        onClick={() => onAdd(def.key)}
                        className="w-full flex items-start gap-2.5 px-2 py-2 rounded-lg text-left hover:bg-slate-50 disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-transparent cursor-grab active:cursor-grabbing transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36c0c9]/40"
                      >
                        <span className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${def.accent}`}>
                          <def.icon className="w-3.5 h-3.5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-[#0d212c]">{def.label}</span>
                          <span className="block text-[11px] text-[#64748b] leading-snug">
                            {allowed ? def.description : reason}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  </>
)
