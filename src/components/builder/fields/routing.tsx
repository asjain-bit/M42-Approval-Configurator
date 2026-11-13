'use client'

import { createContext, useContext } from 'react'
import type { WorkflowNode } from '@/types/workflow'

/** Lets nested editors (e.g. Condition branches) read and change connections. */
export interface RoutingApi {
  node: WorkflowNode
  nodeOptions: { id: string; name: string; usedBy?: string }[]
  /** The other stages an outcome can hand over to */
  stageOptions: { id: string; name: string }[]
  /** Close request steps: each one may be used by a single result */
  closeIds?: Set<string>
  setTarget: (outcomeKey: string, targetId: string | null) => void
  setStageTarget: (outcomeKey: string, stageId: string) => void
  createNodeFor: (outcomeKey: string) => void
  focusField?: string | null
  /** Mandatory fields still empty; while any are listed, the next step can't be chosen */
  missing?: string[]
}

export const RoutingContext = createContext<RoutingApi | null>(null)
export const useRouting = () => useContext(RoutingContext)

export const CREATE_NEW = '__create__'

export function getPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, k) => (acc as Record<string, unknown> | undefined)?.[k], obj)
}

export function setPath(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const [head, ...rest] = path.split('.')
  if (rest.length === 0) return { ...obj, [head]: value }
  const child = (obj[head] as Record<string, unknown> | undefined) ?? {}
  return { ...obj, [head]: setPath(child, rest.join('.'), value) }
}
