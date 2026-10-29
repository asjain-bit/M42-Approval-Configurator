'use client'

import React, { useState, useEffect, useRef } from 'react'
import { LayoutDashboard, PanelLeftClose, LogOut, X } from 'lucide-react'
import { Avatar } from '@/components/atoms/Avatar'
import { APP_NAME } from '@/lib/session'
import type { SidebarProps } from './Sidebar.types'

/**
 * Sidebar — Organism
 * Primary expandable/collapsible left navigation sidebar with user profile and sign out.
 * Used in: AppShell
 */
export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  userName = 'Nadia Al-Farsi',
  userDesignation = 'Admin',
  userAvatarUrl,
  onSignOut,
}) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showUserOverlay, setShowUserOverlay] = useState(false)
  const userOverlayRef = useRef<HTMLDivElement>(null)

  // Overlay stays visible on hover until user clicks anywhere on screen
  useEffect(() => {
    if (!showUserOverlay) return

    const handleClickOutside = (event: MouseEvent) => {
      if (userOverlayRef.current && !userOverlayRef.current.contains(event.target as Node)) {
        setShowUserOverlay(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserOverlay])

  // Lock body scroll when logout modal is open
  useEffect(() => {
    if (showLogoutConfirm) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [showLogoutConfirm])

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ]

  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .substring(0, 2)
    .toUpperCase()

  const defaultAvatar =
    userAvatarUrl ||
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'

  return (
    <>
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 bg-[#0d212c] text-white flex flex-col transition-all duration-300 ease-in-out shadow-xl ${
          collapsed ? 'w-[84px]' : 'w-[250px]'
        }`}
      >
        {/* Sidebar Top Header — Height 72px */}
        <div
          className={`flex items-center justify-between h-[72px] border-b border-[#153443] shrink-0 ${
            collapsed ? 'px-2' : 'p-4'
          }`}
        >
          {!collapsed ? (
            <div className="flex items-center justify-between w-full min-w-0">
              <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                <img
                  src="/white-logo.png"
                  alt="M42 logo"
                  className="h-5 w-auto object-contain shrink-0"
                />
                <span className="font-semibold text-xs tracking-tight text-white truncate leading-none">
                  {APP_NAME}
                </span>
              </div>

              {/* Collapse Sidebar Icon Button inside left nav */}
              <button
                onClick={onToggleCollapse}
                aria-label="Collapse navigation"
                title="Collapse sidebar"
                className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition shrink-0 cursor-pointer"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onToggleCollapse}
              aria-label="Expand navigation"
              title="Expand sidebar"
              className="w-full h-full flex items-center justify-center cursor-pointer"
            >
              <img
                src="/white-logo.png"
                alt="M42 logo"
                className="h-5 w-auto max-w-[48px] object-contain"
              />
            </button>
          )}
        </div>

        {/* Navigation Items — Dashboard only; in collapsed state icon is above and text is below */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 flex flex-col gap-1.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id
            const IconComp = item.icon
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                title={collapsed ? item.label : undefined}
                className={`flex transition-all cursor-pointer select-none rounded-xl ${
                  collapsed
                    ? 'flex-col items-center justify-center w-full py-3.5 px-1 gap-1 text-center'
                    : 'items-center gap-3 px-3.5 py-3 text-sm font-medium'
                } ${
                  isActive
                    ? 'bg-[#153443] text-[#36c0c9] shadow-xs'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <IconComp className="w-5 h-5 shrink-0" />
                <span
                  className={
                    collapsed
                      ? 'text-[11px] font-medium leading-tight text-inherit'
                      : 'text-sm font-medium'
                  }
                >
                  {item.label}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Sidebar Footer User Section with Designation and Overlay */}
        <div className="p-3 pb-5 border-t border-[#153443] shrink-0 bg-[#08171f]/50 relative">
          {!collapsed ? (
            <div
              ref={userOverlayRef}
              className="relative flex items-center justify-between gap-2"
              onMouseEnter={() => setShowUserOverlay(true)}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar
                  src={defaultAvatar}
                  fallback={userInitials}
                  size="sm"
                  className="bg-[#153443] text-white border-white/20 shrink-0"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-white truncate">{userName}</span>
                  <span className="text-[11px] font-medium text-[#36c0c9] truncate">
                    {userDesignation}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                title="Sign out"
                aria-label="Sign out"
                className="p-2 rounded-lg text-red-500 hover:text-red-400 bg-transparent hover:bg-transparent active:bg-transparent cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Overlay in expanded mode */}
              {showUserOverlay && (
                <div
                  className="absolute left-0 bottom-[calc(100%+8px)] w-full bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl p-3 z-50 text-left text-[#0d212c] animate-in fade-in slide-in-from-bottom-2 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2.5 pb-2.5 border-b border-[#f1f5f9]">
                    <Avatar
                      src={defaultAvatar}
                      fallback={userInitials}
                      size="sm"
                      className="bg-[#153443] text-white border border-slate-200 shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-[#0d212c] truncate">
                        {userName}
                      </span>
                      <span className="text-[11px] font-medium text-[#36c0c9] truncate">
                        {userDesignation}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setShowUserOverlay(false)
                        setShowLogoutConfirm(true)
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:text-red-700 bg-transparent hover:bg-transparent active:bg-transparent cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Collapsed state with profile icon and hover/click overlay popover */
            <div
              ref={userOverlayRef}
              className="relative flex justify-center w-full"
              onMouseEnter={() => setShowUserOverlay(true)}
            >
              <button
                onClick={() => setShowUserOverlay(true)}
                title={userName}
                aria-label="User profile options"
                className="p-1 rounded-xl hover:bg-white/10 transition cursor-pointer flex flex-col items-center justify-center"
              >
                <Avatar
                  src={defaultAvatar}
                  fallback={userInitials}
                  size="sm"
                  className="bg-[#153443] text-white border border-white/20 shrink-0 shadow-xs"
                />
              </button>

              {/* Overlay popover card anchored to the right of the sidebar */}
              {showUserOverlay && (
                <div
                  className="absolute left-[calc(100%+12px)] bottom-0 w-52 bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl p-3 z-50 text-left text-[#0d212c] animate-in fade-in slide-in-from-left-2 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2.5 pb-2.5 border-b border-[#f1f5f9]">
                    <Avatar
                      src={defaultAvatar}
                      fallback={userInitials}
                      size="sm"
                      className="bg-[#153443] text-white border border-slate-200 shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-[#0d212c] truncate">
                        {userName}
                      </span>
                      <span className="text-[11px] font-medium text-[#36c0c9] truncate">
                        {userDesignation}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setShowUserOverlay(false)
                        setShowLogoutConfirm(true)
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:text-red-700 bg-transparent hover:bg-transparent active:bg-transparent cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-[#0d212c]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white rounded-3xl max-w-lg w-full p-8 sm:p-10 shadow-2xl border border-[#e2e8f0] text-center flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-200 min-h-[240px] justify-center">
            <button
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute top-5 right-5 text-[#94a3b8] hover:text-[#0d212c] transition cursor-pointer border-0 bg-transparent p-0"
              title="Close"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shadow-2xs">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#0d212c] mb-1.5">Confirm Logout</h3>
              <p className="text-xs text-[#64748b] leading-relaxed max-w-md">
                Are you sure you want to log out of {APP_NAME}?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 w-full mt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-6 py-3 rounded-xl border border-[#e2e8f0] text-xs font-semibold text-[#0d212c] hover:bg-slate-50 cursor-pointer flex-1 bg-transparent transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false)
                  onSignOut?.()
                }}
                className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer flex-1 border-0 transition shadow-2xs"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
