import { getNodeType } from '@/lib/registry/nodes'
import type { FieldSchema, SchemaContext } from '@/lib/registry/types'

const getPath = (obj: Record<string, unknown>, path: string): unknown =>
  path.split('.').reduce<unknown>((acc, k) => (acc as Record<string, unknown> | undefined)?.[k], obj)

const isEmpty = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.length === 0)

const visible = (f: { showIf?: FieldSchema['showIf'] }, scope: Record<string, unknown>, ctx: SchemaContext) => !f.showIf || f.showIf(scope, ctx)

/**
 * Labels of the mandatory fields a step still needs (its name plus every visible `required` field of its type).
 * Read from the registry, so any step type – built-in or new – is gated the same way.
 * Until this is empty the step's outcomes can't be routed to a next step.
 */
export function missingRequired(ctx: SchemaContext): string[] {
  const { node } = ctx
  const def = getNodeType(node.type)
  const out: string[] = []
  if (!node.name.trim()) out.push('Name')
  for (const section of def.configSchema) {
    if (section.showIf && !section.showIf(node.config, ctx)) continue
    for (const f of section.fields)
      if (f.required && visible(f, node.config, ctx) && isEmpty(getPath(node.config, f.key))) out.push(f.label || section.title)
  }
  return out
}
