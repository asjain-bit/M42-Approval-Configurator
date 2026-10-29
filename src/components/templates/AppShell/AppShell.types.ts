import type React from 'react'

export interface AppShellProps {
  /** Page title shown in the sticky header (ignored when `header` is given) */
  title?: string
  /** Custom header content, e.g. breadcrumb and actions */
  header?: React.ReactNode
  /** Left nav item to highlight (matches the route segment, e.g. 'dashboard') */
  activeTab: string
  /** Remove page padding and lock to viewport height (for the canvas) */
  fullBleed?: boolean
  /** Page content */
  children?: React.ReactNode
}
