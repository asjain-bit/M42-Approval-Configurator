'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/organisms/Sidebar'
import { ADMIN_PROFILE, endSession, hasSession } from '@/lib/session'
import type { AppShellProps } from './AppShell.types'

/**
 * AppShell — Template
 * Authenticated layout: collapsible left nav, sticky page header and main content area.
 * Used in: DashboardPage, WorkflowPage, StagePage
 */
export const AppShell: React.FC<AppShellProps> = ({ title, header, activeTab, fullBleed, children }) => {
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [ready, setReady] = useState(false)

  // Send anyone without an SSO session back to the login screen
  useEffect(() => {
    if (!hasSession()) {
      router.replace('/')
      return
    }
    setReady(true)
  }, [router])

  if (!ready) return null

  return (
    <div
      className={`bg-[#f8fafc] text-[#0d212c] flex font-sans antialiased ${
        fullBleed ? 'h-screen overflow-hidden' : 'min-h-screen'
      }`}
    >
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => router.push(`/${tab}`)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        userName={ADMIN_PROFILE.name}
        userDesignation={ADMIN_PROFILE.designation}
        userAvatarUrl={ADMIN_PROFILE.avatarUrl}
        onSignOut={() => {
          endSession()
          router.replace('/')
        }}
      />

      <div
        className={`flex-1 flex flex-col min-w-0 min-h-0 transition-all duration-300 ${
          sidebarCollapsed ? 'pl-[84px]' : 'pl-[250px]'
        }`}
      >
        <header className="w-full bg-white border-b border-[#e2e8f0] px-6 lg:px-10 py-3.5 min-h-[60px] flex items-center justify-between gap-4 sticky top-0 z-40 text-[#0d212c] shadow-xs">
          {header ?? (
            <h1 className="font-semibold text-lg lg:text-xl tracking-tight text-[#0d212c]">
              {title}
            </h1>
          )}
        </header>

        <main className={`flex-1 w-full min-h-0 ${fullBleed ? 'flex flex-col' : 'p-6'}`}>
          {children}
        </main>
      </div>
    </div>
  )
}
