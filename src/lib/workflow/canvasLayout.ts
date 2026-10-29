import type { Stage, Workflow } from '@/types/workflow'
import { autoLayout, nodeSize } from './layout'

/** Space around the steps inside a stage box */
export const BOX_PAD = 32
/** Room at the top of a stage box for its title */
export const BOX_HEADER = 56
/** Gap between two stage boxes, where the hand-over arrow runs */
export const BOX_GAP = 150
const BOX_MIN_WIDTH = 360
const BOX_MIN_HEIGHT = 240

/** Where a stage's steps sit within the stage: saved positions, with auto-layout for any step that has none yet */
export function effectiveLayout(stage: Stage): Record<string, { x: number; y: number }> {
  const ids = Object.keys(stage.nodes)
  if (ids.every((id) => stage.layout[id])) return stage.layout
  return { ...autoLayout(stage), ...stage.layout }
}

export interface StageBlock {
  stageId: string
  /** Top-left of the stage box on the canvas */
  x: number
  y: number
  width: number
  height: number
  /** Canvas position of a step's own (0, 0), so a step's canvas position is origin + its stage position */
  originX: number
  originY: number
  layout: Record<string, { x: number; y: number }>
}

/**
 * Lays every stage out left to right as one box each, so the whole workflow
 * reads as a single connected flow. A box's position only depends on the boxes
 * before it, so editing one stage never moves its own steps.
 */
export function stageBlocks(workflow: Workflow): StageBlock[] {
  let cursor = 0
  return workflow.stageIds
    .filter((id) => workflow.stages[id])
    .map((stageId) => {
      const stage = workflow.stages[stageId]
      const layout = effectiveLayout(stage)
      let minX = 0
      let minY = 0
      let maxX = 0
      let maxY = 0
      for (const node of Object.values(stage.nodes)) {
        const p = layout[node.id] ?? { x: 0, y: 0 }
        const { width, height } = nodeSize(node)
        minX = Math.min(minX, p.x)
        minY = Math.min(minY, p.y)
        maxX = Math.max(maxX, p.x + width)
        maxY = Math.max(maxY, p.y + height)
      }
      const originX = cursor + BOX_PAD - minX
      const originY = BOX_HEADER + BOX_PAD / 2 - minY
      const width = Math.max(BOX_MIN_WIDTH, originX - cursor + maxX + BOX_PAD)
      const height = Math.max(BOX_MIN_HEIGHT, originY + maxY + BOX_PAD)
      const block: StageBlock = { stageId, x: cursor, y: 0, width, height, originX, originY, layout }
      cursor += width + BOX_GAP
      return block
    })
}
